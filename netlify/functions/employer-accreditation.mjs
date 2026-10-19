import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { getNotificationRecipients } from './_notification-recipients.mjs';

const DRAFT_DAYS = 30;
const STORE_NAME = 'employer-accreditation-uploads';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 12;
const ALLOWED_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export default async function employerAccreditationHandler(request) {
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const draftAction = clean(url.searchParams.get('draft')).toLowerCase();
    if (draftAction) return handleDraftAction(request, url, draftAction);

    const body = await request.json().catch(() => ({}));
    const token = clean(body.resumeToken);
    const payload = normalisePayload(body.payload || body);
    validateSubmission(payload);

    const database = db();
    const linkedDraft = token ? await readDraftByToken(token) : null;
    const uploadedFiles = linkedDraft && !isExpired(linkedDraft) ? normaliseFiles(linkedDraft.uploaded_files) : [];
    const match = await findCommercialMatch(database, payload);
    const commercialClientId = await upsertCommercialClient(database, payload, match?.id || '');
    const duplicateFlags = await buildDuplicateFlags(database, payload, commercialClientId);

    const rows = await database.sql`
      INSERT INTO employer_accreditation_questionnaires (
        commercial_client_id, status, contact_first_name, contact_last_name, contact_email, contact_phone,
        legal_name, trading_name, nzbn, company_number, gst_number, ird_number,
        accreditation_application_type, accreditation_type, current_accreditation_expiry,
        business_operation_length, viability_basis, key_people, declarations, uploaded_files, duplicate_flags, raw_payload
      ) VALUES (
        ${nullableUuid(commercialClientId)}, 'Submitted', ${payload.contactFirstName}, ${payload.contactLastName}, ${payload.contactEmail}, ${payload.contactPhone},
        ${payload.legalName}, ${payload.tradingName}, ${payload.nzbn}, ${payload.companyNumber}, ${payload.gstNumber}, ${payload.irdNumber},
        ${payload.applicationType}, ${payload.accreditationType}, ${nullableDate(payload.currentAccreditationExpiry)},
        ${payload.businessOperationLength}, ${payload.viabilityBasis}, ${JSON.stringify(payload.keyPeople)}::jsonb,
        ${JSON.stringify(payload.declarations)}::jsonb, ${JSON.stringify(uploadedFiles)}::jsonb,
        ${JSON.stringify(duplicateFlags)}::jsonb, ${JSON.stringify({ ...payload, uploadedFiles })}::jsonb
      ) RETURNING id, submitted_at`;
    const questionnaireId = rows[0]?.id || '';

    if (linkedDraft?.id && questionnaireId) {
      await database.sql`UPDATE employer_accreditation_drafts SET status='Submitted', submitted_questionnaire_id=${questionnaireId}, updated_at=NOW() WHERE id=${linkedDraft.id}`;
    }

    await copyUploadsToCommercialDocuments(database, commercialClientId, questionnaireId, uploadedFiles, payload.contactEmail);
    await recordCommercialAudit(database, commercialClientId, questionnaireId, payload);
    try { await sendSubmissionEmails(database, { questionnaireId, commercialClientId, payload, duplicateFlags, submittedAt: rows[0]?.submitted_at }); }
    catch (error) { console.warn('Employer accreditation email notification failed', error?.message || error); }

    return json({ ok: true, questionnaireId, commercialClientId, duplicateFlags });
  } catch (error) {
    console.error('Employer accreditation questionnaire failed', error);
    return json({ error: String(error?.message || 'Employer accreditation questionnaire failed.') }, Number(error?.statusCode || 500));
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? getDatabase({ connectionString }) : getDatabase();
}

