# THiS CRM v0.13.22 — SMC Calculator Email Integration

This build sits on top of v0.13.21 and integrates the standalone SMC work experience calculator into the CRM-hosted public form stack.

The calculator remains a public website tool rather than another CRM review queue. Users do not appear in Enquiries & Intake. Instead, the user can email themselves the result summary, and THiS advisers/admin are notified when that happens.

## v0.13.22 changes

- Added a hosted public SMC work experience calculator page:
  - `/smc-work-experience-calculator.html`
- Added a Squarespace-ready embed file:
  - `turner-hopkins-smc-work-experience-calculator-embed.html`
- Replaced the browser-side “Download PDF results” action with:
  - email address field
  - “Email my results” button
  - confirmation / error status text
- Added Netlify Function:
  - `smc-calculator.mjs`
- Result email is sent to the applicant using the existing Microsoft 365 email integration.
- Internal notification email is sent when a result is emailed.
- Internal notification recipients are:
  1. all active advisers with email addresses in the CRM; or
  2. fallback environment variables if no active adviser email addresses are available.
- Added editable CRM email templates:
  - `SMC calculator - applicant result`
  - `SMC calculator - internal notification`
- Added template preview sample data and email-log labels for the new SMC calculator emails.
- Email sends are logged in Tools > Email log.
- Fixed the calculator embed script issue from the standalone file so the guided work-period cards render correctly.
- Added iframe height messaging for Squarespace embedding.
- Updated package version to `0.13.22`.

## Database

No new database migration is required for this release.

This release reuses the existing:

- `email_templates`
- `email_notifications`
- `advisers`

The new Netlify Function defensively ensures the two new email templates exist when the public calculator endpoint is used.

## Environment variables

Existing Microsoft Graph email variables are still required for email sending:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_NOTIFICATION_FROM_EMAIL`
- `MICROSOFT_NOTIFICATION_FROM_NAME`

Optional new variables:

- `SMC_CALCULATOR_NOTIFICATION_EMAILS`
  - comma-separated fallback recipients if no active adviser emails are found in CRM
- `SMC_CALCULATOR_CONSULTATION_URL`
  - defaults to `https://www.turnerhopkinsimmigration.co.nz/visa-consultation`
- `SMC_CALCULATOR_URL`
  - defaults to `https://thisvisacrm.netlify.app/smc-work-experience-calculator.html`

## Squarespace embed

Use:

`turner-hopkins-smc-work-experience-calculator-embed.html`

Paste the full block into a Squarespace Code Block. If the Netlify production URL changes, update the iframe `src` inside that file.

## Recommended smoke test

1. Deploy the package to Netlify.
2. Open `/smc-work-experience-calculator.html`.
3. Load the example or enter a simple test calculation.
4. Calculate the result.
5. Enter an internal test email address and click “Email my results”.
6. Confirm the result email arrives.
7. Confirm the internal notification arrives.
8. Open CRM > Tools > Email log and confirm both SMC calculator emails are logged.
9. Open CRM > Tools > Templates and confirm the two new SMC calculator templates appear and preview correctly.
10. Embed the Squarespace block and confirm height resizing works on desktop and mobile.

## Build checks completed

- `npm ci` completed.
- `npm run build` completed successfully.
- Netlify Function syntax checks passed for all `.mjs` functions.

The Vite build may still report the existing large-bundle warning. That is not new to this release and does not block deployment.
