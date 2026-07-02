import { getDatabase } from '@netlify/database';

const MAX_TEXT = 12000;
const DEFAULT_CALCULATOR_URL = 'https://thisvisacrm.netlify.app/smc-work-experience-calculator.html';
const DEFAULT_CONSULTATION_URL = 'https://www.turnerhopkinsimmigration.co.nz/visa-consultation';

const SMC_EMAIL_TEMPLATES = [
  {
    key: 'smc_calculator_result',
    name: 'SMC calculator - applicant result',
    description: 'Sent to the website user after they request their SMC work experience calculator result by email.',
    subject: 'Your SMC work experience estimate',
    bodyText: `Hello,

Thank you for using the Turner Hopkins Immigration Specialists SMC work experience calculator.

Your indicative result is below.

{{summary}}

Work periods entered:
{{workPeriods}}

Important note:
This calculator provides an indication only. It is not immigration advice, does not guarantee eligibility, and does not replace a full assessment of your evidence, ANZSCO substantial match, direct relevance, genuine employment, wage thresholds, or whether Immigration New Zealand would accept the claimed work experience.

If you would like our team to review your circumstances and map out a practical residence strategy, you can book a consultation here:
{{consultationLink}}

Turner Hopkins Immigration Specialists`,
    placeholders: ['recipientEmail', 'submitted', 'pathwayName', 'headline', 'statusLabel', 'applicationDate', 'summary', 'workPeriods', 'consultationLink', 'calculatorUrl'],
  },
  {
    key: 'smc_calculator_internal_notification',
    name: 'SMC calculator - internal notification',
    description: 'Internal notification sent when a website user emails themselves an SMC work experience calculator result.',
    subject: 'SMC calculator result emailed - {{recipientEmail}}',
    bodyText: `A website user has emailed themselves an SMC work experience calculator result.

Email: {{recipientEmail}}
Submitted: {{submitted}}
Calculator page: {{calculatorUrl}}

{{summary}}

Work periods entered:
{{workPeriods}}

No CRM enquiry record has been created for this calculator use. Follow up manually if appropriate.`,
    placeholders: ['recipientEmail', 'submitted', 'pathwayName', 'headline', 'statusLabel', 'applicationDate', 'summary', 'workPeriods', 'calculatorUrl'],
  },
];

export default async function smcCalculatorRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const database = db();
    await ensureEmailSchema(database);

    const body = await request.json().catch(() => ({}));
    const recipientEmail = cleanEmail(body.recipientEmail || body.email || body.toEmail);
    if (!isValidEmailAddress(recipientEmail)) return json({ error: 'Please enter a valid email address.' }, 400);

    const payload = normalisePayload(body.payload || body);
    if (!payload.summaryText && !payload.assessment?.headline) {
      return json({ error: 'Calculator result details were not received. Please calculate again and retry.' }, 400);
    }

    const context = buildTemplateContext({ recipientEmail, payload });
    const applicantEmail = await buildEmailFromTemplate(database, 'smc_calculator_result', context);
    const applicantLog = await sendLoggedEmail(database, {
      templateKey: 'smc_calculator_result',
      toEmail: recipientEmail,
      subject: applicantEmail.subject,
      bodyText: applicantEmail.bodyText,
      bodyHtml: applicantEmail.bodyHtml,
      sentBy: 'SMC work experience calculator',
    });

    if (applicantLog.status === 'Failed') {
      return json({ error: applicantLog.failureMessage || 'The result email could not be sent.' }, 502);
    }

    let internalLog = null;
    const notificationRecipients = await getInternalNotificationRecipients(database);
    if (notificationRecipients.length) {
      try {
        const internalEmail = await buildEmailFromTemplate(database, 'smc_calculator_internal_notification', context);
        internalLog = await sendLoggedEmail(database, {
          templateKey: 'smc_calculator_internal_notification',
          toEmail: notificationRecipients.join(','),
          subject: internalEmail.subject,
          bodyText: internalEmail.bodyText,
          bodyHtml: internalEmail.bodyHtml,
          sentBy: 'SMC work experience calculator',
        });
      } catch (notifyError) {
        console.warn('SMC calculator internal notification failed', notifyError?.message || notifyError);
      }
    }

    return json({ ok: true, applicantEmailSent: true, internalNotified: Boolean(internalLog && internalLog.status === 'Sent') });
  } catch (error) {
    console.error('SMC calculator request failed', error);
    return json({ error: 'The calculator result email could not be sent.', detail: String(error?.message || error) }, 500);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) return getDatabase({ connectionString });
  return getDatabase();
}

