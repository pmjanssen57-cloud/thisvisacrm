import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { getUser } from '@netlify/identity';

const STAGE_TEMPLATES = [
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
const CASE_TYPES = [
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

const DEADLINE_TYPES = [
  'Visa Expiry Date',
  'Medical Expiry Date',
  'Police Clearance Expiry Date',
  'PPI Response Date',
  'Filing Deadline Date',
];

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
const INTAKE_STATUSES = ['New', 'Contacted', 'Converted', 'Spam / Duplicate'];
const SEMINAR_STATUSES = ['Active', 'Closed'];
const SEMINAR_REGISTRATION_STATUSES = ['New', 'Approved', 'Declined', 'Spam / Duplicate'];
const PORTAL_RESOURCE_KEYS = ['jobSearchCv', 'lifeInNz', 'usefulLinks', 'relocationResources'];
const PORTAL_DOCUMENT_STORE = 'client-portal-documents';
const INTAKE_UPLOAD_STORE = 'intake-uploads';

const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'contact_intake_invite',
    name: 'Contact form - assessment invite',
    description: 'Sent from a contact-form card when a good enquiry should complete the full assessment form.',
    subject: 'Next step: please complete our full immigration assessment form',
    bodyText: `Hi {{firstName}},

Thank you for contacting Turner Hopkins Immigration Specialists.

Based on the information you have sent through, the best next step is for you to complete our full immigration assessment form. This gives us the details we need to properly consider your circumstances and identify the most suitable visa pathway.

You can complete the assessment form here: {{assessmentFormUrl}}

Once we receive your completed form, one of our team will review the information and come back to you about the next steps.

Please include as much detail as you can, especially around your current visa situation, immigration goal, employment, qualifications, partnership/family circumstances, and any health or character matters that may be relevant.

Kind regards,`,
    placeholders: ['firstName', 'assessmentFormUrl'],
  },
  {
    key: 'intake_approve',
    name: 'Assessment form - next steps',
    description: 'Sent when a full assessment/intake form appears suitable for a consultation or further advice.',
    subject: 'Turner Hopkins assessment questionnaire - next steps for {{applicantName}}',
    bodyText: `Dear {{firstName}},

Thank you for completing our online assessment questionnaire, which we have now received and reviewed, along with your CV and attachments.

It does appear, based on the information you have provided, that there is potentially a pathway available to you under one of our skilled migrant pathways, however this would be dependent on several things including the following:

• A review of your information to explore the various details including your skills and experience and the need for those to be assessed here in NZ, your employability and potential earnings as well as your personal data and health and character details.
• Establishing the timelines involved and how each step fits together - this includes discussing, the documentation required, the criteria you need to meet and a road map as to how all of these steps will fit together.
• Discussing the process to secure an offer of skilled employment in New Zealand to qualify under one of our various skilled migration pathways (most application pathways are dependent on being able to secure the right kind of employment in New Zealand).

For us to be able to outline this process in detail, including the steps mentioned above, as well as being able to establish the right strategy for you, we would need to book you in for a one-to-one consultation.

This consultation process will allow us to work through your information in greater detail, ask some additional questions and then outline a clear pathway for you and your family (if applicable) to make the move. It also gives you an opportunity to ask questions of me and for us to explore the process together, so you can make an informed decision as to whether to proceed further.

We have two options available for the consultation process:

• A brief 15-minute overview (at no charge) of the process via Teams or Zoom, which will give you a very basic summary as to your eligibility. We stick to a very strict 15-minute timeframe for these discussions.
• A more detailed assessment over Teams or Zoom, usually lasting for at least an hour, during which we map out the process for you and explain the various steps, costs and timelines. This assessment comes with a charge of NZD$400.00, which can be paid online.

Moving to another country is a complex process, particularly in the current environment as the demand for Visas and opportunities in New Zealand continues to increase. If you are seriously considering the move, then having a well laid out plan is vital.

If you wish to move ahead with this assessment, please email us directly: {{allocatedTo}} (do not reply to this email) and indicate which assessment option you would prefer to take.

I look forward to hearing from you in due course.`,
    placeholders: ['firstName', 'applicantName', 'allocatedTo'],
  },
  {
    key: 'intake_decline',
    name: 'Assessment form - not suitable',
    description: 'Sent when a full assessment/intake form is not suitable for next steps.',
    subject: 'Turner Hopkins assessment questionnaire - {{applicantName}}',
    bodyText: `Hello {{firstName}},

Thank you for completing the Turner Hopkins assessment questionnaire.

We have reviewed the information you provided. Based on the details supplied, it does not look like we are the right fit to assist with an immigration pathway at this stage.

This is a preliminary response based on the questionnaire only, not a full immigration assessment. If your circumstances change, or if there is important information you think has not been captured, you are welcome to reply with those details and we can reconsider whether a consultation would be useful.`,
    placeholders: ['firstName', 'applicantName'],
  },
  {
    key: 'seminar_approve',
    name: 'Seminar registration - approved',
    description: 'Sent when a seminar registration is approved from the CRM.',
    subject: 'Your Turner Hopkins seminar invitation',
    bodyText: `Hi {{firstName}},

Thank you for registering for our upcoming Turner Hopkins immigration seminar.

We are pleased to confirm that your registration has been approved. The seminar details are below:

Seminar: {{seminarTitle}}
Presenter: {{presenterName}}
New Zealand time: {{nzTime}}
Your local time: {{localTime}}

Zoom link: {{zoomLink}}
Zoom password: {{zoomPassword}}

Please keep these details handy and join a few minutes before the seminar is due to start.

Kind regards,`,
    placeholders: ['firstName', 'seminarTitle', 'presenterName', 'nzTime', 'localTime', 'zoomLink', 'zoomPassword'],
  },
  {
    key: 'seminar_decline',
    name: 'Seminar registration - declined',
    description: 'Sent when a seminar registration is declined from the CRM.',
    subject: 'Turner Hopkins seminar registration',
    bodyText: `Hi {{firstName}},

Thank you for registering your interest in our upcoming seminar.

After reviewing the information provided, we are not able to offer you a place in this session.

We appreciate your interest and wish you all the best.

Kind regards,`,
    placeholders: ['firstName'],
  },
  {
    key: 'seminar_new_registration',
    name: 'Seminar registration - internal notification',
    description: 'Internal notification sent when someone submits the public seminar registration form.',
    subject: 'New seminar registration: {{registrantFullName}}',
    bodyText: `A new seminar registration has been submitted.

Seminar: {{seminarTitle}}
Seminar date/time: {{seminarDateTime}}
Presenter: {{presenterName}}

Full name: {{registrantFullName}}
Email: {{registrantEmail}}
Date of birth: {{dateOfBirth}}
Citizenship: {{citizenshipCountry}}
Current country: {{residenceCountry}}
Timezone: {{registrantTimezone}}
Partnership status: {{partnershipStatus}}
Highest qualification: {{highestQualification}}
Current occupation: {{currentOccupation}}
English ability: {{englishAbility}}

Relevant work history:
{{workHistory}}

Health / character issues:
{{healthCharacterIssues}}

Submitted: {{submitted}}
Registration ID: {{registrationId}}

Please review this in THiS CRM > Enquiries & Intake > Seminar Registrations.`,
    placeholders: ['registrantFullName', 'registrantEmail', 'seminarTitle', 'seminarDateTime', 'presenterName', 'dateOfBirth', 'citizenshipCountry', 'residenceCountry', 'registrantTimezone', 'partnershipStatus', 'highestQualification', 'currentOccupation', 'englishAbility', 'workHistory', 'healthCharacterIssues', 'submitted', 'registrationId'],
  },
  {
    key: 'assessment_form_internal_notification',
    name: 'Assessment form - internal notification',
    description: 'Internal notification sent when a full assessment form is submitted through the public assessment page.',
    subject: 'New assessment form submitted - {{applicantName}}',
    bodyText: `A new assessment questionnaire has been submitted through the THiS intake form.

Applicant: {{applicantName}}
Email: {{email}}
Phone: {{phone}}
Submitted: {{submitted}}
Flags: {{flags}}
Record ID: {{intakeId}}

Summary:
{{summary}}

Please review this in THiS CRM > Enquiries & Intake > Intake Forms.`,
    placeholders: ['applicantName', 'email', 'phone', 'submitted', 'flags', 'intakeId', 'summary'],
  },
  {
    key: 'contact_form_internal_notification',
    name: 'Contact form - internal notification',
    description: 'Internal notification sent when a short contact form is submitted from the website.',
    subject: 'New contact form submitted - {{applicantName}}',
    bodyText: `A new short contact form enquiry has been submitted through the THiS website.

Applicant: {{applicantName}}
Email: {{email}}
Phone: {{phone}}
Submitted: {{submitted}}
Flags: {{flags}}
Record ID: {{intakeId}}

Summary:
{{summary}}

Please review this in THiS CRM > Enquiries & Intake > Contact Forms.`,
    placeholders: ['applicantName', 'email', 'phone', 'submitted', 'flags', 'intakeId', 'summary'],
  },
  {
    key: 'portal_access',
    name: 'Client portal access',
    description: 'Sent when a client portal access code is created or refreshed.',
    subject: 'Your Turner Hopkins client portal access',
    bodyText: `Dear {{firstName}},

We have set up your Turner Hopkins client portal so you can view the latest information we have published about your application progress.

Portal link: {{portalLink}}
Login email / username: {{portalEmail}}
Access code: {{accessCode}}

The portal is a secure, read-only space where you can check application updates, view documents we have made available to you, and send notes or questions to your adviser.

We will continue to contact you by email as usual when we need anything further.`,
    placeholders: ['firstName', 'portalLink', 'portalEmail', 'accessCode'],
  },
];


export default async function crmRequestHandler(request, context = {}) {
  const method = String(request.method || 'GET').toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? '' : await request.text();
  const response = await handleCrmEvent({
    httpMethod: method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    context,
    rawUrl: request.url,
  });
  return new Response(response.body || '', {
    status: response.statusCode || 200,
    headers: response.headers || {},
  });
}

async function handleCrmEvent(event) {
  try {
    const method = event.httpMethod || 'GET';
    if (method === 'OPTIONS') return empty(204);

    const auth = await checkAuth(event);
    if (!auth.ok) return json({ error: 'Unauthorised. Enter the internal CRM access code.' }, 401);

    await ensureSchema();

    if (method === 'GET') {
      const data = await readCrmData();
      return json({ ...data, securityMode: auth.mode, authUser: serialiseIdentityUser(auth.user) });
    }

    if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;

    if (action === 'seed') {
      await seedSampleData();
      return json(await readCrmData());
    }

    if (action === 'saveAdviser') {
      const adviser = await saveAdviser(body.adviser);
      return json({ adviser, ...(await readCrmData()) });
    }

    if (action === 'savePersonalTask') {
      const personalTask = await savePersonalTask(body.task);
      return json({ personalTask, ...(await readCrmData()) });
    }

    if (action === 'deletePersonalTask') {
      await deletePersonalTask(body.taskId);
      return json(await readCrmData());
    }

    if (action === 'saveCalendarEntry') {
      const calendarEntry = await saveCalendarEntry(body.entry);
      return json({ calendarEntry, ...(await readCrmData()) });
    }

    if (action === 'deleteCalendarEntry') {
      await deleteCalendarEntry(body.entryId);
      return json(await readCrmData());
    }

    if (action === 'saveLibraryEntry') {
      const libraryEntry = await saveLibraryEntry(body.entry);
      return json({ libraryEntry, ...(await readCrmData()) });
    }

    if (action === 'deleteLibraryEntry') {
      await deleteLibraryEntry(body.entryId);
      return json(await readCrmData());
    }

    if (action === 'saveIntakeEnquiry') {
      const intakeEnquiry = await saveIntakeEnquiry(body.intake);
      return json({ intakeEnquiry, ...(await readCrmData()) });
    }

    if (action === 'deleteIntakeEnquiry') {
      await deleteIntakeEnquiry(body.intakeId);
      return json(await readCrmData());
    }

    if (action === 'convertIntakeToClient') {
      const result = await convertIntakeToClient(body.intakeId);
      return json({ ...result, ...(await readCrmData()) });
    }

    if (action === 'saveClient') {
      const client = await saveClient(body.client, auth.user);
      return json({ client: await readSingleClient(client.id), emailLog: client.portalAccessEmailLog || null });
    }

    if (action === 'updatePortalMessageStatus') {
      await updatePortalMessageStatus(body.clientId, body.messageId, body.status);
      return json(await readCrmData());
    }

    if (action === 'uploadPortalDocument') {
      await uploadPortalDocument(body.clientId, body.document || {}, auth.user);
      return json({ client: await readSingleClient(body.clientId) });
    }

    if (action === 'updatePortalDocument') {
      await updatePortalDocument(body.clientId, body.document || {});
      return json({ client: await readSingleClient(body.clientId) });
    }

    if (action === 'deletePortalDocument') {
      await deletePortalDocument(body.clientId, body.documentId);
      return json({ client: await readSingleClient(body.clientId) });
    }

    if (action === 'deleteClient') {
      await deleteClient(body.clientId);
      return json(await readCrmData());
    }

    if (action === 'sendTestEmail') {
      const emailLog = await sendTestEmail(body.email || {}, auth.user);
      return json({ emailLog, ...(await readCrmData()) });
    }

    if (action === 'saveEmailTemplate') {
      const emailTemplate = await saveEmailTemplate(body.template || {}, auth.user);
      return json({ emailTemplate, ...(await readCrmData()) });
    }

    if (action === 'resetEmailTemplate') {
      const emailTemplate = await resetEmailTemplate(body.templateKey || body.key || '', auth.user);
      return json({ emailTemplate, ...(await readCrmData()) });
    }

    if (action === 'sendIntakeOutcomeEmail') {
      const emailLog = await sendIntakeOutcomeEmail(body.intake || {}, body.outcome || 'approve', auth.user);
      return json({ emailLog, emailConfig: getEmailConfigStatus() });
    }

    if (action === 'sendContactIntakeInviteEmail') {
      const emailLog = await sendContactIntakeInviteEmail(body.contact || {}, auth.user);
      return json({ emailLog, emailConfig: getEmailConfigStatus() });
    }

    if (action === 'saveSeminar') {
      const seminar = await saveSeminar(body.seminar || {});
      return json({ seminar, ...(await readCrmData()) });
    }

    if (action === 'deleteSeminar') {
      await deleteSeminar(body.seminarId);
      return json(await readCrmData());
    }

    if (action === 'saveSeminarRegistration') {
      const registration = await saveSeminarRegistration(body.registration || {}, auth.user);
      return json({ seminarRegistration: registration, ...(await readCrmData()) });
    }

    if (action === 'sendSeminarRegistrationEmail') {
      const emailLog = await sendSeminarRegistrationEmail(body.registrationId, body.outcome || 'approve', auth.user);
      const data = await readCrmData();
      return json({ emailLog, seminarRegistrations: data.seminarRegistrations, emailConfig: getEmailConfigStatus() });
    }

    if (action === 'downloadIntakeUpload') {
      const upload = await downloadIntakeUpload(body.intakeId, body.kind);
      return json({ upload });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: 'CRM function error', detail: String(error?.message || error) }, 500);
  }
}

async function checkAuth(event) {
  const expected = process.env.CRM_ACCESS_TOKEN;
  const headers = event.headers || {};
  const provided = headers['x-crm-token'] || headers['X-CRM-Token'] || extractBearer(headers.authorization || headers.Authorization);

  if (expected && provided === expected) return { ok: true, mode: 'token-fallback' };

  const contextUser = event.context?.clientContext?.user || event.context?.user || null;
  if (contextUser?.email) return { ok: true, mode: 'identity-context', user: contextUser };

  try {
    const user = await getUser();
    if (user?.email) return { ok: true, mode: 'identity', user };
  } catch (error) {
    console.warn('Identity check failed', error?.message || error);
  }

  if (!expected) return { ok: true, mode: 'open-prototype' };
  return { ok: false, mode: 'none' };
}

function serialiseIdentityUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    name: user.name || '',
    role: user.role || '',
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

function extractBearer(value) {
  if (!value) return '';
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : value;
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) {
    return getDatabase({ connectionString });
  }
  return getDatabase();
}


