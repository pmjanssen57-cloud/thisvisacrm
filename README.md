# THiS CRM v0.13.25 — Enquiry Matching & Duplicate Detection

This build sits on top of v0.13.24a and adds a light-touch matching layer across pre-client records. The goal is to help advisers spot when the same person has submitted a contact form, full questionnaire, or seminar registration before screening begins.

## v0.13.25 changes

- Added related enquiry detection across:
  - Contact Forms
  - Intake Forms
  - Seminar Registrations
- Added visible match cues on enquiry cards:
  - Strong match
  - Likely related
  - Possible match
- Added compact related-record panels showing:
  - record type
  - name
  - email / phone where available
  - status
  - submitted date
  - reason for the match
- Matching is based on practical signals:
  - same email
  - same mobile number
  - same or similar name
  - citizenship/location support for softer matches
  - recent submission timing
- No automatic merging is performed.
- No new adviser decisions are required.
- Existing actions remain available, including Spam / Duplicate, Mark dealt with, Mark contacted, and Convert.

## Admin reduction approach

The matching layer is deliberately advisory. It gives the adviser useful context without adding another queue, workflow, or classification process. A match cue is simply a prompt to check whether two records relate to the same person.

## Database

No new database migration is required.

## Recommended smoke test

1. Deploy the package to Netlify.
2. Submit or create a contact form with a test email address.
3. Submit or create an intake form using the same email address.
4. Open CRM > Enquiries & Intake.
5. Confirm both records show a related enquiry cue.
6. Open the intake record and confirm the Related enquiries panel appears in the pop-out editor.
7. Create a seminar registration with the same email and confirm it is also identified.
8. Confirm no records are automatically merged or changed.

## Build checks completed

- `npm ci` completed.
- `npm run build` completed successfully.
- Netlify Function syntax checks passed for all `.mjs` functions.

The Vite build may still report the existing large-bundle warning. That is not new to this release and does not block deployment.

---

Previous release notes retained below.

# THiS CRM v0.13.24 — Adviser Simplicity Pass

This build sits on top of v0.13.23 and deliberately simplifies the deadline/dashboard controls. The previous release reduced dashboard noise, but the five-status model risked becoming another thing advisers had to maintain. This release keeps the result, but removes the admin overhead.

## v0.13.24 changes

- Replaced the deadline signal dropdown with one simple checkbox:
  - `Show on dashboard`
- Removed adviser-facing deadline options for:
  - Active
  - Watching
  - Deferred
  - Historical / not actionable
  - Completed / replaced
- Removed the adviser-facing `Review again` date from the Key Dates editor.
- Dates remain on the client file whether or not they are shown on the dashboard.
- Dashboard warnings now use this simpler rule:
  - checked = eligible for dashboard warnings
  - unchecked = file-only reference date
- Existing legacy `watching` values are interpreted quietly using sensible defaults:
  - visa, PPI and filing dates remain dashboard-worthy by default
  - medical, police and document checklist expiry dates default to file-only unless ticked
- The client snapshot still uses the nearest dashboard-relevant date, not the nearest old recorded date.
- Dashboard copy now refers to “dashboard dates” and “file-only dates” rather than signal statuses.
- Quiet-date summary now reports saved dates that are not currently shown on the dashboard.

## Extra admin-reduction polish

- Document checklist now hides not-required items by default.
- Advisers can reveal them with a single `Show X not required` button.
- Document checklist expiry dates now use the same single `Show on dashboard` checkbox.
- Custom document items default to file-only for dashboard purposes unless the adviser ticks them.
- Removed a duplicate calendar-note assignment in the task row builder.

## Database

No new database migration is required.

This release reuses the columns added in v0.13.23:

- `client_deadlines.action_status`
- `client_deadlines.review_date`

The front end now maps those fields to a simpler adviser-facing checkbox rather than exposing multiple statuses.

## Recommended smoke test

1. Deploy the package to Netlify.
2. Open a client file > Key dates.
3. Confirm each date has a single `Show on dashboard` checkbox.
4. Untick an old police clearance or medical expiry and confirm it remains on the client file but does not appear in dashboard warnings.
5. Tick a PPI response or filing deadline and confirm it appears on the dashboard when relevant.
6. Open the document checklist and confirm not-required items are hidden by default.
7. Use `Show X not required` to reveal not-required checklist items and re-add one.
8. Add a document expiry date and tick `Show on dashboard`; confirm it can appear in dashboard warnings when inside its warning window or overdue.
9. Confirm the dashboard quiet-date summary uses the new file-only wording.

## Build checks completed

- `npm ci` completed.
- `npm run build` completed successfully.
- Netlify Function syntax checks passed for all `.mjs` functions.

The Vite build may still report the existing large-bundle warning. That is not new to this release and does not block deployment.

## v0.13.24a hotfix — Dashboard load fix

This hotfix restores the dashboard command-card component that was accidentally removed during the adviser simplicity pass while the dashboard still referenced it. The missing component could cause a blank page when the CRM loaded directly into the dashboard or refreshed there.

No database migration is required. No workflow changes were made beyond restoring the dashboard load path.
