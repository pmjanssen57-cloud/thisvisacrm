import React, { useEffect, useMemo, useRef, useState } from 'react';
import { acceptInvite, getUser, handleAuthCallback, login, logout, onAuthChange, requestPasswordRecovery, updateUser } from '@netlify/identity';
import { AlertTriangle, ArrowUpDown, BookOpen, Calculator, CalendarDays, CheckCircle2, ChevronRight, Clock, CloudSun, Copy, CreditCard, Database, DollarSign, ExternalLink, FileText, Globe2, HelpCircle, LayoutDashboard, Link2, ListChecks, LockKeyhole, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, UserRound, UsersRound, Wrench, X } from 'lucide-react';

const BRAND = {
  ink: '#003736',
  mint: '#55D9A0',
  pale: '#F4FBF8',
  line: '#D9E6E1',
};

const LOGO_SRC = '/turner-hopkins-logo.png';

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

const BILLING_STATUSES = ['WIP', 'Invoiced', 'Overdue'];
const BILLING_TRIGGER_TYPES = ['Date', 'Milestone'];
const APPOINTMENT_TYPES = ['Client meeting', 'Adviser review', 'Lodgement target', 'Document follow-up', 'INZ call', 'Billing follow-up', 'Internal review', 'Other'];

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

const SUPPORT_CONTENT = {
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
      { heading: 'Adviser profiles', text: 'Keep adviser names and emails accurate. These records drive primary and backup adviser assignments.' },
      { heading: 'Active status', text: 'Use inactive status for advisers who should remain in historical records but should not usually receive new clients.' },
      { heading: 'Login mapping', text: 'Use the Login Email field to match a Netlify Identity user to the adviser profile. The main adviser email can still be used for client communication.' },
    ],
    tips: ['Match each adviser profile to their Netlify Identity email address.', 'Avoid deleting advisers if they are linked to historical client records.'],
  },
};

const COUNTRY_OPTIONS = [
  "Afghanistan",,
  "Albania",,
  "Algeria",,
  "Andorra",,
  "Angola",,
  "Antigua and Barbuda",,
  "Argentina",,
  "Armenia",,
  "Australia",,
  "Austria",,
  "Azerbaijan",,
  "Bahamas",,
  "Bahrain",,
  "Bangladesh",,
  "Barbados",,
  "Belarus",,
  "Belgium",,
  "Belize",,
  "Benin",,
  "Bhutan",,
  "Bolivia",,
  "Bosnia and Herzegovina",,
  "Botswana",,
  "Brazil",,
  "Brunei",,
  "Bulgaria",,
  "Burkina Faso",,
  "Burundi",,
  "Cambodia",,
  "Cameroon",,
  "Canada",,
  "Cape Verde",,
  "Central African Republic",,
  "Chad",,
  "Chile",,
  "China",,
  "Colombia",,
  "Comoros",,
  "Congo",,
  "Costa Rica",,
  "Croatia",,
  "Cuba",,
  "Cyprus",,
  "Czech Republic",,
  "Democratic Republic of the Congo",,
  "Denmark",,
  "Djibouti",,
  "Dominica",,
  "Dominican Republic",,
  "Ecuador",,
  "Egypt",,
  "El Salvador",,
  "Equatorial Guinea",,
  "Eritrea",,
  "Estonia",,
  "Eswatini",,
  "Ethiopia",,
  "Fiji",,
  "Finland",,
  "France",,
  "Gabon",,
  "Gambia",,
  "Georgia",,
  "Germany",,
  "Ghana",,
  "Greece",,
  "Grenada",,
  "Guatemala",,
  "Guinea",,
  "Guinea-Bissau",,
  "Guyana",,
  "Haiti",,
  "Honduras",,
  "Hungary",,
  "Iceland",,
  "India",,
  "Indonesia",,
  "Iran",,
  "Iraq",,
  "Ireland",,
  "Israel",,
  "Italy",,
  "Jamaica",,
  "Japan",,
  "Jordan",,
  "Kazakhstan",,
  "Kenya",,
  "Kiribati",,
  "Kuwait",,
  "Kyrgyzstan",,
  "Laos",,
  "Latvia",,
  "Lebanon",,
  "Lesotho",,
  "Liberia",,
  "Libya",,
  "Liechtenstein",,
  "Lithuania",,
  "Luxembourg",,
  "Madagascar",,
  "Malawi",,
  "Malaysia",,
  "Maldives",,
  "Mali",,
  "Malta",,
  "Marshall Islands",,
  "Mauritania",,
  "Mauritius",,
  "Mexico",,
  "Micronesia",,
  "Moldova",,
  "Monaco",,
  "Mongolia",,
  "Montenegro",,
  "Morocco",,
  "Mozambique",,
  "Myanmar",,
  "Namibia",,
  "Nauru",,
  "Nepal",,
  "Netherlands",,
  "New Zealand",,
  "Nicaragua",,
  "Niger",,
  "Nigeria",,
  "North Korea",,
  "North Macedonia",,
  "Norway",,
  "Oman",,
  "Pakistan",,
  "Palau",,
  "Palestine",,
  "Panama",,
  "Papua New Guinea",,
  "Paraguay",,
  "Peru",,
  "Philippines",,
  "Poland",,
  "Portugal",,
  "Qatar",,
  "Romania",,
  "Russia",,
  "Rwanda",,
  "Saint Kitts and Nevis",,
  "Saint Lucia",,
  "Saint Vincent and the Grenadines",,
  "Samoa",,
  "San Marino",,
  "Sao Tome and Principe",,
  "Saudi Arabia",,
  "Senegal",,
  "Serbia",,
  "Seychelles",,
  "Sierra Leone",,
  "Singapore",,
  "Slovakia",,
  "Slovenia",,
  "Solomon Islands",,
  "Somalia",,
  "South Africa",,
  "South Korea",,
  "South Sudan",,
  "Spain",,
  "Sri Lanka",,
  "Sudan",,
  "Suriname",,
  "Sweden",,
  "Switzerland",,
  "Syria",,
  "Taiwan",,
  "Tajikistan",,
  "Tanzania",,
  "Thailand",,
  "Timor-Leste",,
  "Togo",,
  "Tonga",,
  "Trinidad and Tobago",,
  "Tunisia",,
  "Turkey",,
  "Turkmenistan",,
  "Tuvalu",,
  "Uganda",,
  "Ukraine",,
  "United Arab Emirates",,
  "United Kingdom",,
  "United States",,
  "Uruguay",,
  "Uzbekistan",,
  "Vanuatu",,
  "Vatican City",,
  "Venezuela",,
  "Vietnam",,
  "Yemen",,
  "Zambia",,
  "Zimbabwe",
];

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
  securityMode: 'unknown',
};

