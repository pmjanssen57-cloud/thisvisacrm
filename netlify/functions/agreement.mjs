import { getDatabase } from '@netlify/database';
import crypto from 'node:crypto';

export default async function agreementRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  try {
    await ensureAgreementSchema();
    const url = new URL(request.url);
    const token = clean(url.searchParams.get('token'), 200);
    if (!token) return json({ error: 'This agreement link is missing its secure token.' }, 400);
    const tokenHash = hashToken(token);
    if (method === 'GET') return json(await getAgreementForReview(tokenHash, request));
    if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const body = await request.json().catch(() => ({}));
    if (String(body.action || '') !== 'accept') return json({ error: 'Unknown agreement action.' }, 400);
    return json(await acceptAgreement(tokenHash, body, request));
  } catch (error) {
    console.error(error);
    return json({ error: String(error?.message || error || 'Agreement request failed.') }, 500);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? getDatabase({ connectionString }) : getDatabase();
}

async function ensureAgreementSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS agreement_sets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      app_type TEXT NOT NULL DEFAULT 'other',
      status TEXT NOT NULL DEFAULT 'Draft',
      standalone_label TEXT,
      recipient_email TEXT,
      studio_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      template_version JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by TEXT,
      updated_by TEXT,
      issued_at TIMESTAMPTZ,
      accepted_at TIMESTAMPTZ,
      accepted_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS agreement_signatories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agreement_id UUID NOT NULL REFERENCES agreement_sets(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT NOT NULL,
      role TEXT,
      required BOOLEAN NOT NULL DEFAULT TRUE,
      token_hash TEXT NOT NULL UNIQUE,
      token_last_four TEXT,
      status TEXT NOT NULL DEFAULT 'Sent',
      expires_at TIMESTAMPTZ,
      viewed_at TIMESTAMPTZ,
      accepted_at TIMESTAMPTZ,
      typed_name TEXT,
      signature_data TEXT,
      declarations JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_agreement_signatories_token_hash ON agreement_signatories(token_hash)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_agreement_signatories_agreement ON agreement_signatories(agreement_id, created_at)`;
}

async function getAgreementForReview(tokenHash, request) {
  const database = db();
  const rows = await database.sql`
    SELECT s.id AS signatory_id, s.name AS signatory_name, s.email AS signatory_email, s.role AS signatory_role,
           s.required, s.status AS signatory_status, s.expires_at, s.viewed_at, s.accepted_at AS signatory_accepted_at,
           s.typed_name, s.signature_data, s.declarations,
           a.id AS agreement_id, a.title, a.app_type, a.status AS agreement_status, a.studio_state,
           a.template_version, a.issued_at, a.accepted_at, a.accepted_by
      FROM agreement_signatories s
      JOIN agreement_sets a ON a.id = s.agreement_id
     WHERE s.token_hash = ${tokenHash}
     LIMIT 1`;
  const row = rows[0];
  if (!row) throw new Error('This agreement link was not found.');
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) throw new Error('This agreement link has expired. Please contact Turner Hopkins for a new link.');
  if (!row.viewed_at) {
    await database.sql`
      UPDATE agreement_signatories
         SET viewed_at = NOW(), status = CASE WHEN status = 'Sent' THEN 'Viewed' ELSE status END, updated_at = NOW()
       WHERE id = ${row.signatory_id}`;
    await refreshAgreementStatus(row.agreement_id, database);
  }
  return {
    agreement: {
      id: row.agreement_id,
      title: row.title || 'Engagement agreement',
      appType: row.app_type || 'other',
      status: row.agreement_status || 'Sent',
      studioState: row.studio_state || {},
      templateVersion: row.template_version || {},
      issuedAt: row.issued_at || '',
      acceptedAt: row.accepted_at || '',
      acceptedBy: row.accepted_by || '',
    },
    signatory: {
      id: row.signatory_id,
      name: row.signatory_name || '',
      email: row.signatory_email || '',
      role: row.signatory_role || 'Client',
      required: row.required !== false,
      status: row.signatory_status || 'Sent',
      viewedAt: row.viewed_at || '',
      acceptedAt: row.signatory_accepted_at || '',
      typedName: row.typed_name || '',
      signatureData: row.signature_data || '',
      declarations: row.declarations || {},
    },
  };
}

async function acceptAgreement(tokenHash, body, request) {
  const typedName = clean(body.typedName, 250);
  const signatureData = clean(body.signatureData, 500000);
  const declarations = body.declarations && typeof body.declarations === 'object' ? body.declarations : {};
  if (!typedName) throw new Error('Enter your full legal name before accepting the agreement.');
  if (!signatureData.startsWith('data:image/png;base64,')) throw new Error('Add your signature before accepting the agreement.');
  if (!declarations.read || !declarations.fees || !declarations.codeOfConduct) throw new Error('Complete all agreement acknowledgements before accepting.');
  const database = db();
  const rows = await database.sql`
    SELECT s.id AS signatory_id, s.agreement_id, s.email AS signatory_email, s.name AS signatory_name, s.status,
           s.expires_at, a.title, a.studio_state
      FROM agreement_signatories s
      JOIN agreement_sets a ON a.id = s.agreement_id
     WHERE s.token_hash = ${tokenHash}
     LIMIT 1`;
  const row = rows[0];
  if (!row) throw new Error('This agreement link was not found.');
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) throw new Error('This agreement link has expired.');
  if (row.status === 'Accepted') return { ok: true, agreementStatus: await refreshAgreementStatus(row.agreement_id, database) };
  const ipAddress = clean(request.headers.get('x-forwarded-for') || request.headers.get('client-ip') || '', 500);
  const userAgent = clean(request.headers.get('user-agent') || '', 1000);
  await database.sql`
    UPDATE agreement_signatories
       SET status = 'Accepted', accepted_at = NOW(), typed_name = ${typedName}, signature_data = ${signatureData},
           declarations = ${JSON.stringify(declarations)}::jsonb, ip_address = ${ipAddress}, user_agent = ${userAgent}, updated_at = NOW()
     WHERE id = ${row.signatory_id}`;
  const agreementStatus = await refreshAgreementStatus(row.agreement_id, database);
  await recordAcceptanceEmail({ database, agreementId: row.agreement_id, agreementTitle: row.title, signatoryEmail: row.signatory_email, typedName, studioState: row.studio_state || {} });
  return { ok: true, agreementStatus };
}

async function refreshAgreementStatus(agreementId, database = db()) {
  const counts = await database.sql`
    SELECT COUNT(*) FILTER (WHERE required = TRUE)::int AS required_count,
           COUNT(*) FILTER (WHERE required = TRUE AND status = 'Accepted')::int AS accepted_count,
           COUNT(*) FILTER (WHERE status = 'Viewed')::int AS viewed_count
      FROM agreement_signatories
     WHERE agreement_id = ${agreementId}`;
  const requiredCount = Number(counts[0]?.required_count || 0);
  const acceptedCount = Number(counts[0]?.accepted_count || 0);
  let status = 'Sent';
  if (requiredCount > 0 && acceptedCount >= requiredCount) status = 'Accepted';
  else if (acceptedCount > 0) status = 'Partially signed';
  else if (Number(counts[0]?.viewed_count || 0) > 0) status = 'Viewed';
  const acceptedRows = await database.sql`
    SELECT typed_name FROM agreement_signatories
     WHERE agreement_id = ${agreementId} AND status = 'Accepted'
     ORDER BY accepted_at ASC`;
  const acceptedBy = acceptedRows.map(row => row.typed_name).filter(Boolean).join(', ');
  await database.sql`
    UPDATE agreement_sets
       SET status = ${status}, accepted_at = ${status === 'Accepted' ? new Date().toISOString() : null},
           accepted_by = ${acceptedBy || null}, updated_at = NOW()
     WHERE id = ${agreementId}`;
  return status;
}

async function recordAcceptanceEmail({ database, agreementId, agreementTitle, signatoryEmail, typedName, studioState }) {
  const adviserEmail = clean(studioState?.client?.adviserEmail || '', 320);
  const configStatus = getEmailConfigStatus();
  const subject = `Agreement accepted: ${agreementTitle || 'Turner Hopkins engagement agreement'}`;
  const bodyText = [
    `Dear ${typedName || 'client'},`,
    '',
    'Thank you. Your electronic acceptance of the Turner Hopkins engagement agreement has been recorded.',
    '',
    `Agreement: ${agreementTitle || 'Engagement agreement'}`,
    `Accepted by: ${typedName || ''}`,
    `Accepted at: ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}`,
    '',
    'Please contact your adviser if you have any questions.',
    '',
    'Kind regards,',
    'Turner Hopkins Immigration Specialists',
  ].join('\n');
  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, template_key, from_email, from_name, to_email, cc, subject, body_text, body_html, status, sent_by)
    VALUES ('agreement', ${agreementId}, 'agreement_accepted', ${configStatus.fromEmail}, ${configStatus.fromName}, ${signatoryEmail}, ${adviserEmail || null}, ${subject}, ${bodyText}, ${textToHtml(bodyText)}, ${configStatus.configured ? 'Sending' : 'Draft'}, 'Agreement acceptance')
    RETURNING id`;
  if (!configStatus.configured) return;
  try {
    const config = requireMicrosoftEmailConfig();
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail: signatoryEmail, ccEmail: adviserEmail, replyToEmail: adviserEmail, subject, bodyText, bodyHtml: textToHtml(bodyText) });
    await database.sql`UPDATE email_notifications SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW() WHERE id = ${created.id}`;
  } catch (error) {
    await database.sql`UPDATE email_notifications SET status = 'Failed', failed_at = NOW(), failure_message = ${clean(error?.message || error, 1000)}, updated_at = NOW() WHERE id = ${created.id}`;
  }
}

