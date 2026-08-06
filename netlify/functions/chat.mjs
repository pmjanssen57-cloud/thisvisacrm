import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';
import crypto from 'node:crypto';

const DEFAULT_WEEKLY_HOURS = {
  mon: { enabled: true, start: '09:00', end: '16:00' },
  tue: { enabled: true, start: '09:00', end: '16:00' },
  wed: { enabled: true, start: '09:00', end: '16:00' },
  thu: { enabled: true, start: '09:00', end: '16:00' },
  fri: { enabled: true, start: '09:00', end: '16:00' },
  sat: { enabled: true, start: '09:00', end: '16:00' },
  sun: { enabled: true, start: '09:00', end: '16:00' },
};
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const CHAT_STATUSES = new Set(['Waiting', 'Offline', 'Active', 'Closed']);
const PUBLIC_CATEGORIES = [
  'Work visas',
  'Residence',
  'Partnership or family',
  'Employer services',
  'Investor visas',
  'Existing client enquiry',
  'Other',
];

let chatSchemaPromise = null;

export default async function chatRequestHandler(request, context = {}) {
  const method = String(request.method || 'GET').toUpperCase();
  const rawBody = method === 'GET' || method === 'HEAD' ? '' : await request.text();
  const response = await handleChatEvent({
    httpMethod: method,
    headers: Object.fromEntries(request.headers.entries()),
    body: rawBody,
    context,
    rawUrl: request.url,
  });
  return new Response(response.body || '', {
    status: response.statusCode || 200,
    headers: response.headers || {},
  });
}

async function handleChatEvent(event) {
  const origin = String(event.headers?.origin || event.headers?.Origin || '').trim();
  try {
    if (event.httpMethod === 'OPTIONS') return empty(204, origin);
    await ensureChatSchema();

    const url = new URL(event.rawUrl || 'https://local.invalid/.netlify/functions/chat');
    const method = String(event.httpMethod || 'GET').toUpperCase();
    const body = method === 'POST' && event.body ? safeJsonParse(event.body, {}) : {};
    const action = String(body.action || url.searchParams.get('action') || (method === 'GET' ? 'status' : '')).trim();

    if (action === 'status') {
      const settings = await readSettings();
      return json(publicStatusPayload(settings), 200, origin);
    }

    if (action === 'start') {
      const settings = await readSettings();
      const result = await startConversation(body, settings, event);
      return json(result, 201, origin);
    }

    if (action === 'poll') {
      const result = await pollVisitorConversation(url, event);
      return json(result, 200, origin);
    }

    if (action === 'send') {
      const result = await sendVisitorMessage(body, event);
      return json(result, 201, origin);
    }

    if (action === 'closeVisitor') {
      const result = await closeVisitorConversation(body, event);
      return json(result, 200, origin);
    }

    const auth = await checkStaffAuth(event);
    if (!auth.ok) return json({ error: 'Unauthorised.' }, 401, origin);
    const actor = await resolveStaffActor(auth, event.headers || {});
    if (!actor?.id) return json({ error: 'A CRM adviser profile is required for live chat.' }, 403, origin);

    if (action === 'staffAttention') return json(await staffAttention(actor), 200, origin);
    if (action === 'staffSnapshot') {
      const conversationId = cleanUuid(url.searchParams.get('conversationId') || body.conversationId);
      return json(await staffSnapshot(actor, conversationId), 200, origin);
    }
    if (action === 'claim') return json(await claimConversation(body.conversationId, actor), 200, origin);
    if (action === 'release') return json(await releaseConversation(body.conversationId, actor), 200, origin);
    if (action === 'sendStaff') return json(await sendStaffMessage(body, actor), 201, origin);
    if (action === 'addNote') return json(await addInternalNote(body, actor), 201, origin);
    if (action === 'close') return json(await closeStaffConversation(body.conversationId, actor), 200, origin);
    if (action === 'reopen') return json(await reopenConversation(body.conversationId, actor), 200, origin);
    if (action === 'deleteClosed') return json(await deleteClosedConversation(body.conversationId, actor), 200, origin);
    if (action === 'createEnquiry') return json(await createEnquiryFromConversation(body.conversationId, actor), 201, origin);
    if (action === 'saveSettings') {
      if (!actor.isAdmin) return json({ error: 'Administrator access is required to change live chat settings.' }, 403, origin);
      return json({ settings: await saveSettings(body.settings || {}, actor) }, 200, origin);
    }

    return json({ error: `Unknown chat action: ${action}` }, 400, origin);
  } catch (error) {
    console.error('Live chat function error', error);
    const status = Number(error?.statusCode || 500);
    return json({ error: status >= 500 ? 'Live chat service error.' : String(error?.message || 'Live chat request failed.') }, status, origin);
  }
}

function db() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? getDatabase({ connectionString }) : getDatabase();
}

async function ensureChatSchema() {
  if (!chatSchemaPromise) {
    chatSchemaPromise = initialiseChatSchema().catch((error) => {
      chatSchemaPromise = null;
      throw error;
    });
  }
  return chatSchemaPromise;
}

