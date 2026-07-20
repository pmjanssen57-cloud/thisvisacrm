# THiS CRM v0.13.38 — Commercial Clients and Employer Portal

This release builds on the working v0.13.37 My Day overlay, Admin/User roles, lean operational workspaces, incremental contact exports and Yarn deployment baseline.

## Commercial client records

Commercial clients are a separate CRM entity rather than individual clients with hidden fields. Each organisation record includes:

- Legal and trading names, NZBN, company number, industry and address.
- Primary contact and Turner Hopkins adviser assignments.
- OneLaw and SharePoint references.
- Accreditation type, status, approval, expiry and renewal preparation dates.
- Employer-visible compliance summary and separate internal adviser notes.

## Employer compliance registers

Each commercial client has dedicated registers for:

- Work visa holders and their visa, passport, employment, pay, Job Check and manager details.
- Company-wide or worker-linked compliance actions.
- Document references and expiry dates.
- Employer portal users.
- Audit history.

Employer-entered worker and compliance records are marked **Needs review** so advisers can identify portal changes requiring confirmation.

## Employer portal

The separate employer portal is available at `/commercial-portal`.

Portal roles:

- **Company Admin** — can update accreditation, workers, compliance and documents.
- **Company User** — can update workers, compliance and documents.
- **Read Only** — can view but cannot edit.

Each portal user has an individual email and access code. Access codes are stored as one-way PBKDF2 hashes. Internal adviser notes are not returned to the portal.

## Existing features retained

- My Day briefing overlay and lean adviser Dashboard.
- Admin/User CRM roles.
- Individual client CRM and client portal.
- Enquiries, full intake forms, seminar registrations and feedback.
- Manual Excel and Mailchimp-consent CSV exports.
- Consultation bookings, calendar, billing, library and email workflows.
- Encrypted Backup Centre. The new commercial tables are included automatically in database backups.
- Automatic Mailchimp API submission remains removed.

## Deployment

- Node 20.19.0
- Yarn Classic 1.22.22 through Corepack
- No new npm dependency
- One new database migration: `202607210001_add_commercial_client_portal.sql`
- One new Netlify Function: `commercial-portal.mjs`
- No public intake form or Squarespace embed changes

See `COMMERCIAL-CLIENT-PORTAL-GUIDE.txt` for setup and role details.
