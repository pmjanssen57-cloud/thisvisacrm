import { getDatabase } from '@netlify/database';
import { digestEnabled, verifyDispatch, emailConfig, accessToken, graphSend, runDailyDigest } from './_overdue-digest.mjs';

export default async function overdueDigestWorker(request) {
  if(!digestEnabled())return new Response(null,{status:403});
  if(request.method!=='POST')return new Response(null,{status:405});
  const body=await request.text();
  if(body.length>1000||!verifyDispatch(body,request.headers.get('x-this-digest-signature'),process.env.MICROSOFT_CLIENT_SECRET))return new Response(null,{status:403});
  const config=emailConfig();
  const connectionString=process.env.NETLIFY_DB_URL||process.env.NETLIFY_DATABASE_URL||process.env.DATABASE_URL;
  const database=connectionString?getDatabase({connectionString}):getDatabase();
  // Obtain the token before claiming recipient rows; a token failure is safe to retry.
  const token=await accessToken(config);
  let crmUrl='';try{const url=new URL(process.env.URL||'');if(url.protocol==='https:')crmUrl=url.origin+'/';}catch{}
  const result=await runDailyDigest({database,sendMail:({email,message})=>graphSend({config,token,email,message}),crmUrl});
  console.log(JSON.stringify({dailyOverdueDigest:result}));
  if(result.failed||result.unknown)console.error('Daily overdue digest has failed or uncertain recipients; review daily_overdue_digest_log.');
  return new Response(null,{status:204});
}
