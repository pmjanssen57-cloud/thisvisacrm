# THiS CRM v0.13.46 — Streamlined Adviser Interface

This release applies a coordinated interface simplification across the adviser Dashboard, navigation, Clients list and client record. Existing database records, Netlify Functions, commercial compliance tools, client and employer portals, bookings, intake workflows, email, backups and exports are retained.

## Interface changes

### Daily Dashboard

The Dashboard is now a focused daily attention screen. It shows:

- Tasks due today
- Overdue tasks
- New enquiries
- Today's appointments
- Compact secondary alerts for portal notes, clients without next actions and critical dates

The full task register remains in **Tasks** and the complete client portfolio remains in **Clients**.

### Navigation

The main adviser navigation is reduced to:

- Dashboard
- Tasks
- Clients
- Enquiries
- Bookings

Commercial, Calendar and Billing are grouped under **Practice**. Library, Advisers, Backups, email tools and system utilities remain in **Tools**, subject to role permissions.

### Clients list

The Clients workspace now uses a compact work-queue row showing only the client, matter and stage, next action and adviser. Secondary information such as OneLaw number, SharePoint status, case strategy and progress detail remains inside the client record.

The list still defaults to the logged-in adviser as main adviser. The backup-matter toggle and green backup marker remain available.

### Client record

The record is organised around five primary sections:

- Overview
- Actions
- Documents
- Progress
- Key dates

Portal, Billing, Family and Notes & strategy are grouped under **More sections**. Core contact and allocation fields are collapsed on the Overview until needed. Clean records no longer display a persistent save-status bar.

## Changes retained from v0.13.45

- Contacted intake forms and intake search results can be reviewed across the practice.
- Medical certificate and Chest X-ray are separate checklist items with separate expiry dates.
- The full intake questionnaire captures current physical address.
- The Clients list defaults to main-adviser matters with an optional backup-matter view.

## Deployment

- Node 20.19.0
- Yarn Classic 1.22.22
- Netlify Functions and Netlify Database retained
- No new dependency
- No database migration for this release

Deploy through the existing GitHub and Netlify workflow. Use **Clear cache and deploy site** only when Netlify dependency caching causes an installation issue.
