# THiS CRM v0.17.20 - Adviser Cleanup + Faster Assessment Flow

This release focuses on two usability improvements.

## Remove accidental adviser profiles

Blank/unused adviser records can now be permanently removed. The New adviser save flow also now removes its temporary placeholder after the database record is created, preventing new blank duplicate cards from being left behind. The UI shows **Remove unused** for obvious empty `New adviser` cards, and the edit view includes **Delete unused profile** when no client matter is assigned. The server performs a wider history check and refuses deletion if the adviser is referenced anywhere meaningful. Genuine former staff should continue to be marked **Inactive** so historical ownership is preserved.

## Faster assessment navigation

The assessment no longer pauses for the four-second Kiwi fact screen between stages. Moving forward/back is immediate, and the duplicate journey-map display has been removed. The eight-stage progress indicator, branching, draft/resume, CV uploads and full review are retained.

This intentionally changes perceived complexity before removing substantive questions. It gives the team a cleaner basis for measuring whether form completion improves.

## Deployment

No database migration or Squarespace embed change is required.
