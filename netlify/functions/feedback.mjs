import { getDatabase } from '@netlify/database';

const MAX_TEXT = 6000;

export default async function feedbackRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    await ensureFeedbackSchema();
    const body = await request.json().catch(() => ({}));
    const payload = normalisePayload(body.payload || body);

    if (!payload.consentToSubmit) return json({ error: 'Please confirm that Turner Hopkins may receive and review your feedback.' }, 400);
    if (!payload.firstName || !payload.lastName || !payload.email) return json({ error: 'First name, last name and email are required.' }, 400);
    if (!isValidEmailAddress(payload.email)) return json({ error: 'Please enter a valid email address.' }, 400);
    if (!payload.overallRating || !payload.recommendationRating) return json({ error: 'Please complete the rating questions before submitting.' }, 400);

    const rows = await db().sql`
      INSERT INTO feedback_submissions (status, first_name, last_name, email, phone, adviser_name, application_type, overall_rating, recommendation_rating, service_strengths, improvement_suggestions, permission_to_contact, permission_to_use_feedback, raw_payload)
      VALUES ('New', ${payload.firstName}, ${payload.lastName}, ${payload.email}, ${payload.phone}, ${payload.adviserName}, ${payload.applicationType}, ${payload.overallRating}, ${payload.recommendationRating}, ${payload.serviceStrengths}, ${payload.improvementSuggestions}, ${payload.permissionToContact}, ${payload.permissionToUseFeedback}, CAST(${JSON.stringify(payload)} AS jsonb))
      RETURNING id, created_at`;

    const feedbackId = rows[0]?.id || '';
    try {
      await sendFeedbackNotificationEmail({ feedbackId, payload, createdAt: rows[0]?.created_at });
    } catch (notifyError) {
      console.warn('Feedback notification email failed', notifyError?.message || notifyError);
    }

    return json({ ok: true, feedbackId });
  } catch (error) {
    console.error(error);
    return json({ error: 'Feedback submission failed', detail: String(error?.message || error) }, 500);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) return getDatabase({ connectionString });
  return getDatabase();
}

async function ensureFeedbackSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS feedback_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status TEXT NOT NULL DEFAULT 'New',
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      adviser_name TEXT,
      application_type TEXT,
      overall_rating TEXT,
      recommendation_rating TEXT,
      service_strengths TEXT,
      improvement_suggestions TEXT,
      permission_to_contact TEXT,
      permission_to_use_feedback TEXT,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      reviewed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_feedback_submissions_email ON feedback_submissions(LOWER(email))`;
  await ensureEmailSchema(database);
}

async function ensureEmailSchema(database) {
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
      provider_message_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_created ON email_notifications(created_at DESC)`;
}

function normalisePayload(input = {}) {
  return {
    firstName: clean(input.firstName, 120),
    lastName: clean(input.lastName, 120),
    email: clean(input.email, 240).toLowerCase(),
    phone: clean(input.phone, 120),
    adviserName: clean(input.adviserName, 200),
    applicationType: clean(input.applicationType, 240),
    overallRating: clean(input.overallRating, 80),
    recommendationRating: clean(input.recommendationRating, 80),
    serviceStrengths: cleanLong(input.serviceStrengths),
    improvementSuggestions: cleanLong(input.improvementSuggestions),
    permissionToContact: clean(input.permissionToContact || 'Yes', 40),
    permissionToUseFeedback: clean(input.permissionToUseFeedback || 'No', 80),
    consentToSubmit: Boolean(input.consentToSubmit),
    submittedVia: clean(input.submittedVia || 'THiS client feedback form', 120),
    feedbackVersion: clean(input.feedbackVersion || 'v0.13.20', 40),
  };
}