async function ensureSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS advisers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      login_email TEXT,
      profile_photo_url TEXT,
      availability_status TEXT NOT NULL DEFAULT 'Available',
      phone TEXT,
      licence TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name TEXT,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      nationality TEXT,
      date_of_birth DATE,
      location TEXT,
      sharepoint_folder_url TEXT,
      one_law_client_number TEXT,
      matter_name TEXT,
      case_strategy TEXT,
      case_type TEXT NOT NULL,
      primary_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      backup_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      priority TEXT NOT NULL DEFAULT 'Normal',
      client_status TEXT NOT NULL DEFAULT 'Active',
      next_action TEXT,
      next_action_due DATE,
      next_action_log JSONB NOT NULL DEFAULT '[]'::jsonb,
      portal_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      portal_email TEXT,
      portal_status_update TEXT,
      portal_next_step TEXT,
      portal_visible_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      portal_visible_deadline_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      portal_visible_appointment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      portal_visible_billing_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      portal_resource_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      portal_access_code_hash TEXT,
      portal_last_published_at TIMESTAMPTZ,
      portal_last_accessed_at TIMESTAMPTZ,
      notes TEXT,
      family_members JSONB NOT NULL DEFAULT '[]'::jsonb,
      document_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_stages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      stage_key TEXT NOT NULL,
      stage_label TEXT NOT NULL,
      mandatory BOOLEAN NOT NULL DEFAULT FALSE,
      applied BOOLEAN NOT NULL DEFAULT TRUE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_date DATE,
      sort_order INTEGER NOT NULL,
      UNIQUE (client_id, stage_key)
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_deadlines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      deadline_type TEXT NOT NULL,
      deadline_date DATE,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS billing_milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      milestone TEXT NOT NULL,
      due_date DATE,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'WIP',
      invoice_no TEXT,
      billing_trigger_type TEXT NOT NULL DEFAULT 'Date',
      billing_stage_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS personal_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'Open',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`
    CREATE TABLE IF NOT EXISTS calendar_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      appointment_type TEXT NOT NULL DEFAULT 'Client meeting',
      appointment_date DATE NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`ALTER TABLE advisers ADD COLUMN IF NOT EXISTS login_email TEXT`;
  await database.sql`ALTER TABLE advisers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT`;
  await database.sql`ALTER TABLE advisers ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'Available'`;
  await database.sql`UPDATE advisers SET availability_status = 'Available' WHERE availability_status IS NULL OR availability_status = ''`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS case_strategy TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS family_members JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS document_checklist JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS sharepoint_folder_url TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS one_law_client_number TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_action_log JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_email TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_status_update TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_next_step TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_deadline_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_appointment_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_visible_billing_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_resource_settings JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_code_hash TEXT`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_last_published_at TIMESTAMPTZ`;
  await database.sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_last_accessed_at TIMESTAMPTZ`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_portal_email ON clients (LOWER(portal_email))`;
  await database.sql`CREATE TABLE IF NOT EXISTS client_portal_access_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      portal_email TEXT,
      action TEXT NOT NULL DEFAULT 'login',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`ALTER TABLE calendar_entries ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'Client meeting'`;
  await database.sql`ALTER TABLE billing_milestones ADD COLUMN IF NOT EXISTS billing_trigger_type TEXT NOT NULL DEFAULT 'Date'`;
  await database.sql`ALTER TABLE billing_milestones ADD COLUMN IF NOT EXISTS billing_stage_key TEXT`;
  await database.sql`UPDATE billing_milestones SET status = 'WIP' WHERE status IN ('Draft', 'Scheduled')`;
  await database.sql`UPDATE billing_milestones SET status = 'Invoiced' WHERE status = 'Paid'`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_advisers_login_email ON advisers (LOWER(login_email))`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_case_type ON clients(case_type)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_one_law_client_number ON clients(one_law_client_number)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_clients_primary_adviser ON clients(primary_adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_client_deadlines_date ON client_deadlines(deadline_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_billing_milestones_due_date ON billing_milestones(due_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_personal_tasks_due_date ON personal_tasks(due_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_personal_tasks_adviser ON personal_tasks(adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_calendar_entries_date ON calendar_entries(appointment_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_calendar_entries_client ON calendar_entries(client_id)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS library_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_type TEXT NOT NULL DEFAULT 'Policy',
      reference_code TEXT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      status TEXT NOT NULL DEFAULT 'Current',
      official_url TEXT,
      version_label TEXT,
      acceptable_until DATE,
      related_case_types JSONB NOT NULL DEFAULT '[]'::jsonb,
      related_document_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      internal_summary TEXT,
      adviser_notes TEXT,
      last_reviewed DATE,
      next_review_due DATE,
      reviewed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_calendar_entries_adviser ON calendar_entries(adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_library_entries_type ON library_entries(entry_type)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_library_entries_status ON library_entries(status)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_library_entries_review_due ON library_entries(next_review_due)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_portal_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      portal_email TEXT,
      message_type TEXT NOT NULL DEFAULT 'client_note',
      title TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_client_portal_messages_client ON client_portal_messages(client_id, created_at DESC)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS client_portal_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'THiS instructions',
      description TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'application/pdf',
      file_size INTEGER NOT NULL DEFAULT 0,
      blob_key TEXT NOT NULL,
      visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
      uploaded_by TEXT,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`ALTER TABLE client_portal_documents ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT TRUE`;
  await database.sql`ALTER TABLE client_portal_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await database.sql`UPDATE client_portal_documents SET visible_to_client = TRUE WHERE visible_to_client IS NULL`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_client_portal_documents_client ON client_portal_documents(client_id, uploaded_at DESC)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS intake_enquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status TEXT NOT NULL DEFAULT 'New',
      assigned_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      applicant_first_name TEXT,
      applicant_last_name TEXT,
      email TEXT,
      phone TEXT,
      current_location TEXT,
      citizenship TEXT,
      date_of_birth DATE,
      current_visa_type TEXT,
      current_visa_expiry DATE,
      target_pathway TEXT,
      urgency TEXT,
      flags JSONB NOT NULL DEFAULT '{}'::jsonb,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      adviser_assessment_notes TEXT,
      recommended_pathway TEXT,
      consultation_outcome TEXT,
      converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`ALTER TABLE intake_enquiries ADD COLUMN IF NOT EXISTS assigned_adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL`;
  await database.sql`ALTER TABLE intake_enquiries ADD COLUMN IF NOT EXISTS converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_status ON intake_enquiries(status)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_created_at ON intake_enquiries(created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_assigned_adviser ON intake_enquiries(assigned_adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_email ON intake_enquiries(LOWER(email))`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS seminars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT,
      seminar_date DATE,
      seminar_time TEXT,
      timezone TEXT NOT NULL DEFAULT 'Pacific/Auckland',
      presenter_name TEXT,
      zoom_link TEXT,
      zoom_password TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      registration_open BOOLEAN NOT NULL DEFAULT TRUE,
      internal_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminars_status_date ON seminars(status, seminar_date DESC)`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS seminar_registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'New',
      full_name TEXT,
      date_of_birth DATE,
      citizenship_country TEXT,
      residence_country TEXT,
      timezone TEXT,
      email TEXT,
      partnership_status TEXT,
      highest_qualification TEXT,
      current_occupation TEXT,
      work_history TEXT,
      health_character_issues TEXT,
      english_ability TEXT,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      reviewed_by TEXT,
      approved_at TIMESTAMPTZ,
      declined_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_registrations_seminar ON seminar_registrations(seminar_id, created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_registrations_status ON seminar_registrations(status)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_seminar_registrations_email ON seminar_registrations(LOWER(email))`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS email_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      related_record_type TEXT NOT NULL DEFAULT 'test',
      related_record_id UUID,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      intake_id UUID REFERENCES intake_enquiries(id) ON DELETE SET NULL,
      template_key TEXT NOT NULL DEFAULT 'test',
      from_email TEXT,
      from_name TEXT,
      to_email TEXT NOT NULL,
      cc TEXT,
      bcc TEXT,
      subject TEXT NOT NULL,
      body_text TEXT,
      body_html TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      sent_by TEXT,
      sent_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      failure_message TEXT,
      provider TEXT NOT NULL DEFAULT 'microsoft_graph',
      provider_request_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status)`;
  await ensureEmailTemplateSchema(database);
}




async function readCrmData() {
  const database = db();
  await pruneOldEmailNotifications(database);
  const [advisers, clients, stages, deadlines, billing, personalTasks, calendarEntries, libraryEntries, portalMessages, portalDocuments, intakeEnquiries, seminars, seminarRegistrations, emailLogs, emailTemplates] = await Promise.all([
    database.sql`SELECT id, name, role, email, login_email, profile_photo_url, availability_status, phone, licence, active FROM advisers ORDER BY name ASC`,
    database.sql`SELECT id, first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, one_law_client_number, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, next_action_log, portal_enabled, portal_email, portal_status_update, portal_next_step, portal_visible_document_ids, portal_visible_deadline_ids, portal_visible_appointment_ids, portal_visible_billing_ids, portal_resource_settings, portal_access_code_hash, portal_last_published_at, portal_last_accessed_at, notes, family_members, document_checklist FROM clients ORDER BY updated_at DESC`,
    database.sql`SELECT id, client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order FROM client_stages ORDER BY sort_order ASC`,
    database.sql`SELECT id, client_id, deadline_type, deadline_date, note FROM client_deadlines ORDER BY deadline_date ASC NULLS LAST`,
    database.sql`SELECT id, client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key FROM billing_milestones ORDER BY due_date ASC NULLS LAST`,
    database.sql`SELECT id, adviser_id, client_id, title, due_date, status, note FROM personal_tasks ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    database.sql`SELECT id, client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status FROM calendar_entries ORDER BY appointment_date ASC, start_time ASC NULLS LAST, created_at DESC`,
    database.sql`SELECT id, entry_type, reference_code, title, category, status, official_url, version_label, acceptable_until, related_case_types, related_document_items, internal_summary, adviser_notes, last_reviewed, next_review_due, reviewed_by FROM library_entries ORDER BY entry_type ASC, title ASC`,
    database.sql`SELECT id, client_id, portal_email, message_type, title, message, status, created_at FROM client_portal_messages ORDER BY created_at DESC`,
    database.sql`SELECT id, client_id, title, category, description, file_name, file_type, file_size, blob_key, visible_to_client, uploaded_by, uploaded_at FROM client_portal_documents ORDER BY uploaded_at DESC`,
    database.sql`SELECT id, status, assigned_adviser_id, applicant_first_name, applicant_last_name, email, phone, current_location, citizenship, date_of_birth, current_visa_type, current_visa_expiry, target_pathway, urgency, flags, raw_payload, adviser_assessment_notes, recommended_pathway, consultation_outcome, converted_client_id, created_at, updated_at FROM intake_enquiries ORDER BY created_at DESC`,
    database.sql`SELECT id, title, seminar_date, seminar_time, timezone, presenter_name, zoom_link, zoom_password, status, registration_open, internal_notes, created_at, updated_at FROM seminars ORDER BY seminar_date DESC NULLS LAST, created_at DESC`,
    database.sql`SELECT id, seminar_id, status, full_name, date_of_birth, citizenship_country, residence_country, timezone, email, partnership_status, highest_qualification, current_occupation, work_history, health_character_issues, english_ability, raw_payload, reviewed_by, approved_at, declined_at, created_at, updated_at FROM seminar_registrations ORDER BY created_at DESC`,
    database.sql`SELECT id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at FROM email_notifications WHERE created_at >= NOW() - INTERVAL '60 days' ORDER BY created_at DESC LIMIT 200`,
    getEmailTemplates(database),
  ]);

  return {
    advisers: advisers.map(mapAdviserFromDb),
    clients: clients.map((client) => mapClientFromDb(client, stages, deadlines, billing, portalMessages, portalDocuments)),
    personalTasks: personalTasks.map(mapPersonalTaskFromDb),
    calendarEntries: calendarEntries.map(mapCalendarEntryFromDb),
    libraryEntries: libraryEntries.map(mapLibraryEntryFromDb),
    intakeEnquiries: intakeEnquiries.map(mapIntakeEnquiryFromDb),
    intakeStatuses: INTAKE_STATUSES,
    seminars: seminars.map(mapSeminarFromDb),
    seminarRegistrations: seminarRegistrations.map(mapSeminarRegistrationFromDb),
    emailLogs: emailLogs.map(mapEmailLogFromDb),
    emailTemplates: emailTemplates.map(mapEmailTemplateFromDb),
    emailConfig: getEmailConfigStatus(),
    caseTypes: CASE_TYPES,
    deadlineTypes: DEADLINE_TYPES,
    stageTemplates: STAGE_TEMPLATES,
  };
}

async function readSingleClient(clientId) {
  const database = db();
  const [clients, stages, deadlines, billing, portalMessages, portalDocuments] = await Promise.all([
    database.sql`SELECT id, first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, one_law_client_number, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, next_action_log, portal_enabled, portal_email, portal_status_update, portal_next_step, portal_visible_document_ids, portal_visible_deadline_ids, portal_visible_appointment_ids, portal_visible_billing_ids, portal_resource_settings, portal_access_code_hash, portal_last_published_at, portal_last_accessed_at, notes, family_members, document_checklist FROM clients WHERE id = ${clientId} LIMIT 1`,
    database.sql`SELECT id, client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order FROM client_stages WHERE client_id = ${clientId} ORDER BY sort_order ASC`,
    database.sql`SELECT id, client_id, deadline_type, deadline_date, note FROM client_deadlines WHERE client_id = ${clientId} ORDER BY deadline_date ASC NULLS LAST`,
    database.sql`SELECT id, client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key FROM billing_milestones WHERE client_id = ${clientId} ORDER BY due_date ASC NULLS LAST`,
    database.sql`SELECT id, client_id, portal_email, message_type, title, message, status, created_at FROM client_portal_messages WHERE client_id = ${clientId} ORDER BY created_at DESC`,
    database.sql`SELECT id, client_id, title, category, description, file_name, file_type, file_size, blob_key, visible_to_client, uploaded_by, uploaded_at FROM client_portal_documents WHERE client_id = ${clientId} ORDER BY uploaded_at DESC`,
  ]);
  if (!clients[0]) throw new Error('Saved client could not be reloaded.');
  return mapClientFromDb(clients[0], stages, deadlines, billing, portalMessages, portalDocuments);
}

function mapAdviserFromDb(row) {
  return {
    id: row.id,
    name: row.name || '',
    role: row.role || '',
    email: row.email || '',
    loginEmail: row.login_email || '',
    profilePhotoUrl: row.profile_photo_url || '',
    phone: row.phone || '',
    availability: row.availability_status || row.availability || 'Available',
    licence: row.licence || '',
    active: Boolean(row.active),
  };
}

function mapEmailLogFromDb(row) {
  return {
    id: row.id,
    templateKey: row.template_key || 'test',
    fromEmail: row.from_email || '',
    fromName: row.from_name || '',
    toEmail: row.to_email || '',
    cc: row.cc || '',
    bcc: row.bcc || '',
    subject: row.subject || '',
    bodyText: row.body_text || '',
    bodyHtml: row.body_html || '',
    status: row.status || '',
    sentBy: row.sent_by || '',
    sentAt: row.sent_at || '',
    failedAt: row.failed_at || '',
    failureMessage: row.failure_message || '',
    createdAt: row.created_at || '',
  };
}

function mapEmailTemplateFromDb(row = {}) {
  const fallback = getDefaultEmailTemplate(row.template_key || row.templateKey || '');
  const placeholders = Array.isArray(row.placeholders) ? row.placeholders : fallback?.placeholders || [];
  return {
    key: row.template_key || row.templateKey || fallback?.key || '',
    name: row.name || fallback?.name || emailTemplateTitle(row.template_key || row.templateKey || ''),
    description: row.description || fallback?.description || '',
    subject: row.subject || fallback?.subject || '',
    bodyText: row.body_text || row.bodyText || fallback?.bodyText || '',
    bodyHtml: row.body_html || row.bodyHtml || fallback?.bodyHtml || '',
    placeholders,
    updatedAt: row.updated_at || row.updatedAt || '',
    updatedBy: row.updated_by || row.updatedBy || '',
  };
}

function getDefaultEmailTemplate(key = '') {
  return DEFAULT_EMAIL_TEMPLATES.find((template) => template.key === key) || null;
}

function emailTemplateTitle(key = '') {
  return String(key || 'Email template').replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase());
}

async function ensureEmailTemplateSchema(database = db()) {
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS email_templates (
      template_key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      body_html TEXT,
      placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT
    )`;
  await database.sql`ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_html TEXT`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name)`;
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    await database.sql`
      INSERT INTO email_templates (template_key, name, description, subject, body_text, body_html, placeholders, updated_by)
      VALUES (${template.key}, ${template.name}, ${template.description}, ${template.subject}, ${template.bodyText}, ${template.bodyHtml || null}, CAST(${JSON.stringify(template.placeholders || [])} AS jsonb), 'System default')
      ON CONFLICT (template_key) DO NOTHING`;
  }
}

async function getEmailTemplates(database = db()) {
  await ensureEmailTemplateSchema(database);
  const rows = await database.sql`SELECT template_key, name, description, subject, body_text, body_html, placeholders, updated_at, updated_by FROM email_templates ORDER BY name ASC`;
  const existing = new Map(rows.map((row) => [row.template_key, mapEmailTemplateFromDb(row)]));
  return DEFAULT_EMAIL_TEMPLATES.map((template) => existing.get(template.key) || mapEmailTemplateFromDb({ template_key: template.key }));
}

async function getEmailTemplate(templateKey = '', database = db()) {
  await ensureEmailTemplateSchema(database);
  const key = String(templateKey || '').trim();
  const rows = await database.sql`SELECT template_key, name, description, subject, body_text, body_html, placeholders, updated_at, updated_by FROM email_templates WHERE template_key = ${key} LIMIT 1`;
  return mapEmailTemplateFromDb(rows[0] || { template_key: key });
}

async function saveEmailTemplate(input = {}, authUser = null) {
  const database = db();
  await ensureEmailTemplateSchema(database);
  const key = String(input.key || input.templateKey || '').trim();
  const fallback = getDefaultEmailTemplate(key);
  if (!fallback) throw new Error('Unknown email template.');
  const subject = cleanTextForTemplate(input.subject || fallback.subject, 500);
  const bodyText = cleanTextForTemplate(input.bodyText || input.body_text || fallback.bodyText, 30000);
  const bodyHtml = cleanHtmlForTemplate(input.bodyHtml || input.body_html || '', 60000);
  const updatedBy = authUser?.email || authUser?.name || 'CRM adviser';
  const [saved] = await database.sql`
    INSERT INTO email_templates (template_key, name, description, subject, body_text, body_html, placeholders, updated_by, updated_at)
    VALUES (${fallback.key}, ${fallback.name}, ${fallback.description}, ${subject}, ${bodyText}, ${bodyHtml}, CAST(${JSON.stringify(fallback.placeholders || [])} AS jsonb), ${updatedBy}, NOW())
    ON CONFLICT (template_key) DO UPDATE SET subject = EXCLUDED.subject, body_text = EXCLUDED.body_text, body_html = EXCLUDED.body_html, updated_by = EXCLUDED.updated_by, updated_at = NOW()
    RETURNING template_key, name, description, subject, body_text, body_html, placeholders, updated_at, updated_by`;
  return mapEmailTemplateFromDb(saved);
}

