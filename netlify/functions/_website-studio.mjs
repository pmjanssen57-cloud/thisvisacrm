import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import seed from './website-seed.json' with {type:'json'};
import {WEBSITE_URL,CRM_ORIGIN,UUID,normaliseArticle,contentError,canonicalJson} from './_website-content.mjs';

const secretStore=()=>getStore({name:'website-studio-connections',consistency:'strong'});
const idValue=value=>{if(!UUID.test(String(value||'')))throw contentError('Choose a valid article.');return String(value);};
const publicRecord=row=>row?{id:row.id,revision:Number(row.revision),draft:row.draft_json,published:row.published_json,publishedRevision:Number(row.published_revision||0),publishedDraftRevision:Number(row.published_draft_revision||0),status:row.status,updatedAt:row.updated_at}:null;

export async function ensureWebsiteSchema(database){
 const result=await database.sql`SELECT to_regclass('public.website_articles') AS articles,to_regclass('public.website_revisions') AS revisions,to_regclass('public.website_deliveries') AS deliveries,to_regclass('public.website_settings') AS settings`;
 if(result[0]?.articles&&result[0]?.revisions&&result[0]?.deliveries&&result[0]?.settings)return;
 // Follow the CRM's existing bounded, additive schema initialization pattern.
 // The matching SQL migration is included for deployment/audit tools.
 await database.sql`CREATE TABLE IF NOT EXISTS website_articles (id uuid PRIMARY KEY,slug text NOT NULL UNIQUE,draft_json jsonb NOT NULL,revision bigint NOT NULL DEFAULT 1,delivery_sequence bigint NOT NULL DEFAULT 0,delivery_pending boolean NOT NULL DEFAULT false,published_json jsonb,published_revision bigint NOT NULL DEFAULT 0,published_draft_revision bigint NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'Draft',updated_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT NOW(),updated_at timestamptz NOT NULL DEFAULT NOW())`;
 await database.sql`CREATE TABLE IF NOT EXISTS website_revisions (article_id uuid NOT NULL REFERENCES website_articles(id),revision bigint NOT NULL,content_json jsonb NOT NULL,created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT NOW(),PRIMARY KEY(article_id,revision))`;
 await database.sql`CREATE TABLE IF NOT EXISTS website_deliveries (id uuid PRIMARY KEY,article_id uuid NOT NULL REFERENCES website_articles(id),action text NOT NULL,delivery_revision bigint NOT NULL,payload_json jsonb NOT NULL,state text NOT NULL DEFAULT 'Pending',attempt_id uuid,message text NOT NULL DEFAULT '',created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT NOW(),updated_at timestamptz NOT NULL DEFAULT NOW(),UNIQUE(article_id,delivery_revision))`;
 await database.sql`CREATE INDEX IF NOT EXISTS website_deliveries_article ON website_deliveries(article_id,created_at)`;
 await database.sql`CREATE TABLE IF NOT EXISTS website_settings (id text PRIMARY KEY,connection_id text,updated_by text NOT NULL,updated_at timestamptz NOT NULL DEFAULT NOW())`;
}

export function signedRequest(connection,payload,now=Date.now()) {
 const body=canonicalJson(payload),timestamp=String(now);
 const signature=crypto.sign('sha256',Buffer.from(timestamp+'\n'+body),{key:connection.privateKey,padding:crypto.constants.RSA_PKCS1_PSS_PADDING,saltLength:32}).toString('base64');
 return {method:'POST',redirect:'error',headers:{'content-type':'application/json','x-cms-key-id':connection.id,'x-cms-timestamp':timestamp,'x-cms-signature':signature,'OAI-Sites-Authorization':'Bearer '+connection.transportToken},body,signal:AbortSignal.timeout(8000)};
}
export function decryptPairing(box,privateKey) {
 if(!box||typeof box.wrappedKey!=='string'||typeof box.iv!=='string'||typeof box.ciphertext!=='string'||JSON.stringify(box).length>16000)throw contentError('Invalid website connection response.');
 const key=crypto.privateDecrypt({key:privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(box.wrappedKey,'base64'));
 const bytes=Buffer.from(box.ciphertext,'base64');
 if(key.length!==32||bytes.length<16)throw contentError('Invalid website connection response.');
 const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(box.iv,'base64'));decipher.setAuthTag(bytes.subarray(-16));
 return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(0,-16)),decipher.final()]).toString('utf8'));
}

