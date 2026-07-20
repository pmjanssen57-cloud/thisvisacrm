import { getDatabase } from '@netlify/database';

const THRESHOLDS = [90, 60, 30];
const MAX_EMAILS_PER_RUN = 50;

export default async function commercialReminderHandler() {
  const database = db();
  await ensureSchema(database);
  const today = aucklandDate();
  const companies = await database.sql`SELECT c.*, a.email AS adviser_email
    FROM commercial_clients c LEFT JOIN advisers a ON a.id=c.primary_adviser_id
    WHERE c.client_status='Active' AND c.reminder_notifications_enabled=TRUE`;
  let sent = 0; let skipped = 0; let failed = 0; let emailConfig = null; let emailToken = '';
  for (const company of companies) {
    if (sent >= MAX_EMAILS_PER_RUN) break;
    const [workers, jobChecks, portalUsers] = await Promise.all([
      database.sql`SELECT id, full_name, visa_type, visa_expiry_date FROM commercial_workers WHERE commercial_client_id=${company.id} AND status IN ('Active','Upcoming') AND visa_expiry_date IS NOT NULL`,
      database.sql`SELECT id, reference_number, role_title, expiry_date FROM commercial_job_checks WHERE commercial_client_id=${company.id} AND status NOT IN ('Archived','Withdrawn') AND expiry_date IS NOT NULL`,
      database.sql`SELECT email FROM commercial_portal_users WHERE commercial_client_id=${company.id} AND active=TRUE AND role='Company Admin'`,
    ]);
    const items = [];
    if (company.accreditation_expiry_date) items.push({ type: 'accreditation', id: company.id, label: `${company.accreditation_type || 'Employer accreditation'} accreditation`, detail: company.accreditation_status || '', expiryDate: dateOnly(company.accreditation_expiry_date) });
    for (const worker of workers) items.push({ type: 'worker_visa', id: worker.id, label: `${worker.full_name} - ${worker.visa_type || 'work visa'}`, detail: 'Work visa holder', expiryDate: dateOnly(worker.visa_expiry_date) });
    for (const jobCheck of jobChecks) items.push({ type: 'job_check', id: jobCheck.id, label: `${jobCheck.role_title} - ${jobCheck.reference_number}`, detail: 'Approved Job Check', expiryDate: dateOnly(jobCheck.expiry_date) });

    const recipients = uniqueEmails([company.primary_contact_email, ...portalUsers.map((row) => row.email)]);
    if (!recipients.length) { skipped += 1; continue; }
    for (let thresholdIndex = 0; thresholdIndex < THRESHOLDS.length; thresholdIndex += 1) {
      const threshold = THRESHOLDS[thresholdIndex];
      const nextThreshold = THRESHOLDS[thresholdIndex + 1] ?? -1;
      // Use a tier window rather than one exact calendar day. This catches a missed
      // scheduled run while still sending each 90/60/30-day reminder only once.
      const dueItems = items.filter((item) => {
        const days = daysBetween(today, item.expiryDate);
        return days !== null && days >= 0 && days <= threshold && days > nextThreshold;
      });
      if (!dueItems.length) continue;
      for (const recipient of recipients) {
        if (sent >= MAX_EMAILS_PER_RUN) break;
        const unsent = [];
        for (const item of dueItems) {
          const existing = await database.sql`SELECT status FROM commercial_reminder_log WHERE commercial_client_id=${company.id} AND record_type=${item.type} AND record_id=${item.id} AND threshold_days=${threshold} AND expiry_date=${item.expiryDate} AND recipient_email=${recipient} LIMIT 1`;
          if (existing[0]?.status === 'Sent') continue;
          unsent.push(item);
        }
        if (!unsent.length) { skipped += 1; continue; }
        try {
          emailConfig ||= requireMicrosoftEmailConfig();
          emailToken ||= await getMicrosoftGraphAccessToken(emailConfig);
          const companyName = company.trading_name || company.legal_name || 'your organisation';
          const subject = `${companyName}: immigration compliance expiry reminder`;
          const bodyHtml = buildEmailHtml(companyName, threshold, unsent);
          const result = await sendMicrosoftGraphEmail({ config: emailConfig, token: emailToken, toEmail: recipient, ccEmail: company.adviser_email || '', subject, bodyHtml });
          for (const item of unsent) await upsertLog(database, company.id, item, threshold, recipient, 'Sent', result.requestId || '', '');
          sent += 1;
        } catch (error) {
          for (const item of unsent) await upsertLog(database, company.id, item, threshold, recipient, 'Failed', '', String(error?.message || error).slice(0, 2000));
          failed += 1;
        }
      }
    }
  }
  console.log(JSON.stringify({ commercialReminderRun: { today, sent, skipped, failed } }));
  return new Response(JSON.stringify({ ok: true, today, sent, skipped, failed }), { headers: { 'content-type': 'application/json' } });
}


function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? getDatabase({ connectionString }) : getDatabase();
}

async function ensureSchema(database) {
  await database.sql`ALTER TABLE commercial_clients ADD COLUMN IF NOT EXISTS reminder_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE`;
  await database.sql`CREATE TABLE IF NOT EXISTS commercial_reminder_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commercial_client_id UUID NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL, record_id UUID, threshold_days INTEGER NOT NULL, expiry_date DATE NOT NULL, recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', provider_request_id TEXT, error_message TEXT, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (commercial_client_id, record_type, record_id, threshold_days, expiry_date, recipient_email))`;
}

