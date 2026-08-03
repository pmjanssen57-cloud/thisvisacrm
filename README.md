# THiS CRM v0.13.55 — Live Intake Refresh, CV Requests and Reliable Print View

This release is based on v0.13.54 and improves the day-to-day intake workflow without changing the CRM data model.

## Live intake refresh

While an authenticated CRM session is open, the app now checks for new intake and contact forms every 60 seconds. It also refreshes immediately when the browser tab or installed PWA returns to the foreground. New submissions update the dashboard and Enquiries & Intake counts without requiring a logout or restart.

The refresh is deliberately lightweight: it requests only intake/contact records rather than reloading the complete CRM. Open intake drafts are preserved. A manual **Refresh** control and last-checked time are also shown in the workspace.

## Request missing CV

Full intake records now show a CV-request action when the applicant CV, or an expected partner CV, has not been supplied. The action requires:

- A valid applicant email address.
- An assigned adviser.
- A valid email address on the assigned adviser record.

The message is sent through the existing Microsoft 365 shared mailbox, copied to the assigned adviser, and uses the assigned adviser as the reply-to address. The applicant can therefore reply directly with the document. Wording is editable under **Tools → Email templates → Assessment form - request missing CV**.

## Reliable intake print view

The intake print control now opens a stable printable page rather than triggering the print dialogue automatically before the document is fully ready. The adviser reviews the page and selects **Print / save PDF** from its toolbar. If a browser blocks the print window, the CRM downloads a printable HTML copy instead.

## Retained functionality

- Approved seminar-registration Excel-compatible export.
- Editable CRM email-template editor.
- Contact-form **Unable to assist** email action.
- Installable Android and desktop PWA.
- Streamlined six-section client record.
- Dashboard lead-adviser workload with optional backup matters.
- Practice-wide contacted and searched intake visibility.
- Separate Medical certificate and Chest X-ray documents.
- Physical address in the intake form.
- Commercial compliance suite and Employer Portal.

## Deployment

- Existing `yarn build` and `dist` deployment retained.
- No database migration.
- No new npm dependency.
- Service-worker cache and backup source version advanced to v0.13.55.
