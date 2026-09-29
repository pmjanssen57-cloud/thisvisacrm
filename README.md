# THiS CRM v0.17.35 - Compact Mobile Status Cards

This is a targeted mobile-density refinement on top of the v0.17.34 mobile rebuild. The CRM logic, desktop interface, backend and database model are unchanged.

## Mobile changes
- My Work status summary uses a compact 3 x 2 grid so all six status cards fit naturally at normal phone zoom.
- Status cards use smaller padding/type while remaining readable.
- Dashboard, Tasks, Calendar and Billing metric cards stay in a compact two-column layout on phones instead of collapsing to large single-column cards.
- Matter work-state headers, matter cards, status pills and footer actions use reduced spacing to show more useful information without requiring browser zoom-out.
- Very narrow phones receive an additional small typography reduction, but controls remain touch friendly.
- 16px form controls from v0.17.34 remain unchanged so iOS/browser input auto-zoom is still avoided.

## Desktop
Desktop behaviour and layout are unchanged.

## Database
No schema change. Database remains at 45 migrations.
