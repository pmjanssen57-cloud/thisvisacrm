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
      RETURNING id
    `;

    return json({ ok: true, intakeId: rows[0]?.id || '' });
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
    preferredName: clean(input.preferredName),
    email: clean(input.email).toLowerCase(),
    phone: clean(input.phone),
    preferredContactMethod: clean(input.preferredContactMethod) || 'Email',
    citizenship: clean(input.citizenship),
    dateOfBirth: clean(input.dateOfBirth),
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
    intakeVersion: 'v0.11.3',
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

function daysUntil(value) {
  const iso = nullableDate(value);
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
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
