// Tells the Turner Hopkins page that embeds a public THiS form that a
// submission succeeded. The parent page owns the Google tag and records the
// GA4 / Google Ads conversion there. Do not add Google tags to this app.

const PARENT_ORIGINS = [
  'https://www.turnerhopkinsimmigration.co.nz',
  'https://turnerhopkinsimmigration.co.nz',
];

const reported = new Set();

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function reportConversion(form, { submissionId, details = {} } = {}) {
  try {
    // Direct visits to the Netlify-hosted form are deliberately not counted.
    if (typeof window === 'undefined' || window.parent === window) return;

    const id = String(submissionId || makeId());
    const key = `${form}:${id}`;
    if (reported.has(key)) return;
    reported.add(key);

    const message = {
      source: `this-crm-${form}`,
      type: 'THIS_FORM_SUBMITTED',
      form,
      submissionId: id,
      // Keep details to short, non-personal controlled values only.
      details,
    };

    PARENT_ORIGINS.forEach((origin) => window.parent.postMessage(message, origin));
  } catch {
    // Conversion reporting must never interrupt a successful form submission.
  }
}
