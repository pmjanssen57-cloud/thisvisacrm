import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import {
  BACKUP_STORE,
  authenticateBackupRequest,
  backupRetentionHours,
  databaseClient,
  ensureBackupSchema,
  hasBackupAdminAccess,
  isUuid,
  jsonResponse,
  mapBackupJob,
  passwordStrengthError,
  requestingUser,
} from './_backup-common.mjs';
import { cleanExpiredAndStaleJobs, deleteBackupArtifacts, expireBackup } from './_backup-cleanup.mjs';


export default async function backupHandler(request) {
  try {
    const auth = await authenticateBackupRequest(request);
    if (!auth.ok) return jsonResponse({ error: 'Unauthorised.' }, 401);
    if (!(await hasBackupAdminAccess(auth))) return jsonResponse({ error: 'Backup access is restricted to CRM administrators.' }, 403);

    const database = databaseClient();
    await ensureBackupSchema(database);
    await cleanExpiredAndStaleJobs(database);

    const method = request.method.toUpperCase();
    const url = new URL(request.url);

    if (method === 'GET' && url.searchParams.get('download')) {
      return await downloadBackup(database, url.searchParams.get('download'), url.searchParams.get('part'));
    }

    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const password = String(body.password || '');
      const passwordError = passwordStrengthError(password);
      if (passwordError) return jsonResponse({ error: passwordError }, 400);

      const runningRows = await database.sql`
        SELECT id FROM backup_jobs
        WHERE status IN ('Queued', 'Processing')
          AND created_at >= NOW() - INTERVAL '20 minutes'
        LIMIT 1
      `;
      if (runningRows[0]) return jsonResponse({ error: 'Another backup is already running.' }, 409);

      const jobId = crypto.randomUUID();
      const requester = requestingUser(auth);
      await database.sql`
        INSERT INTO backup_jobs (id, requested_by, requested_by_email, status, progress, current_step)
        VALUES (${jobId}, ${requester.label}, ${requester.email}, 'Queued', 1, 'Queued for secure export')
      `;

      const workerUrl = new URL('/.netlify/functions/backup-create-background', request.url);
      const workerHeaders = new Headers({ 'content-type': 'application/json' });
      const authorization = request.headers.get('authorization');
      const crmToken = request.headers.get('x-crm-token');
      const cookie = request.headers.get('cookie');
      if (authorization) workerHeaders.set('authorization', authorization);
      if (crmToken) workerHeaders.set('x-crm-token', crmToken);
      if (cookie) workerHeaders.set('cookie', cookie);

      const workerResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: workerHeaders,
        body: JSON.stringify({ jobId, password }),
      });
      if (workerResponse.status !== 202) {
        await database.sql`
          UPDATE backup_jobs
          SET status = 'Failed', progress = 0, current_step = 'Could not start',
              error_message = ${`Background backup invocation returned HTTP ${workerResponse.status}.`}, updated_at = NOW()
          WHERE id = ${jobId}
        `;
        return jsonResponse({ error: 'The background backup job could not be started.' }, 502);
      }

      const rows = await database.sql`
        SELECT id, requested_by, requested_by_email, status, progress, current_step, file_name, blob_key,
               size_bytes, archive_sha256, part_count, parts, table_count, record_count, file_count,
               failed_files, error_message, created_at, started_at, completed_at, expires_at,
               downloaded_at, deleted_at
        FROM backup_jobs WHERE id = ${jobId} LIMIT 1
      `;
      return jsonResponse({ job: mapBackupJob(rows[0]), retentionHours: backupRetentionHours() }, 202);
    }

    if (method === 'GET') {
      const rows = await database.sql`
        SELECT id, requested_by, requested_by_email, status, progress, current_step, file_name, blob_key,
               size_bytes, archive_sha256, part_count, parts, table_count, record_count, file_count,
               failed_files, error_message, created_at, started_at, completed_at, expires_at,
               downloaded_at, deleted_at
        FROM backup_jobs
        ORDER BY created_at DESC
        LIMIT 30
      `;
      return jsonResponse({ jobs: rows.map(mapBackupJob), retentionHours: backupRetentionHours() });
    }

    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!isUuid(id)) return jsonResponse({ error: 'A valid backup ID is required.' }, 400);
      const rows = await database.sql`SELECT id, status FROM backup_jobs WHERE id = ${id} LIMIT 1`;
      const row = rows[0];
      if (!row) return jsonResponse({ error: 'Backup not found.' }, 404);
      if (['Queued', 'Processing'].includes(row.status)) return jsonResponse({ error: 'A running backup cannot be deleted.' }, 409);

      await deleteBackupArtifacts(id);
      await database.sql`
        UPDATE backup_jobs
        SET status = 'Deleted', blob_key = NULL, part_count = 0, parts = '[]'::jsonb,
            deleted_at = NOW(), current_step = 'Deleted', updated_at = NOW()
        WHERE id = ${id}
      `;
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    console.error('Backup endpoint error', error);
    return jsonResponse({ error: 'Backup service error', detail: String(error?.message || error) }, 500);
  }
}

