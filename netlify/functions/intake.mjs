import { getDatabase } from '@netlify/database';
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const MAX_TEXT = 6000;
const INTAKE_UPLOAD_STORE = 'intake-uploads';
const MAX_INTAKE_UPLOAD_BYTES = 5 * 1024 * 1024;
const INTAKE_UPLOAD_KINDS = {
  applicantCv: 'Applicant CV',
  partnerCv: 'Partner CV',
};

const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'new_intake_adviser_notification',
    name: 'Contact/intake form - internal notification',
    description: 'Internal notification sent when a public contact form or full assessment form is submitted.',
    subject: '{{formKind}} submitted - {{applicantName}}',
    bodyText: `{{intro}}

Applicant: {{applicantName}}
Email: {{email}}
Phone: {{phone}}
Submitted: {{submitted}}
Flags: {{flags}}
Record ID: {{intakeId}}

Summary:
{{summary}}

Please review this in THiS CRM > Enquiries & Intake.`,
    placeholders: ['formKind', 'intro', 'applicantName', 'email', 'phone', 'submitted', 'flags', 'intakeId', 'summary'],
  },
];

const INTAKE_UPLOAD_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export default async function intakeRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    await ensureIntakeSchema();
    const url = new URL(request.url);
    if (url.searchParams.get('upload') === '1') return await handleIntakeUpload(request, url);

    const body = await request.json().catch(() => ({}));
    const payload = normalisePayload(body.payload || body);

    if (!payload.consentToContact || !payload.privacyAcknowledged) {
      return json({ error: 'Consent and privacy acknowledgement are required before submitting the intake form.' }, 400);
    }
    if (!payload.firstName || !payload.lastName || !payload.email) {
      return json({ error: 'First name, last name and email are required.' }, 400);
    }

    const expectedUploads = [];
    if (payload.applicantCvExpected) expectedUploads.push('applicantCv');
    if (payload.partnerCvExpected && /^yes/i.test(payload.hasPartner || '')) expectedUploads.push('partnerCv');
    payload.intakeExpectedUploads = expectedUploads;
    payload.intakeUploadToken = expectedUploads.length ? crypto.randomUUID() : '';
    payload.intakeUploads = {};

    const flags = buildIntakeFlags(payload);
    const rows = await db().sql`
      INSERT INTO intake_enquiries (applicant_first_name, applicant_last_name, email, phone, current_location, citizenship, date_of_birth, current_visa_type, current_visa_expiry, target_pathway, urgency, flags, raw_payload)
      VALUES (${payload.firstName}, ${payload.lastName}, ${payload.email}, ${payload.phone}, ${payload.currentLocation}, ${payload.citizenship}, ${nullableDate(payload.dateOfBirth)}, ${payload.currentVisaType}, ${nullableDate(payload.currentVisaExpiry)}, ${payload.targetPathway}, ${payload.urgency}, CAST(${JSON.stringify(flags)} AS jsonb), CAST(${JSON.stringify(payload)} AS jsonb))
      RETURNING id, created_at
    `;

    const intakeId = rows[0]?.id || '';
    if (!expectedUploads.length) {
      try {
        await markAndSendNewIntakeNotification({ intakeId, payload, flags, createdAt: rows[0]?.created_at });
      } catch (notifyError) {
        console.warn('New intake notification email failed', notifyError?.message || notifyError);
      }
    }

    return json({ ok: true, intakeId, uploadToken: payload.intakeUploadToken, expectedUploads });
  } catch (error) {
    console.error(error);
    return json({ error: 'Intake submission failed', detail: String(error?.message || error) }, 500);
  }
}

async function handleIntakeUpload(request, url) {
  const intakeId = clean(url.searchParams.get('intakeId'));
  const token = clean(url.searchParams.get('token'));
  const kind = clean(url.searchParams.get('kind'));
  if (!nullableUuidValue(intakeId) || !INTAKE_UPLOAD_KINDS[kind]) return json({ error: 'Invalid intake upload request.' }, 400);
  if (!token) return json({ error: 'The upload token was not supplied.' }, 400);

  const rawName = clean(url.searchParams.get('fileName')) || 'uploaded-cv.pdf';
  const fileName = sanitiseFileName(decodeURIComponentSafe(rawName));
  const headerType = clean(request.headers.get('content-type'));
  const fileType = normaliseUploadMimeType(headerType, fileName);
  if (!isAllowedIntakeUpload(fileName, fileType)) {
    return json({ error: 'CV uploads must be PDF, DOC or DOCX files.' }, 400);
  }

  const arrayBuffer = await request.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) return json({ error: 'The uploaded file was empty.' }, 400);
  if (buffer.length > MAX_INTAKE_UPLOAD_BYTES) return json({ error: 'CV uploads must be 5 MB or smaller.' }, 400);

  const database = db();
  const rows = await database.sql`SELECT id, flags, raw_payload, created_at FROM intake_enquiries WHERE id = ${intakeId} LIMIT 1`;
  const row = rows[0];
  if (!row) return json({ error: 'The intake record was not found.' }, 404);
  const payload = row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {};
  if (payload.intakeUploadToken !== token) return json({ error: 'The intake upload token was not accepted.' }, 403);
  const expected = Array.isArray(payload.intakeExpectedUploads) ? payload.intakeExpectedUploads : [];
  if (!expected.includes(kind)) return json({ error: 'That CV upload is not expected for this intake record.' }, 400);

  const uploadId = crypto.randomUUID();
  const blobKey = `intake/${intakeId}/${kind}/${uploadId}-${fileName}`;
  const metadata = {
    kind,
    label: INTAKE_UPLOAD_KINDS[kind],
    fileName,
    fileType,
    fileSize: buffer.length,
    blobKey,
    uploadedAt: new Date().toISOString(),
  };
  const store = getStore({ name: INTAKE_UPLOAD_STORE, consistency: 'strong' });
  await store.set(blobKey, buffer, { metadata: { intakeId, kind, fileName, fileType } });

  const uploads = { ...(payload.intakeUploads || {}), [kind]: metadata };
  const nextPayload = { ...payload, intakeUploads: uploads, [kind]: metadata };
  await database.sql`UPDATE intake_enquiries SET raw_payload = CAST(${JSON.stringify(nextPayload)} AS jsonb), updated_at = NOW() WHERE id = ${intakeId}`;

  await maybeSendIntakeNotificationAfterUploads({ intakeId, payload: nextPayload, flags: row.flags || buildIntakeFlags(nextPayload), createdAt: row.created_at });
  return json({ ok: true, upload: publicUploadMetadata(metadata) });
}

