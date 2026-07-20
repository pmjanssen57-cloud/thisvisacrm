# THiS CRM v0.13.36 — Standalone My Day Landing Page

This release builds on the working v0.13.35 role and login baseline. It preserves adviser roles, the lean dashboard, the lean Enquiries & Intake workspace, incremental contact exports, Yarn deployment configuration and existing CRM workflows.

## Access roles

- **Admin** — all operational access plus adviser management, Backup Centre and contact CSV exports.
- **User** — all operational CRM workspaces without adviser administration, backups or contact exports.
- Roles are assigned on the Adviser profile and matched to Netlify Identity through Login Email.
- The server enforces administrator access for adviser changes and backups.
- The CRM prevents removal or deactivation of the final active Admin.
- On first deployment, a matched adviser is temporarily treated as a bootstrap Admin until an Admin role is explicitly assigned.

## Standalone My Day landing page

My Day is now visually and structurally separate from the CRM application shell. After login, advisers arrive on a dedicated landing page without the CRM toolbar, tab strip, drawers or mobile navigation. It shows overdue and due-today work, new enquiries, consultations today, direct workspace cards, recently opened clients and administrator shortcuts where applicable.

The primary **Enter CRM** action opens the main Dashboard. Each workspace card can also open that part of the CRM directly. Once inside the CRM, advisers can return to My Day using the dedicated header button or the mobile **My Day** navigation item. The current adviser or whole-practice scope can be changed directly on the landing page.

## Contact export changes

The `Export contacts` menu now supports separate incremental and complete exports:

- **New contacts since last export** — Excel-compatible contact register containing only email groups with a new contact-form or full-assessment submission after the previous Excel export.
- **All contacts** — complete retained contact and intake register. This also establishes a new incremental baseline.
- **New consented contacts since last export** — Mailchimp-ready CSV containing only newly consented full-assessment contacts after the previous Mailchimp CSV export.
- **All consented contacts** — complete retained consent list. This also establishes a new Mailchimp baseline.
- **Reset export history** — clears both baselines so the next incremental exports include all matching retained records.

The export menu shows the previous Excel and Mailchimp CSV download times. Export history is stored locally for the current login, selected adviser view and browser. A different browser, device, login or adviser filter maintains a separate baseline.

The first incremental download on a browser has no earlier baseline, so it includes all matching retained records and then records the new baseline.

## Privacy and data handling

The exports remain deduplicated by email and exclude sensitive questionnaire content, including dates of birth, visa history, health and character answers, employment and qualification detail, financial information, adviser notes and uploaded files.

The automatic Mailchimp API integration remains removed. Mailchimp transfers are completed manually using the consent CSV.

## Deployment

- Node 20.19.0
- Yarn Classic 1.22.22 through Corepack
- The adviser access-role column is added automatically on first CRM load; no manual migration step is required.
- No new npm dependency
- Existing CRM and backup Functions are updated for administrator enforcement; no new Function is added.
- No public form or Squarespace embed change

Use **Clear cache and deploy site** if Netlify restores an incompatible dependency directory from an older npm-based build.
