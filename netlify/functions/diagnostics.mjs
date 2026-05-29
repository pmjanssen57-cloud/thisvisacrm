import { getDatabase } from '@netlify/database';

export const handler = async () => {
  try {
    const db = getDatabase();
    const rows = await db.sql`SELECT NOW() AS now`;
    return json({ ok: true, database: 'connected', now: rows?.[0]?.now || null });
  } catch (error) {
    return json({ ok: false, error: 'database diagnostic failed', detail: String(error?.message || error) }, 500);
  }
};

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}
