import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function SidePanel({ title, subtitle, children, footer, onClose, dirty = false, busy = false, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(null);
  closeRef.current = () => {
    if (busy) return;
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    onClose?.();
  };
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dock = !wide && window.innerWidth > 1250;
    if (dock) document.body.classList.add('calm-panel-docked');
    const panel = ref.current;
    panel?.focus();
    const handler = (event) => {
      const activeDialog = document.activeElement?.closest('[role="dialog"]');
      if (activeDialog && activeDialog !== panel && !panel?.contains(activeDialog)) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter((el) => el.getClientRects().length);
      if (!items.length) { event.preventDefault(); panel.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = overflow; if (dock) document.body.classList.remove('calm-panel-docked'); document.removeEventListener('keydown', handler); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className={`calm-panel-layer ${wide ? 'calm-panel-wide' : ''}`}>
    <div className="calm-panel-scrim" onMouseDown={() => closeRef.current?.()} aria-hidden="true" />
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="calm-side-panel">
      <header className="calm-panel-heading"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="calm-icon-button" aria-label="Close panel" disabled={busy} onClick={() => closeRef.current?.()}><X size={19}/></button></header>
      <div className="calm-panel-content">{children}</div>
      {footer && <footer className="calm-panel-footer">{footer}</footer>}
    </section>
  </div>, document.body);
}
