import { useCallback, useLayoutEffect, useState } from 'react';

function read(key, fallback) {
  try { const raw = sessionStorage.getItem(`this_ui46:${key}`); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}

// View preferences only. CRM records and unsaved edits are never stored here.
export function useWorkspaceState(key, initial) {
  const fallback = typeof initial === 'function' ? initial() : initial;
  const [entry, setEntry] = useState(() => ({ key, value: read(key, fallback) }));
  const value = entry.key === key ? entry.value : read(key, fallback);
  const setValue = useCallback((next) => setEntry((previous) => {
    const current = previous.key === key ? previous.value : read(key, fallback);
    const value = typeof next === 'function' ? next(current) : next;
    try { sessionStorage.setItem(`this_ui46:${key}`, JSON.stringify(value)); } catch {}
    return { key, value };
  }), [key, JSON.stringify(fallback)]);
  return [value, setValue];
}

export function useWorkspaceScroll(route) {
  useLayoutEffect(() => {
    const key = `this_ui46:scroll:${route}`;
    let saved = 0;
    try { saved = Number(sessionStorage.getItem(key) || 0); } catch {}
    const frame = requestAnimationFrame(() => window.scrollTo(0, saved));
    return () => {
      cancelAnimationFrame(frame);
      try { sessionStorage.setItem(key, String(window.scrollY)); } catch {}
    };
  }, [route]);
}
