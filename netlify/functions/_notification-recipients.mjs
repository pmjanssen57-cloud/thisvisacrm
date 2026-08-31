const NOTIFICATION_TYPES = [
  {
    key: 'assessment_form_internal_notification',
    label: 'Assessment form submissions',
    description: 'A full guided assessment questionnaire has been submitted.',
    defaultMode: 'configured',
  },
  {
    key: 'contact_form_internal_notification',
    label: 'Contact form submissions',
    description: 'A short website contact form has been submitted.',
    defaultMode: 'configured',
  },
  {
    key: 'seminar_new_registration',
    label: 'Seminar registrations',
    description: 'A new public seminar registration has been received.',
    defaultMode: 'configured',
  },
  {
    key: 'feedback_internal_notification',
    label: 'Client feedback submissions',
    description: 'A client has submitted the website feedback form.',
    defaultMode: 'all-active',
  },
  {
    key: 'smc_calculator_internal_notification',
    label: 'SMC calculator internal alerts',
    description: 'A website user has emailed themselves an SMC work-experience calculator result.',
    defaultMode: 'all-active',
  },
];

const NOTIFICATION_TYPE_KEYS = new Set(NOTIFICATION_TYPES.map((item) => item.key));
let notificationSchemaReady = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function notificationRecipientDefinitions() {
  return NOTIFICATION_TYPES.map((item) => ({ ...item }));
}