function normaliseStoredUploads(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([kind]) => Boolean(INTAKE_UPLOAD_KINDS[kind])).map(([kind, item]) => [kind, publicUploadMetadata(item)]));
}

function publicUploadMetadata(item = {}) {
  if (!item || typeof item !== 'object') return {};
  return {
    kind: clean(item.kind),
    label: clean(item.label),
    fileName: clean(item.fileName),
    fileType: clean(item.fileType),
    fileSize: Number(item.fileSize || 0) || 0,
    blobKey: clean(item.blobKey),
    uploadedAt: clean(item.uploadedAt),
  };
}

function sanitiseFileName(value = '') {
  const cleaned = String(value || '').trim().replace(/[\\/]+/g, '-').replace(/[^a-zA-Z0-9._ -]/g, '').replace(/\s+/g, ' ').slice(0, 180);
  return cleaned || 'uploaded-cv.pdf';
}

function decodeURIComponentSafe(value = '') {
  try { return decodeURIComponent(value); } catch { return value; }
}

function normaliseUploadMimeType(value = '', fileName = '') {
  const lower = String(fileName || '').toLowerCase();
  const type = String(value || '').split(';')[0].trim().toLowerCase();
  if (INTAKE_UPLOAD_TYPES.has(type)) return type;
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return type;
}

function isAllowedIntakeUpload(fileName = '', fileType = '') {
  const lower = String(fileName || '').toLowerCase();
  const hasAllowedExtension = lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx');
  return hasAllowedExtension && INTAKE_UPLOAD_TYPES.has(fileType);
}

async function maybeSendIntakeNotificationAfterUploads({ intakeId = '', payload = {}, flags = {}, createdAt = '' } = {}) {
  const expected = Array.isArray(payload.intakeExpectedUploads) ? payload.intakeExpectedUploads : [];
  if (!expected.length) return false;
  if (payload.intakeNotificationSentAt) return false;
  const uploads = payload.intakeUploads || {};
  const complete = expected.every((kind) => uploads[kind]?.blobKey);
  if (!complete) return false;
  return await markAndSendNewIntakeNotification({ intakeId, payload, flags, createdAt });
}

async function markAndSendNewIntakeNotification({ intakeId = '', payload = {}, flags = {}, createdAt = '' } = {}) {
  const sent = await sendNewIntakeNotificationEmail({ intakeId, payload, flags, createdAt });
  if (sent && nullableUuidValue(intakeId)) {
    const nextPayload = { ...payload, intakeNotificationSentAt: new Date().toISOString() };
    await db().sql`UPDATE intake_enquiries SET raw_payload = CAST(${JSON.stringify(nextPayload)} AS jsonb), updated_at = NOW() WHERE id = ${intakeId}`;
  }
  return sent;
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) return getDatabase({ connectionString });
  return getDatabase();
}

