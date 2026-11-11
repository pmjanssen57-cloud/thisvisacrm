import crypto from 'node:crypto';

const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));
const text=(value,max)=>String(value||'').trim().slice(0,max);
const fail=(statusCode,message)=>{throw Object.assign(Error(message),{statusCode});};
const id=value=>uuid(value)?value:fail(400,'Choose a valid conversation or client file.');
const sequence=value=>/^\d{1,18}$/.test(String(value||''))?String(value):'0';
let schemaReady;
export async function ensureTeamSchema(database) {
  if(!schemaReady)schemaReady=initialiseTeamSchema(database).catch(error=>{schemaReady=null;throw error;});
  return schemaReady;
}
async function initialiseTeamSchema(database) {
  // DDL is mirrored in the additive migration; no filesystem dependency at runtime.
  await database.sql`CREATE TABLE IF NOT EXISTS team_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('general','direct','group')),
  title TEXT NOT NULL DEFAULT '',
  direct_key TEXT UNIQUE,
  created_by UUID REFERENCES advisers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
  await database.sql`CREATE TABLE IF NOT EXISTS team_chat_members (
  conversation_id UUID NOT NULL REFERENCES team_chat_conversations(id) ON DELETE CASCADE,
  adviser_id UUID NOT NULL REFERENCES advisers(id) ON DELETE CASCADE,
  last_read_seq BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY(conversation_id, adviser_id)
)`;
  await database.sql`CREATE TABLE IF NOT EXISTS team_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES team_chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  seq BIGSERIAL UNIQUE,
  request_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_team_chat_messages_conversation ON team_chat_messages(conversation_id,seq DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_team_chat_members_adviser ON team_chat_members(adviser_id,conversation_id)`;
  await database.sql`CREATE TABLE IF NOT EXISTS team_chat_file_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES team_chat_conversations(id) ON DELETE RESTRICT,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('individual','commercial')),
  target_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL,
  note_key TEXT NOT NULL UNIQUE,
  saved_by_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
  saved_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_team_chat_file_notes_target ON team_chat_file_notes(target_kind,target_id,created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_team_chat_file_notes_conversation ON team_chat_file_notes(conversation_id,created_at DESC)`;
}

async function member(database,conversationId,actorId){
  const [row]=await database.sql`SELECT c.* FROM team_chat_conversations c JOIN team_chat_members m ON m.conversation_id=c.id WHERE c.id=${id(conversationId)} AND m.adviser_id=${actorId}`;
  if(!row)fail(403,'This team conversation is not available to you.');return row;
}
async function general(database,actorId){
  let [row]=await database.sql`SELECT id FROM team_chat_conversations WHERE direct_key='general'`;
  if(!row)[row]=await database.sql`INSERT INTO team_chat_conversations(kind,title,direct_key,created_by) VALUES('general','General team','general',${actorId}) ON CONFLICT(direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING id`;
  await database.sql`INSERT INTO team_chat_members(conversation_id,adviser_id) SELECT ${row.id},id FROM advisers WHERE active IS NOT FALSE ON CONFLICT DO NOTHING`;
  return row.id;
}
async function unread(database,actorId){
  const [row]=await database.sql`SELECT COUNT(*)::int AS unread FROM team_chat_members m WHERE m.adviser_id=${actorId} AND EXISTS(SELECT 1 FROM team_chat_messages x WHERE x.conversation_id=m.conversation_id AND x.seq>m.last_read_seq AND x.sender_id IS DISTINCT FROM ${actorId})`;
  return Number(row?.unread||0);
}
export async function teamChat(database,input,actor) {
  if(!uuid(actor?.id))fail(403,'Sign in with your staff profile to use Team chat.');
  const [staff]=await database.sql`SELECT id,name FROM advisers WHERE id=${actor.id} AND active IS NOT FALSE`;
  if(!staff)fail(403,'An active staff profile is required for Team chat.');
  actor={...actor,name:staff.name||'Staff member'};
  await ensureTeamSchema(database);
  const action=input.action;
  if(action==='teamFileNotes'){
    const kind=input.targetKind,target=id(input.targetId);if(!['individual','commercial'].includes(kind))fail(400,'Choose a valid client file type.');
    const beforeId=input.beforeId?id(input.beforeId):'',beforeAt=beforeId&&Number.isFinite(Date.parse(input.beforeAt))?new Date(input.beforeAt).toISOString():'9999-01-01T00:00:00.000Z';
    // File copies are staff records, independent of original chat membership.
    const rows=await database.sql`SELECT id,title,summary,saved_by_name,created_at FROM team_chat_file_notes WHERE target_kind=${kind} AND target_id=${target} AND (${beforeId}='' OR (created_at,id)<(${beforeAt}::timestamptz,NULLIF(${beforeId},'')::uuid)) ORDER BY created_at DESC,id DESC LIMIT 51`;
    return {notes:rows.slice(0,50),hasMore:rows.length>50};
  }
  if(action==='teamFileNote'){
    const target=id(input.targetId),noteId=id(input.noteId),kind=input.targetKind;
    if(!['individual','commercial'].includes(kind))fail(400,'Choose a valid client file type.');
    const [note]=await database.sql`SELECT id,title,summary,snapshot,saved_by_name,created_at FROM team_chat_file_notes WHERE id=${noteId} AND target_kind=${kind} AND target_id=${target}`;
    if(!note)fail(404,'This saved note was not found on the selected client file.');return {note};
  }
  if(action==='teamStatus'){
    await general(database,actor.id);return {unread:await unread(database,actor.id)};
  }
  if(action==='teamStart'){
    const people=[...new Set([actor.id,...(Array.isArray(input.members)?input.members:[])])];
    if(people.length<2||people.length>20||people.some(p=>!uuid(p)))fail(400,'Choose between 2 and 20 active staff members.');
    const roster=await database.sql`SELECT id FROM advisers WHERE active IS NOT FALSE AND id=ANY(${people}::uuid[])`;
    if(roster.length!==people.length)fail(400,'One of the selected staff profiles is no longer active.');
    const kind=input.kind==='direct'?'direct':'group';
    if(kind==='direct'&&people.length!==2)fail(400,'Direct messages have two participants.');
    const title=kind==='direct'?'':text(input.title,120);if(kind==='group'&&!title)fail(400,'Give the group a name.');
    const key=kind==='direct'?people.slice().sort().join(':'):id(input.requestKey);
    const existing=async()=>{
      const [prior]=await database.sql`SELECT * FROM team_chat_conversations WHERE direct_key=${key}`;
      if(!prior)return null;
      await member(database,prior.id,actor.id);
      const members=await database.sql`SELECT adviser_id FROM team_chat_members WHERE conversation_id=${prior.id}`;
      if(prior.kind!==kind||members.map(m=>m.adviser_id).sort().join(':')!==people.slice().sort().join(':')||kind==='group'&&prior.title!==title)fail(409,'This conversation request was already used. Start a new conversation.');
      return prior;
    };
    const prior=await existing();if(prior)return {conversation:prior};
    const [conversation]=await database.sql`WITH c AS (
      INSERT INTO team_chat_conversations(kind,title,direct_key,created_by) VALUES(${kind},${title},${key},${actor.id})
      ON CONFLICT(direct_key) DO NOTHING RETURNING *
    ), members AS (INSERT INTO team_chat_members(conversation_id,adviser_id) SELECT c.id,p.id FROM c CROSS JOIN UNNEST(${people}::uuid[]) p(id) WHERE TRUE ON CONFLICT DO NOTHING)
    SELECT * FROM c`;
    return {conversation:conversation||await existing()};
  }
  if(action==='teamSnapshot'){
    const generalId=await general(database,actor.id);
    const roster=await database.sql`SELECT id,name,profile_photo_url FROM advisers WHERE active IS NOT FALSE ORDER BY name`;
    const conversations=await database.sql`SELECT c.*,
      (SELECT jsonb_agg(jsonb_build_object('id',a.id,'name',a.name) ORDER BY a.name) FROM team_chat_members cm JOIN advisers a ON a.id=cm.adviser_id WHERE cm.conversation_id=c.id) AS members,
      (SELECT COUNT(*)::int FROM team_chat_messages x WHERE x.conversation_id=c.id AND x.seq>m.last_read_seq AND x.sender_id IS DISTINCT FROM ${actor.id}) AS unread,
      (SELECT body FROM team_chat_messages x WHERE x.conversation_id=c.id ORDER BY seq DESC LIMIT 1) AS last_message
      FROM team_chat_conversations c JOIN team_chat_members m ON m.conversation_id=c.id WHERE m.adviser_id=${actor.id} ORDER BY c.updated_at DESC,c.id`;
    const selected=input.conversationId||generalId;await member(database,selected,actor.id);
    const query=text(input.search,120),before=sequence(input.beforeSeq);
    const rows=await database.sql`SELECT id,conversation_id,sender_id,sender_name,body,seq::text AS seq,created_at FROM team_chat_messages WHERE conversation_id=${selected} AND (${before}='0' OR seq<${before}::bigint) AND (${query}='' OR body ILIKE ${'%'+query+'%'}) ORDER BY seq DESC LIMIT 101`;
    const hasMore=rows.length>100,messages=rows.slice(0,100).reverse();
    const links=await database.sql`SELECT id,target_kind,target_id,title,jsonb_path_query_array(snapshot,'$.messages[*].id') AS message_ids,created_at FROM team_chat_file_notes WHERE conversation_id=${selected} ORDER BY created_at DESC LIMIT 200`;
    return {actor:{id:actor.id,name:actor.name},roster,conversations,selectedId:selected,messages,hasMore,links,unread:await unread(database,actor.id)};
  }
  if(action==='teamSend'){
    const conversation=id(input.conversationId);await member(database,conversation,actor.id);
    const body=text(input.message,2001);if(!body||body.length>2000)fail(400,'Enter a message of up to 2,000 characters.');
    const requestKey=id(input.requestKey);
    const [prior]=await database.sql`SELECT id,conversation_id,sender_id,body FROM team_chat_messages WHERE request_key=${requestKey}`;
    if(prior){if(prior.conversation_id!==conversation||prior.sender_id!==actor.id||prior.body!==body)fail(409,'That send request has already been used.');return {message:prior};}
    const [message]=await database.sql`WITH m AS (
      INSERT INTO team_chat_messages(conversation_id,sender_id,sender_name,body,request_key) VALUES(${conversation},${actor.id},${actor.name},${body},${requestKey})
      ON CONFLICT(request_key) DO NOTHING RETURNING *
    ), bumped AS (UPDATE team_chat_conversations SET updated_at=NOW() WHERE id=${conversation} AND EXISTS(SELECT 1 FROM m)) SELECT * FROM m`;
    return {message};
  }
  if(action==='teamRead'){
    const conversation=id(input.conversationId);await member(database,conversation,actor.id);
    const through=sequence(input.throughSeq);
    await database.sql`UPDATE team_chat_members SET last_read_seq=GREATEST(last_read_seq,LEAST(${through}::bigint,COALESCE((SELECT MAX(seq) FROM team_chat_messages WHERE conversation_id=${conversation}),0))) WHERE conversation_id=${conversation} AND adviser_id=${actor.id}`;
    return {unread:await unread(database,actor.id)};
  }
  if(action==='teamSaveToFile'){
    const conversation=id(input.conversationId),thread=await member(database,conversation,actor.id),target=id(input.targetId),kind=input.targetKind;
    if(!['individual','commercial'].includes(kind))fail(400,'Choose an individual or commercial client file.');
    const messageIds=[...new Set(Array.isArray(input.messageIds)?input.messageIds:[])];if(!messageIds.length||messageIds.length>25||messageIds.some(x=>!uuid(x)))fail(400,'Select between 1 and 25 messages.');
    const messages=await database.sql`SELECT id,sender_id,sender_name,body,seq::text AS seq,created_at FROM team_chat_messages WHERE conversation_id=${conversation} AND id=ANY(${messageIds}::uuid[]) ORDER BY seq`;
    if(messages.length!==messageIds.length)fail(403,'A selected message is not part of this conversation.');
    const title=text(input.title||thread.title||'Team conversation',160),summary=text(input.summary,1000),noteId=crypto.randomUUID();
    const key=crypto.createHash('sha256').update(JSON.stringify([conversation,kind,target,messageIds.slice().sort()])).digest('hex');
    const snapshot={conversationTitle:thread.title||'Direct message',messages};
    const activity=JSON.stringify([{id:'team-note-'+noteId,type:'team-chat-note',title:'Team chat saved: '+title,detail:summary||'Selected messages saved as an internal file note. See Saved team chat notes for the full transcript.',createdAt:new Date().toISOString(),createdBy:actor.name}]);
    const args={noteId,conversation,target,kind,title,summary,snapshot:JSON.stringify(snapshot),key,actorId:actor.id,actorName:actor.name,activity};
    const saved=await saveNote(database,args);
    if(!saved.length){
      const [existing]=await database.sql`SELECT id FROM team_chat_file_notes WHERE note_key=${key}`;
      if(existing)return {noteId:existing.id,alreadySaved:true};fail(404,'The selected client file is no longer available.');
    }
    return {noteId,saved:true};
  }
  fail(400,'Unknown Team chat action.');
}

async function saveNote(database,p){
  // Lock and append atomically: the note and history marker either both persist,
  // or neither does. Do not replace a client record from a stale browser snapshot.
  if(p.kind==='individual')return database.sql`WITH target AS (SELECT id FROM clients WHERE id=${p.target} FOR UPDATE),
    note AS (INSERT INTO team_chat_file_notes(id,conversation_id,target_kind,target_id,title,summary,snapshot,note_key,saved_by_id,saved_by_name)
      SELECT ${p.noteId},${p.conversation},${p.kind},${p.target},${p.title},${p.summary},${p.snapshot}::jsonb,${p.key},${p.actorId},${p.actorName} FROM target WHERE TRUE ON CONFLICT(note_key) DO NOTHING RETURNING id),
    updated AS (UPDATE clients SET matter_activity=COALESCE(matter_activity,'[]'::jsonb)||${p.activity}::jsonb,updated_at=NOW() FROM note WHERE clients.id=${p.target} RETURNING clients.id)
    SELECT note.id FROM note JOIN updated ON TRUE`;
  return database.sql`WITH target AS (SELECT id FROM commercial_clients WHERE id=${p.target} FOR UPDATE),
    note AS (INSERT INTO team_chat_file_notes(id,conversation_id,target_kind,target_id,title,summary,snapshot,note_key,saved_by_id,saved_by_name)
      SELECT ${p.noteId},${p.conversation},${p.kind},${p.target},${p.title},${p.summary},${p.snapshot}::jsonb,${p.key},${p.actorId},${p.actorName} FROM target WHERE TRUE ON CONFLICT(note_key) DO NOTHING RETURNING id),
    updated AS (UPDATE commercial_clients SET matter_activity=COALESCE(matter_activity,'[]'::jsonb)||${p.activity}::jsonb,updated_at=NOW() FROM note WHERE commercial_clients.id=${p.target} RETURNING commercial_clients.id)
    SELECT note.id FROM note JOIN updated ON TRUE`;
}
