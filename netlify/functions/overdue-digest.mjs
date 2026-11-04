import { signature, nzClock, isDigestTime, digestEnabled } from './_overdue-digest.mjs';

// Netlify schedules are UTC. Both hours plus the NZ gate preserve 3pm through DST.
export default async function overdueDigestScheduler() {
  if(!digestEnabled())return new Response(null,{status:204});
  const now=new Date();if(!isDigestTime(now))return new Response(null,{status:204});
  const secret=process.env.MICROSOFT_CLIENT_SECRET;
  if(!secret)throw Error('Daily overdue digest: Microsoft email configuration is incomplete.');
  const base=new URL(process.env.URL||'');
  if(base.protocol!=='https:')throw Error('Daily overdue digest requires an HTTPS deployment URL.');
  const body=JSON.stringify({reportDate:nzClock(now).date,issuedAt:now.getTime()});
  const response=await fetch(new URL('/.netlify/functions/overdue-digest-background',base),{method:'POST',headers:{'content-type':'application/json','x-this-digest-signature':signature(body,secret)},body,signal:AbortSignal.timeout(10000)});
  if(response.status!==202)throw Error(`Daily overdue digest dispatch failed (HTTP ${response.status}).`);
  console.log(JSON.stringify({overdueDigestDispatch:{date:nzClock(now).date,accepted:true}}));
  return new Response(null,{status:204});
}