async function initialiseChatSchema() {
  const database = db();
  await database.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS live_chat_settings (
      id TEXT PRIMARY KEY DEFAULT 'master',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      timezone TEXT NOT NULL DEFAULT 'Pacific/Auckland',
      weekly_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
      away_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
      welcome_message TEXT,
      offline_message TEXT,
      privacy_url TEXT,
      notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      notification_emails TEXT,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS live_chat_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status TEXT NOT NULL DEFAULT 'Waiting',
      visitor_name TEXT NOT NULL,
      visitor_email TEXT NOT NULL,
      visitor_phone TEXT,
      existing_client BOOLEAN NOT NULL DEFAULT FALSE,
      category TEXT,
      page_url TEXT,
      visitor_fingerprint TEXT,
      assigned_adviser_id UUID,
      assigned_adviser_name TEXT,
      assigned_adviser_email TEXT,
      linked_intake_id UUID,
      first_notification_sent_at TIMESTAMPTZ,
      first_notification_status TEXT,
      first_notification_error TEXT,
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      visitor_last_seen_at TIMESTAMPTZ,
      adviser_last_seen_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS live_chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES live_chat_conversations(id) ON DELETE CASCADE,
      sender_type TEXT NOT NULL,
      sender_name TEXT,
      message_text TEXT NOT NULL,
      is_internal BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`
    CREATE TABLE IF NOT EXISTS live_chat_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES live_chat_conversations(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      actor_name TEXT,
      event_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_status ON live_chat_conversations(status, last_message_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_assigned ON live_chat_conversations(assigned_adviser_id, status, last_message_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_fingerprint ON live_chat_conversations(visitor_fingerprint, created_at DESC)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_live_chat_messages_conversation ON live_chat_messages(conversation_id, created_at)`;
  await database.sql`CREATE INDEX IF NOT EXISTS idx_live_chat_events_conversation ON live_chat_events(conversation_id, created_at)`;
  await database.sql`
    INSERT INTO live_chat_settings (id, weekly_hours, welcome_message, offline_message)
    VALUES ('master', CAST(${JSON.stringify(DEFAULT_WEEKLY_HOURS)} AS jsonb), 'Kia ora. Send us your question and one of our team will respond as soon as possible.', 'Our live chat is currently closed. Leave your message and we will respond when the team is next available.')
    ON CONFLICT (id) DO NOTHING`;
}

async function readSettings() {
  const rows = await db().sql`SELECT * FROM live_chat_settings WHERE id = 'master' LIMIT 1`;
  const row = rows[0] || {};
  return {
    enabled: row.enabled !== false,
    timezone: cleanTimezone(row.timezone),
    weeklyHours: normaliseWeeklyHours(row.weekly_hours),
    awayDates: normaliseAwayDates(row.away_dates),
    welcomeMessage: cleanText(row.welcome_message, 1000) || 'Kia ora. Send us your question and one of our team will respond as soon as possible.',
    offlineMessage: cleanText(row.offline_message, 1000) || 'Our live chat is currently closed. Leave your message and we will respond when the team is next available.',
    privacyUrl: cleanUrl(row.privacy_url),
    notificationEnabled: row.notification_enabled !== false,
    notificationEmails: cleanText(row.notification_emails, 2000),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
    updatedBy: row.updated_by || '',
  };
}

async function saveSettings(input = {}, actor) {
  const settings = {
    enabled: input.enabled !== false,
    timezone: cleanTimezone(input.timezone),
    weeklyHours: normaliseWeeklyHours(input.weeklyHours),
    awayDates: normaliseAwayDates(input.awayDates),
    welcomeMessage: cleanText(input.welcomeMessage, 1000),
    offlineMessage: cleanText(input.offlineMessage, 1000),
    privacyUrl: cleanUrl(input.privacyUrl),
    notificationEnabled: input.notificationEnabled !== false,
    notificationEmails: normaliseEmailString(input.notificationEmails),
  };
  await db().sql`
    INSERT INTO live_chat_settings (id, enabled, timezone, weekly_hours, away_dates, welcome_message, offline_message, privacy_url, notification_enabled, notification_emails, updated_by, updated_at)
    VALUES ('master', ${settings.enabled}, ${settings.timezone}, CAST(${JSON.stringify(settings.weeklyHours)} AS jsonb), CAST(${JSON.stringify(settings.awayDates)} AS jsonb), ${settings.welcomeMessage}, ${settings.offlineMessage}, ${settings.privacyUrl}, ${settings.notificationEnabled}, ${settings.notificationEmails}, ${actor.name}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      timezone = EXCLUDED.timezone,
      weekly_hours = EXCLUDED.weekly_hours,
      away_dates = EXCLUDED.away_dates,
      welcome_message = EXCLUDED.welcome_message,
      offline_message = EXCLUDED.offline_message,
      privacy_url = EXCLUDED.privacy_url,
      notification_enabled = EXCLUDED.notification_enabled,
      notification_emails = EXCLUDED.notification_emails,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()`;
  return readSettings();
}

function publicStatusPayload(settings) {
  const availability = getAvailability(settings, new Date());
  return {
    enabled: settings.enabled,
    isOpen: availability.isOpen,
    mode: availability.isOpen ? 'live' : 'offline',
    reason: availability.reason,
    message: availability.isOpen ? settings.welcomeMessage : settings.offlineMessage,
    nextOpenLabel: availability.nextOpenLabel,
    privacyUrl: settings.privacyUrl,
    categories: PUBLIC_CATEGORIES,
    timezone: settings.timezone,
  };
}

function getAvailability(settings, now) {
  if (!settings.enabled) return { isOpen: false, reason: 'paused', nextOpenLabel: '' };
  const local = localParts(now, settings.timezone);
  const away = settings.awayDates.find((item) => item.date === local.date);
  if (away) return { isOpen: false, reason: away.label || 'away day', nextOpenLabel: findNextOpen(settings, now) };
  const hours = settings.weeklyHours[local.dayKey];
  if (!hours?.enabled) return { isOpen: false, reason: 'outside hours', nextOpenLabel: findNextOpen(settings, now) };
  const currentMinutes = timeToMinutes(local.time);
  const startMinutes = timeToMinutes(hours.start);
  const endMinutes = timeToMinutes(hours.end);
  const isOpen = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return { isOpen, reason: isOpen ? 'open' : 'outside hours', nextOpenLabel: isOpen ? '' : findNextOpen(settings, now) };
}

function findNextOpen(settings, now) {
  for (let offset = 0; offset < 15; offset += 1) {
    const candidate = new Date(now.getTime() + offset * 86400000);
    const local = localParts(candidate, settings.timezone);
    const hours = settings.weeklyHours[local.dayKey];
    const away = settings.awayDates.some((item) => item.date === local.date);
    if (!hours?.enabled || away) continue;
    if (offset === 0 && timeToMinutes(local.time) >= timeToMinutes(hours.end)) continue;
    const dayLabel = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : new Intl.DateTimeFormat('en-NZ', { timeZone: settings.timezone, weekday: 'long', day: 'numeric', month: 'short' }).format(candidate);
    return `${dayLabel} at ${formatClock(hours.start)}`;
  }
  return '';
}

async function startConversation(input, settings, event) {
  if (cleanText(input.website, 200)) throw httpError(400, 'Unable to start chat.');
  const visitorName = cleanText(input.name, 120);
  const visitorEmail = normaliseEmail(input.email);
  const visitorPhone = cleanText(input.phone, 80);
  const category = PUBLIC_CATEGORIES.includes(input.category) ? input.category : 'Other';
  const messageText = cleanText(input.message, 4000);
  const pageUrl = cleanUrl(input.pageUrl, 1000);
  if (visitorName.length < 2) throw httpError(400, 'Please enter your name.');
  if (!isValidEmail(visitorEmail)) throw httpError(400, 'Please enter a valid email address.');
  if (messageText.length < 2) throw httpError(400, 'Please enter your question.');
  if (!input.consent) throw httpError(400, 'Please confirm the privacy notice before starting chat.');

  const fingerprint = visitorFingerprint(event);
  const recent = await db().sql`SELECT COUNT(*)::int AS count FROM live_chat_conversations WHERE visitor_fingerprint = ${fingerprint} AND created_at > NOW() - INTERVAL '60 minutes'`;
  if (Number(recent[0]?.count || 0) >= 5) throw httpError(429, 'Too many chat requests have been started. Please try again later.');

  const availability = getAvailability(settings, new Date());
  const status = availability.isOpen ? 'Waiting' : 'Offline';
  const rows = await db().sql`
    INSERT INTO live_chat_conversations (status, visitor_name, visitor_email, visitor_phone, existing_client, category, page_url, visitor_fingerprint, visitor_last_seen_at, last_message_at)
    VALUES (${status}, ${visitorName}, ${visitorEmail}, ${visitorPhone}, ${Boolean(input.existingClient)}, ${category}, ${pageUrl}, ${fingerprint}, NOW(), NOW())
    RETURNING *`;
  const conversation = rows[0];
  const firstMessageRows = await db().sql`
    INSERT INTO live_chat_messages (conversation_id, sender_type, sender_name, message_text, is_internal)
    VALUES (${conversation.id}, 'visitor', ${visitorName}, ${messageText}, FALSE)
    RETURNING *`;
  await logEvent(conversation.id, 'conversation_started', visitorName, { mode: availability.isOpen ? 'live' : 'offline', pageUrl, category });

  const token = createVisitorToken(conversation.id);
  let notification = { status: 'disabled' };
  if (settings.notificationEnabled) notification = await sendFirstChatNotification(conversation, messageText, settings);

  return {
    token,
    conversation: mapConversation(conversation),
    messages: [mapMessage(firstMessageRows[0])],
    mode: availability.isOpen ? 'live' : 'offline',
    message: availability.isOpen ? settings.welcomeMessage : settings.offlineMessage,
    notificationStatus: notification.status,
  };
}

async function pollVisitorConversation(url, event) {
  const token = extractVisitorToken(event, url.searchParams.get('token'));
  const payload = verifyVisitorToken(token);
  const conversationId = cleanUuid(payload.cid);
  const rows = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${conversationId} LIMIT 1`;
  if (!rows[0]) throw httpError(404, 'Chat conversation not found.');
  const after = cleanTimestamp(url.searchParams.get('after'));
  const messages = after
    ? await db().sql`SELECT * FROM live_chat_messages WHERE conversation_id = ${conversationId} AND is_internal = FALSE AND created_at > ${after}::timestamptz ORDER BY created_at ASC LIMIT 200`
    : await db().sql`SELECT * FROM live_chat_messages WHERE conversation_id = ${conversationId} AND is_internal = FALSE ORDER BY created_at ASC LIMIT 200`;
  await db().sql`UPDATE live_chat_conversations SET visitor_last_seen_at = NOW() WHERE id = ${conversationId}`;
  return { conversation: mapConversation(rows[0]), messages: messages.map(mapMessage), serverTime: new Date().toISOString() };
}

async function sendVisitorMessage(input, event) {
  const token = extractVisitorToken(event, input.token);
  const payload = verifyVisitorToken(token);
  const conversationId = cleanUuid(payload.cid);
  const messageText = cleanText(input.message, 4000);
  if (messageText.length < 1) throw httpError(400, 'Enter a message.');
  const rows = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${conversationId} LIMIT 1`;
  const conversation = rows[0];
  if (!conversation) throw httpError(404, 'Chat conversation not found.');
  if (conversation.status === 'Closed') throw httpError(409, 'This chat has been closed.');
  const recent = await db().sql`SELECT COUNT(*)::int AS count FROM live_chat_messages WHERE conversation_id = ${conversationId} AND sender_type = 'visitor' AND created_at > NOW() - INTERVAL '60 minutes'`;
  if (Number(recent[0]?.count || 0) >= 60) throw httpError(429, 'Message limit reached. Please wait before sending another message.');
  const inserted = await db().sql`
    INSERT INTO live_chat_messages (conversation_id, sender_type, sender_name, message_text, is_internal)
    VALUES (${conversationId}, 'visitor', ${conversation.visitor_name}, ${messageText}, FALSE)
    RETURNING *`;
  await db().sql`UPDATE live_chat_conversations SET last_message_at = NOW(), visitor_last_seen_at = NOW(), updated_at = NOW() WHERE id = ${conversationId}`;
  return { message: mapMessage(inserted[0]) };
}

async function closeVisitorConversation(input, event) {
  const token = extractVisitorToken(event, input.token);
  const payload = verifyVisitorToken(token);
  const conversationId = cleanUuid(payload.cid);
  const rows = await db().sql`UPDATE live_chat_conversations SET status = 'Closed', closed_at = NOW(), updated_at = NOW() WHERE id = ${conversationId} RETURNING *`;
  if (!rows[0]) throw httpError(404, 'Chat conversation not found.');
  await logEvent(conversationId, 'closed_by_visitor', rows[0].visitor_name, {});
  return { conversation: mapConversation(rows[0]) };
}

async function staffAttention(actor) {
  const rows = await db().sql`
    SELECT
      (COUNT(*) FILTER (WHERE c.status IN ('Waiting', 'Offline') AND c.assigned_adviser_id IS NULL))::int AS waiting,
      (COUNT(*) FILTER (WHERE c.status = 'Active' AND c.assigned_adviser_id = ${actor.id}))::int AS mine,
      (COUNT(*) FILTER (WHERE c.status = 'Active'))::int AS active,
      (COUNT(*) FILTER (
        WHERE c.status = 'Active'
          AND c.assigned_adviser_id = ${actor.id}
          AND (c.adviser_last_seen_at IS NULL OR c.last_message_at > c.adviser_last_seen_at)
          AND (
            SELECT m.sender_type
            FROM live_chat_messages m
            WHERE m.conversation_id = c.id AND m.is_internal = FALSE
            ORDER BY m.created_at DESC
            LIMIT 1
          ) = 'visitor'
      ))::int AS unread
    FROM live_chat_conversations c
    WHERE c.status IN ('Waiting', 'Offline', 'Active')`;
  const counts = rows[0] || {};
  return {
    counts: {
      waiting: Number(counts.waiting || 0),
      mine: Number(counts.mine || 0),
      active: Number(counts.active || 0),
      unread: Number(counts.unread || 0),
    },
    refreshedAt: new Date().toISOString(),
  };
}

async function staffSnapshot(actor, selectedConversationId = '') {
  const conversations = await db().sql`
    SELECT c.*, (SELECT m.sender_type FROM live_chat_messages m WHERE m.conversation_id = c.id AND m.is_internal = FALSE ORDER BY m.created_at DESC LIMIT 1) AS last_sender_type
    FROM live_chat_conversations c
    WHERE c.status IN ('Waiting', 'Offline', 'Active') OR c.closed_at > NOW() - INTERVAL '14 days'
    ORDER BY CASE status WHEN 'Waiting' THEN 0 WHEN 'Offline' THEN 1 WHEN 'Active' THEN 2 ELSE 3 END, last_message_at DESC
    LIMIT 100`;
  let selected = null;
  let messages = [];
  let events = [];
  if (selectedConversationId) {
    const selectedRows = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${selectedConversationId} LIMIT 1`;
    selected = selectedRows[0] ? mapConversation(selectedRows[0]) : null;
    if (selected) {
      const messageRows = await db().sql`SELECT * FROM live_chat_messages WHERE conversation_id = ${selectedConversationId} ORDER BY created_at ASC LIMIT 500`;
      const eventRows = await db().sql`SELECT * FROM live_chat_events WHERE conversation_id = ${selectedConversationId} ORDER BY created_at ASC LIMIT 200`;
      messages = messageRows.map(mapMessage);
      events = eventRows.map(mapEvent);
      await db().sql`UPDATE live_chat_conversations SET adviser_last_seen_at = NOW() WHERE id = ${selectedConversationId}`;
    }
  }
  const settings = await readSettings();
  const mapped = conversations.map(mapConversation);
  return {
    conversations: mapped,
    selectedConversation: selected,
    messages,
    events,
    counts: {
      waiting: mapped.filter((item) => ['Waiting', 'Offline'].includes(item.status) && !item.assignedAdviserId).length,
      mine: mapped.filter((item) => item.status === 'Active' && item.assignedAdviserId === actor.id).length,
      active: mapped.filter((item) => item.status === 'Active').length,
      unread: mapped.filter((item) => item.status === 'Active' && item.assignedAdviserId === actor.id && item.lastSenderType === 'visitor' && (!item.adviserLastSeenAt || item.lastMessageAt > item.adviserLastSeenAt)).length,
    },
    actor: { id: actor.id, name: actor.name, email: actor.email, isAdmin: actor.isAdmin },
    settings,
    availability: publicStatusPayload(settings),
    emailConfigured: getEmailConfig().configured,
    refreshedAt: new Date().toISOString(),
  };
}

async function claimConversation(conversationId, actor) {
  const id = requiredUuid(conversationId);
  const rows = await db().sql`
    UPDATE live_chat_conversations
    SET status = 'Active', assigned_adviser_id = ${actor.id}, assigned_adviser_name = ${actor.name}, assigned_adviser_email = ${actor.email}, adviser_last_seen_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND status IN ('Waiting', 'Offline', 'Active') AND (assigned_adviser_id IS NULL OR assigned_adviser_id = ${actor.id})
    RETURNING *`;
  if (!rows[0]) throw httpError(409, 'This chat has already been claimed by another adviser or is closed.');
  await logEvent(id, 'claimed', actor.name, { adviserId: actor.id });
  return { conversation: mapConversation(rows[0]) };
}

async function releaseConversation(conversationId, actor) {
  const id = requiredUuid(conversationId);
  const current = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${id} LIMIT 1`;
  if (!current[0]) throw httpError(404, 'Chat conversation not found.');
  if (current[0].assigned_adviser_id && String(current[0].assigned_adviser_id) !== actor.id && !actor.isAdmin) throw httpError(403, 'Only the assigned adviser can release this chat.');
  const settings = await readSettings();
  const nextStatus = getAvailability(settings, new Date()).isOpen ? 'Waiting' : 'Offline';
  const rows = await db().sql`
    UPDATE live_chat_conversations
    SET status = ${nextStatus}, assigned_adviser_id = NULL, assigned_adviser_name = NULL, assigned_adviser_email = NULL, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *`;
  await logEvent(id, 'released', actor.name, {});
  return { conversation: mapConversation(rows[0]) };
}

async function sendStaffMessage(input, actor) {
  const id = requiredUuid(input.conversationId);
  const messageText = cleanText(input.message, 4000);
  if (!messageText) throw httpError(400, 'Enter a reply.');
  const current = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${id} LIMIT 1`;
  if (!current[0]) throw httpError(404, 'Chat conversation not found.');
  if (current[0].status === 'Closed') throw httpError(409, 'This chat is closed.');
  if (String(current[0].assigned_adviser_id || '') !== actor.id) throw httpError(403, 'Claim this chat before replying.');
  const rows = await db().sql`
    INSERT INTO live_chat_messages (conversation_id, sender_type, sender_name, message_text, is_internal)
    VALUES (${id}, 'adviser', ${actor.name}, ${messageText}, FALSE)
    RETURNING *`;
  await db().sql`UPDATE live_chat_conversations SET status = 'Active', last_message_at = NOW(), adviser_last_seen_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
  return { message: mapMessage(rows[0]) };
}

async function addInternalNote(input, actor) {
  const id = requiredUuid(input.conversationId);
  const messageText = cleanText(input.message, 4000);
  if (!messageText) throw httpError(400, 'Enter an internal note.');
  const current = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${id} LIMIT 1`;
  if (!current[0]) throw httpError(404, 'Chat conversation not found.');
  const rows = await db().sql`
    INSERT INTO live_chat_messages (conversation_id, sender_type, sender_name, message_text, is_internal)
    VALUES (${id}, 'internal', ${actor.name}, ${messageText}, TRUE)
    RETURNING *`;
  await db().sql`UPDATE live_chat_conversations SET updated_at = NOW() WHERE id = ${id}`;
  return { message: mapMessage(rows[0]) };
}

async function closeStaffConversation(conversationId, actor) {
  const id = requiredUuid(conversationId);
  const current = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${id} LIMIT 1`;
  if (!current[0]) throw httpError(404, 'Chat conversation not found.');
  if (current[0].assigned_adviser_id && String(current[0].assigned_adviser_id) !== actor.id && !actor.isAdmin) throw httpError(403, 'Only the assigned adviser can close this chat.');
  const rows = await db().sql`UPDATE live_chat_conversations SET status = 'Closed', closed_at = NOW(), updated_at = NOW() WHERE id = ${id} RETURNING *`;
  await logEvent(id, 'closed_by_staff', actor.name, {});
  return { conversation: mapConversation(rows[0]) };
}

async function reopenConversation(conversationId, actor) {
  const id = requiredUuid(conversationId);
  const rows = await db().sql`
    UPDATE live_chat_conversations
    SET status = 'Active', assigned_adviser_id = ${actor.id}, assigned_adviser_name = ${actor.name}, assigned_adviser_email = ${actor.email}, closed_at = NULL, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *`;
  if (!rows[0]) throw httpError(404, 'Chat conversation not found.');
  await logEvent(id, 'reopened', actor.name, {});
  return { conversation: mapConversation(rows[0]) };
}

async function deleteClosedConversation(conversationId, actor) {
  const id = requiredUuid(conversationId);
  const rows = await db().sql`SELECT id, status, assigned_adviser_id, linked_intake_id FROM live_chat_conversations WHERE id = ${id} LIMIT 1`;
  const conversation = rows[0];
  if (!conversation) throw httpError(404, 'Chat conversation not found.');
  if (conversation.status !== 'Closed') throw httpError(409, 'Only closed chats can be deleted.');
  if (conversation.assigned_adviser_id && String(conversation.assigned_adviser_id) !== actor.id && !actor.isAdmin) {
    throw httpError(403, 'Only the assigned adviser or an administrator can delete this closed chat.');
  }
  await db().sql`DELETE FROM live_chat_conversations WHERE id = ${id}`;
  return { deleted: true, conversationId: id, linkedIntakeId: conversation.linked_intake_id ? String(conversation.linked_intake_id) : '' };
}

async function createEnquiryFromConversation(conversationId, actor) {
  const id = requiredUuid(conversationId);
  const rows = await db().sql`SELECT * FROM live_chat_conversations WHERE id = ${id} LIMIT 1`;
  const conversation = rows[0];
  if (!conversation) throw httpError(404, 'Chat conversation not found.');
  if (conversation.linked_intake_id) throw httpError(409, 'An enquiry has already been created from this chat.');
  const messages = await db().sql`SELECT * FROM live_chat_messages WHERE conversation_id = ${id} ORDER BY created_at ASC LIMIT 500`;
  const transcript = messages
    .filter((message) => !message.is_internal)
    .map((message) => `[${new Date(message.created_at).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message.sender_name || message.sender_type}: ${message.message_text}`)
    .join('\n\n')
    .slice(0, 12000);
  const nameParts = splitName(conversation.visitor_name);
  const rawPayload = {
    sourceType: 'live_chat',
    sourceLabel: 'Website — Live Chat',
    chatConversationId: id,
    chatCategory: conversation.category || '',
    chatPageUrl: conversation.page_url || '',
    existingClient: conversation.existing_client ? 'Yes' : 'No',
    targetPathway: conversation.category || '',
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: conversation.visitor_email,
    phone: conversation.visitor_phone || '',
    chatTranscript: transcript,
  };
  const intakeRows = await db().sql`
    INSERT INTO intake_enquiries (
      status, assigned_adviser_id, applicant_first_name, applicant_last_name, email, phone, target_pathway, urgency, flags, raw_payload, adviser_assessment_notes, recommended_pathway, consultation_outcome, created_at, updated_at
    ) VALUES (
      'New', ${actor.id}, ${nameParts.firstName}, ${nameParts.lastName}, ${conversation.visitor_email}, ${conversation.visitor_phone || ''}, ${conversation.category || ''}, '', '{}'::jsonb, CAST(${JSON.stringify(rawPayload)} AS jsonb), ${`Created from website live chat.\n\n${transcript}`.slice(0, 12000)}, '', '', NOW(), NOW()
    ) RETURNING *`;
  const intake = intakeRows[0];
  await db().sql`UPDATE live_chat_conversations SET linked_intake_id = ${intake.id}, updated_at = NOW() WHERE id = ${id}`;
  await logEvent(id, 'enquiry_created', actor.name, { intakeId: intake.id });
  return { intake: mapIntake(intake), conversationId: id };
}

async function logEvent(conversationId, eventType, actorName, detail) {
  await db().sql`
    INSERT INTO live_chat_events (conversation_id, event_type, actor_name, event_detail)
    VALUES (${conversationId}, ${cleanText(eventType, 80)}, ${cleanText(actorName, 200)}, CAST(${JSON.stringify(detail || {})} AS jsonb))`;
}

async function sendFirstChatNotification(conversation, openingMessage, settings) {
  const config = getEmailConfig();
  if (!config.configured) {
    await markNotification(conversation.id, 'Not configured', '', 'Microsoft Graph email is not configured.');
    return { status: 'not_configured' };
  }
  const recipientString = await resolveNotificationRecipients(settings);
  if (!recipientString) {
    await markNotification(conversation.id, 'No recipients', '', 'No live chat notification recipients are configured.');
    return { status: 'no_recipients' };
  }
  const crmBase = String(process.env.THIS_CRM_BASE_URL || 'https://thisvisacrm.netlify.app').replace(/\/$/, '');
  const chatUrl = `${crmBase}/?chat=${encodeURIComponent(conversation.id)}`;
  const subject = `New website live chat: ${conversation.visitor_name} — ${conversation.category || 'General enquiry'}`;
  const bodyText = `A new person has started a website chat.\n\nName: ${conversation.visitor_name}\nEmail: ${conversation.visitor_email}\nPhone: ${conversation.visitor_phone || 'Not provided'}\nExisting client: ${conversation.existing_client ? 'Yes' : 'No'}\nCategory: ${conversation.category || 'Other'}\nPage: ${conversation.page_url || 'Not recorded'}\n\nOpening message:\n${openingMessage}\n\nOpen the chat in THiS CRM:\n${chatUrl}\n\nThis notification is sent once when the conversation is first created.`;
  let logId = '';
  try {
    try {
      const logRows = await db().sql`
        INSERT INTO email_notifications (related_record_type, related_record_id, template_key, from_email, from_name, to_email, subject, body_text, body_html, status, sent_by)
        VALUES ('live_chat', ${conversation.id}, 'live_chat_internal_notification', ${config.fromEmail}, ${config.fromName}, ${recipientString}, ${subject}, ${bodyText}, ${textToHtml(bodyText)}, 'Sending', 'Website live chat')
        RETURNING id`;
      logId = logRows[0]?.id || '';
    } catch (logError) {
      console.warn('Live chat email log insert failed; continuing with notification delivery', logError?.message || logError);
    }
    const token = await getMicrosoftGraphToken(config);
    const result = await sendMicrosoftGraphEmail({ config, token, toEmail: recipientString, subject, bodyText });
    if (logId) await db().sql`UPDATE email_notifications SET status = 'Sent', sent_at = NOW(), provider_request_id = ${result.requestId || ''}, updated_at = NOW() WHERE id = ${logId}`;
    await markNotification(conversation.id, 'Sent', new Date().toISOString(), '');
    return { status: 'sent' };
  } catch (error) {
    if (logId) await db().sql`UPDATE email_notifications SET status = 'Failed', failed_at = NOW(), failure_message = ${String(error?.message || error).slice(0, 1000)}, updated_at = NOW() WHERE id = ${logId}`;
    await markNotification(conversation.id, 'Failed', '', String(error?.message || error));
    console.warn('Live chat first-message notification failed', error?.message || error);
    return { status: 'failed' };
  }
}

async function markNotification(conversationId, status, sentAt, error) {
  await db().sql`
    UPDATE live_chat_conversations
    SET first_notification_status = ${status},
        first_notification_sent_at = ${sentAt ? new Date(sentAt) : null},
        first_notification_error = ${cleanText(error, 1000)},
        updated_at = NOW()
    WHERE id = ${conversationId}`;
}

async function resolveNotificationRecipients(settings) {
  const explicit = normaliseEmailString(settings.notificationEmails || process.env.LIVE_CHAT_NOTIFICATION_RECIPIENTS || '');
  if (explicit) return explicit;
  try {
    const rows = await db().sql`SELECT COALESCE(NULLIF(email, ''), NULLIF(login_email, '')) AS email FROM advisers WHERE active = TRUE ORDER BY name`;
    return normaliseEmailString(rows.map((row) => row.email).filter(Boolean).join(','));
  } catch {
    return '';
  }
}

function getEmailConfig() {
  const tenantId = String(process.env.MICROSOFT_TENANT_ID || '').trim();
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  const fromEmail = String(process.env.MICROSOFT_NOTIFICATION_FROM_EMAIL || 'THiS@turnerhopkins.co.nz').trim();
  const fromName = String(process.env.MICROSOFT_NOTIFICATION_FROM_NAME || 'Turner Hopkins Immigration Specialists').trim();
  return { tenantId, clientId, clientSecret, fromEmail, fromName, configured: Boolean(tenantId && clientId && clientSecret && fromEmail) };
}

async function getMicrosoftGraphToken(config) {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const payload = safeJsonParse(await response.text(), {});
  if (!response.ok || !payload.access_token) throw new Error(payload?.error_description || payload?.error || `Microsoft Graph token request failed (${response.status}).`);
  return payload.access_token;
}

async function sendMicrosoftGraphEmail({ config, token, toEmail, subject, bodyText }) {
  const recipients = String(toEmail || '').split(/[;,]/).map((value) => value.trim()).filter(isValidEmail).map((address) => ({ emailAddress: { address } }));
  if (!recipients.length) throw new Error('No valid live chat notification recipients were found.');
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: textToHtml(bodyText) },
        toRecipients: recipients,
      },
      saveToSentItems: true,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    const payload = safeJsonParse(text, {});
    throw new Error(payload?.error?.message || text || `Microsoft Graph send failed (${response.status}).`);
  }
  return { requestId: response.headers.get('request-id') || '' };
}

