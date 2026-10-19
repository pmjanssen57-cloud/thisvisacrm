import { SidePanel } from './ui/SidePanel.jsx';
import { useWorkspaceState } from './ui/workspace-state.js';
import React, { useMemo, useState } from 'react';
import { employerMatchReasons, relatedEmployerQuestionnaires } from './employer-questionnaire-matches.mjs';

const date = (value) => value ? new Date(value).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }) : '—';
const label = (value) => ({nzbn:'NZBN',gstNumber:'GST number',irdNumber:'IRD number'}[value] || String(value).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
function Answer({ value }) {
  if (value == null || value === '') return <span className="muted">Not recorded</span>;
  if (typeof value === 'boolean') return <>{value ? 'Yes' : 'No'}</>;
  if (Array.isArray(value)) return value.length ? <div>{value.map((item, i) => <div className="employer-answer-item" key={i}><Answer value={item} /></div>)}</div> : <>None recorded</>;
  if (typeof value === 'object') return <dl className="employer-answer-grid">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{label(key)}</dt><dd><Answer value={item} /></dd></div>)}</dl>;
  return <>{String(value)}</>;
}

export function EmployerQuestionnaireDetails({ questionnaire: q, onDownload }) {
  return <div className="employer-review-details">
    <dl className="employer-answer-grid">
      {Object.entries({ legalName:q.legalName, tradingName:q.tradingName, nzbn:q.nzbn, companyNumber:q.companyNumber, gstNumber:q.gstNumber, irdNumber:q.irdNumber,
        contact:[q.contactFirstName,q.contactLastName].filter(Boolean).join(' '), email:q.contactEmail, phone:q.contactPhone,
        application:q.applicationType, accreditationType:q.accreditationType, currentAccreditationExpiry:q.currentAccreditationExpiry,
        businessOperationLength:q.businessOperationLength, viabilityBasis:q.viabilityBasis }).map(([key,value]) => <div key={key}><dt>{label(key)}</dt><dd><Answer value={value} /></dd></div>)}
    </dl>
    <details><summary>Key people ({(q.keyPeople || []).length})</summary><Answer value={q.keyPeople || []} /></details>
    <details><summary>Compliance declarations</summary><Answer value={q.declarations || {}} /></details>
    <details><summary>All submitted answers</summary><Answer value={Object.fromEntries(Object.entries(q.rawPayload || {}).filter(([key]) => !['uploadedFiles','resumeToken'].includes(key)))} /></details>
    <div><h4>Supporting documents ({(q.uploadedFiles || []).length})</h4>{(q.uploadedFiles || []).map((file,i) => <div className="employer-file-row" key={file.fileId || file.id || i}><span>{file.fileName || 'Supporting document'}</span>{onDownload && <button className="btn mini" type="button" onClick={() => onDownload(q.id,file.fileId || file.id)}>Download</button>}</div>)}{!q.uploadedFiles?.length && <p className="muted">No supporting documents supplied.</p>}</div>
  </div>;
}

