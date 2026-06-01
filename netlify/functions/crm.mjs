import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';

const STAGE_TEMPLATES = [
  { id: 'instruction-sent', label: 'Instruction Sent', mandatory: true, sortOrder: 1 },
  { id: 'documentation-gathering', label: 'Documentation Gathering', mandatory: true, sortOrder: 2 },
  { id: 'iqa-ready', label: 'IQA Ready', mandatory: false, sortOrder: 3 },
  { id: 'visitor-visa-ready', label: 'Visitor Visa Ready', mandatory: false, sortOrder: 4 },
  { id: 'work-visa-ready', label: 'Work Visa Ready', mandatory: false, sortOrder: 5 },
  { id: 'family-temporary-visas-ready', label: 'Family Temporary Visas Ready', mandatory: false, sortOrder: 6 },
  { id: 'residence-ready', label: 'Residence Ready', mandatory: false, sortOrder: 7 },
  { id: 'residence-approved', label: 'Residence Approved', mandatory: false, sortOrder: 8 },
];

const STAGE_KEY_ALIASES = {
  'instructions-sent': 'instruction-sent',
  'visitor-visa-lodged': 'visitor-visa-ready',
  'work-visa-lodged': 'work-visa-ready',
  'family-temporary-visas-lodged': 'family-temporary-visas-ready',
  'residence-lodged': 'residence-ready',
  'residence-approved-finalised': 'residence-approved',
};
const CASE_TYPES = [
  'SMC Residence - Green List',
  'SMC Residence - Points',
  'Partner Residence',
  'Parent Residence',
  'Parent Retirement',
  'Active Investor',
  'AEWV Only',
  'Partner WV Only',
  'Specific Purpose Work Visa',
  'Citizenship',
  'Permanent Residence',
  'Student Visa (Intl)',
];

const DEADLINE_TYPES = [
  'Visa Expiry Date',
  'Medical Expiry Date',
  'Police Clearance Expiry Date',
  'PPI Response Date',
  'Filing Deadline Date',
];

const APPOINTMENT_TYPES = ['Client meeting', 'Adviser review', 'Lodgement target', 'Document follow-up', 'INZ call', 'Billing follow-up', 'Internal review', 'Other'];

const DOCUMENT_CHECKLIST_TEMPLATES = [
  { id: 'passports', name: 'Passports' },
  { id: 'passport-photos', name: 'Passport photos' },
  { id: 'birth-certificates', name: 'Birth certificates' },
  { id: 'marriage-certificate', name: 'Marriage certificate' },
  { id: 'relationship-evidence', name: 'Relationship evidence' },
  { id: 'work-experience', name: 'Work experience' },
  { id: 'qualifications', name: 'Qualifications' },
  { id: 'custody-documents', name: 'Custody documents' },
  { id: 'medicals', name: 'Medicals' },
  { id: 'police-clearances', name: 'Police Clearances' },
];

export default async function crmRequestHandler(request, context = {}) {
  const method = String(request.method || 'GET').toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? '' : await request.text();
  const response = await handleCrmEvent({
    httpMethod: method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    context,
    rawUrl: request.url,
  });
  return new Response(response.body || '', {
    status: response.statusCode || 200,
    headers: response.headers || {},
  });
}

async function handleCrmEvent(event) {
  try {
    const method = event.httpMethod || 'GET';
    if (method === 'OPTIONS') return empty(204);

    const auth = await checkAuth(event);
    if (!auth.ok) return json({ error: 'Unauthorised. Enter the internal CRM access code.' }, 401);

    await ensureSchema();

    if (method === 'GET') {
      const data = await readCrmData();
      return json({ ...data, securityMode: auth.mode, authUser: serialiseIdentityUser(auth.user) });
    }

    if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;

    if (action === 'seed') {
      await seedSampleData();
      return json(await readCrmData());
    }

    if (action === 'saveAdviser') {
      const adviser = await saveAdviser(body.adviser);
      return json({ adviser, ...(await readCrmData()) });
    }

    if (action === 'savePersonalTask') {
      const personalTask = await savePersonalTask(body.task);
      return json({ personalTask, ...(await readCrmData()) });
    }

    if (action === 'deletePersonalTask') {
      await deletePersonalTask(body.taskId);
      return json(await readCrmData());
    }

    if (action === 'saveCalendarEntry') {
      const calendarEntry = await saveCalendarEntry(body.entry);
      return json({ calendarEntry, ...(await readCrmData()) });
    }

    if (action === 'deleteCalendarEntry') {
      await deleteCalendarEntry(body.entryId);
      return json(await readCrmData());
    }

    if (action === 'saveClient') {
      const client = await saveClient(body.client);
      return json({ client, ...(await readCrmData()) });
    }

    if (action === 'deleteClient') {
      await deleteClient(body.clientId);
      return json(await readCrmData());
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: 'CRM function error', detail: String(error?.message || error) }, 500);
  }
}