async function ensureEmailSchema(database) {
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
  await database.sql`CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name)`;

  for (const template of SMC_EMAIL_TEMPLATES) {
    await database.sql`
      INSERT INTO email_templates (template_key, name, description, subject, body_text, body_html, placeholders, updated_by)
      VALUES (${template.key}, ${template.name}, ${template.description}, ${template.subject}, ${template.bodyText}, null, CAST(${JSON.stringify(template.placeholders || [])} AS jsonb), 'System default')
      ON CONFLICT (template_key) DO NOTHING`;
  }

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
  await database.sql`ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS provider_request_id TEXT`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_created ON email_notifications(created_at DESC)`;
}

async function getEmailTemplate(database, templateKey = '') {
  const fallback = SMC_EMAIL_TEMPLATES.find((template) => template.key === templateKey) || SMC_EMAIL_TEMPLATES[0];
  const rows = await database.sql`SELECT template_key, name, description, subject, body_text, body_html, placeholders FROM email_templates WHERE template_key = ${templateKey} LIMIT 1`;
  const row = rows[0] || {};
  return {
    key: row.template_key || fallback.key,
    subject: row.subject || fallback.subject,
    bodyText: row.body_text || fallback.bodyText,
    bodyHtml: row.body_html || '',
  };
}

async function buildEmailFromTemplate(database, templateKey, context = {}) {
  const template = await getEmailTemplate(database, templateKey);
  const subject = renderTemplateText(template.subject, context).trim();
  const rawHtml = cleanHtmlForEmail(renderTemplateText(template.bodyHtml || '', context));
  const bodyText = renderTemplateText(template.bodyText, context).trim();
  return {
    subject: subject || 'Turner Hopkins Immigration Specialists',
    bodyText,
    bodyHtml: rawHtml ? wrapEmailHtml(rawHtml) : brandedTextEmailHtml(bodyText),
  };
}

function renderTemplateText(value = '', context = {}) {
  return String(value || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(context, key)) return context[key] == null ? '' : String(context[key]);
    return '';
  });
}

function normalisePayload(input = {}) {
  return {
    assessment: normaliseObject(input.assessment),
    settings: normaliseObject(input.settings),
    rows: Array.isArray(input.rows) ? input.rows.slice(0, 30).map(normaliseObject) : [],
    summaryText: clean(input.summaryText, MAX_TEXT),
    sourceUrl: clean(input.sourceUrl, 1000),
    calculatorVersion: clean(input.calculatorVersion, 60),
    submittedAt: clean(input.submittedAt, 100),
  };
}

function normaliseObject(value) {
  if (!value || typeof value !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function buildTemplateContext({ recipientEmail, payload }) {
  const assessment = payload.assessment || {};
  const settings = payload.settings || {};
  const statusLabel = assessment.status === 'pass' ? 'Indicative pass' : assessment.status === 'fail' ? 'May need review' : clean(assessment.status, 80) || 'May need review';
  const summary = payload.summaryText || buildSummaryText(assessment, settings);
  return {
    recipientEmail,
    submitted: formatDateTime(payload.submittedAt || new Date().toISOString()),
    pathwayName: clean(assessment.pathwayName, 200) || 'SMC work experience',
    headline: clean(assessment.headline, 600),
    statusLabel,
    applicationDate: formatDate(settings.applicationDate),
    summary,
    workPeriods: buildWorkPeriodsText(payload.rows),
    consultationLink: clean(process.env.SMC_CALCULATOR_CONSULTATION_URL || DEFAULT_CONSULTATION_URL, 1000),
    calculatorUrl: clean(payload.sourceUrl || process.env.SMC_CALCULATOR_URL || DEFAULT_CALCULATOR_URL, 1000),
  };
}

function buildSummaryText(assessment = {}, settings = {}) {
  const lines = [];
  lines.push(`Pathway assessed: ${clean(assessment.pathwayName, 200) || 'SMC work experience'}`);
  lines.push(`Application date used: ${formatDate(settings.applicationDate)}`);
  if (assessment.headline) lines.push(`Result: ${clean(assessment.headline, 1000)}`);
  if (Array.isArray(assessment.kpis) && assessment.kpis.length) {
    lines.push('');
    lines.push('Key indicators:');
    assessment.kpis.slice(0, 12).forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) lines.push(`- ${clean(item[0], 200)}: ${clean(item[1], 500)}`);
    });
  }
  if (Array.isArray(assessment.warnings) && assessment.warnings.length) {
    lines.push('');
    lines.push('Items that may need review:');
    assessment.warnings.slice(0, 20).forEach((warning) => lines.push(`- ${clean(warning, 600)}`));
  }
  return lines.join('\n').slice(0, MAX_TEXT);
}

function buildWorkPeriodsText(rows = []) {
  if (!Array.isArray(rows) || !rows.length) return 'No work periods were supplied.';
  return rows.slice(0, 30).map((row, index) => {
    const label = clean(row.label, 160) || `Period ${index + 1}`;
    const country = clean(row.country, 80) === 'nz' ? 'New Zealand' : clean(row.country, 80) || 'Not stated';
    const dates = `${formatDate(row.start)} to ${row.ongoing ? 'current / projected' : formatDate(row.endInclusive)}`;
    const hourly = row.hourly == null || Number.isNaN(Number(row.hourly)) ? 'not calculated' : `$${Number(row.hourly).toFixed(2)} per hour`;
    const skillLevel = clean(row.skillLevel, 40) || 'not stated';
    return `- ${label}: ${dates}; ${country}; skill level ${skillLevel}; estimated hourly rate ${hourly}; ${Number(row.hours || 0) || 'unknown'} guaranteed hours.`;
  }).join('\n');
}

async function getInternalNotificationRecipients(database) {
  const adviserEmails = new Set();
  try {
    const rows = await database.sql`SELECT email FROM advisers WHERE active IS DISTINCT FROM FALSE AND email IS NOT NULL AND TRIM(email) <> '' ORDER BY name ASC`;
    rows.forEach((row) => {
      const email = cleanEmail(row.email);
      if (isValidEmailAddress(email)) adviserEmails.add(email);
    });
  } catch (error) {
    console.warn('Could not read adviser notification emails', error?.message || error);
  }

  if (!adviserEmails.size) {
    const fallback = [process.env.SMC_CALCULATOR_NOTIFICATION_EMAILS, process.env.INTAKE_NOTIFICATION_EMAILS, process.env.CRM_NOTIFICATION_EMAILS]
      .filter(Boolean)
      .join(',');
    normaliseEmailList(fallback).forEach((email) => adviserEmails.add(email));
  }
  return Array.from(adviserEmails);
}

async function sendLoggedEmail(database, { templateKey, toEmail, subject, bodyText, bodyHtml, sentBy }) {
  const config = requireMicrosoftEmailConfig();
  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
    VALUES ('smc_calculator', ${templateKey}, ${config.fromEmail}, ${config.fromName}, ${toEmail}, ${subject}, ${bodyText}, ${bodyHtml}, 'Sending', ${sentBy})
    RETURNING id, template_key, to_email, subject, status, failure_message, created_at`;

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText, bodyHtml });
    const [updated] = await database.sql`
      UPDATE email_notifications
         SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, to_email, subject, status, failure_message, sent_at, created_at`;
    return mapEmailLog(updated);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1000);
    const [failed] = await database.sql`
      UPDATE email_notifications
         SET status = 'Failed', failed_at = NOW(), failure_message = ${message}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, to_email, subject, status, failure_message, failed_at, created_at`;
    return mapEmailLog(failed);
  }
}

