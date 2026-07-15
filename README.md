# THiS CRM v0.13.26b — Intake Entry Moment Hotfix

This small hotfix sits on top of v0.13.26a. It keeps the guided intake journey and CRM workflows intact, but refines the first page so it feels more like the beginning of a New Zealand journey and less like another form screen.

## v0.13.26b changes

- Added a subtle opening-door / pathway-to-NZ visual moment to the first page of the public intake form.
- Kept the animation in the Turner Hopkins green/mint style rather than full-colour illustration.
- Removed the first-page Preferred timing, Urgency, Any urgent deadline, and What help do you need fields from the public guided intake flow.
- Removed the first-page immediate-help dropdown from the Work/Residence bridge. The selected goal now supplies the immediate-focus signal automatically.
- Kept the longer-term goal question for Work/Residence/Not sure applicants so advisers still see whether work is temporary or part of a residence plan.
- Preserved existing CRM intake submission, notifications, CV upload, duplicate detection, approve/decline, and booking-link workflows.

## Database

No new database migration is required.

## Build checks completed

- `npm ci` completed.
- `npm run build` completed successfully.
- Netlify Function syntax checks passed for all `.mjs` functions.

---

# THiS CRM v0.13.26 — Guided Intake Journey Integration

This build sits on top of v0.13.25 and replaces the public assessment questionnaire with the guided Turner Hopkins intake journey prototype. The adviser-side CRM workflow remains the same: submitted forms still arrive in Enquiries & Intake > Intake Forms, adviser notification emails continue to send, CV uploads remain supported, and the existing approve/decline plus booking-link workflows are preserved.

## v0.13.26 changes

- Replaced the public `/intake` questionnaire with a guided eight-stage intake journey:
  - Goal
  - You
  - Visa
  - Work
  - Study
  - Family
  - History
  - Send
- Added the "Begin your journey with us..." heading and a cleaner client-facing pathway experience.
- Added goal cards with visual icons and selected-goal confirmation.
- Added Work/Residence bridge logic so clients who choose work can still indicate residence as a longer-term goal.
- Added immediate-focus and long-term-goal information into the intake payload and notification summary.
- Added Kiwi/Aotearoa journey map and staged guide panel.
- Added four-second Kiwi-note transition cards between sections, with a Continue now option.
- Preserved all substantive intake questions from the existing form, including:
  - health
  - character
  - immigration history
  - qualifications
  - English
  - employment and experience
  - partner details
  - children details
  - funds/investment details
- Kept conditional logic to reduce redundant questions:
  - if the client is currently in New Zealand, prior-visit questions are hidden
  - if the client is in New Zealand and has a current visa type, prior-NZ-visa questions are not shown
  - family/partner applicants still see work and qualification questions with explanatory text
- Restyled the CV upload controls to match the Turner Hopkins form style.
- Added a mobile optimisation pass for step tabs, journey map, controls, and sticky actions.
- Added a final urgent-query note directing urgent enquiries to immigration@turnerhopkins.co.nz.

## Preserved behaviour

- Existing Netlify Function submission endpoint is retained: `/.netlify/functions/intake`.
- Existing intake records remain stored in `intake_enquiries`.
- Existing adviser notification emails are retained.
- Existing applicant and partner CV upload handling is retained.
- Existing approval/decline email workflow is retained.
- Existing booking-link integration in the intake approval workflow is retained.
- Existing CRM intake list, matching cues, duplicate detection, and pop-out review remain in place.

## Database

No new database migration is required.

## Recommended smoke test

1. Deploy the package to Netlify.
2. Open the public `/intake` page, including in the Squarespace embed if used.
3. Select Work in New Zealand and confirm the work/residence bridge appears.
4. Select Live in New Zealand permanently and confirm the same bridge appears.
5. Select Join my partner or family and confirm work/study questions explain why they are still being asked.
6. Confirm the country dropdown has common countries at the top with a divider but no "Common countries" heading.
7. Confirm CV upload controls accept PDF/DOC/DOCX and show the selected file pill.
8. Complete and submit a test intake form.
9. Confirm the record appears in CRM > Enquiries & Intake > Intake Forms.
10. Confirm the adviser notification email sends and includes the new immediate-need / long-term-goal details.
11. Approve the test intake and confirm the existing booking-link email flow still works.

## Build checks completed

- `npm ci` completed.
- `npm run build` completed successfully.
- Netlify Function syntax checks passed for all `.mjs` functions.

The Vite build may still report the existing large-bundle warning. That is not new to this release and does not block deployment.

---

Previous release notes retained below.

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