async function sendFeedbackNotificationEmail({ feedbackId = '', payload = {}, createdAt = '' } = {}) {
  const adviserRows = await db().sql`SELECT email FROM advisers WHERE active IS DISTINCT FROM FALSE AND email IS NOT NULL AND email <> '' ORDER BY name ASC`;
  const adviserEmails = Array.from(new Set(adviserRows.map((row) => String(row.email || '').trim().toLowerCase()).filter(isValidEmailAddress)));
  const fallback = String(process.env.FEEDBACK_NOTIFICATION_EMAILS || process.env.INTAKE_NOTIFICATION_EMAILS || process.env.CRM_NOTIFICATION_EMAILS || '').split(/[;,]/).map((item) => item.trim()).filter(isValidEmailAddress);
  const recipients = adviserEmails.length ? adviserEmails : fallback;
  if (!recipients.length) throw new Error('No adviser notification email addresses are configured.');

  const applicantName = [payload.firstName, payload.lastName].filter(Boolean).join(' ') || 'Unnamed client';
  const submitted = createdAt ? new Date(createdAt).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }) : new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });
  const subject = `New client feedback submitted - ${applicantName}`;
  const bodyText = [
    'New client feedback has been submitted through the Turner Hopkins Immigration website.',
    '',
    `Client: ${applicantName}`,
    `Email: ${payload.email || 'Not provided'}`,
    `Phone: ${payload.phone || 'Not provided'}`,
    `Adviser / team member: ${payload.adviserName || 'Not recorded'}`,
    `Application type: ${payload.applicationType || 'Not recorded'}`,
    `Submitted: ${submitted}`,
    '',
    `Overall service rating: ${payload.overallRating || 'Not recorded'}`,
    `Likely to recommend: ${payload.recommendationRating || 'Not recorded'}`,
    `May contact client: ${payload.permissionToContact || 'Not recorded'}`,
    `Permission to use comments: ${payload.permissionToUseFeedback || 'No'}`,
    '',
    'What did we do well?',
    payload.serviceStrengths || 'No comment recorded.',
    '',
    'What could we improve?',
    payload.improvementSuggestions || 'No comment recorded.',
    '',
    'Please review this in THiS CRM > Enquiries & Intake > Feedback.',
  ].join('\n');
  const bodyHtml = textToHtml(bodyText);

  const config = requireMicrosoftEmailConfig();
  let emailLogId = '';
  const logRows = await db().sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, provider)
    VALUES ('feedback_submission', ${nullableUuidValue(feedbackId) ? feedbackId : null}, 'feedback_internal_notification', ${config.fromEmail}, ${config.fromName}, ${recipients.join(', ')}, ${subject}, ${bodyText}, ${bodyHtml}, 'Pending', 'microsoft_graph')
    RETURNING id`;
  emailLogId = logRows[0]?.id || '';

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail: recipients, subject, bodyText, bodyHtml });
    if (emailLogId) {
      await db().sql`UPDATE email_notifications SET status = 'Sent', sent_at = NOW(), provider_message_id = ${sendResult.requestId || ''}, updated_at = NOW() WHERE id = ${emailLogId}`;
    }
    return true;
  } catch (error) {
    if (emailLogId) {
      await db().sql`UPDATE email_notifications SET status = 'Failed', failed_at = NOW(), failure_message = ${String(error?.message || error).slice(0, 1000)}, updated_at = NOW() WHERE id = ${emailLogId}`;
    }
    throw error;
  }
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
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const response = await fetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const tokenPayload = await response.json().catch(() => ({}));
  if (!response.ok || !tokenPayload.access_token) throw new Error(tokenPayload.error_description || tokenPayload.error || `Microsoft token request failed with status ${response.status}`);
  return tokenPayload.access_token;
}

async function sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText, bodyHtml }) {
  const toRecipients = normaliseEmailRecipientList(toEmail);
  if (!toRecipients.length) throw new Error('At least one valid recipient is required.');
  const message = {
    subject,
    body: { contentType: 'HTML', content: bodyHtml || textToHtml(bodyText) },
    toRecipients,
  };
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'outlook.timezone="Pacific/Auckland"' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json?.error?.message || json?.error_description || text;
    } catch {}
    throw new Error(detail || `Microsoft Graph sendMail failed with status ${response.status}`);
  }
  return { requestId: response.headers.get('request-id') || response.headers.get('client-request-id') || '' };
}

function normaliseEmailRecipientList(value = '') {
  const list = Array.isArray(value) ? value : String(value || '').split(/[;,]/);
  return list.map((address) => String(address || '').trim()).filter(isValidEmailAddress).map((address) => ({ emailAddress: { address } }));
}

function textToHtml(value = '') {
  return `<div style="font-family: Aptos, Arial, sans-serif; font-size: 11pt; line-height:1.3; color:#1f2933;">${String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 9px 0; padding:0;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`;
}

function clean(value = '', max = 1000) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanLong(value = '') {
  return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TEXT);
}

function nullableUuidValue(value = '') {
  const text = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : '';
}

function isValidEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...corsHeaders() } });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
