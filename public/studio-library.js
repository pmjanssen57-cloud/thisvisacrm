/* Shared Instructions / Agreement library. Client documents are independent copies. */
(() => {
  'use strict';
  const clone = value => structuredClone(value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function clean(value) {
    const t = document.createElement('template'); t.innerHTML = String(value || '');
    const allowed = new Set('P DIV BR B STRONG I EM U UL OL LI H2 H3 H4 BLOCKQUOTE A SPAN TABLE THEAD TBODY TR TD TH HR'.split(' '));
    [...t.content.querySelectorAll('*')].forEach(el => {
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|FORM|INPUT|BUTTON|SVG|IMG)$/.test(el.tagName)) { el.remove(); return; }
      if (!allowed.has(el.tagName)) { el.replaceWith(...el.childNodes); return; }
      [...el.attributes].forEach(a => {
        if (a.name === 'class' && /^[\w -]{0,200}$/.test(a.value)) return;
        if (el.tagName === 'A' && a.name === 'href' && /^(https?:|mailto:)/i.test(a.value)) return;
        if (['TD','TH'].includes(el.tagName) && ['colspan','rowspan'].includes(a.name) && /^\d{1,2}$/.test(a.value)) return;
        el.removeAttribute(a.name);
      });
    }); return t.innerHTML;
  }
  const dateLabel = value => value?new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'';
  const uid = () => `block-${crypto.randomUUID()}`;
  const pending = new Map(); let context = null, data = null, loading = null, tab = 'personal', dialog = null, status = '', editDirty = false, busy = false;
  const adapter = () => window.THIS_STUDIO_BLOCK_ADAPTER83;
  function rpc(request) {
    if (window.parent === window) return Promise.reject(new Error('Open Studio through the CRM to use account libraries.'));
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('The CRM did not respond. Your edits remain open. Try again.')); }, 30000);
      pending.set(requestId, {resolve, reject, timer});
      window.parent.postMessage({source: adapter().studio === 'instructions' ? 'this-instructions-studio' : 'this-agreement-studio', type:'THIS_BLOCK_LIBRARY_REQUEST', requestId, request}, location.origin);
    });
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    const m = event.data || {};
    if (m.type === 'THIS_BLOCK_LIBRARY_RESULT' && pending.has(m.requestId)) {
      const p = pending.get(m.requestId); pending.delete(m.requestId); clearTimeout(p.timer); m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
    }

  });
  async function load() {
    if (!context) throw new Error('Open a document through the CRM first.');
    if (!loading) loading = rpc({operation:'read'}).then(value => { if(!Array.isArray(value?.team?.items)||!Array.isArray(value?.personal?.items)||!value.team.masters||!value.personal.masters)throw new Error('Library could not be loaded. Refresh the CRM and try again.');data = value; return value; }).finally(() => { loading = null; });
    return loading;
  }
  async function init(payload) {
    if (!adapter() || !payload || new URLSearchParams(location.search).has('token')) return;
    const key = payload.instructionSet?.id || payload.agreementSet?.id || 'new';
    if (context?.key === key && !payload.force) return;
    context = {key, payload}; data = null; adapter().context?.(payload);
    const fingerprint = adapter().fingerprint();
    try {
      await load();
      if (adapter().isNew(payload) && fingerprint === adapter().fingerprint()) adapter().applyPublished(data.team.masters, true);
    } catch (error) { status = error.message; }
  }
  async function persist(scope, next) {
    const result = await rpc({operation:'save', scope, revision:data[scope].revision || '', library:next});
    data[scope] = result.library;
  }
  const permitted = scope => scope === 'team' ? data?.canManageTeam : data?.canSavePersonal;
  function say(message, error = false) { status = message; const el = dialog?.querySelector('[data-status]'); if (el) { el.textContent = message; el.classList.toggle('error', error); } }
  function frame() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.className = 'sl83'; dialog.setAttribute('aria-labelledby','sl83-title');
    document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  }
  async function confirm(message) { return window.THIS_DIALOG.confirm({message}); }
  async function close() {
    if (busy) return;
    if (editDirty && !(await confirm('Discard the unsaved library edits? The client document is unchanged.'))) return;
    editDirty = false; dialog?.close();
  }
  function shell(body) {
    dialog.innerHTML = `<header><div><span class="sl83-eyebrow">${adapter().studio === 'instructions' ? 'Instructions' : 'Agreement'} Studio</span><h2 id="sl83-title">Templates & blocks</h2><p>Maintain the starting point. Tailor a separate copy for each client.</p></div><button type="button" data-close aria-label="Close templates and blocks">Close</button></header><nav aria-label="Library areas">${[['masters','Master templates'],['team','Team blocks'],['personal','My blocks']].map(([id,label])=>`<button type="button" data-tab="${id}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}</nav><div class="sl83-body">${body}</div><footer><span data-status role="status">${esc(status)}</span><button type="button" data-reload>Reload library</button></footer>`;
    dialog.querySelector('[data-close]').onclick = close;
    dialog.querySelectorAll('[data-tab]').forEach(b => b.onclick = async () => { if (busy || editDirty && !(await confirm('Discard these unsaved library edits?'))) return; editDirty=false; tab=b.dataset.tab; render(); });
    dialog.querySelector('[data-reload]').onclick = async () => {
      if (busy || editDirty && !(await confirm('Reload the saved library and discard these unsaved edits?'))) return;
      try { await load(); editDirty=false; status='Library reloaded.'; render(); } catch(e) { say(e.message,true); }
    };
  }
  async function open(nextTab = 'personal') {
    frame(); if (!dialog.open) dialog.showModal(); tab = nextTab; editDirty=false; shell('<p>Loading your CRM library…</p>');
    try { if (!data) await load(); render(); } catch(e) { say(e.message,true); }
  }
  function render() {
    if (!data) return;
    if (tab === 'masters') { masters(); return; }
    const scope=tab, canEdit=permitted(scope), items=data[scope].items || [];
    shell(`<div class="sl83-tools"><label>Search blocks<input type="search" data-search placeholder="Search title, type or category"></label>${canEdit?'<button type="button" class="primary" data-new>+ Create block</button>':''}</div><p class="sl83-help">${scope==='personal' ? (data.canSavePersonal?'Saved to your adviser account and available on your other devices.':'Link your login to an adviser to save personal blocks.') : 'Available to all advisers. Administrators maintain these blocks.'} Adding a block creates an independent client copy.</p><div class="sl83-list"></div>${adapter().legacy?.().length?'<details><summary>Earlier saved wording</summary><p>Import reviewed wording from the earlier library into your CRM block library.</p><div data-legacy></div></details>':''}`);
    const list = dialog.querySelector('.sl83-list');
    const draw = query => {
      const matches = items.filter(x=>`${x.title} ${x.kind} ${x.category}`.toLowerCase().includes(query.toLowerCase()));
      list.innerHTML = matches.length ? matches.map(x=>`<article><div><span class="sl83-eyebrow">${esc(x.kind||'section')} · ${esc(x.category||'All categories')}</span><h3>${esc(x.title)}</h3><p>${esc(x.note||'Reusable content — tailor after adding.')}</p></div><div class="sl83-actions"><button type="button" class="primary" data-add="${esc(x.id)}">Add to document</button><button type="button" data-preview="${esc(x.id)}">Preview${canEdit?' / edit':''}</button>${canEdit?`<button type="button" data-copy="${esc(x.id)}">Duplicate</button><button type="button" data-delete="${esc(x.id)}">Remove</button>`:''}</div></article>`).join('') : '<div class="sl83-empty">No blocks here yet. Create a block, or save one while editing a document.</div>';
      list.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{ try { const added=await adapter().insert(clone(items.find(x=>x.id===b.dataset.add))); if(added===false)return; say('Block added to the client draft. Save the document when ready.'); }catch(e){say(e.message,true);} });
      list.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>editBlock(clone(items.find(x=>x.id===b.dataset.preview)),scope,!canEdit));
      list.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{const x=clone(items.find(x=>x.id===b.dataset.copy));x.id=uid();x.title+=' (copy)';editBlock(x,scope);});
      list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
        if (!(await confirm('Remove this library block? Copies already added to client documents are retained.'))) return;
        await run(async()=>{const next=clone(data[scope]);next.items=next.items.filter(x=>x.id!==b.dataset.delete);await persist(scope,next);status='Block removed.';render();});
      });
    }; draw(''); dialog.querySelector('[data-search]').oninput=e=>draw(e.target.value);
    dialog.querySelector('[data-new]')?.addEventListener('click',()=>editBlock({id:uid(),title:'New block',html:'<p>Add reusable wording here.</p>',kind:'section',category:adapter().category(),requests:[]},scope));
    const legacy = dialog.querySelector('[data-legacy]');
    if (legacy) for(const item of adapter().legacy()) { const b=document.createElement('button');b.type='button';b.textContent=`Import: ${item.title}`;b.disabled=!canEdit;b.onclick=()=>editBlock({...clone(item),id:uid(),kind:'section',requests:[]},scope);legacy.append(b); }
  }
  async function run(fn) {
    if(busy)return; busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try { await fn(); } catch(e) {say(e.message,true);} finally {busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=b.dataset.readonly==='true');}
  }
  const toolbar = () => `<div class="sl83-format" role="toolbar" aria-label="Block formatting">${[['bold','Bold'],['italic','Italic'],['insertUnorderedList','Bullets'],['insertOrderedList','Numbered list'],['heading','Heading'],['table','Table'],['callout','Callout'],['cards','Cards'],['steps','Steps']].map(([id,label])=>`<button type="button" data-format="${id}">${label}</button>`).join('')}</div>`;
  function bindEditor(editor, onChange) {
    editor.oninput=()=>{editDirty=true;onChange(clean(editor.innerHTML));};
    editor.onpaste=e=>{e.preventDefault();document.execCommand('insertHTML',false,clean(e.clipboardData.getData('text/html')||esc(e.clipboardData.getData('text/plain')).replace(/\n/g,'<br>')));};
    dialog.querySelectorAll('[data-format]').forEach(b=>{
      b.onmousedown=e=>e.preventDefault();b.onclick=()=>{
        editor.focus(); const cmd=b.dataset.format;
        const snippets={table:'<table><tr><th>Item</th><th>Details</th></tr><tr><td>Document</td><td>Guidance</td></tr></table><p><br></p>',callout:'<div class="callout"><p>Important guidance.</p></div><p><br></p>',cards:'<div class="strategy-grid"><div class="strategy-card"><h3>First priority</h3><p>Add guidance.</p></div><div class="strategy-card"><h3>Next priority</h3><p>Add guidance.</p></div></div><p><br></p>',steps:'<div class="timeline"><div class="timeline-item"><span class="timeline-step">Step 1</span><div class="timeline-body"><h3>First step</h3><p>Add guidance.</p></div></div><div class="timeline-item"><span class="timeline-step">Step 2</span><div class="timeline-body"><h3>Next step</h3><p>Add guidance.</p></div></div></div><p><br></p>'};
        if(snippets[cmd])document.execCommand('insertHTML',false,snippets[cmd]);else if(cmd==='heading')document.execCommand('formatBlock',false,'h3');else document.execCommand(cmd);editDirty=true;onChange(clean(editor.innerHTML));
      };
    });
  }
  function signoffFields(value={}) {
    return `<fieldset class="sl83-signoff"><legend>Sign-off defaults</legend><div class="sl83-fields">${[['closing','Closing line','Kind regards,'],['role','Role','Licensed Immigration Adviser'],['organisation','Organisation','Turner Hopkins Immigration Specialists']].map(([key,label,fallback])=>`<label>${label}<input data-signoff="${key}" value="${esc(value[key]??fallback)}"></label>`).join('')}<label>Presentation<select data-signoff="style">${['simple','card','line'].map(s=>`<option ${s===(value.style||'simple')?'selected':''}>${s}</option>`).join('')}</select></label></div><p class="sl83-help">Adviser name and licence fill from the client draft. The real THiS logo is added in the document.</p></fieldset>`;
  }
  function readSignoff() { return Object.fromEntries([...dialog.querySelectorAll('[data-signoff]')].map(el=>[el.dataset.signoff,el.value])); }

  function requestRow83(r={}) {
    return `<article class="sl83-request"><div class="sl83-fields"><label>Document name<input data-request-title value="${esc(r.title||'')}"></label><label>Guidance<input data-request-note value="${esc(r.note||'')}"></label></div><fieldset><legend>People to suggest</legend><div class="sl83-role-choices">${['Main applicant','Partner','Child','Other'].map(role=>`<label class="sl83-check"><input type="checkbox" data-request-role="${role}" ${(r.roles||[]).includes(role)?'checked':''}>${role}</label>`).join('')}</div></fieldset><button type="button" data-remove-request>Remove request</button></article>`;
  }
  function requestsEditor(requests) {
    return `<section class="sl83-requests" data-request-editor><h3>Document requests</h3><p class="sl83-help">Suggest roles here. When the block is added, the adviser can select the actual named people.</p><div data-request-rows>${(requests||[]).map(requestRow83).join('')}</div><button type="button" data-add-request>+ Add document request</button></section>`;
  }
  function readRequests83() {
    return [...dialog.querySelectorAll('.sl83-request')].map(row=>({title:row.querySelector('[data-request-title]').value.trim(),note:row.querySelector('[data-request-note]').value.trim(),roles:[...row.querySelectorAll('[data-request-role]:checked')].map(el=>el.dataset.requestRole)}));
  }
  function bindRequests83(changed) {
    const host=dialog.querySelector('[data-request-editor]');if(!host)return;
    host.addEventListener('input',()=>{editDirty=true;changed?.();});
    host.addEventListener('click',event=>{
      if(event.target.closest('[data-add-request]')){host.querySelector('[data-request-rows]').insertAdjacentHTML('beforeend',requestRow83());editDirty=true;changed?.();host.querySelector('.sl83-request:last-child input').focus();}
      if(event.target.closest('[data-remove-request]')){event.target.closest('.sl83-request').remove();editDirty=true;changed?.();}
    });
  }
  function editBlock(item, scope, readOnly=false) {
    shell(`<div class="sl83-tools"><h3>${readOnly?'Preview block':'Edit reusable block'}</h3><button type="button" data-back>Back to library</button></div><div class="sl83-fields">${data.canManageTeam?`<label>Save in<select data-destination><option value="personal" ${scope==='personal'?'selected':''}>My blocks</option><option value="team" ${scope==='team'?'selected':''}>Team blocks</option></select></label>`:''}<label>Block title<input data-title value="${esc(item.title)}" maxlength="160"></label><label>Type<select data-kind>${adapter().kinds.map(k=>`<option value="${k}" ${item.kind===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label><label>Visa category<select data-category><option value="">All categories</option>${adapter().categories().map(c=>`<option value="${esc(c.id)}" ${item.category===c.id?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label><label>Library description<input data-note value="${esc(item.note||'')}"></label></div><p class="sl83-help">Use {{preparedFor}}, {{firstName}} and {{agreedPathway}} for client details. Review names, evidence and case-specific advice before saving.</p><div class="sl83-split"><section>${toolbar()}<div class="sl83-editor" data-editor contenteditable="${!readOnly}" role="textbox" aria-label="Reusable block content" aria-multiline="true">${clean(item.html)}</div>${adapter().studio==='instructions'?requestsEditor(item.requests):''}${adapter().supportsSignoff?signoffFields(item.signoff):''}</section><section><h3>Live block preview</h3><div class="sl83-preview" data-preview-body>${clean(item.html)}</div></section></div>${readOnly?(data.canSavePersonal?'<button type="button" data-personal-copy>Make a personal copy</button>':''):`<label class="sl83-check"><input type="checkbox" data-reviewed> I have removed client-specific information and reviewed the reusable content.</label><div class="sl83-actions"><button type="button" class="primary" data-save>Save to ${scope==='team'?'Team blocks':'My blocks'}</button></div>`}`);
    dialog.querySelector('[data-back]').onclick=async()=>{if(!editDirty||await confirm('Discard these unsaved block edits?')){editDirty=false;render();}};
    bindEditor(dialog.querySelector('[data-editor]'),html=>dialog.querySelector('[data-preview-body]').innerHTML=html);bindRequests83();
    dialog.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('input',()=>{editDirty=true;}));
    dialog.querySelector('[data-personal-copy]')?.addEventListener('click',()=>editBlock({...clone(item),id:uid(),title:item.title+' (copy)'},'personal'));
    const signoff=dialog.querySelector('.sl83-signoff'),split=dialog.querySelector('.sl83-split');if(signoff)split.before(signoff);const toggle=()=>{const kind=dialog.querySelector('[data-kind]').value;if(signoff)signoff.hidden=kind!=='sign-off';split.hidden=kind==='sign-off';const requests=dialog.querySelector('[data-request-editor]');if(requests)requests.hidden=kind!=='section';};toggle();dialog.querySelector('[data-kind]').addEventListener('change',toggle);
    if(readOnly){dialog.querySelectorAll('input,select,textarea,[data-format],[data-add-request],[data-remove-request]').forEach(el=>{el.disabled=true;el.dataset.readonly='true';});return;}
    dialog.querySelector('[data-save]').onclick=()=>run(async()=>{
      if(!dialog.querySelector('[data-reviewed]').checked)throw new Error('Review the reusable content and tick the confirmation before saving.');
      const value={...item,title:dialog.querySelector('[data-title]').value.trim(),kind:dialog.querySelector('[data-kind]').value,category:dialog.querySelector('[data-category]').value,note:dialog.querySelector('[data-note]').value.trim(),html:clean(dialog.querySelector('[data-editor]').innerHTML),requests:dialog.querySelector('[data-kind]').value==='section'?readRequests83():[],...(dialog.querySelector('[data-kind]').value==='sign-off'?{signoff:readSignoff()}:{})};
      if(!value.title||!value.html.trim())throw new Error('Add a title and content.');if(value.requests.some(r=>!r.title))throw new Error('Add a document name for each request, or remove the empty request.');
      const destination=dialog.querySelector('[data-destination]')?.value||scope;if(!permitted(destination))throw new Error('You cannot save to that library.');
      const next=clone(data[destination]);const index=next.items.findIndex(x=>x.id===value.id);if(index<0)next.items.push(value);else next.items[index]=value;
      await persist(destination,next);tab=destination;editDirty=false;status='Reusable block saved to the CRM.';render();
    });
  }
  let masterCategory='', master=null, docId='', blockId='intro';
  function masters() {
    if(!masterCategory)masterCategory=adapter().category();
    const entry=data.team.masters?.[masterCategory];master=clone(entry?.draft||entry?.published||adapter().master(masterCategory));
    docId=Object.keys(master.docs)[0];blockId='intro';masterForm();
  }
  function masterForm() {
    const canEdit=data.canManageTeam, entry=data.team.masters?.[masterCategory], d=master.docs[docId];
    const contentOnly=adapter().masterContentOnly?.includes(docId);if(contentOnly&&blockId==='intro'&&d.blocks.length)blockId=d.blocks[0].id;
    const b=d.blocks.find(x=>x.id===blockId), html=blockId==='intro'?d.intro||'':b?.html||b?.templateHtml||'';
    shell(`<div class="sl83-tools"><label>Application type<select data-master-category>${adapter().categories().map(c=>`<option value="${esc(c.id)}" ${c.id===masterCategory?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label><span class="sl83-badge">${entry?.published?'Published '+esc(dateLabel(entry.publishedAt)):'Built-in starting template'}</span></div><p class="sl83-help">${canEdit?'Edit a separate master draft, preview it, then publish for future documents.':'Published starting templates are maintained by administrators.'} Existing client documents keep their wording. Up to 20 published versions are retained.</p><div class="sl83-master-layout"><aside><label>Guide<select data-guide>${Object.entries(master.docs).map(([id,x])=>`<option value="${esc(id)}" ${id===docId?'selected':''}>${esc(x.label||id)}</option>`).join('')}</select></label>${contentOnly?'':`<button type="button" data-section="intro" class="${blockId==='intro'?'active':''}">Header & introduction</button>`}${d.blocks.map(x=>`<button type="button" data-section="${esc(x.id)}" class="${blockId===x.id?'active':''}">${esc(x.title)}</button>`).join('')}${canEdit?'<button type="button" data-new-section>+ Add section</button>':''}</aside><section><div class="sl83-fields"><label>${b?'Section heading':'Cover heading'}<input data-master-title value="${esc(b?b.title:d.coverTitle||d.label)}"></label>${!b?`<label>Cover subtitle<input data-subtitle value="${esc(d.coverSubtitle||'')}"></label>`:`<label class="sl83-check"><input type="checkbox" data-enabled ${b.enabled!==false?'checked':''}> Include by default</label>`}</div>${b&&canEdit?'<div class="sl83-actions"><button type="button" data-up>↑ Up</button><button type="button" data-down>↓ Down</button><button type="button" data-duplicate>Duplicate</button><button type="button" data-remove>Remove section</button></div>':''}${docId==='payments'&&b?`<fieldset><legend>Services covered by this payment</legend>${(master.docs.services?.blocks||[]).map(service=>`<label class="sl83-check"><input type="checkbox" data-service-link="${esc(service.id)}" ${(b.serviceIds||[]).includes(service.id)?'checked':''} ${!canEdit?'disabled':''}>${esc(service.title)}</label>`).join('')}</fieldset>`:''}<div class="sl83-split"><section>${toolbar()}<div class="sl83-editor" data-editor contenteditable="${canEdit}" role="textbox" aria-label="Master wording" aria-multiline="true">${clean(html)}</div>${b&&adapter().studio==='instructions'?requestsEditor(b.requests):''}</section><section><h3>Live section preview</h3><div class="sl83-preview" data-preview-body>${clean(html)}</div><p class="sl83-help">Merge fields fill from the client draft. Full-document pagination is checked in Studio.</p></section></div></section></div><div class="sl83-publish">${adapter().settings?`<fieldset><legend>Agreement defaults</legend><div class="sl83-fields">${adapter().settings.map(([key,label])=>`<label>${esc(label)}<input data-setting="${esc(key)}" value="${esc(master.settings?.[key]||'')}"></label>`).join('')}</div></fieldset>`:''}${adapter().supportsSignoff?signoffFields(master.signoff):''}${canEdit?'<label>Change note<input data-change-note placeholder="Describe this template update"></label><label class="sl83-check"><input type="checkbox" data-master-reviewed> I have reviewed this master and removed client-specific information.</label><div class="sl83-actions"><button type="button" data-save-master>Save master draft</button><button type="button" class="primary" data-publish>Publish version</button></div>':''}<button type="button" data-apply ${!entry?.published?'disabled data-readonly="true"':''}>Apply published template to this draft…</button><details><summary>Published version history</summary>${(entry?.versions||[]).slice().reverse().map(v=>`<article><div><strong>${esc(v.label||'Version')} · ${esc(dateLabel(v.at))}</strong><p>${esc(v.note)}</p></div>${canEdit?`<button type="button" data-restore="${esc(v.id)}">Restore into draft</button>`:''}</article>`).join('')||'<p>No published changes yet.</p>'}</details></div>`);
    const sync=()=>{if(adapter().settings)master.settings=Object.fromEntries([...dialog.querySelectorAll('[data-setting]')].map(el=>[el.dataset.setting,el.value]));if(adapter().supportsSignoff)master.signoff=readSignoff();if(b){b.title=dialog.querySelector('[data-master-title]').value;b.enabled=dialog.querySelector('[data-enabled]').checked;b.html=clean(dialog.querySelector('[data-editor]').innerHTML);b.templateHtml=b.html;b.requests=readRequests83();if(docId==='payments')b.serviceIds=[...dialog.querySelectorAll('[data-service-link]:checked')].map(el=>el.dataset.serviceLink);}else{d.coverTitle=dialog.querySelector('[data-master-title]').value;d.coverSubtitle=dialog.querySelector('[data-subtitle]').value;d.intro=clean(dialog.querySelector('[data-editor]').innerHTML);}};
    bindEditor(dialog.querySelector('[data-editor]'),html=>{dialog.querySelector('[data-preview-body]').innerHTML=html;sync();});bindRequests83(sync);
    dialog.querySelectorAll('.sl83-master-layout input,.sl83-master-layout textarea,[data-signoff],[data-setting]').forEach(el=>el.oninput=()=>{editDirty=true;sync();});
    dialog.querySelector('[data-master-category]').onchange=async e=>{if(editDirty&&!(await confirm('Discard unsaved master edits and change application type?'))){e.target.value=masterCategory;return;}editDirty=false;masterCategory=e.target.value;masters();};
    dialog.querySelector('[data-guide]').onchange=e=>{sync();docId=e.target.value;blockId='intro';masterForm();};
    dialog.querySelectorAll('[data-section]').forEach(el=>el.onclick=()=>{sync();blockId=el.dataset.section;masterForm();});
    if(!canEdit){dialog.querySelectorAll('.sl83-master-layout input,.sl83-master-layout textarea,[data-signoff],[data-setting],[data-format],[data-add-request],[data-remove-request]').forEach(el=>{el.disabled=true;el.dataset.readonly='true';});}
    const modify=fn=>{sync();fn();editDirty=true;masterForm();};
    dialog.querySelector('[data-new-section]')?.addEventListener('click',()=>modify(()=>{const x={id:uid(),title:'New section',html:'<p>Add guidance.</p>',enabled:true};d.blocks.push(x);blockId=x.id;}));
    dialog.querySelector('[data-duplicate]')?.addEventListener('click',()=>modify(()=>{const x={...clone(b),id:uid(),title:b.title+' (copy)'};d.blocks.splice(d.blocks.indexOf(b)+1,0,x);blockId=x.id;}));
    for(const [selector,delta] of [['[data-up]',-1],['[data-down]',1]])dialog.querySelector(selector)?.addEventListener('click',()=>modify(()=>{const i=d.blocks.indexOf(b),j=i+delta;if(j>=0&&j<d.blocks.length)[d.blocks[i],d.blocks[j]]=[d.blocks[j],d.blocks[i]];}));
    dialog.querySelector('[data-remove]')?.addEventListener('click',async()=>{if(await confirm('Remove this section from the master draft? Existing client documents are unchanged.'))modify(()=>{d.blocks=d.blocks.filter(x=>x.id!==b.id);blockId='intro';});});
    const saveMaster=publish=>run(async()=>{
      sync();if(!dialog.querySelector('[data-master-reviewed]').checked)throw new Error('Review the master and tick the confirmation before saving.');
      if(Object.values(master.docs).some(d=>d.blocks.some(b=>(b.requests||[]).some(r=>!r.title))))throw new Error('Add a name to every document request before saving.');
      const note=dialog.querySelector('[data-change-note]').value.trim();if(publish&&!note)throw new Error('Add a change note before publishing.');
      const next=clone(data.team);next.masters ||= {};const previous=next.masters[masterCategory]||{versions:[]};
      const current={...previous,draft:clone(master)};
      if(publish){const at=new Date().toISOString();current.published=clone(master);current.publishedAt=at;current.sequence=(previous.sequence||previous.versions.length)+1;current.versions=[...current.versions,{id:uid(),label:'v'+current.sequence,at,note,snapshot:clone(master)}].slice(-20);}
      next.masters[masterCategory]=current;await persist('team',next);editDirty=false;status=publish?'Master published. Existing client drafts were not changed.':'Master draft saved. Published template is unchanged.';masterForm();
    });
    dialog.querySelector('[data-save-master]')?.addEventListener('click',()=>saveMaster(false));dialog.querySelector('[data-publish]')?.addEventListener('click',()=>saveMaster(true));
    dialog.querySelector('[data-apply]').onclick=async()=>{
      if(adapter().category()!==masterCategory){say('Select the same application type as this client draft before applying a template.',true);return;}
      if(await confirm(adapter().applyMessage)){try{adapter().applyPublished(data.team.masters,false);say('Published template applied to this client draft. Review and save the document.');}catch(e){say(e.message,true);}}
    };
    dialog.querySelectorAll('[data-restore]').forEach(el=>el.onclick=async()=>{if(await confirm('Restore this published version into the editable master draft? Publish again to use it for future documents.')){master=clone(entry.versions.find(v=>v.id===el.dataset.restore).snapshot);docId=Object.keys(master.docs)[0];blockId='intro';editDirty=true;masterForm();}});
  }
  async function capture() {
    if(adapter().locked?.()){adapter().notify('Issued agreements are preserved. Create a new draft first.');return;}
    await open('personal');if(!data)return;
    try {const value=adapter().capture();if(!value)throw new Error('Select an editable block first.');editBlock({...value,id:uid()},'personal');}catch(e){say(e.message,true);}
  }
  window.THIS_STUDIO_LIBRARY83 = {open, capture, init, clean, items:()=>data?[...data.personal.items.map(x=>({...x,scope:'personal'})),...data.team.items.map(x=>({...x,scope:'shared'}))]:[], published:category=>data?.team?.masters?.[category]?.published, available:()=>Boolean(data), captureToTeam:async()=>{await open('team');if(data?.canManageTeam){const value=adapter().capture();if(value)editBlock({...value,id:uid()},'team');}}};
  function mount() {
    if(new URLSearchParams(location.search).has('token')||!adapter())return;
    const host=adapter().toolbar();if(!host)return;
    const button=document.createElement('button');button.type='button';button.className='sl83-launch';button.textContent='Templates & blocks';button.onclick=()=>open('personal');host.append(button);
    const save=document.createElement('button');save.type='button';save.className='sl83-launch';save.textContent='Save reusable block';save.onclick=capture;host.append(save);

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,20));else setTimeout(mount,20);
})();
