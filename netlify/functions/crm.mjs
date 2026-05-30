import { getDatabase } from '@netlify/database';

const STAGE_TEMPLATES = [
  { id: 'instructions-sent', label: 'Instructions Sent', mandatory: true, sortOrder: 1 },
  { id: 'documentation-gathering', label: 'Documentation Gathering', mandatory: true, sortOrder: 2 },
  { id: 'visitor-visa-lodged', label: 'Visitor Visa Lodged', mandatory: false, sortOrder: 3 },
  { id: 'work-visa-lodged', label: 'Work Visa Lodged', mandatory: false, sortOrder: 4 },
  { id: 'family-temporary-visas-lodged', label: 'Family Temporary Visas Lodged', mandatory: false, sortOrder: 5 },
  { id: 'residence-lodged', label: 'Residence Lodged', mandatory: false, sortOrder: 6 },
  { id: 'residence-approved-finalised', label: 'Residence Approved and Case Finalised', mandatory: false, sortOrder: 7 },
];

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

export const handler = async (event) => {
  try {
    const method = event.httpMethod || 'GET';
    if (method === 'OPTIONS') return empty(204);

    const auth = checkAuth(event);
    if (!auth.ok) return json({ error: 'Unauthorised. Enter the internal CRM access code.' }, 401);

    await ensureSchema();

    if (method === 'GET') {
      const data = await readCrmData();
      return json({ ...data, securityMode: process.env.CRM_ACCESS_TOKEN ? 'token' : 'open-prototype' });
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
};

function checkAuth(event) {
  const expected = process.env.CRM_ACCESS_TOKEN;
  if (!expected) return { ok: true, mode: 'open-prototype' };

  const headers = event.headers || {};
  const provided = headers['x-crm-token'] || headers['X-CRM-Token'] || extractBearer(headers.authorization || headers.Authorization);
  return { ok: provided === expected, mode: 'token' };
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
      notes TEXT,
      family_members JSONB NOT NULL DEFAULT '[]'::jsonb,
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
      status TEXT NOT NULL DEFAULT 'Draft',
      invoice_no TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS case_strategy TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS family_members JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS sharepoint_folder_url TEXT`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_case_type ON clients(case_type)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_primary_adviser ON clients(primary_adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_client_deadlines_date ON client_deadlines(deadline_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_billing_milestones_due_date ON billing_milestones(due_date)`;
}


async function readCrmData() {
  const database = db();
  const [advisers, clients, stages, deadlines, billing] = await Promise.all([
    database.sql`SELECT id, name, role, email, phone, licence, active FROM advisers ORDER BY name ASC`,
    database.sql`SELECT id, first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, notes, family_members FROM clients ORDER BY updated_at DESC`,
    database.sql`SELECT id, client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order FROM client_stages ORDER BY sort_order ASC`,
    database.sql`SELECT id, client_id, deadline_type, deadline_date, note FROM client_deadlines ORDER BY deadline_date ASC NULLS LAST`,
    database.sql`SELECT id, client_id, milestone, due_date, amount, status, invoice_no FROM billing_milestones ORDER BY due_date ASC NULLS LAST`,
  ]);

  return {
    advisers: advisers.map(mapAdviserFromDb),
    clients: clients.map((client) => mapClientFromDb(client, stages, deadlines, billing)),
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
    phone: row.phone || '',
    licence: row.licence || '',
    active: Boolean(row.active),
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
    notes: row.notes || '',
    familyMembers: parseFamilyMembers(row.family_members),
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
        status: item.status || 'Draft',
        invoiceNo: item.invoice_no || '',
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
          phone = ${adviser.phone || ''},
          licence = ${adviser.licence || ''},
          active = ${adviser.active !== false},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, role, email, phone, licence, active
    `;
    return mapAdviserFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO advisers (name, role, email, phone, licence, active)
    VALUES (${adviser.name || 'New adviser'}, ${adviser.role || 'Licensed Immigration Adviser'}, ${adviser.email || ''}, ${adviser.phone || ''}, ${adviser.licence || ''}, ${adviser.active !== false})
    RETURNING id, name, role, email, phone, licence, active
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

    if (clientId) {
      await poolClient.query(
        `UPDATE clients
         SET first_name = $1, last_name = $2, email = $3, phone = $4, nationality = $5, date_of_birth = $6, location = $7, sharepoint_folder_url = $8,
             matter_name = $9, case_strategy = $10, case_type = $11, primary_adviser_id = $12, backup_adviser_id = $13,
             priority = $14, client_status = $15, next_action = $16, next_action_due = $17, notes = $18, family_members = $19::jsonb, updated_at = NOW()
         WHERE id = $20`,
        [client.firstName, client.lastName || 'Unnamed client', client.email, client.phone, client.nationality, nullableDate(client.dateOfBirth), client.location, client.sharepointFolderUrl, client.matterName, client.caseStrategy, client.caseType, nullableUuid(client.primaryAdviserId), nullableUuid(client.backupAdviserId), client.priority, client.clientStatus, client.nextAction, nullableDate(client.nextActionDue), client.notes, JSON.stringify(client.familyMembers || []), clientId]
      );
    } else {
      const result = await poolClient.query(
        `INSERT INTO clients (first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, notes, family_members)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb)
         RETURNING id`,
        [client.firstName, client.lastName || 'Unnamed client', client.email, client.phone, client.nationality, nullableDate(client.dateOfBirth), client.location, client.sharepointFolderUrl, client.matterName, client.caseStrategy, client.caseType, nullableUuid(client.primaryAdviserId), nullableUuid(client.backupAdviserId), client.priority, client.clientStatus, client.nextAction, nullableDate(client.nextActionDue), client.notes, JSON.stringify(client.familyMembers || [])]
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
        `INSERT INTO billing_milestones (client_id, milestone, due_date, amount, status, invoice_no)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, item.milestone, nullableDate(item.dueDate), Number(item.amount || 0), item.status || 'Draft', item.invoiceNo || '']
      );
    }

    await poolClient.query('COMMIT');
    return { ...client, id: clientId };
  } catch (error) {
    await poolClient.query('ROLLBACK');
    throw error;
  } finally {
    poolClient.release();
  }
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
      appliedStageIds: ['instructions-sent', 'documentation-gathering', 'work-visa-lodged'], completedStageIds: ['instructions-sent', 'documentation-gathering'],
      deadlines: [{ type: 'Visa Expiry Date', date: daysFromNow(42), note: 'Current AEWV expires.' }, { type: 'Filing Deadline Date', date: daysFromNow(9), note: 'Target filing date.' }, { type: 'Medical Expiry Date', date: daysFromNow(80), note: 'Check if new medical required.' }],
      billing: [{ milestone: 'Deposit', dueDate: daysFromNow(-8), amount: 1200, status: 'Paid', invoiceNo: 'INV-1042' }, { milestone: 'Filing milestone', dueDate: daysFromNow(9), amount: 1800, status: 'Scheduled', invoiceNo: '' }],
    });

    await insertSeedClient(poolClient, {
      firstName: 'Megan', lastName: 'Blake', email: 'megan@example.com', phone: '+64 27 000 000', nationality: 'United Kingdom', dateOfBirth: '1991-11-06', location: 'Christchurch', familyMembers: [{ relationship: 'Spouse/Partner', name: 'Daniel Blake', nationality: 'New Zealand', dateOfBirth: '1989-03-18' }], matterName: '', caseStrategy: 'Partnership strategy: assess relationship evidence, identify any gaps in living-together or financial evidence, prepare temporary pathway first if needed, then progress residence.', caseType: 'Partner Residence', primaryAdviserId: sejoo, backupAdviserId: paul, priority: 'Normal', clientStatus: 'Active', nextAction: 'Review relationship evidence checklist.', nextActionDue: daysFromNow(7), notes: 'Client needs plain-English explanation of evidence gaps.',
      appliedStageIds: ['instructions-sent', 'documentation-gathering', 'family-temporary-visas-lodged', 'residence-lodged', 'residence-approved-finalised'], completedStageIds: ['instructions-sent'],
      deadlines: [{ type: 'Police Clearance Expiry Date', date: daysFromNow(63), note: 'UK police certificate.' }, { type: 'Filing Deadline Date', date: daysFromNow(28), note: 'Temporary visa first.' }],
      billing: [{ milestone: 'Deposit', dueDate: daysFromNow(-2), amount: 950, status: 'Paid', invoiceNo: 'INV-1044' }, { milestone: 'Drafting', dueDate: daysFromNow(14), amount: 950, status: 'Scheduled', invoiceNo: '' }],
    });

    await insertSeedClient(poolClient, {
      firstName: 'Johan', lastName: 'van der Merwe', email: 'johan@example.com', phone: '+64 22 000 000', nationality: 'South Africa', dateOfBirth: '1983-07-22', location: 'Tauranga', familyMembers: [], matterName: '', caseStrategy: 'SMC strategy: confirm points position, skilled employment evidence and occupational fit before deciding whether to proceed under the points pathway.', caseType: 'SMC Residence - Points', primaryAdviserId: nadia, backupAdviserId: paul, priority: 'Normal', clientStatus: 'Active', nextAction: 'Confirm points assessment and employment documentation.', nextActionDue: daysFromNow(5), notes: 'Initial advice call completed. Awaiting employment agreement and role description.',
      appliedStageIds: ['instructions-sent', 'documentation-gathering', 'residence-lodged', 'residence-approved-finalised'], completedStageIds: ['instructions-sent'],
      deadlines: [{ type: 'Filing Deadline Date', date: daysFromNow(45), note: 'Subject to document readiness.' }, { type: 'Police Clearance Expiry Date', date: daysFromNow(100), note: 'South African police clearance.' }],
      billing: [{ milestone: 'Eligibility advice', dueDate: daysFromNow(3), amount: 750, status: 'Draft', invoiceNo: '' }],
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
    `INSERT INTO clients (first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, notes, family_members)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb)
     RETURNING id`,
    [seed.firstName, seed.lastName, seed.email, seed.phone, seed.nationality, nullableDate(seed.dateOfBirth), seed.location, seed.sharepointFolderUrl || '', seed.matterName || '', seed.caseStrategy || '', seed.caseType, seed.primaryAdviserId, seed.backupAdviserId, seed.priority, seed.clientStatus, seed.nextAction, seed.nextActionDue, seed.notes, JSON.stringify(seed.familyMembers || [])]
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
    await poolClient.query(`INSERT INTO billing_milestones (client_id, milestone, due_date, amount, status, invoice_no) VALUES ($1, $2, $3, $4, $5, $6)`, [clientId, item.milestone, item.dueDate, item.amount, item.status, item.invoiceNo || '']);
  }
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
    notes: input.notes || '',
    stages: normaliseStages(input.stages || []),
    deadlines: Array.isArray(input.deadlines) ? input.deadlines : [],
    billing: Array.isArray(input.billing) ? input.billing : [],
    familyMembers: normaliseFamilyMembers(input.familyMembers),
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

function buildStages(appliedIds = [], completedIds = []) {
  const applied = new Set([...appliedIds, ...STAGE_TEMPLATES.filter((stage) => stage.mandatory).map((stage) => stage.id)]);
  const completed = new Set(completedIds);
  return STAGE_TEMPLATES.map((stage) => ({
    ...stage,
    applied: stage.mandatory || applied.has(stage.id),
    completed: completed.has(stage.id),
    completedDate: completed.has(stage.id) ? daysFromNow(0) : '',
  }));
}

function normaliseStages(inputStages = []) {
  return STAGE_TEMPLATES.map((template) => {
    const existing = inputStages.find((stage) => stage.id === template.id || stage.stageKey === template.id) || {};
    const applied = template.mandatory || Boolean(existing.applied);
    return {
      id: template.id,
      label: existing.label || template.label,
      mandatory: template.mandatory,
      applied,
      completed: applied ? Boolean(existing.completed) : false,
      completedDate: applied && existing.completed ? (existing.completedDate || daysFromNow(0)) : '',
      sortOrder: template.sortOrder,
    };
  });
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

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
