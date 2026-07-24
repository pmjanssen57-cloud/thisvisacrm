# THiS CRM v0.13.47 — Dashboard Workload Adviser Scope

This release is based on v0.13.45 and makes a focused dashboard refinement without applying the broader v0.13.46 interface redesign.

## Client workload scope

When the dashboard is scoped to an adviser, the **Client workload** list now shows only clients where that adviser is the primary adviser. This matches the default behaviour already used in the Clients workspace.

A new toggle adds clients where the selected adviser is recorded only as the backup adviser. Backup-only workload rows display the same small green adviser icon and green edge used in the Clients list.

When the dashboard is deliberately changed to **Whole practice**, the workload continues to show the whole-practice client set because there is no single adviser role to apply.

## Dashboard side cards

The following cards have been removed from the dashboard:

- Needs attention
- Critical dates

The **Recently viewed** card remains available beside the workload area, together with the compact Adviser load summary. Detailed dates and attention items remain available through the Tasks, Calendar, Billing, Enquiries and client record views.

## Retained v0.13.45 changes

- Dashboard action filters default to Due today
- Contacted and searched intake forms can be viewed practice-wide
- Clients list defaults to primary-adviser matters with an optional backup toggle
- Medical certificate and Chest X-ray have separate document expiry dates
- The intake form captures current physical address

## Deployment

- No database migration
- No new npm dependency
- Existing Node and Yarn deployment configuration retained
- Commercial compliance suite and Employer Portal retained unchanged
