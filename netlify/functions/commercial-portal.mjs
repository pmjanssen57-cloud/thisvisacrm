import { getDatabase } from '@netlify/database';
import crypto from 'node:crypto';

export default async function commercialPortalRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    await ensureCommercialSchema();
    const body = await request.json();
    const email = normalisePortalEmail(body.email);
    const accessCode = String(body.accessCode || '').trim();
    const session = await authenticatePortalUser(email, accessCode);
    if (!session) return json({ error: 'Email or access code was not recognised.' }, 401);
    const action = String(body.action || 'login');
    if (action === 'login') {
      await markPortalAccess(session);
      return json({ session: publicSession(session), snapshot: await buildSnapshot(session.commercialClientId) });
    }
    if (session.role === 'Read Only') return json({ error: 'This portal login is read-only.' }, 403);

    if (action === 'saveWorker') {
      await saveWorker(session, body.worker || {});
    } else if (action === 'archiveWorker') {
      await archiveWorker(session, body.workerId);
    } else if (action === 'saveComplianceItem') {
      await saveComplianceItem(session, body.item || {});
    } else if (action === 'archiveComplianceItem') {
      await archiveComplianceItem(session, body.itemId);
    } else if (action === 'saveAccreditation') {
      if (session.role !== 'Company Admin') return json({ error: 'Company Admin access is required to update accreditation details.' }, 403);
      await saveAccreditation(session, body.accreditation || {});
    } else if (action === 'saveDocument') {
      await saveDocument(session, body.document || {});
    } else if (action === 'deleteDocument') {
      await deleteDocument(session, body.documentId);
    } else {
      return json({ error: `Unknown action: ${action}` }, 400);
    }
    return json({ session: publicSession(session), snapshot: await buildSnapshot(session.commercialClientId) });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? getDatabase({ connectionString }) : getDatabase();
}

