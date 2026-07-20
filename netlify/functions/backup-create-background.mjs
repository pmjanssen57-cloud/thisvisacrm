import archiver from 'archiver';
import crypto from 'node:crypto';
import { createReadStream, createWriteStream, openAsBlob } from 'node:fs';
import { readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { promisify } from 'node:util';
import { getStore } from '@netlify/blobs';
import {
  BACKUP_STORE,
  authenticateBackupRequest,
  backupRetentionHours,
  databaseClient,
  ensureBackupSchema,
  hasBackupAdminAccess,
  isUuid,
  passwordStrengthError,
} from './_backup-common.mjs';
import { deleteBackupArtifacts } from './_backup-cleanup.mjs';

const scryptAsync = promisify(crypto.scrypt);
const SOURCE_VERSION = '0.13.43';
const BACKUP_FORMAT_VERSION = 1;
const MAGIC = Buffer.from('THISCRM1', 'ascii');
const AUTH_TAG_BYTES = 16;
const BACKUP_PART_BYTES = 16 * 1024 * 1024;
const BLOB_STORES = [
  { name: 'intake-uploads', archiveFolder: 'intake-uploads' },
  { name: 'client-portal-documents', archiveFolder: 'client-portal-documents' },
  { name: 'commercial-documents', archiveFolder: 'commercial-documents' },
];

export default async function createBackupHandler(request) {
  const auth = await authenticateBackupRequest(request);
  if (!auth.ok || !(await hasBackupAdminAccess(auth))) {
    console.warn('Rejected unauthorised backup worker invocation.');
    return;
  }

  const body = await request.json().catch(() => ({}));
  const jobId = String(body.jobId || '');
  const password = String(body.password || '');
  if (!isUuid(jobId)) {
    console.warn('Backup worker received an invalid job ID.');
    return;
  }
  const passwordError = passwordStrengthError(password);
  if (passwordError) {
    await failJob(jobId, passwordError);
    return;
  }

  const database = databaseClient();
  await ensureBackupSchema(database);
  const locked = await database.sql`
    UPDATE backup_jobs
    SET status = 'Processing', progress = 3, current_step = 'Starting secure export', started_at = COALESCE(started_at, NOW()),
        error_message = NULL, updated_at = NOW()
    WHERE id = ${jobId} AND status IN ('Queued', 'Failed')
    RETURNING id
  `;
  if (!locked[0]) return;

  const temporaryPath = path.join('/tmp', `${jobId}.thisbackup`);
  try {
    await deleteBackupArtifacts(jobId).catch((error) => console.warn('Could not clear previous backup parts', safeError(error)));
    const result = await createEncryptedArchive({ database, jobId, password, temporaryPath });
    await updateJob(database, jobId, 92, 'Preparing secure download parts');

    const fileBlob = await openAsBlob(temporaryPath, { type: 'application/octet-stream' });
    const expiresAt = new Date(Date.now() + backupRetentionHours() * 60 * 60 * 1000);
    const store = getStore({ name: BACKUP_STORE, consistency: 'strong' });
    const partCount = Math.max(1, Math.ceil(result.sizeBytes / BACKUP_PART_BYTES));
    const parts = [];
    for (let index = 0; index < partCount; index += 1) {
      const start = index * BACKUP_PART_BYTES;
      const end = Math.min(result.sizeBytes, start + BACKUP_PART_BYTES);
      const partKey = `backups/${jobId}/parts/${String(index).padStart(4, '0')}.part`;
      const partSha256 = await sha256FileRange(temporaryPath, start, end - 1);
      await store.set(partKey, fileBlob.slice(start, end), {
        metadata: {
          jobId,
          partIndex: index,
          partCount,
          sizeBytes: end - start,
          sha256: partSha256,
          expiresAt: expiresAt.toISOString(),
        },
      });
      parts.push({ index, key: partKey, sizeBytes: end - start, sha256: partSha256 });
      await updateJob(database, jobId, 93 + Math.round(((index + 1) / partCount) * 5), `Uploading encrypted part ${index + 1} of ${partCount}`);
    }

    const descriptorKey = `backups/${jobId}/descriptor.json`;
    await store.setJSON(descriptorKey, {
      jobId,
      fileName: result.fileName,
      sizeBytes: result.sizeBytes,
      archiveSha256: result.archiveSha256,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      formatVersion: BACKUP_FORMAT_VERSION,
      parts,
    }, {
      metadata: {
        jobId,
        fileName: result.fileName,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        formatVersion: BACKUP_FORMAT_VERSION,
      },
    });

    await database.sql`
      UPDATE backup_jobs
      SET status = 'Ready', progress = 100, current_step = 'Ready to download', file_name = ${result.fileName},
          blob_key = ${descriptorKey}, size_bytes = ${result.sizeBytes}, archive_sha256 = ${result.archiveSha256},
          part_count = ${partCount}, parts = CAST(${JSON.stringify(parts.map(({ index, sizeBytes, sha256 }) => ({ index, sizeBytes, sha256 })))} AS jsonb),
          table_count = ${result.tableCount}, record_count = ${result.recordCount}, file_count = ${result.fileCount},
          failed_files = CAST(${JSON.stringify(result.failedFiles)} AS jsonb), completed_at = NOW(), expires_at = ${expiresAt.toISOString()},
          updated_at = NOW()
      WHERE id = ${jobId}
    `;
  } catch (error) {
    console.error('Backup creation failed', error);
    await deleteBackupArtifacts(jobId).catch((cleanupError) => console.warn('Partial backup cleanup failed', safeError(cleanupError)));
    await database.sql`
      UPDATE backup_jobs
      SET status = 'Failed', progress = 0, current_step = 'Backup failed',
          error_message = ${safeError(error)}, updated_at = NOW()
      WHERE id = ${jobId}
    `;
    throw error;
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}

async function createEncryptedArchive({ database, jobId, password, temporaryPath }) {
  const createdAt = new Date();
  const fileName = buildBackupFileName(createdAt);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await scryptAsync(password, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const header = Buffer.from(JSON.stringify({
    product: 'THiS CRM',
    format: 'encrypted-zip',
    formatVersion: BACKUP_FORMAT_VERSION,
    crmVersion: SOURCE_VERSION,
    encryption: 'AES-256-GCM',
    keyDerivation: 'scrypt',
    scrypt: { N: 32768, r: 8, p: 1, keyLength: 32 },
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTagBytes: AUTH_TAG_BYTES,
    createdAt: createdAt.toISOString(),
  }), 'utf8');
  const headerLength = Buffer.alloc(4);
  headerLength.writeUInt32BE(header.length, 0);
  const aad = Buffer.concat([MAGIC, headerLength, header]);

  const output = createWriteStream(temporaryPath, { flags: 'w', mode: 0o600 });
  output.write(aad);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_BYTES });
  cipher.setAAD(aad);
  const zip = archiver('zip', { zlib: { level: 9 } });
  zip.on('warning', (error) => {
    if (error.code !== 'ENOENT') {
      cipher.destroy(error);
      return;
    }
    console.warn('Backup archive warning', error.message);
  });
  zip.on('error', (error) => cipher.destroy(error));
  zip.pipe(cipher);
  cipher.pipe(output, { end: false });

  const checksums = [];
  const failedFiles = [];
  let tableCount = 0;
  let recordCount = 0;
  let fileCount = 0;

  await updateJob(database, jobId, 8, 'Reading database structure');
  const schemaSnapshot = await readSchemaSnapshot(database);
  appendJson(zip, checksums, 'database/schema.json', schemaSnapshot);

  const tableNames = await readTableNames(database);
  tableCount = tableNames.length;
  for (let index = 0; index < tableNames.length; index += 1) {
    const tableName = tableNames[index];
    const identifier = database.sql.identifier({ schema: 'public', table: tableName });
    const rows = await database.sql`SELECT * FROM ${identifier}`;
    recordCount += rows.length;
    appendJson(zip, checksums, `database/${safeArchiveSegment(tableName)}.json`, {
      table: tableName,
      exportedAt: createdAt.toISOString(),
      rowCount: rows.length,
      rows,
    });
    const progress = 10 + Math.round(((index + 1) / Math.max(1, tableNames.length)) * 30);
    await updateJob(database, jobId, progress, `Exporting database: ${tableName}`);
  }

  const migrationResult = await appendMigrationFiles(zip, checksums);

  await updateJob(database, jobId, 45, 'Listing uploaded files');
  const listedStores = [];
  let totalBlobCount = 0;
  for (const storeConfig of BLOB_STORES) {
    const store = getStore({ name: storeConfig.name, consistency: 'strong' });
    const { blobs = [] } = await store.list();
    listedStores.push({ ...storeConfig, store, blobs });
    totalBlobCount += blobs.length;
  }

  let processedBlobs = 0;
  for (const storeItem of listedStores) {
    const indexRows = [];
    for (const blob of storeItem.blobs) {
      const originalKey = String(blob.key || '');
      const archivePath = buildBlobArchivePath(storeItem.archiveFolder, originalKey);
      try {
        const entry = await storeItem.store.getWithMetadata(originalKey, { type: 'arrayBuffer', consistency: 'strong' });
        if (!entry?.data) throw new Error('Blob was not found.');
        const buffer = Buffer.from(entry.data);
        const digest = sha256(buffer);
        await appendBufferEntry(zip, buffer, { name: archivePath, date: createdAt });
        checksums.push({ path: archivePath, sha256: digest });
        indexRows.push({
          originalKey,
          archivePath,
          etag: entry.etag || blob.etag || '',
          metadata: entry.metadata || {},
          sizeBytes: buffer.length,
          sha256: digest,
        });
        fileCount += 1;
      } catch (error) {
        const failure = { store: storeItem.name, key: originalKey, error: safeError(error) };
        failedFiles.push(failure);
        indexRows.push({ originalKey, archivePath, error: failure.error });
      }
      processedBlobs += 1;
      const progress = 46 + Math.round((processedBlobs / Math.max(1, totalBlobCount)) * 34);
      await updateJob(database, jobId, progress, `Collecting files: ${processedBlobs} of ${totalBlobCount}`);
    }
    appendJson(zip, checksums, `files/${storeItem.archiveFolder}/_index.json`, {
      store: storeItem.name,
      exportedAt: createdAt.toISOString(),
      entries: indexRows,
    });
  }

  await updateJob(database, jobId, 82, 'Writing manifest and checksums');
  const restoreInstructions = buildRestoreInstructions();
  appendText(zip, checksums, 'RESTORE-INSTRUCTIONS.txt', restoreInstructions);

  const manifest = {
    product: 'THiS CRM',
    crmVersion: SOURCE_VERSION,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    createdAt: createdAt.toISOString(),
    timezone: 'Pacific/Auckland',
    database: {
      tableCount,
      recordCount,
      tables: tableNames,
      schemaSnapshotIncluded: true,
      migrationFilesIncluded: migrationResult.included,
      migrationFileCount: migrationResult.count,
      excludedTables: ['backup_jobs'],
    },
    files: {
      stores: BLOB_STORES.map((item) => item.name),
      discoveredCount: totalBlobCount,
      includedCount: fileCount,
      failedCount: failedFiles.length,
      failures: failedFiles,
    },
    security: {
      encrypted: true,
      encryption: 'AES-256-GCM',
      passwordStored: false,
      environmentVariablesIncluded: false,
      connectionStringsIncluded: false,
    },
  };
  appendJson(zip, checksums, 'manifest.json', manifest);
  appendText(zip, checksums, 'checksums.sha256', checksums.map((item) => `${item.sha256}  ${item.path}`).join('\n') + '\n', false);

  await updateJob(database, jobId, 88, 'Finalising encrypted archive');
  const cipherFinished = finished(cipher);
  await zip.finalize();
  await cipherFinished;
  output.write(cipher.getAuthTag());
  output.end();
  await finished(output);

  const archiveStats = await stat(temporaryPath);
  const archiveSha256 = await sha256File(temporaryPath);
  return {
    fileName,
    sizeBytes: archiveStats.size,
    archiveSha256,
    tableCount,
    recordCount,
    fileCount,
    failedFiles,
  };
}

async function readTableNames(database) {
  const rows = await database.sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> 'backup_jobs'
    ORDER BY table_name
  `;
  return rows.map((row) => row.table_name).filter(Boolean);
}

async function readSchemaSnapshot(database) {
  const columns = await database.sql`
    SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  const constraints = await database.sql`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name,
           ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
  `;
  return { exportedAt: new Date().toISOString(), columns, constraints };
}

async function appendMigrationFiles(zip, checksums) {
  const candidates = [
    path.join(process.cwd(), 'netlify', 'database', 'migrations'),
    path.resolve('netlify/database/migrations'),
  ];
  for (const directory of candidates) {
    try {
      const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
      for (const name of files) {
        const content = await readFile(path.join(directory, name));
        const archivePath = `migrations/${safeArchiveSegment(name)}`;
        zip.append(content, { name: archivePath });
        checksums.push({ path: archivePath, sha256: sha256(content) });
      }
      return { included: true, count: files.length };
    } catch {
      // Try the next packaged path.
    }
  }
  const note = 'Migration source files were not available in the function bundle. The database schema snapshot is included instead.\n';
  appendText(zip, checksums, 'migrations/README.txt', note);
  return { included: false, count: 0 };
}

function appendJson(zip, checksums, archivePath, value) {
  const buffer = Buffer.from(JSON.stringify(value, jsonReplacer, 2) + '\n', 'utf8');
  zip.append(buffer, { name: archivePath });
  checksums.push({ path: archivePath, sha256: sha256(buffer) });
}

function appendText(zip, checksums, archivePath, text, includeChecksum = true) {
  const buffer = Buffer.from(String(text || ''), 'utf8');
  zip.append(buffer, { name: archivePath });
  if (includeChecksum) checksums.push({ path: archivePath, sha256: sha256(buffer) });
}

function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return { type: 'Buffer', dataBase64: value.toString('base64') };
  return value;
}


