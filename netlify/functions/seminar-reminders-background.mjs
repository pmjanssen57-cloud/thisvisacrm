import {runFollowupsWithMicrosoft,ensureFollowupSchema} from './_seminar-followup.mjs';
import { getDatabase } from '@netlify/database';
import { verifyDispatch, runWithMicrosoft, ensureSeminarReminderSchema } from './_seminar-reminders.mjs';

export default async function seminarReminderWorker(request) {
  if(process.env.SEMINAR_REMINDERS_ENABLED==='false')return new Response(null,{status:403});
  if(request.method!=='POST')return new Response(null,{status:405});
  const body=await request.text();
  if(body.length>1000||!verifyDispatch(body,request.headers.get('x-this-seminar-signature'),process.env.MICROSOFT_CLIENT_SECRET))return new Response(null,{status:403});
  const {jobId=''}=JSON.parse(body),connectionString=process.env.NETLIFY_DB_URL||process.env.NETLIFY_DATABASE_URL||process.env.DATABASE_URL;
  const database=connectionString?getDatabase({connectionString}):getDatabase();
  try {
    const result=await runWithMicrosoft(database,jobId);
    const followups=await runFollowupsWithMicrosoft(database,jobId);
    console.log(JSON.stringify({seminarReminders:result,seminarFollowups:followups}));
  }catch(error){
    // Token/config failures happen before any recipient is claimed; retain the
    // queued batch and show the issue in CRM for the next tick or cancellation.
    await ensureSeminarReminderSchema(database);
    const message=String(error?.message||error).replace(/Daily overdue digest:/g,'Seminar reminders:').slice(0,1000);
    await database.sql`UPDATE seminar_reminder_jobs SET error_message=${message},updated_at=NOW()
      WHERE status IN ('Scheduled','Queued') AND due_at<=NOW() AND (${jobId}='' OR id::text=${jobId})`;
    await ensureFollowupSchema(database);
    await database.sql`UPDATE seminar_followup_jobs SET error_message=${message},updated_at=NOW() WHERE status='Queued' AND (${jobId}='' OR id::text=${jobId})`;
    throw error;
  }
  return new Response(null,{status:204});
}