async function checkStaffAuth(event) {
  const expected = String(process.env.CRM_ACCESS_TOKEN || '').trim();
  const headers = event.headers || {};
  const provided = headers['x-crm-token'] || headers['X-CRM-Token'] || extractBearer(headers.authorization || headers.Authorization);
  if (expected && provided === expected) return { ok: true, mode: 'token-fallback', user: null };
  const contextUser = event.context?.clientContext?.user || event.context?.user || null;
  if (contextUser?.email) return { ok: true, mode: 'identity-context', user: contextUser };
  try {
    const user = await getUser();
    if (user?.email) return { ok: true, mode: 'identity', user };
  } catch (error) {
    console.warn('Live chat Identity check failed', error?.message || error);
  }
  return { ok: false, mode: 'none', user: null };
}

async function resolveStaffActor(auth, headers) {
  const database = db();
  const requestedId = cleanUuid(headers['x-crm-adviser-id'] || headers['X-CRM-Adviser-Id']);
  const email = normaliseEmail(auth.user?.email);
  let rows = [];
  if (email) {
    rows = await database.sql`
      SELECT id, name, COALESCE(NULLIF(email, ''), NULLIF(login_email, '')) AS email, access_role, active
      FROM advisers
      WHERE LOWER(COALESCE(login_email, '')) = ${email} OR LOWER(COALESCE(email, '')) = ${email}
      ORDER BY CASE WHEN LOWER(COALESCE(login_email, '')) = ${email} THEN 0 ELSE 1 END
      LIMIT 1`;
  } else if (requestedId) {
    rows = await database.sql`SELECT id, name, COALESCE(NULLIF(email, ''), NULLIF(login_email, '')) AS email, access_role, active FROM advisers WHERE id = ${requestedId} LIMIT 1`;
  }
  if (!rows[0] && auth.mode === 'token-fallback') {
    rows = await database.sql`SELECT id, name, COALESCE(NULLIF(email, ''), NULLIF(login_email, '')) AS email, access_role, active FROM advisers WHERE active = TRUE ORDER BY name LIMIT 1`;
  }
  const row = rows[0];
  if (!row || row.active === false) return null;
  const identityRoles = new Set([
    ...(Array.isArray(auth.user?.roles) ? auth.user.roles : []),
    ...(Array.isArray(auth.user?.app_metadata?.roles) ? auth.user.app_metadata.roles : []),
    auth.user?.role,
  ].filter(Boolean).map((value) => String(value).toLowerCase()));
  return {
    id: String(row.id),
    name: row.name || auth.user?.email || 'CRM adviser',
    email: row.email || auth.user?.email || '',
    isAdmin: auth.mode === 'token-fallback' || String(row.access_role || '').toLowerCase() === 'admin' || identityRoles.has('admin') || identityRoles.has('manager'),
  };
}

