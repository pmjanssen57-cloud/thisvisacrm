# Turner Hopkins CRM - Netlify Database v0.5.5

This package uses the default Netlify Functions directory: `netlify/functions`.

Deployment:
1. Upload the unzipped project contents to the GitHub repo root.
2. In Netlify, import the GitHub repo. Do not use drag-and-drop deploy for this database version.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Functions directory: `netlify/functions`
6. Add environment variable: `CRM_ACCESS_TOKEN`
7. Clear cache and deploy.

Function tests after deploy:
- `https://YOUR-SITE.netlify.app/.netlify/functions/ping` should return `{"ok":true,"function":"ping"}`.
- `https://YOUR-SITE.netlify.app/.netlify/functions/crm` should return JSON, usually an unauthorised message if `CRM_ACCESS_TOKEN` is set.

If either URL returns the CRM webpage HTML, the Function was not deployed. Check the Netlify deploy summary for deployed Functions.


## Diagnostics

After deployment, test these URLs first:

- `/.netlify/functions/ping` should return JSON with `{ "ok": true }`.
- `/.netlify/functions/diagnostics` should return JSON showing database connectivity.
- `/.netlify/functions/crm` should return either an unauthorised JSON message or CRM JSON.

If any of these returns HTML or plain text, check Netlify > Deploys > latest deploy > Functions logs.


## v0.4.9 database runtime note
This version passes the Netlify Database connection string explicitly when `NETLIFY_DB_URL`, `NETLIFY_DATABASE_URL`, or `DATABASE_URL` is present. This helps when Netlify Functions run in Lambda compatibility mode and the automatic database environment is not injected into `getDatabase()`.


## v0.5.5

- Removed the user-facing Matter name field.
- Added a Case strategy field for the client master summary, key issues, risks, evidence gaps and case approach.
- Adds/updates the `case_strategy` database column automatically on first Function run after deploy.


## v0.5.5 migration correction

This package restores the original initial CRM schema migration and adds the case_strategy column through a new migration file. Do not edit already-applied migration files; add a new migration for future schema changes.


## v0.5.7 changes

- Changed the visible nationality field to Citizenship with a country lookup list.
- Added applicant date of birth with automatic age display.
- Changed Location to Current address with a lookup-style address field.
- Added spouse/partner and children details with dates of birth and calculated ages.
- Moved next action into a clearer task section with a task due date that feeds the dashboard and task lists.
- Added a separate database migration for date of birth and family members.


## v0.5.7 update
- Added spouse/partner and child citizenship fields.
- New client forms now start with blank case/adviser selections.
- Removed the Stage Usage Overview from the dashboard.
- Added a daily bring-up panel for next actions due today.
- Added a filterable adviser client workload list ordered by the next action or next critical deadline.


## v0.5.9

Fixes the floating Help button so it opens the support drawer correctly.

## v0.6.0 update

Adds a client SharePoint folder URL field, plus Open folder and Copy link actions. This creates a new migration: `202605300003_add_sharepoint_folder_url.sql`.


## v0.6.1

- Added SharePoint folder button to the dashboard client workload list.
- Workload list now shows up to around ten rows before scrolling.
- Added a collapsible client detail view with a quick-view panel for name, DOB, status, next action and SharePoint folder link.
