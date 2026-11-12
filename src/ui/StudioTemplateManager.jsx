import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, FileCheck2, X } from 'lucide-react';

export default function StudioTemplateManager({ instructionTemplateLibrary, agreementTemplateLibrary, canManageTemplates, saveInstructionTemplateLibrary, saveAgreementTemplateLibrary }) {
  const [kind,setKind]=useState(''),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const frame=useRef(null),session=useRef(0),started=useRef(null);
  const callbacks=useRef({});callbacks.current={instructions:saveInstructionTemplateLibrary,agreement:saveAgreementTemplateLibrary};
  useEffect(()=>{
    if(!kind)return;
    const generation=++session.current;
    const handler=event=>{
      if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
      const m=event.data||{};
      if(m.type==='THIS_LIBRARY_MANAGER_CLOSED'){setKind('');return;}
      if(m.type!=='THIS_BLOCK_LIBRARY_REQUEST'||m.source!==(kind==='instructions'?'this-instructions-studio':'this-agreement-studio'))return;
      const target=event.source;
      Promise.resolve().then(()=>callbacks.current[kind](null,null,m.request)).then(result=>{
        if(session.current===generation)target.postMessage({type:'THIS_BLOCK_LIBRARY_RESULT',requestId:m.requestId,result},location.origin);
      }).catch(err=>{if(session.current===generation)target.postMessage({type:'THIS_BLOCK_LIBRARY_RESULT',requestId:m.requestId,error:err.message||'Library request failed'},location.origin);});
    };
    window.addEventListener('message',handler);
    const timer=setTimeout(()=>{if(!started.current)setError('The template editor could not load. Please reload it.');},20000);
    return()=>{++session.current;clearTimeout(timer);window.removeEventListener('message',handler);};
  },[kind,attempt]);
  async function initialise(){
    const win=frame.current?.contentWindow;if(!win||started.current===win)return;
    try{
      if(!win.THIS_STUDIO_LIBRARY83||!win.THIS_STUDIO_BLOCK_ADAPTER83)throw Error('The template editor could not load. Please reload it.');
      started.current=win;
      const record={id:'template-manager-'+kind,title:'Template management',packId:'smc',appType:'smc',status:'Draft',studioState:{}};
      const payload={managementOnly:true,canManageTemplates,templateLibrary:kind==='instructions'?instructionTemplateLibrary:agreementTemplateLibrary,advisers:[],client:null,...(kind==='instructions'?{instructionSet:record}:{agreementSet:record})};
      const init=kind==='instructions'?win.__THIS_STUDIO_INIT__:win.__THIS_AGREEMENT_INIT__;
      if(typeof init!=='function')throw Error('The template editor could not initialise. Please reload it.');
      init(payload);
      await win.THIS_STUDIO_LIBRARY83.init(payload);
      await win.THIS_STUDIO_LIBRARY83.open('masters');
      if(frame.current?.contentWindow===win){setReady(true);setError('');}
    }catch(err){if(frame.current?.contentWindow===win)setError(err.message||'Template editor could not load.');}
  }
  function open(next){started.current=null;setReady(false);setError('');setKind(next);}
  function close(){const library=frame.current?.contentWindow?.THIS_STUDIO_LIBRARY83;if(library&&ready)library.close();else setKind('');}
  return <section className="studio-template-manager">
    <div className="detail-header"><div><h1>Templates &amp; blocks</h1><p>Edit reusable content before opening a client document.</p></div></div>
    <p className="studio-template-help"><strong>Save draft</strong> keeps changes for review. <strong>Publish</strong> makes the updated master the starting point for new documents of that application type. Existing client drafts keep their tailored wording. Team and personal blocks can be added as needed.</p>
    <div className="studio-launch-grid">
      <section className="studio-launch-card"><FileCheck2 size={25}/><h2>Agreement templates</h2><p>Maintain introductions, agreement sections, services and payment-stage wording for each application type.</p><button className="btn dark" onClick={()=>open('agreement')}>Manage agreement templates</button></section>
      <section className="studio-launch-card"><BookOpen size={25}/><h2>Instructions templates</h2><p>Maintain road maps, documentation guides, sign-offs and reusable guidance blocks.</p><button className="btn dark" onClick={()=>open('instructions')}>Manage instructions templates</button></section>
    </div>
    {!canManageTemplates&&<p>Administrators publish shared master templates and team blocks. You can view them and manage your personal blocks where your account permits.</p>}
    {kind&&<div className="studio-template-overlay" role="dialog" aria-modal="true" aria-label="Template library manager"><header><div><strong>{kind==='instructions'?'Instructions':'Agreement'} templates &amp; blocks</strong><small>Library management · no client document open</small></div><button className="btn" onClick={close}><X size={17}/>Close library</button></header>
      {!ready&&!error&&<p role="status">Opening template library…</p>}
      {error&&<div role="alert" className="error-banner"><span>{error}</span><button className="btn" onClick={()=>{started.current=null;setReady(false);setError('');setAttempt(x=>x+1);}}>Reload editor</button></div>}
      <iframe key={kind+attempt} ref={frame} title={kind==='instructions'?'Instructions template library':'Agreement template library'} src={'/'+(kind==='instructions'?'instructions-studio.html':'agreement-studio.html')+'?library=1&v=0.17.95'} onLoad={initialise} style={{visibility:ready?'visible':'hidden'}} />
    </div>}
  </section>;
}
