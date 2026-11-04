/* Adviser block workspace. Uses the existing draft model, CRM bridge and PDF renderer. */
(() => {
  'use strict';
  const esc = escapeHtml;
  const uid = () => crypto.randomUUID();
  let mounted = false, previewTimer = 0, initTimer = 0, contextKey = '', pendingInit = false;
  let view = 'edit', libraryFilter = 'all', librarySearch = '', libraryItems = [];
  const doc = () => state.docs[state.selectedDoc];
  const meta = () => (state.builder72 ||= {version:1, selected:{}, originals:{}});
  const people = () => state.instructionPeopleV51;
  const selection = () => meta().selected?.[state.selectedDoc] || 'intro';
  const block = () => (doc().blocks || []).find(b => b.id === selection());
  const node = id => document.getElementById(id);
  const name = () => fullName();

  function safeHtml(value) {
    const t = document.createElement('template'); t.innerHTML = String(value || '');
    const allowed = new Set(['P','DIV','BR','B','STRONG','I','EM','U','UL','OL','LI','H3','H4','BLOCKQUOTE','A','SPAN','TABLE','THEAD','TBODY','TR','TD','TH','HR']);
    [...t.content.querySelectorAll('*')].forEach(e => {
      if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','INPUT','BUTTON','FORM','SVG'].includes(e.tagName)) { e.remove(); return; }
      if (!allowed.has(e.tagName)) { e.replaceWith(...e.childNodes); return; }
      [...e.attributes].forEach(a => {
        if (a.name === 'class' && /^[\w\s-]+$/.test(a.value)) return;
        if (e.tagName === 'A' && a.name === 'href' && /^(https?:|mailto:)/i.test(a.value)) return;
        if (['TD','TH'].includes(e.tagName) && ['colspan','rowspan'].includes(a.name) && /^\d{1,2}$/.test(a.value)) return;
        e.removeAttribute(a.name);
      });
    });
    return t.innerHTML;
  }
  function markDirty(preview = true) {
    node('save-status').textContent = 'Draft not saved';
    if (preview) { clearTimeout(previewTimer); previewTimer = setTimeout(() => { renderPreview(); updateReview(); }, 180); }
  }
  function flush() { clearTimeout(previewTimer); renderPreview(); renderOutputSummary(); updateReview(); }
  function setSelection(id) { meta().selected ||= {}; meta().selected[state.selectedDoc] = id; }
  function setView(next) {
    view = next;
    document.body.classList.toggle('ib72-preview', view === 'preview');
    document.body.classList.toggle('ib72-split', view === 'split');
    document.querySelectorAll('[data-ib-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ibView === view)));
    if (view !== 'edit') flush();
    window.dispatchEvent(new Event('resize'));
  }
  function introSource() {
    const d=doc();if(d.builder72RichIntro)return safeHtml(fillTemplate(d.intro || ''));
    return String(d.intro || '').split(/\n\s*\n/).filter(Boolean).map((text,index)=>'<p>'+(d.directEdits?.intro?.['paragraph-'+index] ?? v12SafeClientHtml(fillTemplate(text)))+'</p>').join('');
  }
  function updateName(value) {
    const parts = value.trim().split(/\s+/); state.client.firstName = parts.shift() || ''; state.client.lastName = parts.join(' ');
    state.client.preparedFor = value.trim();
    const main = people()?.people?.find(p => p.role === 'Main applicant'); if (main) main.name = value.trim();
    if (people()) state.client.requiredFor = people().people.filter(p => people().introIds.includes(p.id)).map(p => p.name).filter(Boolean).join(', ');
    if(meta().autoIssue)state.issueName=`${value.trim() || 'Client'} — ${PACK_LABELS[activePackId]} instructions`;
    if(selection()==='intro'&&!doc().builder72RichIntro&&node('ib72-wording'))node('ib72-wording').innerHTML=introSource();
    refreshFamily(); updateHeaderSummary(); updateReview(); markDirty();
  }
  function freshStarter(packId, client = {}, familyModel = null) {
    const next = createPackState(packId);
    Object.keys(next.client || {}).forEach(key => next.client[key] = '');
    Object.assign(next.client, client, {applicationType:PACK_LABELS[packId]});
    next.policeClearances = [];
    next.builder72 = {version:1, simpleIntro:true, autoIssue:true, selected:{}, originals:{}};
    next.preparedDate = thisNzIsoDate(); next.contentStatus = 'Draft - adviser review required'; next.outputMode = 'combined';
    next.issueName = `${client.preparedFor || 'Client'} — ${PACK_LABELS[packId]} instructions`;
    if (familyModel) { next.instructionPeopleV51 = structuredClone(familyModel);next.instructionPeopleV51.enabled=true;next.instructionPeopleV51.requirements={};next.instructionPeopleV51.sectionPeople={}; }
    else { const id=`person-${uid()}`;next.instructionPeopleV51={version:1,enabled:true,people:[{id,role:'Main applicant',name:client.preparedFor || [client.firstName,client.lastName].filter(Boolean).join(' '),dateOfBirth:''}],recipientIds:[id],introIds:[id],introductionNote:'',sectionPeople:{},requirements:{}}; }
    Object.entries(next.docs).forEach(([id,d]) => {
      d.enabled = ['roadmap','documents'].includes(id);
      d.coverSubtitle = PACK_LABELS[packId]; d.caseNote = '';
      d.intro = id === 'roadmap'
        ? 'These instructions have been prepared for {{preparedFor}} in relation to {{applicationType}}. They explain the approach, the information we need and the next steps. Please read the sections that apply to you and contact us if anything is unclear.'
        : 'This guide has been prepared for {{preparedFor}} in relation to {{applicationType}}. It sets out the documents and information requested for your application. Please contact us if an item is unavailable or you need help with a request.';
      if (id === 'documents') d.blocks.forEach(b => {
        const familyCategory = ['family','pwv','parent','aewv-family'].includes(packId);
        b.enabled = !/custody|relationship/.test(b.id) || familyCategory;
        if(b.id==='identity'){b.html='<p>Provide the identity records selected below, for the people named against each item.</p>';b.templateHtml=b.html;b.clientTailoredV01743=true;}
        if(b.id==='character')b.builder72CountryGuidance=true;
      });
    });
    next.selectedDoc = next.docs.roadmap ? 'roadmap' : Object.keys(next.docs)[0];
    return next;
  }
  function finishContext(payload) {
    const key = String(payload.instructionSet?.id || payload.client?.id || 'standalone');
    if (contextKey === key && !payload.force) { pendingInit=false; renderBuilder(); return; }
    contextKey = key;
    const saved = payload.instructionSet?.studioState;
    if (!saved?.packState && !saved?.workspaceDrafts) {
      const facts = {...state.client};
      const family = people() ? structuredClone(people()) : null;
      state = freshStarter(activePackId, facts, family); workspaceDrafts[activePackId] = state;
    }
    pendingInit = false; meta();
    renderAll(); setView('edit');
  }
  function sourceHtml(b, docId = state.selectedDoc) {
    let html;
    if (b.templateHtml !== undefined) html = b.templateHtml;
    else if (activePackId === 'smc' && docId !== 'roadmap' && !b.clientTailoredV01743 && !b.customSectionV01743 && !b.sourceModuleIdV01743) html = smcBlockContent(docId, b.id);
    else html = b.html || '';
    html = applyDirectEditsToHtmlV14(fillTemplate(html), b.directEdits);
    if(b.builder72CountryGuidance)html=withoutCountryInstructions(html);
    // Preserve saved direct text overrides when a section is first opened for editing.
    const t = document.createElement('div'); t.innerHTML = flowSection(html);
    applyInlineEdits(t, docId, false);
    t.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
    return safeHtml(t.firstElementChild?.innerHTML || html);
  }
  function remember(b) {
    const key = `${state.selectedDoc}:${b.id}`; meta().originals ||= {};
    if (!meta().originals[key]) meta().originals[key] = {title:b.baseTitleV01743 || b.title, html:b.familyBlock72 ? b.familyNote72 || '' : b.baseHtmlV01743 ?? sourceHtml(b), note:b.baseNoteV01743 ?? b.note ?? ''};
  }
  function writeBlock(html) {
    const b = block(); if (!b) return;
    remember(b); b.html = safeHtml(html); b.templateHtml = b.html; b.directEdits = {}; b.clientTailoredV01743 = true;
    if (b.familyBlock72) b.familyNote72 = b.html;
    if (b.familyBlock72) refreshFamily();
    markDirty();
  }
  function chooseDoc(id) {
    state.selectedDoc = id; renderAll();
    if (innerWidth < 760) node('ib72-outline')?.removeAttribute('open');
  }
  function outline() {
    const host = node('ib72-outline-list'); if (!host) return;
    host.innerHTML = `<button type="button" class="ib72-section ${selection()==='intro'?'selected':''}" data-ib-select="intro"><span class="ib72-section-number">01</span><span><strong>Header & introduction</strong><small>Client name, heading and opening wording</small></span></button>` + doc().blocks.filter(b=>b.enabled).map((b,i)=>`<button type="button" class="ib72-section ${selection()===b.id?'selected':''}" data-ib-select="${esc(b.id)}"><span class="ib72-section-number">${String(i+2).padStart(2,'0')}</span><span><strong>${esc(b.title)}</strong><small>${b.familyBlock72?'People included':b.clientTailoredV01743?'Tailored for this client':b.customSectionV01743?'Custom block':'Starting block'}</small></span></button>`).join('');
    host.querySelectorAll('[data-ib-select]').forEach(b=>b.addEventListener('click',()=>{setSelection(b.dataset.ibSelect);outline();sectionEditor();if(innerWidth<760)node('ib72-outline').open=false;}));
    const count = node('ib72-section-count'); if (count) count.textContent = `${doc().blocks.filter(b=>b.enabled).length + 1} sections`;
  }
  function peopleChoices(selected, attribute) {
    return (people()?.people || []).map(p=>`<label class="ib72-person-choice"><input type="checkbox" ${attribute}="${esc(p.id)}" ${selected.includes(p.id)?'checked':''}><span>${esc(p.name || p.role)}</span></label>`).join('');
  }
  function familyEditor(b) {
    const m = people(); if (!m) return '';
    return `<section class="ib72-family"><h3>People included</h3><p>Add only the people this instruction set needs to cover.</p>${m.people.map(p=>`<div class="ib72-person-row" data-ib-person-row="${esc(p.id)}"><label>Full name<input data-ib-person-name="${esc(p.id)}" value="${esc(p.name)}"></label><label>Role<select data-ib-person-role="${esc(p.id)}">${['Main applicant','Partner','Child','Other'].map(role=>`<option ${role===p.role?'selected':''}>${role}</option>`).join('')}</select></label>${p.role==='Main applicant'?'<span class="ib72-main-person">Main applicant</span>':`<button type="button" class="ib72-text-danger" data-ib-person-remove="${esc(p.id)}">Remove person</button>`}</div>`).join('')}<div class="ib72-actions"><button type="button" class="button button-secondary" data-ib-add-person="Partner">+ Add partner</button><button type="button" class="button button-secondary" data-ib-add-person="Child">+ Add child</button><button type="button" class="button button-secondary" data-ib-add-person="Other">+ Add another person</button></div><p class="ib72-help">Names already held in the client questionnaire appear here when available. Changes stay in this draft.</p></section>`;
  }
  function evidenceEditor(b) {
    if (state.selectedDoc !== 'documents' || b.familyBlock72) return '';
    const list = people()?.requirements?.[`documents:${b.id}`] || [];
    const active = b.builder72NoEvidence ? [] : list.filter(r=>r.enabled);
    return `<details class="ib72-evidence" ${b.builder72Evidence?'open':''}><summary>Documents requested & who needs them <span>${active.length}</span></summary><p class="ib72-help">Choose the actual items needed. Each request can apply to different people.</p><div class="ib72-requests">${active.map(r=>`<article class="ib72-request" data-ib-request="${esc(r.id)}"><label>Document name<input data-ib-request-title value="${esc(r.title)}"></label><fieldset><legend>Required for</legend><div class="ib72-person-choices">${peopleChoices(r.personIds || [],'data-ib-request-person')}</div></fieldset><label>Instructions for this document<textarea rows="2" data-ib-request-note>${esc(r.note)}</textarea></label><button type="button" class="ib72-text-danger" data-ib-request-remove>Remove request</button></article>`).join('')}</div><button type="button" class="button button-secondary" id="ib72-add-request">+ Add document request</button><p class="ib72-help">Need to name a partner or child? <button type="button" class="ib72-link" id="ib72-request-family">Add / edit family</button></p></details>`;
  }
  function withoutCountryInstructions(html) {
    const t=document.createElement('template');t.innerHTML=String(html || '').replaceAll('{{policeInstructions}}','');
    t.content.querySelectorAll('.country-instruction').forEach(e=>e.remove());
    t.content.querySelectorAll('.callout').forEach(e=>{if(e.textContent.includes('No country-specific police certificate instructions'))e.remove();});
    return t.innerHTML;
  }
  function countryEditor(b) {
    if(b.id!=='character'||state.selectedDoc!=='documents')return '';
    return `<details class="ib72-evidence"><summary>Police country guidance <span>${state.policeClearances.length}</span></summary><p class="ib72-help">Use an existing country starting point, then check and tailor its instructions for this client.</p><div class="ib72-library-tools"><label>Country<select id="ib72-country"><option value="">Choose a country…</option>${policeCountryLibrary.map(c=>`<option value="${esc(c.country)}">${esc(c.country)}</option>`).join('')}<option value="custom">Other country / custom instructions</option></select></label><button type="button" class="button button-secondary" id="ib72-country-add">Add country</button></div>${state.policeClearances.map((c,i)=>`<article class="ib72-request" data-ib-country-index="${i}"><label>Country<input data-ib-country-field="country" value="${esc(c.country)}"></label><label>Required for<input data-ib-country-field="applicants" value="${esc(c.applicants)}"></label><label>Country instructions<textarea rows="4" data-ib-country-field="instructions">${esc(c.instructions)}</textarea></label><label>Official source<input type="url" data-ib-country-field="officialLink" value="${esc(c.officialLink || '')}"></label><button type="button" class="ib72-text-danger" data-ib-country-remove>Remove country</button></article>`).join('')}</details>`;
  }
  function bindCountries(host,b) {
    node('ib72-country-add')?.addEventListener('click',()=>{
      const country=node('ib72-country').value;if(!country)return;
      if(state.policeClearances.some(c=>c.country===country)){showToast('This country is already included.');return;}
      const preset=getPolicePreset(country);state.policeClearances.push({id:`police-${uid()}`,country:preset?.country || '',applicants:state.client.requiredFor || name(),instructions:preset?.instructions || '',officialLink:preset?.officialLink || ''});
      b.builder72CountryGuidance=true;markDirty();sectionEditor();host.querySelectorAll('details').forEach(d=>d.open=true);
    });
    host.querySelectorAll('[data-ib-country-index]').forEach(item=>{
      const i=Number(item.dataset.ibCountryIndex);
      item.querySelectorAll('[data-ib-country-field]').forEach(input=>input.addEventListener('input',()=>{state.policeClearances[i][input.dataset.ibCountryField]=input.value;b.builder72CountryGuidance=true;markDirty();}));
      item.querySelector('[data-ib-country-remove]').addEventListener('click',()=>{state.policeClearances.splice(i,1);markDirty();sectionEditor();});
    });
  }
  function toolbar() {
    return `<div class="ib72-format" role="toolbar" aria-label="Wording formatting">${[['bold','Bold'],['italic','Italic'],['insertUnorderedList','Bullets'],['insertOrderedList','Numbered list'],['heading','Heading'],['table','Table'],['callout','Callout']].map(([cmd,label])=>`<button type="button" data-ib-format="${cmd}">${label}</button>`).join('')}</div>`;
  }
  function sectionEditor() {
    const host = node('ib72-section-editor'); if (!host) return;
    const b = block(), intro = selection()==='intro';
    if (!intro && (!b || !b.enabled)) { setSelection('intro'); outline(); sectionEditor(); return; }
    const body = intro ? introSource() : b.familyBlock72 ? b.familyNote72 || '<p>Add any family-specific guidance here.</p>' : sourceHtml(b);
    host.innerHTML = `<div class="ib72-editor-head"><div><span class="ib72-eyebrow">${intro?'Opening section':'Edit block'}</span><h2>${intro?'Header & introduction':esc(b.title)}</h2></div>${intro?'':`<div class="ib72-block-actions"><button type="button" class="button button-secondary" data-ib-block-action="up" aria-label="Move block up">↑</button><button type="button" class="button button-secondary" data-ib-block-action="down" aria-label="Move block down">↓</button><button type="button" class="button button-secondary" data-ib-block-action="duplicate">Duplicate</button><button type="button" class="button button-secondary" data-ib-block-action="remove">Remove</button></div>`}</div>${intro?`<div class="ib72-two-fields"><label>Document heading<input id="ib72-cover-title" value="${esc(doc().coverTitle)}"></label><label>Visa category on cover<input id="ib72-cover-subtitle" value="${esc(fillTemplate(doc().coverSubtitle || '{{applicationType}}'))}"></label></div><p class="ib72-help">The client name and visa category above populate the header and starting introduction. You can tailor the wording below.</p>`:`<label>Section heading<input id="ib72-block-title" value="${esc(b.title)}"></label>`}${b?.familyBlock72?familyEditor(b):''}<label class="ib72-wording-label" id="ib72-wording-label">${intro?'Introduction wording':b?.familyBlock72?'Additional family guidance':'Client wording'}</label>${toolbar()}<div id="ib72-wording" class="ib72-wording" contenteditable="true" role="textbox" aria-labelledby="ib72-wording-label" aria-multiline="true" spellcheck="true">${safeHtml(body)}</div><div class="ib72-wording-footer"><span>Edits apply to this client draft.</span>${intro?'':`<button type="button" class="ib72-link" data-ib-block-action="restore">Restore starting wording</button>`}</div>${intro?'':evidenceEditor(b)}`;
    const editor = node('ib72-wording');
    editor.addEventListener('input',()=>{
      if (intro) { doc().intro = safeHtml(editor.innerHTML); doc().builder72RichIntro=true; doc().directEdits ||= {}; doc().directEdits.intro = {}; markDirty(); }
      else writeBlock(editor.innerHTML);
    });
    editor.addEventListener('paste',e=>{e.preventDefault();const html=e.clipboardData.getData('text/html');document.execCommand('insertHTML',false,html?safeHtml(html):esc(e.clipboardData.getData('text/plain')).replace(/\n/g,'<br>'));editor.dispatchEvent(new Event('input'));});
    host.querySelectorAll('[data-ib-format]').forEach(button=>{
      button.addEventListener('mousedown',e=>e.preventDefault());
      button.addEventListener('click',()=>{editor.focus();const cmd=button.dataset.ibFormat;
        if(cmd==='heading')document.execCommand('formatBlock',false,'h3');
        else if(cmd==='table')document.execCommand('insertHTML',false,'<table class="checklist-table"><thead><tr><th>Item</th><th>Details</th></tr></thead><tbody><tr><td>Document / step</td><td>Enter the client guidance</td></tr></tbody></table><p><br></p>');
        else if(cmd==='callout')document.execCommand('insertHTML',false,'<div class="callout"><span class="callout-icon">i</span><p>Important information for this client.</p></div><p><br></p>');
        else document.execCommand(cmd);editor.dispatchEvent(new Event('input'));
      });
    });
    node('ib72-block-title')?.addEventListener('input',e=>{remember(b);b.title=e.target.value;host.querySelector('h2').textContent=b.title;outline();markDirty();});
    node('ib72-cover-title')?.addEventListener('input',e=>{doc().coverTitle=e.target.value;markDirty();});
    node('ib72-cover-subtitle')?.addEventListener('input',e=>{doc().coverSubtitle=e.target.value;markDirty();});
    host.querySelectorAll('[data-ib-block-action]').forEach(button=>button.addEventListener('click',()=>blockAction(button.dataset.ibBlockAction)));
    if (b) {
      host.insertAdjacentHTML('beforeend',countryEditor(b));
      bindFamily(host); bindEvidence(host,b); bindCountries(host,b);
    }
    if(b){const included=doc().blocks.filter(x=>x.enabled),i=included.indexOf(b);host.querySelector('[data-ib-block-action="up"]').disabled=i===0;host.querySelector('[data-ib-block-action="down"]').disabled=i===included.length-1;}
  }
  function bindFamily(host) {
    host.querySelectorAll('[data-ib-person-name]').forEach(input=>input.addEventListener('input',()=>{
      const p=people().people.find(p=>p.id===input.dataset.ibPersonName);p.name=input.value;
      if(p.role==='Main applicant'){updateName(input.value);node('ib72-client-name').value=input.value;}
      else {refreshFamily();markDirty();}
    }));
    host.querySelectorAll('[data-ib-person-role]').forEach(input=>input.addEventListener('change',()=>{
      const p=people().people.find(p=>p.id===input.dataset.ibPersonRole);
      if(input.value==='Main applicant'&&p.role!=='Main applicant'){showToast('The main applicant is set by the client name above.');sectionEditor();return;}
      if(p.role==='Main applicant'&&input.value!=='Main applicant'){showToast('Keep one main applicant. Add another person if needed.');sectionEditor();return;}
      p.role=input.value;refreshFamily();markDirty();sectionEditor();
    }));
    host.querySelectorAll('[data-ib-add-person]').forEach(button=>button.addEventListener('click',()=>{
      const p={id:`person-${uid()}`,name:'',role:button.dataset.ibAddPerson,dateOfBirth:''};people().people.push(p);people().introIds.push(p.id);people().enabled=true;refreshFamily();markDirty();sectionEditor();node('ib72-section-editor').querySelector(`[data-ib-person-name="${p.id}"]`)?.focus();
    }));
    host.querySelectorAll('[data-ib-person-remove]').forEach(button=>button.addEventListener('click',async()=>{
      const p=people().people.find(p=>p.id===button.dataset.ibPersonRemove);if(!p)return;
      if(!(await window.THIS_DIALOG.confirm({message:`Remove ${p.name || p.role} from this draft and its document requests?`})))return;
      people().people=people().people.filter(x=>x.id!==p.id);
      [people().introIds,people().recipientIds,...Object.values(people().sectionPeople || {}),...Object.values(people().requirements || {}).flat().map(r=>r.personIds)].forEach(ids=>{for(let i=ids.length-1;i>=0;i--)if(ids[i]===p.id)ids.splice(i,1);});
      refreshFamily();markDirty();sectionEditor();
    }));
  }
  function refreshFamily() {
    const m=people();if(!m)return;
    state.client.partnerName=m.people.filter(p=>p.role==='Partner').map(p=>p.name).join(', ');
    state.client.children=m.people.filter(p=>p.role==='Child').map(p=>p.name).join('; ');
    Object.values(state.docs).forEach(d=>d.blocks.filter(b=>b.familyBlock72).forEach(b=>{
      const table=`<table class="checklist-table"><thead><tr><th>Person</th><th>Role</th></tr></thead><tbody>${m.people.map(p=>`<tr><td>${esc(p.name || 'Name to confirm')}</td><td>${esc(p.role)}</td></tr>`).join('')}</tbody></table>`;
      b.html=table+(b.familyNote72||'');b.templateHtml=b.html;
    }));
  }
  function bindEvidence(host,b) {
    const m=people();if(!m)return;
    m.requirements ||= {};const key=`documents:${b.id}`,list=m.requirements[key] ||= [];
    host.querySelectorAll('[data-ib-request]').forEach(item=>{
      const r=list.find(r=>r.id===item.dataset.ibRequest);
      item.querySelector('[data-ib-request-title]').addEventListener('input',e=>{r.title=e.target.value;markDirty();});
      item.querySelector('[data-ib-request-note]').addEventListener('input',e=>{r.note=e.target.value;markDirty();});
      item.querySelectorAll('[data-ib-request-person]').forEach(input=>input.addEventListener('change',()=>{r.personIds=(r.personIds||[]).filter(id=>id!==input.dataset.ibRequestPerson);if(input.checked)r.personIds.push(input.dataset.ibRequestPerson);m.enabled=true;markDirty();}));
      item.querySelector('[data-ib-request-remove]').addEventListener('click',()=>{r.enabled=false;markDirty();sectionEditor();});
    });
    node('ib72-add-request')?.addEventListener('click',()=>{
      if(b.builder72NoEvidence){list.forEach(r=>r.enabled=false);b.builder72NoEvidence=false;}
      list.push({id:`requirement-${uid()}`,title:'Additional document',note:'',enabled:true,personIds:m.people.filter(p=>p.role==='Main applicant').map(p=>p.id)});
      b.builder72Evidence=true;m.enabled=true;markDirty();sectionEditor();host.querySelector('.ib72-request:last-child input')?.focus();
    });
    node('ib72-request-family')?.addEventListener('click',addFamily);
  }
  async function blockAction(action) {
    const b=block();if(!b)return;const d=doc(),i=d.blocks.indexOf(b);
    if(action==='remove'){
      if(!(await window.THIS_DIALOG.confirm({message:`Remove “${b.title}” from this guide? You can add a starting block again from the library.`})))return;
      b.enabled=false;setSelection('intro');
    }else if(action==='up'||action==='down'){
      const visible=d.blocks.filter(x=>x.enabled),target=visible[visible.indexOf(b)+(action==='up'?-1:1)];if(!target)return;
      const j=d.blocks.indexOf(target);[d.blocks[i],d.blocks[j]]=[d.blocks[j],d.blocks[i]];
    }else if(action==='duplicate'){
      const copy=structuredClone(b);copy.id=`copy-${uid()}`;copy.title=`${b.title} (copy)`;copy.html=sourceHtml(b);copy.templateHtml=copy.html;copy.directEdits={};copy.customSectionV01743=true;copy.clientTailoredV01743=true;
      d.blocks.splice(i+1,0,copy);setSelection(copy.id);
      if(people()?.requirements?.[`${state.selectedDoc}:${b.id}`])people().requirements[`${state.selectedDoc}:${copy.id}`]=structuredClone(people().requirements[`${state.selectedDoc}:${b.id}`]).map(r=>({...r,id:`requirement-${uid()}`}));
      if(people()?.sectionPeople?.[`${state.selectedDoc}:${b.id}`])people().sectionPeople[`${state.selectedDoc}:${copy.id}`]=[...people().sectionPeople[`${state.selectedDoc}:${b.id}`]];
    }else if(action==='restore'){
      if(!(await window.THIS_DIALOG.confirm({message:`Restore the starting wording for “${b.title}”? Your current text in this block will be replaced.`})))return;
      remember(b);const original=meta().originals[`${state.selectedDoc}:${b.id}`];b.title=original.title;b.html=original.html;b.templateHtml=original.html;b.note=original.note;b.directEdits={};b.clientTailoredV01743=true;
      if(b.familyBlock72){b.familyNote72=original.html;refreshFamily();}
    }
    markDirty(false);renderAll();flush();
  }
  function insertBlock(value) {
    const b={...value,id:value.id || `block-${uid()}`,enabled:true,shared:false,forcePage:false,customSectionV01743:true,clientTailoredV01743:true};
    b.templateHtml=b.html || '';const current=block(),at=current?doc().blocks.indexOf(current)+1:doc().blocks.length;
    doc().blocks.splice(at,0,b);setSelection(b.id);doc().enabled=true;markDirty(false);renderAll();flush();return b;
  }
  function addFamily() {
    let b=doc().blocks.find(b=>b.familyBlock72);if(b){b.enabled=true;setSelection(b.id);renderAll();return;}
    b=insertBlock({id:`family-${uid()}`,title:'People included in these instructions',familyBlock72:true,familyNote72:'<p>The document requests identify who needs to provide each item. Please tell us if anyone should be added or removed.</p>',builder72NoEvidence:true,html:''});
    refreshFamily();renderAll();flush();
  }
  function getLibrary() {
    const standard=(doc().blocks||[]).filter(b=>!b.customSectionV01743&&!b.sourceModuleIdV01743).map(b=>({key:`existing:${b.id}`,title:b.title,note:b.note || 'Starting section for this visa category.',category:'documents',existing:b}));
    const master=createPackState(activePackId).docs[state.selectedDoc];
    for(const b of master?.blocks || [])if(!standard.some(x=>x.existing.id===b.id))standard.push({key:`master:${b.id}`,title:b.title,note:b.note||'Starting section for this visa category.',category:'documents',master:b});
    const guidance=(window.THIS_INSTRUCTION_BLOCK_LIBRARY?.() || []).map(b=>({...b,key:`library:${b.id}`,category:'guidance',note:b.note || b.category}));
    return [...standard,...guidance];
  }
  function libraryList() {
    const q=librarySearch.trim().toLowerCase();
    const items=libraryItems.filter(x=>(libraryFilter==='all'||x.category===libraryFilter)&&(!q||`${x.title} ${x.note}`.toLowerCase().includes(q)));
    node('ib72-library-list').innerHTML=items.length?items.map(x=>{const added=x.existing?.enabled || (x.key.startsWith('library:')&&doc().blocks.some(b=>b.enabled&&b.sourceModuleIdV01743===x.id));return `<article class="ib72-library-item"><div><span class="ib72-eyebrow">${x.category==='documents'?'Category starting block':'Guidance library'}</span><h3>${esc(x.title)}</h3><p>${esc(x.note)}</p></div><button type="button" class="button ${added?'button-secondary':'button-primary'}" data-ib-library-add="${esc(x.key)}" ${added?'disabled':''}>${added?'Included':'Add block'}</button></article>`;}).join(''):'<p class="ib72-empty">No matching blocks. Try another search or add a custom block.</p>';
    node('ib72-library-list').querySelectorAll('[data-ib-library-add]').forEach(button=>button.addEventListener('click',()=>{
      const item=libraryItems.find(x=>x.key===button.dataset.ibLibraryAdd);
      if(item.existing){item.existing.enabled=true;setSelection(item.existing.id);markDirty(false);renderAll();}
      else {const source=item.master || item;insertBlock({title:source.title,note:source.note,html:item.master?sourceHtml(source):source.html,builder72NoEvidence:!item.master,sourceModuleIdV01743:item.master?undefined:item.id});}
      node('ib72-library').close();flush();
    }));
  }
  function openLibrary() {libraryItems=getLibrary();libraryFilter='all';librarySearch='';node('ib72-library-search').value='';node('ib72-library-filter').value='all';libraryList();node('ib72-library').showModal();node('ib72-library-search').focus();}
  function updateReview() {
    if(!node('ib72-review'))return;
    const issues=[];if(!name())issues.push('Add the client name.');
    const m=people();if(m?.enabled){
      if(m.people.some(p=>!p.name.trim()))issues.push('Name each person included.');
      const activeDocs=Object.entries(state.docs).filter(([,d])=>d.enabled);
      for(const [id,d]of activeDocs)for(const b of d.blocks.filter(b=>b.enabled&&!b.builder72NoEvidence)){
        const list=m.requirements?.[`${id}:${b.id}`] || [];
        if(list.some(r=>r.enabled&&(!r.title.trim()||!r.personIds.length)))issues.push(`Choose people and a document name in ${b.title}.`);
      }
    }
    if(!Object.values(state.docs).some(d=>d.enabled))issues.push('Include at least one guide in the output.');
    node('ib72-review').textContent=issues.join(' ');node('ib72-review').hidden=!issues.length;return issues;
  }
  function renderBuilder() {
    if(!mounted || pendingInit)return;
    meta();const d=doc();if(!d)return;
    const root=node('ib72');
    root.innerHTML=`<header class="ib72-setup"><div class="ib72-setup-title"><span class="ib72-eyebrow">Instructions Studio</span><h1>Build this client’s instructions</h1><p>Start with the usual blocks. Keep, add and tailor what helps this client.</p></div><div class="ib72-two-fields"><label>Client name<input id="ib72-client-name" value="${esc(name())}" placeholder="Enter the client’s full name" autocomplete="off"></label><label>Visa category<select id="ib72-category">${PACK_ORDER.map(id=>`<option value="${id}" ${activePackId===id?'selected':''}>${esc(PACK_LABELS[id])}</option>`).join('')}</select></label></div></header><div class="ib72-document-bar"><label class="ib72-document-picker">Working on<select id="ib72-document">${Object.entries(state.docs).map(([id,d])=>`<option value="${id}" ${state.selectedDoc===id?'selected':''}>${esc(d.label)}</option>`).join('')}</select></label><label class="ib72-include"><input type="checkbox" id="ib72-include" ${d.enabled?'checked':''}> Include this guide in output</label><button type="button" class="button button-secondary" id="ib72-settings-open">Output settings</button></div><div id="ib72-review" class="ib72-review" role="status" hidden></div><div class="ib72-composer"><details id="ib72-outline" class="ib72-outline" open><summary>Document sections <span id="ib72-section-count"></span></summary><div id="ib72-outline-list"></div><div class="ib72-add-actions"><button type="button" class="button button-primary" id="ib72-add-block">+ Add block</button><button type="button" class="button button-secondary" id="ib72-add-family">+ Family / people</button><button type="button" class="ib72-link" id="ib72-add-custom">+ Write a custom block</button></div></details><section id="ib72-section-editor" class="ib72-section-editor"></section></div>`;
    node('ib72-client-name').addEventListener('input',e=>updateName(e.target.value));
    node('ib72-category').addEventListener('change',async e=>{
      const id=e.target.value;if(id===activePackId)return;
      if(!(await window.THIS_DIALOG.confirm({message:'Change the visa category and load its starting blocks? This replaces the current draft content. Save the current draft first if you need to keep it.'}))){e.target.value=activePackId;return;}
      const client={firstName:state.client.firstName,lastName:state.client.lastName,preparedFor:state.client.preparedFor,adviser:state.client.adviser,adviserLicence:state.client.adviserLicence,requiredFor:state.client.requiredFor};
      const m=people();activePackId=id;state=freshStarter(id,client,m);workspaceDrafts[id]=state;renderAll();flush();
    });
    node('ib72-document').addEventListener('change',e=>chooseDoc(e.target.value));
    node('ib72-include').addEventListener('change',e=>{d.enabled=e.target.checked;markDirty();renderOutputSummary();});
    node('ib72-add-block').addEventListener('click',openLibrary);node('ib72-add-family').addEventListener('click',addFamily);
    node('ib72-add-custom').addEventListener('click',()=>{insertBlock({title:'Client-specific guidance',html:'<p>Write the guidance for this client here.</p>',builder72NoEvidence:true});node('ib72-block-title').focus();});
    node('ib72-settings-open').addEventListener('click',openSettings);
    node('ib72-outline-list').before(root.querySelector('.ib72-add-actions'));
    outline();sectionEditor();updateReview();
  }
  function openSettings() {
    const h=node('ib72-settings-body');
    h.innerHTML=`<label>Issue title<input id="ib72-issue" value="${esc(state.issueName)}"></label><label>Prepared date<input type="date" id="ib72-date" value="${esc(state.preparedDate)}"></label><label>PDF arrangement<select id="ib72-output">${[['combined','One combined pack'],['separate','Separate guides'],['balanced','Road map, documents and specialist guides']].map(([v,l])=>`<option value="${v}" ${state.outputMode===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Adviser<input id="ib72-adviser" value="${esc(state.client.adviser)}"></label><label>Adviser licence<input id="ib72-licence" value="${esc(state.client.adviserLicence)}"></label><label>Greeting <small>(optional)</small><input id="ib72-greeting" value="${esc(people()?.recipientText || '')}" placeholder="Uses the main applicant’s name"></label><label class="ib72-cover-upload-label">Cover image for this guide<input type="file" id="ib72-cover-image" accept="image/*"></label><p class="ib72-help">Standard wording is a starting point. Review the client facts and requirements before marking ready.</p>`;
    [['ib72-issue',v=>{state.issueName=v;meta().autoIssue=false;node('issue-name').value=v;}],['ib72-date',v=>{state.preparedDate=v;node('prepared-date').value=v;}],['ib72-output',v=>state.outputMode=v],['ib72-adviser',v=>state.client.adviser=v],['ib72-licence',v=>state.client.adviserLicence=v],['ib72-greeting',v=>{if(people()){people().recipientText=v;people().enabled=true;}}]].forEach(([id,set])=>node(id).addEventListener('input',e=>{set(e.target.value);markDirty();}));
    node('ib72-cover-image').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{doc().hero=reader.result;doc().builder72CoverImage=reader.result;markDirty();};reader.readAsDataURL(file);});
    node('ib72-settings').showModal();
  }
  // New drafts print the blocks the adviser can see and edit. Keep implicit legacy
  // panels for saved older drafts, whose output must remain unchanged.
  const previousEnhancement = v12RequirementEnhancement;
  v12RequirementEnhancement = function(b,d){return state.builder72?.simpleIntro ? '' : previousEnhancement(b,d);};
  const previousGlancePage = v12AtAGlancePage;
  v12AtAGlancePage = function(d,n){return state.builder72?.simpleIntro ? '' : previousGlancePage(d,n);};
  const previousNextSteps = v12NextThreeSection;
  v12NextThreeSection = function(d,p){return state.builder72?.simpleIntro ? '' : previousNextSteps(d,p);};
  const previousRawBlock = rawBlockHtmlV13;
  rawBlockHtmlV13 = function(b){
    const html=previousRawBlock(b);
    if(b.builder72CountryGuidance)return withoutCountryInstructions(fillTemplate(html))+(state.policeClearances.length?renderPoliceSubBlocks():'');
    return state.builder72?.simpleIntro ? fillTemplate(html) : html;
  };
  const previousRenderDoc = renderDocHtml;
  renderDocHtml = function(id){const previous=state.selectedDoc;try{state.selectedDoc=id;return previousRenderDoc(id);}finally{state.selectedDoc=previous;}};
  const previousRender = renderAll;
  renderAll = function(){Object.values(state.docs || {}).forEach(d=>{if(d.builder72CoverImage)d.hero=d.builder72CoverImage;});previousRender();renderBuilder();};
  const previousInit = window.__THIS_STUDIO_INIT__;
  if(previousInit)window.__THIS_STUDIO_INIT__=payload=>{pendingInit=true;const result=previousInit(payload);finishContext(payload);return result;};
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='THIS_STUDIO_INIT')return;
    pendingInit=true;clearTimeout(initTimer);const payload=event.data.payload || {};initTimer=setTimeout(()=>finishContext(payload),45);
  },true);
  function mount() {
    document.body.classList.add('ib72-studio');mounted=true;
    const workspace=document.querySelector('.workspace');const root=document.createElement('main');root.id='ib72';root.className='ib72';workspace.prepend(root);
    document.body.insertAdjacentHTML('beforeend',`<dialog id="ib72-library" class="ib72-dialog" aria-labelledby="ib72-library-title"><div class="ib72-dialog-heading"><div><span class="ib72-eyebrow">Building blocks</span><h2 id="ib72-library-title">Add a block</h2><p>Insert a starting section, then tailor it for this client.</p></div><button type="button" class="button button-secondary" data-ib-close="ib72-library" aria-label="Close block library">×</button></div><div class="ib72-library-tools"><label>Search blocks<input type="search" id="ib72-library-search" placeholder="Identity, partnership, financial…"></label><label>Show<select id="ib72-library-filter"><option value="all">All blocks</option><option value="documents">Category starting blocks</option><option value="guidance">Guidance library</option></select></label></div><div id="ib72-library-list"></div></dialog><dialog id="ib72-settings" class="ib72-dialog ib72-settings" aria-labelledby="ib72-settings-title"><div class="ib72-dialog-heading"><h2 id="ib72-settings-title">Output settings</h2><button type="button" class="button button-secondary" data-ib-close="ib72-settings" aria-label="Close output settings">×</button></div><div id="ib72-settings-body"></div><button type="button" class="button button-primary" data-ib-close="ib72-settings">Done</button></dialog>`);
    document.querySelectorAll('[data-ib-close]').forEach(b=>b.addEventListener('click',()=>node(b.dataset.ibClose).close()));
    node('ib72-library-search').addEventListener('input',e=>{librarySearch=e.target.value;libraryList();});node('ib72-library-filter').addEventListener('change',e=>{libraryFilter=e.target.value;libraryList();});
    const toolbar=document.querySelector('.calm-studio-toolbar');if(toolbar){toolbar.hidden=true;const nav=document.createElement('div');nav.className='ib72-viewbar';nav.innerHTML='<div role="group" aria-label="Instructions workspace view"><button type="button" data-ib-view="edit">Edit document</button><button type="button" data-ib-view="split">Edit & preview</button><button type="button" data-ib-view="preview">Preview</button></div>';toolbar.after(nav);nav.querySelectorAll('[data-ib-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.ibView)));}
    const more=document.querySelector('.calm-studio-more > div');
    if(more)for(const [target,label] of [['print-pack','Print / save PDF'],['studio-help-btn','Studio help']]){
      const button=document.createElement('button');button.type='button';button.className='ib72-mobile-tool';button.textContent=label;
      button.addEventListener('click',e=>{e.stopPropagation();more.closest('details').open=false;node(target)?.click();});more.append(button);
    }
    if(!contextKey&&!pendingInit&&!THIS_LOCAL_STORAGE.getItem(WORKSPACE_STORAGE_KEY)){state=freshStarter(activePackId);workspaceDrafts[activePackId]=state;}
    window.addEventListener('click',e=>{
      if(!e.target.closest('#print-pack,#publish-pack,#confirm-publish,#save-draft'))return;
      if(e.target.closest('#print-pack,#publish-pack,#confirm-publish')&&(updateReview()||[]).length){e.preventDefault();e.stopImmediatePropagation();setView('edit');node('ib72-review').scrollIntoView({block:'center'});showToast('Check the highlighted details before preparing the document.');return;}
      // Existing save reads these controls and the CRM bridge snapshots the same state.
      node('issue-name').value=state.issueName;node('prepared-date').value=state.preparedDate;flush();
    },true);
    renderAll();setView('edit');document.title='THiS Instructions Studio — Client document builder';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0));else setTimeout(mount,0);
})();
