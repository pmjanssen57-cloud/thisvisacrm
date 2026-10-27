# THiS CRM v0.17.64

THiS CRM v0.17.64 — 27 October 2026

Update matter now has Action history beside Manage client. It opens a popup containing previous scheduled actions and recorded matter updates, newest first. Opening and closing it retains unsaved daily edits. The popup supports keyboard focus, Escape, scrolling and small screens.

A red-pin internal note can be added above the working snapshot. Save pin persists it without changing the next action, date or matter status. Notes can be edited or unpinned; prior versions and unpin events remain in the internal history. Pinned-note changes may also be saved together with the normal matter update in one Save changes request. Failed pin saves retain the text and show an inline error. Unsaved pin edits participate in the existing CRM discard confirmation. The saved pin is also displayed in Manage client. This supports individual and commercial matter updates.

Pinned state uses the existing internal matter_activity JSON. Frontend and backend normalisation retain the latest pin or unpin event within the normal 250-entry activity cap, so normal history rollover does not clear a pin or resurrect an unpinned note. Ordinary histories retain their previous behavior. Public individual and commercial portal snapshots do not select or expose internal matter activity. No public portal or document publishing is triggered by saving a pin.

Fewer steps to detailed editing: Client details is now a direct shortcut from the snapshot. Its profile groups are initially open and editable, while remaining individually collapsible. Existing stage/document shortcuts and the shared Manage client save bar are preserved.

Baseline v0.17.63, retaining styled CRM confirmations, Manage client, My Work, enquiry badges and queue menu fixes. Schema: no change and no new migration. All 48 migration files are byte-identical. One Netlify module changes: crm.mjs, limited to activity normalisation for pin retention. Other 23 modules unchanged. Studio/people/document engine scripts unchanged; representative print content, page count and geometry match v0.17.63 for both Studios.

Verification: production build; JSX/JS/public/inline script and CSS syntax; undefined-reference check; native-confirm audit; PWA/cache references; migration integrity; ZIP CRC and contents. Snapshot/history layouts checked at 1440, 1024, 768, 390 and 320px. End-to-end synthetic cases cover historical actions and workflow entries, history preserving unsaved edits, pin-only saves not changing workflow fields, reload persistence, pin edit save failure/retry, unpin Cancel/Confirm with history retained, unsaved pin close cancellation, combined pin/update save, direct editable client fields and commercial pin persistence. Normaliser tests cover frontend/backend parity, JSON round trips, ordinary activity cap, retention through over 500 activities, unpin state without resurrection, backend diff isolation and portal exclusion. Manage client, My Work, enquiry, CRM confirmation, broader app integration and Studio print regression suites passed. The 10-state Manage client control audit has no detected clipping, overlap or off-screen control findings.

Limits: local Edge with synthetic records and intercepted APIs. No production database, live email or physical-device checks. Stored JSON normalization is tested without a live database round trip. Simultaneous multi-adviser writes were not exercised. UI tests cover representative states, not every record length or conditional form path. Local Node 24; Netlify pins Node 20.19. Existing bundle-size advisory remains.

Deployable source ZIP requires normal Netlify build. Rollback ZIP is an exact v0.17.63 release copy. No schema rollback is required. Nothing deployed.