async function ensureIntakeSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS intake_enquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status TEXT NOT NULL DEFAULT 'New',
      assigned_adviser_id UUID,
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
      converted_client_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_status ON intake_enquiries(status)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_created_at ON intake_enquiries(created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_assigned_adviser ON intake_enquiries(assigned_adviser_id)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_intake_enquiries_email ON intake_enquiries(LOWER(email))`;
}

function normalisePayload(input = {}) {
  const formType = clean(input.formType).toLowerCase() === 'contact' ? 'contact' : 'assessment';
  const contactSituation = clean(input.contactSituation || input.targetPathway);
  const contactLocation = clean(input.contactLocation || input.currentLocation || input.currentCountry);
  const payload = {
    formType,
    contactSituation,
    contactLocation,
    bestTimeToCall: clean(input.bestTimeToCall),
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    email: clean(input.email).toLowerCase(),
    phone: clean(input.phone),
    preferredContactMethod: clean(input.preferredContactMethod) || 'Email',
    citizenship: clean(input.citizenship),
    dateOfBirth: clean(input.dateOfBirth),
    dateOfBirthAge: calculateAge(input.dateOfBirth),
    consentToContact: Boolean(input.consentToContact),
    privacyAcknowledged: Boolean(input.privacyAcknowledged),
    applicantCvExpected: Boolean(input.applicantCvExpected),
    partnerCvExpected: Boolean(input.partnerCvExpected),
    intakeUploads: normaliseStoredUploads(input.intakeUploads),
    urgency: clean(input.urgency) || 'Standard',
    urgentDeadline: clean(input.urgentDeadline),
    targetPathway: clean(input.targetPathway || input.contactSituation),
    desiredTimeframe: clean(input.desiredTimeframe),
    helpNeeded: clean(input.helpNeeded),
    isInNewZealand: clean(input.isInNewZealand),
    currentVisaType: clean(input.currentVisaType),
    currentVisaExpiry: clean(input.currentVisaExpiry),
    visaConditions: clean(input.visaConditions),
    currentLocation: clean(input.currentLocation || input.contactLocation || input.currentCountry),
    previouslyVisitedNz: clean(input.previouslyVisitedNz),
    previouslyHeldNzVisa: clean(input.previouslyHeldNzVisa),
    plannedTravelDate: clean(input.plannedTravelDate),
    passportExpiry: clean(input.passportExpiry),
    relationshipStatus: clean(input.relationshipStatus),
    hasPartner: clean(input.hasPartner),
    partnerFullName: clean(input.partnerFullName || input.partnerName),
    partnerDateOfBirth: clean(input.partnerDateOfBirth),
    partnerCitizenship: clean(input.partnerCitizenship),
    partnerCurrentCountry: clean(input.partnerCurrentCountry),
    partnerVisaStatus: clean(input.partnerVisaStatus),
    partnerNzStatus: clean(input.partnerNzStatus),
    livingTogether: clean(input.livingTogether),
    relationshipStarted: clean(input.relationshipStarted),
    startedLivingTogether: clean(input.startedLivingTogether),
    partnerIncluded: clean(input.partnerIncluded),
    relationshipBackground: clean(input.relationshipBackground || input.familyDetails),
    partnerCurrentEmploymentStatus: clean(input.partnerCurrentEmploymentStatus),
    partnerOccupation: clean(input.partnerOccupation),
    partnerCurrentEmployer: clean(input.partnerCurrentEmployer),
    partnerEmploymentCountry: clean(input.partnerEmploymentCountry),
    partnerCurrentJobStartDate: clean(input.partnerCurrentJobStartDate),
    partnerHoursPerWeek: clean(input.partnerHoursPerWeek),
    partnerAnnualSalary: clean(input.partnerAnnualSalary),
    partnerSalaryCurrency: clean(input.partnerSalaryCurrency),
    partnerYearsExperience: clean(input.partnerYearsExperience),
    partnerEmploymentDetails: clean(input.partnerEmploymentDetails),
    partnerPreviousWorkHistory: clean(input.partnerPreviousWorkHistory),
    partnerHighestQualification: clean(input.partnerHighestQualification),
    partnerQualificationName: clean(input.partnerQualificationName),
    partnerQualificationInstitution: clean(input.partnerQualificationInstitution),
    partnerQualificationCountry: clean(input.partnerQualificationCountry),
    partnerQualificationYearCompleted: clean(input.partnerQualificationYearCompleted),
    partnerQualificationStudyLength: clean(input.partnerQualificationStudyLength),
    partnerTaughtInEnglish: clean(input.partnerTaughtInEnglish),
    partnerNzqaAssessed: clean(input.partnerNzqaAssessed),
    partnerQualificationRelatedToOccupation: clean(input.partnerQualificationRelatedToOccupation),
    partnerQualificationDetails: clean(input.partnerQualificationDetails),
    hasChildren: clean(input.hasChildren || input.childrenIncluded),
    children: cleanChildren(input.children),
    moreChildrenDetails: clean(input.moreChildrenDetails),
    currentEmploymentStatus: clean(input.currentEmploymentStatus),
    occupation: clean(input.occupation),
    currentEmployer: clean(input.currentEmployer),
    employmentCountry: clean(input.employmentCountry),
    currentJobStartDate: clean(input.currentJobStartDate),
    hoursPerWeek: clean(input.hoursPerWeek),
    annualSalary: clean(input.annualSalary),
    salaryCurrency: clean(input.salaryCurrency),
    yearsExperience: clean(input.yearsExperience),
    hasNzJobOffer: clean(input.hasNzJobOffer),
    employerName: clean(input.employerName),
    jobTitle: clean(input.jobTitle),
    nzJobLocation: clean(input.nzJobLocation),
    payRate: clean(input.payRate),
    nzPayCurrency: clean(input.nzPayCurrency),
    nzJobHours: clean(input.nzJobHours),
    employerAccredited: clean(input.employerAccredited),
    employmentAgreementProvided: clean(input.employmentAgreementProvided),
    proposedStartDate: clean(input.proposedStartDate),
    employmentDetails: clean(input.employmentDetails || input.workDetails),
    previousWorkHistory: clean(input.previousWorkHistory),
    highestQualification: clean(input.highestQualification),
    qualificationName: clean(input.qualificationName),
    qualificationInstitution: clean(input.qualificationInstitution),
    qualificationCountry: clean(input.qualificationCountry),
    qualificationYearCompleted: clean(input.qualificationYearCompleted),
    qualificationStudyLength: clean(input.qualificationStudyLength),
    taughtInEnglish: clean(input.taughtInEnglish),
    nzqaAssessed: clean(input.nzqaAssessed),
    qualificationRelatedToOccupation: clean(input.qualificationRelatedToOccupation),
    qualificationDetails: clean(input.qualificationDetails),
    healthIssues: clean(input.healthIssues),
    dependantHealthIssues: clean(input.dependantHealthIssues),
    healthDetails: clean(input.healthDetails),
    characterIssues: clean(input.characterIssues),
    characterConvictions: clean(input.characterConvictions),
    characterPendingCharges: clean(input.characterPendingCharges),
    deportationRemoval: clean(input.deportationRemoval),
    characterDetails: clean(input.characterDetails),
    visaDeclines: clean(input.visaDeclines),
    immigrationHistoryDetails: clean(input.immigrationHistoryDetails),
    overstayed: clean(input.overstayed),
    falseMisleadingIssue: clean(input.falseMisleadingIssue),
    appealOrDeadline: clean(input.appealOrDeadline),
    countriesLived: clean(input.countriesLived),
    countriesLivedFiveYearsSince17: clean(input.countriesLivedFiveYearsSince17),
    nzTravelHistory: clean(input.nzTravelHistory),
    englishLevel: clean(input.englishLevel),
    englishTestDetails: clean(input.englishTestDetails),
    fundsAvailableSupport: clean(input.fundsAvailableSupport),
    availableFunds: clean(input.availableFunds),
    fundsCurrency: clean(input.fundsCurrency),
    sourceOfFunds: clean(input.sourceOfFunds),
    investmentInterest: clean(input.investmentInterest),
    investmentFunds: clean(input.investmentFunds),
    investmentCurrency: clean(input.investmentCurrency),
    fundsHeldByYou: clean(input.fundsHeldByYou),
    fundsTransferableNz: clean(input.fundsTransferableNz),
    fundsDetails: clean(input.fundsDetails),
    additionalInfo: clean(input.additionalInfo),
    submittedVia: formType === 'contact' ? 'THiS contact form' : 'THiS assessment questionnaire',
    intakeVersion: formType === 'contact' ? 'v0.12.15-contact' : 'v0.12.15',
  };
  return payload;
}

function buildIntakeFlags(payload = {}) {
  const visaDays = daysUntil(payload.currentVisaExpiry);
  const urgentDays = daysUntil(payload.urgentDeadline);
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

function cleanChildren(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((child) => ({
    id: clean(child?.id),
    fullName: clean(child?.fullName),
    dateOfBirth: clean(child?.dateOfBirth),
    citizenship: clean(child?.citizenship),
    currentCountry: clean(child?.currentCountry),
    dependent: clean(child?.dependent),
    includedInApplication: clean(child?.includedInApplication),
    custodyIssues: clean(child?.custodyIssues),
  })).filter((child) => [child.fullName, child.dateOfBirth, child.citizenship, child.currentCountry, child.dependent, child.includedInApplication, child.custodyIssues].some((item) => clean(item)));
}

function clean(value) {
  return String(value || '').trim().slice(0, MAX_TEXT);
}

function nullableDate(value) {
  const text = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function calculateAge(value) {
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

function daysUntil(value) {
  const iso = nullableDate(value);
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}


async function sendNewIntakeNotificationEmail({ intakeId = '', payload = {}, flags = {}, createdAt = '' } = {}) {
  const config = requireMicrosoftEmailConfig();
  const toEmails = getIntakeNotificationRecipients();
  if (!toEmails.length) return null;

  await ensureEmailNotificationSchema();
  await pruneOldEmailNotifications();
  const isContact = payload.formType === 'contact';
  const fallbackSubject = `${isContact ? 'New contact form submitted' : 'New intake questionnaire submitted'} - ${[payload.firstName, payload.lastName].filter(Boolean).join(' ') || 'Unnamed enquiry'}`;
  const fallbackBody = buildNewIntakeNotificationBody({ intakeId, payload, flags, createdAt });
  const summary = intakeSummarySections(payload).map((section) => `${section.title}\n${section.rows.map((row) => `${row.label}: ${row.value}`).join('\n')}`).join('\n\n') || 'No summary details recorded.';
  const templateDraft = await buildEmailFromTemplate('new_intake_adviser_notification', {
    formKind: isContact ? 'New contact form' : 'New intake questionnaire',
    intro: isContact ? 'A new short contact form enquiry has been submitted through the THiS website.' : 'A new assessment questionnaire has been submitted through the THiS intake form.',
    applicantName: fullName(payload) || 'Not recorded',
    email: payload.email || 'Not recorded',
    phone: payload.phone || 'Not recorded',
    submitted: createdAt ? formatNzDateTime(createdAt) : 'Just now',
    flags: reviewFlagLabels(flags).join(', ') || 'None',
    intakeId,
    summary,
  }, { subject: fallbackSubject, bodyText: fallbackBody });
  const subject = templateDraft.subject;
  const bodyText = templateDraft.bodyText;
  const bodyHtml = templateDraft.bodyHtml;
  const database = db();
  const toEmailLog = toEmails.join(', ');
  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, intake_id, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
    VALUES ('intake', ${nullableUuidValue(intakeId)}, ${nullableUuidValue(intakeId)}, 'new_intake_adviser_notification', ${config.fromEmail}, ${config.fromName}, ${toEmailLog}, ${subject}, ${bodyText}, ${bodyHtml}, 'Sending', 'THiS CRM intake form')
    RETURNING id`;

  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail: toEmails, subject, bodyText, bodyHtml });
    await database.sql`
      UPDATE email_notifications
         SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW()
       WHERE id = ${created.id}`;
    return true;
  } catch (error) {
    const message = String(error?.message || error).slice(0, 1000);
    await database.sql`
      UPDATE email_notifications
         SET status = 'Failed', failed_at = NOW(), failure_message = ${message}, updated_at = NOW()
       WHERE id = ${created.id}`;
    return false;
  }
}

