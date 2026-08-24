# THiS CRM v0.16.0 - HuB Visual Refresh

This release is built directly from the supplied v0.15.16 Migration Integrity Restoration baseline. It retains the complete v0.15.16 application and introduces a HuB-inspired staff CRM visual system: persistent dark-teal desktop navigation, a compact search/action header, mint/teal dashboard treatment, cleaner operational cards, modern status controls and consistent styling across the principal staff workspaces. Public forms, portals and public live chat remain outside the staff application shell.

## v0.16.0 staff interface

- Desktop primary navigation now sits in a persistent left rail.
- Global client search moves into the staff header.
- Dashboard, client, commercial, enquiry/intake, task, billing, booking, calendar, Studio, resource and administrative screens share the refreshed card, field, status and spacing system.
- Dense operational tables and queues remain compact rather than being converted into oversized HuB-style tiles.
- Existing mobile navigation is retained.
- The application requires no database migration, new dependency or new environment variable for this visual refresh.

## Rollback

The supplied v0.15.16 package remains the immediate rollback build. v0.16.0 does not change the database schema or any historical migration, so rolling back the application does not require a database rollback.

## Retained v0.15.16 migration integrity restoration

The previously applied `202608110001_add_intake_updated_at_index.sql` migration remains at its exact original v0.15.12 contents so Netlify can verify migration integrity. The v0.15.15 family editor fix and all v0.15.14 runtime optimisations are retained.

## Migration integrity

- The historical migration's release comment is restored from `v0.15.13` to its original `v0.15.12` value.
- Its SQL operation remains unchanged.
- Newer database optimisation work remains correctly isolated in `202608170001_optimize_idle_runtime_queries.sql`.

## Family editor

- Adding a spouse/partner or child expands the family content normally and moves the client editor's internal scroll area far enough to show the complete new row.
- The new member's name field receives focus after layout has settled.
- Existing family counts, age calculations, editing, removal and saving remain unchanged.

## Blob-backed live chat runtime

- Public launcher status is cached in Netlify Blobs. Once warmed, a closed website chat widget can check open/closed status without querying Postgres.
- The visitor iframe is still lazy-loaded only when the visitor opens chat.
- Each conversation has a small Blob runtime marker containing a revision and latest message/event timestamps.
- Routine visitor and adviser checks compare revisions first. If nothing changed, the request completes without querying Postgres.
- Chat mutations refresh the relevant conversation marker and the lightweight practice attention marker.
- Live-chat settings and the adviser lookup used by chat are cached outside the transactional database path.

## Delta message/event retrieval

- Visitor polling requests only public messages newer than the last message already held by the browser.
- Adviser chat polling requests only messages and audit events newer than the local cursors.
- The full conversation list is queried only when the global chat revision changes or an adviser explicitly requests a refresh.

## Hidden/logged-out polling

- Website launcher status checks stop while the browser tab is hidden.
- Visitor message polling stops while the tab is hidden.
- CRM live-chat attention and conversation polling stop while the CRM tab is hidden.
- Logged-out CRM sessions do not run staff polling.
- Existing schedule-aware behaviour remains: outside opening hours with no waiting/active conversations, routine CRM checks sleep until the next opening time.

## Cached reference data

The main CRM loader now reads relatively stable reference data through a Netlify Blob cache rather than repeatedly querying it with transactional records:

- advisers;
- email templates;
- Instructions Studio template library;
- Agreement Studio template library; and
- consultation types.

The cache is invalidated or refreshed when those records are changed through the CRM. Static stage templates already live in application code, while client stage progress remains transactional client data.

## Query and index housekeeping

- Routine CRM mutations continue to use the targeted-response architecture introduced in v0.15.12 rather than rebuilding the complete CRM dataset.
- Normal CRM and live-chat functions no longer use `SELECT *` for dashboard/chat reads.
- Added indexes for high-frequency live-chat queue/message lookups and common client task/date queries.
- The explicit manual Refresh actions remain available for reconciliation when required.

Migration: `202608170001_optimize_idle_runtime_queries.sql`.

## Hosting/database settings

Database sleep-on-inactivity and maximum compute limits are provider/account settings and are not controlled by this source package. Keep the database inactivity sleep at five minutes and, where the database plan permits it, test a one- or two-compute-unit maximum and retain the lowest cap that gives acceptable CRM performance.

No new dependency or environment-variable changes are required. Netlify Blobs uses the existing site runtime.
