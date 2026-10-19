const help = {
  work: {
    title:'My Work help', summary:'Your next actions, together in one workspace.',
    sections:[{heading:'Choose your view',text:'Use Today & overdue, Next 7 days or All work. The adviser selector scopes the workspace; Responsibility separates main and backup matters. List is the default, with Board available as an alternative.'},{heading:'Update without leaving the list',text:'Select the pencil or next action to open Update matter. Record what happened, who acts next and the due or review date. Save changes returns to the same work list.'},{heading:'Waiting matters',text:'Client, third-party and INZ matters appear under Waiting for others when their review date is in range. A waiting matter needs a review date so it returns to your attention.'}],
    tips:['Select the client name to open the matter.','Appointments, personal tasks and saved shortcuts are below the work list.','Views and list positions are remembered for this browser session.'],
  },
  intake: {
    title:'Enquiries help',summary:'Review, assign and follow up on submissions before they become active client work.',
    sections:[{heading:'Review a submission',text:'Choose Contacts, Intake or Employer questionnaires. Open a row to review it in a side panel. Full assessment answers and communication actions are grouped into expandable sections.'},{heading:'Work through the queue',text:'Assign an adviser and record review notes. Save & next saves the current intake and opens the next visible assessment. Save changes closes the review panel.'},{heading:'Employer questionnaires',text:'Submissions wait here until you explicitly attach to an existing commercial client or create a client. Review NZBN, business-name and email matches first. The linked questionnaire history and supporting documents follow the employer record; duplicates remain visible.'}],
    tips:['Incomplete assessments and employer drafts remain separate from submitted questionnaires.','Creating a client is an explicit decision.','Archive actions remain available for selected enquiries.'],
  },
  clients: {
    title:'Clients help',summary:'People, employers and their next actions in one register.',
    sections:[{heading:'Find a record',text:'Use the search at the top of the app, then choose client type, adviser or status filters. Opening a matter and returning keeps the list view.'},{heading:'Everyday changes',text:'Client details opens the focused edit panel. Use Update matter to record progress and set the next action.'},{heading:'Detailed sections',text:'Documents, application stages, key dates, billing and portal sections start with a summary. Choose the section Edit action to work in place, then save to return to the summary.'}],
    tips:['Bulk checklist updates are saved with the client record.','Commercial records also include workers, Job Checks and compliance.','Use More for infrequent actions.'],
  },
  studio: {
    title:'Documents & templates help',summary:'Prepare agreements and client instructions in a consistent document workspace.',
    sections:[{heading:'Create a document',text:'Choose Agreements or Instructions. The New menu offers the available sources: client, intake or standalone. Review the source and document type before creating.'},{heading:'Edit and review',text:'Use Edit, Split view or Preview. On a phone, Sections opens the section list. Agreement wording has a formatted text editor. Next step moves through the builder fields.'},{heading:'Save, then issue',text:'Use Save to CRM for draft changes. Fees, signatories and the existing pre-issue checks still require review. Issuing an agreement and marking instructions ready remain separate actions. Accepted agreements remain locked.'}],
    tips:['Close Studio to return to the document list.','Template library and data export are under More.','The A4 document layout is separate from the editing interface.'],
  },
};
help.matter=help.clients;
help['client-record']=help.clients;
help['commercial-matter']=help.clients;
export function modernWorkspaceHelp(tab, fallback) { return help[tab] || fallback[tab] || fallback.dashboard; }
