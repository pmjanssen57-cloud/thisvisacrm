# THiS CRM v0.17.34 - Mobile Experience Rebuild

This release rebuilds the CRM mobile presentation around a phone-first interaction model while preserving the existing desktop CRM, backend, data model and workflows.

## Mobile app shell
- Compact sticky mobile header with client search, live chat and adviser/profile controls.
- Bottom app navigation: Home, My Work, Clients, New and More.
- Dedicated New action sheet for individual clients, commercial clients, enquiries, agreements, instructions, tasks and appointments.
- Reorganised More sheet for secondary workspaces, tools, help, refresh, install and sign-out.
- Safe-area support for installed iOS/Android/PWA use.

## Phone-first workspaces
- My Work uses horizontal scope chips, compact metrics and stacked matter cards rather than a squeezed desktop board.
- Clients becomes a card-based register on mobile with status, next action and due date visible at a glance.
- Matter view keeps identity and next action prominent, with Update matter / Reschedule fixed above the app navigation.
- Forms use 16px controls and full-width layouts to avoid browser auto-zoom.
- Update matter, Reschedule, Quick Move, client quick edit and other major workflows use full-screen mobile sheets.
- Client-record section tabs become a sticky horizontal mobile navigator.
- Dense dashboard/task/calendar/billing grids collapse to mobile cards.

## Agreement and Instructions Studio
- Mobile editors no longer try to show three desktop columns simultaneously.
- Agreement Studio gets Sections / Edit / Preview mobile modes.
- Instructions Studio gets Pack / Edit / Preview mobile modes.
- Preview scale is calculated to fit the phone width without pinch-zooming.
- Editor tabs and action bars are touch sized and sticky where appropriate.

## Desktop
Desktop layout and normal adviser workflows are retained. The new presentation is applied only to tablet/mobile widths.

## Database
No schema change. Database remains at 45 migrations.
