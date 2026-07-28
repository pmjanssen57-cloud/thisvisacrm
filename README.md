# THiS CRM v0.13.53 — Email Template Editor Fix

This release is based on v0.13.52 and repairs the CRM email-template editing interface.

## Email template editor

The message body is now reliably initialised whenever the template editor is opened. Previously, template data could be loaded while the lightbox was closed, leaving the rich-text editor blank when it was later displayed.

The editor now includes:

- A clearly labelled **Message body** section.
- A visible rich-text editing area in Design mode.
- Full-height HTML and Preview modes.
- Consistent full-width Subject and Test recipient fields.
- CRM-standard borders, spacing, focus states and field labels.
- A visible placeholder when a template genuinely has no body content.
- Existing formatting controls, placeholders, preview, test-send and reset functions.

No email wording, sending workflow or template-storage format has changed. Existing customised templates remain compatible.

## Retained functionality

- Contact-form **Unable to assist** email action and editable wording.
- Installable Android and desktop PWA.
- Persistent install controls and refined desktop app icon.
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
- Service-worker cache and backup source version advanced to v0.13.53.
