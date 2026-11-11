(() => {
  const url = new URL(location.href);
  const token = url.searchParams.get('token');
  if (token !== null) {
    const target = new URL('/agreement.html', location.origin);
    target.searchParams.set('token', token);
    location.replace(target.href);
    return;
  }
  // The authoring surface is available only within the same-origin CRM frame.
  try {
    if (parent !== window && parent.location.origin === location.origin) {
      document.documentElement.classList.add('agreement-editor-entry');
    }
  } catch { /* Keep the static, non-editor message visible. */ }
})();
