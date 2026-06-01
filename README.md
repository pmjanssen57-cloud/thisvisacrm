# Turner Hopkins CRM - Netlify Database v0.9.0

This package uses the default Netlify Functions directory: `netlify/functions`.

Deployment:
1. Upload the unzipped project contents to the GitHub repo root.
2. In Netlify, import the GitHub repo. Do not use drag-and-drop deploy for this database version.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Functions directory: `netlify/functions`
6. Add environment variable: `CRM_ACCESS_TOKEN` during the login transition.
7. Enable Netlify Identity and set registration to invite-only before testing adviser logins.
8. Clear cache and deploy.

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

## v0.6.2

- Updated billing statuses to WIP, Invoiced and Overdue.
- Added month, 3-month, 6-month and year billing views.
- Added billing status, adviser and search filters.
- Marks overdue billing rows with a soft red background.
- Added date-based and milestone-based billing triggers.
- Milestone billing becomes due when the linked client stage is completed and appears in the task lists while it is WIP.
- Adds migration `202605300004_add_billing_triggers.sql`.

## v0.6.3 changes

- Updated the default matter stages to: Instruction Sent, Documentation Gathering, IQA Ready, Visitor Visa Ready, Work Visa Ready, Family Temporary Visas Ready, Residence Ready, and Residence Approved.
- Added client-specific custom matter stages.
- Added stage reordering controls before saving the client record.
- Custom stages now appear in the progress map and can be used as milestone triggers for billing items.
- Legacy stage keys are mapped to the new stage names automatically on load.


## v0.6.7 - Personal adviser tasks

Adds adviser-specific personal tasks. These can be linked to a client or used as general internal tasks. Personal tasks appear in the Tasks tab, Today's bring-up list, and Quick task panel based on the current adviser view. A new database migration creates the `personal_tasks` table.

## v0.6.9 - Favicon and document checklist

- Adds a THiS-branded SVG favicon using the Turner Hopkins colour scheme.
- Adds a collapsible Document checklist section inside each client record.
- Standard checklist items can be included or hidden per client.
- Each checklist item stores the document name, optional expiry date, and whether the item has been obtained.
- Custom checklist items can be added and removed per client.
- Adds migration `202605300006_add_document_checklist.sql`.


## v0.6.9 update

Document checklist hidden items now show only the document name, greyed out, with the option to include the item again. Expiry and obtained fields are hidden until the item is included.


## v0.7.0 - Usability polish

- Reworked date helpers to use local calendar dates rather than UTC string slicing, reducing New Zealand off-by-one date risk.
- Added unsaved-change protection when switching client records, changing pages, refreshing, or leaving the browser tab.
- Added a sticky client save/status bar showing unsaved changes and quieter save feedback.
- Replaced save/copy browser alerts with inline status messages where practical.
- Added document checklist expiry dates to the task list and next critical dates.
- Changed document checklist wording from hidden to not required for clearer file-handling language.
- Added a dashboard safety-net panel for active clients with no next action date.
- WIP billing with a past reporting date now displays as overdue in billing views while preserving the saved billing status until updated.
- Uses the public Turner Hopkins logo asset instead of embedding a large base64 logo in the app bundle.

## v0.7.1 - Next action log

- Adds a durable next action log for each client.
- When a saved client record has its next action text or next action date changed, the previous scheduled action is automatically stored in the client's action history.
- Adds a Next action log button in the client quick view, opening a pop-up with the current next action and previous completed/replaced scheduled actions.
- Adds migration `202605310001_add_next_action_log.sql`.


## v0.7.2 - Calendar and appointment task mapping

- Adds a Calendar tab to the main CRM navigation.
- Calendar view options now include current month, current month + 2 months, and a searchable month selector.
- Adds calendar appointment booking with title, client link, adviser link, date, start/end time, location/channel, notes and status.
- Open calendar appointments appear as task-style bring-up items in the Dashboard and Tasks page.
- Completed calendar appointments remain in the calendar but are removed from active task views.
- Adds migration `202605310002_add_calendar_entries.sql`.

## v0.7.3 - Client timeline and calendar follow-up polish

- Adds a client Timeline button and modal showing current next action, previous next actions, linked calendar appointments, completed matter stages, document expiry items and billing events.
- Adds appointment type to calendar entries.
- Allows a completed linked calendar appointment to create or update the client's next action.
- Adds unsaved-change protection to the calendar editor.
- Adds overdue open calendar appointment counts.
- Adds migration `202605310003_add_calendar_appointment_type.sql`.

## v0.7.4 - Billing filter UI polish

- Replaces the native billing Start month field with a CRM-styled Start period month selector.
- Adds previous/next month controls for the billing period selector.
- Improves billing period display labels, for example May 2026 rather than raw ISO date ranges.
- Widens the billing adviser filter so “All advisers in current view” is not clipped.
- Applies consistent rounded styling to billing toolbar inputs and filters.
- No database migration required.


## v0.7.5 - Client section expanders

- Makes the Matter stages, Client deadline dates, and Billing and invoicing schedule areas collapsible inside the full client record.
- Adds summary text to each collapsed section so advisers can see stage progress, deadline count, and active billing totals before opening the section.
- Keeps the full client record toggle unchanged, but reduces visual clutter once the record is open.
- No database migration required.
## v0.7.6 - Adviser tools sidebar