function buildNewIntakeNotificationBody({ intakeId = '', payload = {}, flags = {}, createdAt = '' } = {}) {
  const yesFlags = reviewFlagLabels(flags).join(', ') || 'None';
  const submitted = createdAt ? formatNzDateTime(createdAt) : 'Just now';
  const sections = intakeSummarySections(payload);
  const lines = [
    payload.formType === 'contact' ? 'A new short contact form enquiry has been submitted through the THiS website.' : 'A new assessment questionnaire has been submitted through the THiS intake form.',
    '',
    `Applicant: ${fullName(payload) || 'Not recorded'}`,
    `Email: ${payload.email || 'Not recorded'}`,
    `Mobile: ${payload.phone || 'Not recorded'}`,
    `${payload.formType === 'contact' ? 'Situation' : 'Immigration goal'}: ${payload.targetPathway || payload.contactSituation || 'Not recorded'}`,
    `Current location: ${payload.currentLocation || 'Not recorded'}`,
    `Urgency: ${payload.urgency || 'Standard'}${payload.urgentDeadline ? ` - ${payload.urgentDeadline}` : ''}`,
    `Review flags: ${yesFlags}`,
    `Submitted: ${submitted}`,
    `Intake ID: ${intakeId || 'Not recorded'}`,
    '',
    payload.formType === 'contact' ? 'Contact enquiry summary' : 'Full questionnaire summary',
    '--------------------------',
  ];

  sections.forEach((section) => {
    lines.push('', section.title.toUpperCase());
    section.rows.forEach(([label, value]) => {
      lines.push(`${label}: ${formatSummaryValue(value) || 'Not answered'}`);
    });
    (section.panels || []).forEach((panel) => {
      lines.push('', `  ${panel.title}`);
      panel.rows.forEach(([label, value]) => {
        lines.push(`  ${label}: ${formatSummaryValue(value) || 'Not answered'}`);
      });
    });
  });

  const crmUrl = String(process.env.URL || process.env.DEPLOY_URL || '').trim();
  lines.push('', 'Please review this enquiry in THiS CRM > Intake.', crmUrl ? `${crmUrl}/` : 'Open THiS CRM and go to Intake.');
  return lines.join('\n');
}

