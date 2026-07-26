# THiS CRM v0.13.51 — PWA Install Option Restored

This release is based on v0.13.49 and refines the icon used when the CRM Progressive Web App is installed on a desktop computer.

## Desktop icon changes

- High-contrast dark-green THiS monogram designed for small Windows taskbar sizes
- Dedicated 64px, 128px, 192px and 512px manifest icons
- Multi-resolution Windows favicon from 16px through 256px
- Matching SVG browser favicon
- New icon filenames to avoid browsers continuing to use the previously cached artwork

The existing Android maskable icons and mobile launcher appearance are unchanged.

## Applying the updated icon

After deploying this release, desktop operating systems may continue to show a cached icon for an app that is already installed. For the quickest refresh:

1. Close the installed THiS CRM app.
2. Uninstall the desktop PWA from Chrome or Edge.
3. Clear the site icon cache if the old artwork remains.
4. Reopen the CRM website and install the app again.
5. Remove and repin the taskbar shortcut if Windows retains the old pinned icon.

## Retained functionality

- Installable Android and desktop PWA
- Streamlined six-section individual client record
- Dashboard lead-adviser workload with optional backup matters
- Practice-wide contacted and searched intake visibility
- Separate Medical certificate and Chest X-ray documents
- Physical address in the intake form
- Commercial compliance suite and Employer Portal
- Existing adviser login, roles, My Day, backups and public forms

## Deployment

- Existing `yarn build` and `dist` deployment retained
- No database migration
- No new npm dependency
- Service worker served from `/sw.js`
- Manifest served from `/manifest.webmanifest`