function mapEmailLog(row = {}) {
  return {
    id: row.id || '',
    templateKey: row.template_key || '',
    toEmail: row.to_email || '',
    subject: row.subject || '',
    status: row.status || '',
    failureMessage: row.failure_message || '',
  };
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
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || `Microsoft token request failed with status ${response.status}`);
  return payload.access_token;
}

async function sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText, bodyHtml }) {
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`;
  const toRecipients = normaliseEmailList(toEmail).map((address) => ({ emailAddress: { address } }));
  if (!toRecipients.length) throw new Error('At least one valid email recipient is required.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'outlook.timezone="Pacific/Auckland"',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: bodyHtml || brandedTextEmailHtml(bodyText) },
        toRecipients,
      },
      saveToSentItems: true,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      const jsonBody = JSON.parse(text);
      detail = jsonBody?.error?.message || jsonBody?.error_description || text;
    } catch {}
    throw new Error(detail || `Microsoft Graph sendMail failed with status ${response.status}`);
  }
  return { requestId: response.headers.get('request-id') || response.headers.get('client-request-id') || '' };
}

function normaliseEmailList(value = '') {
  const list = Array.isArray(value) ? value : String(value || '').split(/[;,]/);
  return list.map(cleanEmail).filter(isValidEmailAddress);
}

function brandedTextEmailHtml(value = '') {
  const paragraphs = String(value || '')
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p style="margin:0 0 12px 0; padding:0; line-height:1.42;">${linkifyHtml(escapeHtml(paragraph).replace(/\n/g, '<br>'))}</p>`)
    .join('');
  return wrapEmailHtml(paragraphs);
}

function wrapEmailHtml(innerHtml = '') {
  return `<div style="font-family:Arial, sans-serif; font-size:10pt; line-height:1.42; color:#1f2933;">${innerHtml}</div>`;
}

function cleanHtmlForEmail(value = '') {
  return String(value || '')
    .slice(0, 60000)
    .replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|meta|link)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

function linkifyHtml(html = '') {
  return String(html).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#003736; font-weight:700;">$1</a>');
}

function formatDate(value) {
  if (!value) return 'Not stated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return clean(value, 80) || 'Not stated';
  return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function cleanEmail(value = '') {
  return String(value || '').trim().toLowerCase().slice(0, 320);
}

function clean(value = '', limit = 1000) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isValidEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders() } });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