export async function ensureNotificationRecipientSettingsSchema(database) {
  if (notificationSchemaReady) return;
  await database.sql`
    CREATE TABLE IF NOT EXISTS notification_recipient_settings (
      notification_key TEXT PRIMARY KEY,
      adviser_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      custom_emails TEXT NOT NULL DEFAULT '',
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  notificationSchemaReady = true;
}

export async function readNotificationRecipientSettings(database) {
  await ensureNotificationRecipientSettingsSchema(database);
  const [rows, advisers] = await Promise.all([
    database.sql`SELECT notification_key, adviser_ids, custom_emails, updated_by, updated_at FROM notification_recipient_settings`,
    database.sql`SELECT id, name, email, active FROM advisers ORDER BY name ASC`,
  ]);
  const rowMap = new Map(rows.map((row) => [String(row.notification_key || ''), row]));
  return NOTIFICATION_TYPES.map((definition) => {
    const row = rowMap.get(definition.key);
    const configured = Boolean(row);
    const defaults = configured ? null : resolveDefaultSelection(definition.key, advisers);
    const adviserIds = configured ? normaliseAdviserIds(row.adviser_ids) : defaults.adviserIds;
    const customEmails = configured ? normaliseEmailList(row.custom_emails) : defaults.customEmails;
    const effectiveEmails = effectiveRecipientEmails(advisers, adviserIds, customEmails);
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      configured,
      adviserIds,
      customEmails: customEmails.join(', '),
      effectiveEmails,
      updatedBy: row?.updated_by || '',
      updatedAt: row?.updated_at || '',
    };
  });
}

export async function getNotificationRecipients(database, notificationKey) {
  await ensureNotificationRecipientSettingsSchema(database);
  const key = String(notificationKey || '').trim();
  const definition = NOTIFICATION_TYPES.find((item) => item.key === key);
  if (!definition) return [];
  const [rows, advisers] = await Promise.all([
    database.sql`SELECT notification_key, adviser_ids, custom_emails FROM notification_recipient_settings WHERE notification_key = ${key} LIMIT 1`,
    database.sql`SELECT id, name, email, active FROM advisers ORDER BY name ASC`,
  ]);
  const row = rows[0];
  if (row) return effectiveRecipientEmails(advisers, normaliseAdviserIds(row.adviser_ids), normaliseEmailList(row.custom_emails));
  const defaults = resolveDefaultSelection(key, advisers);
  return effectiveRecipientEmails(advisers, defaults.adviserIds, defaults.customEmails);
}

export async function saveNotificationRecipientSettings(database, settings = [], actor = 'CRM administrator') {
  await ensureNotificationRecipientSettingsSchema(database);
  const advisers = await database.sql`SELECT id, name, email, active FROM advisers ORDER BY name ASC`;
  const incoming = new Map((Array.isArray(settings) ? settings : []).map((item) => [String(item?.key || '').trim(), item]));
  const saved = [];

  for (const definition of NOTIFICATION_TYPES) {
    const item = incoming.get(definition.key);
    if (!item) continue;
    const adviserIds = normaliseAdviserIds(item.adviserIds || item.adviser_ids);
    const customEmails = normaliseEmailList(item.customEmails || item.custom_emails);
    const effectiveEmails = effectiveRecipientEmails(advisers, adviserIds, customEmails);
    if (!effectiveEmails.length) {
      throw new Error(`${definition.label} must have at least one active adviser with an email address or one additional valid email address.`);
    }
    await database.sql`
      INSERT INTO notification_recipient_settings (notification_key, adviser_ids, custom_emails, updated_by, updated_at)
      VALUES (${definition.key}, CAST(${JSON.stringify(adviserIds)} AS jsonb), ${customEmails.join(', ')}, ${String(actor || 'CRM administrator').slice(0, 300)}, NOW())
      ON CONFLICT (notification_key) DO UPDATE SET
        adviser_ids = EXCLUDED.adviser_ids,
        custom_emails = EXCLUDED.custom_emails,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()`;
    saved.push(definition.key);
  }

  if (!saved.length) throw new Error('No notification recipient settings were supplied.');
  return readNotificationRecipientSettings(database);
}

function resolveDefaultSelection(notificationKey, advisers = []) {
  const activeAdvisers = advisers.filter((adviser) => adviser.active !== false && isValidEmailAddress(adviser.email));
  if (notificationKey === 'feedback_internal_notification' || notificationKey === 'smc_calculator_internal_notification') {
    if (activeAdvisers.length) return { adviserIds: activeAdvisers.map((adviser) => String(adviser.id)), customEmails: [] };
  }

  const fallbackEmails = defaultFallbackEmails(notificationKey);
  const adviserIds = [];
  const customEmails = [];
  const byEmail = new Map(advisers.filter((adviser) => adviser.email).map((adviser) => [String(adviser.email).trim().toLowerCase(), adviser]));
  fallbackEmails.forEach((email) => {
    const adviser = byEmail.get(email.toLowerCase());
    if (adviser?.id) adviserIds.push(String(adviser.id));
    else customEmails.push(email);
  });
  return { adviserIds: [...new Set(adviserIds)], customEmails: [...new Set(customEmails)] };
}

function defaultFallbackEmails(notificationKey) {
  let value = '';
  if (notificationKey === 'assessment_form_internal_notification' || notificationKey === 'contact_form_internal_notification') {
    value = process.env.INTAKE_NOTIFICATION_RECIPIENTS || 'paul.janssen@turnerhopkins.co.nz,sejoo.han@turnerhopkins.co.nz';
  } else if (notificationKey === 'seminar_new_registration') {
    value = process.env.SEMINAR_NOTIFICATION_RECIPIENTS || process.env.INTAKE_NOTIFICATION_RECIPIENTS || 'paul.janssen@turnerhopkins.co.nz,sejoo.han@turnerhopkins.co.nz';
  } else if (notificationKey === 'feedback_internal_notification') {
    value = process.env.FEEDBACK_NOTIFICATION_EMAILS || process.env.INTAKE_NOTIFICATION_EMAILS || process.env.CRM_NOTIFICATION_EMAILS || '';
  } else if (notificationKey === 'smc_calculator_internal_notification') {
    value = process.env.SMC_CALCULATOR_NOTIFICATION_EMAILS || process.env.INTAKE_NOTIFICATION_EMAILS || process.env.CRM_NOTIFICATION_EMAILS || '';
  }
  return normaliseEmailList(value);
}

function effectiveRecipientEmails(advisers = [], adviserIds = [], customEmails = []) {
  const selectedIds = new Set(normaliseAdviserIds(adviserIds));
  const emails = [];
  advisers.forEach((adviser) => {
    if (!selectedIds.has(String(adviser.id || ''))) return;
    if (adviser.active === false) return;
    const email = String(adviser.email || '').trim().toLowerCase();
    if (isValidEmailAddress(email)) emails.push(email);
  });
  normaliseEmailList(customEmails).forEach((email) => emails.push(email.toLowerCase()));
  return [...new Set(emails)];
}

function normaliseAdviserIds(value) {
  const rows = Array.isArray(value) ? value : [];
  return [...new Set(rows.map((item) => String(item || '').trim()).filter((item) => UUID_RE.test(item)))];
}

function normaliseEmailList(value) {
  const rows = Array.isArray(value) ? value : String(value || '').split(/[;,\n]/);
  return [...new Set(rows.map((item) => String(item || '').trim().toLowerCase()).filter(isValidEmailAddress))];
}

function isValidEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}
