# THiS CRM v0.13.26e - Mobile Intake Continue Cue

This hotfix adds a mobile-only continue cue to the first page of the guided public intake form.

## Changes

- Added a mobile sticky continue bar after a goal card is selected.
- Added a small mobile cue saying `Next: continue below` after the selected-goal confirmation.
- Added a gentle mobile auto-scroll to the selected-goal confirmation after selecting a goal.
- Updated the intake version marker to `v0.13.26e-mobile-intake-continue-cue`.

## Not changed

- Intake form questions.
- Conditional intake logic.
- CRM intake submission handling.
- Adviser notification emails.
- CV uploads.
- Duplicate detection.
- Approval/decline workflow.
- Booking-link integration.
- Database schema.

## Build checks

- npm ci
- npm run build
- Netlify Function syntax checks

No database migration is required.