async function ensureSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`ALTER TABLE commercial_clients ADD COLUMN IF NOT EXISTS gst_number TEXT`;
  await database.sql`ALTER TABLE commercial_clients ADD COLUMN IF NOT EXISTS ird_number TEXT`;
  await database.sql`CREATE TABLE IF NOT EXISTS employer_accreditation_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commercial_client_id UUID REFERENCES commercial_clients(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Submitted', contact_first_name TEXT, contact_last_name TEXT, contact_email TEXT NOT NULL, contact_phone TEXT,
    legal_name TEXT NOT NULL, trading_name TEXT, nzbn TEXT, company_number TEXT, gst_number TEXT, ird_number TEXT,
    accreditation_application_type TEXT, accreditation_type TEXT, current_accreditation_expiry DATE,
    business_operation_length TEXT, viability_basis TEXT, key_people JSONB NOT NULL DEFAULT '[]'::jsonb,
    declarations JSONB NOT NULL DEFAULT '{}'::jsonb, uploaded_files JSONB NOT NULL DEFAULT '[]'::jsonb,
    duplicate_flags JSONB NOT NULL DEFAULT '{}'::jsonb, raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await database.sql`CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), related_record_type TEXT NOT NULL DEFAULT 'test', related_record_id UUID, client_id UUID, intake_id UUID,
    template_key TEXT NOT NULL DEFAULT 'test', from_email TEXT, from_name TEXT, to_email TEXT NOT NULL, cc TEXT, bcc TEXT, subject TEXT NOT NULL,
    body_text TEXT, body_html TEXT, status TEXT NOT NULL DEFAULT 'Draft', sent_by TEXT, sent_at TIMESTAMPTZ, failed_at TIMESTAMPTZ,
    failure_message TEXT, provider TEXT NOT NULL DEFAULT 'microsoft_graph', provider_request_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await database.sql`CREATE TABLE IF NOT EXISTS employer_accreditation_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), resume_token_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'Draft',
    contact_first_name TEXT, contact_last_name TEXT, contact_email TEXT NOT NULL, legal_name TEXT, nzbn TEXT,
    current_step INTEGER NOT NULL DEFAULT 1, progress_percent INTEGER NOT NULL DEFAULT 0,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb, uploaded_files JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'), resume_email_sent_at TIMESTAMPTZ,
    submitted_questionnaire_id UUID REFERENCES employer_accreditation_questionnaires(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

async function handleDraftAction(request, url, action) {
  if (action === 'save') return saveDraft(await request.json().catch(() => ({})));
  if (action === 'resume') {
    const body = await request.json().catch(() => ({}));
    return resumeDraft(clean(body.token));
  }
  if (action === 'upload') return uploadDraftFile(request, url);
  if (action === 'remove-upload') {
    const body = await request.json().catch(() => ({}));
    return removeDraftFile(clean(body.token), clean(body.fileId));
  }
  return json({ error: 'Unknown draft action.' }, 400);
}

async function saveDraft(body = {}) {
  const payload = normalisePayload(body.payload || {});
  if (!payload.contactFirstName || !payload.contactLastName || !isEmail(payload.contactEmail)) return json({ error: 'Add the contact name and a valid email before saving.' }, 400);
  const existingToken = clean(body.token);
  const step = Math.max(1, Math.min(6, Number(body.step || 1)));
  const progress = Math.round(((step - 1) / 5) * 100);
  const database = db();
  let token = existingToken;
  let row = existingToken ? await readDraftByToken(existingToken) : null;
  if (row && (row.status !== 'Draft' || isExpired(row))) row = null;
  if (!row) {
    token = crypto.randomBytes(32).toString('base64url');
    const hash = hashToken(token);
    const rows = await database.sql`INSERT INTO employer_accreditation_drafts (
      resume_token_hash, contact_first_name, contact_last_name, contact_email, legal_name, nzbn, current_step, progress_percent, raw_payload, expires_at
    ) VALUES (${hash}, ${payload.contactFirstName}, ${payload.contactLastName}, ${payload.contactEmail}, ${payload.legalName}, ${payload.nzbn}, ${step}, ${progress}, ${JSON.stringify(payload)}::jsonb, NOW() + INTERVAL '30 days') RETURNING *`;
    row = rows[0];
  } else {
    const rows = await database.sql`UPDATE employer_accreditation_drafts SET contact_first_name=${payload.contactFirstName}, contact_last_name=${payload.contactLastName},
      contact_email=${payload.contactEmail}, legal_name=${payload.legalName}, nzbn=${payload.nzbn}, current_step=${step}, progress_percent=${progress},
      raw_payload=${JSON.stringify(payload)}::jsonb, expires_at=NOW() + INTERVAL '30 days', updated_at=NOW() WHERE id=${row.id} RETURNING *`;
    row = rows[0];
  }
  if (body.sendResumeEmail === true) await sendResumeEmail(database, row, token);
  return json({ ok: true, draft: publicDraft(row, token) });
}

async function resumeDraft(token = '') {
  const row = await readDraftByToken(token);
  if (!row || row.status !== 'Draft') return json({ error: 'This saved questionnaire could not be found.' }, 404);
  if (isExpired(row)) return json({ error: 'This saved questionnaire has expired.' }, 410);
  return json({ ok: true, draft: publicDraft(row, token) });
}

async function uploadDraftFile(request, url) {
  const token = clean(url.searchParams.get('token'));
  const fileName = safeFileName(clean(url.searchParams.get('fileName')) || 'document.pdf');
  const category = clean(url.searchParams.get('category'), 120) || 'Supporting document';
  const row = await readDraftByToken(token);
  if (!row || row.status !== 'Draft' || isExpired(row)) return json({ error: 'Save the questionnaire before uploading documents.' }, 403);
  const files = normaliseFiles(row.uploaded_files);
  if (files.length >= MAX_FILES) return json({ error: `A maximum of ${MAX_FILES} supporting files can be uploaded.` }, 400);
  const buffer = Buffer.from(await request.arrayBuffer());
  if (!buffer.length) return json({ error: 'The uploaded file was empty.' }, 400);
  if (buffer.length > MAX_UPLOAD_BYTES) return json({ error: 'Each file must be 8 MB or smaller.' }, 400);
  const mimeType = resolveMimeType(fileName, request.headers.get('content-type'));
  if (!mimeType) return json({ error: 'Upload a PDF, Word, Excel, JPG or PNG document.' }, 400);
  const fileId = crypto.randomUUID();
  const blobKey = `${row.id}/${fileId}-${fileName}`;
  await getStore({ name: STORE_NAME, consistency: 'strong' }).set(blobKey, buffer, { metadata: { draftId: row.id, fileId, fileName, category, mimeType } });
  const metadata = { fileId, fileName, category, mimeType, sizeBytes: buffer.length, blobKey, uploadedAt: new Date().toISOString() };
  const next = [...files, metadata];
  await db().sql`UPDATE employer_accreditation_drafts SET uploaded_files=${JSON.stringify(next)}::jsonb, updated_at=NOW() WHERE id=${row.id}`;
  return json({ ok: true, files: next.map(publicFile) });
}

async function removeDraftFile(token = '', fileId = '') {
  const row = await readDraftByToken(token);
  if (!row || row.status !== 'Draft' || isExpired(row)) return json({ error: 'Saved questionnaire not found.' }, 404);
  const files = normaliseFiles(row.uploaded_files);
  const target = files.find((file) => file.fileId === fileId);
  const next = files.filter((file) => file.fileId !== fileId);
  if (target?.blobKey) { try { await getStore({ name: STORE_NAME, consistency: 'strong' }).delete(target.blobKey); } catch {} }
  await db().sql`UPDATE employer_accreditation_drafts SET uploaded_files=${JSON.stringify(next)}::jsonb, updated_at=NOW() WHERE id=${row.id}`;
  return json({ ok: true, files: next.map(publicFile) });
}

async function readDraftByToken(token = '') {
  if (!token) return null;
  const rows = await db().sql`SELECT * FROM employer_accreditation_drafts WHERE resume_token_hash=${hashToken(token)} LIMIT 1`;
  return rows[0] || null;
}
function hashToken(token = '') { return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex'); }
function isExpired(row = {}) { const t = new Date(row.expires_at || '').getTime(); return !Number.isFinite(t) || t <= Date.now(); }
function publicDraft(row = {}, token = '') { return { token, status: row.status, currentStep: Number(row.current_step || 1), progressPercent: Number(row.progress_percent || 0), payload: row.raw_payload || {}, files: normaliseFiles(row.uploaded_files).map(publicFile), expiresAt: row.expires_at || '' }; }
function publicFile(file = {}) { return { fileId: file.fileId || '', fileName: file.fileName || '', category: file.category || '', mimeType: file.mimeType || '', sizeBytes: Number(file.sizeBytes || 0), uploadedAt: file.uploadedAt || '' }; }
function normaliseFiles(value) { return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').slice(0, MAX_FILES) : []; }

function normalisePayload(input = {}) {
  const keyPeople = Array.isArray(input.keyPeople) ? input.keyPeople.slice(0, 12).map((person) => ({
    fullName: clean(person?.fullName, 300), dateOfBirth: clean(person?.dateOfBirth, 20), gender: clean(person?.gender, 80),
    countryOfBirth: clean(person?.countryOfBirth, 160), citizenship: clean(person?.citizenship, 160), passportNumber: clean(person?.passportNumber, 120),
    role: clean(person?.role, 240), visaStatus: clean(person?.visaStatus, 240), email: clean(person?.email, 300).toLowerCase(),
  })).filter((person) => person.fullName) : [];
  const declarations = input.declarations && typeof input.declarations === 'object' ? Object.fromEntries(Object.entries(input.declarations).map(([key, value]) => [clean(key, 100), clean(value, 20)])) : {};
  return {
    contactFirstName: clean(input.contactFirstName, 160), contactLastName: clean(input.contactLastName, 160), contactPhone: clean(input.contactPhone, 100), contactEmail: clean(input.contactEmail, 300).toLowerCase(),
    businessOperationLength: clean(input.businessOperationLength, 160), legalName: clean(input.legalName, 500), tradingName: clean(input.tradingName, 500), nzbn: clean(input.nzbn, 120), companyNumber: clean(input.companyNumber, 120), gstNumber: clean(input.gstNumber, 120), irdNumber: clean(input.irdNumber, 120),
    entityType: clean(input.entityType, 160), address: clean(input.address, 1500), website: clean(input.website, 800), industry: clean(input.industry, 300), businessDescription: clean(input.businessDescription, 3000),
    applicationType: clean(input.applicationType, 160), accreditationType: clean(input.accreditationType, 160), currentAccreditationNumber: clean(input.currentAccreditationNumber, 160), currentAccreditationExpiry: clean(input.currentAccreditationExpiry, 20), estimatedMigrantHires: clean(input.estimatedMigrantHires, 60),
    viabilityBasis: clean(input.viabilityBasis, 300), viabilityComments: clean(input.viabilityComments, 2500), declarations, declarationComments: clean(input.declarationComments, 5000),
    workforceTotal: clean(input.workforceTotal, 60), migrantWorkforceTotal: clean(input.migrantWorkforceTotal, 60), contractorsUsed: clean(input.contractorsUsed, 20), fixedTermCasualUsed: clean(input.fixedTermCasualUsed, 20), thirdPartyPlacement: clean(input.thirdPartyPlacement, 20), recruitmentCostsPassedOn: clean(input.recruitmentCostsPassedOn, 20), settlementSupportProcess: clean(input.settlementSupportProcess, 3000), employerModulesCompleted: clean(input.employerModulesCompleted, 40), trialPeriodsForAewv: clean(input.trialPeriodsForAewv, 40), nzResidenceRequirementMet: clean(input.nzResidenceRequirementMet, 40), employmentPracticeComments: clean(input.employmentPracticeComments, 3000),
    triangularHistoryMonths: clean(input.triangularHistoryMonths, 60), triangularNzResidentPercent: clean(input.triangularNzResidentPercent, 60), triangularMonitoring: clean(input.triangularMonitoring, 3000), triangularHealthSafety: clean(input.triangularHealthSafety, 3000), triangularComplaints: clean(input.triangularComplaints, 3000),
    keyPeople, additionalInformation: clean(input.additionalInformation, 5000), consentToContact: Boolean(input.consentToContact), privacyAcknowledged: Boolean(input.privacyAcknowledged), declarationConfirmed: Boolean(input.declarationConfirmed), submittedVia: clean(input.submittedVia, 300),
  };
}

function validateSubmission(payload) {
  if (!payload.contactFirstName || !payload.contactLastName || !payload.contactEmail || !payload.legalName) throw badRequest('Contact name, email and legal business name are required.');
  if (!isEmail(payload.contactEmail)) throw badRequest('Enter a valid contact email address.');
  if (!payload.nzbn && !payload.companyNumber) throw badRequest('Enter the NZBN or company number.');
  if (!payload.gstNumber) throw badRequest('Enter the GST number.');
  if (!payload.applicationType || !payload.accreditationType) throw badRequest('Choose the accreditation application and accreditation type.');
  if (!payload.viabilityBasis) throw badRequest('Choose the business viability basis that best applies.');
  if (!payload.keyPeople.length) throw badRequest('Add at least one key person.');
  if (!payload.consentToContact || !payload.privacyAcknowledged || !payload.declarationConfirmed) throw badRequest('Please complete the consent, privacy and declaration confirmations.');
}

async function findCommercialMatch(database, payload) {
  if (payload.nzbn) {
    const rows = await database.sql`SELECT id FROM commercial_clients WHERE BTRIM(COALESCE(nzbn,''))=${payload.nzbn} ORDER BY updated_at DESC LIMIT 1`;
    if (rows[0]) return rows[0];
  }
  const rows = await database.sql`SELECT id FROM commercial_clients WHERE LOWER(BTRIM(COALESCE(primary_contact_email,'')))=${payload.contactEmail} AND LOWER(BTRIM(legal_name))=${payload.legalName.toLowerCase()} ORDER BY updated_at DESC LIMIT 1`;
  return rows[0] || null;
}

async function upsertCommercialClient(database, payload, existingId = '') {
  if (existingId) {
    await database.sql`UPDATE commercial_clients SET trading_name=COALESCE(NULLIF(${payload.tradingName},''),trading_name), nzbn=COALESCE(NULLIF(${payload.nzbn},''),nzbn), company_number=COALESCE(NULLIF(${payload.companyNumber},''),company_number), gst_number=${payload.gstNumber}, ird_number=${payload.irdNumber}, industry=COALESCE(NULLIF(${payload.industry},''),industry), business_description=COALESCE(NULLIF(${payload.businessDescription},''),business_description), address=COALESCE(NULLIF(${payload.address},''),address), primary_contact_name=${`${payload.contactFirstName} ${payload.contactLastName}`.trim()}, primary_contact_email=${payload.contactEmail}, primary_contact_phone=${payload.contactPhone}, accreditation_type=${payload.accreditationType}, accreditation_status=CASE WHEN accreditation_status IN ('Accredited','Suspended','Expired') THEN accreditation_status ELSE 'Preparing' END, matter_name=COALESCE(NULLIF(matter_name,''),'Employer accreditation'), case_type='Employer Accreditation', next_action='Review employer accreditation questionnaire', matter_status='Adviser action required', updated_at=NOW() WHERE id=${existingId}`;
    return existingId;
  }
  const rows = await database.sql`INSERT INTO commercial_clients (legal_name,trading_name,nzbn,company_number,gst_number,ird_number,industry,business_description,address,primary_contact_name,primary_contact_email,primary_contact_phone,client_status,matter_name,case_type,priority,next_action,matter_status,accreditation_type,accreditation_status) VALUES (${payload.legalName},${payload.tradingName},${payload.nzbn},${payload.companyNumber},${payload.gstNumber},${payload.irdNumber},${payload.industry},${payload.businessDescription},${payload.address},${`${payload.contactFirstName} ${payload.contactLastName}`.trim()},${payload.contactEmail},${payload.contactPhone},'Active','Employer accreditation','Employer Accreditation','Normal','Review employer accreditation questionnaire','Adviser action required',${payload.accreditationType},'Preparing') RETURNING id`;
  return rows[0]?.id || '';
}

async function buildDuplicateFlags(database, payload, commercialClientId) {
  const emailRows = await database.sql`SELECT COUNT(*)::int AS count FROM employer_accreditation_questionnaires WHERE LOWER(contact_email)=${payload.contactEmail}`;
  const nzbnRows = payload.nzbn ? await database.sql`SELECT COUNT(*)::int AS count FROM employer_accreditation_questionnaires WHERE nzbn=${payload.nzbn}` : [{ count: 0 }];
  const clientRows = payload.nzbn ? await database.sql`SELECT COUNT(*)::int AS count FROM commercial_clients WHERE nzbn=${payload.nzbn} AND id<>${commercialClientId}` : [{ count: 0 }];
  return { priorQuestionnairesForEmail: Number(emailRows[0]?.count || 0), priorQuestionnairesForNzbn: Number(nzbnRows[0]?.count || 0), otherCommercialClientsForNzbn: Number(clientRows[0]?.count || 0) };
}

async function copyUploadsToCommercialDocuments(database, commercialClientId, questionnaireId, files = [], submittedBy = '') {
  if (!nullableUuid(commercialClientId) || !files.length) return;
  const sourceStore = getStore({ name: STORE_NAME, consistency: 'strong' });
  const targetStore = getStore({ name: 'commercial-documents', consistency: 'strong' });
  for (const file of files) {
    if (!file?.blobKey) continue;
    try {
      const bytes = await sourceStore.get(file.blobKey, { type: 'arrayBuffer', consistency: 'strong' });
      if (!bytes) continue;
      const documentId = crypto.randomUUID();
      const fileName = safeFileName(file.fileName || 'accreditation-document');
      const blobKey = `${commercialClientId}/${documentId}-${fileName}`;
      await targetStore.set(blobKey, bytes, { metadata: { commercialClientId, documentId, fileName, mimeType: file.mimeType || 'application/octet-stream', uploadedBy: submittedBy, uploadedByType: 'Public employer questionnaire', questionnaireId } });
      await database.sql`INSERT INTO commercial_documents (id, commercial_client_id, title, category, document_url, blob_key, file_name, mime_type, size_bytes, uploaded_by_type, notes, visible_to_employer, created_by)
        VALUES (${documentId}, ${commercialClientId}, ${fileName}, 'Employer accreditation', '', ${blobKey}, ${fileName}, ${file.mimeType || ''}, ${Number(file.sizeBytes || 0)}, 'Public employer questionnaire', ${`Submitted with employer accreditation questionnaire ${questionnaireId}.`}, TRUE, ${submittedBy})`;
    } catch (error) {
      console.warn('Could not copy employer questionnaire upload into commercial documents', error?.message || error);
    }
  }
}

async function recordCommercialAudit(database, commercialClientId, questionnaireId, payload) {
  if (!nullableUuid(commercialClientId)) return;
  try { await database.sql`INSERT INTO commercial_audit_log (commercial_client_id,record_type,record_id,action,changed_by,changed_by_type,summary,changes) VALUES (${commercialClientId},'accreditation_questionnaire',${nullableUuid(questionnaireId)},'submitted',${payload.contactEmail},'Public employer form',${`Employer accreditation questionnaire submitted by ${payload.contactFirstName} ${payload.contactLastName}.`},${JSON.stringify({ accreditationType: payload.accreditationType, applicationType: payload.applicationType })}::jsonb)`; } catch {}
}

async function sendLoggedEmail(database, { relatedRecordType, relatedRecordId = '', templateKey, toEmail, subject, bodyText, sentBy }) {
  const config = requireMicrosoftEmailConfig();
  const recipients = (Array.isArray(toEmail) ? toEmail : String(toEmail || '').split(',')).map((value) => String(value || '').trim().toLowerCase()).filter(isEmail);
  if (!recipients.length) return false;
  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, template_key, from_email, from_name, to_email, subject, body_text, status, sent_by)
    VALUES (${relatedRecordType}, ${nullableUuid(relatedRecordId)}, ${templateKey}, ${config.fromEmail}, ${config.fromName}, ${recipients.join(',')}, ${subject}, ${bodyText}, 'Sending', ${sentBy})
    RETURNING id`;
  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const result = await sendMicrosoftGraphEmail({ config, token, toEmail: recipients, subject, bodyText });
    await database.sql`UPDATE email_notifications SET status='Sent', sent_at=NOW(), provider_request_id=${result.requestId || ''}, updated_at=NOW() WHERE id=${created.id}`;
    return true;
  } catch (error) {
    await database.sql`UPDATE email_notifications SET status='Failed', failed_at=NOW(), failure_message=${String(error?.message || error).slice(0, 1000)}, updated_at=NOW() WHERE id=${created.id}`;
    throw error;
  }
}