async function resetEmailTemplate(templateKey = '', authUser = null) {
  const database = db();
  await ensureEmailTemplateSchema(database);
  const fallback = getDefaultEmailTemplate(String(templateKey || '').trim());
  if (!fallback) throw new Error('Unknown email template.');
  const updatedBy = authUser?.email || authUser?.name || 'CRM adviser';
  const [saved] = await database.sql`
    INSERT INTO email_templates (template_key, name, description, subject, body_text, body_html, placeholders, updated_by, updated_at)
    VALUES (${fallback.key}, ${fallback.name}, ${fallback.description}, ${fallback.subject}, ${fallback.bodyText}, ${fallback.bodyHtml || null}, CAST(${JSON.stringify(fallback.placeholders || [])} AS jsonb), ${updatedBy}, NOW())
    ON CONFLICT (template_key) DO UPDATE SET subject = EXCLUDED.subject, body_text = EXCLUDED.body_text, body_html = EXCLUDED.body_html, updated_by = EXCLUDED.updated_by, updated_at = NOW()
    RETURNING template_key, name, description, subject, body_text, body_html, placeholders, updated_at, updated_by`;
  return mapEmailTemplateFromDb(saved);
}

function cleanTextForTemplate(value = '', limit = 30000) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').slice(0, limit);
}

function renderTemplateText(value = '', context = {}) {
  return String(value || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    const replacement = resolveTemplateValue(context, key);
    return replacement == null || replacement === '' ? '' : String(replacement);
  });
}

function resolveTemplateValue(context = {}, path = '') {
  return String(path || '').split('.').reduce((current, key) => (current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : ''), context);
}

async function buildEmailFromTemplate(templateKey, context = {}, fallback = {}) {
  const template = await getEmailTemplate(templateKey);
  const subject = renderTemplateText(template.subject || fallback.subject || '', context).trim() || fallback.subject || '';
  const rawHtml = template.bodyHtml || fallback.bodyHtml || '';
  const renderedHtml = cleanHtmlForTemplate(renderTemplateText(rawHtml, context), 60000);
  const bodyText = renderTemplateText(template.bodyText || fallback.bodyText || stripHtmlToText(renderedHtml), context).trim() || stripHtmlToText(renderedHtml);
  return {
    subject,
    bodyText,
    bodyHtml: renderedHtml ? editableTemplateBodyHtml(renderedHtml) : editableTemplateEmailHtml(bodyText || fallback.bodyText || ''),
  };
}

function editableTemplateBodyHtml(bodyHtml = '') {
  return `<div style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #1f2933;">${cleanHtmlForTemplate(bodyHtml, 60000)}${buildEmailSignatureSpacer(18)}</div>`;
}

