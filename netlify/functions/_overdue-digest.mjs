import crypto from 'node:crypto';

export const DIGEST_SCHEMA = `CREATE TABLE IF NOT EXISTS daily_overdue_digest_log (
  report_date DATE NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Sending','Sent','Failed','Unknown')),
  overdue_count INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 1,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  provider_request_id TEXT,
  error_message TEXT,
  PRIMARY KEY (report_date, recipient_email)
)`;
const STATUSES = ['Adviser action required','Client action required','Waiting on INZ','Waiting on third party','Ready to progress','No current action','Completed'];
export function nzClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour),minute:Number(parts.minute)};
}
export function isDigestTime(now = new Date()) { return nzClock(now).hour === 15; }
export function digestEnabled(env = process.env) { return env.OVERDUE_DIGEST_ENABLED !== 'false'; }
export function signature(body, secret) { return crypto.createHmac('sha256',secret).update('THiS-overdue-digest-v1\n'+body).digest('hex'); }
export function verifyDispatch(body, signed, secret, now = new Date()) {
  if(!secret || !/^[a-f0-9]{64}$/.test(signed||''))return false;
  const expected=signature(body,secret);
  if(!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signed,'hex')))return false;
  try { const msg=JSON.parse(body),stamp=Number(msg.issuedAt);return Number.isFinite(stamp)&&Math.abs(now.getTime()-stamp)<=300000&&msg.reportDate===nzClock(now).date&&isDigestTime(now); } catch { return false; }
}
function dateOnly(value) {
  const s=value instanceof Date?value.toISOString().slice(0,10):String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?s:'';
}
function normaliseStatus(row) {
  if(row.client_status==='Closed')return 'Completed';
  const status=String(row.matter_status||'').trim(),hasAction=Boolean(String(row.next_action||'').trim());
  if(status==='No current action'&&hasAction)return 'Adviser action required';
  return STATUSES.includes(status)?status:hasAction?'Adviser action required':'No current action';
}
export function overdueFiles(individuals=[],commercial=[],advisers=[],today=nzClock().date) {
  const names=new Map(advisers.map(a=>[a.id,a.name||'Unnamed adviser']));
  return [...individuals.map(row=>({...row,kind:'Client'})),...commercial.map(row=>({...row,kind:'Employer'}))].flatMap(row=>{
    const status=normaliseStatus(row);
    if(status==='Completed')return [];
    const waiting=status==='Client action required'||status.startsWith('Waiting');
    const due=dateOnly(waiting?(row.matter_review_date||row.next_action_due):(row.next_action_due||row.matter_review_date));
    if(!due||due>=today)return [];
    return [{id:row.id,kind:row.kind,name:row.kind==='Employer'?(row.trading_name||row.legal_name||'Unnamed employer'):[row.first_name,row.last_name].filter(Boolean).join(' ')||'Unnamed client',matter:row.matter_name||row.case_type||'Matter',action:String(row.next_action||'').trim()||'Review file and set next action',status,review:waiting,due,days:Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(due+'T00:00:00Z'))/86400000),adviser:row.primary_adviser_id?(names.get(row.primary_adviser_id)||'Unrecognised adviser'):'Unassigned',adviserId:row.primary_adviser_id||''}];
  }).sort((a,b)=>a.adviser.localeCompare(b.adviser)||a.adviserId.localeCompare(b.adviserId)||a.due.localeCompare(b.due)||a.name.localeCompare(b.name));
}
export function digestRecipients(advisers=[]) {
  return [...new Set(advisers.filter(a=>a.active===true).map(a=>String(a.email||'').trim().toLowerCase()).filter(e=>/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(e)))];
}
export function escapeHtml(value) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function displayDate(date) { return new Intl.DateTimeFormat('en-NZ',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')); }
export function buildDigest({files=[],date,crmUrl=''}) {
  const groups=new Map();for(const f of files){const key=f.adviser+'\n'+f.adviserId;if(!groups.has(key))groups.set(key,{name:f.adviser,files:[]});groups.get(key).files.push(f);}
  const subject=`THiS daily overdue files — ${files.length} overdue — ${displayDate(date)}`;
  const intro=`Full team report · ${displayDate(date)} · 3pm New Zealand time`;
  const text=['THiS — Daily overdue files',intro,'',`${files.length} overdue file${files.length===1?'':'s'}.`,'Overdue means the next action or waiting-file review date is before today. Files due today, completed files, personal tasks and document expiry reminders are excluded.',''];
  const sections=[...groups.values()].map(group=>{
    text.push(`${group.name} (${group.files.length})`);group.files.forEach(f=>text.push(`${f.name} | ${f.kind} | ${f.matter}\n${f.review?'Review':'Action'}: ${f.action}\n${f.status} | Due ${displayDate(f.due)} | ${f.days} day${f.days===1?'':'s'} overdue`));text.push('');
    return `<section><h2 style="font-size:18px;margin:28px 0 12px;color:#123e38">${escapeHtml(group.name)} <span style="font-size:14px;color:#536862">(${group.files.length})</span></h2>${group.files.map(f=>`<div style="padding:16px;margin-bottom:10px;border:1px solid #d5e3df;border-radius:8px;background:#fff"><strong style="font-size:16px;color:#153a35">${escapeHtml(f.name)}</strong><div style="color:#536862;font-size:13px;margin:4px 0 10px">${escapeHtml(f.kind)} · ${escapeHtml(f.matter)}</div><div>${f.review?'Review':'Next action'}: ${escapeHtml(f.action)}</div><div style="font-size:13px;margin-top:8px;color:#536862">${escapeHtml(f.status)} · Due ${displayDate(f.due)} · <strong style="color:#a83e22">${f.days} day${f.days===1?'':'s'} overdue</strong></div></div>`).join('')}</section>`;
  }).join('');
  if(!files.length)text.push('No overdue files across the team.');
  if(crmUrl)text.push('Open My Work: '+crmUrl);
  text.push('This is a snapshot at the time of the daily run. Update the action or review date in My Work after dealing with the file.');
  const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f2f6f4;font-family:Arial,sans-serif;color:#243e39;line-height:1.5"><div style="max-width:720px;margin:auto;padding:24px 16px"><header style="background:#003d38;color:#fff;padding:24px;border-radius:10px"><div style="font-size:13px;letter-spacing:1px">THiS · TURNER HOPKINS IMMIGRATION</div><h1 style="font-size:26px;margin:10px 0">Daily overdue files</h1><div>${escapeHtml(intro)}</div></header><p style="font-size:20px"><strong>${files.length}</strong> overdue file${files.length===1?'':'s'}</p><p style="font-size:13px;color:#536862">Actions and waiting-file reviews dated before today. Today’s files, completed files, personal tasks and document expiry reminders are excluded.</p>${files.length?sections:'<div style="padding:24px;border:1px solid #bddacf;border-radius:8px;background:#fff"><strong>No overdue files across the team.</strong></div>'}${crmUrl?`<p style="margin:24px 0"><a href="${escapeHtml(crmUrl)}" style="display:inline-block;background:#00594e;color:#fff;padding:12px 20px;border-radius:7px;text-decoration:none;font-weight:bold">Open My Work</a></p>`:''}<footer style="font-size:12px;color:#536862;border-top:1px solid #d5e3df;padding-top:16px">Internal team report. This is a snapshot at the time of the daily run. Update the action or review date in My Work after dealing with the file.</footer></div></body></html>`;
  return {subject,text:text.join('\n'),html};
}
export function emailConfig(env=process.env) {
  const tenantId=String(env.MICROSOFT_TENANT_ID||'').trim(),clientId=String(env.MICROSOFT_CLIENT_ID||'').trim(),clientSecret=String(env.MICROSOFT_CLIENT_SECRET||'').trim(),fromEmail=String(env.MICROSOFT_NOTIFICATION_FROM_EMAIL||'THiS@turnerhopkins.co.nz').trim();
  if(!tenantId||!clientId||!clientSecret||!fromEmail)throw Error('Daily overdue digest: Microsoft email configuration is incomplete.');return {tenantId,clientId,clientSecret,fromEmail};
}
export async function accessToken(config) {
  const r=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}),signal:AbortSignal.timeout(15000)});
  const data=await r.json().catch(()=>({}));if(!r.ok||!data.access_token)throw Error('Daily overdue digest: Microsoft token request failed.');return data.access_token;
}
export async function graphSend({config,token,email,message}) {
  let r;try { r=await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({message:{subject:message.subject,body:{contentType:'HTML',content:message.html},toRecipients:[{emailAddress:{address:email}}]},saveToSentItems:true}),signal:AbortSignal.timeout(20000)}); } catch { throw Object.assign(Error('Mail request outcome is uncertain; check Sent Items before retrying.'),{uncertain:true}); }
  if(r.status!==202)throw Object.assign(Error(`Microsoft mail request returned HTTP ${r.status}.`),{uncertain:r.status>=500||r.ok});
  return {requestId:r.headers.get('request-id')||''};
}
export async function runDailyDigest({database,now=new Date(),sendMail,crmUrl=''}) {
  const clock=nzClock(now);if(!isDigestTime(now))return {skipped:'Outside 3pm NZ window'};
  // Same additive DDL as the migration: safe on existing sites before their first run.
  await database.sql`CREATE TABLE IF NOT EXISTS daily_overdue_digest_log (
  report_date DATE NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Sending','Sent','Failed','Unknown')),
  overdue_count INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 1,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  provider_request_id TEXT,
  error_message TEXT,
  PRIMARY KEY (report_date, recipient_email)
)`;
  const [advisers,clients,commercial]=await Promise.all([
    database.sql`SELECT id,name,email,active FROM advisers ORDER BY name,id`,
    database.sql`SELECT id,first_name,last_name,matter_name,case_type,primary_adviser_id,client_status,matter_status,next_action,next_action_due,matter_review_date FROM clients WHERE client_status <> 'Closed'`,
    database.sql`SELECT id,legal_name,trading_name,matter_name,case_type,primary_adviser_id,client_status,matter_status,next_action,next_action_due,matter_review_date FROM commercial_clients WHERE client_status <> 'Closed'`,
  ]);
  const files=overdueFiles(clients,commercial,advisers,clock.date),recipients=digestRecipients(advisers),message=buildDigest({files,date:clock.date,crmUrl});
  const result={date:clock.date,overdue:files.length,recipients:recipients.length,accepted:0,skipped:0,failed:0,unknown:0,invalidActiveEmails:advisers.filter(a=>a.active===true&&!digestRecipients([a]).length).length};
  // Three in flight keeps large teams comfortably within the background runtime.
  let index=0;await Promise.all(Array.from({length:Math.min(3,recipients.length)},async()=>{while(index<recipients.length){const email=recipients[index++];
    const claim=await database.sql`INSERT INTO daily_overdue_digest_log (report_date,recipient_email,status,overdue_count) VALUES (${clock.date},${email},'Sending',${files.length})
      ON CONFLICT (report_date,recipient_email) DO UPDATE SET status='Sending',overdue_count=EXCLUDED.overdue_count,attempts=daily_overdue_digest_log.attempts+1,claimed_at=NOW(),error_message=NULL
      WHERE daily_overdue_digest_log.status='Failed' RETURNING recipient_email`;
    if(!claim.length){result.skipped++;continue;}
    try {
      const sent=await sendMail({email,message});
      await database.sql`UPDATE daily_overdue_digest_log SET status='Sent',sent_at=NOW(),provider_request_id=${sent?.requestId||''},error_message=NULL WHERE report_date=${clock.date} AND recipient_email=${email}`;
      result.accepted++;
    } catch(error) {
      // A timeout, an uncertain provider response, or a log-write error after acceptance
      // must never trigger an automatic duplicate. Known explicit rejections can retry.
      const status=error.uncertain===false?'Failed':'Unknown';
      await database.sql`UPDATE daily_overdue_digest_log SET status=${status},error_message=${String(error.message||error).slice(0,1000)} WHERE report_date=${clock.date} AND recipient_email=${email}`;
      if(status==='Failed')result.failed++;else result.unknown++;
    }
  }}));
  return result;
}
