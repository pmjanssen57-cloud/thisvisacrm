import { getStore } from '@netlify/blobs';
import { BACKUP_STORE, isUuid } from './_backup-common.mjs';

const CLEANUP_BATCH_LIMIT = 50;

export async function cleanExpiredAndStaleJobs(database) {
  const staleRows = await database.sql`
    UPDATE backup_jobs
    SET status = 'Failed', error_message = COALESCE(error_message, 'The backup job did not complete within the expected time.'),
        current_step = 'Stopped', updated_at = NOW()
    WHERE status IN ('Queued', 'Processing')
      AND created_at < NOW() - INTERVAL '20 minutes'
    RETURNING id
  `;
  if (staleRows.length) console.warn(`Marked ${staleRows.length} stale backup job(s) as failed.`);

  const expiredRows = await database.sql`
    SELECT id, blob_key
    FROM backup_jobs
    WHERE status = 'Ready' AND expires_at IS NOT NULL AND expires_at <= NOW()
    ORDER BY expires_at ASC
    LIMIT ${CLEANUP_BATCH_LIMIT}
  `;
  for (const row of expiredRows) await expireBackup(database, row);
  return { stale: staleRows.length, expired: expiredRows.length };
}

export async function deleteBackupArtifacts(jobId) {
  if (!isUuid(jobId)) throw new Error('A valid backup ID is required for backup cleanup.');
  const store = getStore({ name: BACKUP_STORE, consistency: 'strong' });
  const prefix = `backups/${jobId}/`;
  const listed = await store.list({ prefix });
  const blobs = Array.isArray(listed?.blobs) ? listed.blobs : [];
  let deleted = 0;
  for (const blob of blobs) {
    const key = String(blob?.key || '');
    if (!key.startsWith(prefix)) continue;
    await store.delete(key);
    deleted += 1;
  }
  return deleted;
}

export async function expireBackup(database, row) {
  try {
    await deleteBackupArtifacts(row.id);
  } catch (error) {
    console.warn('Expired backup artifact cleanup failed', error?.message || error);
  }
  await database.sql`
    UPDATE backup_jobs
    SET status = 'Expired', blob_key = NULL, part_count = 0, parts = '[]'::jsonb,
        current_step = 'Expired', updated_at = NOW()
    WHERE id = ${row.id}
  `;
}
