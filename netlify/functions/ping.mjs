export const handler = async () => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' },
  body: JSON.stringify({ ok: true, function: 'ping', runtime: 'esm' })
});