async function checkAuth(event) {
  const expected = process.env.CRM_ACCESS_TOKEN;
  const headers = event.headers || {};
  const provided = headers['x-crm-token'] || headers['X-CRM-Token'] || extractBearer(headers.authorization || headers.Authorization);

  if (expected && provided === expected) return { ok: true, mode: 'token-fallback' };

  const contextUser = event.context?.clientContext?.user || event.context?.user || null;
  if (contextUser?.email) return { ok: true, mode: 'identity-context', user: contextUser };

  try {
    const user = await getUser();
    if (user?.email) return { ok: true, mode: 'identity', user };
  } catch (error) {
    console.warn('Identity check failed', error?.message || error);
  }

  if (!expected) return { ok: true, mode: 'open-prototype' };
  return { ok: false, mode: 'none' };
}

function serialiseIdentityUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    name: user.name || '',
    role: user.role || '',
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

function extractBearer(value) {
  if (!value) return '';
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : value;
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) {
    return getDatabase({ connectionString });
  }
  return getDatabase();
}


async function ensureSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS advisers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      login_email TEXT,
      phone TEXT,
      licence TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name TEXT,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      nationality TEXT,
      date_of_birth DATE,
      location TEXT,
      sharepoint_folder_url TEXT,
      matter_name TEXT,
      case_strategy TEXT,
      case_type TEXT NOT NULL,
      primary_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      backup_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      priority TEXT NOT NULL DEFAULT 'Normal',
      client_status TEXT NOT NULL DEFAULT 'Active',
      next_action TEXT,
      next_action_due DATE,
      next_action_log JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      family_members JSONB NOT NULL DEFAULT '[]'::jsonb,
      document_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      stage_key TEXT NOT NULL,
      stage_label TEXT NOT NULL,
      mandatory BOOLEAN NOT NULL DEFAULT FALSE,
      applied BOOLEAN NOT NULL DEFAULT TRUE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_date DATE,
      sort_order INTEGER NOT NULL,
      UNIQUE (client_id, stage_key)
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_deadlines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      deadline_type TEXT NOT NULL,
      deadline_date DATE,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS billing_milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      milestone TEXT NOT NULL,
      due_date DATE,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'WIP',
      invoice_no TEXT,
      billing_trigger_type TEXT NOT NULL DEFAULT 'Date',
      billing_stage_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS personal_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'Open',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS calendar_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      appointment_type TEXT NOT NULL DEFAULT 'Client meeting',
      appointment_date DATE NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`ALTER TABLE advisers ADD COLUMN IF NOT EXISTS login_email TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS case_strategy TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS family_members JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS document_checklist JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS sharepoint_folder_url TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_action_log JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE calendar_entries ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'Client meeting'`;
  await database.sql`ALTER TABLE billing_milestones ADD COLUMN IF NOT EXISTS billing_trigger_type TEXT NOT NULL DEFAULT 'Date'`;
  await database.sql`ALTER TABLE billing_milestones ADD COLUMN IF NOT EXISTS billing_stage_key TEXT`;
  await database.sql`UPDATE billing_milestones SET status = 'WIP' WHERE status IN ('Draft', 'Scheduled')`;
  await database.sql`UPDATE billing_milestones SET status = 'Invoiced' WHERE status = 'Paid'`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_advisers_login_email ON advisers (LOWER(login_email))`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_case_type ON clients(case_type)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_primary_adviser ON clients(primary_adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_client_deadlines_date ON client_deadlines(deadline_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_billing_milestones_due_date ON billing_milestones(due_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_personal_tasks_due_date ON personal_tasks(due_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_personal_tasks_adviser ON personal_tasks(adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_calendar_entries_date ON calendar_entries(appointment_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_calendar_entries_client ON calendar_entries(client_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_calendar_entries_adviser ON calendar_entries(adviser_id)`;
}


