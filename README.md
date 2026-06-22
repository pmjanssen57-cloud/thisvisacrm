# THiS CRM v0.12.40 - Intake Queue Visibility Polish

This build applies a focused Enquiries & Intake follow-up patch on top of v0.12.39.

## v0.12.40 changes

- Adviser-scoped Enquiries & Intake views now show records assigned to the selected adviser **plus unassigned records**.
- This lets any adviser see new unallocated intake forms, pick them up, and assign them from the intake card without opening the record.
- Removed the public form shortcut buttons from the top of the Enquiries & Intake page:
  - Contact form
  - Assessment form
  - Seminar form
- Kept the cleaner intake card assignment workflow from v0.12.39.
- No database migration required.

## Test process

1. Deploy this package to Netlify.
2. Open the CRM and go to **Enquiries & Intake**.
3. Confirm the top public form shortcut buttons no longer appear.
4. Set the global **Viewing** selector to a specific adviser.
5. Open **Intake Forms**.
6. Confirm the list shows:
   - intake records assigned to that adviser; and
   - unassigned intake records.
7. Assign an unassigned intake record from the card dropdown and confirm it remains visible for that adviser.
8. Switch the global **Viewing** selector to another adviser and confirm the newly assigned record no longer appears unless it is assigned to that adviser or is unassigned.

## Previous v0.12.39 changes

- Replaced the plain intake-card View action with a clearer dark button labelled **View intake**.
- Removed the redundant chevron / arrow from the middle-right of the full intake card header.
- Added an **Assigned to** dropdown directly on each full intake card.
- The assignment dropdown supports **Unassigned** plus active advisers.
- Adviser assignment saves immediately through the existing intake enquiry save flow.
- The assignment dropdown does not open the intake record when changed.
- The Enquiries & Intake workspace respects the global **Viewing** adviser selector for contact and intake records.