function makeBlankClient(data) {
  return {
    id: `temp-${Date.now()}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
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
    notes: '',
    stages: buildStagePlan(data.stageTemplates),
    familyMembers: [],
    documentChecklist: buildDocumentChecklist(),
    deadlines: [],
    billing: [],
  };
}

export default function App() {
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [clientEditorDirty, setClientEditorDirty] = useState(false);
  const [calendarEditorDirty, setCalendarEditorDirty] = useState(false);

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

  function selectClient(clientId) {
    if (clientId === selectedClientId) return true;
    if (!confirmDiscardClientEdits()) return false;
    setClientEditorDirty(false);
    setSelectedClientId(clientId);
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
          setError('You are logged in, but the CRM API did not accept the Identity session. Use the temporary CRM access code fallback while this is checked.');
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

  async function callApi(action, payload = {}) {
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
        throw new Error('Your Identity session or temporary CRM access code was not accepted.');
      }
      const body = await readJsonResponse(response);
      if (!response.ok) throw new Error(formatApiError(body, 'CRM save failed'));
      setData(normaliseData(body));
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
    const body = await callApi('saveClient', { client });
    if (body.client?.id) {
      if (wasNewClient && options.resetNewClientForm) {
        const blankClient = makeBlankClient({ ...data, clients: body.clients || data.clients });
        setData((current) => ({ ...current, clients: [blankClient, ...(body.clients || current.clients)] }));
        setSelectedClientId(blankClient.id);
        setTab('clients');
      } else {
        setSelectedClientId(body.client.id);
      }
    }
    return body;
  }

  async function saveAdviser(adviser) {
    await callApi('saveAdviser', { adviser });
  }

  async function savePersonalTask(task) {
    await callApi('savePersonalTask', { task });
  }

  async function deletePersonalTask(taskId) {
    if (!window.confirm('Delete this personal task?')) return;
    await callApi('deletePersonalTask', { taskId });
  }

  async function saveCalendarEntry(entry) {
    await callApi('saveCalendarEntry', { entry });
  }

  async function deleteCalendarEntry(entryId) {
    if (!window.confirm('Delete this calendar entry?')) return;
    await callApi('deleteCalendarEntry', { entryId });
  }

  async function saveLibraryEntry(entry) {
    return await callApi('saveLibraryEntry', { entry });
  }

  async function deleteLibraryEntry(entryId) {
    if (!window.confirm('Delete this library item?')) return;
    return await callApi('deleteLibraryEntry', { entryId });
  }

  async function deleteClient(clientId) {
    if (!window.confirm('Delete this client and all linked stages, deadlines and billing records?')) return;
    const body = await callApi('deleteClient', { clientId });
    setSelectedClientId(body.clients?.[0]?.id || '');
  }

  function addClient() {
    if (!confirmDiscardPendingEdits()) return;
    setClientEditorDirty(false);
    setCalendarEditorDirty(false);
    const newClient = makeBlankClient(data);
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
        ...(client.deadlines || []).map((deadline) => ({ client, type: deadline.type, date: deadline.date, note: deadline.note, source: 'deadline' })),
        ...documentExpiryRowsForClient(client),
        client.nextActionDue ? { client, type: 'Next Action Date', date: client.nextActionDue, note: client.nextAction, source: 'next-action' } : null,
      ].filter(Boolean)),
      ...calendarDeadlineRows(scopedCalendarEntries, data.clients),
    ]
      .filter((row) => row.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [scopedClients, scopedCalendarEntries, data.clients]);

  const taskRows = useMemo(() => buildTaskRows(scopedClients, scopedPersonalTasks, data.clients, scopedCalendarEntries), [scopedClients, scopedPersonalTasks, data.clients, scopedCalendarEntries]);

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
        <AuthStatus user={identityUser} adviser={identityAdviser} accessCodeActive={Boolean(accessCode)} onLogout={logoutIdentityUser} />
        <div className="top-actions desktop-only">
          <button className="btn ghost" onClick={() => { setToolsOpen(false); setSupportOpen(true); }}><HelpCircle size={16} />Help</button>
          <button className="btn ghost" onClick={() => { setSupportOpen(false); setToolsOpen(true); }}><Wrench size={16} />Tools</button>
          <button className="btn ghost" onClick={refreshData} disabled={loading}><RefreshCw size={16} />Refresh</button>
          {(identityUser || accessCode) && <button className="btn danger" onClick={logoutIdentityUser}><LockKeyhole size={16} />Sign out</button>}
          <button className="btn dark" onClick={addClient}><Plus size={16} />Client</button>
          {canManageAdvisers && <button className="btn" onClick={addAdviser}><Plus size={16} />Adviser</button>}
        </div>
        <div className="mobile-header-actions mobile-only">
          <button className="btn ghost" onClick={() => { setToolsOpen(false); setSupportOpen(true); }}><HelpCircle size={16} />Help</button>
          <button className="btn ghost" onClick={() => { setSupportOpen(false); setToolsOpen(true); }}><Wrench size={16} />Tools</button>
          <button className="btn ghost" onClick={refreshData} disabled={loading}><RefreshCw size={16} />Refresh</button>
        </div>
      </header>

      <main className="layout">
        {data.securityMode === 'open-prototype' && (
          <div className="warning-banner">
            <AlertTriangle size={18} /> No CRM access token is configured. This is open prototype mode. Do not enter live client data until you set CRM_ACCESS_TOKEN in Netlify.
          </div>
        )}
        {error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}
        {loading && <div className="loading-card"><Database size={18} />Loading database-backed CRM data...</div>}

        {!loading && !data.clients.length && !data.advisers.length && (
          <section className="empty-state">
            <Database size={40} />
            <h1>Database is connected, but no CRM records exist yet.</h1>
            <p>Seed sample Turner Hopkins-style data for testing, or add advisers and clients manually.</p>
            <button className="btn dark" onClick={seedSampleData} disabled={saving}><Database size={16} />Seed sample data</button>
          </section>
        )}

        {(data.clients.length > 0 || data.advisers.length > 0 || data.libraryEntries.length > 0) && (
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
            <nav className="tabs desktop-tabs">
              <TabButton active={tab === 'dashboard'} onClick={() => switchTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
              <TabButton active={tab === 'tasks'} onClick={() => switchTab('tasks')} icon={ListChecks} label="Tasks" />
              <TabButton active={tab === 'calendar'} onClick={() => switchTab('calendar')} icon={CalendarDays} label="Calendar" />
              <TabButton active={tab === 'library'} onClick={() => switchTab('library')} icon={BookOpen} label="Library" />
              <TabButton active={tab === 'clients'} onClick={() => switchTab('clients')} icon={UsersRound} label="Clients" />
              <TabButton active={tab === 'billing'} onClick={() => switchTab('billing')} icon={CreditCard} label="Billing" />
              {canManageAdvisers && <TabButton active={tab === 'advisers'} onClick={() => switchTab('advisers')} icon={UsersRound} label="Advisers" />}
            </nav>

            {tab === 'dashboard' && (
              <Dashboard clients={scopedClients} activeClients={activeClients} advisers={data.advisers} dashboardAdviserFilter={dashboardAdviserFilter} deadlineRows={deadlineRows} taskRows={taskRows} stageTemplates={data.stageTemplates} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />
            )}

            {tab === 'tasks' && (
              <TasksDashboard taskRows={taskRows} personalTasks={scopedPersonalTasks} allClients={data.clients} advisers={data.advisers} dashboardAdviserFilter={dashboardAdviserFilter} savePersonalTask={savePersonalTask} deletePersonalTask={deletePersonalTask} saving={saving} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />
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
      <ToolsDrawer open={toolsOpen} onOpen={() => { setSupportOpen(false); setToolsOpen(true); }} onClose={() => setToolsOpen(false)} />
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
    </div>
  );

}


function AuthStatus({ user, adviser, accessCodeActive, onLogout }) {
  if (!user && !accessCodeActive) return null;
  const roleLabel = identityRoleLabel(user);
  return (
    <div className="auth-status" title={user?.email || 'Temporary access-code session'}>
      <ShieldCheck size={16} />
      <div>
        <strong>{user ? (adviser?.name || user.name || user.email || 'Logged-in user') : 'Temporary access session'}</strong>
        <span>{user ? `${roleLabel}${user.email ? ` · ${user.email}` : ''}` : 'Access code fallback active'}</span>
      </div>
      <button type="button" className="btn mini danger" onClick={onLogout}>Sign out</button>
    </div>
  );
}


function MobileBottomNav({ activeTab, onNavigate, onOpenMore }) {
  const navItems = [
    { tab: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { tab: 'tasks', label: 'Tasks', icon: ListChecks },
    { tab: 'clients', label: 'Clients', icon: UsersRound },
    { tab: 'calendar', label: 'Calendar', icon: CalendarDays },
  ];
  const moreActive = ['billing', 'advisers', 'library'].includes(activeTab);
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

function ToolsDrawer({ open, onOpen, onClose }) {
  const [activeTool, setActiveTool] = useState('weather');

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
        <p className="support-summary">Quick tools for client calls, international matters and day-to-day file work. Results are practical aids only and should be checked before being used in formal advice.</p>
        <div className="tool-tabs" role="tablist" aria-label="Adviser tools">
          <button type="button" className={activeTool === 'weather' ? 'active' : ''} onClick={() => setActiveTool('weather')}><CloudSun size={16} />Weather</button>
          <button type="button" className={activeTool === 'timezone' ? 'active' : ''} onClick={() => setActiveTool('timezone')}><Globe2 size={16} />Time</button>
          <button type="button" className={activeTool === 'currency' ? 'active' : ''} onClick={() => setActiveTool('currency')}><DollarSign size={16} />Currency</button>
          <button type="button" className={activeTool === 'calculator' ? 'active' : ''} onClick={() => setActiveTool('calculator')}><Calculator size={16} />Calc</button>
        </div>
        <div className="tool-panel">
          {activeTool === 'weather' && <WeatherTool />}
          {activeTool === 'timezone' && <TimezoneTool />}
          {activeTool === 'currency' && <CurrencyTool />}
          {activeTool === 'calculator' && <CalculatorTool />}
        </div>
      </aside>
    </>
  );
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
  const viewLabel = selectedAdviser ? `${selectedAdviser.name}'s matters` : 'All advisers';

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
    <section className="view-toolbar">
      <div className="view-copy">
        <UserRound size={18} />
        <div>
          <strong>Current view: {viewLabel}</strong>
          <span>Use this to switch between whole-practice reporting and an individual adviser view.</span>
        </div>
      </div>
      <div className="view-controls">
        <label>
          <span>Adviser scope</span>
          <select value={dashboardAdviserFilter} onChange={(event) => setDashboardAdviserFilter(event.target.value)}>
            {canViewAllAdvisers && <option value="all">All advisers</option>}
            {advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}
          </select>
        </label>
        <form className="global-search" onSubmit={submitSearch}>
          <Search size={16} />
          <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search clients, citizenship, address, case type, strategy..." />
          <button className="btn dark" type="submit">Search</button>
        </form>
        <div className="view-result">
          <strong>{matchingClientCount}</strong>
          <span>matching client{matchingClientCount === 1 ? '' : 's'}</span>
        </div>
        <button className="btn ghost" type="button" onClick={clearView}><X size={16} />Clear</button>
      </div>
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
        <p>{isInvite ? 'Your Netlify Identity invitation has been recognised. Set a password to finish activating your CRM access.' : isRecovery ? 'Enter a new password to complete the reset process.' : 'Access is restricted to invited Turner Hopkins users.'}</p>

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

        {!isInvite && !isRecovery && (
          <div className="legacy-access-box">
            <button type="button" className="link-button" onClick={() => setLegacyAccessVisible(!legacyAccessVisible)}>
              {legacyAccessVisible ? 'Hide temporary access code fallback' : 'Use temporary access code fallback'}
            </button>
            {legacyAccessVisible && (
              <form className="access-form" onSubmit={submitAccessCode}>
                <input type="password" value={pendingCode} onChange={(event) => setPendingCode(event.target.value)} placeholder="CRM access code" />
                <button className="btn" type="submit" disabled={loading}>Continue with access code</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard({ clients, activeClients, advisers, dashboardAdviserFilter, deadlineRows, taskRows, stageTemplates, setTab, setSelectedClientId, openClientRecord }) {
  const pendingInvoices = clients.flatMap((client) => (client.billing || []).map((item) => ({ item, client }))).filter(({ item, client }) => effectiveBillingStatus(item, client) !== 'Invoiced');
  const overdueRows = deadlineRows.filter((row) => dateDiff(row.date) < 0);
  const next14 = deadlineRows.filter((row) => dateDiff(row.date) >= 0 && dateDiff(row.date) <= 14);
  const clientsWithoutNextAction = activeClients.filter((client) => !client.nextActionDue);
  const overdueCalendarItems = taskRows.filter((row) => row.source === 'calendar-entry' && row.diff < 0);

  const visibleAdvisers = dashboardAdviserFilter === 'all' ? advisers : advisers.filter((adviser) => adviser.id === dashboardAdviserFilter);
  const viewTitle = dashboardAdviserFilter === 'all' ? 'Whole-practice dashboard' : `${advisers.find((adviser) => adviser.id === dashboardAdviserFilter)?.name || 'Adviser'} dashboard`;


  return (
    <div className="stack">
      <section className="panel dashboard-heading">
        <div>
          <h2>{viewTitle}</h2>
          <p className="muted">Dashboard metrics, deadlines and billing are filtered to the selected adviser scope.</p>
        </div>
        <span>{clients.length} client{clients.length === 1 ? '' : 's'} in view</span>
      </section>
      <div className="metric-grid">
        <MetricCard label="Active clients" value={activeClients.length} note="Open matters" icon={UsersRound} />
        <MetricCard label="Deadlines next 14 days" value={next14.length} note="Expiry, PPI, filing and actions" icon={CalendarDays} />
        <MetricCard label="Overdue items" value={overdueRows.length} note="Needs attention" icon={AlertTriangle} warning />
        <MetricCard label="Overdue calendar" value={overdueCalendarItems.length} note="Open appointments in the past" icon={CalendarDays} warning={overdueCalendarItems.length > 0} />
        <MetricCard label="WIP / overdue billing" value={formatCurrency(pendingInvoices.reduce((sum, row) => sum + Number(row.item.amount || 0), 0))} note="Billing not yet invoiced" icon={CreditCard} />
      </div>

      <DailyBringUpPanel taskRows={taskRows} advisers={advisers} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />

      <QuickTaskPanel taskRows={taskRows} advisers={advisers} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />

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
          <AdviserClientWorkloadList clients={activeClients} advisers={advisers} taskRows={taskRows} setTab={setTab} setSelectedClientId={setSelectedClientId} openClientRecord={openClientRecord} />
        </section>

        <section className="panel">
          <h2>Next critical dates</h2>
          <p className="muted">Sorted by nearest deadline.</p>
          <div className="date-list">
            {deadlineRows.slice(0, 10).map((row, index) => (
              <button className="date-row" key={`${row.client.id}-${row.type}-${index}`} onClick={() => openClientRecord ? openClientRecord(row.client.id) : (setSelectedClientId(row.client.id), setTab('clients'))}>
                <span><strong>{row.client.firstName} {row.client.lastName}</strong><small>{row.type} · {row.date}</small></span>
                <DeadlineBadge diff={dateDiff(row.date)} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
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
  const stages = client.stages || [];
  const applied = appliedStages(client);
  const completed = completedStages(client);
  const nextStage = applied.find((stage) => !stage.completed) || null;

  function stageStatus(stage) {
    if (!stage.applied) return 'skipped';
    if (stage.completed) return 'completed';
    if (nextStage?.id === stage.id) return 'current';
    return 'upcoming';
  }

  return (
    <section className="progress-map">
      <div className="progress-map-header">
        <div>
          <h2>Client progress map</h2>
          <p className="muted">Applied stages drive the progress percentage. Optional stages that are not relevant are shown as skipped and do not affect progress.</p>
        </div>
        <div className="progress-map-stats">
          <span><b>{applied.length}</b> applied</span>
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
                <small>{status === 'current' ? 'Current / next stage' : status === 'completed' ? (stage.completedDate ? `Completed ${stage.completedDate}` : 'Completed') : status === 'skipped' ? 'Not applied to this matter' : 'Upcoming'}</small>
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

function ClientsWorkspace(props) {
  const { clients, selectedClient, advisers, caseTypes, deadlineTypes, clientQuery, setClientQuery, adviserFilter, setAdviserFilter, caseTypeFilter, setCaseTypeFilter, setSelectedClientId, onDirtyChange, saveClient, deleteClient, saving, calendarEntries = [] } = props;
  return (
    <div className="workspace-grid">
      <aside className="panel list-panel">
        <h2>Clients</h2>
        <div className="search-box"><Search size={16} /><input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search clients" /></div>
        <select value={adviserFilter} onChange={(event) => setAdviserFilter(event.target.value)}><option value="all">All advisers</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select>
        <select value={caseTypeFilter} onChange={(event) => setCaseTypeFilter(event.target.value)}><option value="all">All case types</option>{caseTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
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
        <ClientEditor client={selectedClient} advisers={advisers} caseTypes={caseTypes} deadlineTypes={deadlineTypes} calendarEntries={calendarEntries} saveClient={saveClient} deleteClient={deleteClient} saving={saving} onDirtyChange={onDirtyChange} />
      </section>
    </div>
  );
}

function ClientEditor({ client, advisers, caseTypes, deadlineTypes, calendarEntries = [], saveClient, deleteClient, saving, onDirtyChange }) {
  const [draft, setDraft] = useState(client);
  const [showFullRecord, setShowFullRecord] = useState(false);
  const [showDocumentChecklist, setShowDocumentChecklist] = useState(false);
  const [showActionLog, setShowActionLog] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMatterStages, setShowMatterStages] = useState(false);
  const [showClientDeadlines, setShowClientDeadlines] = useState(false);
  const [showClientBilling, setShowClientBilling] = useState(false);
  const [customStageLabel, setCustomStageLabel] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const isDirty = useMemo(() => stableStringify(draft) !== stableStringify(client), [draft, client]);
  useEffect(() => {
    setDraft(client);
    setShowFullRecord(false);
    setShowDocumentChecklist(false);
    setShowActionLog(false);
    setShowTimeline(false);
    setShowMatterStages(false);
    setShowClientDeadlines(false);
    setShowClientBilling(false);
    setCustomStageLabel('');
    setStatusMessage('');
    setValidationMessage('');
  }, [client]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

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
    setDraft((current) => ({ ...current, deadlines: [...(current.deadlines || []), { id: `temp-${Date.now()}`, type: deadlineTypes[0], date: '', note: '' }] }));
  }

  function updateDeadline(id, patch) {
    setDraft((current) => ({ ...current, deadlines: current.deadlines.map((deadline) => deadline.id === id ? { ...deadline, ...patch } : deadline) }));
  }

  function removeDeadline(id) {
    setDraft((current) => ({ ...current, deadlines: current.deadlines.filter((deadline) => deadline.id !== id) }));
  }

  function addBilling() {
    setDraft((current) => ({ ...current, billing: [...(current.billing || []), { id: `temp-${Date.now()}`, milestone: 'New billing item', dueDate: '', amount: 0, status: 'WIP', invoiceNo: '', triggerType: 'Date', stageKey: '' }] }));
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

  function addCustomDocumentItem() {
    const name = window.prompt('Document name');
    const trimmed = String(name || '').trim();
    if (!trimmed) return;
    setDraft((current) => {
      const checklist = normaliseDocumentChecklist(current.documentChecklist);
      const duplicate = checklist.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      if (duplicate) {
        setValidationMessage('That document item already exists in this checklist.');
        return current;
      }
      return {
        ...current,
        documentChecklist: [...checklist, { id: makeDocumentItemId(trimmed, checklist), name: trimmed, applied: true, custom: true, expiryDate: '', obtained: false }],
      };
    });
  }

  function removeCustomDocumentItem(id) {
    setDraft((current) => ({
      ...current,
      documentChecklist: normaliseDocumentChecklist(current.documentChecklist).filter((item) => item.id !== id || !item.custom),
    }));
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

  async function handleSaveClient() {
    const isNewClient = String(draft.id || '').startsWith('temp-');
    setValidationMessage('');
    setStatusMessage('Saving client record...');
    try {
      await saveClient(draft, { resetNewClientForm: isNewClient });
      onDirtyChange?.(false);
      setStatusMessage(isNewClient ? 'Saved. A blank new client form is ready for the next entry.' : `Saved ${formatTimeNow()}.`);
    } catch (err) {
      setStatusMessage('');
      setValidationMessage(err.message || 'Client record could not be saved.');
    }
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

  return (
    <div>
      <div className="detail-header">
        <div>
          <h1>{draft.firstName || 'New'} {draft.lastName || 'client'}</h1>
          <p>{draft.caseType || 'No case type selected'}</p>
        </div>
        <div className="button-row">
          <button className="btn danger" onClick={() => deleteClient(draft.id)} disabled={saving || String(draft.id).startsWith('temp-')}><Trash2 size={16} />Delete</button>
          <button className="btn dark" onClick={handleSaveClient} disabled={saving}><Save size={16} />Save client</button>
        </div>
      </div>

      <div className={`client-save-bar ${isDirty ? 'dirty' : 'clean'}`}>
        <div>
          <strong>{saving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'No unsaved changes'}</strong>
          <span>{validationMessage || statusMessage || (isDirty ? 'Save before switching clients, changing page, or refreshing.' : 'Client record is aligned with the last saved version.')}</span>
        </div>
        <button className="btn dark" type="button" onClick={handleSaveClient} disabled={saving || !isDirty}><Save size={16} />Save changes</button>
      </div>

      <ClientSummaryPanel draft={draft} setField={setField} onOpenActionLog={() => setShowActionLog(true)} onOpenTimeline={() => setShowTimeline(true)} onPrintProfile={handlePrintClientProfile} calendarEntries={calendarEntries} />

      {showActionLog && <NextActionLogModal client={draft} onClose={() => setShowActionLog(false)} />}
      {showTimeline && <ClientTimelineModal client={draft} calendarEntries={calendarEntries} advisers={advisers} onClose={() => setShowTimeline(false)} />}

      <div className="client-record-toggle document-checklist-toggle">
        <button className="btn" type="button" onClick={() => setShowDocumentChecklist((value) => !value)}>{showDocumentChecklist ? 'Hide document checklist' : 'Show document checklist'}</button>
        <span>Track requested documents, expiry dates and whether each document has been obtained.</span>
      </div>

      {showDocumentChecklist && (
        <DocumentChecklist
          items={normaliseDocumentChecklist(draft.documentChecklist)}
          updateItem={updateDocumentItem}
          addCustomItem={addCustomDocumentItem}
          removeCustomItem={removeCustomDocumentItem}
        />
      )}

      <div className="client-record-toggle">
        <button className="btn" type="button" onClick={() => setShowFullRecord((value) => !value)}>{showFullRecord ? 'Hide full client record' : 'Show full client record'}</button>
        <span>{showFullRecord ? 'Full editable file details are shown below.' : 'Open the full record to edit strategy, stages, deadlines, family details and billing.'}</span>
      </div>

      {showFullRecord && (
        <>
      <div className="progress-card"><span>{currentStageLabel(draft)}</span><b>{progressPercent(draft)}%</b><ProgressBar value={progressPercent(draft)} /></div>

      <ProgressMap client={draft} />

      <div className="form-grid">
        <Field label="Email" value={draft.email} onChange={(v) => setField('email', v)} />
        <Field label="Phone" value={draft.phone} onChange={(v) => setField('phone', v)} />
        <Field label="OneLaw Client Number" value={draft.oneLawClientNumber || ''} onChange={(v) => setField('oneLawClientNumber', v)} placeholder="e.g. OL-12345" />
        <LookupField label="Citizenship" value={draft.nationality} onChange={(v) => setField('nationality', v)} options={COUNTRY_OPTIONS} listId="citizenship-options" placeholder="Start typing a country of citizenship" />
        <LookupField label="Current address" value={draft.location} onChange={(v) => setField('location', v)} options={ADDRESS_LOOKUP_EXAMPLES} listId="address-options" placeholder="Start typing the current address" />
        <SelectField label="Case type / application type" value={draft.caseType} onChange={(v) => setField('caseType', v)} options={caseTypes} placeholder="Select case type" />
        <SelectField label="Primary adviser" value={draft.primaryAdviserId} onChange={(v) => setField('primaryAdviserId', v)} options={advisers.map((a) => ({ label: a.name, value: a.id }))} placeholder="Select primary adviser" />
        <SelectField label="Backup adviser" value={draft.backupAdviserId} onChange={(v) => setField('backupAdviserId', v)} options={advisers.map((a) => ({ label: a.name, value: a.id }))} placeholder="Select backup adviser" />
        <SelectField label="Priority" value={draft.priority} onChange={(v) => setField('priority', v)} options={['Normal', 'High', 'Urgent']} />
      </div>


      <section className="sub-panel strategy-panel">
        <h2>Case strategy</h2>
        <p className="muted">Use this as the master case summary: key issues, strategy, risks, evidence gaps and agreed approach.</p>
        <TextArea label="Case strategy / key issues" value={draft.caseStrategy} onChange={(v) => setField('caseStrategy', v)} rows={8} />
      </section>


      <FamilyDetails members={draft.familyMembers || []} addFamilyMember={addFamilyMember} updateFamilyMember={updateFamilyMember} removeFamilyMember={removeFamilyMember} />

      <div className="form-grid two">
        <TextArea label="Notes" value={draft.notes} onChange={(v) => setField('notes', v)} />
      </div>

      <ExpandableClientSection
        title="matter stages"
        isOpen={showMatterStages}
        onToggle={() => setShowMatterStages((value) => !value)}
        summary={`${completedStageCount}/${appliedStageCount || 0} applied stages complete. Expand to apply, reorder or complete stages.`}
      >
        <h2>Matter stages</h2>
        <p className="muted">Mandatory stages always apply. Optional and custom stages can be added, removed or reordered before saving the client.</p>
        <div className="stage-add-row">
          <input value={customStageLabel} onChange={(event) => setCustomStageLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomStage(); } }} placeholder="Add custom matter stage" />
          <button className="btn" type="button" onClick={addCustomStage}><Plus size={16} />Add stage</button>
        </div>
        <div className="stage-list">
          {(draft.stages || []).map((stage, index) => (
            <div className={`stage-row ${stage.custom ? 'custom-stage' : ''}`} key={stage.id}>
              <div className="stage-order-controls">
                <button className="icon-btn" type="button" disabled={index === 0} onClick={() => moveStage(stage.id, -1)}>↑</button>
                <button className="icon-btn" type="button" disabled={index === (draft.stages || []).length - 1} onClick={() => moveStage(stage.id, 1)}>↓</button>
              </div>
              <div className="stage-name-cell"><input type="checkbox" checked={stage.applied} disabled={stage.mandatory} onChange={(event) => updateStage(stage.id, { applied: event.target.checked })} /> <span>{stage.custom ? <input className="stage-label-input" value={stage.label} onChange={(event) => updateStage(stage.id, { label: event.target.value })} /> : <strong>{stage.label}</strong>}<small>{stage.mandatory ? 'Mandatory' : stage.custom ? 'Custom' : 'Optional'}</small></span></div>
              <label><input type="checkbox" checked={stage.completed} disabled={!stage.applied} onChange={(event) => updateStage(stage.id, { completed: event.target.checked })} /> Completed</label>
              <input type="date" value={stage.completedDate || ''} disabled={!stage.applied || !stage.completed} onChange={(event) => updateStage(stage.id, { completedDate: event.target.value })} />
              <button className="icon-btn" type="button" disabled={!stage.custom} onClick={() => removeCustomStage(stage.id)} title={stage.custom ? 'Remove custom stage' : 'Hard-coded stage cannot be removed'}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </ExpandableClientSection>

      <ExpandableClientSection
        title="client deadlines"
        isOpen={showClientDeadlines}
        onToggle={() => setShowClientDeadlines((value) => !value)}
        summary={`${deadlineCount} deadline${deadlineCount === 1 ? '' : 's'} recorded. Expand to add, edit or remove critical dates.`}
      >
        <div className="sub-panel-head"><div><h2>Client deadline dates</h2><p className="muted">Add only the deadline dates that matter for this client.</p></div><button className="btn" onClick={addDeadline}><Plus size={16} />Deadline</button></div>
        <div className="table-like">
          {(draft.deadlines || []).map((deadline) => (
            <div className="editable-row" key={deadline.id}>
              <select value={deadline.type} onChange={(event) => updateDeadline(deadline.id, { type: event.target.value })}>{deadlineTypes.map((type) => <option key={type}>{type}</option>)}</select>
              <input type="date" value={deadline.date || ''} onChange={(event) => updateDeadline(deadline.id, { date: event.target.value })} />
              <input value={deadline.note || ''} onChange={(event) => updateDeadline(deadline.id, { note: event.target.value })} placeholder="Optional note" />
              <button className="icon-btn" onClick={() => removeDeadline(deadline.id)}><Trash2 size={16} /></button>
            </div>
          ))}
          {!draft.deadlines?.length && <p className="muted center">No deadlines added yet.</p>}
        </div>
      </ExpandableClientSection>

      <ExpandableClientSection
        title="billing schedule"
        isOpen={showClientBilling}
        onToggle={() => setShowClientBilling((value) => !value)}
        summary={`${billingItems.length} milestone${billingItems.length === 1 ? '' : 's'} recorded. ${activeBillingItems.length} WIP/overdue totalling ${formatCurrency(activeBillingAmount)}.`}
      >
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
              <label className="billing-field billing-trigger-field"><span>Billing based on</span><select value={item.triggerType || 'Date'} onChange={(event) => updateBilling(item.id, { triggerType: event.target.value, stageKey: event.target.value === 'Date' ? '' : item.stageKey })}><option value="Date">Date</option><option value="Milestone">Matter stage / milestone</option></select></label>
              {item.triggerType === 'Milestone' ? (
                <label className="billing-field billing-stage-field"><span>Linked matter stage</span><select value={item.stageKey || ''} onChange={(event) => updateBilling(item.id, { stageKey: event.target.value })}>
                  <option value="">Select linked stage</option>
                  {(draft.stages || []).filter((stage) => stage.applied).map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select></label>
              ) : (
                <label className="billing-field billing-date-field"><span>Billing date</span><input type="date" value={item.dueDate || ''} onChange={(event) => updateBilling(item.id, { dueDate: event.target.value })} /></label>
              )}
              <label className="billing-field billing-amount-field"><span>Amount</span><input type="number" value={item.amount || 0} onChange={(event) => updateBilling(item.id, { amount: event.target.value })} /></label>
              <label className="billing-field billing-status-field"><span>Status</span><select value={item.status || 'WIP'} onChange={(event) => updateBilling(item.id, { status: event.target.value })}>{BILLING_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="billing-field billing-invoice-field"><span>Invoice no.</span><input value={item.invoiceNo || ''} onChange={(event) => updateBilling(item.id, { invoiceNo: event.target.value })} placeholder="Invoice no." /></label>
              <button className="icon-btn billing-remove-btn" type="button" onClick={() => removeBilling(item.id)} aria-label="Remove billing item"><Trash2 size={16} /></button>
              <small className="billing-hint">{autoOverdue ? 'This WIP billing item is displayed as overdue because its reporting date has passed. Change status to Invoiced once raised.' : item.triggerType === 'Milestone' ? (linkedStage ? (linkedStageDue ? `Billing is now due because ${linkedStage.label} was completed on ${linkedStageDue}.` : `This billing item will become due when ${linkedStage.label} is marked completed.`) : 'Choose Matter stage / milestone, then select the linked client stage that triggers this bill.') : 'This billing item will appear in period billing reports based on the billing date.'}</small>
            </div>
          );})}
          {!draft.billing?.length && <p className="muted center">No billing milestones added yet.</p>}
        </div>
      </ExpandableClientSection>
        </>
      )}
    </div>
  );
}


function ExpandableClientSection({ title, summary, isOpen, onToggle, children }) {
  return (
    <>
      <div className={`client-record-toggle section-toggle ${isOpen ? 'open' : ''}`}>
        <button className="btn" type="button" onClick={onToggle}>
          <ChevronRight size={16} className="section-toggle-icon" />
          {isOpen ? `Hide ${title}` : `Show ${title}`}
        </button>
        <span>{summary}</span>
      </div>
      {isOpen && <section className="sub-panel collapsible-sub-panel">{children}</section>}
    </>
  );
}


function DocumentChecklist({ items, updateItem, addCustomItem, removeCustomItem }) {
  const includedItems = items.filter((item) => item.applied);
  const obtainedCount = includedItems.filter((item) => item.obtained).length;

  return (
    <section className="sub-panel document-checklist-panel">
      <div className="sub-panel-head">
        <div>
          <h2>Document checklist</h2>
          <p className="muted">Mark the document items that apply, record expiry dates where relevant, and mark items as obtained once received. Items that do not apply can be marked as not required.</p>
        </div>
        <div className="document-checklist-actions">
          <span className="workload-count">{obtainedCount}/{includedItems.length} obtained</span>
          <button className="btn" type="button" onClick={addCustomItem}><Plus size={16} />Custom item</button>
        </div>
      </div>
      <div className="document-checklist-list">
        {items.map((item) => (
          item.applied ? (
            <div className="document-checklist-row" key={item.id}>
              <label className="doc-include"><input type="checkbox" checked={item.applied} onChange={(event) => updateItem(item.id, { applied: event.target.checked, obtained: event.target.checked ? item.obtained : false })} /><span>Required</span></label>
              <label className="doc-name"><span>Document</span>{item.custom ? <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /> : <strong>{item.name}</strong>}</label>
              <label className="doc-expiry"><span>Expiry date</span><input type="date" value={item.expiryDate || ''} onChange={(event) => updateItem(item.id, { expiryDate: event.target.value })} /></label>
              <label className="doc-obtained"><input type="checkbox" checked={item.obtained} onChange={(event) => updateItem(item.id, { obtained: event.target.checked })} /><span>Obtained</span></label>
              <button className="icon-btn" type="button" disabled={!item.custom} onClick={() => removeCustomItem(item.id)} title={item.custom ? 'Remove custom checklist item' : 'Standard item can be marked not required, not deleted'}><Trash2 size={16} /></button>
            </div>
          ) : (
            <div className="document-checklist-row muted-row document-checklist-row-hidden" key={item.id}>
              <label className="doc-include"><input type="checkbox" checked={item.applied} onChange={(event) => updateItem(item.id, { applied: event.target.checked })} /><span>Required</span></label>
              <div className="doc-hidden-name"><span>Document</span><strong>{item.name}</strong><small>Not required for this matter</small></div>
              {item.custom ? <button className="icon-btn" type="button" onClick={() => removeCustomItem(item.id)} title="Remove custom checklist item"><Trash2 size={16} /></button> : <span className="doc-hidden-spacer" aria-hidden="true" />}
            </div>
          )
        ))}
      </div>
    </section>
  );
}

function TasksDashboard({ taskRows, personalTasks, allClients, advisers, dashboardAdviserFilter, savePersonalTask, deletePersonalTask, saving, setTab, setSelectedClientId, openClientRecord }) {
  const [sortMode, setSortMode] = useState('priority');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');

  const scopeLabel = dashboardAdviserFilter === 'all' ? 'All advisers' : advisers.find((adviser) => adviser.id === dashboardAdviserFilter)?.name || 'Selected adviser';
  const types = useMemo(() => Array.from(new Set(taskRows.map((row) => row.type))).sort(), [taskRows]);

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
    if (!row.client) return;
    if (openClientRecord) return openClientRecord(row.client.id);
    setSelectedClientId(row.client.id);
    setTab('clients');
  }

  return (
    <div className="stack">
      <section className="panel dashboard-heading">
        <div>
          <h2>Task list</h2>
          <p className="muted">Deadlines, expiry dates, next-action dates, calendar appointments, billing tasks and personal adviser tasks for the current view: {scopeLabel}.</p>
        </div>
        <span>{visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'} shown</span>
      </section>

      <div className="metric-grid four">
        <MetricCard label="Total tasks" value={counts.total} note="All dated active tasks in this view" icon={ListChecks} />
        <MetricCard label="Overdue" value={counts.overdue} note="Past due dates" icon={AlertTriangle} warning />
        <MetricCard label="Due today" value={counts.today} note="Needs action now" icon={Clock} />
        <MetricCard label="Calendar items" value={counts.calendar} note="Open linked appointments" icon={CalendarDays} />
      </div>

      <PersonalTasksPanel personalTasks={personalTasks} allClients={allClients} advisers={advisers} dashboardAdviserFilter={dashboardAdviserFilter} savePersonalTask={savePersonalTask} deletePersonalTask={deletePersonalTask} saving={saving} />

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
            return (
              <div className={`task-line ${taskStatusKey(row)}`} key={row.id}>
                <span><DeadlineBadge diff={row.diff} /></span>
                <span><strong>{taskDisplayName(row)}</strong><small>{taskContextLabel(row)}</small><small>{row.client?.caseStrategy ? 'Strategy added' : row.source === 'personal-task' ? 'Personal adviser task' : 'No case strategy yet'}</small></span>
                <span><strong>{row.type}</strong><small>{row.date}</small></span>
                <span>{taskAdviserName(row, advisers)}</span>
                <span>{row.note || '—'}</span>
                <button className="btn ghost" disabled={!row.client} onClick={() => openTask(row)}>{row.client ? 'Open' : 'Personal'}</button>
              </div>
            );
          })}
          {!visibleTasks.length && <p className="muted center">No tasks match the selected filters.</p>}
        </div>
      </section>
    </div>
  );
}

function PersonalTasksPanel({ personalTasks, allClients, advisers, dashboardAdviserFilter, savePersonalTask, deletePersonalTask, saving }) {
  const defaultAdviserId = dashboardAdviserFilter !== 'all' ? dashboardAdviserFilter : advisers[0]?.id || '';
  const [draft, setDraft] = useState(() => makeBlankPersonalTask(defaultAdviserId));
  const [showCompleted, setShowCompleted] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    setDraft((current) => current.adviserId ? current : makeBlankPersonalTask(defaultAdviserId));
  }, [defaultAdviserId]);

  const visiblePersonalTasks = useMemo(() => personalTasks
    .filter((task) => showCompleted || task.status !== 'Completed')
    .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')),
    [personalTasks, showCompleted]);

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
      <div className="sub-panel-head">
        <div>
          <h2>Personal adviser tasks</h2>
          <p className="muted">Create adviser-specific tasks. Link them to a client where useful, or leave them unlinked for general internal work.</p>
        </div>
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
    </section>
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
  useEffect(() => setDrafts(advisers), [advisers]);

  function updateAdviser(id, patch) {
    setDrafts((current) => current.map((adviser) => adviser.id === id ? { ...adviser, ...patch } : adviser));
  }

  return (
    <section className="panel">
      <h2>Adviser profiles</h2>
      <p className="muted">Add or edit adviser details used for allocation and reporting.</p>
      <div className="adviser-edit-grid">
        {drafts.map((adviser) => {
          const primary = clients.filter((client) => client.primaryAdviserId === adviser.id && client.clientStatus !== 'Closed').length;
          const backup = clients.filter((client) => client.backupAdviserId === adviser.id && client.clientStatus !== 'Closed').length;
          return (
            <div className="adviser-edit-card" key={adviser.id}>
              <div className="form-grid two">
                <Field label="Name" value={adviser.name} onChange={(v) => updateAdviser(adviser.id, { name: v })} />
                <Field label="Role" value={adviser.role} onChange={(v) => updateAdviser(adviser.id, { role: v })} />
                <Field label="Email" value={adviser.email} onChange={(v) => updateAdviser(adviser.id, { email: v })} />
                <Field label="Login Email" value={adviser.loginEmail} onChange={(v) => updateAdviser(adviser.id, { loginEmail: v })} />
                <Field label="Phone" value={adviser.phone} onChange={(v) => updateAdviser(adviser.id, { phone: v })} />
                <Field label="LIA licence" value={adviser.licence} onChange={(v) => updateAdviser(adviser.id, { licence: v })} />
                <SelectField label="Status" value={adviser.active ? 'Active' : 'Inactive'} onChange={(v) => updateAdviser(adviser.id, { active: v === 'Active' })} options={['Active', 'Inactive']} />
              </div>
              <div className="split bottom"><span><b>{primary}</b> Primary matters · <b>{backup}</b> Backup matters</span><button className="btn dark" onClick={() => saveAdviser(adviser)} disabled={saving}><Save size={16} />Save</button></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({ label, value, note, icon: Icon, warning }) {
  return <div className={`metric-card ${warning ? 'warning' : ''}`}><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><Icon size={22} /></div>;
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
      <div className="next-action-log-strip">
        <button className="btn" type="button" onClick={onOpenActionLog}><Clock size={16} />Next action log <span className="button-count">{normaliseNextActionLog(draft.nextActionLog).length}</span></button>
        <button className="btn" type="button" onClick={onOpenTimeline}><CalendarDays size={16} />Timeline <span className="button-count">{linkedCalendarCount}</span></button>
        <button className="btn" type="button" onClick={onPrintProfile}><FileText size={16} />Print profile</button>
        <span>Previous next actions are logged when the next action or date is changed and the client record is saved.</span>
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


function printClientProfile(client = {}, calendarEntries = [], advisers = []) {
  const printWindow = window.open('', '_blank', 'width=980,height=900,noopener,noreferrer');
  if (!printWindow) return false;
  const html = buildClientProfilePrintHtml(client, calendarEntries, advisers);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 350);
  return true;
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
  if (!stages.length) return '<p class="muted">No matter stages are applied to this client.</p>';
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
    if (first) {
      setSelectedId(first.id);
      setDraft(normaliseLibraryEntry(first));
    } else {
      setSelectedId('');
      setDraft(makeBlankLibraryEntry(activeType));
    }
  }, [selectedId, activeType, entries, visibleEntries]);

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveMessage('');
  }

  function startNewEntry(type = activeType) {
    setSelectedId('');
    setActiveType(type);
    setDraft(makeBlankLibraryEntry(type));
    setSaveMessage('');
    setCopyMessage('');
  }

  async function saveDraft(event) {
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
  }

  async function removeDraft() {
    if (!isPersistedId(draft.id)) return startNewEntry(activeType);
    await deleteLibraryEntry(draft.id);
    setSelectedId('');
    setDraft(makeBlankLibraryEntry(activeType));
    setSaveMessage('Library item deleted.');
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
      <div className="section-title-row">
        <div>
          <p className="eyebrow">INZ knowledge library</p>
          <h1>Policy and forms reference</h1>
          <p className="muted">Controlled internal reference records with official INZ links, THiS notes and review dates. Use this as a shortcut to source material, not as a substitute for checking current instructions.</p>
        </div>
        <div className="button-row">
          <button className="btn" type="button" onClick={() => startNewEntry('Policy')}><BookOpen size={16} />Policy item</button>
          <button className="btn dark" type="button" onClick={() => startNewEntry('Form')}><FileText size={16} />Form item</button>
        </div>
      </div>

      <div className="library-tabs">
        {LIBRARY_ENTRY_TYPES.map((type) => (
          <button key={type} type="button" className={activeType === type ? 'active' : ''} onClick={() => { setActiveType(type); setSelectedId(''); }}>
            {type === 'Policy' ? <BookOpen size={16} /> : <FileText size={16} />}{type}
          </button>
        ))}
      </div>

      <div className="metric-grid compact library-metrics">
        <div className="metric-card"><span>{activeType} items</span><strong>{stats.total}</strong><small>Controlled records</small></div>
        <div className="metric-card"><span>Review due</span><strong>{stats.reviewDue}</strong><small>Due or overdue</small></div>
        <div className="metric-card"><span>Watch</span><strong>{stats.watch}</strong><small>Change-sensitive items</small></div>
        <div className="metric-card"><span>Archived/superseded</span><strong>{stats.archived}</strong><small>Kept for history</small></div>
      </div>

      <div className="library-layout">
        <aside className="library-list-panel">
          <div className="filters library-filters">
            <label><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Policy code, form number, title or note" /></label>
            <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{LIBRARY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{LIBRARY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          </div>
          <div className="library-list">
            {visibleEntries.map((entry) => (
              <button key={entry.id} type="button" className={`library-list-item ${selectedId === entry.id ? 'active' : ''}`} onClick={() => setSelectedId(entry.id)}>
                <span className={`library-status ${statusClass(entry.status)}`}>{entry.status}</span>
                <strong>{entry.referenceCode ? `${entry.referenceCode} - ${entry.title}` : entry.title}</strong>
                <small>{entry.category || 'General'}{entry.nextReviewDue ? ` · Review ${formatShortDate(entry.nextReviewDue)}` : ''}</small>
                {isLibraryReviewDue(entry) && <em>Review due</em>}
              </button>
            ))}
            {!visibleEntries.length && <p className="muted center">No {activeType.toLowerCase()} items match the current filters.</p>}
          </div>
        </aside>

        <form className="library-editor" onSubmit={saveDraft}>
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
              <button className="btn dark" type="submit" disabled={saving}><Save size={16} />{saving ? 'Saving...' : 'Save library item'}</button>
            </div>
          </div>
        </form>
      </div>
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

function SelectField({ label, value, onChange, options, placeholder = 'Select...' }) {
  const normalised = options.map((option) => typeof option === 'string' ? { label: option, value: option } : option);
  return <label className="field"><span>{label}</span><select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{normalised.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, rows = 4 }) {
  return <label className="field"><span>{label}</span><textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ProgressBar({ value }) {
  return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function DeadlineBadge({ diff }) {
  if (diff === null) return null;
  const className = diff < 0 ? 'badge overdue' : diff <= 7 ? 'badge soon' : 'badge';
  return <b className={className}>{diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Today' : `${diff}d`}</b>;
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

function normaliseData(body) {
  return {
    advisers: (body.advisers || []).map((adviser) => ({ ...adviser, loginEmail: adviser.loginEmail || adviser.login_email || '' })),
    clients: (body.clients || []).map((client) => ({ ...client, sharepointFolderUrl: client.sharepointFolderUrl || '', oneLawClientNumber: client.oneLawClientNumber || client.one_law_client_number || '', dateOfBirth: client.dateOfBirth || '', nextActionLog: normaliseNextActionLog(client.nextActionLog), familyMembers: Array.isArray(client.familyMembers) ? client.familyMembers.map((member) => ({ ...member, nationality: member.nationality || '' })) : [], documentChecklist: normaliseDocumentChecklist(client.documentChecklist), billing: normaliseBillingItems(client.billing || []), stages: normaliseStages(client.stages, body.stageTemplates || DEFAULT_STAGE_TEMPLATES) })),
    caseTypes: body.caseTypes || DEFAULT_CASE_TYPES,
    deadlineTypes: body.deadlineTypes || DEFAULT_DEADLINE_TYPES,
    stageTemplates: body.stageTemplates || DEFAULT_STAGE_TEMPLATES,
    personalTasks: (body.personalTasks || []).map(normalisePersonalTask),
    calendarEntries: (body.calendarEntries || []).map(normaliseCalendarEntry),
    libraryEntries: (body.libraryEntries || []).map(normaliseLibraryEntry),
    securityMode: body.securityMode || 'unknown',
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
        detail: stage.custom ? 'Custom matter stage' : (stage.mandatory ? 'Mandatory stage' : 'Optional stage'),
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
      type: `Document Expiry: ${item.name}`,
      date: item.expiryDate,
      note: item.obtained ? 'Document obtained; check expiry before use.' : 'Document not yet marked as obtained.',
      source: 'document-expiry',
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
        type: deadline.type,
        date: deadline.date,
        note: deadline.note || '',
        source: 'deadline',
        diff: dateDiff(deadline.date),
      })),
      ...documentExpiryRowsForClient(client),
      client.nextActionDue ? {
        id: `${client.id}-next-action`,
        client,
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
