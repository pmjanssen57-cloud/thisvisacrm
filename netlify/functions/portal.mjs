import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const PORTAL_DOCUMENT_STORE = 'client-portal-documents';

const TURNER_HOPKINS_CONTACT = {
  name: 'Turner Hopkins Immigration Specialists',
  phone: '+64 9 486 2169',
  email: 'immigration@turnerhopkins.co.nz',
  website: 'www.turnerhopkinsimmigration.co.nz',
};

export default async function portalRequestHandler(request, context = {}) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    await ensurePortalSchema();
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!['login', 'addMessage', 'getDocument'].includes(action)) return json({ error: 'Unknown portal action.' }, 400);

    const email = normaliseEmail(body.email);
    const accessCode = String(body.accessCode || '').trim();
    if (!email || !accessCode) return json({ error: 'Enter your email address and portal access code.' }, 400);

    const database = db();
    const matchedClient = await authenticatePortalClient(email, accessCode);
    if (!matchedClient) return json({ error: 'Portal access details were not recognised.' }, 401);

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('client-ip') || '';
    const userAgent = request.headers.get('user-agent') || '';

    if (action === 'addMessage') {
      const message = String(body.message || '').trim();
      if (!message) return json({ error: 'Add a note before saving.' }, 400);
      const messageType = body.messageType === 'adviser_action' ? 'adviser_action' : 'client_note';
      const title = String(body.title || '').trim().slice(0, 160);
      await database.sql`
        INSERT INTO client_portal_messages (client_id, portal_email, message_type, title, message, status)
        VALUES (${matchedClient.id}, ${email}, ${messageType}, ${title}, ${message.slice(0, 4000)}, 'New')
      `;
      await database.sql`
        INSERT INTO client_portal_access_log (client_id, portal_email, action, ip_address, user_agent)
        VALUES (${matchedClient.id}, ${email}, ${messageType}, ${ip}, ${userAgent})
      `;
    } else if (action === 'getDocument') {
      const document = await getPortalDocumentPayload(matchedClient.id, body.documentId);
      await database.sql`
        INSERT INTO client_portal_access_log (client_id, portal_email, action, ip_address, user_agent)
        VALUES (${matchedClient.id}, ${email}, 'download-document', ${ip}, ${userAgent})
      `;
      return json({ document });
    } else {
      await database.sql`
        INSERT INTO client_portal_access_log (client_id, portal_email, action, ip_address, user_agent)
        VALUES (${matchedClient.id}, ${email}, 'login', ${ip}, ${userAgent})
      `;
      await database.sql`UPDATE clients SET portal_last_accessed_at = NOW() WHERE id = ${matchedClient.id}`;
    }

    const snapshot = await buildPortalSnapshot(matchedClient.id);
    return json({ snapshot });
  } catch (error) {
    console.error(error);
    return json({ error: 'Client portal error', detail: String(error?.message || error) }, 500);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) return getDatabase({ connectionString });
  return getDatabase();
}

async function ensurePortalSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_email TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_status_update TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_next_step TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_deadline_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_appointment_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_billing_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_code_hash TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_last_published_at TIMESTAMPTZ`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_last_accessed_at TIMESTAMPTZ`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_portal_email ON clients (LOWER(portal_email))`;
  await database.sql`ALTER TABLE advisers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_portal_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      portal_email TEXT,
      message_type TEXT NOT NULL DEFAULT 'client_note',
      title TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_client_portal_messages_client ON client_portal_messages(client_id, created_at DESC)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_portal_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'THiS instructions',
      description TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'application/pdf',
      file_size INTEGER NOT NULL DEFAULT 0,
      blob_key TEXT NOT NULL,
      visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
      uploaded_by TEXT,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_client_portal_documents_client ON client_portal_documents(client_id, uploaded_at DESC)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_portal_access_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      portal_email TEXT,
      action TEXT NOT NULL DEFAULT 'login',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function authenticatePortalClient(email, accessCode) {
  const database = db();
  const matches = await database.sql`
    SELECT id, first_name, last_name, email, portal_email, portal_access_code_hash
    FROM clients
    WHERE portal_enabled = TRUE
      AND LOWER(COALESCE(NULLIF(portal_email, ''), email)) = ${email}
    ORDER BY updated_at DESC
    LIMIT 5
  `;
  return matches.find((client) => verifyPortalAccessCode(accessCode, client.portal_access_code_hash)) || null;
}

