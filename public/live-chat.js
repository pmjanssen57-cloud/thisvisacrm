(() => {
  const main = document.getElementById('chat-main');
  const statusLabel = document.getElementById('chat-status-label');
  const closeButton = document.getElementById('chat-close');
  const params = new URLSearchParams(window.location.search);
  const parentOrigin = params.get('parentOrigin') || '*';
  const sourcePage = params.get('page') || document.referrer || '';
  const STORAGE_KEY = 'this_live_chat_session_v1';
  let availability = null;
  let session = readSession();
  let conversation = null;
  let messages = [];
  let pollTimer = null;
  let messageCursor = '';
  let unreadWhileClosed = 0;
  let widgetOpen = false;

  closeButton.addEventListener('click', () => parentMessage({ type: 'this-live-chat-close' }));
  window.addEventListener('message', (event) => {
    if (parentOrigin !== '*' && event.origin !== parentOrigin) return;
    if (event.data?.type === 'this-live-chat-visibility') {
      widgetOpen = Boolean(event.data.open);
      if (widgetOpen) {
        unreadWhileClosed = 0;
        parentMessage({ type: 'this-live-chat-unread', count: 0 });
      }
      schedulePoll();
    }
    if (event.data?.type === 'this-live-chat-focus') {
      widgetOpen = true;
      unreadWhileClosed = 0;
      parentMessage({ type: 'this-live-chat-unread', count: 0 });
      schedulePoll();
      window.setTimeout(() => document.querySelector('textarea, input')?.focus(), 80);
    }
  });
  document.addEventListener('visibilitychange', schedulePoll);

  initialise();

  async function initialise() {
    try {
      availability = await api('/.netlify/functions/chat?action=status');
      updateStatusLabel();
      if (session?.token) {
        try {
          await pollConversation(true);
          renderConversation();
          schedulePoll();
          return;
        } catch (error) {
          if (error.status === 401 || error.status === 404) clearSession();
          else throw error;
        }
      }
      renderIntro();
    } catch (error) {
      renderServiceError(error.message || 'Live chat is temporarily unavailable.');
    }
  }

  function renderIntro() {
    const live = Boolean(availability?.isOpen);
    statusLabel.textContent = live ? 'Live chat is open' : 'Message service';
    main.innerHTML = `
      <section class="intro">
        <div class="availability-card ${live ? 'live' : ''}">
          <div class="availability-row"><span class="availability-dot"></span><strong>${live ? 'We are available for live chat' : 'Live chat is currently closed'}</strong></div>
          <p>${escapeHtml(availability?.message || '')}</p>
          ${!live && availability?.nextOpenLabel ? `<span class="availability-next">Next live-chat opening: ${escapeHtml(availability.nextOpenLabel)}</span>` : ''}
        </div>
        <form id="start-chat-form" class="chat-form" novalidate>
          <div class="field-row">
            <label class="field"><span>Name</span><input name="name" autocomplete="name" maxlength="120" required /></label>
            <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" maxlength="320" required /></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Phone (optional)</span><input name="phone" autocomplete="tel" maxlength="80" /></label>
            <label class="field"><span>Existing client?</span><select name="existingClient"><option value="no">No</option><option value="yes">Yes</option></select></label>
          </div>
          <label class="field"><span>What can we help with?</span><select name="category">${(availability?.categories || ['Other']).map((item) => `<option>${escapeHtml(item)}</option>`).join('')}</select></label>
          <label class="field"><span>Your question</span><textarea name="message" maxlength="4000" required placeholder="Briefly tell us what you need help with."></textarea></label>
          <label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off" /></label>
          <div class="safety-note">Please do not send passport numbers, medical information, police certificates or other sensitive documents through live chat.</div>
          <label class="consent"><input name="consent" type="checkbox" required /><span>I agree that Turner Hopkins may use these details to respond to my enquiry.${availability?.privacyUrl ? ` <a href="${escapeAttribute(availability.privacyUrl)}" target="_blank" rel="noopener">Privacy notice</a>` : ''}</span></label>
          <div id="start-error" class="form-error"></div>
          <button class="primary-button" type="submit">${live ? 'Start chat' : 'Leave a message'}</button>
        </form>
      </section>`;
    document.getElementById('start-chat-form').addEventListener('submit', startChat);
  }

  async function startChat(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const errorNode = document.getElementById('start-error');
    errorNode.classList.remove('show');
    if (!form.reportValidity()) return;
    submit.disabled = true;
    submit.textContent = availability?.isOpen ? 'Starting chat…' : 'Sending message…';
    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const result = await api('/.netlify/functions/chat', {
        method: 'POST',
        body: JSON.stringify({
          action: 'start',
          name: values.name,
          email: values.email,
          phone: values.phone,
          existingClient: values.existingClient === 'yes',
          category: values.category,
          message: values.message,
          website: values.website,
          consent: values.consent === 'on',
          pageUrl: sourcePage,
        }),
      });
      session = { token: result.token, conversationId: result.conversation?.id || '', createdAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      conversation = result.conversation;
      messages = result.messages || [];
      renderConversation(result.mode === 'offline');
      schedulePoll();
    } catch (error) {
      errorNode.textContent = error.message || 'Unable to start chat.';
      errorNode.classList.add('show');
      submit.disabled = false;
      submit.textContent = availability?.isOpen ? 'Start chat' : 'Leave a message';
    }
  }

  function renderConversation(forceOffline = false) {
    const isClosed = conversation?.status === 'Closed';
    const isOffline = forceOffline || conversation?.status === 'Offline';
    statusLabel.textContent = isClosed ? 'Conversation closed' : conversation?.assignedAdviserName ? `Connected with ${conversation.assignedAdviserName}` : isOffline ? 'Message received' : 'Waiting for our team';
    main.innerHTML = `
      <section class="conversation">
        ${isOffline && !isClosed ? '<div class="offline-received">Your message has been received. We will respond when the team is next available.</div>' : ''}
        <div class="conversation-banner">${conversation?.assignedAdviserName ? `You are chatting with ${escapeHtml(conversation.assignedAdviserName)}.` : 'Your message is in the team queue. You can leave this window open or return later on this device.'}</div>
        <div id="messages" class="messages"></div>
        ${isClosed ? `<div class="closed-panel"><strong>This conversation is closed.</strong><p>Start a new chat if you need further assistance.</p><button id="new-chat" class="secondary-button" type="button">Start a new chat</button></div>` : `
          <form id="message-form" class="composer">
            <textarea name="message" maxlength="4000" rows="1" placeholder="Type your message…" aria-label="Message"></textarea>
            <button class="send-button" type="submit" aria-label="Send message">➤</button>
          </form>
          <div class="conversation-actions"><button id="end-chat" type="button">End conversation</button></div>`}
      </section>`;
    renderMessages();
    if (isClosed) {
      document.getElementById('new-chat').addEventListener('click', () => { clearSession(); conversation = null; messages = []; renderIntro(); });
    } else {
      document.getElementById('message-form').addEventListener('submit', sendMessage);
      document.getElementById('end-chat').addEventListener('click', endConversation);
      const textarea = document.querySelector('.composer textarea');
      textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); document.getElementById('message-form').requestSubmit(); }
      });
    }
  }

  function renderMessages() {
    const container = document.getElementById('messages');
    if (!container) return;
    container.innerHTML = '';
    if (!messages.length) {
      container.innerHTML = '<div class="empty-message">No messages yet.</div>';
      return;
    }
    messages.forEach((message) => {
      if (message.isInternal) return;
      const node = document.createElement('article');
      node.className = `message ${message.senderType === 'visitor' ? 'visitor' : 'adviser'}`;
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = message.messageText || '';
      const meta = document.createElement('div');
      meta.className = 'message-meta';
      meta.textContent = `${message.senderType === 'visitor' ? 'You' : message.senderName || 'Turner Hopkins'} · ${formatTime(message.createdAt)}`;
      node.append(bubble, meta);
      container.appendChild(node);
    });
    container.scrollTop = container.scrollHeight;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const textarea = form.elements.message;
    const text = textarea.value.trim();
    if (!text) return;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const result = await api('/.netlify/functions/chat', { method: 'POST', headers: { 'x-chat-token': session.token }, body: JSON.stringify({ action: 'send', token: session.token, message: text }) });
      messages.push(result.message);
      textarea.value = '';
      renderMessages();
    } catch (error) {
      window.alert(error.message || 'Unable to send message.');
    } finally {
      button.disabled = false;
      textarea.focus();
    }
  }

  async function endConversation() {
    if (!window.confirm('End this conversation?')) return;
    try {
      const result = await api('/.netlify/functions/chat', { method: 'POST', headers: { 'x-chat-token': session.token }, body: JSON.stringify({ action: 'closeVisitor', token: session.token }) });
      conversation = result.conversation;
      renderConversation();
      stopPolling();
    } catch (error) {
      window.alert(error.message || 'Unable to close the conversation.');
    }
  }

  async function pollConversation(initial = false) {
    if (!session?.token) return;
    const after = !initial && messageCursor ? `&after=${encodeURIComponent(messageCursor)}` : '';
    const result = await api(`/.netlify/functions/chat?action=poll&token=${encodeURIComponent(session.token)}${after}`);
    const previousIds = new Set(messages.map((item) => item.id));
    const incoming = result.messages || [];
    const previousStatus = conversation?.status || '';
    const previousAssignee = conversation?.assignedAdviserName || '';
    const newAdviserMessages = incoming.filter((item) => !previousIds.has(item.id) && item.senderType === 'adviser');
    conversation = result.conversation;
    if (initial || !messageCursor) messages = incoming;
    else {
      const merged = [...messages];
      incoming.forEach((item) => { if (!previousIds.has(item.id)) merged.push(item); });
      messages = merged;
    }
    if (incoming.length && incoming[incoming.length - 1]?.createdAt) messageCursor = incoming[incoming.length - 1].createdAt;
    if (!initial && newAdviserMessages.length && !widgetOpen) {
      unreadWhileClosed += newAdviserMessages.length;
      parentMessage({ type: 'this-live-chat-unread', count: unreadWhileClosed });
    }
    if (!initial) {
      if (previousStatus !== conversation?.status || previousAssignee !== (conversation?.assignedAdviserName || '')) renderConversation();
      else {
        renderMessages();
        statusLabel.textContent = conversation?.assignedAdviserName ? `Connected with ${conversation.assignedAdviserName}` : conversation?.status === 'Offline' ? 'Message received' : 'Waiting for our team';
      }
    }
    if (conversation?.status === 'Closed') stopPolling();
  }

  function schedulePoll() {
    stopPolling();
    if (!session?.token || conversation?.status === 'Closed') return;
    const delay = document.visibilityState !== 'visible' ? 15000 : widgetOpen ? 3000 : 12000;
    pollTimer = window.setInterval(() => pollConversation(false).catch(() => {}), delay);
  }
  function stopPolling() { if (pollTimer) window.clearInterval(pollTimer); pollTimer = null; }

  function updateStatusLabel() {
    statusLabel.textContent = availability?.isOpen ? 'Live chat is open' : 'Message service';
  }
  function renderServiceError(message) {
    statusLabel.textContent = 'Temporarily unavailable';
    main.innerHTML = `<section class="intro"><div class="availability-card"><strong>Live chat is unavailable</strong><p>${escapeHtml(message)}</p></div></section>`;
  }
  function readSession() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!value?.token || Date.now() - Number(value.createdAt || 0) > 36 * 60 * 60 * 1000) return null;
      return value;
    } catch { return null; }
  }
  function clearSession() { localStorage.removeItem(STORAGE_KEY); session = null; messageCursor = ''; stopPolling(); }
  function parentMessage(payload) { try { window.parent.postMessage(payload, parentOrigin); } catch { window.parent.postMessage(payload, '*'); } }
  function formatTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' }).format(date); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
      body: options.body,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: text }; }
    if (!response.ok) {
      const error = new Error(payload.error || 'Live chat request failed.');
      error.status = response.status;
      throw error;
    }
    return payload;
  }
})();
