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
  host.style.bottom = '20px';
  host.style[position] = '20px';
  host.style.width = 'auto';
  host.style.height = 'auto';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host{all:initial}
      *{box-sizing:border-box}
      .wrap{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none;display:flex;flex-direction:column;align-items:${position === 'left' ? 'flex-start' : 'flex-end'};gap:14px}
      .panel{pointer-events:auto;width:min(390px,calc(100vw - 28px));height:min(650px,calc(100vh - 112px));border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 24px 70px rgba(0,48,43,.25),0 6px 20px rgba(0,0,0,.12);border:1px solid rgba(0,79,72,.14);transform:translateY(12px) scale(.985);opacity:0;visibility:hidden;transition:opacity .2s ease,transform .2s ease,visibility .2s ease}
      .panel.open{transform:none;opacity:1;visibility:visible}
      iframe{width:100%;height:100%;border:0;background:#fff;display:block}
      .launcher{pointer-events:auto;min-height:64px;padding:7px 20px 7px 8px;border:1px solid rgba(119,224,183,.72);border-radius:999px;background:linear-gradient(135deg,#004c46 0%,#00665c 100%);color:#fff;display:flex;align-items:center;gap:11px;font:inherit;cursor:pointer;position:relative;isolation:isolate;box-shadow:0 16px 34px rgba(0,78,70,.31),0 0 0 4px rgba(231,250,243,.88);transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
      .launcher::before{content:"";position:absolute;inset:1px;border-radius:inherit;background:linear-gradient(110deg,rgba(255,255,255,.12),transparent 42%);z-index:-1;pointer-events:none}
      .launcher:hover{transform:translateY(-2px);box-shadow:0 20px 42px rgba(0,78,70,.36),0 0 0 5px rgba(213,247,235,.94);filter:saturate(1.04)}
      .launcher:active{transform:translateY(0)}
      .launcher:focus-visible{outline:3px solid rgba(83,216,166,.58);outline-offset:5px}
      .icon-shell{width:48px;height:48px;flex:0 0 48px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#effcf7,#c9f3e3);color:#00564e;border:1px solid rgba(255,255,255,.9);box-shadow:0 5px 13px rgba(0,44,40,.2),inset 0 1px 0 #fff}
      .icon-shell svg{width:25px;height:25px}
      .launcher-copy{display:grid;gap:4px;text-align:left;white-space:nowrap}
      .label{font:800 15px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.005em}
      .status{display:flex;align-items:center;gap:6px;color:rgba(255,255,255,.78);font:650 10.5px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.025em}
      .status-dot{width:7px;height:7px;border-radius:50%;background:#e2b443;box-shadow:0 0 0 3px rgba(226,180,67,.16)}
      .launcher.live .status-dot{background:#69e2b5;box-shadow:0 0 0 3px rgba(105,226,181,.18);animation:statusPulse 2.7s ease-in-out infinite}
      .launcher.offline .status{color:rgba(255,255,255,.72)}
      .badge{position:absolute;right:-4px;top:-6px;min-width:23px;height:23px;padding:0 6px;border-radius:999px;background:#b42318;color:#fff;display:none;align-items:center;justify-content:center;font:800 12px/1 system-ui;border:2px solid #fff;box-shadow:0 4px 10px rgba(78,14,10,.25)}
      .badge.show{display:flex;animation:badgePop .28s ease-out}
      @keyframes statusPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 3px rgba(105,226,181,.16)}50%{transform:scale(1.08);box-shadow:0 0 0 5px rgba(105,226,181,.07)}}
      @keyframes badgePop{0%{transform:scale(.6)}70%{transform:scale(1.12)}100%{transform:scale(1)}}
      @media(max-width:600px){
        :host{bottom:14px!important;${position}:14px!important}
        .panel{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;border-radius:0;border:0}
        .launcher{min-width:60px;width:60px;height:60px;min-height:60px;padding:5px;justify-content:center;box-shadow:0 13px 30px rgba(0,78,70,.32),0 0 0 4px rgba(231,250,243,.9)}
        .icon-shell{width:48px;height:48px;flex-basis:48px}
        .launcher-copy{display:none}
      }
      @media(prefers-reduced-motion:reduce){.panel,.launcher{transition:none}.launcher.live .status-dot,.badge.show{animation:none}}
    </style>
    <div class="wrap">
      <div class="panel" aria-hidden="true">
        <iframe title="Turner Hopkins live chat" allow="clipboard-write"></iframe>
      </div>
      <button class="launcher" type="button" aria-expanded="false" aria-label="${escapeAttribute(title)}">
        <span class="icon-shell" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 9h8M8 13h5"/></svg>
        </span>
        <span class="launcher-copy">
          <span class="label">${escapeHtml(title)}</span>
          <span class="status"><span class="status-dot" aria-hidden="true"></span><span class="status-text">Chat or leave a message</span></span>
        </span>
        <span class="badge" aria-label="Unread chat messages"></span>
      </button>
    </div>`;

  const panel = root.querySelector('.panel');
  const iframe = root.querySelector('iframe');
  const launcher = root.querySelector('.launcher');
  const statusText = root.querySelector('.status-text');
  const badge = root.querySelector('.badge');
  let open = false;
  let iframeLoaded = false;
  let statusTimer = 0;
  let statusLoading = false;
  let statusRerun = false;

  function ensureIframe() {
    if (iframeLoaded) return;
    const url = new URL(`${baseUrl}/live-chat.html`);
    url.searchParams.set('v', '0.17.4');
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

  async function refreshLauncherStatus() {
    window.clearTimeout(statusTimer);
    if (document.visibilityState !== 'visible') return;
    if (statusLoading) {
      statusRerun = true;
      return;
    }
    statusLoading = true;
    try {
      const response = await fetch(`${baseUrl}/.netlify/functions/chat?action=status`, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('Status unavailable');
      const status = await response.json();
      const live = Boolean(status?.isOpen);
      launcher.classList.toggle('live', live);
      launcher.classList.toggle('offline', !live);
      statusText.textContent = live ? 'Online now' : 'Leave a message';
      launcher.title = live ? 'Live chat is open' : 'Leave Turner Hopkins a message';
    } catch {
      launcher.classList.remove('live', 'offline');
      statusText.textContent = 'Chat or leave a message';
      launcher.removeAttribute('title');
    } finally {
      statusLoading = false;
      if (statusRerun) {
        statusRerun = false;
        statusTimer = window.setTimeout(refreshLauncherStatus, 250);
      } else {
        if (document.visibilityState === 'visible') statusTimer = window.setTimeout(refreshLauncherStatus, 300000);
      }
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
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(statusTimer);
    if (document.visibilityState === 'visible') refreshLauncherStatus();
  });
  refreshLauncherStatus();

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
})();
