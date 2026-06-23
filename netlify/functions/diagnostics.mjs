import { getDatabase } from '@netlify/database';

export const handler = async () => {
  try {
    const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const db = connectionString ? getDatabase({ connectionString }) : getDatabase();
    await db.sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await db.sql`CREATE TABLE IF NOT EXISTS crm_diagnostics_probe (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const nowRows = await db.sql`SELECT NOW() AS now`;
    const tableRows = await db.sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    return json({ ok: true, database: 'connected', now: nowRows?.[0]?.now || null, tables: tableRows.map((row) => row.table_name) });
  } catch (error) {
    return json({ ok: false, error: 'database diagnostic failed', detail: String(error?.message || error), stack: String(error?.stack || '').split('\n').slice(0, 5) }, 500);
  }
};

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' },
    body: JSON.stringify(body),
  };
}
