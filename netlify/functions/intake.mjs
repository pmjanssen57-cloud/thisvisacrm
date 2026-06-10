import { getDatabase } from '@netlify/database';

const MAX_TEXT = 6000;

export default async function intakeRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    await ensureIntakeSchema();
    const body = await request.json().catch(() => ({}));
    const payload = normalisePayload(body.payload || body);

    if (!payload.consentToContact || !payload.privacyAcknowledged) {
      return json({ error: 'Consent and privacy acknowledgement are required before submitting the intake form.' }, 400);
    }
    if (!payload.firstName || !payload.lastName || !payload.email) {
      return json({ error: 'First name, last name and email are required.' }, 400);
    }

    const flags = buildIntakeFlags(payload);
    const rows = await db().sql`
      INSERT INTO intake_enquiries (applicant_first_name, applicant_last_name, email, phone, current_location, citizenship, date_of_birth, current_visa_type, current_visa_expiry, target_pathway, urgency, flags, raw_payload)
      VALUES (${payload.firstName}, ${payload.lastName}, ${payload.email}, ${payload.phone}, ${payload.currentLocation}, ${payload.citizenship}, ${nullableDate(payload.dateOfBirth)}, ${payload.currentVisaType}, ${nullableDate(payload.currentVisaExpiry)}, ${payload.targetPathway}, ${payload.urgency}, CAST(${JSON.stringify(flags)} AS jsonb), CAST(${JSON.stringify(payload)} AS jsonb))
      RETURNING id, created_at
    `;

    const intakeId = rows[0]?.id || '';
    try {
      await sendNewIntakeNotificationEmail({ intakeId, payload, flags, createdAt: rows[0]?.created_at });
    } catch (notifyError) {
      console.warn('New intake notification email failed', notifyError?.message || notifyError);
    }

    return json({ ok: true, intakeId });
  } catch (error) {
    console.error(error);
    return json({ error: 'Intake submission failed', detail: String(error?.message || error) }, 500);
  }
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
  const payload = {
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
    urgency: clean(input.urgency) || 'Standard',
    urgentDeadline: clean(input.urgentDeadline),
    targetPathway: clean(input.targetPathway),
    desiredTimeframe: clean(input.desiredTimeframe),
    helpNeeded: clean(input.helpNeeded),
    isInNewZealand: clean(input.isInNewZealand),
    currentVisaType: clean(input.currentVisaType),
    currentVisaExpiry: clean(input.currentVisaExpiry),
    visaConditions: clean(input.visaConditions),
    currentLocation: clean(input.currentLocation || input.currentCountry),
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
    submittedVia: 'THiS assessment questionnaire',
    intakeVersion: 'v0.11.40',
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
  const subject = `New intake questionnaire submitted - ${[payload.firstName, payload.lastName].filter(Boolean).join(' ') || 'Unnamed enquiry'}`;
  const bodyText = buildNewIntakeNotificationBody({ intakeId, payload, flags, createdAt });
  const bodyHtml = textToHtml(bodyText);
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
  const yesFlags = Object.entries(flags || {}).filter(([, value]) => Boolean(value)).map(([key]) => key).join(', ') || 'None';
  const crmUrl = String(process.env.URL || process.env.DEPLOY_URL || '').trim();
  const reviewLine = crmUrl ? `${crmUrl}/` : 'Open THiS CRM and go to Intake.';
  return [
    'A new assessment questionnaire has been submitted through the THiS intake form.',
    '',
    `Applicant: ${[payload.firstName, payload.lastName].filter(Boolean).join(' ') || 'Not recorded'}`,
    `Email: ${payload.email || 'Not recorded'}`,
    `Mobile: ${payload.phone || 'Not recorded'}`,
    `Preferred contact: ${payload.preferredContactMethod || 'Not recorded'}`,
    `Citizenship: ${payload.citizenship || 'Not recorded'}`,
    `Date of birth / age: ${payload.dateOfBirth || 'Not recorded'}${payload.dateOfBirthAge ? ` (${payload.dateOfBirthAge})` : ''}`,
    `Current location: ${payload.currentLocation || 'Not recorded'}`,
    `Currently in New Zealand: ${payload.isInNewZealand || 'Not recorded'}`,
    `Current visa: ${payload.currentVisaType || 'Not recorded'}`,
    `Visa expiry: ${payload.currentVisaExpiry || 'Not recorded'}`,
    `Immigration goal: ${payload.targetPathway || 'Not recorded'}`,
    `Timeframe: ${payload.desiredTimeframe || 'Not recorded'}`,
    `Urgency: ${payload.urgency || 'Standard'}${payload.urgentDeadline ? ` - ${payload.urgentDeadline}` : ''}`,
    `Partner included: ${payload.hasPartner || 'Not recorded'}`,
    `NZ job offer: ${payload.hasNzJobOffer || 'Not recorded'}`,
    `Occupation: ${payload.occupation || payload.jobTitle || 'Not recorded'}`,
    `Review flags: ${yesFlags}`,
    `Submitted: ${createdAt ? new Date(createdAt).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }) : 'Just now'}`,
    `Intake ID: ${intakeId || 'Not recorded'}`,
    '',
    'Please review this enquiry in THiS CRM > Intake.',
    reviewLine,
  ].join('\n');
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
