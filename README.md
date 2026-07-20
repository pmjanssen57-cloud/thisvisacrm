# THiS CRM v0.13.30 — Lean Adviser Dashboard

This release restructures the CRM dashboard around daily operational work while preserving all existing CRM, intake, portal, booking, email, Mailchimp and secure-backup functionality.

## Dashboard changes

- Tasks due more than 30 days away are removed from the dashboard action queue. They remain available in the full Tasks page.
- The previous Today and Quick Task panels are consolidated into one vertical action queue with Overdue, Today and Next 30 days views.
- The large dashboard metric-card area is replaced with a compact status strip.
- Recently viewed clients are moved into a vertical sidebar.
- Portal notes, clients without a next action, past calendar items, enquiries and billing pressure are condensed into the sidebar.
- Critical watched dates and adviser workload summaries are also moved into compact sidebar panels.
- The client workload list is promoted into the main dashboard column and simplified.
- Workload filters are collapsed until needed.
- Advisers can update a client's next action and next action date inline without opening the full client record.
- Inline action changes use the existing client save workflow and preserve the automatic next-action history.

## Data and deployment

- No database migration is required.
- No existing Netlify Function, migration, public asset, guided intake embed or backup workflow was changed.
- Existing v0.13.29 secure backup functionality remains in place.

Use Node 20.19.0 for deployment, as configured by the project files.
