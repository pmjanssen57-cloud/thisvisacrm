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
    preferredContactMethod: clean(input.preferredContactMethod),
    consentToContact: Boolean(input.consentToContact),
    privacyAcknowledged: Boolean(input.privacyAcknowledged),
    urgency: clean(input.urgency) || 'Standard',
    targetPathway: clean(input.targetPathway),
    helpNeeded: clean(input.helpNeeded),
    currentVisaType: clean(input.currentVisaType),
    currentVisaExpiry: clean(input.currentVisaExpiry),
    currentLocation: clean(input.currentLocation),
    citizenship: clean(input.citizenship),
    dateOfBirth: clean(input.dateOfBirth),
    passportExpiry: clean(input.passportExpiry),
    relationshipStatus: clean(input.relationshipStatus),
    partnerName: clean(input.partnerName),
    partnerCitizenship: clean(input.partnerCitizenship),
    childrenIncluded: clean(input.childrenIncluded),
    familyDetails: clean(input.familyDetails),
    highestQualification: clean(input.highestQualification),
    qualificationDetails: clean(input.qualificationDetails),
    occupation: clean(input.occupation),
    yearsExperience: clean(input.yearsExperience),
    workDetails: clean(input.workDetails),
    hasNzJobOffer: clean(input.hasNzJobOffer),
    employerName: clean(input.employerName),
    jobTitle: clean(input.jobTitle),
    payRate: clean(input.payRate),
    employmentDetails: clean(input.employmentDetails),
    healthIssues: clean(input.healthIssues),
    healthDetails: clean(input.healthDetails),
    characterIssues: clean(input.characterIssues),
    characterDetails: clean(input.characterDetails),
    englishLevel: clean(input.englishLevel),
    englishTestDetails: clean(input.englishTestDetails),
    availableFunds: clean(input.availableFunds),
    investmentInterest: clean(input.investmentInterest),
    fundsDetails: clean(input.fundsDetails),
    countriesLived: clean(input.countriesLived),
    nzTravelHistory: clean(input.nzTravelHistory),
    additionalInfo: clean(input.additionalInfo),
    submittedVia: 'THiS draft intake web form',
    intakeVersion: 'v0.11.0',
  };
  return payload;
}

function buildIntakeFlags(payload = {}) {
  const visaDays = daysUntil(payload.currentVisaExpiry);
  return {
    urgent: payload.urgency === 'Urgent' || (visaDays !== null && visaDays <= 45),
    visaExpirySoon: visaDays !== null && visaDays <= 60,
    health: /^yes/i.test(payload.healthIssues || ''),
    character: /^yes/i.test(payload.characterIssues || ''),
    employment: /^yes/i.test(payload.hasNzJobOffer || '') || Boolean(payload.employerName || payload.jobTitle),
    partnership: /partner|married|de facto|relationship/i.test(`${payload.targetPathway} ${payload.relationshipStatus}`),
    funds: Boolean(payload.availableFunds || payload.investmentInterest || payload.fundsDetails),
    investor: /investor|investment/i.test(`${payload.targetPathway} ${payload.investmentInterest}`),
  };
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
