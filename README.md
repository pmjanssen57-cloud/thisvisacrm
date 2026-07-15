# THiS CRM v0.13.26d - Guided Intake Animation Rollback Hotfix

This hotfix rolls back the intake entry animation treatment while preserving the guided intake journey and CRM integration.

## Changes

- Removed the full-form intake cover/reveal animation from the public guided intake form.
- Removed the first-page door/pathway illustration card from the Goal step.
- Removed the unused kiwi silhouette public asset from the package.
- Updated the intake submission version marker to `v0.13.26d-guided-intake-animation-rollback`.

## Not changed

- Guided intake step structure.
- Intake form questions and conditional logic.
- CV upload handling.
- CRM intake record creation.
- Adviser notification emails.
- Duplicate/related enquiry detection.
- Approval/decline workflow.
- Booking-link integration.
- Database schema.

## Deployment

Deploy as a normal Netlify ZIP package. No database migration is required.
