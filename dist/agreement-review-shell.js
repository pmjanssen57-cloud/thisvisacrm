(() => {
  let settled = false;
  const fail = (message = 'The agreement could not be loaded. Please reload this page, or reply to the email from Turner Hopkins for help.') => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    document.documentElement.classList.add('agreement-review-failed');
    const show = () => {
      const title = document.getElementById('agreement-load-title');
      const text = document.getElementById('agreement-load-message');
      if (title) title.textContent = 'Agreement unavailable';
      if (text) text.textContent = message;
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once:true}); else show();
  };
  const timer = setTimeout(() => fail(), 20000);
  window.THIS_AGREEMENT_REVIEW = {
    fail,
    ready() {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      document.documentElement.classList.add('agreement-review-ready');
      return true;
    }
  };
  addEventListener('error', event => { if(event.target===window||event.target?.tagName==='SCRIPT')fail(); }, true);
  addEventListener('unhandledrejection', () => fail());
})();