async function ensureCommercialSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`CREATE TABLE IF NOT EXISTS commercial_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), legal_name TEXT NOT NULL, trading_name TEXT, nzbn TEXT, company_number TEXT,
    industry TEXT, business_description TEXT, address TEXT, primary_contact_name TEXT, primary_contact_email TEXT, primary_contact_phone TEXT,
    primary_adviser_id UUID, backup_adviser_id UUID, client_status TEXT NOT NULL DEFAULT 'Active', sharepoint_folder_url TEXT, one_law_client_number TEXT,
    accreditation_type TEXT, accreditation_status TEXT NOT NULL DEFAULT 'Not recorded', accreditation_approval_date DATE, accreditation_expiry_date DATE,
    accreditation_renewal_date DATE, accreditation_notes TEXT, compliance_summary TEXT, internal_notes TEXT,
    portal_enabled BOOLEAN NOT NULL DEFAULT FALSE, portal_last_accessed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await database.sql`CREATE TABLE IF NOT EXISTS commercial_portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Company User', active BOOLEAN NOT NULL DEFAULT TRUE,
    access_code_hash TEXT, last_accessed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (commercial_client_id, email))`;
  await database.sql`CREATE TABLE IF NOT EXISTS commercial_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL, email TEXT, phone TEXT, job_title TEXT, work_location TEXT, visa_type TEXT, visa_start_date DATE, visa_expiry_date DATE,
    passport_expiry_date DATE, employment_start_date DATE, employment_end_date DATE, hours_per_week NUMERIC(6,2), pay_rate NUMERIC(12,2),
    job_check_reference TEXT, visa_conditions TEXT, responsible_manager TEXT, status TEXT NOT NULL DEFAULT 'Active', adviser_review_status TEXT NOT NULL DEFAULT 'Needs review',
    employer_notes TEXT, internal_notes TEXT, created_by TEXT, updated_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await database.sql`CREATE TABLE IF NOT EXISTS commercial_compliance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES commercial_workers(id) ON DELETE SET NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'General compliance',
    status TEXT NOT NULL DEFAULT 'Open', due_date DATE, completed_date DATE, employer_notes TEXT, internal_notes TEXT,
    adviser_review_status TEXT NOT NULL DEFAULT 'Needs review', created_by TEXT, updated_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await database.sql`CREATE TABLE IF NOT EXISTS commercial_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES commercial_workers(id) ON DELETE SET NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Compliance',
    document_url TEXT, expiry_date DATE, notes TEXT, visible_to_employer BOOLEAN NOT NULL DEFAULT TRUE, created_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await database.sql`CREATE TABLE IF NOT EXISTS commercial_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL, record_id UUID, action TEXT NOT NULL, changed_by TEXT, changed_by_type TEXT NOT NULL DEFAULT 'Employer portal',
    summary TEXT, changes JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

async function authenticatePortalUser(email, accessCode) {
  if (!email || !accessCode) return null;
  const rows = await db().sql`
    SELECT u.id, u.commercial_client_id, u.name, u.email, u.role, u.active, u.access_code_hash,
      c.legal_name, c.trading_name, c.portal_enabled, c.client_status
    FROM commercial_portal_users u
    JOIN commercial_clients c ON c.id=u.commercial_client_id
    WHERE LOWER(BTRIM(u.email))=${email}
    ORDER BY u.updated_at DESC`;
  const row = rows.find((item) => verifyAccessCode(accessCode, item.access_code_hash));
  if (!row || row.active !== true || row.portal_enabled !== true || row.client_status === 'Closed') return null;
  return {
    id: row.id,
    commercialClientId: row.commercial_client_id,
    name: row.name || '',
    email: normalisePortalEmail(row.email),
    role: ['Company Admin', 'Company User', 'Read Only'].includes(row.role) ? row.role : 'Company User',
    companyName: row.trading_name || row.legal_name || '',
  };
}

function publicSession(session) {
  return { name: session.name, email: session.email, role: session.role, companyName: session.companyName };
}

async function markPortalAccess(session) {
  await Promise.all([
    db().sql`UPDATE commercial_portal_users SET last_accessed_at=NOW() WHERE id=${session.id}`,
    db().sql`UPDATE commercial_clients SET portal_last_accessed_at=NOW() WHERE id=${session.commercialClientId}`,
    audit(session, 'portal', session.id, 'login', 'Signed in to the employer portal.', {}),
  ]);
}

async function buildSnapshot(companyId) {
  const database = db();
  const [companies, workers, compliance, documents, auditRows] = await Promise.all([
    database.sql`SELECT id, legal_name, trading_name, nzbn, company_number, industry, address, primary_contact_name, primary_contact_email, primary_contact_phone,
      accreditation_type, accreditation_status, accreditation_approval_date, accreditation_expiry_date, accreditation_renewal_date, accreditation_notes, compliance_summary
      FROM commercial_clients WHERE id=${companyId} AND portal_enabled=TRUE LIMIT 1`,
    database.sql`SELECT id, full_name, email, phone, job_title, work_location, visa_type, visa_start_date, visa_expiry_date, passport_expiry_date,
      employment_start_date, employment_end_date, hours_per_week, pay_rate, job_check_reference, visa_conditions, responsible_manager, status,
      adviser_review_status, employer_notes, created_by, updated_by, created_at, updated_at
      FROM commercial_workers WHERE commercial_client_id=${companyId} AND status <> 'Archived' ORDER BY status ASC, visa_expiry_date ASC NULLS LAST, full_name ASC`,
    database.sql`SELECT id, worker_id, title, category, status, due_date, completed_date, employer_notes, adviser_review_status, created_by, updated_by, created_at, updated_at
      FROM commercial_compliance_items WHERE commercial_client_id=${companyId} AND status <> 'Archived' ORDER BY status ASC, due_date ASC NULLS LAST`,
    database.sql`SELECT id, worker_id, title, category, document_url, expiry_date, notes, visible_to_employer, created_by, created_at, updated_at
      FROM commercial_documents WHERE commercial_client_id=${companyId} AND visible_to_employer=TRUE ORDER BY expiry_date ASC NULLS LAST, created_at DESC`,
    database.sql`SELECT id, record_type, record_id, action, changed_by, changed_by_type, summary, created_at
      FROM commercial_audit_log WHERE commercial_client_id=${companyId} ORDER BY created_at DESC LIMIT 80`,
  ]);
  const company = companies[0];
  if (!company) throw new Error('This employer portal is not available.');
  return {
    company: {
      id: company.id, legalName: company.legal_name || '', tradingName: company.trading_name || '', nzbn: company.nzbn || '', companyNumber: company.company_number || '',
      industry: company.industry || '', address: company.address || '', primaryContactName: company.primary_contact_name || '',
      primaryContactEmail: company.primary_contact_email || '', primaryContactPhone: company.primary_contact_phone || '',
      accreditationType: company.accreditation_type || '', accreditationStatus: company.accreditation_status || 'Not recorded',
      accreditationApprovalDate: dateOnly(company.accreditation_approval_date), accreditationExpiryDate: dateOnly(company.accreditation_expiry_date),
      accreditationRenewalDate: dateOnly(company.accreditation_renewal_date), accreditationNotes: company.accreditation_notes || '', complianceSummary: company.compliance_summary || '',
    },
    workers: workers.map((row) => ({ id: row.id, fullName: row.full_name || '', email: row.email || '', phone: row.phone || '', jobTitle: row.job_title || '',
      workLocation: row.work_location || '', visaType: row.visa_type || '', visaStartDate: dateOnly(row.visa_start_date), visaExpiryDate: dateOnly(row.visa_expiry_date),
      passportExpiryDate: dateOnly(row.passport_expiry_date), employmentStartDate: dateOnly(row.employment_start_date), employmentEndDate: dateOnly(row.employment_end_date),
      hoursPerWeek: row.hours_per_week === null ? '' : Number(row.hours_per_week), payRate: row.pay_rate === null ? '' : Number(row.pay_rate),
      jobCheckReference: row.job_check_reference || '', visaConditions: row.visa_conditions || '', responsibleManager: row.responsible_manager || '', status: row.status || 'Active',
      adviserReviewStatus: row.adviser_review_status || 'Needs review', employerNotes: row.employer_notes || '', createdBy: row.created_by || '', updatedBy: row.updated_by || '',
      createdAt: row.created_at || '', updatedAt: row.updated_at || '' })),
    complianceItems: compliance.map((row) => ({ id: row.id, workerId: row.worker_id || '', title: row.title || '', category: row.category || '', status: row.status || 'Open',
      dueDate: dateOnly(row.due_date), completedDate: dateOnly(row.completed_date), employerNotes: row.employer_notes || '', adviserReviewStatus: row.adviser_review_status || 'Needs review',
      createdBy: row.created_by || '', updatedBy: row.updated_by || '', createdAt: row.created_at || '', updatedAt: row.updated_at || '' })),
    documents: documents.map((row) => ({ id: row.id, workerId: row.worker_id || '', title: row.title || '', category: row.category || '', documentUrl: row.document_url || '',
      expiryDate: dateOnly(row.expiry_date), notes: row.notes || '', createdBy: row.created_by || '', createdAt: row.created_at || '', updatedAt: row.updated_at || '' })),
    auditLog: auditRows.map((row) => ({ id: row.id, recordType: row.record_type || '', recordId: row.record_id || '', action: row.action || '', changedBy: row.changed_by || '',
      changedByType: row.changed_by_type || '', summary: row.summary || '', createdAt: row.created_at || '' })),
  };
}

async function saveWorker(session, input) {
  const id = uuid(input.id) ? input.id : null;
  const fullName = clean(input.fullName, 500);
  if (!fullName) throw new Error('Enter the worker name.');
  const database = db();
  let savedId = id;
  if (id) {
    await database.sql`UPDATE commercial_workers SET full_name=${fullName}, email=${clean(input.email, 500).toLowerCase()}, phone=${clean(input.phone, 200)},
      job_title=${clean(input.jobTitle, 500)}, work_location=${clean(input.workLocation, 500)}, visa_type=${clean(input.visaType, 300)}, visa_start_date=${nullableDate(input.visaStartDate)},
      visa_expiry_date=${nullableDate(input.visaExpiryDate)}, passport_expiry_date=${nullableDate(input.passportExpiryDate)}, employment_start_date=${nullableDate(input.employmentStartDate)},
      employment_end_date=${nullableDate(input.employmentEndDate)}, hours_per_week=${nullableNumber(input.hoursPerWeek)}, pay_rate=${nullableNumber(input.payRate)},
      job_check_reference=${clean(input.jobCheckReference, 300)}, visa_conditions=${clean(input.visaConditions, 6000)}, responsible_manager=${clean(input.responsibleManager, 500)},
      status=${['Active','Upcoming','Former'].includes(input.status) ? input.status : 'Active'}, adviser_review_status='Needs review', employer_notes=${clean(input.employerNotes, 12000)},
      updated_by=${session.email}, updated_at=NOW() WHERE id=${id} AND commercial_client_id=${session.commercialClientId}`;
  } else {
    const rows = await database.sql`INSERT INTO commercial_workers (commercial_client_id, full_name, email, phone, job_title, work_location, visa_type, visa_start_date, visa_expiry_date,
      passport_expiry_date, employment_start_date, employment_end_date, hours_per_week, pay_rate, job_check_reference, visa_conditions, responsible_manager, status,
      adviser_review_status, employer_notes, created_by, updated_by) VALUES (${session.commercialClientId}, ${fullName}, ${clean(input.email,500).toLowerCase()}, ${clean(input.phone,200)},
      ${clean(input.jobTitle,500)}, ${clean(input.workLocation,500)}, ${clean(input.visaType,300)}, ${nullableDate(input.visaStartDate)}, ${nullableDate(input.visaExpiryDate)},
      ${nullableDate(input.passportExpiryDate)}, ${nullableDate(input.employmentStartDate)}, ${nullableDate(input.employmentEndDate)}, ${nullableNumber(input.hoursPerWeek)}, ${nullableNumber(input.payRate)},
      ${clean(input.jobCheckReference,300)}, ${clean(input.visaConditions,6000)}, ${clean(input.responsibleManager,500)}, ${['Active','Upcoming','Former'].includes(input.status) ? input.status : 'Active'},
      'Needs review', ${clean(input.employerNotes,12000)}, ${session.email}, ${session.email}) RETURNING id`;
    savedId = rows[0]?.id;
  }
  await audit(session, 'worker', savedId, id ? 'updated' : 'created', `${id ? 'Updated' : 'Created'} worker ${fullName}.`, { visaExpiryDate: input.visaExpiryDate || '' });
}

async function archiveWorker(session, workerId) {
  if (!uuid(workerId)) throw new Error('Worker was not found.');
  const rows = await db().sql`SELECT full_name FROM commercial_workers WHERE id=${workerId} AND commercial_client_id=${session.commercialClientId} LIMIT 1`;
  await db().sql`UPDATE commercial_workers SET status='Archived', adviser_review_status='Needs review', updated_by=${session.email}, updated_at=NOW() WHERE id=${workerId} AND commercial_client_id=${session.commercialClientId}`;
  await audit(session, 'worker', workerId, 'archived', `Archived worker ${rows[0]?.full_name || ''}.`, {});
}

async function saveComplianceItem(session, input) {
  const id = uuid(input.id) ? input.id : null;
  const title = clean(input.title, 1000);
  if (!title) throw new Error('Enter a compliance item title.');
  const status = ['Open','In progress','Completed','Issue'].includes(input.status) ? input.status : 'Open';
  const database = db();
  let savedId = id;
  if (id) {
    await database.sql`UPDATE commercial_compliance_items SET worker_id=${nullableUuid(input.workerId)}, title=${title}, category=${clean(input.category,300) || 'General compliance'},
      status=${status}, due_date=${nullableDate(input.dueDate)}, completed_date=${nullableDate(input.completedDate)}, employer_notes=${clean(input.employerNotes,12000)},
      adviser_review_status='Needs review', updated_by=${session.email}, updated_at=NOW() WHERE id=${id} AND commercial_client_id=${session.commercialClientId}`;
  } else {
    const rows = await database.sql`INSERT INTO commercial_compliance_items (commercial_client_id, worker_id, title, category, status, due_date, completed_date, employer_notes,
      adviser_review_status, created_by, updated_by) VALUES (${session.commercialClientId}, ${nullableUuid(input.workerId)}, ${title}, ${clean(input.category,300) || 'General compliance'},
      ${status}, ${nullableDate(input.dueDate)}, ${nullableDate(input.completedDate)}, ${clean(input.employerNotes,12000)}, 'Needs review', ${session.email}, ${session.email}) RETURNING id`;
    savedId = rows[0]?.id;
  }
  await audit(session, 'compliance', savedId, id ? 'updated' : 'created', `${id ? 'Updated' : 'Created'} compliance item ${title}.`, { status, dueDate: input.dueDate || '' });
}

async function archiveComplianceItem(session, itemId) {
  if (!uuid(itemId)) throw new Error('Compliance item was not found.');
  const rows = await db().sql`SELECT title FROM commercial_compliance_items WHERE id=${itemId} AND commercial_client_id=${session.commercialClientId} LIMIT 1`;
  await db().sql`UPDATE commercial_compliance_items SET status='Archived', adviser_review_status='Needs review', updated_by=${session.email}, updated_at=NOW() WHERE id=${itemId} AND commercial_client_id=${session.commercialClientId}`;
  await audit(session, 'compliance', itemId, 'archived', `Archived compliance item ${rows[0]?.title || ''}.`, {});
}

async function saveAccreditation(session, input) {
  await db().sql`UPDATE commercial_clients SET accreditation_type=${clean(input.accreditationType,300)},
    accreditation_status=${['Not recorded','Preparing','Submitted','Accredited','Suspended','Expired'].includes(input.accreditationStatus) ? input.accreditationStatus : 'Not recorded'},
    accreditation_approval_date=${nullableDate(input.accreditationApprovalDate)}, accreditation_expiry_date=${nullableDate(input.accreditationExpiryDate)},
    accreditation_renewal_date=${nullableDate(input.accreditationRenewalDate)}, accreditation_notes=${clean(input.accreditationNotes,12000)}, updated_at=NOW()
    WHERE id=${session.commercialClientId}`;
  await audit(session, 'accreditation', session.commercialClientId, 'updated', 'Updated accreditation details.', { accreditationExpiryDate: input.accreditationExpiryDate || '' });
}

async function saveDocument(session, input) {
  const id = uuid(input.id) ? input.id : null;
  const title = clean(input.title, 1000);
  if (!title) throw new Error('Enter a document title.');
  const database = db();
  let savedId = id;
  if (id) {
    await database.sql`UPDATE commercial_documents SET worker_id=${nullableUuid(input.workerId)}, title=${title}, category=${clean(input.category,300) || 'Compliance'},
      document_url=${safeUrl(input.documentUrl)}, expiry_date=${nullableDate(input.expiryDate)}, notes=${clean(input.notes,12000)}, visible_to_employer=TRUE, updated_at=NOW()
      WHERE id=${id} AND commercial_client_id=${session.commercialClientId}`;
  } else {
    const rows = await database.sql`INSERT INTO commercial_documents (commercial_client_id, worker_id, title, category, document_url, expiry_date, notes, visible_to_employer, created_by)
      VALUES (${session.commercialClientId}, ${nullableUuid(input.workerId)}, ${title}, ${clean(input.category,300) || 'Compliance'}, ${safeUrl(input.documentUrl)},
      ${nullableDate(input.expiryDate)}, ${clean(input.notes,12000)}, TRUE, ${session.email}) RETURNING id`;
    savedId = rows[0]?.id;
  }
  await audit(session, 'document', savedId, id ? 'updated' : 'created', `${id ? 'Updated' : 'Added'} document ${title}.`, {});
}

async function deleteDocument(session, documentId) {
  if (!uuid(documentId)) throw new Error('Document was not found.');
  const rows = await db().sql`SELECT title FROM commercial_documents WHERE id=${documentId} AND commercial_client_id=${session.commercialClientId} LIMIT 1`;
  await db().sql`DELETE FROM commercial_documents WHERE id=${documentId} AND commercial_client_id=${session.commercialClientId}`;
  await audit(session, 'document', documentId, 'deleted', `Removed document ${rows[0]?.title || ''}.`, {});
}

async function audit(session, recordType, recordId, action, summary, changes) {
  await db().sql`INSERT INTO commercial_audit_log (commercial_client_id, record_type, record_id, action, changed_by, changed_by_type, summary, changes)
    VALUES (${session.commercialClientId}, ${recordType}, ${nullableUuid(recordId)}, ${action}, ${session.email}, 'Employer portal', ${summary}, ${JSON.stringify(changes || {})}::jsonb)`;
}

function verifyAccessCode(code, stored) {
  if (!code || !stored) return false;
  const parts = String(stored).split(':');
  let iterations = 120000;
  let salt = '';
  let expected = '';
  if (parts.length === 3 && parts[0] === 'pbkdf2') {
    [, salt, expected] = parts;
  } else if (parts.length === 4 && parts[0] === 'pbkdf2-sha256') {
    iterations = Number(parts[1]) || 120000;
    salt = parts[2];
    expected = parts[3];
  } else {
    return false;
  }
  if (!/^[0-9a-f]+$/i.test(expected) || expected.length !== 64 || !salt) return false;
  const expectedBuffer = Buffer.from(expected, 'hex');
  for (const candidate of accessCodeVariants(code)) {
    const actual = crypto.pbkdf2Sync(candidate, salt, iterations, 32, 'sha256');
    try {
      if (actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer)) return true;
    } catch {
      // Try the next normalised variant.
    }
  }
  return false;
}

function accessCodeVariants(code) {
  const raw = String(code || '').normalize('NFKC').trim();
  const normalised = raw.replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, '').toUpperCase();
  return [...new Set([raw, normalised, normalised.replace(/-/g, '')].filter(Boolean))];
}

function normalisePortalEmail(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase();
}

function clean(value, max = 12000) { return String(value ?? '').trim().slice(0, max); }
function safeUrl(value) { const text=clean(value,3000); if (!text) return ''; try { const parsed=new URL(text); return ['http:','https:'].includes(parsed.protocol) ? parsed.toString() : ''; } catch { return ''; } }
function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }
function nullableUuid(value) { return uuid(value) ? value : null; }
function nullableDate(value) { const text=String(value||'').slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; }
function nullableNumber(value) { const number=Number(value); return Number.isFinite(number) ? number : null; }
function dateOnly(value) { if (!value) return ''; if (typeof value === 'string') return value.slice(0,10); try { return new Date(value).toISOString().slice(0,10); } catch { return ''; } }
function corsHeaders() { return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }; }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: corsHeaders() }); }