async function readCrmData() {
  const database = db();
  const [advisers, clients, stages, deadlines, billing, personalTasks, calendarEntries] = await Promise.all([
    database.sql`SELECT id, name, role, email, login_email, phone, licence, active FROM advisers ORDER BY name ASC`,
    database.sql`SELECT id, first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, next_action_log, notes, family_members, document_checklist FROM clients ORDER BY updated_at DESC`,
    database.sql`SELECT id, client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order FROM client_stages ORDER BY sort_order ASC`,
    database.sql`SELECT id, client_id, deadline_type, deadline_date, note FROM client_deadlines ORDER BY deadline_date ASC NULLS LAST`,
    database.sql`SELECT id, client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key FROM billing_milestones ORDER BY due_date ASC NULLS LAST`,
    database.sql`SELECT id, adviser_id, client_id, title, due_date, status, note FROM personal_tasks ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    database.sql`SELECT id, client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status FROM calendar_entries ORDER BY appointment_date ASC, start_time ASC NULLS LAST, created_at DESC`,
  ]);

  return {
    advisers: advisers.map(mapAdviserFromDb),
    clients: clients.map((client) => mapClientFromDb(client, stages, deadlines, billing)),
    personalTasks: personalTasks.map(mapPersonalTaskFromDb),
    calendarEntries: calendarEntries.map(mapCalendarEntryFromDb),
    caseTypes: CASE_TYPES,
    deadlineTypes: DEADLINE_TYPES,
    stageTemplates: STAGE_TEMPLATES,
  };
}

function mapAdviserFromDb(row) {
  return {
    id: row.id,
    name: row.name || '',
    role: row.role || '',
    email: row.email || '',
    loginEmail: row.login_email || '',
    phone: row.phone || '',
    licence: row.licence || '',
    active: Boolean(row.active),
  };
}

function mapPersonalTaskFromDb(row) {
  return {
    id: row.id,
    adviserId: row.adviser_id || '',
    clientId: row.client_id || '',
    title: row.title || '',
    dueDate: toDateOnly(row.due_date),
    status: row.status === 'Completed' ? 'Completed' : 'Open',
    note: row.note || '',
  };
}

function mapCalendarEntryFromDb(row) {
  return {
    id: row.id,
    clientId: row.client_id || '',
    adviserId: row.adviser_id || '',
    title: row.title || '',
    appointmentType: normaliseAppointmentType(row.appointment_type),
    appointmentDate: toDateOnly(row.appointment_date),
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    location: row.location || '',
    notes: row.notes || '',
    status: row.status === 'Completed' ? 'Completed' : 'Open',
  };
}

function mapClientFromDb(row, stages, deadlines, billing) {
  const clientStages = stages
    .filter((stage) => stage.client_id === row.id)
    .map((stage) => ({
      id: stage.stage_key,
      dbId: stage.id,
      label: stage.stage_label,
      mandatory: Boolean(stage.mandatory),
      applied: Boolean(stage.applied),
      completed: Boolean(stage.completed),
      completedDate: toDateOnly(stage.completed_date),
      sortOrder: Number(stage.sort_order),
    }));

  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    nationality: row.nationality || '',
    dateOfBirth: toDateOnly(row.date_of_birth),
    location: row.location || '',
    sharepointFolderUrl: row.sharepoint_folder_url || '',
    matterName: row.matter_name || '',
    caseStrategy: row.case_strategy || '',
    caseType: row.case_type || CASE_TYPES[0],
    primaryAdviserId: row.primary_adviser_id || '',
    backupAdviserId: row.backup_adviser_id || '',
    priority: row.priority || 'Normal',
    clientStatus: row.client_status || 'Active',
    nextAction: row.next_action || '',
    nextActionDue: toDateOnly(row.next_action_due),
    nextActionLog: parseNextActionLog(row.next_action_log),
    notes: row.notes || '',
    familyMembers: parseFamilyMembers(row.family_members),
    documentChecklist: parseDocumentChecklist(row.document_checklist),
    stages: normaliseStages(clientStages),
    deadlines: deadlines
      .filter((deadline) => deadline.client_id === row.id)
      .map((deadline) => ({
        id: deadline.id,
        type: deadline.deadline_type,
        date: toDateOnly(deadline.deadline_date),
        note: deadline.note || '',
      })),
    billing: billing
      .filter((item) => item.client_id === row.id)
      .map((item) => ({
        id: item.id,
        milestone: item.milestone || '',
        dueDate: toDateOnly(item.due_date),
        amount: Number(item.amount || 0),
        status: normaliseBillingStatus(item.status),
        invoiceNo: item.invoice_no || '',
        triggerType: normaliseBillingTriggerType(item.billing_trigger_type),
        stageKey: normaliseStageKey(item.billing_stage_key || ''),
      })),
  };
}

async function saveAdviser(adviser = {}) {
  const database = db();
  const id = isUuid(adviser.id) ? adviser.id : null;

  if (id) {
    const rows = await database.sql`
      UPDATE advisers
      SET name = ${adviser.name || 'Unnamed adviser'},
          role = ${adviser.role || ''},
          email = ${adviser.email || ''},
          login_email = ${adviser.loginEmail || adviser.login_email || ''},
          phone = ${adviser.phone || ''},
          licence = ${adviser.licence || ''},
          active = ${adviser.active !== false},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, role, email, login_email, phone, licence, active
    `;
    return mapAdviserFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO advisers (name, role, email, login_email, phone, licence, active)
    VALUES (${adviser.name || 'New adviser'}, ${adviser.role || 'Licensed Immigration Adviser'}, ${adviser.email || ''}, ${adviser.loginEmail || adviser.login_email || ''}, ${adviser.phone || ''}, ${adviser.licence || ''}, ${adviser.active !== false})
    RETURNING id, name, role, email, login_email, phone, licence, active
  `;
  return mapAdviserFromDb(rows[0]);
}

async function saveClient(input = {}) {
  const database = db();
  const client = normaliseClientInput(input);
  const poolClient = await database.pool.connect();

  try {
    await poolClient.query('BEGIN');

    let clientId = isUuid(client.id) ? client.id : null;

    let nextActionLog = normaliseNextActionLog(client.nextActionLog);

    if (clientId) {
      const existingRows = await poolClient.query(
        `SELECT next_action, next_action_due, next_action_log FROM clients WHERE id = $1 FOR UPDATE`,
        [clientId]
      );
      const existing = existingRows.rows[0];
      if (existing) {
        nextActionLog = buildNextActionLog(existing, client);
      }

      await poolClient.query(
        `UPDATE clients
         SET first_name = $1, last_name = $2, email = $3, phone = $4, nationality = $5, date_of_birth = $6, location = $7, sharepoint_folder_url = $8,
             matter_name = $9, case_strategy = $10, case_type = $11, primary_adviser_id = $12, backup_adviser_id = $13,
             priority = $14, client_status = $15, next_action = $16, next_action_due = $17, next_action_log = $18::jsonb, notes = $19, family_members = $20::jsonb, document_checklist = $21::jsonb, updated_at = NOW()
         WHERE id = $22`,
        [client.firstName, client.lastName || 'Unnamed client', client.email, client.phone, client.nationality, nullableDate(client.dateOfBirth), client.location, client.sharepointFolderUrl, client.matterName, client.caseStrategy, client.caseType, nullableUuid(client.primaryAdviserId), nullableUuid(client.backupAdviserId), client.priority, client.clientStatus, client.nextAction, nullableDate(client.nextActionDue), JSON.stringify(nextActionLog), client.notes, JSON.stringify(client.familyMembers || []), JSON.stringify(client.documentChecklist || []), clientId]
      );
    } else {
      const result = await poolClient.query(
        `INSERT INTO clients (first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, next_action_log, notes, family_members, document_checklist)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19, $20::jsonb, $21::jsonb)
         RETURNING id`,
        [client.firstName, client.lastName || 'Unnamed client', client.email, client.phone, client.nationality, nullableDate(client.dateOfBirth), client.location, client.sharepointFolderUrl, client.matterName, client.caseStrategy, client.caseType, nullableUuid(client.primaryAdviserId), nullableUuid(client.backupAdviserId), client.priority, client.clientStatus, client.nextAction, nullableDate(client.nextActionDue), JSON.stringify(nextActionLog), client.notes, JSON.stringify(client.familyMembers || []), JSON.stringify(client.documentChecklist || [])]
      );
      clientId = result.rows[0].id;
    }


    await poolClient.query('DELETE FROM client_stages WHERE client_id = $1', [clientId]);
    for (const stage of client.stages) {
      await poolClient.query(
        `INSERT INTO client_stages (client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [clientId, stage.id, stage.label, Boolean(stage.mandatory), Boolean(stage.applied), Boolean(stage.completed), nullableDate(stage.completedDate), Number(stage.sortOrder || 0)]
      );
    }

    await poolClient.query('DELETE FROM client_deadlines WHERE client_id = $1', [clientId]);
    for (const deadline of client.deadlines) {
      if (!deadline.type && !deadline.date) continue;
      await poolClient.query(
        `INSERT INTO client_deadlines (client_id, deadline_type, deadline_date, note)
         VALUES ($1, $2, $3, $4)`,
        [clientId, deadline.type || DEADLINE_TYPES[0], nullableDate(deadline.date), deadline.note || '']
      );
    }

    await poolClient.query('DELETE FROM billing_milestones WHERE client_id = $1', [clientId]);
    for (const item of client.billing) {
      if (!item.milestone) continue;
      await poolClient.query(
        `INSERT INTO billing_milestones (client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [clientId, item.milestone, nullableDate(item.dueDate), Number(item.amount || 0), normaliseBillingStatus(item.status), item.invoiceNo || '', normaliseBillingTriggerType(item.triggerType), item.stageKey || null]
      );
    }

    await poolClient.query('COMMIT');
    return { ...client, id: clientId, nextActionLog };
  } catch (error) {
    await poolClient.query('ROLLBACK');
    throw error;
  } finally {
    poolClient.release();
  }
}

async function saveCalendarEntry(input = {}) {
  const database = db();
  const entry = normaliseCalendarEntryInput(input);
  const id = isUuid(entry.id) ? entry.id : null;

  if (id) {
    const rows = await database.sql`
      UPDATE calendar_entries
      SET client_id = ${nullableUuid(entry.clientId)},
          adviser_id = ${nullableUuid(entry.adviserId)},
          title = ${entry.title || 'Appointment'},
          appointment_type = ${normaliseAppointmentType(entry.appointmentType)},
          appointment_date = ${nullableDate(entry.appointmentDate) || todayDateOnly()},
          start_time = ${entry.startTime || ''},
          end_time = ${entry.endTime || ''},
          location = ${entry.location || ''},
          notes = ${entry.notes || ''},
          status = ${entry.status === 'Completed' ? 'Completed' : 'Open'},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status
    `;
    return mapCalendarEntryFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO calendar_entries (client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status)
    VALUES (${nullableUuid(entry.clientId)}, ${nullableUuid(entry.adviserId)}, ${entry.title || 'Appointment'}, ${normaliseAppointmentType(entry.appointmentType)}, ${nullableDate(entry.appointmentDate) || todayDateOnly()}, ${entry.startTime || ''}, ${entry.endTime || ''}, ${entry.location || ''}, ${entry.notes || ''}, ${entry.status === 'Completed' ? 'Completed' : 'Open'})
    RETURNING id, client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status
  `;
  return mapCalendarEntryFromDb(rows[0]);
}

async function deleteCalendarEntry(entryId) {
  if (!isUuid(entryId)) return;
  await db().sql`DELETE FROM calendar_entries WHERE id = ${entryId}`;
}

async function savePersonalTask(input = {}) {
  const database = db();
  const task = normalisePersonalTaskInput(input);
  const id = isUuid(task.id) ? task.id : null;

  if (id) {
    const rows = await database.sql`
      UPDATE personal_tasks
      SET adviser_id = ${nullableUuid(task.adviserId)},
          client_id = ${nullableUuid(task.clientId)},
          title = ${task.title || 'Untitled task'},
          due_date = ${nullableDate(task.dueDate)},
          status = ${normalisePersonalTaskStatus(task.status)},
          note = ${task.note || ''},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, adviser_id, client_id, title, due_date, status, note
    `;
    return mapPersonalTaskFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO personal_tasks (adviser_id, client_id, title, due_date, status, note)
    VALUES (${nullableUuid(task.adviserId)}, ${nullableUuid(task.clientId)}, ${task.title || 'Untitled task'}, ${nullableDate(task.dueDate)}, ${normalisePersonalTaskStatus(task.status)}, ${task.note || ''})
    RETURNING id, adviser_id, client_id, title, due_date, status, note
  `;
  return mapPersonalTaskFromDb(rows[0]);
}

async function deletePersonalTask(taskId) {
  if (!isUuid(taskId)) return;
  await db().sql`DELETE FROM personal_tasks WHERE id = ${taskId}`;
}

async function deleteClient(clientId) {
  if (!isUuid(clientId)) return;
  await db().sql`DELETE FROM clients WHERE id = ${clientId}`;
}

async function seedSampleData() {
  const database = db();
  const countRows = await database.sql`SELECT COUNT(*)::int AS count FROM advisers`;
  if (Number(countRows[0]?.count || 0) > 0) return;

  const poolClient = await database.pool.connect();
  try {
    await poolClient.query('BEGIN');

    const paul = await insertAdviser(poolClient, ['Paul Janssen', 'General Manager / LIA', 'paul.janssen@turnerhopkins.co.nz', '', '200800705', true]);
    const sejoo = await insertAdviser(poolClient, ['Sejoo Han', 'Licensed Immigration Adviser', '', '', '', true]);
    const nadia = await insertAdviser(poolClient, ['Nadia', 'Licensed Immigration Adviser', '', '', '', true]);

    await insertSeedClient(poolClient, {
      firstName: 'Aroha', lastName: 'Singh', email: 'aroha@example.com', phone: '+64 21 000 000', nationality: 'India', dateOfBirth: '1988-04-14', location: 'Auckland', familyMembers: [{ relationship: 'Spouse/Partner', name: 'Ravi Singh', nationality: 'India', dateOfBirth: '1986-09-03' }, { relationship: 'Child', name: 'Maya Singh', nationality: 'India', dateOfBirth: '2017-02-20' }], matterName: '', caseStrategy: 'AEWV renewal strategy: confirm employer accreditation and job details, check current visa expiry, gather updated employment and identity documents, and file before the agreed deadline.', caseType: 'AEWV Only', primaryAdviserId: paul, backupAdviserId: sejoo, priority: 'High', clientStatus: 'Active', nextAction: 'Draft application and send document gaps to client.', nextActionDue: daysFromNow(2), notes: 'Employer has provided supplementary information. Check INZ form version before filing.',
      appliedStageIds: ['instruction-sent', 'documentation-gathering', 'work-visa-ready'], completedStageIds: ['instruction-sent', 'documentation-gathering'],
      deadlines: [{ type: 'Visa Expiry Date', date: daysFromNow(42), note: 'Current AEWV expires.' }, { type: 'Filing Deadline Date', date: daysFromNow(9), note: 'Target filing date.' }, { type: 'Medical Expiry Date', date: daysFromNow(80), note: 'Check if new medical required.' }],
      billing: [{ milestone: 'Deposit', dueDate: daysFromNow(-8), amount: 1200, status: 'Invoiced', invoiceNo: 'INV-1042', triggerType: 'Date' }, { milestone: 'Work visa ready billing', dueDate: '', amount: 1800, status: 'WIP', invoiceNo: '', triggerType: 'Milestone', stageKey: 'work-visa-ready' }],
    });

    await insertSeedClient(poolClient, {
      firstName: 'Megan', lastName: 'Blake', email: 'megan@example.com', phone: '+64 27 000 000', nationality: 'United Kingdom', dateOfBirth: '1991-11-06', location: 'Christchurch', familyMembers: [{ relationship: 'Spouse/Partner', name: 'Daniel Blake', nationality: 'New Zealand', dateOfBirth: '1989-03-18' }], matterName: '', caseStrategy: 'Partnership strategy: assess relationship evidence, identify any gaps in living-together or financial evidence, prepare temporary pathway first if needed, then progress residence.', caseType: 'Partner Residence', primaryAdviserId: sejoo, backupAdviserId: paul, priority: 'Normal', clientStatus: 'Active', nextAction: 'Review relationship evidence checklist.', nextActionDue: daysFromNow(7), notes: 'Client needs plain-English explanation of evidence gaps.',
      appliedStageIds: ['instruction-sent', 'documentation-gathering', 'family-temporary-visas-ready', 'residence-ready', 'residence-approved'], completedStageIds: ['instruction-sent'],
      deadlines: [{ type: 'Police Clearance Expiry Date', date: daysFromNow(63), note: 'UK police certificate.' }, { type: 'Filing Deadline Date', date: daysFromNow(28), note: 'Temporary visa first.' }],
      billing: [{ milestone: 'Deposit', dueDate: daysFromNow(-2), amount: 950, status: 'Invoiced', invoiceNo: 'INV-1044', triggerType: 'Date' }, { milestone: 'Residence ready billing', dueDate: '', amount: 950, status: 'WIP', invoiceNo: '', triggerType: 'Milestone', stageKey: 'residence-ready' }],
    });

    await insertSeedClient(poolClient, {
      firstName: 'Johan', lastName: 'van der Merwe', email: 'johan@example.com', phone: '+64 22 000 000', nationality: 'South Africa', dateOfBirth: '1983-07-22', location: 'Tauranga', familyMembers: [], matterName: '', caseStrategy: 'SMC strategy: confirm points position, skilled employment evidence and occupational fit before deciding whether to proceed under the points pathway.', caseType: 'SMC Residence - Points', primaryAdviserId: nadia, backupAdviserId: paul, priority: 'Normal', clientStatus: 'Active', nextAction: 'Confirm points assessment and employment documentation.', nextActionDue: daysFromNow(5), notes: 'Initial advice call completed. Awaiting employment agreement and role description.',
      appliedStageIds: ['instruction-sent', 'documentation-gathering', 'residence-ready', 'residence-approved'], completedStageIds: ['instruction-sent'],
      deadlines: [{ type: 'Filing Deadline Date', date: daysFromNow(45), note: 'Subject to document readiness.' }, { type: 'Police Clearance Expiry Date', date: daysFromNow(100), note: 'South African police clearance.' }],
      billing: [{ milestone: 'Eligibility advice', dueDate: daysFromNow(3), amount: 750, status: 'WIP', invoiceNo: '', triggerType: 'Date' }],
    });

    await poolClient.query('COMMIT');
  } catch (error) {
    await poolClient.query('ROLLBACK');
    throw error;
  } finally {
    poolClient.release();
  }
}

async function insertAdviser(client, values) {
  const result = await client.query(
    `INSERT INTO advisers (name, role, email, phone, licence, active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    values
  );
  return result.rows[0].id;
}

async function insertSeedClient(poolClient, seed) {
  const result = await poolClient.query(
    `INSERT INTO clients (first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, notes, family_members, document_checklist, next_action_log)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20::jsonb, $21::jsonb)
     RETURNING id`,
    [seed.firstName, seed.lastName, seed.email, seed.phone, seed.nationality, nullableDate(seed.dateOfBirth), seed.location, seed.sharepointFolderUrl || '', seed.matterName || '', seed.caseStrategy || '', seed.caseType, seed.primaryAdviserId, seed.backupAdviserId, seed.priority, seed.clientStatus, seed.nextAction, seed.nextActionDue, seed.notes, JSON.stringify(seed.familyMembers || []), JSON.stringify(seed.documentChecklist || buildDocumentChecklist()), JSON.stringify(seed.nextActionLog || [])]
  );
  const clientId = result.rows[0].id;
  const stages = normaliseStages(buildStages(seed.appliedStageIds, seed.completedStageIds));
  for (const stage of stages) {
    await poolClient.query(
      `INSERT INTO client_stages (client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [clientId, stage.id, stage.label, stage.mandatory, stage.applied, stage.completed, stage.completedDate || null, stage.sortOrder]
    );
  }
  for (const deadline of seed.deadlines || []) {
    await poolClient.query(`INSERT INTO client_deadlines (client_id, deadline_type, deadline_date, note) VALUES ($1, $2, $3, $4)`, [clientId, deadline.type, deadline.date, deadline.note || '']);
  }
  for (const item of seed.billing || []) {
    await poolClient.query(`INSERT INTO billing_milestones (client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [clientId, item.milestone, item.dueDate || null, item.amount, normaliseBillingStatus(item.status), item.invoiceNo || '', normaliseBillingTriggerType(item.triggerType), item.stageKey || null]);
  }
}


function normaliseBillingStatus(status) {
  const value = String(status || '').trim();
  if (value === 'Overdue') return 'Overdue';
  if (value === 'Invoiced' || value === 'Paid') return 'Invoiced';
  return 'WIP';
}

function normaliseBillingTriggerType(value) {
  return String(value || '').trim() === 'Milestone' ? 'Milestone' : 'Date';
}

function normalisePersonalTaskStatus(value) {
  return String(value || '').trim() === 'Completed' ? 'Completed' : 'Open';
}

function normalisePersonalTaskInput(input = {}) {
  return {
    id: input.id,
    adviserId: input.adviserId || '',
    clientId: input.clientId || '',
    title: String(input.title || '').trim(),
    dueDate: nullableDate(input.dueDate) || '',
    status: normalisePersonalTaskStatus(input.status),
    note: String(input.note || '').trim(),
  };
}


function normaliseAppointmentType(value) {
  const type = String(value || '').trim();
  return APPOINTMENT_TYPES.includes(type) ? type : APPOINTMENT_TYPES[0];
}

function normaliseCalendarEntryInput(input = {}) {
  return {
    id: input.id,
    clientId: input.clientId || '',
    adviserId: input.adviserId || '',
    title: String(input.title || '').trim() || 'Appointment',
    appointmentType: normaliseAppointmentType(input.appointmentType),
    appointmentDate: nullableDate(input.appointmentDate) || todayDateOnly(),
    startTime: /^\d{2}:\d{2}$/.test(String(input.startTime || '')) ? String(input.startTime) : '',
    endTime: /^\d{2}:\d{2}$/.test(String(input.endTime || '')) ? String(input.endTime) : '',
    location: String(input.location || '').trim(),
    notes: String(input.notes || '').trim(),
    status: String(input.status || '').trim() === 'Completed' ? 'Completed' : 'Open',
  };
}

function normaliseBillingItems(inputItems = []) {
  if (!Array.isArray(inputItems)) return [];
  return inputItems.map((item) => ({
    id: item.id,
    milestone: String(item.milestone || '').trim(),
    dueDate: nullableDate(item.dueDate) || '',
    amount: Number(item.amount || 0),
    status: normaliseBillingStatus(item.status),
    invoiceNo: String(item.invoiceNo || '').trim(),
    triggerType: normaliseBillingTriggerType(item.triggerType),
    stageKey: normaliseStageKey(String(item.stageKey || '').trim()),
  })).filter((item) => item.milestone || item.dueDate || item.amount || item.invoiceNo || item.stageKey);
}

function normaliseNextActionLog(items = []) {
  const input = Array.isArray(items) ? items : [];
  return input
    .map((item, index) => ({
      id: String(item.id || `next-action-log-${Date.now()}-${index}`).trim(),
      action: String(item.action || item.nextAction || '').trim(),
      dueDate: nullableDate(item.dueDate || item.nextActionDue) || '',
      completedDate: nullableDate(item.completedDate) || '',
      completedAt: String(item.completedAt || '').trim(),
      replacedByAction: String(item.replacedByAction || '').trim(),
      replacedByDueDate: nullableDate(item.replacedByDueDate) || '',
    }))
    .filter((item) => item.action || item.dueDate)
    .slice(-200);
}

function parseNextActionLog(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normaliseNextActionLog(value);
  try {
    return normaliseNextActionLog(JSON.parse(value));
  } catch {
    return [];
  }
}

function buildNextActionLog(existing, client) {
  const previousAction = String(existing?.next_action || '').trim();
  const previousDueDate = toDateOnly(existing?.next_action_due);
  const nextAction = String(client.nextAction || '').trim();
  const nextDueDate = nullableDate(client.nextActionDue) || '';
  const actionChanged = previousAction !== nextAction || previousDueDate !== nextDueDate;
  const hadPreviousAction = Boolean(previousAction || previousDueDate);
  const log = normaliseNextActionLog(existing?.next_action_log);

  if (!actionChanged || !hadPreviousAction) return log;

  const last = log[log.length - 1];
  const alreadyLogged = last && last.action === previousAction && last.dueDate === previousDueDate && last.replacedByAction === nextAction && last.replacedByDueDate === nextDueDate;
  if (alreadyLogged) return log;

  return normaliseNextActionLog([
    ...log,
    {
      id: `next-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: previousAction,
      dueDate: previousDueDate,
      completedDate: todayDateOnly(),
      completedAt: new Date().toISOString(),
      replacedByAction: nextAction,
      replacedByDueDate: nextDueDate,
    },
  ]);
}

function normaliseClientInput(input) {
  const client = {
    id: input.id,
    firstName: input.firstName || '',
    lastName: input.lastName || 'Unnamed client',
    email: input.email || '',
    phone: input.phone || '',
    nationality: input.nationality || '',
    dateOfBirth: input.dateOfBirth || '',
    location: input.location || '',
    sharepointFolderUrl: input.sharepointFolderUrl || '',
    matterName: input.matterName || '',
    caseStrategy: input.caseStrategy || '',
    caseType: CASE_TYPES.includes(input.caseType) ? input.caseType : CASE_TYPES[0],
    primaryAdviserId: input.primaryAdviserId || '',
    backupAdviserId: input.backupAdviserId || '',
    priority: input.priority || 'Normal',
    clientStatus: input.clientStatus || 'Active',
    nextAction: input.nextAction || '',
    nextActionDue: input.nextActionDue || null,
    nextActionLog: normaliseNextActionLog(input.nextActionLog),
    notes: input.notes || '',
    stages: normaliseStages(input.stages || []),
    deadlines: Array.isArray(input.deadlines) ? input.deadlines : [],
    billing: normaliseBillingItems(input.billing),
    familyMembers: normaliseFamilyMembers(input.familyMembers),
    documentChecklist: normaliseDocumentChecklist(input.documentChecklist),
  };
  return client;
}


function normaliseFamilyMembers(inputMembers = []) {
  if (!Array.isArray(inputMembers)) return [];
  return inputMembers
    .map((member, index) => ({
      id: member.id || `member-${index}-${Date.now()}`,
      relationship: member.relationship === 'Spouse/Partner' ? 'Spouse/Partner' : 'Child',
      name: String(member.name || '').trim(),
      nationality: String(member.nationality || '').trim(),
      dateOfBirth: nullableDate(member.dateOfBirth) || '',
    }))
    .filter((member) => member.name || member.nationality || member.dateOfBirth);
}

function parseFamilyMembers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normaliseFamilyMembers(value);
  try {
    return normaliseFamilyMembers(JSON.parse(value));
  } catch {
    return [];
  }
}

function buildDocumentChecklist(items = []) {
  return normaliseDocumentChecklist(items);
}

function normaliseDocumentChecklist(items = []) {
  const input = Array.isArray(items) ? items : [];
  const templateRows = DOCUMENT_CHECKLIST_TEMPLATES.map((template) => {
    const existing = input.find((item) => item.id === template.id || String(item.name || '').toLowerCase() === template.name.toLowerCase()) || {};
    const applied = existing.applied !== false;
    return {
      id: template.id,
      name: template.name,
      applied,
      custom: false,
      expiryDate: nullableDate(existing.expiryDate || existing.expiry_date) || '',
      obtained: applied ? Boolean(existing.obtained) : false,
    };
  });
  const templateIds = new Set(DOCUMENT_CHECKLIST_TEMPLATES.map((template) => template.id));
  const templateNames = new Set(DOCUMENT_CHECKLIST_TEMPLATES.map((template) => template.name.toLowerCase()));
  const customRows = input
    .filter((item) => {
      const id = String(item.id || '').trim();
      const name = String(item.name || '').trim().toLowerCase();
      return item.custom || (id && !templateIds.has(id)) || (name && !templateNames.has(name));
    })
    .map((item, index) => {
      const applied = item.applied !== false;
      return {
        id: String(item.id || `custom-doc-${index + 1}`).trim(),
        name: String(item.name || 'Custom document').trim(),
        applied,
        custom: true,
        expiryDate: nullableDate(item.expiryDate || item.expiry_date) || '',
        obtained: applied ? Boolean(item.obtained) : false,
      };
    })
    .filter((item) => item.name);
  return [...templateRows, ...customRows];
}

function parseDocumentChecklist(value) {
  if (!value) return buildDocumentChecklist();
  if (Array.isArray(value)) return normaliseDocumentChecklist(value);
  try {
    return normaliseDocumentChecklist(JSON.parse(value));
  } catch {
    return buildDocumentChecklist();
  }
}

function normaliseStageKey(value) {
  const key = String(value || '').trim();
  return STAGE_KEY_ALIASES[key] || key;
}

function sortStages(stages = []) {
  return [...(stages || [])].sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999));
}

