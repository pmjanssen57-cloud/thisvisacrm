# THiS CRM v0.13.26k - Passport Stamp Opening Hotfix

This release adds the approved passport-stamp opening screen to the public guided intake form.

## Changed

- Added a full-cover opening screen to the public guided intake form.
- Added the mobile-optimised passport and stamp visual treatment.
- Added the `Start your journey` reveal interaction.
- Kept the visual treatment within the Turner Hopkins dark green / mint style.
- Updated intake submission version marker to `v0.13.26k-passport-stamp-opening`.

## Not changed

- Intake form questions.
- Guided intake step structure.
- Conditional logic.
- CRM intake record creation.
- Adviser notification emails.
- CV upload handling.
- Duplicate/related enquiry detection.
- Approval/decline workflow.
- Booking-link integration.
- Squarespace iframe auto-height embed logic from v0.13.26j.

## Database

No migration required.

## Checks

- `npm ci`
- `npm run build`
- `node --check netlify/functions/*.mjs`
