import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

export async function readEmployerQueue(database, mapQuestionnaire) {
  const [rows, drafts] = await Promise.all([
    database.sql`SELECT * FROM employer_accreditation_questionnaires ORDER BY submitted_at DESC, id`,
    // Never expose the resume-token hash to the browser.
    database.sql`SELECT id, status, contact_first_name, contact_last_name, contact_email, legal_name, nzbn,
      current_step, progress_percent, expires_at, created_at, updated_at
      FROM employer_accreditation_drafts WHERE submitted_questionnaire_id IS NULL AND status <> 'Submitted' ORDER BY updated_at DESC`,
  ]);
  return { employerQuestionnaires: rows.map(mapQuestionnaire), employerQuestionnaireDrafts: drafts.map((row) => ({
    id: row.id, status: row.status, contactFirstName: row.contact_first_name, contactLastName: row.contact_last_name,
    contactEmail: row.contact_email, legalName: row.legal_name, nzbn: row.nzbn, currentStep: row.current_step,
    progressPercent: row.progress_percent, expiresAt: row.expires_at, createdAt: row.created_at, updatedAt: row.updated_at,
  })) };
}

export async function downloadEmployerUpload(database, questionnaireId, fileId) {
  if (!uuid(questionnaireId)) throw fail('Choose a questionnaire.');
  const [row] = await database.sql`SELECT uploaded_files FROM employer_accreditation_questionnaires WHERE id=${questionnaireId}`;
  const file = (row?.uploaded_files || []).find((item) => (item.fileId || item.id) === fileId);
  if (!file?.blobKey) throw fail('Supporting document not found.', 404);
  const bytes = await getStore({ name: 'employer-accreditation-uploads', consistency: 'strong' }).get(file.blobKey, { type: 'arrayBuffer' });
  if (!bytes) throw fail('Supporting document is unavailable.', 404);
  return { fileName: file.fileName, fileType: file.mimeType, dataBase64: Buffer.from(bytes).toString('base64') };
}