function mapPortalMessageFromDb(row = {}) {
  return {
    id: row.id,
    messageType: row.message_type || 'client_note',
    title: row.title || '',
    message: row.message || '',
    status: row.status === 'Reviewed' ? 'Reviewed' : 'New',
    createdAt: toDateTimeLabel(row.created_at),
  };
}

function mapPortalDocumentForClient(row = {}) {
  return {
    id: row.id,
    title: row.title || row.file_name || 'Client portal PDF',
    category: row.category || 'THiS instructions',
    description: row.description || '',
    fileName: row.file_name || '',
    fileType: row.file_type || 'application/pdf',
    fileSize: Number(row.file_size || 0),
    uploadedAt: toDateTimeLabel(row.uploaded_at),
  };
}

async function getPortalDocumentPayload(clientId, documentId) {
  if (!documentId) throw new Error('Select a document to open.');
  const rows = await db().sql`
    SELECT id, title, file_name, file_type, file_size, blob_key
    FROM client_portal_documents
    WHERE id = ${documentId} AND client_id = ${clientId} AND visible_to_client = TRUE
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error('That portal document is not available.');
  const store = getStore({ name: PORTAL_DOCUMENT_STORE, consistency: 'strong' });
  const arrayBuffer = await store.get(row.blob_key, { type: 'arrayBuffer', consistency: 'strong' });
  if (!arrayBuffer) throw new Error('The PDF file is no longer available.');
  return {
    id: row.id,
    title: row.title || row.file_name || 'Client portal PDF',
    fileName: row.file_name || 'client-portal-document.pdf',
    fileType: row.file_type || 'application/pdf',
    fileSize: Number(row.file_size || 0),
    dataBase64: Buffer.from(arrayBuffer).toString('base64'),
  };
}

async function buildPortalSnapshot(clientId) {
  const database = db();
  const [clientRows, adviserRows, stageRows, deadlineRows, calendarRows, billingRows, messageRows, documentRows] = await Promise.all([
    database.sql`
      SELECT id, first_name, last_name, email, case_type, primary_adviser_id, portal_status_update, portal_next_step, portal_visible_document_ids, portal_visible_deadline_ids, portal_visible_appointment_ids, portal_visible_billing_ids, portal_last_published_at, document_checklist
      FROM clients WHERE id = ${clientId} AND portal_enabled = TRUE LIMIT 1
    `,
    database.sql`SELECT id, name, email, phone, profile_photo_url FROM advisers`,
    database.sql`SELECT id, client_id, stage_key, stage_label, applied, completed, completed_date, sort_order FROM client_stages WHERE client_id = ${clientId} ORDER BY sort_order ASC`,
    database.sql`SELECT id, deadline_type, deadline_date, note FROM client_deadlines WHERE client_id = ${clientId} ORDER BY deadline_date ASC NULLS LAST`,
    database.sql`SELECT id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status FROM calendar_entries WHERE client_id = ${clientId} ORDER BY appointment_date ASC, start_time ASC NULLS LAST`,
    database.sql`SELECT id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key FROM billing_milestones WHERE client_id = ${clientId} ORDER BY due_date ASC NULLS LAST`,
    database.sql`SELECT id, message_type, title, message, status, created_at FROM client_portal_messages WHERE client_id = ${clientId} ORDER BY created_at DESC LIMIT 40`,
    database.sql`SELECT id, title, category, description, file_name, file_type, file_size, visible_to_client, uploaded_at FROM client_portal_documents WHERE client_id = ${clientId} AND visible_to_client = TRUE ORDER BY uploaded_at DESC`,
  ]);
  const client = clientRows[0];
  if (!client) throw new Error('Portal snapshot not available.');

  const advisers = adviserRows || [];
  const adviser = advisers.find((item) => item.id === client.primary_adviser_id) || null;
  const stages = (stageRows || []).filter((stage) => stage.applied !== false).map((stage) => ({
    id: stage.stage_key,
    label: stage.stage_label,
    completed: Boolean(stage.completed),
    completedDate: toDateOnly(stage.completed_date),
  }));
  const currentStage = stages.find((stage) => !stage.completed) || stages[stages.length - 1] || null;
  const progress = stages.length ? Math.round((stages.filter((stage) => stage.completed).length / stages.length) * 100) : 0;
  const visibleDocumentIds = new Set(parseJsonArray(client.portal_visible_document_ids));
  const visibleDeadlineIds = new Set(parseJsonArray(client.portal_visible_deadline_ids));
  const visibleAppointmentIds = new Set(parseJsonArray(client.portal_visible_appointment_ids));
  const visibleBillingIds = new Set(parseJsonArray(client.portal_visible_billing_ids));

  const documents = parseDocumentChecklist(client.document_checklist)
    .filter((item) => item.applied !== false && !item.obtained && visibleDocumentIds.has(item.id))
    .map((item) => ({ id: item.id, name: item.name, expiryDate: item.expiryDate || '' }));

  const keyDates = (deadlineRows || [])
    .filter((item) => visibleDeadlineIds.has(item.id) || visibleDeadlineIds.has(portalDeadlineKey(item)))
    .map((item) => ({ id: item.id, type: item.deadline_type || 'Key date', date: toDateOnly(item.deadline_date), note: item.note || '' }));

  const appointments = (calendarRows || [])
    .filter((item) => visibleAppointmentIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.title || 'Appointment',
      type: item.appointment_type || 'Appointment',
      date: toDateOnly(item.appointment_date),
      time: [item.start_time, item.end_time].filter(Boolean).join(' - '),
      location: item.location || '',
      status: item.status || 'Open',
      adviser: advisers.find((adviserItem) => adviserItem.id === item.adviser_id)?.name || adviser?.name || '',
    }));

  const billingMilestones = (billingRows || [])
    .filter((item) => visibleBillingIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.milestone || 'Billing milestone',
      dueDate: toDateOnly(item.due_date),
      amount: formatMoney(item.amount),
      status: effectivePortalBillingStatus(item),
      invoiceNo: item.invoice_no || '',
    }));

  return {
    clientName: [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client',
    matterType: client.case_type || '',
    adviser: adviser ? { name: adviser.name || '', email: adviser.email || '', phone: adviser.phone || '', profilePhotoUrl: adviser.profile_photo_url || '' } : { name: '', email: '', phone: '', profilePhotoUrl: '' },
    currentStage: currentStage?.label || 'Not yet published',
    progressPercent: progress,
    statusUpdate: client.portal_status_update || '',
    nextStep: client.portal_next_step || '',
    documentsStillRequired: documents,
    keyDates,
    appointments,
    billingMilestones,
    portalDocuments: (documentRows || []).map(mapPortalDocumentForClient),
    portalMessages: (messageRows || []).map(mapPortalMessageFromDb),
    turnerHopkins: TURNER_HOPKINS_CONTACT,
    lastUpdated: toDateTimeLabel(client.portal_last_published_at) || '',
  };
}


function effectivePortalBillingStatus(item = {}) {
  const status = String(item.status || 'WIP').trim() || 'WIP';
  if (status === 'WIP') {
    const due = toDateOnly(item.due_date);
    const today = toDateOnly(new Date());
    if (due && due < today) return 'Overdue';
  }
  return status;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function portalDeadlineKey(deadline = {}) {
  return ['deadline', deadline.deadline_type || '', toDateOnly(deadline.deadline_date) || '', deadline.note || ''].join('|').toLowerCase();
}

function verifyPortalAccessCode(code, stored) {
  if (!code || !stored) return false;
  const parts = String(stored).split(':');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const [, salt, expected] = parts;
  const actual = crypto.pbkdf2Sync(String(code || ''), salt, 120000, 32, 'sha256').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseDocumentChecklist(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : safeJson(value, []);
  return Array.isArray(raw) ? raw.map((item) => ({
    id: String(item.id || item.name || '').trim(),
    name: String(item.name || 'Document').trim(),
    applied: item.applied !== false,
    obtained: Boolean(item.obtained),
    expiryDate: toDateOnly(item.expiryDate || item.expiry_date),
  })).filter((item) => item.id || item.name) : [];
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function toDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateTimeLabel(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function corsHeaders() {
  return { 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json' };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}
