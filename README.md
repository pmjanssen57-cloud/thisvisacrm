# THiS CRM v0.17.29 - Unified Client & Commercial Matter Workspace

This release continues from v0.17.28 and brings commercial employer clients into the same day-to-day Clients and My Work workflow as individual clients, while preserving the specialist commercial data model and employer portal underneath.

## v0.17.29 change

**Clients is now the working register for everyone Turner Hopkins acts for.**

The Clients workspace now combines:

- individual immigration clients; and
- commercial / employer clients.

Commercial records are identified with a clear **Commercial** badge and building icon rather than being kept in a separate navigation area.

Both record types now share the operational matter workflow:

- primary and backup adviser ownership;
- matter status / who has the ball;
- next action;
- next action or review date;
- priority;
- Update matter;
- Reschedule;
- My Work visibility;
- dashboard/client workload visibility; and
- task visibility for dated next actions.

Commercial records retain their specialist sections inside the client record:

- Organisation and accreditation;
- Workers;
- Job Checks;
- Compliance;
- Documents;
- Employer Portal; and
- Activity / audit history.

The former Commercial navigation destination is no longer part of the normal desktop or mobile workspace navigation. Existing commercial data and portal relationships are not moved or rewritten.

## Database

This release adds **migration 45**:

`202609190001_unify_commercial_matter_workflow.sql`

It adds additive workflow fields to `commercial_clients` only:

- matter name;
- case type;
- priority;
- next action;
- next action due date;
- matter status;
- matter review date; and
- matter activity.

Two workflow indexes are also added. No historical migration is changed.

Database baseline after deployment: **45 migrations**.

## Preserved functionality

The commercial employer portal, worker register, Job Checks, compliance records, document storage and audit history remain on the existing commercial tables. v0.17.28 adviser deletion safeguards, v0.17.27 Agreement PDF pagination and v0.17.26 conversion tracking remain in place.

## Rollback

A code rollback package is supplied. Because migration 45 is additive, the rollback package restores the v0.17.28 application code **while retaining migration 45 in the migration set**. Do not delete or modify migration 45 after it has been applied. The older application ignores the additional commercial workflow columns.
