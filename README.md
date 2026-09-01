# THiS CRM v0.17.11 - Flattened Client Workspace & Split Actions

This release continues directly from **v0.17.10 Streamlined Client Update**.

## Full client record simplification

The detailed client record keeps the client picker on the left, but removes the second vertical **Client file** navigation layer. The client record sections now sit in one compact horizontal navigation bar:

- Overview
- Actions
- Documents
- Stages
- Key dates
- Billing
- More (Instructions, Agreements and Portal)

This flattens the hierarchy and brings the detailed record into the same navigation language as the rest of the remodel.

The Overview remains primarily read-only. The duplicate large **Update client** and **Full editor** controls have been removed from the Client details panel; the main Update client action stays in the page header and the full editor remains available under **More**. Section-level Edit links still jump straight to the relevant Update client section.

The client picker has also been visually lightened so it behaves more like a compact list than a stack of large cards.

## Primary action controls

**Complete**, **Change** and **Update File** now perform different jobs:

- **Complete** records the current primary action as completed and asks only what happens next. The adviser can put the file into another adviser action, Waiting on client, Waiting on third party, Waiting on INZ, Ready to progress, or Completed. The next action/review date is set in the same compact window.
- **Change** edits only the current next action/review action and its date. It does not change stage, matter status, portal wording or any other housekeeping.
- **Update File** remains the full guided workflow for substantive matter events where stage, status, portal wording, timeline and related housekeeping may all need to change together.

Changing or completing a next action continues to use the existing server-side next-action history, so the previous action is retained automatically.

## Database safety

No database migration is added. All existing migrations are unchanged from v0.17.10.
