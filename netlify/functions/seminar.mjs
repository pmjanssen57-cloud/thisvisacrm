import { getDatabase } from '@netlify/database';

const MAX_TEXT = 6000;
const SEMINAR_REGISTRATION_STATUSES = ['New', 'Approved', 'Declined', 'Spam / Duplicate'];
const ENGLISH_OPTIONS = ['Fluent', 'Medium', 'None'];

const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'seminar_new_registration',
    name: 'Seminar registration - internal notification',
    description: 'Internal notification sent when someone submits the public seminar registration form.',
    subject: 'New seminar registration: {{registrantFullName}}',
    bodyText: `A new seminar registration has been submitted.

Seminar: {{seminarTitle}}
Seminar date/time: {{seminarDateTime}}
Presenter: {{presenterName}}

Full name: {{registrantFullName}}
Email: {{registrantEmail}}
Date of birth: {{dateOfBirth}}
Citizenship: {{citizenshipCountry}}
Current country: {{residenceCountry}}
Timezone: {{registrantTimezone}}
Partnership status: {{partnershipStatus}}
Highest qualification: {{highestQualification}}
Current occupation: {{currentOccupation}}
English ability: {{englishAbility}}

Relevant work history:
{{workHistory}}

Health / character issues:
{{healthCharacterIssues}}

Submitted: {{submitted}}
Registration ID: {{registrationId}}

Please review this in THiS CRM > Enquiries & Intake > Seminar Registrations.`,
    placeholders: ['registrantFullName', 'registrantEmail', 'seminarTitle', 'seminarDateTime', 'presenterName', 'dateOfBirth', 'citizenshipCountry', 'residenceCountry', 'registrantTimezone', 'partnershipStatus', 'highestQualification', 'currentOccupation', 'englishAbility', 'workHistory', 'healthCharacterIssues', 'submitted', 'registrationId'],
  },
];


export default async function seminarRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });

  try {
    await ensureSeminarSchema();
    if (method === 'GET') {
      const seminar = await getActivePublicSeminar();
      return json({ seminar });
    }
    if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const body = await request.json().catch(() => ({}));
    const seminarId = clean(body.seminarId || body.seminar_id);
    const registration = normaliseRegistration(body.registration || body);

    if (!nullableUuidValue(seminarId)) return json({ error: 'No valid seminar was supplied.' }, 400);
    if (!registration.fullName || !registration.email || !registration.dateOfBirth) return json({ error: 'Full name, email and date of birth are required.' }, 400);
    if (!registration.citizenshipCountry || !registration.residenceCountry || !registration.timezone) return json({ error: 'Citizenship, current country and timezone are required.' }, 400);
    if (!registration.consentToContact || !registration.privacyAcknowledged) return json({ error: 'Consent and privacy acknowledgements are required before submitting the seminar registration.' }, 400);
    if (!isValidEmailAddress(registration.email)) return json({ error: 'Enter a valid email address.' }, 400);

    const dbSeminar = await db().sql`SELECT id, title, seminar_date, seminar_time, timezone, presenter_name, status, registration_open FROM seminars WHERE id = ${seminarId} LIMIT 1`;
    const seminar = dbSeminar[0];
    if (!seminar || seminar.status !== 'Active' || seminar.registration_open === false) return json({ error: 'This seminar is not currently open for registration.' }, 400);

    const rows = await db().sql`
      INSERT INTO seminar_registrations (seminar_id, status, full_name, date_of_birth, citizenship_country, residence_country, timezone, email, partnership_status, highest_qualification, current_occupation, work_history, health_character_issues, english_ability, raw_payload)
      VALUES (${seminarId}, 'New', ${registration.fullName}, ${nullableDate(registration.dateOfBirth)}, ${registration.citizenshipCountry}, ${registration.residenceCountry}, ${registration.timezone}, ${registration.email}, ${registration.partnershipStatus}, ${registration.highestQualification}, ${registration.currentOccupation}, ${registration.workHistory}, ${registration.healthCharacterIssues}, ${registration.englishAbility}, CAST(${JSON.stringify(registration)} AS jsonb))
      RETURNING id, created_at`;

    try {
      await sendSeminarNotificationEmail({ registrationId: rows[0]?.id || '', registration, seminar });
    } catch (notifyError) {
      console.warn('Seminar notification email failed', notifyError?.message || notifyError);
    }

    return json({ ok: true, registrationId: rows[0]?.id || '' });
  } catch (error) {
    console.error(error);
    return json({ error: 'Seminar registration failed', detail: String(error?.message || error) }, 500);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) return getDatabase({ connectionString });
  return getDatabase();
}

