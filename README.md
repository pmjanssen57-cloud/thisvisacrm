# THiS CRM v0.13.26n - Standalone Intake Opening Screen

Hotfix for the guided intake passport-stamp opening screen.

## Changes
- Replaces the overlay-based opening screen with a standalone entry state.
- Shows only the opening screen first; the guided form is rendered after the user clicks **Start your journey**.
- Keeps the passport/stamp animation compact and self-contained.
- Prevents the hidden form from influencing mobile spacing, opacity, clipping, or iframe height before the intake starts.
- Triggers iframe remeasurement after the guided form appears.

## Not changed
- Intake questions
- Guided step structure
- Conditional logic
- CRM intake records
- Adviser notification emails
- CV uploads
- Duplicate detection
- Approval/decline workflow
- Booking-link integration
- Existing iframe auto-height behaviour

## Database
No migration required.
