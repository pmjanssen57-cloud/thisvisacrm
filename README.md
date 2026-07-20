# THiS CRM v0.13.37 — My Day Briefing Overlay

This release builds on the working v0.13.36 role and login baseline. It preserves the Admin/User permission model, lean Dashboard, lean Enquiries & Intake workspace, incremental contact exports, manual Mailchimp-consent CSV workflow, Yarn deployment configuration and existing CRM functions.

## My Day overlay

My Day is now a full briefing layer above the normal CRM rather than a separate page or a standard CRM tab.

After login:

- The normal CRM Dashboard is loaded underneath.
- My Day opens automatically as a centred, full-screen briefing overlay.
- The underlying CRM remains visibly present but dimmed and unavailable until the briefing is dismissed.
- **Enter CRM** closes My Day and reveals the Dashboard.
- Clicking a workspace shortcut closes the overlay and opens that workspace directly.
- The dedicated **My Day** control in the CRM header and mobile navigation reopens the overlay above the adviser’s current workspace.
- Opening My Day does not discard unsaved client or calendar edits.

The desktop briefing is designed to keep its principal information within one viewport:

- Greeting, date and selected adviser/practice scope.
- Overdue, due-today, new-enquiry and consultation counts.
- A concise vertical action list.
- Today’s consultations.
- Recently opened clients.
- Compact CRM workspace shortcuts.

On smaller screens the same content remains available in a controlled full-screen scrolling layout.

## Access roles

- **Admin** — all operational access plus adviser management, Backup Centre and contact CSV exports.
- **User** — all operational CRM workspaces without adviser administration, backups or contact exports.
- Roles remain assigned on the Adviser profile and matched to Netlify Identity through Login Email.
- The server continues to enforce administrator access for adviser changes and backups.
- The final active Admin cannot be removed or deactivated.

## Contact exports

The incremental and complete CSV exports remain unchanged:

- New contacts since last export.
- All contacts.
- New consented contacts since last export.
- All consented contacts.
- Reset export history.

Automatic Mailchimp API submission remains removed. Mailchimp transfers are completed manually with the consent CSV.

## Deployment

- Node 20.19.0
- Yarn Classic 1.22.22 through Corepack
- No new package dependency
- No database migration
- No Netlify Function change
- No public form or Squarespace embed change

Use **Clear cache and deploy site** only if Netlify restores an incompatible dependency directory from an older npm-based build.
