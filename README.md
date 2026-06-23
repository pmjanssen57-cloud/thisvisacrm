# THiS CRM v0.13.16 — Approval Booking Email Contact Option

This build sits on top of v0.13.13 and adds a direct adviser email option to the assessment approval + booking email while retaining the booking link/button.

## v0.13.13 changes

- Removed automatic Teams meeting link support from booking reservation emails.
- Removed Teams link insertion from applicant and adviser reservation/reschedule emails.
- Removed Teams link insertion from the attached `.ics` calendar invite.
- Removed the optional `CONSULTATION_TEAMS_LINK` environment variable from `.env.example`.
- Applicant reservation emails now state that the adviser will send meeting, phone, or joining details separately.
- Adviser booking notification emails now remind the adviser to send the meeting link or joining details directly.
- Calendar invite attachments remain in place for manual Outlook calendar management, but without a meeting URL/location.
- No Outlook calendar-write integration added.
- No payment integration added.
- No database migration required.

## Deployment note

If you already added `CONSULTATION_TEAMS_LINK` in Netlify, you can remove it. Leaving it there will not affect this build because the booking function no longer reads it.

# THiS CRM v0.13.12 — Booking Reservation and Timezone Polish

This build sits on top of v0.13.11 and keeps the booking workflow improvements, intake flow polish, contact queue status, security foundation, and CRM confirmation modal work.

## v0.13.12 changes

- Tidied the assessment approval email booking link so it renders as a branded **Book a consultation** button, with the raw link shown only as a smaller fallback.
- Reduced the spacing around the booking call-to-action in the approval email.
- Changed public booking language from **confirmed** to **reserved**, so advisers can still adjust the appointment if needed.
- New consultation bookings are now stored with status **Reserved** rather than **Confirmed**.
- Added **Reserved** to the CRM booking status dropdown and dashboard booking counts.
- Public booking page now clearly states that all available slots are **New Zealand time / Pacific/Auckland**.
- Public booking page also shows the browser-local equivalent time under each slot when the applicant is outside New Zealand time.
- Existing booking links can now be reopened by the applicant after booking to view the reserved time.
- Applicants can change their reserved date/time from the same secure booking link.
- Applicants can cancel their reservation from the same secure booking link.
- Booking cancellation and reschedule actions notify the adviser/applicant through the existing booking notification flow.
- Booking confirmation emails include the secure manage link so applicants can change or cancel their reserved consultation.
- No Outlook calendar-write integration added.
- No payment integration added.
- No database migration required.

# THiS CRM v0.13.11 - Intake Flow and Notification Polish

This build makes the consultation booking module more practical for real adviser use. The aim is simple: set a standard week quickly, block out unavailable time as needed, and let the assessment approval email generate/send the applicant booking link automatically.

## v0.13.11 changes

- Reordered the public assessment questionnaire so applicant work/qualifications sit with applicant details first, followed by partner details, then children.
- Reordered the CRM intake review/editor and intake display sections to match the new applicant -> partner -> children review flow.
- Simplified internal contact and assessment notification emails by removing record IDs and other low-value metadata from the adviser-facing content.
- Improved notification email spacing and section flow so key adviser details are easier to scan.
- Kept the editable email template system intact; subject, wording, placeholders, and custom HTML bodies remain editable in Tools.

## v0.13.10 changes

- Added fast standard availability setup in Bookings > Availability.
- Advisers can now bulk-set normal booking hours, for example 8:00am to 5:00pm Monday to Friday.
- Bulk availability replaces existing availability for the selected adviser/days so the calendar does not become a thicket of duplicate rows.
- Kept the custom single-day weekly availability option for exceptions, such as Saturdays or late-night windows.
- Added a date-range block-out workflow in Bookings > Blocked times.
- Advisers can now block a single day, a date range, whole days, or specific times across a range.
- Assessment approval emails now automatically create a secure consultation booking link for the assigned adviser and include it in the outgoing email.
- Existing active booking links for that same intake are cancelled when a new approval email creates a replacement link.
- The email template editor still controls the approval email wording. A `{{bookingLink}}` placeholder is now available, and the system appends the booking link if the template does not already include it.
- Applicant and adviser booking confirmation emails now include an `.ics` calendar invite attachment for manual Outlook calendar management.
- No Outlook Graph calendar-write integration and no payment integration have been added.
- Built on top of v0.13.9 contact form queue status polish.

## Deployment notes

Deploy this package normally. No database migration is required because the existing booking tables are reused.

## Testing notes

1. Go to Bookings > Availability.
2. Select an adviser and use Set standard booking hours, for example Monday-Friday 08:00-17:00.
3. Go to Bookings > Blocked times and add a date or date-range block.
4. Open an assessment/intake record assigned to that adviser.
5. Click Send approval + booking link.
6. Confirm the applicant receives the approval email with a booking link.
7. Complete a test booking from the public booking page.
8. Confirm the booking appears in Bookings > Bookings and that adviser/applicant notification emails include the calendar attachment.

## v0.13.9 changes