export async function websiteStudio(database,access,body,actor,{store,fetcher=fetch,now=()=>Date.now()}={}) {
 if(access.role!=='Admin')throw contentError('Website Studio is available to CRM administrators.',403);
 await ensureWebsiteSchema(database);
 const operation=String(body.operation||'list');
 const secrets=()=>store||secretStore();
 const config=async()=> (await database.sql`SELECT connection_id FROM website_settings WHERE id='primary'`)[0];
 const readConnection=async()=>{const settings=await config();return settings?.connection_id?await secrets().get('connection:'+settings.connection_id,{type:'json'}):null;};
 const isConnected=async()=>{const c=await readConnection();return Boolean(c?.transportToken&&c.privateKey);};
 const connection=async()=>{const c=await readConnection();if(!c?.transportToken||!c.privateKey)throw contentError('Connect the website before publishing.',409);return c;};
 const read=async id=>(await database.sql`SELECT * FROM website_articles WHERE id=${id}`)[0];
 const list=async()=>({articles:await database.sql`SELECT id, revision, draft_json->>'title' AS title, draft_json->>'slug' AS slug, draft_json->>'author' AS author, draft_json->>'publicationDate' AS publication_date, status, published_revision, published_draft_revision, updated_at FROM website_articles ORDER BY updated_at DESC`,connected:await isConnected(),websiteUrl:WEBSITE_URL,importAvailable:seed.length});
 if(operation==='list')return list();
 if(operation==='connectStart') {
  if(await isConnected())throw contentError('Disconnect the current website connection before creating another.',409);
  const id=crypto.randomUUID(),nonce=crypto.randomUUID(),expiresAt=now()+10*60*1000;
  const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'der'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
  const request={id,nonce,origin:CRM_ORIGIN,publicKey:pair.publicKey.toString('base64'),expiresAt};
  await secrets().setJSON('connection:'+id,{id,nonce,privateKey:pair.privateKey,expiresAt,pending:true});
  return {connectionId:id,connectUrl:WEBSITE_URL+'/website/connect?request='+Buffer.from(JSON.stringify(request)).toString('base64url')};
 }
 if(operation==='connectFinish') {
  const id=idValue(body.connectionId),pending=await secrets().get('connection:'+id,{type:'json'});
  if(!pending?.pending||pending.expiresAt<now())throw contentError('This connection request expired. Start again.');
  let result;try{result=decryptPairing(body.box,pending.privateKey);}catch{throw contentError('The website connection response could not be verified.');}
  if(result.id!==id||result.nonce!==pending.nonce||result.siteUrl!==WEBSITE_URL||result.origin!==CRM_ORIGIN||typeof result.transportToken!=='string'||result.transportToken.length>8000)throw contentError('The website connection response could not be verified.');
  await secrets().setJSON('connection:'+id,{id,privateKey:pending.privateKey,transportToken:result.transportToken,connectedAt:new Date(now()).toISOString(),pending:false});
  await database.sql`INSERT INTO website_settings (id,connection_id,updated_by) VALUES ('primary',${id},${actor}) ON CONFLICT(id) DO UPDATE SET connection_id=EXCLUDED.connection_id,updated_by=EXCLUDED.updated_by,updated_at=NOW()`;
  return {connected:true,websiteUrl:WEBSITE_URL};
 }
 if(operation==='disconnect'){
  const c=await connection();let response,reply;
  try{response=await fetcher(WEBSITE_URL+'/api/website/v1',signedRequest(c,{kind:'disconnect'}));reply=await response.json();}catch{throw contentError('Disconnection was not confirmed. Try again before creating another connection.',503);}
  if(!response.ok||reply.disconnected!==true)throw contentError('Disconnection was not confirmed. Try again before creating another connection.',503);
  await database.sql`UPDATE website_settings SET connection_id=NULL,updated_by=${actor},updated_at=NOW() WHERE id='primary' AND connection_id=${c.id}`;
  await secrets().delete('connection:'+c.id);
  return {connected:false,websiteUrl:WEBSITE_URL};
 }
 if(operation==='import') {
  const data=seed.map(x=>({id:x.id,draft_json:normaliseArticle(x.article)}));
  const imported=await database.sql`WITH added AS (
    INSERT INTO website_articles (id,slug,draft_json,published_json,published_draft_revision,status,updated_by) SELECT x.id::uuid,x.draft_json->>'slug',x.draft_json,x.draft_json,1,'Imported',${actor} FROM jsonb_to_recordset(${JSON.stringify(data)}::jsonb) AS x(id text,draft_json jsonb)
    ON CONFLICT DO NOTHING RETURNING id,revision,draft_json
   ), recorded AS (INSERT INTO website_revisions (article_id,revision,content_json,created_by) SELECT id,revision,draft_json,${actor} FROM added RETURNING article_id)
   SELECT count(*)::int AS count FROM recorded`;
  return {...await list(),imported:Number(imported[0]?.count||0)};
 }
 if(operation==='get') {
  const id=idValue(body.id),row=await read(id);if(!row)throw contentError('Article not found.',404);
  const history=await database.sql`SELECT revision,content_json,created_at,created_by FROM website_revisions WHERE article_id=${id} ORDER BY revision DESC LIMIT 30`;
  const events=await database.sql`SELECT id,action,delivery_revision,state,message,created_at,updated_at FROM website_deliveries WHERE article_id=${id} ORDER BY created_at DESC LIMIT 20`;
  return {article:publicRecord(row),history,events,connected:await isConnected(),websiteUrl:WEBSITE_URL};
 }
 if(operation==='save'||operation==='restore') {
  const id=body.id?idValue(body.id):crypto.randomUUID(),expected=Number(body.revision||0);
  if(!Number.isSafeInteger(expected)||expected<0)throw contentError('Reload the article before saving.');
  let input=body.article;
  if(operation==='restore'){
   const version=await database.sql`SELECT content_json FROM website_revisions WHERE article_id=${id} AND revision=${Number(body.restoreRevision)}`;
   if(!version[0])throw contentError('This revision was not found.',404);input=version[0].content_json;
  }
  const draft=normaliseArticle(input);
  let rows;try{
   rows=await database.sql`WITH saved AS (
    INSERT INTO website_articles (id,slug,draft_json,revision,updated_by) SELECT ${id},${draft.slug},${JSON.stringify(draft)}::jsonb,1,${actor} WHERE ${expected}=0
    ON CONFLICT(id) DO NOTHING RETURNING *
   ), changed AS (
    UPDATE website_articles SET draft_json=${JSON.stringify(draft)}::jsonb,revision=revision+1,updated_by=${actor},updated_at=NOW()
    WHERE id=${id} AND revision=${expected} AND ${expected}>0 AND slug=${draft.slug} RETURNING *
   ), combined AS (SELECT * FROM saved UNION ALL SELECT * FROM changed), recorded AS (
    INSERT INTO website_revisions (article_id,revision,content_json,created_by) SELECT id,revision,draft_json,${actor} FROM combined RETURNING article_id
   ) SELECT combined.* FROM combined JOIN recorded ON recorded.article_id=combined.id`;
  }catch(error){if(error.code==='23505')throw contentError('That URL name is already used by another article.',409);throw error;}
  if(!rows.length)throw contentError('The article changed in another session, or its saved URL name was changed. Your text is still open; copy it before reloading.',409);
  return {article:publicRecord(rows[0])};
 }
 if(operation==='publish'||operation==='unpublish') {
  await connection();const id=idValue(body.id),row=await read(id);
  if(!row)throw contentError('Article not found.',404);
  if(Number(row.revision)!==Number(body.revision))throw contentError('Reload the saved article before publishing.',409);
  const draft=normaliseArticle(row.draft_json,{publish:operation==='publish'}),eventId=crypto.randomUUID();
  const events=await database.sql`WITH changed AS (
    UPDATE website_articles SET delivery_sequence=delivery_sequence+1,delivery_pending=true WHERE id=${id} AND revision=${Number(body.revision)} AND delivery_pending=false RETURNING *
   ) INSERT INTO website_deliveries (id,article_id,action,delivery_revision,payload_json,created_by)
   SELECT ${eventId},id,${operation},delivery_sequence,jsonb_build_object('protocol',1,'eventId',${eventId}::text,'articleId',id::text,'revision',delivery_sequence,'draftRevision',revision,'kind',${operation}::text,'slug',slug,'article',${operation==='publish'?JSON.stringify(draft):'null'}::jsonb),${actor} FROM changed RETURNING *`;
  if(!events.length)throw contentError('Resolve the pending publication before starting another, or reload the latest draft.',409);
  return deliver(events[0]);
 }
 if(operation==='retry') {
  const eventId=idValue(body.eventId),events=await database.sql`SELECT * FROM website_deliveries WHERE id=${eventId}`;
  if(!events[0])throw contentError('Publication not found.',404);
  return deliver(events[0]);
 }
 throw contentError('Unknown Website Studio action.');

 async function deliver(event) {
  if(event.state==='Accepted')return {delivery:{id:event.id,state:'Accepted',message:'This publication was already accepted.'},article:publicRecord(await read(event.article_id)),websiteUrl:WEBSITE_URL};
  const c=await connection(),attempt=crypto.randomUUID();
  const claimed=await database.sql`UPDATE website_deliveries SET state='Sending',attempt_id=${attempt},updated_at=NOW(),message='Checking website publication.' WHERE id=${event.id} AND (state IN ('Pending','Failed','Unknown') OR (state='Sending' AND updated_at<NOW()-INTERVAL '90 seconds')) RETURNING *`;
  if(!claimed.length)throw contentError('This publication is already being checked. Refresh before trying again.',409);
  let state='Unknown',message='The website response was not confirmed. Check status before retrying.';
  try {
   let response,reply;
   if(['Unknown','Sending'].includes(event.state)){
    response=await fetcher(WEBSITE_URL+'/api/website/v1',{...signedRequest(c,{kind:'status',eventId:event.id})});
    reply=await response.json();
    if(response.ok&&reply.found&&reply.eventId===event.id){state=reply.accepted?'Accepted':'Failed';message=reply.accepted?'Website accepted this revision.':'Website rejected this publication.';}
    else if(!response.ok)throw new Error('Status is not confirmed.');
   }
   if(state!=='Accepted'&&!(reply?.found)){
    response=await fetcher(WEBSITE_URL+'/api/website/v1',signedRequest(c,event.payload_json));
    reply=await response.json();
    if(response.ok&&reply.accepted===true&&reply.eventId===event.id&&Number(reply.revision)===Number(event.delivery_revision)){state='Accepted';message=event.action==='unpublish'?'Article unpublished on the website.':'Saved revision published to the website.';}
    else if(response.status>=400&&response.status<500){state='Failed';message='The website rejected the publication. Check the connection and saved revision before retrying.';}
   }
  } catch { /* Do not expose provider responses, signatures or connection secrets. */ }
  const persisted=await database.sql`WITH event AS (
   UPDATE website_deliveries SET state=${state},message=${message},updated_at=NOW() WHERE id=${event.id} AND attempt_id=${attempt} RETURNING *
  ), published AS (
   UPDATE website_articles a SET
   delivery_pending=CASE WHEN a.delivery_sequence=e.delivery_revision AND e.state IN ('Accepted','Failed') THEN false ELSE a.delivery_pending END,
   published_json=CASE WHEN e.state='Accepted' AND a.published_revision<e.delivery_revision THEN CASE WHEN e.action='publish' THEN e.payload_json->'article' ELSE NULL END ELSE a.published_json END,
   published_revision=CASE WHEN e.state='Accepted' THEN GREATEST(a.published_revision,e.delivery_revision) ELSE a.published_revision END,
   published_draft_revision=CASE WHEN e.state='Accepted' AND a.published_revision<e.delivery_revision THEN (e.payload_json->>'draftRevision')::bigint ELSE a.published_draft_revision END,
   status=CASE WHEN e.state='Accepted' AND a.published_revision<e.delivery_revision THEN CASE WHEN e.action='publish' THEN 'Published' ELSE 'Unpublished' END ELSE a.status END
   FROM event e WHERE a.id=e.article_id RETURNING a.id
  ) SELECT id,state,message FROM event`;
  if(!persisted.length)throw contentError('The publication result could not be stored. Refresh and check its status before retrying.',503);
  return {delivery:persisted[0],article:publicRecord(await read(event.article_id)),websiteUrl:WEBSITE_URL};
 }
}
