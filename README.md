# THiS CRM v0.13.28 — Public Form Standardisation

This build standardises the visual presentation of the CRM's public forms while preserving the existing submission and workflow behaviour.

## Public form changes

- Removed the standalone passport-stamp animation page from the guided intake. The intake now opens directly on the first questionnaire stage.
- Standardised the visual system across the guided intake, contact, feedback, seminar-registration and consultation-booking forms.
- Aligned card borders, backgrounds, field styling, focus states, section spacing, buttons and mobile layouts.
- Preserved all existing validation, submissions, CV uploads, notifications, approval/decline actions, booking behaviour, duplicate detection and iframe messaging.
- The separate website home-page triage form is intentionally outside this release.
- No database migration is required.

## Mailchimp integration retained

The v0.13.27 Mailchimp intake integration remains unchanged. It applies only to completed full assessment questionnaires and continues to exclude sensitive answers and uploaded documents.

## What changed

- Every completed full intake form can be added or updated in a selected Mailchimp audience.
- The final intake page includes a separate, optional marketing consent checkbox.
- Applicants who do not opt in are stored as transactional/non-subscribed contacts only.
- Applicants who opt in use Mailchimp double opt-in by default and are initially marked `pending`.
- Existing Mailchimp unsubscribe status is preserved when a new intake is submitted without marketing consent.
- Intake submission, CRM record creation, CV uploads and adviser notifications continue even if Mailchimp is unavailable.
- Sync status is recorded inside the intake record's existing raw payload; no database migration is required.

## Data sent to Mailchimp

Always sent:

- email address
- first name
- last name
- source and selected immigration goal as tags

Optional, only when matching Mailchimp merge fields are configured:

- phone
- citizenship
- current country/location
- selected immigration goal
- source

The integration never sends health, character, immigration-history, family-detail, financial-detail or uploaded-document data to Mailchimp.

## Netlify environment variables

Required to enable the integration:

- `MAILCHIMP_ENABLED=true`
- `MAILCHIMP_API_KEY`
- `MAILCHIMP_AUDIENCE_ID`
- `MAILCHIMP_SERVER_PREFIX` (for example `us21`; the code can also infer it from a standard API key)

Recommended defaults:

- `MAILCHIMP_DOUBLE_OPT_IN=true`
- `MAILCHIMP_ADD_NON_SUBSCRIBED_CONTACTS=true`
- `MAILCHIMP_DEFAULT_TAGS=Guided Intake,Website Assessment`

See `.env.example` for the complete list.

## Database

No database migration is required.

## Deployment note

After adding the environment variables in Netlify, trigger a new deployment so the Functions runtime receives them.

## Compliance and audience-size note

The marketing checkbox is intentionally separate from the required enquiry consent. New Zealand commercial email rules require consent before marketing messages are sent. Contacts without marketing consent are kept non-subscribed and are not eligible for marketing campaigns.

Mailchimp counts non-subscribed contacts toward the account contact total. Set `MAILCHIMP_ADD_NON_SUBSCRIBED_CONTACTS=false` if Turner Hopkins later decides that only opted-in applicants should be stored in Mailchimp.

The website privacy statement should also explain that basic contact details may be processed by Mailchimp for audience management. The form itself contains a short disclosure and excludes sensitive questionnaire answers and uploaded documents from the integration.