async function upsertLog(database, companyId, item, threshold, recipient, status, requestId, errorMessage) {
  await database.sql`INSERT INTO commercial_reminder_log (commercial_client_id,record_type,record_id,threshold_days,expiry_date,recipient_email,status,provider_request_id,error_message,sent_at)
    VALUES (${companyId},${item.type},${item.id},${threshold},${item.expiryDate},${recipient},${status},${requestId},${errorMessage},${status === 'Sent' ? new Date().toISOString() : null})
    ON CONFLICT (commercial_client_id,record_type,record_id,threshold_days,expiry_date,recipient_email)
    DO UPDATE SET status=EXCLUDED.status, provider_request_id=EXCLUDED.provider_request_id, error_message=EXCLUDED.error_message, sent_at=EXCLUDED.sent_at`;
}

function buildEmailHtml(companyName, threshold, items) {
  const rows = items.map((item) => `<tr><td style="padding:10px;border-bottom:1px solid #d9e6e1"><strong>${escapeHtml(item.label)}</strong><br><span style="color:#607b76">${escapeHtml(item.detail)}</span></td><td style="padding:10px;border-bottom:1px solid #d9e6e1;white-space:nowrap">${formatNzDate(item.expiryDate)}</td></tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#294c48;line-height:1.5"><h2 style="color:#003f3a">Employer Portal compliance reminder</h2><p>The following record${items.length === 1 ? ' is' : 's are'} due to expire in ${threshold} days for <strong>${escapeHtml(companyName)}</strong>.</p><table style="width:100%;border-collapse:collapse;border:1px solid #d9e6e1"><thead><tr style="background:#f4fbf8"><th style="padding:10px;text-align:left">Record</th><th style="padding:10px;text-align:left">Expiry date</th></tr></thead><tbody>${rows}</tbody></table><p>Please review the Employer Portal and contact Turner Hopkins if advice or action is required.</p><p style="font-size:12px;color:#657d79">This automated reminder supports compliance administration but does not replace the employer's own monitoring obligations.</p></div>`;
}

function requireMicrosoftEmailConfig() {
  const tenantId=String(process.env.MICROSOFT_TENANT_ID||'').trim(); const clientId=String(process.env.MICROSOFT_CLIENT_ID||'').trim(); const clientSecret=String(process.env.MICROSOFT_CLIENT_SECRET||'').trim();
  const fromEmail=String(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL||'THiS@turnerhopkins.co.nz').trim(); const fromName=String(process.env.MICROSOFT_NOTIFICATION_FROM_NAME||'Turner Hopkins Immigration Specialists').trim();
  const missing=[]; if(!tenantId)missing.push('MICROSOFT_TENANT_ID'); if(!clientId)missing.push('MICROSOFT_CLIENT_ID'); if(!clientSecret)missing.push('MICROSOFT_CLIENT_SECRET'); if(!fromEmail)missing.push('MICROSOFT_NOTIFICATION_FROM_EMAIL');
  if(missing.length)throw new Error(`Missing Microsoft email environment variables: ${missing.join(', ')}`); return {tenantId,clientId,clientSecret,fromEmail,fromName};
}
async function getMicrosoftGraphAccessToken(config){const response=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'})});const payload=await response.json().catch(()=>({}));if(!response.ok||!payload.access_token)throw new Error(payload.error_description||payload.error||`Microsoft token request failed with status ${response.status}`);return payload.access_token;}
async function sendMicrosoftGraphEmail({config,token,toEmail,ccEmail='',subject,bodyHtml}){const message={subject,body:{contentType:'HTML',content:bodyHtml},toRecipients:recipientList(toEmail)};const cc=recipientList(ccEmail);if(cc.length)message.ccRecipients=cc;const response=await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json',prefer:'outlook.timezone="Pacific/Auckland"'},body:JSON.stringify({message,saveToSentItems:true})});const text=await response.text();if(!response.ok){let detail=text;try{detail=JSON.parse(text)?.error?.message||text}catch{}throw new Error(detail||`Microsoft Graph sendMail failed with status ${response.status}`)}return{requestId:response.headers.get('request-id')||''};}
function recipientList(value){return uniqueEmails(String(value||'').split(/[;,]/)).map((address)=>({emailAddress:{address}}));}
function uniqueEmails(values){return [...new Set((values||[]).map((value)=>String(value||'').trim().toLowerCase()).filter((value)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))];}
function aucklandDate(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const values=Object.fromEntries(parts.map((p)=>[p.type,p.value]));return `${values.year}-${values.month}-${values.day}`;}
function daysBetween(from,to){if(!from||!to)return null;return Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000);}
function dateOnly(value){if(!value)return'';return String(value).slice(0,10);}
function formatNzDate(value){if(!value)return'';const [y,m,d]=String(value).slice(0,10).split('-').map(Number);return new Intl.DateTimeFormat('en-NZ',{day:'numeric',month:'long',year:'numeric'}).format(new Date(Date.UTC(y,m-1,d)));}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
