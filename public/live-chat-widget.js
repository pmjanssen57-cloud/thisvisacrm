(() => {
  if (window.__THIS_LIVE_CHAT_WIDGET__) return;
  window.__THIS_LIVE_CHAT_WIDGET__ = true;

  const script = document.currentScript;
  const scriptUrl = new URL(script?.src || window.location.href, window.location.href);
  const baseUrl = String(script?.dataset?.baseUrl || scriptUrl.origin).replace(/\/$/, '');
  const chatOrigin = new URL(baseUrl, window.location.href).origin;
  const title = script?.dataset?.title || 'Chat with us';
  const position = script?.dataset?.position === 'left' ? 'left' : 'right';
  const parentOrigin = window.location.origin;

  const host = document.createElement('div');
  host.id = 'this-live-chat-host';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483000';
  host.style.bottom = '18px';
  host.style[position] = '18px';
  host.style.width = 'auto';
  host.style.height = 'auto';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host{all:initial}
      *{box-sizing:border-box}
      .wrap{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none;display:flex;flex-direction:column;align-items:${position === 'left' ? 'flex-start' : 'flex-end'};gap:12px}
      .panel{pointer-events:auto;width:min(390px,calc(100vw - 28px));height:min(650px,calc(100vh - 104px));border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 24px 70px rgba(0,48,43,.25),0 6px 20px rgba(0,0,0,.12);border:1px solid rgba(0,79,72,.14);transform:translateY(12px) scale(.985);opacity:0;visibility:hidden;transition:opacity .2s ease,transform .2s ease,visibility .2s ease}
      .panel.open{transform:none;opacity:1;visibility:visible}
      iframe{width:100%;height:100%;border:0;background:#fff;display:block}
      .launcher{pointer-events:auto;border:0;border-radius:999px;background:#004f48;color:#fff;min-height:56px;padding:0 19px 0 15px;display:flex;align-items:center;gap:10px;font:700 15px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 28px rgba(0,79,72,.3);cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,background .16s ease;position:relative}
      .launcher:hover{background:#003f3a;transform:translateY(-1px);box-shadow:0 15px 34px rgba(0,79,72,.34)}
      .launcher:focus-visible{outline:3px solid rgba(83,216,166,.55);outline-offset:3px}
      .launcher svg{width:25px;height:25px;flex:0 0 auto}
      .badge{position:absolute;right:-3px;top:-5px;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#b42318;color:#fff;display:none;align-items:center;justify-content:center;font:800 12px/1 system-ui;border:2px solid #fff}
      .badge.show{display:flex}
      @media(max-width:600px){
        :host{bottom:12px!important;${position}:12px!important}
        .panel{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;border-radius:0;border:0}
        .launcher{min-width:56px;width:56px;height:56px;padding:0;justify-content:center}
        .launcher span.label{display:none}
      }
      @media(prefers-reduced-motion:reduce){.panel,.launcher{transition:none}}
    </style>
    <div class="wrap">
      <div class="panel" aria-hidden="true">
        <iframe title="Turner Hopkins live chat" allow="clipboard-write"></iframe>
      </div>
      <button class="launcher" type="button" aria-expanded="false" aria-label="${escapeAttribute(title)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 9h8M8 13h5"/></svg>
        <span class="label">${escapeHtml(title)}</span>
        <span class="badge" aria-label="Unread chat messages"></span>
      </button>
    </div>`;

  const panel = root.querySelector('.panel');
  const iframe = root.querySelector('iframe');
  const launcher = root.querySelector('.launcher');
  const badge = root.querySelector('.badge');
  let open = false;
  let iframeLoaded = false;

  function ensureIframe() {
    if (iframeLoaded) return;
    const url = new URL(`${baseUrl}/live-chat.html`);
    url.searchParams.set('parentOrigin', parentOrigin);
    url.searchParams.set('page', window.location.href);
    iframe.src = url.toString();
    iframeLoaded = true;
  }

  function setOpen(next) {
    open = Boolean(next);
    if (open) ensureIframe();
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    launcher.setAttribute('aria-label', open ? 'Close live chat' : title);
    if (iframeLoaded) iframe.contentWindow?.postMessage({ type: 'this-live-chat-visibility', open }, chatOrigin);
    if (open) {
      badge.classList.remove('show');
      window.setTimeout(() => iframe.contentWindow?.postMessage({ type: 'this-live-chat-focus' }, chatOrigin), 180);
    }
  }

  iframe.addEventListener('load', () => {
    iframe.contentWindow?.postMessage({ type: 'this-live-chat-visibility', open }, chatOrigin);
    if (open) iframe.contentWindow?.postMessage({ type: 'this-live-chat-focus' }, chatOrigin);
  });
  launcher.addEventListener('click', () => setOpen(!open));
  window.addEventListener('message', (event) => {
    if (event.origin !== chatOrigin || event.source !== iframe.contentWindow) return;
    if (event.data?.type === 'this-live-chat-close') setOpen(false);
    if (event.data?.type === 'this-live-chat-unread' && !open) {
      const count = Math.max(0, Math.min(99, Number(event.data.count || 0)));
      badge.textContent = count > 9 ? '9+' : String(count || '');
      badge.classList.toggle('show', count > 0);
    }
  });

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
})();