function hashToken(token) { return crypto.createHash('sha256').update(String(token || '')).digest('hex'); }
function clean(value, max = 2000) { return String(value || '').trim().slice(0, max); }
function normaliseEmailList(value = '') {
  return String(value || '').split(/[;,\n]/).map(item => item.trim()).filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)).map(address => ({ emailAddress: { address } }));
}
function getEmailConfigStatus() {
  const fromEmail = clean(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz', 320);
  const fromName = clean(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists', 320);
  return { configured: Boolean(process.env.MICROSOFT_TENANT_ID && process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && fromEmail), fromEmail, fromName };
}
function requireMicrosoftEmailConfig() {
  const config = { tenantId: clean(process.env.MICROSOFT_TENANT_ID, 500), clientId: clean(process.env.MICROSOFT_CLIENT_ID, 500), clientSecret: clean(process.env.MICROSOFT_CLIENT_SECRET, 2000), fromEmail: clean(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz', 320), fromName: clean(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists', 320) };
  if (!config.tenantId || !config.clientId || !config.clientSecret || !config.fromEmail) throw new Error('Microsoft email is not configured.');
  return config;
}
async function getMicrosoftGraphAccessToken(config) {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || 'Microsoft authentication failed.');
  return payload.access_token;
}
async function sendMicrosoftGraphEmail({ config, token, toEmail, ccEmail = '', replyToEmail = '', subject, bodyText, bodyHtml }) {
  const message = { subject, body: { contentType: 'HTML', content: bodyHtml || textToHtml(bodyText) }, toRecipients: normaliseEmailList(toEmail) };
  const ccRecipients = normaliseEmailList(ccEmail); if (ccRecipients.length) message.ccRecipients = ccRecipients;
  const replyTo = normaliseEmailList(replyToEmail); if (replyTo.length) message.replyTo = replyTo;
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ message, saveToSentItems: true }) });
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `Microsoft Graph sendMail failed with status ${response.status}`);
  return { requestId: response.headers.get('request-id') || response.headers.get('client-request-id') || '' };
}
function textToHtml(value = '') { return `<div style="font-family:Arial,sans-serif;font-size:10pt;line-height:1.45;color:#1d2f2e">${String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`; }
function corsHeaders() { return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', 'content-type': 'application/json; charset=utf-8' }; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: corsHeaders() }); }
