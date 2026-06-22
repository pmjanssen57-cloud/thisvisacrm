# THiS CRM v0.13.4 - Portal Contact Footer Polish

This build adds the first native consultation booking module to THiS CRM. The module is intentionally separate from the daily adviser workflow so it can be configured and tested without cluttering the dashboard, client workspace, or Enquiries & Intake screens.


## v0.13.4 changes

- Replaced the collapsible client portal **Contact Turner Hopkins** card with a fixed dark green footer.
- Restored strong light text contrast for phone, email, website and last-updated details.
- Removed the footer chevron/collapse behaviour so the contact details are always visible.
- No database migration required.

## v0.13.3 changes

- Aligned the right-hand search row controls so the **Search**, **Results**, and **Clear** controls sit on the same visual baseline.
- Standardised the compact result pill and Clear button height.
- No database migration required.

## v0.13.2 changes

- Fixed a startup crash caused when the header time/weather snapshot loaded before an adviser profile was available.
- The snapshot now safely falls back to Auckland/New Zealand time and weather instead of blanking the CRM.
- No database migration required.

## v0.13.1 changes

- Tightened the main Viewing/Search toolbar so the Clear action is a compact button rather than a large block.
- Added a small adviser-local time and weather snapshot to the CRM top header.
- The header snapshot uses the selected adviser/location metadata where available and falls back to Auckland/New Zealand time.
- No database migration required.

## v0.13.0 changes

- Added a new **Bookings** CRM module.
- Added consultation type management, seeded with:
  - Free 15-minute consultation
  - Paid 60-minute consultation, payment handled manually at this stage
- Added adviser weekly booking availability.
- Added adviser blocked dates/times.
- Added controlled booking links that can be created from the CRM and pasted into intake approval/next-step emails.
- Added a public self-booking page at `/book?token=...`.
- The public booking page shows available slots based on:
  - adviser availability;
  - consultation duration;
  - buffer time;
  - manual blocked times; and
  - existing confirmed bookings.
- Applicants can confirm a consultation booking online.
- Confirmed bookings appear back in the CRM **Bookings** module.
- Booking links are marked **Used** once an applicant books.
- Applicant and adviser notification emails are sent if Microsoft email environment variables are configured; otherwise draft email log records are created for visibility.
- No Outlook calendar integration yet.
- No payment integration yet.

## Database changes

Adds new tables:

- `consultation_types`
- `adviser_booking_availability`
- `adviser_booking_blocks`
- `consultation_booking_links`
- `consultation_bookings`

Migration included:

- `202606230001_add_consultation_booking.sql`

## Test process

1. Deploy this package to Netlify.
2. Open THiS CRM and confirm the new **Bookings** navigation item appears.
3. Go to **Bookings > Types** and confirm the two default consultation types exist.
4. Go to **Bookings > Availability** and add at least one availability row for an adviser.
5. Go to **Bookings > Blocked times** and optionally add a test block.
6. Go to **Bookings > Booking links** and create a booking link for an adviser/applicant.
7. Copy the booking link and open it in a new browser tab.
8. Confirm available times appear for the selected adviser.
9. Book a free 15-minute consultation.
10. Return to the CRM and confirm the booking appears under **Bookings > Bookings**.
11. Confirm the booking link status changed to **Used**.

## Notes

This is the self-booking foundation only. Outlook calendar invite creation and online payment can be added later once the workflow is proven and the volume justifies the extra integration work.