async function ensureSeminarSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS seminars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT,
      seminar_date DATE,
      seminar_time TEXT,
      timezone TEXT NOT NULL DEFAULT 'Pacific/Auckland',
      presenter_name TEXT,
      zoom_link TEXT,
      zoom_password TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      registration_open BOOLEAN NOT NULL DEFAULT TRUE,
      internal_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminars_status_date ON seminars(status, seminar_date DESC)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS seminar_registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'New',
      full_name TEXT,
      date_of_birth DATE,
      citizenship_country TEXT,
      residence_country TEXT,
      timezone TEXT,
      email TEXT,
      partnership_status TEXT,
      highest_qualification TEXT,
      current_occupation TEXT,
      work_history TEXT,
      health_character_issues TEXT,
      english_ability TEXT,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      reviewed_by TEXT,
      approved_at TIMESTAMPTZ,
      declined_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_registrations_seminar ON seminar_registrations(seminar_id, created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_registrations_status ON seminar_registrations(status)`;
  await ensureEmailNotificationSchema();
}

async function ensureEmailNotificationSchema() {
  const database = db();
  await database.sql`
    CREATE TABLE IF NOT EXISTS email_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      related_record_type TEXT NOT NULL DEFAULT 'test',
      related_record_id UUID,
      client_id UUID,
      intake_id UUID,
      template_key TEXT NOT NULL DEFAULT 'test',
      from_email TEXT,
      from_name TEXT,
      to_email TEXT NOT NULL,
      cc TEXT,
      bcc TEXT,
      subject TEXT NOT NULL,
      body_text TEXT,
      body_html TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      sent_by TEXT,
      sent_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      failure_message TEXT,
      provider TEXT NOT NULL DEFAULT 'microsoft_graph',
      provider_request_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at DESC)`;
  await ensureEmailTemplateSchema(database);
}

async function getActivePublicSeminar() {
  const rows = await db().sql`
    SELECT id, title, seminar_date, seminar_time, timezone, presenter_name, status, registration_open
      FROM seminars
     WHERE status = 'Active' AND registration_open = TRUE
     ORDER BY seminar_date ASC NULLS LAST, created_at DESC
     LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || 'Turner Hopkins immigration seminar',
    seminarDate: toDateOnly(row.seminar_date),
    seminarTime: row.seminar_time || '',
    timezone: row.timezone || 'Pacific/Auckland',
    presenterName: row.presenter_name || '',
  };
}

function normaliseRegistration(input = {}) {
  const englishAbility = ENGLISH_OPTIONS.includes(input.englishAbility) ? input.englishAbility : clean(input.englishAbility);
  return {
    fullName: clean(input.fullName || input.full_name),
    dateOfBirth: clean(input.dateOfBirth || input.date_of_birth),
    citizenshipCountry: clean(input.citizenshipCountry || input.citizenship_country),
    residenceCountry: clean(input.residenceCountry || input.residence_country),
    timezone: clean(input.timezone || 'UTC'),
    email: clean(input.email).toLowerCase(),
    partnershipStatus: clean(input.partnershipStatus || input.partnership_status),
    highestQualification: clean(input.highestQualification || input.highest_qualification),
    currentOccupation: clean(input.currentOccupation || input.current_occupation),
    workHistory: clean(input.workHistory || input.work_history),
    healthCharacterIssues: clean(input.healthCharacterIssues || input.health_character_issues),
    englishAbility,
    consentToContact: Boolean(input.consentToContact || input.consent_to_contact),
    privacyAcknowledged: Boolean(input.privacyAcknowledged || input.privacy_acknowledged),
  };
}