function buildNewIntakeNotificationHtml({ intakeId = '', payload = {}, flags = {}, createdAt = '' } = {}) {
  const yesFlags = reviewFlagLabels(flags);
  const sections = intakeSummarySections(payload);
  const submitted = createdAt ? formatNzDateTime(createdAt) : 'Just now';
  const crmUrl = String(process.env.URL || process.env.DEPLOY_URL || '').trim();
  const summaryRows = [
    ['Type', payload.formType === 'contact' ? 'Contact form' : 'Assessment questionnaire'],
    ['Applicant', fullName(payload)],
    ['Email', payload.email],
    ['Mobile', payload.phone],
    ['Preferred contact', payload.preferredContactMethod],
    [payload.formType === 'contact' ? 'Situation' : 'Immigration goal', payload.targetPathway || payload.contactSituation],
    ['Current location', payload.currentLocation],
    ['Urgency', `${payload.urgency || 'Standard'}${payload.urgentDeadline ? ` - ${payload.urgentDeadline}` : ''}`],
    ['Review flags', yesFlags.join(', ') || 'None'],
    ['Submitted', submitted],
    ['Intake ID', intakeId],
  ];

  return `<div style="font-family:Aptos,Arial,sans-serif;font-size:11pt;line-height:1.35;color:#1f2933;">
    <h2 style="margin:0 0 8px;color:#003736;font-size:20px;">${payload.formType === 'contact' ? 'New THiS contact enquiry' : 'New THiS intake questionnaire'}</h2>
    <p style="margin:0 0 14px;">${payload.formType === 'contact' ? 'A new short contact form enquiry has been submitted through the THiS website. Key details are below.' : 'A new assessment questionnaire has been submitted through the THiS intake form. Key details and the full questionnaire summary are below.'}</p>
    ${summaryTable(summaryRows)}
    ${yesFlags.length ? `<p style="margin:12px 0 6px;"><strong>Review flags</strong></p><p style="margin:0 0 14px;">${yesFlags.map((flag) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 9px;border:1px solid #b9d8ce;border-radius:999px;background:#f4fbf8;color:#003736;font-weight:700;font-size:10pt;">${escapeHtml(flag)}</span>`).join('')}</p>` : ''}
    <h3 style="margin:18px 0 8px;color:#003736;font-size:16px;">${payload.formType === 'contact' ? 'Contact enquiry summary' : 'Full questionnaire summary'}</h3>
    ${sections.map(summarySectionHtml).join('')}
    <p style="margin:18px 0 4px;"><strong>Please review this enquiry in THiS CRM &gt; Intake.</strong></p>
    ${crmUrl ? `<p style="margin:0;"><a href="${escapeHtml(crmUrl)}">Open THiS CRM</a></p>` : ''}
  </div>`;
}

function intakeSummarySections(payload = {}) {
  if (payload.formType === 'contact') {
    return [{
      title: 'Contact enquiry',
      rows: rows(payload, ['contactSituation', 'firstName', 'lastName', 'email', 'phone', 'contactLocation', 'bestTimeToCall', 'helpNeeded', 'consentToContact', 'privacyAcknowledged']),
    }];
  }
  const sections = [
    { title: 'Your details', rows: rows(payload, ['firstName', 'lastName', 'email', 'phone', 'preferredContactMethod', 'citizenship', 'dateOfBirth', 'dateOfBirthAge', 'applicantCv']) },
    { title: 'Immigration goal', rows: rows(payload, ['targetPathway', 'desiredTimeframe', 'urgency', 'urgentDeadline', 'helpNeeded']) },
    { title: 'Current visa situation', rows: rows(payload, ['isInNewZealand', 'currentLocation', 'currentVisaType', 'currentVisaExpiry', 'visaConditions', 'previouslyVisitedNz', 'previouslyHeldNzVisa', 'plannedTravelDate', 'passportExpiry']) },
    {
      title: 'Partner and family',
      rows: rows(payload, ['relationshipStatus', 'hasPartner', 'hasChildren']),
      panels: [
        { title: 'Partner details', rows: rows(payload, ['partnerFullName', 'partnerDateOfBirth', 'partnerCitizenship', 'partnerCurrentCountry', 'partnerVisaStatus', 'partnerNzStatus', 'livingTogether', 'relationshipStarted', 'startedLivingTogether', 'partnerIncluded', 'relationshipBackground', 'partnerCv']) },
        { title: 'Partner work and experience', rows: rows(payload, ['partnerCurrentEmploymentStatus', 'partnerOccupation', 'partnerCurrentEmployer', 'partnerEmploymentCountry', 'partnerCurrentJobStartDate', 'partnerHoursPerWeek', 'partnerAnnualSalary', 'partnerSalaryCurrency', 'partnerYearsExperience', 'partnerEmploymentDetails', 'partnerPreviousWorkHistory']) },
        { title: 'Partner qualifications', rows: rows(payload, ['partnerHighestQualification', 'partnerQualificationName', 'partnerQualificationInstitution', 'partnerQualificationCountry', 'partnerQualificationYearCompleted', 'partnerQualificationStudyLength', 'partnerTaughtInEnglish', 'partnerNzqaAssessed', 'partnerQualificationRelatedToOccupation', 'partnerQualificationDetails']) },
        { title: 'Children', rows: rows(payload, ['children', 'moreChildrenDetails']) },
      ],
    },
    {
      title: 'Work and employment',
      rows: rows(payload, ['currentEmploymentStatus', 'occupation', 'currentEmployer', 'employmentCountry', 'currentJobStartDate', 'hoursPerWeek', 'annualSalary', 'salaryCurrency', 'yearsExperience', 'employmentDetails']),
      panels: [
        { title: 'Previous work history', rows: rows(payload, ['previousWorkHistory']) },
        { title: 'New Zealand job offer', rows: rows(payload, ['hasNzJobOffer', 'employerName', 'jobTitle', 'nzJobLocation', 'payRate', 'nzPayCurrency', 'nzJobHours', 'employerAccredited', 'employmentAgreementProvided', 'proposedStartDate']) },
      ],
    },
    { title: 'Qualifications', rows: rows(payload, ['highestQualification', 'qualificationName', 'qualificationInstitution', 'qualificationCountry', 'qualificationYearCompleted', 'qualificationStudyLength', 'taughtInEnglish', 'nzqaAssessed', 'qualificationRelatedToOccupation', 'qualificationDetails']) },
    { title: 'Health and character', rows: rows(payload, ['healthIssues', 'dependantHealthIssues', 'healthDetails', 'characterConvictions', 'characterPendingCharges', 'deportationRemoval', 'characterDetails']) },
    { title: 'Immigration history', rows: rows(payload, ['visaDeclines', 'overstayed', 'falseMisleadingIssue', 'appealOrDeadline', 'immigrationHistoryDetails', 'countriesLived', 'countriesLivedFiveYearsSince17', 'nzTravelHistory']) },
    { title: 'Funds and investment', rows: rows(payload, ['fundsAvailableSupport', 'availableFunds', 'fundsCurrency', 'sourceOfFunds', 'investmentInterest']), panels: [{ title: 'Investment background', rows: rows(payload, ['investmentFunds', 'investmentCurrency', 'fundsHeldByYou', 'fundsTransferableNz', 'fundsDetails']) }] },
    { title: 'Final comments and consent', rows: rows(payload, ['additionalInfo', 'consentToContact', 'privacyAcknowledged']) },
  ];
  return sections.map((section) => ({ ...section, panels: (section.panels || []).filter((panel) => panel.rows.length) })).filter((section) => section.rows.length || (section.panels || []).length);
}

function rows(payload = {}, keys = []) {
  return keys.map((key) => [labelForKey(key), payload[key]]).filter(([, value]) => hasSummaryValue(value));
}

function summarySectionHtml(section = {}) {
  return `<div style="border:1px solid #d9e6e1;border-radius:14px;margin:0 0 12px;overflow:hidden;">
    <h4 style="margin:0;padding:10px 12px;background:#003736;color:#ffffff;font-size:13px;letter-spacing:.02em;">${escapeHtml(section.title)}</h4>
    ${summaryTable(section.rows, false)}
    ${(section.panels || []).map((panel) => `<div style="padding:10px 12px 0;"><strong style="color:#003736;">${escapeHtml(panel.title)}</strong></div>${summaryTable(panel.rows, false)}`).join('')}
  </div>`;
}

function summaryTable(items = [], outer = true) {
  if (!items.length) return '<p style="margin:8px 12px;color:#64748b;">No answers recorded.</p>';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;${outer ? 'margin:10px 0 14px;' : ''}">
    ${items.map(([label, value]) => `<tr><td style="border:1px solid #d9e6e1;padding:7px 9px;background:#f4fbf8;font-weight:700;width:34%;vertical-align:top;color:#475569;">${escapeHtml(label)}</td><td style="border:1px solid #d9e6e1;padding:7px 9px;vertical-align:top;white-space:pre-line;">${escapeHtml(formatSummaryValue(value) || 'Not answered')}</td></tr>`).join('')}
  </table>`;
}

function fullName(payload = {}) {
  return [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
}

function hasSummaryValue(value) {
  if (Array.isArray(value)) return value.some(hasSummaryValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasSummaryValue);
  return String(value || '').trim().length > 0;
}

function formatSummaryValue(value) {
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
    return Object.entries(value).filter(([, item]) => hasSummaryValue(item)).map(([key, item]) => `${labelForKey(key)}: ${formatSummaryValue(item)}`).join('\n');
  }
  return String(value || '');
}

function reviewFlagLabels(flags = {}) {
  const labels = {
    urgent: 'Urgent timing',
    visaExpirySoon: 'Visa expiry',
    health: 'Health review',
    character: 'Character review',
    employment: 'Employment details',
    partnership: 'Partnership/family',
    family: 'Children/family',
    funds: 'Funds/investment',
    investor: 'Investor interest',
  };
  return Object.entries(flags || {}).filter(([, value]) => Boolean(value)).map(([key]) => labels[key] || key);
}

function formatNzDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });
}