async function sendResumeEmail(database, row, token) {
  const resumeUrl = buildResumeUrl(token);
  const firstName = row.contact_first_name || 'there';
  const expires = new Date(row.expires_at).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'long', year: 'numeric' });
  const subject = 'Continue your Turner Hopkins employer accreditation questionnaire';
  const bodyText = `Hi ${firstName},\n\nYour employer accreditation questionnaire has been saved, so you do not need to start again.\n\nContinue here:\n${resumeUrl}\n\nThe secure link remains available until ${expires}.\n\nKind regards,\nTurner Hopkins Immigration Specialists`;
  await sendLoggedEmail(database, { relatedRecordType:'employer_accreditation_draft', relatedRecordId:row.id, templateKey:'employer_accreditation_resume', toEmail:row.contact_email, subject, bodyText, sentBy:'Website employer accreditation form' });
  await database.sql`UPDATE employer_accreditation_drafts SET resume_email_sent_at=NOW(), updated_at=NOW() WHERE id=${row.id}`;
}

async function sendSubmissionEmails(database, { questionnaireId, commercialClientId, payload, duplicateFlags, submittedAt }) {
  const confirmationSubject = 'We have received your employer accreditation questionnaire';
  const confirmationText = `Hi ${payload.contactFirstName},\n\nThank you for completing the Turner Hopkins employer accreditation questionnaire for ${payload.legalName}.\n\nWe have received the information and will review it before confirming whether we need anything further.\n\nYou do not need to send the form again. If we need clarification or additional documents, we will contact you.\n\nKind regards,\nTurner Hopkins Immigration Specialists`;
  try { await sendLoggedEmail(database, { relatedRecordType:'employer_accreditation_questionnaire', relatedRecordId:questionnaireId, templateKey:'employer_accreditation_confirmation', toEmail:payload.contactEmail, subject:confirmationSubject, bodyText:confirmationText, sentBy:'Website employer accreditation form' }); }
  catch (error) { console.warn('Employer accreditation confirmation email failed', error?.message || error); }

  const standardRecipients = await getNotificationRecipients(database, 'employer_accreditation_internal_notification');
  const adviserRows = nullableUuid(commercialClientId) ? await database.sql`SELECT a.email FROM commercial_clients c LEFT JOIN advisers a ON a.id=c.primary_adviser_id WHERE c.id=${commercialClientId} LIMIT 1` : [];
  const adviserEmail = String(adviserRows[0]?.email || '').trim().toLowerCase();
  const recipients = [...new Set([...standardRecipients, adviserEmail].filter(isEmail))];
  if (!recipients.length) return;
  const issues = Object.entries(payload.declarations || {}).filter(([, value]) => value === 'Yes').map(([key]) => declarationLabel(key));
  const keyPeople = payload.keyPeople.map((person) => `${person.fullName} - ${person.role || 'role not recorded'}`).join('; ') || 'None recorded';
  const subject = `Employer accreditation questionnaire - ${payload.legalName}`;
  const bodyText = `A new employer accreditation questionnaire has been submitted.\n\nBusiness: ${payload.legalName}\nContact: ${payload.contactFirstName} ${payload.contactLastName}\nEmail: ${payload.contactEmail}\nNZBN: ${payload.nzbn || 'Not recorded'}\nGST: ${payload.gstNumber || 'Not recorded'}\nApplication: ${payload.applicationType}\nAccreditation type: ${payload.accreditationType}\nViability basis: ${payload.viabilityBasis}\nKey people: ${keyPeople}\nDeclaration issues: ${issues.length ? issues.join('; ') : 'None disclosed'}\nPrior questionnaire matches: email ${duplicateFlags.priorQuestionnairesForEmail}, NZBN ${duplicateFlags.priorQuestionnairesForNzbn}\nSubmitted: ${submittedAt ? new Date(submittedAt).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }) : 'Just now'}\n\nReview this under the commercial client record in THiS CRM.`;
  try { await sendLoggedEmail(database, { relatedRecordType:'employer_accreditation_questionnaire', relatedRecordId:questionnaireId, templateKey:'employer_accreditation_internal_notification', toEmail:recipients, subject, bodyText, sentBy:'Website employer accreditation form' }); }
  catch (error) { console.warn('Employer accreditation internal notification failed', error?.message || error); }
}

