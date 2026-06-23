import { getDatabase } from '@netlify/database';

const MAX_TEXT = 2000;
const DEFAULT_CONSULTATION_TYPES = [
  { name: 'Free 15-minute consultation', durationMinutes: 15, priceNzd: 0, paid: false, description: 'A brief preliminary call to discuss the enquiry and next steps.', active: true, sortOrder: 1, bufferMinutes: 15 },
  { name: 'Paid 60-minute consultation', durationMinutes: 60, priceNzd: 400, paid: true, description: 'A detailed immigration consultation. Payment is handled manually at this stage.', active: true, sortOrder: 2, bufferMinutes: 15 },
];

export default async function bookingRequestHandler(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return new Response('', { status: 204, headers: corsHeaders() });

  try {
    await ensureBookingSchema();
    const url = new URL(request.url);
    const token = clean(url.searchParams.get('token'), 120);
    if (!token) return json({ error: 'This booking link is missing its secure token.' }, 400);

    if (method === 'GET') {
      const payload = await getBookingPagePayload(token);
      return json(payload);
    }

    if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const body = await request.json().catch(() => ({}));
    const result = await confirmBooking(token, body.booking || body);
    return json(result);
  } catch (error) {
    console.error(error);
    return json({ error: 'Booking request failed', detail: String(error?.message || error) }, 500);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) return getDatabase({ connectionString });
  return getDatabase();
}

