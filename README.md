# THiS CRM v0.13.26j - Guided Intake Iframe Height Loop Hotfix

Built from v0.13.26i.

## Changes
- Fixed the embedded guided intake auto-height feedback loop that could cause the Squarespace iframe space to keep expanding.
- Guided intake now reports the actual form card height rather than document/body scrollHeight inside the iframe.
- Updated the Squarespace guided intake embed to use only a small buffer when applying the reported iframe height.
- Updated the intake version marker to v0.13.26j.

## Not changed
- Intake questions and guided step structure.
- Conditional logic.
- CRM intake records.
- Adviser notification emails.
- CV uploads.
- Duplicate detection.
- Approval/decline workflow.
- Booking-link integration.

No database migration required.