function buildBlobArchivePath(folder, originalKey) {
  const safePath = safeBlobPath(originalKey);
  const keyHash = sha256(Buffer.from(String(originalKey || ''), 'utf8')).slice(0, 16);
  return `files/${safeArchiveSegment(folder)}/data/${keyHash}/${safePath}`;
}

function safeBlobPath(value) {
  const parts = String(value || 'unnamed-blob')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => safeArchiveSegment(part === '..' ? '_' : part));
  return parts.join('/') || 'unnamed-blob';
}

function safeArchiveSegment(value) {
  const cleaned = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/:*?"<>|]+/g, '-').trim();
  return cleaned.slice(0, 180) || 'unnamed';
}

function buildBackupFileName(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `THiS-CRM-Backup-${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}-NZ.thisbackup`;
}

function buildRestoreInstructions() {
  return `THiS CRM encrypted backup\n\nThis archive was created by THiS CRM v${SOURCE_VERSION}.\n\nThe .thisbackup file is an AES-256-GCM encrypted ZIP container. The password is not stored in the CRM or in this archive. Keep it separately.\n\nTo inspect this backup:\n1. Use the scripts/decrypt-this-backup.mjs utility supplied with the v${SOURCE_VERSION} CRM source package.\n2. Decrypt the .thisbackup file to a ZIP file using the password entered when the backup was created.\n3. Verify checksums.sha256 before using any data.\n\nThis Phase 1 release does not restore data automatically into production. Restoration should first be rehearsed against a test database or database branch.\n`;
}

