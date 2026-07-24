# THiS CRM v0.13.45 — Adviser Views, Intake Visibility and Document Refinements

This release refines the daily adviser workflow without changing the existing commercial compliance, portal, booking, email, backup or export modules.

## Dashboard tasks

The dashboard client workload list now opens with **Due today** selected. Advisers can still switch to overdue, next 7 days, next 30 days, future, undated or all actions.

## Intake visibility

The normal intake queue remains scoped to the selected adviser. Two operational views now search across the whole practice:

- The **Contacted** status view
- Any active search in the Intake Forms tab

This prevents older or previously assigned forms being hidden when an adviser is following up or locating a known applicant. Contact exports retain their existing adviser scope.

## Client adviser views

The Clients workspace now defaults to matters where the logged-in adviser is the **primary adviser**. A toggle adds matters where that adviser is recorded only as the backup adviser. Backup-only matters have a small green adviser marker and green edge in the client list.

The adviser filter also retains the ability to view another adviser or all clients within the current CRM scope.

## Medical and Chest X-ray documents

The standard document checklist now has separate entries for:

- Medical certificate
- Chest X-ray

Each item has its own obtained status and expiry date. Existing legacy **Medicals** data is carried into the Medical certificate entry so previous records are not lost or duplicated.

## Intake physical address

The full assessment form now captures the applicant's current physical address. It appears in internal intake review and notification summaries and is used as the new client's location when an intake is converted. The value is stored inside the existing intake payload, so no database migration is required.

## Deployment

- No database migration
- No new npm dependency
- Existing Node and Yarn deployment configuration retained
- Commercial compliance suite and Employer Portal retained unchanged
