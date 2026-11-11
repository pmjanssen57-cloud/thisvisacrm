import crypto from 'node:crypto';
import { emailConfig, accessToken, graphSend, escapeHtml } from './_overdue-digest.mjs';

const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const dateOnly = value => value instanceof Date ? value.toISOString().slice(0,10) : String(value || '').slice(0,10);
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const leadOptions = [60,120,1440,2880,10080];

export function eventInstant(s) {
  const date=dateOnly(s.seminar_date),time=String(s.seminar_time||'').trim(),zone=s.timezone||'Pacific/Auckland';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Save a valid seminar date and time in Setup first.');
  const [y,m,d]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  if(new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==date)throw Error('The seminar date is invalid.');
  let formatter;try{formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});}catch{throw Error('Choose a valid reference timezone in Seminar setup.');}
  const parts=at=>Object.fromEntries(formatter.formatToParts(new Date(at)).map(p=>[p.type,p.value]));
  const wall=Date.UTC(y,m-1,d,hour,minute);let instant=wall;
  for(let i=0;i<4;i++){const p=parts(instant),local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);instant=wall-(local-instant);}
  const matches=at=>{const p=parts(at);return `${p.year}-${p.month}-${p.day}`===date&&`${p.hour}:${p.minute}`===time;};
  if(!matches(instant)||matches(instant-3600000)||matches(instant+3600000))throw Error('This seminar time falls in a daylight-saving change. Choose an unambiguous time in Setup.');
  return new Date(instant);
}
export function formatTime(at,zone) {
  try{return new Intl.DateTimeFormat('en-NZ',{timeZone:zone,weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(at));}catch{return '';}
}
export function eventDetails(s,now=new Date()) {
  if(s.status!=='Active')throw Error('This seminar is closed. Reopen it in Setup before sending reminders.');
  const at=eventInstant(s);if(at<=now)throw Error('This seminar has already started. Reminders can only be sent before the event.');
  let link;try{link=new URL(s.zoom_link);}catch{throw Error('Save the joining link in Seminar setup first.');}
  if(link.protocol!=='https:')throw Error('The seminar joining link must start with https://.');
  const data={title:s.title||'Turner Hopkins immigration seminar',eventAt:at.toISOString(),timezone:s.timezone||'Pacific/Auckland',presenter:s.presenter_name||'',link:link.href,password:s.zoom_password||''};
  return {...data,eventHash:hash(data),nzTime:formatTime(at,'Pacific/Auckland'),referenceTime:formatTime(at,data.timezone)};
}
export function recipients(rows) {
  const approved=rows.filter(r=>r.status==='Approved'),seen=new Set(),items=[];let invalid=0,duplicates=0;
  for(const r of approved){const email=String(r.email||'').trim().toLowerCase();if(!validEmail(email)){invalid++;continue;}if(seen.has(email)){duplicates++;continue;}seen.add(email);items.push({id:r.id,email,fullName:r.full_name||'',timezone:r.timezone||''});}
  return {items,approved:approved.length,invalid,duplicates};
}
export function buildReminder(person,details,note='',subject='') {
  const first=String(person.fullName||'there').trim().split(/\s+/)[0]||'there';
  const local=formatTime(details.eventAt,person.timezone);
  const lines=[`Hi ${first},`,'','A quick reminder about your upcoming Turner Hopkins immigration seminar.','',`Seminar: ${details.title}`,details.presenter?`Presenter: ${details.presenter}`:'',`New Zealand time: ${details.nzTime}`,details.timezone!=='Pacific/Auckland'?`Event reference time: ${details.referenceTime}`:'',local?`Your local time: ${local}`:'',`Joining link: ${details.link}`,details.password?`Password: ${details.password}`:''].filter(line=>line!=='');
  const beforeNote=lines[0]+'\n\n'+lines.slice(1).join('\n');
  const afterNote='Please join a few minutes early. We look forward to seeing you.\n\nKind regards,\nTurner Hopkins Immigration Specialists';
  const bodyText=[beforeNote,String(note||'').trim(),afterNote].filter(Boolean).join('\n\n');
  const safe=escapeHtml(bodyText).replace(/https:\/\/[^\s<]+/g,url=>`<a href="${url}" style="color:#00594f">${url}</a>`).replace(/\n/g,'<br>');
  return {subject:String(subject||`Reminder: ${details.title}`).replace(/[\r\n]+/g,' ').trim().slice(0,240),bodyText,html:`<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#173b39">${safe}</div>`,beforeNote,afterNote};
}
export function dispatchSignature(body,secret) {return crypto.createHmac('sha256',secret).update('THiS-seminar-reminders-v1\n'+body).digest('hex');}
export function verifyDispatch(body,signed,secret,now=Date.now()) {
  if(!secret||!/^[a-f0-9]{64}$/.test(signed||''))return false;
  if(!crypto.timingSafeEqual(Buffer.from(dispatchSignature(body,secret),'hex'),Buffer.from(signed,'hex')))return false;
  try{const m=JSON.parse(body);return Number.isFinite(m.issuedAt)&&Math.abs(now-m.issuedAt)<300000&&(!m.jobId||uuid(m.jobId));}catch{return false;}
}
export async function dispatchReminders(jobId='') {
  const secret=process.env.MICROSOFT_CLIENT_SECRET;if(!secret)return false;
  let base;try{base=new URL(process.env.URL||'');if(base.protocol!=='https:')return false;}catch{return false;}
  const body=JSON.stringify({issuedAt:Date.now(),...(jobId?{jobId}:{})});
  try{const response=await fetch(new URL('/.netlify/functions/seminar-reminders-background',base),{method:'POST',headers:{'content-type':'application/json','x-this-seminar-signature':dispatchSignature(body,secret)},body,signal:AbortSignal.timeout(8000)});return response.status===202;}catch{return false;}
}
export async function ensureSeminarReminderSchema(database) {
  await database.sql`CREATE TABLE IF NOT EXISTS seminar_reminder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  request_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  due_at TIMESTAMPTZ NOT NULL,
  event_at TIMESTAMPTZ NOT NULL,
  event_hash TEXT NOT NULL,
  subject TEXT NOT NULL,
  extra_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  seeded_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_reminder_jobs_due ON seminar_reminder_jobs(status, due_at)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_reminder_jobs_seminar ON seminar_reminder_jobs(seminar_id, created_at DESC)`;
  await database.sql`CREATE TABLE IF NOT EXISTS seminar_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES seminar_reminder_jobs(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES seminar_registrations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  email_log_id UUID,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  provider_request_id TEXT NOT NULL DEFAULT '',
  UNIQUE(job_id, email)
)`;
}


async function readSeminar(database,id) {
  if(!uuid(id))throw Error('Choose a saved seminar first.');
  const [s]=await database.sql`SELECT * FROM seminars WHERE id=${id} LIMIT 1`;if(!s)throw Error('Seminar not found.');return s;
}
async function approvedRows(database,id) {return database.sql`SELECT * FROM seminar_registrations WHERE seminar_id=${id} AND status='Approved' ORDER BY created_at DESC, id`;}
export async function reminderPreview(database,id,now=new Date()) {
  const seminar=await readSeminar(database,id),details=eventDetails(seminar,now),group=recipients(await approvedRows(database,id));
  return {seminarId:id,details,recipients:group.items,approvedCount:group.approved,invalidCount:group.invalid,duplicateCount:group.duplicates,previewToken:hash({event:details.eventHash,people:group.items}),message:buildReminder(group.items[0]||{fullName:'[First name]',timezone:'Pacific/Auckland'},details)};
}
export async function reminderJobs(database,id) {
  return database.sql`SELECT j.*, COUNT(d.id)::int AS total, COUNT(d.id) FILTER(WHERE d.status='Sent')::int AS sent,
    COUNT(d.id) FILTER(WHERE d.status='Failed')::int AS failed, COUNT(d.id) FILTER(WHERE d.status='Unknown')::int AS unknown,
    COUNT(d.id) FILTER(WHERE d.status='Skipped')::int AS skipped, COUNT(d.id) FILTER(WHERE d.status IN ('Pending','Sending'))::int AS remaining
    FROM seminar_reminder_jobs j LEFT JOIN seminar_reminder_deliveries d ON d.job_id=j.id
    WHERE j.seminar_id=${id} GROUP BY j.id ORDER BY j.created_at DESC LIMIT 20`;
}
export async function seminarOperations(database,input,actor='',now=new Date()) {
  await ensureSeminarReminderSchema(database);
  const id=input.seminarId;await readSeminar(database,id);
  if(input.operation==='jobs')return {jobs:await reminderJobs(database,id)};
  if(input.operation==='preview')return {preview:await reminderPreview(database,id,now)};
  if(['create','retryFailed'].includes(input.operation)&&process.env.SEMINAR_REMINDERS_ENABLED==='false')throw Error('Seminar reminders are currently disabled.');
  if(input.operation==='create'){
    if(!uuid(input.requestKey))throw Error('Reopen the reminder preview before sending.');
    const [prior]=await database.sql`SELECT * FROM seminar_reminder_jobs WHERE request_key=${input.requestKey}`;
    if(prior){if(prior.seminar_id!==id)throw Error('Reminder request does not match this seminar.');return {job:prior,jobs:await reminderJobs(database,id),reused:true};}
    const preview=await reminderPreview(database,id,now);
    if(input.previewToken!==preview.previewToken)throw Error('Seminar details or approved recipients changed. Reload the preview and review them again.');
    if(!['now','scheduled'].includes(input.mode))throw Error('Choose Send now or Schedule.');
    const lead=Number(input.leadMinutes),due=input.mode==='now'?now:new Date(Date.parse(preview.details.eventAt)-lead*60000);
    if(input.mode==='scheduled'&&!leadOptions.includes(lead))throw Error('Choose a supported reminder time.');
    if(!Number.isFinite(due.getTime())||due<now||due>=new Date(preview.details.eventAt))throw Error('That reminder time has passed. Choose a shorter lead time or Send now.');
    if(input.mode==='now'&&!preview.recipients.length)throw Error('There are no approved registrations with valid email addresses to remind.');
    // Validate configuration before creating work, but do not send from this request.
    try{emailConfig();}catch{throw Error('Microsoft email is not configured. Check CRM email settings before creating reminders.');}
    const subject=String(input.subject??preview.message.subject).replace(/[\r\n]+/g,' ').trim(),note=String(input.note||'').trim();if(!subject||subject.length>240)throw Error('Add an email subject of up to 240 characters.');if(note.length>4000)throw Error('Keep the extra message within 4,000 characters.');
    const [job]=await database.sql`INSERT INTO seminar_reminder_jobs(seminar_id,request_key,status,due_at,event_at,event_hash,subject,extra_note,created_by)
      VALUES(${id},${input.requestKey},${input.mode==='now'?'Queued':'Scheduled'},${due.toISOString()},${preview.details.eventAt},${preview.details.eventHash},${subject},${note},${actor})
      ON CONFLICT(request_key) DO UPDATE SET request_key=EXCLUDED.request_key RETURNING *`;
    return {job,jobs:await reminderJobs(database,id)};
  }
  if(input.operation==='cancel'){
    if(!uuid(input.jobId))throw Error('Choose a valid reminder.');
    await database.sql`WITH cancelled AS (UPDATE seminar_reminder_jobs SET status='Cancelled',cancelled_at=NOW(),updated_at=NOW()
      WHERE id=${input.jobId} AND seminar_id=${id} AND status IN ('Scheduled','Queued','Sending','Needs review') RETURNING id)
      UPDATE seminar_reminder_deliveries SET status='Skipped',error_message='Reminder cancelled' WHERE job_id IN(SELECT id FROM cancelled) AND status='Pending'`;
    return {jobs:await reminderJobs(database,id)};
  }
  if(input.operation==='retryFailed'){
    const preview=await reminderPreview(database,id,now);
    if(!uuid(input.jobId))throw Error('Choose a valid reminder.');
    const changed=await database.sql`WITH eligible AS (UPDATE seminar_reminder_jobs SET status='Queued',due_at=NOW(),updated_at=NOW(),error_message=''
      WHERE id=${input.jobId} AND seminar_id=${id} AND status='Completed with errors' AND event_hash=${preview.details.eventHash} AND EXISTS(SELECT 1 FROM seminar_reminder_deliveries d WHERE d.job_id=seminar_reminder_jobs.id AND d.status='Failed') RETURNING id)
      UPDATE seminar_reminder_deliveries SET status='Pending',claimed_at=NULL,error_message='' WHERE job_id IN(SELECT id FROM eligible) AND status='Failed' RETURNING job_id`;
    if(!changed.length)throw Error('No failed emails can be retried in this batch. Reload its status; changed event details need a new reminder.');
    return {job:{id:changed[0].job_id},jobs:await reminderJobs(database,id)};
  }
  if(input.operation==='archive'){
    const rows=await database.sql`WITH closed AS (UPDATE seminars SET status='Closed',registration_open=FALSE,updated_at=NOW() WHERE id=${id} RETURNING *),
      cancelled AS (UPDATE seminar_reminder_jobs SET status='Cancelled',cancelled_at=NOW(),updated_at=NOW()
        WHERE seminar_id IN(SELECT id FROM closed) AND status IN ('Scheduled','Queued','Sending','Needs review') RETURNING id),
      stopped AS (UPDATE seminar_reminder_deliveries SET status='Skipped',error_message='Seminar closed' WHERE job_id IN(SELECT id FROM cancelled) AND status='Pending'),
      archived AS (UPDATE seminar_registrations SET status='Archived',reviewed_by=${actor},updated_at=NOW(),
        raw_payload=COALESCE(raw_payload,'{}'::jsonb)||jsonb_build_object('seminarArchive',jsonb_build_object('previousStatus','Approved','archivedAt',NOW(),'archivedBy',${actor}::text))
        WHERE seminar_id IN(SELECT id FROM closed) AND status='Approved' RETURNING *)
      SELECT (SELECT row_to_json(c) FROM closed c) AS seminar, COALESCE((SELECT json_agg(a) FROM archived a),'[]'::json) AS registrations`;
    return {seminar:rows[0]?.seminar,registrations:rows[0]?.registrations||[],jobs:await reminderJobs(database,id)};
  }
  throw Error('Unknown seminar action.');
}

export async function runReminderBatch({database,sendMail,jobId='',now=new Date(),limit=20,fromEmail='',fromName='Turner Hopkins Immigration Specialists'}) {
  await ensureSeminarReminderSchema(database);
  // A terminated worker's in-flight requests are uncertain, never auto-resend.
  await database.sql`WITH stale AS (UPDATE seminar_reminder_jobs SET status='Queued',updated_at=NOW()
    WHERE status='Sending' AND claimed_at<${new Date(now.getTime()-20*60000).toISOString()} RETURNING id),
    uncertain AS (UPDATE seminar_reminder_deliveries SET status='Unknown',error_message='Worker interrupted; check Microsoft Sent Items before any resend.'
      WHERE job_id IN(SELECT id FROM stale) AND status='Sending' RETURNING email_log_id)
    UPDATE email_notifications SET status='Unknown',failure_message='Seminar worker interrupted; check Sent Items.',updated_at=NOW() WHERE id IN(SELECT email_log_id FROM uncertain)`;
  const [job]=await database.sql`UPDATE seminar_reminder_jobs SET status='Sending',claimed_at=NOW(),error_message='',updated_at=NOW()
    WHERE id=(SELECT id FROM seminar_reminder_jobs WHERE status IN ('Scheduled','Queued') AND due_at<=${now.toISOString()}
      AND (${jobId}='' OR id::text=${jobId}) ORDER BY due_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`;
  if(!job)return {idle:true};
  let details;
  try{const s=await readSeminar(database,job.seminar_id);details=eventDetails(s,now);if(details.eventHash!==job.event_hash)throw Error('Seminar details changed. Cancel this reminder and create a fresh preview.');}
  catch(e){const status=new Date(job.event_at)<=now?'Expired':'Needs review';await database.sql`UPDATE seminar_reminder_jobs SET status=${status},error_message=${e.message},updated_at=NOW() WHERE id=${job.id} AND status='Sending'`;return {jobId:job.id,status};}
  // Freeze the approved cohort when sending starts, including later approvals.
  await database.sql`WITH seeded AS (UPDATE seminar_reminder_jobs SET seeded_at=NOW() WHERE id=${job.id} AND seeded_at IS NULL AND status='Sending' RETURNING id)
    INSERT INTO seminar_reminder_deliveries(job_id,registration_id,email)
    SELECT DISTINCT ON(LOWER(BTRIM(r.email))) seeded.id,r.id,LOWER(BTRIM(r.email)) FROM seminar_registrations r CROSS JOIN seeded
    WHERE r.seminar_id=${job.seminar_id} AND r.status='Approved' AND BTRIM(r.email) ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    ORDER BY LOWER(BTRIM(r.email)),r.created_at DESC,r.id ON CONFLICT(job_id,email) DO NOTHING`;
  const pending=await database.sql`SELECT * FROM seminar_reminder_deliveries WHERE job_id=${job.id} AND status='Pending' ORDER BY id LIMIT ${Math.min(20,Math.max(1,limit))}`;
  let sent=0,failed=0,unknown=0,skipped=0;
  for(const delivery of pending){
    const [eligible]=await database.sql`SELECT r.* FROM seminar_registrations r JOIN seminars s ON s.id=r.seminar_id JOIN seminar_reminder_jobs j ON j.seminar_id=s.id
      WHERE j.id=${job.id} AND j.status='Sending' AND s.status='Active' AND r.status='Approved' AND LOWER(BTRIM(r.email))=${delivery.email} ORDER BY r.created_at DESC LIMIT 1`;
    if(!eligible||new Date(details.eventAt)<=new Date()){await database.sql`UPDATE seminar_reminder_deliveries SET status='Skipped',error_message='No longer eligible or seminar started' WHERE id=${delivery.id} AND status='Pending'`;skipped++;continue;}
    // Recheck event details before every external send, not only at job start.
    const latest=await readSeminar(database,job.seminar_id);
    try{if(eventDetails(latest,new Date()).eventHash!==job.event_hash)throw Error('Seminar details changed during sending.');}catch(e){await database.sql`UPDATE seminar_reminder_jobs SET status='Needs review',error_message=${e.message},updated_at=NOW() WHERE id=${job.id} AND status='Sending'`;break;}
    const [claimed]=await database.sql`UPDATE seminar_reminder_deliveries SET status='Sending',claimed_at=NOW() WHERE id=${delivery.id} AND status='Pending' RETURNING id`;if(!claimed)continue;
    const person={fullName:eligible.full_name,timezone:eligible.timezone},message=buildReminder(person,details,job.extra_note,job.subject);let logId='',accepted=false;
    try{
      const [log]=await database.sql`INSERT INTO email_notifications(related_record_type,related_record_id,template_key,from_email,from_name,to_email,subject,body_text,body_html,status,sent_by)
        VALUES('seminar_registration',${eligible.id},'seminar_reminder',${fromEmail},${fromName},${delivery.email},${message.subject},${message.bodyText},${message.html},'Sending',${job.created_by}) RETURNING id`;
      logId=log.id;await database.sql`UPDATE seminar_reminder_deliveries SET email_log_id=${logId} WHERE id=${delivery.id}`;
      const result=await sendMail({email:delivery.email,message});accepted=true;
      await database.sql`UPDATE seminar_reminder_deliveries SET status='Sent',sent_at=NOW(),provider_request_id=${result?.requestId||''} WHERE id=${delivery.id}`;
      await database.sql`UPDATE email_notifications SET status='Sent',sent_at=NOW(),provider_request_id=${result?.requestId||''},updated_at=NOW() WHERE id=${logId}`;sent++;
    }catch(e){const uncertain=accepted||e.uncertain,status=uncertain?'Unknown':'Failed';await database.sql`UPDATE seminar_reminder_deliveries SET status=${status},error_message=${String(e.message).slice(0,1000)} WHERE id=${delivery.id}`;if(logId)await database.sql`UPDATE email_notifications SET status=${status},failed_at=NOW(),failure_message=${String(e.message).slice(0,1000)},updated_at=NOW() WHERE id=${logId}`;if(uncertain)unknown++;else failed++;}
  }
  await database.sql`UPDATE seminar_reminder_jobs j SET status=CASE
    WHEN EXISTS(SELECT 1 FROM seminar_reminder_deliveries d WHERE d.job_id=j.id AND d.status='Pending') THEN 'Queued'
    WHEN EXISTS(SELECT 1 FROM seminar_reminder_deliveries d WHERE d.job_id=j.id AND d.status IN ('Failed','Unknown','Sending')) THEN 'Completed with errors'
    ELSE 'Completed' END,completed_at=CASE WHEN NOT EXISTS(SELECT 1 FROM seminar_reminder_deliveries d WHERE d.job_id=j.id AND d.status='Pending') THEN NOW() ELSE NULL END,updated_at=NOW()
    WHERE j.id=${job.id} AND j.status='Sending'`;
  return {jobId:job.id,sent,failed,unknown,skipped};
}

export async function runWithMicrosoft(database,jobId='') {
  await ensureSeminarReminderSchema(database);
  const due=await database.sql`SELECT id FROM seminar_reminder_jobs WHERE ((status IN ('Scheduled','Queued') AND due_at<=NOW()) OR (status='Sending' AND claimed_at<NOW()-INTERVAL '20 minutes')) AND (${jobId}='' OR id::text=${jobId}) LIMIT 1`;
  if(!due.length)return {idle:true};
  const config=emailConfig(),token=await accessToken(config);
  return runReminderBatch({database,jobId,fromEmail:config.fromEmail,fromName:process.env.MICROSOFT_NOTIFICATION_FROM_NAME||'Turner Hopkins Immigration Specialists',sendMail:({email,message})=>graphSend({config,token,email,message})});
}
