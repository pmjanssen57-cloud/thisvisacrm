#!/usr/bin/env node
import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);
const MAGIC = Buffer.from('THISCRM1', 'ascii');
const FIXED_HEADER_BYTES = MAGIC.length + 4;
const MAX_HEADER_BYTES = 64 * 1024;

async function main() {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : '';
  if (!inputPath) {
    usage();
    process.exitCode = 1;
    return;
  }
  const outputPath = path.resolve(process.argv[3] || defaultOutputPath(inputPath));
  if (inputPath === outputPath) throw new Error('The output path must be different from the encrypted backup path.');

  const file = await open(inputPath, 'r');
  let header;
  let aad;
  let encryptedStart;
  let encryptedEnd;
  let authTag;
  try {
    const fileStats = await file.stat();
    if (fileStats.size < FIXED_HEADER_BYTES + 16) throw new Error('The file is too small to be a THiS CRM backup.');

    const fixedHeader = Buffer.alloc(FIXED_HEADER_BYTES);
    await readExact(file, fixedHeader, 0);
    if (!fixedHeader.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('This is not a recognised THiS CRM backup file.');

    const headerLength = fixedHeader.readUInt32BE(MAGIC.length);
    if (headerLength < 2 || headerLength > MAX_HEADER_BYTES) throw new Error('The encrypted backup header is invalid.');

    const headerBuffer = Buffer.alloc(headerLength);
    await readExact(file, headerBuffer, FIXED_HEADER_BYTES);
    try {
      header = JSON.parse(headerBuffer.toString('utf8'));
    } catch {
      throw new Error('The encrypted backup header cannot be read.');
    }

    validateHeader(header);
    aad = Buffer.concat([fixedHeader, headerBuffer]);
    encryptedStart = aad.length;
    const authTagBytes = Number(header.authTagBytes || 16);
    encryptedEnd = fileStats.size - authTagBytes - 1;
    if (encryptedEnd < encryptedStart) throw new Error('The encrypted backup payload is incomplete.');

    authTag = Buffer.alloc(authTagBytes);
    await readExact(file, authTag, fileStats.size - authTagBytes);
  } finally {
    await file.close();
  }

  const password = process.env.THIS_BACKUP_PASSWORD || await readHiddenPassword('Backup password: ');
  if (!password) throw new Error('A backup password is required.');

  const salt = Buffer.from(header.salt, 'base64');
  const iv = Buffer.from(header.iv, 'base64');
  const scrypt = header.scrypt || {};
  const key = await scryptAsync(password, salt, Number(scrypt.keyLength || 32), {
    N: Number(scrypt.N || 32768),
    r: Number(scrypt.r || 8),
    p: Number(scrypt.p || 1),
    maxmem: 128 * 1024 * 1024,
  });

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: authTag.length });
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);

  try {
    await pipeline(
      createReadStream(inputPath, { start: encryptedStart, end: encryptedEnd }),
      decipher,
      createWriteStream(outputPath, { flags: 'wx', mode: 0o600 }),
    );
  } catch (error) {
    await rm(outputPath, { force: true }).catch(() => {});
    if (String(error?.code || '') === 'EEXIST') {
      throw new Error(`The output file already exists: ${outputPath}`);
    }
    throw new Error('The backup could not be decrypted. The password may be incorrect, or the file may be damaged.');
  }

  console.log(`Decrypted backup written to:\n${outputPath}`);
  console.log('Open the ZIP and review manifest.json, RESTORE-INSTRUCTIONS.txt and checksums.sha256.');
}

function validateHeader(header) {
  if (header?.product !== 'THiS CRM') throw new Error('The encrypted backup product header is invalid.');
  if (header?.format !== 'encrypted-zip') throw new Error('The encrypted backup format is not supported.');
  if (Number(header?.formatVersion) !== 1) throw new Error(`Unsupported backup format version: ${header?.formatVersion ?? 'unknown'}.`);
  if (header?.encryption !== 'AES-256-GCM' || header?.keyDerivation !== 'scrypt') {
    throw new Error('The backup uses an unsupported encryption format.');
  }
  if (!header?.salt || !header?.iv) throw new Error('The encrypted backup header is incomplete.');
}

async function readExact(file, buffer, position) {
  let offset = 0;
  while (offset < buffer.length) {
    const result = await file.read(buffer, offset, buffer.length - offset, position + offset);
    if (!result.bytesRead) throw new Error('Unexpected end of backup file.');
    offset += result.bytesRead;
  }
}

async function readHiddenPassword(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command in a terminal, or set THIS_BACKUP_PASSWORD for this one command.');
  }
  return await new Promise((resolve, reject) => {
    let value = '';
    const stdin = process.stdin;
    const stdout = process.stdout;
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      for (const character of text) {
        if (character === '\u0003') {
          cleanup();
          stdout.write('\n');
          reject(new Error('Cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ') {
          value += character;
          stdout.write('*');
        }
      }
    };
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

function defaultOutputPath(inputPath) {
  const lower = inputPath.toLowerCase();
  if (lower.endsWith('.thisbackup')) return inputPath.slice(0, -11) + '.zip';
  return inputPath + '.zip';
}

function usage() {
  console.error('Usage: node scripts/decrypt-this-backup.mjs <backup.thisbackup> [output.zip]');
  console.error('The password is requested securely. It can also be supplied for one command through THIS_BACKUP_PASSWORD.');
}

main().catch((error) => {
  console.error(`Backup decryption failed: ${error.message || error}`);
  process.exitCode = 1;
});
