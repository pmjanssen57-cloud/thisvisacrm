# THiS CRM v0.13.39 — Streamlined Navigation and Tools Hub

This release builds on v0.13.38 Commercial Clients and the Employer Portal.

## Navigation refinement

The primary desktop navigation now contains only the workspaces advisers use regularly:

- Dashboard
- Tasks
- Clients
- Commercial
- Enquiries & Intake
- Bookings
- Calendar
- Billing

Library, Advisers and Backups have been removed from the main navigation and consolidated into the existing Tools drawer.

## Tools drawer

A new CRM resources section appears at the top of Tools:

- **Library** — available to Admin and User roles.
- **Advisers** — visible to Admins only.
- **Backups** — visible to Admins only.

The existing weather, timezone, currency, calculator, email templates, email log, Help and Refresh utilities remain available below those workspace shortcuts.

The same low-frequency workspace links have also been removed from the mobile More menu, leaving Tools as the consistent access point on desktop and mobile.

## Existing features retained

- Commercial clients and employer portal.
- My Day briefing overlay and lean Dashboard.
- Admin/User role enforcement.
- Individual clients and client portal.
- Enquiries, intake, seminars, feedback and contact exports.
- Bookings, billing, calendar, email and encrypted backups.
- Yarn/Netlify deployment baseline.

## Deployment

- No database migration.
- No new dependency.
- No Netlify Function behaviour change apart from the backup source version label.
- No public form or Squarespace embed change.