- Added contact form status filters: New, Dealt with, Spam / Duplicate, and All.
- Contact Forms tab now shows the New contact count, while the summary still reports retained records.
- Added visible status badges to each short contact form card.
- Added quick actions to mark a contact form as Dealt with, Spam / Duplicate, or Restore to New.
- Sending the full assessment/intake form email from a contact enquiry now automatically moves that contact form to Dealt with once the email is successfully sent.
- Updated contact form help text and empty-state wording so advisers understand that records are retained rather than deleted.
- Kept delete available only for records that should actually be removed from the CRM.
- Built on top of v0.13.8 CRM confirmation modal polish.

## Deployment notes

Deploy this package normally. No database migration is required because the existing intake/contact status field is reused.

## v0.13.7 changes

- Restored THiS-branded HTML styling for internal notification emails generated by:
  - contact form submissions;
  - assessment/intake form submissions; and
  - seminar registration submissions.
- Added a fixed dark teal/mint internal-notification wrapper around those emails.
- Kept the editable email template content separate from the wrapper, so the subject/body placeholders can still be managed in the CRM email template editor.
- Added compact summary panels for applicant/registrant details, flags, submission time, and record ID.
- Added a clear THiS CRM internal-use footer.
- Preserved the existing plain-text email body and email log storage.
- No Outlook, payment, portal, booking, or public form workflow changes.

## v0.13.6 changes

- Removed open prototype mode from the CRM API. If no valid Netlify Identity user or configured fallback CRM token is present, the CRM API now returns `401` instead of loading data.
- Kept the temporary `CRM_ACCESS_TOKEN` fallback available only when explicitly configured in Netlify environment variables.
- Removed the open-prototype warning from the UI because the application no longer intentionally enters that mode.
- Added production-oriented security headers through `netlify.toml`:
  - `Content-Security-Policy`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - controlled `frame-ancestors` policy for Turner Hopkins embeds
- Added API response hardening headers to Netlify functions.
- Removed wildcard `Access-Control-Allow-Origin: *` from the CRM/public API functions. Same-origin requests continue to work; the embedded forms continue to work because the iframe and API calls run from the THiS CRM origin.
- Added cache headers for built static assets.
- Updated `.env.example` to make clear that `CRM_ACCESS_TOKEN` is now an optional emergency fallback, not a production access model.
- Added optional `CORS_ALLOWED_ORIGINS` documentation for later controlled cross-origin use.

## Security posture after this build

This is the foundation pass only. It tightens the app shell and removes the riskiest prototype behaviour, but it does not yet add full adviser-level server-side permissions, public endpoint rate limiting, audit trails, malware scanning, or data retention tooling.

## Deployment notes

1. Deploy this package to Netlify.
2. Confirm Netlify Identity is enabled and adviser registration remains invite-only.
3. Confirm at least one invited adviser can log in and load CRM data.
4. If Identity has not fully settled, configure `CRM_ACCESS_TOKEN` temporarily in Netlify environment variables.
5. Once Identity is working, remove `CRM_ACCESS_TOKEN` from production.
6. Test the public pages:
   - `/contact?embed=1`
   - `/assessment?embed=1` or the relevant assessment route used by the site
   - `/seminar`
   - `/book?token=...`
7. Confirm the CRM no longer loads without either Identity or a configured fallback token.

## No database migration required

This release changes email rendering and keeps the previous security hardening behaviour. No database migration is included.

## Previous included build features

This package includes the consultation booking foundation, portal footer polish, and contact form embed containment polish from the v0.13.x line.


## v0.13.8 — CRM Confirmation Modal Polish

- Replaced the main action browser confirmation popups with branded in-app THiS CRM confirmation modals.
- Applied the new modal to assessment-form email sends, seminar approval/decline emails, intake approval/decline emails, and common delete/deactivate actions.
- Kept the modal body generic and reusable so future confirmation actions can use the same CRM pattern.
- Left browser prompts in place only where the browser itself is still required, such as copy prompts and blocked print-window alerts.
- No database migration required.


## v0.13.16 — Approval Booking Email Contact Option

- Added an adviser email fallback line to the assessment approval + booking email.
- Applicants still receive the secure booking link/button, but can also email the assigned consultant directly if they prefer.
- Added the adviser email fallback to both generated approval email HTML and editable-template generated approval emails.
- Added `adviserEmail` as an available placeholder for the assessment approval template while retaining `allocatedTo`.
- No database migration required.


## v0.13.16 — Booking Cancellation and Four-Week Slot View

- Added adviser-side booking cancellation from the CRM consultation booking list.
- Adviser cancellation sets the booking to Cancelled, reopens the original secure booking link, and sends/logs notification emails for the applicant and adviser where email settings allow.
- Public booking slots are now limited to the next four weeks rather than a longer open-ended window.
- Public booking times are grouped into collapsible week sections, with Week 1 open by default.
- The public booking view retains NZ-time and browser-local-time display for each slot.
- No database migration required.


## v0.13.16 - Seminar Email Action Hotfix

- Fixed seminar registration approval and decline email buttons not opening the CRM confirmation modal.
- Added a local confirmation helper in the seminar management panel so both buttons use the shared THiS CRM modal instead of failing silently.
- Added the same confirmation helper to the Enquiries & Intake workspace so contact-form assessment email and delete actions remain wired to the shared CRM modal.
- No database migration required.

## v0.13.17 - Approval Booking Email Copy Polish

- Updated the approval + booking email fallback link wording to: “If the booking button does not open, please copy and paste this secure booking link into your browser:”
- Updated the approval + booking email closing line to: “We look forward to hearing from you.”