function editableTemplateEmailHtml(bodyText = '') {
  return `<div style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #1f2933;">${String(bodyText || '')
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p style="margin:0 0 10px 0; padding:0; line-height:1.3; mso-margin-top-alt:0; mso-margin-bottom-alt:10px;">${linkifyHtml(escapeHtml(paragraph).replace(/\n/g, '<br>'))}</p>`)
    .join('')}${buildEmailSignatureSpacer(18)}</div>`;
}

function cleanHtmlForTemplate(value = '', limit = 60000) {
  let html = String(value || '').slice(0, limit);
  html = html.replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/<\s*\/?\s*(script|style|iframe|object|embed|meta|link)[^>]*>/gi, '');
  html = html.replace(/\son\w+\s*=\s*(["']).*?\1/gi, '');
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  html = html.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
  html = html.replace(/\sstyle\s*=\s*(["'])(.*?)\1/gi, (_, quote, style) => {
    const cleaned = cleanInlineStyle(style);
    return cleaned ? ` style="${cleaned}"` : '';
  });
  return html.trim();
}

function cleanInlineStyle(style = '') {
  const allowed = new Set(['color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'text-align', 'margin', 'margin-bottom', 'margin-top', 'padding', 'line-height', 'font-size', 'font-family']);
  return String(style || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [property, ...rest] = part.split(':');
      const name = String(property || '').trim().toLowerCase();
      const value = rest.join(':').trim();
      if (!allowed.has(name)) return '';
      if (/expression\s*\(|javascript:/i.test(value)) return '';
      return `${name}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function stripHtmlToText(html = '') {
  return String(html || '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h1|h2|h3|h4)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


async function pruneOldEmailNotifications(database = db()) {
  await database.sql`DELETE FROM email_notifications WHERE created_at < NOW() - INTERVAL '60 days'`;
}

function getEmailConfigStatus() {
  const tenantId = String(process.env.MICROSOFT_TENANT_ID || '').trim();
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  const fromEmail = String(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz').trim();
  const fromName = String(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists').trim();
  return {
    configured: Boolean(tenantId && clientId && clientSecret && fromEmail),
    fromEmail,
    fromName,
  };
}

function mapPersonalTaskFromDb(row) {
  return {
    id: row.id,
    adviserId: row.adviser_id || '',
    clientId: row.client_id || '',
    title: row.title || '',
    dueDate: toDateOnly(row.due_date),
    status: row.status === 'Completed' ? 'Completed' : 'Open',
    note: row.note || '',
  };
}

function mapCalendarEntryFromDb(row) {
  return {
    id: row.id,
    clientId: row.client_id || '',
    adviserId: row.adviser_id || '',
    title: row.title || '',
    appointmentType: normaliseAppointmentType(row.appointment_type),
    appointmentDate: toDateOnly(row.appointment_date),
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    location: row.location || '',
    notes: row.notes || '',
    status: row.status === 'Completed' ? 'Completed' : 'Open',
  };
}


function mapLibraryEntryFromDb(row) {
  return {
    id: row.id,
    entryType: normaliseLibraryEntryType(row.entry_type),
    referenceCode: row.reference_code || '',
    title: row.title || '',
    category: normaliseLibraryCategory(row.category),
    status: normaliseLibraryStatus(row.status),
    officialUrl: row.official_url || '',
    versionLabel: row.version_label || '',
    acceptableUntil: toDateOnly(row.acceptable_until),
    relatedCaseTypes: parseJsonArray(row.related_case_types),
    relatedDocumentItems: parseJsonArray(row.related_document_items),
    internalSummary: row.internal_summary || '',
    adviserNotes: row.adviser_notes || '',
    lastReviewed: toDateOnly(row.last_reviewed),
    nextReviewDue: toDateOnly(row.next_review_due),
    reviewedBy: row.reviewed_by || '',
  };
}


function mapIntakeEnquiryFromDb(row = {}) {
  return {
    id: row.id,
    status: normaliseIntakeStatus(row.status),
    assignedAdviserId: row.assigned_adviser_id || '',
    firstName: row.applicant_first_name || '',
    lastName: row.applicant_last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    currentLocation: row.current_location || '',
    citizenship: row.citizenship || '',
    dateOfBirth: toDateOnly(row.date_of_birth),
    currentVisaType: row.current_visa_type || '',
    currentVisaExpiry: toDateOnly(row.current_visa_expiry),
    targetPathway: row.target_pathway || '',
    urgency: row.urgency || '',
    flags: parseJsonObject(row.flags),
    rawPayload: parseJsonObject(row.raw_payload),
    adviserAssessmentNotes: row.adviser_assessment_notes || '',
    recommendedPathway: row.recommended_pathway || '',
    consultationOutcome: row.consultation_outcome || '',
    convertedClientId: row.converted_client_id || '',
    createdAt: toDateTimeLabel(row.created_at),
    updatedAt: toDateTimeLabel(row.updated_at),
  };
}


function mapSeminarFromDb(row = {}) {
  return {
    id: row.id,
    title: row.title || 'Turner Hopkins immigration seminar',
    seminarDate: toDateOnly(row.seminar_date),
    seminarTime: row.seminar_time || '',
    timezone: row.timezone || 'Pacific/Auckland',
    presenterName: row.presenter_name || '',
    zoomLink: row.zoom_link || '',
    zoomPassword: row.zoom_password || '',
    status: SEMINAR_STATUSES.includes(row.status) ? row.status : 'Active',
    registrationOpen: row.registration_open !== false,
    internalNotes: row.internal_notes || '',
    createdAt: toDateTimeLabel(row.created_at),
    updatedAt: toDateTimeLabel(row.updated_at),
  };
}

function mapSeminarRegistrationFromDb(row = {}) {
  const status = SEMINAR_REGISTRATION_STATUSES.includes(row.status) ? row.status : 'New';
  return {
    id: row.id,
    seminarId: row.seminar_id || '',
    status,
    fullName: row.full_name || '',
    dateOfBirth: toDateOnly(row.date_of_birth),
    citizenshipCountry: row.citizenship_country || '',
    residenceCountry: row.residence_country || '',
    timezone: row.timezone || 'UTC',
    email: row.email || '',
    partnershipStatus: row.partnership_status || '',
    highestQualification: row.highest_qualification || '',
    currentOccupation: row.current_occupation || '',
    workHistory: row.work_history || '',
    healthCharacterIssues: row.health_character_issues || '',
    englishAbility: row.english_ability || '',
    rawPayload: parseJsonObject(row.raw_payload),
    reviewedBy: row.reviewed_by || '',
    approvedAt: toDateTimeLabel(row.approved_at),
    declinedAt: toDateTimeLabel(row.declined_at),
    createdAt: toDateTimeLabel(row.created_at),
    updatedAt: toDateTimeLabel(row.updated_at),
  };
}

function mapClientFromDb(row, stages, deadlines, billing, portalMessages = [], portalDocuments = []) {
  const clientStages = stages
    .filter((stage) => stage.client_id === row.id)
    .map((stage) => ({
      id: stage.stage_key,
      dbId: stage.id,
      label: stage.stage_label,
      mandatory: Boolean(stage.mandatory),
      applied: Boolean(stage.applied),
      completed: Boolean(stage.completed),
      completedDate: toDateOnly(stage.completed_date),
      sortOrder: Number(stage.sort_order),
    }));

  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    nationality: row.nationality || '',
    dateOfBirth: toDateOnly(row.date_of_birth),
    location: row.location || '',
    sharepointFolderUrl: row.sharepoint_folder_url || '',
    oneLawClientNumber: row.one_law_client_number || '',
    matterName: row.matter_name || '',
    caseStrategy: row.case_strategy || '',
    caseType: row.case_type || CASE_TYPES[0],
    primaryAdviserId: row.primary_adviser_id || '',
    backupAdviserId: row.backup_adviser_id || '',
    priority: row.priority || 'Normal',
    clientStatus: row.client_status || 'Active',
    nextAction: row.next_action || '',
    nextActionDue: toDateOnly(row.next_action_due),
    nextActionLog: parseNextActionLog(row.next_action_log),
    portalEnabled: Boolean(row.portal_enabled),
    portalEmail: row.portal_email || '',
    portalStatusUpdate: row.portal_status_update || '',
    portalNextStep: row.portal_next_step || '',
    portalVisibleDocumentIds: parseJsonArray(row.portal_visible_document_ids),
    portalVisibleDeadlineIds: parseJsonArray(row.portal_visible_deadline_ids),
    portalVisibleAppointmentIds: parseJsonArray(row.portal_visible_appointment_ids),
    portalVisibleBillingIds: parseJsonArray(row.portal_visible_billing_ids),
    portalResourceSettings: parsePortalResourceSettings(row.portal_resource_settings),
    portalAccessCodeSet: Boolean(row.portal_access_code_hash),
    portalLastPublishedAt: toDateTimeLabel(row.portal_last_published_at),
    portalLastAccessedAt: toDateTimeLabel(row.portal_last_accessed_at),
    notes: row.notes || '',
    familyMembers: parseFamilyMembers(row.family_members),
    documentChecklist: parseDocumentChecklist(row.document_checklist),
    portalMessages: (portalMessages || [])
      .filter((message) => message.client_id === row.id && (message.message_type || 'client_note') === 'adviser_action')
      .map(mapPortalMessageFromDb),
    portalDocuments: (portalDocuments || [])
      .filter((document) => document.client_id === row.id)
      .map(mapPortalDocumentFromDb),
    stages: normaliseStages(clientStages),
    deadlines: deadlines
      .filter((deadline) => deadline.client_id === row.id)
      .map((deadline) => ({
        id: deadline.id,
        type: deadline.deadline_type,
        date: toDateOnly(deadline.deadline_date),
        note: deadline.note || '',
      })),
    billing: billing
      .filter((item) => item.client_id === row.id)
      .map((item) => ({
        id: item.id,
        milestone: item.milestone || '',
        dueDate: toDateOnly(item.due_date),
        amount: Number(item.amount || 0),
        status: normaliseBillingStatus(item.status),
        invoiceNo: item.invoice_no || '',
        triggerType: normaliseBillingTriggerType(item.billing_trigger_type),
        stageKey: normaliseStageKey(item.billing_stage_key || ''),
      })),
  };
}

function normaliseAdviserAvailability(value = '') {
  return String(value || '').toLowerCase() === 'away' ? 'Away' : 'Available';
}

function normaliseProfilePhotoUrl(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('data:image/')) return text.slice(0, 500000);
  if (/^https?:\/\//i.test(text)) return text.slice(0, 2000);
  return '';
}

function mapPortalMessageFromDb(row = {}) {
  return {
    id: row.id,
    clientId: row.client_id || '',
    portalEmail: row.portal_email || '',
    messageType: row.message_type || 'client_note',
    title: row.title || '',
    message: row.message || '',
    status: row.status === 'Reviewed' ? 'Reviewed' : 'New',
    createdAt: toDateTimeLabel(row.created_at),
  };
}

function mapPortalDocumentFromDb(row = {}) {
  return {
    id: row.id,
    clientId: row.client_id || '',
    title: row.title || row.file_name || 'Client portal PDF',
    category: row.category || 'THiS instructions',
    description: row.description || '',
    fileName: row.file_name || '',
    fileType: row.file_type || 'application/pdf',
    fileSize: Number(row.file_size || 0),
    visibleToClient: row.visible_to_client !== false,
    uploadedBy: row.uploaded_by || '',
    uploadedAt: toDateTimeLabel(row.uploaded_at),
  };
}

async function saveAdviser(adviser = {}) {
  const database = db();
  const id = isUuid(adviser.id) ? adviser.id : null;

  if (id) {
    const rows = await database.sql`
      UPDATE advisers
      SET name = ${adviser.name || 'Unnamed adviser'},
          role = ${adviser.role || ''},
          email = ${adviser.email || ''},
          login_email = ${adviser.loginEmail || adviser.login_email || ''},
          profile_photo_url = ${normaliseProfilePhotoUrl(adviser.profilePhotoUrl || adviser.profile_photo_url || '')},
          availability_status = ${normaliseAdviserAvailability(adviser.availability || adviser.availabilityStatus || adviser.availability_status)},
          phone = ${adviser.phone || ''},
          licence = ${adviser.licence || ''},
          active = ${adviser.active !== false},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, role, email, login_email, profile_photo_url, availability_status, phone, licence, active
    `;
    return mapAdviserFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO advisers (name, role, email, login_email, profile_photo_url, availability_status, phone, licence, active)
    VALUES (${adviser.name || 'New adviser'}, ${adviser.role || 'Licensed Immigration Adviser'}, ${adviser.email || ''}, ${adviser.loginEmail || adviser.login_email || ''}, ${normaliseProfilePhotoUrl(adviser.profilePhotoUrl || adviser.profile_photo_url || '')}, ${normaliseAdviserAvailability(adviser.availability || adviser.availabilityStatus || adviser.availability_status)}, ${adviser.phone || ''}, ${adviser.licence || ''}, ${adviser.active !== false})
    RETURNING id, name, role, email, login_email, profile_photo_url, availability_status, phone, licence, active
  `;
  return mapAdviserFromDb(rows[0]);
}


async function saveLibraryEntry(input = {}) {
  const database = db();
  const entry = normaliseLibraryEntryInput(input);
  const id = isUuid(entry.id) ? entry.id : null;

  if (id) {
    const rows = await database.sql`
      UPDATE library_entries
      SET entry_type = ${entry.entryType},
          reference_code = ${entry.referenceCode},
          title = ${entry.title || 'Untitled library item'},
          category = ${entry.category},
          status = ${entry.status},
          official_url = ${entry.officialUrl},
          version_label = ${entry.versionLabel},
          acceptable_until = ${nullableDate(entry.acceptableUntil)},
          related_case_types = CAST(${JSON.stringify(entry.relatedCaseTypes || [])} AS jsonb),
          related_document_items = CAST(${JSON.stringify(entry.relatedDocumentItems || [])} AS jsonb),
          internal_summary = ${entry.internalSummary},
          adviser_notes = ${entry.adviserNotes},
          last_reviewed = ${nullableDate(entry.lastReviewed)},
          next_review_due = ${nullableDate(entry.nextReviewDue)},
          reviewed_by = ${entry.reviewedBy},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, entry_type, reference_code, title, category, status, official_url, version_label, acceptable_until, related_case_types, related_document_items, internal_summary, adviser_notes, last_reviewed, next_review_due, reviewed_by
    `;
    return mapLibraryEntryFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO library_entries (entry_type, reference_code, title, category, status, official_url, version_label, acceptable_until, related_case_types, related_document_items, internal_summary, adviser_notes, last_reviewed, next_review_due, reviewed_by)
    VALUES (${entry.entryType}, ${entry.referenceCode}, ${entry.title || 'Untitled library item'}, ${entry.category}, ${entry.status}, ${entry.officialUrl}, ${entry.versionLabel}, ${nullableDate(entry.acceptableUntil)}, CAST(${JSON.stringify(entry.relatedCaseTypes || [])} AS jsonb), CAST(${JSON.stringify(entry.relatedDocumentItems || [])} AS jsonb), ${entry.internalSummary}, ${entry.adviserNotes}, ${nullableDate(entry.lastReviewed)}, ${nullableDate(entry.nextReviewDue)}, ${entry.reviewedBy})
    RETURNING id, entry_type, reference_code, title, category, status, official_url, version_label, acceptable_until, related_case_types, related_document_items, internal_summary, adviser_notes, last_reviewed, next_review_due, reviewed_by
  `;
  return mapLibraryEntryFromDb(rows[0]);
}

async function deleteLibraryEntry(entryId) {
  if (!isUuid(entryId)) return;
  await db().sql`DELETE FROM library_entries WHERE id = ${entryId}`;
}

async function updatePortalMessageStatus(clientId, messageId, status = 'Reviewed') {
  if (!isUuid(clientId) || !isUuid(messageId)) return;
  await db().sql`
    UPDATE client_portal_messages
    SET status = ${status === 'Reviewed' ? 'Reviewed' : 'New'}, updated_at = NOW()
    WHERE id = ${messageId} AND client_id = ${clientId}
  `;
}

async function uploadPortalDocument(clientId, input = {}, user = null) {
  if (!isUuid(clientId)) throw new Error('Save the client record before uploading portal PDFs.');
  const title = String(input.title || input.fileName || 'Client portal PDF').trim().slice(0, 180) || 'Client portal PDF';
  const category = normalisePortalDocumentCategory(input.category);
  const description = String(input.description || '').trim().slice(0, 1000);
  const fileName = sanitiseFileName(input.fileName || `${title}.pdf`);
  const fileType = String(input.fileType || 'application/pdf').slice(0, 120);
  if (fileType !== 'application/pdf') throw new Error('Only PDF files can be uploaded for the client portal.');
  const base64 = String(input.dataBase64 || '').replace(/^data:application\/pdf;base64,/, '');
  if (!base64) throw new Error('The PDF upload did not include any file data.');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('The PDF file could not be read.');
  const maxBytes = 4 * 1024 * 1024;
  if (buffer.length > maxBytes) throw new Error('Portal PDFs must be under 4 MB for this version.');
  const fileSize = Number(input.fileSize || buffer.length);
  const documentId = crypto.randomUUID();
  const blobKey = `clients/${clientId}/portal-documents/${documentId}-${fileName}`;
  const store = getStore({ name: PORTAL_DOCUMENT_STORE, consistency: 'strong' });
  await store.set(blobKey, buffer, { metadata: { clientId, documentId, fileName, fileType, title } });
  await db().sql`
    INSERT INTO client_portal_documents (id, client_id, title, category, description, file_name, file_type, file_size, blob_key, visible_to_client, uploaded_by)
    VALUES (${documentId}, ${clientId}, ${title}, ${category}, ${description}, ${fileName}, ${fileType}, ${fileSize}, ${blobKey}, ${input.visibleToClient !== false}, ${user?.email || user?.name || ''})
  `;
  await db().sql`UPDATE clients SET portal_last_published_at = NOW(), updated_at = NOW() WHERE id = ${clientId}`;
}

async function updatePortalDocument(clientId, input = {}) {
  if (!isUuid(clientId) || !isUuid(input.id)) return;
  const title = String(input.title || input.fileName || 'Client portal PDF').trim().slice(0, 180) || 'Client portal PDF';
  const category = normalisePortalDocumentCategory(input.category);
  const description = String(input.description || '').trim().slice(0, 1000);
  await db().sql`
    UPDATE client_portal_documents
    SET title = ${title}, category = ${category}, description = ${description}, visible_to_client = ${input.visibleToClient !== false}, updated_at = NOW()
    WHERE id = ${input.id} AND client_id = ${clientId}
  `;
  await db().sql`UPDATE clients SET portal_last_published_at = NOW(), updated_at = NOW() WHERE id = ${clientId}`;
}

async function deletePortalDocument(clientId, documentId) {
  if (!isUuid(clientId) || !isUuid(documentId)) return;
  const rows = await db().sql`SELECT blob_key FROM client_portal_documents WHERE id = ${documentId} AND client_id = ${clientId} LIMIT 1`;
  const blobKey = rows[0]?.blob_key || '';
  await db().sql`DELETE FROM client_portal_documents WHERE id = ${documentId} AND client_id = ${clientId}`;
  await db().sql`UPDATE clients SET portal_last_published_at = NOW(), updated_at = NOW() WHERE id = ${clientId}`;
  if (blobKey) {
    try {
      const store = getStore({ name: PORTAL_DOCUMENT_STORE, consistency: 'strong' });
      await store.delete(blobKey);
    } catch (error) {
      console.warn('Portal document blob delete failed', error?.message || error);
    }
  }
}

function sanitiseFileName(value = '') {
  const cleaned = String(value || 'portal-document.pdf').replace(/[^a-zA-Z0-9._ -]+/g, '').replace(/\s+/g, '-').slice(0, 120);
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned || 'portal-document'}.pdf`;
}

function normalisePortalDocumentCategory(value = '') {
  const allowed = ['INZ form', 'INZ guide', 'THiS instructions', 'Evidence checklist', 'Template', 'Other'];
  return allowed.includes(value) ? value : 'THiS instructions';
}


async function saveIntakeEnquiry(input = {}) {
  const intake = normaliseIntakeInput(input);
  if (!isUuid(intake.id)) throw new Error('A saved intake enquiry is required.');
  const flags = buildIntakeFlags(intake.rawPayload);
  const rows = await db().sql`
    UPDATE intake_enquiries
    SET status = ${intake.status},
        assigned_adviser_id = ${nullableUuid(intake.assignedAdviserId)},
        applicant_first_name = ${intake.firstName},
        applicant_last_name = ${intake.lastName},
        email = ${intake.email},
        phone = ${intake.phone},
        current_location = ${intake.currentLocation},
        citizenship = ${intake.citizenship},
        date_of_birth = ${nullableDate(intake.dateOfBirth)},
        current_visa_type = ${intake.currentVisaType},
        current_visa_expiry = ${nullableDate(intake.currentVisaExpiry)},
        target_pathway = ${intake.targetPathway},
        urgency = ${intake.urgency},
        flags = CAST(${JSON.stringify(flags)} AS jsonb),
        raw_payload = CAST(${JSON.stringify(intake.rawPayload)} AS jsonb),
        adviser_assessment_notes = ${intake.adviserAssessmentNotes},
        recommended_pathway = ${intake.recommendedPathway},
        consultation_outcome = ${intake.consultationOutcome},
        updated_at = NOW()
    WHERE id = ${intake.id}
    RETURNING id, status, assigned_adviser_id, applicant_first_name, applicant_last_name, email, phone, current_location, citizenship, date_of_birth, current_visa_type, current_visa_expiry, target_pathway, urgency, flags, raw_payload, adviser_assessment_notes, recommended_pathway, consultation_outcome, converted_client_id, created_at, updated_at
  `;
  if (!rows[0]) throw new Error('Intake enquiry was not found.');
  return mapIntakeEnquiryFromDb(rows[0]);
}


async function downloadIntakeUpload(intakeId, kind) {
  if (!isUuid(intakeId)) throw new Error('A saved intake record is required.');
  const uploadKind = String(kind || '').trim();
  if (!['applicantCv', 'partnerCv'].includes(uploadKind)) throw new Error('That intake upload type is not available.');
  const rows = await db().sql`SELECT raw_payload FROM intake_enquiries WHERE id = ${intakeId} LIMIT 1`;
  const payload = rows[0]?.raw_payload && typeof rows[0].raw_payload === 'object' ? rows[0].raw_payload : {};
  const metadata = payload.intakeUploads?.[uploadKind] || payload[uploadKind] || null;
  if (!metadata?.blobKey) throw new Error('No uploaded CV is recorded for this intake.');
  const store = getStore({ name: INTAKE_UPLOAD_STORE, consistency: 'strong' });
  const arrayBuffer = await store.get(metadata.blobKey, { type: 'arrayBuffer', consistency: 'strong' });
  if (!arrayBuffer) throw new Error('The uploaded CV could not be found in storage.');
  return {
    kind: uploadKind,
    fileName: metadata.fileName || 'intake-cv.pdf',
    fileType: metadata.fileType || 'application/octet-stream',
    fileSize: metadata.fileSize || arrayBuffer.byteLength,
    dataBase64: Buffer.from(arrayBuffer).toString('base64'),
  };
}

async function deleteIntakeEnquiry(intakeId) {
  if (!isUuid(intakeId)) return;
  await db().sql`DELETE FROM intake_enquiries WHERE id = ${intakeId} AND converted_client_id IS NULL`;
}

async function convertIntakeToClient(intakeId) {
  if (!isUuid(intakeId)) throw new Error('A saved intake enquiry is required.');
  const rows = await db().sql`SELECT id, status, assigned_adviser_id, applicant_first_name, applicant_last_name, email, phone, current_location, citizenship, date_of_birth, current_visa_type, current_visa_expiry, target_pathway, urgency, flags, raw_payload, adviser_assessment_notes, recommended_pathway, consultation_outcome, converted_client_id, created_at, updated_at FROM intake_enquiries WHERE id = ${intakeId} LIMIT 1`;
  const row = rows[0];
  if (!row) throw new Error('Intake enquiry was not found.');
  if (row.converted_client_id) return { client: await readSingleClient(row.converted_client_id), intakeEnquiry: mapIntakeEnquiryFromDb(row) };

  const intake = mapIntakeEnquiryFromDb(row);
  const clientDraft = buildClientFromIntake(intake);
  const saved = await saveClient(clientDraft);
  await db().sql`UPDATE intake_enquiries SET status = 'Converted', converted_client_id = ${saved.id}, updated_at = NOW() WHERE id = ${intakeId}`;
  return { client: await readSingleClient(saved.id), intakeEnquiry: { ...intake, status: 'Converted', convertedClientId: saved.id } };
}

function normaliseIntakeInput(input = {}) {
  const rawPayload = normaliseEditableIntakePayload(input);
  return {
    id: input.id,
    status: normaliseIntakeStatus(input.status),
    assignedAdviserId: input.assignedAdviserId || input.assigned_adviser_id || '',
    firstName: cleanIntakeText(rawPayload.firstName || input.firstName || input.applicantFirstName || input.applicant_first_name, 400),
    lastName: cleanIntakeText(rawPayload.lastName || input.lastName || input.applicantLastName || input.applicant_last_name, 400),
    email: cleanIntakeText(rawPayload.email || input.email, 400),
    phone: cleanIntakeText(rawPayload.phone || input.phone, 400),
    currentLocation: cleanIntakeText(rawPayload.currentLocation || input.currentLocation || input.current_location, 400),
    citizenship: cleanIntakeText(rawPayload.citizenship || input.citizenship, 400),
    dateOfBirth: cleanIntakeText(rawPayload.dateOfBirth || input.dateOfBirth || input.date_of_birth, 20),
    currentVisaType: cleanIntakeText(rawPayload.currentVisaType || input.currentVisaType || input.current_visa_type, 400),
    currentVisaExpiry: cleanIntakeText(rawPayload.currentVisaExpiry || input.currentVisaExpiry || input.current_visa_expiry, 20),
    targetPathway: cleanIntakeText(rawPayload.targetPathway || input.targetPathway || input.target_pathway, 400),
    urgency: cleanIntakeText(rawPayload.urgency || input.urgency, 80),
    rawPayload,
    adviserAssessmentNotes: cleanIntakeText(input.adviserAssessmentNotes || input.adviser_assessment_notes, 12000),
    recommendedPathway: cleanIntakeText(input.recommendedPathway || input.recommended_pathway, 4000),
    consultationOutcome: cleanIntakeText(input.consultationOutcome || input.consultation_outcome, 4000),
  };
}

function normaliseEditableIntakePayload(input = {}) {
  const source = input.rawPayload && typeof input.rawPayload === 'object'
    ? input.rawPayload
    : input.raw_payload && typeof input.raw_payload === 'object'
      ? input.raw_payload
      : {};
  const payload = cleanIntakePayloadValue({ ...source });
  const topLevel = {
    firstName: input.firstName || input.applicantFirstName || input.applicant_first_name,
    lastName: input.lastName || input.applicantLastName || input.applicant_last_name,
    email: input.email,
    phone: input.phone,
    citizenship: input.citizenship,
    dateOfBirth: input.dateOfBirth || input.date_of_birth,
    currentLocation: input.currentLocation || input.current_location,
    currentVisaType: input.currentVisaType || input.current_visa_type,
    currentVisaExpiry: input.currentVisaExpiry || input.current_visa_expiry,
    targetPathway: input.targetPathway || input.target_pathway,
    urgency: input.urgency,
  };
  Object.entries(topLevel).forEach(([key, value]) => {
    if (!payload[key] && value) payload[key] = cleanIntakeText(value, 12000);
  });
  if (payload.dateOfBirth) payload.dateOfBirthAge = calculateIntakeAge(payload.dateOfBirth);
  return payload;
}

function cleanIntakePayloadValue(value) {
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => cleanIntakePayloadValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [cleanIntakeText(key, 80), cleanIntakePayloadValue(item)]));
  }
  if (typeof value === 'boolean') return value;
  return cleanIntakeText(value, 12000);
}

function cleanIntakeText(value, max = 12000) {
  return String(value || '').trim().slice(0, max);
}

function calculateIntakeAge(value) {
  const iso = nullableDate(value);
  if (!iso) return '';
  const dob = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 130 ? String(age) : '';
}

function daysUntilIntakeDate(value) {
  const iso = nullableDate(value);
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function buildIntakeFlags(payload = {}) {
  const visaDays = daysUntilIntakeDate(payload.currentVisaExpiry);
  const urgentDays = daysUntilIntakeDate(payload.urgentDeadline);
  const healthReview = /^yes/i.test(payload.healthIssues || '') || /^yes/i.test(payload.dependantHealthIssues || '');
  const characterReview = [payload.characterIssues, payload.characterConvictions, payload.characterPendingCharges, payload.deportationRemoval, payload.visaDeclines, payload.overstayed, payload.falseMisleadingIssue, payload.appealOrDeadline].some((value) => /^yes/i.test(value || ''));
  const hasChildrenWithCustodyIssue = Array.isArray(payload.children) && payload.children.some((child) => /^yes/i.test(child.custodyIssues || ''));
  return {
    urgent: payload.urgency === 'Urgent' || (visaDays !== null && visaDays <= 45) || (urgentDays !== null && urgentDays <= 45),
    visaExpirySoon: visaDays !== null && visaDays <= 60,
    health: healthReview,
    character: characterReview,
    employment: /^yes|in progress/i.test(payload.hasNzJobOffer || '') || Boolean(payload.employerName || payload.jobTitle || payload.currentEmployer || payload.occupation),
    partnership: /^yes/i.test(payload.hasPartner || '') || /partner|family|married|de facto|relationship/i.test(`${payload.targetPathway} ${payload.relationshipStatus}`),
    family: /^yes/i.test(payload.hasChildren || '') || hasChildrenWithCustodyIssue,
    funds: Boolean(payload.availableFunds || payload.investmentFunds || payload.sourceOfFunds || payload.fundsDetails),
    investor: /investor|investment|business/i.test(`${payload.targetPathway} ${payload.investmentInterest} ${payload.fundsDetails}`),
  };
}

function normaliseIntakeStatus(value) {
  const text = String(value || '').trim();
  if (INTAKE_STATUSES.includes(text)) return text;
  if (/converted|signed client/i.test(text)) return 'Converted';
  if (['Reviewing', 'Consultation booked', 'Agreement sent', 'Not proceeding', 'Archived'].includes(text)) return 'Contacted';
  if (/spam|duplicate/i.test(text)) return 'Spam / Duplicate';
  return 'New';
}

function buildClientFromIntake(intake = {}) {
  const payload = intake.rawPayload || {};
  const familyMembers = [];
  if (payload.partnerFullName || payload.partnerName || payload.partnerCitizenship) {
    familyMembers.push({
      id: `member-${Date.now()}-partner`,
      relationship: 'Spouse/Partner',
      name: String(payload.partnerFullName || payload.partnerName || '').trim(),
      nationality: String(payload.partnerCitizenship || '').trim(),
      dateOfBirth: String(payload.partnerDateOfBirth || '').trim(),
    });
  }
  if (Array.isArray(payload.children)) {
    payload.children.forEach((child, index) => {
      if (!child || !(child.fullName || child.dateOfBirth || child.citizenship)) return;
      familyMembers.push({
        id: `member-${Date.now()}-child-${index}`,
        relationship: 'Child',
        name: String(child.fullName || '').trim(),
        nationality: String(child.citizenship || '').trim(),
        dateOfBirth: String(child.dateOfBirth || '').trim(),
      });
    });
  }
  const strategyParts = [
    'Converted from website intake form.',
    intake.recommendedPathway ? `Recommended pathway: ${intake.recommendedPathway}` : '',
    payload.helpNeeded ? `Client goal/help needed: ${payload.helpNeeded}` : '',
    payload.desiredTimeframe ? `Preferred timing: ${payload.desiredTimeframe}` : '',
    payload.currentVisaType || payload.currentVisaExpiry ? `Current visa: ${[payload.currentVisaType, payload.currentVisaExpiry ? `expires ${payload.currentVisaExpiry}` : ''].filter(Boolean).join(' ')}` : '',
    payload.hasNzJobOffer || payload.employerName || payload.jobTitle ? `NZ employment: ${[payload.hasNzJobOffer, payload.jobTitle, payload.employerName, payload.nzJobLocation, payload.payRate ? `Pay ${payload.payRate}${payload.nzPayCurrency ? ` ${payload.nzPayCurrency}` : ''}` : ''].filter(Boolean).join(' · ')}` : '',
    payload.healthIssues ? `Health declaration: ${payload.healthIssues}${payload.healthDetails ? ` - ${payload.healthDetails}` : ''}` : '',
    [payload.characterIssues, payload.characterConvictions, payload.characterPendingCharges, payload.deportationRemoval].some(Boolean) ? `Character declaration: ${[payload.characterIssues, payload.characterConvictions, payload.characterPendingCharges, payload.deportationRemoval].filter(Boolean).join(' · ')}${payload.characterDetails ? ` - ${payload.characterDetails}` : ''}` : '',
    intake.adviserAssessmentNotes ? `Adviser assessment notes: ${intake.adviserAssessmentNotes}` : '',
  ].filter(Boolean).join('\n\n');

  const notes = [
    `Intake source: ${payload.submittedVia || 'Website intake form'}`,
    payload.preferredContactMethod ? `Preferred contact: ${payload.preferredContactMethod}` : '',
    payload.additionalInfo ? `Additional intake comments: ${payload.additionalInfo}` : '',
    payload.relationshipBackground ? `Relationship background: ${payload.relationshipBackground}` : '',
    Array.isArray(payload.children) && payload.children.length ? `Children: ${payload.children.map((child, index) => `${index + 1}. ${[child.fullName, child.dateOfBirth, child.citizenship, child.includedInApplication ? `Included: ${child.includedInApplication}` : ''].filter(Boolean).join(' · ')}`).join('\n')}` : '',
    payload.qualificationName || payload.highestQualification ? `Qualification: ${[payload.highestQualification, payload.qualificationName, payload.qualificationInstitution, payload.qualificationCountry, payload.nzqaAssessed ? `NZQA: ${payload.nzqaAssessed}` : ''].filter(Boolean).join(' · ')}` : '',
    payload.qualificationDetails ? `Qualification details: ${payload.qualificationDetails}` : '',
    payload.currentEmployer || payload.currentEmploymentStatus ? `Current employment: ${[payload.currentEmploymentStatus, payload.occupation, payload.currentEmployer, payload.employmentCountry, payload.annualSalary ? `Pay ${payload.annualSalary}${payload.salaryCurrency ? ` ${payload.salaryCurrency}` : ''}` : ''].filter(Boolean).join(' · ')}` : '',
    payload.employmentDetails ? `Employment details: ${payload.employmentDetails}` : '',
    payload.previousWorkHistory ? `Previous work history: ${payload.previousWorkHistory}` : '',
    payload.availableFunds ? `Available funds: ${payload.availableFunds}${payload.fundsCurrency ? ` ${payload.fundsCurrency}` : ''}` : '',
    payload.investmentFunds ? `Investment funds: ${payload.investmentFunds}${payload.investmentCurrency ? ` ${payload.investmentCurrency}` : payload.fundsCurrency ? ` ${payload.fundsCurrency}` : ''}` : '',
    payload.fundsDetails ? `Funds/investment details: ${payload.fundsDetails}` : '',
    payload.immigrationHistoryDetails ? `Immigration history details: ${payload.immigrationHistoryDetails}` : '',
    payload.nzTravelHistory ? `NZ travel history: ${payload.nzTravelHistory}` : '',
  ].filter(Boolean).join('\n\n');

  return {
    firstName: intake.firstName || payload.firstName || '',
    lastName: intake.lastName || payload.lastName || 'Unnamed client',
    email: intake.email || payload.email || '',
    phone: intake.phone || payload.phone || '',
    nationality: intake.citizenship || payload.citizenship || '',
    dateOfBirth: intake.dateOfBirth || payload.dateOfBirth || '',
    location: intake.currentLocation || payload.currentLocation || '',
    matterName: intake.targetPathway || payload.targetPathway || '',
    caseStrategy: strategyParts,
    caseType: inferCaseTypeFromIntake(intake),
    primaryAdviserId: intake.assignedAdviserId || '',
    backupAdviserId: '',
    priority: intake.flags?.urgent ? 'High' : 'Normal',
    clientStatus: 'Active',
    nextAction: 'Complete onboarding and send agreement / client instructions.',
    nextActionDue: todayDateOnly(),
    nextActionLog: [],
    portalEnabled: false,
    portalEmail: intake.email || payload.email || '',
    portalStatusUpdate: '',
    portalNextStep: '',
    portalVisibleDocumentIds: [],
    portalVisibleDeadlineIds: [],
    portalVisibleAppointmentIds: [],
    portalVisibleBillingIds: [],
    notes,
    stages: normaliseStages(buildStages(['instruction-sent', 'documentation-gathering'], [])),
    familyMembers,
    documentChecklist: buildDocumentChecklist(),
    deadlines: intake.currentVisaExpiry ? [{ type: 'Visa Expiry Date', date: intake.currentVisaExpiry, note: 'Captured from intake form.' }] : [],
    billing: [],
  };
}

function inferCaseTypeFromIntake(intake = {}) {
  const text = `${intake.targetPathway || ''} ${intake.recommendedPathway || ''} ${intake.rawPayload?.helpNeeded || ''}`.toLowerCase();
  if (/active investor|investor|investment/.test(text)) return 'Active Investor';
  if (/partner|partnership|spouse|de facto/.test(text)) return /residence/.test(text) ? 'Partner Residence' : 'Partner WV Only';
  if (/green list/.test(text)) return 'SMC Residence - Green List';
  if (/skilled migrant|smc|residence|resident/.test(text)) return 'SMC Residence - Points';
  if (/employer|aewv|work visa|work/.test(text)) return 'AEWV Only';
  if (/student/.test(text)) return 'Student Visa (Intl)';
  if (/visitor|visit/.test(text)) return 'Visitor Visa';
  if (/citizenship/.test(text)) return 'Citizenship';
  if (/permanent residence|prv/.test(text)) return 'Permanent Residence';
  if (/parent retirement/.test(text)) return 'Parent Retirement';
  if (/parent/.test(text)) return 'Parent Residence';
  if (/specific purpose/.test(text)) return 'Specific Purpose Work Visa';
  return CASE_TYPES[0];
}

async function saveClient(input = {}, authUser = null) {
  const database = db();
  const client = normaliseClientInput(input);
  const poolClient = await database.pool.connect();

  try {
    await poolClient.query('BEGIN');

    let clientId = isUuid(client.id) ? client.id : null;

    let nextActionLog = normaliseNextActionLog(client.nextActionLog);

    if (clientId) {
      const existingRows = await poolClient.query(
        `SELECT next_action, next_action_due, next_action_log FROM clients WHERE id = $1 FOR UPDATE`,
        [clientId]
      );
      const existing = existingRows.rows[0];
      if (existing) {
        nextActionLog = buildNextActionLog(existing, client);
      }

      await poolClient.query(
        `UPDATE clients
         SET first_name = $1, last_name = $2, email = $3, phone = $4, nationality = $5, date_of_birth = $6, location = $7, sharepoint_folder_url = $8, one_law_client_number = $9,
             matter_name = $10, case_strategy = $11, case_type = $12, primary_adviser_id = $13, backup_adviser_id = $14,
             priority = $15, client_status = $16, next_action = $17, next_action_due = $18, next_action_log = $19::jsonb,
             portal_enabled = $20, portal_email = $21, portal_status_update = $22, portal_next_step = $23,
             portal_visible_document_ids = $24::jsonb, portal_visible_deadline_ids = $25::jsonb, portal_visible_appointment_ids = $26::jsonb, portal_visible_billing_ids = $27::jsonb,
             portal_resource_settings = $28::jsonb,
             portal_access_code_hash = COALESCE($29, portal_access_code_hash), portal_last_published_at = CASE WHEN $30 THEN NOW() ELSE portal_last_published_at END,
             notes = $31, family_members = $32::jsonb, document_checklist = $33::jsonb, updated_at = NOW()
         WHERE id = $34`,
        [client.firstName, client.lastName || 'Unnamed client', client.email, client.phone, client.nationality, nullableDate(client.dateOfBirth), client.location, client.sharepointFolderUrl, client.oneLawClientNumber, client.matterName, client.caseStrategy, client.caseType, nullableUuid(client.primaryAdviserId), nullableUuid(client.backupAdviserId), client.priority, client.clientStatus, client.nextAction, nullableDate(client.nextActionDue), JSON.stringify(nextActionLog), client.portalEnabled, client.portalEmail, client.portalStatusUpdate, client.portalNextStep, JSON.stringify(client.portalVisibleDocumentIds || []), JSON.stringify(client.portalVisibleDeadlineIds || []), JSON.stringify(client.portalVisibleAppointmentIds || []), JSON.stringify(client.portalVisibleBillingIds || []), JSON.stringify(client.portalResourceSettings || {}), client.portalNewAccessCode ? hashPortalAccessCode(client.portalNewAccessCode) : null, client.portalPublishNow, client.notes, JSON.stringify(client.familyMembers || []), JSON.stringify(client.documentChecklist || []), clientId]
      );
    } else {
      const result = await poolClient.query(
        `INSERT INTO clients (first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, one_law_client_number, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, next_action_log, portal_enabled, portal_email, portal_status_update, portal_next_step, portal_visible_document_ids, portal_visible_deadline_ids, portal_visible_appointment_ids, portal_visible_billing_ids, portal_resource_settings, portal_access_code_hash, portal_last_published_at, notes, family_members, document_checklist)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24::jsonb, $25::jsonb, $26::jsonb, $27::jsonb, $28::jsonb, $29, CASE WHEN $30 THEN NOW() ELSE NULL END, $31, $32::jsonb, $33::jsonb)
         RETURNING id`,
        [client.firstName, client.lastName || 'Unnamed client', client.email, client.phone, client.nationality, nullableDate(client.dateOfBirth), client.location, client.sharepointFolderUrl, client.oneLawClientNumber, client.matterName, client.caseStrategy, client.caseType, nullableUuid(client.primaryAdviserId), nullableUuid(client.backupAdviserId), client.priority, client.clientStatus, client.nextAction, nullableDate(client.nextActionDue), JSON.stringify(nextActionLog), client.portalEnabled, client.portalEmail, client.portalStatusUpdate, client.portalNextStep, JSON.stringify(client.portalVisibleDocumentIds || []), JSON.stringify(client.portalVisibleDeadlineIds || []), JSON.stringify(client.portalVisibleAppointmentIds || []), JSON.stringify(client.portalVisibleBillingIds || []), JSON.stringify(client.portalResourceSettings || {}), client.portalNewAccessCode ? hashPortalAccessCode(client.portalNewAccessCode) : null, client.portalPublishNow, client.notes, JSON.stringify(client.familyMembers || []), JSON.stringify(client.documentChecklist || [])]
      );
      clientId = result.rows[0].id;
    }


    await poolClient.query('DELETE FROM client_stages WHERE client_id = $1', [clientId]);
    for (const stage of client.stages) {
      await poolClient.query(
        `INSERT INTO client_stages (client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [clientId, stage.id, stage.label, Boolean(stage.mandatory), Boolean(stage.applied), Boolean(stage.completed), nullableDate(stage.completedDate), Number(stage.sortOrder || 0)]
      );
    }

    await poolClient.query('DELETE FROM client_deadlines WHERE client_id = $1', [clientId]);
    for (const deadline of client.deadlines) {
      if (!deadline.type && !deadline.date) continue;
      await poolClient.query(
        `INSERT INTO client_deadlines (client_id, deadline_type, deadline_date, note)
         VALUES ($1, $2, $3, $4)`,
        [clientId, deadline.type || DEADLINE_TYPES[0], nullableDate(deadline.date), deadline.note || '']
      );
    }

    const retainedBillingIds = client.billing.map((item) => item.id).filter(isUuid);
    if (retainedBillingIds.length) {
      await poolClient.query('DELETE FROM billing_milestones WHERE client_id = $1 AND NOT (id = ANY($2::uuid[]))', [clientId, retainedBillingIds]);
    } else {
      await poolClient.query('DELETE FROM billing_milestones WHERE client_id = $1', [clientId]);
    }

    for (const item of client.billing) {
      if (!item.milestone) continue;
      if (isUuid(item.id)) {
        const updateResult = await poolClient.query(
          `UPDATE billing_milestones
           SET milestone = $3, due_date = $4, amount = $5, status = $6, invoice_no = $7, billing_trigger_type = $8, billing_stage_key = $9
           WHERE id = $1 AND client_id = $2`,
          [item.id, clientId, item.milestone, nullableDate(item.dueDate), Number(item.amount || 0), normaliseBillingStatus(item.status), item.invoiceNo || '', normaliseBillingTriggerType(item.triggerType), item.stageKey || null]
        );
        if (updateResult.rowCount > 0) continue;
        await poolClient.query(
          `INSERT INTO billing_milestones (id, client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [item.id, clientId, item.milestone, nullableDate(item.dueDate), Number(item.amount || 0), normaliseBillingStatus(item.status), item.invoiceNo || '', normaliseBillingTriggerType(item.triggerType), item.stageKey || null]
        );
      } else {
        await poolClient.query(
          `INSERT INTO billing_milestones (client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [clientId, item.milestone, nullableDate(item.dueDate), Number(item.amount || 0), normaliseBillingStatus(item.status), item.invoiceNo || '', normaliseBillingTriggerType(item.triggerType), item.stageKey || null]
        );
      }
    }

    await poolClient.query('COMMIT');

    let portalAccessEmailLog = null;
    if (client.portalPublishNow && client.portalEnabled && client.portalNewAccessCode && isValidEmailAddress(client.portalEmail || client.email)) {
      try {
        portalAccessEmailLog = await sendPortalAccessEmail({ ...client, id: clientId }, client.portalNewAccessCode, authUser);
      } catch (emailError) {
        console.warn('Portal access email failed', emailError?.message || emailError);
      }
    }

    return { ...client, id: clientId, nextActionLog, portalAccessEmailLog };
  } catch (error) {
    await poolClient.query('ROLLBACK');
    throw error;
  } finally {
    poolClient.release();
  }
}

async function saveCalendarEntry(input = {}) {
  const database = db();
  const entry = normaliseCalendarEntryInput(input);
  const id = isUuid(entry.id) ? entry.id : null;

  if (id) {
    const rows = await database.sql`
      UPDATE calendar_entries
      SET client_id = ${nullableUuid(entry.clientId)},
          adviser_id = ${nullableUuid(entry.adviserId)},
          title = ${entry.title || 'Appointment'},
          appointment_type = ${normaliseAppointmentType(entry.appointmentType)},
          appointment_date = ${nullableDate(entry.appointmentDate) || todayDateOnly()},
          start_time = ${entry.startTime || ''},
          end_time = ${entry.endTime || ''},
          location = ${entry.location || ''},
          notes = ${entry.notes || ''},
          status = ${entry.status === 'Completed' ? 'Completed' : 'Open'},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status
    `;
    return mapCalendarEntryFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO calendar_entries (client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status)
    VALUES (${nullableUuid(entry.clientId)}, ${nullableUuid(entry.adviserId)}, ${entry.title || 'Appointment'}, ${normaliseAppointmentType(entry.appointmentType)}, ${nullableDate(entry.appointmentDate) || todayDateOnly()}, ${entry.startTime || ''}, ${entry.endTime || ''}, ${entry.location || ''}, ${entry.notes || ''}, ${entry.status === 'Completed' ? 'Completed' : 'Open'})
    RETURNING id, client_id, adviser_id, title, appointment_type, appointment_date, start_time, end_time, location, notes, status
  `;
  return mapCalendarEntryFromDb(rows[0]);
}

async function deleteCalendarEntry(entryId) {
  if (!isUuid(entryId)) return;
  await db().sql`DELETE FROM calendar_entries WHERE id = ${entryId}`;
}

async function savePersonalTask(input = {}) {
  const database = db();
  const task = normalisePersonalTaskInput(input);
  const id = isUuid(task.id) ? task.id : null;

  if (id) {
    const rows = await database.sql`
      UPDATE personal_tasks
      SET adviser_id = ${nullableUuid(task.adviserId)},
          client_id = ${nullableUuid(task.clientId)},
          title = ${task.title || 'Untitled task'},
          due_date = ${nullableDate(task.dueDate)},
          status = ${normalisePersonalTaskStatus(task.status)},
          note = ${task.note || ''},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, adviser_id, client_id, title, due_date, status, note
    `;
    return mapPersonalTaskFromDb(rows[0]);
  }

  const rows = await database.sql`
    INSERT INTO personal_tasks (adviser_id, client_id, title, due_date, status, note)
    VALUES (${nullableUuid(task.adviserId)}, ${nullableUuid(task.clientId)}, ${task.title || 'Untitled task'}, ${nullableDate(task.dueDate)}, ${normalisePersonalTaskStatus(task.status)}, ${task.note || ''})
    RETURNING id, adviser_id, client_id, title, due_date, status, note
  `;
  return mapPersonalTaskFromDb(rows[0]);
}

async function deletePersonalTask(taskId) {
  if (!isUuid(taskId)) return;
  await db().sql`DELETE FROM personal_tasks WHERE id = ${taskId}`;
}


async function saveSeminar(input = {}) {
  const seminar = normaliseSeminarInput(input);
  const database = db();
  if (isUuid(seminar.id)) {
    const rows = await database.sql`
      UPDATE seminars
         SET title = ${seminar.title}, seminar_date = ${nullableDate(seminar.seminarDate)}, seminar_time = ${seminar.seminarTime}, timezone = ${seminar.timezone}, presenter_name = ${seminar.presenterName}, zoom_link = ${seminar.zoomLink}, zoom_password = ${seminar.zoomPassword}, status = ${seminar.status}, registration_open = ${seminar.registrationOpen}, internal_notes = ${seminar.internalNotes}, updated_at = NOW()
       WHERE id = ${seminar.id}
       RETURNING id, title, seminar_date, seminar_time, timezone, presenter_name, zoom_link, zoom_password, status, registration_open, internal_notes, created_at, updated_at`;
    return mapSeminarFromDb(rows[0]);
  }
  const rows = await database.sql`
    INSERT INTO seminars (title, seminar_date, seminar_time, timezone, presenter_name, zoom_link, zoom_password, status, registration_open, internal_notes)
    VALUES (${seminar.title}, ${nullableDate(seminar.seminarDate)}, ${seminar.seminarTime}, ${seminar.timezone}, ${seminar.presenterName}, ${seminar.zoomLink}, ${seminar.zoomPassword}, ${seminar.status}, ${seminar.registrationOpen}, ${seminar.internalNotes})
    RETURNING id, title, seminar_date, seminar_time, timezone, presenter_name, zoom_link, zoom_password, status, registration_open, internal_notes, created_at, updated_at`;
  return mapSeminarFromDb(rows[0]);
}

async function deleteSeminar(seminarId) {
  if (!isUuid(seminarId)) return;
  await db().sql`DELETE FROM seminars WHERE id = ${seminarId}`;
}

async function saveSeminarRegistration(input = {}, authUser = null) {
  const registration = normaliseSeminarRegistrationInput(input);
  if (!isUuid(registration.id)) throw new Error('Registration ID is required.');
  const reviewedBy = authUser?.email || authUser?.name || input.reviewedBy || input.reviewed_by || '';
  const rows = await db().sql`
    UPDATE seminar_registrations
       SET status = ${registration.status}, reviewed_by = ${reviewedBy}, updated_at = NOW()
     WHERE id = ${registration.id}
     RETURNING id, seminar_id, status, full_name, date_of_birth, citizenship_country, residence_country, timezone, email, partnership_status, highest_qualification, current_occupation, work_history, health_character_issues, english_ability, raw_payload, reviewed_by, approved_at, declined_at, created_at, updated_at`;
  if (!rows[0]) throw new Error('Seminar registration not found.');
  return mapSeminarRegistrationFromDb(rows[0]);
}

function normaliseSeminarInput(input = {}) {
  const status = SEMINAR_STATUSES.includes(input.status) ? input.status : 'Active';
  return {
    id: String(input.id || '').trim(),
    title: cleanIntakeText(input.title || 'Turner Hopkins immigration seminar', 400),
    seminarDate: cleanIntakeText(input.seminarDate || input.seminar_date, 20),
    seminarTime: normaliseSeminarTimeInput(input.seminarTime || input.seminar_time),
    timezone: cleanIntakeText(input.timezone || 'Pacific/Auckland', 80),
    presenterName: cleanIntakeText(input.presenterName || input.presenter_name, 400),
    zoomLink: cleanIntakeText(input.zoomLink || input.zoom_link, 2000),
    zoomPassword: cleanIntakeText(input.zoomPassword || input.zoom_password, 400),
    status,
    registrationOpen: input.registrationOpen ?? input.registration_open ?? true,
    internalNotes: cleanIntakeText(input.internalNotes || input.internal_notes, 4000),
  };
}

function normaliseSeminarRegistrationInput(input = {}) {
  const status = SEMINAR_REGISTRATION_STATUSES.includes(input.status) ? input.status : 'New';
  return {
    id: String(input.id || '').trim(),
    seminarId: String(input.seminarId || input.seminar_id || '').trim(),
    status,
  };
}

async function deleteClient(clientId) {
  if (!isUuid(clientId)) return;
  await db().sql`DELETE FROM clients WHERE id = ${clientId}`;
}


async function sendSeminarRegistrationEmail(registrationId, outcome = 'approve', authUser = null) {
  if (!isUuid(registrationId)) throw new Error('Seminar registration ID is required.');
  const database = db();
  const rows = await database.sql`
    SELECT r.id, r.seminar_id, r.status, r.full_name, r.date_of_birth, r.citizenship_country, r.residence_country, r.timezone, r.email, r.partnership_status, r.highest_qualification, r.current_occupation, r.work_history, r.health_character_issues, r.english_ability, r.raw_payload, r.reviewed_by, r.approved_at, r.declined_at, r.created_at, r.updated_at,
           s.title, s.seminar_date, s.seminar_time, s.timezone AS seminar_timezone, s.presenter_name, s.zoom_link, s.zoom_password
      FROM seminar_registrations r
      JOIN seminars s ON s.id = r.seminar_id
     WHERE r.id = ${registrationId}
     LIMIT 1`;
  const row = rows[0];
  if (!row) throw new Error('Seminar registration not found.');
  const registration = mapSeminarRegistrationFromDb(row);
  registration.seminar = {
    id: row.seminar_id,
    title: row.title || 'Turner Hopkins immigration seminar',
    seminarDate: toDateOnly(row.seminar_date),
    seminarTime: row.seminar_time || '',
    timezone: row.seminar_timezone || 'Pacific/Auckland',
    presenterName: row.presenter_name || '',
    zoomLink: row.zoom_link || '',
    zoomPassword: row.zoom_password || '',
  };
  if (!isValidEmailAddress(registration.email)) throw new Error('This seminar registration does not have a valid email address.');
  const isDecline = String(outcome || '').toLowerCase() === 'decline';
  const fallbackDraft = buildSeminarRegistrationEmailContent(registration, isDecline ? 'decline' : 'approve');
  const config = requireMicrosoftEmailConfig();
  const sentBy = authUser?.email || authUser?.name || 'CRM adviser';
  const templateKey = isDecline ? 'seminar_decline' : 'seminar_approve';
  const timeSummary = buildSeminarTimeSummary(registration.seminar || {}, registration.timezone);
  const emailContent = await buildEmailFromTemplate(templateKey, {
    firstName: firstNameFromFullName(registration.fullName) || 'there',
    registrantFullName: registration.fullName || '',
    seminarTitle: registration.seminar?.title || 'Turner Hopkins immigration seminar',
    presenterName: registration.seminar?.presenterName || 'Turner Hopkins adviser',
    nzTime: timeSummary.nzTime || 'To be confirmed',
    localTime: timeSummary.localTime || 'To be confirmed',
    zoomLink: registration.seminar?.zoomLink || 'To be confirmed',
    zoomPassword: registration.seminar?.zoomPassword || 'To be confirmed',
  }, fallbackDraft);
  const emailDraft = { to: fallbackDraft.to, ...emailContent };

  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
    VALUES ('seminar_registration', ${registration.id}, ${templateKey}, ${config.fromEmail}, ${config.fromName}, ${emailDraft.to}, ${emailDraft.subject}, ${emailDraft.bodyText}, ${emailDraft.bodyHtml}, 'Sending', ${sentBy})
    RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail: emailDraft.to, subject: emailDraft.subject, bodyText: emailDraft.bodyText, bodyHtml: emailDraft.bodyHtml });
    const nextStatus = isDecline ? 'Declined' : 'Approved';
    await database.sql`
      UPDATE seminar_registrations
         SET status = ${nextStatus}, reviewed_by = ${sentBy}, approved_at = CASE WHEN ${nextStatus} = 'Approved' THEN NOW() ELSE approved_at END, declined_at = CASE WHEN ${nextStatus} = 'Declined' THEN NOW() ELSE declined_at END, updated_at = NOW()
       WHERE id = ${registration.id}`;
    const [updated] = await database.sql`
      UPDATE email_notifications
         SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(updated);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1000);
    const [failed] = await database.sql`
      UPDATE email_notifications
         SET status = 'Failed', failed_at = NOW(), failure_message = ${message}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(failed);
  }
}

function buildSeminarRegistrationEmailContent(registration = {}, outcome = 'approve') {
  const firstName = firstNameFromFullName(registration.fullName) || 'there';
  const to = String(registration.email || '').trim();
  const seminar = registration.seminar || {};
  if (outcome === 'decline') {
    const bodyText = [
      `Hi ${firstName},`,
      '',
      'Thank you for registering your interest in our upcoming seminar.',
      '',
      'After reviewing the information provided, we are not able to offer you a place in this session.',
      '',
      'We appreciate your interest and wish you all the best.',
      '',
      'Kind regards,',
    ].join('\n');
    return {
      to,
      subject: 'Turner Hopkins seminar registration',
      bodyText,
      bodyHtml: seminarEmailHtml(bodyText),
    };
  }
  const timeSummary = buildSeminarTimeSummary(seminar, registration.timezone);
  const bodyText = [
    `Hi ${firstName},`,
    '',
    'Thank you for registering for our upcoming Turner Hopkins immigration seminar.',
    '',
    'We are pleased to confirm that your registration has been approved. The seminar details are below:',
    '',
    `Seminar: ${seminar.title || 'Turner Hopkins immigration seminar'}`,
    `Presenter: ${seminar.presenterName || 'Turner Hopkins adviser'}`,
    `New Zealand time: ${timeSummary.nzTime}`,
    `Your local time: ${timeSummary.localTime}`,
    '',
    `Zoom link: ${seminar.zoomLink || 'To be confirmed'}`,
    `Zoom password: ${seminar.zoomPassword || 'To be confirmed'}`,
    '',
    'Please keep these details handy and join a few minutes before the seminar is due to start.',
    '',
    'Kind regards,',
  ].join('\n');
  return {
    to,
    subject: 'Your Turner Hopkins seminar invitation',
    bodyText,
    bodyHtml: seminarEmailHtml(bodyText),
  };
}

function seminarEmailHtml(bodyText = '') {
  const paragraphs = String(bodyText || '').split(/\n{2,}/).map((paragraph) => {
    const escaped = escapeHtml(paragraph).replace(/\n/g, '<br>');
    return `<p style="margin:0 0 10px 0; padding:0; line-height:1.3;">${linkifyHtml(escaped)}</p>`;
  }).join('');
  return `<div style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #1f2933;">${paragraphs}${buildEmailSignatureSpacer(18)}</div>`;
}

function linkifyHtml(html = '') {
  return String(html).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#003736; font-weight:700;">$1</a>');
}

function firstNameFromFullName(value = '') {
  return String(value || '').trim().split(/\s+/)[0] || '';
}


function normaliseSeminarTimeInput(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm)?$/);
  if (!match) return /^\d{2}:\d{2}$/.test(raw) ? raw : cleanIntakeText(value, 40);
  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  const marker = match[3] || '';
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return cleanIntakeText(value, 40);
  if (marker === 'pm' && hour < 12) hour += 12;
  if (marker === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return cleanIntakeText(value, 40);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildSeminarTimeSummary(seminar = {}, registrantTimezone = '') {
  const zone = seminar.timezone || 'Pacific/Auckland';
  const date = seminar.seminarDate || '';
  const time = normaliseSeminarTimeInput(seminar.seminarTime || '');
  if (!date || !time) return { nzTime: 'To be confirmed', localTime: 'To be confirmed' };
  const instant = zonedDateTimeToDate(date, time, zone);
  const nzTime = formatDateInZone(instant, zone, 'New Zealand time');
  const localZone = isUsableTimeZone(registrantTimezone) ? registrantTimezone : '';
  const localTime = localZone ? formatDateInZone(instant, localZone, localZone) : 'Could not be calculated from the timezone provided';
  return { nzTime, localTime };
}

function zonedDateTimeToDate(dateValue = '', timeValue = '', timeZone = 'Pacific/Auckland') {
  const [year, month, day] = String(dateValue).split('-').map((value) => Number(value));
  const [hour, minute] = String(timeValue).split(':').map((value) => Number(value));
  if (!year || !month || !day) return new Date();
  let utc = Date.UTC(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const offset = timeZoneOffsetMs(timeZone, new Date(utc));
    utc = Date.UTC(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0) - offset;
  }
  return new Date(utc);
}

function timeZoneOffsetMs(timeZone, date) {
  try {
    const parts = new Intl.DateTimeFormat('en-NZ', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(date);
    const data = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return Date.UTC(Number(data.year), Number(data.month) - 1, Number(data.day), Number(data.hour), Number(data.minute), Number(data.second)) - date.getTime();
  } catch {
    return 0;
  }
}

function formatDateInZone(date, timeZone, label = '') {
  try {
    const formatted = new Intl.DateTimeFormat('en-NZ', { timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date);
    return label && label !== timeZone ? `${formatted} (${label})` : formatted;
  } catch {
    return 'Could not be calculated from the timezone provided';
  }
}

function isUsableTimeZone(value = '') {
  try {
    if (!value) return false;
    new Intl.DateTimeFormat('en-NZ', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

async function sendTestEmail(input = {}, authUser = null) {
  const toEmail = String(input.toEmail || input.to_email || '').trim();
  const subject = String(input.subject || 'THiS CRM test email').trim() || 'THiS CRM test email';
  const bodyText = String(input.message || input.bodyText || input.body || '').trim() || 'This is a test email sent from THiS CRM.';
  if (!isValidEmailAddress(toEmail)) throw new Error('Enter a valid recipient email address.');

  const config = requireMicrosoftEmailConfig();
  const database = db();
  const sentBy = authUser?.email || authUser?.name || 'CRM adviser';
  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
    VALUES ('test', 'test', ${config.fromEmail}, ${config.fromName}, ${toEmail}, ${subject}, ${bodyText}, ${textToHtml(bodyText)}, 'Sending', ${sentBy})
    RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText, bodyHtml: textToHtml(bodyText) });
    const [updated] = await database.sql`
      UPDATE email_notifications
         SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(updated);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1000);
    const [failed] = await database.sql`
      UPDATE email_notifications
         SET status = 'Failed', failed_at = NOW(), failure_message = ${message}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(failed);
  }
}


async function sendContactIntakeInviteEmail(input = {}, authUser = null) {
  const contact = normaliseIntakeInput(input);
  if (!isValidEmailAddress(contact.email)) throw new Error('This contact form does not have a valid email address.');

  const advisers = await db().sql`SELECT id, name, email FROM advisers ORDER BY name ASC`;
  const adviser = advisers.find((item) => String(item.id || '') === String(contact.assignedAdviserId || '')) || null;
  const adviserEmail = String(adviser?.email || '').trim();
  const ccEmail = isValidEmailAddress(adviserEmail) ? adviserEmail : '';
  const fallbackDraft = buildContactIntakeInviteEmailContent(contact);
  const config = requireMicrosoftEmailConfig();
  const database = db();
  const sentBy = authUser?.email || authUser?.name || 'CRM adviser';
  const intakeFormLink = String(process.env.PUBLIC_INTAKE_FORM_URL || 'https://www.turnerhopkinsimmigration.co.nz/assessment').trim() || 'https://www.turnerhopkinsimmigration.co.nz/assessment';
  const emailContent = await buildEmailFromTemplate('contact_intake_invite', {
    firstName: String(contact.firstName || '').trim() || 'there',
    applicantName: [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || contact.email || 'contact',
    assessmentFormUrl: intakeFormLink,
  }, fallbackDraft);
  const emailDraft = { to: fallbackDraft.to, ...emailContent };

  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, intake_id, template_key, from_email, from_name, to_email, cc, subject, body_text, body_html, status, sent_by)
    VALUES ('intake', ${nullableUuid(contact.id)}, ${nullableUuid(contact.id)}, 'contact_intake_invite', ${config.fromEmail}, ${config.fromName}, ${emailDraft.to}, ${ccEmail}, ${emailDraft.subject}, ${emailDraft.bodyText}, ${emailDraft.bodyHtml}, 'Sending', ${sentBy})
    RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({
      config,
      token,
      toEmail: emailDraft.to,
      ccEmail,
      subject: emailDraft.subject,
      bodyText: emailDraft.bodyText,
      bodyHtml: emailDraft.bodyHtml,
    });
    const [updated] = await database.sql`
      UPDATE email_notifications
         SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(updated);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1000);
    const [failed] = await database.sql`
      UPDATE email_notifications
         SET status = 'Failed', failed_at = NOW(), failure_message = ${message}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(failed);
  }
}

function buildContactIntakeInviteEmailContent(contact = {}) {
  const firstName = String(contact.firstName || '').trim() || 'there';
  const to = String(contact.email || '').trim();
  const intakeFormLink = String(process.env.PUBLIC_INTAKE_FORM_URL || '').trim()
    || 'https://www.turnerhopkinsimmigration.co.nz/assessment';
  const bodyText = [
    `Hi ${firstName},`,
    '',
    'Thank you for contacting Turner Hopkins Immigration Specialists.',
    '',
    'Based on the information you have sent through, the best next step is for you to complete our full immigration assessment form. This gives us the details we need to properly consider your circumstances and identify the most suitable visa pathway.',
    '',
    `You can complete the assessment form here: ${intakeFormLink}`,
    '',
    'Once we receive your completed form, one of our team will review the information and come back to you about the next steps.',
    '',
    'Please include as much detail as you can, especially around your current visa situation, immigration goal, employment, qualifications, partnership/family circumstances, and any health or character matters that may be relevant.',
    '',
    'Kind regards,',
  ].join('\n');

  return {
    to,
    subject: 'Next step: please complete our full immigration assessment form',
    bodyText,
    bodyHtml: buildContactIntakeInviteEmailHtml(firstName, intakeFormLink),
  };
}

function buildContactIntakeInviteEmailHtml(firstName = 'there', intakeFormLink = '') {
  const p = (text, marginBottom = 10) => `<p style="margin:0 0 ${marginBottom}px 0; padding:0; line-height:1.3; mso-margin-top-alt:0; mso-margin-bottom-alt:${marginBottom}px;">${escapeHtml(text)}</p>`;
  const safeLink = escapeHtml(intakeFormLink);
  return `<div style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #1f2933;">
${p(`Hi ${firstName},`, 10)}
${p('Thank you for contacting Turner Hopkins Immigration Specialists.', 10)}
${p('Based on the information you have sent through, the best next step is for you to complete our full immigration assessment form. This gives us the details we need to properly consider your circumstances and identify the most suitable visa pathway.', 10)}
<p style="margin:0 0 10px 0; padding:0; line-height:1.3; mso-margin-top-alt:0; mso-margin-bottom-alt:10px;">You can complete the assessment form here:<br><a href="${safeLink}" style="color:#003736; font-weight:700;">${safeLink}</a></p>
${p('Once we receive your completed form, one of our team will review the information and come back to you about the next steps.', 10)}
${p('Please include as much detail as you can, especially around your current visa situation, immigration goal, employment, qualifications, partnership/family circumstances, and any health or character matters that may be relevant.', 10)}
${p('Kind regards,', 0)}
${buildEmailSignatureSpacer(18)}
</div>`;
}

async function sendIntakeOutcomeEmail(input = {}, outcome = 'approve', authUser = null) {
  const intake = normaliseIntakeInput(input);
  if (!isValidEmailAddress(intake.email)) throw new Error('This intake record does not have a valid applicant email address.');

  const advisers = await db().sql`SELECT id, name, email FROM advisers ORDER BY name ASC`;
  const adviser = advisers.find((item) => String(item.id || '') === String(intake.assignedAdviserId || '')) || null;
  const adviserEmail = String(adviser?.email || '').trim();
  const fallbackDraft = buildIntakeOutcomeEmailContent(intake, adviser, outcome);
  const config = requireMicrosoftEmailConfig();
  const database = db();
  const sentBy = authUser?.email || authUser?.name || 'CRM adviser';
  const templateKey = outcome === 'decline' ? 'intake_decline' : 'intake_approve';
  const ccEmail = isValidEmailAddress(adviserEmail) ? adviserEmail : '';
  const applicantName = [intake.firstName, intake.lastName].filter(Boolean).join(' ').trim() || 'your enquiry';
  const emailContent = await buildEmailFromTemplate(templateKey, {
    firstName: String(intake.firstName || '').trim() || 'there',
    applicantName,
    allocatedTo: isValidEmailAddress(adviserEmail) ? adviserEmail : '[Allocated To]',
  }, fallbackDraft);
  const emailDraft = { to: fallbackDraft.to, ...emailContent };

  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, intake_id, template_key, from_email, from_name, to_email, cc, subject, body_text, body_html, status, sent_by)
    VALUES ('intake', ${nullableUuid(intake.id)}, ${nullableUuid(intake.id)}, ${templateKey}, ${config.fromEmail}, ${config.fromName}, ${emailDraft.to}, ${ccEmail}, ${emailDraft.subject}, ${emailDraft.bodyText}, ${emailDraft.bodyHtml}, 'Sending', ${sentBy})
    RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({
      config,
      token,
      toEmail: emailDraft.to,
      ccEmail,
      subject: emailDraft.subject,
      bodyText: emailDraft.bodyText,
      bodyHtml: emailDraft.bodyHtml,
    });
    const [updated] = await database.sql`
      UPDATE email_notifications
         SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(updated);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1000);
    const [failed] = await database.sql`
      UPDATE email_notifications
         SET status = 'Failed', failed_at = NOW(), failure_message = ${message}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(failed);
  }
}