// Blob copies are prepared first. One SQL statement then commits the client, document
// register, audit entry and questionnaire link together. Failed copies leave it unprocessed.
export async function processEmployerQuestionnaire(database, input, actor = 'CRM adviser', stores = getStore) {
  const { questionnaireId, mode, commercialClientId } = input;
  if (!uuid(questionnaireId) || !['attach', 'create'].includes(mode)) throw fail('Choose a questionnaire and attach or create.');
  if (mode === 'attach' && !uuid(commercialClientId)) throw fail('Choose an existing commercial client.');
  const [row] = await database.sql`SELECT * FROM employer_accreditation_questionnaires WHERE id=${questionnaireId}`;
  if (!row) throw fail('Questionnaire not found.', 404);
  // A repeated click or retry returns the existing link, including pre-release links.
  if (row.commercial_client_id) return { questionnaireId, commercialClientId: row.commercial_client_id, alreadyLinked: true };
  const targetId = mode === 'attach' ? commercialClientId : crypto.randomUUID();
  if (mode === 'attach') {
    const [target] = await database.sql`SELECT id FROM commercial_clients WHERE id=${targetId}`;
    if (!target) throw fail('Commercial client not found. Refresh and choose again.', 404);
  }
  const files = Array.isArray(row.uploaded_files) ? row.uploaded_files : [];
  const documents = [];
  if (files.length) {
    const source = stores({ name: 'employer-accreditation-uploads', consistency: 'strong' });
    const destination = stores({ name: 'commercial-documents', consistency: 'strong' });
    for (const [index, file] of files.entries()) {
      if (!file.blobKey) throw fail('A supporting document has no stored file. Questionnaire remains unprocessed.', 409);
      const bytes = await source.get(file.blobKey, { type: 'arrayBuffer' });
      if (!bytes) throw fail(`Supporting document unavailable: ${file.fileName || 'file'}. Questionnaire remains unprocessed.`, 409);
      const hash = crypto.createHash('sha256').update(`${questionnaireId}:${file.fileId || file.id || index}`).digest('hex');
      const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
      const fileName = String(file.fileName || 'supporting-document').replace(/[\\/\x00-\x1f]/g, '_');
      const blobKey = `${targetId}/${questionnaireId}/${id}-${fileName}`;
      await destination.set(blobKey, bytes, { metadata: { commercialClientId: targetId, documentId: id, fileName, mimeType: file.mimeType || 'application/octet-stream', questionnaireId } });
      documents.push({ id, file_name: fileName, blob_key: blobKey, mime_type: file.mimeType || 'application/octet-stream', size_bytes: bytes.byteLength });
    }
  }
  const payload = row.raw_payload || {};
  const summary = `Employer questionnaire ${questionnaireId}: ${row.accreditation_application_type || ''}; ${row.accreditation_type || ''}; viability: ${row.viability_basis || ''}. Key people: ${(row.key_people || []).map((p) => `${p.fullName || ''} (${p.role || ''})`).join('; ')}.`;
  const result = await database.sql`
    WITH target AS MATERIALIZED (SELECT id FROM commercial_clients WHERE id=${targetId} FOR UPDATE),
    q AS MATERIALIZED (
      SELECT * FROM employer_accreditation_questionnaires WHERE id=${questionnaireId} AND commercial_client_id IS NULL
        AND (${mode}='create' OR EXISTS (SELECT 1 FROM target)) FOR UPDATE
    ), client AS (
      INSERT INTO commercial_clients (id,legal_name,trading_name,nzbn,company_number,gst_number,ird_number,
        industry,business_description,address,primary_contact_name,primary_contact_email,primary_contact_phone,
        accreditation_type,accreditation_status,accreditation_expiry_date,accreditation_notes,
        client_status,matter_name,case_type,priority,next_action,matter_status)
      SELECT ${targetId}::uuid,legal_name,trading_name,nzbn,company_number,gst_number,ird_number,
        ${payload.industry || ''},${payload.businessDescription || ''},${payload.address || ''},
        CONCAT_WS(' ',contact_first_name,contact_last_name),contact_email,contact_phone,
        accreditation_type,'Preparing',current_accreditation_expiry,${summary},
        'Active','Employer accreditation','Employer Accreditation','Normal','Review employer accreditation questionnaire','Adviser action required' FROM q
      ON CONFLICT (id) DO UPDATE SET
        gst_number=COALESCE(NULLIF(EXCLUDED.gst_number,''),commercial_clients.gst_number),
        ird_number=COALESCE(NULLIF(EXCLUDED.ird_number,''),commercial_clients.ird_number),
        nzbn=COALESCE(NULLIF(EXCLUDED.nzbn,''),commercial_clients.nzbn),
        company_number=COALESCE(NULLIF(EXCLUDED.company_number,''),commercial_clients.company_number),
        accreditation_type=COALESCE(NULLIF(EXCLUDED.accreditation_type,''),commercial_clients.accreditation_type),
        accreditation_expiry_date=COALESCE(EXCLUDED.accreditation_expiry_date,commercial_clients.accreditation_expiry_date),
        accreditation_notes=CONCAT_WS(E'\n',NULLIF(commercial_clients.accreditation_notes,''),EXCLUDED.accreditation_notes), updated_at=NOW()
      RETURNING id
    ), documents AS (
      INSERT INTO commercial_documents (id,commercial_client_id,title,category,document_url,blob_key,file_name,mime_type,size_bytes,uploaded_by_type,notes,visible_to_employer,created_by)
      SELECT d.id,client.id,d.file_name,'Employer accreditation','',d.blob_key,d.file_name,d.mime_type,d.size_bytes,
        'Public employer questionnaire',${`Submitted with employer questionnaire ${questionnaireId}.`},TRUE,${actor}
      FROM client CROSS JOIN jsonb_to_recordset(${JSON.stringify(documents)}::jsonb) AS d(id uuid,file_name text,blob_key text,mime_type text,size_bytes bigint)
      RETURNING id
    ), audit AS (
      INSERT INTO commercial_audit_log (commercial_client_id,record_type,record_id,action,changed_by,changed_by_type,summary,changes)
      SELECT id,'accreditation_questionnaire',${questionnaireId}::uuid,${mode},${actor},'CRM adviser',${summary},
        ${JSON.stringify({ mode, supportingDocuments: documents.length })}::jsonb FROM client RETURNING id
    )
    UPDATE employer_accreditation_questionnaires SET commercial_client_id=client.id,status='Processed',updated_at=NOW()
    FROM client WHERE employer_accreditation_questionnaires.id=${questionnaireId}
    RETURNING employer_accreditation_questionnaires.commercial_client_id`;
  if (result[0]) return { questionnaireId, commercialClientId: result[0].commercial_client_id };
  // Another reviewer may have completed it while the files were being prepared.
  const [current] = await database.sql`SELECT commercial_client_id FROM employer_accreditation_questionnaires WHERE id=${questionnaireId}`;
  if (current?.commercial_client_id) return { questionnaireId, commercialClientId: current.commercial_client_id, alreadyLinked: true };
  throw fail('The questionnaire or commercial client changed. Refresh and try again.', 409);
}