async function sendSeminarNotificationEmail({ registrationId = '', registration = {}, seminar = {} } = {}) {
  const recipients = getSeminarNotificationRecipients();
  if (!recipients.length) return false;
  const config = requireMicrosoftEmailConfig();
  const fallbackSubject = `New seminar registration: ${registration.fullName || 'Unnamed registrant'}`;
  const submitted = new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });
  const fallbackBodyText = [
    `A new seminar registration has been submitted.`,
    '',
    `Seminar: ${seminar.title || 'Turner Hopkins immigration seminar'}`,
    `Seminar date/time: ${toDateOnly(seminar.seminar_date)} ${seminar.seminar_time || ''} NZ time`,
    `Presenter: ${seminar.presenter_name || ''}`,
    '',
    `Full name: ${registration.fullName}`,
    `Email: ${registration.email}`,
    `Date of birth: ${registration.dateOfBirth}`,
    `Citizenship: ${registration.citizenshipCountry}`,
    `Current country: ${registration.residenceCountry}`,
    `Timezone: ${registration.timezone}`,
    `Partnership status: ${registration.partnershipStatus}`,
    `Highest qualification: ${registration.highestQualification}`,
    `Current occupation: ${registration.currentOccupation}`,
    `English ability: ${registration.englishAbility}`,
    '',
    `Relevant work history:`,
    registration.workHistory || 'Not provided',
    '',
    `Health / character issues:`,
    registration.healthCharacterIssues || 'Not provided',
    '',
    `Submitted: ${submitted}`,
    `Registration ID: ${registrationId}`,
    '',
    'Please review this in THiS CRM > Enquiries & Intake > Seminar Registrations.',
  ].join('\n');
  const templateDraft = await buildEmailFromTemplate('seminar_new_registration', {
    registrantFullName: registration.fullName || 'Unnamed registrant',
    registrantEmail: registration.email || '',
    seminarTitle: seminar.title || 'Turner Hopkins immigration seminar',
    seminarDateTime: `${toDateOnly(seminar.seminar_date)} ${seminar.seminar_time || ''} NZ time`.trim(),
    presenterName: seminar.presenter_name || '',
    dateOfBirth: registration.dateOfBirth || '',
    citizenshipCountry: registration.citizenshipCountry || '',
    residenceCountry: registration.residenceCountry || '',
    registrantTimezone: registration.timezone || '',
    partnershipStatus: registration.partnershipStatus || '',
    highestQualification: registration.highestQualification || '',
    currentOccupation: registration.currentOccupation || '',
    englishAbility: registration.englishAbility || '',
    workHistory: registration.workHistory || 'Not provided',
    healthCharacterIssues: registration.healthCharacterIssues || 'Not provided',
    submitted,
    registrationId,
  }, { subject: fallbackSubject, bodyText: fallbackBodyText });
  const subject = templateDraft.subject;
  const bodyText = templateDraft.bodyText;
  const bodyHtml = templateDraft.bodyHtml;
  const database = db();
  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
    VALUES ('seminar_registration', ${nullableUuidValue(registrationId)}, 'seminar_new_registration', ${config.fromEmail}, ${config.fromName}, ${recipients.join(',')}, ${subject}, ${bodyText}, ${bodyHtml}, 'Sending', 'Website seminar form')
    RETURNING id`;
  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail: recipients.join(','), subject, bodyText, bodyHtml });
    await database.sql`UPDATE email_notifications SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW() WHERE id = ${created.id}`;
    return true;
  } catch (error) {
    await database.sql`UPDATE email_notifications SET status = 'Failed', failed_at = NOW(), failure_message = ${String(error?.message || error).slice(0, 1000)}, updated_at = NOW() WHERE id = ${created.id}`;
    return false;
  }
}


async function ensureEmailTemplateSchema(database = db()) {
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS email_templates (
      template_key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      body_html TEXT,
      placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT
    )`;
  await database.sql`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_html TEXT`;
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    await database.sql`
      INSERT INTO email_templates (template_key, name, description, subject, body_text, body_html, placeholders, updated_by)
      VALUES (${template.key}, ${template.name}, ${template.description}, ${template.subject}, ${template.bodyText}, ${template.bodyHtml || null}, CAST(${JSON.stringify(template.placeholders || [])} AS jsonb), 'System default')
      ON CONFLICT (template_key) DO NOTHING`;
  }
}


