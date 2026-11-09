(() => {
  const clone = x => structuredClone(x);
  const clean = x => window.THIS_STUDIO_LIBRARY83.clean(x);
  const text = html => {const el=document.createElement('div');el.innerHTML=clean(html);return el.textContent.trim();};
  const uid = () => `reusable-${crypto.randomUUID()}`;
  let legacyMaster = null, captureOverride = null;
  function master(category) {
    const base=legacyDefaultState();priorSuggestions(base,category);
    const source=legacyMaster||base;
    return {title:APP_TYPES[category]?.title||category,settings:Object.fromEntries(['adminFee','gstTreatment','hourlyRate','interestRate'].map(key=>[key,source.template?.[key]||base.template[key]||''])),docs:{
      agreement:{label:'Agreement sections',coverTitle:source.template?.coverHeading||'AGREEMENT',coverSubtitle:APP_TYPES[category]?.title||category,intro:(source.sections||base.sections).find(s=>s.id==='introduction')?.body||'',blocks:(source.sections||base.sections).filter(s=>s.id!=='introduction').map(s=>({id:s.id,title:s.title,note:s.note,enabled:s.enabled,html:s.body,numberMode:s.numberMode,manualNumber:s.manualNumber}))},
      services:{label:'Scope of services',coverTitle:'Scope of services',intro:'',blocks:base.scope.map((s,i)=>({id:s.id,title:serviceSuggestions(category)[i]?.title||'Service',html:`<p>${esc(s.text)}</p>`,enabled:s.enabled}))},
      payments:{label:'Professional payment stages',coverTitle:'Professional payment stages',intro:'',blocks:base.professionalFees.map((s,i)=>({id:s.id,title:s.description,html:`<p>${esc(s.trigger)}</p>`,enabled:true,serviceIds:s.scopeIds||[]}))}
    }};
  }
  function putMaster(target,m,services=true) {
    if(!m?.docs)return;
    if(m.settings)for(const key of ['adminFee','gstTreatment','hourlyRate','interestRate'])if(m.settings[key])target.template[key]=m.settings[key];
    const d=m.docs.agreement;
    if(d){
      const custom=(target.sections||[]).filter(s=>s.reusable83);
      const opening={...(target.sections.find(s=>s.id==='introduction')||CORE_SECTIONS.find(s=>s.id==='introduction')),body:clean(d.intro||''),enabled:true,numberMode:'auto',manualNumber:'1'};
      target.sections=[opening,...(d.blocks||[]).map((b,i)=>({id:b.id,title:b.title,note:b.note||'',enabled:b.enabled!==false,body:clean(b.html??b.templateHtml??''),numberMode:b.numberMode||'auto',manualNumber:b.manualNumber||String(i+2)}))];
      custom.forEach(s=>{if(!target.sections.some(x=>x.id===s.id))target.sections.push(s);});
      target.template.coverHeading=d.coverTitle||target.template.coverHeading;target.template.coverSubtitle=d.coverSubtitle||target.template.coverSubtitle;
    }
    if(services&&m.docs.services){target.scope=m.docs.services.blocks.filter(b=>b.enabled!==false).map(b=>({id:b.id,text:text(b.html),enabled:true}));}
    if(services&&m.docs.payments){target.professionalFees=m.docs.payments.blocks.filter(b=>b.enabled!==false).map(b=>({id:b.id,description:b.title,trigger:text(b.html),amount:'',scopeIds:(b.serviceIds||[]).filter(id=>target.scope.some(s=>s.id===id))}));}
    normaliseMandatoryAgreementContent(target);
  }
  function fill(html) {
    const values={preparedFor:fullClient(),firstName:(state.client.clientName||'').split(' ')[0],agreedPathway:currentType().title};
    return clean(html).replace(/\{\{(preparedFor|firstName|agreedPathway)\}\}/g,(_,key)=>esc(values[key]));
  }
  function capture() {
    const s=state.sections.find(x=>x.id===state.selectedSection);if(!s)return null;
    const value=captureOverride||{title:s.title,note:s.note||'',html:s.body,kind:'section'};captureOverride=null;
    let html=value.html;
    const names=[[state.client.clientName,'{{preparedFor}}'],[state.client.partnerName,'[Partner name]'],[state.client.clientEmail,'[Client email]'],[state.client.matterRef,'[Matter reference]']];
    names.filter(([v])=>v?.length>1).sort((a,b)=>b[0].length-a[0].length).forEach(([v,to])=>{html=html.split(esc(v)).join(to).split(v).join(to);});
    return {...value,html:clean(html),category:state.appType,requests:[]};
  }
  window.THIS_STUDIO_BLOCK_ADAPTER83={
    studio:'agreement',settings:[['adminFee','Office administration charge'],['gstTreatment','GST treatment'],['hourlyRate','Additional work rate'],['interestRate','Overdue interest']],masterContentOnly:['services','payments'],kinds:['section','introduction','service','payment'],category:()=>state.appType,
    categories:()=>Object.entries(APP_TYPES).map(([id,c])=>({id,title:c.title})),toolbar:()=>document.querySelector('.topbar .actions'),
    context:payload=>{legacyMaster=payload.templateLibrary?.masterState||null;},
    fingerprint:()=>JSON.stringify(state),isNew:payload=>!payload.agreementSet?.studioState?.sections&&!payload.agreementSet?.studioState?.state,
    locked:()=>isLockedIssuedStatus(state.status),notify:toast,master,capture,
    applyMessage:'Replace agreement sections, scope and professional payment stages with the published template? Client details and signatures are retained, custom blocks are kept, and fee amounts will be cleared for review. Issued agreements cannot be changed.',
    applyPublished:(masters,newOnly)=>{
      if(isLockedIssuedStatus(state.status))throw new Error('Issued agreements are preserved. Create a new draft to apply a template.');
      const entry=masters?.[state.appType],m=entry?.published;if(!m)return;putMaster(state,m);state.studioMaster83={category:state.appType,version:entry.versions.at(-1)?.label||'',publishedAt:entry.publishedAt};state.template.version=state.studioMaster83.version||state.template.version;dirty();renderAll();
    },
    insert:async item=>{
      if(!editableServices())throw new Error('Issued agreements cannot be changed.');
      if(item.kind==='service')state.scope.push({id:uid(),text:text(item.html),enabled:true});
      else if(item.kind==='payment')state.professionalFees.push({id:uid(),description:item.title,trigger:text(item.html),amount:'',scopeIds:[]});
      else if(item.kind==='introduction'){
        if(!(await window.THIS_DIALOG.confirm({message:'Replace this agreement’s introduction with the selected reusable block?'})))return false;
        const intro=state.sections.find(x=>x.id==='introduction');if(intro)intro.body=clean(item.html);
      }else{
        const id=uid(),at=state.sections.findIndex(x=>x.id===state.selectedSection);
        state.sections.splice(at+1,0,{id,title:item.title,note:item.note||'',body:clean(item.html),enabled:true,numberMode:'auto',manualNumber:'',reusable83:true});state.selectedSection=id;
      }
      dirty();renderAll();
    }
  };
  // New category suggestions use the published service/payment master. Existing
  // agreements remain untouched unless the adviser deliberately loads suggestions.
  const priorSuggestions=applyServiceSuggestions;
  applyServiceSuggestions=function(next,type){priorSuggestions(next,type);const m=window.THIS_STUDIO_LIBRARY83?.published(type);if(m)putMaster(next,{docs:{services:m.docs.services,payments:m.docs.payments}});return next;};
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-reuse-scope83],[data-reuse-payment83]');if(!b)return;
    if(isLockedIssuedStatus(state.status)){toast('Issued agreements are preserved.');return;}
    if(b.hasAttribute('data-reuse-scope83')){const r=state.scope[+b.dataset.reuseScope83];captureOverride={title:'Reusable service',html:`<p>${esc(r.text)}</p>`,kind:'service'};}
    else{const r=state.professionalFees[+b.dataset.reusePayment83];captureOverride={title:r.description,html:`<p>${esc(r.trigger)}</p>`,kind:'payment'};}
    window.THIS_STUDIO_LIBRARY83.capture();
  });
})();
