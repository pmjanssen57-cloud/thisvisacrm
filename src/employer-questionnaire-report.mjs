import { EMPLOYER_REPORT_LOGO } from './employer-report-logo.mjs';
export const REVIEW_STATUSES = ['New', 'In review', 'Reviewed'];
export const reviewDraft = (q = {}) => ({ status: REVIEW_STATUSES.includes(q.review?.status) ? q.review.status : 'New', assignedAdviserId: q.review?.assignedAdviserId || '', outcome: q.review?.outcome || '', notes: q.review?.notes || '' });
export const employerLabel = (key) => ({ nzbn:'NZBN', gstNumber:'GST number', irdNumber:'IRD number', contactEmail:'Contact email', currentAccreditationExpiry:'Current accreditation expiry', nzResidenceRequirementMet:'NZ residence requirement met', trialPeriodsForAewv:'Trial periods for AEWV workers', triangularNzResidentPercent:'NZ resident workforce percentage', consentToContact:'Consent to contact', privacyAcknowledged:'Privacy acknowledged', declarationConfirmed:'Declaration confirmed' }[key] || String(key).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase()));
const groups = [
 ['Contact', ['contactFirstName','contactLastName','contactEmail','contactPhone']],
 ['Business', ['legalName','tradingName','entityType','nzbn','companyNumber','gstNumber','irdNumber','address','website','industry','businessDescription','businessOperationLength']],
 ['Accreditation', ['applicationType','accreditationType','currentAccreditationNumber','currentAccreditationExpiry','estimatedMigrantHires']],
 ['Business viability', ['viabilityBasis','viabilityComments']],
 ['Workforce and employment practices', ['workforceTotal','migrantWorkforceTotal','contractorsUsed','fixedTermCasualUsed','thirdPartyPlacement','recruitmentCostsPassedOn','settlementSupportProcess','employerModulesCompleted','trialPeriodsForAewv','nzResidenceRequirementMet','employmentPracticeComments']],
 ['Triangular employment', ['triangularHistoryMonths','triangularNzResidentPercent','triangularMonitoring','triangularHealthSafety','triangularComplaints']],
 ['Additional information and consent', ['declarationComments','additionalInformation','consentToContact','privacyAcknowledged','declarationConfirmed']],
];
const hidden = key => /token|hash|blobkey/i.test(key) || ['uploadedFiles','keyPeople','declarations','submittedVia'].includes(key);
export function employerSections(q = {}) {
 const raw = q.rawPayload || {}, covered = new Set(groups.flatMap(([,keys])=>keys));
 const sections = groups.map(([title,keys])=>({title,fields:keys.map(key=>({key,label:employerLabel(key),value:q[key]??raw[key]}))})).filter(s=>['Contact','Business','Accreditation','Business viability'].includes(s.title)||s.fields.some(f=>f.value!==undefined&&f.value!==null&&f.value!==''));
 const extra=Object.entries(raw).filter(([key])=>!covered.has(key)&&!hidden(key)).map(([key,value])=>({key,label:employerLabel(key),value}));
 if(extra.length)sections.push({title:'Other submitted information',fields:extra});
 return sections;
}
export const employerDate = value => value ? new Date(value).toLocaleString('en-NZ',{timeZone:'Pacific/Auckland'}) : 'Not recorded';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function answerHtml(value) {
 if(value==null||value==='')return '<span class="muted">Not recorded</span>';
 if(typeof value==='boolean')return value?'Yes':'No';
 if(Array.isArray(value))return value.length?value.map((item,i)=>`<div class="answer-item"><b>${i+1}.</b> ${answerHtml(item)}</div>`).join(''):'None recorded';
 if(typeof value==='object')return '<div class="object-grid">'+(Object.entries(value).filter(([key])=>!hidden(key)).map(([key,v])=>`<div class="answer-item"><span class="label">${esc(employerLabel(key))}</span>${answerHtml(v)}</div>`).join('')||'None recorded')+'</div>';
 return esc(value);
}
export function buildEmployerPrintHtml(q = {}, advisers = [], options = {}) {
 const logoUrl=options.logoUrl||EMPLOYER_REPORT_LOGO;
 const r=reviewDraft(q), adviser=advisers.find(a=>a.id===r.assignedAdviserId)?.name || 'Unassigned';
 const fields=rows=>rows.map(([name,value])=>`<div class="field ${typeof value==='string'&&value.length>180?'wide':''}"><span class="label">${esc(name)}</span><div>${answerHtml(value)}</div></div>`).join('');
 const section=(title,body)=>`<section><h2>${esc(title)}</h2>${body}</section>`;
 const review=section('Adviser review',`<div class="grid">${fields([['Review status',r.status],['Assigned adviser',adviser],['Consultation / outcome',r.outcome],['Adviser assessment notes',r.notes]])}</div><p class="muted">${options.unsaved?'Includes unsaved review changes.':`Last saved ${esc(employerDate(q.review?.updatedAt))}${q.review?.updatedBy?' by '+esc(q.review.updatedBy):''}.`}</p>`);
 const original=employerSections(q).map(s=>section(s.title,`<div class="grid">${fields(s.fields.map(f=>[f.label,f.value]))}</div>`)).join('');
 const people=section('Key people',answerHtml(q.keyPeople||q.rawPayload?.keyPeople||[]));
 const declarations=section('Compliance declarations',answerHtml(q.declarations||q.rawPayload?.declarations||{}));
 const docs=section('Supporting documents',q.uploadedFiles?.length?`<ol>${q.uploadedFiles.map(f=>`<li>${esc(f.fileName||'Supporting document')}</li>`).join('')}</ol><p class="muted">Original files are available separately from the CRM.</p>`:'<p>No supporting documents supplied.</p>');
 const onclick=options.inlineHandlers?' onclick="window.print()"':'', close=options.inlineHandlers?' onclick="window.close()"':'';
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(q.legalName||'Employer')} — employer questionnaire</title><style>
 *{box-sizing:border-box}body{margin:0;background:#f5f7f6;color:#223633;font:14px/1.55 Arial,sans-serif}.page{max-width:1000px;margin:auto;padding:28px}header{border-bottom:2px solid #07594f;padding-bottom:18px;margin-bottom:22px}.logo{width:180px;height:auto;max-height:85px;object-fit:contain}h1{font-size:27px;line-height:1.2;margin:16px 0 8px;color:#07594f}h2{font-size:18px;color:#07594f;margin:0 0 15px}section{background:#fff;border:1px solid #dce5df;border-radius:8px;padding:20px;margin:18px 0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 25px}.field,.answer-item{overflow-wrap:anywhere;white-space:pre-wrap;break-inside:avoid}.label{display:block;font-size:12px;font-weight:600;color:#536b5e;margin-bottom:4px}.answer-item{margin:10px 0}.object-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px}.object-grid>.answer-item{margin:0}.wide{grid-column:1/-1}.muted{color:#62736e;font-size:12px}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px;background:#07594f;color:#fff}.toolbar button{border:1px solid #fff;background:#fff;color:#07594f;border-radius:6px;padding:9px 13px;font-size:14px;margin-left:8px;cursor:pointer}footer{margin-top:24px;border-top:1px solid #dce5df;padding-top:12px}@media(max-width:600px){.grid{grid-template-columns:1fr}.page{padding:16px}.toolbar{flex-wrap:wrap}}@media print{@page{size:A4;margin:14mm}body{background:#fff;font-size:11px}.page{max-width:none;padding:0}.toolbar{display:none!important}section{padding:12px;border-radius:0;break-inside:avoid}h2{break-after:avoid}.field,.answer-item{break-inside:avoid}.grid{gap:12px 20px}.label{font-size:10px}.muted{font-size:10px}header{break-inside:avoid}.logo{width:155px}h1{font-size:23px}}
 </style></head><body><div class="toolbar"><strong>Employer accreditation questionnaire</strong><div><button id="employer-print"${onclick}>Print / save PDF</button><button id="employer-close"${close}>Close</button></div></div><main class="page"><header>${logoUrl?`<img class="logo" src="${esc(logoUrl)}" alt="THiS — Turner Hopkins Immigration Specialists">`:''}<h1>${esc(q.legalName||'Employer questionnaire')}</h1><p>${esc(q.applicationType||'Accreditation')} · ${esc(q.accreditationType||'Not recorded')}</p><p class="muted">Submitted ${esc(employerDate(q.submittedAt))} · ${q.commercialClientId?'Processed / linked':'Not linked to a commercial client'}<br>Questionnaire ${esc(q.id||'')}<br>Generated ${esc(employerDate(new Date().toISOString()))}</p></header>${review}${original}${people}${declarations}${docs}<footer class="muted">THiS · Employer questionnaire and internal adviser review. Original supporting files are not embedded in this report.</footer></main></body></html>`;
}
function downloadHtml(html, name) {
 const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=(String(name||'employer').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,70)||'employer')+'-questionnaire.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function downloadEmployerReport(q, advisers, options={}) {
 downloadHtml(buildEmployerPrintHtml(q,advisers,{...options,inlineHandlers:true}),q.legalName);
}
export function printEmployerReport(q, advisers, options={}) {
 const win=window.open('about:blank',`this-employer-${Date.now()}`,'width=1040,height=900,scrollbars=yes,resizable=yes');
 if(!win){downloadEmployerReport(q,advisers,options);return 'downloaded';}
 try {
  win.document.open();win.document.write(buildEmployerPrintHtml(q,advisers,options));win.document.close();
  const run=()=>{if(!win.closed){win.focus();win.print();}};
  win.document.getElementById('employer-print')?.addEventListener('click',run);
  win.document.getElementById('employer-close')?.addEventListener('click',()=>win.close());
  const images=[...win.document.images];
  const ready=Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});})));
  Promise.race([ready,new Promise(resolve=>setTimeout(resolve,1500))]).then(()=>setTimeout(run,120));
  return 'opened';
 }catch(error){win.close();throw error;}
}
