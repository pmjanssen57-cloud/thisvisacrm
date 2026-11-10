import { dispatchReminders } from './_seminar-reminders.mjs';

export default async function seminarReminderScheduler() {
  if(process.env.SEMINAR_REMINDERS_ENABLED==='false')return new Response(null,{status:204});
  if(!process.env.MICROSOFT_CLIENT_SECRET)return new Response(null,{status:204});
  if(!await dispatchReminders())throw Error('Seminar reminder dispatch was not accepted. The next scheduled tick can retry safely.');
  return new Response(null,{status:204});
}
