import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import { Archive, Mail, Clock, RefreshCw, X } from 'lucide-react';
import './seminar-bulk.css';

const activeStatuses = ['Scheduled','Queued','Sending','Needs review'];
const when = (value, zone='Pacific/Auckland') => {try{return new Intl.DateTimeFormat('en-NZ',{timeZone:zone,day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(value));}catch{return 'Not available';}};

export default function SeminarBulkTools({ seminar, approvedCount=0, onAction, confirmAction, onArchived }) {
  const [jobs,setJobs]=useState([]),[open,setOpen]=useState(false),[preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [mode,setMode]=useState('now'),[lead,setLead]=useState('1440'),[subject,setSubject]=useState(''),[note,setNote]=useState('');
  const dialog=useRef(null),busyRef=useRef(false);busyRef.current=busy;
  const api=useRef(onAction),poll=useRef(false),requestKey=useRef(''),currentId=useRef(seminar?.id);api.current=onAction;currentId.current=seminar?.id;
  poll.current=open||jobs.some(j=>activeStatuses.includes(j.status)&&j.status!=='Needs review');
  useEffect(()=>{
    setJobs([]);setOpen(false);setPreview(null);setError('');setMessage('');
    if(!seminar?.id||!api.current)return;
    let live=true;
    const load=async()=>{try{const result=await api.current({operation:'jobs',seminarId:seminar.id});if(live)setJobs(result.jobs||[]);}catch(e){if(live)setError(e.message||'Could not load reminders.');}};
    load();const timer=setInterval(()=>{if(poll.current&&document.visibilityState==='visible')load();},15000);
    return()=>{live=false;clearInterval(timer);};
  },[seminar?.id]);
  useEffect(()=>{
    if(!open)return;const prior=document.activeElement;
    const frame=requestAnimationFrame(()=>dialog.current?.querySelector('button')?.focus());
    const keyboard=e=>{
      if(!dialog.current?.contains(document.activeElement))return;
      if(e.key==='Escape'&&!busyRef.current){e.preventDefault();setOpen(false);}
      if(e.key==='Tab'){
        const items=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href]')].filter(el=>el.getClientRects().length);
        const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };window.addEventListener('keydown',keyboard);return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keyboard);if(prior?.isConnected)prior.focus();};
  },[open]);

  async function refresh() {try{const result=await onAction({operation:'jobs',seminarId:seminar.id});if(currentId.current===seminar.id)setJobs(result.jobs||[]);}catch(e){setError(e.message);}}
  async function loadPreview(resetSubject=false) {
    setLoading(true);setError('');setPreview(null);requestKey.current=crypto.randomUUID();
    try{const result=await onAction({operation:'preview',seminarId:seminar.id});if(currentId.current!==seminar.id)return;setPreview(result.preview);if(resetSubject||!subject.trim())setSubject(result.preview.message.subject);}catch(e){setError(e.message||'Could not prepare reminder.');}finally{setLoading(false);}
  }
  async function openReminder() {setOpen(true);setMode('now');setNote('');setMessage('');await loadPreview(true);}
  const due=preview?(mode==='scheduled'?new Date(Date.parse(preview.details.eventAt)-Number(lead)*60000):new Date()):null;
  const invalidTime=mode==='scheduled'&&due&&due<=new Date();
  async function createReminder() {
    if(!preview||busy)return;
    const scheduled=mode==='scheduled';
    const confirmed=await confirmAction({title:scheduled?'Schedule seminar reminder?':'Send seminar reminder now?',message:scheduled?`Schedule the reminder for ${when(due,preview.details.timezone)}? The approved list is collected when sending starts, including later approvals.`:`Queue this reminder to ${preview.recipients.length} approved email address${preview.recipients.length===1?'':'es'} for ${preview.details.title}?`,details:['Each person receives their own email. Email addresses are not shared with other recipients.'],confirmLabel:scheduled?'Schedule reminder':'Queue reminder',tone:'send'});
    if(!confirmed)return;
    setBusy(true);setError('');
    try{
      const result=await onAction({operation:'create',seminarId:seminar.id,requestKey:requestKey.current,previewToken:preview.previewToken,mode,leadMinutes:Number(lead),subject,note});
      setJobs(result.jobs||[]);setOpen(false);setMessage(scheduled?'Reminder scheduled. It will use the approved list when sending starts.':'Reminder queued. Progress is shown below; Microsoft acceptance is recorded for each email.');
    }catch(e){setError(e.message||'Reminder could not be created.');}finally{setBusy(false);}
  }
  async function archive() {
    if(!seminar||busy)return;
    const confirmed=await confirmAction({title:'Close seminar and archive approved entries?',message:`Close ${seminar.title} and archive its ${approvedCount} approved registration${approvedCount===1?'':'s'}?`,details:['Public registration will close and pending reminders will stop.','New, declined and duplicate entries are retained unchanged.','Archived registrations remain available under Seminars → Archived. An email already in progress may finish.'],confirmLabel:'Close & archive approved',tone:'danger'});
    if(!confirmed)return;setBusy(true);setError('');
    try{const result=await onAction({operation:'archive',seminarId:seminar.id});setJobs(result.jobs||[]);setMessage(`Seminar closed. ${(result.seminarRegistrations||[]).length} approved registrations archived.`);onArchived?.();}catch(e){setError(e.message||'Could not archive registrations.');}finally{setBusy(false);}
  }
  async function jobAction(job,operation) {
    const retry=operation==='retryFailed';
    if(!await confirmAction({title:retry?'Retry failed reminder emails?':'Cancel this reminder?',message:retry?'Retry only definite failures? Sent and uncertain requests will not be resent.':'Stop the remaining queued emails for this reminder? An email already in progress may finish.',confirmLabel:retry?'Retry failed':'Cancel reminder',tone:retry?'send':'danger'}))return;
    setBusy(true);setError('');try{const result=await onAction({operation,seminarId:seminar.id,jobId:job.id});setJobs(result.jobs||[]);setMessage(retry?'Failed emails queued for another attempt.':'Pending reminder emails cancelled.');}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="seminar-bulk-tools" aria-label="Seminar bulk actions">
    <div className="seminar-bulk-head"><div><h3>Seminar actions</h3><p>{seminar?`${seminar.title} · ${approvedCount} approved registration${approvedCount===1?'':'s'}`:'Choose one seminar in “Registrations for” to send reminders or archive approved entries.'}</p></div><div className="seminar-bulk-buttons"><button className="btn dark" type="button" onClick={openReminder} disabled={!seminar||seminar.status!=='Active'||busy||!onAction}><Mail size={16}/>Remind approved</button><button className="btn" type="button" onClick={archive} disabled={!seminar||!approvedCount||busy||!onAction}><Archive size={16}/>Archive approved</button></div></div>
    {!open&&error&&<p role="alert" className="seminar-bulk-error">{error}</p>}{message&&<p role="status" className="seminar-bulk-message">{message}</p>}
    {seminar&&<details className="seminar-reminder-history" open={jobs.some(j=>activeStatuses.includes(j.status))}><summary>Reminders {jobs.length?`(${jobs.length})`:''}</summary><div className="seminar-history-head"><p>Scheduled reminders are checked about every five minutes. Sending uses individual emails.</p><button className="btn" type="button" onClick={refresh} disabled={busy}><RefreshCw size={15}/>Refresh reminders</button></div>{jobs.map(job=><article className="seminar-reminder-job" key={job.id}><div><strong>{job.subject}</strong><p><Clock size={14}/> {when(job.due_at,seminar.timezone)}</p><span className="seminar-job-status">{job.status}</span><p>{job.seeded_at?`${job.sent||0} sent · ${job.remaining||0} remaining · ${job.failed||0} failed · ${job.unknown||0} uncertain · ${job.skipped||0} skipped`:'Recipients will be collected from the approved list when sending starts.'}</p>{job.error_message&&<p className="seminar-bulk-error">{job.error_message}</p>}{Number(job.unknown)>0&&<p>Uncertain sends are not retried automatically. Check Microsoft Sent Items and the CRM email log before any resend.</p>}</div><div className="seminar-bulk-buttons">{activeStatuses.includes(job.status)&&<button className="btn" type="button" onClick={()=>jobAction(job,'cancel')} disabled={busy}>Cancel reminder</button>}{job.status==='Completed with errors'&&Number(job.failed)>0&&seminar.status==='Active'&&<button className="btn" type="button" onClick={()=>jobAction(job,'retryFailed')} disabled={busy}>Retry failed</button>}</div></article>)}{!jobs.length&&<p>No reminder batches for this seminar yet.</p>}</details>}
    {open&&createPortal(<div className="calm-ui"><div className="modal-layer seminar-reminder-layer" role="dialog" aria-modal="true" aria-labelledby="seminar-reminder-title"><button className="modal-backdrop" type="button" aria-label="Close reminder preview" onClick={()=>!busy&&setOpen(false)}/><section className="modal-card seminar-reminder-modal" ref={dialog}><header className="modal-head"><div><span>Approved registrations only</span><h2 id="seminar-reminder-title">Seminar reminder</h2></div><button className="icon-button" type="button" aria-label="Close reminder preview" onClick={()=>!busy&&setOpen(false)} disabled={busy}><X size={18}/></button></header><div className="seminar-reminder-content">{loading?<p role="status">Preparing recipient list and event details…</p>:preview&&<>
      <div className="seminar-reminder-event"><h3>{preview.details.title}</h3><p>{preview.details.nzTime}</p><a href={preview.details.link} target="_blank" rel="noreferrer">{preview.details.link}</a><p>{preview.recipients.length} distinct approved email addresses · {preview.duplicateCount} duplicate emails combined · {preview.invalidCount} invalid/missing emails excluded</p></div>
      <div className="seminar-reminder-fields"><label>Delivery<select value={mode} onChange={e=>setMode(e.target.value)} disabled={busy}><option value="now">Send reminder now</option><option value="scheduled">Schedule before the event</option></select></label>{mode==='scheduled'&&<label>Send before the event<select value={lead} onChange={e=>setLead(e.target.value)} disabled={busy}>{[['60','1 hour'],['120','2 hours'],['1440','24 hours'],['2880','48 hours'],['10080','1 week']].map(([v,l])=><option key={v} value={v}>{l} before</option>)}</select></label>}<label className="full">Email subject<input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={240} disabled={busy}/></label><label className="full">Extra message (optional)<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} maxLength={4000} disabled={busy}/></label></div>
      {mode==='scheduled'&&<p className={invalidTime?'seminar-bulk-error':'seminar-bulk-message'}>{invalidTime?'That reminder time has passed. Choose a shorter lead time or Send now.':`Scheduled for ${when(due,preview.details.timezone)}. Later approvals are included when sending starts; eligibility is checked again before each email.`}</p>}
      <details><summary>Approved recipient preview ({preview.recipients.length})</summary><ul className="seminar-reminder-recipients">{preview.recipients.map(r=><li key={r.email}><strong>{r.fullName||'Registrant'}</strong><span>{r.email}</span></li>)}</ul></details>
      <details open><summary>Email preview{preview.recipients[0]?` for ${preview.recipients[0].fullName||preview.recipients[0].email}`:''}</summary><p className="seminar-email-preview">{[preview.message.beforeNote,note.trim(),preview.message.afterNote].filter(Boolean).join('\n\n')}</p></details>
    </>}{error&&<p role="alert" className="seminar-bulk-error">{error}</p>}</div><footer className="seminar-reminder-footer"><button className="btn" type="button" onClick={()=>setOpen(false)} disabled={busy}>Cancel</button><button className="btn" type="button" onClick={()=>loadPreview(false)} disabled={busy||loading}><RefreshCw size={15}/>Reload preview</button><button className="btn dark" type="button" onClick={createReminder} disabled={busy||loading||!preview||invalidTime||!subject.trim()||mode==='now'&&!preview?.recipients.length}>{busy?'Saving…':mode==='scheduled'?'Schedule reminder':'Send reminder now'}</button></footer></section></div></div>,document.body)}
  </section>;
}
