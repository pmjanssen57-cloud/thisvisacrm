import React, { useEffect, useMemo, useRef, useState } from 'react';
import { acceptInvite, getUser, handleAuthCallback, login, logout, onAuthChange, requestPasswordRecovery, updateUser } from '@netlify/identity';
import { AlertTriangle, ArrowUpDown, BookOpen, Calculator, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock, CloudSun, Copy, CreditCard, ClipboardList, Database, DollarSign, Download, ExternalLink, FileText, Globe2, HelpCircle, LayoutDashboard, Link2, ListChecks, LockKeyhole, Mail, MessageSquare, MoreHorizontal, Phone, Plus, RefreshCw, Save, Search, Send, ShieldCheck, SlidersHorizontal, Trash2, UserRound, UsersRound, Wrench, X } from 'lucide-react';

const BRAND = {
  ink: '#003736',
  mint: '#55D9A0',
  pale: '#F4FBF8',
  line: '#D9E6E1',
};

const LOGO_SRC = '/turner-hopkins-logo.png';
const MAX_INTAKE_CV_BYTES = 5 * 1024 * 1024;
const INTAKE_CV_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const DEFAULT_STAGE_TEMPLATES = [
  { id: 'instruction-sent', label: 'Instruction Sent', mandatory: true, sortOrder: 1 },
  { id: 'documentation-gathering', label: 'Documentation Gathering', mandatory: true, sortOrder: 2 },
  { id: 'iqa-ready', label: 'IQA Ready', mandatory: false, sortOrder: 3 },
  { id: 'visitor-visa-ready', label: 'Visitor Visa Ready', mandatory: false, sortOrder: 4 },
  { id: 'work-visa-ready', label: 'Work Visa Ready', mandatory: false, sortOrder: 5 },
  { id: 'family-temporary-visas-ready', label: 'Family Temporary Visas Ready', mandatory: false, sortOrder: 6 },
  { id: 'residence-ready', label: 'Residence Ready', mandatory: false, sortOrder: 7 },
  { id: 'residence-approved', label: 'Residence Approved', mandatory: false, sortOrder: 8 },
];

const STAGE_KEY_ALIASES = {
  'instructions-sent': 'instruction-sent',
  'visitor-visa-lodged': 'visitor-visa-ready',
  'work-visa-lodged': 'work-visa-ready',
  'family-temporary-visas-lodged': 'family-temporary-visas-ready',
  'residence-lodged': 'residence-ready',
  'residence-approved-finalised': 'residence-approved',
};
const DEFAULT_CASE_TYPES = [
  'SMC Residence - Green List',
  'SMC Residence - Points',
  'Partner Residence',
  'Parent Residence',
  'Parent Retirement',
  'Active Investor',
  'AEWV Only',
  'Visitor Visa',
  'Partner WV Only',
  'Specific Purpose Work Visa',
  'Citizenship',
  'Permanent Residence',
  'Student Visa (Intl)',
];

const DEFAULT_DEADLINE_TYPES = [
  'Visa Expiry Date',
  'Medical Expiry Date',
  'Police Clearance Expiry Date',
  'PPI Response Date',
  'Filing Deadline Date',
];

const DEADLINE_SIGNAL_OPTIONS = [
  { value: 'active', label: 'Shown on dashboard' },
  { value: 'watching', label: 'Uses default dashboard setting' },
  { value: 'historical', label: 'Hidden from dashboard' },
  { value: 'deferred', label: 'Hidden from dashboard' },
  { value: 'completed', label: 'Hidden from dashboard' },
];

const DEADLINE_SIGNAL_LABELS = DEADLINE_SIGNAL_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label;
  return labels;
}, {});

const BILLING_STATUSES = ['WIP', 'Invoiced', 'Overdue'];
const BILLING_TRIGGER_TYPES = ['Date', 'Milestone'];
const APPOINTMENT_TYPES = ['Client meeting', 'Adviser review', 'Lodgement target', 'Document follow-up', 'INZ call', 'Billing follow-up', 'Internal review', 'Other'];
const ADVISER_AVAILABILITY_OPTIONS = ['Available', 'Away'];

const DOCUMENT_CHECKLIST_TEMPLATES = [
  { id: 'passports', name: 'Passports' },
  { id: 'passport-photos', name: 'Passport photos' },
  { id: 'birth-certificates', name: 'Birth certificates' },
  { id: 'marriage-certificate', name: 'Marriage certificate' },
  { id: 'relationship-evidence', name: 'Relationship evidence' },
  { id: 'work-experience', name: 'Work experience' },
  { id: 'qualifications', name: 'Qualifications' },
  { id: 'custody-documents', name: 'Custody documents' },
  { id: 'medicals', name: 'Medicals' },
  { id: 'police-clearances', name: 'Police Clearances' },
];

const LIBRARY_ENTRY_TYPES = ['Policy', 'Form'];
const LIBRARY_STATUSES = ['Current', 'Watch', 'Superseded', 'Archived', 'Acceptable until'];
const LIBRARY_CATEGORIES = ['Work', 'Residence', 'Family', 'Student', 'Visitor', 'Investor', 'Health', 'Character', 'Compliance', 'Forms', 'General'];
const INTAKE_STATUSES = ['New', 'Contacted', 'Converted', 'Spam / Duplicate'];
const SEMINAR_STATUSES = ['Active', 'Closed'];
const SEMINAR_REGISTRATION_STATUSES = ['New', 'Approved', 'Declined', 'Spam / Duplicate'];
const SEMINAR_ENGLISH_OPTIONS = ['Fluent', 'Medium', 'None'];
const SEMINAR_TIMEZONE_OPTIONS = [
  { value: 'Pacific/Auckland', label: 'New Zealand - Pacific/Auckland' },
  { value: 'Australia/Sydney', label: 'Australia Eastern - Australia/Sydney' },
  { value: 'Australia/Brisbane', label: 'Australia Queensland - Australia/Brisbane' },
  { value: 'Pacific/Fiji', label: 'Fiji - Pacific/Fiji' },
  { value: 'Pacific/Apia', label: 'Samoa - Pacific/Apia' },
  { value: 'Pacific/Tongatapu', label: 'Tonga - Pacific/Tongatapu' },
  { value: 'Asia/Kolkata', label: 'India - Asia/Kolkata' },
  { value: 'Asia/Manila', label: 'Philippines - Asia/Manila' },
  { value: 'Asia/Singapore', label: 'Singapore / Malaysia - Asia/Singapore' },
  { value: 'Asia/Shanghai', label: 'China - Asia/Shanghai' },
  { value: 'Asia/Dubai', label: 'United Arab Emirates - Asia/Dubai' },
  { value: 'Europe/London', label: 'United Kingdom - Europe/London' },
  { value: 'Europe/Berlin', label: 'Central Europe - Europe/Berlin' },
  { value: 'Africa/Johannesburg', label: 'South Africa - Africa/Johannesburg' },
  { value: 'America/New_York', label: 'US Eastern - America/New_York' },
  { value: 'America/Los_Angeles', label: 'US Pacific - America/Los_Angeles' },
  { value: 'UTC', label: 'UTC / not sure' },
];
const INTAKE_PATHWAY_OPTIONS = ['Live in New Zealand permanently', 'Work in New Zealand', 'Join my partner or family', 'Study in New Zealand', 'Invest in New Zealand', 'Bring staff to New Zealand', 'Resolve a visa issue', 'Visit New Zealand', 'Become a New Zealand citizen', 'Not sure yet'];
const CONTACT_SITUATION_OPTIONS = ['I am in New Zealand and would like to stay longer or permanently', 'I am not in NZ but exploring the big move', 'I have a job offer and need to secure a Work Visa', 'I have a Visa issue, that I need help with', 'I am a NZ based employer looking for assistance'];
const INTAKE_YES_NO_OPTIONS = ['Yes', 'No', 'Unsure'];
const INTAKE_RELATIONSHIP_OPTIONS = ['Single', 'Married', 'De facto / partner', 'Separated', 'Divorced', 'Widowed', 'Other'];
const INTAKE_QUALIFICATION_OPTIONS = ['No formal qualification', 'Secondary school', 'Trade certificate / diploma', 'Bachelor degree', 'Postgraduate qualification', 'Master degree', 'PhD', 'Other'];
const INTAKE_EMPLOYMENT_STATUS_OPTIONS = ['Employed', 'Self-employed', 'Not currently employed', 'Studying', 'Other'];
const INTAKE_CURRENCY_OPTIONS = ['NZD', 'AUD', 'USD', 'GBP', 'EUR', 'CAD', 'CNY', 'INR', 'PHP', 'ZAR', 'SGD', 'HKD', 'JPY', 'KRW', 'MYR', 'THB', 'AED', 'FJD', 'Other'];
const INTAKE_YES_NO_ONLY_OPTIONS = ['Yes', 'No'];
const COUNTRY_OPTIONS = [
  'New Zealand', 'Australia', 'United Kingdom', 'United States', 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Other'
];

const SUPPORT_CONTENT = {
  intake: {
    title: 'Enquiries & Intake help',
    summary: 'The Enquiries & Intake page keeps pre-client submissions away from active client records. Contact forms are a simple reference list; full intake forms are a light triage queue.',
    sections: [
      { heading: 'Contact forms', text: 'Short contact forms use New, Dealt with and Spam / Duplicate views. Mark dealt-with enquiries so they leave the live queue while staying retained in the CRM.' },
      { heading: 'Intake forms', text: 'Full assessment questionnaires use a simple status set: New, Contacted, Converted, or Spam / Duplicate.' },
      { heading: 'Conversion', text: 'Convert only when the enquiry should become an active client record. The original intake record remains linked for reference.' },
    ],
    tips: ['Keep contact forms light-touch.', 'Use New as the weekend triage queue.', 'Mark contacted or spam promptly so the active queue stays clean.'],
  },
  dashboard: {
    title: 'Dashboard help',
    summary: 'The dashboard is the daily operational view. It shows the current adviser workload, urgent bring-up items, active clients, deadlines and billing pressure points based on the selected adviser view.',
    sections: [
      { heading: 'Adviser scope', text: 'Use the Adviser scope selector above the tabs to switch between all advisers and one adviser. The dashboard, task counts, billing figures and workload lists update to match that scope.' },
      { heading: "Today's bring-up list", text: 'This panel highlights next-action, billing and personal tasks due today. Treat it as the morning file bring-up list: review the task, open the client where relevant, complete or update the task, then save.' },
      { heading: 'Client workload list', text: 'The workload list shows clients for the selected adviser view, their current stage, primary/backup adviser and earliest upcoming action or deadline. Use the column filters to narrow the list.' },
    ],
    tips: ['Set the adviser view first before reviewing workload.', 'Use next-action dates consistently so the bring-up list stays reliable.', 'Use the client search field to jump from dashboard review to the client record.'],
  },
  tasks: {
    title: 'Tasks help',
    summary: 'The Tasks page is the full deadline and expiry register. It combines next actions, calendar appointments, visa expiry dates, medical and police certificate expiry dates, document checklist expiry dates, PPI response dates, filing deadlines, billing tasks and personal adviser tasks.',
    sections: [
      { heading: 'Sorting', text: 'Use the sort control to order the list by priority, earliest date, latest date, client name or deadline type.' },
      { heading: 'Filtering', text: 'Filter by status or deadline type to focus on overdue items, tasks due today, tasks due soon or one specific kind of expiry.' },
      { heading: 'Opening a client', text: 'Click a task row to open the related client. Update the deadline, next action, calendar appointment, document checklist item, billing item or stage from the relevant screen.' },
    ],
    tips: ['Use the dashboard for immediate daily work and the Tasks tab for a wider deadline review.', 'Dates without notes are still useful, but notes make handover easier.'],
  },
  calendar: {
    title: 'Calendar help',
    summary: 'The Calendar page records appointments and internal diary items. Calendar entries can be linked to clients and advisers, and open entries appear in the Tasks page as dated work items. Completed appointments can also create a follow-up next action for the linked client.',
    sections: [
      { heading: 'Views', text: 'Use Current month for the immediate diary, Current + 2 months for a forward-planning window, or Search month to jump to a specific month.' },
      { heading: 'Booking appointments', text: 'Click Book appointment, select the appointment type, client and adviser where relevant, add the date, time, title, location and notes, then save. Linked appointments become task-style entries until marked completed.' },
      { heading: 'Task mapping', text: 'Open calendar entries are included in dashboard bring-up lists and the Tasks page. When an appointment is completed, optionally create the next client follow-up action from the same screen.' },
    ],
    tips: ['Link the appointment to a client whenever possible.', 'Use appointment type consistently so timeline history is easy to read.', 'Create a follow-up action when a completed appointment leaves further work to do.'],
  },
  clients: {
    title: 'Clients help',
    summary: 'The Clients page is where adviser users create, update and review the master client record, including personal details, family details, case type, case strategy, document checklist, stages, deadlines and billing milestones.',
    sections: [
      { heading: 'Creating a client', text: 'Click Client in the top bar, complete the blank record, then save. New-client saves confirm and open a fresh blank form so it is clear the record has been created.' },
      { heading: 'Case strategy', text: 'Use the Case strategy field as the master case summary. Record the agreed approach, key immigration issues, evidence gaps, risks and next strategic steps.' },
      { heading: 'Progress map', text: 'The progress map shows mandatory, optional and custom stages. Select only the stages that apply, add custom stages where a client needs a different pathway, and reorder stages before saving the client record. Skipped stages are shown muted and do not affect progress percentage.' },
      { heading: 'Deadlines and next action', text: 'Add expiry and filing dates in the deadlines section. Use Next action and Task due date for internal adviser tasks that should appear on the dashboard and task lists. Use the Timeline button to review previous actions, linked appointments, completed stages, document expiries and billing events.' },
      { heading: 'Document checklist', text: 'Use the document checklist to include standard document items, mark items as not required, add custom document requests, record expiry dates and mark whether each item has been obtained. Not-required items are greyed out and show only the document name and the option to include them again.' },
    ],
    tips: ['Keep the case strategy client-specific and practical.', 'Use the citizenship and address fields consistently because they are searchable.', 'Add family members where their details are relevant to the matter.'],
  },
  billing: {
    title: 'Billing help',
    summary: 'The Billing page shows billing milestones for the selected adviser view. It is a lightweight billing schedule, not a replacement for the accounting system.',
    sections: [
      { heading: 'Milestones', text: 'Add billing milestones from the client record. Each billing item can be linked to a date or to a client stage. Status is WIP, Invoiced or Overdue. WIP billing with a past reporting date is displayed as overdue in billing reports and task lists.' },
      { heading: 'Adviser filtering', text: 'The billing dashboard follows the selected adviser view and can also be filtered by month/period, status, adviser and search terms.' },
      { heading: 'Using status', text: 'Use WIP, Invoiced and Overdue consistently so the dashboard figures remain useful.' },
    ],
    tips: ['Use invoice numbers once the actual invoice has been raised.', 'Billing notes should stay factual and operational.'],
  },
  library: {
    title: 'Library help',
    summary: 'The Library is the controlled THiS reference shelf for INZ policy notes, forms, guides and internal adviser watch-points. It should speed up file work without replacing formal adviser judgement or source checking.',
    sections: [
      { heading: 'Policy items', text: 'Use Policy entries for INZ Operational Manual references, policy categories, internal THiS summaries, watch-points and review dates. Always keep the official INZ source link attached.' },
      { heading: 'Form items', text: 'Use Form entries for INZ forms, guides, checklists and acceptable-version notes. Record the form number, version, status and official PDF/source link.' },
      { heading: 'Review control', text: 'Use Last reviewed, Next review due and Reviewed by fields so policy and form references are periodically checked rather than left to go stale.' },
    ],
    tips: ['Keep summaries short and practical.', 'Use Watch status for items affected by current or expected policy change.', 'Do not rely on the Library without opening the official INZ source for formal advice.'],
  },
  advisers: {
    title: 'Advisers help',
    summary: 'The Advisers page stores adviser profile details used for client allocation, workload reporting and filtering throughout the CRM.',
    sections: [
      { heading: 'Adviser profiles', text: 'Keep adviser names, emails, phone numbers and profile photos accurate. These records drive primary and backup adviser assignments and the adviser details clients see in the portal.' },
      { heading: 'Active status', text: 'Use inactive status for advisers who should remain in historical records but should not usually receive new clients.' },
      { heading: 'Login mapping', text: 'Use the Login Email field to match a Netlify Identity user to the adviser profile. The main adviser email can still be used for client communication.' },
    ],
    tips: ['Match each adviser profile to their Netlify Identity email address.', 'Use clear head-and-shoulders profile photos so clients can identify their adviser in the portal.', 'Avoid deleting advisers if they are linked to historical client records.'],
  },
};

const PORTAL_RESOURCE_PAGES = [
  {
    key: 'jobSearchCv',
    title: 'Job Search / CV Preparation',
    shortTitle: 'Job Search / CV',
    audience: 'For skilled applicants and clients preparing for the New Zealand employment market.',
    summary: 'Practical guidance for preparing a New Zealand-style CV, approaching employers, and understanding how job search activity can support a skilled visa strategy.',
    sections: [
      {
        heading: 'New Zealand-style CV preparation',
        text: 'New Zealand CVs are usually direct, role-focused and evidence-based. Keep the CV easy to scan, lead with relevant experience, and make sure job titles, dates and responsibilities are clear.',
        items: ['Use a short professional profile rather than a long personal statement.', 'List recent and relevant work experience first.', 'Include measurable achievements where possible.', 'Make qualifications and professional registrations easy to find.'],
      },
      {
        heading: 'Job search approach',
        text: 'A focused job search is usually more effective than sending generic applications. Target employers, roles and regions that match the visa pathway and the client’s actual skills.',
        items: ['Keep a record of applications and employer responses.', 'Tailor the CV and cover letter for each serious role.', 'Check whether employer accreditation or occupation settings may be relevant before relying on a job offer for visa purposes.'],
      },
      {
        heading: 'Interview preparation',
        text: 'Interviews in New Zealand are commonly practical and behaviour-based. Prepare examples that show competence, reliability, communication and workplace judgement.',
        items: ['Prepare examples using situation, action and result.', 'Be ready to explain overseas experience in New Zealand terms.', 'Check salary, duties, hours and location before accepting an offer.'],
      },
    ],
    links: [
      { label: 'SEEK New Zealand', url: 'https://www.seek.co.nz/', note: 'Large New Zealand job board.' },
      { label: 'Trade Me Jobs', url: 'https://www.trademe.co.nz/a/jobs', note: 'New Zealand job listings across many sectors.' },
      { label: 'Careers.govt.nz', url: 'https://www.careers.govt.nz/', note: 'Government career information and CV guidance.' },
      { label: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/', note: 'Professional networking and job search.' },
      { label: 'Immigration New Zealand employer accreditation search', url: 'https://www.immigration.govt.nz/new-zealand-visas/preparing-a-visa-application/working-in-nz/accredited-employers-list', note: 'Check whether an employer is listed as accredited.' },
    ],
  },
  {
    key: 'lifeInNz',
    title: 'Life in New Zealand',
    shortTitle: 'Life in NZ',
    audience: 'For clients planning to live, work, study or settle in New Zealand.',
    summary: 'General settlement information covering everyday practical steps such as tax, healthcare, schools, driving, banking and accommodation.',
    sections: [
      {
        heading: 'Getting set up',
        text: 'Most new arrivals need to organise several practical matters soon after arrival. Timing will depend on visa status, work plans and family circumstances.',
        items: ['Apply for an IRD number if required.', 'Open a New Zealand bank account.', 'Arrange a local mobile number and internet connection.', 'Keep copies of key identity and visa documents accessible.'],
      },
      {
        heading: 'Healthcare, schools and transport',
        text: 'Eligibility for publicly funded services can depend on visa type and duration. Check the current rules before assuming access to healthcare, education or social services.',
        items: ['Check healthcare eligibility before relying on public services.', 'Research school zones if moving with children.', 'Review driver licence conversion or testing requirements.'],
      },
      {
        heading: 'Working and living well',
        text: 'New Zealand workplaces may be less formal than some clients expect, but employment rights and obligations are still important. Clients should understand their employment agreement and keep clear records.',
        items: ['Read the employment agreement before signing.', 'Understand minimum employment standards.', 'Keep payslips and work records, especially where employment supports a visa.'],
      },
    ],
    links: [
      { label: 'New Zealand Now', url: 'https://www.live-work.immigration.govt.nz/', note: 'Settlement and living information.' },
      { label: 'IRD', url: 'https://www.ird.govt.nz/', note: 'Tax and IRD number information.' },
      { label: 'Health New Zealand', url: 'https://www.tewhatuora.govt.nz/', note: 'Health system information.' },
      { label: 'Employment New Zealand', url: 'https://www.employment.govt.nz/', note: 'Employment rights and obligations.' },
      { label: 'Waka Kotahi NZTA', url: 'https://www.nzta.govt.nz/', note: 'Driving and transport information.' },
    ],
  },
  {
    key: 'usefulLinks',
    title: 'Useful Links',
    shortTitle: 'Useful Links',
    audience: 'For clients who need quick access to common immigration and New Zealand government resources.',
    summary: 'A central place for common external websites clients may need during an immigration matter.',
    sections: [
      {
        heading: 'Immigration and identity',
        text: 'These links are commonly used during visa preparation, lodgement or settlement planning.',
        items: ['Use official government websites for current rules and forms.', 'Check with your adviser before relying on a general webpage for case-specific decisions.', 'Keep copies of applications, forms and official correspondence.'],
      },
      {
        heading: 'Qualifications and documents',
        text: 'Some applications require third-party checks, translations, qualification assessments or police certificates. Timing can vary by country and organisation.',
        items: ['Start document requests early where possible.', 'Check name spelling and document consistency.', 'Tell your adviser about any document issue before lodgement.'],
      },
    ],
    links: [
      { label: 'Immigration New Zealand', url: 'https://www.immigration.govt.nz/', note: 'Official visa information and online services.' },
      { label: 'RealMe', url: 'https://www.realme.govt.nz/', note: 'Secure access for some New Zealand government services.' },
      { label: 'NZQA', url: 'https://www2.nzqa.govt.nz/', note: 'Qualification recognition and assessment information.' },
      { label: 'NZ Police vetting and certificates', url: 'https://www.police.govt.nz/advice-services/criminal-records', note: 'New Zealand criminal record information.' },
      { label: 'Education New Zealand', url: 'https://www.studywithnewzealand.govt.nz/', note: 'Study and education information.' },
    ],
  },
  {
    key: 'relocationResources',
    title: 'Relocation Resources',
    shortTitle: 'Relocation',
    audience: 'For offshore clients and families preparing to move to New Zealand.',
    summary: 'Planning information for the practical move to New Zealand, including accommodation, shipping, pets, schools and the first few weeks after arrival.',
    sections: [
      {
        heading: 'Planning the move',
        text: 'Relocation is easier when the practical steps are planned alongside the visa process. Do not make irreversible commitments until your adviser has confirmed the immigration position.',
        items: ['Prepare a realistic move timeline.', 'Check passport validity and travel requirements for all family members.', 'Keep important records in both digital and hard copy form.'],
      },
      {
        heading: 'Accommodation and first weeks',
        text: 'Many clients use temporary accommodation while they arrange work, schooling and a longer-term rental. Availability and cost can vary significantly by city and season.',
        items: ['Research rental markets before arrival.', 'Budget for bond, initial rent and setup costs.', 'Confirm school zones before committing to a long-term address.'],
      },
      {
        heading: 'Shipping, pets and household setup',
        text: 'Shipping belongings and bringing pets into New Zealand can involve significant lead times. Check requirements early and use specialist providers where appropriate.',
        items: ['Check biosecurity requirements before shipping belongings.', 'Start pet import planning early if relevant.', 'Arrange power, internet, phone and insurance shortly after arrival.'],
      },
    ],
    links: [
      { label: 'New Zealand Now - move to New Zealand', url: 'https://www.live-work.immigration.govt.nz/move-to-new-zealand', note: 'Settlement planning guidance.' },
      { label: 'Tenancy Services', url: 'https://www.tenancy.govt.nz/', note: 'Renting rules and tenancy information.' },
      { label: 'MPI biosecurity', url: 'https://www.mpi.govt.nz/bring-send-to-nz/', note: 'Rules for bringing or sending items to New Zealand.' },
      { label: 'Auckland Transport', url: 'https://at.govt.nz/', note: 'Auckland public transport information.' },
      { label: 'Metlink Wellington', url: 'https://www.metlink.org.nz/', note: 'Wellington public transport information.' },
    ],
  },
];

const DEFAULT_PORTAL_RESOURCE_SETTINGS = PORTAL_RESOURCE_PAGES.reduce((settings, page) => {
  settings[page.key] = { enabled: false, clientNote: '' };
  return settings;
}, {});




const ADDRESS_LOOKUP_EXAMPLES = [
  'Auckland, New Zealand',
  'Wellington, New Zealand',
  'Christchurch, New Zealand',
  'Hamilton, New Zealand',
  'Tauranga, New Zealand',
  'Dunedin, New Zealand',
  'Queenstown, New Zealand',
  'Nelson, New Zealand',
  'Napier, New Zealand',
  'New Plymouth, New Zealand',
  'Palmerston North, New Zealand',
  'Rotorua, New Zealand',
  'Invercargill, New Zealand',
  'Whangarei, New Zealand',
  'Overseas address'
];


const emptyData = {
  advisers: [],
  clients: [],
  caseTypes: DEFAULT_CASE_TYPES,
  deadlineTypes: DEFAULT_DEADLINE_TYPES,
  stageTemplates: DEFAULT_STAGE_TEMPLATES,
  personalTasks: [],
  calendarEntries: [],
  libraryEntries: [],
  intakeEnquiries: [],
  intakeStatuses: INTAKE_STATUSES,
  seminars: [],
  seminarRegistrations: [],
  feedbackSubmissions: [],
  emailLogs: [],
  emailTemplates: [],
  consultationTypes: [],
  bookingAvailability: [],
  bookingBlocks: [],
  bookingLinks: [],
  consultationBookings: [],
  emailConfig: { configured: false, fromEmail: '', fromName: '' },
  securityMode: 'unknown',
};

function makeStableLocalId(prefix = 'temp') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeBlankClient(data) {
  return {
    id: `temp-${Date.now()}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    dateOfBirthAge: '',
    location: '',
    sharepointFolderUrl: '',
    oneLawClientNumber: '',
    matterName: '',
    caseStrategy: '',
    caseType: '',
    primaryAdviserId: '',
    backupAdviserId: '',
    priority: 'Normal',
    clientStatus: 'Active',
    nextAction: '',
    nextActionDue: '',
    nextActionLog: [],
    portalEnabled: false,
    portalEmail: '',
    portalStatusUpdate: '',
    portalNextStep: '',
    portalVisibleDocumentIds: [],
    portalVisibleDeadlineIds: [],
    portalVisibleAppointmentIds: [],
    portalVisibleBillingIds: [],
    portalResourceSettings: normalisePortalResourceSettings(),
    portalDocuments: [],
    portalAccessCodeSet: false,
    portalLastPublishedAt: '',
    portalLastAccessedAt: '',
    notes: '',
    stages: buildStagePlan(data.stageTemplates),
    familyMembers: [],
    documentChecklist: buildDocumentChecklist(),
    deadlines: [],
    billing: [],
  };
}

export default function App() {
  if (window.location.pathname.startsWith('/feedback')) return <FeedbackFormApp />;
  if (window.location.pathname.startsWith('/contact')) return <ContactFormApp />;
  if (window.location.pathname.startsWith('/intake')) return <IntakeFormApp />;
  if (window.location.pathname.startsWith('/seminar')) return <SeminarRegistrationFormApp />;
  if (window.location.pathname.startsWith('/book')) return <ConsultationBookingPublicApp />;
  if (window.location.pathname.startsWith('/portal')) return <ClientPortalApp />;
  const [data, setData] = useState(emptyData);
  const [tab, setTab] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [adviserFilter, setAdviserFilter] = useState('all');
  const [caseTypeFilter, setCaseTypeFilter] = useState('all');
  const [dashboardAdviserFilter, setDashboardAdviserFilter] = useState(() => localStorage.getItem('this_crm_dashboard_adviser_filter') || 'all');
  const [accessCode, setAccessCode] = useState('');
  const [pendingCode, setPendingCode] = useState('');
  const [identityUser, setIdentityUser] = useState(null);
  const [authFlow, setAuthFlow] = useState({ type: 'login' });
  const [authMessage, setAuthMessage] = useState('');
  const [legacyAccessVisible, setLegacyAccessVisible] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const identityScopeAppliedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [mainNavMoreOpen, setMainNavMoreOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [clientEditorDirty, setClientEditorDirty] = useState(false);
  const [calendarEditorDirty, setCalendarEditorDirty] = useState(false);
  const [crmConfirm, setCrmConfirm] = useState(null);
  const [crmToast, setCrmToast] = useState(null);
  const [recentClientIds, setRecentClientIds] = useState(() => safeJsonParse(localStorage.getItem('this_crm_recent_clients'), []));
  const crmConfirmResolverRef = useRef(null);

  function showCrmToast(message, tone = 'success') {
    if (!message) return;
    setCrmToast({ id: Date.now(), message, tone });
  }

  function askCrmConfirm(options = {}) {
    return new Promise((resolve) => {
      crmConfirmResolverRef.current = resolve;
      setCrmConfirm({
        title: options.title || 'Please confirm',
        message: options.message || '',
        eyebrow: options.eyebrow || 'THiS CRM',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'default',
        details: Array.isArray(options.details) ? options.details.filter(Boolean) : [],
      });
    });
  }

  function resolveCrmConfirm(result) {
    const resolver = crmConfirmResolverRef.current;
    crmConfirmResolverRef.current = null;
    setCrmConfirm(null);
    if (resolver) resolver(Boolean(result));
  }

  function confirmDiscardClientEdits() {
    return !clientEditorDirty || window.confirm('You have unsaved client changes. Discard those changes and continue?');
  }

  function confirmDiscardCalendarEdits() {
    return !calendarEditorDirty || window.confirm('You have unsaved calendar changes. Discard those changes and continue?');
  }

  function confirmDiscardPendingEdits() {
    return confirmDiscardClientEdits() && confirmDiscardCalendarEdits();
  }

  function switchTab(nextTab) {
    if (nextTab === tab) return;
    if (!confirmDiscardPendingEdits()) return;
    if (tab === 'clients' && nextTab !== 'clients') setClientEditorDirty(false);
    if (tab === 'calendar' && nextTab !== 'calendar') setCalendarEditorDirty(false);
    setMobileMoreOpen(false);
    setTab(nextTab);
  }

  function rememberClient(clientId) {
    if (!clientId || String(clientId).startsWith('temp-')) return;
    setRecentClientIds((current) => [clientId, ...(current || []).filter((id) => id !== clientId)].slice(0, 8));
  }

  function selectClient(clientId) {
    if (clientId === selectedClientId) return true;
    if (!confirmDiscardClientEdits()) return false;
    setClientEditorDirty(false);
    setSelectedClientId(clientId);
    rememberClient(clientId);
    return true;
  }

  function openClientRecord(clientId) {
    if (tab === 'calendar' && !confirmDiscardCalendarEdits()) return;
    if (!selectClient(clientId)) return;
    setCalendarEditorDirty(false);
    setTab('clients');
  }

  function refreshData() {
    if (!confirmDiscardPendingEdits()) return;
    setClientEditorDirty(false);
    setCalendarEditorDirty(false);
    setMobileMoreOpen(false);
    load();
  }

  async function initialiseAuthAndLoad() {
    setLoading(true);
    setError('');
    setAuthMessage('');

    try {
      // v0.8.1: do not silently reuse legacy access-code sessions from older builds.
      localStorage.removeItem('this_crm_access_code');
      let callbackResult = null;
      try {
        callbackResult = await handleAuthCallback();
      } catch (callbackError) {
        setAuthMessage(`Identity link could not be processed: ${callbackError?.message || callbackError}`);
      }

      if (callbackResult?.type === 'invite') {
        setAuthFlow({ type: 'invite', token: callbackResult.token || '' });
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      if (callbackResult?.type === 'recovery') {
        const recoveredUser = callbackResult.user || await getUser();
        setIdentityUser(recoveredUser || null);
        setAuthFlow({ type: 'recovery' });
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      const currentUser = callbackResult?.user || await getUser();
      setIdentityUser(currentUser || null);
      if (currentUser) {
        await load(accessCode, currentUser);
        return;
      }

      setAuthRequired(true);
      setLoading(false);
    } catch (err) {
      setError(err.message || String(err));
      setAuthRequired(true);
      setLoading(false);
    }
  }

  async function load(code = accessCode, userForRequest = identityUser) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/.netlify/functions/crm', { headers: authHeaders(code, userForRequest), credentials: 'same-origin' });
      if (response.status === 401) {
        setAuthRequired(true);
        if (identityUser) {
          setError('You are logged in, but the CRM API did not accept the Identity session. Check the invited-user setup or use the temporary CRM access code only if it is configured.');
        }
        setLoading(false);
        return;
      }
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(formatApiError(body, 'Unable to load CRM data'));
      setData(normaliseData(body));
      setAuthRequired(false);
      if (!selectedClientId && body.clients?.[0]?.id) setSelectedClientId(body.clients[0].id);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initialiseAuthAndLoad();
    const unsubscribe = onAuthChange((event, user) => {
      setIdentityUser(user || null);
      if (event === 'logout') {
        identityScopeAppliedRef.current = false;
        setData(emptyData);
        setAuthRequired(true);
      }
    });
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('this_crm_dashboard_adviser_filter', dashboardAdviserFilter);
  }, [dashboardAdviserFilter]);

  useEffect(() => {
    localStorage.setItem('this_crm_recent_clients', JSON.stringify((recentClientIds || []).slice(0, 8)));
  }, [recentClientIds]);

  useEffect(() => {
    if (!crmToast) return undefined;
    const timer = window.setTimeout(() => setCrmToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [crmToast]);

  async function callApi(action, payload = {}, options = {}) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/.netlify/functions/crm', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders(accessCode, identityUser) },
        credentials: 'same-origin',
        body: JSON.stringify({ action, ...payload }),
      });
      if (response.status === 401) {
        setAuthRequired(true);
        throw new Error('Your Identity session was not accepted. Temporary CRM access code only works if configured.');
      }
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(formatApiError(body, 'CRM save failed'));
      if (!options.skipDataUpdate) setData(normaliseData(body));
      return body;
    } catch (err) {
      setError(err.message || String(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function submitAccessCode(event) {
    event.preventDefault();
    setAccessCode(pendingCode);
    load(pendingCode);
  }

  async function submitIdentityLogin(email, password) {
    setLoading(true);
    setError('');
    setAuthMessage('');
    try {
      const user = await login(email, password);
      setIdentityUser(user);
      setAuthFlow({ type: 'login' });
      setAuthRequired(false);
      await load(accessCode, user);
    } catch (err) {
      setError(err.message || String(err));
      setAuthRequired(true);
      setLoading(false);
    }
  }

  async function submitInvitePassword(password) {
    setLoading(true);
    setError('');
    setAuthMessage('');
    try {
      const user = await acceptInvite(authFlow.token, password);
      setIdentityUser(user);
      setAuthFlow({ type: 'login' });
      setAuthRequired(false);
      await load(accessCode, user);
    } catch (err) {
      setError(err.message || String(err));
      setAuthRequired(true);
      setLoading(false);
    }
  }

  async function submitRecoveryPassword(password) {
    setLoading(true);
    setError('');
    setAuthMessage('');
    try {
      const user = await updateUser({ password });
      setIdentityUser(user);
      setAuthFlow({ type: 'login' });
      setAuthRequired(false);
      await load(accessCode, user);
    } catch (err) {
      setError(err.message || String(err));
      setAuthRequired(true);
      setLoading(false);
    }
  }

  async function requestIdentityPasswordReset(email) {
    setError('');
    setAuthMessage('');
    try {
      await requestPasswordRecovery(email);
      setAuthMessage('Password reset email sent. Open the link from your email on this same CRM site.');
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function logoutIdentityUser() {
    if (!confirmDiscardPendingEdits()) return;
    try {
      await logout();
    } catch {
      // Continue with local sign-out even if the remote logout request fails.
    }
    localStorage.removeItem('this_crm_access_code');
    sessionStorage.removeItem('this_crm_access_code');
    setAccessCode('');
    setPendingCode('');
    setIdentityUser(null);
    identityScopeAppliedRef.current = false;
    setAuthRequired(true);
    setData(emptyData);
  }

  async function seedSampleData() {
    const body = await callApi('seed');
    if (body.clients?.[0]?.id) setSelectedClientId(body.clients[0].id);
  }

  async function saveClient(client, options = {}) {
    const wasNewClient = String(client.id || '').startsWith('temp-');
    const body = await callApi('saveClient', { client }, { skipDataUpdate: true });
    if (body.client?.id) {
      let nextSelectedId = body.client.id;
      setData((current) => {
        const savedClient = normaliseClientFromApi(body.client, current.stageTemplates);
        const withoutSaved = current.clients.filter((item) => item.id !== savedClient.id && !String(item.id || '').startsWith('temp-'));
        const nextClients = [savedClient, ...withoutSaved];
        if (wasNewClient && options.resetNewClientForm) {
          const blankClient = makeBlankClient({ ...current, clients: nextClients });
          nextSelectedId = blankClient.id;
          return { ...current, clients: [blankClient, ...nextClients] };
        }
        return { ...current, clients: nextClients };
      });
      setSelectedClientId(nextSelectedId);
      showCrmToast(wasNewClient ? 'Client record created.' : 'Client record saved.');
      if (!String(nextSelectedId || '').startsWith('temp-')) rememberClient(nextSelectedId);
      if (wasNewClient && options.resetNewClientForm) setTab('clients');
    }
    if (body.emailLog) {
      setData((current) => ({
        ...current,
        emailLogs: [normaliseEmailLog(body.emailLog), ...(current.emailLogs || [])].slice(0, 200),
      }));
      showCrmToast(body.emailLog.status === 'Sent' ? 'Related client email sent.' : 'Email logged as failed. Check email log.', body.emailLog.status === 'Sent' ? 'success' : 'warning');
    }
    return body;
  }

  async function updatePortalMessageStatus(clientId, messageId, status = 'Reviewed') {
    return await callApi('updatePortalMessageStatus', { clientId, messageId, status });
  }

  async function uploadPortalDocument(clientId, document) {
    const body = await callApi('uploadPortalDocument', { clientId, document }, { skipDataUpdate: true });
    if (body.client?.id) mergeSavedClient(body.client);
    return body;
  }

  async function updatePortalDocument(clientId, document) {
    const body = await callApi('updatePortalDocument', { clientId, document }, { skipDataUpdate: true });
    if (body.client?.id) mergeSavedClient(body.client);
    return body;
  }

  async function deletePortalDocument(clientId, documentId) {
    const confirmed = await askCrmConfirm({ title: 'Remove portal PDF?', message: 'Remove this PDF from the client portal?', confirmLabel: 'Remove PDF', tone: 'danger' });
    if (!confirmed) return;
    const body = await callApi('deletePortalDocument', { clientId, documentId }, { skipDataUpdate: true });
    if (body.client?.id) mergeSavedClient(body.client);
    return body;
  }

  function mergeSavedClient(client) {
    setData((current) => {
      const savedClient = normaliseClientFromApi(client, current.stageTemplates);
      return { ...current, clients: current.clients.map((item) => item.id === savedClient.id ? savedClient : item) };
    });
  }

  async function saveAdviser(adviser) {
    await callApi('saveAdviser', { adviser });
  }

  async function saveEmailTemplate(template) {
    return await callApi('saveEmailTemplate', { template });
  }

  async function resetEmailTemplate(templateKey) {
    return await callApi('resetEmailTemplate', { templateKey });
  }

  async function sendTestEmail(email) {
    const body = await callApi('sendTestEmail', { email }, { skipDataUpdate: true });
    if (body.emailLog) {
      setData((current) => ({
        ...current,
        emailLogs: [normaliseEmailLog(body.emailLog), ...(current.emailLogs || [])].slice(0, 200),
        emailConfig: body.emailConfig ? normaliseEmailConfig(body.emailConfig) : current.emailConfig,
      }));
    }
    return body;
  }

  async function sendIntakeOutcomeEmail(intake, outcome) {
    const body = await callApi('sendIntakeOutcomeEmail', { intake, outcome }, { skipDataUpdate: true });
    if (body.emailLog) {
      setData((current) => ({
        ...current,
        emailLogs: [normaliseEmailLog(body.emailLog), ...(current.emailLogs || [])].slice(0, 200),
        emailConfig: body.emailConfig ? normaliseEmailConfig(body.emailConfig) : current.emailConfig,
      }));
    }
    return body;
  }

  async function sendContactIntakeInviteEmail(contact) {
    const body = await callApi('sendContactIntakeInviteEmail', { contact }, { skipDataUpdate: true });
    if (body.emailLog) {
      setData((current) => ({
        ...current,
        emailLogs: [normaliseEmailLog(body.emailLog), ...(current.emailLogs || [])].slice(0, 200),
        emailConfig: body.emailConfig ? normaliseEmailConfig(body.emailConfig) : current.emailConfig,
      }));
    }
    return body;
  }

  async function downloadIntakeUpload(intakeId, kind) {
    const body = await callApi('downloadIntakeUpload', { intakeId, kind }, { skipDataUpdate: true });
    if (body.upload?.dataBase64) downloadBase64File(body.upload);
    return body;
  }

  async function savePersonalTask(task) {
    await callApi('savePersonalTask', { task });
  }

  async function deletePersonalTask(taskId) {
    const confirmed = await askCrmConfirm({ title: 'Delete personal task?', message: 'This will permanently delete the selected personal task.', confirmLabel: 'Delete task', tone: 'danger' });
    if (!confirmed) return;
    await callApi('deletePersonalTask', { taskId });
  }

  async function saveCalendarEntry(entry) {
    await callApi('saveCalendarEntry', { entry });
  }

  async function deleteCalendarEntry(entryId) {
    const confirmed = await askCrmConfirm({ title: 'Delete calendar entry?', message: 'This will permanently delete the selected calendar entry.', confirmLabel: 'Delete entry', tone: 'danger' });
    if (!confirmed) return;
    await callApi('deleteCalendarEntry', { entryId });
  }

  async function saveLibraryEntry(entry) {
    return await callApi('saveLibraryEntry', { entry });
  }

  async function deleteLibraryEntry(entryId) {
    const confirmed = await askCrmConfirm({ title: 'Delete library item?', message: 'This will permanently delete the selected library item.', confirmLabel: 'Delete item', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteLibraryEntry', { entryId });
  }

  async function saveIntakeEnquiry(intake) {
    return await callApi('saveIntakeEnquiry', { intake });
  }

  async function saveSeminar(seminar) {
    return await callApi('saveSeminar', { seminar });
  }

  async function deleteSeminar(seminarId) {
    const confirmed = await askCrmConfirm({ title: 'Delete seminar?', message: 'Registrations linked to this seminar will also be removed.', confirmLabel: 'Delete seminar', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteSeminar', { seminarId });
  }

  async function saveSeminarRegistration(registration) {
    return await callApi('saveSeminarRegistration', { registration });
  }

  async function saveFeedbackSubmission(feedback) {
    return await callApi('saveFeedbackSubmission', { feedback });
  }

  async function deleteFeedbackSubmission(feedbackId) {
    const confirmed = await askCrmConfirm({ title: 'Delete feedback?', message: 'This will remove the selected feedback submission from the CRM.', confirmLabel: 'Delete feedback', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteFeedbackSubmission', { feedbackId });
  }

  async function saveConsultationType(consultationType) {
    return await callApi('saveConsultationType', { consultationType });
  }

  async function deleteConsultationType(consultationTypeId) {
    const confirmed = await askCrmConfirm({ title: 'Deactivate consultation type?', message: 'Existing bookings will remain, but this type will no longer be offered for new bookings.', confirmLabel: 'Deactivate type', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteConsultationType', { consultationTypeId });
  }

  async function saveBookingAvailability(availability) {
    return await callApi('saveBookingAvailability', { availability });
  }

  async function saveBookingAvailabilityBulk(availability) {
    return await callApi('saveBookingAvailabilityBulk', { availability });
  }

  async function deleteBookingAvailability(availabilityId) {
    const confirmed = await askCrmConfirm({ title: 'Delete availability row?', message: 'This booking availability row will be removed from the self-booking calendar.', confirmLabel: 'Delete row', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteBookingAvailability', { availabilityId });
  }

  async function saveBookingBlock(block) {
    return await callApi('saveBookingBlock', { block });
  }

  async function saveBookingBlockBulk(block) {
    return await callApi('saveBookingBlockBulk', { block });
  }

  async function deleteBookingBlock(blockId) {
    const confirmed = await askCrmConfirm({ title: 'Delete blocked time?', message: 'This unavailable period will be removed from the self-booking calendar.', confirmLabel: 'Delete block', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteBookingBlock', { blockId });
  }

  async function saveBookingLink(link) {
    return await callApi('saveBookingLink', { link });
  }

  async function deleteBookingLink(linkId) {
    const confirmed = await askCrmConfirm({ title: 'Cancel booking link?', message: 'The applicant will no longer be able to use this booking link.', confirmLabel: 'Cancel link', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteBookingLink', { linkId });
  }

  async function saveConsultationBooking(booking) {
    return await callApi('saveConsultationBooking', { booking });
  }

  async function cancelConsultationBooking(booking) {
    const applicant = booking?.applicantName || booking?.applicantEmail || 'the applicant';
    const confirmed = await askCrmConfirm({
      title: 'Cancel consultation reservation?',
      message: `This will cancel the reserved consultation for ${applicant} and email the applicant with an update.`,
      confirmLabel: 'Cancel & notify',
      tone: 'danger',
      details: ['The original booking link will be reopened so the applicant can choose another available time if needed.'],
    });
    if (!confirmed) return;
    return await callApi('cancelConsultationBooking', { bookingId: booking.id });
  }

  async function sendSeminarRegistrationEmail(registrationId, outcome) {
    const body = await callApi('sendSeminarRegistrationEmail', { registrationId, outcome }, { skipDataUpdate: true });
    if (body.emailLog) {
      setData((current) => ({
        ...current,
        seminarRegistrations: (body.seminarRegistrations || current.seminarRegistrations || []).map(normaliseSeminarRegistration),
        emailLogs: [normaliseEmailLog(body.emailLog), ...(current.emailLogs || [])].slice(0, 200),
        emailConfig: body.emailConfig ? normaliseEmailConfig(body.emailConfig) : current.emailConfig,
      }));
    }
    return body;
  }

  async function deleteIntakeEnquiry(intakeId) {
    const confirmed = await askCrmConfirm({ title: 'Delete intake enquiry?', message: 'Converted enquiries cannot be deleted. This removes the selected enquiry from the CRM.', confirmLabel: 'Delete enquiry', tone: 'danger' });
    if (!confirmed) return;
    return await callApi('deleteIntakeEnquiry', { intakeId });
  }

  async function convertIntakeToClient(intakeId) {
    const body = await callApi('convertIntakeToClient', { intakeId });
    if (body.client?.id) {
      setSelectedClientId(body.client.id);
      setTab('clients');
    }
    return body;
  }

  async function deleteClient(clientId) {
    const confirmed = await askCrmConfirm({ title: 'Delete client record?', message: 'This will delete the client and all linked stages, deadlines and billing records.', confirmLabel: 'Delete client', tone: 'danger' });
    if (!confirmed) return;
    const body = await callApi('deleteClient', { clientId });
    setSelectedClientId(body.clients?.[0]?.id || '');
  }

  function addClient() {
    if (!confirmDiscardPendingEdits()) return;
    setClientEditorDirty(false);
    setCalendarEditorDirty(false);

    const selectedAdviserId = adviserFilter !== 'all'
      ? adviserFilter
      : (dashboardAdviserFilter !== 'all' ? dashboardAdviserFilter : '');
    const scopedAdviserId = dashboardAdviserFilter !== 'all' ? dashboardAdviserFilter : '';
    const newClient = {
      ...makeBlankClient(data),
      primaryAdviserId: selectedAdviserId,
      backupAdviserId: scopedAdviserId && selectedAdviserId && scopedAdviserId !== selectedAdviserId ? scopedAdviserId : '',
      caseType: caseTypeFilter !== 'all' ? caseTypeFilter : '',
    };

    setClientQuery('');
    setData((current) => ({ ...current, clients: [newClient, ...current.clients] }));
    setSelectedClientId(newClient.id);
    setTab('clients');
  }

  function addAdviser() {
    if (!confirmDiscardPendingEdits()) return;
    setClientEditorDirty(false);
    setCalendarEditorDirty(false);
    const adviser = {
      id: `temp-${Date.now()}`,
      name: 'New adviser',
      role: 'Licensed Immigration Adviser',
      email: '',
      loginEmail: '',
      profilePhotoUrl: '',
      availability: 'Available',
      phone: '',
      licence: '',
      active: true,
    };
    setData((current) => ({ ...current, advisers: [...current.advisers, adviser] }));
    setTab('advisers');
  }

  const scopedClients = useMemo(() => data.clients.filter((client) => matchesAdviserScope(client, dashboardAdviserFilter)), [data.clients, dashboardAdviserFilter]);
  const scopedPersonalTasks = useMemo(() => data.personalTasks.filter((task) => matchesPersonalTaskScope(task, dashboardAdviserFilter)), [data.personalTasks, dashboardAdviserFilter]);
  const scopedCalendarEntries = useMemo(() => data.calendarEntries.filter((entry) => matchesCalendarEntryScope(entry, dashboardAdviserFilter, data.clients)), [data.calendarEntries, dashboardAdviserFilter, data.clients]);
  const activeClients = scopedClients.filter((client) => client.clientStatus !== 'Closed');
  const selectedClient = data.clients.find((client) => client.id === selectedClientId) || data.clients[0] || null;
  const identityAdviser = useMemo(() => findAdviserForIdentity(data.advisers, identityUser), [data.advisers, identityUser]);
  const canViewAllAdvisers = !identityUser || identityHasRole(identityUser, ['admin', 'manager']);
  const canManageAdvisers = !identityUser || identityHasRole(identityUser, ['admin', 'manager']);
  const scopeAdvisers = canViewAllAdvisers ? data.advisers : (identityAdviser ? [identityAdviser] : data.advisers);
  const headerSnapshotAdviser = useMemo(() => {
    if (dashboardAdviserFilter !== 'all') return data.advisers.find((adviser) => adviser.id === dashboardAdviserFilter) || null;
    if (identityAdviser) return identityAdviser;
    return data.advisers.find((adviser) => adviser.active !== false) || data.advisers[0] || null;
  }, [dashboardAdviserFilter, data.advisers, identityAdviser]);

  useEffect(() => {
    if (!identityUser || !data.advisers.length || identityScopeAppliedRef.current) return;
    const matchedAdviser = findAdviserForIdentity(data.advisers, identityUser);
    if (matchedAdviser) {
      setDashboardAdviserFilter(matchedAdviser.id);
      identityScopeAppliedRef.current = true;
    }
  }, [identityUser, data.advisers]);

  useEffect(() => {
    if (identityUser && identityAdviser && !canViewAllAdvisers && dashboardAdviserFilter !== identityAdviser.id) {
      setDashboardAdviserFilter(identityAdviser.id);
    }
  }, [identityUser, identityAdviser, canViewAllAdvisers, dashboardAdviserFilter]);

  useEffect(() => {
    if (!selectedClientId || !scopedClients.length) return;
    if (!scopedClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(scopedClients[0].id);
    }
  }, [selectedClientId, scopedClients]);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    return scopedClients.filter((client) => {
      const matchesQuery = !q || [client.firstName, client.lastName, client.email, client.caseType, client.nationality, client.location, client.sharepointFolderUrl, client.oneLawClientNumber, client.caseStrategy, (client.familyMembers || []).map((member) => `${member.name || ''} ${member.nationality || ''}`).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q);
      const matchesAdviser = adviserFilter === 'all' || client.primaryAdviserId === adviserFilter || client.backupAdviserId === adviserFilter;
      const matchesCaseType = caseTypeFilter === 'all' || client.caseType === caseTypeFilter;
      return matchesQuery && matchesAdviser && matchesCaseType;
    });
  }, [scopedClients, clientQuery, adviserFilter, caseTypeFilter]);

  const deadlineRows = useMemo(() => {
    return [
      ...scopedClients.flatMap((client) => [
        ...(client.deadlines || []).map((deadline) => ({
          id: `${client.id}-${deadline.id}`,
          client,
          type: deadline.type,
          date: deadline.date,
          note: deadline.note,
          source: 'deadline',
          adviserId: client.primaryAdviserId || '',
          actionStatus: deadline.actionStatus,
          reviewDate: deadline.reviewDate,
          diff: dateDiff(deadline.date),
        })),
        ...documentExpiryRowsForClient(client),
        client.nextActionDue ? { client, type: 'Next Action Date', date: client.nextActionDue, note: client.nextAction, source: 'next-action', diff: dateDiff(client.nextActionDue) } : null,
      ].filter(Boolean)),
      ...calendarDeadlineRows(scopedCalendarEntries, data.clients),
    ]
      .filter((row) => row.date)
      .map(withDeadlineSignal)
      .sort((a, b) => deadlineSignalSortDate(a).localeCompare(deadlineSignalSortDate(b)) || String(a.date || '').localeCompare(String(b.date || '')));
  }, [scopedClients, scopedCalendarEntries, data.clients]);

  const taskRows = useMemo(() => buildTaskRows(scopedClients, scopedPersonalTasks, data.clients, scopedCalendarEntries)
    .filter((row) => matchesTaskRowScope(row, dashboardAdviserFilter)), [scopedClients, scopedPersonalTasks, data.clients, scopedCalendarEntries, dashboardAdviserFilter]);

  const billingRows = useMemo(() => {
    return scopedClients
      .flatMap((client) => (client.billing || []).map((item) => ({ ...normaliseBillingItem(item), client })))
      .sort((a, b) => (billingReportingDate(a, a.client) || '9999-12-31').localeCompare(billingReportingDate(b, b.client) || '9999-12-31'));
  }, [scopedClients]);

  if (authRequired) {
    return (
      <AccessScreen
        pendingCode={pendingCode}
        setPendingCode={setPendingCode}
        submitAccessCode={submitAccessCode}
        error={error}
        message={authMessage}
        loading={loading}
        authFlow={authFlow}
        identityUser={identityUser}
        legacyAccessVisible={legacyAccessVisible}
        setLegacyAccessVisible={setLegacyAccessVisible}
        submitIdentityLogin={submitIdentityLogin}
        submitInvitePassword={submitInvitePassword}
        submitRecoveryPassword={submitRecoveryPassword}
        requestPasswordReset={requestIdentityPasswordReset}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <img src={LOGO_SRC} alt="Turner Hopkins Immigration Specialists" className="brand-logo" />
          <div className="brand-copy">
            <strong>THiS CRM</strong>
            <span>Client progress, deadlines and billing</span>
          </div>
        </div>
        <HeaderLocalSnapshot adviser={headerSnapshotAdviser} />
        <AuthStatus user={identityUser} adviser={identityAdviser} accessCodeActive={Boolean(accessCode)} onLogout={logoutIdentityUser} />
        <div className="top-actions desktop-only">
          <button className="btn ghost compact-action" onClick={() => { setSupportOpen(false); setToolsOpen(true); setNewMenuOpen(false); }}><Wrench size={16} />Tools</button>
          <div className="dropdown-shell new-action-shell">
            <button className="btn dark" type="button" onClick={() => setNewMenuOpen((open) => !open)}><Plus size={16} />New <ChevronDown size={15} /></button>
            {newMenuOpen && (
              <div className="dropdown-menu action-dropdown-menu">
                <button type="button" onClick={() => { setNewMenuOpen(false); addClient(); }}><UsersRound size={16} /><span><strong>New client</strong><small>Create an active client record</small></span></button>
                <button type="button" onClick={() => { setNewMenuOpen(false); setTab('intake'); }}><ClipboardList size={16} /><span><strong>New enquiry / intake</strong><small>Open the enquiry workspace</small></span></button>
                <button type="button" onClick={() => { setNewMenuOpen(false); setTab('intake'); }}><CalendarDays size={16} /><span><strong>New seminar</strong><small>Use seminar setup in Enquiries & Intake</small></span></button>
                {canManageAdvisers && <button type="button" onClick={() => { setNewMenuOpen(false); addAdviser(); }}><UserRound size={16} /><span><strong>New adviser</strong><small>Add a team profile</small></span></button>}
              </div>
            )}
          </div>
        </div>
        <div className="mobile-header-actions mobile-only">
          <button className="btn ghost" onClick={() => { setSupportOpen(false); setToolsOpen(true); }}><Wrench size={16} />Tools</button>
        </div>
      </header>

      {crmToast && <CrmToast toast={crmToast} onClose={() => setCrmToast(null)} />}

      <main className="layout">
        {error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}
        {loading && <div className="loading-card"><Database size={18} />Loading database-backed CRM data...</div>}

        {!loading && !data.clients.length && !data.advisers.length && !data.intakeEnquiries.length && !data.seminars.length && !data.seminarRegistrations.length && !data.feedbackSubmissions.length && !data.consultationBookings.length && (
          <section className="empty-state">
            <Database size={40} />
            <h1>Database is connected, but no CRM records exist yet.</h1>
            <p>Seed sample Turner Hopkins-style data for testing, or add advisers and clients manually.</p>
            <button className="btn dark" onClick={seedSampleData} disabled={saving}><Database size={16} />Seed sample data</button>
          </section>
        )}

        {(data.clients.length > 0 || data.advisers.length > 0 || data.libraryEntries.length > 0 || data.intakeEnquiries.length > 0 || data.seminars.length > 0 || data.seminarRegistrations.length > 0 || data.feedbackSubmissions.length > 0 || data.consultationBookings.length > 0 || data.bookingLinks.length > 0) && (
          <>
            <ViewToolbar
              advisers={scopeAdvisers}
              dashboardAdviserFilter={dashboardAdviserFilter}
              setDashboardAdviserFilter={setDashboardAdviserFilter}
              clientQuery={clientQuery}
              setClientQuery={setClientQuery}
              matchingClientCount={filteredClients.length}
              setTab={switchTab}
              setAdviserFilter={setAdviserFilter}
              setCaseTypeFilter={setCaseTypeFilter}
              canViewAllAdvisers={canViewAllAdvisers}
            />
            <nav className="tabs desktop-tabs main-nav crm-main-nav-polished nav-expanded-row" aria-label="Main CRM navigation">
              <TabButton active={tab === 'dashboard'} onClick={() => switchTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
              <TabButton active={tab === 'tasks'} onClick={() => switchTab('tasks')} icon={ListChecks} label="Tasks" />
              <TabButton active={tab === 'clients'} onClick={() => switchTab('clients')} icon={UsersRound} label="Clients" />
              <TabButton active={tab === 'intake'} onClick={() => switchTab('intake')} icon={ClipboardList} label="Enquiries & Intake" />
              <TabButton active={tab === 'bookings'} onClick={() => switchTab('bookings')} icon={CalendarDays} label="Bookings" />
              <TabButton active={tab === 'calendar'} onClick={() => switchTab('calendar')} icon={CalendarDays} label="Calendar" />
              <TabButton active={tab === 'billing'} onClick={() => switchTab('billing')} icon={CreditCard} label="Billing" />
              <TabButton active={tab === 'library'} onClick={() => switchTab('library')} icon={BookOpen} label="Library" />
              {canManageAdvisers && <TabButton active={tab === 'advisers'} onClick={() => switchTab('advisers')} icon={UsersRound} label="Advisers" />}
            </nav>

            {tab === 'intake' && (
              <IntakeWorkspace enquiries={data.intakeEnquiries || []} advisers={data.advisers} dashboardAdviserFilter={dashboardAdviserFilter} statuses={data.intakeStatuses || INTAKE_STATUSES} seminars={data.seminars || []} seminarRegistrations={data.seminarRegistrations || []} feedbackSubmissions={data.feedbackSubmissions || []} saveIntakeEnquiry={saveIntakeEnquiry} deleteIntakeEnquiry={deleteIntakeEnquiry} convertIntakeToClient={convertIntakeToClient} sendIntakeOutcomeEmail={sendIntakeOutcomeEmail} sendContactIntakeInviteEmail={sendContactIntakeInviteEmail} downloadIntakeUpload={downloadIntakeUpload} saveSeminar={saveSeminar} deleteSeminar={deleteSeminar} saveSeminarRegistration={saveSeminarRegistration} sendSeminarRegistrationEmail={sendSeminarRegistrationEmail} saveFeedbackSubmission={saveFeedbackSubmission} deleteFeedbackSubmission={deleteFeedbackSubmission} saving={saving} openClientRecord={openClientRecord} confirmAction={askCrmConfirm} />
            )}

            {tab === 'bookings' && (
              <ConsultationBookingWorkspace
                advisers={data.advisers}
                intakeEnquiries={data.intakeEnquiries || []}
                consultationTypes={data.consultationTypes || []}
                bookingAvailability={data.bookingAvailability || []}
                bookingBlocks={data.bookingBlocks || []}
                bookingLinks={data.bookingLinks || []}
                consultationBookings={data.consultationBookings || []}
                dashboardAdviserFilter={dashboardAdviserFilter}
                saveConsultationType={saveConsultationType}
                deleteConsultationType={deleteConsultationType}
                saveBookingAvailability={saveBookingAvailability}
                saveBookingAvailabilityBulk={saveBookingAvailabilityBulk}
                deleteBookingAvailability={deleteBookingAvailability}
                saveBookingBlock={saveBookingBlock}
                saveBookingBlockBulk={saveBookingBlockBulk}
                deleteBookingBlock={deleteBookingBlock}
                saveBookingLink={saveBookingLink}
                deleteBookingLink={deleteBookingLink}
                saveConsultationBooking={saveConsultationBooking}
                cancelConsultationBooking={cancelConsultationBooking}
                saving={saving}
              />
            )}

            {tab === 'dashboard' && (
              <Dashboard clients={scopedClients} activeClients={activeClients} advisers={data.advisers} dashboardAdviserFilter={dashboardAdviserFilter} deadlineRows={deadlineRows} taskRows={taskRows} stageTemplates={data.stageTemplates} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} intakeEnquiries={data.intakeEnquiries || []} recentClientIds={recentClientIds} />
            )}

            {tab === 'tasks' && (
              <TasksDashboard taskRows={taskRows} personalTasks={scopedPersonalTasks} allClients={data.clients} advisers={data.advisers} dashboardAdviserFilter={dashboardAdviserFilter} savePersonalTask={savePersonalTask} deletePersonalTask={deletePersonalTask} saveCalendarEntry={saveCalendarEntry} deleteCalendarEntry={deleteCalendarEntry} saving={saving} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />
            )}

            {tab === 'calendar' && (
              <CalendarWorkspace entries={scopedCalendarEntries} allEntries={data.calendarEntries} clients={data.clients} scopedClients={scopedClients} advisers={data.advisers} dashboardAdviserFilter={dashboardAdviserFilter} saveCalendarEntry={saveCalendarEntry} deleteCalendarEntry={deleteCalendarEntry} saveClient={saveClient} saving={saving} openClientRecord={openClientRecord} onDirtyChange={setCalendarEditorDirty} />
            )}

            {tab === 'library' && (
              <LibraryWorkspace entries={data.libraryEntries} caseTypes={data.caseTypes} saveLibraryEntry={saveLibraryEntry} deleteLibraryEntry={deleteLibraryEntry} saving={saving} />
            )}

            {tab === 'clients' && selectedClient && (
              <ClientsWorkspace
                clients={filteredClients}
                selectedClient={selectedClient}
                advisers={data.advisers}
                caseTypes={data.caseTypes}
                deadlineTypes={data.deadlineTypes}
                clientQuery={clientQuery}
                setClientQuery={setClientQuery}
                adviserFilter={adviserFilter}
                setAdviserFilter={setAdviserFilter}
                caseTypeFilter={caseTypeFilter}
                setCaseTypeFilter={setCaseTypeFilter}
                setSelectedClientId={selectClient}
                onDirtyChange={setClientEditorDirty}
                saveClient={saveClient}
                updatePortalMessageStatus={updatePortalMessageStatus}
                uploadPortalDocument={uploadPortalDocument}
                updatePortalDocument={updatePortalDocument}
                deletePortalDocument={deletePortalDocument}
                deleteClient={deleteClient}
                saving={saving}
                calendarEntries={data.calendarEntries}
              />
            )}

            {tab === 'billing' && (
              <BillingDashboard billingRows={billingRows} advisers={data.advisers} adviserFilter={adviserFilter} setAdviserFilter={setAdviserFilter} dashboardAdviserFilter={dashboardAdviserFilter} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />
            )}

            {tab === 'advisers' && canManageAdvisers && (
              <AdviserProfiles advisers={data.advisers} clients={data.clients} saveAdviser={saveAdviser} saving={saving} />
            )}
          </>
        )}
      </main>
      <SupportDrawer open={supportOpen} onOpen={() => { setToolsOpen(false); setSupportOpen(true); }} onClose={() => setSupportOpen(false)} tab={tab} />
      <ToolsDrawer open={toolsOpen} onOpen={() => { setSupportOpen(false); setToolsOpen(true); }} onClose={() => setToolsOpen(false)} onOpenHelp={() => { setToolsOpen(false); setSupportOpen(true); }} onRefresh={refreshData} loading={loading} sendTestEmail={sendTestEmail} saveEmailTemplate={saveEmailTemplate} resetEmailTemplate={resetEmailTemplate} emailLogs={data.emailLogs || []} emailTemplates={data.emailTemplates || []} emailConfig={data.emailConfig || emptyData.emailConfig} saving={saving} />
      <MobileBottomNav activeTab={tab} onNavigate={switchTab} onOpenMore={() => setMobileMoreOpen(true)} />
      <MobileMoreSheet
        open={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        onNavigate={switchTab}
        activeTab={tab}
        onOpenHelp={() => { setMobileMoreOpen(false); setToolsOpen(false); setSupportOpen(true); }}
        onOpenTools={() => { setMobileMoreOpen(false); setSupportOpen(false); setToolsOpen(true); }}
        onRefresh={refreshData}
        onAddClient={() => { setMobileMoreOpen(false); addClient(); }}
        onAddAdviser={() => { setMobileMoreOpen(false); addAdviser(); }}
        loading={loading}
        canManageAdvisers={canManageAdvisers}
        onLogout={logoutIdentityUser}
        identityUser={identityUser}
        accessCodeActive={Boolean(accessCode)}
      />
      {crmConfirm && <CrmConfirmDialog dialog={crmConfirm} onResolve={resolveCrmConfirm} />}
    </div>
  );

}



function CrmConfirmDialog({ dialog, onResolve }) {
  const confirmToneClass = dialog.tone === 'danger' ? ' danger' : dialog.tone === 'send' ? ' dark' : ' dark';
  const Icon = dialog.tone === 'danger' ? AlertTriangle : dialog.tone === 'send' ? Send : ShieldCheck;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onResolve(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResolve]);

  return (
    <div className="modal-layer crm-confirm-layer" role="dialog" aria-modal="true" aria-label={dialog.title || 'Confirm action'}>
      <button className="modal-backdrop" type="button" aria-label="Cancel" onClick={() => onResolve(false)}></button>
      <section className={`modal-card crm-confirm-card ${dialog.tone || 'default'}`}>
        <div className="crm-confirm-icon"><Icon size={22} /></div>
        <div className="modal-head crm-confirm-head">
          <div>
            <span>{dialog.eyebrow || 'THiS CRM'}</span>
            <h2>{dialog.title || 'Please confirm'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => onResolve(false)} aria-label="Close"><X size={18} /></button>
        </div>
        {dialog.message && <p className="crm-confirm-message">{dialog.message}</p>}
        {Array.isArray(dialog.details) && dialog.details.length > 0 && (
          <div className="crm-confirm-details">
            {dialog.details.map((item, index) => <p key={index}>{item}</p>)}
          </div>
        )}
        <div className="modal-actions crm-confirm-actions">
          <button className={`btn${confirmToneClass}`} type="button" onClick={() => onResolve(true)}>{dialog.confirmLabel || 'Confirm'}</button>
          <button className="btn ghost" type="button" onClick={() => onResolve(false)}>{dialog.cancelLabel || 'Cancel'}</button>
        </div>
      </section>
    </div>
  );
}


function ConsultationBookingPublicApp() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [cancelConfirming, setCancelConfirming] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [expandedWeekKeys, setExpandedWeekKeys] = useState([]);
  const [form, setForm] = useState({ applicantName: '', applicantEmail: '', applicantPhone: '', notes: '' });

  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);

  useEffect(() => {
    let cancelled = false;
    async function loadBooking() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/.netlify/functions/booking?token=${encodeURIComponent(token)}`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || body.detail || 'Unable to load booking link.');
        if (cancelled) return;
        setPayload(body);
        if (body.ok) {
          const existing = body.existingBooking || null;
          const firstType = existing?.consultationTypeId || body.consultationTypes?.[0]?.id || '';
          setSelectedTypeId(firstType);
          setForm({
            applicantName: existing?.applicantName || body.link?.applicantName || '',
            applicantEmail: existing?.applicantEmail || body.link?.applicantEmail || '',
            applicantPhone: existing?.applicantPhone || body.link?.applicantPhone || '',
            notes: existing?.notes || '',
          });
          setManageMode(false);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBooking();
    return () => { cancelled = true; };
  }, [token]);

  const existingBooking = payload?.existingBooking || null;
  const selectedType = payload?.consultationTypes?.find((type) => type.id === selectedTypeId) || null;
  const slots = (payload?.slots || []).filter((slot) => slot.consultationTypeId === selectedTypeId);
  const groupedWeeks = groupBookingSlotsByWeek(slots);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;

  useEffect(() => {
    const keys = groupedWeeks.map((week) => week.key);
    setExpandedWeekKeys((current) => {
      if (!keys.length) return [];
      const kept = current.filter((key) => keys.includes(key));
      return kept.length ? kept : [keys[0]];
    });
  }, [selectedTypeId, payload?.slots?.length]);

  function toggleBookingWeek(key) {
    setExpandedWeekKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!selectedType || !selectedSlot) {
      setError('Choose a consultation type and an available time.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/.netlify/functions/booking?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: existingBooking ? 'reschedule' : 'reserve', booking: { consultationTypeId: selectedType.id, bookingDate: selectedSlot.date, startTime: selectedSlot.startTime, ...form } }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || body.detail || 'Unable to reserve this consultation.');
      setConfirmed(body);
      setPayload((current) => current ? { ...current, existingBooking: body.booking } : current);
      setManageMode(false);
      setCancelConfirming(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelReservation() {
    if (!cancelConfirming) {
      setCancelConfirming(true);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/.netlify/functions/booking?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || body.detail || 'Unable to cancel this reservation.');
      setConfirmed(body);
      setPayload((current) => current ? { ...current, existingBooking: null } : current);
      setSelectedSlotId('');
      setManageMode(false);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const showManagePanel = Boolean(payload?.ok && existingBooking && !confirmed && !manageMode);
  const showBookingForm = Boolean(payload?.ok && !confirmed && (!existingBooking || manageMode));

  return (
    <div className="public-booking-shell">
      <section className="public-booking-card">
        <div className="public-booking-brand"><img src={LOGO_SRC} alt="Turner Hopkins Immigration Specialists" /><div><strong>Book your consultation</strong><span>Turner Hopkins Immigration Specialists</span></div></div>
        {loading && <div className="loading-card"><Database size={18} />Loading available consultation times...</div>}
        {!loading && error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}
        {!loading && payload?.unavailable && <div className="empty-state compact-empty"><CalendarDays size={34} /><h1>Booking link unavailable</h1><p>{payload.message || 'This booking link is no longer available.'}</p></div>}
        {!loading && payload?.ok && confirmed && (
          <div className="booking-confirmed-panel">
            <CheckCircle2 size={42} />
            <h1>{confirmed.cancelled ? 'Reservation cancelled' : 'Consultation reserved'}</h1>
            <p>{confirmed.cancelled ? 'This consultation reservation has been cancelled. You can use this page to choose another available time if required.' : 'Your consultation time has been reserved in the Turner Hopkins system. We will contact you if anything needs to change.'}</p>
            {!confirmed.cancelled && <div className="booking-confirmation-summary"><strong>{confirmed.consultationType?.name}</strong><span>{formatBookingDateTime(confirmed.booking.bookingDate, confirmed.booking.startTime)} NZ time</span><span>{formatBrowserLocalSlot(confirmed.booking.bookingDate, confirmed.booking.startTime)}</span><span>Adviser: {confirmed.adviser?.name}</span>{confirmed.consultationType?.paid && <span>Payment will be handled manually by Turner Hopkins.</span>}</div>}
            {confirmed.cancelled && <button className="btn dark" type="button" onClick={() => { setConfirmed(null); setManageMode(true); }}>Choose another time</button>}
          </div>
        )}
        {showManagePanel && (
          <div className="booking-confirmed-panel booking-manage-panel">
            <CheckCircle2 size={42} />
            <h1>Consultation reserved</h1>
            <p>Your consultation time is reserved. Times are shown in New Zealand time.</p>
            <div className="booking-confirmation-summary"><strong>{existingBooking.consultationTypeName || 'Consultation'}</strong><span>{formatBookingDateTime(existingBooking.bookingDate, existingBooking.startTime)} NZ time</span><span>{formatBrowserLocalSlot(existingBooking.bookingDate, existingBooking.startTime)}</span><span>Adviser: {payload.adviser?.name}</span></div>
            <div className="booking-manage-actions"><button className="btn dark" type="button" onClick={() => { setManageMode(true); setSelectedSlotId(''); setCancelConfirming(false); }}>Change date/time</button><button className="btn ghost" type="button" onClick={cancelReservation} disabled={submitting}>{cancelConfirming ? 'Confirm cancellation' : 'Cancel reservation'}</button>{cancelConfirming && <small className="booking-cancel-hint">Click again to cancel this reserved time.</small>}</div>
          </div>
        )}
        {showBookingForm && (
          <form className="public-booking-form" onSubmit={submitBooking}>
            <div className="public-booking-intro"><span className="eyebrow">Online consultation booking</span><h1>{existingBooking ? 'Choose a new time' : `Choose a time with ${payload.adviser?.name || 'your adviser'}`}</h1><p>All appointment slots are shown in New Zealand time (Pacific/Auckland). Where your browser timezone differs, your local equivalent is shown under the NZ time.</p></div>
            <div className="booking-timezone-note"><Globe2 size={17} /><span>NZ time: Pacific/Auckland. Your browser timezone: {getBrowserTimeZoneLabel()}.</span></div>
            <div className="booking-public-step"><h2>1. Consultation type</h2><div className="public-type-grid">{payload.consultationTypes.map((type) => <button key={type.id} type="button" className={selectedTypeId === type.id ? 'active' : ''} onClick={() => { setSelectedTypeId(type.id); setSelectedSlotId(''); }}><strong>{type.name}</strong><span>{type.durationMinutes} minutes · {type.paid ? `${formatCurrency(type.priceNzd)} NZD` : 'Free'}</span><small>{type.description}</small></button>)}</div></div>
            <div className="booking-public-step">
              <h2>2. Available times</h2>
              <p className="muted">Choose a time within the next four weeks. Week 1 is open first; expand later weeks if you need a date further ahead.</p>
              {!slots.length && <p className="muted">No available times are currently showing for this consultation type. Please contact Turner Hopkins directly.</p>}
              <div className="public-slot-weeks">
                {groupedWeeks.map((week, index) => {
                  const expanded = expandedWeekKeys.includes(week.key);
                  return (
                    <section key={week.key} className={`public-slot-week ${expanded ? 'open' : ''}`}>
                      <button className="public-slot-week-toggle" type="button" onClick={() => toggleBookingWeek(week.key)} aria-expanded={expanded}>
                        <span><strong>{index === 0 ? 'Week 1 — earliest available times' : week.label}</strong><small>{week.slotCount} available {week.slotCount === 1 ? 'time' : 'times'} · {week.rangeLabel}</small></span>
                        <ChevronDown size={18} />
                      </button>
                      {expanded && <div className="public-slot-groups">{week.days.map((group) => <div key={group.date} className="public-slot-group"><strong>{formatBookingDate(group.date)}</strong><div>{group.slots.map((slot) => <button key={slot.id} type="button" className={selectedSlotId === slot.id ? 'active' : ''} onClick={() => setSelectedSlotId(slot.id)}><span>{formatBookingTime(slot.startTime)} NZ</span><small>{formatBrowserLocalSlot(slot.date, slot.startTime)}</small></button>)}</div></div>)}</div>}
                    </section>
                  );
                })}
              </div>
            </div>
            <div className="booking-public-step"><h2>3. Confirm your details</h2><div className="form-grid two"><Field label="Full name" value={form.applicantName} onChange={(value) => setForm((current) => ({ ...current, applicantName: value }))} /><Field label="Email" value={form.applicantEmail} onChange={(value) => setForm((current) => ({ ...current, applicantEmail: value }))} /><Field label="Phone" value={form.applicantPhone} onChange={(value) => setForm((current) => ({ ...current, applicantPhone: value }))} /></div><TextArea label="Anything you want us to know before the consultation?" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} rows={3} /></div>
            {selectedType?.paid && <div className="notice-card"><CreditCard size={18} /><span>This consultation is marked as paid. Payment is not taken on this page yet; Turner Hopkins will handle that manually.</span></div>}
            <div className="public-booking-actions"><button className="btn dark public-booking-submit" type="submit" disabled={submitting || !selectedSlotId}>{submitting ? <RefreshCw size={16} /> : <CalendarDays size={16} />}{existingBooking ? 'Reserve new time' : 'Reserve consultation'}</button>{existingBooking && <button className="btn ghost" type="button" onClick={() => { setManageMode(false); setCancelConfirming(false); }}>Keep current time</button>}</div>
          </form>
        )}
      </section>
    </div>
  );
}


function getBrowserTimeZoneLabel() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time'; } catch { return 'your local time'; }
}

function nzSlotToDate(dateIso = '', time = '') {
  const [year, month, day] = String(dateIso || '').split('-').map(Number);
  const [hour, minute] = String(time || '00:00').split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  let utc = Date.UTC(year, month - 1, day, hour, minute || 0, 0);
  const formatter = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  for (let index = 0; index < 4; index += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(utc)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), 0);
    const diff = asUtc - Date.UTC(year, month - 1, day, hour, minute || 0, 0);
    if (diff === 0) break;
    utc -= diff;
  }
  return new Date(utc);
}

function formatBrowserLocalSlot(dateIso = '', time = '') {
  const browserZone = getBrowserTimeZoneLabel();
  if (!browserZone || browserZone === 'Pacific/Auckland') return 'Your local time: same as NZ time';
  const date = nzSlotToDate(dateIso, time);
  if (!date) return 'Your local time: check your timezone';
  try {
    return `Your local time: ${date.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;
  } catch {
    return 'Your local time: check your timezone';
  }
}

function groupBookingSlots(slots = []) {
  const map = new Map();
  slots.forEach((slot) => {
    if (!map.has(slot.date)) map.set(slot.date, []);
    map.get(slot.date).push(slot);
  });
  return Array.from(map.entries()).sort(([a], [b]) => String(a).localeCompare(String(b))).map(([date, groupSlots]) => ({ date, slots: groupSlots.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))) }));
}

function groupBookingSlotsByWeek(slots = []) {
  const days = groupBookingSlots(slots);
  if (!days.length) return [];
  const firstDate = parseLocalDate(days[0].date);
  if (!firstDate) return [{ key: 'week-0', label: 'Available times', rangeLabel: '', slotCount: slots.length, days }];
  const weeks = new Map();
  days.forEach((day) => {
    const dayDate = parseLocalDate(day.date);
    const diff = dayDate ? Math.max(0, Math.floor((dayDate - firstDate) / 86400000)) : 0;
    const weekIndex = Math.floor(diff / 7);
    const key = `week-${weekIndex}`;
    if (!weeks.has(key)) {
      const weekStart = addDaysIso(days[0].date, weekIndex * 7);
      const weekEnd = addDaysIso(weekStart, 6);
      weeks.set(key, {
        key,
        label: `Week ${weekIndex + 1}`,
        rangeLabel: `${formatBookingDateShort(weekStart)} - ${formatBookingDateShort(weekEnd)}`,
        slotCount: 0,
        days: [],
      });
    }
    const week = weeks.get(key);
    week.days.push(day);
    week.slotCount += day.slots.length;
  });
  return Array.from(weeks.values());
}


function guidedCountryOptions() {
  const priority = ['New Zealand', 'Australia', 'United Kingdom', 'United States', 'India', 'China', 'South Africa', 'Philippines', 'Fiji', 'Samoa', 'Tonga', 'Sri Lanka'];
  const seen = new Set();
  const top = priority.filter((country) => COUNTRY_OPTIONS.includes(country)).map((country) => { seen.add(country); return country; });
  const rest = COUNTRY_OPTIONS.filter((country) => !seen.has(country));
  return [...top, { label: '────────────', value: '__divider', disabled: true }, ...rest];
}


function GuidedGoalIcon({ type }) {
  const common = {
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };
  const icons = {
    work: (
      <svg {...common}>
        <path d="M20 25h24a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5V30a5 5 0 0 1 5-5Z" />
        <path d="M25 25v-5a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v5" />
        <path d="M15 34h34" />
        <path d="M29 38h6" />
      </svg>
    ),
    residence: (
      <svg {...common}>
        <path d="M14 32 32 17l18 15" />
        <path d="M20 30v19h24V30" />
        <path d="M28 49V37h8v12" />
      </svg>
    ),
    family: (
      <svg {...common}>
        <circle cx="24" cy="24" r="6" />
        <circle cx="42" cy="25" r="5" />
        <circle cx="33" cy="38" r="4.5" />
        <path d="M13 50c2-8 8-12 17-12" />
        <path d="M51 50c-2-7-7-10-14-10" />
      </svg>
    ),
    study: (
      <svg {...common}>
        <path d="M12 25 32 15l20 10-20 10-20-10Z" />
        <path d="M20 30v9c4 5 20 5 24 0v-9" />
        <path d="M52 25v13" />
      </svg>
    ),
    invest: (
      <svg {...common}>
        <path d="M18 46h28" />
        <path d="M22 46V25" />
        <path d="M32 46V18" />
        <path d="M42 46V31" />
        <path d="M20 25c6 0 10-4 12-10 2 6 6 10 12 10" />
      </svg>
    ),
    employer: (
      <svg {...common}>
        <path d="M17 50V20h18v30" />
        <path d="M35 30h13v20" />
        <path d="M23 27h6M23 35h6M23 43h6M41 37h3M41 44h3" />
      </svg>
    ),
    urgent: (
      <svg {...common}>
        <circle cx="32" cy="32" r="20" />
        <path d="M32 20v14" />
        <path d="M32 43h.1" />
        <path d="M46 18 51 13" />
      </svg>
    ),
    unsure: (
      <svg {...common}>
        <circle cx="32" cy="32" r="20" />
        <path d="M32 20v6" />
        <path d="M32 38v6" />
        <path d="M20 32h6" />
        <path d="M38 32h6" />
        <path d="M27 27l10 10" />
        <path d="M37 27 27 37" />
      </svg>
    ),
  };
  return icons[type] || icons.unsure;
}



function IntakeFormApp() {
  const intakeShellRef = useRef(null);
  const [form, setForm] = useState(makeBlankIntakePayload());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [applicantCvFile, setApplicantCvFile] = useState(null);
  const [partnerCvFile, setPartnerCvFile] = useState(null);
  const [step, setStep] = useState(1);
  const [transition, setTransition] = useState(null);
  const [showFunds, setShowFunds] = useState(false);

  const hasPartner = form.hasPartner === 'Yes';
  const hasChildren = form.hasChildren === 'Yes';
  const isInNewZealand = form.isInNewZealand === 'Yes';
  const hasNzJobOffer = form.hasNzJobOffer === 'Yes' || form.hasNzJobOffer === 'In progress';
  const hasHealthIssue = form.healthIssues === 'Yes';
  const hasCharacterIssue = [form.characterIssues, form.characterConvictions, form.characterPendingCharges, form.deportationRemoval].some((value) => value === 'Yes');
  const hasImmigrationHistoryIssue = [form.visaDeclines, form.overstayed, form.falseMisleadingIssue, form.appealOrDeadline].some((value) => value === 'Yes');
  const isInvestmentMatter = form.investmentInterest === 'Yes' || /invest|business/i.test(`${form.targetPathway || ''} ${form.immediateNeed || ''} ${form.longTermGoal || ''}`);
  const isFamilyGoal = /partner|family/i.test(form.targetPathway || '');
  const isWorkResidenceGoal = /work|permanent|residence|not sure/i.test(form.targetPathway || '');

  const steps = [
    { id: 1, label: 'Goal', title: 'Choose your direction', helper: 'Start with the outcome you want. If work and residence overlap for you, we will capture both.' },
    { id: 2, label: 'You', title: 'Tell us who you are', helper: 'Your contact and identity details help us connect the right information to your enquiry.' },
    { id: 3, label: 'Visa', title: 'Where you are now', helper: 'Your current location and visa position shape what options may be practical next.' },
    { id: 4, label: 'Work', title: 'Your work background', helper: 'Employment and experience can matter for many visa pathways, even if your main enquiry is family-based.' },
    { id: 5, label: 'Study', title: 'Qualifications and English', helper: 'Qualifications and English history can help us spot options or issues earlier.' },
    { id: 6, label: 'Family', title: 'Family context', helper: 'Partner and children details help us understand who may be included or affected.' },
    { id: 7, label: 'History', title: 'Health, character and funds', helper: 'These questions help identify issues early, before they become expensive surprises.' },
    { id: 8, label: 'Send', title: 'Review and send', helper: 'Final check. Once submitted, your information goes securely to Turner Hopkins for review.' },
  ];

  const goalCards = [
    { value: 'Work in New Zealand', icon: 'work', title: 'Work in New Zealand', text: 'For temporary work visas, job-based visas, or permission to work.' },
    { value: 'Live in New Zealand permanently', icon: 'residence', title: 'Live in New Zealand permanently', text: 'For residence, pathways to residence, or long-term settlement.' },
    { value: 'Join my partner or family', icon: 'family', title: 'Join my partner or family', text: 'For partner, parent, dependent child or wider family visa questions.' },
    { value: 'Study in New Zealand', icon: 'study', title: 'Study in New Zealand', text: 'For student visas, post-study planning, or study-to-work options.' },
    { value: 'Invest in New Zealand', icon: 'invest', title: 'Invest in New Zealand', text: 'For investor, business, funds or source-of-funds questions.' },
    { value: 'Bring staff to New Zealand', icon: 'employer', title: 'Bring staff to New Zealand', text: 'For employers, accreditation and hiring migrant workers.' },
    { value: 'Resolve a visa issue', icon: 'urgent', title: 'Resolve a visa issue', text: 'For urgent deadlines, INZ concerns, declines or compliance issues.' },
    { value: 'Not sure yet', icon: 'unsure', title: 'Not sure yet', text: 'Choose this if you are exploring and want us to guide the first step.' },
  ];

  const funFacts = [
    'Aotearoa New Zealand has more than 15,000 kilometres of coastline — plenty of room for a fresh start.',
    'Many visa pathways depend on timing. Capturing dates clearly helps advisers avoid unnecessary detours.',
    'New Zealand has three official languages: English, te reo Māori and New Zealand Sign Language.',
    'Work and residence pathways often connect. A work visa can sometimes be one step in a longer plan.',
    'Good evidence matters. Clear answers at the start can make the next advice step much sharper.',
    'The silver fern has long been a New Zealand symbol — a small marker of the path ahead.',
    'Some health, character and visa-history issues can still be managed if they are identified early.',
  ];

  useEffect(() => {
    const embedded = window.parent !== window;
    document.documentElement.classList.toggle('intake-embed-mode', embedded);
    document.body.classList.toggle('intake-embed-mode', embedded);

    return () => {
      document.documentElement.classList.remove('intake-embed-mode');
      document.body.classList.remove('intake-embed-mode');
    };
  }, []);

  useEffect(() => {
    const shell = intakeShellRef.current;
    if (!shell || window.parent === window) return undefined;

    let frameId = 0;
    let lastSentHeight = 0;

    const postHeight = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const card = shell.querySelector('.intake-public-card');
        const shellStyles = window.getComputedStyle(shell);
        const shellPadding = parseFloat(shellStyles.paddingTop || '0') + parseFloat(shellStyles.paddingBottom || '0');
        const contentHeight = card
          ? Math.ceil(card.getBoundingClientRect().height + shellPadding)
          : Math.ceil(shell.scrollHeight);
        const height = Math.max(520, contentHeight + 8);

        if (Math.abs(height - lastSentHeight) < 8) return;
        lastSentHeight = height;

        window.parent.postMessage({
          type: 'THIS_INTAKE_EMBED_HEIGHT',
          source: 'this-crm-intake',
          height,
        }, '*');
      });
    };

    postHeight();
    const timeoutIds = [120, 450, 1000, 4200].map((delay) => window.setTimeout(postHeight, delay));
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(postHeight) : null;
    resizeObserver?.observe(shell);
    const card = shell.querySelector('.intake-public-card');
    if (card) resizeObserver?.observe(card);
    window.addEventListener('resize', postHeight);
    window.addEventListener('load', postHeight);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      resizeObserver?.disconnect();
      window.removeEventListener('resize', postHeight);
      window.removeEventListener('load', postHeight);
    };
  }, [form, submitted, error, step, transition, showFunds]);

  useEffect(() => {
    if (isInvestmentMatter) setShowFunds(true);
  }, [isInvestmentMatter]);

  useEffect(() => {
    if (step !== 1 || !form.targetPathway || transition) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 720px)').matches) return undefined;
    const timeoutId = window.setTimeout(() => {
      const confirmation = document.querySelector('.guided-selection-confirm');
      if (confirmation && typeof confirmation.scrollIntoView === 'function') {
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [form.targetPathway, step, transition]);

  function setField(name, value) {
    if (name === 'hasPartner' && value !== 'Yes') setPartnerCvFile(null);
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'targetPathway' && value) {
        next.targetPathway = value;
        const workResidenceOrUnsure = /work|permanent|residence|not sure/i.test(value);
        if (/work/i.test(value)) next.immediateNeed = 'Work visa or permission to work';
        else if (/permanent|residence/i.test(value)) next.immediateNeed = 'Residence or pathway to residence';
        else if (/resolve|urgent|issue/i.test(value)) next.immediateNeed = 'Urgent visa issue';
        else if (/partner|family/i.test(value)) next.immediateNeed = 'Partner or family visa help';
        else if (/study/i.test(value)) next.immediateNeed = 'Study visa or study-to-work planning';
        else if (/invest/i.test(value)) next.immediateNeed = 'Investor or business migration help';
        else if (/staff|employer/i.test(value)) next.immediateNeed = 'Employer / migrant staff support';
        else next.immediateNeed = 'Not sure yet';
        if (!workResidenceOrUnsure) next.longTermGoal = '';
        if (/invest/i.test(value)) next.investmentInterest = 'Yes';
      }
      if (name === 'isInNewZealand' && value === 'Yes') {
        next.previouslyVisitedNz = '';
        next.previouslyHeldNzVisa = '';
      }
      if (name === 'currentVisaType' && value && current.isInNewZealand === 'Yes') {
        next.previouslyHeldNzVisa = '';
      }
      if (name === 'dateOfBirth') next.dateOfBirthAge = calculateAge(value) ?? '';
      if (name === 'hasPartner' && value !== 'Yes') {
        next.partnerFullName = '';
        next.partnerDateOfBirth = '';
        next.partnerCitizenship = '';
        next.partnerCurrentCountry = '';
        next.partnerVisaStatus = '';
        next.partnerNzStatus = '';
        next.livingTogether = '';
        next.relationshipStarted = '';
        next.startedLivingTogether = '';
        next.partnerIncluded = '';
        next.relationshipBackground = '';
        next.partnerCurrentEmploymentStatus = '';
        next.partnerOccupation = '';
        next.partnerCurrentEmployer = '';
        next.partnerEmploymentCountry = '';
        next.partnerCurrentJobStartDate = '';
        next.partnerHoursPerWeek = '';
        next.partnerAnnualSalary = '';
        next.partnerSalaryCurrency = '';
        next.partnerYearsExperience = '';
        next.partnerEmploymentDetails = '';
        next.partnerPreviousWorkHistory = '';
        next.partnerHighestQualification = '';
        next.partnerQualificationName = '';
        next.partnerQualificationInstitution = '';
        next.partnerQualificationCountry = '';
        next.partnerQualificationYearCompleted = '';
        next.partnerQualificationStudyLength = '';
        next.partnerTaughtInEnglish = '';
        next.partnerNzqaAssessed = '';
        next.partnerQualificationRelatedToOccupation = '';
        next.partnerQualificationDetails = '';
        next.partnerCvExpected = false;
      }
      if (name === 'hasChildren') {
        next.children = value === 'Yes' ? (current.children?.length ? current.children : [makeBlankIntakeChild()]) : [];
        next.moreChildrenDetails = value === 'Yes' ? current.moreChildrenDetails : '';
      }
      return next;
    });
  }

  function setChildField(index, field, value) {
    setForm((current) => {
      const children = [...(current.children || [])];
      children[index] = { ...(children[index] || makeBlankIntakeChild()), [field]: value };
      return { ...current, children };
    });
  }

  function addChild() {
    setForm((current) => {
      const children = [...(current.children || [])];
      if (children.length >= 4) return current;
      return { ...current, hasChildren: 'Yes', children: [...children, makeBlankIntakeChild()] };
    });
  }

  function removeChild(index) {
    setForm((current) => {
      const children = (current.children || []).filter((_, childIndex) => childIndex !== index);
      return { ...current, children, hasChildren: children.length ? 'Yes' : current.hasChildren };
    });
  }

  function handleCvFile(kind, file) {
    if (kind === 'applicantCv') {
      setApplicantCvFile(file);
      setField('applicantCvExpected', Boolean(file));
    }
    if (kind === 'partnerCv') {
      setPartnerCvFile(file);
      setField('partnerCvExpected', Boolean(file));
    }
  }

  function validateForm() {
    if (!form.firstName || !form.lastName || !form.email) throw new Error('Please add your first name, last name and email before submitting.');
    if (!form.consentToContact || !form.privacyAcknowledged) throw new Error('Please confirm the consent and acknowledgement before submitting.');
    if (applicantCvFile) validateIntakeCvFile(applicantCvFile);
    if (hasPartner && partnerCvFile) validateIntakeCvFile(partnerCvFile);
  }

  async function uploadIntakeCvFile(intakeId, token, kind, file) {
    const params = new URLSearchParams({ upload: '1', intakeId, token, kind, fileName: file.name });
    const response = await fetch(`/.netlify/functions/intake?${params.toString()}`, {
      method: 'POST',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    });
    const body = await readJsonResponse(response);
    if (!response.ok) throw new Error(body.error || `The ${kind === 'partnerCv' ? 'partner' : 'applicant'} CV could not be uploaded.`);
    return body;
  }

  async function submit(event) {
    event.preventDefault();
    if (step < steps.length) {
      nextStep();
      return;
    }
    try {
      validateForm();
      setSubmitting(true);
      setError('');
      const response = await fetch('/.netlify/functions/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: { ...form, submittedVia: 'THiS guided intake journey', intakeVersion: 'v0.13.26g-mobile-width-progress-map-fix' } }),
      });
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(body.error || 'The questionnaire could not be submitted.');
      if (applicantCvFile) await uploadIntakeCvFile(body.intakeId, body.uploadToken, 'applicantCv', applicantCvFile);
      if (hasPartner && partnerCvFile) await uploadIntakeCvFile(body.intakeId, body.uploadToken, 'partnerCv', partnerCvFile);
      setSubmitted(true);
      scrollFormTop();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function postEmbedScroll(offset = 0, align = 'start') {
    if (typeof window === 'undefined' || window.parent === window) return false;
    window.parent.postMessage({
      type: 'THIS_INTAKE_SCROLL_TO',
      source: 'this-crm-intake',
      offset: Math.max(0, Math.round(offset || 0)),
      align,
    }, '*');
    return true;
  }

  function getOffsetWithinShell(element) {
    const shell = intakeShellRef.current;
    if (!shell || !element) return 0;
    const shellRect = shell.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return (elementRect.top - shellRect.top) + (elementRect.height / 2);
  }

  function scrollFormTop() {
    const shell = intakeShellRef.current;
    if (postEmbedScroll(0, 'start')) return;
    if (shell && typeof shell.scrollIntoView === 'function') {
      shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function scrollFactToCentre() {
    window.setTimeout(() => {
      const factCard = document.querySelector('.guided-fact-card');
      if (!factCard) return;
      const offset = getOffsetWithinShell(factCard);
      if (postEmbedScroll(offset, 'center')) return;
      if (typeof factCard.scrollIntoView === 'function') {
        factCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }

  function jumpTo(targetStep) {
    if (targetStep === step) return;
    if (targetStep < step) {
      setStep(targetStep);
      scrollFormTop();
      return;
    }
    showTransition(targetStep);
  }

  function nextStep() {
    if (step < steps.length) showTransition(step + 1);
  }

  function previousStep() {
    if (step > 1) {
      setStep(step - 1);
      scrollFormTop();
    }
  }

  function showTransition(targetStep) {
    const fact = funFacts[(targetStep + step) % funFacts.length];
    setTransition({ targetStep, fact });
    scrollFactToCentre();
    window.setTimeout(() => {
      setTransition((current) => {
        if (!current || current.targetStep !== targetStep) return current;
        setStep(targetStep);
        scrollFormTop();
        return null;
      });
    }, 4000);
  }

  function continueNow() {
    if (!transition) return;
    const targetStep = transition.targetStep;
    setTransition(null);
    setStep(targetStep);
    scrollFormTop();
  }

  const activeStep = steps.find((item) => item.id === step) || steps[0];
  const selectedGoal = goalCards.find((goal) => goal.value === form.targetPathway);
  const completedSteps = steps.filter((item) => item.id < step).length;

  if (submitted) {
    return (
      <div className="intake-public-shell guided-intake-shell" ref={intakeShellRef}>
        <main className="intake-public-card intake-thanks-card guided-thanks-card">
          <CheckCircle2 size={42} className="portal-lock" />
          <h1>Your information has been sent.</h1>
          <p className="muted">Thank you. Turner Hopkins Immigration Specialists will review your details and contact you about the most suitable next step.</p>
          <div className="guided-next-steps">
            <div><strong>1</strong><span>We review your information</span></div>
            <div><strong>2</strong><span>We identify the likely pathway or issue</span></div>
            <div><strong>3</strong><span>We contact you about the next step</span></div>
          </div>
          <p className="guided-urgent-note">If you have an urgent query, an INZ deadline, or an immediate visa issue, please contact us directly at <a href="mailto:immigration@turnerhopkins.co.nz">immigration@turnerhopkins.co.nz</a>.</p>
          <button className="btn dark" type="button" onClick={() => { setForm(makeBlankIntakePayload()); setApplicantCvFile(null); setPartnerCvFile(null); setSubmitted(false); setStep(1); }}>Start another questionnaire</button>
        </main>
      </div>
    );
  }

  return (
    <div className="intake-public-shell guided-intake-shell" ref={intakeShellRef}>
      <main className="intake-public-card guided-intake-card">
        <div className="guided-hero">
          <img src={LOGO_SRC} alt="Turner Hopkins Immigration Specialists" className="intake-brand-logo" />
          <div>
            <p className="guided-kicker">Turner Hopkins Immigration Specialists</p>
            <h1>Begin your journey with us...</h1>
            <p>Answer the guided questions below so our advisers can understand your circumstances and the best next step.</p>
          </div>
        </div>

        <div className="guided-step-tabs" aria-label="Intake stages">
          {steps.map((item) => (
            <button key={item.id} type="button" className={`guided-step-tab ${step === item.id ? 'active' : ''} ${step > item.id ? 'done' : ''}`} onClick={() => jumpTo(item.id)}>
              <span>{step > item.id ? '✓' : item.id}</span>{item.label}
            </button>
          ))}
        </div>

        <div className="guided-guide-card">
          <div className="guided-guide-number"><span>{activeStep.id}</span></div>
          <div>
            <p className="guided-kicker">Your guide</p>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.helper}</p>
          </div>
          <div className="guided-guide-meter"><strong>{activeStep.id} of {steps.length}</strong></div>
        </div>

        <div className="kiwi-journey-map" aria-label="Journey map">
          <div className="kiwi-map-bg">Aotearoa</div>
          {steps.map((item) => (
            <div key={item.id} data-label={item.label} className={`kiwi-map-stop ${step === item.id ? 'current' : ''} ${step > item.id ? 'complete' : ''}`}>
              <span className="kiwi-dot">{step > item.id ? '✓' : item.id}</span>
              <strong>{item.label}</strong>
            </div>
          ))}
        </div>

        {transition && (
          <div className="guided-fact-overlay" role="status">
            <div className="guided-fact-card">
              <p className="guided-kicker">Quick Kiwi note</p>
              <h2>{transition.fact}</h2>
              <div className="guided-fact-bar"><span /></div>
              <button type="button" className="btn ghost" onClick={continueNow}>Continue now</button>
            </div>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        <form className="intake-form guided-form" onSubmit={submit}>
          {step === 1 && (
            <IntakeSection title="Your goal" description="Choose the option that best matches what you want to achieve. You can still continue if you are not sure.">
              <div className="guided-goal-grid">
                {goalCards.map((goal) => {
                  const selected = form.targetPathway === goal.value;
                  const muted = form.targetPathway && !selected;
                  return (
                    <button key={goal.value} type="button" className={`guided-goal-card ${selected ? 'selected' : ''} ${muted ? 'muted-choice' : ''}`} onClick={() => setField('targetPathway', goal.value)}>
                      <span className="guided-goal-icon"><GuidedGoalIcon type={goal.icon} /></span>
                      <strong>{goal.title}</strong>
                      <small>{goal.text}</small>
                    </button>
                  );
                })}
              </div>
              {selectedGoal && (
                <>
                  <div className="guided-selection-confirm">
                    <strong>You selected: {selectedGoal.title}</strong>
                    <span>We will guide the next questions around this, while still collecting core details that help our advisers assess your position properly.</span>
                  </div>
                  <div className="guided-mobile-continue-cue">Next: continue below ↓</div>
                </>
              )}
              {isWorkResidenceGoal && (
                <div className="guided-bridge-panel">
                  <div className="guided-bridge-visual"><span>Work</span><i /> <span>Residence</span></div>
                  <p>Work and residence often connect. Your selected goal tells us your immediate focus; this one question helps us understand the longer-term plan.</p>
                  <div className="form-grid">
                    <IntakeSelect label="What is your longer-term goal?" value={form.longTermGoal} onChange={(v) => setField('longTermGoal', v)} options={['Stay temporarily', 'Live in New Zealand permanently', 'Bring or remain with my partner/family', 'Keep my options open', 'Not sure yet']} />
                  </div>
                </div>
              )}
            </IntakeSection>
          )}

          {step === 2 && (
            <IntakeSection title="Your details">
              <div className="form-grid">
                <IntakeField label="First name" value={form.firstName} onChange={(v) => setField('firstName', v)} required />
                <IntakeField label="Last name" value={form.lastName} onChange={(v) => setField('lastName', v)} required />
                <IntakeField label="Email" type="email" value={form.email} onChange={(v) => setField('email', v)} required />
                <IntakeField label="Mobile phone" value={form.phone} onChange={(v) => setField('phone', v)} />
                <IntakeSelect label="Preferred contact method" value={form.preferredContactMethod} onChange={(v) => setField('preferredContactMethod', v)} options={['Email', 'Mobile']} />
                <IntakeSelect label="Country of citizenship" value={form.citizenship} onChange={(v) => setField('citizenship', v)} options={guidedCountryOptions()} />
                <IntakeField label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => setField('dateOfBirth', v)} />
              </div>
              <IntakeFileField label="Upload CV" file={applicantCvFile} onChange={(file) => handleCvFile('applicantCv', file)} />
            </IntakeSection>
          )}

          {step === 3 && (
            <IntakeSection title="Current visa situation">
              <div className="form-grid">
                <IntakeSelect label="Are you currently in New Zealand?" value={form.isInNewZealand} onChange={(v) => setField('isInNewZealand', v)} options={INTAKE_YES_NO_ONLY_OPTIONS} />
                <IntakeSelect label="Current country / location" value={form.currentLocation} onChange={(v) => setField('currentLocation', v)} options={guidedCountryOptions()} />
                {isInNewZealand && <IntakeField label="Current visa type" value={form.currentVisaType} onChange={(v) => setField('currentVisaType', v)} />}
                {isInNewZealand && <IntakeField label="Current visa expiry" type="date" value={form.currentVisaExpiry} onChange={(v) => setField('currentVisaExpiry', v)} />}
                {isInNewZealand && <IntakeField label="Visa conditions" value={form.visaConditions} onChange={(v) => setField('visaConditions', v)} placeholder="e.g. employer, study, section 49 conditions" />}
                {!isInNewZealand && <IntakeSelect label="Have you previously visited New Zealand?" value={form.previouslyVisitedNz} onChange={(v) => setField('previouslyVisitedNz', v)} options={INTAKE_YES_NO_ONLY_OPTIONS} />}
                {!isInNewZealand && <IntakeSelect label="Have you previously held a New Zealand visa?" value={form.previouslyHeldNzVisa} onChange={(v) => setField('previouslyHeldNzVisa', v)} options={INTAKE_YES_NO_ONLY_OPTIONS} />}
                {!isInNewZealand && <IntakeField label="Planned travel date (if known)" type="date" value={form.plannedTravelDate} onChange={(v) => setField('plannedTravelDate', v)} />}
                <IntakeField label="Passport expiry date" type="date" value={form.passportExpiry} onChange={(v) => setField('passportExpiry', v)} />
              </div>
            </IntakeSection>
          )}

          {step === 4 && (
            <IntakeSection title="Work and employment" description={isFamilyGoal ? 'This may not be central to a family or partnership application, but it can still help us understand your overall position and whether there are other options worth considering.' : ''}>
              <div className="form-grid">
                <IntakeSelect label="Current employment status" value={form.currentEmploymentStatus} onChange={(v) => setField('currentEmploymentStatus', v)} options={INTAKE_EMPLOYMENT_STATUS_OPTIONS} />
                <IntakeField label="Occupation / profession" value={form.occupation} onChange={(v) => setField('occupation', v)} />
                <IntakeField label="Current employer / business" value={form.currentEmployer} onChange={(v) => setField('currentEmployer', v)} />
                <IntakeSelect label="Country of employment" value={form.employmentCountry} onChange={(v) => setField('employmentCountry', v)} options={guidedCountryOptions()} />
                <IntakeField label="Start date" type="date" value={form.currentJobStartDate} onChange={(v) => setField('currentJobStartDate', v)} />
                <IntakeField label="Hours per week" value={form.hoursPerWeek} onChange={(v) => setField('hoursPerWeek', v)} />
                <IntakeField label="Salary or pay rate" value={form.annualSalary} onChange={(v) => setField('annualSalary', v)} />
                <IntakeSelect label="Salary currency" value={form.salaryCurrency} onChange={(v) => setField('salaryCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
                <IntakeField label="Years of relevant experience" value={form.yearsExperience} onChange={(v) => setField('yearsExperience', v)} />
              </div>
              <IntakeTextarea label="Main duties / work background" value={form.employmentDetails} onChange={(v) => setField('employmentDetails', v)} rows={3} />
              <div className="intake-nested-panel">
                <h3>Previous work history</h3>
                <IntakeTextarea label="Previous work history" value={form.previousWorkHistory} onChange={(v) => setField('previousWorkHistory', v)} rows={4} placeholder="Please include relevant previous roles, employers, countries, dates or length of experience, and main duties." />
              </div>
              <div className="intake-nested-panel">
                <h3>New Zealand job offer</h3>
                <div className="form-grid">
                  <IntakeSelect label="Do you have a New Zealand job offer?" value={form.hasNzJobOffer} onChange={(v) => setField('hasNzJobOffer', v)} options={['Yes', 'No', 'In progress']} />
                  {hasNzJobOffer && <IntakeField label="NZ employer name" value={form.employerName} onChange={(v) => setField('employerName', v)} />}
                  {hasNzJobOffer && <IntakeField label="Job title" value={form.jobTitle} onChange={(v) => setField('jobTitle', v)} />}
                  {hasNzJobOffer && <IntakeField label="Location in New Zealand" value={form.nzJobLocation} onChange={(v) => setField('nzJobLocation', v)} />}
                  {hasNzJobOffer && <IntakeField label="Pay rate / salary" value={form.payRate} onChange={(v) => setField('payRate', v)} />}
                  {hasNzJobOffer && <IntakeSelect label="Pay currency" value={form.nzPayCurrency} onChange={(v) => setField('nzPayCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />}
                  {hasNzJobOffer && <IntakeField label="Hours per week" value={form.nzJobHours} onChange={(v) => setField('nzJobHours', v)} />}
                  {hasNzJobOffer && <IntakeSelect label="Is the employer accredited?" value={form.employerAccredited} onChange={(v) => setField('employerAccredited', v)} options={INTAKE_YES_NO_OPTIONS} />}
                  {hasNzJobOffer && <IntakeSelect label="Employment agreement provided?" value={form.employmentAgreementProvided} onChange={(v) => setField('employmentAgreementProvided', v)} options={INTAKE_YES_NO_OPTIONS} />}
                  {hasNzJobOffer && <IntakeField label="Proposed start date" type="date" value={form.proposedStartDate} onChange={(v) => setField('proposedStartDate', v)} />}
                </div>
              </div>
            </IntakeSection>
          )}

          {step === 5 && (
            <IntakeSection title="Qualifications and English" description={isFamilyGoal ? 'These details may not decide a family application, but they can help us understand whether there are additional work or residence options to consider.' : ''}>
              <div className="form-grid">
                <IntakeSelect label="Highest qualification" value={form.highestQualification} onChange={(v) => setField('highestQualification', v)} options={INTAKE_QUALIFICATION_OPTIONS} />
                <IntakeField label="Qualification name" value={form.qualificationName} onChange={(v) => setField('qualificationName', v)} />
                <IntakeField label="Institution" value={form.qualificationInstitution} onChange={(v) => setField('qualificationInstitution', v)} />
                <IntakeSelect label="Qualification country" value={form.qualificationCountry} onChange={(v) => setField('qualificationCountry', v)} options={guidedCountryOptions()} />
                <IntakeField label="Year completed" value={form.qualificationYearCompleted} onChange={(v) => setField('qualificationYearCompleted', v)} />
                <IntakeField label="Length of study" value={form.qualificationStudyLength} onChange={(v) => setField('qualificationStudyLength', v)} />
                <IntakeSelect label="Was the qualification taught in English?" value={form.taughtInEnglish} onChange={(v) => setField('taughtInEnglish', v)} options={INTAKE_YES_NO_OPTIONS} />
                <IntakeSelect label="Has it been assessed by NZQA?" value={form.nzqaAssessed} onChange={(v) => setField('nzqaAssessed', v)} options={INTAKE_YES_NO_OPTIONS} />
                <IntakeSelect label="Is it related to your occupation?" value={form.qualificationRelatedToOccupation} onChange={(v) => setField('qualificationRelatedToOccupation', v)} options={INTAKE_YES_NO_OPTIONS} />
                <IntakeField label="English level or test details" value={form.englishLevel} onChange={(v) => setField('englishLevel', v)} placeholder="e.g. fluent, IELTS/PTE score, not tested" />
              </div>
              <IntakeTextarea label="Other qualifications, training or English details" value={form.qualificationDetails} onChange={(v) => setField('qualificationDetails', v)} rows={3} />
            </IntakeSection>
          )}

          {step === 6 && (
            <IntakeSection title="Partner and family details">
              <div className="form-grid">
                <IntakeSelect label="Relationship status" value={form.relationshipStatus} onChange={(v) => setField('relationshipStatus', v)} options={INTAKE_RELATIONSHIP_OPTIONS} />
                <IntakeSelect label="Do you have a partner?" value={form.hasPartner} onChange={(v) => setField('hasPartner', v)} options={INTAKE_YES_NO_OPTIONS} />
                <IntakeSelect label="Do you have children?" value={form.hasChildren} onChange={(v) => setField('hasChildren', v)} options={INTAKE_YES_NO_OPTIONS} />
              </div>
              {hasPartner && (
                <div className="intake-nested-panel">
                  <h3>Partner details</h3>
                  <div className="form-grid">
                    <IntakeField label="Partner full name" value={form.partnerFullName} onChange={(v) => setField('partnerFullName', v)} />
                    <IntakeField label="Partner date of birth" type="date" value={form.partnerDateOfBirth} onChange={(v) => setField('partnerDateOfBirth', v)} />
                    <IntakeSelect label="Partner citizenship" value={form.partnerCitizenship} onChange={(v) => setField('partnerCitizenship', v)} options={guidedCountryOptions()} />
                    <IntakeSelect label="Partner current country" value={form.partnerCurrentCountry} onChange={(v) => setField('partnerCurrentCountry', v)} options={guidedCountryOptions()} />
                    <IntakeField label="Partner visa status" value={form.partnerVisaStatus} onChange={(v) => setField('partnerVisaStatus', v)} />
                    <IntakeField label="Partner NZ status" value={form.partnerNzStatus} onChange={(v) => setField('partnerNzStatus', v)} />
                    <IntakeSelect label="Are you living together?" value={form.livingTogether} onChange={(v) => setField('livingTogether', v)} options={INTAKE_YES_NO_OPTIONS} />
                    <IntakeField label="Relationship started" type="date" value={form.relationshipStarted} onChange={(v) => setField('relationshipStarted', v)} />
                    <IntakeField label="Started living together" type="date" value={form.startedLivingTogether} onChange={(v) => setField('startedLivingTogether', v)} />
                    <IntakeSelect label="Partner included in application?" value={form.partnerIncluded} onChange={(v) => setField('partnerIncluded', v)} options={INTAKE_YES_NO_OPTIONS} />
                  </div>
                  <IntakeTextarea label="Relationship / family background" value={form.relationshipBackground} onChange={(v) => setField('relationshipBackground', v)} rows={3} />
                </div>
              )}
              {hasPartner && (
                <div className="intake-nested-panel">
                  <h3>Partner work and qualifications</h3>
                  <div className="form-grid">
                    <IntakeSelect label="Partner employment status" value={form.partnerCurrentEmploymentStatus} onChange={(v) => setField('partnerCurrentEmploymentStatus', v)} options={INTAKE_EMPLOYMENT_STATUS_OPTIONS} />
                    <IntakeField label="Partner occupation" value={form.partnerOccupation} onChange={(v) => setField('partnerOccupation', v)} />
                    <IntakeField label="Partner employer / business" value={form.partnerCurrentEmployer} onChange={(v) => setField('partnerCurrentEmployer', v)} />
                    <IntakeSelect label="Partner employment country" value={form.partnerEmploymentCountry} onChange={(v) => setField('partnerEmploymentCountry', v)} options={guidedCountryOptions()} />
                    <IntakeField label="Partner years of relevant experience" value={form.partnerYearsExperience} onChange={(v) => setField('partnerYearsExperience', v)} />
                    <IntakeSelect label="Partner highest qualification" value={form.partnerHighestQualification} onChange={(v) => setField('partnerHighestQualification', v)} options={INTAKE_QUALIFICATION_OPTIONS} />
                    <IntakeField label="Partner qualification name" value={form.partnerQualificationName} onChange={(v) => setField('partnerQualificationName', v)} />
                    <IntakeSelect label="Partner qualification country" value={form.partnerQualificationCountry} onChange={(v) => setField('partnerQualificationCountry', v)} options={guidedCountryOptions()} />
                  </div>
                  <IntakeTextarea label="Partner employment details" value={form.partnerEmploymentDetails} onChange={(v) => setField('partnerEmploymentDetails', v)} rows={3} />
                  <IntakeTextarea label="Partner previous work history" value={form.partnerPreviousWorkHistory} onChange={(v) => setField('partnerPreviousWorkHistory', v)} rows={3} />
                  <IntakeTextarea label="Partner qualification details" value={form.partnerQualificationDetails} onChange={(v) => setField('partnerQualificationDetails', v)} rows={3} />
                  <IntakeFileField label="Upload partner CV" file={partnerCvFile} onChange={(file) => handleCvFile('partnerCv', file)} />
                </div>
              )}
              {hasChildren && (
                <div className="intake-nested-panel">
                  <div className="intake-panel-title-row">
                    <h3>Children</h3>
                    <button className="btn mini" type="button" onClick={addChild} disabled={(form.children || []).length >= 4}><Plus size={14} />Add child</button>
                  </div>
                  {(form.children || []).map((child, index) => (
                    <div className="intake-child-card" key={child.id || index}>
                      <div className="intake-panel-title-row">
                        <h4>Child {index + 1}</h4>
                        <button className="btn danger mini" type="button" onClick={() => removeChild(index)}><Trash2 size={14} />Remove</button>
                      </div>
                      <div className="form-grid">
                        <IntakeField label="Full name" value={child.fullName} onChange={(v) => setChildField(index, 'fullName', v)} />
                        <IntakeField label="Date of birth" type="date" value={child.dateOfBirth} onChange={(v) => setChildField(index, 'dateOfBirth', v)} />
                        <IntakeSelect label="Citizenship" value={child.citizenship} onChange={(v) => setChildField(index, 'citizenship', v)} options={guidedCountryOptions()} />
                        <IntakeSelect label="Current country" value={child.currentCountry} onChange={(v) => setChildField(index, 'currentCountry', v)} options={guidedCountryOptions()} />
                        <IntakeSelect label="Financially dependent?" value={child.dependent} onChange={(v) => setChildField(index, 'dependent', v)} options={INTAKE_YES_NO_OPTIONS} />
                        <IntakeSelect label="Include in visa application?" value={child.includedInApplication} onChange={(v) => setChildField(index, 'includedInApplication', v)} options={INTAKE_YES_NO_OPTIONS} />
                        <IntakeSelect label="Any custody / guardianship issue?" value={child.custodyIssues} onChange={(v) => setChildField(index, 'custodyIssues', v)} options={INTAKE_YES_NO_OPTIONS} />
                      </div>
                    </div>
                  ))}
                  {(form.children || []).length >= 4 && <IntakeTextarea label="More than four children? Add brief details here" value={form.moreChildrenDetails} onChange={(v) => setField('moreChildrenDetails', v)} rows={3} />}
                </div>
              )}
            </IntakeSection>
          )}

          {step === 7 && (
            <>
              <IntakeSection title="Health and character">
                <div className="form-grid">
                  <IntakeSelect label="Any medical or health concerns?" value={form.healthIssues} onChange={(v) => setField('healthIssues', v)} options={INTAKE_YES_NO_OPTIONS} />
                  <IntakeSelect label="Any dependent family health concerns?" value={form.dependantHealthIssues} onChange={(v) => setField('dependantHealthIssues', v)} options={INTAKE_YES_NO_OPTIONS} />
                  <IntakeSelect label="Any criminal convictions?" value={form.characterConvictions} onChange={(v) => setField('characterConvictions', v)} options={INTAKE_YES_NO_OPTIONS} />
                  <IntakeSelect label="Any pending charges or police matters?" value={form.characterPendingCharges} onChange={(v) => setField('characterPendingCharges', v)} options={INTAKE_YES_NO_OPTIONS} />
                  <IntakeSelect label="Any deportation, removal or exclusion history?" value={form.deportationRemoval} onChange={(v) => setField('deportationRemoval', v)} options={INTAKE_YES_NO_OPTIONS} />
                </div>
                {hasHealthIssue && <IntakeTextarea label="Health details" value={form.healthDetails} onChange={(v) => setField('healthDetails', v)} rows={3} />}
                {hasCharacterIssue && <IntakeTextarea label="Character details" value={form.characterDetails} onChange={(v) => setField('characterDetails', v)} rows={3} />}
              </IntakeSection>
              <IntakeSection title="Immigration history">
                <div className="form-grid">
                  <IntakeSelect label="Any visa declines?" value={form.visaDeclines} onChange={(v) => setField('visaDeclines', v)} options={INTAKE_YES_NO_OPTIONS} />
                  <IntakeSelect label="Ever overstayed a visa?" value={form.overstayed} onChange={(v) => setField('overstayed', v)} options={INTAKE_YES_NO_OPTIONS} />
                  <IntakeSelect label="Any false or misleading information issue?" value={form.falseMisleadingIssue} onChange={(v) => setField('falseMisleadingIssue', v)} options={INTAKE_YES_NO_OPTIONS} />
                  <IntakeSelect label="Any current appeal, reconsideration or deadline?" value={form.appealOrDeadline} onChange={(v) => setField('appealOrDeadline', v)} options={INTAKE_YES_NO_OPTIONS} />
                </div>
                {hasImmigrationHistoryIssue && <IntakeTextarea label="Immigration history details" value={form.immigrationHistoryDetails} onChange={(v) => setField('immigrationHistoryDetails', v)} rows={3} />}
                <IntakeTextarea label="Countries you have spent a combined total of 12 months or more in" value={form.countriesLived} onChange={(v) => setField('countriesLived', v)} rows={3} />
                <IntakeTextarea label="Countries you have spent a combined total of five years or more in, since turning 17 years of age" value={form.countriesLivedFiveYearsSince17} onChange={(v) => setField('countriesLivedFiveYearsSince17', v)} rows={3} />
                <IntakeTextarea label="New Zealand travel or visa history" value={form.nzTravelHistory} onChange={(v) => setField('nzTravelHistory', v)} rows={3} />
              </IntakeSection>
              <div className="guided-funds-panel">
                <div>
                  <p className="guided-kicker">Funds, business and investment</p>
                  <h2>Important for investor, business and settlement planning</h2>
                  <p>For business owners, Active Investor enquiries, investment migration and some temporary visas, funds and source-of-funds information can be central. It is optional for other pathways, but useful where relevant.</p>
                </div>
                <button type="button" className="btn dark" onClick={() => setShowFunds((value) => !value)}>{showFunds ? 'Close section' : 'Open section'}</button>
              </div>
              {showFunds && (
                <IntakeSection title="Funds and investment">
                  <div className="form-grid">
                    <IntakeSelect label="Do you have funds to support your move?" value={form.fundsAvailableSupport} onChange={(v) => setField('fundsAvailableSupport', v)} options={INTAKE_YES_NO_OPTIONS} />
                    <IntakeField label="Approximate funds available" value={form.availableFunds} onChange={(v) => setField('availableFunds', v)} />
                    <IntakeSelect label="Currency" value={form.fundsCurrency} onChange={(v) => setField('fundsCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
                    <IntakeField label="Source of funds" value={form.sourceOfFunds} onChange={(v) => setField('sourceOfFunds', v)} />
                    <IntakeSelect label="Investment or business migration enquiry?" value={form.investmentInterest} onChange={(v) => setField('investmentInterest', v)} options={INTAKE_YES_NO_OPTIONS} />
                    <IntakeField label="Approximate investment funds" value={form.investmentFunds} onChange={(v) => setField('investmentFunds', v)} />
                    <IntakeSelect label="Investment currency" value={form.investmentCurrency} onChange={(v) => setField('investmentCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
                    <IntakeSelect label="Funds held by you?" value={form.fundsHeldByYou} onChange={(v) => setField('fundsHeldByYou', v)} options={INTAKE_YES_NO_OPTIONS} />
                    <IntakeSelect label="Funds transferable to New Zealand?" value={form.fundsTransferableNz} onChange={(v) => setField('fundsTransferableNz', v)} options={INTAKE_YES_NO_OPTIONS} />
                  </div>
                  <IntakeTextarea label="Business / investment background" value={form.fundsDetails} onChange={(v) => setField('fundsDetails', v)} rows={3} />
                </IntakeSection>
              )}
            </>
          )}

          {step === 8 && (
            <IntakeSection title="Review and send">
              <div className="guided-review-grid">
                <div><strong>{form.targetPathway || 'Not selected'}</strong><span>Main goal</span></div>
                <div><strong>{form.immediateNeed || 'Not recorded'}</strong><span>Immediate need</span></div>
                <div><strong>{form.longTermGoal || 'Not recorded'}</strong><span>Long-term goal</span></div>
                <div><strong>{[form.firstName, form.lastName].filter(Boolean).join(' ') || 'Name missing'}</strong><span>Applicant</span></div>
              </div>
              <IntakeTextarea label="Anything else we should know?" value={form.additionalInfo} onChange={(v) => setField('additionalInfo', v)} rows={4} />
              <div className="intake-consent-grid">
                <IntakeCheckbox label="I agree Turner Hopkins may contact me about this enquiry." checked={form.consentToContact} onChange={(v) => setField('consentToContact', v)} required />
                <IntakeCheckbox label="I understand this questionnaire is for initial assessment only and does not create an adviser-client relationship." checked={form.privacyAcknowledged} onChange={(v) => setField('privacyAcknowledged', v)} required />
              </div>
            </IntakeSection>
          )}

          <div className="guided-submit-bar">
            <button className="btn ghost" type="button" onClick={previousStep} disabled={step === 1 || submitting}>Back</button>
            <span>{completedSteps} of {steps.length} stages completed</span>
            {step < steps.length ? (
              <button className="btn dark" type="button" onClick={nextStep} disabled={submitting}>Next</button>
            ) : (
              <button className="btn dark" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit questionnaire'}</button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function ContactFormApp() {
  const contactShellRef = useRef(null);
  const [form, setForm] = useState({
    contactSituation: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    contactLocation: '',
    bestTimeToCall: '',
    helpNeeded: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const embedded = window.parent !== window;
    document.documentElement.classList.toggle('intake-embed-mode', embedded);
    document.body.classList.toggle('intake-embed-mode', embedded);
    return () => {
      document.documentElement.classList.remove('intake-embed-mode');
      document.body.classList.remove('intake-embed-mode');
    };
  }, []);

  useEffect(() => {
    const shell = contactShellRef.current;
    if (!shell || window.parent === window) return undefined;
    let frameId = 0;
    let lastSentHeight = 0;
    const postHeight = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const card = shell.querySelector('.intake-public-card');
        const shellStyles = window.getComputedStyle(shell);
        const shellPadding = parseFloat(shellStyles.paddingTop || '0') + parseFloat(shellStyles.paddingBottom || '0');
        const contentHeight = card ? Math.ceil(card.getBoundingClientRect().height + shellPadding) : Math.ceil(shell.scrollHeight);
        const height = Math.max(520, contentHeight + 8);
        if (Math.abs(height - lastSentHeight) < 8) return;
        lastSentHeight = height;
        window.parent.postMessage({ type: 'THIS_INTAKE_EMBED_HEIGHT', source: 'this-crm-intake', height }, '*');
      });
    };
    postHeight();
    const timeoutIds = [120, 450, 1000].map((delay) => window.setTimeout(postHeight, delay));
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(postHeight) : null;
    resizeObserver?.observe(shell);
    const card = shell.querySelector('.intake-public-card');
    if (card) resizeObserver?.observe(card);
    window.addEventListener('resize', postHeight);
    window.addEventListener('load', postHeight);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      resizeObserver?.disconnect();
      window.removeEventListener('resize', postHeight);
      window.removeEventListener('load', postHeight);
    };
  }, [form, submitted, error]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const submitPayload = {
        ...form,
        formType: 'contact',
        targetPathway: form.contactSituation,
        currentLocation: form.contactLocation,
        preferredContactMethod: 'Email',
        urgency: 'Standard',
        consentToContact: true,
        privacyAcknowledged: true,
        submittedVia: 'THiS contact form',
        intakeVersion: 'v0.12.15',
      };
      const response = await fetch('/.netlify/functions/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: submitPayload }),
      });
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(body.error || 'The contact enquiry could not be submitted.');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="intake-public-shell" ref={contactShellRef}>
        <main className="intake-public-card intake-thanks-card">
          <CheckCircle2 size={40} className="portal-lock" />
          <h1>Thank you. Your message has been received.</h1>
          <p className="muted">Turner Hopkins will review your enquiry and come back to you if we can assist. This contact form is for initial enquiries only and does not create an adviser-client relationship.</p>
          <button className="btn dark" type="button" onClick={() => { setForm({ contactSituation: '', firstName: '', lastName: '', email: '', phone: '', contactLocation: '', bestTimeToCall: '', helpNeeded: '' }); setSubmitted(false); }}>Send another question</button>
        </main>
      </div>
    );
  }

  return (
    <div className="intake-public-shell contact-public-shell" ref={contactShellRef}>
      <main className="intake-public-card contact-public-card">
        <div className="intake-public-head compact contact-public-intro">
          <p>Send us a short enquiry and our team will review how we may be able to assist.</p>
        </div>
        {error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}
        <form className="intake-form contact-form" onSubmit={submit}>
          <IntakeSelect label="Your situation" value={form.contactSituation} onChange={(v) => setField('contactSituation', v)} options={CONTACT_SITUATION_OPTIONS} required />
          <div className="form-grid">
            <IntakeField label="First Name" value={form.firstName} onChange={(v) => setField('firstName', v)} required />
            <IntakeField label="Last Name" value={form.lastName} onChange={(v) => setField('lastName', v)} required />
            <IntakeField label="Email Address" type="email" value={form.email} onChange={(v) => setField('email', v)} required placeholder="Enter your email address" />
            <IntakeField label="Phone (+area code)" value={form.phone} onChange={(v) => setField('phone', v)} required placeholder="Enter phone number including country code" />
            <IntakeField label="Where are you located? (if outside NZ)" value={form.contactLocation} onChange={(v) => setField('contactLocation', v)} />
            <IntakeField label="Best time to call (if needed)?" value={form.bestTimeToCall} onChange={(v) => setField('bestTimeToCall', v)} />
          </div>
          <IntakeTextarea label="How can we help?" value={form.helpNeeded} onChange={(v) => setField('helpNeeded', v)} rows={6} placeholder="Please describe the assistance you need, with as much detail as possible." />
          <p className="muted small">By submitting this form, you agree that Turner Hopkins may contact you about this enquiry. This is an initial enquiry only and does not create an adviser-client relationship.</p>
          <div className="intake-submit-bar">
            <button className="btn dark" type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send enquiry'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}


function FeedbackFormApp() {
  const feedbackShellRef = useRef(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    adviserName: '',
    applicationType: '',
    overallRating: '',
    recommendationRating: '',
    serviceStrengths: '',
    improvementSuggestions: '',
    permissionToContact: 'Yes',
    permissionToUseFeedback: 'No',
    consentToSubmit: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const embedded = window.parent !== window;
    document.documentElement.classList.toggle('intake-embed-mode', embedded);
    document.body.classList.toggle('intake-embed-mode', embedded);
    return () => {
      document.documentElement.classList.remove('intake-embed-mode');
      document.body.classList.remove('intake-embed-mode');
    };
  }, []);

  useEffect(() => {
    const shell = feedbackShellRef.current;
    if (!shell || window.parent === window) return undefined;
    let frameId = 0;
    let lastSentHeight = 0;
    const postHeight = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const card = shell.querySelector('.intake-public-card');
        const shellStyles = window.getComputedStyle(shell);
        const shellPadding = parseFloat(shellStyles.paddingTop || '0') + parseFloat(shellStyles.paddingBottom || '0');
        const contentHeight = card ? Math.ceil(card.getBoundingClientRect().height + shellPadding) : Math.ceil(shell.scrollHeight);
        const height = Math.max(620, contentHeight + 8);
        if (Math.abs(height - lastSentHeight) < 8) return;
        lastSentHeight = height;
        window.parent.postMessage({ type: 'THIS_FEEDBACK_EMBED_HEIGHT', source: 'this-crm-feedback', height }, '*');
      });
    };
    postHeight();
    const timeoutIds = [120, 450, 1000].map((delay) => window.setTimeout(postHeight, delay));
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(postHeight) : null;
    resizeObserver?.observe(shell);
    const card = shell.querySelector('.intake-public-card');
    if (card) resizeObserver?.observe(card);
    window.addEventListener('resize', postHeight);
    window.addEventListener('load', postHeight);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      resizeObserver?.disconnect();
      window.removeEventListener('resize', postHeight);
      window.removeEventListener('load', postHeight);
    };
  }, [form, submitted, error]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!form.consentToSubmit) throw new Error('Please confirm that Turner Hopkins may receive and review your feedback.');
      const response = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: { ...form, submittedVia: 'THiS client feedback form', feedbackVersion: 'v0.13.20' } }),
      });
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(body.error || 'Your feedback could not be submitted.');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="intake-public-shell feedback-public-shell" ref={feedbackShellRef}>
        <main className="intake-public-card intake-thanks-card feedback-thanks-card">
          <CheckCircle2 size={40} className="portal-lock" />
          <h1>Thank you. Your feedback has been received.</h1>
          <p className="muted">We appreciate you taking the time to share your experience. Your comments have been sent to our team for review.</p>
          <button className="btn dark" type="button" onClick={() => { setForm({ firstName: '', lastName: '', email: '', phone: '', adviserName: '', applicationType: '', overallRating: '', recommendationRating: '', serviceStrengths: '', improvementSuggestions: '', permissionToContact: 'Yes', permissionToUseFeedback: 'No', consentToSubmit: false }); setSubmitted(false); }}>Send another response</button>
        </main>
      </div>
    );
  }

  return (
    <div className="intake-public-shell feedback-public-shell" ref={feedbackShellRef}>
      <main className="intake-public-card contact-public-card feedback-public-card">
        <div className="intake-public-head compact contact-public-intro feedback-public-intro">
          <p>Tell us how we did. Your feedback helps us improve the way we support future clients.</p>
        </div>
        {error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}
        <form className="intake-form contact-form feedback-form" onSubmit={submit}>
          <div className="form-grid">
            <IntakeField label="First Name" value={form.firstName} onChange={(v) => setField('firstName', v)} required />
            <IntakeField label="Last Name" value={form.lastName} onChange={(v) => setField('lastName', v)} required />
            <IntakeField label="Email Address" type="email" value={form.email} onChange={(v) => setField('email', v)} required placeholder="Enter your email address" />
            <IntakeField label="Phone (optional)" value={form.phone} onChange={(v) => setField('phone', v)} placeholder="Phone number, if you are happy for us to call" />
            <IntakeField label="Adviser / team member (optional)" value={form.adviserName} onChange={(v) => setField('adviserName', v)} placeholder="Who helped you?" />
            <IntakeField label="Application or visa type (optional)" value={form.applicationType} onChange={(v) => setField('applicationType', v)} placeholder="e.g. AEWV, residence, partnership" />
          </div>
          <div className="form-grid">
            <IntakeSelect label="Overall, how would you rate our service?" value={form.overallRating} onChange={(v) => setField('overallRating', v)} options={['5 - Excellent', '4 - Good', '3 - Okay', '2 - Could be better', '1 - Poor']} required />
            <IntakeSelect label="How likely are you to recommend us?" value={form.recommendationRating} onChange={(v) => setField('recommendationRating', v)} options={['10 - Extremely likely', '9', '8', '7', '6', '5', '4', '3', '2', '1 - Not likely']} required />
          </div>
          <IntakeTextarea label="What did we do well?" value={form.serviceStrengths} onChange={(v) => setField('serviceStrengths', v)} rows={5} placeholder="Tell us what worked well for you." />
          <IntakeTextarea label="What could we improve?" value={form.improvementSuggestions} onChange={(v) => setField('improvementSuggestions', v)} rows={5} placeholder="Tell us where we could do better, or whether any of our systems could be improved." />
          <div className="form-grid">
            <IntakeSelect label="May we contact you about this feedback?" value={form.permissionToContact} onChange={(v) => setField('permissionToContact', v)} options={['Yes', 'No']} required />
            <IntakeSelect label="May we use your comments in client review material?" value={form.permissionToUseFeedback} onChange={(v) => setField('permissionToUseFeedback', v)} options={['No', 'Yes, with my name', 'Yes, anonymously']} required />
          </div>
          <label className="intake-check consent-check">
            <input type="checkbox" checked={form.consentToSubmit} onChange={(event) => setField('consentToSubmit', event.target.checked)} required />
            <span>I confirm Turner Hopkins may receive and review this feedback and contact me if needed.</span>
          </label>
          <div className="intake-submit-bar">
            <button className="btn dark" type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Submit feedback'}</button>
          </div>
        </form>
      </main>
    </div>
  );
}


function SeminarRegistrationFormApp() {
  const [seminar, setSeminar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    citizenshipCountry: '',
    residenceCountry: '',
    timezone: 'UTC',
    email: '',
    partnershipStatus: '',
    highestQualification: '',
    currentOccupation: '',
    workHistory: '',
    healthCharacterIssues: '',
    englishAbility: '',
    consentToContact: false,
    privacyAcknowledged: false,
  });

  useEffect(() => {
    let active = true;
    async function loadSeminar() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/.netlify/functions/seminar', { method: 'GET' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'The seminar form could not be loaded.');
        if (active) setSeminar(body.seminar || null);
      } catch (err) {
        if (active) setError(err.message || 'The seminar form could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSeminar();
    return () => { active = false; };
  }, []);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!seminar?.id) {
      setError('There is no active seminar available for registration.');
      return;
    }
    if (!form.consentToContact || !form.privacyAcknowledged) {
      setError('Please confirm the consent and privacy acknowledgements before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/.netlify/functions/seminar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seminarId: seminar.id, registration: form }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'The registration could not be submitted.');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'The registration could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="intake-public-shell seminar-public-shell">
        <main className="intake-public-card intake-thanks-card">
          <CheckCircle2 size={40} className="portal-lock" />
          <h1>Thank you. Your registration has been received.</h1>
          <p className="muted">We will review your details and confirm whether we are able to invite you to the seminar. If approved, you will receive the Zoom details by email.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="intake-public-shell seminar-public-shell">
      <main className="intake-public-card seminar-public-card">
        <div className="intake-public-head compact contact-public-intro">
          <p>Register your interest in the next Turner Hopkins immigration seminar. Registrations are reviewed before Zoom details are issued.</p>
        </div>
        {loading && <div className="loading-card"><Database size={18} />Loading seminar details...</div>}
        {error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}
        {!loading && !seminar && !error && (
          <div className="empty-state slim intake-inbox-empty">
            <CalendarDays size={34} />
            <h2>No seminar is currently open</h2>
            <p>Please check back later for the next available session.</p>
          </div>
        )}
        {seminar && (
          <>
            <section className="seminar-public-summary">
              <span className="eyebrow">Next seminar</span>
              <h1>{seminar.title || 'Upcoming immigration seminar'}</h1>
              <p><strong>{formatSeminarPublicDate(seminar)}</strong></p>
              <p className="muted">Presenter: {seminar.presenterName || 'Turner Hopkins adviser'}</p>
            </section>
            <form className="intake-form seminar-form" onSubmit={submit}>
              <IntakeSection title="Your details">
                <div className="form-grid">
                  <IntakeField label="Full name" value={form.fullName} onChange={(v) => setField('fullName', v)} required />
                  <IntakeField label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => setField('dateOfBirth', v)} required />
                  <IntakeSelect label="Country of citizenship" value={form.citizenshipCountry} onChange={(v) => setField('citizenshipCountry', v)} options={COUNTRY_OPTIONS} required />
                  <IntakeSelect label="Current country of residence" value={form.residenceCountry} onChange={(v) => setField('residenceCountry', v)} options={COUNTRY_OPTIONS} required />
                  <IntakeSelect label="Your current timezone" value={form.timezone} onChange={(v) => setField('timezone', v)} options={SEMINAR_TIMEZONE_OPTIONS} required />
                  <IntakeField label="Email address" type="email" value={form.email} onChange={(v) => setField('email', v)} required />
                </div>
              </IntakeSection>

              <IntakeSection title="Background information">
                <div className="form-grid">
                  <IntakeSelect label="Partnership status" value={form.partnershipStatus} onChange={(v) => setField('partnershipStatus', v)} options={INTAKE_RELATIONSHIP_OPTIONS} required />
                  <IntakeSelect label="Highest qualification" value={form.highestQualification} onChange={(v) => setField('highestQualification', v)} options={INTAKE_QUALIFICATION_OPTIONS} required />
                  <IntakeField label="Current occupation" value={form.currentOccupation} onChange={(v) => setField('currentOccupation', v)} required />
                  <IntakeSelect label="English ability" value={form.englishAbility} onChange={(v) => setField('englishAbility', v)} options={SEMINAR_ENGLISH_OPTIONS} required />
                </div>
                <IntakeTextarea label="Relevant work history" value={form.workHistory} onChange={(v) => setField('workHistory', v)} rows={4} placeholder="Please summarise your main roles, years of experience, and industry." />
                <IntakeTextarea label="Any health or character issues" value={form.healthCharacterIssues} onChange={(v) => setField('healthCharacterIssues', v)} rows={4} placeholder="Please mention any health concerns, convictions, charges, visa declines, deportation/removal matters, or write None." />
              </IntakeSection>

              <IntakeSection title="Consent">
                <div className="intake-consent-grid">
                  <IntakeCheckbox label="I agree Turner Hopkins may contact me about this seminar registration." checked={form.consentToContact} onChange={(v) => setField('consentToContact', v)} required />
                  <IntakeCheckbox label="I understand this registration is reviewed before Zoom details are issued and does not create an adviser-client relationship." checked={form.privacyAcknowledged} onChange={(v) => setField('privacyAcknowledged', v)} required />
                </div>
              </IntakeSection>

              <div className="intake-submit-bar">
                <button className="btn dark" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit registration'}</button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function formatSeminarPublicDate(seminar = {}) {
  const date = seminar.seminarDate || seminar.date || '';
  const time = formatSeminarTimeDisplay(seminar.seminarTime || seminar.time || '');
  if (!date && !time) return 'Date and time to be confirmed';
  return `${date || 'Date to be confirmed'}${time ? ` at ${time}` : ''} NZ time`;
}

function isContactIntake(record = {}) {
  const payload = intakeAnswerPayload(record);
  return String(payload.formType || '').toLowerCase() === 'contact' || String(payload.submittedVia || '').toLowerCase().includes('contact form');
}

function matchesIntakeAdviserScope(item = {}, adviserScope = 'all') {
  if (!adviserScope || adviserScope === 'all') return true;
  const assignedAdviserId = String(item.assignedAdviserId || '');
  return !assignedAdviserId || assignedAdviserId === String(adviserScope);
}


const BOOKING_DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];
const BOOKING_STATUS_OPTIONS = ['Reserved', 'Confirmed', 'Cancelled', 'Completed', 'No-show'];
const BOOKING_LINK_STATUS_OPTIONS = ['Active', 'Used', 'Expired', 'Cancelled'];

function ConsultationBookingWorkspace({ advisers = [], intakeEnquiries = [], consultationTypes = [], bookingAvailability = [], bookingBlocks = [], bookingLinks = [], consultationBookings = [], dashboardAdviserFilter = 'all', saveConsultationType, deleteConsultationType, saveBookingAvailability, saveBookingAvailabilityBulk, deleteBookingAvailability, saveBookingBlock, saveBookingBlockBulk, deleteBookingBlock, saveBookingLink, deleteBookingLink, saveConsultationBooking, cancelConsultationBooking, saving = false }) {
  const [activeTab, setActiveTab] = useState('overview');
  const activeAdvisers = advisers.filter((adviser) => adviser.active !== false);
  const defaultAdviserId = dashboardAdviserFilter !== 'all' ? dashboardAdviserFilter : (activeAdvisers[0]?.id || advisers[0]?.id || '');
  const [moduleAdviserId, setModuleAdviserId] = useState(defaultAdviserId || 'all');
  const scopedAdviserId = moduleAdviserId === 'all' ? '' : moduleAdviserId;
  const typeOptions = consultationTypes.filter((type) => type.active !== false);
  const adviserOptions = [{ value: 'all', label: 'All advisers' }, ...activeAdvisers.map((adviser) => ({ value: adviser.id, label: adviser.name || adviser.email || 'Unnamed adviser' }))];
  const [typeDraft, setTypeDraft] = useState(makeBlankConsultationType());
  const [availabilityDraft, setAvailabilityDraft] = useState(makeBlankBookingAvailability(defaultAdviserId));
  const [standardAvailabilityDraft, setStandardAvailabilityDraft] = useState(makeBlankStandardBookingAvailability(defaultAdviserId));
  const [blockDraft, setBlockDraft] = useState(makeBlankBookingBlock(defaultAdviserId));
  const [blockRangeDraft, setBlockRangeDraft] = useState(makeBlankBookingBlockRange(defaultAdviserId));
  const [linkDraft, setLinkDraft] = useState(makeBlankBookingLink(defaultAdviserId));
  const [bookingDrafts, setBookingDrafts] = useState({});
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    if (defaultAdviserId && !availabilityDraft.adviserId) setAvailabilityDraft((current) => ({ ...current, adviserId: defaultAdviserId }));
    if (defaultAdviserId && !standardAvailabilityDraft.adviserId) setStandardAvailabilityDraft((current) => ({ ...current, adviserId: defaultAdviserId }));
    if (defaultAdviserId && !blockDraft.adviserId) setBlockDraft((current) => ({ ...current, adviserId: defaultAdviserId }));
    if (defaultAdviserId && !blockRangeDraft.adviserId) setBlockRangeDraft((current) => ({ ...current, adviserId: defaultAdviserId }));
    if (defaultAdviserId && !linkDraft.adviserId) setLinkDraft((current) => ({ ...current, adviserId: defaultAdviserId }));
  }, [defaultAdviserId]);

  const scopedBookings = consultationBookings.filter((booking) => !scopedAdviserId || booking.adviserId === scopedAdviserId);
  const scopedLinks = bookingLinks.filter((link) => !scopedAdviserId || link.adviserId === scopedAdviserId);
  const scopedAvailability = bookingAvailability.filter((row) => !scopedAdviserId || row.adviserId === scopedAdviserId);
  const scopedBlocks = bookingBlocks.filter((block) => !scopedAdviserId || block.adviserId === scopedAdviserId);
  const upcomingBookings = scopedBookings.filter((booking) => ['Reserved', 'Confirmed'].includes(booking.status)).sort((a, b) => `${a.bookingDate} ${a.startTime}`.localeCompare(`${b.bookingDate} ${b.startTime}`));

  function adviserName(id) {
    return advisers.find((adviser) => adviser.id === id)?.name || 'Unassigned adviser';
  }

  function typeName(id) {
    return consultationTypes.find((type) => type.id === id)?.name || 'Consultation';
  }

  function bookingUrl(link) {
    if (link.bookingUrl) return link.bookingUrl;
    if (typeof window !== 'undefined' && link.token) return `${window.location.origin}/book?token=${encodeURIComponent(link.token)}`;
    return '';
  }

  function toggleAllowedType(id) {
    setLinkDraft((current) => {
      const set = new Set(current.allowedTypeIds || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...current, allowedTypeIds: Array.from(set) };
    });
  }

  function toggleAvailabilityType(id) {
    setAvailabilityDraft((current) => {
      const set = new Set(current.consultationTypeIds || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...current, consultationTypeIds: Array.from(set) };
    });
  }

  function toggleStandardAvailabilityType(id) {
    setStandardAvailabilityDraft((current) => {
      const set = new Set(current.consultationTypeIds || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...current, consultationTypeIds: Array.from(set) };
    });
  }

  function toggleStandardDay(dayValue) {
    setStandardAvailabilityDraft((current) => {
      const set = new Set((current.days || []).map(Number));
      if (set.has(Number(dayValue))) set.delete(Number(dayValue)); else set.add(Number(dayValue));
      return { ...current, days: Array.from(set).sort((a, b) => a - b) };
    });
  }

  function applyIntakeToLink(intakeId) {
    const intake = intakeEnquiries.find((item) => item.id === intakeId);
    setLinkDraft((current) => ({
      ...current,
      intakeId,
      adviserId: intake?.assignedAdviserId || current.adviserId || defaultAdviserId,
      applicantName: intake ? `${intake.firstName || ''} ${intake.lastName || ''}`.trim() : current.applicantName,
      applicantEmail: intake?.email || current.applicantEmail,
      applicantPhone: intake?.phone || current.applicantPhone,
    }));
  }

  async function copyLink(link) {
    const url = bookingUrl(link);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage('Booking link copied.');
      window.setTimeout(() => setCopyMessage(''), 1800);
    } catch {
      setCopyMessage(url);
    }
  }

  async function submitType(event) {
    event.preventDefault();
    await saveConsultationType(typeDraft);
    setTypeDraft(makeBlankConsultationType());
  }

  async function submitAvailability(event) {
    event.preventDefault();
    await saveBookingAvailability(availabilityDraft);
    setAvailabilityDraft(makeBlankBookingAvailability(availabilityDraft.adviserId || defaultAdviserId));
  }

  async function submitStandardAvailability(event) {
    event.preventDefault();
    await saveBookingAvailabilityBulk?.(standardAvailabilityDraft);
    setStandardAvailabilityDraft(makeBlankStandardBookingAvailability(standardAvailabilityDraft.adviserId || defaultAdviserId));
  }

  async function submitBlock(event) {
    event.preventDefault();
    await saveBookingBlock(blockDraft);
    setBlockDraft(makeBlankBookingBlock(blockDraft.adviserId || defaultAdviserId));
  }

  async function submitBlockRange(event) {
    event.preventDefault();
    await saveBookingBlockBulk?.(blockRangeDraft);
    setBlockRangeDraft(makeBlankBookingBlockRange(blockRangeDraft.adviserId || defaultAdviserId));
  }

  async function submitLink(event) {
    event.preventDefault();
    await saveBookingLink(linkDraft);
    setLinkDraft(makeBlankBookingLink(linkDraft.adviserId || defaultAdviserId));
  }

  function setBookingDraft(id, patch) {
    setBookingDrafts((current) => ({ ...current, [id]: { ...(current[id] || consultationBookings.find((booking) => booking.id === id) || {}), ...patch } }));
  }

  async function saveBookingPatch(booking) {
    const draft = bookingDrafts[booking.id] || booking;
    await saveConsultationBooking({ ...booking, ...draft });
    setBookingDrafts((current) => {
      const next = { ...current };
      delete next[booking.id];
      return next;
    });
  }

  return (
    <section className="consultation-booking-workspace">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">Separate module</span>
          <h1>Consultation Booking</h1>
          <p className="muted">Create controlled booking links, set adviser availability, block unavailable times, and review self-booked consultations. No Outlook or payment integration yet; keep those goblins outside the room for now.</p>
        </div>
        <label className="field compact-field adviser-scope-field"><span>Viewing</span><select value={moduleAdviserId} onChange={(event) => setModuleAdviserId(event.target.value)}>{adviserOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>

      <div className="enquiries-tab-row booking-tab-row" role="tablist" aria-label="Consultation booking sections">
        <button type="button" className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><LayoutDashboard size={16} />Overview</button>
        <button type="button" className={activeTab === 'links' ? 'active' : ''} onClick={() => setActiveTab('links')}><Link2 size={16} />Booking links <span>{scopedLinks.length}</span></button>
        <button type="button" className={activeTab === 'availability' ? 'active' : ''} onClick={() => setActiveTab('availability')}><Clock size={16} />Availability</button>
        <button type="button" className={activeTab === 'blocks' ? 'active' : ''} onClick={() => setActiveTab('blocks')}><LockKeyhole size={16} />Blocked times</button>
        <button type="button" className={activeTab === 'types' ? 'active' : ''} onClick={() => setActiveTab('types')}><SlidersHorizontal size={16} />Types</button>
        <button type="button" className={activeTab === 'bookings' ? 'active' : ''} onClick={() => setActiveTab('bookings')}><CalendarDays size={16} />Bookings <span>{scopedBookings.length}</span></button>
      </div>

      {activeTab === 'overview' && (
        <div className="booking-overview-grid">
          <div className="metric-card"><span>Upcoming reserved</span><strong>{upcomingBookings.length}</strong><small>Consultations that still need to happen.</small></div>
          <div className="metric-card"><span>Active links</span><strong>{scopedLinks.filter((link) => link.status === 'Active').length}</strong><small>Applicants can still use these links.</small></div>
          <div className="metric-card"><span>Availability rows</span><strong>{scopedAvailability.length}</strong><small>Weekly adviser booking windows.</small></div>
          <div className="metric-card"><span>Blocks</span><strong>{scopedBlocks.length}</strong><small>Manual unavailable dates or times.</small></div>
          <section className="sub-panel booking-wide-panel"><h2>Next bookings</h2>{upcomingBookings.slice(0, 6).map((booking) => <div key={booking.id} className="booking-list-row"><div><strong>{booking.applicantName}</strong><span>{typeName(booking.consultationTypeId)} with {adviserName(booking.adviserId)}</span></div><b>{formatBookingDateTime(booking.bookingDate, booking.startTime)}</b></div>)}{!upcomingBookings.length && <p className="muted">No reserved bookings for this view yet.</p>}</section>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="booking-two-column">
          <form className="sub-panel booking-form-panel" onSubmit={submitLink}>
            <h2>Create booking link</h2>
            <p className="muted">Generate a secure link to paste into an approval or next-steps email. The applicant can book once, then the link is marked used.</p>
            <SelectField label="Adviser" value={linkDraft.adviserId} onChange={(value) => setLinkDraft((current) => ({ ...current, adviserId: value }))} options={activeAdvisers.map((adviser) => ({ value: adviser.id, label: adviser.name || adviser.email }))} />
            <SelectField label="Link to intake record" value={linkDraft.intakeId} onChange={applyIntakeToLink} options={[{ value: '', label: 'No intake link' }, ...intakeEnquiries.map((item) => ({ value: item.id, label: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || item.id }))]} placeholder="Optional" />
            <div className="form-grid two"><Field label="Applicant name" value={linkDraft.applicantName} onChange={(value) => setLinkDraft((current) => ({ ...current, applicantName: value }))} /><Field label="Applicant email" value={linkDraft.applicantEmail} onChange={(value) => setLinkDraft((current) => ({ ...current, applicantEmail: value }))} /><Field label="Phone" value={linkDraft.applicantPhone} onChange={(value) => setLinkDraft((current) => ({ ...current, applicantPhone: value }))} /><DateField label="Expiry date" value={linkDraft.expiresAt?.slice(0, 10) || ''} onChange={(value) => setLinkDraft((current) => ({ ...current, expiresAt: value }))} /></div>
            <div className="booking-checkbox-group"><span>Allowed consultation types</span><small>Leave all unticked to allow all active types.</small>{typeOptions.map((type) => <label key={type.id}><input type="checkbox" checked={(linkDraft.allowedTypeIds || []).includes(type.id)} onChange={() => toggleAllowedType(type.id)} /> {type.name}</label>)}</div>
            <TextArea label="Internal note" value={linkDraft.notes} onChange={(value) => setLinkDraft((current) => ({ ...current, notes: value }))} rows={3} />
            <button className="btn dark" type="submit" disabled={saving}><Link2 size={16} />Create booking link</button>
          </form>
          <section className="sub-panel booking-list-panel"><h2>Booking links</h2>{copyMessage && <p className="success-text">{copyMessage}</p>}{scopedLinks.map((link) => <div key={link.id} className="booking-card"><div><strong>{link.applicantName || link.applicantEmail || 'Unnamed applicant'}</strong><span>{adviserName(link.adviserId)} · {link.status}</span><small>{bookingUrl(link)}</small></div><div className="booking-card-actions"><button className="btn ghost" type="button" onClick={() => copyLink(link)}><Copy size={15} />Copy</button><button className="btn danger mini" type="button" onClick={() => deleteBookingLink(link.id)}><Trash2 size={15} />Cancel</button></div></div>)}{!scopedLinks.length && <p className="muted">No booking links yet.</p>}</section>
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="booking-two-column booking-setup-grid">
          <form className="sub-panel booking-form-panel booking-standard-panel" onSubmit={submitStandardAvailability}>
            <span className="eyebrow">Fast setup</span>
            <h2>Set standard booking hours</h2>
            <p className="muted">Use this for the normal working week, for example 8:00am to 5:00pm Monday to Friday. Existing availability for the selected adviser/days is replaced so the week stays tidy.</p>
            <SelectField label="Adviser" value={standardAvailabilityDraft.adviserId} onChange={(value) => setStandardAvailabilityDraft((current) => ({ ...current, adviserId: value }))} options={activeAdvisers.map((adviser) => ({ value: adviser.id, label: adviser.name || adviser.email }))} />
            <div className="form-grid two"><TimeField label="Start time" value={standardAvailabilityDraft.startTime} onChange={(value) => setStandardAvailabilityDraft((current) => ({ ...current, startTime: value }))} /><TimeField label="End time" value={standardAvailabilityDraft.endTime} onChange={(value) => setStandardAvailabilityDraft((current) => ({ ...current, endTime: value }))} /></div>
            <div className="booking-day-picker"><span>Available days</span><div>{BOOKING_DAY_OPTIONS.filter((day) => day.value >= 1 && day.value <= 5).map((day) => <button key={day.value} type="button" className={(standardAvailabilityDraft.days || []).includes(day.value) ? 'active' : ''} onClick={() => toggleStandardDay(day.value)}>{day.short || day.label.slice(0, 3)}</button>)}</div></div>
            <div className="booking-checkbox-group"><span>Consultation types</span><small>Leave all unticked to allow all active types.</small>{typeOptions.map((type) => <label key={type.id}><input type="checkbox" checked={(standardAvailabilityDraft.consultationTypeIds || []).includes(type.id)} onChange={() => toggleStandardAvailabilityType(type.id)} /> {type.name}</label>)}</div>
            <button className="btn dark" type="submit" disabled={saving || !(standardAvailabilityDraft.days || []).length}><Clock size={16} />Set standard week</button>
          </form>
          <form className="sub-panel booking-form-panel" onSubmit={submitAvailability}>
            <span className="eyebrow">One-off weekly window</span>
            <h2>Add custom availability</h2>
            <p className="muted">Use this only for exceptions to the normal week, such as late-night or Saturday booking windows.</p>
            <div className="form-grid two"><SelectField label="Adviser" value={availabilityDraft.adviserId} onChange={(value) => setAvailabilityDraft((current) => ({ ...current, adviserId: value }))} options={activeAdvisers.map((adviser) => ({ value: adviser.id, label: adviser.name || adviser.email }))} /><SelectField label="Day" value={String(availabilityDraft.dayOfWeek)} onChange={(value) => setAvailabilityDraft((current) => ({ ...current, dayOfWeek: Number(value) }))} options={BOOKING_DAY_OPTIONS.map((day) => ({ value: String(day.value), label: day.label }))} /><TimeField label="Start time" value={availabilityDraft.startTime} onChange={(value) => setAvailabilityDraft((current) => ({ ...current, startTime: value }))} /><TimeField label="End time" value={availabilityDraft.endTime} onChange={(value) => setAvailabilityDraft((current) => ({ ...current, endTime: value }))} /></div>
            <div className="booking-checkbox-group"><span>Consultation types</span><small>Leave all unticked to allow all types.</small>{typeOptions.map((type) => <label key={type.id}><input type="checkbox" checked={(availabilityDraft.consultationTypeIds || []).includes(type.id)} onChange={() => toggleAvailabilityType(type.id)} /> {type.name}</label>)}</div>
            <button className="btn ghost" type="submit" disabled={saving}><Save size={16} />Add custom window</button>
          </form>
          <section className="sub-panel booking-list-panel full-width"><h2>Current availability</h2>{scopedAvailability.map((row) => <div key={row.id} className="booking-card"><div><strong>{adviserName(row.adviserId)}</strong><span>{dayLabel(row.dayOfWeek)} · {formatBookingTime(row.startTime)}-{formatBookingTime(row.endTime)}</span><small>{(row.consultationTypeIds || []).length ? row.consultationTypeIds.map(typeName).join(', ') : 'All consultation types'}</small></div><button className="icon-btn" type="button" onClick={() => deleteBookingAvailability(row.id)}><Trash2 size={16} /></button></div>)}{!scopedAvailability.length && <p className="muted">No availability rows yet. Set a standard week to make public slots appear.</p>}</section>
        </div>
      )}

      {activeTab === 'blocks' && (
        <div className="booking-two-column booking-setup-grid">
          <form className="sub-panel booking-form-panel booking-standard-panel" onSubmit={submitBlockRange}>
            <span className="eyebrow">Fast block-out</span>
            <h2>Block out a day or date range</h2>
            <p className="muted">Use this for leave, meetings, public holidays, or a run of unavailable days. These times disappear from the public booking page.</p>
            <SelectField label="Adviser" value={blockRangeDraft.adviserId} onChange={(value) => setBlockRangeDraft((current) => ({ ...current, adviserId: value }))} options={activeAdvisers.map((adviser) => ({ value: adviser.id, label: adviser.name || adviser.email }))} />
            <div className="form-grid two"><DateField label="From date" value={blockRangeDraft.startDate} onChange={(value) => setBlockRangeDraft((current) => ({ ...current, startDate: value, endDate: current.endDate || value }))} /><DateField label="To date" value={blockRangeDraft.endDate} onChange={(value) => setBlockRangeDraft((current) => ({ ...current, endDate: value }))} /><TimeField label="Start time" value={blockRangeDraft.startTime} onChange={(value) => setBlockRangeDraft((current) => ({ ...current, startTime: value }))} /><TimeField label="End time" value={blockRangeDraft.endTime} onChange={(value) => setBlockRangeDraft((current) => ({ ...current, endTime: value }))} /></div>
            <label className="check-row"><input type="checkbox" checked={blockRangeDraft.allDay} onChange={(event) => setBlockRangeDraft((current) => ({ ...current, allDay: event.target.checked }))} /> Block whole day(s)</label>
            <Field label="Reason" value={blockRangeDraft.reason} onChange={(value) => setBlockRangeDraft((current) => ({ ...current, reason: value }))} />
            <button className="btn dark" type="submit" disabled={saving}><LockKeyhole size={16} />Add blocked time</button>
          </form>
          <form className="sub-panel booking-form-panel" onSubmit={submitBlock}>
            <span className="eyebrow">Single block</span>
            <h2>Block one date/time</h2>
            <p className="muted">Use this for a quick one-off appointment or internal meeting.</p>
            <div className="form-grid two"><SelectField label="Adviser" value={blockDraft.adviserId} onChange={(value) => setBlockDraft((current) => ({ ...current, adviserId: value }))} options={activeAdvisers.map((adviser) => ({ value: adviser.id, label: adviser.name || adviser.email }))} /><DateField label="Date" value={blockDraft.blockDate} onChange={(value) => setBlockDraft((current) => ({ ...current, blockDate: value }))} /><TimeField label="Start time" value={blockDraft.startTime} onChange={(value) => setBlockDraft((current) => ({ ...current, startTime: value }))} /><TimeField label="End time" value={blockDraft.endTime} onChange={(value) => setBlockDraft((current) => ({ ...current, endTime: value }))} /></div>
            <label className="check-row"><input type="checkbox" checked={blockDraft.allDay} onChange={(event) => setBlockDraft((current) => ({ ...current, allDay: event.target.checked }))} /> Block the whole day</label>
            <Field label="Reason" value={blockDraft.reason} onChange={(value) => setBlockDraft((current) => ({ ...current, reason: value }))} />
            <button className="btn ghost" type="submit" disabled={saving}><LockKeyhole size={16} />Add single block</button>
          </form>
          <section className="sub-panel booking-list-panel full-width"><h2>Blocked times</h2>{scopedBlocks.map((block) => <div key={block.id} className="booking-card"><div><strong>{adviserName(block.adviserId)}</strong><span>{formatBookingDate(block.blockDate)} · {block.allDay ? 'All day' : `${formatBookingTime(block.startTime)}-${formatBookingTime(block.endTime)}`}</span><small>{block.reason || 'No reason recorded'}</small></div><button className="icon-btn" type="button" onClick={() => deleteBookingBlock(block.id)}><Trash2 size={16} /></button></div>)}{!scopedBlocks.length && <p className="muted">No blocked times yet.</p>}</section>
        </div>
      )}

      {activeTab === 'types' && (
        <div className="booking-two-column">
          <form className="sub-panel booking-form-panel" onSubmit={submitType}>
            <h2>Consultation type</h2>
            <Field label="Name" value={typeDraft.name} onChange={(value) => setTypeDraft((current) => ({ ...current, name: value }))} />
            <div className="form-grid two"><label className="field"><span>Duration minutes</span><input type="number" min="5" value={typeDraft.durationMinutes} onChange={(event) => setTypeDraft((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} /></label><label className="field"><span>Buffer minutes</span><input type="number" min="0" value={typeDraft.bufferMinutes} onChange={(event) => setTypeDraft((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))} /></label><label className="field"><span>Price NZD</span><input type="number" min="0" value={typeDraft.priceNzd} onChange={(event) => setTypeDraft((current) => ({ ...current, priceNzd: Number(event.target.value) }))} /></label><label className="field"><span>Sort order</span><input type="number" min="1" value={typeDraft.sortOrder} onChange={(event) => setTypeDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))} /></label></div>
            <label className="check-row"><input type="checkbox" checked={typeDraft.paid} onChange={(event) => setTypeDraft((current) => ({ ...current, paid: event.target.checked }))} /> Paid consultation</label>
            <label className="check-row"><input type="checkbox" checked={typeDraft.active !== false} onChange={(event) => setTypeDraft((current) => ({ ...current, active: event.target.checked }))} /> Active</label>
            <TextArea label="Description" value={typeDraft.description} onChange={(value) => setTypeDraft((current) => ({ ...current, description: value }))} rows={3} />
            <button className="btn dark" type="submit" disabled={saving}><Save size={16} />Save type</button>
          </form>
          <section className="sub-panel booking-list-panel"><h2>Consultation types</h2>{consultationTypes.map((type) => <div key={type.id} className="booking-card"><div><strong>{type.name}</strong><span>{type.durationMinutes} min · {type.paid ? formatCurrency(type.priceNzd) : 'Free'} · {type.active ? 'Active' : 'Inactive'}</span><small>{type.description}</small></div><div className="booking-card-actions"><button className="btn ghost mini" type="button" onClick={() => setTypeDraft(type)}>Edit</button><button className="icon-btn" type="button" onClick={() => deleteConsultationType(type.id)}><Trash2 size={16} /></button></div></div>)}{!consultationTypes.length && <p className="muted">No consultation types yet.</p>}</section>
        </div>
      )}

      {activeTab === 'bookings' && (
        <section className="sub-panel booking-list-panel full-width"><h2>Consultation bookings</h2>{scopedBookings.map((booking) => { const draft = bookingDrafts[booking.id] || booking; const activeBooking = !['Cancelled', 'Completed', 'No-show'].includes(booking.status); return <div key={booking.id} className={`booking-record-card ${booking.status === 'Cancelled' ? 'cancelled' : ''}`}><div className="booking-record-main"><strong>{booking.applicantName || booking.applicantEmail}</strong><span>{typeName(booking.consultationTypeId)} with {adviserName(booking.adviserId)}</span><small>{formatBookingDateTime(booking.bookingDate, booking.startTime)} · {booking.status || 'Reserved'} · {booking.paymentStatus}</small></div><div className="booking-record-controls"><select value={draft.status || booking.status} onChange={(event) => setBookingDraft(booking.id, { status: event.target.value })}>{BOOKING_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select><input value={draft.paymentStatus || ''} onChange={(event) => setBookingDraft(booking.id, { paymentStatus: event.target.value })} placeholder="Payment status" /><button className="btn dark mini" type="button" onClick={() => saveBookingPatch(booking)} disabled={saving}><Save size={14} />Save</button>{activeBooking && <button className="btn danger mini" type="button" onClick={() => cancelConsultationBooking?.(booking)} disabled={saving}><X size={14} />Cancel & notify</button>}</div><TextArea label="Notes" value={draft.notes || ''} onChange={(value) => setBookingDraft(booking.id, { notes: value })} rows={2} /></div>; })}{!scopedBookings.length && <p className="muted">No bookings yet. Once an applicant self-books, the booking will appear here.</p>}</section>
      )}
    </section>
  );
}

function makeBlankConsultationType() {
  return { id: '', name: '', durationMinutes: 15, priceNzd: 0, paid: false, description: '', active: true, sortOrder: 100, bufferMinutes: 15 };
}
function makeBlankBookingAvailability(adviserId = '') {
  return { id: '', adviserId, dayOfWeek: 1, startTime: '09:00', endTime: '17:00', consultationTypeIds: [], active: true };
}
function makeBlankStandardBookingAvailability(adviserId = '') {
  return { adviserId, days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '17:00', consultationTypeIds: [], replaceExisting: true };
}
function makeBlankBookingBlock(adviserId = '') {
  return { id: '', adviserId, blockDate: todayIso(), startTime: '09:00', endTime: '10:00', allDay: false, reason: '' };
}
function makeBlankBookingBlockRange(adviserId = '') {
  const today = todayIso();
  return { adviserId, startDate: today, endDate: today, startTime: '09:00', endTime: '17:00', allDay: true, reason: '' };
}
function makeBlankBookingLink(adviserId = '') {
  return { id: '', intakeId: '', adviserId, applicantName: '', applicantEmail: '', applicantPhone: '', allowedTypeIds: [], expiresAt: '', status: 'Active', notes: '' };
}
function dayLabel(value) {
  return BOOKING_DAY_OPTIONS.find((day) => Number(day.value) === Number(value))?.label || 'Day';
}
function formatBookingTime(value = '') {
  const time = normaliseTimeValue(value);
  if (!time) return value || '';
  const [hourText, minute] = time.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute}${suffix}`;
}
function formatBookingDate(value = '') {
  const date = parseLocalDate(value);
  if (!date) return value || '';
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function formatBookingDateShort(value = '') {
  const date = parseLocalDate(value);
  if (!date) return value || '';
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' }).format(date);
}
function formatBookingDateTime(date, time) {
  return `${formatBookingDate(date)} at ${formatBookingTime(time)}`;
}

function intakeRecommendedAction(record = {}, type = 'intake') {
  if (record.convertedClientId || record.status === 'Converted') return 'Open converted client';
  if (record.status === 'Spam / Duplicate') return 'Leave closed unless restored';
  if (type === 'contact') {
    if (record.status === 'New' || !record.status) return record.email ? 'Send assessment form' : 'Call or review contact details';
    return 'Confirm follow-up completed';
  }
  if (record.status === 'New' || !record.status) return 'Review assessment';
  if (record.status === 'Contacted') return 'Convert or close';
  return 'Review record';
}

function compactEnquiryText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normaliseEnquiryEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normaliseEnquiryPhone(value = '') {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits || digits.length < 7) return '';
  return digits.replace(/^00/, '').replace(/^64/, '0');
}

function splitEnquiryName(fullName = '') {
  const parts = compactEnquiryText(fullName).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
    fullName: parts.join(' '),
  };
}

function enquiryNameParts(record = {}) {
  const direct = [record.firstName, record.lastName].filter(Boolean).join(' ').trim();
  return splitEnquiryName(direct || record.fullName || record.name || '');
}

function namesAreExact(a = {}, b = {}) {
  const an = enquiryNameParts(a);
  const bn = enquiryNameParts(b);
  return Boolean(an.firstName && an.lastName && an.firstName === bn.firstName && an.lastName === bn.lastName);
}

function namesAreLikely(a = {}, b = {}) {
  const an = enquiryNameParts(a);
  const bn = enquiryNameParts(b);
  if (!an.lastName || !bn.lastName || an.lastName !== bn.lastName) return false;
  if (an.firstName && bn.firstName && an.firstName[0] === bn.firstName[0]) return true;
  return Boolean(an.fullName && bn.fullName && (an.fullName.includes(bn.fullName) || bn.fullName.includes(an.fullName)));
}

function daysBetweenEnquiryDates(a, b) {
  const da = Date.parse(a || '') || 0;
  const db = Date.parse(b || '') || 0;
  if (!da || !db) return null;
  return Math.round(Math.abs(da - db) / (24 * 60 * 60 * 1000));
}

function makeEnquiryMatchRecord(type, item = {}) {
  const payload = type === 'seminar' ? {} : intakeAnswerPayload(item);
  const fullName = type === 'seminar'
    ? item.fullName || ''
    : [item.firstName || payload.firstName, item.lastName || payload.lastName].filter(Boolean).join(' ');
  const nameParts = splitEnquiryName(fullName);
  return {
    key: `${type}:${item.id || item.email || item.createdAt || fullName}`,
    id: item.id || '',
    type,
    typeLabel: type === 'contact' ? 'Contact form' : type === 'seminar' ? 'Seminar registration' : 'Intake form',
    status: item.status || 'New',
    firstName: type === 'seminar' ? nameParts.firstName : item.firstName || payload.firstName || nameParts.firstName,
    lastName: type === 'seminar' ? nameParts.lastName : item.lastName || payload.lastName || nameParts.lastName,
    fullName: fullName || [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email || 'Unnamed record',
    email: item.email || payload.email || '',
    emailKey: normaliseEnquiryEmail(item.email || payload.email || ''),
    phone: type === 'seminar' ? '' : item.phone || payload.phone || '',
    phoneKey: type === 'seminar' ? '' : normaliseEnquiryPhone(item.phone || payload.phone || ''),
    citizenship: type === 'seminar' ? item.citizenshipCountry || '' : item.citizenship || payload.citizenship || '',
    location: type === 'seminar' ? item.residenceCountry || '' : item.currentLocation || payload.currentLocation || payload.contactLocation || '',
    goal: type === 'seminar' ? item.currentOccupation || item.highestQualification || '' : item.targetPathway || payload.targetPathway || payload.contactSituation || payload.helpNeeded || '',
    createdAt: item.createdAt || item.created_at || '',
  };
}

function compareEnquiryMatchRecords(target, candidate) {
  if (!target || !candidate || target.key === candidate.key) return null;
  const reasons = [];
  let score = 0;

  const sameEmail = target.emailKey && candidate.emailKey && target.emailKey === candidate.emailKey;
  const samePhone = target.phoneKey && candidate.phoneKey && target.phoneKey === candidate.phoneKey;
  const exactName = namesAreExact(target, candidate);
  const likelyName = !exactName && namesAreLikely(target, candidate);
  const sameCitizenship = compactEnquiryText(target.citizenship) && compactEnquiryText(target.citizenship) === compactEnquiryText(candidate.citizenship);
  const sameLocation = compactEnquiryText(target.location) && compactEnquiryText(target.location) === compactEnquiryText(candidate.location);
  const daysApart = daysBetweenEnquiryDates(target.createdAt, candidate.createdAt);
  const recent = daysApart === null || daysApart <= 120;

  if (sameEmail) { score += 100; reasons.push('same email'); }
  if (samePhone) { score += 85; reasons.push('same mobile'); }
  if (exactName) { score += 45; reasons.push('same name'); }
  else if (likelyName) { score += 28; reasons.push('similar name'); }
  if ((exactName || likelyName) && sameCitizenship) { score += 16; reasons.push('same citizenship'); }
  if ((exactName || likelyName) && sameLocation) { score += 10; reasons.push('same location'); }
  if (daysApart !== null && daysApart <= 14) { score += 8; reasons.push('recent submission'); }

  if (!sameEmail && !samePhone && !recent) return null;
  if (candidate.status === 'Spam / Duplicate' && !sameEmail && !samePhone) return null;

  let strength = '';
  if (sameEmail || samePhone || score >= 90) strength = 'strong';
  else if (score >= 58) strength = 'likely';
  else if (score >= 44 && recent) strength = 'possible';
  if (!strength) return null;

  return {
    ...candidate,
    strength,
    score,
    reasons: reasons.slice(0, 4),
    daysApart,
  };
}

function buildRelatedEnquiryMatches(target, candidates = []) {
  return candidates
    .map((candidate) => compareEnquiryMatchRecords(target, candidate))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || (a.daysApart ?? 9999) - (b.daysApart ?? 9999))
    .slice(0, 4);
}

function relatedMatchLabel(match = {}) {
  if (match.strength === 'strong') return 'Strong match';
  if (match.strength === 'likely') return 'Likely related';
  return 'Possible match';
}

function RelatedEnquirySummary({ matches = [] }) {
  if (!matches.length) return null;
  const best = matches[0];
  return (
    <div className="related-enquiry-chip-row" aria-label="Related enquiry matches">
      <span className={`related-enquiry-chip ${best.strength}`}>{relatedMatchLabel(best)}: {best.typeLabel}</span>
      {matches.length > 1 && <span className="related-enquiry-count">+{matches.length - 1} more</span>}
    </div>
  );
}

function RelatedEnquiryPanel({ matches = [] }) {
  if (!matches.length) return null;
  return (
    <section className="related-enquiry-panel">
      <div>
        <span className="eyebrow">Related enquiries</span>
        <h3>Possible same person</h3>
        <p className="muted">The CRM has found similar recent records before screening. This is a prompt to check context, not an automatic merge.</p>
      </div>
      <div className="related-enquiry-list">
        {matches.map((match) => (
          <div key={match.key} className={`related-enquiry-row ${match.strength}`}>
            <div>
              <strong>{match.typeLabel}</strong>
              <span>{relatedMatchLabel(match)} · {match.reasons.join(', ') || 'similar details'}</span>
            </div>
            <div>
              <strong>{match.fullName || 'Unnamed'}</strong>
              <span>{match.email || 'No email'}{match.phone ? ` · ${match.phone}` : ''}</span>
            </div>
            <div>
              <strong>{match.status || 'New'}</strong>
              <span>{match.createdAt ? formatPortalDateTime(match.createdAt) : 'No date'}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


function IntakeWorkspace({ enquiries, advisers, dashboardAdviserFilter = 'all', statuses, seminars = [], seminarRegistrations = [], feedbackSubmissions = [], saveIntakeEnquiry, deleteIntakeEnquiry, convertIntakeToClient, sendIntakeOutcomeEmail, sendContactIntakeInviteEmail, downloadIntakeUpload, saveSeminar, deleteSeminar, saveSeminarRegistration, sendSeminarRegistrationEmail, saveFeedbackSubmission, deleteFeedbackSubmission, saving, openClientRecord, confirmAction }) {
  const askConfirm = confirmAction || (async ({ message }) => window.confirm(message || 'Continue?'));
  const simplifiedStatuses = (statuses || INTAKE_STATUSES).filter((status) => INTAKE_STATUSES.includes(status));
  const [workspaceTab, setWorkspaceTab] = useState('contact');
  const [statusFilter, setStatusFilter] = useState('New');
  const [contactStatusFilter, setContactStatusFilter] = useState('New');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('New');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [contactInviteSendingId, setContactInviteSendingId] = useState('');
  const [contactInviteNotice, setContactInviteNotice] = useState('');
  const flagOptions = [
    { value: 'urgent', label: 'Urgent timing' },
    { value: 'visaExpirySoon', label: 'Visa expiry' },
    { value: 'health', label: 'Health review' },
    { value: 'character', label: 'Character review' },
    { value: 'employment', label: 'Employment details' },
    { value: 'partnership', label: 'Partner/family' },
    { value: 'family', label: 'Children/family' },
    { value: 'investor', label: 'Investor interest' },
    { value: 'funds', label: 'Funds/investment' },
  ];

  const normalisedEnquiries = enquiries
    .map((item) => normaliseIntakeEnquiry(item))
    .sort((a, b) => intakeSortTime(b) - intakeSortTime(a));

  const activeAdvisers = advisers.filter((adviser) => adviser.active !== false);
  const contactStatusOptions = [
    { value: 'New', label: 'New' },
    { value: 'Contacted', label: 'Dealt with' },
    { value: 'Spam / Duplicate', label: 'Spam / Duplicate' },
    { value: 'All', label: 'All' },
  ];
  const contactStatusLabel = (status) => contactStatusOptions.find((option) => option.value === status)?.label || status || 'New';
  const feedbackStatusOptions = [
    { value: 'New', label: 'New' },
    { value: 'Reviewed', label: 'Reviewed' },
    { value: 'Follow up', label: 'Follow up' },
    { value: 'Closed', label: 'Closed' },
    { value: 'All', label: 'All' },
  ];
  const feedbackStatusLabel = (status) => feedbackStatusOptions.find((option) => option.value === status)?.label || status || 'New';
  const selectedScopeAdviser = dashboardAdviserFilter === 'all' ? null : advisers.find((adviser) => adviser.id === dashboardAdviserFilter);
  const contactEnquiries = normalisedEnquiries
    .filter((item) => isContactIntake(item))
    .filter((item) => matchesIntakeAdviserScope(item, dashboardAdviserFilter));
  const intakeEnquiries = normalisedEnquiries
    .filter((item) => !isContactIntake(item))
    .filter((item) => matchesIntakeAdviserScope(item, dashboardAdviserFilter));
  const normalisedFeedbackSubmissions = (feedbackSubmissions || [])
    .map(normaliseFeedbackSubmission)
    .sort((a, b) => intakeSortTime(b) - intakeSortTime(a));
  const normalisedSeminarRegistrations = (seminarRegistrations || [])
    .map(normaliseSeminarRegistration);

  const relatedEnquirySources = useMemo(() => {
    const contacts = contactEnquiries.map((item) => makeEnquiryMatchRecord('contact', item));
    const intakes = intakeEnquiries.map((item) => makeEnquiryMatchRecord('intake', item));
    const seminarItems = normalisedSeminarRegistrations.map((item) => makeEnquiryMatchRecord('seminar', item));
    return [...contacts, ...intakes, ...seminarItems];
  }, [contactEnquiries, intakeEnquiries, normalisedSeminarRegistrations]);

  function relatedMatchesFor(type, item) {
    return buildRelatedEnquiryMatches(makeEnquiryMatchRecord(type, item), relatedEnquirySources);
  }

  const contactFiltered = contactEnquiries.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesStatus = contactStatusFilter === 'All' || item.status === contactStatusFilter;
    if (!matchesStatus) return false;
    if (!q) return true;
    const payload = intakeAnswerPayload(item);
    return [item.firstName, item.lastName, item.email, item.phone, item.targetPathway, item.currentLocation, payload.contactSituation, payload.contactLocation, payload.bestTimeToCall, payload.helpNeeded]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const intakeFiltered = intakeEnquiries.filter((item) => {
    const q = query.trim().toLowerCase();
    const searchText = [
      item.firstName,
      item.lastName,
      item.email,
      item.phone,
      item.targetPathway,
      item.currentVisaType,
      item.currentLocation,
      item.citizenship,
      item.urgency,
      item.recommendedPathway,
      item.rawPayload?.helpNeeded,
    ].join(' ').toLowerCase();
    const matchesQuery = !q || searchText.includes(q);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const feedbackFiltered = normalisedFeedbackSubmissions.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesStatus = feedbackStatusFilter === 'All' || item.status === feedbackStatusFilter;
    if (!matchesStatus) return false;
    if (!q) return true;
    return [item.firstName, item.lastName, item.email, item.phone, item.adviserName, item.applicationType, item.serviceStrengths, item.improvementSuggestions, item.permissionToUseFeedback]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const contactCount = contactEnquiries.length;
  const newContactCount = contactEnquiries.filter((item) => item.status === 'New').length;
  const dealtContactCount = contactEnquiries.filter((item) => item.status === 'Contacted').length;
  const spamContactCount = contactEnquiries.filter((item) => item.status === 'Spam / Duplicate').length;
  const newIntakeCount = intakeEnquiries.filter((item) => item.status === 'New').length;
  const contactedCount = intakeEnquiries.filter((item) => item.status === 'Contacted').length;
  const convertedCount = intakeEnquiries.filter((item) => item.status === 'Converted' || item.convertedClientId).length;
  const spamCount = intakeEnquiries.filter((item) => item.status === 'Spam / Duplicate').length;
  const activeSeminar = (seminars || []).find((item) => item.status === 'Active') || (seminars || [])[0] || null;
  const newSeminarRegistrationCount = (seminarRegistrations || []).filter((item) => item.status === 'New').length;
  const newFeedbackCount = normalisedFeedbackSubmissions.filter((item) => item.status === 'New').length;
  const flaggedCount = intakeEnquiries.filter((item) => hasAnyIntakeFlag(item.flags)).length;
  const expandedItem = expandedId ? intakeEnquiries.find((item) => item.id === expandedId) : null;
  const draftDirty = Boolean(draft && expandedItem && JSON.stringify(intakeCompareSnapshot(draft)) !== JSON.stringify(intakeCompareSnapshot(expandedItem)));

  useEffect(() => {
    if (!expandedId) {
      setDraft(null);
      return;
    }
    const next = intakeEnquiries.find((item) => item.id === expandedId);
    if (!next) {
      setExpandedId('');
      setDraft(null);
      return;
    }
    setDraft((current) => current?.id === next.id ? current : normaliseIntakeEnquiry(next));
  }, [enquiries, expandedId]);

  function intakeSortTime(item = {}) {
    return Date.parse(item.createdAt || item.updatedAt || '') || 0;
  }

  function hasAnyIntakeFlag(flags = {}) {
    return flagOptions.some((option) => Boolean(flags?.[option.value]));
  }

  function setDraftField(name, value) {
    setDraft((current) => ({ ...(current || {}), [name]: value }));
  }

  function setDraftPayloadField(name, value) {
    setDraft((current) => {
      const payload = { ...((current || {}).rawPayload || {}), [name]: value };
      if (name === 'dateOfBirth') payload.dateOfBirthAge = calculateAge(value);
      const next = { ...(current || {}), rawPayload: payload };
      const topLevelKeys = ['firstName', 'lastName', 'email', 'phone', 'citizenship', 'dateOfBirth', 'currentLocation', 'currentVisaType', 'currentVisaExpiry', 'targetPathway', 'urgency'];
      if (topLevelKeys.includes(name)) next[name] = value;
      return next;
    });
  }

  function openIntakeEditor(item) {
    setExpandedId(item.id);
    setDraft(normaliseIntakeEnquiry(item));
  }

  function requestCloseIntakeEditor(options = {}) {
    if (!options.force && draftDirty && !window.confirm('Close the intake editor and discard unsaved changes?')) return;
    setExpandedId('');
    setDraft(null);
  }

  function clearSearch() {
    setQuery('');
    setStatusFilter('New');
    setContactStatusFilter('New');
    setFeedbackStatusFilter('New');
  }

  async function saveDraft(options = {}) {
    if (!draft) return;
    await saveIntakeEnquiry(draft);
    if (options.close) requestCloseIntakeEditor({ force: true });
  }

  async function deleteDraft() {
    if (!draft?.id) return;
    await deleteIntakeEnquiry(draft.id);
    setExpandedId('');
    setDraft(null);
  }

  function assignedAdviserFor(item) {
    return advisers.find((adviser) => String(adviser.id || '') === String(item.assignedAdviserId || '')) || null;
  }

  async function assignIntakeAdviser(item, adviserId) {
    if (!item?.id) return;
    await saveIntakeEnquiry({ ...item, assignedAdviserId: adviserId });
  }

  async function sendIntakeInviteForContact(item) {
    if (!item?.id || contactInviteSendingId) return;
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'this contact';
    const adviser = assignedAdviserFor(item);
    const ccText = adviser?.email ? `\n\nThe email will be copied to ${adviser.name || 'the assigned adviser'} (${adviser.email}).` : '\n\nNo assigned adviser email is recorded, so no adviser copy will be sent.';
    const confirmed = await askConfirm({
      title: 'Send assessment form email?',
      message: `Send the full assessment form email to ${name}?`,
      details: [adviser?.email ? `The email will be copied to ${adviser.name || 'the assigned adviser'} (${adviser.email}).` : 'No assigned adviser email is recorded, so no adviser copy will be sent.'],
      confirmLabel: 'Send email',
      tone: 'send',
    });
    if (!confirmed) return;
    setContactInviteNotice('');
    setContactInviteSendingId(item.id);
    try {
      const body = await sendContactIntakeInviteEmail?.(item);
      const log = body?.emailLog;
      if (log?.status === 'Sent') {
        setContactInviteNotice(`Assessment form email sent to ${item.email}. Contact form moved to Dealt with.`);
        await saveIntakeEnquiry({ ...item, status: 'Contacted' });
      } else {
        setContactInviteNotice(`Assessment form email could not be sent: ${log?.failureMessage || 'Microsoft did not accept the send request.'}`);
      }
    } catch (error) {
      setContactInviteNotice(error?.message || 'Assessment form email could not be sent.');
    } finally {
      setContactInviteSendingId('');
    }
  }

  async function deleteContactForm(item) {
    if (!item?.id) return;
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'this contact form';
    const confirmed = await askConfirm({
      title: 'Delete contact form?',
      message: `Delete ${name} from the CRM?`,
      details: ['Use Mark dealt with if the enquiry should be retained. Delete only if the record should be removed from the CRM.'],
      confirmLabel: 'Delete contact',
      tone: 'danger',
    });
    if (!confirmed) return;
    await deleteIntakeEnquiry(item.id);
  }

  async function updateContactStatus(item, status) {
    if (!item?.id || !['New', 'Contacted', 'Spam / Duplicate'].includes(status)) return;
    await saveIntakeEnquiry({ ...item, status });
  }

  async function updateFeedbackStatus(item, status) {
    if (!item?.id || !['New', 'Reviewed', 'Follow up', 'Closed'].includes(status)) return;
    await saveFeedbackSubmission?.({ ...item, status });
  }

  async function deleteFeedback(item) {
    if (!item?.id) return;
    await deleteFeedbackSubmission?.(item.id);
  }

  async function updateIntakeStatus(item, status) {
    if (!item?.id || !INTAKE_STATUSES.includes(status)) return;
    await saveIntakeEnquiry({ ...item, status });
  }

  async function convertIntake(item) {
    if (!item?.id) return;
    await convertIntakeToClient(item.id);
  }

  async function convertDraft() {
    if (!draft?.id) return;
    await convertIntakeToClient(draft.id);
  }

  const intakeTitle = draft ? ([draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Unnamed intake') : 'Intake record';
  const visibleRecords = workspaceTab === 'contact' ? contactFiltered : workspaceTab === 'feedback' ? feedbackFiltered : workspaceTab === 'intake' ? intakeFiltered : (seminarRegistrations || []);

  return (
    <div className="intake-workspace intake-inbox-workspace enquiries-intake-workspace">
      <div className="library-heading intake-heading enquiries-heading enquiries-heading-polished">
        <div className="enquiries-heading-copy">
          <h1>Enquiries & Intake</h1>
          <p className="muted">Review contact forms, assessment questionnaires, client feedback and seminar registrations separately from active client work.</p>
        </div>
      </div>

      <div className="metric-grid four intake-metrics enquiries-metrics">
        <MetricCard label="New contacts" value={newContactCount} note={`${contactCount} retained`} icon={MessageSquare} warning={newContactCount > 0} />
        <MetricCard label="New intake" value={newIntakeCount} note="Awaiting triage" icon={ClipboardList} warning={newIntakeCount > 0} />
        <MetricCard label="Contacted" value={contactedCount} note="Followed up" icon={Phone} />
        <MetricCard label="Converted" value={convertedCount} note="Client records created" icon={UsersRound} />
      </div>

      <section className="intake-inbox-panel enquiries-panel">
        <div className="enquiries-tab-row" role="tablist" aria-label="Enquiries and intake sections">
          <button type="button" className={workspaceTab === 'contact' ? 'active' : ''} onClick={() => setWorkspaceTab('contact')}><MessageSquare size={16} />Contact Forms <span>{newContactCount}</span></button>
          <button type="button" className={workspaceTab === 'feedback' ? 'active' : ''} onClick={() => setWorkspaceTab('feedback')}><MessageSquare size={16} />Feedback <span>{newFeedbackCount}</span></button>
          <button type="button" className={workspaceTab === 'intake' ? 'active' : ''} onClick={() => setWorkspaceTab('intake')}><ClipboardList size={16} />Intake Forms <span>{intakeEnquiries.length}</span></button>
          <button type="button" className={workspaceTab === 'seminars' ? 'active' : ''} onClick={() => setWorkspaceTab('seminars')}><CalendarDays size={16} />Seminar Registrations <span>{newSeminarRegistrationCount}</span></button>
        </div>

        {workspaceTab === 'seminars' ? (
          <SeminarManagementPanel
            seminars={seminars || []}
            registrations={seminarRegistrations || []}
            relatedSources={relatedEnquirySources}
            saveSeminar={saveSeminar}
            deleteSeminar={deleteSeminar}
            saveSeminarRegistration={saveSeminarRegistration}
            sendSeminarRegistrationEmail={sendSeminarRegistrationEmail}
            saving={saving}
          />
        ) : (
          <>
        <div className="intake-inbox-toolbar enquiries-toolbar">
          <label className="intake-search-field">
            <span>Search</span>
            <div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={workspaceTab === 'contact' ? 'Name, email, phone, message...' : workspaceTab === 'feedback' ? 'Name, email, adviser, comments...' : 'Name, email, phone, pathway, visa...'} /></div>
          </label>
          {workspaceTab === 'contact' && (
            <div className="enquiries-status-pills" aria-label="Contact form status filter">
              {contactStatusOptions.map((status) => (
                <button key={status.value} type="button" className={contactStatusFilter === status.value ? 'active' : ''} onClick={() => setContactStatusFilter(status.value)}>
                  {status.label}
                  <span>{status.value === 'All' ? contactEnquiries.length : contactEnquiries.filter((item) => item.status === status.value).length}</span>
                </button>
              ))}
            </div>
          )}
          {workspaceTab === 'feedback' && (
            <div className="enquiries-status-pills" aria-label="Feedback status filter">
              {feedbackStatusOptions.map((status) => (
                <button key={status.value} type="button" className={feedbackStatusFilter === status.value ? 'active' : ''} onClick={() => setFeedbackStatusFilter(status.value)}>
                  {status.label}
                  <span>{status.value === 'All' ? normalisedFeedbackSubmissions.length : normalisedFeedbackSubmissions.filter((item) => item.status === status.value).length}</span>
                </button>
              ))}
            </div>
          )}
          {workspaceTab === 'intake' && (
            <div className="enquiries-status-pills" aria-label="Intake status filter">
              {['New', 'Contacted', 'Converted', 'Spam / Duplicate', 'All'].map((status) => (
                <button key={status} type="button" className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>
                  {status}
                  <span>{status === 'All' ? intakeEnquiries.length : intakeEnquiries.filter((item) => item.status === status).length}</span>
                </button>
              ))}
            </div>
          )}
          <button className="btn" type="button" onClick={clearSearch}>Reset view</button>
        </div>

        {contactInviteNotice && (
          <div className={contactInviteNotice.includes('could not') ? 'error-banner compact' : 'success-banner compact'}>
            {contactInviteNotice}
          </div>
        )}

        <div className="intake-inbox-summary-row enquiries-summary-row">
          <div>
            <span className="eyebrow">{workspaceTab === 'contact' ? 'Short website enquiries' : workspaceTab === 'feedback' ? 'Client feedback submissions' : 'Full assessment questionnaires'}</span>
            <h2>{workspaceTab === 'contact' ? `${contactStatusLabel(contactStatusFilter)} contact forms` : workspaceTab === 'feedback' ? `${feedbackStatusLabel(feedbackStatusFilter)} feedback` : `${statusFilter} intake forms`}</h2>
            <p className="muted">{workspaceTab === 'contact' ? `The New view shows live contact enquiries only. Mark an enquiry as Dealt with once handled; it stays retained under that filter.${selectedScopeAdviser ? ` Showing unassigned records and records assigned to ${selectedScopeAdviser.name}.` : ''}` : workspaceTab === 'feedback' ? 'Client feedback submissions from the website. Mark as reviewed, follow up, or closed once handled.' : `Use the simple statuses to keep the pre-client queue tidy.${selectedScopeAdviser ? ` Showing unassigned records and records assigned to ${selectedScopeAdviser.name}.` : ''}`}</p>
          </div>
          <strong>{visibleRecords.length} shown</strong>
        </div>

        {workspaceTab === 'contact' ? (
          <div className="contact-review-list">
            {contactFiltered.map((item) => {
              const payload = intakeAnswerPayload(item);
              const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unnamed contact';
              const situation = payload.contactSituation || item.targetPathway || 'Not selected';
              const location = payload.contactLocation || item.currentLocation || 'Not recorded';
              const bestTime = payload.bestTimeToCall || 'Not recorded';
              const message = payload.helpNeeded || 'No message recorded.';
              const relatedMatches = relatedMatchesFor('contact', item);
              return (
                <article key={item.id} className="contact-review-card">
                  <div className="contact-review-main">
                    <div className="contact-review-head">
                      <div>
                        <span className="intake-type-badge contact">Contact form</span>
                        <span className={`library-status ${statusClass(item.status)}`}>{contactStatusLabel(item.status)}</span>
                        <span className="recommended-action-chip">Recommended: {intakeRecommendedAction(item, 'contact')}</span>
                        <RelatedEnquirySummary matches={relatedMatches} />
                        <h3>{name}</h3>
                        <p>{item.createdAt ? formatPortalDateTime(item.createdAt) : 'Submission date not recorded'}</p>
                      </div>
                      <div className="contact-review-actions">
                        <label className="contact-adviser-select">
                          <span>Managed by</span>
                          <select value={item.assignedAdviserId || ''} onChange={(event) => assignIntakeAdviser(item, event.target.value)} disabled={saving}>
                            <option value="">Unassigned</option>
                            {activeAdvisers.map((adviser) => (
                              <option key={adviser.id} value={adviser.id}>{adviser.name}</option>
                            ))}
                          </select>
                        </label>
                        <button className="btn dark" type="button" onClick={() => sendIntakeInviteForContact(item)} disabled={saving || !item.email || Boolean(contactInviteSendingId)} title={!item.email ? 'No contact email recorded' : 'Send the full assessment form email from the CRM'}>
                          <Mail size={16} />{contactInviteSendingId === item.id ? 'Sending...' : 'Send intake form email'}
                        </button>
                        {item.status !== 'Contacted' && <button className="btn" type="button" onClick={() => updateContactStatus(item, 'Contacted')} disabled={saving}>Mark dealt with</button>}
                        {item.status !== 'Spam / Duplicate' && <button className="btn danger ghost" type="button" onClick={() => updateContactStatus(item, 'Spam / Duplicate')} disabled={saving}>Spam / Duplicate</button>}
                        {item.status !== 'New' && <button className="btn" type="button" onClick={() => updateContactStatus(item, 'New')} disabled={saving}>Restore to New</button>}
                        <button className="btn danger" type="button" onClick={() => deleteContactForm(item)} disabled={saving}><Trash2 size={16} />Delete</button>
                      </div>
                    </div>
                    <div className="contact-review-grid">
                      <div><span>Email</span><strong>{item.email || 'Not provided'}</strong></div>
                      <div><span>Phone</span><strong>{item.phone || 'Not provided'}</strong></div>
                      <div><span>Situation</span><strong>{situation}</strong></div>
                      <div><span>Location</span><strong>{location}</strong></div>
                      <div><span>Best time to call</span><strong>{bestTime}</strong></div>
                    </div>
                    <div className="contact-review-message"><span>Message</span><p>{message}</p></div>
                    <RelatedEnquiryPanel matches={relatedMatches} />
                  </div>
                </article>
              );
            })}
            {!contactFiltered.length && (
              <div className="empty-state slim intake-inbox-empty">
                <MessageSquare size={34} />
                <h2>No contact forms in this view</h2>
                <p>{contactStatusFilter === 'New' ? 'New short website enquiries will appear here until they are marked dealt with or spam.' : 'Use the status filters above to review retained contact form records.'}</p>
              </div>
            )}
          </div>
        ) : workspaceTab === 'feedback' ? (
          <div className="contact-review-list feedback-review-list">
            {feedbackFiltered.map((item) => {
              const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unnamed feedback';
              return (
                <article key={item.id} className="contact-review-card feedback-review-card">
                  <div className="contact-review-main">
                    <div className="contact-review-head">
                      <div>
                        <span className="intake-type-badge contact">Client feedback</span>
                        <span className={`library-status ${statusClass(item.status)}`}>{feedbackStatusLabel(item.status)}</span>
                        {item.permissionToUseFeedback !== 'No' && <span className="recommended-action-chip">Review permission: {item.permissionToUseFeedback}</span>}
                        <h3>{name}</h3>
                        <p>{item.createdAt ? formatPortalDateTime(item.createdAt) : 'Submission date not recorded'}</p>
                      </div>
                      <div className="contact-review-actions">
                        {item.status !== 'Reviewed' && <button className="btn" type="button" onClick={() => updateFeedbackStatus(item, 'Reviewed')} disabled={saving}>Mark reviewed</button>}
                        {item.status !== 'Follow up' && <button className="btn" type="button" onClick={() => updateFeedbackStatus(item, 'Follow up')} disabled={saving}>Follow up</button>}
                        {item.status !== 'Closed' && <button className="btn" type="button" onClick={() => updateFeedbackStatus(item, 'Closed')} disabled={saving}>Close</button>}
                        {item.status !== 'New' && <button className="btn" type="button" onClick={() => updateFeedbackStatus(item, 'New')} disabled={saving}>Restore to New</button>}
                        <button className="btn danger" type="button" onClick={() => deleteFeedback(item)} disabled={saving}><Trash2 size={16} />Delete</button>
                      </div>
                    </div>
                    <div className="contact-review-grid feedback-review-grid">
                      <div><span>Email</span><strong>{item.email || 'Not provided'}</strong></div>
                      <div><span>Phone</span><strong>{item.phone || 'Not provided'}</strong></div>
                      <div><span>Adviser / team member</span><strong>{item.adviserName || 'Not recorded'}</strong></div>
                      <div><span>Application type</span><strong>{item.applicationType || 'Not recorded'}</strong></div>
                      <div><span>Overall rating</span><strong>{item.overallRating || 'Not recorded'}</strong></div>
                      <div><span>Recommend</span><strong>{item.recommendationRating || 'Not recorded'}</strong></div>
                      <div><span>May contact?</span><strong>{item.permissionToContact || 'Not recorded'}</strong></div>
                      <div><span>Review permission</span><strong>{item.permissionToUseFeedback || 'No'}</strong></div>
                    </div>
                    <div className="contact-review-message"><span>What did we do well?</span><p>{item.serviceStrengths || 'No comment recorded.'}</p></div>
                    <div className="contact-review-message"><span>What could we improve?</span><p>{item.improvementSuggestions || 'No comment recorded.'}</p></div>
                  </div>
                </article>
              );
            })}
            {!feedbackFiltered.length && (
              <div className="empty-state slim intake-inbox-empty">
                <MessageSquare size={34} />
                <h2>No feedback in this view</h2>
                <p>New client feedback submitted from the website will appear here until reviewed.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="intake-inbox-list intake-review-list">
            {intakeFiltered.map((item) => {
              const relatedMatches = relatedMatchesFor('intake', item);
              return (
              <article key={item.id} className="intake-inbox-card intake-review-card">
                <button className="intake-inbox-card-head" type="button" onClick={() => openIntakeEditor(item)}>
                  <div className="intake-inbox-person">
                    <strong>{[item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unnamed intake'}</strong>
                    <small>{item.email || 'No email'}{item.phone ? ` · ${item.phone}` : ''}</small>
                  </div>
                  <div className="intake-inbox-detail"><span>Goal</span><strong>{item.targetPathway || item.rawPayload?.helpNeeded || 'Not selected'}</strong></div>
                  <div className="intake-inbox-detail"><span>Location</span><strong>{item.currentLocation || item.citizenship || 'Not recorded'}</strong></div>
                  <div className="intake-inbox-detail"><span>Submitted</span><strong>{item.createdAt ? formatPortalDateTime(item.createdAt) : 'No date'}</strong></div>
                  <div className="intake-inbox-status-block">
                    <span className={`library-status ${statusClass(item.status)}`}>{item.status}</span>
                    <span className="recommended-action-chip">{intakeRecommendedAction(item, 'intake')}</span>
                    <RelatedEnquirySummary matches={relatedMatches} />
                    <small>{item.convertedClientId ? 'Client record created' : `${Object.values(item.flags || {}).filter(Boolean).length} flag${Object.values(item.flags || {}).filter(Boolean).length === 1 ? '' : 's'}`}</small>
                  </div>
                </button>
                <div className="intake-inbox-flags-row"><IntakeFlagList flags={item.flags} compact /></div>
                <RelatedEnquiryPanel matches={relatedMatches} />
                <div className="intake-card-actions intake-card-actions-polished">
                  <label className="contact-adviser-select intake-card-adviser-select">
                    <span>Assigned to</span>
                    <select value={item.assignedAdviserId || ''} onClick={(event) => event.stopPropagation()} onChange={(event) => assignIntakeAdviser(item, event.target.value)} disabled={saving}>
                      <option value="">Unassigned</option>
                      {activeAdvisers.map((adviser) => (
                        <option key={adviser.id} value={adviser.id}>{adviser.name}</option>
                      ))}
                    </select>
                  </label>
                  <button className="btn dark intake-view-button" type="button" onClick={() => openIntakeEditor(item)}>View intake</button>
                  {item.status !== 'Contacted' && <button className="btn" type="button" onClick={() => updateIntakeStatus(item, 'Contacted')} disabled={saving}>Mark contacted</button>}
                  {item.status !== 'Converted' && <button className="btn dark" type="button" onClick={() => convertIntake(item)} disabled={saving || Boolean(item.convertedClientId)}>Convert</button>}
                  {item.status !== 'Spam / Duplicate' && <button className="btn danger" type="button" onClick={() => updateIntakeStatus(item, 'Spam / Duplicate')} disabled={saving}>Spam / Duplicate</button>}
                  {item.status === 'Spam / Duplicate' && <button className="btn" type="button" onClick={() => updateIntakeStatus(item, 'New')} disabled={saving}>Restore to New</button>}
                  {item.convertedClientId && <button className="btn" type="button" onClick={() => openClientRecord(item.convertedClientId)}><ExternalLink size={16} />Open client</button>}
                </div>
              </article>
              );
            })}
            {!intakeFiltered.length && (
              <div className="empty-state slim intake-inbox-empty">
                <ClipboardList size={34} />
                <h2>No intake forms match this view</h2>
                <p>The default view shows new, untouched full intake forms. Use another status filter to see older records.</p>
              </div>
            )}
          </div>
        )}

          </>
        )}
      </section>

      {draft && expandedId && (
        <ClientRecordPopoutModal title={intakeTitle} label="Pop-out intake record" ariaLabel="Pop-out intake record editor" onClose={() => requestCloseIntakeEditor()}>
          <IntakePopoutEditor
            draft={draft}
            advisers={advisers}
            statuses={simplifiedStatuses.length ? simplifiedStatuses : INTAKE_STATUSES}
            saving={saving}
            setDraftField={setDraftField}
            setDraftPayloadField={setDraftPayloadField}
            onSave={() => saveDraft()}
            onSaveAndClose={() => saveDraft({ close: true })}
            onClose={() => requestCloseIntakeEditor()}
            onDelete={deleteDraft}
            onConvert={convertDraft}
            sendIntakeOutcomeEmail={sendIntakeOutcomeEmail}
            downloadIntakeUpload={downloadIntakeUpload}
            openClientRecord={openClientRecord}
            relatedMatches={draft ? relatedMatchesFor(isContactIntake(draft) ? 'contact' : 'intake', draft) : []}
          />
        </ClientRecordPopoutModal>
      )}
    </div>
  );
}


function makeBlankSeminar() {
  return {
    title: 'Turner Hopkins immigration seminar',
    seminarDate: '',
    seminarTime: '',
    timezone: 'Pacific/Auckland',
    presenterName: '',
    zoomLink: '',
    zoomPassword: '',
    status: 'Active',
    registrationOpen: true,
    internalNotes: '',
  };
}

function SeminarManagementPanel({ seminars = [], registrations = [], relatedSources = [], saveSeminar, deleteSeminar, saveSeminarRegistration, sendSeminarRegistrationEmail, saving, confirmAction }) {
  const askConfirm = confirmAction || (async ({ message }) => window.confirm(message || 'Continue?'));
  const sortedSeminars = [...seminars].map(normaliseSeminar).sort((a, b) => String(b.seminarDate || '').localeCompare(String(a.seminarDate || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const activeSeminar = sortedSeminars.find((item) => item.status === 'Active') || sortedSeminars[0] || null;
  const [selectedSeminarId, setSelectedSeminarId] = useState(activeSeminar?.id || 'new');
  const [seminarDraft, setSeminarDraft] = useState(activeSeminar || makeBlankSeminar());
  const [setupOpen, setSetupOpen] = useState(false);
  const [registrationSeminarFilter, setRegistrationSeminarFilter] = useState(activeSeminar?.id || 'all');
  const [registrationFilter, setRegistrationFilter] = useState('New');
  const [notice, setNotice] = useState('');
  const [sendingId, setSendingId] = useState('');

  useEffect(() => {
    if (selectedSeminarId === 'new') return;
    const next = sortedSeminars.find((item) => item.id === selectedSeminarId) || activeSeminar;
    if (next) {
      setSelectedSeminarId(next.id);
      setSeminarDraft(next);
    }
  }, [seminars, selectedSeminarId]);

  useEffect(() => {
    if (registrationSeminarFilter !== 'all' && !sortedSeminars.some((item) => item.id === registrationSeminarFilter)) {
      setRegistrationSeminarFilter(activeSeminar?.id || 'all');
    }
  }, [seminars, registrationSeminarFilter]);

  function startNewSeminar() {
    setSelectedSeminarId('new');
    setSeminarDraft(makeBlankSeminar());
    setSetupOpen(true);
  }

  function openSeminarSetup() {
    if (selectedSeminarId === 'new' && activeSeminar?.id) {
      setSelectedSeminarId(activeSeminar.id);
      setSeminarDraft(activeSeminar);
    }
    if (!activeSeminar && selectedSeminarId !== 'new') {
      setSelectedSeminarId('new');
      setSeminarDraft(makeBlankSeminar());
    }
    setSetupOpen(true);
  }

  function selectSeminar(id) {
    if (id === 'new') return startNewSeminar();
    const next = sortedSeminars.find((item) => item.id === id);
    setSelectedSeminarId(id);
    setSeminarDraft(next || makeBlankSeminar());
  }

  function selectRegistrationSeminar(id) {
    setRegistrationSeminarFilter(id || 'all');
  }

  function setSeminarField(name, value) {
    setSeminarDraft((current) => ({ ...(current || makeBlankSeminar()), [name]: value }));
  }

  async function saveCurrentSeminar() {
    if (!seminarDraft.seminarDate || !seminarDraft.seminarTime) {
      setNotice('Add the seminar date and time before saving.');
      return;
    }
    const result = await saveSeminar?.(seminarDraft);
    const saved = result?.seminar ? normaliseSeminar(result.seminar) : null;
    if (saved?.id) {
      setSelectedSeminarId(saved.id);
      setRegistrationSeminarFilter(saved.id);
      setSeminarDraft(saved);
      setNotice('Seminar details saved.');
      setSetupOpen(false);
    }
  }

  async function sendRegistrationEmail(registration, outcome) {
    if (!registration?.id || sendingId) return;
    const label = outcome === 'decline' ? 'decline' : 'approval';
    const confirmed = await askConfirm({
      title: `Send seminar ${label} email?`,
      message: `Send the seminar ${label} email to ${registration.email}?`,
      confirmLabel: 'Send email',
      tone: 'send',
    });
    if (!confirmed) return;
    setNotice('');
    setSendingId(registration.id);
    try {
      const body = await sendSeminarRegistrationEmail?.(registration.id, outcome);
      const log = body?.emailLog;
      if (log?.status === 'Sent') setNotice(`Seminar ${label} email sent to ${registration.email}.`);
      else setNotice(`Seminar ${label} email could not be sent: ${log?.failureMessage || 'Microsoft did not accept the send request.'}`);
    } catch (error) {
      setNotice(error?.message || 'Seminar email could not be sent.');
    } finally {
      setSendingId('');
    }
  }

  async function markRegistration(registration, status) {
    if (!registration?.id) return;
    await saveSeminarRegistration?.({ ...registration, status });
  }

  const selectedRegistrations = registrations
    .map(normaliseSeminarRegistration)
    .filter((item) => registrationSeminarFilter === 'all' || item.seminarId === registrationSeminarFilter)
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  const visibleRegistrations = registrationFilter === 'All'
    ? selectedRegistrations
    : selectedRegistrations.filter((item) => item.status === registrationFilter);

  const newCount = registrations.filter((item) => normaliseSeminarRegistration(item).status === 'New').length;
  const activeLabel = activeSeminar ? `${activeSeminar.seminarDate || 'No date'} ${activeSeminar.seminarTime || ''}`.trim() : 'No active seminar';
  const seminarFilterOptions = [{ value: 'all', label: 'All seminars' }, ...sortedSeminars.map((item) => ({ value: item.id, label: `${item.status}: ${item.seminarDate || 'No date'} ${item.seminarTime || ''} - ${item.presenterName || item.title || 'Seminar'}` }))];
  const setupSelectOptions = [{ value: 'new', label: 'New seminar' }, ...sortedSeminars.map((item) => ({ value: item.id, label: `${item.status}: ${item.seminarDate || 'No date'} ${item.seminarTime || ''} - ${item.presenterName || item.title || 'Seminar'}` }))];

  return (
    <div className="seminar-management-panel">
      <div className="intake-inbox-summary-row enquiries-summary-row seminar-summary-row">
        <div>
          <span className="eyebrow">Seminar registrations</span>
          <h2>Seminar registrations</h2>
          <p className="muted">Review incoming seminar registrations and send approval or decline emails from this queue.</p>
        </div>
        <div className="seminar-summary-actions">
          <strong>{newCount} new</strong>
          <button className="btn" type="button" onClick={openSeminarSetup}><Wrench size={16} />Seminar setup</button>
          <button className="btn" type="button" onClick={startNewSeminar}><Plus size={16} />New seminar</button>
        </div>
      </div>

      <section className="seminar-active-strip">
        <div>
          <span className="eyebrow">Current public seminar</span>
          <h3>{activeSeminar?.title || 'No active seminar'}</h3>
          <p><strong>{activeLabel}</strong>{activeSeminar?.presenterName ? ` · Presenter: ${activeSeminar.presenterName}` : ''}</p>
          <p className="muted">The public Squarespace form shows the next active/open seminar. Zoom details remain internal until a registration is approved.</p>
        </div>
        <div className="seminar-active-actions">
          <button className="btn dark" type="button" onClick={openSeminarSetup}><Wrench size={16} />Edit seminar setup</button>
          <a className="btn" href="/seminar" target="_blank" rel="noreferrer"><ExternalLink size={16} />Open public form</a>
        </div>
      </section>

      {notice && <div className={notice.includes('could not') ? 'error-banner compact' : 'success-banner compact'}>{notice}</div>}

      <div className="seminar-registration-toolbar">
        <div className="seminar-filter-control">
          <SelectField label="Showing registrations for" value={registrationSeminarFilter} onChange={selectRegistrationSeminar} options={seminarFilterOptions} />
        </div>
        <div className="enquiries-status-pills" aria-label="Seminar registration status filter">
          {[...SEMINAR_REGISTRATION_STATUSES, 'All'].map((status) => (
            <button key={status} type="button" className={registrationFilter === status ? 'active' : ''} onClick={() => setRegistrationFilter(status)}>
              {status}
              <span>{status === 'All' ? selectedRegistrations.length : selectedRegistrations.filter((item) => item.status === status).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="seminar-registration-list">
        {visibleRegistrations.map((registration) => {
          const relatedMatches = buildRelatedEnquiryMatches(makeEnquiryMatchRecord('seminar', registration), relatedSources);
          return (
          <article key={registration.id} className="intake-inbox-card seminar-registration-card">
            <div className="seminar-registration-head">
              <div>
                <span className={`library-status ${statusClass(registration.status)}`}>{registration.status}</span>
                <RelatedEnquirySummary matches={relatedMatches} />
                <h3>{registration.fullName || 'Unnamed registrant'}</h3>
                <p>{registration.email || 'No email'} · Submitted {registration.createdAt ? formatPortalDateTime(registration.createdAt) : 'No date'}</p>
              </div>
              <div className="button-row">
                <button className="btn dark" type="button" onClick={() => sendRegistrationEmail(registration, 'approve')} disabled={saving || sendingId === registration.id || !registration.email}><Mail size={16} />{sendingId === registration.id ? 'Sending...' : 'Approve + email'}</button>
                <button className="btn danger" type="button" onClick={() => sendRegistrationEmail(registration, 'decline')} disabled={saving || sendingId === registration.id || !registration.email}><Mail size={16} />Decline + email</button>
                {registration.status !== 'Spam / Duplicate' && <button className="btn" type="button" onClick={() => markRegistration(registration, 'Spam / Duplicate')} disabled={saving}>Spam / Duplicate</button>}
                {registration.status === 'Spam / Duplicate' && <button className="btn" type="button" onClick={() => markRegistration(registration, 'New')} disabled={saving}>Restore</button>}
              </div>
            </div>
            <div className="contact-review-grid seminar-registration-grid">
              <div><span>Date of birth</span><strong>{registration.dateOfBirth || 'Not provided'}</strong></div>
              <div><span>Citizenship</span><strong>{registration.citizenshipCountry || 'Not provided'}</strong></div>
              <div><span>Current country</span><strong>{registration.residenceCountry || 'Not provided'}</strong></div>
              <div><span>Timezone</span><strong>{registration.timezone || 'Not provided'}</strong></div>
              <div><span>Partnership</span><strong>{registration.partnershipStatus || 'Not provided'}</strong></div>
              <div><span>Qualification</span><strong>{registration.highestQualification || 'Not provided'}</strong></div>
              <div><span>Occupation</span><strong>{registration.currentOccupation || 'Not provided'}</strong></div>
              <div><span>English</span><strong>{registration.englishAbility || 'Not provided'}</strong></div>
            </div>
            <div className="contact-review-message"><span>Relevant work history</span><p>{registration.workHistory || 'Not provided.'}</p></div>
            <div className="contact-review-message"><span>Health / character issues</span><p>{registration.healthCharacterIssues || 'Not provided.'}</p></div>
            <RelatedEnquiryPanel matches={relatedMatches} />
          </article>
          );
        })}
        {!visibleRegistrations.length && (
          <div className="empty-state slim intake-inbox-empty">
            <CalendarDays size={34} />
            <h2>No seminar registrations in this view</h2>
            <p>New registrations will appear here after the public seminar form is submitted.</p>
          </div>
        )}
      </div>

      {setupOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Seminar setup editor">
          <button className="modal-backdrop" type="button" aria-label="Close seminar setup" onClick={() => setSetupOpen(false)}></button>
          <section className="modal-card seminar-setup-modal">
            <div className="modal-head">
              <div>
                <span>Seminar setup</span>
                <h2>Create or edit seminar details</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setSetupOpen(false)} aria-label="Close seminar setup"><X size={18} /></button>
            </div>

            <div className="seminar-setup-intro">
              <p>The public Squarespace form shows the next active/open seminar. Zoom details stay internal until you approve a registration.</p>
            </div>

            <div className="form-grid">
              <SelectField label="Select seminar" value={selectedSeminarId} onChange={selectSeminar} options={setupSelectOptions} />
              <SelectField label="Status" value={seminarDraft.status} onChange={(v) => setSeminarField('status', v)} options={SEMINAR_STATUSES} />
              <Field label="Seminar title" value={seminarDraft.title} onChange={(v) => setSeminarField('title', v)} />
              <Field label="Presenter name" value={seminarDraft.presenterName} onChange={(v) => setSeminarField('presenterName', v)} />
              <DateField label="Seminar date (NZ time)" value={seminarDraft.seminarDate} onChange={(v) => setSeminarField('seminarDate', v)} />
              <TimeField label="Seminar time" value={seminarDraft.seminarTime} onChange={(v) => setSeminarField('seminarTime', v)} />
              <SelectField label="Reference timezone" value={seminarDraft.timezone || 'Pacific/Auckland'} onChange={(v) => setSeminarField('timezone', v)} options={SEMINAR_TIMEZONE_OPTIONS} />
              <Field label="Zoom link" value={seminarDraft.zoomLink} onChange={(v) => setSeminarField('zoomLink', v)} />
              <Field label="Zoom password" value={seminarDraft.zoomPassword} onChange={(v) => setSeminarField('zoomPassword', v)} />
            </div>
            <TextArea label="Internal notes" value={seminarDraft.internalNotes} onChange={(v) => setSeminarField('internalNotes', v)} rows={3} />
            <div className="modal-actions seminar-action-row">
              <button className="btn dark" type="button" onClick={saveCurrentSeminar} disabled={saving}><Save size={16} />Save seminar</button>
              {seminarDraft.id && <button className="btn danger" type="button" onClick={() => deleteSeminar?.(seminarDraft.id)} disabled={saving}><Trash2 size={16} />Delete seminar</button>}
              <a className="btn" href="/seminar" target="_blank" rel="noreferrer"><ExternalLink size={16} />Open public form</a>
              <button className="btn" type="button" onClick={() => setSetupOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function intakeCompareSnapshot(item = {}) {
  return {
    id: item.id || '',
    status: item.status || '',
    assignedAdviserId: item.assignedAdviserId || '',
    adviserAssessmentNotes: item.adviserAssessmentNotes || '',
    recommendedPathway: item.recommendedPathway || '',
    consultationOutcome: item.consultationOutcome || '',
    rawPayload: item.rawPayload || {},
    firstName: item.firstName || '',
    lastName: item.lastName || '',
    email: item.email || '',
    phone: item.phone || '',
    citizenship: item.citizenship || '',
    dateOfBirth: item.dateOfBirth || '',
    currentLocation: item.currentLocation || '',
    currentVisaType: item.currentVisaType || '',
    currentVisaExpiry: item.currentVisaExpiry || '',
    targetPathway: item.targetPathway || '',
    urgency: item.urgency || '',
  };
}

function IntakePopoutEditor({ draft, advisers, statuses, saving, setDraftField, setDraftPayloadField, onSave, onSaveAndClose, onClose, onDelete, onConvert, sendIntakeOutcomeEmail, downloadIntakeUpload, openClientRecord, relatedMatches = [], confirmAction }) {
  const askConfirm = confirmAction || (async ({ message }) => window.confirm(message || 'Continue?'));
  const applicantName = [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Unnamed enquiry';
  const uploadPayload = intakeAnswerPayload(draft);
  const applicantCvUpload = uploadPayload.intakeUploads?.applicantCv || uploadPayload.applicantCv;
  const partnerCvUpload = uploadPayload.intakeUploads?.partnerCv || uploadPayload.partnerCv;
  const [outcomeSending, setOutcomeSending] = useState('');
  const [outcomeMessage, setOutcomeMessage] = useState('');

  async function downloadCv(kind, label) {
    setOutcomeMessage('');
    try {
      await downloadIntakeUpload?.(draft.id, kind);
    } catch (err) {
      setOutcomeMessage(`${label} could not be downloaded: ${err.message || 'file not available.'}`);
    }
  }

  async function sendOutcomeEmail(outcome) {
    if (!draft.email) return;
    const label = outcome === 'decline' ? 'decline' : 'approval';
    const confirmed = await askConfirm({
      title: `Send ${label} email?`,
      message: `Send the ${label} email to ${draft.email}?`,
      details: outcome === 'approve' ? ['A secure consultation booking link will be generated automatically for the assigned adviser and included in the email.'] : [],
      confirmLabel: 'Send email',
      tone: 'send',
    });
    if (!confirmed) return;
    setOutcomeSending(outcome);
    setOutcomeMessage('');
    try {
      const body = await sendIntakeOutcomeEmail?.(draft, outcome);
      if (body?.emailLog?.status === 'Failed') {
        setOutcomeMessage(`${outcome === 'decline' ? 'Decline' : 'Approval'} email failed: ${body.emailLog.failureMessage || 'Microsoft did not accept the send request.'}`);
      } else {
        setOutcomeMessage(outcome === 'decline' ? `Decline email sent to ${draft.email}.` : `Approval email sent to ${draft.email}. A booking link was included where an adviser is assigned.`);
      }
    } catch (err) {
      setOutcomeMessage(err.message || 'Email could not be sent.');
    } finally {
      setOutcomeSending('');
    }
  }

  return (
    <div className="intake-popout-editor">
      <div className="intake-popout-actionbar">
        <div>
          <span className="eyebrow">{isContactIntake(draft) ? 'Contact form enquiry' : 'Assessment questionnaire'}</span>
          <h2>{applicantName}</h2>
          <p>{draft.email || 'No email'}{draft.phone ? ` · ${draft.phone}` : ''}</p>
        </div>
        <div className="button-row">
          <button className="btn" type="button" onClick={onClose}><X size={16} />Close</button>
          <button className="btn danger" type="button" onClick={onDelete} disabled={saving || Boolean(draft.convertedClientId)}><Trash2 size={16} />Delete</button>
          <button className="btn" type="button" onClick={onSave} disabled={saving}><Save size={16} />Save</button>
          <button className="btn dark" type="button" onClick={onSaveAndClose} disabled={saving}><Save size={16} />Save & close</button>
        </div>
      </div>

      <div className="intake-popout-support-actions">
        <IntakeFlagList flags={draft.flags} />
        <RelatedEnquiryPanel matches={relatedMatches} />
        <div className="button-row">
          <button className="btn" type="button" onClick={() => { if (!printIntakeRecord(draft, advisers)) window.alert('The browser blocked the print window. Allow pop-ups for this CRM, then try again.'); }}><FileText size={16} />Print / save PDF</button>
          {!isContactIntake(draft) && applicantCvUpload?.fileName && <button className="btn" type="button" onClick={() => downloadCv('applicantCv', 'Applicant CV')}><Download size={16} />Download applicant CV</button>}
          {!isContactIntake(draft) && partnerCvUpload?.fileName && <button className="btn" type="button" onClick={() => downloadCv('partnerCv', 'Partner CV')}><Download size={16} />Download partner CV</button>}
          {!isContactIntake(draft) && <button className="btn" type="button" disabled={!draft.email || Boolean(outcomeSending) || saving} onClick={() => sendOutcomeEmail('approve')} title={!draft.email ? 'No submitter email recorded' : 'Send the approval email from the CRM'}><Mail size={16} />{outcomeSending === 'approve' ? 'Sending...' : 'Send approval + booking link'}</button>}
          {!isContactIntake(draft) && <button className="btn danger" type="button" disabled={!draft.email || Boolean(outcomeSending) || saving} onClick={() => sendOutcomeEmail('decline')} title={!draft.email ? 'No submitter email recorded' : 'Send the decline email from the CRM'}><Mail size={16} />{outcomeSending === 'decline' ? 'Sending...' : 'Send decline email'}</button>}
          <button className="btn dark" type="button" onClick={onConvert} disabled={saving || Boolean(draft.convertedClientId)}><UsersRound size={16} />Convert to client</button>
          {draft.convertedClientId && <button className="btn" type="button" onClick={() => openClientRecord(draft.convertedClientId)}><ExternalLink size={16} />Open client</button>}
        </div>
        {outcomeMessage && <p className={outcomeMessage.includes('failed') || outcomeMessage.includes('could not') ? 'inline-error' : 'inline-status'}>{outcomeMessage}</p>}
      </div>

      <section className="intake-review-panel">
        <div className="intake-section-heading">
          <div>
            <span className="eyebrow">Adviser review</span>
            <h3>Assessment triage</h3>
          </div>
          <p>Use this area for internal review notes before converting the enquiry into a client record.</p>
        </div>
        <div className="form-grid intake-review-grid">
          <SelectField label="Status" value={draft.status} onChange={(value) => setDraftField('status', value)} options={statuses} />
          <SelectField label="Assigned adviser" value={draft.assignedAdviserId} onChange={(value) => setDraftField('assignedAdviserId', value)} options={advisers.map((adviser) => ({ value: adviser.id, label: adviser.name }))} placeholder="Unassigned" />
          <Field label="Recommended pathway" value={draft.recommendedPathway} onChange={(value) => setDraftField('recommendedPathway', value)} />
          <Field label="Consultation / outcome" value={draft.consultationOutcome} onChange={(value) => setDraftField('consultationOutcome', value)} />
        </div>
        <TextArea label="Adviser assessment notes" value={draft.adviserAssessmentNotes} onChange={(value) => setDraftField('adviserAssessmentNotes', value)} rows={5} />
      </section>

      {isContactIntake(draft) ? <ContactEnquiryEditor record={draft} onChange={setDraftPayloadField} /> : <IntakeQuestionnaireEditor record={draft} onChange={setDraftPayloadField} downloadIntakeUpload={downloadIntakeUpload} />}
    </div>
  );
}

function ContactEnquiryEditor({ record = {}, onChange }) {
  const payload = intakeAnswerPayload(record);
  const set = (key, value) => onChange?.(key, value);
  const fieldValue = (key) => {
    const value = payload[key];
    if (Array.isArray(value) || (value && typeof value === 'object')) return formatIntakeValue(value);
    return value || '';
  };
  function setSituation(value) {
    set('contactSituation', value);
    set('targetPathway', value);
  }
  function setLocation(value) {
    set('contactLocation', value);
    set('currentLocation', value);
  }
  return (
    <div className="intake-questionnaire-review intake-questionnaire-editor contact-enquiry-editor">
      <div className="intake-questionnaire-title">
        <div>
          <span className="eyebrow">Editable contact enquiry</span>
          <h3>Short contact form details</h3>
          <p>This enquiry came from the shorter contact form, rather than the full assessment questionnaire.</p>
        </div>
        <div className="intake-questionnaire-meta">
          <span>{record.createdAt ? `Submitted ${formatPortalDateTime(record.createdAt)}` : 'Submission date not recorded'}</span>
          <span>{record.status || 'New'}</span>
        </div>
      </div>
      <IntakeSection title="Contact enquiry">
        <IntakeSelect label="Your situation" value={fieldValue('contactSituation') || fieldValue('targetPathway')} onChange={setSituation} options={CONTACT_SITUATION_OPTIONS} />
        <div className="form-grid">
          <IntakeField label="First Name" value={fieldValue('firstName')} onChange={(v) => set('firstName', v)} />
          <IntakeField label="Last Name" value={fieldValue('lastName')} onChange={(v) => set('lastName', v)} />
          <IntakeField label="Email Address" type="email" value={fieldValue('email')} onChange={(v) => set('email', v)} />
          <IntakeField label="Phone (+area code)" value={fieldValue('phone')} onChange={(v) => set('phone', v)} />
          <IntakeField label="Where are you located? (if outside NZ)" value={fieldValue('contactLocation') || fieldValue('currentLocation')} onChange={setLocation} />
          <IntakeField label="Best time to call (if needed)?" value={fieldValue('bestTimeToCall')} onChange={(v) => set('bestTimeToCall', v)} />
        </div>
        <IntakeTextarea label="How can we help?" value={fieldValue('helpNeeded')} onChange={(v) => set('helpNeeded', v)} rows={6} />
      </IntakeSection>
    </div>
  );
}

function IntakeQuestionnaireEditor({ record = {}, onChange, downloadIntakeUpload }) {
  const payload = intakeAnswerPayload(record);
  const set = (key, value) => onChange?.(key, value);
  const fieldValue = (key) => {
    const value = payload[key];
    if (Array.isArray(value) || (value && typeof value === 'object')) return formatIntakeValue(value);
    return value || '';
  };
  const boolValue = (key) => Boolean(payload[key]);
  return (
    <div className="intake-questionnaire-review intake-questionnaire-editor">
      <div className="intake-questionnaire-title">
        <div>
          <span className="eyebrow">Editable questionnaire</span>
          <h3>Assessment answers</h3>
          <p>Grouped for adviser review: applicant details first, partner details second, then children. Update submitted answers here when advisers need to tidy or correct the intake record.</p>
        </div>
        <div className="intake-questionnaire-meta">
          <span>{record.createdAt ? `Submitted ${formatPortalDateTime(record.createdAt)}` : 'Submission date not recorded'}</span>
          <span>{record.status || 'New'}</span>
        </div>
      </div>

      <IntakeSection title="Your details">
        <div className="form-grid">
          <IntakeField label="First name" value={fieldValue('firstName')} onChange={(v) => set('firstName', v)} />
          <IntakeField label="Last name" value={fieldValue('lastName')} onChange={(v) => set('lastName', v)} />
          <IntakeField label="Email" type="email" value={fieldValue('email')} onChange={(v) => set('email', v)} />
          <IntakeField label="Mobile phone" value={fieldValue('phone')} onChange={(v) => set('phone', v)} />
          <IntakeSelect label="Preferred contact method" value={fieldValue('preferredContactMethod')} onChange={(v) => set('preferredContactMethod', v)} options={['Email', 'Mobile']} />
          <IntakeSelect label="Country of citizenship" value={fieldValue('citizenship')} onChange={(v) => set('citizenship', v)} options={COUNTRY_OPTIONS} />
          <IntakeField label="Date of birth" type="date" value={fieldValue('dateOfBirth')} onChange={(v) => set('dateOfBirth', v)} />
          <label className="field"><span>Age</span><input value={fieldValue('dateOfBirthAge') || (fieldValue('dateOfBirth') ? calculateAge(fieldValue('dateOfBirth')) : '')} readOnly /></label>
        </div>
        <IntakeUploadDownloadCard label="Applicant CV" upload={payload.intakeUploads?.applicantCv || payload.applicantCv} onDownload={() => downloadIntakeUpload?.(record.id, 'applicantCv')} />
      </IntakeSection>

      <IntakeSection title="Immigration goal">
        <div className="form-grid">
          <IntakeSelect label="What do you want to achieve?" value={fieldValue('targetPathway')} onChange={(v) => set('targetPathway', v)} options={INTAKE_PATHWAY_OPTIONS} />
          <IntakeField label="Preferred timing" value={fieldValue('desiredTimeframe')} onChange={(v) => set('desiredTimeframe', v)} />
          <IntakeSelect label="Urgency" value={fieldValue('urgency')} onChange={(v) => set('urgency', v)} options={['Standard', 'Urgent']} />
          <IntakeField label="Any urgent deadline?" type="date" value={fieldValue('urgentDeadline')} onChange={(v) => set('urgentDeadline', v)} />
        </div>
        <IntakeTextarea label="What help do you need?" value={fieldValue('helpNeeded')} onChange={(v) => set('helpNeeded', v)} rows={3} />
      </IntakeSection>

      <IntakeSection title="Current visa situation">
        <div className="form-grid">
          <IntakeSelect label="Are you currently in New Zealand?" value={fieldValue('isInNewZealand')} onChange={(v) => set('isInNewZealand', v)} options={INTAKE_YES_NO_ONLY_OPTIONS} />
          <IntakeSelect label="Current country / location" value={fieldValue('currentLocation')} onChange={(v) => set('currentLocation', v)} options={COUNTRY_OPTIONS} />
          <IntakeField label="Current visa type" value={fieldValue('currentVisaType')} onChange={(v) => set('currentVisaType', v)} />
          <IntakeField label="Current visa expiry" type="date" value={fieldValue('currentVisaExpiry')} onChange={(v) => set('currentVisaExpiry', v)} />
          <IntakeField label="Visa conditions" value={fieldValue('visaConditions')} onChange={(v) => set('visaConditions', v)} />
          <IntakeSelect label="Have you previously visited New Zealand?" value={fieldValue('previouslyVisitedNz')} onChange={(v) => set('previouslyVisitedNz', v)} options={INTAKE_YES_NO_ONLY_OPTIONS} />
          <IntakeSelect label="Have you previously held a New Zealand visa?" value={fieldValue('previouslyHeldNzVisa')} onChange={(v) => set('previouslyHeldNzVisa', v)} options={INTAKE_YES_NO_ONLY_OPTIONS} />
          <IntakeField label="Planned travel date (if known)" type="date" value={fieldValue('plannedTravelDate')} onChange={(v) => set('plannedTravelDate', v)} />
          <IntakeField label="Passport expiry date" type="date" value={fieldValue('passportExpiry')} onChange={(v) => set('passportExpiry', v)} />
        </div>
      </IntakeSection>

      <IntakeSection title="Work and employment">
        <div className="form-grid">
          <IntakeSelect label="Current employment status" value={fieldValue('currentEmploymentStatus')} onChange={(v) => set('currentEmploymentStatus', v)} options={INTAKE_EMPLOYMENT_STATUS_OPTIONS} />
          <IntakeField label="Occupation" value={fieldValue('occupation')} onChange={(v) => set('occupation', v)} />
          <IntakeField label="Current employer" value={fieldValue('currentEmployer')} onChange={(v) => set('currentEmployer', v)} />
          <IntakeSelect label="Employment country" value={fieldValue('employmentCountry')} onChange={(v) => set('employmentCountry', v)} options={COUNTRY_OPTIONS} />
          <IntakeField label="Current job start date" type="date" value={fieldValue('currentJobStartDate')} onChange={(v) => set('currentJobStartDate', v)} />
          <IntakeField label="Hours per week" value={fieldValue('hoursPerWeek')} onChange={(v) => set('hoursPerWeek', v)} />
          <IntakeField label="Annual salary" value={fieldValue('annualSalary')} onChange={(v) => set('annualSalary', v)} />
          <IntakeSelect label="Salary currency" value={fieldValue('salaryCurrency')} onChange={(v) => set('salaryCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
          <IntakeField label="Years of relevant experience" value={fieldValue('yearsExperience')} onChange={(v) => set('yearsExperience', v)} />
          <IntakeSelect label="Do you have a New Zealand job offer?" value={fieldValue('hasNzJobOffer')} onChange={(v) => set('hasNzJobOffer', v)} options={INTAKE_YES_NO_ONLY_OPTIONS} />
        </div>
        <IntakeTextarea label="Current employment details" value={fieldValue('employmentDetails')} onChange={(v) => set('employmentDetails', v)} rows={3} />
        <IntakeTextarea label="Previous work history" value={fieldValue('previousWorkHistory')} onChange={(v) => set('previousWorkHistory', v)} rows={3} />
        <div className="intake-nested-panel">
          <h3>New Zealand job offer</h3>
          <div className="form-grid">
            <IntakeField label="Employer name" value={fieldValue('employerName')} onChange={(v) => set('employerName', v)} />
            <IntakeField label="Job title" value={fieldValue('jobTitle')} onChange={(v) => set('jobTitle', v)} />
            <IntakeField label="Job location" value={fieldValue('nzJobLocation')} onChange={(v) => set('nzJobLocation', v)} />
            <IntakeField label="Pay rate" value={fieldValue('payRate')} onChange={(v) => set('payRate', v)} />
            <IntakeSelect label="Pay currency" value={fieldValue('nzPayCurrency')} onChange={(v) => set('nzPayCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
            <IntakeField label="Hours" value={fieldValue('nzJobHours')} onChange={(v) => set('nzJobHours', v)} />
            <IntakeSelect label="Employer accredited?" value={fieldValue('employerAccredited')} onChange={(v) => set('employerAccredited', v)} options={INTAKE_YES_NO_OPTIONS} />
            <IntakeSelect label="Employment agreement provided?" value={fieldValue('employmentAgreementProvided')} onChange={(v) => set('employmentAgreementProvided', v)} options={INTAKE_YES_NO_OPTIONS} />
            <IntakeField label="Proposed start date" type="date" value={fieldValue('proposedStartDate')} onChange={(v) => set('proposedStartDate', v)} />
          </div>
        </div>
      </IntakeSection>

      <IntakeSection title="Qualifications">
        <div className="form-grid">
          <IntakeSelect label="Highest qualification" value={fieldValue('highestQualification')} onChange={(v) => set('highestQualification', v)} options={INTAKE_QUALIFICATION_OPTIONS} />
          <IntakeField label="Qualification name" value={fieldValue('qualificationName')} onChange={(v) => set('qualificationName', v)} />
          <IntakeField label="Institution" value={fieldValue('qualificationInstitution')} onChange={(v) => set('qualificationInstitution', v)} />
          <IntakeSelect label="Country" value={fieldValue('qualificationCountry')} onChange={(v) => set('qualificationCountry', v)} options={COUNTRY_OPTIONS} />
          <IntakeField label="Year completed" value={fieldValue('qualificationYearCompleted')} onChange={(v) => set('qualificationYearCompleted', v)} />
          <IntakeField label="Length of study" value={fieldValue('qualificationStudyLength')} onChange={(v) => set('qualificationStudyLength', v)} />
          <IntakeSelect label="Taught in English?" value={fieldValue('taughtInEnglish')} onChange={(v) => set('taughtInEnglish', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Assessed by NZQA?" value={fieldValue('nzqaAssessed')} onChange={(v) => set('nzqaAssessed', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Related to your occupation?" value={fieldValue('qualificationRelatedToOccupation')} onChange={(v) => set('qualificationRelatedToOccupation', v)} options={INTAKE_YES_NO_OPTIONS} />
        </div>
        <IntakeTextarea label="Other qualifications or training" value={fieldValue('qualificationDetails')} onChange={(v) => set('qualificationDetails', v)} rows={3} />
      </IntakeSection>

      <IntakeSection title="Partner details">
        <div className="form-grid">
          <IntakeSelect label="Relationship status" value={fieldValue('relationshipStatus')} onChange={(v) => set('relationshipStatus', v)} options={INTAKE_RELATIONSHIP_OPTIONS} />
          <IntakeSelect label="Do you have a partner?" value={fieldValue('hasPartner')} onChange={(v) => set('hasPartner', v)} options={INTAKE_YES_NO_OPTIONS} />
        </div>
        <div className="intake-nested-panel">
          <h3>Partner details</h3>
          <div className="form-grid">
            <IntakeField label="Partner full name" value={fieldValue('partnerFullName')} onChange={(v) => set('partnerFullName', v)} />
            <IntakeField label="Partner date of birth" type="date" value={fieldValue('partnerDateOfBirth')} onChange={(v) => set('partnerDateOfBirth', v)} />
            <IntakeSelect label="Partner citizenship" value={fieldValue('partnerCitizenship')} onChange={(v) => set('partnerCitizenship', v)} options={COUNTRY_OPTIONS} />
            <IntakeSelect label="Partner current country" value={fieldValue('partnerCurrentCountry')} onChange={(v) => set('partnerCurrentCountry', v)} options={COUNTRY_OPTIONS} />
            <IntakeField label="Partner NZ visa status" value={fieldValue('partnerVisaStatus')} onChange={(v) => set('partnerVisaStatus', v)} />
            <IntakeSelect label="Is your partner a NZ citizen or resident?" value={fieldValue('partnerNzStatus')} onChange={(v) => set('partnerNzStatus', v)} options={INTAKE_YES_NO_OPTIONS} />
            <IntakeSelect label="Are you living together?" value={fieldValue('livingTogether')} onChange={(v) => set('livingTogether', v)} options={INTAKE_YES_NO_OPTIONS} />
            <IntakeField label="Date relationship started" type="date" value={fieldValue('relationshipStarted')} onChange={(v) => set('relationshipStarted', v)} />
            <IntakeField label="Date started living together" type="date" value={fieldValue('startedLivingTogether')} onChange={(v) => set('startedLivingTogether', v)} />
            <IntakeSelect label="Include partner in assessment?" value={fieldValue('partnerIncluded')} onChange={(v) => set('partnerIncluded', v)} options={INTAKE_YES_NO_OPTIONS} />
          </div>
          <IntakeTextarea label="Relationship background" value={fieldValue('relationshipBackground')} onChange={(v) => set('relationshipBackground', v)} rows={3} />
        </div>
        <div className="intake-nested-panel">
          <h3>Partner work and experience</h3>
          <div className="form-grid">
            <IntakeSelect label="Partner current employment status" value={fieldValue('partnerCurrentEmploymentStatus')} onChange={(v) => set('partnerCurrentEmploymentStatus', v)} options={INTAKE_EMPLOYMENT_STATUS_OPTIONS} />
            <IntakeField label="Partner occupation / profession" value={fieldValue('partnerOccupation')} onChange={(v) => set('partnerOccupation', v)} />
            <IntakeField label="Partner current employer / business" value={fieldValue('partnerCurrentEmployer')} onChange={(v) => set('partnerCurrentEmployer', v)} />
            <IntakeSelect label="Partner country of employment" value={fieldValue('partnerEmploymentCountry')} onChange={(v) => set('partnerEmploymentCountry', v)} options={COUNTRY_OPTIONS} />
            <IntakeField label="Partner current job start date" type="date" value={fieldValue('partnerCurrentJobStartDate')} onChange={(v) => set('partnerCurrentJobStartDate', v)} />
            <IntakeField label="Partner hours per week" value={fieldValue('partnerHoursPerWeek')} onChange={(v) => set('partnerHoursPerWeek', v)} />
            <IntakeField label="Partner salary or pay rate" value={fieldValue('partnerAnnualSalary')} onChange={(v) => set('partnerAnnualSalary', v)} />
            <IntakeSelect label="Partner salary currency" value={fieldValue('partnerSalaryCurrency')} onChange={(v) => set('partnerSalaryCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
            <IntakeField label="Partner years of relevant experience" value={fieldValue('partnerYearsExperience')} onChange={(v) => set('partnerYearsExperience', v)} />
          </div>
          <IntakeTextarea label="Partner current employment details" value={fieldValue('partnerEmploymentDetails')} onChange={(v) => set('partnerEmploymentDetails', v)} rows={3} />
          <IntakeTextarea label="Partner previous work history" value={fieldValue('partnerPreviousWorkHistory')} onChange={(v) => set('partnerPreviousWorkHistory', v)} rows={3} />
        </div>
        <div className="intake-nested-panel">
          <h3>Partner qualifications</h3>
          <div className="form-grid">
            <IntakeSelect label="Partner highest qualification" value={fieldValue('partnerHighestQualification')} onChange={(v) => set('partnerHighestQualification', v)} options={INTAKE_QUALIFICATION_OPTIONS} />
            <IntakeField label="Partner qualification name" value={fieldValue('partnerQualificationName')} onChange={(v) => set('partnerQualificationName', v)} />
            <IntakeField label="Partner institution" value={fieldValue('partnerQualificationInstitution')} onChange={(v) => set('partnerQualificationInstitution', v)} />
            <IntakeSelect label="Partner qualification country" value={fieldValue('partnerQualificationCountry')} onChange={(v) => set('partnerQualificationCountry', v)} options={COUNTRY_OPTIONS} />
            <IntakeField label="Partner year completed" value={fieldValue('partnerQualificationYearCompleted')} onChange={(v) => set('partnerQualificationYearCompleted', v)} />
            <IntakeField label="Partner length of study" value={fieldValue('partnerQualificationStudyLength')} onChange={(v) => set('partnerQualificationStudyLength', v)} />
            <IntakeSelect label="Partner qualification taught in English?" value={fieldValue('partnerTaughtInEnglish')} onChange={(v) => set('partnerTaughtInEnglish', v)} options={INTAKE_YES_NO_OPTIONS} />
            <IntakeSelect label="Partner qualification assessed by NZQA?" value={fieldValue('partnerNzqaAssessed')} onChange={(v) => set('partnerNzqaAssessed', v)} options={INTAKE_YES_NO_OPTIONS} />
            <IntakeSelect label="Partner qualification related to occupation?" value={fieldValue('partnerQualificationRelatedToOccupation')} onChange={(v) => set('partnerQualificationRelatedToOccupation', v)} options={INTAKE_YES_NO_OPTIONS} />
          </div>
          <IntakeTextarea label="Partner other qualifications or training" value={fieldValue('partnerQualificationDetails')} onChange={(v) => set('partnerQualificationDetails', v)} rows={3} />
          <IntakeUploadDownloadCard label="Partner CV" upload={payload.intakeUploads?.partnerCv || payload.partnerCv} onDownload={() => downloadIntakeUpload?.(record.id, 'partnerCv')} />
        </div>
      </IntakeSection>

      <IntakeSection title="Children">
        <div className="form-grid">
          <IntakeSelect label="Do you have children?" value={fieldValue('hasChildren')} onChange={(v) => set('hasChildren', v)} options={INTAKE_YES_NO_OPTIONS} />
        </div>
        <div className="intake-nested-panel">
          <h3>Children</h3>
          <IntakeTextarea label="Children details" value={fieldValue('children')} onChange={(v) => set('children', v)} rows={3} />
          <IntakeTextarea label="Additional child / custody details" value={fieldValue('moreChildrenDetails')} onChange={(v) => set('moreChildrenDetails', v)} rows={3} />
        </div>

      </IntakeSection>
      <IntakeSection title="Health and character">
        <div className="form-grid">
          <IntakeSelect label="Any medical or health concerns?" value={fieldValue('healthIssues')} onChange={(v) => set('healthIssues', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Any dependent family health concerns?" value={fieldValue('dependantHealthIssues')} onChange={(v) => set('dependantHealthIssues', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Any criminal convictions?" value={fieldValue('characterConvictions')} onChange={(v) => set('characterConvictions', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Any pending charges or police matters?" value={fieldValue('characterPendingCharges')} onChange={(v) => set('characterPendingCharges', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Any deportation, removal or exclusion history?" value={fieldValue('deportationRemoval')} onChange={(v) => set('deportationRemoval', v)} options={INTAKE_YES_NO_OPTIONS} />
        </div>
        <IntakeTextarea label="Health details" value={fieldValue('healthDetails')} onChange={(v) => set('healthDetails', v)} rows={3} />
        <IntakeTextarea label="Character details" value={fieldValue('characterDetails')} onChange={(v) => set('characterDetails', v)} rows={3} />
      </IntakeSection>

      <IntakeSection title="Immigration history">
        <div className="form-grid">
          <IntakeSelect label="Any visa declines?" value={fieldValue('visaDeclines')} onChange={(v) => set('visaDeclines', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Ever overstayed a visa?" value={fieldValue('overstayed')} onChange={(v) => set('overstayed', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Any false or misleading information issue?" value={fieldValue('falseMisleadingIssue')} onChange={(v) => set('falseMisleadingIssue', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Any current appeal, reconsideration or deadline?" value={fieldValue('appealOrDeadline')} onChange={(v) => set('appealOrDeadline', v)} options={INTAKE_YES_NO_OPTIONS} />
        </div>
        <IntakeTextarea label="Immigration history details" value={fieldValue('immigrationHistoryDetails')} onChange={(v) => set('immigrationHistoryDetails', v)} rows={3} />
        <IntakeTextarea label="Countries you have spent a combined total of 12 months or more in" value={fieldValue('countriesLived')} onChange={(v) => set('countriesLived', v)} rows={3} />
        <IntakeTextarea label="Countries you have spent a combined total of five years or more in, since turning 17 years of age" value={fieldValue('countriesLivedFiveYearsSince17')} onChange={(v) => set('countriesLivedFiveYearsSince17', v)} rows={3} />
        <IntakeTextarea label="New Zealand travel or visa history" value={fieldValue('nzTravelHistory')} onChange={(v) => set('nzTravelHistory', v)} rows={3} />
      </IntakeSection>

      <IntakeSection title="Funds and investment">
        <div className="form-grid">
          <IntakeSelect label="Do you have funds to support your move?" value={fieldValue('fundsAvailableSupport')} onChange={(v) => set('fundsAvailableSupport', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeField label="Approximate funds available" value={fieldValue('availableFunds')} onChange={(v) => set('availableFunds', v)} />
          <IntakeSelect label="Currency" value={fieldValue('fundsCurrency')} onChange={(v) => set('fundsCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
          <IntakeField label="Source of funds" value={fieldValue('sourceOfFunds')} onChange={(v) => set('sourceOfFunds', v)} />
          <IntakeSelect label="Investment or business migration enquiry?" value={fieldValue('investmentInterest')} onChange={(v) => set('investmentInterest', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeField label="Approximate investment funds" value={fieldValue('investmentFunds')} onChange={(v) => set('investmentFunds', v)} />
          <IntakeSelect label="Investment currency" value={fieldValue('investmentCurrency')} onChange={(v) => set('investmentCurrency', v)} options={INTAKE_CURRENCY_OPTIONS} />
          <IntakeSelect label="Funds held by you?" value={fieldValue('fundsHeldByYou')} onChange={(v) => set('fundsHeldByYou', v)} options={INTAKE_YES_NO_OPTIONS} />
          <IntakeSelect label="Funds transferable to New Zealand?" value={fieldValue('fundsTransferableNz')} onChange={(v) => set('fundsTransferableNz', v)} options={INTAKE_YES_NO_OPTIONS} />
        </div>
        <IntakeTextarea label="Business / investment background" value={fieldValue('fundsDetails')} onChange={(v) => set('fundsDetails', v)} rows={3} />
      </IntakeSection>

      <IntakeSection title="Final comments and consent">
        <IntakeTextarea label="Anything else we should know?" value={fieldValue('additionalInfo')} onChange={(v) => set('additionalInfo', v)} rows={4} />
        <div className="intake-consent-grid">
          <IntakeCheckbox label="I agree Turner Hopkins may contact me about this enquiry." checked={boolValue('consentToContact')} onChange={(v) => set('consentToContact', v)} />
          <IntakeCheckbox label="I understand this questionnaire is for initial assessment only and does not create an adviser-client relationship." checked={boolValue('privacyAcknowledged')} onChange={(v) => set('privacyAcknowledged', v)} />
        </div>
      </IntakeSection>
    </div>
  );
}

function IntakeFlagList({ flags = {}, compact = false }) {
  const definitions = [
    ['urgent', 'Urgent timing'],
    ['visaExpirySoon', 'Visa expiry'],
    ['health', 'Health review'],
    ['character', 'Character review'],
    ['employment', 'Employment details'],
    ['partnership', 'Partner/family'],
    ['family', 'Children/family'],
    ['investor', 'Investor interest'],
    ['funds', 'Funds/investment'],
  ];
  const rows = definitions.filter(([key]) => Boolean(flags?.[key])).map(([, label]) => label);
  if (!rows.length) {
    return compact ? <small>No review flags</small> : (
      <div className="intake-flags">
        <div className="intake-flags-head"><span>Review flags</span><small>No automatic review flags from this intake.</small></div>
      </div>
    );
  }
  return (
    <div className={`intake-flags ${compact ? 'compact' : ''}`}>
      {!compact && <div className="intake-flags-head"><span>Review flags</span><small>Generated from intake answers. These are adviser prompts, not conclusions.</small></div>}
      <div className="intake-flag-tags">
        {rows.map((row) => <span key={row}>{row}</span>)}
      </div>
    </div>
  );
}

function IntakeQuestionnaireReview({ record = {}, advisers = [] }) {
  const sections = getIntakeQuestionnaireSections(record);
  return (
    <div className="intake-questionnaire-review">
      <div className="intake-questionnaire-title">
        <div>
          <span className="eyebrow">Submitted questionnaire</span>
          <h3>Assessment answers</h3>
          <p>Set out in the same order as the public assessment questionnaire, so advisers can review the submission against the form flow.</p>
        </div>
        <div className="intake-questionnaire-meta">
          <span>{record.createdAt ? `Submitted ${formatPortalDateTime(record.createdAt)}` : 'Submission date not recorded'}</span>
          <span>{record.status || 'New'}</span>
          <span>{adviserName(record.assignedAdviserId, advisers)}</span>
        </div>
      </div>
      {sections.map((section) => (
        <section className="intake-section intake-readonly-section" key={section.title}>
          <div className="intake-panel-title-row">
            <h2>{section.title}</h2>
            {section.badge && <span className="intake-section-badge">{section.badge}</span>}
          </div>
          {section.description && <p>{section.description}</p>}
          <IntakeAnswerGrid rows={section.rows} />
          {(section.panels || []).map((panel) => (
            <div className="intake-nested-panel intake-readonly-nested" key={panel.title}>
              <h3>{panel.title}</h3>
              <IntakeAnswerGrid rows={panel.rows} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function IntakeAnswerGrid({ rows = [] }) {
  if (!rows.length) return <p className="muted">No answers recorded for this section.</p>;
  return (
    <div className="intake-answer-grid">
      {rows.map(([label, value]) => {
        const formatted = formatIntakeValue(value);
        const isLong = String(formatted || '').length > 90 || String(formatted || '').includes('\n');
        return (
          <div className={`intake-answer-field ${isLong ? 'wide' : ''}`} key={`${label}-${formatted}`}>
            <span>{label}</span>
            <strong>{formatted || 'Not answered'}</strong>
          </div>
        );
      })}
    </div>
  );
}

function getIntakeQuestionnaireSections(record = {}) {
  const payload = intakeAnswerPayload(record);
  if (isContactIntake(record)) {
    return [{
      title: 'Contact enquiry',
      badge: 'Contact form',
      rows: intakeRows(payload, ['contactSituation', 'firstName', 'lastName', 'email', 'phone', 'contactLocation', 'bestTimeToCall', 'helpNeeded', 'consentToContact', 'privacyAcknowledged']),
    }];
  }
  const sections = [
    {
      title: 'Your details',
      rows: intakeRows(payload, ['firstName', 'lastName', 'email', 'phone', 'preferredContactMethod', 'citizenship', 'dateOfBirth', 'dateOfBirthAge', 'applicantCv']),
    },
    {
      title: 'Immigration goal',
      rows: intakeRows(payload, ['targetPathway', 'desiredTimeframe', 'urgency', 'urgentDeadline', 'helpNeeded']),
    },
    {
      title: 'Current visa situation',
      rows: intakeRows(payload, ['isInNewZealand', 'currentLocation', 'currentVisaType', 'currentVisaExpiry', 'visaConditions', 'previouslyVisitedNz', 'previouslyHeldNzVisa', 'plannedTravelDate', 'passportExpiry']),
    },
    {
      title: 'Work and employment',
      rows: intakeRows(payload, ['currentEmploymentStatus', 'occupation', 'currentEmployer', 'employmentCountry', 'currentJobStartDate', 'hoursPerWeek', 'annualSalary', 'salaryCurrency', 'yearsExperience', 'employmentDetails']),
      panels: [
        { title: 'Previous work history', rows: intakeRows(payload, ['previousWorkHistory']) },
        { title: 'New Zealand job offer', rows: intakeRows(payload, ['hasNzJobOffer', 'employerName', 'jobTitle', 'nzJobLocation', 'payRate', 'nzPayCurrency', 'nzJobHours', 'employerAccredited', 'employmentAgreementProvided', 'proposedStartDate']) },
      ],
    },
    {
      title: 'Qualifications',
      rows: intakeRows(payload, ['highestQualification', 'qualificationName', 'qualificationInstitution', 'qualificationCountry', 'qualificationYearCompleted', 'qualificationStudyLength', 'taughtInEnglish', 'nzqaAssessed', 'qualificationRelatedToOccupation', 'qualificationDetails']),
    },
    {
      title: 'Partner details',
      rows: intakeRows(payload, ['relationshipStatus', 'hasPartner']),
      panels: [
        { title: 'Partner identity and relationship', rows: intakeRows(payload, ['partnerFullName', 'partnerDateOfBirth', 'partnerCitizenship', 'partnerCurrentCountry', 'partnerVisaStatus', 'partnerNzStatus', 'livingTogether', 'relationshipStarted', 'startedLivingTogether', 'partnerIncluded', 'relationshipBackground', 'partnerCv']) },
        { title: 'Partner work and experience', rows: intakeRows(payload, ['partnerCurrentEmploymentStatus', 'partnerOccupation', 'partnerCurrentEmployer', 'partnerEmploymentCountry', 'partnerCurrentJobStartDate', 'partnerHoursPerWeek', 'partnerAnnualSalary', 'partnerSalaryCurrency', 'partnerYearsExperience', 'partnerEmploymentDetails', 'partnerPreviousWorkHistory']) },
        { title: 'Partner qualifications', rows: intakeRows(payload, ['partnerHighestQualification', 'partnerQualificationName', 'partnerQualificationInstitution', 'partnerQualificationCountry', 'partnerQualificationYearCompleted', 'partnerQualificationStudyLength', 'partnerTaughtInEnglish', 'partnerNzqaAssessed', 'partnerQualificationRelatedToOccupation', 'partnerQualificationDetails']) },
      ],
    },
    {
      title: 'Children',
      rows: intakeRows(payload, ['hasChildren', 'children', 'moreChildrenDetails']),
    },
    {
      title: 'Health and character',
      rows: intakeRows(payload, ['healthIssues', 'dependantHealthIssues', 'healthDetails', 'characterConvictions', 'characterPendingCharges', 'deportationRemoval', 'characterDetails']),
    },
    {
      title: 'Immigration history',
      rows: intakeRows(payload, ['visaDeclines', 'overstayed', 'falseMisleadingIssue', 'appealOrDeadline', 'immigrationHistoryDetails', 'countriesLived', 'countriesLivedFiveYearsSince17', 'nzTravelHistory']),
    },
    {
      title: 'Funds and investment',
      rows: intakeRows(payload, ['fundsAvailableSupport', 'availableFunds', 'fundsCurrency', 'sourceOfFunds', 'investmentInterest']),
      panels: [
        { title: 'Investment background', rows: intakeRows(payload, ['investmentFunds', 'investmentCurrency', 'fundsHeldByYou', 'fundsTransferableNz', 'fundsDetails']) },
      ],
    },
    {
      title: 'Final comments and consent',
      rows: intakeRows(payload, ['additionalInfo', 'consentToContact', 'privacyAcknowledged']),
    },
  ];

  return sections.map((section) => {
    const panels = (section.panels || []).filter((panel) => panel.rows.length);
    return { ...section, panels };
  }).filter((section) => section.rows.length || (section.panels || []).length);
}

function intakeAnswerPayload(record = {}) {
  const raw = record.rawPayload && typeof record.rawPayload === 'object' ? record.rawPayload : {};
  const payload = { ...raw };
  ['firstName', 'lastName', 'email', 'phone', 'citizenship', 'dateOfBirth', 'currentLocation', 'currentVisaType', 'currentVisaExpiry', 'targetPathway', 'urgency'].forEach((key) => {
    if (!hasIntakeValue(payload[key]) && hasIntakeValue(record[key])) payload[key] = record[key];
  });
  if (hasIntakeValue(payload.dateOfBirth) && !hasIntakeValue(payload.dateOfBirthAge)) {
    payload.dateOfBirthAge = calculateAge(payload.dateOfBirth);
  }
  return payload;
}

function intakeRows(payload = {}, keys = []) {
  return keys.map((key) => [intakeLabelForKey(key), payload[key]]).filter(([, value]) => hasIntakeValue(value));
}

function intakeSnapshotRows(payload = {}) {
  const children = Array.isArray(payload.children) ? payload.children.filter((child) => hasIntakeValue(child?.fullName) || hasIntakeValue(child?.dateOfBirth)) : [];
  const immigrationIssue = [payload.visaDeclines, payload.overstayed, payload.falseMisleadingIssue, payload.appealOrDeadline].some((value) => value === 'Yes') ? 'Yes' : '';
  return [
    ['Main goal', payload.targetPathway],
    ['Partner included', payload.hasPartner === 'Yes' ? (payload.partnerIncluded || 'Yes') : payload.hasPartner],
    ['Children listed', children.length ? String(children.length) : payload.hasChildren],
    ['NZ job offer', payload.hasNzJobOffer],
    ['Health review', payload.healthIssues],
    ['Character review', [payload.characterConvictions, payload.characterPendingCharges, payload.deportationRemoval].some((value) => value === 'Yes') ? 'Yes' : ''],
    ['Immigration issue', immigrationIssue],
    ['Funds / investment', payload.investmentInterest === 'Yes' ? 'Investment enquiry' : payload.availableFunds],
  ];
}

function hasIntakeValue(value) {
  if (Array.isArray(value)) return value.some(hasIntakeValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasIntakeValue);
  return String(value || '').trim().length > 0;
}

function formatIntakeValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      if (entry && typeof entry === 'object') {
        const parts = [
          entry.fullName,
          entry.dateOfBirth ? `Date of birth: ${entry.dateOfBirth}` : '',
          entry.citizenship ? `Citizenship: ${entry.citizenship}` : '',
          entry.currentCountry ? `Current country: ${entry.currentCountry}` : '',
          entry.dependent ? `Dependent: ${entry.dependent}` : '',
          entry.includedInApplication ? `Included: ${entry.includedInApplication}` : '',
          entry.custodyIssues ? `Custody / guardianship issue: ${entry.custodyIssues}` : '',
        ].filter(Boolean);
        return `${index + 1}. ${parts.join(' · ')}`;
      }
      return `${index + 1}. ${entry}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    if (value.fileName) return `${value.fileName}${value.fileSize ? ` (${formatFileSize(value.fileSize)})` : ''}`;
    return Object.entries(value).filter(([, item]) => hasIntakeValue(item)).map(([key, item]) => `${intakeLabelForKey(key)}: ${formatIntakeValue(item)}`).join('\n');
  }
  return String(value || '');
}

function IntakeSection({ title, description, children }) {
  return <section className="intake-section"><h2>{title}</h2>{description && <p>{description}</p>}{children}</section>;
}

function IntakeField({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return <label className="field"><span>{label}{required ? ' *' : ''}</span><input type={type} value={value || ''} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function IntakeSelect({ label, value, onChange, options, required = false }) {
  const normalised = (options || []).map((option) => typeof option === 'string' ? { label: option, value: option } : option);
  return <label className="field"><span>{label}{required ? ' *' : ''}</span><select value={value || ''} required={required} onChange={(event) => onChange(event.target.value)}><option value="">Select...</option>{normalised.map((option, index) => <option key={`${option.value || option.label}-${index}`} value={option.value} disabled={Boolean(option.disabled)}>{option.label}</option>)}</select></label>;
}

function IntakeFileField({ label, file, onChange }) {
  const inputId = `intake-file-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return (
    <div className="intake-file-field">
      <label className="field" htmlFor={inputId}>
        <span>{label}</span>
        <input id={inputId} type="file" accept={INTAKE_CV_ACCEPT} onChange={(event) => onChange(event.target.files?.[0] || null)} />
      </label>
      <p className="muted">PDF, DOC or DOCX only. Maximum 5 MB. One file only.</p>
      {file && (
        <div className="intake-upload-pill">
          <FileText size={15} />
          <span>{file.name} · {formatFileSize(file.size)}</span>
          <button type="button" className="btn mini" onClick={() => onChange(null)}>Remove</button>
        </div>
      )}
    </div>
  );
}

function IntakeUploadDownloadCard({ label, upload, onDownload }) {
  const hasUpload = upload && typeof upload === 'object' && upload.fileName;
  return (
    <div className={`intake-upload-download ${hasUpload ? 'has-file' : ''}`}>
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{hasUpload ? upload.fileName : 'No CV uploaded'}</strong>
        {hasUpload && <small>{formatFileSize(upload.fileSize)}{upload.uploadedAt ? ` · Uploaded ${formatPortalDateTime(upload.uploadedAt)}` : ''}</small>}
      </div>
      {hasUpload && <button className="btn" type="button" onClick={onDownload}><Download size={16} />Download CV</button>}
    </div>
  );
}

function IntakeTextarea({ label, value, onChange, rows = 4, placeholder = '' }) {
  return <label className="field intake-textarea"><span>{label}</span><textarea rows={rows} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function IntakeCheckbox({ label, checked, onChange, required = false }) {
  return <label className="intake-checkbox"><input type="checkbox" checked={Boolean(checked)} required={required} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}



function ClientPortalApp() {
  const storedSnapshot = sessionStorage.getItem('this_crm_client_portal_snapshot');
  const storedAuth = sessionStorage.getItem('this_crm_client_portal_auth');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [portalAuth, setPortalAuth] = useState(() => storedAuth ? safeJsonParse(storedAuth, null) : null);
  const [snapshot, setSnapshot] = useState(() => storedSnapshot ? safeJsonParse(storedSnapshot, null) : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [portalNotice, setPortalNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function refreshStoredSession() {
      if (!portalAuth?.email || !portalAuth?.accessCode) return;
      try {
        const body = await portalRequest({ action: 'login', email: portalAuth.email, accessCode: portalAuth.accessCode });
        if (!cancelled) storeSession(portalAuth, body.snapshot || null);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Portal refresh failed. Please sign in again.');
      }
    }
    refreshStoredSession();
    return () => { cancelled = true; };
  }, []);

  async function portalRequest(payload) {
    const response = await fetch('/.netlify/functions/portal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await readJsonResponse(response);
    if (!response.ok) throw new Error(body.error || 'Portal access details were not recognised.');
    return body;
  }

  function storeSession(nextAuth, nextSnapshot) {
    setPortalAuth(nextAuth);
    setSnapshot(nextSnapshot);
    sessionStorage.setItem('this_crm_client_portal_auth', JSON.stringify(nextAuth));
    sessionStorage.setItem('this_crm_client_portal_snapshot', JSON.stringify(nextSnapshot));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setPortalNotice('');
    try {
      const nextAuth = { email: email.trim(), accessCode: accessCode.trim() };
      const body = await portalRequest({ action: 'login', ...nextAuth });
      storeSession(nextAuth, body.snapshot || null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function refreshPortalSnapshot() {
    if (!portalAuth?.email || !portalAuth?.accessCode) return;
    setError('');
    try {
      const body = await portalRequest({ action: 'login', email: portalAuth.email, accessCode: portalAuth.accessCode });
      storeSession(portalAuth, body.snapshot || null);
    } catch (err) {
      setError(err.message || 'Portal refresh failed. Sign out and back in if the problem continues.');
    }
  }

  async function submitPortalMessage({ messageType, title, message }) {
    if (!portalAuth?.email || !portalAuth?.accessCode) throw new Error('Your portal session has expired. Please sign in again.');
    const body = await portalRequest({ action: 'addMessage', email: portalAuth.email, accessCode: portalAuth.accessCode, messageType, title, message });
    storeSession(portalAuth, body.snapshot || null);
    setPortalNotice(messageType === 'adviser_action' ? 'Your note has been sent to Turner Hopkins.' : 'Your note has been saved to your portal.');
  }

  async function openPortalDocument(documentId) {
    if (!portalAuth?.email || !portalAuth?.accessCode) throw new Error('Your portal session has expired. Please sign in again.');
    setPortalNotice('Preparing document...');
    setError('');
    try {
      const body = await portalRequest({ action: 'getDocument', email: portalAuth.email, accessCode: portalAuth.accessCode, documentId });
      openBase64Pdf(body.document);
      setPortalNotice('Document opened. Use your browser controls to save or print it.');
    } catch (err) {
      setPortalNotice('');
      setError(err.message || 'That document could not be opened.');
    }
  }

  function signOut() {
    sessionStorage.removeItem('this_crm_client_portal_snapshot');
    sessionStorage.removeItem('this_crm_client_portal_auth');
    setPortalAuth(null);
    setSnapshot(null);
    setAccessCode('');
    setPortalNotice('');
  }

  if (snapshot) {
    return (
      <ClientPortalDashboard
        snapshot={normalisePortalSnapshot(snapshot)}
        onSignOut={signOut}
        onRefresh={refreshPortalSnapshot}
        onSubmitPortalMessage={submitPortalMessage}
        onOpenPortalDocument={openPortalDocument}
        portalNotice={portalNotice}
        portalError={error}
      />
    );
  }

  return (
    <div className="portal-shell">
      <main className="portal-login-card">
        <img src={LOGO_SRC} alt="Turner Hopkins Immigration Specialists" className="portal-logo" />
        <div className="portal-login-icon-wrap"><LockKeyhole size={28} className="portal-lock" /></div>
        <span className="portal-login-eyebrow">Secure client portal</span>
        <h1>Welcome to your portal</h1>
        <p>Sign in to check your latest application update, documents, messages and helpful resources from Turner Hopkins.</p>
        <div className="portal-login-benefits" aria-label="Portal features">
          <span>Progress updates</span>
          <span>Documents</span>
          <span>Messages</span>
        </div>
        <form onSubmit={submit} className="portal-login-form">
          <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
          <label><span>Portal access code</span><input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="TH-XXXX-XXXX-XXXX" autoComplete="one-time-code" /></label>
          <button className="btn dark" type="submit" disabled={loading}>{loading ? 'Checking...' : 'Open my portal'}</button>
        </form>
        {error && <p className="portal-error">{error}</p>}
        <p className="portal-smallprint">Use the access code sent by Turner Hopkins. You can also send us a note or keep your own planning notes once you are inside.</p>
      </main>
    </div>
  );
}


function PortalAccordionCard({ title, description, icon = null, children, className = '', defaultOpen = false, badge = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`portal-card portal-collapsible-card ${className} ${open ? 'open' : 'collapsed'}`}>
      <button type="button" className="portal-collapsible-head" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <span className="portal-collapsible-actions">
          {badge}
          {icon && <span className="portal-collapsible-icon-chip">{icon}</span>}
          <ChevronRight size={20} className="portal-collapsible-chevron" />
        </span>
      </button>
      {open && <div className="portal-collapsible-body">{children}</div>}
    </section>
  );
}


function ClientPortalProgressMap({ stagePlan = [], progressPercent = 0 }) {
  const stages = Array.isArray(stagePlan) ? stagePlan.filter((stage) => stage && stage.label) : [];
  const nextStage = stages.find((stage) => !stage.completed) || null;
  const defaultStage = nextStage || stages[stages.length - 1] || stages[0] || null;
  const [selectedStageKey, setSelectedStageKey] = useState('');
  const selectedStage = stages.find((stage) => portalStageKey(stage) === selectedStageKey) || defaultStage;
  if (!stages.length) return null;

  function stageStatus(stage) {
    if (stage.completed) return 'completed';
    if (nextStage && portalStageKey(nextStage) === portalStageKey(stage)) return 'current';
    return 'upcoming';
  }

  const selectedStatus = selectedStage ? stageStatus(selectedStage) : '';
  const detail = getPortalStageDetail(selectedStage, selectedStatus);

  return (
    <PortalAccordionCard
      title="Application journey"
      description="Open this section to see what each stage means, where things sit now, and what usually happens next."
      className="wide portal-progress-card portal-journey-card"
      defaultOpen
      badge={<span className="portal-progress-pill">{progressPercent}% complete</span>}
    >
      <div className="portal-stage-track portal-stage-track-interactive">
        {stages.map((stage, index) => {
          const status = stageStatus(stage);
          const isSelected = selectedStage && portalStageKey(selectedStage) === portalStageKey(stage);
          return (
            <button type="button" className={`portal-stage-tile ${status} ${isSelected ? 'selected' : ''}`} key={portalStageKey(stage)} onClick={() => setSelectedStageKey(portalStageKey(stage))}>
              <div className="portal-stage-marker"><span>{status === 'completed' ? '✓' : index + 1}</span></div>
              <div>
                <strong>{stage.label}</strong>
                <small>{status === 'current' ? 'Current / next stage' : status === 'completed' ? (stage.completedDate ? `Completed ${formatPortalDate(stage.completedDate)}` : 'Completed') : 'Upcoming'}</small>
              </div>
            </button>
          );
        })}
      </div>
      {selectedStage && (
        <div className={`portal-stage-detail-panel ${selectedStatus}`}>
          <div>
            <span className="portal-stage-detail-kicker">Selected stage</span>
            <h3>{selectedStage.label}</h3>
            <p>{detail.summary}</p>
          </div>
          <div className="portal-stage-detail-grid">
            <article><strong>Turner Hopkins is focused on</strong><p>{detail.thiSAction}</p></article>
            <article><strong>Your part</strong><p>{detail.clientAction}</p></article>
            <article><strong>What happens next</strong><p>{detail.next}</p></article>
          </div>
        </div>
      )}
    </PortalAccordionCard>
  );
}

function portalStageKey(stage = {}) {
  return String(stage.id || stage.label || '').trim().toLowerCase() || `stage-${Math.random()}`;
}

function getPortalStageDetail(stage = {}, status = '') {
  const label = String(stage?.label || '').toLowerCase();
  const base = status === 'completed'
    ? 'This stage has been marked as completed in your application pathway.'
    : status === 'current'
      ? 'This is the stage your application is currently moving through, or the next practical stage Turner Hopkins is working toward.'
      : 'This stage is part of the pathway selected for your application and may become relevant later.';
  if (label.includes('document')) {
    return {
      summary: `${base} The main focus is collecting and checking the evidence needed for the next step.`,
      thiSAction: 'Reviewing what has been received, identifying gaps, and confirming what still needs to be provided.',
      clientAction: 'Check the document list below and provide any outstanding items when requested.',
      next: 'Once the evidence is complete, your adviser can move the file into preparation, review or lodgement work.',
    };
  }
  if (label.includes('lodg') || label.includes('ready')) {
    return {
      summary: `${base} The file is being prepared for the relevant application step or final adviser checks.`,
      thiSAction: 'Checking forms, evidence and strategy before the application is moved forward.',
      clientAction: 'Respond promptly if your adviser asks for final details, signatures or updated evidence.',
      next: 'The next step is usually lodgement, submission, or a published update confirming the file has moved forward.',
    };
  }
  if (label.includes('approved') || label.includes('decision')) {
    return {
      summary: `${base} This stage records the outcome or finalisation step for the application pathway.`,
      thiSAction: 'Checking the decision details and advising on any final requirements or follow-up steps.',
      clientAction: 'Read any adviser update carefully and keep copies of important decision or visa documents.',
      next: 'Your adviser will confirm any remaining practical steps, conditions or future date reminders.',
    };
  }
  if (label.includes('instruction')) {
    return {
      summary: `${base} This stage confirms the file has been set up and Turner Hopkins has instructions to assist.`,
      thiSAction: 'Confirming the scope of work, adviser allocation and the initial pathway for your application.',
      clientAction: 'Review any instructions from your adviser and make sure your contact details remain current.',
      next: 'The next step is usually collecting documents and confirming the evidence needed for your pathway.',
    };
  }
  return {
    summary: base,
    thiSAction: 'Managing the file, checking the relevant evidence, and updating the portal when there is a client-facing change.',
    clientAction: 'Use the portal to check for outstanding items, key dates and adviser messages.',
    next: 'Your adviser will publish the next practical step when it is ready to share.',
  };
}


function ClientPortalDashboard({ snapshot, onSignOut, onRefresh, onSubmitPortalMessage, onOpenPortalDocument, portalNotice, portalError }) {
  const [activeTool, setActiveTool] = useState('weather');
  const adviserMessages = snapshot.portalMessages.filter((item) => item.messageType === 'adviser_action');
  const personalNotes = snapshot.portalMessages.filter((item) => item.messageType !== 'adviser_action');
  const documentsRequired = Array.isArray(snapshot.documentsRequired) && snapshot.documentsRequired.length ? snapshot.documentsRequired : snapshot.documentsStillRequired;
  return (
    <div className="portal-dashboard-shell">
      <header className="portal-dashboard-header portal-dashboard-header-vibrant">
        <img src={LOGO_SRC} alt="Turner Hopkins Immigration Specialists" className="portal-logo-small" />
        <div>
          <span>Turner Hopkins client portal</span>
          <h1>{snapshot.clientName}</h1>
          <p>{snapshot.matterType || 'Application update'} · Last updated {formatPortalDateTime(snapshot.lastUpdated) || 'not recorded'}</p>
        </div>
        <div className="portal-header-actions">
          <button className="btn" type="button" onClick={onRefresh}><RefreshCw size={16} />Refresh</button>
          <button className="btn ghost" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <section className="portal-hero-card portal-hero-card-vibrant">
        <div>
          <span>Current stage</span>
          <h2>{snapshot.currentStage || 'Not yet published'}</h2>
          <p>{snapshot.statusUpdate || 'No plain-English status update has been published yet.'}</p>
          <div className="portal-hero-chips">
            <b><span className="portal-hero-chip-number">{snapshot.documentsStillRequired.length}</span> Document{snapshot.documentsStillRequired.length === 1 ? '' : 's'} Still Required</b>
            <b><span className="portal-hero-chip-number">{snapshot.keyDates.length}</span> Key Date{snapshot.keyDates.length === 1 ? '' : 's'}</b>
            <b><span className="portal-hero-chip-number">{snapshot.billingMilestones.length}</span> Billing Milestone{snapshot.billingMilestones.length === 1 ? '' : 's'}</b>
            <b><span className="portal-hero-chip-number">{(snapshot.portalDocuments || []).length}</span> Form{(snapshot.portalDocuments || []).length === 1 ? '' : 's'} Published</b>
            <b><span className="portal-hero-chip-number">{(snapshot.portalResources || []).length}</span> Resource{(snapshot.portalResources || []).length === 1 ? '' : 's'} Available</b>
          </div>
        </div>
        <div className="portal-progress-dial">
          <strong>{snapshot.progressPercent}%</strong>
          <span>progress</span>
        </div>
      </section>

      {(portalNotice || portalError) && (
        <div className={`portal-feedback ${portalError ? 'error' : 'success'}`}>{portalError || portalNotice}</div>
      )}

      <div className="portal-dashboard-grid">
        <ClientPortalProgressMap stagePlan={snapshot.stagePlan || []} progressPercent={snapshot.progressPercent || 0} />

        <ClientPortalAdviserPanel snapshot={snapshot} onSubmitPortalMessage={onSubmitPortalMessage} />

        <PortalAccordionCard
          title="Document checklist"
          description="Outstanding items are shown first. Completed items are marked as obtained."
          className="wide portal-document-checklist-card"
          icon={<ListChecks size={22} />}
          defaultOpen
        >
          {documentsRequired.length ? (
            <div className="portal-document-checklist">
              {documentsRequired.map((item) => (
                <div className={`portal-document-checklist-row ${item.obtained ? 'obtained' : 'outstanding'}`} key={item.id}>
                  <span className="portal-document-check-icon">{item.obtained ? <CheckCircle2 size={17} /> : <Clock size={17} />}</span>
                  <div><strong>{item.name}</strong>{item.expiryDate && <span>Expiry: {formatPortalDate(item.expiryDate)}</span>}</div>
                  <b>{item.obtained ? 'Obtained' : 'Still required'}</b>
                </div>
              ))}
            </div>
          ) : <p>No document checklist items have been published to your portal yet.</p>}
        </PortalAccordionCard>

        <PortalAccordionCard
          title="Forms and instructions"
          description="Download the standard PDFs Turner Hopkins has made available for your application."
          className="wide portal-download-card"
          icon={<FileText size={22} />}
        >
          {(snapshot.portalDocuments || []).length ? (
            <div className="portal-document-tile-grid">
              {snapshot.portalDocuments.map((doc) => (
                <article className="portal-document-tile" key={doc.id}>
                  <div className="portal-document-tile-icon"><FileText size={24} /></div>
                  <div className="portal-document-tile-copy">
                    <strong>{doc.title}</strong>
                    <span>{[doc.category || 'PDF document', formatFileSize(doc.fileSize)].filter(Boolean).join(' · ')}</span>
                    {doc.description && <p>{doc.description}</p>}
                  </div>
                  <button className="btn mini dark" type="button" onClick={() => onOpenPortalDocument?.(doc.id)}><ExternalLink size={15} />Open PDF</button>
                </article>
              ))}
            </div>
          ) : <p>No forms or instruction PDFs have been published to your portal yet.</p>}
        </PortalAccordionCard>

        {(snapshot.portalResources || []).length > 0 && <ClientPortalResources resources={snapshot.portalResources} />}

        <PortalAccordionCard
          title="Messages and personal notes"
          description="Send Turner Hopkins a question, or keep your own planning notes beside your application update."
          className="wide portal-client-action-card"
          icon={<MessageSquare size={22} />}
        >
          <div className="portal-message-grid">
            <ClientPortalMessageComposer
              title="Send Turner Hopkins a note or action"
              description="Use this for a question, update, or item you want your adviser to see."
              buttonLabel="Send to adviser"
              messageType="adviser_action"
              onSubmit={onSubmitPortalMessage}
            />
            <ClientPortalMessageComposer
              title="My planning note"
              description="Save your own notes, reminders or plans here. These are not sent to your adviser."
              buttonLabel="Save personal note"
              messageType="client_note"
              onSubmit={onSubmitPortalMessage}
            />
          </div>
          <div className="portal-message-history-grid">
            <ClientPortalMessageList adviserMessages={adviserMessages} />
            <ClientPortalPersonalNoteList personalNotes={personalNotes} />
          </div>
        </PortalAccordionCard>

        <PortalAccordionCard title="Upcoming key dates" className="" icon={<CalendarDays size={22} />}>
          {snapshot.keyDates.length ? (
            <div className="portal-list compact">
              {snapshot.keyDates.map((item) => <div key={item.id}><strong>{formatPortalDate(item.date)}</strong><span>{item.type}{item.note ? ` — ${item.note}` : ''}</span></div>)}
            </div>
          ) : <p>No key dates have been published.</p>}
        </PortalAccordionCard>

        <PortalAccordionCard title="Upcoming appointments" className="" icon={<Clock size={22} />}>
          {snapshot.appointments.length ? (
            <div className="portal-list compact">
              {snapshot.appointments.map((item) => <div key={item.id}><strong>{formatPortalDate(item.date)} {item.time}</strong><span>{item.title}{item.location ? ` — ${item.location}` : ''}</span></div>)}
            </div>
          ) : <p>No appointments have been published.</p>}
        </PortalAccordionCard>

        <PortalAccordionCard title="Billing milestones" className="wide" icon={<CreditCard size={22} />}>
          {snapshot.billingMilestones.length ? (
            <div className="portal-list billing-portal-list">
              {snapshot.billingMilestones.map((item) => {
                const status = normaliseBillingStatus(item.status);
                const statusClass = status.toLowerCase();
                const details = [item.amount, item.dueDate ? `Date: ${formatPortalDate(item.dueDate)}` : '', item.invoiceNo ? `Invoice: ${item.invoiceNo}` : ''].filter(Boolean).join(' · ');
                return (
                  <div className={`portal-billing-row ${statusClass}`} key={item.id}>
                    <strong>{item.title}</strong>
                    <span><b className={`portal-billing-status ${statusClass}`}>{status}</b>{details ? ` · ${details}` : ''}</span>
                  </div>
                );
              })}
            </div>
          ) : <p>No billing milestones have been published.</p>}
        </PortalAccordionCard>

        <PortalAccordionCard
          title="Useful tools"
          description="Quick tools for client planning. Results are indicative only."
          className="wide portal-tools-card"
          icon={<Wrench size={22} />}
        >
          <div className="tool-tabs portal-tool-tabs" role="tablist" aria-label="Client portal tools">
            <button type="button" className={activeTool === 'weather' ? 'active' : ''} onClick={() => setActiveTool('weather')}><CloudSun size={16} />Weather</button>
            <button type="button" className={activeTool === 'timezone' ? 'active' : ''} onClick={() => setActiveTool('timezone')}><Globe2 size={16} />Time</button>
            <button type="button" className={activeTool === 'currency' ? 'active' : ''} onClick={() => setActiveTool('currency')}><DollarSign size={16} />Currency</button>
            <button type="button" className={activeTool === 'calculator' ? 'active' : ''} onClick={() => setActiveTool('calculator')}><Calculator size={16} />Calc</button>
          </div>
          <div className="portal-tool-panel">
            {activeTool === 'weather' && <WeatherTool />}
            {activeTool === 'timezone' && <TimezoneTool />}
            {activeTool === 'currency' && <CurrencyTool />}
            {activeTool === 'calculator' && <CalculatorTool />}
          </div>
        </PortalAccordionCard>

        <ClientPortalContactFooter snapshot={snapshot} />
      </div>
    </div>
  );
}


function ClientPortalContactFooter({ snapshot }) {
  const contact = snapshot.turnerHopkins || {};
  const cleanPhone = String(contact.phone || '').replace(/\s+/g, '');
  const cleanWebsite = String(contact.website || '').replace(/^https?:\/\//, '');
  return (
    <footer className="portal-contact-footer wide" aria-label="Turner Hopkins contact details">
      <div className="portal-contact-footer-head">
        <span className="portal-contact-footer-icon"><Phone size={22} /></span>
        <div>
          <h2>Contact Turner Hopkins</h2>
          <p>For questions about your application, contact your adviser or the Turner Hopkins team.</p>
        </div>
      </div>
      <div className="portal-contact-grid">
        {contact.phone && <p><Phone size={17} /><a href={`tel:${cleanPhone}`}>{contact.phone}</a></p>}
        {contact.email && <p><Mail size={17} /><a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
        {cleanWebsite && <p><Globe2 size={17} /><a href={`https://${cleanWebsite}`} target="_blank" rel="noreferrer">{cleanWebsite}</a></p>}
      </div>
      <span className="portal-last-updated">Last updated: {formatPortalDateTime(snapshot.lastUpdated) || 'Not recorded'}</span>
    </footer>
  );
}


function ClientPortalResources({ resources = [] }) {
  const visibleResources = resources
    .map((resource) => {
      const page = PORTAL_RESOURCE_PAGES.find((item) => item.key === resource.key);
      return page ? { ...page, clientNote: resource.clientNote || '' } : null;
    })
    .filter(Boolean);

  if (!visibleResources.length) return null;

  return (
    <PortalAccordionCard
      title="Resources"
      description="Your adviser has made these information pages available for your application and settlement planning."
      className="wide portal-resources-card"
      icon={<BookOpen size={22} />}
    >
      <div className="portal-resource-grid">
        {visibleResources.map((resource) => <ClientPortalResourceCard key={resource.key} resource={resource} />)}
      </div>
    </PortalAccordionCard>
  );
}

function ClientPortalResourceCard({ resource }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`portal-resource-card ${open ? 'open' : ''}`}>
      <button type="button" className="portal-resource-card-head" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span className="portal-resource-icon"><BookOpen size={20} /></span>
        <span>
          <strong>{resource.title}</strong>
          <small>{resource.audience}</small>
        </span>
        <ChevronRight size={18} />
      </button>
      <p>{resource.summary}</p>
      {resource.clientNote && <div className="portal-resource-note"><strong>Note from your adviser</strong><span>{resource.clientNote}</span></div>}
      {open && (
        <div className="portal-resource-detail">
          {(resource.sections || []).map((section) => (
            <div className="portal-resource-section" key={section.heading}>
              <h3>{section.heading}</h3>
              <p>{section.text}</p>
              {Array.isArray(section.items) && section.items.length > 0 && (
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              )}
            </div>
          ))}
          {Array.isArray(resource.links) && resource.links.length > 0 && (
            <div className="portal-resource-links">
              <h3>Useful links</h3>
              <div className="portal-resource-link-list">
                {resource.links.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    <span><ExternalLink size={15} />{link.label}</span>
                    {link.note && <small>{link.note}</small>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ClientPortalAdviserPanel({ snapshot, onSubmitPortalMessage }) {
  const [quickMode, setQuickMode] = useState('question');
  const [quickMessage, setQuickMessage] = useState('');
  const [quickSending, setQuickSending] = useState(false);
  const [quickError, setQuickError] = useState('');
  const backup = snapshot.backupAdviser?.name ? snapshot.backupAdviser : null;
  const modeLabel = quickMode === 'change' ? 'Tell us something has changed' : 'Ask your adviser a question';
  const placeholder = quickMode === 'change'
    ? 'For example: my address, passport, employment, relationship, travel plans or visa situation has changed...'
    : 'Write your question for Turner Hopkins here...';

  async function submitQuickNote(event) {
    event.preventDefault();
    const message = quickMessage.trim();
    if (!message) {
      setQuickError('Add a short note before sending.');
      return;
    }
    setQuickSending(true);
    setQuickError('');
    try {
      await onSubmitPortalMessage({ messageType: 'adviser_action', title: modeLabel, message });
      setQuickMessage('');
    } catch (err) {
      setQuickError(err.message || 'Could not send this note.');
    } finally {
      setQuickSending(false);
    }
  }

  return (
    <PortalAccordionCard
      title="Your Turner Hopkins team"
      description="Your primary adviser is shown first. Your backup adviser is included so you know who can assist if your main adviser is away."
      className="wide portal-adviser-panel-card"
      icon={<UsersRound size={22} />}
      defaultOpen
    >
      <div className="portal-adviser-panel-grid">
        <PortalAdviserContactCard adviser={snapshot.adviser} label="Primary adviser" fallbackContact={snapshot.turnerHopkins} />
        {backup ? <PortalAdviserContactCard adviser={backup} label="Backup adviser" fallbackContact={snapshot.turnerHopkins} /> : (
          <div className="portal-adviser-contact-card backup-empty">
            <strong>Backup adviser</strong>
            <p>No backup adviser has been published for this application yet. Contact the Turner Hopkins team if your adviser is unavailable.</p>
            <a className="portal-email-link" href={`mailto:${snapshot.turnerHopkins.email}`}><Mail size={15} />{snapshot.turnerHopkins.email}</a>
          </div>
        )}
        <form className="portal-quick-adviser-note" onSubmit={submitQuickNote}>
          <div className="portal-quick-note-tabs">
            <button type="button" className={quickMode === 'question' ? 'active' : ''} onClick={() => setQuickMode('question')}>Ask a question</button>
            <button type="button" className={quickMode === 'change' ? 'active' : ''} onClick={() => setQuickMode('change')}>Something changed</button>
          </div>
          <h3>{modeLabel}</h3>
          <p>This sends a note to Turner Hopkins and keeps it linked to your portal.</p>
          <textarea value={quickMessage} onChange={(event) => setQuickMessage(event.target.value)} rows={4} placeholder={placeholder} />
          {quickError && <small className="portal-inline-error">{quickError}</small>}
          <button className="btn dark" type="submit" disabled={quickSending}><Send size={15} />{quickSending ? 'Sending...' : 'Send note'}</button>
        </form>
      </div>
    </PortalAccordionCard>
  );
}

function PortalAdviserContactCard({ adviser = {}, label = 'Adviser', fallbackContact = {} }) {
  const email = adviser.email || fallbackContact.email || '';
  const phone = adviser.phone || fallbackContact.phone || '';
  const availability = adviser.availability === 'Away' ? 'Away' : 'Available';
  return (
    <article className={`portal-adviser-contact-card ${availability.toLowerCase()}`}>
      <div className="portal-adviser-card-head">
        <AdviserAvatar adviser={adviser} size="lg" />
        <div>
          <span>{label}</span>
          <strong>{adviser.name || 'Turner Hopkins adviser'}</strong>
          <b className={`portal-availability-badge ${availability.toLowerCase()}`}>{availability}</b>
        </div>
      </div>
      {email && <a className="portal-email-link" href={`mailto:${email}`}><Mail size={15} />{email}</a>}
      {phone && <p className="portal-adviser-phone"><Phone size={15} /><strong>{phone}</strong></p>}
      <small>{availability === 'Away' ? 'This adviser is away at the moment. Please use the backup adviser or Turner Hopkins team contact if your query is urgent.' : 'This adviser is available and ready to assist with your application.'}</small>
    </article>
  );
}



function ClientPortalMessageComposer({ title, description, buttonLabel, messageType, onSubmit }) {
  const [messageTitle, setMessageTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage) return setError('Add a note before saving.');
    setSending(true);
    setError('');
    try {
      await onSubmit({ messageType, title: messageTitle.trim(), message: cleanMessage });
      setMessageTitle('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Could not save this note.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="portal-message-composer" onSubmit={submit}>
      <h3>{title}</h3>
      <p>{description}</p>
      <input value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} placeholder="Optional short title" />
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Write your note here..." />
      {error && <small className="portal-inline-error">{error}</small>}
      <button className="btn dark" type="submit" disabled={sending}><Send size={15} />{sending ? 'Saving...' : buttonLabel}</button>
    </form>
  );
}

function ClientPortalMessageList({ adviserMessages = [] }) {
  const allMessages = [...adviserMessages].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8);
  return (
    <div className="portal-message-history">
      <h3>Recent messages sent to Turner Hopkins</h3>
      {allMessages.length ? allMessages.map((item) => (
        <div className="portal-message-history-row" key={item.id}>
          <span>Sent to adviser · {formatPortalDateTime(item.createdAt)}</span>
          <strong>{item.title || 'Note for Turner Hopkins'}</strong>
          <p>{item.message}</p>
        </div>
      )) : <p className="muted">No messages have been sent through the portal yet.</p>}
    </div>
  );
}

function ClientPortalPersonalNoteList({ personalNotes = [] }) {
  const allNotes = [...personalNotes].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8);
  return (
    <div className="portal-message-history personal">
      <h3>My personal planning notes</h3>
      {allNotes.length ? allNotes.map((item) => (
        <div className="portal-message-history-row personal" key={item.id}>
          <span>Saved note · {formatPortalDateTime(item.createdAt)}</span>
          <strong>{item.title || 'Personal note'}</strong>
          <p>{item.message}</p>
        </div>
      )) : <p className="muted">No personal planning notes have been saved yet.</p>}
    </div>
  );
}


function HeaderLocalSnapshot({ adviser }) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const adviserLocation = normaliseHeaderWeatherLocation(adviser);
  const timeZone = adviser?.timeZone || adviser?.timezone || 'Pacific/Auckland';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadHeaderWeather() {
      setWeatherError('');
      setWeather(null);
      try {
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(adviserLocation)}&count=1&language=en&format=json`, { signal: controller.signal });
        if (!geoResponse.ok) throw new Error('Location lookup failed');
        const geoBody = await geoResponse.json();
        const place = geoBody.results?.[0];
        if (!place) throw new Error('No weather location found');
        const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`, { signal: controller.signal });
        if (!forecastResponse.ok) throw new Error('Weather lookup failed');
        const forecast = await forecastResponse.json();
        if (!cancelled) {
          setWeather({
            location: place.name || adviserLocation,
            country: place.country || '',
            temperature: forecast.current?.temperature_2m,
            code: forecast.current?.weather_code,
          });
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') setWeatherError('Weather unavailable');
      }
    }

    loadHeaderWeather();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [adviserLocation]);

  const clockLabel = formatHeaderClock(now, timeZone);
  const locationLabel = weather?.location || adviserLocation;
  const weatherLabel = weather && Number.isFinite(Number(weather.temperature))
    ? `${Math.round(Number(weather.temperature))}°C · ${weatherCodeLabel(weather.code)}`
    : (weatherError || 'Weather loading');

  return (
    <div className="header-local-snapshot" title={`Local snapshot for ${adviser?.name || 'selected adviser'}`}>
      <div className="header-local-snapshot-row"><Clock size={15} /><strong>{clockLabel}</strong></div>
      <div className="header-local-snapshot-row weather"><CloudSun size={15} /><span>{locationLabel}: {weatherLabel}</span></div>
    </div>
  );
}

function normaliseHeaderWeatherLocation(adviser = {}) {
  const source = adviser || {};
  const value = source.weatherLocation || source.weather_location || source.city || source.officeLocation || source.office_location || source.location || '';
  return String(value || '').trim() || 'Auckland';
}

function formatHeaderClock(date, timeZone = 'Pacific/Auckland') {
  try {
    return new Intl.DateTimeFormat('en-NZ', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  } catch (_err) {
    return new Intl.DateTimeFormat('en-NZ', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  }
}

function AuthStatus({ user, adviser, accessCodeActive, onLogout }) {
  if (!user && !accessCodeActive) return null;
  const roleLabel = identityRoleLabel(user);
  return (
    <div className="auth-status" title={user?.email || 'Temporary access-code session'}>
      {user && adviser ? <AdviserAvatar adviser={adviser} size="sm" /> : <ShieldCheck size={16} />}
      <div>
        <strong>{user ? (adviser?.name || user.name || user.email || 'Logged-in user') : 'Temporary access session'}</strong>
        <span>{user ? `${roleLabel}${user.email ? ` · ${user.email}` : ''}` : 'Access code fallback active'}</span>
      </div>
      <button type="button" className="btn mini danger" onClick={onLogout}>Sign out</button>
    </div>
  );
}

function AdviserAvatar({ adviser = {}, size = 'md', className = '' }) {
  const src = adviser.profilePhotoUrl || adviser.profile_photo_url || '';
  const initials = adviserInitials(adviser.name || adviser.email || 'TH');
  return (
    <span className={`adviser-avatar adviser-avatar-${size} ${className}`.trim()} aria-label={`${adviser.name || 'Adviser'} profile photo`}>
      {src ? <img src={src} alt={`${adviser.name || 'Adviser'} profile`} /> : <b>{initials}</b>}
    </span>
  );
}

function adviserInitials(value = '') {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'TH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}


function MobileBottomNav({ activeTab, onNavigate, onOpenMore }) {
  const navItems = [
    { tab: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { tab: 'tasks', label: 'Tasks', icon: ListChecks },
    { tab: 'clients', label: 'Clients', icon: UsersRound },
    { tab: 'intake', label: 'Enquiries', icon: ClipboardList },
  ];
  const moreActive = ['billing', 'advisers', 'library', 'intake', 'bookings'].includes(activeTab);
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile CRM navigation">
      {navItems.map(({ tab, label, icon: Icon }) => (
        <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => onNavigate(tab)}>
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
      <button type="button" className={moreActive ? 'active' : ''} onClick={onOpenMore}>
        <Wrench size={18} />
        <span>More</span>
      </button>
    </nav>
  );
}

function MobileMoreSheet({ open, onClose, onNavigate, activeTab, onOpenHelp, onOpenTools, onRefresh, onAddClient, onAddAdviser, loading, canManageAdvisers, onLogout, identityUser, accessCodeActive }) {
  function go(tab) {
    onClose();
    onNavigate(tab);
  }
  return (
    <>
      <div className={`mobile-more-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`mobile-more-sheet ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="mobile-more-handle" />
        <div className="mobile-more-head">
          <div>
            <span>Mobile menu</span>
            <h2>Quick access</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close mobile menu"><X size={18} /></button>
        </div>
        <div className="mobile-more-grid">
          <button type="button" className={activeTab === 'intake' ? 'active' : ''} onClick={() => go('intake')}><ClipboardList size={18} /><span>Enquiries</span></button>
          <button type="button" className={activeTab === 'bookings' ? 'active' : ''} onClick={() => go('bookings')}><CalendarDays size={18} /><span>Bookings</span></button>
          <button type="button" className={activeTab === 'billing' ? 'active' : ''} onClick={() => go('billing')}><CreditCard size={18} /><span>Billing</span></button>
          <button type="button" className={activeTab === 'library' ? 'active' : ''} onClick={() => go('library')}><BookOpen size={18} /><span>Library</span></button>
          {canManageAdvisers && <button type="button" className={activeTab === 'advisers' ? 'active' : ''} onClick={() => go('advisers')}><UserRound size={18} /><span>Advisers</span></button>}
          <button type="button" onClick={onOpenTools}><Wrench size={18} /><span>Tools</span></button>
          <button type="button" onClick={onOpenHelp}><HelpCircle size={18} /><span>Help</span></button>
          <button type="button" onClick={onRefresh} disabled={loading}><RefreshCw size={18} /><span>Refresh</span></button>
          <button type="button" onClick={onAddClient}><Plus size={18} /><span>New client</span></button>
          {canManageAdvisers && <button type="button" onClick={onAddAdviser}><Plus size={18} /><span>New adviser</span></button>}
          {(identityUser || accessCodeActive) && <button type="button" onClick={onLogout}><LockKeyhole size={18} /><span>Sign out</span></button>}
        </div>
      </aside>
    </>
  );
}

const TOOL_CURRENCIES = ['NZD', 'AUD', 'USD', 'GBP', 'EUR', 'CAD', 'CNY', 'INR', 'PHP', 'ZAR', 'JPY', 'SGD'];
const TOOL_TIMEZONES = [
  { value: 'Pacific/Auckland', label: 'Auckland, New Zealand' },
  { value: 'Australia/Sydney', label: 'Sydney, Australia' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Shanghai', label: 'China' },
  { value: 'Asia/Kolkata', label: 'India' },
  { value: 'Asia/Manila', label: 'Philippines' },
  { value: 'Europe/London', label: 'London, United Kingdom' },
  { value: 'Europe/Berlin', label: 'Central Europe' },
  { value: 'Africa/Johannesburg', label: 'South Africa' },
  { value: 'America/Vancouver', label: 'Vancouver, Canada' },
  { value: 'America/Los_Angeles', label: 'Los Angeles, USA' },
  { value: 'America/New_York', label: 'New York, USA' },
];

function ToolsDrawer({ open, onOpen, onClose, onOpenHelp, onRefresh, loading = false, sendTestEmail, saveEmailTemplate, resetEmailTemplate, emailLogs = [], emailTemplates = [], emailConfig = {}, saving = false }) {
  const [activeTool, setActiveTool] = useState('weather');
  const [emailLogOpen, setEmailLogOpen] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);

  return (
    <>
      <button className="tools-fab" type="button" onClick={onOpen} style={{ display: open ? 'none' : undefined }} aria-label="Open adviser tools">
        <Wrench size={18} /> Tools
      </button>
      <div className={`tools-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`tools-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="support-head">
          <div>
            <span>Adviser tools</span>
            <h2>Working tools</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close adviser tools"><X size={18} /></button>
        </div>
        <p className="support-summary">Quick tools for client calls, international client work and day-to-day file work. Email logs and email templates open in separate review windows.</p>
        <div className="tool-tabs" role="tablist" aria-label="Adviser tools">
          <button type="button" className={activeTool === 'weather' ? 'active' : ''} onClick={() => setActiveTool('weather')}><CloudSun size={16} />Weather</button>
          <button type="button" className={activeTool === 'timezone' ? 'active' : ''} onClick={() => setActiveTool('timezone')}><Globe2 size={16} />Time</button>
          <button type="button" className={activeTool === 'currency' ? 'active' : ''} onClick={() => setActiveTool('currency')}><DollarSign size={16} />Currency</button>
          <button type="button" className={activeTool === 'calculator' ? 'active' : ''} onClick={() => setActiveTool('calculator')}><Calculator size={16} />Calc</button>
          <button type="button" onClick={onOpenHelp}><HelpCircle size={16} />Help</button>
          <button type="button" onClick={onRefresh} disabled={loading}><RefreshCw size={16} />Refresh</button>
          <button type="button" onClick={() => setTemplateEditorOpen(true)}><Mail size={16} />Templates</button>
          <button type="button" onClick={() => setEmailLogOpen(true)}><Mail size={16} />Email log</button>
        </div>
        <div className="tool-panel">
          {activeTool === 'weather' && <WeatherTool />}
          {activeTool === 'timezone' && <TimezoneTool />}
          {activeTool === 'currency' && <CurrencyTool />}
          {activeTool === 'calculator' && <CalculatorTool />}
        </div>
      </aside>
      <EmailTemplateLightbox open={templateEditorOpen} onClose={() => setTemplateEditorOpen(false)} emailTemplates={emailTemplates} saveEmailTemplate={saveEmailTemplate} resetEmailTemplate={resetEmailTemplate} sendTestEmail={sendTestEmail} emailConfig={emailConfig} saving={saving} />
      <EmailLogLightbox open={emailLogOpen} onClose={() => setEmailLogOpen(false)} sendTestEmail={sendTestEmail} saveEmailTemplate={saveEmailTemplate} resetEmailTemplate={resetEmailTemplate} emailLogs={emailLogs} emailConfig={emailConfig} saving={saving} />
    </>
  );
}


function EmailTemplateLightbox({ open, onClose, emailTemplates = [], saveEmailTemplate, resetEmailTemplate, sendTestEmail, emailConfig = {}, saving = false }) {
  const sortedTemplates = useMemo(() => [...(emailTemplates || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [emailTemplates]);
  const [selectedKey, setSelectedKey] = useState('');
  const selected = sortedTemplates.find((template) => template.key === selectedKey) || sortedTemplates[0] || null;
  const [draft, setDraft] = useState({ subject: '', bodyText: '', bodyHtml: '' });
  const [editorMode, setEditorMode] = useState('design');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testError, setTestError] = useState('');
  const [testResult, setTestResult] = useState(null);
  const editorRef = useRef(null);
  const editorHtmlRef = useRef('');

  useEffect(() => {
    if (!sortedTemplates.length) {
      if (selectedKey) setSelectedKey('');
      return;
    }
    if (!selectedKey || !sortedTemplates.some((template) => template.key === selectedKey)) {
      setSelectedKey(sortedTemplates[0].key);
    }
  }, [selectedKey, sortedTemplates]);

  useEffect(() => {
    if (selected) {
      const bodyHtml = resolveTemplateEditorHtml(selected);
      editorHtmlRef.current = bodyHtml;
      setDraft({ subject: selected.subject || '', bodyText: selected.bodyText || htmlToTemplateText(bodyHtml), bodyHtml });
      setEditorMode('design');
      setMessage('');
      setError('');
      setTestMessage('');
      setTestError('');
      setTestResult(null);
      window.requestAnimationFrame?.(() => {
        if (editorRef.current && editorRef.current.innerHTML !== bodyHtml) {
          editorRef.current.innerHTML = bodyHtml || '<p><br></p>';
        }
      });
    }
  }, [selected?.key, selected?.subject, selected?.bodyText, selected?.bodyHtml]);

  useEffect(() => {
    if (editorMode === 'design' && editorRef.current) {
      const nextHtml = editorHtmlRef.current || draft.bodyHtml || '<p><br></p>';
      if (editorRef.current.innerHTML !== nextHtml) {
        editorRef.current.innerHTML = nextHtml;
      }
    }
  }, [selected?.key, editorMode]);

  const configured = Boolean(emailConfig?.configured);
  const sampleData = useMemo(
    () => buildEmailTemplateSampleData(selected?.key || '', selected?.placeholders || []),
    [selected?.key, (selected?.placeholders || []).join('|')]
  );
  const activeTemplateHtml = draft.bodyHtml || editorHtmlRef.current || '';
  const previewSubject = useMemo(() => renderTemplatePreviewText(draft.subject || '', sampleData), [draft.subject, sampleData]);
  const previewHtml = useMemo(() => renderTemplatePreviewText(activeTemplateHtml || '<p><br></p>', sampleData), [activeTemplateHtml, sampleData]);
  const unresolvedPlaceholders = useMemo(() => findTemplatePlaceholders(`${draft.subject || ''} ${activeTemplateHtml || ''}`).filter((placeholder) => !(placeholder in sampleData)), [draft.subject, activeTemplateHtml, sampleData]);

  function currentHtml() {
    if (editorMode === 'design' && editorRef.current) return editorRef.current.innerHTML || '';
    return editorHtmlRef.current || draft.bodyHtml || '';
  }

  function updateBodyHtml(html) {
    editorHtmlRef.current = html;
    setDraft((current) => ({ ...current, bodyHtml: html, bodyText: htmlToTemplateText(html) }));
  }

  function switchEditorMode(nextMode) {
    if (editorMode === 'design' && editorRef.current) updateBodyHtml(editorRef.current.innerHTML || '');
    setEditorMode(nextMode);
  }

  function format(command, value = null) {
    if (editorMode !== 'design') return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateBodyHtml(editorRef.current?.innerHTML || '');
  }

  function addLink() {
    if (editorMode !== 'design') return;
    const url = window.prompt('Enter the link URL');
    if (!url) return;
    editorRef.current?.focus();
    document.execCommand('createLink', false, url);
    updateBodyHtml(editorRef.current?.innerHTML || '');
  }

  function insertPlaceholder(placeholder) {
    const token = `{{${placeholder}}}`;
    if (editorMode === 'design') {
      editorRef.current?.focus();
      document.execCommand('insertText', false, token);
      updateBodyHtml(editorRef.current?.innerHTML || '');
      return;
    }
    updateBodyHtml(`${draft.bodyHtml || ''}${token}`);
  }

  async function submit(event) {
    event.preventDefault();
    if (!selected) return;
    setMessage('');
    setError('');
    const bodyHtml = currentHtml();
    const bodyText = htmlToTemplateText(bodyHtml);
    try {
      const body = await saveEmailTemplate?.({ key: selected.key, subject: draft.subject, bodyText, bodyHtml });
      if (body?.emailTemplate) {
        const savedHtml = body.emailTemplate.bodyHtml || textTemplateToEditorHtml(body.emailTemplate.bodyText || bodyText);
        editorHtmlRef.current = savedHtml;
        setDraft({ subject: body.emailTemplate.subject || draft.subject, bodyText: body.emailTemplate.bodyText || bodyText, bodyHtml: savedHtml });
        if (editorRef.current) editorRef.current.innerHTML = savedHtml;
      }
      setMessage('Template saved. Future emails will use this wording and styling.');
    } catch (err) {
      setError(err?.message || 'Template could not be saved.');
    }
  }

  async function resetTemplate() {
    if (!selected) return;
    if (!window.confirm(`Reset ${selected.name || selected.key} to the system default wording?`)) return;
    setMessage('');
    setError('');
    try {
      const body = await resetEmailTemplate?.(selected.key);
      if (body?.emailTemplate) {
        const bodyHtml = body.emailTemplate.bodyHtml || textTemplateToEditorHtml(body.emailTemplate.bodyText || '');
        editorHtmlRef.current = bodyHtml;
        setDraft({ subject: body.emailTemplate.subject || '', bodyText: body.emailTemplate.bodyText || '', bodyHtml });
        if (editorRef.current) editorRef.current.innerHTML = bodyHtml;
      }
      setMessage('Template reset to the system default.');
    } catch (err) {
      setError(err?.message || 'Template could not be reset.');
    }
  }


  async function sendTemplateTest(event) {
    event.preventDefault();
    if (!selected) return;
    setTestMessage('');
    setTestError('');
    setTestResult(null);
    if (!testEmail.trim()) {
      setTestError('Enter a test recipient email address.');
      return;
    }
    const bodyHtml = currentHtml();
    const renderedHtml = renderTemplatePreviewText(bodyHtml || '<p><br></p>', sampleData);
    const renderedSubject = renderTemplatePreviewText(draft.subject || selected.subject || 'THiS CRM template preview', sampleData).trim() || 'THiS CRM template preview';
    const renderedText = htmlToTemplateText(renderedHtml);
    try {
      const response = await sendTestEmail?.({
        toEmail: testEmail,
        subject: renderedSubject,
        message: renderedText,
        bodyText: renderedText,
        bodyHtml: templatePreviewHtml(renderedHtml),
        templateKey: selected.key,
      });
      setTestResult(response?.emailLog || { status: 'Sent', toEmail: testEmail, subject: renderedSubject });
      setTestMessage('Preview test sent. Check the inbox and the email log before using this wording with clients.');
    } catch (err) {
      setTestError(err?.message || 'Template preview test could not be sent.');
    }
  }

  if (!open) return null;

  return (
    <div className="modal-layer email-template-modal-layer">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card email-template-modal">
        <div className="modal-head">
          <div>
            <span>Tools</span>
            <h2>Email template editor</h2>
            <p className="muted">Edit standard CRM email wording and formatting. Placeholders in braces are replaced automatically when emails are sent.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close email template editor"><X size={18} /></button>
        </div>

        {!sortedTemplates.length && (
          <section className="tool-result-card">
            <strong>No templates loaded</strong>
            <span>Refresh the CRM after deployment. The CRM will create the default templates automatically.</span>
          </section>
        )}

        {!!sortedTemplates.length && (
          <div className="email-template-modal-grid">
            <aside className="email-template-modal-list" aria-label="Email templates">
              {sortedTemplates.map((template) => (
                <button key={template.key} type="button" className={selected?.key === template.key ? 'active' : ''} onClick={() => setSelectedKey(template.key)}>
                  <strong>{template.name || emailTemplateLabel(template.key)}</strong>
                  <span>{template.description || template.key}</span>
                  {template.updatedAt && <small>Updated {formatDateTime(template.updatedAt)}</small>}
                </button>
              ))}
            </aside>

            {selected && (
              <form className="email-template-modal-editor" onSubmit={submit}>
                <div className="split template-editor-title-row">
                  <div>
                    <strong>{selected.name || emailTemplateLabel(selected.key)}</strong>
                    <span>{selected.description}</span>
                  </div>
                  <button className="btn mini" type="button" onClick={resetTemplate} disabled={saving}><RefreshCw size={14} />Reset to default</button>
                </div>

                <label>Subject
                  <input value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} />
                </label>

                <div className="template-placeholder-panel compact">
                  <strong>Available placeholders</strong>
                  <div>
                    {(selected.placeholders || []).map((placeholder) => (
                      <button key={placeholder} className="placeholder-token" type="button" onClick={() => insertPlaceholder(placeholder)}>{`{{${placeholder}}}`}</button>
                    ))}
                  </div>
                </div>

                <div className="template-sample-panel">
                  <div className="split compact-row">
                    <div>
                      <strong>Preview sample data</strong>
                      <span>Used only for preview and test sends. Live emails still use the real CRM record.</span>
                    </div>
                    {unresolvedPlaceholders.length > 0 && <span className="status-chip warning">{unresolvedPlaceholders.length} unresolved</span>}
                  </div>
                  <div className="template-sample-grid">
                    {(selected.placeholders || []).slice(0, 8).map((placeholder) => (
                      <span key={placeholder}><b>{placeholder}</b>{sampleData[placeholder] || 'Sample not set'}</span>
                    ))}
                  </div>
                </div>

                <div className="html-editor-shell">
                  <div className="html-editor-topbar">
                    <div className="html-editor-mode-tabs" role="tablist" aria-label="Template editor mode">
                      <button type="button" className={editorMode === 'design' ? 'active' : ''} onClick={() => switchEditorMode('design')}>Design</button>
                      <button type="button" className={editorMode === 'html' ? 'active' : ''} onClick={() => switchEditorMode('html')}>HTML</button>
                      <button type="button" className={editorMode === 'preview' ? 'active' : ''} onClick={() => switchEditorMode('preview')}>Preview</button>
                    </div>
                    {editorMode === 'design' && (
                      <div className="html-editor-toolbar" aria-label="Text formatting">
                        <button type="button" onClick={() => format('bold')}><b>B</b></button>
                        <button type="button" onClick={() => format('italic')}><i>I</i></button>
                        <button type="button" onClick={() => format('underline')}><u>U</u></button>
                        <button type="button" onClick={() => format('insertUnorderedList')}>Bullets</button>
                        <button type="button" onClick={() => format('insertOrderedList')}>Numbered</button>
                        <button type="button" onClick={addLink}>Link</button>
                        <button type="button" onClick={() => format('removeFormat')}>Clear</button>
                      </div>
                    )}
                  </div>

                  {editorMode === 'design' && (
                    <div
                      key={`design-editor-${selected.key}`}
                      ref={editorRef}
                      className="html-template-editor"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => updateBodyHtml(editorRef.current?.innerHTML || '')}
                      onBlur={() => updateBodyHtml(editorRef.current?.innerHTML || '')}
                    />
                  )}

                  {editorMode === 'html' && (
                    <textarea
                      className="html-template-source"
                      value={draft.bodyHtml}
                      onChange={(event) => updateBodyHtml(event.target.value)}
                      spellCheck="false"
                    />
                  )}

                  {editorMode === 'preview' && (
                    <div className="template-rendered-preview">
                      <div className="email-preview-subject">
                        <span>Rendered subject</span>
                        <strong>{previewSubject || 'No subject'}</strong>
                      </div>
                      <div className="html-template-preview" dangerouslySetInnerHTML={{ __html: templatePreviewHtml(previewHtml) }} />
                    </div>
                  )}
                </div>

                <p className="tool-muted">Use placeholders where CRM values need to be inserted. The rendered preview uses sample values so advisers can check the real structure before sending.</p>

                <section className="template-send-test-panel">
                  <div className="split compact-row">
                    <div>
                      <strong>Send this preview as a test</strong>
                      <span>Uses the sample data shown above and logs the test in Tools &gt; Email log.</span>
                    </div>
                    <span className={`status-chip ${configured ? 'ok' : 'warning'}`}>{configured ? 'Mailbox configured' : 'Mailbox not configured'}</span>
                  </div>
                  {!configured && <p className="error-text">Microsoft email environment variables are not fully configured in Netlify.</p>}
                  <div className="template-test-row">
                    <label>Test recipient email
                      <input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="name@example.com" type="email" />
                    </label>
                    <button className="btn" type="button" onClick={sendTemplateTest} disabled={saving || !configured}><Send size={16} />{saving ? 'Sending...' : 'Send preview test'}</button>
                  </div>
                  {testError && <div className="error-banner"><AlertTriangle size={16} />{testError}</div>}
                  {testMessage && <div className="success-banner"><CheckCircle2 size={16} />{testMessage}</div>}
                  {testResult && <small className="muted">Last test: {testResult.status || 'Logged'} · {testResult.toEmail || testEmail}</small>}
                </section>

                {message && <div className="success-banner"><CheckCircle2 size={16} />{message}</div>}
                {error && <div className="error-banner"><AlertTriangle size={16} />{error}</div>}
                <div className="form-actions right">
                  <button className="btn dark" type="submit" disabled={saving}><Save size={16} />{saving ? 'Saving...' : 'Save template'}</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function buildEmailTemplateSampleData(templateKey = '', placeholders = []) {
  const common = {
    firstName: 'Sarah',
    applicantName: 'Sarah Patel',
    email: 'sarah.patel@example.com',
    phone: '+64 21 555 0100',
    submitted: '1 July 2026, 10:30 am',
    flagLine: 'Flags: work pathway, partner included, documents pending',
    flags: 'work pathway, partner included, documents pending',
    summary: 'Citizenship: India\nCurrent location: Auckland\nGoal: Skilled residence pathway\nCurrent visa: Accredited Employer Work Visa\nNotes: Wants advice on residence timing and partner inclusion.',
    allocatedTo: 'Paul Janssen',
    adviserEmail: 'paul.janssen@turnerhopkins.co.nz',
    assessmentFormUrl: 'https://www.turnerhopkinsimmigration.co.nz/assessment',
    bookingLink: 'https://thisvisacrm.netlify.app/book?token=sample-preview',
    portalLink: 'https://thisvisacrm.netlify.app/portal',
    portalEmail: 'sarah.patel@example.com',
    accessCode: 'TH-48291',
    seminarTitle: 'Moving to New Zealand: Skilled Migration Pathways',
    presenterName: 'Paul Janssen',
    nzTime: 'Thursday, 16 July 2026, 6:00 pm NZST',
    localTime: 'Thursday, 16 July 2026, 11:30 am IST',
    zoomLink: 'https://zoom.us/j/sample-preview',
    zoomPassword: 'THNZ2026',
    registrantFullName: 'Sarah Patel',
    registrantEmail: 'sarah.patel@example.com',
    seminarDateTime: 'Thursday, 16 July 2026 at 6:00 pm NZ time',
    dateOfBirth: '12 March 1988',
    citizenshipCountry: 'India',
    residenceCountry: 'India',
    registrantTimezone: 'Asia/Kolkata',
    partnershipStatus: 'Married / de facto partner',
    highestQualification: 'Bachelor degree',
    currentOccupation: 'Software engineer',
    englishAbility: 'Strong professional English',
    workHistory: '8 years in software engineering and team leadership.',
    healthCharacterIssues: 'No health or character issues declared.',
    registrationId: 'sample-registration-id',
    feedbackId: 'sample-feedback-id',
    adviserName: 'Paul Janssen',
    applicationType: 'Skilled Migrant Category Residence',
    overallRating: 'Excellent',
    recommendationRating: '10',
    permissionToContact: 'Yes',
    permissionToUseFeedback: 'Yes',
    serviceStrengths: 'Clear advice, realistic expectations and calm guidance through a technical process.',
    improvementSuggestions: 'No improvement suggestions recorded.',
    recipientEmail: 'sarah.patel@example.com',
    pathwayName: 'Skilled Work Experience pathway',
    headline: 'Potentially meets the work-experience components',
    statusLabel: 'Indicative pass',
    applicationDate: '14 March 2027',
    consultationLink: 'https://www.turnerhopkinsimmigration.co.nz/visa-consultation',
    calculatorUrl: 'https://thisvisacrm.netlify.app/smc-work-experience-calculator.html',
    workPeriods: 'NZ skilled pay period 1: 13 June 2023 to 12 June 2025; New Zealand; skill level 2; estimated hourly rate $33.00 per hour; 40 guaranteed hours.\nOverseas directly relevant period: 1 January 2020 to 1 January 2023; Overseas; skill level 2; estimated hourly rate $20.00 per hour; 40 guaranteed hours.',
  };
  const values = { ...common };
  for (const placeholder of placeholders || []) {
    if (!(placeholder in values)) values[placeholder] = sampleValueForPlaceholder(placeholder, templateKey);
  }
  return values;
}

function sampleValueForPlaceholder(placeholder = '', templateKey = '') {
  const key = String(placeholder || '').toLowerCase();
  if (key.includes('email')) return 'sarah.patel@example.com';
  if (key.includes('phone') || key.includes('mobile')) return '+64 21 555 0100';
  if (key.includes('name')) return key.includes('adviser') ? 'Paul Janssen' : 'Sarah Patel';
  if (key.includes('date') || key.includes('time') || key.includes('submitted')) return '1 July 2026, 10:30 am';
  if (key.includes('link') || key.includes('url')) return 'https://thisvisacrm.netlify.app/sample';
  if (key.includes('summary')) return 'Sample summary line one\nSample summary line two';
  if (key.includes('rating') || key.includes('score')) return '10';
  return `Sample ${placeholder}`;
}

function findTemplatePlaceholders(value = '') {
  const found = new Set();
  String(value || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    found.add(key);
    return '';
  });
  return Array.from(found);
}

function renderTemplatePreviewText(value = '', context = {}) {
  return String(value || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(context, key)) return context[key] == null ? '' : String(context[key]);
    return `{{${key}}}`;
  });
}

function resolveTemplateEditorHtml(template = {}) {
  const bodyHtml = template.bodyHtml || template.body_html || '';
  if (hasMeaningfulTemplateHtml(bodyHtml)) return bodyHtml;
  const bodyText = template.bodyText || template.body_text || '';
  if (String(bodyText || '').trim()) return textTemplateToEditorHtml(bodyText);
  return '<p><br></p>';
}


function hasMeaningfulTemplateHtml(html = '') {
  const text = String(html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
  return Boolean(text);
}

function textTemplateToEditorHtml(value = '') {
  const text = String(value || '').trim();
  if (!text) return '<p><br></p>';
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtmlForEditor(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function htmlToTemplateText(html = '') {
  if (typeof document === 'undefined') return String(html || '').replace(/<[^>]+>/g, '').trim();
  const container = document.createElement('div');
  container.innerHTML = html || '';
  container.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  container.querySelectorAll('p, div, li, h1, h2, h3, h4').forEach((node) => {
    node.appendChild(document.createTextNode('\n'));
  });
  return (container.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

function templatePreviewHtml(html = '') {
  return `<div style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.35; color: #1f2933;">${sanitiseTemplatePreviewHtml(html || '<p><br></p>')}</div>`;
}

function sanitiseTemplatePreviewHtml(html = '') {
  if (typeof document === 'undefined') return '';
  const container = document.createElement('div');
  container.innerHTML = html || '';
  container.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((node) => node.remove());
  container.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || '').trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) node.removeAttribute(attr.name);
    });
  });
  return container.innerHTML;
}

function escapeHtmlForEditor(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function EmailLogLightbox({ open, onClose, sendTestEmail, emailLogs = [], emailConfig = {}, saving = false }) {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('THiS CRM test email');
  const [message, setMessage] = useState('This is a test email sent from THiS CRM through the Turner Hopkins Microsoft 365 mailbox.');
  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const configured = Boolean(emailConfig?.configured);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setLocalError('');
      setSelectedLog(null);
    }
  }, [open]);

  const logs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...emailLogs].filter((log) => {
      const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
      const typeLabel = emailTemplateLabel(log.templateKey);
      const matchesType = typeFilter === 'All' || typeLabel === typeFilter;
      const haystack = `${log.toEmail} ${log.cc} ${log.subject} ${log.templateKey} ${log.status}`.toLowerCase();
      return matchesStatus && matchesType && (!term || haystack.includes(term));
    });
  }, [emailLogs, statusFilter, typeFilter, search]);

  const typeOptions = useMemo(() => ['All', ...Array.from(new Set((emailLogs || []).map((log) => emailTemplateLabel(log.templateKey))))], [emailLogs]);

  async function submit(event) {
    event.preventDefault();
    setLocalError('');
    setResult(null);
    if (!toEmail.trim()) {
      setLocalError('Enter a test recipient email address.');
      return;
    }
    try {
      const response = await sendTestEmail({ toEmail, subject, message });
      setResult(response.emailLog || { status: 'Sent', toEmail, subject });
    } catch (error) {
      setLocalError(error?.message || 'The test email could not be sent.');
    }
  }

  if (!open) return null;

  return (
    <div className="modal-layer email-log-modal-layer">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card email-log-modal">
        <div className="modal-head">
          <div>
            <span>Tools</span>
            <h2>Email log and testing</h2>
            <p className="muted">Review CRM-sent emails, resend test messages and check failures. Logs are retained for 60 days.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close email log"><X size={18} /></button>
        </div>

        <div className="email-log-grid">
          <section className="tool-result-card email-test-panel">
            <div className="split">
              <div>
                <strong>Send test email</strong>
                <span>Use this to confirm the Microsoft 365 sending mailbox is working.</span>
              </div>
              <span className={`status-chip ${configured ? 'ok' : 'warning'}`}>{configured ? 'Configured' : 'Not configured'}</span>
            </div>
            <p className="muted">Sending mailbox: <b>{emailConfig?.fromName || 'Turner Hopkins Immigration Specialists'}</b>{emailConfig?.fromEmail ? ` <${emailConfig.fromEmail}>` : ''}</p>
            {!configured && <p className="error-text">Microsoft email environment variables are not fully configured in Netlify.</p>}
            <form className="tool-form" onSubmit={submit}>
              <label>Test recipient email
                <input value={toEmail} onChange={(event) => setToEmail(event.target.value)} placeholder="name@example.com" type="email" />
              </label>
              <label>Subject
                <input value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>
              <label>Message
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} />
              </label>
              <button className="btn dark" type="submit" disabled={saving || !configured}><Send size={16} />{saving ? 'Sending...' : 'Send test email'}</button>
            </form>
            {localError && <div className="error-banner"><AlertTriangle size={16} />{localError}</div>}
            {result && (
              <div className={`tool-result-card ${result.status === 'Failed' ? 'warning' : ''}`}>
                <strong>{result.status === 'Failed' ? 'Email failed' : 'Email sent'}</strong>
                <span>{result.subject || subject}</span>
                {result.failureMessage && <small>{result.failureMessage}</small>}
              </div>
            )}
          </section>

          <section className="tool-result-card email-log-panel">
            <div className="split">
              <div>
                <strong>Email log</strong>
                <span>{logs.length} shown · {emailLogs.length} retained</span>
              </div>
              <span className="count-pill">60 days</span>
            </div>
            <div className="email-log-filters">
              <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Sent</option><option>Failed</option><option>Sending</option><option>Draft</option></select></label>
              <label>Type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>{typeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Recipient, subject, type..." /></label>
            </div>
            <div className="email-log-table">
              {!logs.length && <p className="muted center">No email logs match the current filters.</p>}
              {logs.map((log) => (
                <button className="email-log-entry" type="button" key={log.id} onClick={() => setSelectedLog(log)}>
                  <span className={`status-chip ${log.status === 'Sent' ? 'ok' : log.status === 'Failed' ? 'warning' : ''}`}>{log.status || 'Unknown'}</span>
                  <span><b>{emailTemplateLabel(log.templateKey)}</b><small>{formatDateTime(log.sentAt || log.failedAt || log.createdAt)} · {log.toEmail}</small></span>
                  <strong>{log.subject || 'No subject'}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>

        {selectedLog && (
          <div className="email-log-detail">
            <div className="split">
              <strong>{selectedLog.subject || 'No subject'}</strong>
              <button className="btn mini" type="button" onClick={() => setSelectedLog(null)}>Close detail</button>
            </div>
            <dl>
              <dt>Status</dt><dd>{selectedLog.status}</dd>
              <dt>Type</dt><dd>{emailTemplateLabel(selectedLog.templateKey)}</dd>
              <dt>To</dt><dd>{selectedLog.toEmail || 'Not recorded'}</dd>
              <dt>CC</dt><dd>{selectedLog.cc || 'None'}</dd>
              <dt>Sent by</dt><dd>{selectedLog.sentBy || 'CRM'}</dd>
              <dt>Date</dt><dd>{formatDateTime(selectedLog.sentAt || selectedLog.failedAt || selectedLog.createdAt)}</dd>
            </dl>
            {selectedLog.failureMessage && <p className="error-text">{selectedLog.failureMessage}</p>}
            {selectedLog.bodyText && <pre>{selectedLog.bodyText}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}

function emailTemplateLabel(key = '') {
  const labels = {
    test: 'Test',
    contact_intake_invite: 'Contact assessment invite',
    assessment_form_internal_notification: 'Assessment form notification',
    contact_form_internal_notification: 'Contact form notification',
    new_intake_adviser_notification: 'Legacy contact/intake notification',
    intake_approve: 'Assessment next steps',
    intake_decline: 'Assessment not suitable',
    portal_access: 'Portal access',
    seminar_approve: 'Seminar approval',
    seminar_decline: 'Seminar decline',
    seminar_new_registration: 'Seminar notification',
    feedback_internal_notification: 'Feedback notification',
    smc_calculator_result: 'SMC calculator result',
    smc_calculator_internal_notification: 'SMC calculator notification',
  };
  return labels[key] || String(key || 'Other').replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase());
}

function WeatherTool() {
  const [location, setLocation] = useState('Auckland');
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  async function lookupWeather(event) {
    event?.preventDefault();
    const query = location.trim();
    if (!query) return setWeatherError('Enter a city or town.');
    setLoadingWeather(true);
    setWeatherError('');
    setWeather(null);
    try {
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!geoResponse.ok) throw new Error('Location lookup failed.');
      const geoBody = await geoResponse.json();
      const place = geoBody.results?.[0];
      if (!place) throw new Error('No matching location found.');
      const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`);
      if (!forecastResponse.ok) throw new Error('Weather lookup failed.');
      const forecast = await forecastResponse.json();
      setWeather({ place, forecast });
    } catch (err) {
      setWeatherError(err.message || 'Weather lookup failed.');
    } finally {
      setLoadingWeather(false);
    }
  }

  return (
    <section className="tool-card">
      <div className="tool-card-head">
        <CloudSun size={20} />
        <div>
          <h3>Weather</h3>
          <p>Check current conditions and a short forecast for a client location.</p>
        </div>
      </div>
      <form className="tool-form" onSubmit={lookupWeather}>
        <label>
          <span>Location</span>
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Auckland, London, Manila..." />
        </label>
        <button className="btn dark" type="submit" disabled={loadingWeather}>{loadingWeather ? 'Checking...' : 'Check weather'}</button>
      </form>
      {weatherError && <div className="tool-error">{weatherError}</div>}
      {weather && (
        <div className="weather-result">
          <div className="weather-current">
            <span>{weather.place.name}{weather.place.country ? `, ${weather.place.country}` : ''}</span>
            <strong>{Math.round(weather.forecast.current.temperature_2m)}°C</strong>
            <small>{weatherCodeLabel(weather.forecast.current.weather_code)} · Feels like {Math.round(weather.forecast.current.apparent_temperature)}°C · Wind {Math.round(weather.forecast.current.wind_speed_10m)} km/h</small>
          </div>
          <div className="weather-days">
            {(weather.forecast.daily?.time || []).slice(0, 5).map((date, index) => (
              <div className="weather-day" key={date}>
                <strong>{formatShortDate(date)}</strong>
                <span>{Math.round(weather.forecast.daily.temperature_2m_min[index])}° / {Math.round(weather.forecast.daily.temperature_2m_max[index])}°C</span>
                <small>{weatherCodeLabel(weather.forecast.daily.weather_code[index])}</small>
                <small>Rain {weather.forecast.daily.precipitation_probability_max[index] ?? 0}%</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TimezoneTool() {
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('09:00');
  const [fromZone, setFromZone] = useState('Pacific/Auckland');
  const [toZone, setToZone] = useState('Europe/London');
  const convertedInstant = useMemo(() => zonedWallTimeToInstant(date, time, fromZone), [date, time, fromZone]);

  return (
    <section className="tool-card">
      <div className="tool-card-head">
        <Globe2 size={20} />
        <div>
          <h3>Timezone converter</h3>
          <p>Convert appointment or call times between New Zealand and client locations.</p>
        </div>
      </div>
      <div className="tool-grid two">
        <label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label><span>Time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        <label><span>From</span><select value={fromZone} onChange={(event) => setFromZone(event.target.value)}>{TOOL_TIMEZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></label>
        <label><span>To</span><select value={toZone} onChange={(event) => setToZone(event.target.value)}>{TOOL_TIMEZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></label>
      </div>
      <div className="conversion-result">
        <span>Converted time</span>
        <strong>{convertedInstant ? formatInZone(convertedInstant, toZone) : 'Enter a valid date and time'}</strong>
        {convertedInstant && <small>{formatZoneName(toZone)} · Source: {formatInZone(convertedInstant, fromZone)}</small>}
      </div>
    </section>
  );
}

function CurrencyTool() {
  const [amount, setAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('NZD');
  const [toCurrency, setToCurrency] = useState('USD');
  const [currencyResult, setCurrencyResult] = useState(null);
  const [loadingCurrency, setLoadingCurrency] = useState(false);
  const [currencyError, setCurrencyError] = useState('');

  async function convertCurrency(event) {
    event?.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setCurrencyError('Enter an amount greater than zero.');
    setLoadingCurrency(true);
    setCurrencyError('');
    setCurrencyResult(null);
    try {
      if (fromCurrency === toCurrency) {
        setCurrencyResult({ amount: value, converted: value, rate: 1, date: todayIso() });
        return;
      }
      const response = await fetch(`/.netlify/functions/currency?amount=${encodeURIComponent(value)}&from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`, { credentials: 'same-origin' });
      const body = await readJsonResponse(response);
      if (!response.ok || !body?.ok) throw new Error(body?.error || 'Currency lookup failed.');
      setCurrencyResult({ amount: body.amount, converted: body.converted, rate: body.rate, date: body.date, source: body.source });
    } catch (err) {
      setCurrencyError(err.message || 'Currency lookup failed. Try again later.');
    } finally {
      setLoadingCurrency(false);
    }
  }

  return (
    <section className="tool-card">
      <div className="tool-card-head">
        <DollarSign size={20} />
        <div>
          <h3>Currency converter</h3>
          <p>Quick indicative conversion for fees, investment funds or settlement planning.</p>
        </div>
      </div>
      <form className="tool-form" onSubmit={convertCurrency}>
        <div className="tool-grid three">
          <label><span>Amount</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /></label>
          <label><span>From</span><select value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value)}>{TOOL_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
          <label><span>To</span><select value={toCurrency} onChange={(event) => setToCurrency(event.target.value)}>{TOOL_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
        </div>
        <button className="btn dark" type="submit" disabled={loadingCurrency}>{loadingCurrency ? 'Converting...' : 'Convert'}</button>
      </form>
      {currencyError && <div className="tool-error">{currencyError}</div>}
      {currencyResult && (
        <div className="conversion-result">
          <span>Converted amount</span>
          <strong>{formatCurrencyAmount(currencyResult.converted, toCurrency)}</strong>
          <small>{formatCurrencyAmount(currencyResult.amount, fromCurrency)} · 1 {fromCurrency} = {currencyResult.rate.toFixed(4)} {toCurrency} · Rate date {currencyResult.date}{currencyResult.source ? ` · ${currencyResult.source}` : ''}</small>
        </div>
      )}
      <p className="tool-muted">Indicative only. Confirm exchange rates before quoting or relying on them for formal advice.</p>
    </section>
  );
}

function CalculatorTool() {
  const [expression, setExpression] = useState('');
  const [calculatorResult, setCalculatorResult] = useState('');
  const [calculatorError, setCalculatorError] = useState('');

  function calculate(event) {
    event?.preventDefault();
    const cleaned = expression.trim();
    if (!cleaned) return;
    if (!/^[0-9+\-*/().\s%]+$/.test(cleaned)) {
      setCalculatorResult('');
      setCalculatorError('Use numbers and basic operators only.');
      return;
    }
    try {
      const normalised = cleaned.replace(/%/g, '/100');
      const result = Function(`"use strict"; return (${normalised})`)();
      if (!Number.isFinite(result)) throw new Error('Invalid calculation.');
      setCalculatorError('');
      setCalculatorResult(Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''));
    } catch (_err) {
      setCalculatorResult('');
      setCalculatorError('Unable to calculate that expression.');
    }
  }

  const quickButtons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+'];

  return (
    <section className="tool-card">
      <div className="tool-card-head">
        <Calculator size={20} />
        <div>
          <h3>Basic calculator</h3>
          <p>Run quick calculations without leaving the client workspace.</p>
        </div>
      </div>
      <form className="tool-form" onSubmit={calculate}>
        <label>
          <span>Calculation</span>
          <input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="e.g. 3500 * 1.15" />
        </label>
        <div className="calc-buttons">
          {quickButtons.map((button) => <button key={button} type="button" onClick={() => setExpression((current) => `${current}${button}`)}>{button}</button>)}
          <button type="button" onClick={() => setExpression((current) => current.slice(0, -1))}>⌫</button>
          <button type="button" onClick={() => { setExpression(''); setCalculatorResult(''); setCalculatorError(''); }}>Clear</button>
          <button type="submit" className="equals">=</button>
        </div>
      </form>
      {calculatorError && <div className="tool-error">{calculatorError}</div>}
      {calculatorResult && <div className="conversion-result"><span>Result</span><strong>{calculatorResult}</strong></div>}
    </section>
  );
}

function weatherCodeLabel(code) {
  const labels = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
  };
  return labels[code] || 'Weather update';
}

function formatShortDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
}

function formatCurrencyAmount(value, currency) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(value || 0);
}

function formatZoneName(timeZone) {
  return TOOL_TIMEZONES.find((zone) => zone.value === timeZone)?.label || timeZone;
}

function formatInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-NZ', { timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function zonedWallTimeToInstant(dateValue, timeValue, timeZone) {
  if (!dateValue || !timeValue || !timeZone) return null;
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  let utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  let offset = timeZoneOffsetMs(utcGuess, timeZone);
  let instant = new Date(utcGuess.getTime() - offset);
  offset = timeZoneOffsetMs(instant, timeZone);
  instant = new Date(Date.UTC(year, month - 1, day, hour, minute) - offset);
  return instant;
}

function timeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(hour), Number(parts.minute), Number(parts.second)) - date.getTime();
}

function SupportDrawer({ open, onOpen, onClose, tab }) {
  const content = SUPPORT_CONTENT[tab] || SUPPORT_CONTENT.dashboard;

  return (
    <>
      <button className="support-fab" type="button" onClick={onOpen} style={{ display: open ? 'none' : undefined }} aria-label="Open page help">
        <HelpCircle size={18} /> Help
      </button>
      <div className={`support-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`support-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="support-head">
          <div>
            <span>Page support</span>
            <h2>{content.title}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close page help"><X size={18} /></button>
        </div>
        <p className="support-summary">{content.summary}</p>
        <div className="support-section-list">
          {content.sections.map((section) => (
            <section key={section.heading} className="support-section">
              <h3>{section.heading}</h3>
              <p>{section.text}</p>
            </section>
          ))}
        </div>
        <div className="support-tips">
          <h3>Practical tips</h3>
          <ul>
            {content.tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </div>
        <div className="support-note">
          This help content is maintained inside the app, so it can be updated as new CRM screens and workflows are added.
        </div>
      </aside>
    </>
  );
}

function ViewToolbar({ advisers, dashboardAdviserFilter, setDashboardAdviserFilter, clientQuery, setClientQuery, matchingClientCount, setTab, setAdviserFilter, setCaseTypeFilter, canViewAllAdvisers = true }) {
  const selectedAdviser = advisers.find((adviser) => adviser.id === dashboardAdviserFilter);
  const viewLabel = selectedAdviser ? selectedAdviser.name : 'All advisers';

  function submitSearch(event) {
    event.preventDefault();
    setTab('clients');
  }

  function clearView() {
    setDashboardAdviserFilter('all');
    setAdviserFilter('all');
    setCaseTypeFilter('all');
    setClientQuery('');
  }

  return (
    <section className="view-toolbar compact-view-toolbar">
      <label className="scope-select compact-scope-select">
        <span>Viewing</span>
        <select value={dashboardAdviserFilter} onChange={(event) => setDashboardAdviserFilter(event.target.value)}>
          {canViewAllAdvisers && <option value="all">All advisers</option>}
          {advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}
        </select>
      </label>
      <form className="global-search compact-global-search" onSubmit={submitSearch}>
        <Search size={16} />
        <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search clients, citizenship, case type, strategy..." />
        <button className="btn dark" type="submit">Search</button>
      </form>
      <div className="view-result compact-view-result" title={`${matchingClientCount} matching clients in ${viewLabel} view`}>
        <strong>{matchingClientCount}</strong>
        <span>result{matchingClientCount === 1 ? '' : 's'}</span>
      </div>
      <button className="btn ghost compact-clear-btn" type="button" onClick={clearView}><X size={16} />Clear</button>
    </section>
  );
}

function AccessScreen(props) {
  const {
    pendingCode,
    setPendingCode,
    submitAccessCode,
    error,
    message,
    loading,
    authFlow,
    identityUser,
    legacyAccessVisible,
    setLegacyAccessVisible,
    submitIdentityLogin,
    submitInvitePassword,
    submitRecoveryPassword,
    requestPasswordReset,
  } = props;
  const [email, setEmail] = useState(identityUser?.email || '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  function validateNewPassword() {
    if (newPassword.length < 8) return 'Use at least 8 characters for the password.';
    if (newPassword !== confirmPassword) return 'The passwords do not match.';
    return '';
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Enter your email and password.');
      return;
    }
    submitIdentityLogin(email, password);
  }

  function handleInviteSubmit(event) {
    event.preventDefault();
    setLocalError('');
    const validationError = validateNewPassword();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    submitInvitePassword(newPassword);
  }

  function handleRecoverySubmit(event) {
    event.preventDefault();
    setLocalError('');
    const validationError = validateNewPassword();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    submitRecoveryPassword(newPassword);
  }

  function handleResetRequest(event) {
    event.preventDefault();
    setLocalError('');
    if (!email) {
      setLocalError('Enter your email address first.');
      return;
    }
    requestPasswordReset(email);
  }

  const isInvite = authFlow?.type === 'invite';
  const isRecovery = authFlow?.type === 'recovery';

  return (
    <div className="access-screen">
      <div className="access-card identity-card">
        <img src={LOGO_SRC} alt="Turner Hopkins Immigration Specialists" className="access-logo" />
        <LockKeyhole size={34} />
        <h1>{isInvite ? 'Set your THiS CRM password' : isRecovery ? 'Choose a new password' : 'THiS CRM login'}</h1>
        <p>{isInvite ? 'Your Netlify Identity invitation has been recognised. Set a password to finish activating your CRM access.' : isRecovery ? 'Enter a new password to complete the reset process.' : 'Access is restricted to invited THiS users only.'}</p>

        {isInvite && (
          <form className="access-form" onSubmit={handleInviteSubmit}>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" autoFocus />
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" />
            <button className="btn dark" type="submit" disabled={loading}>Activate login</button>
          </form>
        )}

        {isRecovery && (
          <form className="access-form" onSubmit={handleRecoverySubmit}>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" autoFocus />
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" />
            <button className="btn dark" type="submit" disabled={loading}>Save new password</button>
          </form>
        )}

        {!isInvite && !isRecovery && (
          <>
            <form className="access-form" onSubmit={handleLoginSubmit}>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoFocus />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
              <button className="btn dark" type="submit" disabled={loading}>Login</button>
            </form>
            <button className="link-button" type="button" onClick={handleResetRequest} disabled={loading}>Send reset password email</button>
          </>
        )}

        {(message || localError || error) && <small className={message && !localError && !error ? 'success-text' : ''}>{localError || error || message}</small>}
      </div>
    </div>
  );
}

function CrmToast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`crm-toast ${toast.tone || 'success'}`} role="status" aria-live="polite">
      <CheckCircle2 size={18} />
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification"><X size={15} /></button>
    </div>
  );
}

function Dashboard({ clients, activeClients, advisers, dashboardAdviserFilter, deadlineRows, taskRows, stageTemplates, setTab, setSelectedClientId, openClientRecord, intakeEnquiries = [], recentClientIds = [] }) {
  const pendingInvoices = clients.flatMap((client) => (client.billing || []).map((item) => ({ item, client }))).filter(({ item, client }) => effectiveBillingStatus(item, client) !== 'Invoiced');
  const actionableDeadlineRows = deadlineRows.filter(isDashboardActionableDeadlineRow);
  const quietDeadlineRows = deadlineRows.filter((row) => !isDashboardActionableDeadlineRow(row));
  const dashboardTaskRows = taskRows.map(withDeadlineSignal).filter(isDashboardActionableTaskRow);
  const overdueRows = actionableDeadlineRows.filter((row) => dateDiff(row.date) < 0 || row.deadlineSignal?.kind === 'review-due');
  const next14 = actionableDeadlineRows.filter((row) => dateDiff(row.date) >= 0 && dateDiff(row.date) <= 14);
  const clientsWithoutNextAction = activeClients.filter((client) => !client.nextActionDue);
  const todayActionRows = dashboardTaskRows.filter((row) => row.diff <= 0 || row.deadlineSignal?.kind === 'review-due');
  const urgentTaskRows = dashboardTaskRows.filter((row) => row.diff < 0 || row.diff <= 7 || row.deadlineSignal?.kind === 'review-due');
  const newEnquiryCount = (intakeEnquiries || []).filter((item) => item.status === 'New' || !item.status).length;
  const recentClients = (recentClientIds || []).map((id) => clients.find((client) => client.id === id)).filter(Boolean).slice(0, 5);
  const overdueCalendarItems = taskRows.filter((row) => row.source === 'calendar-entry' && row.diff < 0);
  const newPortalMessages = activeClients.flatMap((client) => (client.portalMessages || [])
    .filter((message) => message.status === 'New')
    .map((message) => ({ client, message })))
    .sort((a, b) => String(b.message.createdAt || '').localeCompare(String(a.message.createdAt || '')));

  const visibleAdvisers = dashboardAdviserFilter === 'all' ? advisers : advisers.filter((adviser) => adviser.id === dashboardAdviserFilter);
  const viewTitle = dashboardAdviserFilter === 'all' ? 'Whole-practice dashboard' : `${advisers.find((adviser) => adviser.id === dashboardAdviserFilter)?.name || 'Adviser'} dashboard`;
  return (
    <div className="stack">
      <section className="panel dashboard-heading">
        <div>
          <h2>{viewTitle}</h2>
          <p className="muted">Dashboard metrics show dates that advisers have chosen to watch. File-only dates stay on the client record without adding noise here.</p>
        </div>
        <span>{clients.length} client{clients.length === 1 ? '' : 's'} in view</span>
      </section>
      <DashboardCommandCards todayActionRows={todayActionRows} urgentTaskRows={urgentTaskRows} newEnquiryCount={newEnquiryCount} setTab={setTab} />

      {recentClients.length > 0 && <RecentClientsStrip clients={recentClients} openClientRecord={openClientRecord} />}

      <div className="metric-grid">
        <MetricCard label="Active clients" value={activeClients.length} note="Live client records" icon={UsersRound} />
        <MetricCard label="Action dates next 14 days" value={next14.length} note="Marked for dashboard" icon={CalendarDays} />
        <MetricCard label="Actionable overdue" value={overdueRows.length} note="File-only dates excluded" icon={AlertTriangle} warning={overdueRows.length > 0} />
        <MetricCard label="Overdue calendar" value={overdueCalendarItems.length} note="Open appointments in the past" icon={CalendarDays} warning={overdueCalendarItems.length > 0} />
        <MetricCard label="Client portal notes" value={newPortalMessages.length} note="New client-submitted items" icon={MessageSquare} warning={newPortalMessages.length > 0} />
        <MetricCard label="WIP / overdue billing" value={formatCurrency(pendingInvoices.reduce((sum, row) => sum + Number(row.item.amount || 0), 0))} note="Billing not yet invoiced" icon={CreditCard} />
      </div>


      <DailyBringUpPanel taskRows={dashboardTaskRows} advisers={advisers} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />

      <QuickTaskPanel taskRows={dashboardTaskRows} advisers={advisers} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />

      <PortalMessageAlertPanel messages={newPortalMessages} openClientRecord={openClientRecord} />

      <ClientsWithoutNextActionPanel clients={clientsWithoutNextAction} openClientRecord={openClientRecord} />

      <div className="dashboard-grid">
        <section className="panel wide-panel">
          <h2>Adviser workload</h2>
          <p className="muted">Active client numbers and selected-stage progress.</p>
          <div className="adviser-cards">
            {visibleAdvisers.map((adviser) => {
              const assigned = activeClients.filter((client) => client.primaryAdviserId === adviser.id);
              const backup = activeClients.filter((client) => client.backupAdviserId === adviser.id);
              const average = assigned.length ? Math.round(assigned.reduce((sum, client) => sum + progressPercent(client), 0) / assigned.length) : 0;
              return (
                <div className="adviser-card" key={adviser.id}>
                  <div className="split">
                    <div><strong>{adviser.name}</strong><span>{adviser.role}</span></div>
                    <b>{assigned.length} lead</b>
                  </div>
                  <ProgressBar value={average} />
                  <div className="mini-grid"><span><b>{assigned.length}</b> Primary</span><span><b>{backup.length}</b> Backup</span></div>
                </div>
              );
            })}
          </div>
          <AdviserClientWorkloadList clients={activeClients} advisers={advisers} taskRows={dashboardTaskRows} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />
        </section>

        <section className="panel">
          <h2>Next critical dates</h2>
          <p className="muted">Only dates marked for the dashboard and inside their warning window, plus overdue watched dates.</p>
          <div className="date-list">
            {actionableDeadlineRows.slice(0, 10).map((row, index) => (
              <button className="date-row" key={`${row.client.id}-${row.type}-${index}`} onClick={() => openClientRecord ? openClientRecord(row.client.id) : (setSelectedClientId(row.client.id), setTab('clients'))}>
                <span><strong>{row.client.firstName} {row.client.lastName}</strong><small>{row.type} · {row.date}</small><small>{row.deadlineSignal?.reason || ''}</small></span>
                <DeadlineSignalBadge row={row} />
              </button>
            ))}
            {!actionableDeadlineRows.length && <p className="muted center">No dashboard dates need attention in this view.</p>}
          </div>
          {quietDeadlineRows.length > 0 && <QuietDeadlineSummary rows={quietDeadlineRows} setTab={setTab} />}
        </section>
      </div>
    </div>
  );

}


function QuietDeadlineSummary({ rows = [], setTab }) {
  const fileOnlyCount = rows.filter((row) => row.deadlineSignal?.kind === 'hidden').length;
  const futureCount = rows.filter((row) => row.deadlineSignal?.kind === 'future').length;
  const otherCount = Math.max(0, rows.length - fileOnlyCount - futureCount);
  return (
    <div className="quiet-deadline-summary">
      <ShieldCheck size={16} />
      <span><strong>{rows.length}</strong> saved date{rows.length === 1 ? '' : 's'} not currently shown on this dashboard.</span>
      <small>{[fileOnlyCount ? `${fileOnlyCount} file only` : '', futureCount ? `${futureCount} outside warning window` : '', otherCount ? `${otherCount} reference` : ''].filter(Boolean).join(' · ')}</small>
      <button className="btn ghost" type="button" onClick={() => setTab('tasks')}>Review in Tasks</button>
    </div>
  );
}


function DashboardCommandCards({ todayActionRows = [], urgentTaskRows = [], newEnquiryCount = 0, setTab }) {
  return (
    <section className="command-card-grid" aria-label="Daily CRM focus">
      <button className="command-card" type="button" onClick={() => setTab('tasks')}>
        <span className="command-icon"><ListChecks size={20} /></span>
        <span><strong>{todayActionRows.length}</strong><small>Today’s actions</small><em>Open the daily bring-up list</em></span>
      </button>
      <button className="command-card warning" type="button" onClick={() => setTab('tasks')}>
        <span className="command-icon"><AlertTriangle size={20} /></span>
        <span><strong>{urgentTaskRows.length}</strong><small>Urgent / at risk</small><em>Overdue or due within 7 days</em></span>
      </button>
      <button className="command-card" type="button" onClick={() => setTab('intake')}>
        <span className="command-icon"><ClipboardList size={20} /></span>
        <span><strong>{newEnquiryCount}</strong><small>New enquiries</small><em>Contact forms, intake and seminar items</em></span>
      </button>
    </section>
  );
}

function RecentClientsStrip({ clients = [], openClientRecord }) {
  return (
    <section className="recent-client-strip" aria-label="Recently viewed clients">
      <div><Clock size={16} /><strong>Recently viewed</strong></div>
      <div className="recent-client-buttons">
        {clients.map((client) => (
          <button key={client.id} className="recent-client-button" type="button" onClick={() => openClientRecord?.(client.id)}>
            <span>{clientName(client)}</span>
            <small>{currentStageLabel(client)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PortalMessageAlertPanel({ messages, openClientRecord }) {
  if (!messages.length) return null;
  return (
    <section className="panel portal-message-alert-panel">
      <div className="quick-task-head">
        <div>
          <h2>New client portal notes</h2>
          <p className="muted">Client-submitted notes and actions that need adviser review. Open the client portal section to respond or mark them reviewed.</p>
        </div>
        <div className="quick-task-counts"><span><b>{messages.length}</b> new</span></div>
      </div>
      <div className="quick-task-list">
        {messages.slice(0, 6).map(({ client, message }) => (
          <button className="quick-task portal-message-task" key={message.id} type="button" onClick={() => openClientRecord?.(client.id)}>
            <MessageSquare size={18} />
            <span>
              <strong>{clientName(client)}</strong>
              <small>{message.title || (message.messageType === 'adviser_action' ? 'Note/action for adviser' : 'Client planning note')}</small>
              <small>{formatPortalDateTime(message.createdAt)}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}

function ClientsWithoutNextActionPanel({ clients, openClientRecord }) {
  if (!clients.length) return null;
  return (
    <section className="panel no-action-panel">
      <div className="quick-task-head">
        <div>
          <h2>Clients with no next action date</h2>
          <p className="muted">Safety-net list for active clients that do not currently have a bring-up date. Add a next action date from the client quick view.</p>
        </div>
        <div className="quick-task-counts"><span><b>{clients.length}</b> no date</span></div>
      </div>
      <div className="no-action-list">
        {clients.slice(0, 8).map((client) => (
          <button className="no-action-row" key={client.id} type="button" onClick={() => openClientRecord?.(client.id)}>
            <span><strong>{client.firstName} {client.lastName}</strong><small>{client.caseType || 'No case type'} · {currentStageLabel(client)}</small></span>
            <ChevronRight size={16} />
          </button>
        ))}
        {clients.length > 8 && <p className="muted center">{clients.length - 8} more active client{clients.length - 8 === 1 ? '' : 's'} without a next action date.</p>}
      </div>
    </section>
  );
}

function DailyBringUpPanel({ taskRows, advisers, setTab, setSelectedClientId, openClientRecord }) {
  const todayActions = useMemo(() => taskRows
    .filter((row) => ['next-action', 'billing', 'personal-task', 'document-expiry', 'calendar-entry'].includes(row.source) && row.diff === 0)
    .sort((a, b) => taskDisplayName(a).localeCompare(taskDisplayName(b))), [taskRows]);

  function openTask(row) {
    if (row.source === 'calendar-entry' && row.calendarEntry) {
      setSelectedCalendarEntry(row.calendarEntry);
      return;
    }
    if (!row.client) return;
    if (openClientRecord) return openClientRecord(row.client.id);
    setSelectedClientId(row.client.id);
    setTab('clients');
  }

  return (
    <section className="panel daily-bringup-panel">
      <div className="quick-task-head">
        <div>
          <h2>Today’s bring-up list</h2>
          <p className="muted">Next-action, calendar, document-expiry, billing and personal tasks due today for the current adviser view. Use this like the daily file bring-up list.</p>
        </div>
        <div className="quick-task-counts"><span><b>{todayActions.length}</b> due today</span></div>
        <button className="btn dark" type="button" onClick={() => setTab('tasks')}><ListChecks size={16} />Full task list</button>
      </div>
      <div className="quick-task-list daily-bringup-list">
        {todayActions.map((row) => {
          const adviserName = taskAdviserName(row, advisers);
          return (
            <button className="quick-task today" key={row.id} onClick={() => openTask(row)} disabled={!row.client}>
              <DeadlineBadge diff={row.diff} />
              <span>
                <strong>{taskDisplayName(row)}</strong>
                <small>{row.note || row.type}</small>
                <small>{adviserName} · {taskContextLabel(row)}</small>
              </span>
              {row.client ? <ChevronRight size={16} /> : <ListChecks size={16} />}
            </button>
          );
        })}
        {!todayActions.length && <div className="quick-task-empty"><CheckCircle2 size={20} /><span>No next-action, calendar, document-expiry, billing or personal tasks due today in this view.</span></div>}
      </div>
    </section>
  );
}

function QuickTaskPanel({ taskRows, advisers, setTab, setSelectedClientId, openClientRecord }) {
  const immediateTasks = useMemo(() => taskRows
    .filter((row) => row.diff <= 7)
    .sort((a, b) => compareTasks(a, b, 'priority'))
    .slice(0, 6), [taskRows]);

  const counts = taskRows.reduce((acc, row) => {
    if (row.diff < 0) acc.overdue += 1;
    if (row.diff === 0) acc.today += 1;
    if (row.diff >= 0 && row.diff <= 7) acc.next7 += 1;
    return acc;
  }, { overdue: 0, today: 0, next7: 0 });

  function openTask(row) {
    if (row.source === 'calendar-entry' && row.calendarEntry) {
      setSelectedCalendarEntry(row.calendarEntry);
      return;
    }
    if (!row.client) return;
    if (openClientRecord) return openClientRecord(row.client.id);
    setSelectedClientId(row.client.id);
    setTab('clients');
  }

  return (
    <section className="panel quick-task-panel">
      <div className="quick-task-head">
        <div>
          <h2>Quick task panel</h2>
          <p className="muted">Immediate work only: overdue, due today, or due in the next 7 days for the current view.</p>
        </div>
        <div className="quick-task-counts">
          <span><b>{counts.overdue}</b> overdue</span>
          <span><b>{counts.today}</b> today</span>
          <span><b>{counts.next7}</b> next 7 days</span>
        </div>
        <button className="btn dark" type="button" onClick={() => setTab('tasks')}><ListChecks size={16} />Full task list</button>
      </div>

      <div className="quick-task-list">
        {immediateTasks.map((row) => {
          const adviserName = taskAdviserName(row, advisers);
          return (
            <button className={`quick-task ${taskStatusKey(row)}`} key={row.id} onClick={() => openTask(row)} disabled={!row.client}>
              <DeadlineBadge diff={row.diff} />
              <span>
                <strong>{taskDisplayName(row)}</strong>
                <small>{row.type} · {row.date}</small>
                <small>{adviserName} · {taskContextLabel(row)}</small>
              </span>
              {row.client ? <ChevronRight size={16} /> : <ListChecks size={16} />}
            </button>
          );
        })}
        {!immediateTasks.length && <div className="quick-task-empty"><CheckCircle2 size={20} /><span>No immediate tasks in this view.</span></div>}
      </div>
    </section>
  );
}

function AdviserClientWorkloadList({ clients, advisers, taskRows, setTab, setSelectedClientId, openClientRecord }) {
  const [clientFilter, setClientFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [caseTypeFilter, setCaseTypeFilter] = useState('all');
  const [adviserFilter, setAdviserFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  const stages = useMemo(() => Array.from(new Set(clients.map(currentStageLabel))).sort(), [clients]);
  const caseTypes = useMemo(() => Array.from(new Set(clients.map((client) => client.caseType).filter(Boolean))).sort(), [clients]);

  const rows = useMemo(() => clients.map((client) => {
    const nextTask = nextTaskForClient(client, taskRows);
    const primary = advisers.find((adviser) => adviser.id === client.primaryAdviserId);
    const backup = advisers.find((adviser) => adviser.id === client.backupAdviserId);
    return { client, nextTask, primary, backup, currentStage: currentStageLabel(client) };
  })
    .filter((row) => {
      const q = clientFilter.trim().toLowerCase();
      const text = [row.client.firstName, row.client.lastName, row.client.email, row.client.caseType, row.client.nationality, row.client.sharepointFolderUrl, row.client.oneLawClientNumber, row.client.caseStrategy, row.primary?.name, row.backup?.name].join(' ').toLowerCase();
      const matchesClient = !q || text.includes(q);
      const matchesStage = stageFilter === 'all' || row.currentStage === stageFilter;
      const matchesCase = caseTypeFilter === 'all' || row.client.caseType === caseTypeFilter;
      const matchesAdviser = adviserFilter === 'all' || row.client.primaryAdviserId === adviserFilter || row.client.backupAdviserId === adviserFilter;
      const status = row.nextTask ? taskStatusKey(row.nextTask) : 'none';
      const matchesTask = taskFilter === 'all' || status === taskFilter || (taskFilter === 'next-30' && row.nextTask?.diff >= 0 && row.nextTask?.diff <= 30) || (taskFilter === 'none' && !row.nextTask);
      return matchesClient && matchesStage && matchesCase && matchesAdviser && matchesTask;
    })
    .sort((a, b) => {
      const aDate = a.nextTask?.date || '9999-12-31';
      const bDate = b.nextTask?.date || '9999-12-31';
      return aDate.localeCompare(bDate) || clientName(a.client).localeCompare(clientName(b.client));
    }), [clients, advisers, taskRows, clientFilter, stageFilter, caseTypeFilter, adviserFilter, taskFilter]);

  return (
    <div className="workload-client-panel">
      <div className="sub-panel-head">
        <div>
          <h3>Client workload list</h3>
          <p className="muted">Ordered by the next action date or next critical deadline date, whichever comes first.</p>
        </div>
        <span className="workload-count">{rows.length} client{rows.length === 1 ? '' : 's'}</span>
      </div>
      <div className="workload-filters">
        <label><span>Client</span><input value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} placeholder="Search client, email, strategy" /></label>
        <label><span>Stage</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">All stages</option>{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
        <label><span>Case type</span><select value={caseTypeFilter} onChange={(event) => setCaseTypeFilter(event.target.value)}><option value="all">All case types</option>{caseTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><span>Adviser</span><select value={adviserFilter} onChange={(event) => setAdviserFilter(event.target.value)}><option value="all">All advisers in view</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>
        <label><span>Next date</span><select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}><option value="all">All</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="next-7">Next 7 days</option><option value="next-30">Next 30 days</option><option value="future">Future</option><option value="none">No date</option></select></label>
      </div>
      <div className="workload-table">
        <div className="workload-head"><span>Client</span><span>Case type</span><span>Current stage</span><span>Next date</span><span>Adviser</span><span>Folder</span><span></span></div>
        <div className="workload-scroll">
        {rows.map((row) => {
          const folderLink = normaliseExternalUrl(row.client.sharepointFolderUrl);
          return (
          <div className="workload-line" key={row.client.id}>
            <span><strong>{row.client.firstName} {row.client.lastName}</strong><small>{row.client.email || 'No email'} · {row.client.clientStatus}</small></span>
            <span>{row.client.caseType || '—'}</span>
            <span><strong>{row.currentStage}</strong><small>{progressPercent(row.client)}% complete</small></span>
            <span>{row.nextTask ? <><DeadlineBadge diff={row.nextTask.diff} /><small>{row.nextTask.type} · {row.nextTask.date}</small></> : <small>No action/deadline date</small>}</span>
            <span><strong>{row.primary?.name || 'Unassigned'}</strong><small>{row.backup?.name ? `Backup: ${row.backup.name}` : 'No backup'}</small></span>
            <span><button className="btn ghost folder-btn" type="button" disabled={!folderLink} onClick={() => window.open(folderLink, '_blank', 'noopener,noreferrer')}><ExternalLink size={14} />Folder</button></span>
            <button className="btn ghost" type="button" onClick={() => openClientRecord ? openClientRecord(row.client.id) : (setSelectedClientId(row.client.id), setTab('clients'))}>Open</button>
          </div>
        );})}
        {!rows.length && <p className="muted center">No clients match the selected workload filters.</p>}
        </div>
      </div>
    </div>
  );
}

function ProgressMap({ client }) {
  const stages = appliedStages(client);
  const completed = completedStages(client);
  const nextStage = stages.find((stage) => !stage.completed) || null;

  function stageStatus(stage) {
    if (stage.completed) return 'completed';
    if (nextStage?.id === stage.id) return 'current';
    return 'upcoming';
  }

  return (
    <section className="progress-map">
      <div className="progress-map-header">
        <div>
          <h2>Client progress map</h2>
          <p className="muted">Only stages selected for this client are shown. The numbering automatically follows the selected chronological order.</p>
        </div>
        <div className="progress-map-stats">
          <span><b>{stages.length}</b> selected</span>
          <span><b>{completed.length}</b> completed</span>
          <span><b>{progressPercent(client)}%</b> progress</span>
        </div>
      </div>

      <div className="progress-map-track">
        {stages.map((stage, index) => {
          const status = stageStatus(stage);
          return (
            <div className={`progress-step ${status}`} key={stage.id}>
              <div className="progress-step-marker"><span>{status === 'completed' ? '✓' : index + 1}</span></div>
              <div className="progress-step-copy">
                <strong>{stage.label}</strong>
                <small>{status === 'current' ? 'Current / next stage' : status === 'completed' ? (stage.completedDate ? `Completed ${stage.completedDate}` : 'Completed') : 'Upcoming'}</small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="progress-map-current">
        <Clock size={16} />
        <span>{nextStage ? `Next stage: ${nextStage.label}` : 'All selected stages are complete.'}</span>
      </div>
    </section>
  );
}


function ClientPortalPanel({ client, advisers, calendarEntries, generatedPortalCode, setField, updatePortalSelection, generatePortalAccessCode, copyPortalInstructions, publishPortalUpdate, updatePortalMessageStatus, uploadPortalDocument, updatePortalDocument, deletePortalDocument, saving }) {
  const portalLink = `${window.location.origin}/portal`;
  const documents = normaliseDocumentChecklist(client.documentChecklist).filter((item) => item.applied !== false);
  const deadlines = (client.deadlines || []).filter((item) => item.date || item.note || item.type).map((item) => ({ ...item, id: portalDeadlineKey(item) }));
  const appointments = (calendarEntries || []).filter((entry) => entry.clientId === client.id && entry.status !== 'Completed').sort((a, b) => (a.appointmentDate || '').localeCompare(b.appointmentDate || ''));
  const primaryAdviser = advisers.find((adviser) => adviser.id === client.primaryAdviserId);
  const visibleDocs = new Set(client.portalVisibleDocumentIds || []);
  const visibleDeadlines = new Set(client.portalVisibleDeadlineIds || []);
  const visibleAppointments = new Set(client.portalVisibleAppointmentIds || []);
  const billingItems = normaliseBillingItems(client.billing || []).map((item) => ({ ...item, status: effectiveBillingStatus(item, client) }));
  const visibleBilling = new Set(client.portalVisibleBillingIds || []);
  const portalResourceSettings = normalisePortalResourceSettings(client.portalResourceSettings);
  const enabledPortalResources = PORTAL_RESOURCE_PAGES.filter((page) => portalResourceSettings[page.key]?.enabled);
  const portalMessages = (client.portalMessages || []).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const newMessages = portalMessages.filter((message) => message.status === 'New');
  const visiblePortalPdfCount = (Array.isArray(client.portalDocuments) ? client.portalDocuments : []).filter((doc) => doc.visibleToClient !== false).length;
  const portalVisibleContentCount = visibleDocs.size + visibleDeadlines.size + visibleAppointments.size + visibleBilling.size + enabledPortalResources.length + visiblePortalPdfCount;
  const publishChecklist = buildPortalPublishChecklist({ client, generatedPortalCode, primaryAdviser, visibleContentCount: portalVisibleContentCount });
  const blockingPortalIssues = publishChecklist.filter((item) => item.required && !item.ok);

  return (
    <div className="portal-admin-panel">
      <div className="sub-panel-head">
        <div>
          <h2>Client portal</h2>
          <p className="muted">Publish a read-only client dashboard. Only selected items and client-facing wording are visible.</p>
        </div>
        <label className="compact-check portal-toggle"><input type="checkbox" checked={Boolean(client.portalEnabled)} onChange={(event) => setField('portalEnabled', event.target.checked)} />Portal enabled</label>
      </div>

      <div className="portal-admin-status">
        <span><strong>Portal link</strong><button type="button" className="linklike" onClick={() => navigator.clipboard?.writeText(portalLink)}>{portalLink}</button></span>
        <span><strong>Access code</strong>{client.portalAccessCodeSet || generatedPortalCode ? 'Set' : 'Not generated'}</span>
        <span><strong>Last published</strong>{formatPortalDateTime(client.portalLastPublishedAt) || 'Not published'}</span>
        <span><strong>Client notes</strong>{newMessages.length ? `${newMessages.length} new` : `${portalMessages.length} total`}</span>
      </div>

      <PortalPublishChecklist items={publishChecklist} blockingCount={blockingPortalIssues.length} visibleContentCount={portalVisibleContentCount} />

      <div className="form-grid two">
        <label className="field"><span>Portal contact email</span><input value={client.portalEmail || client.email || ''} onChange={(event) => setField('portalEmail', event.target.value)} placeholder="Client email for portal access" /></label>
        <label className="field"><span>Allocated adviser shown to client</span><input value={primaryAdviser ? `${primaryAdviser.name} · ${primaryAdviser.email || 'no email'} · ${primaryAdviser.phone || 'no phone'}` : 'No primary adviser selected'} readOnly /></label>
      </div>

      <TextArea label="Plain-English update" value={client.portalStatusUpdate || ''} onChange={(value) => setField('portalStatusUpdate', value)} rows={5} />
      <TextArea label="Next client step" value={client.portalNextStep || ''} onChange={(value) => setField('portalNextStep', value)} rows={3} />

      <div className="portal-visibility-grid">
        <PortalVisibilityBox title="Document checklist" empty="No applied document checklist items." items={documents} selected={visibleDocs} onToggle={(id, checked) => updatePortalSelection('portalVisibleDocumentIds', id, checked)} renderLabel={(item) => item.name} renderMeta={(item) => [item.obtained ? 'Obtained' : 'Required', item.expiryDate ? `Expiry ${item.expiryDate}` : 'No expiry date'].join(' · ')} />
        <PortalVisibilityBox title="Billing milestones" empty="No billing milestones recorded." items={billingItems} selected={visibleBilling} onToggle={(id, checked) => updatePortalSelection('portalVisibleBillingIds', id, checked)} renderLabel={(item) => item.milestone || 'Billing milestone'} renderMeta={(item) => [formatCurrency(item.amount), item.status, item.dueDate ? `Date ${item.dueDate}` : '', item.invoiceNo ? `Invoice ${item.invoiceNo}` : ''].filter(Boolean).join(' · ') || 'No billing details'} />
        <PortalVisibilityBox title="Upcoming key dates" empty="No client deadlines recorded." items={deadlines} selected={visibleDeadlines} onToggle={(id, checked) => updatePortalSelection('portalVisibleDeadlineIds', id, checked)} renderLabel={(item) => item.type} renderMeta={(item) => [item.date, item.note].filter(Boolean).join(' · ') || 'No date'} />
        <PortalVisibilityBox title="Appointments" empty="No open linked appointments." items={appointments} selected={visibleAppointments} onToggle={(id, checked) => updatePortalSelection('portalVisibleAppointmentIds', id, checked)} renderLabel={(item) => item.title || 'Appointment'} renderMeta={(item) => [item.appointmentDate, calendarEntryTimeLabel(item), item.location].filter(Boolean).join(' · ') || 'No date'} />
      </div>

      <PortalResourcesManager
        settings={portalResourceSettings}
        enabledCount={enabledPortalResources.length}
        setField={setField}
      />

      <PortalDocumentsManager
        client={client}
        uploadPortalDocument={uploadPortalDocument}
        updatePortalDocument={updatePortalDocument}
        deletePortalDocument={deletePortalDocument}
        saving={saving}
      />

      <div className="portal-adviser-inbox">
        <div className="sub-panel-head compact">
          <div>
            <h3>Client-submitted notes and actions</h3>
            <p className="muted">Items added from the client portal. Mark them reviewed once the adviser has dealt with them.</p>
          </div>
          {newMessages.length > 0 && <span className="count-pill warning">{newMessages.length} new</span>}
        </div>
        {portalMessages.length ? portalMessages.slice(0, 8).map((message) => (
          <div className={`portal-inbox-row ${message.status === 'New' ? 'new' : ''}`} key={message.id}>
            <div>
              <span>{message.messageType === 'adviser_action' ? 'Note/action for adviser' : 'Client note/planning'} · {formatPortalDateTime(message.createdAt)}</span>
              <strong>{message.title || (message.messageType === 'adviser_action' ? 'Client note/action' : 'Client planning note')}</strong>
              <p>{message.message}</p>
            </div>
            {message.status === 'New' ? <button className="btn mini" type="button" onClick={() => updatePortalMessageStatus?.(client.id, message.id, 'Reviewed')}>Mark reviewed</button> : <b className="reviewed-pill">Reviewed</b>}
          </div>
        )) : <p className="muted">No client-submitted notes yet.</p>}
      </div>

      {generatedPortalCode && <div className="portal-code-card"><span>New portal access code - shown once</span><strong>{generatedPortalCode}</strong><small>Save or publish the client record before sending this code to the client.</small></div>}

      <div className="button-row portal-admin-actions">
        <button className="btn" type="button" onClick={generatePortalAccessCode}><LockKeyhole size={16} />Generate/reset access code</button>
        <button className="btn" type="button" onClick={copyPortalInstructions}><Copy size={16} />Copy client instructions</button>
        <a className="btn" href={portalLink} target="_blank" rel="noreferrer"><ExternalLink size={16} />Preview sign-in page</a>
        <button className="btn dark" type="button" onClick={publishPortalUpdate} disabled={saving || blockingPortalIssues.length > 0}><ExternalLink size={16} />Publish portal update</button>
      </div>
      <p className="portal-preview-note">Preview opens the client sign-in page. After publishing, sign in with the client email and access code to check exactly what the client can see.</p>
    </div>
  );
}

function PortalPublishChecklist({ items = [], blockingCount = 0, visibleContentCount = 0 }) {
  const ready = blockingCount === 0;
  return (
    <div className={`portal-publish-checklist ${ready ? 'ready' : 'needs-work'}`}>
      <div className="portal-publish-checklist-head">
        <div>
          <h3>Portal publish checklist</h3>
          <p>{ready ? 'Required checks are ready. Review the visible items below before publishing.' : 'Complete the required checks before publishing this client portal.'}</p>
        </div>
        <span className={`portal-readiness-pill ${ready ? 'ready' : 'needs-work'}`}>{ready ? 'Ready to publish' : `${blockingCount} required`}</span>
      </div>
      <div className="portal-checklist-grid">
        {items.map((item) => (
          <div className={`portal-checklist-item ${item.ok ? 'ok' : item.required ? 'required' : 'advisory'}`} key={item.key}>
            {item.ok ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
            <span><strong>{item.label}</strong><small>{item.detail}</small></span>
          </div>
        ))}
      </div>
      <p className="portal-visibility-hint">Client-visible content currently selected: {visibleContentCount}. Items marked hidden below will not appear in the client portal.</p>
    </div>
  );
}

function buildPortalPublishChecklist({ client, generatedPortalCode, primaryAdviser, visibleContentCount = 0 }) {
  const portalEmail = String(client.portalEmail || client.email || '').trim();
  const hasAccessCode = Boolean(client.portalAccessCodeSet || client.portalNewAccessCode || generatedPortalCode);
  const hasUpdate = Boolean(String(client.portalStatusUpdate || '').trim());
  const hasNextStep = Boolean(String(client.portalNextStep || '').trim());
  return [
    { key: 'email', label: 'Client email', detail: portalEmail || 'Add a portal contact email before publishing.', ok: Boolean(portalEmail), required: true },
    { key: 'code', label: 'Access code', detail: hasAccessCode ? 'Portal access code is set or ready to save.' : 'Generate an access code before publishing.', ok: hasAccessCode, required: true },
    { key: 'adviser', label: 'Primary adviser', detail: primaryAdviser ? `${primaryAdviser.name} will be shown to the client.` : 'Assign a primary adviser before publishing.', ok: Boolean(primaryAdviser), required: true },
    { key: 'update', label: 'Plain-English update', detail: hasUpdate ? 'Client-facing update is ready.' : 'Add a short client-facing status update.', ok: hasUpdate, required: true },
    { key: 'next-step', label: 'Next client step', detail: hasNextStep ? 'Next step wording is ready.' : 'Recommended: add a short next step for the client.', ok: hasNextStep, required: false },
    { key: 'visible-content', label: 'Visible content', detail: visibleContentCount ? `${visibleContentCount} item${visibleContentCount === 1 ? '' : 's'} selected for the portal.` : 'Recommended: select at least one document, date, billing item, PDF, appointment, or resource.', ok: visibleContentCount > 0, required: false },
  ];
}

function PortalVisibilityBox({ title, empty, items, selected, onToggle, renderLabel, renderMeta }) {
  return (
    <div className="portal-visibility-box">
      <h3>{title}</h3>
      {items.map((item) => {
        const visible = selected.has(item.id);
        return (
          <label key={item.id} className={`portal-check-row ${visible ? 'client-visible' : 'client-hidden'}`}>
            <input type="checkbox" checked={visible} onChange={(event) => onToggle(item.id, event.target.checked)} />
            <span><strong>{renderLabel(item)}</strong><small>{renderMeta(item)}</small></span>
            <b className={`portal-visibility-pill ${visible ? 'visible' : 'hidden'}`}>{visible ? 'Visible to client' : 'Hidden'}</b>
          </label>
        );
      })}
      {!items.length && <p className="muted">{empty}</p>}
    </div>
  );
}


function PortalResourcesManager({ settings, enabledCount, setField }) {
  const normalisedSettings = normalisePortalResourceSettings(settings);

  function updateResource(key, patch) {
    const current = normalisePortalResourceSettings(normalisedSettings);
    setField('portalResourceSettings', {
      ...current,
      [key]: {
        ...(current[key] || { enabled: false, clientNote: '' }),
        ...patch,
      },
    });
  }

  return (
    <div className="portal-resources-admin">
      <div className="sub-panel-head compact">
        <div>
          <h3>Portal resource pages</h3>
          <p className="muted">Choose which information pages this client can see. Standard content is managed centrally; these switches are client-specific.</p>
        </div>
        <span className="count-pill">{enabledCount} visible</span>
      </div>
      <div className="portal-resource-admin-grid">
        {PORTAL_RESOURCE_PAGES.map((resource) => {
          const item = normalisedSettings[resource.key] || { enabled: false, clientNote: '' };
          return (
            <div className={`portal-resource-admin-card ${item.enabled ? 'enabled' : ''}`} key={resource.key}>
              <label className="portal-resource-toggle">
                <input type="checkbox" checked={Boolean(item.enabled)} onChange={(event) => updateResource(resource.key, { enabled: event.target.checked })} />
                <span><strong>{resource.title}</strong><small>{resource.audience}</small></span>
              </label>
              <label className="field portal-resource-note-field">
                <span>Optional client-facing note</span>
                <textarea rows={3} value={item.clientNote || ''} onChange={(event) => updateResource(resource.key, { clientNote: event.target.value })} placeholder="Optional short note shown above this resource page" />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function PortalDocumentsManager({ client, uploadPortalDocument, updatePortalDocument, deletePortalDocument, saving }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('THiS instructions');
  const [description, setDescription] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const docs = Array.isArray(client.portalDocuments) ? client.portalDocuments : [];
  const persistedClient = !String(client.id || '').startsWith('temp-');

  function chooseFile(nextFile) {
    setFile(nextFile || null);
    if (nextFile && !title) setTitle(nextFile.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
  }

  async function submit(event) {
    event.preventDefault();
    await uploadPortalDocument?.({ title, category, description, visibleToClient }, file);
    setFile(null);
    setTitle('');
    setDescription('');
    setVisibleToClient(true);
  }

  return (
    <div className="portal-documents-admin">
      <div className="sub-panel-head compact">
        <div>
          <h3>Portal PDFs and standard forms</h3>
          <p className="muted">Upload standard PDFs, INZ forms or instructions that this client can open from their portal.</p>
        </div>
        <span className="count-pill">{docs.filter((doc) => doc.visibleToClient !== false).length} visible</span>
      </div>

      <form className="portal-document-upload" onSubmit={submit}>
        <label className="field"><span>PDF file</span><input type="file" accept="application/pdf,.pdf" disabled={!persistedClient || saving} onChange={(event) => chooseFile(event.target.files?.[0])} /></label>
        <label className="field"><span>Client-facing title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. INZ 1178 Partnership Support Form" /></label>
        <label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>INZ form</option><option>INZ guide</option><option>THiS instructions</option><option>Evidence checklist</option><option>Template</option><option>Other</option></select></label>
        <label className="field portal-document-description"><span>Short note for client</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note shown in the portal" /></label>
        <label className="compact-check"><input type="checkbox" checked={visibleToClient} onChange={(event) => setVisibleToClient(event.target.checked)} />Visible to client</label>
        <button className="btn dark" type="submit" disabled={!persistedClient || saving || !file}><FileText size={16} />Upload PDF</button>
      </form>
      {!persistedClient && <p className="muted">Save the client record before uploading portal PDFs.</p>}

      <div className="portal-document-admin-list">
        {docs.map((doc) => (
          <PortalDocumentAdminRow key={doc.id} doc={doc} updatePortalDocument={updatePortalDocument} deletePortalDocument={deletePortalDocument} saving={saving} />
        ))}
        {!docs.length && <p className="muted center">No portal PDFs uploaded for this client yet.</p>}
      </div>
    </div>
  );
}

function PortalDocumentAdminRow({ doc, updatePortalDocument, deletePortalDocument, saving }) {
  const [draft, setDraft] = useState(doc);
  useEffect(() => setDraft(doc), [doc]);
  const dirty = stableStringify(draft) !== stableStringify(doc);
  const visible = draft.visibleToClient !== false;
  return (
    <div className={`portal-document-admin-row ${!visible ? 'muted-row' : ''}`}>
      <div className="portal-document-admin-icon"><FileText size={22} /></div>
      <div className="portal-document-admin-main">
        <div className="portal-document-admin-title-line">
          <label className="portal-document-admin-field title">
            <span>Client-facing title</span>
            <input value={draft.title || ''} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <span className={`portal-document-status ${visible ? 'visible' : 'hidden'}`}>{visible ? 'Visible in portal' : 'Hidden from portal'}</span>
        </div>
        <div className="portal-document-admin-meta">{[draft.fileName, formatFileSize(draft.fileSize), draft.uploadedAt ? `Uploaded ${formatPortalDateTime(draft.uploadedAt)}` : ''].filter(Boolean).join(' · ')}</div>
        <label className="portal-document-admin-field">
          <span>Note shown to client</span>
          <input value={draft.description || ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Optional client-facing note" />
        </label>
      </div>
      <div className="portal-document-admin-side">
        <label className="portal-document-admin-field">
          <span>Category</span>
          <select value={draft.category || 'THiS instructions'} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}><option>INZ form</option><option>INZ guide</option><option>THiS instructions</option><option>Evidence checklist</option><option>Template</option><option>Other</option></select>
        </label>
        <label className="portal-document-toggle"><input type="checkbox" checked={visible} onChange={(event) => setDraft((current) => ({ ...current, visibleToClient: event.target.checked }))} /> Publish to portal</label>
      </div>
      <div className="portal-document-admin-actions">
        <button className={`btn mini ${dirty ? 'dark' : ''}`} type="button" disabled={!dirty || saving} onClick={() => updatePortalDocument?.(draft)}>{dirty ? 'Update PDF' : 'Saved'}</button>
        <button className="icon-btn danger" type="button" disabled={saving} onClick={() => deletePortalDocument?.(doc.id)} aria-label="Remove PDF"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}


function ClientsWorkspace(props) {
  const { clients, selectedClient, advisers, caseTypes, deadlineTypes, clientQuery, setClientQuery, adviserFilter, setAdviserFilter, caseTypeFilter, setCaseTypeFilter, setSelectedClientId, onDirtyChange, saveClient, updatePortalMessageStatus, uploadPortalDocument, updatePortalDocument, deletePortalDocument, deleteClient, saving, calendarEntries = [] } = props;
  const [popoutOpen, setPopoutOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [popoutDirty, setPopoutDirty] = useState(false);
  const [popoutInitialSection, setPopoutInitialSection] = useState('overview');

  function requestPopoutClose(options = {}) {
    if (!options.force && popoutDirty && !window.confirm('Close the pop-out editor and discard unsaved changes?')) return;
    setPopoutOpen(false);
    setPopoutDirty(false);
    onDirtyChange?.(false);
  }

  function openPopoutEditor(sectionId = 'overview') {
    setPopoutInitialSection(sectionId || 'overview');
    setPopoutOpen(true);
  }

  function handlePopoutDirtyChange(dirty) {
    setPopoutDirty(Boolean(dirty));
    onDirtyChange?.(Boolean(dirty));
  }

  const clientName = [selectedClient?.firstName, selectedClient?.lastName].filter(Boolean).join(' ') || 'New client';

  return (
    <div className="workspace-grid">
      <aside className="panel list-panel">
        <div className="client-list-head">
          <h2>Clients</h2>
          <button className={`btn mini filter-toggle ${filtersOpen ? 'active' : ''}`} type="button" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={14} />Filters</button>
        </div>
        <div className="search-box"><Search size={16} /><input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search clients" /></div>
        {filtersOpen && (
          <div className="client-filter-panel">
            <label><span>Adviser</span><select value={adviserFilter} onChange={(event) => setAdviserFilter(event.target.value)}><option value="all">All advisers</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>
            <label><span>Case type</span><select value={caseTypeFilter} onChange={(event) => setCaseTypeFilter(event.target.value)}><option value="all">All case types</option>{caseTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          </div>
        )}
        <div className="client-list">
          {clients.map((client) => (
            <button className={`client-card ${selectedClient.id === client.id ? 'active' : ''}`} key={client.id} onClick={() => setSelectedClientId(client.id)}>
              <span><strong>{[client.firstName, client.lastName].filter(Boolean).join(' ') || 'New client'}</strong><small>{client.caseType}</small><small>{client.caseStrategy ? 'Strategy added' : 'No case strategy yet'}</small><small>{client.oneLawClientNumber ? `OneLaw ${client.oneLawClientNumber}` : 'No OneLaw number'}</small><small>{client.sharepointFolderUrl ? 'SharePoint linked' : 'No SharePoint link'}</small></span>
              <ChevronRight size={16} />
              <ProgressBar value={progressPercent(client)} />
            </button>
          ))}
        </div>
      </aside>
      <section className="panel detail-panel">
        {popoutOpen ? (
          <div className="client-popout-placeholder">
            <ExternalLink size={28} />
            <h2>{clientName} is open in the pop-out editor</h2>
            <p className="muted">Use the larger editor window to update the client record. Save and close it to return to the standard client view.</p>
            <button className="btn dark" type="button" onClick={() => setPopoutOpen(true)}><ExternalLink size={16} />Resume pop-out editor</button>
          </div>
        ) : (
          <ClientEditor client={selectedClient} advisers={advisers} caseTypes={caseTypes} deadlineTypes={deadlineTypes} calendarEntries={calendarEntries} saveClient={saveClient} updatePortalMessageStatus={updatePortalMessageStatus} uploadPortalDocument={uploadPortalDocument} updatePortalDocument={updatePortalDocument} deletePortalDocument={deletePortalDocument} deleteClient={deleteClient} saving={saving} onDirtyChange={onDirtyChange} onOpenPopout={openPopoutEditor} />
        )}
      </section>
      {popoutOpen && (
        <ClientRecordPopoutModal title={clientName} onClose={requestPopoutClose}>
          <ClientEditor client={selectedClient} advisers={advisers} caseTypes={caseTypes} deadlineTypes={deadlineTypes} calendarEntries={calendarEntries} saveClient={saveClient} updatePortalMessageStatus={updatePortalMessageStatus} uploadPortalDocument={uploadPortalDocument} updatePortalDocument={updatePortalDocument} deletePortalDocument={deletePortalDocument} deleteClient={deleteClient} saving={saving} onDirtyChange={handlePopoutDirtyChange} popoutMode initialSection={popoutInitialSection} onRequestClose={requestPopoutClose} />
        </ClientRecordPopoutModal>
      )}
    </div>
  );
}

function ClientRecordPopoutModal({ title, onClose, children, label = 'Pop-out client record', ariaLabel = 'Pop-out client record editor' }) {
  return (
    <div className="record-popout-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="record-popout-dialog">
        <div className="record-popout-topbar">
          <div>
            <span>{label}</span>
            <strong>{title}</strong>
          </div>
          <button className="icon-btn" type="button" onClick={() => onClose?.()} aria-label="Close pop-out editor"><X size={18} /></button>
        </div>
        <div className="record-popout-content">{children}</div>
      </div>
    </div>
  );
}

function ClientEditor({ client, advisers, caseTypes, deadlineTypes, calendarEntries = [], saveClient, updatePortalMessageStatus, uploadPortalDocument, updatePortalDocument, deletePortalDocument, deleteClient, saving, onDirtyChange, onOpenPopout, popoutMode = false, initialSection = 'overview', onRequestClose }) {
  const [draft, setDraft] = useState(client);
  const [activeClientSection, setActiveClientSection] = useState('overview');
  const [showActionLog, setShowActionLog] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [clientActionsOpen, setClientActionsOpen] = useState(false);
  const [customStageLabel, setCustomStageLabel] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [generatedPortalCode, setGeneratedPortalCode] = useState('');
  const previousClientIdRef = useRef(client.id);
  const isDirty = useMemo(() => stableStringify(draft) !== stableStringify(client), [draft, client]);
  useEffect(() => {
    const clientChanged = previousClientIdRef.current !== client.id;
    if (clientChanged) {
      setGeneratedPortalCode('');
      previousClientIdRef.current = client.id;
      setActiveClientSection('overview');
      setShowActionLog(false);
      setShowTimeline(false);
      setCustomStageLabel('');
      setStatusMessage('');
      setValidationMessage('');
    }
    setDraft(client);
  }, [client]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (popoutMode && initialSection) setActiveClientSection(initialSection);
  }, [popoutMode, initialSection]);

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function setField(field, value) {
    setValidationMessage('');
    setStatusMessage('');
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateStage(stageId, patch) {
    setDraft((current) => ({
      ...current,
      stages: reindexStages(current.stages.map((stage) => {
        if (stage.id !== stageId) return stage;
        const next = { ...stage, ...patch };
        if (stage.mandatory) next.applied = true;
        if (!next.applied) {
          next.completed = false;
          next.completedDate = '';
        }
        if (patch.completed === true && !next.completedDate) next.completedDate = todayIso();
        if (patch.completed === false) next.completedDate = '';
        return next;
      })),
    }));
  }

  function addCustomStage() {
    const label = customStageLabel.trim();
    if (!label) return;
    setDraft((current) => {
      const duplicate = (current.stages || []).some((stage) => stage.label.toLowerCase() === label.toLowerCase());
      if (duplicate) {
        setValidationMessage('A stage with that name already exists for this client.');
        return current;
      }
      const customStage = {
        id: makeStageId(label, current.stages || []),
        label,
        mandatory: false,
        custom: true,
        applied: true,
        completed: false,
        completedDate: '',
        sortOrder: (current.stages || []).length + 1,
      };
      return { ...current, stages: reindexStages([...(current.stages || []), customStage]) };
    });
    setCustomStageLabel('');
  }

  function moveStage(stageId, direction) {
    setDraft((current) => {
      const stages = [...(current.stages || [])];
      const index = stages.findIndex((stage) => stage.id === stageId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= stages.length) return current;
      [stages[index], stages[nextIndex]] = [stages[nextIndex], stages[index]];
      return { ...current, stages: reindexStages(stages) };
    });
  }

  function removeCustomStage(stageId) {
    setDraft((current) => ({
      ...current,
      stages: reindexStages((current.stages || []).filter((stage) => stage.id !== stageId)),
      billing: (current.billing || []).map((item) => item.stageKey === stageId ? { ...item, stageKey: '' } : item),
    }));
  }

  function addDeadline() {
    setDraft((current) => ({ ...current, deadlines: [...(current.deadlines || []), { id: `temp-${Date.now()}`, type: deadlineTypes[0], date: '', note: '', actionStatus: defaultDeadlineActionStatus(deadlineTypes[0], 'deadline'), reviewDate: '' }] }));
  }

  function updateDeadline(id, patch) {
    setDraft((current) => ({ ...current, deadlines: current.deadlines.map((deadline) => deadline.id === id ? { ...deadline, ...patch } : deadline) }));
  }

  function removeDeadline(id) {
    setDraft((current) => ({ ...current, deadlines: current.deadlines.filter((deadline) => deadline.id !== id) }));
  }

  function addBilling() {
    setDraft((current) => ({ ...current, billing: [...(current.billing || []), { id: makeStableLocalId('billing'), milestone: 'New billing item', dueDate: '', amount: 0, status: 'WIP', invoiceNo: '', triggerType: 'Date', stageKey: '' }] }));
  }

  function updateBilling(id, patch) {
    setDraft((current) => ({ ...current, billing: current.billing.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function removeBilling(id) {
    setDraft((current) => ({ ...current, billing: current.billing.filter((item) => item.id !== id) }));
  }

  function updateDocumentItem(id, patch) {
    setDraft((current) => ({
      ...current,
      documentChecklist: normaliseDocumentChecklist(current.documentChecklist).map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  function addCustomDocumentItem(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      setValidationMessage('Enter a document name before adding a custom checklist item.');
      return false;
    }
    const checklist = normaliseDocumentChecklist(draft.documentChecklist);
    const duplicate = checklist.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setValidationMessage('That document item already exists in this checklist.');
      return false;
    }
    setValidationMessage('');
    setDraft((current) => ({
      ...current,
      documentChecklist: [...normaliseDocumentChecklist(current.documentChecklist), { id: makeDocumentItemId(trimmed, checklist), name: trimmed, applied: true, custom: true, expiryDate: '', obtained: false, actionStatus: defaultDeadlineActionStatus(trimmed, 'document-expiry'), reviewDate: '' }],
    }));
    return true;
  }

  function removeCustomDocumentItem(id) {
    setDraft((current) => ({
      ...current,
      documentChecklist: normaliseDocumentChecklist(current.documentChecklist).filter((item) => item.id !== id || !item.custom),
    }));
  }

  function updatePortalSelection(field, id, checked) {
    setDraft((current) => {
      const currentValues = Array.isArray(current[field]) ? current[field] : [];
      const nextValues = checked ? Array.from(new Set([...currentValues, id])) : currentValues.filter((item) => item !== id);
      return { ...current, [field]: nextValues };
    });
  }

  function generatePortalAccessCode() {
    const code = makePortalAccessCode();
    setGeneratedPortalCode(code);
    setField('portalNewAccessCode', code);
    setStatusMessage('New portal access code generated. Save or publish the client record before sending it to the client.');
  }

  function copyPortalInstructions() {
    const code = generatedPortalCode || 'ACCESS-CODE-SHOWN-WHEN-GENERATED';
    const portalEmail = draft.portalEmail || draft.email || '';
    const text = `We have set up your Turner Hopkins client portal so you can view the latest information we have published about your application progress.

You can access the portal here:
${window.location.origin}/portal

Please log in using:
Email: ${portalEmail}
Access code: ${code}

The portal is a secure, read-only space where you can check application updates, view any documents we have made available to you, and send notes or questions to your adviser. We will continue to contact you by email as usual when we need anything further.`;
    navigator.clipboard?.writeText(text);
    setStatusMessage('Client portal instructions copied. Check the email before sending.');
  }

  function draftWithPendingPortalAccessCode(extra = {}) {
    const pendingPortalCode = generatedPortalCode && !draft.portalNewAccessCode ? { portalNewAccessCode: generatedPortalCode } : {};
    return { ...draft, ...pendingPortalCode, ...extra };
  }

  async function handlePublishPortalUpdate() {
    setValidationMessage('');
    const portalEmail = String(draft.portalEmail || draft.email || '').trim();
    const primaryAdviser = advisers.find((adviser) => adviser.id === draft.primaryAdviserId);
    const visibleDocs = new Set(draft.portalVisibleDocumentIds || []);
    const visibleDeadlines = new Set(draft.portalVisibleDeadlineIds || []);
    const visibleAppointments = new Set(draft.portalVisibleAppointmentIds || []);
    const visibleBilling = new Set(draft.portalVisibleBillingIds || []);
    const visiblePortalPdfCount = (Array.isArray(draft.portalDocuments) ? draft.portalDocuments : []).filter((doc) => doc.visibleToClient !== false).length;
    const enabledResourceCount = PORTAL_RESOURCE_PAGES.filter((page) => normalisePortalResourceSettings(draft.portalResourceSettings)[page.key]?.enabled).length;
    const visibleContentCount = visibleDocs.size + visibleDeadlines.size + visibleAppointments.size + visibleBilling.size + visiblePortalPdfCount + enabledResourceCount;
    const checklist = buildPortalPublishChecklist({ client: draft, generatedPortalCode, primaryAdviser, visibleContentCount });
    const missingRequired = checklist.filter((item) => item.required && !item.ok);
    if (missingRequired.length) {
      setStatusMessage('');
      setActiveClientSection('portal');
      setValidationMessage(`Complete the portal publish checklist before publishing: ${missingRequired.map((item) => item.label).join(', ')}.`);
      return;
    }
    setStatusMessage('Publishing client portal update...');
    try {
      const clientToPublish = draftWithPendingPortalAccessCode({
        portalPublishNow: true,
        portalEnabled: true,
        portalEmail,
      });
      const body = await saveClient(clientToPublish, { resetNewClientForm: false });
      if (body?.client) setDraft(normaliseClientFromApi(body.client));
      setGeneratedPortalCode('');
      setActiveClientSection('portal');
      onDirtyChange?.(false);
      const emailStatus = body?.emailLog ? ` Portal access email ${body.emailLog.status === 'Sent' ? 'sent' : 'logged as failed'}.` : '';
      setStatusMessage(`Client portal update published ${formatTimeNow()}.${emailStatus}`);
    } catch (err) {
      setStatusMessage('');
      setValidationMessage(err.message || 'Client portal update could not be published.');
    }
  }


  function addFamilyMember(relationship) {
    setDraft((current) => ({
      ...current,
      familyMembers: [...(current.familyMembers || []), { id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, relationship, name: '', nationality: '', dateOfBirth: '' }],
    }));
  }

  function updateFamilyMember(id, patch) {
    setDraft((current) => ({
      ...current,
      familyMembers: (current.familyMembers || []).map((member) => member.id === id ? { ...member, ...patch } : member),
    }));
  }

  function removeFamilyMember(id) {
    setDraft((current) => ({
      ...current,
      familyMembers: (current.familyMembers || []).filter((member) => member.id !== id),
    }));
  }

  async function handlePortalDocumentUpload(metadata, file) {
    setValidationMessage('');
    if (String(draft.id || '').startsWith('temp-')) {
      setValidationMessage('Save the client record before uploading portal PDFs.');
      return;
    }
    if (!file) {
      setValidationMessage('Choose a PDF to upload.');
      return;
    }
    if (file.type && file.type !== 'application/pdf') {
      setValidationMessage('Only PDF files can be uploaded for the client portal.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setValidationMessage('Portal PDFs must be under 4 MB for this version.');
      return;
    }
    setStatusMessage('Uploading portal PDF...');
    try {
      const dataBase64 = await readFileAsBase64(file);
      const body = await uploadPortalDocument?.(draft.id, {
        ...metadata,
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSize: file.size,
        dataBase64,
      });
      if (body?.client) setDraft(normaliseClientFromApi(body.client));
      setStatusMessage('Portal PDF uploaded. Publish the portal update when ready.');
    } catch (err) {
      setStatusMessage('');
      setValidationMessage(err.message || 'Portal PDF could not be uploaded.');
    }
  }

  async function handlePortalDocumentUpdate(document) {
    setValidationMessage('');
    setStatusMessage('Updating portal PDF details...');
    try {
      const body = await updatePortalDocument?.(draft.id, document);
      if (body?.client) setDraft(normaliseClientFromApi(body.client));
      setStatusMessage('Portal PDF details updated.');
    } catch (err) {
      setStatusMessage('');
      setValidationMessage(err.message || 'Portal PDF details could not be updated.');
    }
  }

  async function handlePortalDocumentDelete(documentId) {
    setValidationMessage('');
    setStatusMessage('Removing portal PDF...');
    try {
      const body = await deletePortalDocument?.(draft.id, documentId);
      if (body?.client) setDraft(normaliseClientFromApi(body.client));
      setStatusMessage('Portal PDF removed.');
    } catch (err) {
      setStatusMessage('');
      setValidationMessage(err.message || 'Portal PDF could not be removed.');
    }
  }

  async function handleSaveClient() {
    const isNewClient = String(draft.id || '').startsWith('temp-');
    setValidationMessage('');
    setStatusMessage('Saving client record...');
    try {
      const body = await saveClient(draftWithPendingPortalAccessCode(), { resetNewClientForm: isNewClient });
      if (!isNewClient && body?.client) setDraft(normaliseClientFromApi(body.client));
      setGeneratedPortalCode('');
      onDirtyChange?.(false);
      setStatusMessage(isNewClient ? 'Saved. A blank new client form is ready for the next entry.' : `Saved ${formatTimeNow()}.`);
      return body;
    } catch (err) {
      setStatusMessage('');
      setValidationMessage(err.message || 'Client record could not be saved.');
      return null;
    }
  }

  function handleOpenPopout(sectionId = activeClientSection) {
    if (isDirty) {
      setValidationMessage('Save the current changes before opening the pop-out editor, so no unsaved edits are lost.');
      return;
    }
    onOpenPopout?.(sectionId || 'overview');
  }

  async function handleSaveAndClose() {
    const body = await handleSaveClient();
    if (body) onRequestClose?.({ force: true });
  }

  function handlePrintClientProfile() {
    setValidationMessage('');
    setStatusMessage('Preparing printable client profile...');
    const opened = printClientProfile(draft, calendarEntries, advisers);
    setStatusMessage(opened ? 'Client profile opened in a printable window.' : 'The browser blocked the print window. Allow pop-ups for this CRM, then try again.');
  }

  const appliedStageCount = appliedStages(draft).length;
  const completedStageCount = completedStages(draft).length;
  const deadlineCount = (draft.deadlines || []).length;
  const billingItems = normaliseBillingItems(draft.billing || []);
  const activeBillingItems = billingItems.filter((item) => effectiveBillingStatus(item, draft) !== 'Invoiced');
  const activeBillingAmount = activeBillingItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const portalNewMessageCount = (draft.portalMessages || []).filter((message) => message.status === 'New').length;
  const portalStatusSummary = draft.portalEnabled ? `Active for ${draft.portalEmail || draft.email || 'client email not set'}. Last published ${formatPortalDateTime(draft.portalLastPublishedAt) || 'not yet'}.${portalNewMessageCount ? ` ${portalNewMessageCount} new client note${portalNewMessageCount === 1 ? '' : 's'} waiting.` : ''}` : 'Inactive. Expand to enable portal access for this client.';
  const requiredDocuments = normaliseDocumentChecklist(draft.documentChecklist || []).filter((item) => item.applied);
  const outstandingDocuments = requiredDocuments.filter((item) => !item.obtained);
  const upcomingDeadlines = (draft.deadlines || [])
    .filter((item) => item.date)
    .map((deadline) => withDeadlineSignal({ ...deadline, client: draft, source: 'deadline', diff: dateDiff(deadline.date) }))
    .filter(isDashboardActionableDeadlineRow)
    .sort((a, b) => deadlineSignalSortDate(a).localeCompare(deadlineSignalSortDate(b)));
  const linkedAppointments = (calendarEntries || []).filter((entry) => entry.clientId === draft.id && entry.status !== 'Completed');
  const visiblePortalPdfCount = (Array.isArray(draft.portalDocuments) ? draft.portalDocuments.map(normalisePortalDocument) : []).filter((doc) => doc.visibleToClient !== false).length;
  const currentStage = currentStageLabel(draft);
  const workspaceSections = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, summary: `${currentStage} · ${progressPercent(draft)}% progress`, badge: draft.clientStatus || 'Status' },
    { id: 'actions', label: 'Actions', icon: Clock, summary: draft.nextActionDue ? `Next due ${draft.nextActionDue}` : 'No next action date', badge: normaliseNextActionLog(draft.nextActionLog).length ? `${normaliseNextActionLog(draft.nextActionLog).length} logged` : 'Action' },
    { id: 'documents', label: 'Documents', icon: ListChecks, summary: `${outstandingDocuments.length}/${requiredDocuments.length} outstanding`, badge: outstandingDocuments.length ? `${outstandingDocuments.length} open` : 'Clear' },
    { id: 'portal', label: 'Portal', icon: LockKeyhole, summary: portalStatusSummary, badge: portalNewMessageCount ? `${portalNewMessageCount} new` : (draft.portalEnabled ? 'Active' : 'Inactive') },
    { id: 'stages', label: 'Stages', icon: ArrowUpDown, summary: `${completedStageCount}/${appliedStageCount || 0} applied stages complete`, badge: `${progressPercent(draft)}%` },
    { id: 'dates', label: 'Key dates', icon: CalendarDays, summary: `${deadlineCount} deadline${deadlineCount === 1 ? '' : 's'} recorded`, badge: upcomingDeadlines[0]?.date || 'Dates' },
    { id: 'billing', label: 'Billing', icon: CreditCard, summary: `${billingItems.length} milestone${billingItems.length === 1 ? '' : 's'} · ${formatCurrency(activeBillingAmount)} active`, badge: activeBillingItems.length ? `${activeBillingItems.length} active` : 'Billing' },
    { id: 'family', label: 'Family', icon: UsersRound, summary: `${(draft.familyMembers || []).length} family/dependant record${(draft.familyMembers || []).length === 1 ? '' : 's'}`, badge: (draft.familyMembers || []).length ? `${(draft.familyMembers || []).length}` : 'Family' },
    { id: 'notes', label: 'Notes & strategy', icon: FileText, summary: draft.caseStrategy ? 'Case strategy added' : 'No case strategy yet', badge: 'Internal' },
  ];

  return (
    <div>
      <div className="detail-header client-workspace-header">
        <div>
          <h1>{draft.firstName || 'New'} {draft.lastName || 'client'}</h1>
          <p>{draft.caseType || 'No case type selected'} · {currentStage} · {progressPercent(draft)}% progress</p>
        </div>
        <div className="button-row client-header-actions">
          <button className="btn dark" onClick={handleSaveClient} disabled={saving}><Save size={16} />Save</button>
          {popoutMode && <button className="btn dark" type="button" onClick={handleSaveAndClose} disabled={saving}><Save size={16} />Save & close</button>}
          <div className="dropdown-shell client-actions-menu-shell">
            <button className="btn ghost" type="button" onClick={() => setClientActionsOpen((open) => !open)}><MoreHorizontal size={16} />More <ChevronDown size={14} /></button>
            {clientActionsOpen && (
              <div className="dropdown-menu client-actions-menu">
                {popoutMode ? <button type="button" onClick={() => { setClientActionsOpen(false); onRequestClose?.(); }}><X size={16} />Close editor</button> : <button type="button" onClick={() => { setClientActionsOpen(false); handleOpenPopout(activeClientSection); }}><ExternalLink size={16} />Open full editor</button>}
                <button type="button" className="danger-option" onClick={() => { setClientActionsOpen(false); deleteClient(draft.id); }} disabled={saving || String(draft.id).startsWith('temp-')}><Trash2 size={16} />Delete client</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`client-save-bar status-only ${isDirty ? 'dirty' : 'clean'}`}>
        <div>
          <strong>{saving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'No unsaved changes'}</strong>
          <span>{validationMessage || statusMessage || (isDirty ? 'Use Save or Save & close in the header before switching clients, changing page, or refreshing.' : 'Client record is aligned with the last saved version.')}</span>
        </div>
        <span className={`save-state-pill ${saving ? 'saving' : isDirty ? 'dirty' : 'clean'}`}>{saving ? 'Saving' : isDirty ? 'Unsaved' : 'Saved'}</span>
      </div>

      {showActionLog && <NextActionLogModal client={draft} onClose={() => setShowActionLog(false)} />}
      {showTimeline && <ClientTimelineModal client={draft} calendarEntries={calendarEntries} advisers={advisers} onClose={() => setShowTimeline(false)} />}

      <ClientSnapshotCard
        client={draft}
        advisers={advisers}
        currentStage={currentStage}
        outstandingDocuments={outstandingDocuments}
        requiredDocuments={requiredDocuments}
        upcomingDeadlines={upcomingDeadlines}
        linkedAppointments={linkedAppointments}
        portalNewMessageCount={portalNewMessageCount}
      />

      <ClientWorkspaceShell sections={workspaceSections} activeSection={activeClientSection} onSelect={setActiveClientSection}>
        {activeClientSection === 'overview' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Client overview" description="Use this front page to orient yourself quickly before working in a specific file section." />
            <div className="client-overview-stats">
              <WorkspaceStat label="Current stage" value={currentStage} />
              <WorkspaceStat label="Progress" value={`${progressPercent(draft)}%`} />
              <WorkspaceStat label="Documents outstanding" value={`${outstandingDocuments.length}/${requiredDocuments.length}`} />
              <WorkspaceStat label="Portal" value={draft.portalEnabled ? 'Active' : 'Inactive'} />
              <WorkspaceStat label="Active billing" value={formatCurrency(activeBillingAmount)} />
              <WorkspaceStat label="Upcoming appointments" value={linkedAppointments.length} />
            </div>
            <ClientSummaryPanel draft={draft} setField={setField} onOpenActionLog={() => setShowActionLog(true)} onOpenTimeline={() => setShowTimeline(true)} onPrintProfile={handlePrintClientProfile} calendarEntries={calendarEntries} />
            <section className="sub-panel workspace-panel">
              <div className="sub-panel-head compact"><div><h2>Core file details</h2><p className="muted">Details used for allocation, search, reporting and client contact.</p></div></div>
              <div className="form-grid">
                <Field label="Email" value={draft.email} onChange={(v) => setField('email', v)} />
                <Field label="Phone" value={draft.phone} onChange={(v) => setField('phone', v)} />
                <LookupField label="Citizenship" value={draft.nationality} onChange={(v) => setField('nationality', v)} options={COUNTRY_OPTIONS} listId="citizenship-options" placeholder="Start typing a country of citizenship" />
                <LookupField label="Current address" value={draft.location} onChange={(v) => setField('location', v)} options={ADDRESS_LOOKUP_EXAMPLES} listId="address-options" placeholder="Start typing the current address" />
                <SelectField label="Case type / application type" value={draft.caseType} onChange={(v) => setField('caseType', v)} options={caseTypes} placeholder="Select case type" />
                <SelectField label="Primary adviser" value={draft.primaryAdviserId} onChange={(v) => setField('primaryAdviserId', v)} options={advisers.map((a) => ({ label: a.name, value: a.id }))} placeholder="Select primary adviser" />
                <SelectField label="Backup adviser" value={draft.backupAdviserId} onChange={(v) => setField('backupAdviserId', v)} options={advisers.map((a) => ({ label: a.name, value: a.id }))} placeholder="Select backup adviser" />
                <SelectField label="Priority" value={draft.priority} onChange={(v) => setField('priority', v)} options={['Normal', 'High', 'Urgent']} />
              </div>
            </section>
          </div>
        )}

        {activeClientSection === 'actions' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Actions and timeline" description="Manage the current next action, review previous scheduled actions and open the full timeline." />
            <section className="sub-panel workspace-panel">
              <div className="sub-panel-head compact"><div><h2>Current bring-up</h2><p className="muted">Changing this action and saving will preserve the previous scheduled action in the action log.</p></div><div className="button-row"><button className="btn" type="button" onClick={() => setShowActionLog(true)}><Clock size={16} />Action log</button><button className="btn" type="button" onClick={() => setShowTimeline(true)}><CalendarDays size={16} />Timeline</button></div></div>
              <div className="form-grid two summary-action-grid">
                <TextArea label="Next action" value={draft.nextAction} onChange={(v) => setField('nextAction', v)} rows={5} />
                <DateField label="Next action date" value={draft.nextActionDue} onChange={(v) => setField('nextActionDue', v)} />
              </div>
            </section>
            <section className="sub-panel workspace-panel">
              <div className="sub-panel-head compact"><div><h2>Client-submitted portal notes</h2><p className="muted">Client notes and actions submitted through the portal. Detailed handling remains in the Portal section.</p></div><span className="count-pill">{portalNewMessageCount} new</span></div>
              {(draft.portalMessages || []).slice(0, 5).map((message) => <div className="portal-message-row" key={message.id || message.createdAt}><strong>{message.type || 'Client note'}</strong><span>{message.message || message.body || 'No message content'}</span><small>{formatPortalDateTime(message.createdAt)} · {message.status || 'New'}</small></div>)}
              {!(draft.portalMessages || []).length && <p className="muted center">No client-submitted portal notes yet.</p>}
            </section>
          </div>
        )}

        {activeClientSection === 'documents' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Documents" description={popoutMode ? "Track required evidence and expiry dates. Portal PDFs and client-facing forms are managed in the Portal section." : "Summary view only. Open the larger editor when you need to change checklist items, dates or obtained status."} />
            {popoutMode ? (
              <DocumentChecklist items={normaliseDocumentChecklist(draft.documentChecklist)} updateItem={updateDocumentItem} addCustomItem={addCustomDocumentItem} removeCustomItem={removeCustomDocumentItem} />
            ) : (
              <DocumentsSummaryPanel documents={requiredDocuments} onEdit={() => handleOpenPopout('documents')} />
            )}
          </div>
        )}

        {activeClientSection === 'portal' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Client portal" description={popoutMode ? "Manage what the client can see. Internal strategy, file notes and risk comments stay out of the portal." : "Summary view only. Open the larger editor to manage portal publishing, documents, messages and access codes."} />
            {popoutMode ? (
              <ClientPortalPanel client={draft} advisers={advisers} calendarEntries={calendarEntries} generatedPortalCode={generatedPortalCode} setField={setField} updatePortalSelection={updatePortalSelection} generatePortalAccessCode={generatePortalAccessCode} copyPortalInstructions={copyPortalInstructions} publishPortalUpdate={handlePublishPortalUpdate} updatePortalMessageStatus={updatePortalMessageStatus} uploadPortalDocument={handlePortalDocumentUpload} updatePortalDocument={handlePortalDocumentUpdate} deletePortalDocument={handlePortalDocumentDelete} saving={saving} />
            ) : (
              <PortalSummaryPanel client={draft} documents={requiredDocuments} deadlines={draft.deadlines || []} appointments={linkedAppointments} billing={billingItems} portalNewMessageCount={portalNewMessageCount} visiblePortalPdfCount={visiblePortalPdfCount} onEdit={() => handleOpenPopout('portal')} />
            )}
          </div>
        )}

        {activeClientSection === 'stages' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Application stages" description={popoutMode ? "Apply, reorder and complete stages so the file progress map stays accurate." : "Summary view only. Open the larger editor to add, remove, reorder or complete stages."} />
            <div className="progress-card"><span>{currentStage}</span><b>{progressPercent(draft)}%</b><ProgressBar value={progressPercent(draft)} /></div>
            <ProgressMap client={draft} />
            {popoutMode ? (
              <section className="sub-panel workspace-panel">
                <div className="sub-panel-head compact"><div><h2>Stage editor</h2><p className="muted">Mandatory stages always apply. Optional and custom stages can be added, removed or reordered before saving the client.</p></div></div>
                <div className="stage-add-row"><input value={customStageLabel} onChange={(event) => setCustomStageLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomStage(); } }} placeholder="Add custom application stage" /><button className="btn" type="button" onClick={addCustomStage}><Plus size={16} />Add stage</button></div>
                <div className="stage-list">
                  {(draft.stages || []).map((stage, index) => (
                    <div className={`stage-row stage-row-refined ${stage.custom ? 'custom-stage' : ''}`} key={stage.id}>
                      <div className="stage-order-controls"><button className="icon-btn" type="button" disabled={index === 0} onClick={() => moveStage(stage.id, -1)}>↑</button><button className="icon-btn" type="button" disabled={index === (draft.stages || []).length - 1} onClick={() => moveStage(stage.id, 1)}>↓</button></div>
                      <label className="stage-apply-cell"><input type="checkbox" checked={stage.applied} disabled={stage.mandatory} onChange={(event) => updateStage(stage.id, { applied: event.target.checked })} /><span>{stage.mandatory ? 'Mandatory' : 'Applies'}</span></label>
                      <div className="stage-name-cell"><span>{stage.custom ? <input className="stage-label-input" value={stage.label} onChange={(event) => updateStage(stage.id, { label: event.target.value })} /> : <strong>{stage.label}</strong>}<small>{stage.mandatory ? 'Core stage' : stage.custom ? 'Custom stage' : 'Optional stage'}</small></span></div>
                      <label className="stage-complete-cell"><input type="checkbox" checked={stage.completed} disabled={!stage.applied} onChange={(event) => updateStage(stage.id, { completed: event.target.checked })} /><span>Completed</span></label>
                      <input type="date" value={stage.completedDate || ''} disabled={!stage.applied || !stage.completed} onChange={(event) => updateStage(stage.id, { completedDate: event.target.value })} />
                      <button className="icon-btn" type="button" disabled={!stage.custom} onClick={() => removeCustomStage(stage.id)} title={stage.custom ? 'Remove custom stage' : 'Hard-coded stage cannot be removed'}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <StagesSummaryPanel client={draft} onEdit={() => handleOpenPopout('stages')} />
            )}
          </div>
        )}

        {activeClientSection === 'dates' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Key dates" description={popoutMode ? "Record dates that may affect the application. Tick only the dates that should appear on the adviser dashboard." : "Summary view only. Open the larger editor to add dates or decide which ones belong on the dashboard."} />
            {popoutMode ? (
              <section className="sub-panel workspace-panel">
                <div className="sub-panel-head"><div><h2>Client deadline dates</h2><p className="muted">Add the date, then tick “Show on dashboard” only if it needs adviser follow-up.</p></div><button className="btn" onClick={addDeadline}><Plus size={16} />Deadline</button></div>
                <div className="table-like">
                  {(draft.deadlines || []).map((deadline) => {
                    const signalRow = withDeadlineSignal({ ...deadline, client: draft, source: 'deadline', diff: dateDiff(deadline.date) });
                    const signal = signalRow.deadlineSignal;
                    return (
                      <div className={`editable-row deadline-row deadline-signal-row ${signal?.dashboard ? `signal-${signal.dashboard}` : ''}`} key={deadline.id}>
                        <label><span>Deadline type</span><select value={deadline.type} onChange={(event) => updateDeadline(deadline.id, { type: event.target.value, actionStatus: deadline.actionStatus || defaultDeadlineActionStatus(event.target.value, 'deadline') })}>{deadlineTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                        <label><span>Date</span><input type="date" value={deadline.date || ''} onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })} /></label>
                        <label className="dashboard-date-toggle"><input type="checkbox" checked={isDashboardDateShown({ ...deadline, source: 'deadline' })} onChange={(event) => updateDeadline(deadline.id, { actionStatus: dashboardActionStatusFromChecked(event.target.checked), reviewDate: '' })} /><span>Show on dashboard</span></label>
                        <label className="deadline-note-field"><span>Note</span><input value={deadline.note || ''} onChange={(event) => updateDeadline(deadline.id, { note: event.target.value })} placeholder="Optional note" /></label>
                        <div className="deadline-signal-hint"><DeadlineSignalBadge row={signalRow} /><small>{signal?.reason || 'Dashboard visibility will be calculated once a date is entered.'}</small></div>
                        <button className="icon-btn" type="button" onClick={() => removeDeadline(deadline.id)}><Trash2 size={16} /></button>
                      </div>
                    );
                  })}
                  {!draft.deadlines?.length && <p className="muted center">No deadlines added yet.</p>}
                </div>
              </section>
            ) : (
              <KeyDatesSummaryPanel deadlines={draft.deadlines || []} onEdit={() => handleOpenPopout('dates')} />
            )}
          </div>
        )}

        {activeClientSection === 'billing' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Billing" description={popoutMode ? "Record billing milestones, invoice status and client-visible payment items." : "Summary view only. Open the larger editor to maintain billing milestones and invoice details."} />
            {popoutMode ? (
              <section className="sub-panel workspace-panel">
                <div className="sub-panel-head"><div><h2>Billing and invoicing schedule</h2><p className="muted">Record milestones only. No documents are stored here.</p></div><button className="btn" onClick={addBilling}><Plus size={16} />Milestone</button></div>
                <div className="table-like">
                  {(draft.billing || []).map((rawItem) => {
                    const item = normaliseBillingItem(rawItem);
                    const linkedStage = (draft.stages || []).find((stage) => stage.id === item.stageKey);
                    const linkedStageDue = item.triggerType === 'Milestone' && linkedStage?.completed ? linkedStage.completedDate : '';
                    const displayedStatus = effectiveBillingStatus(item, draft);
                    const autoOverdue = displayedStatus === 'Overdue' && item.status === 'WIP';
                    return (
                      <div className={`billing-edit-card ${displayedStatus === 'Overdue' ? 'overdue-soft' : ''}`} key={item.id}>
                        <label className="billing-field billing-description-field"><span>Billing item / description</span><input value={item.milestone || ''} onChange={(event) => updateBilling(item.id, { milestone: event.target.value })} placeholder="e.g. Lodgement fee, professional fee, balance invoice" /></label>
                        <label className="billing-field billing-trigger-field"><span>Billing based on</span><select value={item.triggerType || 'Date'} onChange={(event) => updateBilling(item.id, { triggerType: event.target.value, stageKey: event.target.value === 'Date' ? '' : item.stageKey })}><option value="Date">Date</option><option value="Milestone">Application stage / milestone</option></select></label>
                        {item.triggerType === 'Milestone' ? <label className="billing-field billing-stage-field"><span>Linked application stage</span><select value={item.stageKey || ''} onChange={(event) => updateBilling(item.id, { stageKey: event.target.value })}><option value="">Select linked stage</option>{(draft.stages || []).filter((stage) => stage.applied).map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label> : <label className="billing-field billing-date-field"><span>Billing date</span><input type="date" value={item.dueDate || ''} onChange={(event) => updateBilling(item.id, { dueDate: event.target.value })} /></label>}
                        <label className="billing-field billing-amount-field"><span>Amount</span><input type="number" value={item.amount || 0} onChange={(event) => updateBilling(item.id, { amount: event.target.value })} /></label>
                        <label className="billing-field billing-status-field"><span>Status</span><select value={item.status || 'WIP'} onChange={(event) => updateBilling(item.id, { status: event.target.value })}>{BILLING_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                        <label className="billing-field billing-invoice-field"><span>Invoice no.</span><input value={item.invoiceNo || ''} onChange={(event) => updateBilling(item.id, { invoiceNo: event.target.value })} placeholder="Invoice no." /></label>
                        <button className="icon-btn billing-remove-btn" type="button" onClick={() => removeBilling(item.id)} aria-label="Remove billing item"><Trash2 size={16} /></button>
                        <small className="billing-hint">{autoOverdue ? 'This WIP billing item is displayed as overdue because its reporting date has passed. Change status to Invoiced once raised.' : item.triggerType === 'Milestone' ? (linkedStage ? (linkedStageDue ? `Billing is now due because ${linkedStage.label} was completed on ${linkedStageDue}.` : `This billing item will become due when ${linkedStage.label} is marked complete.`) : 'Choose Application stage / milestone, then select the linked client stage that triggers this bill.') : 'This billing item will appear in period billing reports based on the billing date.'}</small>
                      </div>
                    );
                  })}
                  {!draft.billing?.length && <p className="muted center">No billing milestones added yet.</p>}
                </div>
              </section>
            ) : (
              <BillingSummaryPanel client={draft} billing={billingItems} onEdit={() => handleOpenPopout('billing')} />
            )}
          </div>
        )}

        {activeClientSection === 'family' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Family and dependants" description="Record family members relevant to the application, including partners and dependants." />
            <FamilyDetails members={draft.familyMembers || []} addFamilyMember={addFamilyMember} updateFamilyMember={updateFamilyMember} removeFamilyMember={removeFamilyMember} />
          </div>
        )}

        {activeClientSection === 'notes' && (
          <div className="client-workspace-section-stack">
            <ClientWorkspaceIntro title="Notes and strategy" description="Internal-only strategy, adviser notes, risk points and file comments. These are not shown in the client portal." />
            <section className="sub-panel strategy-panel workspace-panel"><h2>Case strategy</h2><p className="muted">Use this as the master case summary: key issues, strategy, risks, evidence gaps and agreed approach.</p><TextArea label="Case strategy / key issues" value={draft.caseStrategy} onChange={(v) => setField('caseStrategy', v)} rows={8} /></section>
            <section className="sub-panel workspace-panel"><h2>Internal notes</h2><div className="form-grid two"><TextArea label="Notes" value={draft.notes} onChange={(v) => setField('notes', v)} rows={8} /></div></section>
          </div>
        )}
      </ClientWorkspaceShell>
    </div>
  );
}


function SummaryActionButton({ children, onClick }) {
  return <button className="btn dark summary-edit-button" type="button" onClick={onClick}><ExternalLink size={16} />{children}</button>;
}

function EmptySummaryNote({ children }) {
  return <p className="muted center summary-empty-note">{children}</p>;
}

function DocumentsSummaryPanel({ documents = [], onEdit }) {
  const applied = documents.filter((item) => item.applied !== false);
  const obtained = applied.filter((item) => item.obtained);
  const outstanding = applied.filter((item) => !item.obtained);
  const preview = outstanding.slice(0, 6);
  return (
    <section className="sub-panel workspace-panel summary-editor-panel">
      <div className="sub-panel-head compact">
        <div><h2>Document checklist summary</h2><p className="muted">The detailed checklist editor is available in the pop-out record view.</p></div>
        <SummaryActionButton onClick={onEdit}>Edit documents</SummaryActionButton>
      </div>
      <div className="summary-metric-row">
        <WorkspaceStat label="Required" value={applied.length} />
        <WorkspaceStat label="Obtained" value={obtained.length} />
        <WorkspaceStat label="Outstanding" value={outstanding.length} />
      </div>
      {preview.length ? (
        <div className="summary-list clean-summary-list">
          {preview.map((item) => (
            <div className="summary-list-row" key={item.id}>
              <span className="summary-status-dot outstanding" aria-hidden="true" />
              <div><strong>{item.name}</strong><small>{item.expiryDate ? `Expiry ${formatShortDate(item.expiryDate)}` : 'No expiry date recorded'}</small></div>
              <b>Required</b>
            </div>
          ))}
          {outstanding.length > preview.length && <small className="summary-more-note">+ {outstanding.length - preview.length} more outstanding item{outstanding.length - preview.length === 1 ? '' : 's'}</small>}
        </div>
      ) : applied.length ? (
        <div className="summary-success-card"><CheckCircle2 size={18} /><strong>All required checklist items are marked obtained.</strong></div>
      ) : <EmptySummaryNote>No checklist items are currently required for this client.</EmptySummaryNote>}
    </section>
  );
}

function StagesSummaryPanel({ client, onEdit }) {
  const activeStages = appliedStages(client);
  const completed = completedStages(client);
  const nextStage = activeStages.find((stage) => !stage.completed);
  return (
    <section className="sub-panel workspace-panel summary-editor-panel">
      <div className="sub-panel-head compact">
        <div><h2>Application stage summary</h2><p className="muted">Only applied stages count toward the client progress map.</p></div>
        <SummaryActionButton onClick={onEdit}>Edit stages</SummaryActionButton>
      </div>
      <div className="summary-metric-row">
        <WorkspaceStat label="Applied stages" value={activeStages.length} />
        <WorkspaceStat label="Completed" value={completed.length} />
        <WorkspaceStat label="Progress" value={`${progressPercent(client)}%`} />
      </div>
      {activeStages.length ? (
        <div className="summary-timeline-list">
          {activeStages.map((stage, index) => (
            <div className={`summary-stage-row ${stage.completed ? 'complete' : 'open'}`} key={stage.id}>
              <span>{index + 1}</span>
              <div><strong>{stage.label}</strong><small>{stage.completed ? `Completed ${stage.completedDate ? formatShortDate(stage.completedDate) : ''}` : stage === nextStage ? 'Next stage' : 'Not completed yet'}</small></div>
              {stage.completed ? <CheckCircle2 size={18} /> : <Clock size={18} />}
            </div>
          ))}
        </div>
      ) : <EmptySummaryNote>No stages have been applied to this client yet.</EmptySummaryNote>}
    </section>
  );
}

function KeyDatesSummaryPanel({ deadlines = [], onEdit }) {
  const dated = [...deadlines].filter((item) => item.date).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  const undated = deadlines.filter((item) => !item.date);
  return (
    <section className="sub-panel workspace-panel summary-editor-panel">
      <div className="sub-panel-head compact">
        <div><h2>Key dates summary</h2><p className="muted">Dates stay on the client file. Only dates marked “Show on dashboard” appear in the main dashboard warnings.</p></div>
        <SummaryActionButton onClick={onEdit}>Edit key dates</SummaryActionButton>
      </div>
      <div className="summary-metric-row">
        <WorkspaceStat label="Recorded" value={deadlines.length} />
        <WorkspaceStat label="Dated" value={dated.length} />
        <WorkspaceStat label="Missing date" value={undated.length} />
      </div>
      {dated.length ? (
        <div className="summary-list clean-summary-list">
          {dated.slice(0, 6).map((item) => {
            const signalRow = withDeadlineSignal({ ...item, source: 'deadline', diff: dateDiff(item.date) });
            const signal = signalRow.deadlineSignal;
            return (
              <div className="summary-list-row" key={item.id}>
                <span className={`summary-status-dot ${signal?.dashboard === 'action' ? (dateDiff(item.date) < 0 ? 'overdue' : 'date') : 'quiet'}`} aria-hidden="true" />
                <div><strong>{item.type}</strong><small>{item.note || 'No note'}</small><small>{dashboardDateToggleText({ ...item, source: 'deadline' })} · {signal?.reason || ''}</small></div>
                <b>{formatShortDate(item.date)}</b>
              </div>
            );
          })}
        </div>
      ) : <EmptySummaryNote>No dated client deadlines have been recorded.</EmptySummaryNote>}
    </section>
  );
}

function BillingSummaryPanel({ client, billing = [], onEdit }) {
  const items = billing.map(normaliseBillingItem);
  const active = items.filter((item) => effectiveBillingStatus(item, client) !== 'Invoiced');
  const invoiced = items.filter((item) => effectiveBillingStatus(item, client) === 'Invoiced');
  const activeAmount = active.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return (
    <section className="sub-panel workspace-panel summary-editor-panel">
      <div className="sub-panel-head compact">
        <div><h2>Billing summary</h2><p className="muted">The detailed billing editor is available in the pop-out record view.</p></div>
        <SummaryActionButton onClick={onEdit}>Edit billing</SummaryActionButton>
      </div>
      <div className="summary-metric-row">
        <WorkspaceStat label="Milestones" value={items.length} />
        <WorkspaceStat label="Active amount" value={formatCurrency(activeAmount)} />
        <WorkspaceStat label="Invoiced" value={invoiced.length} />
      </div>
      {items.length ? (
        <div className="summary-list clean-summary-list">
          {items.slice(0, 6).map((item) => {
            const status = effectiveBillingStatus(item, client);
            return (
              <div className="summary-list-row" key={item.id}>
                <span className={`summary-status-dot ${status.toLowerCase()}`} aria-hidden="true" />
                <div><strong>{item.milestone || 'Billing milestone'}</strong><small>{[formatCurrency(item.amount), billingReportingDate(item, client) ? formatShortDate(billingReportingDate(item, client)) : '', item.invoiceNo ? `Invoice ${item.invoiceNo}` : ''].filter(Boolean).join(' · ') || 'No billing detail'}</small></div>
                <b>{status}</b>
              </div>
            );
          })}
        </div>
      ) : <EmptySummaryNote>No billing milestones have been recorded.</EmptySummaryNote>}
    </section>
  );
}

function PortalSummaryPanel({ client, documents = [], deadlines = [], appointments = [], billing = [], portalNewMessageCount = 0, visiblePortalPdfCount = 0, onEdit }) {
  const visibleDocs = new Set(client.portalVisibleDocumentIds || []);
  const visibleDeadlines = new Set(client.portalVisibleDeadlineIds || []);
  const visibleAppointments = new Set(client.portalVisibleAppointmentIds || []);
  const visibleBilling = new Set(client.portalVisibleBillingIds || []);
  const publishedChecklistCount = documents.filter((item) => visibleDocs.has(item.id)).length;
  const publishedDateCount = deadlines.filter((item) => visibleDeadlines.has(item.id)).length;
  const publishedAppointmentCount = appointments.filter((item) => visibleAppointments.has(item.id)).length;
  const publishedBillingCount = billing.filter((item) => visibleBilling.has(item.id)).length;
  const publishedResourceCount = PORTAL_RESOURCE_PAGES.filter((page) => normalisePortalResourceSettings(client.portalResourceSettings)[page.key]?.enabled).length;
  return (
    <section className="sub-panel workspace-panel summary-editor-panel">
      <div className="sub-panel-head compact">
        <div><h2>Portal publishing summary</h2><p className="muted">This view shows the portal position without squeezing the full publishing console into the client page.</p></div>
        <SummaryActionButton onClick={onEdit}>Edit portal</SummaryActionButton>
      </div>
      <div className="portal-summary-status-card">
        <span className={`summary-status-dot ${client.portalEnabled ? 'complete' : 'inactive'}`} />
        <div><strong>{client.portalEnabled ? 'Portal active' : 'Portal inactive'}</strong><small>{client.portalEnabled ? `Login email: ${client.portalEmail || client.email || 'not set'}` : 'Open the portal editor to enable access and publish an update.'}</small></div>
        <b className={`portal-summary-visibility-chip ${client.portalEnabled ? 'visible' : 'hidden'}`}>{client.portalEnabled ? 'Client access on' : 'Client access off'}</b>
      </div>
      <div className="summary-metric-row four">
        <WorkspaceStat label="Checklist items" value={publishedChecklistCount} />
        <WorkspaceStat label="Key dates" value={publishedDateCount} />
        <WorkspaceStat label="Appointments" value={publishedAppointmentCount} />
        <WorkspaceStat label="Billing" value={publishedBillingCount} />
        <WorkspaceStat label="PDFs" value={visiblePortalPdfCount} />
        <WorkspaceStat label="Resources" value={publishedResourceCount} />
        <WorkspaceStat label="Client notes" value={portalNewMessageCount} />
      </div>
    </section>
  );
}

function ClientSnapshotCard({ client, advisers = [], currentStage, outstandingDocuments = [], requiredDocuments = [], upcomingDeadlines = [], linkedAppointments = [], portalNewMessageCount = 0 }) {
  const primary = advisers.find((adviser) => adviser.id === client.primaryAdviserId);
  const nearestDeadline = upcomingDeadlines[0];
  const nearestDiff = nearestDeadline?.date ? dateDiff(nearestDeadline.date) : null;
  const nextAppointment = linkedAppointments.slice().sort((a, b) => String(a.appointmentDate || '').localeCompare(String(b.appointmentDate || '')))[0];
  const health = clientHealthStatus(client, outstandingDocuments, nearestDiff, portalNewMessageCount);
  return (
    <section className="client-snapshot-card" aria-label="Client snapshot">
      <div className="client-snapshot-head">
        <div>
          <span className="eyebrow">Client snapshot</span>
          <h2>{clientName(client)}</h2>
          <p>{client.caseType || 'No case type selected'} · {primary?.name || 'Unassigned'}</p>
        </div>
        <span className={`client-health-pill ${health.key}`}>{health.label}</span>
      </div>
      <div className="client-snapshot-grid">
        <div><span>Stage</span><strong>{currentStage || 'Not set'}</strong></div>
        <div><span>Next action</span><strong>{client.nextActionDue || 'No date'}</strong><small>{client.nextAction || 'No next action set'}</small></div>
        <div><span>Nearest action date</span><strong>{nearestDeadline?.date || 'None actionable'}</strong>{nearestDiff !== null && <DeadlineSignalBadge row={nearestDeadline} />}</div>
        <div><span>Documents</span><strong>{outstandingDocuments.length}/{requiredDocuments.length} outstanding</strong></div>
        <div><span>Portal</span><strong>{client.portalEnabled ? 'Active' : 'Inactive'}</strong><small>{portalNewMessageCount ? `${portalNewMessageCount} new client note${portalNewMessageCount === 1 ? '' : 's'}` : 'No new client notes'}</small></div>
        <div><span>Next appointment</span><strong>{nextAppointment?.appointmentDate || 'None booked'}</strong><small>{nextAppointment?.title || ''}</small></div>
      </div>
    </section>
  );
}

function clientHealthStatus(client, outstandingDocuments = [], nearestDeadlineDiff = null, portalNewMessageCount = 0) {
  if (!client.nextActionDue || portalNewMessageCount > 0 || nearestDeadlineDiff !== null && nearestDeadlineDiff <= 30) return { key: 'attention', label: 'Needs attention' };
  if (outstandingDocuments.length > 0 || nearestDeadlineDiff !== null && nearestDeadlineDiff <= 60) return { key: 'watch', label: 'Watch' };
  return { key: 'good', label: 'Good' };
}

function ClientWorkspaceShell({ sections, activeSection, onSelect, children }) {
  return (
    <section className="client-workspace">
      <aside className="client-workspace-nav" aria-label="Client record sections">
        <div className="client-workspace-nav-head">
          <strong>Client workspace</strong>
          <span>Work through one section at a time.</span>
        </div>
        <div className="client-workspace-section-list">
          {sections.map((section) => {
            const Icon = section.icon || FileText;
            const active = activeSection === section.id;
            return (
              <button key={section.id} type="button" className={`client-workspace-nav-card ${active ? 'active' : ''}`} onClick={() => onSelect(section.id)}>
                <span className="client-workspace-nav-icon"><Icon size={18} /></span>
                <span className="client-workspace-nav-copy"><strong>{section.label}</strong><small>{section.summary}</small></span>
                {section.badge && <b className="client-workspace-nav-badge">{section.badge}</b>}
              </button>
            );
          })}
        </div>
      </aside>
      <div className="client-workspace-body">{children}</div>
    </section>
  );
}

function ClientWorkspaceIntro({ title, description }) {
  return (
    <div className="client-workspace-intro">
      <div>
        <span className="eyebrow">Client file section</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function WorkspaceStat({ label, value }) {
  return (
    <div className="workspace-stat">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}


function ExpandableClientSection({ title, summary, isOpen, onToggle, children, badge }) {
  const displayTitle = String(title || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <>
      <div className={`client-record-toggle section-toggle ${isOpen ? 'open' : ''}`}>
        <button className="section-toggle-button" type="button" onClick={onToggle}>
          <ChevronRight size={18} className="section-toggle-icon" />
          <span>{displayTitle}</span>
        </button>
        <span className="section-summary">{summary}</span>
        {badge && <b className={`section-status-pill ${String(badge).toLowerCase()}`}>{badge}</b>}
      </div>
      {isOpen && <section className="sub-panel collapsible-sub-panel">{children}</section>}
    </>
  );
}


function DocumentChecklist({ items, updateItem, addCustomItem, removeCustomItem }) {
  const [customItemName, setCustomItemName] = useState('');
  const [showNotRequired, setShowNotRequired] = useState(false);
  const includedItems = items.filter((item) => item.applied);
  const notRequiredItems = items.filter((item) => !item.applied);
  const obtainedCount = includedItems.filter((item) => item.obtained).length;
  const visibleItems = showNotRequired ? items : includedItems;

  function handleAddCustomItem() {
    const added = addCustomItem(customItemName);
    if (added !== false) setCustomItemName('');
  }

  return (
    <section className="sub-panel document-checklist-panel">
      <div className="sub-panel-head">
        <div>
          <h2>Document checklist</h2>
          <p className="muted">Keep the active checklist lean. Not-required items are hidden unless you choose to review them.</p>
        </div>
        <div className="document-checklist-actions">
          <span className="workload-count">{obtainedCount}/{includedItems.length} obtained</span>
          {!!notRequiredItems.length && <button className="btn secondary" type="button" onClick={() => setShowNotRequired((value) => !value)}>{showNotRequired ? 'Hide not required' : `Show ${notRequiredItems.length} not required`}</button>}
        </div>
      </div>
      <div className="custom-document-add-row">
        <input value={customItemName} onChange={(event) => setCustomItemName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddCustomItem(); } }} placeholder="Add custom document item" />
        <button className="btn" type="button" onClick={handleAddCustomItem}><Plus size={16} />Add document</button>
      </div>
      <div className="document-checklist-list">
        {visibleItems.map((item) => (
          item.applied ? (
            <div className="document-checklist-row" key={item.id}>
              <label className="doc-include"><input type="checkbox" checked={item.applied} onChange={(event) => updateItem(item.id, { applied: event.target.checked, obtained: event.target.checked ? item.obtained : false })} /><span>Required</span></label>
              <label className="doc-name"><span>Document</span>{item.custom ? <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /> : <strong>{item.name}</strong>}</label>
              <label className="doc-expiry"><span>Expiry date</span><input type="date" value={item.expiryDate || ''} onChange={(event) => updateItem(item.id, { expiryDate: event.target.value })} /></label>
              <label className="doc-dashboard dashboard-date-toggle"><input type="checkbox" checked={isDashboardDateShown({ ...item, type: `Document Expiry: ${item.name}`, source: 'document-expiry' })} onChange={(event) => updateItem(item.id, { actionStatus: dashboardActionStatusFromChecked(event.target.checked), reviewDate: '' })} /><span>Show on dashboard</span></label>
              <label className="doc-obtained"><input type="checkbox" checked={item.obtained} onChange={(event) => updateItem(item.id, { obtained: event.target.checked })} /><span>Obtained</span></label>
              <button className="icon-btn" type="button" disabled={!item.custom} onClick={() => removeCustomItem(item.id)} title={item.custom ? 'Remove custom checklist item' : 'Standard item can be marked not required, not deleted'}><Trash2 size={16} /></button>
            </div>
          ) : (
            <div className="document-checklist-row muted-row document-checklist-row-hidden" key={item.id}>
              <label className="doc-include"><input type="checkbox" checked={item.applied} onChange={(event) => updateItem(item.id, { applied: event.target.checked })} /><span>Required</span></label>
              <div className="doc-hidden-name"><span>Document</span><strong>{item.name}</strong><small>Not required for this application</small></div>
              {item.custom ? <button className="icon-btn" type="button" onClick={() => removeCustomItem(item.id)} title="Remove custom checklist item"><Trash2 size={16} /></button> : <span className="doc-hidden-spacer" aria-hidden="true" />}
            </div>
          )
        ))}
        {!visibleItems.length && <p className="muted center">No required document items selected yet. Use “Show not required” to add standard items back in.</p>}
      </div>
    </section>
  );
}

function TasksDashboard({ taskRows, personalTasks, allClients, advisers, dashboardAdviserFilter, savePersonalTask, deletePersonalTask, saveCalendarEntry, deleteCalendarEntry, saving, setTab, setSelectedClientId, openClientRecord }) {
  const [sortMode, setSortMode] = useState('priority');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedPersonalTask, setSelectedPersonalTask] = useState(null);
  const [selectedCalendarEntry, setSelectedCalendarEntry] = useState(null);

  const scopeLabel = dashboardAdviserFilter === 'all' ? 'All advisers' : advisers.find((adviser) => adviser.id === dashboardAdviserFilter)?.name || 'Selected adviser';
  const types = useMemo(() => Array.from(new Set(taskRows.map((row) => row.type))).sort(), [taskRows]);

  useEffect(() => {
    if (!selectedPersonalTask?.id) return;
    const freshTask = personalTasks.find((task) => task.id === selectedPersonalTask.id);
    if (freshTask) setSelectedPersonalTask(freshTask);
  }, [personalTasks, selectedPersonalTask?.id]);

  useEffect(() => {
    if (!selectedCalendarEntry?.id) return;
    const freshEntry = taskRows.find((row) => row.source === 'calendar-entry' && row.calendarEntry?.id === selectedCalendarEntry.id)?.calendarEntry;
    if (freshEntry) setSelectedCalendarEntry(freshEntry);
  }, [taskRows, selectedCalendarEntry?.id]);

  const visibleTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return taskRows
      .filter((row) => statusFilter === 'all' || taskStatusKey(row) === statusFilter || (statusFilter === 'next-30' && row.diff >= 0 && row.diff <= 30))
      .filter((row) => typeFilter === 'all' || row.type === typeFilter)
      .filter((row) => !q || taskSearchText(row).includes(q))
      .sort((a, b) => compareTasks(a, b, sortMode));
  }, [taskRows, statusFilter, typeFilter, taskSearch, sortMode]);

  const counts = taskRows.reduce((acc, row) => {
    acc.total += 1;
    if (row.diff < 0) acc.overdue += 1;
    if (row.diff === 0) acc.today += 1;
    if (row.diff >= 0 && row.diff <= 7) acc.next7 += 1;
    if (row.diff >= 0 && row.diff <= 30) acc.next30 += 1;
    if (row.source === 'personal-task') acc.personal += 1;
    if (row.source === 'calendar-entry') acc.calendar += 1;
    return acc;
  }, { total: 0, overdue: 0, today: 0, next7: 0, next30: 0, personal: 0, calendar: 0 });

  function openTask(row) {
    if (row.source === 'personal-task' && row.personalTask) {
      setSelectedPersonalTask(row.personalTask);
      return;
    }
    if (row.source === 'calendar-entry' && row.calendarEntry) {
      setSelectedCalendarEntry(row.calendarEntry);
      return;
    }
    if (!row.client) return;
    if (openClientRecord) return openClientRecord(row.client.id);
    setSelectedClientId(row.client.id);
    setTab('clients');
  }

  function openLinkedClient(clientId) {
    if (!clientId) return;
    setSelectedPersonalTask(null);
    setSelectedCalendarEntry(null);
    if (openClientRecord) return openClientRecord(clientId);
    setSelectedClientId(clientId);
    setTab('clients');
  }

  return (
    <div className="stack">
      <section className="panel dashboard-heading">
        <div>
          <h2>Task list</h2>
          <p className="muted">Deadlines, expiry dates, next-action dates, calendar appointments and adviser reminders for the current view: {scopeLabel}.</p>
        </div>
        <span>{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'} shown</span>
      </section>

      <div className="metric-grid four">
        <MetricCard label="Total tasks" value={counts.total} note="All dated active tasks in this view" icon={ListChecks} />
        <MetricCard label="Overdue" value={counts.overdue} note="Past due dates" icon={AlertTriangle} warning />
        <MetricCard label="Due today" value={counts.today} note="Needs action now" icon={Clock} />
        <MetricCard label="Personal tasks" value={counts.personal} note="Internal adviser reminders" icon={UserRound} />
      </div>

      <section className="panel">
        <div className="task-toolbar">
          <label>
            <span>Sort</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
              <option value="priority">Priority order</option>
              <option value="date-asc">Date: earliest first</option>
              <option value="date-desc">Date: latest first</option>
              <option value="client">Client A-Z</option>
              <option value="type">Deadline type</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="next-7">Next 7 days</option>
              <option value="next-30">Next 30 days</option>
              <option value="future">Future</option>
            </select>
          </label>
          <label>
            <span>Type</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All task types</option>
              {types.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="task-search">
            <span>Search tasks</span>
            <div><Search size={16} /><input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Client, adviser, task, note or type" /></div>
          </label>
        </div>

        <div className="task-table">
          <div className="task-head"><span>Preference</span><span>Client / task</span><span>Task / date</span><span>Adviser</span><span>Note</span><span></span></div>
          {visibleTasks.map((row) => {
            const isPersonal = row.source === 'personal-task';
            const isCalendar = row.source === 'calendar-entry';
            return (
              <div className={`task-line ${taskStatusKey(row)} ${isPersonal ? 'personal-task-line' : ''} ${isCalendar ? 'calendar-task-line' : ''}`} key={row.id}>
                <span><DeadlineBadge diff={row.diff} /></span>
                <span><strong>{taskDisplayName(row)}</strong><small>{taskContextLabel(row)}</small><small>{row.client?.caseStrategy ? 'Strategy added' : isPersonal ? 'Internal adviser reminder' : isCalendar ? 'Calendar appointment' : 'No case strategy yet'}</small></span>
                <span><strong>{row.type}</strong><small>{row.date}</small></span>
                <span>{taskAdviserName(row, advisers)}</span>
                <span>{row.note || '—'}</span>
                <button className="btn ghost" type="button" disabled={!row.client && !isPersonal && !isCalendar} onClick={() => openTask(row)}>{isPersonal ? 'Open task' : isCalendar ? 'Open appointment' : 'Open'}</button>
              </div>
            );
          })}
          {!visibleTasks.length && <p className="muted center">No tasks match the selected filters.</p>}
        </div>
      </section>

      <PersonalTasksPanel personalTasks={personalTasks} allClients={allClients} advisers={advisers} dashboardAdviserFilter={dashboardAdviserFilter} savePersonalTask={savePersonalTask} deletePersonalTask={deletePersonalTask} saving={saving} />

      {selectedPersonalTask && (
        <PersonalTaskModal
          task={selectedPersonalTask}
          allClients={allClients}
          advisers={advisers}
          saving={saving}
          onClose={() => setSelectedPersonalTask(null)}
          onSave={savePersonalTask}
          onDelete={async (taskId) => {
            await deletePersonalTask(taskId);
            setSelectedPersonalTask(null);
          }}
          onOpenClient={openLinkedClient}
        />
      )}

      {selectedCalendarEntry && (
        <CalendarTaskModal
          entry={selectedCalendarEntry}
          allClients={allClients}
          advisers={advisers}
          saving={saving}
          onClose={() => setSelectedCalendarEntry(null)}
          onSave={async (entry) => {
            await saveCalendarEntry(entry);
            setSelectedCalendarEntry(null);
          }}
          onDelete={async (entryId) => {
            await deleteCalendarEntry(entryId);
            setSelectedCalendarEntry(null);
          }}
          onOpenClient={openLinkedClient}
        />
      )}
    </div>
  );
}

function PersonalTasksPanel({ personalTasks, allClients, advisers, dashboardAdviserFilter, savePersonalTask, deletePersonalTask, saving }) {
  const defaultAdviserId = dashboardAdviserFilter !== 'all' ? dashboardAdviserFilter : advisers[0]?.id || '';
  const [draft, setDraft] = useState(() => makeBlankPersonalTask(defaultAdviserId));
  const [showCompleted, setShowCompleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    setDraft((current) => current.adviserId ? current : makeBlankPersonalTask(defaultAdviserId));
  }, [defaultAdviserId]);

  const visiblePersonalTasks = useMemo(() => personalTasks
    .filter((task) => showCompleted || task.status !== 'Completed')
    .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')),
    [personalTasks, showCompleted]);

  const openCount = personalTasks.filter((task) => task.status !== 'Completed').length;

  async function submit(event) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setFormMessage('Enter a task title first.');
      return;
    }
    await savePersonalTask(draft);
    setDraft(makeBlankPersonalTask(defaultAdviserId));
    setFormMessage(`Task saved ${formatTimeNow()}.`);
  }

  async function quickUpdate(task, patch) {
    await savePersonalTask({ ...task, ...patch });
  }

  return (
    <section className="panel personal-task-panel">
      <div className="sub-panel-head personal-task-centre-head">
        <div>
          <h2>Personal task centre</h2>
          <p className="muted">Internal adviser reminders sit here, away from the main client workflow. Open personal tasks directly from the task list, or manage them here.</p>
        </div>
        <div className="personal-task-actions">
          <span className="mini-pill">{openCount} open</span>
          <button className="btn ghost" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Hide personal tasks' : 'Manage personal tasks'}</button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="personal-task-options-row">
            <label className="compact-check"><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />Show completed</label>
          </div>

          <form className="personal-task-form" onSubmit={submit}>
            <label><span>Task</span><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Call client, review file, follow up INZ" /></label>
            <label><span>Adviser</span><select value={draft.adviserId} onChange={(event) => setDraft((current) => ({ ...current, adviserId: event.target.value }))}><option value="">Unassigned</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>
            <label><span>Linked client</span><select value={draft.clientId} onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))}><option value="">No linked client</option>{allClients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}</select></label>
            <label><span>Due date</span><input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} /></label>
            <label className="personal-task-note"><span>Note</span><input value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Optional detail" /></label>
            <button className="btn dark" type="submit" disabled={saving}><Plus size={16} />Add task</button>
          </form>

          {formMessage && <p className="inline-status">{formMessage}</p>}

          <div className="personal-task-list">
            {visiblePersonalTasks.map((task) => {
              const adviser = advisers.find((item) => item.id === task.adviserId);
              const client = allClients.find((item) => item.id === task.clientId);
              const diff = dateDiff(task.dueDate);
              return (
                <div className={`personal-task-row ${task.status === 'Completed' ? 'completed' : taskStatusKey({ diff })}`} key={task.id}>
                  <span><DeadlineBadge diff={diff} /></span>
                  <span><strong>{task.title}</strong><small>{task.note || 'No note'}</small></span>
                  <span>{adviser?.name || 'Unassigned'}<small>{client ? `${client.firstName} ${client.lastName}` : 'No linked client'}</small></span>
                  <span><input type="date" value={task.dueDate || ''} onChange={(event) => quickUpdate(task, { dueDate: event.target.value })} /></span>
                  <span><select value={task.status || 'Open'} onChange={(event) => quickUpdate(task, { status: event.target.value })}><option>Open</option><option>Completed</option></select></span>
                  <button className="icon-btn" type="button" onClick={() => deletePersonalTask(task.id)} aria-label="Delete personal task"><Trash2 size={16} /></button>
                </div>
              );
            })}
            {!visiblePersonalTasks.length && <p className="muted center">No personal tasks in this adviser view.</p>}
          </div>
        </>
      )}
    </section>
  );
}

function PersonalTaskModal({ task, allClients, advisers, saving, onClose, onSave, onDelete, onOpenClient }) {
  const [draft, setDraft] = useState(() => normalisePersonalTask(task));
  const linkedClient = allClients.find((client) => client.id === draft.clientId);

  useEffect(() => {
    setDraft(normalisePersonalTask(task));
  }, [task?.id]);

  async function saveAndClose(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    await onSave({ ...draft, title: draft.title.trim() });
    onClose();
  }

  async function completeTask() {
    await onSave({ ...draft, status: 'Completed' });
    onClose();
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Personal task editor">
      <button className="modal-backdrop" type="button" aria-label="Close personal task editor" onClick={onClose}></button>
      <form className="modal-card personal-task-editor" onSubmit={saveAndClose}>
        <div className="modal-head">
          <div>
            <span>Personal adviser task</span>
            <h2>{draft.title || 'Personal task'}</h2>
            <p className="muted">Edit, complete or remove this internal reminder without leaving the task list.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close personal task editor"><X size={18} /></button>
        </div>

        <div className="form-grid two personal-task-editor-grid">
          <label className="field"><span>Task</span><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
          <label className="field"><span>Due date</span><input type="date" value={draft.dueDate || ''} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} /></label>
          <label className="field"><span>Adviser</span><select value={draft.adviserId} onChange={(event) => setDraft((current) => ({ ...current, adviserId: event.target.value }))}><option value="">Unassigned</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>
          <label className="field"><span>Status</span><select value={draft.status || 'Open'} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option>Open</option><option>Completed</option></select></label>
          <label className="field"><span>Linked client</span><select value={draft.clientId || ''} onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))}><option value="">No linked client</option>{allClients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}</select></label>
          <label className="field personal-task-editor-note"><span>Note</span><textarea rows={4} value={draft.note || ''} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} /></label>
        </div>

        {linkedClient && (
          <div className="current-action-card personal-linked-client-card">
            <span>Linked client</span>
            <strong>{linkedClient.firstName} {linkedClient.lastName}</strong>
            <small>{linkedClient.caseType || 'No case type set'}</small>
            <button className="btn ghost" type="button" onClick={() => onOpenClient(linkedClient.id)}>Open linked client</button>
          </div>
        )}

        <div className="modal-actions personal-task-modal-actions">
          <button className="btn ghost" type="button" onClick={onClose}>Close</button>
          <button className="btn danger" type="button" disabled={saving} onClick={() => onDelete(draft.id)}><Trash2 size={16} />Delete</button>
          <button className="btn ghost" type="button" disabled={saving || draft.status === 'Completed'} onClick={completeTask}><CheckCircle2 size={16} />Complete & remove from list</button>
          <button className="btn dark" type="submit" disabled={saving || !draft.title.trim()}><Save size={16} />Save task</button>
        </div>
      </form>
    </div>
  );
}


function CalendarTaskModal({ entry, allClients, advisers, saving, onClose, onSave, onDelete, onOpenClient }) {
  const [draft, setDraft] = useState(() => normaliseCalendarEntry(entry));
  const linkedClient = allClients.find((client) => client.id === draft.clientId);

  useEffect(() => {
    setDraft(normaliseCalendarEntry(entry));
  }, [entry?.id]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveAndClose(event) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.appointmentDate) return;
    await onSave({ ...draft, title: draft.title.trim() });
  }

  async function completeAppointment() {
    await onSave({ ...draft, status: 'Completed' });
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Calendar appointment editor">
      <button className="modal-backdrop" type="button" aria-label="Close calendar appointment editor" onClick={onClose}></button>
      <form className="modal-card personal-task-editor calendar-task-editor" onSubmit={saveAndClose}>
        <div className="modal-head">
          <div>
            <span>Calendar appointment</span>
            <h2>{draft.title || 'Appointment'}</h2>
            <p className="muted">Edit, complete or remove this appointment without leaving the task list. Open appointments continue to appear as bring-up items.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close calendar appointment editor"><X size={18} /></button>
        </div>

        <div className="form-grid two personal-task-editor-grid">
          <label className="field"><span>Title</span><input value={draft.title} onChange={(event) => update('title', event.target.value)} /></label>
          <label className="field"><span>Appointment type</span><select value={draft.appointmentType || APPOINTMENT_TYPES[0]} onChange={(event) => update('appointmentType', event.target.value)}>{APPOINTMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className="field"><span>Date</span><input type="date" value={draft.appointmentDate || ''} onChange={(event) => update('appointmentDate', event.target.value)} /></label>
          <label className="field"><span>Status</span><select value={draft.status || 'Open'} onChange={(event) => update('status', event.target.value)}><option>Open</option><option>Completed</option></select></label>
          <label className="field"><span>Start time</span><input type="time" value={draft.startTime || ''} onChange={(event) => update('startTime', event.target.value)} /></label>
          <label className="field"><span>End time</span><input type="time" value={draft.endTime || ''} onChange={(event) => update('endTime', event.target.value)} /></label>
          <label className="field"><span>Adviser</span><select value={draft.adviserId || ''} onChange={(event) => update('adviserId', event.target.value)}><option value="">Unassigned</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>
          <label className="field"><span>Linked client</span><select value={draft.clientId || ''} onChange={(event) => update('clientId', event.target.value)}><option value="">No linked client</option>{allClients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}</select></label>
          <label className="field"><span>Location</span><input value={draft.location || ''} onChange={(event) => update('location', event.target.value)} placeholder="Office, Teams, Zoom, phone" /></label>
          <label className="field personal-task-editor-note"><span>Notes</span><textarea rows={4} value={draft.notes || ''} onChange={(event) => update('notes', event.target.value)} /></label>
        </div>

        {linkedClient && (
          <div className="current-action-card personal-linked-client-card">
            <span>Linked client</span>
            <strong>{linkedClient.firstName} {linkedClient.lastName}</strong>
            <small>{linkedClient.caseType || 'No case type set'}</small>
            <button className="btn ghost" type="button" onClick={() => onOpenClient(linkedClient.id)}>Open linked client</button>
          </div>
        )}

        {!linkedClient && (
          <div className="current-action-card calendar-unlinked-card">
            <span>No linked client</span>
            <strong>This appointment is adviser-only.</strong>
            <small>Mark it completed to remove it from the task list, or delete it if it was created in error.</small>
          </div>
        )}

        <div className="modal-actions personal-task-modal-actions">
          <button className="btn ghost" type="button" onClick={onClose}>Close</button>
          <button className="btn danger" type="button" disabled={saving} onClick={() => onDelete(draft.id)}><Trash2 size={16} />Delete</button>
          <button className="btn ghost" type="button" disabled={saving || draft.status === 'Completed'} onClick={completeAppointment}><CheckCircle2 size={16} />Complete & remove from list</button>
          <button className="btn dark" type="submit" disabled={saving || !draft.title.trim() || !draft.appointmentDate}><Save size={16} />Save appointment</button>
        </div>
      </form>
    </div>
  );
}


function CalendarWorkspace({ entries, clients, scopedClients, advisers, dashboardAdviserFilter, saveCalendarEntry, deleteCalendarEntry, saveClient, saving, openClientRecord, onDirtyChange }) {
  const [viewMode, setViewMode] = useState('current');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthInput());
  const [calendarSearch, setCalendarSearch] = useState('');
  const [draft, setDraft] = useState(null);
  const [calendarMessage, setCalendarMessage] = useState('');
  const [editorDirty, setEditorDirty] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState(makeBlankCalendarFollowUp());

  const defaultAdviserId = dashboardAdviserFilter !== 'all' ? dashboardAdviserFilter : advisers[0]?.id || '';
  const scopeLabel = dashboardAdviserFilter === 'all' ? 'All advisers' : advisers.find((adviser) => adviser.id === dashboardAdviserFilter)?.name || 'Selected adviser';
  const range = useMemo(() => calendarViewRange(viewMode, selectedMonth), [viewMode, selectedMonth]);

  useEffect(() => {
    onDirtyChange?.(editorDirty);
    return () => onDirtyChange?.(false);
  }, [editorDirty, onDirtyChange]);

  const visibleEntries = useMemo(() => {
    const q = calendarSearch.trim().toLowerCase();
    return entries
      .filter((entry) => entry.appointmentDate >= range.start && entry.appointmentDate < range.end)
      .filter((entry) => !q || calendarEntrySearchText(entry, clients, advisers).includes(q))
      .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate) || (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title));
  }, [entries, range, calendarSearch, clients, advisers]);

  const openEntries = visibleEntries.filter((entry) => entry.status !== 'Completed');
  const overdueOpenEntries = openEntries.filter((entry) => dateDiff(entry.appointmentDate) < 0);
  const linkedEntries = visibleEntries.filter((entry) => entry.clientId);
  const monthKeys = calendarMonthKeys(range.start, viewMode === 'three' ? 3 : 1);

  function confirmDiscardCalendarDraft() {
    return !editorDirty || window.confirm('You have unsaved calendar changes. Discard those changes?');
  }

  function closeEditor() {
    if (!confirmDiscardCalendarDraft()) return;
    setDraft(null);
    setFollowUpDraft(makeBlankCalendarFollowUp());
    setEditorDirty(false);
  }

  function startNew(dateValue = '') {
    if (!confirmDiscardCalendarDraft()) return;
    setCalendarMessage('');
    setDraft(makeBlankCalendarEntry(defaultAdviserId, dateValue || todayIso()));
    setFollowUpDraft(makeBlankCalendarFollowUp());
    setEditorDirty(false);
  }

  function editEntry(entry) {
    if (!confirmDiscardCalendarDraft()) return;
    setCalendarMessage('');
    setDraft(normaliseCalendarEntry(entry));
    setFollowUpDraft(makeBlankCalendarFollowUp());
    setEditorDirty(false);
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.appointmentDate) {
      setCalendarMessage('Add an appointment date before saving.');
      return;
    }
    await saveCalendarEntry(draft);
    if (followUpDraft.enabled && draft.clientId && (followUpDraft.action.trim() || followUpDraft.dueDate)) {
      const linkedClient = clients.find((client) => client.id === draft.clientId);
      if (linkedClient) {
        await saveClient({
          ...linkedClient,
          nextAction: followUpDraft.action.trim() || `Follow up: ${draft.title || 'Appointment'}`,
          nextActionDue: followUpDraft.dueDate || '',
        });
      }
    }
    setCalendarMessage(followUpDraft.enabled && draft.clientId ? `Calendar entry saved and client follow-up action updated ${formatTimeNow()}.` : `Calendar entry saved ${formatTimeNow()}.`);
    setDraft(null);
    setFollowUpDraft(makeBlankCalendarFollowUp());
    setEditorDirty(false);
  }

  async function deleteDraft() {
    if (!draft || String(draft.id || '').startsWith('temp-')) {
      setDraft(null);
      setFollowUpDraft(makeBlankCalendarFollowUp());
      setEditorDirty(false);
      return;
    }
    await deleteCalendarEntry(draft.id);
    setCalendarMessage('Calendar entry deleted.');
    setDraft(null);
    setFollowUpDraft(makeBlankCalendarFollowUp());
    setEditorDirty(false);
  }

  function updateDraft(field, value) {
    setCalendarMessage('');
    setEditorDirty(true);
    setDraft((current) => {
      const base = current || makeBlankCalendarEntry(defaultAdviserId);
      const next = { ...base, [field]: value };
      if (field === 'status' && value === 'Completed' && base.status !== 'Completed' && base.clientId) {
        setFollowUpDraft((existing) => ({
          ...existing,
          enabled: true,
          action: existing.action || `Follow up after ${base.title || 'appointment'}`,
          dueDate: existing.dueDate || addDaysIso(base.appointmentDate || todayIso(), 1),
        }));
      }
      return next;
    });
  }

  function updateFollowUp(patch) {
    setCalendarMessage('');
    setEditorDirty(true);
    setFollowUpDraft((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="stack">
      <section className="panel dashboard-heading">
        <div>
          <h2>Calendar</h2>
          <p className="muted">Book appointments, link them to clients and advisers, and feed open appointments into the task list. Current scope: {scopeLabel}.</p>
        </div>
        <button className="btn dark" type="button" onClick={() => startNew()}><Plus size={16} />Book appointment</button>
      </section>

      <div className="metric-grid four">
        <MetricCard label="Appointments shown" value={visibleEntries.length} note={periodLabel(range)} icon={CalendarDays} />
        <MetricCard label="Open calendar tasks" value={openEntries.length} note="Appear in dashboard/tasks" icon={ListChecks} />
        <MetricCard label="Overdue appointments" value={overdueOpenEntries.length} note="Open entries in the past" icon={AlertTriangle} warning={overdueOpenEntries.length > 0} />
        <MetricCard label="Linked to clients" value={linkedEntries.length} note="Appointments with client context" icon={UsersRound} />
      </div>

      <section className="panel calendar-controls-panel">
        <div className="calendar-controls">
          <label>
            <span>Calendar view</span>
            <select value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
              <option value="current">Current month</option>
              <option value="three">Current month + 2 months</option>
              <option value="search">Search month</option>
            </select>
          </label>
          <label>
            <span>Search month</span>
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || currentMonthInput())} disabled={viewMode !== 'search'} />
          </label>
          <label className="calendar-search-field">
            <span>Search appointments</span>
            <div><Search size={16} /><input value={calendarSearch} onChange={(event) => setCalendarSearch(event.target.value)} placeholder="Client, adviser, appointment, location or notes" /></div>
          </label>
          <button className="btn" type="button" onClick={() => startNew(range.start)}><Plus size={16} />Add in this period</button>
        </div>
        {calendarMessage && <p className="inline-status">{calendarMessage}</p>}
      </section>

      <div className="calendar-layout">
        <section className="panel calendar-list-panel">
          <div className="sub-panel-head">
            <div>
              <h2>{calendarViewTitle(viewMode, selectedMonth)}</h2>
              <p className="muted">Open entries are treated as task-style bring-up items until marked completed.</p>
            </div>
            <span className="workload-count">{visibleEntries.length} shown</span>
          </div>
          <div className="calendar-month-list">
            {monthKeys.map((monthKey) => {
              const monthEntries = visibleEntries.filter((entry) => entry.appointmentDate.startsWith(monthKey));
              const grouped = groupCalendarEntriesByDate(monthEntries);
              return (
                <div className="calendar-month-card" key={monthKey}>
                  <div className="calendar-month-head">
                    <h3>{calendarMonthLabel(monthKey)}</h3>
                    <button className="btn ghost" type="button" onClick={() => startNew(`${monthKey}-01`)}><Plus size={14} />Appointment</button>
                  </div>
                  <div className="calendar-day-list">
                    {grouped.map(({ date, items }) => (
                      <div className="calendar-day-group" key={date}>
                        <div className="calendar-day-label"><strong>{calendarDayLabel(date)}</strong><small>{date}</small></div>
                        <div className="calendar-entry-list">
                          {items.map((entry) => {
                            const linkedClient = clients.find((client) => client.id === entry.clientId);
                            const adviser = advisers.find((item) => item.id === entry.adviserId);
                            return (
                              <button className={`calendar-entry-card ${entry.status === 'Completed' ? 'completed' : ''}`} key={entry.id} type="button" onClick={() => editEntry(entry)}>
                                <span className="calendar-time-pill">{calendarEntryTimeLabel(entry) || 'No time'}</span>
                                <span>
                                  <strong>{entry.title || 'Appointment'}</strong>
                                  <small>{entry.appointmentType || 'Client meeting'} · {linkedClient ? `${linkedClient.firstName} ${linkedClient.lastName}` : 'No linked client'}{adviser ? ` · ${adviser.name}` : ''}</small>
                                  <small>{entry.location || entry.notes || (entry.status === 'Completed' ? 'Completed' : 'Open task')}</small>
                                </span>
                                <DeadlineBadge diff={dateDiff(entry.appointmentDate)} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {!monthEntries.length && <p className="muted center">No appointments for this month.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel calendar-editor-panel">
          {draft ? (
            <>
              <div className="sub-panel-head">
                <div>
                  <h2>{String(draft.id || '').startsWith('temp-') ? 'Book appointment' : 'Edit appointment'}</h2>
                  <p className="muted">Link to a client where possible so this appears with the right file context.</p>
                </div>
                <button className="icon-btn" type="button" onClick={closeEditor} aria-label="Close calendar editor"><X size={18} /></button>
              </div>
              <div className="calendar-editor-form">
                <label className="field"><span>Appointment title</span><input value={draft.title || ''} onChange={(event) => updateDraft('title', event.target.value)} placeholder="e.g. Client call, lodgement review, document chase" /></label>
                <label className="field"><span>Appointment type</span><select value={draft.appointmentType || 'Client meeting'} onChange={(event) => updateDraft('appointmentType', event.target.value)}>{APPOINTMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label className="field"><span>Linked client</span><select value={draft.clientId || ''} onChange={(event) => updateDraft('clientId', event.target.value)}><option value="">No linked client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName} - {client.caseType || 'No case type'}</option>)}</select></label>
                <label className="field"><span>Adviser</span><select value={draft.adviserId || ''} onChange={(event) => updateDraft('adviserId', event.target.value)}><option value="">Unassigned</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>
                <div className="calendar-time-grid">
                  <label className="field"><span>Date</span><input type="date" value={draft.appointmentDate || ''} onChange={(event) => updateDraft('appointmentDate', event.target.value)} /></label>
                  <label className="field"><span>Start</span><input type="time" value={draft.startTime || ''} onChange={(event) => updateDraft('startTime', event.target.value)} /></label>
                  <label className="field"><span>End</span><input type="time" value={draft.endTime || ''} onChange={(event) => updateDraft('endTime', event.target.value)} /></label>
                </div>
                <label className="field"><span>Location / channel</span><input value={draft.location || ''} onChange={(event) => updateDraft('location', event.target.value)} placeholder="Office, phone, Teams, Zoom, INZ, etc." /></label>
                <label className="field"><span>Status</span><select value={draft.status || 'Open'} onChange={(event) => updateDraft('status', event.target.value)}><option value="Open">Open - show as task</option><option value="Completed">Completed - hide from active tasks</option></select></label>
                <label className="field"><span>Notes</span><textarea value={draft.notes || ''} rows={5} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Brief appointment notes or preparation points" /></label>
                {draft.status === 'Completed' && draft.clientId && (
                  <section className="calendar-followup-box">
                    <label className="compact-check"><input type="checkbox" checked={followUpDraft.enabled} onChange={(event) => updateFollowUp({ enabled: event.target.checked })} />Create/update the linked client's next action</label>
                    {followUpDraft.enabled && (
                      <div className="calendar-followup-grid">
                        <label className="field"><span>Follow-up action</span><input value={followUpDraft.action} onChange={(event) => updateFollowUp({ action: event.target.value })} placeholder="e.g. Send meeting notes and request missing documents" /></label>
                        <label className="field"><span>Follow-up due date</span><input type="date" value={followUpDraft.dueDate} onChange={(event) => updateFollowUp({ dueDate: event.target.value })} /></label>
                      </div>
                    )}
                  </section>
                )}
                {editorDirty && <p className="inline-status">Unsaved calendar changes.</p>}
                <div className="button-row calendar-editor-actions">
                  <button className="btn dark" type="button" onClick={saveDraft} disabled={saving}><Save size={16} />Save appointment</button>
                  <button className="btn danger" type="button" onClick={deleteDraft} disabled={saving}><Trash2 size={16} />{String(draft.id || '').startsWith('temp-') ? 'Discard' : 'Delete'}</button>
                  <button className="btn" type="button" disabled={!draft.clientId} onClick={() => draft.clientId && openClientRecord?.(draft.clientId)}><ChevronRight size={16} />Open client</button>
                </div>
              </div>
            </>
          ) : (
            <div className="calendar-editor-empty">
              <CalendarDays size={36} />
              <h2>No appointment selected</h2>
              <p className="muted">Select an appointment to edit it, or book a new appointment. Open appointments linked to clients will also appear in the Tasks tab and dashboard bring-up views.</p>
              <button className="btn dark" type="button" onClick={() => startNew()}><Plus size={16} />Book appointment</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MonthPicker({ value, onChange }) {
  const safeValue = normaliseMonthValue(value);
  const options = useMemo(() => monthOptionsAround(safeValue), [safeValue]);

  function step(months) {
    onChange(addMonthsToMonthValue(safeValue, months));
  }

  return (
    <div className="month-picker">
      <button type="button" aria-label="Previous month" onClick={() => step(-1)}>‹</button>
      <select value={safeValue} onChange={(event) => onChange(normaliseMonthValue(event.target.value))} aria-label="Start period">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button type="button" aria-label="Next month" onClick={() => step(1)}>›</button>
    </div>
  );
}

function BillingDashboard({ billingRows, advisers, adviserFilter, setAdviserFilter, dashboardAdviserFilter, setTab, setSelectedClientId, openClientRecord }) {
  const [periodMode, setPeriodMode] = useState('month');
  const [periodMonth, setPeriodMonth] = useState(currentMonthInput());
  const [statusFilter, setStatusFilter] = useState('all');
  const [billingSearch, setBillingSearch] = useState('');

  const range = useMemo(() => billingPeriodRange(periodMonth, periodMode), [periodMonth, periodMode]);
  const scopeLabel = dashboardAdviserFilter === 'all' ? 'All advisers' : advisers.find((adviser) => adviser.id === dashboardAdviserFilter)?.name || 'Selected adviser';

  const visibleRows = useMemo(() => {
    const q = billingSearch.trim().toLowerCase();
    return billingRows
      .map((row) => ({ ...row, status: effectiveBillingStatus(row, row.client), savedStatus: normaliseBillingStatus(row.status), reportDate: billingReportingDate(row, row.client), linkedStage: billingLinkedStage(row, row.client) }))
      .filter((row) => adviserFilter === 'all' || row.client.primaryAdviserId === adviserFilter || row.client.backupAdviserId === adviserFilter)
      .filter((row) => statusFilter === 'all' || row.status === statusFilter)
      .filter((row) => row.reportDate && row.reportDate >= range.start && row.reportDate < range.end)
      .filter((row) => !q || [row.client.firstName, row.client.lastName, row.client.email, row.client.caseType, row.milestone, row.invoiceNo, row.status, row.linkedStage?.label].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate) || clientName(a.client).localeCompare(clientName(b.client)));
  }, [billingRows, adviserFilter, statusFilter, billingSearch, range]);

  const totals = visibleRows.reduce((acc, item) => {
    const amount = Number(item.amount || 0);
    acc.total += amount;
    if (item.status === 'WIP') acc.wip += amount;
    if (item.status === 'Invoiced') acc.invoiced += amount;
    if (item.status === 'Overdue') acc.overdue += amount;
    return acc;
  }, { total: 0, wip: 0, invoiced: 0, overdue: 0 });

  return (
    <div className="stack">
      <section className="panel dashboard-heading billing-period-heading">
        <div>
          <h2>Billing view</h2>
          <p className="muted">Shows billing raised or due to be raised in the selected month or period. Current scope: {scopeLabel}.</p>
        </div>
        <span>{visibleRows.length} billing item{visibleRows.length === 1 ? '' : 's'} · {periodLabel(range)}</span>
      </section>

      <div className="metric-grid four">
        <MetricCard label="Total in view" value={formatCurrency(totals.total)} note="All visible billing items" icon={CreditCard} />
        <MetricCard label="WIP" value={formatCurrency(totals.wip)} note="Due to be raised" icon={Clock} />
        <MetricCard label="Invoiced" value={formatCurrency(totals.invoiced)} note="Invoice raised" icon={CheckCircle2} />
        <MetricCard label="Overdue" value={formatCurrency(totals.overdue)} note="Needs follow-up" icon={AlertTriangle} warning />
      </div>

      <section className="panel">
        <div className="task-toolbar billing-toolbar">
          <label><span>Period</span><select value={periodMode} onChange={(event) => setPeriodMode(event.target.value)}><option value="month">Month</option><option value="3-months">3 months</option><option value="6-months">6 months</option><option value="year">Year</option></select></label>
          <label className="billing-period-field"><span>Start period</span><MonthPicker value={periodMonth} onChange={setPeriodMonth} /></label>
          <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{BILLING_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span>Adviser</span><select value={adviserFilter} onChange={(event) => setAdviserFilter(event.target.value)}><option value="all">All advisers in current view</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>
          <label className="task-search"><span>Search billing</span><div><Search size={16} /><input value={billingSearch} onChange={(event) => setBillingSearch(event.target.value)} placeholder="Client, invoice, item or stage" /></div></label>
        </div>

        <div className="billing-table">
          <div className="billing-head billing-head-wide"><span>Client</span><span>Billing item</span><span>Trigger / date</span><span>Amount</span><span>Status</span><span>Invoice</span><span></span></div>
          {visibleRows.map((row) => (
            <div className={`billing-line billing-line-wide ${row.status === 'Overdue' ? 'overdue-soft' : ''}`} key={`${row.client.id}-${row.id}`}>
              <button onClick={() => openClientRecord ? openClientRecord(row.client.id) : (setSelectedClientId(row.client.id), setTab('clients'))}><strong>{row.client.firstName} {row.client.lastName}</strong><small>{row.client.caseType || 'No case type'}</small></button>
              <span><strong>{row.milestone}</strong><small>{row.triggerType === 'Milestone' ? 'Milestone billing' : 'Date billing'}</small></span>
              <span><strong>{row.reportDate || 'Not due yet'}</strong><small>{billingTriggerLabel(row, row.client)}</small></span>
              <strong>{formatCurrency(row.amount)}</strong>
              <span><BillingStatusPill status={row.status} /></span>
              <span>{row.invoiceNo || '—'}</span>
              <button className="btn ghost" type="button" onClick={() => openClientRecord ? openClientRecord(row.client.id) : (setSelectedClientId(row.client.id), setTab('clients'))}>Open</button>
            </div>
          ))}
          {!visibleRows.length && <p className="muted center">No billing items match this period or filter.</p>}
        </div>
      </section>
    </div>
  );
}

function AdviserProfiles({ advisers, clients, saveAdviser, saving }) {
  const [drafts, setDrafts] = useState(advisers);
  const [photoMessages, setPhotoMessages] = useState({});
  useEffect(() => setDrafts(advisers), [advisers]);

  function updateAdviser(id, patch) {
    setDrafts((current) => current.map((adviser) => adviser.id === id ? { ...adviser, ...patch } : adviser));
  }

  async function handlePhotoFile(adviserId, file) {
    if (!file) return;
    if (!/^image\//i.test(file.type || '')) {
      setPhotoMessages((current) => ({ ...current, [adviserId]: 'Choose a JPG, PNG or WebP image file.' }));
      return;
    }
    try {
      setPhotoMessages((current) => ({ ...current, [adviserId]: 'Preparing photo...' }));
      const dataUrl = await resizeProfilePhoto(file);
      updateAdviser(adviserId, { profilePhotoUrl: dataUrl });
      setPhotoMessages((current) => ({ ...current, [adviserId]: 'Photo ready. Save the adviser profile to keep it.' }));
    } catch (error) {
      setPhotoMessages((current) => ({ ...current, [adviserId]: error?.message || 'Could not read that image.' }));
    }
  }

  return (
    <section className="panel">
      <h2>Adviser profiles</h2>
      <p className="muted">Add or edit adviser details used for allocation, reporting, login mapping and client portal adviser cards.</p>
      <div className="adviser-edit-grid">
        {drafts.map((adviser) => {
          const primary = clients.filter((client) => client.primaryAdviserId === adviser.id && client.clientStatus !== 'Closed').length;
          const backup = clients.filter((client) => client.backupAdviserId === adviser.id && client.clientStatus !== 'Closed').length;
          const photoInputId = `adviser-photo-${adviser.id}`;
          return (
            <div className="adviser-edit-card" key={adviser.id}>
              <div className="adviser-profile-head">
                <AdviserAvatar adviser={adviser} size="lg" />
                <div>
                  <strong>{adviser.name || 'New adviser'}</strong>
                  <span>{adviser.role || 'Adviser profile'}</span>
                </div>
                <label className="btn mini ghost adviser-photo-upload" htmlFor={photoInputId}>Upload photo</label>
                <input id={photoInputId} type="file" accept="image/*" className="visually-hidden" onChange={(event) => handlePhotoFile(adviser.id, event.target.files?.[0])} />
              </div>
              <div className="adviser-photo-actions">
                <button type="button" className="btn mini" onClick={() => updateAdviser(adviser.id, { profilePhotoUrl: '' })}>Remove photo</button>
                <span>{photoMessages[adviser.id] || 'Use a clear square or head-and-shoulders image. It will be shown as a round photo.'}</span>
              </div>
              <div className="form-grid two">
                <Field label="Name" value={adviser.name} onChange={(v) => updateAdviser(adviser.id, { name: v })} />
                <Field label="Role" value={adviser.role} onChange={(v) => updateAdviser(adviser.id, { role: v })} />
                <Field label="Email" value={adviser.email} onChange={(v) => updateAdviser(adviser.id, { email: v })} />
                <Field label="Login Email" value={adviser.loginEmail} onChange={(v) => updateAdviser(adviser.id, { loginEmail: v })} />
                <Field label="Phone" value={adviser.phone} onChange={(v) => updateAdviser(adviser.id, { phone: v })} />
                <Field label="LIA licence" value={adviser.licence} onChange={(v) => updateAdviser(adviser.id, { licence: v })} />
                <SelectField label="Portal availability" value={adviser.availability === 'Away' ? 'Away' : 'Available'} onChange={(v) => updateAdviser(adviser.id, { availability: v })} options={ADVISER_AVAILABILITY_OPTIONS} />
                <SelectField label="CRM status" value={adviser.active ? 'Active' : 'Inactive'} onChange={(v) => updateAdviser(adviser.id, { active: v === 'Active' })} options={['Active', 'Inactive']} />
              </div>
              <div className="split bottom"><span><b>{primary}</b> Primary matters · <b>{backup}</b> Backup matters</span><button className="btn dark" onClick={() => saveAdviser(adviser)} disabled={saving}><Save size={16} />Save</button></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function resizeProfilePhoto(file, maxSize = 420) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not prepare that image.'));
      image.onload = () => {
        const side = Math.min(image.width, image.height);
        if (!side) {
          reject(new Error('That image appears to be empty.'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        const sx = Math.max(0, (image.width - side) / 2);
        const sy = Math.max(0, (image.height - side) / 2);
        ctx.drawImage(image, sx, sy, side, side, 0, 0, maxSize, maxSize);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length > 480000) {
          reject(new Error('The resized image is still too large. Try a smaller photo.'));
          return;
        }
        resolve(dataUrl);
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function validateIntakeCvFile(file) {
  if (!file) return;
  const name = String(file.name || '').toLowerCase();
  const type = normaliseCvMimeType(file.type, name);
  const allowed = (name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')) && ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(type);
  if (!allowed) throw new Error('CV uploads must be PDF, DOC or DOCX files.');
  if (Number(file.size || 0) > MAX_INTAKE_CV_BYTES) throw new Error('CV uploads must be 5 MB or smaller.');
}

function normaliseCvMimeType(value = '', fileName = '') {
  const type = String(value || '').split(';')[0].trim().toLowerCase();
  if (type) return type;
  if (String(fileName || '').endsWith('.pdf')) return 'application/pdf';
  if (String(fileName || '').endsWith('.doc')) return 'application/msword';
  if (String(fileName || '').endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return '';
}

async function uploadIntakeCvFile(intakeId, uploadToken, kind, file) {
  if (!intakeId || !uploadToken || !file) return null;
  validateIntakeCvFile(file);
  const params = new URLSearchParams({ upload: '1', intakeId, token: uploadToken, kind, fileName: file.name || 'uploaded-cv.pdf' });
  const response = await fetch(`/.netlify/functions/intake?${params.toString()}`, {
    method: 'POST',
    headers: { 'content-type': normaliseCvMimeType(file.type, file.name) || 'application/octet-stream' },
    body: file,
  });
  const body = await readJsonResponse(response);
  if (!response.ok) throw new Error(body.error || 'The CV upload could not be completed.');
  return body;
}

function downloadBase64File(file = {}) {
  if (!file.dataBase64) return;
  const byteCharacters = atob(file.dataBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) byteNumbers[i] = byteCharacters.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: file.fileType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.fileName || 'intake-cv.pdf';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',').pop() : value);
    };
    reader.readAsDataURL(file);
  });
}

function openBase64Pdf(portalDocument = {}) {
  if (!portalDocument?.dataBase64) throw new Error('The PDF data was not returned.');
  const byteCharacters = atob(portalDocument.dataBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) byteNumbers[i] = byteCharacters.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: portalDocument.fileType || 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = portalDocument.fileName || 'client-portal-document.pdf';
    link.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function formatFileSize(bytes = 0) {
  const size = Number(bytes || 0);
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MetricCard({ label, value, note, icon: Icon, warning }) {
  return <div className={`metric-card ${warning ? 'warning' : ''}`}><div><span>{label}</span><strong>{formatIntakeValue(value)}</strong><small>{note}</small></div><Icon size={22} /></div>;
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}><Icon size={17} />{label}</button>;
}


function LookupField({ label, value, onChange, options, listId, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value || ''} list={listId} placeholder={placeholder || ''} onChange={(event) => onChange(event.target.value)} />
      <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist>
    </label>
  );
}

function DateWithAgeField({ label, value, onChange }) {
  const age = calculateAge(value);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="date-age-field">
        <input type="date" value={value || ''} onChange={(event) => onChange(event.target.value)} />
        <strong>{age === null ? 'Age -' : `${age} yrs`}</strong>
      </div>
    </label>
  );
}



function ClientSummaryPanel({ draft, setField, onOpenActionLog, onOpenTimeline, onPrintProfile, calendarEntries = [] }) {
  const link = normaliseExternalUrl(draft.sharepointFolderUrl);
  const hasValue = Boolean(String(draft.sharepointFolderUrl || '').trim());
  const looksSharePoint = isSharePointLike(draft.sharepointFolderUrl);
  const [copyMessage, setCopyMessage] = useState('');
  const linkedCalendarCount = calendarEntries.filter((entry) => entry.clientId === draft.id).length;

  async function copyLink() {
    if (!hasValue) return;
    try {
      await navigator.clipboard.writeText(draft.sharepointFolderUrl);
      setCopyMessage(`Copied ${formatTimeNow()}.`);
    } catch {
      window.prompt('Copy SharePoint folder link:', draft.sharepointFolderUrl);
      setCopyMessage('Copy prompt opened.');
    }
  }

  function openLink() {
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="client-summary-panel">
      <div className="sub-panel-head">
        <div>
          <h2>Client quick view</h2>
          <p className="muted">Core details and bring-up fields. Use the full record below for strategy, stages, deadlines, family details and billing.</p>
        </div>
        <span className="summary-status-pill">{draft.clientStatus || 'No status'}</span>
      </div>
      <div className="form-grid summary-grid">
        <Field label="First name" value={draft.firstName} onChange={(v) => setField('firstName', v)} />
        <Field label="Last name" value={draft.lastName} onChange={(v) => setField('lastName', v)} />
        <DateWithAgeField label="Date of birth" value={draft.dateOfBirth} onChange={(v) => setField('dateOfBirth', v)} />
        <Field label="OneLaw Client Number" value={draft.oneLawClientNumber || ''} onChange={(v) => setField('oneLawClientNumber', v)} placeholder="Internal OneLaw reference" />
        <SelectField label="Current status" value={draft.clientStatus} onChange={(v) => setField('clientStatus', v)} options={['Active', 'Waiting on client', 'Waiting on INZ', 'On hold', 'Closed']} />
      </div>
      <div className="form-grid two summary-action-grid">
        <TextArea label="Next action" value={draft.nextAction} onChange={(v) => setField('nextAction', v)} rows={3} />
        <DateField label="Next action date" value={draft.nextActionDue} onChange={(v) => setField('nextActionDue', v)} />
      </div>
      <div className="client-quick-actions">
        <div className="client-quick-actions-text">
          <strong>Client tools</strong>
          <span>Review history, timeline and internal profile exports.</span>
        </div>
        <div className="client-quick-actions-buttons">
          <button className="quick-action-button" type="button" onClick={onOpenActionLog}>
            <Clock size={20} />
            <span>Action log</span>
            <b>{normaliseNextActionLog(draft.nextActionLog).length}</b>
          </button>
          <button className="quick-action-button" type="button" onClick={onOpenTimeline}>
            <CalendarDays size={20} />
            <span>Timeline</span>
            <b>{linkedCalendarCount}</b>
          </button>
          <button className="quick-action-button" type="button" onClick={onPrintProfile}>
            <FileText size={20} />
            <span>Print profile</span>
          </button>
        </div>
      </div>
      <div className="summary-sharepoint-row">
        <label className="field sharepoint-field">
          <span>SharePoint folder link</span>
          <input value={draft.sharepointFolderUrl || ''} onChange={(event) => setField('sharepointFolderUrl', event.target.value)} placeholder="Paste the SharePoint folder link" />
        </label>
        <div className="button-row sharepoint-actions">
          <button className="btn" type="button" onClick={openLink} disabled={!link}><ExternalLink size={16} />Open folder</button>
          <button className="btn" type="button" onClick={copyLink} disabled={!hasValue}><Copy size={16} />Copy link</button>
        </div>
      </div>
      {copyMessage && <p className="inline-status">{copyMessage}</p>}
      {hasValue && !looksSharePoint && <p className="field-warning">This does not look like a SharePoint or OneDrive link. It will still save, but the Open button only works for normal web URLs.</p>}
    </section>
  );
}


function openIntakeOutcomeEmailDraft(record = {}, advisers = [], outcome = 'approve') {
  const draft = buildIntakeOutcomeEmailDraft(record, advisers, outcome);
  if (!draft.to) {
    window.alert('No submitter email address is recorded for this intake.');
    return false;
  }

  const params = new URLSearchParams({
    to: draft.to,
    subject: draft.subject,
    body: draft.body,
  });
  const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
  const mailtoUrl = `mailto:${encodeURIComponent(draft.to)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;

  const opened = window.open(outlookUrl, `this-intake-email-${outcome}-${Date.now()}`, 'noopener,noreferrer');
  if (!opened) {
    window.location.href = mailtoUrl;
    return false;
  }
  return true;
}

function buildIntakeOutcomeEmailDraft(record = {}, advisers = [], outcome = 'approve') {
  const firstName = (record.firstName || '').trim() || 'there';
  const applicantName = [record.firstName, record.lastName].filter(Boolean).join(' ').trim() || 'your enquiry';
  const adviser = advisers.find((item) => item.id === record.assignedAdviserId) || null;
  const allocatedTo = adviser?.email ? adviser.email : (adviser?.name || '[Allocated To]');
  const to = String(record.email || '').trim();

  if (outcome === 'decline') {
    return {
      to,
      subject: `Turner Hopkins assessment questionnaire - ${applicantName}`,
      body: [
        `Hello ${firstName},`,
        '',
        'Thank you for completing the Turner Hopkins assessment questionnaire.',
        '',
        'We have reviewed the information you provided. Based on the details supplied, it does not look like we are the right fit to assist with an immigration pathway at this stage.',
        '',
        'This is a preliminary response based on the questionnaire only, not a full immigration assessment. If your circumstances change, or if there is important information you think has not been captured, you are welcome to reply with those details and we can reconsider whether a consultation would be useful.',
      ].join('\n')
    };
  }

  return {
    to,
    subject: `Turner Hopkins assessment questionnaire - next steps for ${applicantName}`,
    body: [
      `Dear ${firstName},`,
      '',
      'Thank you for completing our online assessment questionnaire, which we have now received and reviewed, along with your CV and attachments.',
      '',
      'It does appear, based on the information you have provided, that there is potentially a pathway available to you under one of our skilled migrant pathways, however this would be dependent on several things including the following:',
      '',
      '•\tA review of your information to explore the various details including your skills and experience and the need for those to be assessed here in NZ, your employability and potential earnings as well as your personal data and health and character details.',
      '•\tEstablishing the timelines involved and how each step fits together - this includes discussing, the documentation required, the criteria you need to meet and a road map as to how all of these steps will fit together.',
      '•\tDiscussing the process to secure an offer of skilled employment in New Zealand to qualify under one of our various skilled migration pathways (most application pathways are dependent on being able to secure the right kind of employment in New Zealand)',
      '',
      '',
      'For us to be able to outline this process in detail, including the steps mentioned above, as well as being able to establish the right strategy for you, we would need to book you in for a one-to-one consultation.',
      '',
      'This consultation process will allow us to work through your information in greater detail, ask some additional questions and then outline a clear pathway for you and your family (if applicable) to make the move. It also gives you an opportunity to ask questions of me and for us to explore the process together, so you can make an informed decision as to whether to proceed further.',
      '',
      'We have two options available for the consultation process:',
      '',
      '•\tA brief 15-minute overview (at no charge) of the process via Teams or Zoom, which will give you a very basic summary as to your eligibility. We stick to a very strict 15-minute timeframe for these discussions.',
      '•\tA more detailed assessment over Teams or Zoom, usually lasting for at least an hour, during which we map out the process for you and explain the various steps, costs and timelines. This assessment comes with a charge of NZD$400.00, which can be paid online.',
      '',
      '',
      'Moving to another country is a complex process, particularly in the current environment as the demand for Visas and opportunities in New Zealand continues to increase. If you are seriously considering the move, then having a well laid out plan is vital.',
      `If you wish to move ahead with this assessment, please email us directly: ${allocatedTo} (do not reply to this email) and indicate which assessment option you would prefer to take.`,
      '',
      'We look forward to hearing from you.',
    ].join('\n')
  };
}

function downloadIntakeQuestionnaire(record = {}, advisers = []) {
  try {
    const applicantName = [record.firstName, record.lastName].filter(Boolean).join(' ') || 'intake-questionnaire';
    const fileName = `${safeDownloadFileName(applicantName)}-questionnaire.html`;
    const html = buildIntakePrintHtml(record, advisers);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    return true;
  } catch (err) {
    console.error('Intake questionnaire download could not be prepared.', err);
    window.alert('The questionnaire download could not be prepared. Please try Print / save PDF instead.');
    return false;
  }
}

function safeDownloadFileName(value = '') {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || 'intake-questionnaire';
}

function printIntakeRecord(record = {}, advisers = []) {
  const printWindow = window.open('about:blank', `this-intake-record-${Date.now()}`, 'width=980,height=900,scrollbars=yes,resizable=yes');
  if (!printWindow) return false;
  try {
    const html = buildIntakePrintHtml(record, advisers);
    printWindow.document.open('text/html', 'replace');
    printWindow.document.write(html);
    printWindow.document.close();

    let printStarted = false;
    const startPrint = () => {
      if (printStarted || printWindow.closed) return;
      printStarted = true;
      printWindow.focus();
      printWindow.print();
    };
    printWindow.addEventListener?.('load', () => window.setTimeout(startPrint, 450), { once: true });
    window.setTimeout(startPrint, 900);
    return true;
  } catch (err) {
    console.error('Intake record print window could not be prepared.', err);
    try { printWindow.close(); } catch {}
    return false;
  }
}

function buildIntakePrintHtml(record = {}, advisers = []) {
  const applicantName = [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Unnamed intake record';
  const generatedAt = formatPortalDateTime(new Date().toISOString());
  const logoUrl = `${window.location.origin}${LOGO_SRC}`;
  const sections = getIntakeQuestionnaireSections(record);
  const reviewRows = [
    ['Status', record.status],
    ['Assigned adviser', adviserName(record.assignedAdviserId, advisers)],
    ['Recommended pathway', record.recommendedPathway],
    ['Consultation / outcome', record.consultationOutcome],
    ['Submitted', record.createdAt ? formatPortalDateTime(record.createdAt) : ''],
    ['Updated', record.updatedAt ? formatPortalDateTime(record.updatedAt) : ''],
    ['Converted client', record.convertedClientId ? 'Yes' : 'No'],
  ];
  const flagRows = Object.entries(record.flags || {}).filter(([, value]) => Boolean(value)).map(([key]) => [intakeLabelForKey(key), 'Yes']);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(applicantName)} - intake record</title>
  <style>
    :root { --ink:#003736; --muted:#64748b; --line:#d9e6e1; --pale:#f4fbf8; --text:#0f172a; }
    * { box-sizing: border-box; }
    body { margin:0; background:#f8fafc; color:var(--text); font-family: Inter, Arial, sans-serif; font-size: 13px; }
    .page { max-width: 1040px; margin: 0 auto; padding: 28px; }
    .cover, .section { background:#fff; border:1px solid var(--line); border-radius:18px; padding:18px; margin: 14px 0; break-inside: avoid; }
    .head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; border-bottom:1px solid var(--line); padding-bottom:14px; margin-bottom:14px; }
    .logo { width: 180px; max-height:80px; object-fit:contain; }
    h1 { color:var(--ink); margin:4px 0 6px; font-size:30px; }
    h2 { color:var(--ink); margin:0 0 12px; font-size:18px; }
    h3 { color:var(--ink); margin:14px 0 8px; font-size:15px; }
    p { line-height:1.45; }
    .muted { color:var(--muted); }
    .preline { white-space: pre-wrap; }
    .badge { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:6px 10px; background:var(--pale); color:var(--ink); font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; }
    .row { border:1px solid #e7f0ec; border-radius:13px; padding:10px 12px; background:#fff; break-inside: avoid; }
    .row.wide { grid-column:1 / -1; }
    .row span { display:block; color:var(--muted); font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
    .row strong { display:block; color:var(--text); margin-top:4px; white-space:pre-wrap; word-break:break-word; line-height:1.38; }
    .nested { border:1px solid #d8efe6; background:#f7fcfa; border-radius:15px; padding:12px; margin-top:12px; }
    .footer { margin-top:26px; color:var(--muted); font-size:11px; border-top:1px solid var(--line); padding-top:12px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background:#fff; } .page { padding:0; max-width:none; } .cover, .section, .nested { break-inside: avoid; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <div class="head">
        <div>
          <span class="badge">Internal intake record</span>
          <h1>${escapeHtml(applicantName)}</h1>
          <p class="muted">Generated ${escapeHtml(generatedAt)} from THiS CRM. This printout is for internal review and should be checked against the live CRM record before use.</p>
        </div>
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="Turner Hopkins Immigration Specialists" />
      </div>
      ${renderIntakePrintRows(reviewRows)}
    </section>

    ${printSection('Adviser assessment notes', `<p class="preline">${escapeHtml(record.adviserAssessmentNotes || 'No adviser assessment notes recorded.')}</p>`)}
    ${flagRows.length ? printSection('Review flags', renderIntakePrintRows(flagRows)) : ''}
    ${sections.map(renderIntakePrintSection).join('')}

    <div class="footer">THiS CRM intake record export. Questionnaire answers are shown in the same order as the public assessment form.</div>
  </main>
</body>
</html>`;
}

function renderIntakePrintSection(section = {}) {
  const panels = (section.panels || []).map((panel) => `<div class="nested"><h3>${escapeHtml(panel.title)}</h3>${renderIntakePrintRows(panel.rows)}</div>`).join('');
  return printSection(section.title, `${renderIntakePrintRows(section.rows)}${panels}`);
}

function renderIntakePrintRows(rows = []) {
  const filtered = rows.filter(([, value]) => hasIntakeValue(value));
  if (!filtered.length) return '<p class="muted">No answers recorded for this section.</p>';
  return `<div class="grid">${filtered.map(([label, value]) => {
    const formatted = formatIntakeValue(value);
    const isLong = String(formatted || '').length > 90 || String(formatted || '').includes('\n');
    return `<div class="row ${isLong ? 'wide' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatted || 'Not answered')}</strong></div>`;
  }).join('')}</div>`;
}

function printClientProfile(client = {}, calendarEntries = [], advisers = []) {
  const printWindow = window.open('about:blank', `this-client-profile-${Date.now()}`, 'width=980,height=900,scrollbars=yes,resizable=yes');
  if (!printWindow) return false;

  try {
    const html = buildClientProfilePrintHtml(client, calendarEntries, advisers);
    printWindow.document.open('text/html', 'replace');
    printWindow.document.write(html);
    printWindow.document.close();

    let printStarted = false;
    const startPrint = () => {
      if (printStarted || printWindow.closed) return;
      printStarted = true;
      printWindow.focus();
      printWindow.print();
    };

    printWindow.addEventListener?.('load', () => window.setTimeout(startPrint, 450), { once: true });
    window.setTimeout(startPrint, 900);
    return true;
  } catch (err) {
    console.error('Client profile print window could not be prepared.', err);
    try { printWindow.close(); } catch {}
    return false;
  }
}

function buildClientProfilePrintHtml(client = {}, calendarEntries = [], advisers = []) {
  const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Unnamed client';
  const primaryAdviser = adviserName(client.primaryAdviserId, advisers);
  const backupAdviser = adviserName(client.backupAdviserId, advisers);
  const linkedCalendarEntries = (calendarEntries || []).filter((entry) => entry.clientId === client.id)
    .sort((a, b) => String(a.appointmentDate || '').localeCompare(String(b.appointmentDate || '')) || String(a.startTime || '').localeCompare(String(b.startTime || '')));
  const timelineItems = buildClientTimelineItems(client, calendarEntries, advisers);
  const stages = (client.stages || []).filter((stage) => stage.applied);
  const completedCount = stages.filter((stage) => stage.completed).length;
  const documentItems = normaliseDocumentChecklist(client.documentChecklist || []);
  const requiredDocs = documentItems.filter((item) => item.applied);
  const nextActionLog = normaliseNextActionLog(client.nextActionLog || []).sort((a, b) => String(b.completedDate || b.dueDate || '').localeCompare(String(a.completedDate || a.dueDate || '')));
  const billingItems = normaliseBillingItems(client.billing || []);
  const generatedAt = new Intl.DateTimeFormat('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const logoUrl = `${window.location.origin}${LOGO_SRC}`;

  const summaryRows = [
    ['Client', fullName],
    ['OneLaw Client Number', client.oneLawClientNumber || 'Not recorded'],
    ['Date of birth', profileDate(client.dateOfBirth)],
    ['Age', calculateAge(client.dateOfBirth) ?? 'Not recorded'],
    ['Citizenship', client.nationality || 'Not recorded'],
    ['Current address', client.location || 'Not recorded'],
    ['Email', client.email || 'Not recorded'],
    ['Phone', client.phone || 'Not recorded'],
    ['Case type', client.caseType || 'Not selected'],
    ['Client status', client.clientStatus || 'Not recorded'],
    ['Priority', client.priority || 'Normal'],
    ['Primary adviser', primaryAdviser],
    ['Backup adviser', backupAdviser],
    ['SharePoint folder', client.sharepointFolderUrl || 'Not linked'],
  ];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>THiS Client Profile - ${escapeHtml(fullName)}</title>
  <style>
    :root { --ink:#003736; --mint:#55D9A0; --pale:#F4FBF8; --line:#D9E6E1; --muted:#64748b; --text:#0f172a; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: var(--text); background: #fff; }
    .page { max-width: 1040px; margin: 0 auto; padding: 30px; }
    .cover { border: 1px solid var(--line); border-radius: 22px; padding: 24px; margin-bottom: 18px; background: linear-gradient(135deg, #fff, var(--pale)); }
    .head { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; }
    .logo { width: 190px; height: auto; object-fit: contain; }
    h1 { margin: 18px 0 4px; color: var(--ink); font-size: 32px; }
    h2 { color: var(--ink); font-size: 19px; margin: 0 0 10px; }
    h3 { color: var(--ink); font-size: 15px; margin: 14px 0 6px; }
    p { line-height: 1.45; }
    .muted { color: var(--muted); }
    .badge { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:6px 10px; background:#fff; color:var(--ink); font-weight:700; font-size:12px; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .metric-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
    .metric { background:#fff; border:1px solid var(--line); border-radius:16px; padding:12px; }
    .metric span, .row span, .timeline small, table small { display:block; color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
    .metric strong { display:block; color:var(--ink); font-size:20px; margin-top:4px; }
    .section { border:1px solid var(--line); border-radius:18px; padding:18px; margin: 14px 0; break-inside: avoid; }
    .row { border:1px solid #e7f0ec; border-radius:13px; padding:10px 12px; background:#fff; }
    .row strong { display:block; margin-top:4px; word-break:break-word; }
    .preline { white-space: pre-wrap; }
    table { width:100%; border-collapse: collapse; font-size: 13px; }
    th { background: var(--pale); color: var(--ink); text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
    th, td { border:1px solid var(--line); padding:9px; vertical-align:top; }
    .timeline { display:grid; gap: 8px; }
    .timeline-row { display:grid; grid-template-columns: 150px 1fr; gap: 12px; border:1px solid var(--line); border-radius: 14px; padding: 10px; break-inside: avoid; }
    .timeline-date { color: var(--ink); font-weight: 800; }
    .timeline-title { font-weight: 800; color: var(--ink); }
    .footer { margin-top: 26px; color: var(--muted); font-size: 11px; border-top:1px solid var(--line); padding-top:12px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 0; max-width: none; } .section, .cover { break-inside: avoid; } a { color: inherit; text-decoration: none; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <div class="head">
        <div>
          <span class="badge">Internal client profile</span>
          <h1>${escapeHtml(fullName)}</h1>
          <p class="muted">Generated ${escapeHtml(generatedAt)} from THiS CRM. Review official file records before relying on this for formal advice.</p>
        </div>
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="Turner Hopkins Immigration Specialists" />
      </div>
      <div class="metric-grid">
        <div class="metric"><span>Current progress</span><strong>${progressPercent(client)}%</strong></div>
        <div class="metric"><span>Current stage</span><strong>${escapeHtml(currentStageLabel(client))}</strong></div>
        <div class="metric"><span>Next action due</span><strong>${escapeHtml(profileDate(client.nextActionDue))}</strong></div>
        <div class="metric"><span>Logged actions</span><strong>${nextActionLog.length}</strong></div>
      </div>
    </section>

    ${printSection('Client details', renderRows(summaryRows))}
    ${printSection('Current next action', `<p class="preline">${escapeHtml(client.nextAction || 'No current next action recorded.')}</p><p class="muted">Due: ${escapeHtml(profileDate(client.nextActionDue))}</p>`)}
    ${printSection('Case strategy / key issues', `<p class="preline">${escapeHtml(client.caseStrategy || 'No case strategy recorded.')}</p>`)}
    ${printSection('Current progress', renderStageTable(stages))}
    ${printSection('Full action log', renderActionLogTable(nextActionLog))}
    ${printSection('Client timeline', renderTimelineItems(timelineItems))}
    ${printSection('Calendar appointments', renderCalendarTable(linkedCalendarEntries, advisers))}
    ${printSection('Client deadlines', renderDeadlineTable(client.deadlines || []))}
    ${printSection('Document checklist', renderDocumentTable(requiredDocs))}
    ${printSection('Family / dependants', renderFamilyTable(client.familyMembers || []))}
    ${printSection('Billing schedule', renderBillingTable(billingItems, client))}
    ${printSection('Notes', `<p class="preline">${escapeHtml(client.notes || 'No notes recorded.')}</p>`)}

    <div class="footer">THiS CRM client profile export. This PDF/printout is an internal working summary and should be checked against the live CRM, SharePoint file and official INZ sources before use.</div>
  </main>
</body>
</html>`;
}

function printSection(title, body) {
  return `<section class="section"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function renderRows(rows = []) {
  return `<div class="grid">${rows.map(([label, value]) => `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || 'Not recorded')}</strong></div>`).join('')}</div>`;
}

function renderStageTable(stages = []) {
  if (!stages.length) return '<p class="muted">No application stages are applied to this client.</p>';
  return `<table><thead><tr><th>Stage</th><th>Status</th><th>Completed date</th></tr></thead><tbody>${stages.map((stage) => `<tr><td>${escapeHtml(stage.label)}</td><td>${stage.completed ? 'Completed' : 'Open'}</td><td>${escapeHtml(profileDate(stage.completedDate))}</td></tr>`).join('')}</tbody></table>`;
}

function renderActionLogTable(log = []) {
  if (!log.length) return '<p class="muted">No previous next actions have been logged yet.</p>';
  return `<table><thead><tr><th>Completed / replaced</th><th>Previous action</th><th>Was due</th><th>Replaced by</th></tr></thead><tbody>${log.map((item) => `<tr><td>${escapeHtml(profileDate(item.completedDate))}</td><td>${escapeHtml(item.action || '')}</td><td>${escapeHtml(profileDate(item.dueDate))}</td><td>${escapeHtml([item.replacedByAction, item.replacedByDueDate ? `Due ${item.replacedByDueDate}` : ''].filter(Boolean).join(' - ') || 'Not recorded')}</td></tr>`).join('')}</tbody></table>`;
}

function renderTimelineItems(items = []) {
  if (!items.length) return '<p class="muted">No timeline items recorded yet.</p>';
  return `<div class="timeline">${items.map((item) => `<div class="timeline-row"><div class="timeline-date">${escapeHtml(profileDate(item.date))}<small>${escapeHtml(item.category || '')}</small></div><div><div class="timeline-title">${escapeHtml(item.title || '')}${item.badge ? ` <span class="badge">${escapeHtml(item.badge)}</span>` : ''}</div>${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ''}</div></div>`).join('')}</div>`;
}

function renderCalendarTable(entries = [], advisers = []) {
  if (!entries.length) return '<p class="muted">No linked calendar appointments recorded.</p>';
  return `<table><thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Title</th><th>Adviser</th><th>Status</th><th>Notes</th></tr></thead><tbody>${entries.map((entry) => `<tr><td>${escapeHtml(profileDate(entry.appointmentDate))}</td><td>${escapeHtml(calendarEntryTimeLabel(entry) || '')}</td><td>${escapeHtml(entry.appointmentType || '')}</td><td>${escapeHtml(entry.title || '')}</td><td>${escapeHtml(adviserName(entry.adviserId, advisers))}</td><td>${escapeHtml(entry.status || '')}</td><td>${escapeHtml(entry.notes || '')}</td></tr>`).join('')}</tbody></table>`;
}

function renderDeadlineTable(deadlines = []) {
  if (!deadlines.length) return '<p class="muted">No client deadline dates recorded.</p>';
  return `<table><thead><tr><th>Deadline</th><th>Date</th><th>Note</th></tr></thead><tbody>${deadlines.map((deadline) => `<tr><td>${escapeHtml(deadline.type || '')}</td><td>${escapeHtml(profileDate(deadline.date))}</td><td>${escapeHtml(deadline.note || '')}</td></tr>`).join('')}</tbody></table>`;
}

function renderDocumentTable(items = []) {
  if (!items.length) return '<p class="muted">No required document checklist items recorded.</p>';
  return `<table><thead><tr><th>Document</th><th>Obtained</th><th>Expiry</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.name || '')}</td><td>${item.obtained ? 'Yes' : 'No'}</td><td>${escapeHtml(profileDate(item.expiryDate))}</td></tr>`).join('')}</tbody></table>`;
}

function renderFamilyTable(members = []) {
  if (!members.length) return '<p class="muted">No family or dependant details recorded.</p>';
  return `<table><thead><tr><th>Relationship</th><th>Name</th><th>Citizenship</th><th>Date of birth</th><th>Age</th></tr></thead><tbody>${members.map((member) => `<tr><td>${escapeHtml(member.relationship || '')}</td><td>${escapeHtml(member.name || '')}</td><td>${escapeHtml(member.nationality || '')}</td><td>${escapeHtml(profileDate(member.dateOfBirth))}</td><td>${escapeHtml(calculateAge(member.dateOfBirth) ?? '')}</td></tr>`).join('')}</tbody></table>`;
}

function renderBillingTable(items = [], client = {}) {
  if (!items.length) return '<p class="muted">No billing milestones recorded.</p>';
  return `<table><thead><tr><th>Item</th><th>Trigger / date</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.milestone || '')}</td><td>${escapeHtml(billingTriggerLabel(item, client) || profileDate(item.dueDate))}</td><td>${escapeHtml(formatCurrency(item.amount))}</td><td>${escapeHtml(effectiveBillingStatus(item, client))}</td><td>${escapeHtml(item.invoiceNo || '')}</td></tr>`).join('')}</tbody></table>`;
}

function adviserName(adviserId, advisers = []) {
  return advisers.find((adviser) => adviser.id === adviserId)?.name || 'Not assigned';
}

function profileDate(value) {
  if (!value) return 'Not recorded';
  const date = parseLocalDate(value);
  if (!date) return String(value);
  return new Intl.DateTimeFormat('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function NextActionLogModal({ client, onClose }) {
  const log = normaliseNextActionLog(client.nextActionLog)
    .sort((a, b) => String(b.completedAt || b.completedDate || '').localeCompare(String(a.completedAt || a.completedDate || '')));

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Next action log">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-card action-log-modal">
        <div className="modal-head">
          <div>
            <span>Client action history</span>
            <h2>Next action log</h2>
            <p className="muted">Stored record of previous scheduled next actions for {client.firstName || 'this'} {client.lastName || 'client'}.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close next action log"><X size={18} /></button>
        </div>

        <div className="current-action-card">
          <span>Current next action</span>
          <strong>{client.nextAction || 'No current next action recorded.'}</strong>
          <small>{client.nextActionDue ? `Due ${client.nextActionDue}` : 'No current due date.'}</small>
        </div>

        <div className="action-log-list">
          {log.map((item) => (
            <div className="action-log-row" key={item.id}>
              <div className="action-log-date">
                <strong>{item.completedDate || 'No completion date'}</strong>
                <small>{item.dueDate ? `Was due ${item.dueDate}` : 'No due date'}</small>
              </div>
              <div>
                <p>{item.action || 'No action text recorded.'}</p>
                {(item.replacedByAction || item.replacedByDueDate) && (
                  <small>Next scheduled: {item.replacedByAction || 'No action text'}{item.replacedByDueDate ? `, due ${item.replacedByDueDate}` : ''}</small>
                )}
              </div>
            </div>
          ))}
          {!log.length && <p className="muted center">No previous next actions have been logged yet. The current next action will be added here after it is changed and the client record is saved.</p>}
        </div>
      </section>
    </div>
  );
}


function ClientTimelineModal({ client, calendarEntries = [], advisers = [], onClose }) {
  const timelineItems = buildClientTimelineItems(client, calendarEntries, advisers);
  const openCalendarCount = calendarEntries.filter((entry) => entry.clientId === client.id && entry.status !== 'Completed').length;

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Client timeline">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-card timeline-modal">
        <div className="modal-head">
          <div>
            <span>Client file history</span>
            <h2>Timeline</h2>
            <p className="muted">Chronological view for {client.firstName || 'this'} {client.lastName || 'client'} across actions, appointments, stages, documents and billing.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close client timeline"><X size={18} /></button>
        </div>

        <div className="timeline-summary-grid">
          <div><span>Current next action</span><strong>{client.nextAction || 'None recorded'}</strong><small>{client.nextActionDue ? `Due ${client.nextActionDue}` : 'No due date'}</small></div>
          <div><span>Linked calendar entries</span><strong>{calendarEntries.filter((entry) => entry.clientId === client.id).length}</strong><small>{openCalendarCount} open</small></div>
          <div><span>Logged actions</span><strong>{normaliseNextActionLog(client.nextActionLog).length}</strong><small>Saved next-action history</small></div>
        </div>

        <div className="timeline-list">
          {timelineItems.map((item) => (
            <div className={`timeline-row ${item.statusKey || ''}`} key={item.id}>
              <div className="timeline-date"><strong>{item.date || 'No date'}</strong><small>{item.category}</small></div>
              <div className="timeline-body">
                <div className="timeline-title-row"><strong>{item.title}</strong>{item.badge && <span>{item.badge}</span>}</div>
                {item.detail && <p>{item.detail}</p>}
                {item.meta && <small>{item.meta}</small>}
              </div>
            </div>
          ))}
          {!timelineItems.length && <p className="muted center">No timeline items yet. Actions, linked calendar appointments, completed stages, document expiries and billing events will appear here as the file develops.</p>}
        </div>
      </section>
    </div>
  );
}

function makeBlankLibraryEntry(entryType = 'Policy') {
  return {
    id: `temp-library-${Date.now()}`,
    entryType: LIBRARY_ENTRY_TYPES.includes(entryType) ? entryType : 'Policy',
    referenceCode: '',
    title: '',
    category: entryType === 'Form' ? 'Forms' : 'General',
    status: 'Current',
    officialUrl: '',
    versionLabel: '',
    acceptableUntil: '',
    relatedCaseTypes: [],
    relatedDocumentItems: [],
    internalSummary: '',
    adviserNotes: '',
    lastReviewed: todayIso(),
    nextReviewDue: daysFromToday(90),
    reviewedBy: '',
  };
}

function LibraryWorkspace({ entries, caseTypes, saveLibraryEntry, deleteLibraryEntry, saving }) {
  const [activeType, setActiveType] = useState('Policy');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(entries.find((entry) => entry.entryType === activeType)?.id || '');
  const [draft, setDraft] = useState(makeBlankLibraryEntry(activeType));
  const [saveMessage, setSaveMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((entry) => entry.entryType === activeType)
      .filter((entry) => statusFilter === 'all' || entry.status === statusFilter)
      .filter((entry) => categoryFilter === 'all' || entry.category === categoryFilter)
      .filter((entry) => !q || [entry.referenceCode, entry.title, entry.category, entry.status, entry.officialUrl, entry.versionLabel, entry.internalSummary, entry.adviserNotes, entry.reviewedBy, ...(entry.relatedCaseTypes || []), ...(entry.relatedDocumentItems || [])].join(' ').toLowerCase().includes(q))
      .sort((a, b) => {
        const aDue = isLibraryReviewDue(a) ? 0 : 1;
        const bDue = isLibraryReviewDue(b) ? 0 : 1;
        if (aDue !== bDue) return aDue - bDue;
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [entries, activeType, query, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const scoped = entries.filter((entry) => entry.entryType === activeType);
    return {
      total: scoped.length,
      reviewDue: scoped.filter(isLibraryReviewDue).length,
      watch: scoped.filter((entry) => entry.status === 'Watch').length,
      archived: scoped.filter((entry) => ['Archived', 'Superseded'].includes(entry.status)).length,
    };
  }, [entries, activeType]);

  useEffect(() => {
    const selected = entries.find((entry) => entry.id === selectedId && entry.entryType === activeType);
    if (selected) {
      setDraft(normaliseLibraryEntry(selected));
      return;
    }
    const first = visibleEntries[0];
    if (first && !editorOpen) {
      setSelectedId(first.id);
      setDraft(normaliseLibraryEntry(first));
    } else if (!editorOpen) {
      setSelectedId('');
      setDraft(makeBlankLibraryEntry(activeType));
    }
  }, [selectedId, activeType, entries, visibleEntries, editorOpen]);

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveMessage('');
  }

  function openEntryEditor(entry) {
    const selected = normaliseLibraryEntry(entry);
    setSelectedId(selected.id);
    setActiveType(selected.entryType);
    setDraft(selected);
    setSaveMessage('');
    setCopyMessage('');
    setEditorOpen(true);
  }

  function startNewEntry(type = activeType) {
    setSelectedId('');
    setActiveType(type);
    setDraft(makeBlankLibraryEntry(type));
    setSaveMessage('');
    setCopyMessage('');
    setEditorOpen(true);
  }

  async function saveDraft(event, closeAfterSave = false) {
    event?.preventDefault();
    if (!draft.title.trim()) {
      setSaveMessage('Add a title before saving this library item.');
      return;
    }
    const body = await saveLibraryEntry(draft);
    const saved = normaliseLibraryEntry(body.libraryEntry || draft);
    setSelectedId(saved.id);
    setDraft(saved);
    setActiveType(saved.entryType);
    setSaveMessage(`Saved ${formatTimeNow()}.`);
    if (closeAfterSave) setEditorOpen(false);
  }

  async function removeDraft() {
    if (!isPersistedId(draft.id)) {
      startNewEntry(activeType);
      return;
    }
    await deleteLibraryEntry(draft.id);
    setSelectedId('');
    setDraft(makeBlankLibraryEntry(activeType));
    setSaveMessage('Library item deleted.');
    setEditorOpen(false);
  }

  async function copyOfficialLink() {
    if (!draft.officialUrl) return;
    try {
      await navigator.clipboard.writeText(draft.officialUrl);
      setCopyMessage(`Copied ${formatTimeNow()}.`);
    } catch {
      window.prompt('Copy official source link:', draft.officialUrl);
      setCopyMessage('Copy prompt opened.');
    }
  }

  const officialLink = normaliseExternalUrl(draft.officialUrl);

  return (
    <section className="library-workspace">
      <div className="library-heading compact-heading">
        <div>
          <h1>Policy and forms reference</h1>
          <p className="muted">Controlled source-linked records for adviser reference.</p>
        </div>
        <button className="btn dark" type="button" onClick={() => startNewEntry(activeType)}>
          <Plus size={16} />New {activeType.toLowerCase()} item
        </button>
      </div>

      <div className="library-toolbar">
        <div className="library-tabs" aria-label="Library item type">
          {LIBRARY_ENTRY_TYPES.map((type) => (
            <button key={type} type="button" className={activeType === type ? 'active' : ''} onClick={() => { setActiveType(type); setSelectedId(''); }}>
              {type === 'Policy' ? <BookOpen size={16} /> : <FileText size={16} />}{type}
            </button>
          ))}
        </div>
      </div>

      <div className="metric-grid compact library-metrics">
        <div className="metric-card"><span>{activeType} items</span><strong>{stats.total}</strong><small>Controlled records</small></div>
        <div className="metric-card"><span>Review due</span><strong>{stats.reviewDue}</strong><small>Due or overdue</small></div>
        <div className="metric-card"><span>Watch</span><strong>{stats.watch}</strong><small>Change-sensitive items</small></div>
        <div className="metric-card"><span>Archived/superseded</span><strong>{stats.archived}</strong><small>Kept for history</small></div>
      </div>

      <div className="library-inbox-panel">
        <div className="filters library-filters library-filters-row">
          <label><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Policy code, form number, title or note" /></label>
          <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{LIBRARY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{LIBRARY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        </div>
        <div className="library-card-grid">
          {visibleEntries.map((entry) => (
            <article key={entry.id} className={`library-summary-card ${selectedId === entry.id ? 'active' : ''}`}>
              <div className="library-summary-top">
                <span className={`library-status ${statusClass(entry.status)}`}>{entry.status}</span>
                {isLibraryReviewDue(entry) && <em>Review due</em>}
              </div>
              <strong>{entry.referenceCode ? `${entry.referenceCode} - ${entry.title}` : entry.title}</strong>
              <small>{entry.category || 'General'}{entry.nextReviewDue ? ` · Review ${formatShortDate(entry.nextReviewDue)}` : ''}</small>
              <p>{entry.internalSummary || entry.adviserNotes || 'No THiS note recorded yet.'}</p>
              <div className="library-summary-actions">
                <button className="btn mini" type="button" onClick={() => openEntryEditor(entry)}><FileText size={14} />Open editor</button>
                <button className="btn mini" type="button" onClick={() => entry.officialUrl && window.open(normaliseExternalUrl(entry.officialUrl), '_blank', 'noopener,noreferrer')} disabled={!entry.officialUrl}><ExternalLink size={14} />Source</button>
              </div>
            </article>
          ))}
          {!visibleEntries.length && <p className="muted center">No {activeType.toLowerCase()} items match the current filters.</p>}
        </div>
      </div>

      {editorOpen && (
        <div className="library-popout-shell" role="dialog" aria-modal="true" aria-label="Library item editor">
          <div className="library-popout-dialog">
            <div className="record-popout-topbar">
              <div>
                <span>Library editor</span>
                <strong>{isPersistedId(draft.id) ? draft.title || 'Edit library item' : `New ${draft.entryType.toLowerCase()} item`}</strong>
              </div>
              <div className="button-row">
                <button className="btn" type="button" onClick={() => setEditorOpen(false)}><X size={16} />Close</button>
                <button className="btn dark" type="button" onClick={(event) => saveDraft(event, true)} disabled={saving}><Save size={16} />Save & close</button>
              </div>
            </div>

            <form className="library-editor library-popout-editor" onSubmit={saveDraft}>
              <div className="sub-panel-head">
                <div>
                  <h2>{isPersistedId(draft.id) ? 'Edit library item' : `New ${draft.entryType.toLowerCase()} item`}</h2>
                  <p className="muted">Attach the official source, record the THiS working note, and keep review dates current.</p>
                </div>
                <div className="button-row">
                  <button className="btn" type="button" onClick={copyOfficialLink} disabled={!draft.officialUrl}><Copy size={16} />Copy link</button>
                  <button className="btn" type="button" onClick={() => officialLink && window.open(officialLink, '_blank', 'noopener,noreferrer')} disabled={!officialLink}><ExternalLink size={16} />Open source</button>
                </div>
              </div>

              <div className="grid two">
                <label className="field"><span>Type</span><select value={draft.entryType} onChange={(event) => updateDraft({ entryType: event.target.value, category: event.target.value === 'Form' ? 'Forms' : draft.category })}>{LIBRARY_ENTRY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label className="field"><span>Status</span><select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })}>{LIBRARY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <label className="field"><span>{draft.entryType === 'Form' ? 'INZ form/reference number' : 'Policy code/reference'}</span><input value={draft.referenceCode} onChange={(event) => updateDraft({ referenceCode: event.target.value })} placeholder={draft.entryType === 'Form' ? 'e.g. INZ 1000' : 'e.g. SM6, F2, A5'} /></label>
                <label className="field"><span>Category</span><select value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })}>{LIBRARY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              </div>

              <label className="field"><span>Title</span><input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder={draft.entryType === 'Form' ? 'Form or guide name' : 'Policy title or topic'} /></label>
              <label className="field"><span>Official INZ source URL</span><input value={draft.officialUrl} onChange={(event) => updateDraft({ officialUrl: event.target.value })} placeholder="Paste the official INZ policy, form, guide or checklist link" /></label>

              {draft.entryType === 'Form' && (
                <div className="grid two">
                  <label className="field"><span>Version / issue note</span><input value={draft.versionLabel} onChange={(event) => updateDraft({ versionLabel: event.target.value })} placeholder="e.g. May 2026 version" /></label>
                  <label className="field"><span>Previous version acceptable until</span><input type="date" value={draft.acceptableUntil} onChange={(event) => updateDraft({ acceptableUntil: event.target.value })} /></label>
                </div>
              )}

              <div className="grid two">
                <label className="field"><span>Last reviewed</span><input type="date" value={draft.lastReviewed} onChange={(event) => updateDraft({ lastReviewed: event.target.value })} /></label>
                <label className="field"><span>Next review due</span><input type="date" value={draft.nextReviewDue} onChange={(event) => updateDraft({ nextReviewDue: event.target.value })} /></label>
                <label className="field"><span>Reviewed by</span><input value={draft.reviewedBy} onChange={(event) => updateDraft({ reviewedBy: event.target.value })} placeholder="Adviser name" /></label>
                <label className="field"><span>Related document items</span><input value={(draft.relatedDocumentItems || []).join(', ')} onChange={(event) => updateDraft({ relatedDocumentItems: splitCsv(event.target.value) })} placeholder="Passports, Police Clearances, Medicals" /></label>
              </div>

              <div className="case-chip-grid">
                <span>Related case types</span>
                <div>
                  {caseTypes.map((caseType) => {
                    const checked = (draft.relatedCaseTypes || []).includes(caseType);
                    return <button key={caseType} type="button" className={checked ? 'active' : ''} onClick={() => updateDraft({ relatedCaseTypes: toggleArrayValue(draft.relatedCaseTypes || [], caseType) })}>{caseType}</button>;
                  })}
                </div>
              </div>

              <label className="field"><span>THiS summary</span><textarea rows={4} value={draft.internalSummary} onChange={(event) => updateDraft({ internalSummary: event.target.value })} placeholder="Plain-English internal summary. Keep it practical and source-linked." /></label>
              <label className="field"><span>Adviser watch-points / notes</span><textarea rows={4} value={draft.adviserNotes} onChange={(event) => updateDraft({ adviserNotes: event.target.value })} placeholder="Risk points, file handling notes, review comments or accepted-version notes." /></label>

              <div className="client-save-bar library-save-bar">
                <div>
                  <strong>{saveMessage || copyMessage || (isLibraryReviewDue(draft) ? 'Review due or overdue.' : 'Ready to save.')}</strong>
                  <span>{officialLink ? 'Official source link is available.' : 'Add an official INZ link where possible.'}</span>
                </div>
                <div className="button-row">
                  <button className="btn danger" type="button" onClick={removeDraft}>{isPersistedId(draft.id) ? 'Delete' : 'Clear'}</button>
                  <button className="btn" type="submit" disabled={saving}><Save size={16} />{saving ? 'Saving...' : 'Save item'}</button>
                  <button className="btn dark" type="button" onClick={(event) => saveDraft(event, true)} disabled={saving}><Save size={16} />Save & close</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function SharePointFolderPanel({ value, onChange }) {
  const link = normaliseExternalUrl(value);
  const hasValue = Boolean(String(value || '').trim());
  const looksSharePoint = isSharePointLike(value);
  const [copyMessage, setCopyMessage] = useState('');

  async function copyLink() {
    if (!hasValue) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`Copied ${formatTimeNow()}.`);
    } catch {
      window.prompt('Copy SharePoint folder link:', value);
      setCopyMessage('Copy prompt opened.');
    }
  }

  function openLink() {
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="sub-panel sharepoint-panel">
      <div className="sub-panel-head">
        <div>
          <h2>SharePoint folder</h2>
          <p className="muted">Store the client's SharePoint or OneDrive folder URL so advisers can jump directly to the file location.</p>
        </div>
        <Link2 size={20} />
      </div>
      <div className="sharepoint-link-row">
        <label className="field sharepoint-field">
          <span>Client SharePoint folder URL</span>
          <input value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder="Paste the SharePoint folder link" />
        </label>
        <div className="button-row sharepoint-actions">
          <button className="btn" onClick={openLink} disabled={!link}><ExternalLink size={16} />Open folder</button>
          <button className="btn" onClick={copyLink} disabled={!hasValue}><Copy size={16} />Copy link</button>
        </div>
      </div>
      {copyMessage && <p className="inline-status">{copyMessage}</p>}
      {hasValue && !looksSharePoint && <p className="field-warning">This does not look like a SharePoint or OneDrive link. It will still save, but the Open button only works for normal web URLs.</p>}
    </section>
  );
}

function FamilyDetails({ members, addFamilyMember, updateFamilyMember, removeFamilyMember }) {
  const spousePartner = members.filter((member) => member.relationship === 'Spouse/Partner');
  const children = members.filter((member) => member.relationship === 'Child');
  return (
    <section className="sub-panel">
      <div className="sub-panel-head">
        <div>
          <h2>Family details</h2>
          <p className="muted">Add spouse/partner and children details where relevant. Citizenship and ages are captured for each family member.</p>
        </div>
        <div className="button-row">
          <button className="btn" onClick={() => addFamilyMember('Spouse/Partner')}><Plus size={16} />Spouse/partner</button>
          <button className="btn" onClick={() => addFamilyMember('Child')}><Plus size={16} />Child</button>
        </div>
      </div>
      <datalist id="family-citizenship-options">{COUNTRY_OPTIONS.map((country) => <option key={country} value={country} />)}</datalist>
      <div className="table-like">
        {members.map((member) => (
          <div className="editable-row family-row" key={member.id}>
            <select value={member.relationship || 'Child'} onChange={(event) => updateFamilyMember(member.id, { relationship: event.target.value })}>
              <option>Spouse/Partner</option>
              <option>Child</option>
            </select>
            <input value={member.name || ''} onChange={(event) => updateFamilyMember(member.id, { name: event.target.value })} placeholder="Full name" />
            <input value={member.nationality || ''} list="family-citizenship-options" onChange={(event) => updateFamilyMember(member.id, { nationality: event.target.value })} placeholder="Citizenship" />
            <input type="date" value={member.dateOfBirth || ''} onChange={(event) => updateFamilyMember(member.id, { dateOfBirth: event.target.value })} />
            <strong className="age-pill">{calculateAge(member.dateOfBirth) === null ? 'Age -' : `${calculateAge(member.dateOfBirth)} yrs`}</strong>
            <button className="icon-btn" onClick={() => removeFamilyMember(member.id)}><Trash2 size={16} /></button>
          </div>
        ))}
        {!members.length && <p className="muted center">No spouse/partner or children added yet.</p>}
      </div>
      {!!members.length && <p className="muted family-summary">{spousePartner.length} spouse/partner record{spousePartner.length === 1 ? '' : 's'} · {children.length} child record{children.length === 1 ? '' : 's'}</p>}
    </section>
  );
}

function Field({ label, value, onChange }) {
  return <label className="field"><span>{label}</span><input value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function DateField({ label, value, onChange }) {
  return <label className="field"><span>{label}</span><input type="date" value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TimeField({ label, value, onChange }) {
  return <label className="field"><span>{label}</span><input type="time" value={timeInputValue(value)} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, onChange, options, placeholder = 'Select...' }) {
  const normalised = options.map((option) => typeof option === 'string' ? { label: option, value: option } : option);
  return <label className="field"><span>{label}</span><select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{normalised.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, rows = 4 }) {
  return <label className="field"><span>{label}</span><textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function normaliseTimeValue(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm)?$/);
  if (!match) return /^\d{2}:\d{2}$/.test(raw) ? raw : '';
  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  const marker = match[3] || '';
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return '';
  if (marker === 'pm' && hour < 12) hour += 12;
  if (marker === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function timeInputValue(value = '') {
  return normaliseTimeValue(value);
}

function formatSeminarTimeDisplay(value = '') {
  const time = normaliseTimeValue(value);
  if (!time) return '';
  const [hourText, minute] = time.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute}${suffix}`;
}

function ProgressBar({ value }) {
  return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function normaliseDeadlineActionStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['active', 'show', 'shown', 'required', 'requires-action', 'dashboard', 'yes', 'true'].includes(raw)) return 'active';
  if (['watching', 'watch', 'default'].includes(raw)) return 'watching';
  if (['deferred', 'defer', 'snoozed'].includes(raw)) return 'deferred';
  if (['completed', 'complete', 'replaced', 'closed'].includes(raw)) return 'completed';
  return 'historical';
}

function defaultDeadlineActionStatus(type = '', source = '') {
  const text = String(type || '').toLowerCase();
  if (source === 'document-expiry') return 'historical';
  if (text.includes('ppi') || text.includes('filing') || text.includes('visa')) return 'active';
  if (text.includes('medical') || text.includes('police')) return 'historical';
  return 'active';
}

function dashboardActionStatusFromChecked(checked) {
  return checked ? 'active' : 'historical';
}

function isDashboardDateShown(row = {}) {
  const status = normaliseDeadlineActionStatus(row.actionStatus || defaultDeadlineActionStatus(row.type, row.source));
  if (status === 'active') return true;
  if (status === 'watching') return defaultDeadlineActionStatus(row.type, row.source) === 'active';
  return false;
}

function dashboardDateToggleText(row = {}) {
  return isDashboardDateShown(row) ? 'Shown on dashboard' : 'File only';
}

function warningWindowDaysForDeadline(row = {}) {
  const text = String(row.type || '').toLowerCase();
  if (text.includes('ppi') || text.includes('filing')) return 3650;
  if (text.includes('visa')) return 90;
  if (text.includes('medical') || text.includes('police')) return 60;
  if (text.includes('passport')) return 180;
  if (row.source === 'document-expiry') return 60;
  return 30;
}

function isDeadlineSignalControlledSource(row = {}) {
  return row.source === 'deadline' || row.source === 'document-expiry';
}

function deadlineSignalForRow(row = {}) {
  const source = row.source || 'deadline';
  if (!isDeadlineSignalControlledSource({ source })) {
    return { dashboard: 'action', status: 'active', kind: 'active', label: 'Active', reason: 'Operational task.' };
  }
  const status = normaliseDeadlineActionStatus(row.actionStatus || defaultDeadlineActionStatus(row.type, source));
  const diff = row.diff ?? dateDiff(row.date);
  const windowDays = warningWindowDaysForDeadline(row);
  const critical = String(row.type || '').toLowerCase().includes('ppi') || String(row.type || '').toLowerCase().includes('filing');
  const shown = isDashboardDateShown({ ...row, source });

  if (!shown) return { dashboard: 'quiet', status, kind: 'hidden', label: 'File only', reason: 'Not shown on the adviser dashboard.' };
  if (diff === null || diff === undefined) return { dashboard: 'quiet', status, kind: 'undated', label: 'No date', reason: 'Add a date before it can appear on the dashboard.' };
  if (critical) return { dashboard: 'action', status, kind: diff < 0 ? 'overdue' : 'critical', label: diff < 0 ? 'Overdue' : 'Critical date', reason: 'Shown because this date is marked for the dashboard.' };
  if (diff < 0) return { dashboard: 'action', status, kind: 'overdue', label: 'Overdue', reason: 'Shown because this date is marked for the dashboard.' };
  if (diff <= windowDays) return { dashboard: 'action', status, kind: diff === 0 ? 'today' : 'upcoming', label: diff === 0 ? 'Today' : `${diff}d`, reason: `Shown inside the ${windowDays}-day warning window.` };
  return { dashboard: 'quiet', status, kind: 'future', label: 'Scheduled', reason: `Marked for dashboard; will appear inside the ${windowDays}-day warning window.` };
}

function withDeadlineSignal(row = {}) {
  const diff = row.diff ?? dateDiff(row.date);
  const enriched = { ...row, diff };
  return { ...enriched, deadlineSignal: deadlineSignalForRow(enriched) };
}

function isDashboardActionableDeadlineRow(row = {}) {
  return withDeadlineSignal(row).deadlineSignal?.dashboard === 'action';
}

function isDashboardActionableTaskRow(row = {}) {
  if (!isDeadlineSignalControlledSource(row)) return true;
  return isDashboardActionableDeadlineRow(row);
}

function deadlineSignalSortDate(row = {}) {
  return row.date || '9999-12-31';
}

function DeadlineSignalBadge({ row }) {
  if (!row) return null;
  const signal = row.deadlineSignal || deadlineSignalForRow(row);
  if (signal.dashboard === 'quiet') return <b className="badge quiet">{signal.label || 'File only'}</b>;
  return <DeadlineBadge diff={row.diff ?? dateDiff(row.date)} />;
}

function DeadlineBadge({ diff }) {
  if (diff === null || diff === undefined) return null;
  const className = diff < 0 ? 'badge overdue' : diff <= 30 ? 'badge urgent' : diff <= 60 ? 'badge soon' : 'badge safe';
  return <b className={className}>{diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Today' : `${diff}d`}</b>;
}




function portalDeadlineKey(deadline = {}) {
  return ['deadline', deadline.type || '', deadline.date || '', deadline.note || ''].join('|').toLowerCase();
}

function makePortalAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(12);
  window.crypto?.getRandomValues?.(bytes);
  const chars = Array.from(bytes).map((byte) => alphabet[byte % alphabet.length]);
  return `TH-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalisePortalAdviser(adviser = {}) {
  return {
    name: adviser?.name || '',
    email: adviser?.email || '',
    phone: adviser?.phone || '',
    profilePhotoUrl: adviser?.profilePhotoUrl || adviser?.profile_photo_url || '',
    availability: adviser?.availability === 'Away' ? 'Away' : 'Available',
  };
}

function normalisePortalSnapshot(snapshot = {}) {
  return {
    clientName: snapshot.clientName || 'Client',
    matterType: snapshot.matterType || '',
    adviser: normalisePortalAdviser(snapshot.adviser),
    backupAdviser: normalisePortalAdviser(snapshot.backupAdviser),
    currentStage: snapshot.currentStage || '',
    progressPercent: Number(snapshot.progressPercent || 0),
    statusUpdate: snapshot.statusUpdate || '',
    nextStep: snapshot.nextStep || '',
    documentsStillRequired: Array.isArray(snapshot.documentsStillRequired) ? snapshot.documentsStillRequired : [],
    documentsRequired: Array.isArray(snapshot.documentsRequired) ? snapshot.documentsRequired : [],
    stagePlan: Array.isArray(snapshot.stagePlan) ? snapshot.stagePlan : [],
    keyDates: Array.isArray(snapshot.keyDates) ? snapshot.keyDates : [],
    appointments: Array.isArray(snapshot.appointments) ? snapshot.appointments : [],
    billingMilestones: Array.isArray(snapshot.billingMilestones) ? snapshot.billingMilestones : [],
    portalDocuments: Array.isArray(snapshot.portalDocuments) ? snapshot.portalDocuments.map(normalisePortalDocument) : [],
    portalResources: Array.isArray(snapshot.portalResources) ? snapshot.portalResources.map(normalisePortalResource).filter((resource) => resource.enabled) : [],
    portalMessages: Array.isArray(snapshot.portalMessages) ? snapshot.portalMessages.map(normalisePortalMessage) : [],
    turnerHopkins: snapshot.turnerHopkins || { name: 'Turner Hopkins Immigration Specialists', phone: '+64 9 486 2169', email: 'immigration@turnerhopkins.co.nz', website: 'www.turnerhopkinsimmigration.co.nz' },
    lastUpdated: snapshot.lastUpdated || '',
  };
}

function formatPortalDate(value) {
  if (!value) return 'Not recorded';
  const date = parseLocalDate(value);
  if (!date) return String(value);
  return new Intl.DateTimeFormat('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatPortalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-NZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatDateTime(value) {
  return formatPortalDateTime(value);
}

function stableStringify(value) {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.keys(item).sort().reduce((acc, key) => {
      acc[key] = item[key];
      return acc;
    }, {});
  });
}

function formatTimeNow() {
  return new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' }).format(new Date()).toLowerCase();
}

function normaliseExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : raw.startsWith('www.') ? `https://${raw}` : '';
  if (!withProtocol) return '';
  try {
    const url = new URL(withProtocol);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function isSharePointLike(value) {
  const link = normaliseExternalUrl(value);
  if (!link) return false;
  try {
    const host = new URL(link).hostname.toLowerCase();
    return host.includes('sharepoint.com') || host.includes('onedrive.live.com') || host.includes('office.com');
  } catch {
    return false;
  }
}

function formatApiError(body, fallback) {
  if (!body) return fallback;
  if (body.detail) return `${body.error || fallback}: ${body.detail}`;
  return body.error || fallback;
}



function makeBlankIntakeChild() {
  return {
    id: `child-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fullName: '',
    dateOfBirth: '',
    citizenship: '',
    currentCountry: '',
    dependent: '',
    includedInApplication: '',
    custodyIssues: '',
  };
}

function makeBlankIntakePayload() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredContactMethod: 'Email',
    citizenship: '',
    dateOfBirth: '',
    dateOfBirthAge: '',
    consentToContact: false,
    privacyAcknowledged: false,
    applicantCvExpected: false,
    partnerCvExpected: false,
    intakeUploads: {},
    urgency: 'Standard',
    urgentDeadline: '',
    targetPathway: '',
    immediateNeed: '',
    longTermGoal: '',
    desiredTimeframe: '',
    helpNeeded: '',
    isInNewZealand: '',
    currentVisaType: '',
    currentVisaExpiry: '',
    visaConditions: '',
    currentLocation: '',
    previouslyVisitedNz: '',
    previouslyHeldNzVisa: '',
    plannedTravelDate: '',
    passportExpiry: '',
    relationshipStatus: '',
    hasPartner: '',
    partnerFullName: '',
    partnerDateOfBirth: '',
    partnerCitizenship: '',
    partnerCurrentCountry: '',
    partnerVisaStatus: '',
    partnerNzStatus: '',
    livingTogether: '',
    relationshipStarted: '',
    startedLivingTogether: '',
    partnerIncluded: '',
    relationshipBackground: '',
    partnerCurrentEmploymentStatus: '',
    partnerOccupation: '',
    partnerCurrentEmployer: '',
    partnerEmploymentCountry: '',
    partnerCurrentJobStartDate: '',
    partnerHoursPerWeek: '',
    partnerAnnualSalary: '',
    partnerSalaryCurrency: '',
    partnerYearsExperience: '',
    partnerEmploymentDetails: '',
    partnerPreviousWorkHistory: '',
    partnerHighestQualification: '',
    partnerQualificationName: '',
    partnerQualificationInstitution: '',
    partnerQualificationCountry: '',
    partnerQualificationYearCompleted: '',
    partnerQualificationStudyLength: '',
    partnerTaughtInEnglish: '',
    partnerNzqaAssessed: '',
    partnerQualificationRelatedToOccupation: '',
    partnerQualificationDetails: '',
    hasChildren: '',
    children: [],
    moreChildrenDetails: '',
    currentEmploymentStatus: '',
    occupation: '',
    currentEmployer: '',
    employmentCountry: '',
    currentJobStartDate: '',
    hoursPerWeek: '',
    annualSalary: '',
    salaryCurrency: '',
    yearsExperience: '',
    hasNzJobOffer: '',
    employerName: '',
    jobTitle: '',
    nzJobLocation: '',
    payRate: '',
    nzPayCurrency: '',
    nzJobHours: '',
    employerAccredited: '',
    employmentAgreementProvided: '',
    proposedStartDate: '',
    employmentDetails: '',
    previousWorkHistory: '',
    highestQualification: '',
    qualificationName: '',
    qualificationInstitution: '',
    qualificationCountry: '',
    qualificationYearCompleted: '',
    qualificationStudyLength: '',
    taughtInEnglish: '',
    nzqaAssessed: '',
    qualificationRelatedToOccupation: '',
    qualificationDetails: '',
    healthIssues: '',
    dependantHealthIssues: '',
    healthDetails: '',
    characterIssues: '',
    characterConvictions: '',
    characterPendingCharges: '',
    deportationRemoval: '',
    characterDetails: '',
    visaDeclines: '',
    immigrationHistoryDetails: '',
    overstayed: '',
    falseMisleadingIssue: '',
    appealOrDeadline: '',
    countriesLived: '',
    countriesLivedFiveYearsSince17: '',
    nzTravelHistory: '',
    englishLevel: '',
    fundsAvailableSupport: '',
    availableFunds: '',
    fundsCurrency: '',
    sourceOfFunds: '',
    investmentInterest: '',
    investmentFunds: '',
    investmentCurrency: '',
    fundsHeldByYou: '',
    fundsTransferableNz: '',
    fundsDetails: '',
    additionalInfo: '',
  };
}

function normaliseSimplifiedIntakeStatus(value) {
  const status = String(value || '').trim();
  if (INTAKE_STATUSES.includes(status)) return status;
  if (/converted|signed client/i.test(status)) return 'Converted';
  if (['Reviewing', 'Consultation booked', 'Agreement sent', 'Not proceeding', 'Archived'].includes(status)) return 'Contacted';
  if (/spam|duplicate/i.test(status)) return 'Spam / Duplicate';
  return 'New';
}

function normaliseIntakeEnquiry(entry = {}) {
  const status = normaliseSimplifiedIntakeStatus(entry.status);
  return {
    id: entry.id || '',
    status,
    assignedAdviserId: entry.assignedAdviserId || entry.assigned_adviser_id || '',
    firstName: entry.firstName || entry.applicantFirstName || entry.applicant_first_name || '',
    lastName: entry.lastName || entry.applicantLastName || entry.applicant_last_name || '',
    email: entry.email || '',
    phone: entry.phone || '',
    currentLocation: entry.currentLocation || entry.current_location || '',
    citizenship: entry.citizenship || '',
    dateOfBirth: entry.dateOfBirth || entry.date_of_birth || '',
    currentVisaType: entry.currentVisaType || entry.current_visa_type || '',
    currentVisaExpiry: entry.currentVisaExpiry || entry.current_visa_expiry || '',
    targetPathway: entry.targetPathway || entry.target_pathway || '',
    urgency: entry.urgency || '',
    flags: entry.flags && typeof entry.flags === 'object' ? entry.flags : {},
    rawPayload: entry.rawPayload && typeof entry.rawPayload === 'object' ? entry.rawPayload : entry.raw_payload && typeof entry.raw_payload === 'object' ? entry.raw_payload : {},
    adviserAssessmentNotes: entry.adviserAssessmentNotes || entry.adviser_assessment_notes || '',
    recommendedPathway: entry.recommendedPathway || entry.recommended_pathway || '',
    consultationOutcome: entry.consultationOutcome || entry.consultation_outcome || '',
    convertedClientId: entry.convertedClientId || entry.converted_client_id || '',
    createdAt: entry.createdAt || entry.created_at || '',
    updatedAt: entry.updatedAt || entry.updated_at || '',
  };
}

function intakeLabelForKey(key = '') {
  const labels = {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Mobile phone',
    preferredContactMethod: 'Preferred contact method',
    citizenship: 'Country of citizenship',
    dateOfBirth: 'Date of birth',
    dateOfBirthAge: 'Age',
    applicantCv: 'Applicant CV',
    targetPathway: 'Main goal',
    immediateNeed: 'Immediate need',
    longTermGoal: 'Long-term goal',
    desiredTimeframe: 'Preferred timing',
    urgency: 'Urgency',
    urgentDeadline: 'Urgent deadline',
    helpNeeded: 'Help needed',
    isInNewZealand: 'Currently in New Zealand',
    currentLocation: 'Current country / location',
    currentVisaType: 'Current visa',
    currentVisaExpiry: 'Visa expiry',
    visaConditions: 'Visa conditions',
    previouslyVisitedNz: 'Previously visited NZ',
    previouslyHeldNzVisa: 'Previously held NZ visa',
    plannedTravelDate: 'Planned travel date (if known)',
    passportExpiry: 'Passport expiry',
    relationshipStatus: 'Relationship status',
    hasPartner: 'Has partner',
    partnerFullName: 'Partner full name',
    partnerDateOfBirth: 'Partner date of birth',
    partnerCitizenship: 'Partner citizenship',
    partnerCurrentCountry: 'Partner country',
    partnerVisaStatus: 'Partner visa status',
    partnerNzStatus: 'Partner NZ citizen/resident',
    livingTogether: 'Living together',
    relationshipStarted: 'Relationship started',
    startedLivingTogether: 'Started living together',
    partnerIncluded: 'Partner included',
    relationshipBackground: 'Relationship background',
    partnerCurrentEmploymentStatus: 'Partner employment status',
    partnerOccupation: 'Partner occupation',
    partnerCurrentEmployer: 'Partner current employer',
    partnerEmploymentCountry: 'Partner employment country',
    partnerCurrentJobStartDate: 'Partner current job start date',
    partnerHoursPerWeek: 'Partner hours per week',
    partnerAnnualSalary: 'Partner salary / pay rate',
    partnerSalaryCurrency: 'Partner salary currency',
    partnerYearsExperience: 'Partner relevant experience',
    partnerEmploymentDetails: 'Partner employment details',
    partnerPreviousWorkHistory: 'Partner previous work history',
    partnerHighestQualification: 'Partner highest qualification',
    partnerQualificationName: 'Partner qualification name',
    partnerQualificationInstitution: 'Partner institution',
    partnerQualificationCountry: 'Partner qualification country',
    partnerQualificationYearCompleted: 'Partner year completed',
    partnerQualificationStudyLength: 'Partner length of study',
    partnerTaughtInEnglish: 'Partner taught in English',
    partnerNzqaAssessed: 'Partner NZQA assessed',
    partnerQualificationRelatedToOccupation: 'Partner qualification related to occupation',
    partnerQualificationDetails: 'Partner qualification details',
    partnerCv: 'Partner CV',
    hasChildren: 'Has children',
    children: 'Children',
    moreChildrenDetails: 'More children details',
    currentEmploymentStatus: 'Employment status',
    occupation: 'Occupation',
    currentEmployer: 'Current employer',
    employmentCountry: 'Employment country',
    currentJobStartDate: 'Current job start date',
    hoursPerWeek: 'Hours per week',
    annualSalary: 'Salary / pay rate',
    salaryCurrency: 'Salary currency',
    yearsExperience: 'Relevant experience',
    hasNzJobOffer: 'NZ job offer',
    employerName: 'NZ employer',
    jobTitle: 'Job title',
    nzJobLocation: 'NZ job location',
    payRate: 'NZ pay rate',
    nzPayCurrency: 'NZ pay currency',
    nzJobHours: 'NZ job hours',
    employerAccredited: 'Employer accredited',
    employmentAgreementProvided: 'Employment agreement',
    proposedStartDate: 'Proposed start date',
    employmentDetails: 'Employment details',
    previousWorkHistory: 'Previous work history',
    highestQualification: 'Highest qualification',
    qualificationName: 'Qualification name',
    qualificationInstitution: 'Institution',
    qualificationCountry: 'Qualification country',
    qualificationYearCompleted: 'Year completed',
    qualificationStudyLength: 'Length of study',
    taughtInEnglish: 'Taught in English',
    nzqaAssessed: 'NZQA assessed',
    qualificationRelatedToOccupation: 'Related to occupation',
    qualificationDetails: 'Qualification details',
    healthIssues: 'Health issue',
    dependantHealthIssues: 'Family health concern',
    healthDetails: 'Health details',
    characterIssues: 'Character issue',
    characterConvictions: 'Criminal convictions',
    characterPendingCharges: 'Pending charges',
    deportationRemoval: 'Deportation/removal history',
    characterDetails: 'Character / immigration details',
    visaDeclines: 'Visa declines',
    immigrationHistoryDetails: 'Immigration history details',
    overstayed: 'Overstayed',
    falseMisleadingIssue: 'False/misleading information issue',
    appealOrDeadline: 'Appeal/reconsideration/deadline',
    countriesLived: 'Countries with 12 months or more',
    countriesLivedFiveYearsSince17: 'Countries with five years or more since age 17',
    nzTravelHistory: 'NZ visa/travel history',
    fundsAvailableSupport: 'Funds to support move',
    availableFunds: 'Available funds',
    fundsCurrency: 'Currency',
    sourceOfFunds: 'Source of funds',
    investmentInterest: 'Investment interest',
    investmentFunds: 'Investment funds',
    investmentCurrency: 'Investment currency',
    fundsHeldByYou: 'Funds held by applicant',
    fundsTransferableNz: 'Funds transferable to NZ',
    fundsDetails: 'Funds details',
    additionalInfo: 'Additional comments',
  };
  return labels[key] || key;
}


function normaliseLibraryEntry(entry = {}) {
  const entryType = LIBRARY_ENTRY_TYPES.includes(entry.entryType || entry.entry_type) ? (entry.entryType || entry.entry_type) : 'Policy';
  const status = LIBRARY_STATUSES.includes(entry.status) ? entry.status : 'Current';
  const category = LIBRARY_CATEGORIES.includes(entry.category) ? entry.category : (entryType === 'Form' ? 'Forms' : 'General');
  return {
    id: entry.id || `temp-library-${Date.now()}`,
    entryType,
    referenceCode: entry.referenceCode || entry.reference_code || '',
    title: entry.title || '',
    category,
    status,
    officialUrl: entry.officialUrl || entry.official_url || '',
    versionLabel: entry.versionLabel || entry.version_label || '',
    acceptableUntil: entry.acceptableUntil || entry.acceptable_until || '',
    relatedCaseTypes: Array.isArray(entry.relatedCaseTypes) ? entry.relatedCaseTypes : Array.isArray(entry.related_case_types) ? entry.related_case_types : [],
    relatedDocumentItems: Array.isArray(entry.relatedDocumentItems) ? entry.relatedDocumentItems : Array.isArray(entry.related_document_items) ? entry.related_document_items : [],
    internalSummary: entry.internalSummary || entry.internal_summary || '',
    adviserNotes: entry.adviserNotes || entry.adviser_notes || '',
    lastReviewed: entry.lastReviewed || entry.last_reviewed || '',
    nextReviewDue: entry.nextReviewDue || entry.next_review_due || '',
    reviewedBy: entry.reviewedBy || entry.reviewed_by || '',
  };
}

function splitCsv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function toggleArrayValue(values = [], value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function isPersistedId(id) {
  return Boolean(id && !String(id).startsWith('temp-'));
}

function isLibraryReviewDue(entry = {}) {
  const reviewDiff = dateDiff(entry.nextReviewDue);
  const acceptableDiff = entry.status === 'Acceptable until' ? dateDiff(entry.acceptableUntil) : null;
  return (reviewDiff !== null && reviewDiff <= 0) || (acceptableDiff !== null && acceptableDiff <= 30);
}

function statusClass(status = '') {
  return String(status).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return toIsoDate(d);
}

function normaliseClientDeadline(deadline = {}) {
  const type = deadline.type || deadline.deadline_type || DEFAULT_DEADLINE_TYPES[0];
  return {
    id: deadline.id || `deadline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    date: normaliseIsoDate(deadline.date || deadline.deadline_date),
    note: deadline.note || '',
    actionStatus: normaliseDeadlineActionStatus(deadline.actionStatus || deadline.action_status || deadline.signalStatus || defaultDeadlineActionStatus(type, 'deadline')),
    reviewDate: normaliseIsoDate(deadline.reviewDate || deadline.review_date),
  };
}

function normaliseIsoDate(value) {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normaliseClientFromApi(client = {}, stageTemplates = DEFAULT_STAGE_TEMPLATES) {
  return {
    ...client,
    sharepointFolderUrl: client.sharepointFolderUrl || '',
    oneLawClientNumber: client.oneLawClientNumber || client.one_law_client_number || '',
    dateOfBirth: client.dateOfBirth || '',
    nextActionLog: normaliseNextActionLog(client.nextActionLog),
    portalEnabled: Boolean(client.portalEnabled),
    portalEmail: client.portalEmail || '',
    portalStatusUpdate: client.portalStatusUpdate || '',
    portalNextStep: client.portalNextStep || '',
    portalVisibleDocumentIds: Array.isArray(client.portalVisibleDocumentIds) ? client.portalVisibleDocumentIds : [],
    portalVisibleDeadlineIds: Array.isArray(client.portalVisibleDeadlineIds) ? client.portalVisibleDeadlineIds : [],
    portalVisibleAppointmentIds: Array.isArray(client.portalVisibleAppointmentIds) ? client.portalVisibleAppointmentIds : [],
    portalVisibleBillingIds: Array.isArray(client.portalVisibleBillingIds) ? client.portalVisibleBillingIds : [],
    portalResourceSettings: normalisePortalResourceSettings(client.portalResourceSettings),
    portalAccessCodeSet: Boolean(client.portalAccessCodeSet),
    portalLastPublishedAt: client.portalLastPublishedAt || '',
    portalLastAccessedAt: client.portalLastAccessedAt || '',
    portalMessages: Array.isArray(client.portalMessages) ? client.portalMessages.map(normalisePortalMessage) : [],
    portalDocuments: Array.isArray(client.portalDocuments) ? client.portalDocuments.map(normalisePortalDocument) : [],
    familyMembers: Array.isArray(client.familyMembers) ? client.familyMembers.map((member) => ({ ...member, nationality: member.nationality || '' })) : [],
    documentChecklist: normaliseDocumentChecklist(client.documentChecklist),
    deadlines: Array.isArray(client.deadlines) ? client.deadlines.map(normaliseClientDeadline) : [],
    billing: normaliseBillingItems(client.billing || []),
    stages: normaliseStages(client.stages, stageTemplates),
  };
}


function normalisePortalResourceSettings(value = {}) {
  let input = value;
  if (typeof input === 'string') input = safeJsonParse(input, {});
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  return PORTAL_RESOURCE_PAGES.reduce((settings, page) => {
    const raw = input[page.key];
    if (typeof raw === 'boolean') {
      settings[page.key] = { enabled: raw, clientNote: '' };
    } else if (raw && typeof raw === 'object') {
      settings[page.key] = {
        enabled: Boolean(raw.enabled),
        clientNote: String(raw.clientNote || raw.client_note || raw.note || '').trim(),
      };
    } else {
      settings[page.key] = { ...(DEFAULT_PORTAL_RESOURCE_SETTINGS[page.key] || { enabled: false, clientNote: '' }) };
    }
    return settings;
  }, {});
}

function normalisePortalResource(resource = {}) {
  const key = String(resource.key || '').trim();
  const page = PORTAL_RESOURCE_PAGES.find((item) => item.key === key);
  return {
    key,
    enabled: Boolean(resource.enabled) && Boolean(page),
    clientNote: String(resource.clientNote || resource.client_note || '').trim(),
  };
}

function normalisePortalMessage(message = {}) {
  return {
    id: message.id || `portal-message-${Date.now()}`,
    messageType: message.messageType || message.message_type || 'client_note',
    title: message.title || '',
    message: message.message || '',
    status: message.status === 'Reviewed' ? 'Reviewed' : 'New',
    createdAt: message.createdAt || message.created_at || '',
  };
}

function normalisePortalDocument(doc = {}) {
  return {
    id: doc.id || `portal-doc-${Date.now()}`,
    clientId: doc.clientId || doc.client_id || '',
    title: doc.title || doc.fileName || doc.file_name || 'Client portal PDF',
    category: doc.category || 'THiS instructions',
    description: doc.description || '',
    fileName: doc.fileName || doc.file_name || '',
    fileType: doc.fileType || doc.file_type || 'application/pdf',
    fileSize: Number(doc.fileSize || doc.file_size || 0),
    visibleToClient: doc.visibleToClient ?? doc.visible_to_client ?? true,
    uploadedBy: doc.uploadedBy || doc.uploaded_by || '',
    uploadedAt: doc.uploadedAt || doc.uploaded_at || '',
  };
}

function normaliseData(body) {
  return {
    advisers: (body.advisers || []).map((adviser) => ({ ...adviser, loginEmail: adviser.loginEmail || adviser.login_email || '', availability: adviser.availability === 'Away' ? 'Away' : 'Available' })),
    clients: (body.clients || []).map((client) => normaliseClientFromApi(client, body.stageTemplates || DEFAULT_STAGE_TEMPLATES)),
    caseTypes: body.caseTypes || DEFAULT_CASE_TYPES,
    deadlineTypes: body.deadlineTypes || DEFAULT_DEADLINE_TYPES,
    stageTemplates: body.stageTemplates || DEFAULT_STAGE_TEMPLATES,
    personalTasks: (body.personalTasks || []).map(normalisePersonalTask),
    calendarEntries: (body.calendarEntries || []).map(normaliseCalendarEntry),
    libraryEntries: (body.libraryEntries || []).map(normaliseLibraryEntry),
    intakeEnquiries: (body.intakeEnquiries || []).map(normaliseIntakeEnquiry),
    intakeStatuses: body.intakeStatuses || INTAKE_STATUSES,
    seminars: (body.seminars || []).map(normaliseSeminar),
    seminarRegistrations: (body.seminarRegistrations || []).map(normaliseSeminarRegistration),
    feedbackSubmissions: (body.feedbackSubmissions || []).map(normaliseFeedbackSubmission),
    emailLogs: (body.emailLogs || []).map(normaliseEmailLog),
    emailTemplates: (body.emailTemplates || []).map(normaliseEmailTemplate),
    consultationTypes: (body.consultationTypes || []).map(normaliseConsultationType),
    bookingAvailability: (body.bookingAvailability || []).map(normaliseBookingAvailability),
    bookingBlocks: (body.bookingBlocks || []).map(normaliseBookingBlock),
    bookingLinks: (body.bookingLinks || []).map(normaliseBookingLink),
    consultationBookings: (body.consultationBookings || []).map(normaliseConsultationBooking),
    emailConfig: normaliseEmailConfig(body.emailConfig || {}),
    securityMode: body.securityMode || 'unknown',
  };
}


function normaliseFeedbackSubmission(input = {}) {
  const status = String(input.status || 'New').trim();
  const safeStatus = ['New', 'Reviewed', 'Follow up', 'Closed'].includes(status) ? status : 'New';
  return {
    id: input.id || '',
    status: safeStatus,
    firstName: input.firstName || input.first_name || '',
    lastName: input.lastName || input.last_name || '',
    email: input.email || '',
    phone: input.phone || '',
    adviserName: input.adviserName || input.adviser_name || '',
    applicationType: input.applicationType || input.application_type || '',
    overallRating: input.overallRating || input.overall_rating || '',
    recommendationRating: input.recommendationRating || input.recommendation_rating || '',
    serviceStrengths: input.serviceStrengths || input.service_strengths || '',
    improvementSuggestions: input.improvementSuggestions || input.improvement_suggestions || '',
    permissionToContact: input.permissionToContact || input.permission_to_contact || '',
    permissionToUseFeedback: input.permissionToUseFeedback || input.permission_to_use_feedback || 'No',
    rawPayload: input.rawPayload || input.raw_payload || {},
    reviewedBy: input.reviewedBy || input.reviewed_by || '',
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}


function normaliseSeminar(input = {}) {
  return {
    id: input.id || '',
    title: input.title || 'Turner Hopkins immigration seminar',
    seminarDate: input.seminarDate || input.seminar_date || '',
    seminarTime: normaliseTimeValue(input.seminarTime || input.seminar_time || ''),
    timezone: input.timezone || 'Pacific/Auckland',
    presenterName: input.presenterName || input.presenter_name || '',
    zoomLink: input.zoomLink || input.zoom_link || '',
    zoomPassword: input.zoomPassword || input.zoom_password || '',
    status: SEMINAR_STATUSES.includes(input.status) ? input.status : 'Active',
    registrationOpen: input.registrationOpen ?? input.registration_open ?? true,
    internalNotes: input.internalNotes || input.internal_notes || '',
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}

function normaliseSeminarRegistration(input = {}) {
  const status = input.status || 'New';
  return {
    id: input.id || '',
    seminarId: input.seminarId || input.seminar_id || '',
    status: SEMINAR_REGISTRATION_STATUSES.includes(status) ? status : 'New',
    fullName: input.fullName || input.full_name || '',
    dateOfBirth: input.dateOfBirth || input.date_of_birth || '',
    citizenshipCountry: input.citizenshipCountry || input.citizenship_country || '',
    residenceCountry: input.residenceCountry || input.residence_country || '',
    timezone: input.timezone || 'UTC',
    email: input.email || '',
    partnershipStatus: input.partnershipStatus || input.partnership_status || '',
    highestQualification: input.highestQualification || input.highest_qualification || '',
    currentOccupation: input.currentOccupation || input.current_occupation || '',
    workHistory: input.workHistory || input.work_history || '',
    healthCharacterIssues: input.healthCharacterIssues || input.health_character_issues || '',
    englishAbility: input.englishAbility || input.english_ability || '',
    rawPayload: input.rawPayload || input.raw_payload || {},
    reviewedBy: input.reviewedBy || input.reviewed_by || '',
    approvedAt: input.approvedAt || input.approved_at || '',
    declinedAt: input.declinedAt || input.declined_at || '',
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}

function makeBlankPersonalTask(adviserId = '') {
  return {
    id: `temp-task-${Date.now()}`,
    adviserId: adviserId || '',
    clientId: '',
    title: '',
    dueDate: todayIso(),
    status: 'Open',
    note: '',
  };
}




function normaliseConsultationType(input = {}) {
  return {
    id: input.id || '',
    name: input.name || 'Consultation',
    durationMinutes: Number(input.durationMinutes || input.duration_minutes || 15),
    priceNzd: Number(input.priceNzd || input.price_nzd || 0),
    paid: Boolean(input.paid),
    description: input.description || '',
    active: input.active !== false,
    sortOrder: Number(input.sortOrder || input.sort_order || 100),
    bufferMinutes: Number(input.bufferMinutes || input.buffer_minutes || 15),
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}

function normaliseBookingAvailability(input = {}) {
  return {
    id: input.id || '',
    adviserId: input.adviserId || input.adviser_id || '',
    dayOfWeek: Number(input.dayOfWeek ?? input.day_of_week ?? 1),
    startTime: normaliseTimeValue(input.startTime || input.start_time || '09:00') || '09:00',
    endTime: normaliseTimeValue(input.endTime || input.end_time || '17:00') || '17:00',
    consultationTypeIds: Array.isArray(input.consultationTypeIds) ? input.consultationTypeIds : Array.isArray(input.consultation_type_ids) ? input.consultation_type_ids : [],
    active: input.active !== false,
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}

function normaliseBookingBlock(input = {}) {
  return {
    id: input.id || '',
    adviserId: input.adviserId || input.adviser_id || '',
    blockDate: input.blockDate || input.block_date || '',
    startTime: normaliseTimeValue(input.startTime || input.start_time || ''),
    endTime: normaliseTimeValue(input.endTime || input.end_time || ''),
    allDay: Boolean(input.allDay ?? input.all_day),
    reason: input.reason || '',
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}

function normaliseBookingLink(input = {}) {
  return {
    id: input.id || '',
    token: input.token || '',
    intakeId: input.intakeId || input.intake_id || '',
    adviserId: input.adviserId || input.adviser_id || '',
    applicantName: input.applicantName || input.applicant_name || '',
    applicantEmail: input.applicantEmail || input.applicant_email || '',
    applicantPhone: input.applicantPhone || input.applicant_phone || '',
    allowedTypeIds: Array.isArray(input.allowedTypeIds) ? input.allowedTypeIds : Array.isArray(input.allowed_type_ids) ? input.allowed_type_ids : [],
    expiresAt: input.expiresAt || input.expires_at || '',
    status: BOOKING_LINK_STATUS_OPTIONS.includes(input.status) ? input.status : 'Active',
    notes: input.notes || '',
    bookingUrl: input.bookingUrl || input.booking_url || '',
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}

function normaliseConsultationBooking(input = {}) {
  return {
    id: input.id || '',
    bookingLinkId: input.bookingLinkId || input.booking_link_id || '',
    intakeId: input.intakeId || input.intake_id || '',
    adviserId: input.adviserId || input.adviser_id || '',
    consultationTypeId: input.consultationTypeId || input.consultation_type_id || '',
    bookingDate: input.bookingDate || input.booking_date || '',
    startTime: normaliseTimeValue(input.startTime || input.start_time || ''),
    endTime: normaliseTimeValue(input.endTime || input.end_time || ''),
    applicantName: input.applicantName || input.applicant_name || '',
    applicantEmail: input.applicantEmail || input.applicant_email || '',
    applicantPhone: input.applicantPhone || input.applicant_phone || '',
    notes: input.notes || '',
    status: BOOKING_STATUS_OPTIONS.includes(input.status) ? input.status : 'Reserved',
    paymentStatus: input.paymentStatus || input.payment_status || 'Not required',
    createdAt: input.createdAt || input.created_at || '',
    updatedAt: input.updatedAt || input.updated_at || '',
  };
}

function normaliseEmailTemplate(template = {}) {
  return {
    key: template.key || template.templateKey || template.template_key || '',
    name: template.name || emailTemplateLabel(template.key || template.templateKey || template.template_key || ''),
    description: template.description || '',
    subject: template.subject || '',
    bodyText: template.bodyText || template.body_text || '',
    bodyHtml: hasMeaningfulTemplateHtml(template.bodyHtml || template.body_html || '') ? (template.bodyHtml || template.body_html || '') : '',
    placeholders: Array.isArray(template.placeholders) ? template.placeholders : [],
    updatedAt: template.updatedAt || template.updated_at || '',
    updatedBy: template.updatedBy || template.updated_by || '',
  };
}

function normaliseEmailConfig(config = {}) {
  return {
    configured: Boolean(config.configured),
    fromEmail: config.fromEmail || '',
    fromName: config.fromName || 'Turner Hopkins Immigration Specialists',
  };
}

function normaliseEmailLog(log = {}) {
  return {
    id: log.id || `email-${Date.now()}`,
    toEmail: log.toEmail || log.to_email || '',
    fromEmail: log.fromEmail || log.from_email || '',
    fromName: log.fromName || log.from_name || '',
    subject: log.subject || '',
    status: log.status || 'Unknown',
    templateKey: log.templateKey || log.template_key || 'test',
    failureMessage: log.failureMessage || log.failure_message || '',
    sentBy: log.sentBy || log.sent_by || '',
    sentAt: log.sentAt || log.sent_at || '',
    failedAt: log.failedAt || log.failed_at || '',
    createdAt: log.createdAt || log.created_at || '',
  };
}

function normalisePersonalTask(task = {}) {
  return {
    id: task.id || `temp-task-${Date.now()}`,
    adviserId: task.adviserId || '',
    clientId: task.clientId || '',
    title: task.title || '',
    dueDate: task.dueDate || '',
    status: task.status === 'Completed' ? 'Completed' : 'Open',
    note: task.note || '',
  };
}

function makeBlankCalendarEntry(defaultAdviserId = '', defaultDate = '') {
  return {
    id: `temp-calendar-${Date.now()}`,
    clientId: '',
    adviserId: defaultAdviserId || '',
    title: 'Appointment',
    appointmentType: APPOINTMENT_TYPES[0],
    appointmentDate: defaultDate || todayIso(),
    startTime: '',
    endTime: '',
    location: '',
    notes: '',
    status: 'Open',
  };
}

function makeBlankCalendarFollowUp() {
  return { enabled: false, action: '', dueDate: '' };
}

function normaliseCalendarEntry(entry = {}) {
  const timePattern = /^\d{2}:\d{2}$/;
  return {
    id: entry.id || `temp-calendar-${Date.now()}`,
    clientId: entry.clientId || '',
    adviserId: entry.adviserId || '',
    title: String(entry.title || 'Appointment').trim() || 'Appointment',
    appointmentType: APPOINTMENT_TYPES.includes(entry.appointmentType) ? entry.appointmentType : APPOINTMENT_TYPES[0],
    appointmentDate: /^\d{4}-\d{2}-\d{2}$/.test(String(entry.appointmentDate || '')) ? String(entry.appointmentDate) : todayIso(),
    startTime: timePattern.test(String(entry.startTime || '')) ? String(entry.startTime) : '',
    endTime: timePattern.test(String(entry.endTime || '')) ? String(entry.endTime) : '',
    location: String(entry.location || '').trim(),
    notes: String(entry.notes || '').trim(),
    status: entry.status === 'Completed' ? 'Completed' : 'Open',
  };
}

function calendarEntryTimeLabel(entry = {}) {
  if (entry.startTime && entry.endTime) return `${entry.startTime}-${entry.endTime}`;
  return entry.startTime || entry.endTime || '';
}

function calendarEntrySearchText(entry = {}, clients = [], advisers = []) {
  const client = clients.find((item) => item.id === entry.clientId);
  const adviser = advisers.find((item) => item.id === entry.adviserId);
  return [
    entry.title, entry.appointmentType, entry.appointmentDate, entry.startTime, entry.endTime, entry.location, entry.notes, entry.status,
    client?.firstName, client?.lastName, client?.email, client?.caseType, client?.caseStrategy,
    adviser?.name, adviser?.email,
  ].join(' ').toLowerCase();
}

function calendarViewRange(mode = 'current', selectedMonth = currentMonthInput()) {
  const monthValue = mode === 'search' ? selectedMonth : currentMonthInput();
  const months = mode === 'three' ? 3 : 1;
  const [yearRaw, monthRaw] = String(monthValue || currentMonthInput()).split('-');
  const start = new Date(Number(yearRaw), Number(monthRaw || 1) - 1, 1);
  const end = addMonths(start, months);
  return { start: toIsoDate(start), end: toIsoDate(end), label: periodLabel({ start: toIsoDate(start), end: toIsoDate(end) }) };
}

function calendarMonthKeys(startDateValue, count = 1) {
  const start = parseLocalDate(startDateValue) || parseLocalDate(todayIso());
  return Array.from({ length: count }, (_, index) => toIsoDate(addMonths(start, index)).slice(0, 7));
}

function calendarMonthLabel(monthValue) {
  const [yearRaw, monthRaw] = String(monthValue || currentMonthInput()).split('-');
  const date = new Date(Number(yearRaw), Number(monthRaw || 1) - 1, 1);
  return new Intl.DateTimeFormat('en-NZ', { month: 'long', year: 'numeric' }).format(date);
}

function calendarDayLabel(dateValue) {
  const date = parseLocalDate(dateValue);
  if (!date) return 'No date';
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

function calendarViewTitle(viewMode, selectedMonth) {
  if (viewMode === 'three') return 'Current month + 2 months';
  if (viewMode === 'search') return calendarMonthLabel(selectedMonth);
  return calendarMonthLabel(currentMonthInput());
}

function groupCalendarEntriesByDate(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    const date = entry.appointmentDate || todayIso();
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items: items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title)) }));
}



function normaliseNextActionLog(items = []) {
  const input = Array.isArray(items) ? items : [];
  return input
    .map((item, index) => ({
      id: String(item.id || `next-action-log-${Date.now()}-${index}`).trim(),
      action: String(item.action || item.nextAction || '').trim(),
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(item.dueDate || item.nextActionDue || '')) ? String(item.dueDate || item.nextActionDue) : '',
      completedDate: /^\d{4}-\d{2}-\d{2}$/.test(String(item.completedDate || '')) ? String(item.completedDate) : '',
      completedAt: String(item.completedAt || '').trim(),
      replacedByAction: String(item.replacedByAction || '').trim(),
      replacedByDueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(item.replacedByDueDate || '')) ? String(item.replacedByDueDate) : '',
    }))
    .filter((item) => item.action || item.dueDate)
    .slice(-200);
}


function buildDocumentChecklist(items = []) {
  return normaliseDocumentChecklist(items);
}

function normaliseDocumentChecklist(items = []) {
  const input = Array.isArray(items) ? items : [];
  const templateRows = DOCUMENT_CHECKLIST_TEMPLATES.map((template) => {
    const existing = input.find((item) => item.id === template.id || String(item.name || '').toLowerCase() === template.name.toLowerCase()) || {};
    const applied = existing.applied !== false;
    return {
      id: template.id,
      name: template.name,
      applied,
      custom: false,
      expiryDate: existing.expiryDate || existing.expiry_date || '',
      obtained: applied ? Boolean(existing.obtained) : false,
      actionStatus: normaliseDeadlineActionStatus(existing.actionStatus || existing.action_status || defaultDeadlineActionStatus(template.name, 'document-expiry')),
      reviewDate: normaliseIsoDate(existing.reviewDate || existing.review_date),
    };
  });
  const templateIds = new Set(DOCUMENT_CHECKLIST_TEMPLATES.map((template) => template.id));
  const templateNames = new Set(DOCUMENT_CHECKLIST_TEMPLATES.map((template) => template.name.toLowerCase()));
  const customRows = input
    .filter((item) => {
      const id = String(item.id || '').trim();
      const name = String(item.name || '').trim().toLowerCase();
      return item.custom || (id && !templateIds.has(id)) || (name && !templateNames.has(name));
    })
    .map((item, index) => ({
      id: String(item.id || `custom-doc-${index + 1}`).trim(),
      name: String(item.name || 'Custom document').trim(),
      applied: item.applied !== false,
      custom: true,
      expiryDate: item.expiryDate || item.expiry_date || '',
      obtained: item.applied === false ? false : Boolean(item.obtained),
      actionStatus: normaliseDeadlineActionStatus(item.actionStatus || item.action_status || defaultDeadlineActionStatus(item.name, 'document-expiry')),
      reviewDate: normaliseIsoDate(item.reviewDate || item.review_date),
    }))
    .filter((item) => item.name);
  return [...templateRows, ...customRows];
}

function makeDocumentItemId(name, existingItems = []) {
  const base = String(name || 'custom-document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom-document';
  const existing = new Set((existingItems || []).map((item) => item.id));
  let candidate = `custom-doc-${base}`;
  let count = 2;
  while (existing.has(candidate)) {
    candidate = `custom-doc-${base}-${count}`;
    count += 1;
  }
  return candidate;
}

function normaliseStageKey(value) {
  const key = String(value || '').trim();
  return STAGE_KEY_ALIASES[key] || key;
}

function makeStageId(label, existingStages = []) {
  const base = String(label || 'custom-stage')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom-stage';
  const existing = new Set((existingStages || []).map((stage) => stage.id));
  let candidate = `custom-${base}`;
  let count = 2;
  while (existing.has(candidate)) {
    candidate = `custom-${base}-${count}`;
    count += 1;
  }
  return candidate;
}

function reindexStages(stages = []) {
  return (stages || []).map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
}

function sortStages(stages = []) {
  return [...(stages || [])].sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999));
}

function buildStagePlan(templates = DEFAULT_STAGE_TEMPLATES) {
  return templates.map((stage) => ({ ...stage, applied: stage.mandatory, completed: false, completedDate: '', custom: false }));
}

function normaliseStages(stages = [], templates = DEFAULT_STAGE_TEMPLATES) {
  const input = Array.isArray(stages) ? stages : [];
  const templateKeys = new Set(templates.map((template) => template.id));
  const templateRows = templates.map((template) => {
    const existing = input.find((stage) => normaliseStageKey(stage.id || stage.stageKey) === template.id) || {};
    const applied = template.mandatory || Boolean(existing.applied);
    return {
      ...template,
      label: template.label,
      mandatory: template.mandatory,
      custom: false,
      applied,
      completed: applied ? Boolean(existing.completed) : false,
      completedDate: applied && existing.completed ? (existing.completedDate || '') : '',
      sortOrder: Number.isFinite(Number(existing.sortOrder)) ? Number(existing.sortOrder) : template.sortOrder,
    };
  });
  const customRows = input
    .filter((stage) => {
      const key = normaliseStageKey(stage.id || stage.stageKey);
      return key && !templateKeys.has(key);
    })
    .map((stage, index) => {
      const applied = stage.applied !== false;
      return {
        id: String(stage.id || stage.stageKey || `custom-stage-${index + 1}`).trim(),
        label: String(stage.label || stage.stageLabel || 'Custom stage').trim(),
        mandatory: false,
        custom: true,
        applied,
        completed: applied ? Boolean(stage.completed) : false,
        completedDate: applied && stage.completed ? (stage.completedDate || '') : '',
        sortOrder: Number.isFinite(Number(stage.sortOrder)) ? Number(stage.sortOrder) : templates.length + index + 1,
      };
    })
    .filter((stage) => stage.label);
  return reindexStages(sortStages([...templateRows, ...customRows]));
}

function appliedStages(client) {
  return (client.stages || []).filter((stage) => stage.applied);
}

function completedStages(client) {
  return appliedStages(client).filter((stage) => stage.completed);
}

function progressPercent(client) {
  const applied = appliedStages(client);
  if (!applied.length) return 0;
  return Math.round((completedStages(client).length / applied.length) * 100);
}

function currentStageLabel(client) {
  const next = appliedStages(client).find((stage) => !stage.completed);
  return next ? next.label : 'All selected stages completed';
}


async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    const trimmed = text.trim();
    const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');
    const preview = trimmed.slice(0, 220).replace(/\s+/g, ' ');
    if (looksLikeHtml) {
      throw new Error('The CRM API returned the website HTML instead of JSON. Netlify is serving the front-end page instead of the Function. Check that netlify/functions/crm.mjs exists and that the deploy summary shows Functions deployed.');
    }
    throw new Error(`The CRM API returned a non-JSON response. Status ${response.status}. Response preview: ${preview || '(empty response)'}`);
  }
}

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function findAdviserForIdentity(advisers = [], user = null) {
  const email = normaliseEmail(user?.email);
  if (!email) return null;
  return advisers.find((adviser) => normaliseEmail(adviser.loginEmail) === email)
    || advisers.find((adviser) => normaliseEmail(adviser.email) === email)
    || null;
}

function identityRoles(user = null) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (user?.role && !roles.includes(user.role)) return [...roles, user.role];
  return roles;
}

function identityHasRole(user = null, allowedRoles = []) {
  const allowed = allowedRoles.map((role) => role.toLowerCase());
  return identityRoles(user).some((role) => allowed.includes(String(role).toLowerCase()));
}

function identityRoleLabel(user = null) {
  const roles = identityRoles(user);
  return roles.length ? roles.join(', ') : 'Identity user';
}

function authHeaders(code, user) {
  const headers = code ? { 'x-crm-token': code } : {};
  const token = identityAccessToken(user);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function identityAccessToken(user) {
  if (!user) return '';
  if (typeof user.access_token === 'string') return user.access_token;
  if (typeof user.accessToken === 'string') return user.accessToken;
  if (typeof user.jwt === 'string') return user.jwt;
  if (typeof user.token === 'string') return user.token;
  if (typeof user.token?.access_token === 'string') return user.token.access_token;
  if (typeof user.token?.jwt === 'string') return user.token.jwt;
  return '';
}



function normaliseBillingStatus(status) {
  if (status === 'Overdue') return 'Overdue';
  if (status === 'Invoiced' || status === 'Paid') return 'Invoiced';
  return 'WIP';
}

function normaliseBillingTriggerType(value) {
  return value === 'Milestone' ? 'Milestone' : 'Date';
}

function normaliseBillingItem(item = {}) {
  return {
    ...item,
    milestone: item.milestone || '',
    dueDate: item.dueDate || '',
    amount: Number(item.amount || 0),
    status: normaliseBillingStatus(item.status),
    invoiceNo: item.invoiceNo || '',
    triggerType: normaliseBillingTriggerType(item.triggerType),
    stageKey: normaliseStageKey(item.stageKey || ''),
  };
}

function normaliseBillingItems(items = []) {
  return Array.isArray(items) ? items.map(normaliseBillingItem) : [];
}

function billingLinkedStage(item, client) {
  return (client.stages || []).find((stage) => stage.id === item.stageKey) || null;
}

function billingReportingDate(item, client) {
  const normalised = normaliseBillingItem(item);
  if (normalised.triggerType === 'Milestone') {
    const stage = billingLinkedStage(normalised, client);
    return stage?.completed ? (stage.completedDate || '') : '';
  }
  return normalised.dueDate || '';
}

function effectiveBillingStatus(item, client) {
  const normalised = normaliseBillingItem(item);
  const status = normalised.status;
  if (status === 'WIP') {
    const reportDate = billingReportingDate(normalised, client);
    if (reportDate && dateDiff(reportDate) < 0) return 'Overdue';
  }
  return status;
}

function billingTriggerLabel(item, client) {
  const normalised = normaliseBillingItem(item);
  if (normalised.triggerType === 'Milestone') {
    const stage = billingLinkedStage(normalised, client);
    if (!stage) return 'No linked stage selected';
    return stage.completed ? `Triggered by ${stage.label}` : `Due when ${stage.label} is completed`;
  }
  return 'Billing date';
}

function billingTaskForClient(client, item) {
  const normalised = normaliseBillingItem(item);
  if (normalised.status === 'Invoiced') return null;
  const date = billingReportingDate(normalised, client);
  if (!date) return null;
  return {
    id: `${client.id}-billing-${normalised.id || normalised.milestone}`,
    client,
    adviserId: client.primaryAdviserId || '',
    type: `Billing Due: ${normalised.milestone || 'Billing item'}`,
    date,
    note: `${billingTriggerLabel(normalised, client)} · ${formatCurrency(normalised.amount)}`,
    source: 'billing',
    diff: dateDiff(date),
  };
}

function currentMonthInput() {
  return monthValueFromDate(new Date());
}

function monthValueFromDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function normaliseMonthValue(monthValue) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthValue || ''));
  if (!match) return currentMonthInput();
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return currentMonthInput();
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addMonthsToMonthValue(monthValue, months) {
  const [yearRaw, monthRaw] = normaliseMonthValue(monthValue).split('-');
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  return monthValueFromDate(addMonths(date, months));
}

function monthDisplayLabel(monthValue, format = 'long') {
  const [yearRaw, monthRaw] = normaliseMonthValue(monthValue).split('-');
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  const month = format === 'short' ? 'short' : 'long';
  return new Intl.DateTimeFormat('en-NZ', { month, year: 'numeric' }).format(date);
}

function monthOptionsAround(monthValue, monthsBack = 24, monthsForward = 36) {
  const safeValue = normaliseMonthValue(monthValue);
  const options = [];
  for (let offset = -monthsBack; offset <= monthsForward; offset += 1) {
    const value = addMonthsToMonthValue(safeValue, offset);
    options.push({ value, label: monthDisplayLabel(value) });
  }
  return options;
}

function addDaysIso(dateValue, days) {
  const date = parseLocalDate(dateValue) || new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return toIsoDate(date);
}

function toIsoDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateValue) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ''));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function billingPeriodRange(monthValue, mode) {
  const [yearRaw, monthRaw] = normaliseMonthValue(monthValue).split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw) - 1;
  if (mode === 'year') {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { start: toIsoDate(start), end: toIsoDate(end), label: `${year}` };
  }
  const months = mode === '6-months' ? 6 : mode === '3-months' ? 3 : 1;
  const start = new Date(year, month, 1);
  const end = addMonths(start, months);
  const endMonthValue = monthValueFromDate(addMonths(end, -1));
  const label = months === 1 ? monthDisplayLabel(monthValue) : `${monthDisplayLabel(monthValue, 'short')} to ${monthDisplayLabel(endMonthValue, 'short')}`;
  return { start: toIsoDate(start), end: toIsoDate(end), label };
}

function periodLabel(range) {
  if (range?.label) return range.label;
  const endDate = parseLocalDate(range.end);
  if (!endDate) return `${range.start} to ${range.end}`;
  endDate.setDate(endDate.getDate() - 1);
  return `${range.start} to ${toIsoDate(endDate)}`;
}

function BillingStatusPill({ status }) {
  const value = normaliseBillingStatus(status);
  return <b className={`billing-status ${value.toLowerCase()}`}>{value}</b>;
}

function calculateAge(dateValue) {
  if (!dateValue) return null;
  const dob = parseLocalDate(dateValue);
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}



function buildClientTimelineItems(client = {}, calendarEntries = [], advisers = []) {
  const items = [];
  const clientId = client.id;

  if (client.nextAction || client.nextActionDue) {
    items.push({
      id: `${clientId}-current-next-action`,
      date: client.nextActionDue || todayIso(),
      category: 'Current next action',
      title: client.nextAction || 'No action text recorded',
      detail: client.nextActionDue ? `Due ${client.nextActionDue}` : 'No due date recorded',
      badge: 'Current',
      statusKey: dateDiff(client.nextActionDue) < 0 ? 'overdue' : '',
    });
  }

  normaliseNextActionLog(client.nextActionLog).forEach((item) => {
    items.push({
      id: `${clientId}-action-log-${item.id}`,
      date: item.completedDate || item.dueDate || '',
      category: 'Next action log',
      title: item.action || 'Previous next action',
      detail: item.replacedByAction ? `Replaced by: ${item.replacedByAction}` : 'Previous scheduled action was replaced or completed.',
      meta: [item.dueDate ? `Was due ${item.dueDate}` : '', item.replacedByDueDate ? `New due date ${item.replacedByDueDate}` : ''].filter(Boolean).join(' · '),
      badge: 'Logged',
    });
  });

  calendarEntries
    .filter((entry) => entry.clientId === clientId)
    .forEach((entry) => {
      const adviser = advisers.find((item) => item.id === entry.adviserId);
      items.push({
        id: `${clientId}-calendar-${entry.id}`,
        date: entry.appointmentDate || '',
        category: 'Calendar',
        title: entry.title || 'Appointment',
        detail: [calendarEntryTimeLabel(entry), entry.appointmentType || APPOINTMENT_TYPES[0], entry.location].filter(Boolean).join(' · '),
        meta: [adviser?.name, entry.notes].filter(Boolean).join(' · '),
        badge: entry.status === 'Completed' ? 'Completed' : 'Open',
        statusKey: entry.status !== 'Completed' && dateDiff(entry.appointmentDate) < 0 ? 'overdue' : entry.status === 'Completed' ? 'completed' : '',
      });
    });

  (client.stages || [])
    .filter((stage) => stage.applied && stage.completed && stage.completedDate)
    .forEach((stage) => {
      items.push({
        id: `${clientId}-stage-${stage.id}`,
        date: stage.completedDate,
        category: 'Matter stage',
        title: `${stage.label} completed`,
        detail: stage.custom ? 'Custom application stage' : (stage.mandatory ? 'Mandatory stage' : 'Optional stage'),
        badge: 'Completed',
        statusKey: 'completed',
      });
    });

  normaliseDocumentChecklist(client.documentChecklist)
    .filter((item) => item.applied && item.expiryDate)
    .forEach((item) => {
      items.push({
        id: `${clientId}-document-${item.id}`,
        date: item.expiryDate,
        category: 'Document expiry',
        title: `${item.name} expiry`,
        detail: item.obtained ? 'Document marked as obtained.' : 'Document not yet marked as obtained.',
        badge: item.obtained ? 'Obtained' : 'Outstanding',
        statusKey: dateDiff(item.expiryDate) < 0 ? 'overdue' : '',
      });
    });

  normaliseBillingItems(client.billing || []).forEach((item) => {
    const date = billingReportingDate(item, client);
    if (!date) return;
    const status = effectiveBillingStatus(item, client);
    items.push({
      id: `${clientId}-billing-${item.id || item.milestone}`,
      date,
      category: 'Billing',
      title: item.milestone || 'Billing item',
      detail: `${formatCurrency(item.amount)} · ${billingTriggerLabel(item, client)}`,
      meta: item.invoiceNo ? `Invoice ${item.invoiceNo}` : 'No invoice number recorded',
      badge: status,
      statusKey: status === 'Overdue' ? 'overdue' : status === 'Invoiced' ? 'completed' : '',
    });
  });

  return items
    .filter((item) => item.title)
    .sort((a, b) => (b.date || '0000-00-00').localeCompare(a.date || '0000-00-00') || a.category.localeCompare(b.category))
    .slice(0, 120);
}

function documentExpiryRowsForClient(client) {
  return normaliseDocumentChecklist(client.documentChecklist)
    .filter((item) => item.applied && item.expiryDate)
    .map((item) => ({
      id: `${client.id}-document-expiry-${item.id}`,
      client,
      adviserId: client.primaryAdviserId || '',
      type: `Document Expiry: ${item.name}`,
      date: item.expiryDate,
      note: item.obtained ? 'Document obtained; check expiry before use.' : 'Document not yet marked as obtained.',
      source: 'document-expiry',
      actionStatus: item.actionStatus || defaultDeadlineActionStatus(item.name, 'document-expiry'),
      reviewDate: item.reviewDate || '',
      diff: dateDiff(item.expiryDate),
    }));
}

function calendarDeadlineRows(entries = [], clients = []) {
  return (entries || [])
    .filter((entry) => entry.status !== 'Completed' && entry.appointmentDate && entry.clientId)
    .map((entry) => {
      const linkedClient = clients.find((client) => client.id === entry.clientId) || null;
      if (!linkedClient) return null;
      return {
        id: `calendar-deadline-${entry.id}`,
        client: linkedClient,
        calendarEntry: entry,
        type: 'Calendar Appointment',
        date: entry.appointmentDate,
        note: [calendarEntryTimeLabel(entry), entry.appointmentType, entry.title, entry.notes].filter(Boolean).join(' · '),
        source: 'calendar-entry',
        diff: dateDiff(entry.appointmentDate),
      };
    })
    .filter(Boolean);
}

function calendarTaskRows(entries = [], clients = []) {
  return (entries || [])
    .filter((entry) => entry.status !== 'Completed' && entry.appointmentDate)
    .map((entry) => {
      const linkedClient = clients.find((client) => client.id === entry.clientId) || null;
      return {
        id: `calendar-${entry.id}`,
        client: linkedClient,
        calendarEntry: entry,
        adviserId: entry.adviserId || linkedClient?.primaryAdviserId || '',
        type: 'Calendar Appointment',
        date: entry.appointmentDate,
        note: [calendarEntryTimeLabel(entry), entry.appointmentType, entry.title, entry.location, entry.notes].filter(Boolean).join(' · '),
        source: 'calendar-entry',
        diff: dateDiff(entry.appointmentDate),
      };
    });
}

function buildTaskRows(clients, personalTasks = [], allClients = [], calendarEntries = []) {
  const clientRows = clients
    .flatMap((client) => [
      ...(client.deadlines || []).map((deadline) => ({
        id: `${client.id}-${deadline.id}`,
        client,
        adviserId: client.primaryAdviserId || '',
        type: deadline.type,
        date: deadline.date,
        note: deadline.note || '',
        source: 'deadline',
        actionStatus: deadline.actionStatus,
        reviewDate: deadline.reviewDate,
        diff: dateDiff(deadline.date),
      })),
      ...documentExpiryRowsForClient(client),
      client.nextActionDue ? {
        id: `${client.id}-next-action`,
        client,
        adviserId: client.primaryAdviserId || '',
        type: 'Next Action Date',
        date: client.nextActionDue,
        note: client.nextAction || '',
        source: 'next-action',
        diff: dateDiff(client.nextActionDue),
      } : null,
      ...(client.billing || []).map((item) => billingTaskForClient(client, item)),
    ].filter(Boolean));

  const personalRows = (personalTasks || [])
    .filter((task) => task.status !== 'Completed')
    .map((task) => {
      const linkedClient = allClients.find((client) => client.id === task.clientId) || null;
      return {
        id: `personal-${task.id}`,
        client: linkedClient,
        personalTask: task,
        adviserId: task.adviserId,
        type: 'Personal Task',
        date: task.dueDate,
        note: task.note || task.title || '',
        source: 'personal-task',
        diff: dateDiff(task.dueDate),
      };
    });

  const calendarRows = calendarTaskRows(calendarEntries, allClients);

  return [...clientRows, ...personalRows, ...calendarRows]
    .filter((row) => row.date)
    .sort((a, b) => compareTasks(a, b, 'priority'));
}

function nextTaskForClient(client, taskRows) {
  return taskRows
    .filter((row) => row.client?.id === client.id)
    .sort((a, b) => a.date.localeCompare(b.date) || taskPriority(a) - taskPriority(b))[0] || null;
}

function taskStatusKey(row) {
  if (row.diff === null || row.diff === undefined) return 'future';
  if (row.diff < 0) return 'overdue';
  if (row.diff === 0) return 'today';
  if (row.diff <= 7) return 'next-7';
  return 'future';
}

function taskPriority(row) {
  if (row.diff === null || row.diff === undefined) return 5;
  if (row.diff < 0) return 0;
  if (row.diff === 0) return 1;
  if (row.diff <= 7) return 2;
  if (row.diff <= 30) return 3;
  return 4;
}

function clientName(client) {
  if (!client) return '';
  return `${client.lastName || ''} ${client.firstName || ''}`.trim().toLowerCase();
}

function compareTasks(a, b, sortMode) {
  const aName = taskDisplayName(a).toLowerCase();
  const bName = taskDisplayName(b).toLowerCase();
  if (sortMode === 'date-asc') return a.date.localeCompare(b.date) || aName.localeCompare(bName);
  if (sortMode === 'date-desc') return b.date.localeCompare(a.date) || aName.localeCompare(bName);
  if (sortMode === 'client') return aName.localeCompare(bName) || a.date.localeCompare(b.date);
  if (sortMode === 'type') return a.type.localeCompare(b.type) || a.date.localeCompare(b.date);
  return taskPriority(a) - taskPriority(b) || a.date.localeCompare(b.date) || aName.localeCompare(bName);
}

function taskDisplayName(row) {
  if (row.client) return `${row.client.firstName || ''} ${row.client.lastName || ''}`.trim() || 'Linked client';
  if (row.calendarEntry) return row.calendarEntry.title || 'Calendar appointment';
  return row.personalTask?.title || 'Personal task';
}

function taskContextLabel(row) {
  if (row.client) return row.client.caseType || 'Linked client';
  if (row.source === 'calendar-entry') return 'Calendar appointment';
  if (row.source === 'personal-task') return 'No linked client';
  return 'Task';
}

function taskAdviserName(row, advisers = []) {
  const adviserId = row.adviserId || row.client?.primaryAdviserId || row.personalTask?.adviserId;
  return advisers.find((adviser) => adviser.id === adviserId)?.name || 'Unassigned';
}

function taskSearchText(row) {
  return [
    row.type, row.note, row.date,
    row.client?.firstName, row.client?.lastName, row.client?.email, row.client?.caseType, row.client?.oneLawClientNumber, row.client?.caseStrategy,
    row.calendarEntry?.title, row.calendarEntry?.appointmentType, row.calendarEntry?.location, row.calendarEntry?.notes,
    row.personalTask?.title, row.personalTask?.note
  ].join(' ').toLowerCase();
}


function matchesTaskRowScope(row, adviserId) {
  if (adviserId === 'all') return true;
  const rowAdviserId = row.adviserId || row.personalTask?.adviserId || row.calendarEntry?.adviserId || row.client?.primaryAdviserId || '';
  return rowAdviserId === adviserId;
}

function matchesPersonalTaskScope(task, adviserId) {
  return adviserId === 'all' || task.adviserId === adviserId;
}

function matchesCalendarEntryScope(entry, adviserId, clients = []) {
  if (adviserId === 'all') return true;
  if (entry.adviserId === adviserId) return true;
  const linkedClient = clients.find((client) => client.id === entry.clientId);
  return Boolean(linkedClient && matchesAdviserScope(linkedClient, adviserId));
}

function matchesAdviserScope(client, adviserId) {
  return adviserId === 'all' || client.primaryAdviserId === adviserId || client.backupAdviserId === adviserId;
}

function dateDiff(date) {
  if (!date) return null;
  const start = parseLocalDate(todayIso());
  const end = parseLocalDate(date);
  if (!start || !end) return null;
  return Math.round((end - start) / 86400000);
}

function todayIso() {
  return toIsoDate(new Date());
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(Number(value || 0));
}