function labelForKey(key = '') {
  return INTAKE_LABELS[key] || String(key || '').replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

const INTAKE_LABELS = {
  formType: 'Form type', contactSituation: 'Your situation', contactLocation: 'Location', bestTimeToCall: 'Best time to call', firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Mobile phone', preferredContactMethod: 'Preferred contact', citizenship: 'Country of citizenship', dateOfBirth: 'Date of birth', dateOfBirthAge: 'Age', consentToContact: 'Consent to contact', privacyAcknowledged: 'Questionnaire acknowledgement', urgency: 'Urgency', urgentDeadline: 'Important deadline', targetPathway: 'Main goal', desiredTimeframe: 'Desired timeframe', helpNeeded: 'Help needed', isInNewZealand: 'Currently in New Zealand', currentVisaType: 'Current visa type', currentVisaExpiry: 'Current visa expiry', visaConditions: 'Visa conditions', currentLocation: 'Current country / location', previouslyVisitedNz: 'Previously visited New Zealand', previouslyHeldNzVisa: 'Previously held a New Zealand visa', plannedTravelDate: 'Planned travel date (if known)', passportExpiry: 'Passport expiry', relationshipStatus: 'Relationship status', hasPartner: 'Partner included', partnerFullName: 'Partner full name', partnerDateOfBirth: 'Partner date of birth', partnerCitizenship: 'Partner citizenship', partnerCurrentCountry: 'Partner current country', partnerVisaStatus: 'Partner visa status', partnerNzStatus: 'Partner NZ status', livingTogether: 'Living together', relationshipStarted: 'Relationship started', startedLivingTogether: 'Started living together', partnerIncluded: 'Partner included in application', relationshipBackground: 'Relationship / family background', partnerCurrentEmploymentStatus: 'Partner employment status', partnerOccupation: 'Partner occupation', partnerCurrentEmployer: 'Partner employer / business', partnerEmploymentCountry: 'Partner employment country', partnerCurrentJobStartDate: 'Partner current job start date', partnerHoursPerWeek: 'Partner hours per week', partnerAnnualSalary: 'Partner salary / pay rate', partnerSalaryCurrency: 'Partner salary currency', partnerYearsExperience: 'Partner years of relevant experience', partnerEmploymentDetails: 'Partner current employment details', partnerPreviousWorkHistory: 'Partner previous work history', partnerHighestQualification: 'Partner highest qualification', partnerQualificationName: 'Partner qualification name', partnerQualificationInstitution: 'Partner institution', partnerQualificationCountry: 'Partner qualification country', partnerQualificationYearCompleted: 'Partner year completed', partnerQualificationStudyLength: 'Partner length of study', partnerTaughtInEnglish: 'Partner taught in English', partnerNzqaAssessed: 'Partner NZQA assessed', partnerQualificationRelatedToOccupation: 'Partner qualification related to occupation', partnerQualificationDetails: 'Partner other qualifications/training', hasChildren: 'Children', children: 'Children details', moreChildrenDetails: 'More children / family details', currentEmploymentStatus: 'Current employment status', occupation: 'Occupation / profession', currentEmployer: 'Current employer / business', employmentCountry: 'Employment country', currentJobStartDate: 'Current job start date', hoursPerWeek: 'Hours per week', annualSalary: 'Salary / pay rate', salaryCurrency: 'Salary currency', yearsExperience: 'Years of relevant experience', hasNzJobOffer: 'New Zealand job offer', employerName: 'Employer name', jobTitle: 'Job title', nzJobLocation: 'NZ job location', payRate: 'Pay rate', nzPayCurrency: 'NZ pay currency', nzJobHours: 'NZ job hours', employerAccredited: 'Employer accredited', employmentAgreementProvided: 'Employment agreement provided', proposedStartDate: 'Proposed start date', employmentDetails: 'Current employment details', previousWorkHistory: 'Previous work history', highestQualification: 'Highest qualification', qualificationName: 'Qualification name', qualificationInstitution: 'Institution', qualificationCountry: 'Qualification country', qualificationYearCompleted: 'Year completed', qualificationStudyLength: 'Length of study', taughtInEnglish: 'Taught in English', nzqaAssessed: 'NZQA assessed', qualificationRelatedToOccupation: 'Qualification related to occupation', qualificationDetails: 'Other qualifications/training', healthIssues: 'Health issues', dependantHealthIssues: 'Dependant health issues', healthDetails: 'Health details', characterIssues: 'Character issues', characterConvictions: 'Convictions', characterPendingCharges: 'Pending charges', deportationRemoval: 'Deportation/removal', characterDetails: 'Character details', visaDeclines: 'Visa declines', immigrationHistoryDetails: 'Immigration history details', overstayed: 'Overstayed', falseMisleadingIssue: 'False/misleading information issue', appealOrDeadline: 'Appeal or deadline', countriesLived: 'Countries spent 12 months or more in', countriesLivedFiveYearsSince17: 'Countries spent five years or more in since age 17', nzTravelHistory: 'NZ travel history', englishLevel: 'English level', englishTestDetails: 'English test details', fundsAvailableSupport: 'Funds available to support move', availableFunds: 'Available funds', fundsCurrency: 'Funds currency', sourceOfFunds: 'Source of funds', investmentInterest: 'Investment interest', investmentFunds: 'Investment funds', investmentCurrency: 'Investment currency', fundsHeldByYou: 'Funds held by applicant', fundsTransferableNz: 'Funds transferable to NZ', fundsDetails: 'Funds / investment details', additionalInfo: 'Additional information', applicantCv: 'Applicant CV', partnerCv: 'Partner CV'
};

function formatFileSize(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIntakeNotificationRecipients() {
  const configured = String(process.env.INTAKE_NOTIFICATION_RECIPIENTS || '').trim();
  const value = configured || 'paul.janssen@turnerhopkins.co.nz,sejoo.han@turnerhopkins.co.nz';
  return value.split(/[;,]/).map((email) => email.trim()).filter(isValidEmailAddress);
}

async function ensureEmailNotificationSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS email_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      related_record_type TEXT NOT NULL DEFAULT 'test',
      related_record_id UUID,
      client_id UUID,
      intake_id UUID,
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

async function pruneOldEmailNotifications() {
  await db().sql`DELETE FROM email_notifications WHERE created_at < NOW() - INTERVAL '60 days'`;
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
      placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT
    )`;
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    await database.sql`
      INSERT INTO email_templates (template_key, name, description, subject, body_text, placeholders, updated_by)
      VALUES (${template.key}, ${template.name}, ${template.description}, ${template.subject}, ${template.bodyText}, CAST(${JSON.stringify(template.placeholders || [])} AS jsonb), 'System default')
      ON CONFLICT (template_key) DO NOTHING`;
  }
}

async function getEmailTemplate(templateKey = '') {
  await ensureEmailTemplateSchema();
  const fallback = DEFAULT_EMAIL_TEMPLATES.find((template) => template.key === templateKey) || DEFAULT_EMAIL_TEMPLATES[0];
  const rows = await db().sql`SELECT template_key, subject, body_text FROM email_templates WHERE template_key = ${templateKey} LIMIT 1`;
  return { subject: rows[0]?.subject || fallback.subject, bodyText: rows[0]?.body_text || fallback.bodyText };
}

async function buildEmailFromTemplate(templateKey, context = {}, fallback = {}) {
  const template = await getEmailTemplate(templateKey);
  const subject = renderTemplateText(template.subject || fallback.subject || '', context).trim() || fallback.subject || '';
  const bodyText = renderTemplateText(template.bodyText || fallback.bodyText || '', context).trim() || fallback.bodyText || '';
  return { subject, bodyText, bodyHtml: textToHtml(bodyText) };
}

function renderTemplateText(value = '', context = {}) {
  return String(value || '').replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key) => {
    const replacement = String(key || '').split('.').reduce((current, part) => (current && Object.prototype.hasOwnProperty.call(current, part) ? current[part] : ''), context);
    return replacement == null ? '' : String(replacement);
  });
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
  const tokenPayload = await response.json().catch(() => ({}));
  if (!response.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || `Microsoft token request failed with status ${response.status}`);
  }
  return tokenPayload.access_token;
}

async function sendMicrosoftGraphEmail({ config, token, toEmail, ccEmail = '', subject, bodyText, bodyHtml }) {
  const toRecipients = normaliseEmailRecipientList(toEmail);
  const ccRecipients = normaliseEmailRecipientList(ccEmail);
  if (!toRecipients.length) throw new Error('At least one valid recipient is required.');
  const message = {
    subject,
    body: {
      contentType: 'HTML',
      content: bodyHtml || textToHtml(bodyText),
    },
    toRecipients,
  };
  if (ccRecipients.length) message.ccRecipients = ccRecipients;

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'outlook.timezone="Pacific/Auckland"',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
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
    .filter(isValidEmailAddress)
    .map((address) => ({ emailAddress: { address } }));
}

function textToHtml(value = '') {
  return `<div style="font-family: Aptos, Arial, sans-serif; font-size: 11pt; line-height:1.25; color:#1f2933;">${String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 8px 0;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')}</div>`;
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

function nullableUuidValue(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim()) ? String(value).trim() : null;
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders() },
  });
}
