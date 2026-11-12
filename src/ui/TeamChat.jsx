import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MessageSquare,Plus,Send,FileText,Search,RefreshCw,X,Users,ChevronLeft} from 'lucide-react';
import './team-chat.css';

const TeamContext=createContext(null);
const stamp=value=>new Intl.DateTimeFormat('en-NZ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value;}catch{return null;}};
const titleOf=(c,actor)=>c?.title||(c?.members||[]).filter(p=>p.id!==actor?.id).map(p=>p.name).join(', ')||'Direct message';

export function TeamChatProvider({request,enabled,onUnread,children}){
  const api=useRef(request),callback=useRef(onUnread);api.current=request;callback.current=onUnread;
  const update=result=>{if(Number.isFinite(Number(result?.unread)))callback.current?.(Number(result.unread));return result;};
  const call=async(action,payload={})=>update(await api.current(action,payload));
  useEffect(()=>{
    if(!enabled){callback.current?.(0);return;}
    let live=true,running=false;
    const poll=async()=>{if(!live||running||document.visibilityState!=='visible')return;running=true;try{const r=await api.current('teamStatus');if(live)update(r);}catch{/* The drawer presents actionable errors; do not interrupt other CRM work. */}finally{running=false;}};
    poll();const timer=setInterval(poll,20000);document.addEventListener('visibilitychange',poll);window.addEventListener('focus',poll);
    return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',poll);window.removeEventListener('focus',poll);};
  },[enabled]);
  return <TeamContext.Provider value={call}>{children}</TeamContext.Provider>;
}

function ChatDialog({title,onClose,busy,children,actions}){
  const ref=useRef(null);
  useEffect(()=>{const previous=document.activeElement;ref.current.showModal();return()=>{ref.current?.close();previous?.isConnected&&previous.focus();};},[]);
  return createPortal(<dialog ref={ref} className="team-chat-dialog" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><header><h2>{title}</h2><button type="button" className="btn" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={17}/></button></header><div className="team-chat-dialog-content">{children}</div><footer>{actions}</footer></dialog>,document.body);
}

export function TeamChatPanel({active,clients=[],commercialClients=[],onFileSaved}){
  const request=useContext(TeamContext),api=useRef(request);api.current=request;
  const [snapshot,setSnapshot]=useState({conversations:[],roster:[],messages:[],links:[]}),[selected,setSelected]=useState(''),[filter,setFilter]=useState(''),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[drafts,setDrafts]=useState({}),[picked,setPicked]=useState([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[showList,setShowList]=useState(true);
  const [newOpen,setNewOpen]=useState(false),[newKind,setNewKind]=useState('direct'),[newTitle,setNewTitle]=useState(''),[newMembers,setNewMembers]=useState([]);
  const [saveOpen,setSaveOpen]=useState(false),[fileSearch,setFileSearch]=useState(''),[target,setTarget]=useState(''),[summary,setSummary]=useState('');
  const [connectionError,setConnectionError]=useState('');
  const epoch=useRef(0),activeRef=useRef(active),current=useRef({selected,query}),busyRef=useRef(busy),sendKey=useRef(null),startKey=useRef(''),bottom=useRef(null),readWatermark=useRef(''),paused=useRef(false),olderView=useRef(false);activeRef.current=active;current.current={selected,query};busyRef.current=busy;paused.current=Boolean(picked.length||saveOpen||newOpen);
  const thread=snapshot.conversations.find(c=>c.id===selected),messages=snapshot.messages||[],draft=drafts[selected]||'';
  const files=[...clients.map(c=>({id:c.id,kind:'individual',name:[c.firstName,c.lastName].filter(Boolean).join(' '),matter:c.matterName||c.caseType||''})),...commercialClients.map(c=>({id:c.id,kind:'commercial',name:c.tradingName||c.legalName||'Commercial client',matter:c.matterName||'Employer'}))];
  const fileKey=f=>`${f.kind}:${f.id}`,fileLabel=f=>`${f.name}${f.matter?' · '+f.matter:''} (${f.kind==='commercial'?'Commercial':'Individual'})`;
  const chosenFile=files.find(f=>fileKey(f)===target),chosenMessages=messages.filter(m=>picked.includes(m.id));
  const filteredFiles=files.filter(f=>fileLabel(f).toLowerCase().includes(fileSearch.toLowerCase())||fileKey(f)===target);
  async function load({older=false,quiet=false}={}){
    if(!activeRef.current||busyRef.current)return;
    const version=++epoch.current,wanted={...current.current};if(!quiet)setLoading(true);
    try{
      const result=await api.current('teamSnapshot',{conversationId:wanted.selected,search:wanted.query,...(older&&messages[0]?{beforeSeq:messages[0].seq}:{})});
      if(version!==epoch.current||!activeRef.current)return;
      if(older)olderView.current=true;
      setSnapshot(previous=>({...result,messages:older?[...result.messages,...previous.messages.filter(m=>!result.messages.some(n=>n.id===m.id))]:result.messages}));
      if(!wanted.selected)setSelected(result.selectedId);
      setConnectionError('');
      const last=result.messages.at(-1),watermark=result.selectedId+':'+last?.seq;
      if(!older&&!wanted.query&&last&&document.visibilityState==='visible'&&readWatermark.current!==watermark){
        await api.current('teamRead',{conversationId:result.selectedId,throughSeq:last.seq});readWatermark.current=watermark;
        if(version===epoch.current)setSnapshot(p=>({...p,conversations:p.conversations.map(c=>c.id===result.selectedId?{...c,unread:0}:c)}));
      }
    }catch(e){if(version===epoch.current)setConnectionError(e.message||'Could not load Team chat.');}finally{if(version===epoch.current)setLoading(false);}
  }
  useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),350);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{setPicked([]);readWatermark.current='';olderView.current=false;},[selected,query]);
  useEffect(()=>{
    if(!active||busy)return;load();const timer=setInterval(()=>{if(document.visibilityState==='visible'&&!paused.current&&!olderView.current)load({quiet:true});},4000);
    const wake=()=>{if(document.visibilityState==='visible'&&!paused.current&&!olderView.current)load({quiet:true});};document.addEventListener('visibilitychange',wake);
    return()=>{++epoch.current;clearInterval(timer);document.removeEventListener('visibilitychange',wake);};
  },[active,selected,query,busy]);
  useEffect(()=>{if(active&&!query)bottom.current?.scrollIntoView({block:'nearest'});},[selected,messages.at(-1)?.id,active]);
  const mutate=async work=>{if(busyRef.current)return;setBusy(true);busyRef.current=true;++epoch.current;setError('');try{await work();}catch(e){setError(e.message||'Team chat action failed. Your draft is retained.');}finally{busyRef.current=false;setBusy(false);setLoading(false);}};
  const choose=id=>{setSelected(id);setSearch('');setQuery('');setPicked([]);setShowList(false);setNotice('');};
  const send=()=>mutate(async()=>{
    const body=draft.trim();if(!body||!selected)return;
    if(!sendKey.current||sendKey.current.body!==body||sendKey.current.conversationId!==selected)sendKey.current={body,conversationId:selected,key:crypto.randomUUID()};
    await api.current('teamSend',{conversationId:selected,message:body,requestKey:sendKey.current.key});setDrafts(p=>({...p,[selected]:''}));sendKey.current=null;
    busyRef.current=false;await load({quiet:true});busyRef.current=true;
  });
  const start=()=>mutate(async()=>{
    const result=await api.current('teamStart',{kind:newKind,title:newTitle,members:newMembers,requestKey:startKey.current});setNewOpen(false);choose(result.conversation.id);
  });
  const save=()=>mutate(async()=>{
    if(!chosenFile||!chosenMessages.length)throw Error('Select messages and a client file first.');
    const result=await api.current('teamSaveToFile',{conversationId:selected,messageIds:chosenMessages.map(m=>m.id),targetKind:chosenFile.kind,targetId:chosenFile.id,title:titleOf(thread,snapshot.actor),summary});
    setSaveOpen(false);setPicked([]);setSummary('');setNotice(result.alreadySaved?'These messages are already saved to that file.':`Saved to ${chosenFile.name} in the Action log.`);
    busyRef.current=false;await load({quiet:true});busyRef.current=true;onFileSaved?.();
  });
  if(!active)return null;
  return <div className={`team-chat-workspace ${showList?'team-show-list':'team-show-thread'}`}>
    <aside className="team-chat-list"><div className="team-chat-list-head"><h3>Team conversations</h3><button className="btn" type="button" disabled={!snapshot.actor||busy} onClick={()=>{startKey.current=crypto.randomUUID();setNewKind('direct');setNewMembers([]);setNewTitle('');setNewOpen(true);setError('');}}><Plus size={16}/>New</button></div><label className="team-chat-search"><Search size={16}/><input aria-label="Find a conversation" placeholder="Find a conversation…" value={filter} onChange={e=>setFilter(e.target.value)}/></label>
      {snapshot.conversations.filter(c=>(titleOf(c,snapshot.actor)+' '+c.last_message).toLowerCase().includes(filter.toLowerCase())).map(c=><button className={`team-chat-list-item ${selected===c.id?'active':''}`} type="button" key={c.id} onClick={()=>choose(c.id)}><span className="team-chat-title">{c.kind==='direct'?<MessageSquare size={16}/>:<Users size={16}/>}<strong>{titleOf(c,snapshot.actor)}</strong>{Number(c.unread)>0&&<b className="team-chat-count">{c.unread}</b>}</span><small>{c.last_message||'Start the conversation'}</small></button>)}
      {!snapshot.conversations.length&&!loading&&<p className="team-chat-help">No conversations yet. Refresh to connect.</p>}
    </aside>
    <section className="team-chat-thread" aria-label="Team conversation"><header><div><button className="btn team-chat-back" type="button" onClick={()=>setShowList(true)}><ChevronLeft size={16}/>Conversations</button><h3>{titleOf(thread,snapshot.actor)||'Team chat'}</h3><p>{(thread?.members||[]).map(m=>m.name).join(' · ')}</p></div><button className="btn" type="button" onClick={()=>load()} disabled={busy||loading} aria-label="Refresh team conversation"><RefreshCw size={16}/></button></header>
      {(error||connectionError)&&<p className="team-chat-error" role="alert">{error||connectionError}</p>}{notice&&<p className="team-chat-notice" role="status">{notice}</p>}
      <div className="team-chat-thread-tools"><label className="team-chat-search"><Search size={15}/><input aria-label="Search messages" placeholder="Search this conversation…" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="btn" type="button" disabled={!picked.length||busy} onClick={()=>{setTarget('');setFileSearch('');setSummary('');setSaveOpen(true);}}><FileText size={15}/>Save to action log{picked.length?` (${picked.length})`:''}</button></div>
      <p className="team-chat-help">Internal staff messages. Select messages to save a copy to a client file.</p>
      <div className="team-chat-messages" aria-label="Team messages" aria-busy={loading}>{snapshot.hasMore&&<button className="btn" type="button" disabled={loading||busy} onClick={()=>load({older:true})}>Load older messages</button>}{!messages.length&&!loading&&<p className="team-chat-empty">{query?'No matching messages.':'No messages yet. Start the conversation below.'}</p>}{messages.map(m=><article key={m.id} className={`team-chat-message ${m.sender_id===snapshot.actor?.id?'own':''}`}><label className="team-chat-pick"><input type="checkbox" aria-label={`Select message from ${m.sender_name} at ${stamp(m.created_at)}`} checked={picked.includes(m.id)} disabled={busy||!picked.includes(m.id)&&picked.length>=25} onChange={e=>setPicked(p=>e.target.checked?[...p,m.id]:p.filter(id=>id!==m.id))}/></label><div><header><strong>{m.sender_name}</strong><time>{stamp(m.created_at)}</time></header><p>{m.body}</p>{snapshot.links.filter(n=>(parse(n.message_ids)||[]).includes(m.id)).map(n=><small key={n.id} className="team-chat-saved"><FileText size={12}/>Saved to {files.find(f=>f.id===n.target_id&&f.kind===n.target_kind)?.name||'client file'}</small>)}</div></article>)}<div ref={bottom}/></div>
      <form className="team-chat-composer" onSubmit={e=>{e.preventDefault();send();}}><label htmlFor="team-message-draft">Message {titleOf(thread,snapshot.actor)}</label><div><textarea id="team-message-draft" rows={3} maxLength={2000} placeholder="Write a team message…" value={draft} disabled={!selected||busy} onChange={e=>setDrafts(p=>({...p,[selected]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}}}/><button className="btn dark" type="submit" disabled={!draft.trim()||busy||!selected}><Send size={16}/>{busy?'Working…':'Send'}</button></div><small>{draft.length}/2,000 · Ctrl+Enter to send</small></form>
    </section>
    {newOpen&&<ChatDialog title="New team conversation" busy={busy} onClose={()=>setNewOpen(false)} actions={<><button className="btn" onClick={()=>setNewOpen(false)} disabled={busy}>Cancel</button><button className="btn dark" onClick={start} disabled={busy||!newMembers.length||newKind==='group'&&!newTitle.trim()}>Start conversation</button></>}><label>Conversation type<select value={newKind} disabled={busy} onChange={e=>{setNewKind(e.target.value);setNewMembers([]);}}><option value="direct">Direct message</option><option value="group">Group conversation</option></select></label>{newKind==='group'&&<label>Group name<input maxLength={120} value={newTitle} onChange={e=>setNewTitle(e.target.value)} disabled={busy}/></label>}<fieldset><legend>{newKind==='direct'?'Choose a colleague':'Choose group members'}</legend><p className="team-chat-help">You are included automatically. Group membership is fixed when created.</p><div className="team-chat-people">{snapshot.roster.filter(p=>p.id!==snapshot.actor?.id).map(p=><label key={p.id}><input type={newKind==='direct'?'radio':'checkbox'} name="team-member" checked={newMembers.includes(p.id)} disabled={busy||newKind==='group'&&!newMembers.includes(p.id)&&newMembers.length>=19} onChange={e=>setNewMembers(current=>newKind==='direct'?[p.id]:e.target.checked?[...current,p.id]:current.filter(id=>id!==p.id))}/>{p.name}</label>)}</div></fieldset>{error&&<p role="alert" className="team-chat-error">{error}</p>}</ChatDialog>}
    {saveOpen&&<ChatDialog title="Save messages to client action log" busy={busy} onClose={()=>setSaveOpen(false)} actions={<><button className="btn" disabled={busy} onClick={()=>setSaveOpen(false)}>Cancel</button><button className="btn dark" disabled={busy||!chosenFile||!chosenMessages.length} onClick={save}>Save to action log</button></>}><p>Copies are saved in the client's Action log, visible to staff with access to that file. They are not published to the client portal or emailed. The original conversation stays unchanged.</p><label>Find client or employer<input value={fileSearch} onChange={e=>setFileSearch(e.target.value)} placeholder="Name, employer or matter…" disabled={busy}/></label><label>Client file<select value={target} onChange={e=>setTarget(e.target.value)} disabled={busy}><option value="">Choose a client file…</option>{filteredFiles.map(f=><option value={fileKey(f)} key={fileKey(f)}>{fileLabel(f)}</option>)}</select></label><label>Summary (optional)<textarea rows={3} maxLength={1000} value={summary} onChange={e=>setSummary(e.target.value)} disabled={busy}/></label><section className="team-chat-note-preview"><h3>{chosenMessages.length} selected message{chosenMessages.length===1?'':'s'}</h3>{chosenMessages.map(m=><article key={m.id}><strong>{m.sender_name}</strong><time>{stamp(m.created_at)}</time><p>{m.body}</p></article>)}</section>{error&&<p role="alert" className="team-chat-error">{error}</p>}</ChatDialog>}
  </div>;
}

export function TeamFileNotes({targetKind,targetId}){
  const request=useContext(TeamContext),api=useRef(request);api.current=request;
  const [notes,setNotes]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[hasMore,setHasMore]=useState(false),[contents,setContents]=useState({});
  const pending=useRef(new Set()),noteEpoch=useRef(0);
  const load=async(older=false)=>{const version=++noteEpoch.current;try{setLoading(true);const last=older?notes.at(-1):null;const result=await api.current('teamFileNotes',{targetKind,targetId,...(last?{beforeId:last.id,beforeAt:last.created_at}:{})});if(version!==noteEpoch.current)return;setNotes(p=>older?[...p,...result.notes]:result.notes||[]);setHasMore(result.hasMore);setError('');}catch(e){if(version===noteEpoch.current)setError(e.message||'Could not load saved team notes.');}finally{if(version===noteEpoch.current)setLoading(false);}};
  const openNote=async(noteId)=>{if(pending.current.has(noteId)||contents[noteId]?.snapshot)return;pending.current.add(noteId);try{const result=await api.current('teamFileNote',{targetKind,targetId,noteId});setContents(p=>({...p,[noteId]:result.note}));}catch(e){setContents(p=>({...p,[noteId]:{error:e.message||'Could not load the saved transcript.'}}));}finally{pending.current.delete(noteId);}};
  useEffect(()=>{setNotes([]);setContents({});setHasMore(false);setError('');if(request&&targetId)load();return()=>{++noteEpoch.current;};},[targetKind,targetId]);
  if(!request)return null;
  return <section className="team-file-notes"><h3>Team chats saved to Action log</h3>{loading&&<p>Loading saved notes…</p>}{error&&<p role="alert">{error} <button className="btn" type="button" onClick={()=>load()}>Retry</button></p>}{notes.map(n=><details key={n.id} onToggle={e=>{if(e.currentTarget.open)openNote(n.id);}}><summary>{n.title} · {stamp(n.created_at)}</summary><p className="team-chat-help">Saved by {n.saved_by_name} · Internal file note</p>{n.summary&&<p className="team-note-summary">{n.summary}</p>}{!contents[n.id]&&<p>Loading transcript…</p>}{contents[n.id]?.error&&<p role="alert">{contents[n.id].error} <button className="btn" onClick={()=>openNote(n.id)}>Retry</button></p>}{(parse(contents[n.id]?.snapshot)?.messages||[]).map(m=><article key={m.id}><strong>{m.sender_name}</strong><time>{stamp(m.created_at)}</time><p>{m.body}</p></article>)}</details>)}{hasMore&&<button className="btn" type="button" disabled={loading} onClick={()=>load(true)}>Load older file notes</button>}{!loading&&!error&&!notes.length&&<p className="team-chat-help">No team messages have been saved to this file.</p>}</section>;
}