function reindexStages(stages = []) {
  return (stages || []).map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
}

function buildStages(appliedIds = [], completedIds = []) {
  const applied = new Set([...appliedIds.map(normaliseStageKey), ...STAGE_TEMPLATES.filter((stage) => stage.mandatory).map((stage) => stage.id)]);
  const completed = new Set(completedIds.map(normaliseStageKey));
  return STAGE_TEMPLATES.map((stage) => ({
    ...stage,
    custom: false,
    applied: stage.mandatory || applied.has(stage.id),
    completed: completed.has(stage.id),
    completedDate: completed.has(stage.id) ? daysFromNow(0) : '',
  }));
}

function normaliseStages(inputStages = []) {
  const input = Array.isArray(inputStages) ? inputStages : [];
  const templateKeys = new Set(STAGE_TEMPLATES.map((stage) => stage.id));
  const templateRows = STAGE_TEMPLATES.map((template) => {
    const existing = input.find((stage) => normaliseStageKey(stage.id || stage.stageKey) === template.id) || {};
    const applied = template.mandatory || Boolean(existing.applied);
    return {
      id: template.id,
      label: template.label,
      mandatory: template.mandatory,
      custom: false,
      applied,
      completed: applied ? Boolean(existing.completed) : false,
      completedDate: applied && existing.completed ? (existing.completedDate || daysFromNow(0)) : '',
      sortOrder: Number.isFinite(Number(existing.sortOrder)) ? Number(existing.sortOrder) : template.sortOrder,
    };
  });
  const customRows = input
    .filter((stage) => {
      const key = normaliseStageKey(stage.id || stage.stageKey);
      return key && !templateKeys.has(key);
    })
    .map((stage, index) => {
      const applied = stage.applied !== false;
      return {
        id: String(stage.id || stage.stageKey || `custom-stage-${index + 1}`).trim(),
        label: String(stage.label || stage.stageLabel || 'Custom stage').trim(),
        mandatory: false,
        custom: true,
        applied,
        completed: applied ? Boolean(stage.completed) : false,
        completedDate: applied && stage.completed ? (stage.completedDate || daysFromNow(0)) : '',
        sortOrder: Number.isFinite(Number(stage.sortOrder)) ? Number(stage.sortOrder) : STAGE_TEMPLATES.length + index + 1,
      };
    })
    .filter((stage) => stage.label);
  return reindexStages(sortStages([...templateRows, ...customRows]));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function nullableUuid(value) {
  return isUuid(value) ? value : null;
}

function nullableDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : null;
}

function toDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function todayDateOnly() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, authorization, x-crm-token',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function empty(statusCode = 204) {
  return {
    statusCode,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, authorization, x-crm-token',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: '',
  };
}
