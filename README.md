# THiS CRM v0.17.12 - Client Navigation & Mobile Header Refinement

Built from v0.17.11. This is a focused UI refinement with no database changes.

## Client section navigation

The Full Record client workspace no longer hides Instructions, Agreements and Portal behind a More menu inside a horizontally scrolling tab strip. All client sections are now visible as standard tabs and wrap cleanly onto additional rows when required. On small screens the tabs become a two-column grid, so there is no horizontal scrolling or clipped popover navigation.

## Mobile header

The large mobile Tools button has been removed from the top header because Tools is already available from the persistent bottom **More** menu. The remaining top actions use a compact single-row treatment rather than large card-style buttons, substantially reducing vertical space on mobile.

## Database safety

No migration is added or changed. Existing v0.17.11 migrations remain untouched.

## Rollback

Redeploy THiS CRM v0.17.11 - Flattened Client Workspace & Split Actions. No schema rollback is required.