function buildIntakeOutcomeEmailContent(intake = {}, adviser = null, outcome = 'approve') {
  const applicantName = [intake.firstName, intake.lastName].filter(Boolean).join(' ').trim() || 'your enquiry';
  const firstName = String(intake.firstName || '').trim() || 'there';
  const adviserEmail = String(adviser?.email || '').trim();
  const allocatedTo = isValidEmailAddress(adviserEmail) ? adviserEmail : '[Allocated To]';
  const to = String(intake.email || '').trim();

  if (outcome === 'decline') {
    const bodyLines = [
      `Hello ${firstName},`,
      '',
      'Thank you for completing the Turner Hopkins assessment questionnaire.',
      '',
      'We have reviewed the information you provided. Based on the details supplied, it does not look like we are the right fit to assist with an immigration pathway at this stage.',
      '',
      'This is a preliminary response based on the questionnaire only, not a full immigration assessment. If your circumstances change, or if there is important information you think has not been captured, you are welcome to reply with those details and we can reconsider whether a consultation would be useful.',
    ];
    const bodyText = bodyLines.join('\n');
    return {
      to,
      subject: `Turner Hopkins assessment questionnaire - ${applicantName}`,
      bodyText,
      bodyHtml: compactEmailHtml(bodyText),
    };
  }

  const bodyText = [
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
    'I look forward to hearing from you in due course.',
  ].join('\n');

  return {
    to,
    subject: `Turner Hopkins assessment questionnaire - next steps for ${applicantName}`,
    bodyText,
    bodyHtml: buildApprovalEmailHtml(firstName, allocatedTo),
  };
}