async function updateJob(database, jobId, progress, currentStep) {
  await database.sql`
    UPDATE backup_jobs
    SET progress = ${Math.max(0, Math.min(100, Number(progress || 0)))}, current_step = ${String(currentStep || '')}, updated_at = NOW()
    WHERE id = ${jobId}
  `;
}

async function failJob(jobId, message) {
  try {
    const database = databaseClient();
    await ensureBackupSchema(database);
    await database.sql`
      UPDATE backup_jobs SET status = 'Failed', progress = 0, current_step = 'Backup failed', error_message = ${message}, updated_at = NOW()
      WHERE id = ${jobId}
    `;
  } catch (error) {
    console.error('Could not record backup validation failure', error);
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

async function sha256FileRange(filePath, start, end) {
  const hash = crypto.createHash('sha256');
  const stream = createReadStream(filePath, { start, end });
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

function appendBufferEntry(zip, buffer, options) {
  return new Promise((resolve, reject) => {
    const expectedName = options.name;
    const onEntry = (entry) => {
      if (entry?.name !== expectedName) return;
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      zip.off('entry', onEntry);
      zip.off('error', onError);
    };
    zip.on('entry', onEntry);
    zip.on('error', onError);
    zip.append(buffer, options);
  });
}

function safeError(error) {
  return String(error?.message || error || 'Unknown backup error').slice(0, 1000);
}
