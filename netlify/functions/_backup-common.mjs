import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';

export const BACKUP_STORE = 'crm-backups';
export const BACKUP_RETENTION_DEFAULT_HOURS = 24;

export function databaseClient() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  return connectionString ? getDatabase({ connectionString }) : getDatabase();
}

export async function ensureBackupSchema(database = databaseClient()) {
  const rows = await database.sql`SELECT to_regclass('public.backup_jobs') AS relation`;
  if (!rows[0]?.relation) {
    throw new Error('The backup_jobs database migration has not been applied. Deploy the current CRM build before using Backup Centre.');
  }
}

export async function authenticateBackupRequest(request) {
  const expected = process.env.CRM_ACCESS_TOKEN || '';
  const provided = request.headers.get('x-crm-token') || extractBearer(request.headers.get('authorization'));
  if (expected && provided === expected) return { ok: true, mode: 'token-fallback', user: null };

  try {
    const user = await getUser();
    if (user?.email) return { ok: true, mode: 'identity', user };
  } catch (error) {
    console.warn('Backup Identity check failed', error?.message || error);
  }
  return { ok: false, mode: expected ? 'none' : 'identity-required', user: null };
}

export async function hasBackupAdminAccess(auth) {
  if (!auth?.ok) return false;
  if (auth.mode === 'token-fallback') return true;
  const user = auth.user || {};
  const roles = new Set([
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : []),
    ...(Array.isArray(user.appMetadata?.roles) ? user.appMetadata.roles : []),
    user.role,
  ].filter(Boolean).map((role) => String(role).toLowerCase()));
  const identityAdmin = roles.has('admin') || roles.has('manager');

  const email = String(user.email || '').trim().toLowerCase();
  if (!email) return identityAdmin;
  try {
    const database = databaseClient();
    const rows = await database.sql`
      SELECT access_role
      FROM advisers
      WHERE LOWER(COALESCE(login_email, '')) = ${email}
         OR LOWER(COALESCE(email, '')) = ${email}
      ORDER BY CASE WHEN LOWER(COALESCE(login_email, '')) = ${email} THEN 0 ELSE 1 END
      LIMIT 1
    `;
    const adminRows = await database.sql`SELECT COUNT(*)::int AS count FROM advisers WHERE access_role = 'Admin' AND active = TRUE`;
    const hasAssignedAdmin = Number(adminRows[0]?.count || 0) > 0;
    if (rows[0]) return hasAssignedAdmin ? String(rows[0].access_role || '').trim().toLowerCase() === 'admin' : true;
    return identityAdmin;
  } catch (error) {
    console.warn('CRM adviser-role backup check failed', error?.message || error);
    return false;
  }
}

export function requestingUser(auth) {
  const user = auth?.user || {};
  const email = String(user.email || '').trim();
  const name = String(user.name || user.user_metadata?.full_name || user.userMetadata?.fullName || '').trim();
  return {
    email,
    label: name || email || (auth?.mode === 'token-fallback' ? 'CRM access token' : 'Unknown user'),
  };
}

export function passwordStrengthError(password) {
  const value = String(password || '');
  if (value.length < 12) return 'Use at least 12 characters.';
  const groups = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
  if (groups < 3) return 'Use at least three of: lowercase letters, uppercase letters, numbers and symbols.';
  return '';
}

export function backupRetentionHours() {
  const parsed = Number(process.env.CRM_BACKUP_RETENTION_HOURS || BACKUP_RETENTION_DEFAULT_HOURS);
  if (!Number.isFinite(parsed)) return BACKUP_RETENTION_DEFAULT_HOURS;
  return Math.min(168, Math.max(1, Math.round(parsed)));
}

export function mapBackupJob(row = {}) {
  return {
    id: row.id || '',
    requestedBy: row.requested_by || '',
    requestedByEmail: row.requested_by_email || '',
    status: row.status || 'Queued',
    progress: Number(row.progress || 0),
    currentStep: row.current_step || '',
    fileName: row.file_name || '',
    sizeBytes: Number(row.size_bytes || 0),
    archiveSha256: row.archive_sha256 || '',
    partCount: Number(row.part_count || 0),
    parts: normaliseParts(row.parts),
    tableCount: Number(row.table_count || 0),
    recordCount: Number(row.record_count || 0),
    fileCount: Number(row.file_count || 0),
    failedFiles: Array.isArray(row.failed_files) ? row.failed_files : [],
    errorMessage: row.error_message || '',
    createdAt: iso(row.created_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    expiresAt: iso(row.expires_at),
    downloadedAt: iso(row.downloaded_at),
    deletedAt: iso(row.deleted_at),
    ready: row.status === 'Ready' && Boolean(row.blob_key),
  };
}

function normaliseParts(value) {
  if (!Array.isArray(value)) return [];
  return value.map((part, index) => ({
    index: Number(part?.index ?? index),
    sizeBytes: Number(part?.sizeBytes || part?.size_bytes || 0),
    sha256: String(part?.sha256 || ''),
  }));
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function jsonResponse(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function extractBearer(value) {
  if (!value) return '';
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : String(value);
}

function iso(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
