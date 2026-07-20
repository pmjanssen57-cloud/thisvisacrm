import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';
import crypto from 'node:crypto';

const STORE_NAME = 'commercial-documents';
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

export default async function commercialFileHandler(request) {
  if (request.method === 'OPTIONS') return new Response('', { status: 204 });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    await ensureSchema();
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) return uploadFile(request);
    const body = await request.json();
    if (body.action === 'download') return downloadFile(request, body);
    return json({ error: 'Unknown file action.' }, 400);
  } catch (error) {
    console.error('Commercial file request failed', error);
    return json({ error: String(error?.message || error) }, Number(error?.statusCode || 500));
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? getDatabase({ connectionString }) : getDatabase();
}

async function ensureSchema() {
  const database = db();
  await database.sql`ALTER TABLE commercial_documents ADD COLUMN IF NOT EXISTS blob_key TEXT`;
  await database.sql`ALTER TABLE commercial_documents ADD COLUMN IF NOT EXISTS file_name TEXT`;
  await database.sql`ALTER TABLE commercial_documents ADD COLUMN IF NOT EXISTS mime_type TEXT`;
  await database.sql`ALTER TABLE commercial_documents ADD COLUMN IF NOT EXISTS size_bytes BIGINT`;
  await database.sql`ALTER TABLE commercial_documents ADD COLUMN IF NOT EXISTS uploaded_by_type TEXT`;
}

async function uploadFile(request) {
  const form = await request.formData();
  const commercialClientId = clean(form.get('commercialClientId'), 100);
  if (!uuid(commercialClientId)) throw new Error('Commercial client was not found.');
  const auth = await authenticate(request, {
    email: form.get('email'),
    accessCode: form.get('accessCode'),
    commercialClientId,
  });
  if (auth.mode === 'portal' && auth.role === 'Read Only') return json({ error: 'This portal login is read-only.' }, 403);

  const file = form.get('file');
  if (!(file instanceof File) || !file.size) throw new Error('Choose a document to upload.');
  if (file.size > MAX_FILE_BYTES) throw new Error('The document is too large. The maximum direct upload size is 4 MB.');
  const mimeType = resolveAllowedMimeType(file.name, file.type);
  if (!mimeType) throw new Error('Upload a PDF, Word, Excel, CSV, JPG or PNG document.');

  const title = clean(form.get('title'), 1000) || clean(file.name, 1000);
  const category = clean(form.get('category'), 300) || 'Compliance';
  const workerId = nullableUuid(form.get('workerId'));
  const expiryDate = nullableDate(form.get('expiryDate'));
  const notes = clean(form.get('notes'), 12000);
  const visibleToEmployer = auth.mode === 'portal' ? true : String(form.get('visibleToEmployer') || 'true') !== 'false';
  const fileName = safeFileName(file.name || 'document');
  const documentId = crypto.randomUUID();
  const blobKey = `${commercialClientId}/${documentId}-${fileName}`;
  const store = getStore(STORE_NAME);
  await store.set(blobKey, file, {
    metadata: {
      commercialClientId,
      documentId,
      fileName,
      mimeType,
      uploadedBy: auth.email,
      uploadedByType: auth.mode === 'portal' ? 'Employer portal' : 'CRM adviser',
    },
  });

  const database = db();
  try {
    await database.sql`INSERT INTO commercial_documents (
      id, commercial_client_id, worker_id, title, category, document_url, blob_key, file_name, mime_type, size_bytes,
      uploaded_by_type, expiry_date, notes, visible_to_employer, created_by
    ) VALUES (
      ${documentId}, ${commercialClientId}, ${workerId}, ${title}, ${category}, '', ${blobKey}, ${fileName}, ${mimeType}, ${file.size},
      ${auth.mode === 'portal' ? 'Employer portal' : 'CRM adviser'}, ${expiryDate}, ${notes}, ${visibleToEmployer}, ${auth.email}
    )`;
    await database.sql`INSERT INTO commercial_audit_log (commercial_client_id, record_type, record_id, action, changed_by, changed_by_type, summary, changes)
      VALUES (${commercialClientId}, 'document', ${documentId}, 'uploaded', ${auth.email}, ${auth.mode === 'portal' ? 'Employer portal' : 'CRM adviser'},
        ${`Uploaded document ${title}.`}, ${JSON.stringify({ fileName, mimeType, sizeBytes: file.size })}::jsonb)`;
  } catch (error) {
    try { await store.delete(blobKey); } catch {}
    throw error;
  }
  return json({ ok: true, documentId, fileName, title });
}

