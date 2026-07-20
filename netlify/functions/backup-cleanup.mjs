import { cleanExpiredAndStaleJobs } from './_backup-cleanup.mjs';
import { databaseClient, ensureBackupSchema } from './_backup-common.mjs';

export default async function scheduledBackupCleanup() {
  const database = databaseClient();
  await ensureBackupSchema(database);
  const result = await cleanExpiredAndStaleJobs(database);
  console.log(`Backup cleanup complete: ${result.expired} expired archive(s) removed; ${result.stale} stale job(s) closed.`);
}

export const config = { schedule: '@hourly' };