async function downloadBackup(database, id, partValue) {
  if (!isUuid(id)) return jsonResponse({ error: 'A valid backup ID is required.' }, 400);
  const rows = await database.sql`
    SELECT id, status, file_name, blob_key, size_bytes, archive_sha256, part_count, parts, expires_at
    FROM backup_jobs
    WHERE id = ${id}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return jsonResponse({ error: 'Backup not found.' }, 404);
  if (row.status !== 'Ready' || !row.blob_key) return jsonResponse({ error: 'This backup is not ready for download.' }, 409);
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    await expireBackup(database, row);
    return jsonResponse({ error: 'This temporary backup has expired. Create a new backup.' }, 410);
  }

  const partIndex = Number(partValue);
  if (!Number.isInteger(partIndex) || partIndex < 0) return jsonResponse({ error: 'A valid backup part is required.' }, 400);

  const store = getStore({ name: BACKUP_STORE, consistency: 'strong' });
  const descriptor = await store.get(row.blob_key, { type: 'json', consistency: 'strong' });
  if (!descriptor || descriptor.jobId !== id || !Array.isArray(descriptor.parts)) {
    return jsonResponse({ error: 'The backup descriptor could not be found or validated.' }, 404);
  }

  const partCount = Number(descriptor.parts.length || row.part_count || 0);
  const part = descriptor.parts.find((item) => Number(item?.index) === partIndex);
  if (!part || partIndex >= partCount || typeof part.key !== 'string' || !part.key.startsWith(`backups/${id}/parts/`)) {
    return jsonResponse({ error: 'The requested backup part does not exist.' }, 404);
  }

  const entry = await store.getWithMetadata(part.key, { type: 'stream', consistency: 'strong' });
  if (!entry?.data) return jsonResponse({ error: 'The requested backup part could not be found in temporary storage.' }, 404);

  await database.sql`UPDATE backup_jobs SET downloaded_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
  const fileName = safeDownloadName(row.file_name || `THiS-CRM-Backup-${id}.thisbackup`);
  const partSize = Number(part.sizeBytes || entry.metadata?.sizeBytes || 0);
  const partSha256 = String(part.sha256 || entry.metadata?.sha256 || '');
  const headers = new Headers({
    'content-type': 'application/octet-stream',
    'content-disposition': `attachment; filename="${fileName}.part-${String(partIndex + 1).padStart(4, '0')}"`,
    'cache-control': 'private, no-store, max-age=0',
    'x-content-type-options': 'nosniff',
    'x-backup-file-name': encodeURIComponent(fileName),
    'x-backup-file-size': String(Number(row.size_bytes || descriptor.sizeBytes || 0)),
    'x-backup-file-sha256': String(row.archive_sha256 || descriptor.archiveSha256 || ''),
    'x-backup-part-index': String(partIndex),
    'x-backup-part-count': String(partCount),
    'x-backup-part-sha256': partSha256,
  });
  if (partSize > 0) headers.set('content-length', String(partSize));
  return new Response(entry.data, { status: 200, headers });
}

function safeDownloadName(value) {
  return String(value || 'THiS-CRM-Backup.thisbackup').replace(/[^a-zA-Z0-9._ -]/g, '-').slice(0, 180);
}
