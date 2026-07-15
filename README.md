# THiS CRM v0.13.26f - Mobile Fun Fact Scroll Fix

Incremental hotfix from v0.13.26e.

## Changes

- Removed the mobile-only sticky Continue bar that appeared after selecting the first goal card.
- Kept the small mobile visual cue below the selected-goal confirmation.
- Added scroll coordination for the guided intake fun-fact transition:
  - when a fun fact appears, the page scrolls to centre it;
  - when the next section loads, the page scrolls back to the top of the intake form.
- Added `turner-hopkins-guided-intake-embed.html` with an iframe listener for height and scroll messages when embedded in Squarespace.

## Not changed

- Intake questions and step structure.
- Conditional logic.
- CRM intake records.
- Adviser notification emails.
- CV uploads.
- Duplicate detection.
- Approval/decline workflow.
- Booking-link integration.

## Database

No new migration required.
