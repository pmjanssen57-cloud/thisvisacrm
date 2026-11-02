// Success only: the Squarespace parent owns tracking and top-level navigation.
// Fixed destinations never include answers, names, emails or resume tokens.
export const THANK_YOU_PATHS = Object.freeze({
  "contact": "/contact-thank-you",
  "seminar": "/seminar-thank-you",
  "intake": "/thank-you-full-assessment",
  "feedback": "/feedback-thank-you",
  "employer_accreditation": "/thank-you-employer"
});
const WEBSITE_ORIGIN = 'https://www.turnerhopkinsimmigration.co.nz';
const PARENT_ORIGINS = [WEBSITE_ORIGIN, 'https://turnerhopkinsimmigration.co.nz'];
const reported = new Set();
function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
export function reportConversion(form, { submissionId, details = {} } = {}) {
  try {
    if (typeof window === 'undefined' || !Object.hasOwn(THANK_YOU_PATHS, form)) return;
    const id = String(submissionId || makeId());
    const key = form + ':' + id;
    if (reported.has(key)) return;
    reported.add(key);
    if (window.parent === window) {
      window.location.assign(WEBSITE_ORIGIN + THANK_YOU_PATHS[form]);
      return;
    }
    const message = { source: 'this-crm-' + form, type: 'THIS_FORM_SUBMITTED', form, submissionId: id, details };
    PARENT_ORIGINS.forEach(origin => window.parent.postMessage(message, origin));
  } catch {
    // Keep the inline success screen if navigation/reporting is unavailable.
  }
}
