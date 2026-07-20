# THiS CRM v0.13.32 — Contact Export for Excel and Mailchimp

This release restructures the contact, intake, feedback and seminar-registration workspace around compact operational queues while preserving all existing CRM, submission, email, duplicate-detection, conversion and public-form behaviour.

## Workspace changes

- Replaces the large metric-card row with a compact, clickable workload strip for new contacts, new intake forms, new seminar registrations and new feedback.
- Shortens the workspace tabs and uses new-item counts rather than total retained records.
- Compresses search, status filters and reset controls into a single lean toolbar.
- Contact forms now show a concise queue row with inline adviser assignment, inline status changes and the intake-email action.
- Contact details, messages and related-enquiry information expand only when requested.
- Intake forms now use compact queue rows with inline adviser and status controls, plus direct View, Convert and Open client actions.
- Full intake editing remains in the existing pop-out editor.
- Seminar setup and public-form controls are consolidated into one compact seminar header.
- Seminar registrations now show a concise queue row with approval, decline and detail controls; the full registration information expands only when needed.
- Feedback records use the same compact queue treatment for consistency.
- Desktop and mobile layouts have been adjusted so filters and row controls remain usable without creating dense button stacks.

## Data and deployment

- No database migration is required.
- No Netlify Function, migration, public form, guided-intake embed, Mailchimp workflow or secure-backup workflow was changed.
- Existing v0.13.30 lean adviser dashboard functionality remains in place.

Use Node 20.19.0 for deployment, as configured by the project files.

## v0.13.32 contact export

The Enquiries & Intake workspace now includes an `Export contacts` menu with two browser-generated CSV downloads:

- **All contacts for Excel** — one deduplicated row per email from retained contact and full assessment forms, including contact details, source, CRM status, adviser, submission dates, and clearly separated contact/marketing consent fields.
- **Mailchimp consent list** — only retained full assessment contacts who selected the optional marketing consent box, using Mailchimp-friendly column headings.

The export excludes dates of birth, visa information, health, character, employment, qualifications, funds, free-text questionnaire answers, adviser assessment notes and uploaded files. It requires no database migration, Netlify Function change or new npm dependency.