function buildEmailSignatureSpacer(height = 22) {
  return `<div style="height:${height}px; line-height:${height}px; font-size:${height}px; mso-line-height-rule:exactly;">&nbsp;</div>`;
}

function compactEmailHtml(bodyText = '') {
  const paragraphs = String(bodyText || '').split(/\n{2,}/).filter((paragraph) => paragraph.trim());
  return `<div style="font-family: Aptos, Arial, sans-serif; font-size: 11pt; line-height: 1.3; color: #1f2933;">
${paragraphs
  .map((paragraph) => `<p style="margin: 0 0 10px 0; padding: 0; line-height: 1.3; mso-margin-top-alt: 0; mso-margin-bottom-alt: 10px;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
  .join('\n')}
${buildEmailSignatureSpacer(22)}
</div>`;
}

function buildApprovalEmailHtml(firstName = 'there', allocatedTo = '[Allocated To]') {
  const p = (text, marginBottom = 10) => `<p style="margin:0 0 ${marginBottom}px 0; padding:0; line-height:1.3; mso-margin-top-alt:0; mso-margin-bottom-alt:${marginBottom}px;">${escapeHtml(text)}</p>`;
  const gap = (height = 8) => `<div style="height:${height}px; line-height:${height}px; font-size:${height}px; mso-line-height-rule:exactly;">&nbsp;</div>`;
  const li = (text) => `<li style="margin:0 0 6px 0; padding:0 0 0 2px; line-height:1.3;">${escapeHtml(text)}</li>`;
  return `<div style="font-family: Aptos, Arial, sans-serif; font-size: 11pt; line-height: 1.3; color: #1f2933;">
