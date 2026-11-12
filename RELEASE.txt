THiS CRM v0.17.93 — Clearer Action log and Activity history

WORKING SNAPSHOT
Action log is now the first shortcut: File notes & chats. It opens a popup containing saved team chat transcripts and day-to-day commentary (adviser notes and the internal notes from matter updates), with authors and dates. Activity history is a separate shortcut: Actions & changes. It shows previous scheduled actions and recorded matter events. Workflow commentary is shown in Action log rather than repeated in Activity history. Stages & documents and Client details remain alongside these shortcuts, with responsive layout.

TEAM CHAT / EXISTING RECORDS
Selected team messages are saved using Save to action log. The client Action log reads the existing durable internal chat-note records; existing saved transcripts appear there without copying or migrating them. Original conversations, authors, timestamps, file permissions, deduplication and portal privacy remain unchanged. Existing internal audit markers remain stored but are not presented as chat content in Activity history. No record is deleted or moved destructively.
The old Next action log popup showed scheduled-action history; those records remain available through Activity history. The full client workspace is labelled Notes & history, with links and explanations for both views. The timeline and printed previous scheduled actions remain available. Add new file commentary through Internal note in Update matter; the Action log popup is a reading view.

MIGRATION / RELEASE
No new migration, schema, backend, dependency or environment change. All 52 migrations and 34 Netlify modules are byte-identical to v0.17.92. Pathway approval email functionality, seminar close/archive and earlier chat/draft fixes are retained. No Squarespace embed update required.

VALIDATION
Production build, application JSX/JS, public scripts, Netlify module syntax, CSS/inline assets and PWA/cache checks passed. Local built Edge tests used two synthetic staff accounts and the existing backend with a database test double: message sending/retry, retained drafts, website separation, group chat, individual and employer file copies, transcript retrieval in Action log, file commentary, retained previous scheduled actions in Activity history and exclusion of chats/commentary from that history passed. Snapshot and chat layouts checked at 1440/768/390/320px; screenshots inspected. ZIP CRC, unique safe paths and every packaged file hash verified. Rollback is byte-exact.

DEPLOYMENT / LIMITS
Deploy THiS-CRM-v0.17.93.zip through the existing Netlify source build (yarn build; publish dist) and refresh the CRM. No production deployment or live record changes performed. Checks used local Edge, emulated widths and synthetic records, not live PostgreSQL, production chat or physical phones/Safari/Firefox. Existing bundle-size advisory remains. Local Node 24; Netlify configured Node 20.19.
THiS-CRM-v0.17.92-ROLLBACK.zip is the exact prior release. No database rollback required.
