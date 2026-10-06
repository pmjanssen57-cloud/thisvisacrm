# THiS CRM v0.17.41 - Mobile Single-Scroll Reliability

This release is based on v0.17.40 and addresses difficult/sticky scrolling across the mobile CRM.

## Mobile interaction model
- Normal CRM pages: one browser/document vertical scroll.
- Full-screen modal/drawer/sheet workflows: one intentional internal vertical scroll.
- Instructions Studio and Agreement Studio: one vertical document scroll in each mobile mode; nested editor/preview vertical scrollers are removed.
- Horizontal tab rails remain horizontally swipeable.

## Database
No schema change. The database remains at 46 migrations and historical migrations must not be changed.

## Rollback
Deploy the v0.17.40 rollback package. No database rollback is required.