${p(`Dear ${firstName},`, 10)}
${p('Thank you for completing our online assessment questionnaire, which we have now received and reviewed, along with your CV and attachments.', 10)}
${p('It does appear, based on the information you have provided, that there is potentially a pathway available to you under one of our skilled migrant pathways, however this would be dependent on several things including the following:', 8)}
<ul style="margin:0 0 16px 20px; padding:0; line-height:1.3;">
${li('A review of your information to explore the various details including your skills and experience and the need for those to be assessed here in NZ, your employability and potential earnings as well as your personal data and health and character details.')}
${li('Establishing the timelines involved and how each step fits together - this includes discussing, the documentation required, the criteria you need to meet and a road map as to how all of these steps will fit together.')}
${li('Discussing the process to secure an offer of skilled employment in New Zealand to qualify under one of our various skilled migration pathways (most application pathways are dependent on being able to secure the right kind of employment in New Zealand)')}
</ul>
${gap(6)}
${p('For us to be able to outline this process in detail, including the steps mentioned above, as well as being able to establish the right strategy for you, we would need to book you in for a one-to-one consultation.', 10)}
${p('This consultation process will allow us to work through your information in greater detail, ask some additional questions and then outline a clear pathway for you and your family (if applicable) to make the move. It also gives you an opportunity to ask questions of me and for us to explore the process together, so you can make an informed decision as to whether to proceed further.', 10)}
${p('We have two options available for the consultation process:', 8)}
<ul style="margin:0 0 16px 20px; padding:0; line-height:1.3;">
${li('A brief 15-minute overview (at no charge) of the process via Teams or Zoom, which will give you a very basic summary as to your eligibility. We stick to a very strict 15-minute timeframe for these discussions.')}
${li('A more detailed assessment over Teams or Zoom, usually lasting for at least an hour, during which we map out the process for you and explain the various steps, costs and timelines. This assessment comes with a charge of NZD$400.00, which can be paid online.')}
</ul>
${gap(6)}
${p('Moving to another country is a complex process, particularly in the current environment as the demand for Visas and opportunities in New Zealand continues to increase. If you are seriously considering the move, then having a well laid out plan is vital.', 10)}
${p(`If you wish to move ahead with this assessment, please email us directly: ${allocatedTo} (do not reply to this email) and indicate which assessment option you would prefer to take.`, 10)}
${p('I look forward to hearing from you in due course.', 0)}
${buildEmailSignatureSpacer(24)}
</div>`;
}

async function sendPortalAccessEmail(client = {}, accessCode = '', authUser = null) {
  const portalEmail = String(client.portalEmail || client.email || '').trim();
  if (!isValidEmailAddress(portalEmail)) throw new Error('Client portal email is not valid.');
  if (!String(accessCode || '').trim()) throw new Error('A new portal access code is required before sending portal access details.');

  const config = requireMicrosoftEmailConfig();
  const database = db();
  await pruneOldEmailNotifications(database);
  const sentBy = authUser?.email || authUser?.name || 'CRM adviser';
  const firstName = String(client.firstName || '').trim() || 'there';
  const baseUrl = String(process.env.URL || process.env.DEPLOY_URL || '').replace(/\/$/, '') || 'https://this-crm.netlify.app';
  const portalLink = `${baseUrl}/portal`;
  const fallback = {
    subject: 'Your Turner Hopkins client portal access',
    bodyText: [
      `Dear ${firstName},`,
      '',
      'We have set up your Turner Hopkins client portal so you can view the latest information we have published about your application progress.',
      '',
      `Portal link: ${portalLink}`,
      `Login email / username: ${portalEmail}`,
      `Access code: ${accessCode}`,
      '',
      'The portal is a secure, read-only space where you can check application updates, view documents we have made available to you, and send notes or questions to your adviser.',
      '',
      'We will continue to contact you by email as usual when we need anything further.',
    ].join('\n'),
  };
  const emailDraft = await buildEmailFromTemplate('portal_access', { firstName, portalLink, portalEmail, accessCode }, fallback);

  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, client_id, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
    VALUES ('client', ${nullableUuid(client.id)}, ${nullableUuid(client.id)}, 'portal_access', ${config.fromEmail}, ${config.fromName}, ${portalEmail}, ${emailDraft.subject}, ${emailDraft.bodyText}, ${emailDraft.bodyHtml}, 'Sending', ${sentBy})
    RETURNING id`;

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail: portalEmail, subject: emailDraft.subject, bodyText: emailDraft.bodyText, bodyHtml: emailDraft.bodyHtml });
    const [updated] = await database.sql`
      UPDATE email_notifications
         SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(updated);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1000);
    const [failed] = await database.sql`
      UPDATE email_notifications
         SET status = 'Failed', failed_at = NOW(), failure_message = ${message}, updated_at = NOW()
       WHERE id = ${created.id}
       RETURNING id, template_key, from_email, from_name, to_email, cc, bcc, subject, body_text, body_html, status, sent_by, sent_at, failed_at, failure_message, created_at`;
    return mapEmailLogFromDb(failed);
  }
}

function requireMicrosoftEmailConfig() {
  const tenantId = String(process.env.MICROSOFT_TENANT_ID || '').trim();
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  const fromEmail = String(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz').trim();
  const fromName = String(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists').trim();
  const missing = [];
  if (!tenantId) missing.push('MICROSOFT_TENANT_ID');
  if (!clientId) missing.push('MICROSOFT_CLIENT_ID');
  if (!clientSecret) missing.push('MICROSOFT_CLIENT_SECRET');
  if (!fromEmail) missing.push('MICROSOFT_NOTIFICATION_FROM_EMAIL');
  if (missing.length) throw new Error(`Missing Microsoft email environment variables: ${missing.join(', ')}`);
  return { tenantId, clientId, clientSecret, fromEmail, fromName };
}

async function getMicrosoftGraphAccessToken(config) {
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Microsoft token request failed with status ${response.status}`);
  }
  return payload.access_token;
}