async function downloadFile(request, body) {
  const documentId = clean(body.documentId, 100);
  if (!uuid(documentId)) throw new Error('Document was not found.');
  const database = db();
  const rows = await database.sql`SELECT id, commercial_client_id, blob_key, file_name, mime_type, visible_to_employer
    FROM commercial_documents WHERE id=${documentId} LIMIT 1`;
  const document = rows[0];
  if (!document?.blob_key) throw new Error('No uploaded file is attached to this document entry.');
  const auth = await authenticate(request, {
    email: body.email,
    accessCode: body.accessCode,
    commercialClientId: document.commercial_client_id,
  });
  if (auth.mode === 'portal' && document.visible_to_employer !== true) return json({ error: 'This document is not available in the employer portal.' }, 403);

  const arrayBuffer = await getStore(STORE_NAME).get(document.blob_key, { type: 'arrayBuffer', consistency: 'strong' });
  if (!arrayBuffer) throw new Error('The stored document could not be found.');
  const fileName = safeFileName(document.file_name || 'document');
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      'content-type': document.mime_type || 'application/octet-stream',
      'content-disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function authenticate(request, input = {}) {
  const email = normaliseEmail(input.email);
  const accessCode = String(input.accessCode || '').trim();
  if (email && accessCode) {
    const rows = await db().sql`SELECT u.id, u.commercial_client_id, u.name, u.email, u.role, u.active, u.access_code_hash,
      c.portal_enabled, c.client_status FROM commercial_portal_users u JOIN commercial_clients c ON c.id=u.commercial_client_id
      WHERE LOWER(BTRIM(u.email))=${email} AND u.commercial_client_id=${input.commercialClientId} ORDER BY u.updated_at DESC`;
    const row = rows.find((item) => verifyAccessCode(accessCode, item.access_code_hash));
    if (!row || row.active !== true || row.portal_enabled !== true || row.client_status === 'Closed') {
      const error = new Error('Employer portal access details were not recognised.'); error.statusCode = 401; throw error;
    }
    return { mode: 'portal', email: normaliseEmail(row.email), role: row.role || 'Company User' };
  }

  const expected = String(process.env.CRM_ACCESS_TOKEN || '').trim();
  const bearer = extractBearer(request.headers.get('authorization'));
  if (expected && bearer === expected) return { mode: 'crm', email: 'CRM access token', role: 'Admin' };
  try {
    const user = await getUser();
    if (user?.email) return { mode: 'crm', email: normaliseEmail(user.email), role: 'User' };
  } catch {}
  const error = new Error('CRM authentication is required.'); error.statusCode = 401; throw error;
}

function verifyAccessCode(code, stored) {
  if (!code || !stored) return false;
  const parts = String(stored).split(':');
  let iterations = 120000; let salt = ''; let expected = '';
  if (parts.length === 3 && parts[0] === 'pbkdf2') [, salt, expected] = parts;
  else if (parts.length === 4 && parts[0] === 'pbkdf2-sha256') { iterations = Number(parts[1]) || 120000; salt = parts[2]; expected = parts[3]; }
  else return false;
  if (!/^[0-9a-f]+$/i.test(expected) || expected.length !== 64 || !salt) return false;
  const expectedBuffer = Buffer.from(expected, 'hex');
  for (const candidate of accessCodeVariants(code)) {
    const actual = crypto.pbkdf2Sync(candidate, salt, iterations, 32, 'sha256');
    if (actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer)) return true;
  }
  return false;
}

function accessCodeVariants(code) {
  const raw = String(code || '').normalize('NFKC').trim();
  const normalised = raw.replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, '').toUpperCase();
  return [...new Set([raw, normalised, normalised.replace(/-/g, '')].filter(Boolean))];
}


function resolveAllowedMimeType(fileName, suppliedType) {
  const extension = String(fileName || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  const extensionTypes = {
    '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.csv': 'text/csv',
  };
  const expected = extensionTypes[extension];
  if (!expected) return '';
  const provided = clean(suppliedType, 200).toLowerCase();
  if (provided && provided !== 'application/octet-stream' && !ALLOWED_TYPES.has(provided)) return '';
  return provided && ALLOWED_TYPES.has(provided) ? provided : expected;
}

function safeFileName(value) { return clean(value, 200).replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, ' ').trim() || 'document'; }
function clean(value, max = 12000) { return String(value ?? '').trim().slice(0, max); }
function normaliseEmail(value) { return String(value || '').normalize('NFKC').trim().toLowerCase(); }
function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }
function nullableUuid(value) { return uuid(value) ? value : null; }
function nullableDate(value) { const text = String(value || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; }
function extractBearer(value) { const match = String(value || '').match(/^Bearer\s+(.+)$/i); return match ? match[1] : ''; }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