function hasMeaningfulTemplateHtml(html = '') {
  const text = String(html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
  return Boolean(text);
}

async function getEmailTemplate(templateKey = '') {
  await ensureEmailTemplateSchema();
  const fallback = DEFAULT_EMAIL_TEMPLATES.find((template) => template.key === templateKey) || DEFAULT_EMAIL_TEMPLATES[0];
  const rows = await db().sql`SELECT template_key, subject, body_text, body_html FROM email_templates WHERE template_key = ${templateKey} LIMIT 1`;
  const rowBodyHtml = rows[0]?.body_html || '';
  const fallbackBodyHtml = fallback.bodyHtml || '';
  return {
    subject: rows[0]?.subject || fallback.subject,
    bodyText: rows[0]?.body_text || fallback.bodyText,
    bodyHtml: hasMeaningfulTemplateHtml(rowBodyHtml) ? rowBodyHtml : (hasMeaningfulTemplateHtml(fallbackBodyHtml) ? fallbackBodyHtml : ''),
  };
}

async function buildEmailFromTemplate(templateKey, context = {}, fallback = {}) {
  const template = await getEmailTemplate(templateKey);
  const subject = renderTemplateText(template.subject || fallback.subject || '', context).trim() || fallback.subject || '';
  const rawHtml = template.bodyHtml || fallback.bodyHtml || '';
  const renderedHtml = cleanHtmlForTemplate(renderTemplateText(rawHtml, context), 60000);
  const bodyText = renderTemplateText(template.bodyText || fallback.bodyText || stripHtmlToText(renderedHtml), context).trim() || fallback.bodyText || stripHtmlToText(renderedHtml);
  return { subject, bodyText, bodyHtml: renderedHtml ? editableTemplateBodyHtml(renderedHtml) : textToHtml(bodyText) };
}

function editableTemplateBodyHtml(bodyHtml = '') {
  return `<div style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #1f2933;">${cleanHtmlForTemplate(bodyHtml, 60000)}${buildEmailSignatureSpacer(18)}</div>`;
}

function cleanHtmlForTemplate(value = '', limit = 60000) {
  let html = String(value || '').slice(0, limit);
  html = html.replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/<\s*\/?\s*(script|style|iframe|object|embed|meta|link)[^>]*>/gi, '');
  html = html.replace(/\son\w+\s*=\s*(["']).*?\1/gi, '');
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  html = html.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
  html = html.replace(/\sstyle\s*=\s*(["'])(.*?)\1/gi, (_, quote, style) => {
    const cleaned = cleanInlineStyle(style);
    return cleaned ? ` style="${cleaned}"` : '';
  });
  return html.trim();
}

function cleanInlineStyle(style = '') {
  const allowed = new Set(['color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'text-align', 'margin', 'margin-bottom', 'margin-top', 'padding', 'line-height', 'font-size', 'font-family']);
  return String(style || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [property, ...rest] = part.split(':');
      const name = String(property || '').trim().toLowerCase();
      const value = rest.join(':').trim();
      if (!allowed.has(name)) return '';
      if (/expression\s*\(|javascript:/i.test(value)) return '';
      return `${name}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function stripHtmlToText(html = '') {
  return String(html || '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h1|h2|h3|h4)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderTemplateText(value = '', context = {}) {
  return String(value || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    const replacement = String(key || '').split('.').reduce((current, part) => (current && Object.prototype.hasOwnProperty.call(current, part) ? current[part] : ''), context);
    return replacement == null ? '' : String(replacement);
  });
}

function getSeminarNotificationRecipients() {
  const configured = String(process.env.SEMINAR_NOTIFICATION_RECIPIENTS || process.env.INTAKE_NOTIFICATION_RECIPIENTS || '').trim();
  const value = configured || 'paul.janssen@turnerhopkins.co.nz,sejoo.han@turnerhopkins.co.nz';
  return value.split(/[;,]/).map((email) => email.trim()).filter(isValidEmailAddress);
}

function requireMicrosoftEmailConfig() {
  const tenantId = String(process.env.MICROSOFT_TENANT_ID || '').trim();
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  const fromEmail = String(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz').trim();
  const fromName = String(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists').trim();
  const missing = [];
  if (!tenantId) missing.push('MICROSOFT_TENANT_ID');
  if (!clientId) missing.push('MICROSOFT_CLIENT_ID');
  if (!clientSecret) missing.push('MICROSOFT_CLIENT_SECRET');
  if (!fromEmail) missing.push('MICROSOFT_NOTIFICATION_FROM_EMAIL');
  if (missing.length) throw new Error(`Missing Microsoft email environment variables: ${missing.join(', ')}`);
  return { tenantId, clientId, clientSecret, fromEmail, fromName };
}

async function getMicrosoftGraphAccessToken(config) {
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
  const response = await fetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || `Microsoft token request failed with status ${response.status}`);
  return payload.access_token;
}

async function sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText, bodyHtml }) {
  const toRecipients = normaliseEmailRecipientList(toEmail);
  if (!toRecipients.length) throw new Error('At least one valid recipient is required.');
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'outlook.timezone="Pacific/Auckland"' },
    body: JSON.stringify({ message: { subject, body: { contentType: 'HTML', content: bodyHtml || textToHtml(bodyText) }, toRecipients }, saveToSentItems: true }),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try { detail = JSON.parse(text)?.error?.message || text; } catch {}
    throw new Error(detail || `Microsoft Graph sendMail failed with status ${response.status}`);
  }
  return { requestId: response.headers.get('request-id') || response.headers.get('client-request-id') || '' };
}

function normaliseEmailRecipientList(value = '') {
  return String(value || '').split(/[;,]/).map((address) => address.trim()).filter(isValidEmailAddress).map((address) => ({ emailAddress: { address } }));
}

function buildEmailSignatureSpacer(height = 18) {
  return `<div style="height:${height}px; line-height:${height}px; font-size:${height}px; mso-line-height-rule:exactly;">&nbsp;</div>`;
}

function textToHtml(value = '') {
  return `<div style="font-family:Arial,sans-serif;font-size:10pt;line-height:1.3;color:#1f2933;">${String(value || '').split(/\n{2,}/).map((paragraph) => `<p style="margin:0 0 10px 0;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
}

function clean(value, max = MAX_TEXT) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function nullableDate(value = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

function toDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  try { return new Date(value).toISOString().slice(0, 10); } catch { return ''; }
}

function nullableUuidValue(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim()) ? String(value).trim() : null;
}

function isValidEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function escapeHtml(value = '') {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...corsHeaders() } });
}