async function sendMicrosoftGraphEmail({ config, token, toEmail, ccEmail = '', bccEmail = '', subject, bodyText, bodyHtml }) {
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`;
  const toRecipients = normaliseEmailRecipientList(toEmail);
  const ccRecipients = normaliseEmailRecipientList(ccEmail);
  const bccRecipients = normaliseEmailRecipientList(bccEmail);
  if (!toRecipients.length) throw new Error('At least one valid email recipient is required.');
  const message = {
    subject,
    body: {
      contentType: 'HTML',
      content: bodyHtml || textToHtml(bodyText),
    },
    toRecipients,
  };
  if (ccRecipients.length) message.ccRecipients = ccRecipients;
  if (bccRecipients.length) message.bccRecipients = bccRecipients;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'outlook.timezone="Pacific/Auckland"',
    },
    body: JSON.stringify({
      message,
      saveToSentItems: true,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json?.error?.message || json?.error_description || text;
    } catch {}
    throw new Error(detail || `Microsoft Graph sendMail failed with status ${response.status}`);
  }
  return { requestId: response.headers.get('request-id') || response.headers.get('client-request-id') || '' };
}


function normaliseEmailRecipientList(value = '') {
  const list = Array.isArray(value) ? value : String(value || '').split(/[;,]/);
  return list
    .map((address) => String(address || '').trim())
    .filter((address) => isValidEmailAddress(address))
    .map((address) => ({ emailAddress: { address } }));
}

function textToHtml(value = '') {
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isValidEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

async function seedSampleData() {
  const database = db();
  const countRows = await database.sql`SELECT COUNT(*)::int AS count FROM advisers`;
  if (Number(countRows[0]?.count || 0) > 0) return;

  const poolClient = await database.pool.connect();
  try {
    await poolClient.query('BEGIN');

    const paul = await insertAdviser(poolClient, ['Paul Janssen', 'General Manager / LIA', 'paul.janssen@turnerhopkins.co.nz', '', '200800705', true]);
    const sejoo = await insertAdviser(poolClient, ['Sejoo Han', 'Licensed Immigration Adviser', '', '', '', true]);
    const nadia = await insertAdviser(poolClient, ['Nadia', 'Licensed Immigration Adviser', '', '', '', true]);

    await insertSeedClient(poolClient, {
      firstName: 'Aroha', lastName: 'Singh', email: 'aroha@example.com', phone: '+64 21 000 000', nationality: 'India', dateOfBirth: '1988-04-14', location: 'Auckland', familyMembers: [{ relationship: 'Spouse/Partner', name: 'Ravi Singh', nationality: 'India', dateOfBirth: '1986-09-03' }, { relationship: 'Child', name: 'Maya Singh', nationality: 'India', dateOfBirth: '2017-02-20' }], matterName: '', caseStrategy: 'AEWV renewal strategy: confirm employer accreditation and job details, check current visa expiry, gather updated employment and identity documents, and file before the agreed deadline.', caseType: 'AEWV Only', primaryAdviserId: paul, backupAdviserId: sejoo, priority: 'High', clientStatus: 'Active', nextAction: 'Draft application and send document gaps to client.', nextActionDue: daysFromNow(2), notes: 'Employer has provided supplementary information. Check INZ form version before filing.',
      appliedStageIds: ['instruction-sent', 'documentation-gathering', 'work-visa-ready'], completedStageIds: ['instruction-sent', 'documentation-gathering'],
      deadlines: [{ type: 'Visa Expiry Date', date: daysFromNow(42), note: 'Current AEWV expires.' }, { type: 'Filing Deadline Date', date: daysFromNow(9), note: 'Target filing date.' }, { type: 'Medical Expiry Date', date: daysFromNow(80), note: 'Check if new medical required.' }],
      billing: [{ milestone: 'Deposit', dueDate: daysFromNow(-8), amount: 1200, status: 'Invoiced', invoiceNo: 'INV-1042', triggerType: 'Date' }, { milestone: 'Work visa ready billing', dueDate: '', amount: 1800, status: 'WIP', invoiceNo: '', triggerType: 'Milestone', stageKey: 'work-visa-ready' }],
    });

    await insertSeedClient(poolClient, {
      firstName: 'Megan', lastName: 'Blake', email: 'megan@example.com', phone: '+64 27 000 000', nationality: 'United Kingdom', dateOfBirth: '1991-11-06', location: 'Christchurch', familyMembers: [{ relationship: 'Spouse/Partner', name: 'Daniel Blake', nationality: 'New Zealand', dateOfBirth: '1989-03-18' }], matterName: '', caseStrategy: 'Partnership strategy: assess relationship evidence, identify any gaps in living-together or financial evidence, prepare temporary pathway first if needed, then progress residence.', caseType: 'Partner Residence', primaryAdviserId: sejoo, backupAdviserId: paul, priority: 'Normal', clientStatus: 'Active', nextAction: 'Review relationship evidence checklist.', nextActionDue: daysFromNow(7), notes: 'Client needs plain-English explanation of evidence gaps.',
      appliedStageIds: ['instruction-sent', 'documentation-gathering', 'family-temporary-visas-ready', 'residence-ready', 'residence-approved'], completedStageIds: ['instruction-sent'],
      deadlines: [{ type: 'Police Clearance Expiry Date', date: daysFromNow(63), note: 'UK police certificate.' }, { type: 'Filing Deadline Date', date: daysFromNow(28), note: 'Temporary visa first.' }],
      billing: [{ milestone: 'Deposit', dueDate: daysFromNow(-2), amount: 950, status: 'Invoiced', invoiceNo: 'INV-1044', triggerType: 'Date' }, { milestone: 'Residence ready billing', dueDate: '', amount: 950, status: 'WIP', invoiceNo: '', triggerType: 'Milestone', stageKey: 'residence-ready' }],
    });

    await insertSeedClient(poolClient, {
      firstName: 'Johan', lastName: 'van der Merwe', email: 'johan@example.com', phone: '+64 22 000 000', nationality: 'South Africa', dateOfBirth: '1983-07-22', location: 'Tauranga', familyMembers: [], matterName: '', caseStrategy: 'SMC strategy: confirm points position, skilled employment evidence and occupational fit before deciding whether to proceed under the points pathway.', caseType: 'SMC Residence - Points', primaryAdviserId: nadia, backupAdviserId: paul, priority: 'Normal', clientStatus: 'Active', nextAction: 'Confirm points assessment and employment documentation.', nextActionDue: daysFromNow(5), notes: 'Initial advice call completed. Awaiting employment agreement and role description.',
      appliedStageIds: ['instruction-sent', 'documentation-gathering', 'residence-ready', 'residence-approved'], completedStageIds: ['instruction-sent'],
      deadlines: [{ type: 'Filing Deadline Date', date: daysFromNow(45), note: 'Subject to document readiness.' }, { type: 'Police Clearance Expiry Date', date: daysFromNow(100), note: 'South African police clearance.' }],
      billing: [{ milestone: 'Eligibility advice', dueDate: daysFromNow(3), amount: 750, status: 'WIP', invoiceNo: '', triggerType: 'Date' }],
    });

    await poolClient.query('COMMIT');
  } catch (error) {
    await poolClient.query('ROLLBACK');
    throw error;
  } finally {
    poolClient.release();
  }
}

async function insertAdviser(client, values) {
  const result = await client.query(
    `INSERT INTO advisers (name, role, email, phone, licence, active, availability_status) VALUES ($1, $2, $3, $4, $5, $6, 'Available') RETURNING id`,
    values
  );
  return result.rows[0].id;
}

async function insertSeedClient(poolClient, seed) {
  const result = await poolClient.query(
    `INSERT INTO clients (first_name, last_name, email, phone, nationality, date_of_birth, location, sharepoint_folder_url, one_law_client_number, matter_name, case_strategy, case_type, primary_adviser_id, backup_adviser_id, priority, client_status, next_action, next_action_due, notes, family_members, document_checklist, next_action_log)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21::jsonb, $22::jsonb)
     RETURNING id`,
    [seed.firstName, seed.lastName, seed.email, seed.phone, seed.nationality, nullableDate(seed.dateOfBirth), seed.location, seed.sharepointFolderUrl || '', seed.oneLawClientNumber || '', seed.matterName || '', seed.caseStrategy || '', seed.caseType, seed.primaryAdviserId, seed.backupAdviserId, seed.priority, seed.clientStatus, seed.nextAction, seed.nextActionDue, seed.notes, JSON.stringify(seed.familyMembers || []), JSON.stringify(seed.documentChecklist || buildDocumentChecklist()), JSON.stringify(seed.nextActionLog || [])]
  );
  const clientId = result.rows[0].id;
  const stages = normaliseStages(buildStages(seed.appliedStageIds, seed.completedStageIds));
  for (const stage of stages) {
    await poolClient.query(
      `INSERT INTO client_stages (client_id, stage_key, stage_label, mandatory, applied, completed, completed_date, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [clientId, stage.id, stage.label, stage.mandatory, stage.applied, stage.completed, stage.completedDate || null, stage.sortOrder]
    );
  }
  for (const deadline of seed.deadlines || []) {
    await poolClient.query(`INSERT INTO client_deadlines (client_id, deadline_type, deadline_date, note) VALUES ($1, $2, $3, $4)`, [clientId, deadline.type, deadline.date, deadline.note || '']);
  }
  for (const item of seed.billing || []) {
    await poolClient.query(`INSERT INTO billing_milestones (client_id, milestone, due_date, amount, status, invoice_no, billing_trigger_type, billing_stage_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [clientId, item.milestone, item.dueDate || null, item.amount, normaliseBillingStatus(item.status), item.invoiceNo || '', normaliseBillingTriggerType(item.triggerType), item.stageKey || null]);
  }
}


function normaliseBillingStatus(status) {
  const value = String(status || '').trim();
  if (value === 'Overdue') return 'Overdue';
  if (value === 'Invoiced' || value === 'Paid') return 'Invoiced';
  return 'WIP';
}

function normaliseBillingTriggerType(value) {
  return String(value || '').trim() === 'Milestone' ? 'Milestone' : 'Date';
}

function normalisePersonalTaskStatus(value) {
  return String(value || '').trim() === 'Completed' ? 'Completed' : 'Open';
}

function normalisePersonalTaskInput(input = {}) {
  return {
    id: input.id,
    adviserId: input.adviserId || '',
    clientId: input.clientId || '',
    title: String(input.title || '').trim(),
    dueDate: nullableDate(input.dueDate) || '',
    status: normalisePersonalTaskStatus(input.status),
    note: String(input.note || '').trim(),
  };
}


function normaliseAppointmentType(value) {
  const type = String(value || '').trim();
  return APPOINTMENT_TYPES.includes(type) ? type : APPOINTMENT_TYPES[0];
}

function normaliseCalendarEntryInput(input = {}) {
  return {
    id: input.id,
    clientId: input.clientId || '',
    adviserId: input.adviserId || '',
    title: String(input.title || '').trim() || 'Appointment',
    appointmentType: normaliseAppointmentType(input.appointmentType),
    appointmentDate: nullableDate(input.appointmentDate) || todayDateOnly(),
    startTime: /^\d{2}:\d{2}$/.test(String(input.startTime || '')) ? String(input.startTime) : '',
    endTime: /^\d{2}:\d{2}$/.test(String(input.endTime || '')) ? String(input.endTime) : '',
    location: String(input.location || '').trim(),
    notes: String(input.notes || '').trim(),
    status: String(input.status || '').trim() === 'Completed' ? 'Completed' : 'Open',
  };
}

function normaliseBillingItems(inputItems = []) {
  if (!Array.isArray(inputItems)) return [];
  return inputItems.map((item) => ({
    id: item.id,
    milestone: String(item.milestone || '').trim(),
    dueDate: nullableDate(item.dueDate) || '',
    amount: Number(item.amount || 0),
    status: normaliseBillingStatus(item.status),
    invoiceNo: String(item.invoiceNo || '').trim(),
    triggerType: normaliseBillingTriggerType(item.triggerType),
    stageKey: normaliseStageKey(String(item.stageKey || '').trim()),
  })).filter((item) => item.milestone || item.dueDate || item.amount || item.invoiceNo || item.stageKey);
}

function normaliseNextActionLog(items = []) {
  const input = Array.isArray(items) ? items : [];
  return input
    .map((item, index) => ({
      id: String(item.id || `next-action-log-${Date.now()}-${index}`).trim(),
      action: String(item.action || item.nextAction || '').trim(),
      dueDate: nullableDate(item.dueDate || item.nextActionDue) || '',
      completedDate: nullableDate(item.completedDate) || '',
      completedAt: String(item.completedAt || '').trim(),
      replacedByAction: String(item.replacedByAction || '').trim(),
      replacedByDueDate: nullableDate(item.replacedByDueDate) || '',
    }))
    .filter((item) => item.action || item.dueDate)
    .slice(-200);
}

function parseNextActionLog(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normaliseNextActionLog(value);
  try {
    return normaliseNextActionLog(JSON.parse(value));
  } catch {
    return [];
  }
}

function buildNextActionLog(existing, client) {
  const previousAction = String(existing?.next_action || '').trim();
  const previousDueDate = toDateOnly(existing?.next_action_due);
  const nextAction = String(client.nextAction || '').trim();
  const nextDueDate = nullableDate(client.nextActionDue) || '';
  const actionChanged = previousAction !== nextAction || previousDueDate !== nextDueDate;
  const hadPreviousAction = Boolean(previousAction || previousDueDate);
  const log = normaliseNextActionLog(existing?.next_action_log);

  if (!actionChanged || !hadPreviousAction) return log;

  const last = log[log.length - 1];
  const alreadyLogged = last && last.action === previousAction && last.dueDate === previousDueDate && last.replacedByAction === nextAction && last.replacedByDueDate === nextDueDate;
  if (alreadyLogged) return log;

  return normaliseNextActionLog([
    ...log,
    {
      id: `next-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: previousAction,
      dueDate: previousDueDate,
      completedDate: todayDateOnly(),
      completedAt: new Date().toISOString(),
      replacedByAction: nextAction,
      replacedByDueDate: nextDueDate,
    },
  ]);
}


function normaliseLibraryEntryInput(input = {}) {
  return {
    id: input.id || '',
    entryType: normaliseLibraryEntryType(input.entryType || input.entry_type),
    referenceCode: String(input.referenceCode || input.reference_code || '').trim(),
    title: String(input.title || '').trim(),
    category: normaliseLibraryCategory(input.category),
    status: normaliseLibraryStatus(input.status),
    officialUrl: String(input.officialUrl || input.official_url || '').trim(),
    versionLabel: String(input.versionLabel || input.version_label || '').trim(),
    acceptableUntil: nullableDate(input.acceptableUntil || input.acceptable_until) || '',
    relatedCaseTypes: parseJsonArray(input.relatedCaseTypes || input.related_case_types).filter((item) => CASE_TYPES.includes(item)),
    relatedDocumentItems: parseJsonArray(input.relatedDocumentItems || input.related_document_items).map((item) => String(item || '').trim()).filter(Boolean).slice(0, 50),
    internalSummary: String(input.internalSummary || input.internal_summary || '').trim(),
    adviserNotes: String(input.adviserNotes || input.adviser_notes || '').trim(),
    lastReviewed: nullableDate(input.lastReviewed || input.last_reviewed) || '',
    nextReviewDue: nullableDate(input.nextReviewDue || input.next_review_due) || '',
    reviewedBy: String(input.reviewedBy || input.reviewed_by || '').trim(),
  };
}

function normaliseLibraryEntryType(value) {
  return value === 'Form' ? 'Form' : 'Policy';
}

function normaliseLibraryStatus(value) {
  return LIBRARY_STATUSES.includes(value) ? value : 'Current';
}

function normaliseLibraryCategory(value) {
  return LIBRARY_CATEGORIES.includes(value) ? value : 'General';
}


function parseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function hashPortalAccessCode(code) {
  const salt = crypto.randomBytes(16).toString('hex');
  const canonicalCode = normalisePortalAccessCodeForStorage(code);
  const hash = crypto.pbkdf2Sync(canonicalCode, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

function normalisePortalAccessCodeForStorage(code) {
  return String(code || '').trim().replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, '').toUpperCase();
}

function toDateTimeLabel(value) {
  if (!value) return '';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
  } catch {
    return '';
  }
}


function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}


function parsePortalResourceSettings(value) {
  if (!value) return normalisePortalResourceSettings({});
  if (typeof value === 'object') return normalisePortalResourceSettings(value);
  try {
    return normalisePortalResourceSettings(JSON.parse(value));
  } catch {
    return normalisePortalResourceSettings({});
  }
}

function normalisePortalResourceSettings(value = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return PORTAL_RESOURCE_KEYS.reduce((settings, key) => {
    const raw = input[key];
    if (typeof raw === 'boolean') {
      settings[key] = { enabled: raw, clientNote: '' };
    } else if (raw && typeof raw === 'object') {
      settings[key] = {
        enabled: Boolean(raw.enabled),
        clientNote: String(raw.clientNote || raw.client_note || raw.note || '').trim().slice(0, 1200),
      };
    } else {
      settings[key] = { enabled: false, clientNote: '' };
    }
    return settings;
  }, {});
}

function normaliseClientInput(input) {
  const client = {
    id: input.id,
    firstName: input.firstName || '',
    lastName: input.lastName || 'Unnamed client',
    email: input.email || '',
    phone: input.phone || '',
    nationality: input.nationality || '',
    dateOfBirth: input.dateOfBirth || '',
    location: input.location || '',
    sharepointFolderUrl: input.sharepointFolderUrl || '',
    oneLawClientNumber: String(input.oneLawClientNumber || input.one_law_client_number || '').trim(),
    matterName: input.matterName || '',
    caseStrategy: input.caseStrategy || '',
    caseType: CASE_TYPES.includes(input.caseType) ? input.caseType : CASE_TYPES[0],
    primaryAdviserId: input.primaryAdviserId || '',
    backupAdviserId: input.backupAdviserId || '',
    priority: input.priority || 'Normal',
    clientStatus: input.clientStatus || 'Active',
    nextAction: input.nextAction || '',
    nextActionDue: input.nextActionDue || null,
    nextActionLog: normaliseNextActionLog(input.nextActionLog),
    portalEnabled: Boolean(input.portalEnabled) || Boolean(input.portalPublishNow),
    portalEmail: String(input.portalEmail || (input.portalPublishNow ? input.email : '') || '').trim(),
    portalStatusUpdate: String(input.portalStatusUpdate || '').trim(),
    portalNextStep: String(input.portalNextStep || '').trim(),
    portalVisibleDocumentIds: parseStringArray(input.portalVisibleDocumentIds),
    portalVisibleDeadlineIds: parseStringArray(input.portalVisibleDeadlineIds),
    portalVisibleAppointmentIds: parseStringArray(input.portalVisibleAppointmentIds),
    portalVisibleBillingIds: parseStringArray(input.portalVisibleBillingIds),
    portalResourceSettings: normalisePortalResourceSettings(input.portalResourceSettings),
    portalNewAccessCode: String(input.portalNewAccessCode || '').trim(),
    portalPublishNow: Boolean(input.portalPublishNow),
    notes: input.notes || '',
    stages: normaliseStages(input.stages || []),
    deadlines: Array.isArray(input.deadlines) ? input.deadlines : [],
    billing: normaliseBillingItems(input.billing),
    familyMembers: normaliseFamilyMembers(input.familyMembers),
    documentChecklist: normaliseDocumentChecklist(input.documentChecklist),
  };
  return client;
}


function normaliseFamilyMembers(inputMembers = []) {
  if (!Array.isArray(inputMembers)) return [];
  return inputMembers
    .map((member, index) => ({
      id: member.id || `member-${index}-${Date.now()}`,
      relationship: member.relationship === 'Spouse/Partner' ? 'Spouse/Partner' : 'Child',
      name: String(member.name || '').trim(),
      nationality: String(member.nationality || '').trim(),
      dateOfBirth: nullableDate(member.dateOfBirth) || '',
    }))
    .filter((member) => member.name || member.nationality || member.dateOfBirth);
}

function parseFamilyMembers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normaliseFamilyMembers(value);
  try {
    return normaliseFamilyMembers(JSON.parse(value));
  } catch {
    return [];
  }
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
      expiryDate: nullableDate(existing.expiryDate || existing.expiry_date) || '',
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
    .map((item, index) => {
      const applied = item.applied !== false;
      return {
        id: String(item.id || `custom-doc-${index + 1}`).trim(),
        name: String(item.name || 'Custom document').trim(),
        applied,
        custom: true,
        expiryDate: nullableDate(item.expiryDate || item.expiry_date) || '',
        obtained: applied ? Boolean(item.obtained) : false,
      };
    })
    .filter((item) => item.name);
  return [...templateRows, ...customRows];
}

function parseDocumentChecklist(value) {
  if (!value) return buildDocumentChecklist();
  if (Array.isArray(value)) return normaliseDocumentChecklist(value);
  try {
    return normaliseDocumentChecklist(JSON.parse(value));
  } catch {
    return buildDocumentChecklist();
  }
}

function normaliseStageKey(value) {
  const key = String(value || '').trim();
  return STAGE_KEY_ALIASES[key] || key;
}

function sortStages(stages = []) {
  return [...(stages || [])].sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999));
}

function reindexStages(stages = []) {
  return (stages || []).map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
}

function buildStages(appliedIds = [], completedIds = []) {
  const applied = new Set([...appliedIds.map(normaliseStageKey), ...STAGE_TEMPLATES.filter((stage) => stage.mandatory).map((stage) => stage.id)]);
  const completed = new Set(completedIds.map(normaliseStageKey));
  return STAGE_TEMPLATES.map((stage) => ({
    ...stage,
    custom: false,
    applied: stage.mandatory || applied.has(stage.id),
    completed: completed.has(stage.id),
    completedDate: completed.has(stage.id) ? daysFromNow(0) : '',
  }));
}

function normaliseStages(inputStages = []) {
  const input = Array.isArray(inputStages) ? inputStages : [];
  const templateKeys = new Set(STAGE_TEMPLATES.map((stage) => stage.id));
  const templateRows = STAGE_TEMPLATES.map((template) => {
    const existing = input.find((stage) => normaliseStageKey(stage.id || stage.stageKey) === template.id) || {};
    const applied = template.mandatory || Boolean(existing.applied);
    return {
      id: template.id,
      label: template.label,
      mandatory: template.mandatory,
      custom: false,
      applied,
      completed: applied ? Boolean(existing.completed) : false,
      completedDate: applied && existing.completed ? (existing.completedDate || daysFromNow(0)) : '',
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
        completedDate: applied && stage.completed ? (stage.completedDate || daysFromNow(0)) : '',
        sortOrder: Number.isFinite(Number(stage.sortOrder)) ? Number(stage.sortOrder) : STAGE_TEMPLATES.length + index + 1,
      };
    })
    .filter((stage) => stage.label);
  return reindexStages(sortStages([...templateRows, ...customRows]));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function nullableUuid(value) {
  return isUuid(value) ? value : null;
}

function nullableDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : null;
}

function toDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function todayDateOnly() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, authorization, x-crm-token',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function empty(statusCode = 204) {
  return {
    statusCode,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, authorization, x-crm-token',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: '',
  };
}