async function ensureBookingSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS consultation_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 15,
      price_nzd NUMERIC(10,2) NOT NULL DEFAULT 0,
      paid BOOLEAN NOT NULL DEFAULT FALSE,
      description TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      buffer_minutes INTEGER NOT NULL DEFAULT 15,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS adviser_booking_availability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      adviser_id UUID REFERENCES advisers(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL DEFAULT 1,
      start_time TEXT NOT NULL DEFAULT '09:00',
      end_time TEXT NOT NULL DEFAULT '17:00',
      consultation_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS adviser_booking_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      adviser_id UUID REFERENCES advisers(id) ON DELETE CASCADE,
      block_date DATE NOT NULL,
      start_time TEXT,
      end_time TEXT,
      all_day BOOLEAN NOT NULL DEFAULT FALSE,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS consultation_booking_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
      intake_id UUID REFERENCES intake_enquiries(id) ON DELETE SET NULL,
      adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      applicant_name TEXT,
      applicant_email TEXT,
      applicant_phone TEXT,
      allowed_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      expires_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS consultation_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_link_id UUID REFERENCES consultation_booking_links(id) ON DELETE SET NULL,
      intake_id UUID REFERENCES intake_enquiries(id) ON DELETE SET NULL,
      adviser_id UUID REFERENCES advisers(id) ON DELETE SET NULL,
      consultation_type_id UUID REFERENCES consultation_types(id) ON DELETE SET NULL,
      booking_date DATE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      applicant_name TEXT,
      applicant_email TEXT,
      applicant_phone TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Confirmed',
      payment_status TEXT NOT NULL DEFAULT 'Not required',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_booking_availability_adviser_day ON adviser_booking_availability(adviser_id, day_of_week)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_booking_blocks_adviser_date ON adviser_booking_blocks(adviser_id, block_date)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_booking_links_token ON consultation_booking_links(token)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_consultation_bookings_adviser_date ON consultation_bookings(adviser_id, booking_date)`;
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
  const existingTypes = await database.sql`SELECT COUNT(*)::int AS count FROM consultation_types`;
  if (Number(existingTypes[0]?.count || 0) === 0) {
    for (const type of DEFAULT_CONSULTATION_TYPES) {
      await database.sql`
        INSERT INTO consultation_types (name, duration_minutes, price_nzd, paid, description, active, sort_order, buffer_minutes)
        VALUES (${type.name}, ${type.durationMinutes}, ${type.priceNzd}, ${type.paid}, ${type.description}, ${type.active}, ${type.sortOrder}, ${type.bufferMinutes})`;
    }
  }
}

async function getBookingPagePayload(token) {
  const database = db();
  const rows = await database.sql`
    SELECT l.id, l.token, l.intake_id, l.adviser_id, l.applicant_name, l.applicant_email, l.applicant_phone, l.allowed_type_ids, l.expires_at, l.status, l.notes,
           a.name AS adviser_name, a.email AS adviser_email, a.phone AS adviser_phone, a.active AS adviser_active
      FROM consultation_booking_links l
      LEFT JOIN advisers a ON a.id = l.adviser_id
     WHERE l.token = ${token}
     LIMIT 1`;
  const link = rows[0];
  if (!link) return { ok: false, unavailable: true, message: 'This booking link was not found.' };
  const now = new Date();
  const expired = link.expires_at && new Date(link.expires_at).getTime() < now.getTime();
  if (link.status !== 'Active' || expired) {
    return { ok: false, unavailable: true, message: expired ? 'This booking link has expired.' : 'This booking link is no longer active.' };
  }
  if (!link.adviser_id || link.adviser_active === false) {
    return { ok: false, unavailable: true, message: 'This adviser is not currently available for online booking.' };
  }

  const allTypes = await database.sql`SELECT id, name, duration_minutes, price_nzd, paid, description, active, sort_order, buffer_minutes FROM consultation_types WHERE active = TRUE ORDER BY sort_order ASC, name ASC`;
  const allowedSet = new Set(Array.isArray(link.allowed_type_ids) ? link.allowed_type_ids : []);
  const types = allTypes
    .map(mapType)
    .filter((type) => !allowedSet.size || allowedSet.has(type.id));

  const availability = await database.sql`SELECT id, adviser_id, day_of_week, start_time, end_time, consultation_type_ids, active FROM adviser_booking_availability WHERE adviser_id = ${link.adviser_id} AND active = TRUE ORDER BY day_of_week ASC, start_time ASC`;
  const fromDate = addDays(todayIso(), 1);
  const toDate = addDays(todayIso(), 45);
  const blocks = await database.sql`SELECT block_date, start_time, end_time, all_day FROM adviser_booking_blocks WHERE adviser_id = ${link.adviser_id} AND block_date >= ${fromDate} AND block_date <= ${toDate}`;
  const bookings = await database.sql`SELECT booking_date, start_time, end_time, status FROM consultation_bookings WHERE adviser_id = ${link.adviser_id} AND booking_date >= ${fromDate} AND booking_date <= ${toDate} AND status <> 'Cancelled'`;
  const slots = generateSlots({ types, availability: availability.map(mapAvailability), blocks: blocks.map(mapBlock), bookings: bookings.map(mapBookingBusy), fromDate, days: 45 });

  return {
    ok: true,
    link: {
      applicantName: link.applicant_name || '',
      applicantEmail: link.applicant_email || '',
      applicantPhone: link.applicant_phone || '',
      notes: link.notes || '',
    },
    adviser: {
      id: link.adviser_id,
      name: link.adviser_name || 'Turner Hopkins adviser',
      email: link.adviser_email || '',
      phone: link.adviser_phone || '',
    },
    consultationTypes: types,
    slots,
  };
}

async function confirmBooking(token, input = {}) {
  const payload = await getBookingPagePayload(token);
  if (!payload.ok) return payload;
  const typeId = clean(input.consultationTypeId || input.consultation_type_id, 80);
  const bookingDate = clean(input.bookingDate || input.booking_date, 20);
  const startTime = normaliseTime(clean(input.startTime || input.start_time, 20));
  const applicantName = clean(input.applicantName || input.applicant_name || payload.link.applicantName, 300);
  const applicantEmail = clean(input.applicantEmail || input.applicant_email || payload.link.applicantEmail, 300).toLowerCase();
  const applicantPhone = clean(input.applicantPhone || input.applicant_phone || payload.link.applicantPhone, 80);
  const notes = clean(input.notes || '', 1000);
  const selectedType = payload.consultationTypes.find((type) => type.id === typeId);
  if (!selectedType) return { ok: false, error: 'Choose a consultation type.' };
  if (!bookingDate || !startTime) return { ok: false, error: 'Choose an available date and time.' };
  if (!applicantName || !applicantEmail) return { ok: false, error: 'Name and email are required to confirm the booking.' };
  if (!isValidEmailAddress(applicantEmail)) return { ok: false, error: 'Enter a valid email address.' };
  const slot = payload.slots.find((item) => item.consultationTypeId === typeId && item.date === bookingDate && item.startTime === startTime);
  if (!slot) return { ok: false, error: 'That time is no longer available. Please choose another slot.' };

  const database = db();
  const linkRows = await database.sql`SELECT id, intake_id, adviser_id, status FROM consultation_booking_links WHERE token = ${token} LIMIT 1`;
  const link = linkRows[0];
  if (!link || link.status !== 'Active') return { ok: false, error: 'This booking link is no longer active.' };

  const paymentStatus = selectedType.paid ? 'Manual payment pending' : 'Not required';
  const inserted = await database.sql`
    INSERT INTO consultation_bookings (booking_link_id, intake_id, adviser_id, consultation_type_id, booking_date, start_time, end_time, applicant_name, applicant_email, applicant_phone, notes, status, payment_status)
    VALUES (${link.id}, ${link.intake_id}, ${link.adviser_id}, ${typeId}, ${bookingDate}, ${startTime}, ${slot.endTime}, ${applicantName}, ${applicantEmail}, ${applicantPhone}, ${notes}, 'Confirmed', ${paymentStatus})
    RETURNING id, booking_link_id, intake_id, adviser_id, consultation_type_id, booking_date, start_time, end_time, applicant_name, applicant_email, applicant_phone, notes, status, payment_status, created_at`;
  await database.sql`UPDATE consultation_booking_links SET status = 'Used', updated_at = NOW() WHERE id = ${link.id}`;
  const booking = mapConfirmedBooking(inserted[0]);

  try {
    await recordBookingEmailNotifications({ booking, type: selectedType, adviser: payload.adviser });
  } catch (emailError) {
    console.warn('Booking email notification recording failed', emailError?.message || emailError);
  }

  return { ok: true, booking, adviser: payload.adviser, consultationType: selectedType };
}

function generateSlots({ types = [], availability = [], blocks = [], bookings = [], fromDate, days = 45 }) {
  const slots = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(fromDate, offset);
    const dayOfWeek = dayOfWeekForIso(date);
    const rows = availability.filter((row) => Number(row.dayOfWeek) === dayOfWeek);
    for (const row of rows) {
      const rowTypeIds = new Set(row.consultationTypeIds || []);
      for (const type of types) {
        if (rowTypeIds.size && !rowTypeIds.has(type.id)) continue;
        const duration = Number(type.durationMinutes || 15);
        const buffer = Number(type.bufferMinutes || 0);
        let cursor = minutesFromTime(row.startTime);
        const endLimit = minutesFromTime(row.endTime);
        while (cursor + duration <= endLimit) {
          const end = cursor + duration;
          const busy = blocks.some((block) => block.date === date && (block.allDay || overlaps(cursor, end, minutesFromTime(block.startTime || '00:00'), minutesFromTime(block.endTime || '23:59'))))
            || bookings.some((booking) => booking.date === date && overlaps(cursor, end, minutesFromTime(booking.startTime), minutesFromTime(booking.endTime)));
          if (!busy) {
            slots.push({
              id: `${type.id}-${date}-${timeFromMinutes(cursor)}`,
              consultationTypeId: type.id,
              date,
              startTime: timeFromMinutes(cursor),
              endTime: timeFromMinutes(end),
              label: `${formatDisplayDate(date)} at ${formatDisplayTime(timeFromMinutes(cursor))}`,
            });
          }
          cursor += Math.max(5, duration + buffer);
        }
      }
    }
  }
  return slots.slice(0, 160);
}

async function recordBookingEmailNotifications({ booking, type, adviser }) {
  const applicantSubject = `Your Turner Hopkins consultation booking`;
  const applicantBody = [
    `Dear ${firstName(booking.applicantName) || 'there'},`,
    '',
    'Your consultation booking has been received.',
    '',
    `Consultation: ${type.name}`,
    `Adviser: ${adviser.name}`,
    `Date/time: ${formatDisplayDate(booking.bookingDate)} at ${formatDisplayTime(booking.startTime)} NZ time`,
    type.paid ? 'Payment: payment will be handled manually by Turner Hopkins.' : 'Payment: not required.',
    '',
    'A calendar invite is attached for convenience.',
    '',
    'We will contact you if we need anything further before the consultation.',
    '',
    'Kind regards,',
    'Turner Hopkins Immigration Specialists',
  ].join('\n');
  const calendarInvite = buildConsultationIcs({ booking, type, adviser });
  await recordAndMaybeSendBookingEmail({ booking, templateKey: 'consultation_booking_applicant', toEmail: booking.applicantEmail, subject: applicantSubject, bodyText: applicantBody, attachments: calendarInvite ? [calendarInvite] : [] });

  if (adviser.email) {
    const adviserSubject = `New consultation booking: ${booking.applicantName || 'Applicant'}`;
    const adviserBody = [
      'A consultation has been booked through THiS CRM.',
      '',
      `Applicant: ${booking.applicantName}`,
      `Email: ${booking.applicantEmail}`,
      `Phone: ${booking.applicantPhone || 'Not provided'}`,
      `Consultation: ${type.name}`,
      `Date/time: ${formatDisplayDate(booking.bookingDate)} at ${formatDisplayTime(booking.startTime)} NZ time`,
      `Payment status: ${booking.paymentStatus}`,
      '',
      booking.notes ? `Applicant notes: ${booking.notes}` : 'Applicant notes: none provided',
      '',
      'A calendar invite is attached so you can add the consultation to Outlook.',
    ].join('\n');
    await recordAndMaybeSendBookingEmail({ booking, templateKey: 'consultation_booking_adviser', toEmail: adviser.email, subject: adviserSubject, bodyText: adviserBody, attachments: calendarInvite ? [calendarInvite] : [] });
  }
}

async function recordAndMaybeSendBookingEmail({ booking, templateKey, toEmail, subject, bodyText, attachments = [] }) {
  const database = db();
  const config = getMicrosoftEmailConfigOrNull();
  const fromEmail = config?.fromEmail || process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || '';
  const fromName = config?.fromName || process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists';
  const [created] = await database.sql`
    INSERT INTO email_notifications (related_record_type, related_record_id, intake_id, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
    VALUES ('consultation_booking', ${booking.id}, ${nullableUuidValue(booking.intakeId)}, ${templateKey}, ${fromEmail}, ${fromName}, ${toEmail}, ${subject}, ${bodyText}, ${textToHtml(bodyText)}, ${config ? 'Sending' : 'Draft'}, 'Booking system')
    RETURNING id`;
  if (!config) return;
  try {
    const token = await getMicrosoftGraphAccessToken(config);
    const sendResult = await sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText, attachments });
    await database.sql`UPDATE email_notifications SET status = 'Sent', sent_at = NOW(), provider_request_id = ${sendResult.requestId || ''}, updated_at = NOW() WHERE id = ${created.id}`;
  } catch (error) {
    await database.sql`UPDATE email_notifications SET status = 'Failed', failed_at = NOW(), failure_message = ${String(error?.message || error).slice(0, 1000)}, updated_at = NOW() WHERE id = ${created.id}`;
  }
}


function getMicrosoftEmailConfigOrNull() {
  const tenantId = String(process.env.MICROSOFT_TENANT_ID || '').trim();
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  const fromEmail = String(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz').trim();
  const fromName = String(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists').trim();
  if (!tenantId || !clientId || !clientSecret || !fromEmail) return null;
  return { tenantId, clientId, clientSecret, fromEmail, fromName };
}

async function getMicrosoftGraphAccessToken(config) {
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
  const response = await fetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || `Microsoft token request failed with status ${response.status}`);
  return payload.access_token;
}

async function sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText, attachments = [] }) {
  const toRecipients = normaliseEmailRecipientList(toEmail);
  if (!toRecipients.length) throw new Error('At least one valid recipient is required.');
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'outlook.timezone="Pacific/Auckland"' },
    body: JSON.stringify({ message: { subject, body: { contentType: 'HTML', content: textToHtml(bodyText) }, toRecipients, attachments }, saveToSentItems: true }),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try { detail = JSON.parse(text)?.error?.message || text; } catch {}
    throw new Error(detail || `Microsoft Graph sendMail failed with status ${response.status}`);
  }
  return { requestId: response.headers.get('request-id') || response.headers.get('client-request-id') || '' };
}

function normaliseEmailRecipientList(value = '') {
  return String(value || '').split(/[;,]/).map((address) => address.trim()).filter(isValidEmailAddress).map((address) => ({ emailAddress: { address } }));
}

function textToHtml(value = '') {
  return `<div style="font-family:Arial,sans-serif;font-size:10pt;line-height:1.4;color:#1f2933;">${String(value || '').split(/\n{2,}/).map((paragraph) => `<p style="margin:0 0 10px 0;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
}

function buildConsultationIcs({ booking = {}, type = {}, adviser = {} }) {
  if (!booking.bookingDate || !booking.startTime || !booking.endTime) return null;
  const applicant = booking.applicantName || booking.applicantEmail || 'Applicant';
  const summary = `Turner Hopkins consultation - ${applicant}`;
  const description = [
    `Consultation: ${type.name || 'Consultation'}`,
    `Applicant: ${booking.applicantName || ''}`,
    `Email: ${booking.applicantEmail || ''}`,
    `Phone: ${booking.applicantPhone || ''}`,
    `Payment status: ${booking.paymentStatus || ''}`,
    booking.notes ? `Notes: ${booking.notes}` : '',
  ].filter(Boolean).join('\n');
  const uid = `${booking.id || Date.now()}@this-crm`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const start = formatIcsLocalDateTime(booking.bookingDate, booking.startTime);
  const end = formatIcsLocalDateTime(booking.bookingDate, booking.endTime);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Turner Hopkins//THiS CRM//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Pacific/Auckland:${start}`,
    `DTEND;TZID=Pacific/Auckland:${end}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    adviser.email ? `ORGANIZER;CN=${escapeIcs(adviser.name || 'Turner Hopkins')}:mailto:${adviser.email}` : '',
    booking.applicantEmail ? `ATTENDEE;CN=${escapeIcs(applicant)};ROLE=REQ-PARTICIPANT:mailto:${booking.applicantEmail}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  return {
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: `THiS consultation - ${safeFilePart(applicant)}.ics`,
    contentType: 'text/calendar',
    contentBytes: Buffer.from(ics, 'utf8').toString('base64'),
  };
}

function formatIcsLocalDateTime(dateIso = '', time = '') {
  return `${String(dateIso || '').replace(/-/g, '')}T${String(normaliseTime(time) || '09:00').replace(':', '')}00`;
}

function escapeIcs(value = '') {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function safeFilePart(value = '') {
  return String(value || 'consultation').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'consultation';
}

function escapeHtml(value = '') {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function mapType(row = {}) {
  return {
    id: row.id || '',
    name: row.name || '',
    durationMinutes: Number(row.duration_minutes || 15),
    priceNzd: Number(row.price_nzd || 0),
    paid: Boolean(row.paid),
    description: row.description || '',
    bufferMinutes: Number(row.buffer_minutes || 0),
  };
}

function mapAvailability(row = {}) {
  return {
    dayOfWeek: Number(row.day_of_week || 1),
    startTime: normaliseTime(row.start_time || '09:00') || '09:00',
    endTime: normaliseTime(row.end_time || '17:00') || '17:00',
    consultationTypeIds: Array.isArray(row.consultation_type_ids) ? row.consultation_type_ids : [],
  };
}

function mapBlock(row = {}) {
  return {
    date: toDateOnly(row.block_date),
    startTime: normaliseTime(row.start_time || ''),
    endTime: normaliseTime(row.end_time || ''),
    allDay: Boolean(row.all_day),
  };
}

function mapBookingBusy(row = {}) {
  return {
    date: toDateOnly(row.booking_date),
    startTime: normaliseTime(row.start_time || ''),
    endTime: normaliseTime(row.end_time || ''),
  };
}

function mapConfirmedBooking(row = {}) {
  return {
    id: row.id || '',
    bookingLinkId: row.booking_link_id || '',
    intakeId: row.intake_id || '',
    adviserId: row.adviser_id || '',
    consultationTypeId: row.consultation_type_id || '',
    bookingDate: toDateOnly(row.booking_date),
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    applicantName: row.applicant_name || '',
    applicantEmail: row.applicant_email || '',
    applicantPhone: row.applicant_phone || '',
    notes: row.notes || '',
    status: row.status || 'Confirmed',
    paymentStatus: row.payment_status || 'Not required',
  };
}

function clean(value, max = MAX_TEXT) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normaliseTime(value = '') {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function minutesFromTime(value = '') {
  const time = normaliseTime(value);
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timeFromMinutes(value = 0) {
  const minutes = Math.max(0, Math.min(24 * 60, Number(value || 0)));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(isoDate, days) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function dayOfWeekForIso(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

function toDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatDisplayDate(value) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  if (!y || !m || !d) return value || '';
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function formatDisplayTime(value = '') {
  const time = normaliseTime(value);
  if (!time) return value;
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${String(m).padStart(2, '0')}${suffix}`;
}

function firstName(value = '') {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function isValidEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function nullableUuidValue(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')) ? value : null;
}

function securityHeaders() {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }) });
}

function corsHeaders(extra = {}) {
  return {
    ...securityHeaders(),
    'access-control-allow-headers': 'content-type, authorization, x-crm-token',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    ...extra,
  };
}
