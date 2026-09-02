# THiS CRM v0.17.14 — Simple Matter Update + Advanced Editing

This release continues the Matter Workspace redesign by separating **simple day-to-day matter updates** from **advanced record editing**.

## Normal adviser workflow

Open a matter from My Work and use **Update matter**. The adviser records what happened, sets the one next action, chooses the due/review date and confirms who has the ball. If the portal should be updated, turn on **Update client portal** and use the suggested preset wording or edit it before saving.

**Save & My Work** saves the update and returns directly to the work queue.

**Reschedule** is deliberately separate and changes only the next/review date when nothing substantive has happened.

## Advanced editing

Documents, Billing, Key dates and Stages remain intact but are presented as secondary **Matter tools**. Selecting one opens the existing advanced record directly at that section. Client details remain a separate compact editor.

## Mobile

The same operating model is used on mobile. Update matter / Reschedule sit in a compact sticky bar at the bottom of the matter, while the update form opens as a bottom sheet with a sticky save area.

## Database safety

No database migration is added. Existing applied migration files are untouched.