function buildResumeUrl(token) {
  const base = String(process.env.EMPLOYER_ACCREDITATION_RESUME_URL || 'https://www.turnerhopkinsimmigration.co.nz/employer-accreditation-questionnaire').trim();
  return `${base}${base.includes('?') ? '&' : '?'}resume=${encodeURIComponent(token)}`;
}
function declarationLabel(key) { return ({ purchasedRecently:'Business purchased within last 12 months', recentLoss:'Business made a loss within last 24 months', thirdPartyPlacement:'Workers placed with a third party', employerRegistered:'Registered as an employer with IRD', canCoverCosts:'Can cover salaries, wages and operating costs', standDown:'Business or key person on employer stand-down list', directorBanNz:'Key person banned from directorship in NZ', directorBanOther:'Key person banned from directorship overseas', businessOffence:'Key person convicted of business-related offence', unlawfulEmployment:'Employed someone without lawful work rights', trafficking:'Trafficking/smuggling/slave-trade offence', falseInfo:'False or misleading information to INZ', investigation:'Ongoing investigation or issue', reestablishedEntity:'Re-established as a substantially similar legal entity', associatedNonCompliance:'Key person linked to another non-compliant organisation', bankruptcyNap:'Business or key person bankrupt or subject to a No Asset Procedure' }[key] || key); }