function createVisitorToken(conversationId) {
  const secret = chatSecret();
  const payload = Buffer.from(JSON.stringify({ cid: conversationId, exp: Date.now() + 36 * 60 * 60 * 1000, nonce: crypto.randomBytes(10).toString('hex') })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyVisitorToken(token) {
  const [payloadPart, signature] = String(token || '').split('.');
  if (!payloadPart || !signature) throw httpError(401, 'Chat session has expired.');
  const expected = crypto.createHmac('sha256', chatSecret()).update(payloadPart).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw httpError(401, 'Chat session has expired.');
  const payload = safeJsonParse(Buffer.from(payloadPart, 'base64url').toString('utf8'), {});
  if (!payload.cid || Number(payload.exp || 0) < Date.now()) throw httpError(401, 'Chat session has expired.');
  return payload;
}

function chatSecret() {
  const secret = String(process.env.LIVE_CHAT_SESSION_SECRET || process.env.CRM_ACCESS_TOKEN || '').trim();
  if (secret.length < 24) throw httpError(503, 'Live chat session security is not configured.');
  return secret;
}

function extractVisitorToken(event, fallback = '') {
  const headers = event.headers || {};
  return String(headers['x-chat-token'] || headers['X-Chat-Token'] || fallback || '').trim();
}

function visitorFingerprint(event) {
  const headers = event.headers || {};
  const ip = String(headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || headers['client-ip'] || 'unknown').split(',')[0].trim();
  const ua = String(headers['user-agent'] || '').slice(0, 300);
  return crypto.createHmac('sha256', chatSecret()).update(`${ip}|${ua}`).digest('hex');
}

function mapConversation(row = {}) {
  return {
    id: String(row.id || ''),
    status: CHAT_STATUSES.has(row.status) ? row.status : 'Waiting',
    visitorName: row.visitor_name || '',
    visitorEmail: row.visitor_email || '',
    visitorPhone: row.visitor_phone || '',
    existingClient: row.existing_client === true,
    category: row.category || 'Other',
    pageUrl: row.page_url || '',
    assignedAdviserId: row.assigned_adviser_id ? String(row.assigned_adviser_id) : '',
    assignedAdviserName: row.assigned_adviser_name || '',
    assignedAdviserEmail: row.assigned_adviser_email || '',
    linkedIntakeId: row.linked_intake_id ? String(row.linked_intake_id) : '',
    firstNotificationStatus: row.first_notification_status || '',
    lastSenderType: row.last_sender_type || '',
    lastMessageAt: toIso(row.last_message_at),
    visitorLastSeenAt: toIso(row.visitor_last_seen_at),
    adviserLastSeenAt: toIso(row.adviser_last_seen_at),
    closedAt: toIso(row.closed_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapMessage(row = {}) {
  return {
    id: String(row.id || ''),
    conversationId: String(row.conversation_id || ''),
    senderType: row.sender_type || 'visitor',
    senderName: row.sender_name || '',
    messageText: row.message_text || '',
    isInternal: row.is_internal === true,
    createdAt: toIso(row.created_at),
  };
}

function mapEvent(row = {}) {
  return {
    id: String(row.id || ''),
    eventType: row.event_type || '',
    actorName: row.actor_name || '',
    detail: row.event_detail && typeof row.event_detail === 'object' ? row.event_detail : {},
    createdAt: toIso(row.created_at),
  };
}

function mapIntake(row = {}) {
  return {
    id: String(row.id || ''),
    status: row.status || 'New',
    assignedAdviserId: row.assigned_adviser_id ? String(row.assigned_adviser_id) : '',
    firstName: row.applicant_first_name || '',
    lastName: row.applicant_last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    currentLocation: row.current_location || '',
    citizenship: row.citizenship || '',
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : '',
    currentVisaType: row.current_visa_type || '',
    currentVisaExpiry: row.current_visa_expiry ? String(row.current_visa_expiry).slice(0, 10) : '',
    targetPathway: row.target_pathway || '',
    urgency: row.urgency || '',
    flags: row.flags || {},
    rawPayload: row.raw_payload || {},
    adviserAssessmentNotes: row.adviser_assessment_notes || '',
    recommendedPathway: row.recommended_pathway || '',
    consultationOutcome: row.consultation_outcome || '',
    convertedClientId: row.converted_client_id ? String(row.converted_client_id) : '',
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function normaliseWeeklyHours(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_WEEKLY_HOURS).map(([key, fallback]) => {
    const item = source[key] && typeof source[key] === 'object' ? source[key] : fallback;
    const start = normaliseTime(item.start, fallback.start);
    const end = normaliseTime(item.end, fallback.end);
    return [key, { enabled: item.enabled !== false, start, end: timeToMinutes(end) > timeToMinutes(start) ? end : fallback.end }];
  }));
}

function normaliseAwayDates(value) {
  const source = Array.isArray(value) ? value : safeJsonParse(value, []);
  return source.slice(0, 100).map((item) => {
    if (typeof item === 'string') return { date: cleanDate(item), label: 'Office closed' };
    return { date: cleanDate(item?.date), label: cleanText(item?.label, 160) || 'Office closed' };
  }).filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date));
}

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const dayKey = String(parts.weekday || '').slice(0, 3).toLowerCase();
  return { dayKey: DAY_KEYS.includes(dayKey) ? dayKey : 'mon', date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function cleanTimezone(value) {
  const timezone = cleanText(value, 80) || 'Pacific/Auckland';
  try { new Intl.DateTimeFormat('en-NZ', { timeZone: timezone }).format(new Date()); return timezone; } catch { return 'Pacific/Auckland'; }
}

function cleanText(value, max = 4000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}
function normaliseEmail(value) { return cleanText(value, 320).toLowerCase(); }
function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')); }
function normaliseEmailString(value) { return [...new Set(String(value || '').split(/[;,\s]+/).map(normaliseEmail).filter(isValidEmail))].join(','); }
function cleanUrl(value, max = 1000) {
  const text = cleanText(value, max);
  if (!text) return '';
  try { const url = new URL(text); return ['http:', 'https:'].includes(url.protocol) ? url.toString().slice(0, max) : ''; } catch { return ''; }
}
function cleanDate(value) { const text = String(value || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''; }
function normaliseTime(value, fallback) { const text = String(value || ''); return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback; }
function timeToMinutes(value) { const [hours, minutes] = String(value || '00:00').split(':').map(Number); return hours * 60 + minutes; }
function formatClock(value) { const [hour, minute] = String(value || '09:00').split(':').map(Number); return new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 1, hour, minute))); }
function cleanUuid(value) { const text = String(value || '').trim(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : ''; }
function requiredUuid(value) { const id = cleanUuid(value); if (!id) throw httpError(400, 'A valid chat conversation is required.'); return id; }
function cleanTimestamp(value) { const text = String(value || '').trim(); const date = new Date(text); return text && !Number.isNaN(date.getTime()) ? date.toISOString() : ''; }
function toIso(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
function splitName(value) { const parts = cleanText(value, 160).split(/\s+/).filter(Boolean); return { firstName: parts.shift() || '', lastName: parts.join(' ') || 'Live chat enquiry' }; }
function extractBearer(value) { const match = String(value || '').match(/^Bearer\s+(.+)$/i); return match ? match[1] : String(value || ''); }
function safeJsonParse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function httpError(statusCode, message) { const error = new Error(message); error.statusCode = statusCode; return error; }
function escapeHtml(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function textToHtml(value) { return String(value || '').split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join(''); }

function securityHeaders() {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };
}

function corsHeaders(origin) {
  const allowed = new Set(String(process.env.CORS_ALLOWED_ORIGINS || 'https://thisvisacrm.netlify.app,https://www.turnerhopkinsimmigration.co.nz,https://turnerhopkinsimmigration.co.nz').split(',').map((item) => item.trim()).filter(Boolean));
  return origin && allowed.has(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};
}

function apiHeaders(origin, extra = {}) {
  return {
    ...securityHeaders(),
    ...corsHeaders(origin),
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-headers': 'content-type, authorization, x-crm-token, x-crm-adviser-id, x-chat-token',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    ...extra,
  };
}
function json(body, statusCode = 200, origin = '') { return { statusCode, headers: apiHeaders(origin), body: JSON.stringify(body) }; }
function empty(statusCode = 204, origin = '') { return { statusCode, headers: apiHeaders(origin, { 'content-type': 'text/plain; charset=utf-8' }), body: '' }; }
