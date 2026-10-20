/* People and evidence are part of this instruction draft, not the master or CRM record. */
(() => {
  'use strict';
  const esc = escapeHtml;
  const roles = ['Main applicant','Partner','Child','Other'];
  let renderingDoc = '';
  let nextContext = null;
  let importing = false;
  let initialisedKey = '';
  const uid = () => `person-${crypto.randomUUID()}`;
  const nameOf = person => person.name?.trim() || 'Unnamed person';
  const model = () => state.instructionPeopleV51;
  const ids = () => (model()?.people || []).map(person=>person.id);
  const names = selected => (model()?.people || []).filter(p=>(selected || []).includes(p.id)).map(nameOf).join(', ');
  const keyOf = (doc,block) => `${doc}:${block.id}`;
  const mainId = () => model()?.people.find(p=>p.role==='Main applicant')?.id;
  const roleOf = value => /partner|spouse|husband|wife/i.test(value)?'Partner':/child|son|daughter|depend/i.test(value)?'Child':'Other';
  function newModel(client = {}, enabled = false) {
    const mainName = [client.firstName,client.lastName].filter(Boolean).join(' ').trim() || client.preparedFor || '';
    const people = [{id:uid(),role:'Main applicant',name:mainName,dateOfBirth:client.dateOfBirth || ''}];
    const family = Array.isArray(client.familyMembers)?client.familyMembers:[];
    family.forEach(member=>people.push({id:uid(),role:roleOf(member.relationship||member.type||member.role||''),name:member.name||[member.firstName,member.lastName].filter(Boolean).join(' '),dateOfBirth:member.dateOfBirth||''}));
    if (!family.length) {
      if (client.partnerName?.trim()) people.push({id:uid(),role:'Partner',name:client.partnerName.trim(),dateOfBirth:''});
      String(client.children || '').split(/[;\n]+/).map(n=>n.trim()).filter(n=>n&&!/^no (dependent )?children/i.test(n)).forEach(name=>people.push({id:uid(),role:'Child',name,dateOfBirth:''}));
    }
    return {version:1,enabled,people,recipientIds:[people[0].id],introIds:people.map(p=>p.id),introductionNote:'',sectionPeople:{},requirements:{}};
  }
  function ensureModel() {
    if (!model()) state.instructionPeopleV51=newModel(state.client,false);
    const m=model();m.sectionPeople=m.sectionPeople||{};m.requirements=m.requirements||{};
    return m;
  }
  function dirty(preview=true) {
    const status=document.querySelector('#save-status');if(status)status.textContent='Draft not saved';
    if(preview)renderPreview();
    renderReviewNotice();
  }
  function reviewIssues() {
    const m=model();if(!m?.enabled)return [];
    const issues=[];
    if(!m.people.length||m.people.some(p=>!p.name.trim()))issues.push('Give each person a name.');
    if(m.people.filter(p=>p.role==='Main applicant').length!==1)issues.push('Choose one main applicant.');
    if(!m.introIds.length)issues.push('Choose who the introduction covers.');
    if(!m.recipientText?.trim()&&!m.recipientIds.length)issues.push('Choose a recipient or enter a greeting.');
    Object.entries(state.docs||{}).filter(([docId,doc])=>docId==='documents'&&doc.enabled).forEach(([docId,doc])=>{
      (doc.blocks||[]).filter(block=>block.enabled).forEach(block=>{
        const selected=requirements(docId,block).filter(r=>r.enabled);
        if(!selected.length||selected.some(r=>!r.title.trim()||!r.personIds.length))issues.push(`Check documents and people for ${block.title}.`);
      });
    });
    return issues;
  }
  function renderReviewNotice() {
    const host=document.querySelector('#s51-review-notice');if(!host)return;
    const issues=reviewIssues();host.hidden=!issues.length;host.textContent=issues.length?'Before marking ready: '+issues.join(' '):'';
  }
  function syncClientNames() {
    const m=model();if(!m?.enabled)return;
    const main=m.people.find(p=>p.role==='Main applicant');
    if(main){const parts=main.name.trim().split(/\s+/);state.client.firstName=parts.shift()||'';state.client.lastName=parts.join(' ');state.client.preparedFor=main.name.trim();}
    state.client.partnerName=m.people.filter(p=>p.role==='Partner').map(nameOf).join(', ');
    state.client.children=m.people.filter(p=>p.role==='Child').map(nameOf).join('; ');
    state.client.requiredFor=names(m.introIds);
    updateHeaderSummary();
  }
  function choosePeople(selected,scope) {
    return `<div class="s51-person-choices" role="group" aria-label="${esc(scope)}">${model().people.map(person=>`<label><input type="checkbox" data-s51-person="${esc(person.id)}" ${selected.includes(person.id)?'checked':''}><span>${esc(nameOf(person))}<small>${esc(person.role)}</small></span></label>`).join('')}</div>`;
  }
  function bindChoices(host,selected,onChange) {
    host.querySelectorAll('[data-s51-person]').forEach(input=>input.addEventListener('change',()=>{
      const next=selected.filter(id=>id!==input.dataset.s51Person);if(input.checked)next.push(input.dataset.s51Person);
      selected.splice(0,selected.length,...next);onChange?.();dirty();
    }));
  }
  const specifications = {
    identity:[['passport','Passport personal-details page','A clear colour copy of the current passport personal-details page.'],['birth','Full birth certificate','The full certificate showing the recorded birth and parent details.'],['photo','Passport photograph','A recent photograph in the format confirmed for this application.'],['name-change','Name-change or civil-status record','Evidence linking any different names used in the application.']],
    character:[['police','Police certificate','Follow the selected country instructions and the adviser-confirmed requirements.']],
    health:[['medical','Medical evidence','Complete the examinations and provide the evidence confirmed by your adviser.']],
    qualifications:[['award','Qualification certificate','The final award certificate for the qualification relied on.'],['transcript','Academic transcript','The complete subject and results record.']],
    work:[['reference','Employment reference','A reference covering the work relied on for this application.'],['work-record','Supporting work records','The supporting employment records confirmed by your adviser.']],
    relationship:[['relationship','Partnership evidence','The shared relationship evidence confirmed for this application.']],
    custody:[['custody','Custody or consent evidence','The child-specific custody, consent or dependence evidence confirmed by your adviser.']]
  };
  function requirements(doc,block) {
    const m=ensureModel(),key=keyOf(doc,block);
    if(!m.requirements[key]) {
      const specs=specifications[block.id]||[[block.id,block.title,'']];
      const suggested=/custody|birth/.test(block.id)?m.people.filter(p=>p.role==='Child').map(p=>p.id):/work|qualification|employment|skills/.test(block.id)?[mainId()].filter(Boolean):ids();
      m.requirements[key]=specs.map(([id,title,note],index)=>({id:`requirement-${crypto.randomUUID()}`,title,note,enabled:index===0,personIds:index===0?[...suggested]:[]}));
    }
    return m.requirements[key];
  }
  function selectedFor(doc,block) {
    const m=ensureModel(),key=keyOf(doc,block);
    if(!Array.isArray(m.sectionPeople[key]))m.sectionPeople[key]=[...m.introIds];
    return m.sectionPeople[key];
  }
  function removePerson(personId) {
    const m=model(),person=m.people.find(p=>p.id===personId);
    if(!confirm(`Remove ${nameOf(person)} from this instruction set and its document selections?`))return;
    m.people=m.people.filter(p=>p.id!==personId);
    [m.recipientIds,m.introIds,...Object.values(m.sectionPeople),...Object.values(m.requirements).flat().map(r=>r.personIds)].forEach(list=>{for(let i=list.length-1;i>=0;i--)if(list[i]===personId)list.splice(i,1);});
    syncClientNames();dirty(false);renderAll();
  }
  function renderPeople() {
    const m=ensureModel(),host=document.querySelector('#client-form');if(!host)return;
    document.querySelectorAll('#s51-people,.roadmap-data-note-v156').forEach(node=>node.remove());
    host.insertAdjacentHTML('beforebegin',`<section id="s51-people" class="s51-people"><div class="s51-heading"><div><h3>People in this instruction set</h3><p>Confirm the people first, then choose who needs each document. Changes here stay in this draft.</p></div></div>${!m.enabled?'<div class="s51-legacy"><strong>This saved guide keeps its existing output.</strong><p>Review the people below, then choose Use people-based guide to add named introductions and document assignments. Existing wording stays saved.</p><button type="button" class="button button-primary" id="s51-enable">Use people-based guide</button></div>':''}<div class="s51-people-list">${m.people.map(p=>`<div class="s51-person-card" data-person-card="${esc(p.id)}"><label>Full name<input type="text" data-person-field="name" value="${esc(p.name)}" autocomplete="off"></label><label>Role<select data-person-field="role">${roles.map(role=>`<option ${p.role===role?'selected':''}>${esc(role)}</option>`).join('')}</select></label><label>Date of birth <small>(optional)</small><input type="date" data-person-field="dateOfBirth" value="${esc(p.dateOfBirth)}"></label><button type="button" class="s51-remove" data-remove-person="${esc(p.id)}" aria-label="Remove ${esc(nameOf(p))}">Remove</button></div>`).join('')}</div><div class="s51-add-people">${['Partner','Child','Other'].map(role=>`<button type="button" class="button button-secondary" data-add-person="${role}">+ Add ${role==='Other'?'another person':role.toLowerCase()}</button>`).join('')}</div><p class="s51-note" id="s51-change-note" role="status">Names are taken from the linked client/family details where available. Check them before continuing.</p><div class="s51-recipient"><h3>Who receives the instructions?</h3><p>This controls the greeting. It is separate from who is included in the application.</p>${choosePeople(m.recipientIds,'Instruction recipients')}<label class="s51-recipient-custom">Or use a greeting of your own<input type="text" id="s51-recipient-text" value="${esc(m.recipientText||'')}" placeholder="For example: Amelia and James"></label></div><button type="button" class="button button-primary" id="s51-continue">Continue to introduction →</button></section>`);
    const root=document.querySelector('#s51-people');
    root.querySelector('#s51-enable')?.addEventListener('click',()=>{m.enabled=true;syncClientNames();dirty(false);renderAll();});
    root.querySelectorAll('[data-person-field]').forEach(input=>input.addEventListener('input',()=>{
      const person=m.people.find(p=>p.id===input.closest('[data-person-card]').dataset.personCard);person[input.dataset.personField]=input.value;
      if(input.dataset.personField==='role'&&input.value==='Main applicant')m.people.filter(p=>p.id!==person.id&&p.role==='Main applicant').forEach(p=>p.role='Other');
      syncClientNames();dirty();
    }));
    root.querySelectorAll('[data-person-field]').forEach(input=>input.addEventListener('change',()=>{renderPeople();renderEditor();}));
    root.querySelectorAll('[data-remove-person]').forEach(button=>button.addEventListener('click',()=>removePerson(button.dataset.removePerson)));
    root.querySelectorAll('[data-add-person]').forEach(button=>button.addEventListener('click',()=>{
      const p={id:uid(),name:'',role:button.dataset.addPerson,dateOfBirth:''};m.people.push(p);m.introIds.push(p.id);dirty(false);renderPeople();renderEditor();renderPreview();
      const card=document.querySelector(`[data-person-card="${p.id}"]`);card?.querySelector('input')?.focus();document.querySelector('#s51-change-note').textContent='Person added. Check their name and review the document selections; existing requirements have not been assigned automatically.';
    }));
    bindChoices(root.querySelector('.s51-recipient'),m.recipientIds);
    root.querySelector('#s51-recipient-text').addEventListener('input',e=>{m.recipientText=e.target.value;dirty();});
    root.querySelector('#s51-continue').addEventListener('click',()=>{if(!m.enabled){m.enabled=true;syncClientNames();dirty(false);}go('intro');});
    // One source for names: administrative fields remain available for everything else.
    host.querySelectorAll('[data-client-key]').forEach(input=>{if(['firstName','lastName','preparedFor','partnerName','children','requiredFor'].includes(input.dataset.clientKey))input.closest('.form-section')?.setAttribute('hidden','');});
    const header=document.querySelector('#tab-client .selected-document-header');if(header)header.innerHTML='<span class="eyebrow">Step 1</span><h2>People & details</h2><p>Add the main applicant and anyone else this instruction set needs to cover.</p>';
  }
  function go(step) {
    if(step==='preview'){document.querySelector('[data-calm-mode="preview"]')?.click();renderPreview();renderSteps();return;}
    document.querySelector('[data-calm-mode="edit"]')?.click();
    if(step==='people')document.querySelector('.editor-tab[data-tab="client"]')?.click();
    else if(step==='settings')document.querySelector('.editor-tab[data-tab="pack"]')?.click();
    else {const target=step==='documents'?'documents':'roadmap';if(state.docs[target]){state.selectedDoc=target;state.docs[target].enabled=true;}document.querySelector('.editor-tab[data-tab="content"]')?.click();renderAll();}
    renderSteps();document.querySelector('.editor-panel')?.scrollTo({top:0});
  }
  function renderSteps() {
    let nav=document.querySelector('#s51-workflow');if(!nav){nav=document.createElement('nav');nav.id='s51-workflow';nav.className='s51-workflow';nav.setAttribute('aria-label','Instruction steps');document.querySelector('.editor-tabs')?.before(nav);}
    const current=document.body.classList.contains('calm-mode-preview')?'preview':document.querySelector('#tab-client.active')?'people':document.querySelector('#tab-pack.active')?'settings':state.selectedDoc==='roadmap'?'intro':'documents';
    nav.innerHTML=[['people','People'],['intro','Introduction'],['documents','Documents'],['preview','Preview']].map(([step,label],i)=>`<button type="button" data-s51-step="${step}" ${current===step?'aria-current="step"':''}><span>${i+1}</span>${label}</button>`).join('');
    nav.insertAdjacentHTML('beforeend',`<button type="button" class="s51-settings-step" data-s51-step="settings" ${current==='settings'?'aria-current="step"':''}>Guide settings</button>`);
    nav.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>go(button.dataset.s51Step)));
    if(!document.querySelector('#s51-review-notice')){const notice=document.createElement('div');notice.id='s51-review-notice';notice.className='s51-review-notice';notice.setAttribute('role','status');nav.after(notice);}renderReviewNotice();
    const next=document.querySelector('.calm-studio-next');if(next)next.textContent=current==='people'?'Next: Introduction →':current==='intro'?'Next: Documents →':'Review document →';
    const tab=document.querySelector('.editor-tab[data-tab="client"]');if(tab){tab.textContent='People & details';tab.parentElement.prepend(tab);}
  }
  function renderIntroControls() {
    document.querySelector('#s51-intro-controls')?.remove();if(state.selectedDoc!=='roadmap')return;
    const m=ensureModel(),header=document.querySelector('#tab-content .selected-document-header');
    header?.insertAdjacentHTML('afterend',`<section id="s51-intro-controls" class="s51-scope"><h3>Who does this introduction cover?</h3><p>Select the applicants to name in this guide. The recipients are set in People & details.</p>${choosePeople(m.introIds,'People covered by introduction')}<label>Optional introduction note<textarea id="s51-intro-note" rows="3" placeholder="Add any family-specific context">${esc(m.introductionNote)}</textarea></label>${!m.enabled?'<small>Use Continue to introduction in People & details to enable the named layout.</small>':''}</section>`);
    const root=document.querySelector('#s51-intro-controls');if(!root)return;
    bindChoices(root,m.introIds,()=>{syncClientNames();});root.querySelector('textarea').addEventListener('input',e=>{m.introductionNote=e.target.value;dirty();});
    document.querySelectorAll('[data-roadmap-section-index]').forEach(row=>{
      const block=state.docs.roadmap.blocks[Number(row.dataset.roadmapSectionIndex)];if(!block)return;
      const selected=selectedFor('roadmap',block);const detail=document.createElement('details');detail.className='s51-section-scope';detail.innerHTML=`<summary>Applies to: ${esc(names(selected)||'Choose people')}</summary>${choosePeople(selected,'People for '+block.title)}`;row.after(detail);
      bindChoices(detail,selected,()=>{detail.querySelector('summary').textContent='Applies to: '+(names(selected)||'Choose people');});
    });
  }
  function renderRequirements() {
    if(state.selectedDoc!=='documents')return;
    const docId=state.selectedDoc,doc=state.docs[docId];if(!doc)return;
    document.querySelectorAll('#block-editor [data-block-index]').forEach(input=>{
      const block=doc.blocks[Number(input.dataset.blockIndex)],row=input.closest('.block-row');if(!block||!row)return;
      const list=requirements(docId,block),detail=document.createElement('details');detail.className='s51-requirements';detail.dataset.s51Block=block.id;
      detail.innerHTML=`<summary>Documents & people <span>${list.filter(r=>r.enabled).length} selected</span></summary><p class="s51-note">Select only the documents needed, then choose the people for each. These are drafting suggestions for adviser review.</p><div class="s51-requirement-list">${list.map(r=>`<div class="s51-requirement" data-requirement="${esc(r.id)}"><label class="s51-requirement-toggle"><input type="checkbox" data-enable-requirement ${r.enabled?'checked':''}><strong>${esc(r.title)}</strong></label><div class="s51-requirement-fields" ${!r.enabled?'hidden':''}><label>Document name<input type="text" data-requirement-title value="${esc(r.title)}"></label><span class="s51-field-label">Required for</span>${choosePeople(r.personIds,'Required for '+r.title)}<label>Instructions / person-specific note<textarea rows="2" data-requirement-note>${esc(r.note)}</textarea></label><button type="button" class="s51-remove" data-remove-requirement>Remove document</button></div></div>`).join('')}</div><button type="button" class="button button-secondary" data-add-requirement>+ Add document</button>`;
      (row.closest('.block-row-stack')||row).after(detail);
      detail.querySelectorAll('[data-requirement]').forEach(item=>{
        const r=list.find(r=>r.id===item.dataset.requirement);
        item.querySelector('[data-enable-requirement]').addEventListener('change',e=>{r.enabled=e.target.checked;if(r.enabled)block.enabled=true;input.checked=block.enabled;item.querySelector('.s51-requirement-fields').hidden=!r.enabled;detail.querySelector('summary span').textContent=list.filter(r=>r.enabled).length+' selected';dirty();renderDocumentLists();});
        bindChoices(item,r.personIds);
        item.querySelector('[data-requirement-title]').addEventListener('input',e=>{r.title=e.target.value;item.querySelector('strong').textContent=e.target.value;dirty();});
        item.querySelector('[data-requirement-note]').addEventListener('input',e=>{r.note=e.target.value;dirty();});
        item.querySelector('[data-remove-requirement]').addEventListener('click',()=>{list.splice(list.indexOf(r),1);dirty(false);renderEditor();renderPreview();document.querySelector(`[data-s51-block="${block.id}"]`)?.setAttribute('open','');});
      });
      detail.querySelector('[data-add-requirement]').addEventListener('click',()=>{list.push({id:`requirement-${crypto.randomUUID()}`,title:'Additional document',note:'',enabled:true,personIds:[]});block.enabled=true;dirty(false);renderEditor();renderDocumentLists();renderPreview();const next=document.querySelector(`[data-s51-block="${block.id}"]`);next?.setAttribute('open','');next?.querySelector('.s51-requirement:last-child [data-requirement-title]')?.focus();});
    });
  }
  const oldRenderAll=renderAll;
  renderAll=function(){ensureModel();syncClientNames();oldRenderAll();renderSteps();};
  const oldClientForm=renderClientForm;
  renderClientForm=function(){oldClientForm();renderPeople();};
  const oldEditor=renderEditor;
  renderEditor=function(){const expanded=[...document.querySelectorAll('.s51-requirements[open]')].map(node=>node.dataset.s51Block);oldEditor();document.querySelectorAll('.s51-requirements,.s51-section-scope,.s51-output-mode').forEach(node=>node.remove());renderIntroControls();renderRequirements();document.querySelectorAll('.s51-requirements').forEach(node=>{if(expanded.includes(node.dataset.s51Block))node.open=true;});if(!model()?.enabled){const notice=document.createElement('div');notice.className='s51-output-mode s51-legacy';notice.innerHTML='<strong>This guide keeps its existing output.</strong><p>Enable the people-based layout to include the selections below in the introduction and documentation guide.</p><button type="button" class="button button-secondary">Use people-based guide</button>';document.querySelector('#tab-content .selected-document-header')?.after(notice);notice.querySelector('button').addEventListener('click',()=>{model().enabled=true;syncClientNames();dirty(false);renderAll();});}renderSteps();};
  const oldIntro=editedIntroParagraphsV14;
  editedIntroParagraphsV14=function(doc){const original=oldIntro(doc);if(!model()?.enabled||window.__THIS_TEMPLATE_PREVIEW_V156__||!['roadmap','documents'].includes(renderingDoc))return original;const m=model();return `<div class="s51-generated s51-introduction"><strong>${m.introIds.length>1?'Your instruction guide — people included':'Your instruction guide'}</strong><div>This guide covers ${esc(names(m.introIds)||'the applicants to be confirmed')}.</div>${m.introductionNote?`<div class="s51-intro-person-note">${esc(m.introductionNote).replace(/\n/g,'<br>')}</div>`:''}</div>`+original;};
  function noteParts(note) {
    let remaining=String(note||'');const parts=[];
    while(remaining.length>1100){let cut=remaining.lastIndexOf(' ',1100);if(cut<500)cut=1100;parts.push(remaining.slice(0,cut));remaining=remaining.slice(cut).trimStart();}
    if(remaining)parts.push(remaining);return parts.length?parts:[''];
  }
  const oldBlock=genericBlockHtmlV13;
  genericBlockHtmlV13=function(block,plan,doc){
    if(!model()?.enabled||renderingDoc!=='documents'||window.__THIS_TEMPLATE_PREVIEW_V156__)return oldBlock(block,plan,doc);
    const selected=requirements(renderingDoc,block).filter(r=>r.enabled);
    const bodyTemplate=document.createElement('template');bodyTemplate.innerHTML=oldBlock(block,plan,doc);
    bodyTemplate.content.querySelectorAll('.required-for,.confirmed-requirement').forEach(node=>node.remove());
    const heading=bodyTemplate.content.querySelector('.number-heading')?.outerHTML||headingMarkupV13(plan.setting,plan.number,block.title,plan.defaultMode);
    // Identity has item-level requirements; the old blanket list would contradict them.
    const source=block.id==='identity'&&!block.clientTailoredV01743&&!block.customSectionV01743&&!block.sourceModuleIdV01743?`${heading}<div class="s51-generated">Provide the identity records selected below, for the people named against each item.</div>`:bodyTemplate.content.firstElementChild?.innerHTML||bodyTemplate.innerHTML;
    const items=selected.flatMap(r=>noteParts(r.note).map((part,index)=>`<div class="s51-generated s51-evidence-item"><strong>${esc(r.title||'Document')}${index?' — continued':''}</strong><div class="s51-required-for">Required for: <b>${esc(names(r.personIds)||'Adviser to confirm')}</b></div>${part?`<div>${esc(part).replace(/\n/g,'<br>')}</div>`:''}</div>`)).join('');
    return flowSection(source+items+(!selected.length?'<div class="s51-generated s51-assignment-warning">Document selections need adviser review.</div>':''));
  };
  const oldRenderDoc=renderDocHtml;
  function paginateEvidence(html,doc) {
    const template=document.createElement('template');template.innerHTML=html;
    const pages=[...template.content.querySelectorAll('.pdf-page')],prefix=[],fragments=[];
    pages.forEach(page=>{
      if(page.matches('.pdf-cover,.application-glance-page')){prefix.push(page.outerHTML);return;}
      [...page.querySelector('.pdf-page-inner').children].forEach(section=>{
        const items=[...section.querySelectorAll(':scope>.s51-evidence-item')];
        if(!items.length){fragments.push(section.outerHTML);return;}
        const body=section.cloneNode(true);body.querySelectorAll(':scope>.s51-evidence-item').forEach(item=>item.remove());
        body.append(items.shift().cloneNode(true));fragments.push(body.outerHTML);items.forEach(item=>fragments.push(flowSection(item.outerHTML)));
      });
    });
    const measure=document.createElement('div');measure.className='s51-measure';measure.style.cssText='position:absolute;left:-20000px;top:0;width:794px;visibility:hidden;pointer-events:none;';document.body.append(measure);
    const output=[];let group=[],pageNo=prefix.filter(p=>!p.includes('pdf-cover')).length+1;
    const fits=()=>{measure.innerHTML=pageShell(group.join(''),pageNo,doc.label);const page=measure.firstElementChild;page.style.cssText='width:794px!important;min-height:1118px!important;height:auto!important;max-width:794px!important;';return page.querySelector('.pdf-page-inner').offsetHeight<=1070;};
    try {fragments.forEach(fragment=>{group.push(fragment);if(group.length>1&&!fits()){group.pop();output.push(pageShell(group.join(''),pageNo++,doc.label));group=[fragment];}});if(group.length)output.push(pageShell(group.join(''),pageNo,doc.label));return [...prefix,...output].join('');}
    finally {measure.remove();}
  }
  renderDocHtml=function(id){
    if(!model()?.enabled||window.__THIS_TEMPLATE_PREVIEW_V156__)return oldRenderDoc(id);
    const previous=renderingDoc;renderingDoc=id;
    const doc=state.docs[id],originalBlocks=doc.blocks;
    try {
      if(id==='roadmap')doc.blocks=originalBlocks.map(block=>{
        const selected=selectedFor(id,block);if(selected.length===model().introIds.length&&selected.every(p=>model().introIds.includes(p)))return block;
        const source=block.templateHtml??block.html??'';
        return {...block,templateHtml:source+`<div class="s51-generated s51-applies-to">Applies to: <strong>${esc(names(selected)||'Adviser to confirm')}</strong></div>`};
      });
      const html=oldRenderDoc(id);return ['roadmap','documents'].includes(id)?paginateEvidence(html,doc):html;
    } finally {doc.blocks=originalBlocks;renderingDoc=previous;}
  };
  window.THIS_INSTRUCTION_GREETING=()=>model()?.enabled?(model().recipientText?.trim()||names(model().recipientIds)||'Client'):'';
  // The direct bridge and the message fallback both import only administrative people facts.
  function prepareInit(payload){nextContext=payload;importing=true;}
  function finishInit(payload){
    const saved=payload.instructionSet?.studioState;
    const savedPack=saved?.packState||saved?.workspaceDrafts?.[activePackId];
    if(!savedPack?.instructionPeopleV51)state.instructionPeopleV51=newModel(payload.client||state.client,!savedPack);
    else state.instructionPeopleV51=structuredClone(savedPack.instructionPeopleV51);
    importing=false;syncClientNames();renderAll();
    if(!savedPack)go('people');
    initialisedKey=String(payload.instructionSet?.id||payload.client?.id||'standalone');
    nextContext=null;
  }
  const oldInit=window.__THIS_STUDIO_INIT__;
  if(oldInit)window.__THIS_STUDIO_INIT__=payload=>{const key=String(payload.instructionSet?.id||payload.client?.id||'standalone');if(initialisedKey===key&&!payload.force)return;prepareInit(payload);const result=oldInit(payload);finishInit(payload);return result;};
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='THIS_STUDIO_INIT')return;
    const payload=event.data.payload||{};if(initialisedKey===String(payload.instructionSet?.id||payload.client?.id||'standalone')&&!payload.force)return;prepareInit(payload);setTimeout(()=>{if(nextContext===payload)finishInit(payload);},25);
  });
  document.addEventListener('change',event=>{if(event.target.id==='pack-selector'&&!importing&&model()){const {people,recipientIds,recipientText,introIds,introductionNote,enabled}=structuredClone(model());queueMicrotask(()=>{const existing=model()||newModel({},enabled);state.instructionPeopleV51={...existing,people,recipientIds,recipientText,introIds,introductionNote,enabled};const allowed=new Set(people.map(p=>p.id));[...Object.values(model().sectionPeople),...Object.values(model().requirements).flat().map(r=>r.personIds)].forEach(list=>{for(let i=list.length-1;i>=0;i--)if(!allowed.has(list[i]))list.splice(i,1);});syncClientNames();renderAll();});}},true);
  document.addEventListener('click',event=>{if(event.target.closest('.editor-tab,[data-calm-mode]'))queueMicrotask(renderSteps);});
  document.addEventListener('click',event=>{if(!event.target.closest('.calm-studio-next'))return;event.preventDefault();event.stopImmediatePropagation();const current=document.querySelector('#s51-workflow [aria-current]')?.dataset.s51Step;go(current==='people'?'intro':current==='intro'?'documents':'preview');},true);
  document.addEventListener('click',event=>{if(!event.target.closest('#publish-pack,#confirm-publish'))return;const issues=reviewIssues();if(issues.length){event.preventDefault();event.stopImmediatePropagation();renderReviewNotice();showToast('Check the people and document selections before marking ready.');document.querySelector('#s51-review-notice')?.scrollIntoView({block:'nearest'});}},true);
  document.body.classList.add('s51-people-workspace');
  renderAll();
})();
