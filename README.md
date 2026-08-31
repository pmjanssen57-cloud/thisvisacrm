# THiS CRM v0.17.5 - My Work Quick Move

This release continues directly from **v0.17.4 My Work Adviser Role Filter** and retains all existing Matter Workspace, adviser filtering, visual polish, notification, intake, portal, Studio and CRM functionality.

## Quick Move on My Work

Each My Work card now has two clear actions:

- **Open matter** — opens the full Matter Workspace.
- **Move** — changes the file's operating state directly from My Work without requiring the full Update File workflow.

The Move menu uses the same four board states:

- **Needs my attention** — adviser owns the next move.
- **Waiting on client** — client action is outstanding.
- **Waiting on INZ** — the file is quiet until its review date or a new INZ event.
- **Ready to progress** — no blocker remains.

When the existing next action and date are sufficient, the move saves immediately. If the move would otherwise create an unsafe workflow state, the CRM asks only for the missing minimum information. For example, Moving to Waiting on INZ requires a review date; moving an action-less matter into an adviser/client state asks for a short next action.

Quick Move deliberately does **not** change the matter stage, portal wording or send an email. Those substantive changes remain in **Update File**.

Every Quick Move adds a short automatic timeline entry recording the previous and new operating state.

## Database safety

No database migration is included. All existing 43 migrations remain unchanged from v0.17.4.

## Rollback

Redeploy **THiS CRM v0.17.4 - My Work Adviser Role Filter**. No schema rollback is required.
