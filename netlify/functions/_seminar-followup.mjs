import crypto from 'node:crypto';
import {eventInstant,formatTime,recipients} from './_seminar-reminders.mjs';
import {emailConfig,accessToken,graphSend,escapeHtml} from './_overdue-digest.mjs';

const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
const email=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||''));
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const parse=v=>typeof v==='string'?JSON.parse(v):v;
const disabled=()=>process.env.SEMINAR_REMINDERS_ENABLED==='false'||process.env.SEMINAR_FOLLOWUPS_ENABLED==='false';
export const followupEligible=r=>r.status==='Approved'||r.status==='Archived'&&(parse(r.raw_payload||{})?.seminarArchive?.previousStatus==='Approved');
export function followupSettings(s,overrides={},now=new Date()) {
  const at=eventInstant(s);if(at>now)throw Error('Booking follow-ups are for after the seminar date/time. Use reminders before the event.');
  if(!['Active','Closed'].includes(s.status))throw Error('This seminar is not available for follow-up.');
  const presenterEmail=String(overrides.presenterEmail??s.presenter_email??'').trim();if(!email(presenterEmail))throw Error('Add a valid presenter email address before previewing the invitation.');
  const presenterName=String(overrides.presenterName??s.presenter_name??'').trim().slice(0,200)||'our presenter';
  let bookingUrl=String(overrides.bookingUrl??s.presenter_booking_url??'').trim();
  if(bookingUrl){let url;try{url=new URL(bookingUrl);}catch{throw Error('The booking link must be a full https:// address.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('The booking link must use https:// and contain no login credentials.');bookingUrl=url.href;}
  const eventHash=hash([s.title,at.toISOString(),s.seminar_time,s.timezone,s.presenter_name,s.presenter_email,s.presenter_booking_url]);
  return {title:s.title||'Turner Hopkins seminar',eventAt:at.toISOString(),eventTime:formatTime(at,'Pacific/Auckland'),presenterName,presenterEmail,bookingUrl,eventHash};
}
export function buildFollowup(person,settings,note='',subject='') {
  const first=String(person.fullName||person.full_name||'there').trim().split(/\s+/)[0]||'there';
  const beforeNote=`Hi ${first},\n\nThank you for joining our seminar, ${settings.title}.\n\nIf you would like to discuss your situation and the next steps, we would be happy to arrange a time for you to speak with ${settings.presenterName}.\n\n${settings.bookingUrl?`Book a time: ${settings.bookingUrl}\n\n`:''}You can ${settings.bookingUrl?'also contact':'arrange a time by emailing'} ${settings.presenterName} at ${settings.presenterEmail}.`;
  const afterNote='We look forward to helping you with your next steps.\n\nKind regards,\nTurner Hopkins Immigration Specialists';
  const bodyText=[beforeNote,String(note||'').trim(),afterNote].filter(Boolean).join('\n\n');
  const mailto=`mailto:${encodeURIComponent(settings.presenterEmail)}?subject=${encodeURIComponent('Seminar follow-up: '+settings.title)}`;
  const cta=settings.bookingUrl||mailto;
  const paragraphs=value=>escapeHtml(value).replace(/\n/g,'<br>');
  const html=`<div style="font-family:Arial,sans-serif;color:#173b39;line-height:1.65;max-width:640px;margin:auto"><div style="background:#edf7f1;border-top:5px solid #07594e;padding:24px"><strong style="color:#07594e">TURNER HOPKINS IMMIGRATION SPECIALISTS</strong><h2 style="font-size:24px">Your next steps</h2></div><div style="padding:24px">${paragraphs(beforeNote)}<p style="margin:24px 0"><a href="${escapeHtml(cta)}" style="display:inline-block;padding:12px 20px;background:#07594e;color:white;border-radius:7px;text-decoration:none;font-weight:bold">${settings.bookingUrl?'Book a time':'Arrange a time by email'}</a></p><p><strong>Presenter:</strong> ${escapeHtml(settings.presenterName)}<br><strong>Email:</strong> <a href="${escapeHtml(mailto)}" style="color:#07594e">${escapeHtml(settings.presenterEmail)}</a></p>${note?`<p>${paragraphs(note)}</p>`:''}<p>${paragraphs(afterNote)}</p></div></div>`;
  return {subject:String(subject||`Your next steps after ${settings.title}`).replace(/[\r\n]+/g,' ').trim().slice(0,240),bodyText,html,beforeNote,afterNote};
}

let schemaReady;
export async function ensureFollowupSchema(database) {
  if(!schemaReady)schemaReady=initialiseFollowupSchema(database).catch(error=>{schemaReady=null;throw error;});
  return schemaReady;
}
async function initialiseFollowupSchema(database) {
  await database.sql`ALTER TABLE seminars ADD COLUMN IF NOT EXISTS presenter_email TEXT NOT NULL DEFAULT ''`;
  await database.sql`ALTER TABLE seminars ADD COLUMN IF NOT EXISTS presenter_booking_url TEXT NOT NULL DEFAULT ''`;
  await database.sql`CREATE TABLE IF NOT EXISTS seminar_followup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  request_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Queued',
  event_hash TEXT NOT NULL,
  settings JSONB NOT NULL,
  subject TEXT NOT NULL,
  extra_note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_followup_jobs_status ON seminar_followup_jobs(status,created_at)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_followup_jobs_seminar ON seminar_followup_jobs(seminar_id,created_at DESC)`;
  await database.sql`CREATE TABLE IF NOT EXISTS seminar_followup_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES seminar_followup_jobs(id) ON DELETE CASCADE,
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES seminar_registrations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  email_log_id UUID,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT NOT NULL DEFAULT '',
  UNIQUE(job_id,email)
)`;
  await database.sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_seminar_followup_reserved_email ON seminar_followup_deliveries(seminar_id,email) WHERE status IN ('Pending','Sending','Sent','Failed','Unknown')`;
}
async function seminar(database,id){if(!uuid(id))throw Error('Choose a saved seminar.');const [s]=await database.sql`SELECT * FROM seminars WHERE id=${id}`;if(!s)throw Error('Seminar not found.');return s;}
export async function followupJobs(database,id){return database.sql`SELECT j.*,COUNT(d.id)::int AS total,COUNT(d.id) FILTER(WHERE d.status='Sent')::int AS sent,COUNT(d.id) FILTER(WHERE d.status IN ('Pending','Sending'))::int AS remaining,COUNT(d.id) FILTER(WHERE d.status='Failed')::int AS failed,COUNT(d.id) FILTER(WHERE d.status='Unknown')::int AS unknown,COUNT(d.id) FILTER(WHERE d.status IN ('Cancelled','Skipped'))::int AS skipped FROM seminar_followup_jobs j LEFT JOIN seminar_followup_deliveries d ON d.job_id=j.id WHERE j.seminar_id=${id} GROUP BY j.id ORDER BY j.created_at DESC LIMIT 20`;}
export async function followupPreview(database,input,now=new Date()) {
  const s=await seminar(database,input.seminarId),settings=followupSettings(s,input,now);
  const rows=await database.sql`SELECT * FROM seminar_registrations WHERE seminar_id=${s.id} AND (status='Approved' OR status='Archived' AND raw_payload->'seminarArchive'->>'previousStatus'='Approved') ORDER BY created_at DESC,id`;
  const selected=input.registrationId?rows.filter(r=>r.id===input.registrationId):rows;
  if(input.registrationId&&!selected.length)throw Error('This registration is not an approved seminar attendee.');
  const group=recipients(selected.filter(followupEligible).map(r=>({...r,status:'Approved'})));
  const prior=await database.sql`SELECT email,status FROM seminar_followup_deliveries WHERE seminar_id=${s.id} AND status IN ('Pending','Sending','Sent','Failed','Unknown')`;
  const reserved=new Map(prior.map(r=>[r.email,r.status])),people=group.items.filter(p=>!reserved.has(p.email));
  return {settings,recipients:people,invalidCount:group.invalid,duplicateCount:group.duplicates,alreadySent:group.items.filter(p=>reserved.get(p.email)==='Sent').length,alreadyReserved:group.items.filter(p=>reserved.has(p.email)&&reserved.get(p.email)!=='Sent').length,previewToken:hash({settings,people}),message:buildFollowup(people[0]||{fullName:'[First name]'},settings)};
}
export async function followupOperations(database,input,actor='',now=new Date()) {
  await ensureFollowupSchema(database);const s=await seminar(database,input.seminarId),id=s.id;
  if(input.operation==='followupJobs')return {jobs:await followupJobs(database,id)};
  if(input.operation==='followupPreview')return {preview:await followupPreview(database,input,now)};
  if(input.operation==='followupCancel'){
    if(!uuid(input.jobId))throw Error('Choose an invitation batch.');
    await database.sql`WITH cancelled AS(UPDATE seminar_followup_jobs SET status='Cancelled',updated_at=NOW() WHERE id=${input.jobId} AND seminar_id=${id} AND status IN ('Queued','Sending','Needs review','Completed with errors') RETURNING id), stopped AS(UPDATE seminar_followup_deliveries SET status=CASE WHEN status='Sending' THEN 'Unknown' ELSE 'Cancelled' END,error_message='Invitation cancelled; an in-progress send may have completed. Check Sent Items.' WHERE job_id IN(SELECT id FROM cancelled) AND status IN ('Pending','Failed','Sending') RETURNING email_log_id,status) UPDATE email_notifications SET status='Unknown',failure_message='Invitation cancelled during a send; check Sent Items.',updated_at=NOW() WHERE id IN(SELECT email_log_id FROM stopped WHERE status='Unknown')`;
    return {jobs:await followupJobs(database,id)};
  }
  if(disabled())throw Error('Seminar email sending is currently disabled.');
  if(input.operation==='followupRetry'){
    if(!uuid(input.jobId))throw Error('Choose an invitation batch.');const [job]=await database.sql`SELECT * FROM seminar_followup_jobs WHERE id=${input.jobId} AND seminar_id=${id}`;
    if(!job||job.status!=='Completed with errors')throw Error('Reload this batch before retrying.');
    const settings=followupSettings(s,parse(job.settings),now);if(settings.eventHash!==job.event_hash)throw Error('Seminar details changed. Cancel the remaining emails and prepare a fresh invitation.');
    const changed=await database.sql`WITH retry AS(UPDATE seminar_followup_jobs SET status='Queued',error_message='',updated_at=NOW() WHERE id=${job.id} AND status='Completed with errors' AND EXISTS(SELECT 1 FROM seminar_followup_deliveries d WHERE d.job_id=seminar_followup_jobs.id AND d.status='Failed') RETURNING id) UPDATE seminar_followup_deliveries SET status='Pending',error_message='' WHERE job_id IN(SELECT id FROM retry) AND status='Failed' RETURNING job_id`;
    if(!changed.length)throw Error('There are no definite failures to retry. Sent and uncertain emails are never retried.');return {job:{id:job.id},jobs:await followupJobs(database,id)};
  }
  if(input.operation==='followupQueue'){
    if(!uuid(input.requestKey))throw Error('Prepare the invitation preview again.');
    const [existing]=await database.sql`SELECT * FROM seminar_followup_jobs WHERE request_key=${input.requestKey}`;
    if(existing){if(existing.seminar_id!==id)throw Error('This request belongs to another seminar.');return {job:existing,reused:true,jobs:await followupJobs(database,id)};}
    const p=await followupPreview(database,input,now);if(p.previewToken!==input.previewToken)throw Error('Details or recipients changed. Prepare and review the preview again.');
    const ids=[...new Set(Array.isArray(input.recipientIds)?input.recipientIds:[])];if(!ids.length||ids.some(r=>!p.recipients.some(person=>person.id===r)))throw Error('Choose at least one recipient from this preview.');
    const subject=String(input.subject||p.message.subject).replace(/[\r\n]+/g,' ').trim(),note=String(input.note||'').trim();if(!subject||subject.length>240||note.length>4000)throw Error('Keep the subject within 240 and extra message within 4,000 characters.');
    try{emailConfig();}catch{throw Error('Microsoft email is not configured. Check CRM email settings first.');}
    const people=p.recipients.filter(r=>ids.includes(r.id)).map(r=>({id:r.id,email:r.email,full_name:r.fullName}));
    const [job]=await database.sql`WITH job AS(INSERT INTO seminar_followup_jobs(seminar_id,request_key,event_hash,settings,subject,extra_note,created_by) VALUES(${id},${input.requestKey},${p.settings.eventHash},${JSON.stringify(p.settings)}::jsonb,${subject},${note},${actor}) ON CONFLICT(request_key) DO NOTHING RETURNING *),
      deliveries AS(INSERT INTO seminar_followup_deliveries(job_id,seminar_id,registration_id,email,full_name) SELECT job.id,${id},p.id,p.email,p.full_name FROM job CROSS JOIN jsonb_to_recordset(${JSON.stringify(people)}::jsonb) AS p(id uuid,email text,full_name text) WHERE EXISTS(SELECT 1 FROM seminar_registrations r WHERE r.id=p.id AND r.seminar_id=${id} AND LOWER(BTRIM(r.email))=p.email AND (r.status='Approved' OR r.status='Archived' AND r.raw_payload->'seminarArchive'->>'previousStatus'='Approved')) ON CONFLICT DO NOTHING RETURNING id)
      SELECT job.*,(SELECT COUNT(*)::int FROM deliveries) AS queued_count FROM job`;
    if(!job){const [prior]=await database.sql`SELECT * FROM seminar_followup_jobs WHERE request_key=${input.requestKey}`;return {job:prior,reused:true,jobs:await followupJobs(database,id)};}
    if(!Number(job.queued_count))await database.sql`UPDATE seminar_followup_jobs SET status='Completed',completed_at=NOW(),error_message='No new recipients; invitations were already reserved or eligibility changed.' WHERE id=${job.id}`;
    return {job,jobs:await followupJobs(database,id),queuedCount:Number(job.queued_count)};
  }
  throw Error('Unknown seminar follow-up action.');
}

export async function runFollowupBatch({database,sendMail,jobId='',now=new Date(),fromEmail='',fromName='Turner Hopkins Immigration Specialists',limit=20}) {
  if(disabled())return {disabled:true};await ensureFollowupSchema(database);
  await database.sql`WITH stale AS(UPDATE seminar_followup_jobs SET status='Queued',updated_at=NOW() WHERE status='Sending' AND claimed_at<${new Date(now.getTime()-20*60000).toISOString()} RETURNING id), uncertain AS(UPDATE seminar_followup_deliveries SET status='Unknown',error_message='Worker interrupted; check Microsoft Sent Items before any resend.' WHERE job_id IN(SELECT id FROM stale) AND status='Sending' RETURNING email_log_id) UPDATE email_notifications SET status='Unknown',failure_message='Seminar follow-up interrupted; check Sent Items.',updated_at=NOW() WHERE id IN(SELECT email_log_id FROM uncertain)`;
  const [job]=await database.sql`UPDATE seminar_followup_jobs SET status='Sending',claimed_at=NOW(),error_message='',updated_at=NOW() WHERE id=(SELECT id FROM seminar_followup_jobs WHERE status='Queued' AND (${jobId}='' OR id::text=${jobId}) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`;
  if(!job)return {idle:true};const settings=parse(job.settings);
  const valid=async()=>{const s=await seminar(database,job.seminar_id);if(followupSettings(s,settings,now).eventHash!==job.event_hash)throw Error('Seminar details changed. Cancel remaining invitations and prepare a fresh preview.');};
  try{await valid();}catch(e){await database.sql`UPDATE seminar_followup_jobs SET status='Needs review',error_message=${e.message},updated_at=NOW() WHERE id=${job.id} AND status='Sending'`;return {jobId:job.id,status:'Needs review'};}
  const rows=await database.sql`SELECT * FROM seminar_followup_deliveries WHERE job_id=${job.id} AND status='Pending' ORDER BY id LIMIT ${Math.max(1,Math.min(20,limit))}`;
  let sent=0,failed=0,unknown=0;
  for(const d of rows){
    try{await valid();}catch(e){await database.sql`UPDATE seminar_followup_jobs SET status='Needs review',error_message=${e.message},updated_at=NOW() WHERE id=${job.id} AND status='Sending'`;break;}
    const [eligible]=await database.sql`SELECT r.* FROM seminar_registrations r JOIN seminar_followup_jobs j ON j.seminar_id=r.seminar_id WHERE j.id=${job.id} AND j.status='Sending' AND r.id=${d.registration_id} AND LOWER(BTRIM(r.email))=${d.email} AND (r.status='Approved' OR r.status='Archived' AND r.raw_payload->'seminarArchive'->>'previousStatus'='Approved')`;
    if(!eligible){await database.sql`UPDATE seminar_followup_deliveries SET status='Skipped',error_message='Registration no longer eligible or batch cancelled' WHERE id=${d.id} AND status='Pending'`;continue;}
    const [claim]=await database.sql`UPDATE seminar_followup_deliveries SET status='Sending',claimed_at=NOW() WHERE id=${d.id} AND status='Pending' RETURNING id`;if(!claim)continue;
    const message=buildFollowup({fullName:d.full_name},settings,job.extra_note,job.subject);let logId='',accepted=false;
    try{
      const [log]=await database.sql`INSERT INTO email_notifications(related_record_type,related_record_id,template_key,from_email,from_name,to_email,subject,body_text,body_html,status,sent_by) VALUES('seminar_registration',${d.registration_id},'seminar_booking_followup',${fromEmail},${fromName},${d.email},${message.subject},${message.bodyText},${message.html},'Sending',${job.created_by}) RETURNING id`;
      logId=log.id;await database.sql`UPDATE seminar_followup_deliveries SET email_log_id=${logId} WHERE id=${d.id}`;
      const result=await sendMail({email:d.email,message});accepted=true;
      await database.sql`UPDATE seminar_followup_deliveries SET status='Sent',sent_at=NOW(),error_message='' WHERE id=${d.id}`;
      await database.sql`UPDATE email_notifications SET status='Sent',sent_at=NOW(),provider_request_id=${result?.requestId||''},updated_at=NOW() WHERE id=${logId}`;sent++;
    }catch(e){const status=accepted||e.uncertain?'Unknown':'Failed';await database.sql`UPDATE seminar_followup_deliveries SET status=${status},error_message=${String(e.message).slice(0,1000)} WHERE id=${d.id}`;if(logId)await database.sql`UPDATE email_notifications SET status=${status},failed_at=NOW(),failure_message=${String(e.message).slice(0,1000)},updated_at=NOW() WHERE id=${logId}`;status==='Unknown'?unknown++:failed++;}
  }
  await database.sql`UPDATE seminar_followup_jobs j SET status=CASE WHEN EXISTS(SELECT 1 FROM seminar_followup_deliveries d WHERE d.job_id=j.id AND d.status='Pending') THEN 'Queued' WHEN EXISTS(SELECT 1 FROM seminar_followup_deliveries d WHERE d.job_id=j.id AND d.status IN ('Failed','Unknown','Sending')) THEN 'Completed with errors' ELSE 'Completed' END,completed_at=CASE WHEN NOT EXISTS(SELECT 1 FROM seminar_followup_deliveries d WHERE d.job_id=j.id AND d.status='Pending') THEN NOW() ELSE NULL END,updated_at=NOW() WHERE j.id=${job.id} AND j.status='Sending'`;
  return {jobId:job.id,sent,failed,unknown};
}
export async function runFollowupsWithMicrosoft(database,jobId='') {
  if(disabled())return {disabled:true};await ensureFollowupSchema(database);
  const due=await database.sql`SELECT id FROM seminar_followup_jobs WHERE (status='Queued' OR status='Sending' AND claimed_at<NOW()-INTERVAL '20 minutes') AND (${jobId}='' OR id::text=${jobId}) LIMIT 1`;
  if(!due.length)return {idle:true};const config=emailConfig(),token=await accessToken(config);
  return runFollowupBatch({database,jobId,fromEmail:config.fromEmail,sendMail:({email,message})=>graphSend({config,token,email,message})});
}
