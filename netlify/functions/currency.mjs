const SUPPORTED = new Set(['NZD', 'AUD', 'USD', 'GBP', 'EUR', 'CAD', 'CNY', 'INR', 'PHP', 'ZAR', 'JPY', 'SGD']);

export default async function currencyRequestHandler(request) {
  if (request.method === 'OPTIONS') return json({ ok: true }, 204);
  try {
    const url = new URL(request.url);
    const amount = Number(url.searchParams.get('amount') || '1');
    const from = normaliseCurrency(url.searchParams.get('from') || 'NZD');
    const to = normaliseCurrency(url.searchParams.get('to') || 'USD');

    if (!Number.isFinite(amount) || amount <= 0) return json({ ok: false, error: 'Enter an amount greater than zero.' }, 400);
    if (!SUPPORTED.has(from) || !SUPPORTED.has(to)) return json({ ok: false, error: 'Currency is not supported by the CRM converter.' }, 400);
    if (from === to) return json({ ok: true, amount, converted: amount, rate: 1, date: todayDateOnly(), source: 'Same currency' });

    const primary = await tryOpenExchangeRates(amount, from, to);
    if (primary) return json({ ok: true, ...primary });

    const fallback = await tryFrankfurter(amount, from, to);
    if (fallback) return json({ ok: true, ...fallback });

    return json({ ok: false, error: 'Currency service unavailable. Try again later.' }, 502);
  } catch (error) {
    return json({ ok: false, error: 'Currency conversion failed.', detail: String(error?.message || error) }, 500);
  }
}

async function tryOpenExchangeRates(amount, from, to) {
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const body = await response.json();
    const rate = Number(body?.rates?.[to]);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return {
      amount,
      converted: amount * rate,
      rate,
      date: body?.time_last_update_utc ? body.time_last_update_utc.slice(5, 16) : todayDateOnly(),
      source: 'Open ER API',
    };
  } catch {
    return null;
  }
}

async function tryFrankfurter(amount, from, to) {
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const body = await response.json();
    const converted = Number(body?.rates?.[to]);
    if (!Number.isFinite(converted) || converted <= 0) return null;
    return {
      amount,
      converted,
      rate: converted / amount,
      date: body?.date || todayDateOnly(),
      source: 'Frankfurter',
    };
  } catch {
    return null;
  }
}

function normaliseCurrency(value) {
  return String(value || '').trim().toUpperCase().slice(0, 3);
}

function todayDateOnly() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-methods': 'GET, OPTIONS',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    },
  });
}