Adds a right-side Adviser Tools drawer alongside the existing support drawer. The tools drawer includes a weather lookup, timezone converter, indicative currency converter and basic calculator for use during client work. No database migration is required.

## v0.7.7 - Mobile view foundation

Adds a mobile-specific CRM layout while preserving the desktop experience. Phones now use a bottom navigation bar, a mobile More menu for Billing, Advisers, Help and Tools, card-style task/workload/billing rows, and full-screen mobile drawers/modals for Help, Tools, Timeline and other pop-up panels. No database migration is required.

## v0.7.8 - Mobile header button polish

- Refines the three mobile header buttons so Help, Tools and Refresh display as equal side-by-side action tiles.
- Adds larger mobile icons and pale green Turner Hopkins-style shading for better thumb usability and visual consistency.
- Keeps the desktop header unchanged.
- No database migration required.


## v0.7.9 - Mobile tools safe-area fix

- Fixes the mobile Adviser Tools drawer so calculator results, currency conversion outcomes, weather results and other bottom-of-panel outputs are not hidden behind the sticky mobile quick access bar.
- Raises mobile Help/Tools full-screen drawers above the bottom navigation and adds safe-area bottom spacing for phone browsers.
- No database migration required.



## v0.8.1 - Login logout polish

- Added a clearer desktop Sign out button in the top action bar.
- Changed the session status card logout link into a visible Sign out button.
- Added Sign out to the mobile More menu for both Identity and temporary access-code sessions.
- Stopped silently reusing legacy stored CRM access codes from older builds.
- Kept Netlify Identity session persistence intact: users stay logged in until they sign out.
- No database migration required.

## v0.8.0 - Adviser login foundation

- Adds Netlify Identity browser login using `@netlify/identity`.
- Handles invite acceptance and password recovery callback links inside the CRM.
- Adds a Turner Hopkins branded login screen with email/password login and password reset request.
- Keeps a temporary CRM access-code fallback during transition so the team is not locked out while Identity is tested.
- Adds logged-in user display and logout.
- Adds a Login Email field to adviser profiles and maps the logged-in Identity user to the adviser record.
- Defaults the adviser scope to the matched logged-in adviser once CRM data loads.
- Adds basic admin/manager role awareness for all-adviser/adviser-management UI access.
- Adds server-side Identity acceptance in the CRM Netlify Function while retaining the legacy `CRM_ACCESS_TOKEN` fallback.
- Adds migration `202606010001_add_adviser_login_email.sql`.

### v0.8.0 testing sequence

1. Deploy this build.
2. Confirm Netlify Identity is enabled and registration is invite-only.
3. In Netlify Identity, ensure Paul Janssen has role `admin`.
4. In the CRM Adviser profile, set Login Email to the same Netlify Identity email.
5. Use Send reset password email or resend invite from Netlify.
6. Open the email link and set the password through the CRM screen.
7. Confirm the CRM opens, shows the logged-in user, and defaults to the matched adviser view.
8. Keep `CRM_ACCESS_TOKEN` until the login flow has been tested by at least one other adviser.

### v0.8.0 deployment note

This package-lock uses public npm registry tarball URLs so Netlify can install dependencies during deployment.

## v0.9.0 - INZ Knowledge Library Foundation

- Added a new Library section for controlled INZ policy and forms references.
- Added Policy and Form tabs with searchable/filterable library entries.
- Library entries store reference code/form number, title, category, status, official source URL, version/acceptable-until notes, related case types, related document items, THiS summary, adviser notes, last reviewed date, next review due date and reviewed by.
- Added review-due and watch-status visibility so stale or change-sensitive policy/form items can be managed.
- Added copy/open official source controls.
- Added mobile access to the Library through the More menu.
- Added migration `202606010002_add_inz_library_entries.sql`.
- Fixed the Tools currency converter by routing conversions through a Netlify Function proxy with a fallback exchange-rate source, avoiding browser `Failed to fetch`/CORS failures.
- Added `netlify/functions/currency.mjs` for currency lookups.
- Kept adviser roles permissive for now; all advisers can be assigned admin in Netlify Identity while role restrictions are handled later.

## v0.9.1 - Main Menu Polish

- Tidied the desktop main navigation after the Library tab was added.
- Keeps the desktop menu on one line where space allows.
- Adds stronger pale-green menu styling, clearer button separation and a more obvious active tab.
- Adds horizontal overflow protection on narrower desktop/tablet widths rather than wrapping the final tab onto a second line.
- Mobile bottom navigation remains unchanged.
- No database migration required.

## v0.9.2 - Client Profile Export and OneLaw Reference

- Adds a OneLaw Client Number field to the client record for matching CRM records to OneLaw.
- Adds migration `202606010003_add_onelaw_client_number.sql`.
- Adds a Print profile button from the client quick view.
- The printable client profile includes client details, OneLaw number, advisers, case strategy, current progress, matter stages, current next action, full next-action log, client timeline, linked calendar appointments, deadlines, document checklist, family/dependants, billing schedule and notes.
- The profile opens in a browser print window so users can print or save as PDF using the browser/system print dialogue.
- No existing migration files were edited.
