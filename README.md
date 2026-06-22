# THiS CRM v0.12.39 - Intake Card Assignment Polish

This build applies a focused Enquiries & Intake workflow polish pass on top of v0.12.38.

## v0.12.39 changes

- Replaced the plain intake-card View action with a clearer dark button labelled **View intake**.
- Removed the redundant chevron / arrow from the middle-right of the full intake card header.
- Added an **Assigned to** dropdown directly on each full intake card.
- The assignment dropdown supports **Unassigned** plus active advisers.
- Adviser assignment saves immediately through the existing intake enquiry save flow.
- The assignment dropdown does not open the intake record when changed.
- The Enquiries & Intake workspace now respects the global **Viewing** adviser selector for contact and intake records, so advisers can see records allocated to them.
- No database migration required.

## Test process

1. Deploy this package to Netlify.
2. Open the CRM and go to **Enquiries & Intake**.
3. Open the **Intake Forms** tab.
4. Confirm each full intake card shows a clear **View intake** button and no standalone chevron arrow.
5. Use the **Assigned to** dropdown on a card and confirm the adviser assignment saves without opening the record.
6. Change the global **Viewing** selector to a specific adviser and confirm allocated intake/contact records are scoped to that adviser.
7. Confirm the existing actions still work: **Mark contacted**, **Convert**, **Spam / Duplicate**, and **Open client** for converted records.

## Previous v0.12.38 changes

- Restored Calendar, Billing, Library and Advisers as first-level navigation buttons instead of the More dropdown.
- Removed the redundant dashboard Enquiries & Intake card now that Enquiries & Intake is a main navigation item.
- Styled the compressed adviser/view dropdown so it matches the rest of the CRM controls.
- Tidied the Enquiries & Intake form links so Contact, Assessment, and Seminar form buttons sit cleanly in one row on desktop.
