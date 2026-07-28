# THiS CRM v0.13.52 — Contact Unable to Assist Email

This release is based on v0.13.51 and adds a polite outcome email for short website contact-form enquiries that Turner Hopkins cannot assist with.

## Contact form workflow

In **Enquiries & Intake > Contact Forms**, each contact with a valid email address now has two clear email actions:

- **Send intake** — sends the existing full assessment-form invitation.
- **Unable to assist** — sends a polite response explaining that Turner Hopkins is not able to assist with the enquiry at this stage.

Before sending, the CRM shows a confirmation. After a successful unable-to-assist email:

- The contact form is moved to **Dealt with**.
- The assigned adviser is copied where their adviser profile contains a valid email address.
- The send is recorded in the existing CRM email log.
- Failed sends remain visible and do not change the contact status.

## Editable email wording

The new template appears under **Tools > Email templates** as:

**Contact form - unable to assist**

The subject and message can be edited without changing code. Supported placeholders are:

- `{{firstName}}`
- `{{applicantName}}`

The default wording is deliberately courteous and states that the response is based only on the limited initial enquiry, rather than presenting it as a full immigration assessment or immigration advice.

## Retained functionality

- Installable Android and desktop PWA
- Persistent install controls with browser fallback instructions
- Refined desktop taskbar icon and existing Android maskable icons
- Streamlined six-section individual client record
- Dashboard lead-adviser workload with optional backup matters
- Practice-wide contacted and searched intake visibility
- Separate Medical certificate and Chest X-ray documents
- Physical address in the intake form
- Commercial compliance suite and Employer Portal
- Existing adviser login, roles, My Day, backups and public forms

## Deployment

- Existing `yarn build` and `dist` deployment retained
- No database migration
- No new npm dependency
- Service-worker cache advanced to v0.13.52