function requireMicrosoftEmailConfig() {
  const config = { tenantId: clean(process.env.MICROSOFT_TENANT_ID, 500), clientId: clean(process.env.MICROSOFT_CLIENT_ID, 500), clientSecret: clean(process.env.MICROSOFT_CLIENT_SECRET, 1000), fromEmail: clean(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz', 500), fromName: clean(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists', 500) };
  if (!config.tenantId || !config.clientId || !config.clientSecret || !config.fromEmail) throw new Error('Microsoft 365 email is not fully configured.');
  return config;
}
async function getMicrosoftGraphAccessToken(config) {
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Microsoft Graph authentication failed.');
  return data.access_token;
}
async function sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText }) {
  const recipients = (Array.isArray(toEmail) ? toEmail : [toEmail]).filter(isEmail).map((address) => ({ emailAddress: { address } }));
  if (!recipients.length) return { requestId: '' };
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`, { method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'application/json' }, body: JSON.stringify({ message:{ subject, body:{ contentType:'Text', content:String(bodyText || '') }, toRecipients:recipients, from:{ emailAddress:{ address:config.fromEmail, name:config.fromName } } }, saveToSentItems:true }) });
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `Microsoft Graph sendMail failed with status ${response.status}`);
  return { requestId: response.headers.get('request-id') || '' };
}

function resolveMimeType(fileName, supplied) {
  const ext = String(fileName || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  const map = { '.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  const expected = map[ext]; if (!expected) return '';
  const type = clean(supplied, 200).toLowerCase();
  return type && ALLOWED_TYPES.has(type) ? type : expected;
}
function safeFileName(value) { return clean(value, 200).replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, ' ').trim() || 'document'; }
function nullableDate(value) { const text=clean(value,20).slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; }
function nullableUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')) ? value : null; }
function clean(value, max = 6000) { return String(value ?? '').trim().slice(0, max); }
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function badRequest(message) { const error = new Error(message); error.statusCode = 400; return error; }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers:{ ...corsHeaders(), 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } }); }
function corsHeaders() { return { 'access-control-allow-origin':'*', 'access-control-allow-methods':'POST, OPTIONS', 'access-control-allow-headers':'content-type, authorization' }; }
