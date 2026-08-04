# THiS CRM v0.13.58 — Unified Studio Workspace and Workflow Stability

This build is based on v0.13.57.12 and preserves the full CRM, intake, booking, portal, commercial compliance, Instructions Studio, Agreement Studio, email and signing functionality.

## Unified Studio workspace

- Replaces the separate Instructions and Agreements ribbon items with one Studio entry.
- Adds a controlled Studio landing page for Agreement and Instructions work.
- Makes New from intake the primary Agreement action.
- Retains direct client-record and intake-linked creation routes.
- Moves Bookings and Calendar into the main navigation More menu to reduce visual clutter.

## Stability fixes

- My Day now auto-opens once per authenticated browser session and cannot appear a second time after dismissal.
- Studio editors use explicit session identifiers and stale-message guards.
- Closing a Studio ends the active iframe session and prevents late save, issue or initialisation responses from reopening it.
- Contextual launches are processed once and cleared safely.

## Agreement fixes

- The selected agreement type now controls the initial matter description instead of the client record case type or strategy.
- Changing the agreement type refreshes the matter description, scope and government-fee defaults together.
- Print / save PDF invokes the browser print dialogue directly from the clean agreement-only view rather than opening a separate browser page.

No database migration, API or dependency change is included. Perform one hard refresh after deployment so the updated service-worker cache is activated.
