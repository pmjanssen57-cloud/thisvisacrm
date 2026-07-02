# THiS CRM v0.13.23 — Deadline Signal Cleanup

This build sits on top of v0.13.22 and reduces dashboard noise by separating dates that are genuinely actionable from dates that are useful background recordkeeping.

The CRM still keeps all client dates and document expiry dates on the client file. The dashboard now focuses on dates that need adviser attention.

## v0.13.23 changes

- Added deadline signal controls to client key dates:
  - Active — show if due or overdue
  - Watching — show inside the relevant warning window
  - Deferred — hide until a review date
  - Historical / not actionable — keep on the file, hide from dashboard
  - Completed / replaced — keep on the file, hide from dashboard
- Added review-again date for deferred client deadlines.
- Added the same signal controls to document checklist expiry dates.
- Dashboard now excludes quiet, historical, deferred, completed and stale expiry dates from the main warning panels.
- Dashboard “Next critical dates” now shows only actionable dates.
- Dashboard metrics now count actionable overdue dates, not every old expired date.
- Added a quiet-date summary so advisers can see how many dates are being suppressed without losing confidence that the data still exists.
- Client snapshot now uses the nearest actionable date rather than the nearest recorded date.
- Key Dates summary now shows each date’s signal status and reason.
- Existing PPI response dates and filing deadline dates remain active by default.
- Existing visa, medical and police expiry dates are migrated to “Watching” by default, which avoids old expired items dominating the dashboard unless marked active.

## Dashboard signal rules

Default warning windows:

- Visa expiry: 90 days
- Medical expiry: 60 days
- Police clearance expiry: 60 days
- Passport/document expiry: 60 days, except passport-related dates which use 180 days
- Other/custom dates: 30 days
- PPI response and filing deadlines: remain visible until completed, deferred or marked historical

A watched expiry date that is more than 60 days overdue is treated as stale and kept quiet unless manually marked Active.

## Database

This release includes a migration:

- `202607030001_add_deadline_signal_controls.sql`

The migration adds:

- `client_deadlines.action_status`
- `client_deadlines.review_date`

Document checklist signal controls are stored inside the existing `clients.document_checklist` JSON data.

## Recommended smoke test

1. Deploy the package to Netlify.
2. Open the CRM dashboard and confirm old visa/medical/police/document expiries no longer dominate the main warning cards.
3. Open a client record > Key dates.
4. Set one old police clearance expiry to Active and confirm it reappears on the dashboard.
5. Set another key date to Deferred with a future review date and confirm it stays quiet.
6. Set a deferred review date to today and confirm it appears as review due.
7. Open the document checklist, set a document expiry to Historical / not actionable, save, and confirm it remains on the client record but not the main dashboard.
8. Confirm PPI and filing deadline dates remain visible unless manually deferred, completed or marked historical.

## Build checks completed

- `npm ci` completed.
- `npm run build` completed successfully.
- Netlify Function syntax checks passed for all `.mjs` functions.

The Vite build may still report the existing large-bundle warning. That is not new to this release and does not block deployment.
