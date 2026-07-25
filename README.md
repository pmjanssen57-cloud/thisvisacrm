# THiS CRM v0.13.49 — Installable Android PWA

This release is based on v0.13.48 and adds the first stage of Android app support without creating a separate native codebase. The Netlify-hosted CRM can now be installed from a supported Android browser and launched from the home screen or app drawer.

## PWA features

- App name: **THiS CRM**
- Standalone Android app window
- Branded THiS launcher and splash-screen icons
- Install control on the CRM login page and adviser header
- Android safe-area handling for modern phones and tablets
- Automatic updates from the existing Netlify deployment
- Controlled offline reconnect screen

## Security model

The service worker is deliberately limited to the static application shell:

- Client records are not cached for offline access.
- Intake forms, portal information, documents and email data are not cached.
- `/api/*`, `/.netlify/functions/*` and Netlify Identity requests bypass service-worker caching.
- The app remains online-first and continues to use the existing Netlify Identity, database and Functions architecture.

## Install on Android

1. Deploy this release to the normal HTTPS Netlify site.
2. Open the CRM URL in Chrome on the Android device.
3. Select **Install THiS CRM on this device** on the login page, or **Install app** in the CRM header.
4. Confirm the Android installation prompt.

Chrome's three-dot menu can also be used: **Install app** or **Add to Home screen**.

See `PWA-INSTALL-GUIDE.txt` for troubleshooting and security notes.

## Retained v0.13.48 functionality

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
- Netlify prevents stale service-worker caching through response headers