export function EmployerQuestionnaireInbox({ questionnaires = [], drafts = [], clients = [], onProcess, onDownload, onOpenClient, onRefresh, saving }) {
  const [view,setView] = useWorkspaceState('employers:view','Submitted');
  const [query,setQuery] = useWorkspaceState('employers:query','');
  const [selectedId,setSelectedId] = useState('');
  const [target,setTarget] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const selected = questionnaires.find((q) => q.id === selectedId);
  const matches = useMemo(() => selected ? clients.map((client) => ({client,reasons:employerMatchReasons(selected,client)})).filter((item) => item.reasons.length).sort((a,b) => Number(b.reasons.includes('NZBN')) - Number(a.reasons.includes('NZBN')) || b.reasons.length-a.reasons.length) : [],[selected,clients]);
  const related = selected ? relatedEmployerQuestionnaires(selected,questionnaires) : [];
  const searching = (row) => [row.legalName,row.tradingName,row.nzbn,row.contactEmail,row.contactFirstName,row.contactLastName].join(' ').toLowerCase().includes(query.toLowerCase());
  const rows = questionnaires.filter((row) => searching(row) && (view === 'All' || (view === 'Submitted' ? !row.commercialClientId : Boolean(row.commercialClientId))));
  function select(id) {setSelectedId(id);setTarget('');setError('');setNotice('');}
  async function process(mode) {
    if (busy || saving || !selected) return;
    setBusy(true);setError('');setNotice('');
    try {
      const result = await onProcess({questionnaireId:selected.id,mode,commercialClientId:target});
      setNotice(result?.alreadyLinked ? 'This questionnaire was already linked. Its existing link has been retained.' : 'Questionnaire processed. Details, history and supporting documents are now on the commercial client.');
    } catch (err) {setError(err.message || 'Unable to process the questionnaire.');}
    finally {setBusy(false);}
  }
  async function download(id,fileId) {try {setError('');await onDownload(id,fileId);} catch(err) {setError(err.message || 'Unable to download supporting document.');}}
  return <div className="employer-inquiry-panel">
    <div className="commercial-panel-head"><div><h2>Employer questionnaires</h2><p>Review submissions, choose the employer record, then transfer the questionnaire and supporting documents.</p></div><button type="button" className="btn" disabled={busy || saving} onClick={() => onRefresh?.({full:true})}>Refresh</button></div>
    <div className="employer-queue-toolbar"><label>Show <select aria-label="Show" value={view} onChange={(e) => {setView(e.target.value);select('');}}>{['Submitted','Processed / linked','All','Drafts / in progress'].map((v) => <option key={v}>{v}</option>)}</select></label><label>Search employers <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Business, NZBN or contact" /></label></div>
    {error && <p className="error-banner" role="alert">{error}</p>}{notice && <p className="success-banner" role="status">{notice}</p>}
    {view === 'Drafts / in progress' ? <div className="employer-queue-list">
      <p className="muted">Saved drafts stay separate until submitted. Expired drafts remain visible for follow-up.</p>
      {drafts.filter(searching).map((draft) => <article className="employer-queue-card" key={draft.id}><strong>{draft.legalName || 'Business name not yet entered'}</strong><span>{draft.contactFirstName} {draft.contactLastName} · {draft.contactEmail}</span><span>NZBN: {draft.nzbn || 'Not recorded'}</span><span>{new Date(draft.expiresAt) < new Date() ? 'Expired draft' : 'In progress'} · Step {draft.currentStep || 1}/6 · {draft.progressPercent || 0}%</span><small>Last saved {date(draft.updatedAt)} · Resume expires {date(draft.expiresAt)}</small></article>)}
      {!drafts.filter(searching).length && <p>No saved employer drafts match this view.</p>}
    </div> : <>
      <div className="employer-queue-list" aria-label="Employer questionnaire submissions">
        {rows.map((q) => {const duplicates=relatedEmployerQuestionnaires(q,questionnaires).length;return <button type="button" className={`employer-queue-card ${q.id === selectedId ? 'selected' : ''}`} key={q.id} onClick={()=>select(q.id)}><strong>{q.legalName}</strong><span>{q.contactEmail} · NZBN {q.nzbn || 'not recorded'}</span><span>{q.applicationType} · {q.accreditationType}</span><small>{q.commercialClientId ? 'Processed / linked' : q.status} · {date(q.submittedAt)}</small>{(duplicates > 0 || Object.values(q.duplicateFlags || {}).some((n)=>Number(n)>0)) && <span className="employer-duplicate-warning">Possible duplicate · {duplicates} related submission(s)</span>}</button>;})}
        {!rows.length && <p>No employer questionnaires match this view.</p>}
      </div>
      {selected && <SidePanel title={selected.legalName} subtitle="Employer questionnaire review" onClose={()=>select('')} busy={busy || saving} wide><section className="employer-review panel" aria-label="Employer questionnaire review">
        <div className="commercial-panel-head"><div><h3>{selected.legalName}</h3><p>{selected.status} · Submitted {date(selected.submittedAt)}</p></div><button type="button" className="btn" onClick={()=>select('')}>Close review</button></div>
        <EmployerQuestionnaireDetails questionnaire={selected} onDownload={download} />
        <details open={related.length > 0}><summary>Duplicate visibility and submission history ({related.length})</summary><p>Checks compare NZBN, legal/trading name and contact email. Every submission is retained.</p><Answer value={selected.duplicateFlags || {}} />{related.map((q)=><button type="button" className="btn" key={q.id} onClick={()=>{select(q.id);setView('All');}}>{q.legalName} · {date(q.submittedAt)} · {q.commercialClientId ? 'Linked' : q.status}</button>)}</details>
        {selected.commercialClientId ? <div className="employer-process-actions"><p>Linked to {clients.find((c)=>c.id===selected.commercialClientId)?.legalName || 'commercial client'}.</p><button type="button" className="btn dark" onClick={()=>onOpenClient(selected.commercialClientId)}>Open commercial client</button></div> : <div className="employer-process-actions">
          <h4>Possible commercial client matches ({matches.length})</h4>
          <p>Review each match before attaching. GST/IRD and accreditation details will be transferred; all answers and key people remain in the linked questionnaire history.</p>
          {matches.map(({client,reasons})=><label className="employer-match" key={client.id}><input type="radio" name="employer-match" checked={target===client.id} onChange={()=>setTarget(client.id)} /><span><strong>{client.legalName}</strong><small>{reasons.join(' · ')} · NZBN {client.nzbn || 'not recorded'} · {client.primaryContactEmail || 'No email'} · {client.clientStatus}</small></span></label>)}
          {!matches.length && <p className="muted">No possible matches found.</p>}
          <label>Choose any existing commercial client<select value={target} onChange={(e)=>setTarget(e.target.value)}><option value="">Select commercial client</option>{clients.map((client)=><option key={client.id} value={client.id}>{client.legalName} — {client.nzbn || client.primaryContactEmail || client.id}</option>)}</select></label>
          <div className="button-row"><button type="button" className="btn dark" disabled={!target || busy || saving} onClick={()=>process('attach')}>{busy ? 'Processing…' : 'Attach to existing commercial client'}</button><button type="button" className="btn" disabled={busy || saving} onClick={()=>process('create')}>Create commercial client from questionnaire</button></div>
          {matches.length > 0 && <p className="employer-duplicate-warning">Possible matches exist. Creating a client will retain a separate employer record.</p>}
        </div>}
      </section></SidePanel>}
    </>}
  </div>;
}
