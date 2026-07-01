# THiS CRM v0.13.21 — Email Template Preview Polish

This build sits on top of v0.13.20 and improves the CRM email template workflow. The main change is adviser confidence: templates can now be previewed with realistic sample data before they are saved or sent as a test.

## v0.13.21 changes

- Added rendered preview support inside Tools > Templates.
- Preview now replaces template placeholders such as `{{firstName}}`, `{{bookingLink}}`, `{{portalEmail}}`, `{{seminarTitle}}`, and `{{applicationType}}` with safe sample values.
- Added a sample-data panel so advisers can see what values are being used in the preview.
- Added an unresolved-placeholder warning if a template contains a placeholder that is not in the known placeholder list.
- Added a send-preview-test workflow directly inside the template editor.
- Preview test emails use the rendered sample data and are logged in Tools > Email log.
- Updated the test email function so it can send the HTML preview rather than flattening everything into plain text.
- Added the client feedback internal notification to the editable CRM email template list.
- Updated the public feedback notification function so the feedback notification can use the editable CRM template.
- Updated package version to `0.13.21`.

## Database

No new database migration is required for this release.

The release reuses the existing `email_templates` and `email_notifications` tables. The feedback function defensively ensures the feedback notification template exists if the public feedback endpoint is called before the CRM has refreshed its template list.

## Deployment notes

1. Upload this package to Netlify in the usual way.
2. Preserve all existing Netlify environment variables, especially the Microsoft Graph email variables.
3. No migration action is required for this package.
4. After deployment, refresh the CRM and open Tools > Templates.

## Recommended smoke test

1. Open CRM > Tools > Templates.
2. Select “Assessment form - next steps”.
3. Click Preview and confirm placeholders are rendered with sample data.
4. Enter an internal Turner Hopkins test recipient and send a preview test.
5. Open Tools > Email log and confirm the test appears.
6. Select “Client feedback - internal notification” and confirm it appears in the template list.
7. Submit a dummy feedback form through `/feedback?embed=1` and confirm the notification still sends/logs correctly.
8. Confirm existing intake approval/decline, contact invite and seminar approval/decline emails still send correctly.

## Build checks completed

- `npm ci` completed.
- `npm run build` completed successfully.
- Netlify Function syntax checks passed for all `.mjs` functions.

The Vite build still reports the existing large-bundle warning. That is not new to this release and does not block deployment.
