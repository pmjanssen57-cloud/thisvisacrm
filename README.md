# THiS CRM v0.13.33 — Manual Contact Export and Netlify Cache Repair

This release retains the lean adviser dashboard and lean Enquiries & Intake workspace from v0.13.30–v0.13.32.

## Contact exports

The Enquiries & Intake workspace includes two browser-generated CSV downloads:

- **All contacts for Excel** — one deduplicated row per email from retained contact and full assessment forms.
- **Mailchimp-ready consent CSV** — a manual import file containing only full-assessment applicants who selected the optional marketing consent box.

The exports exclude dates of birth, visa history, health and character information, employment and qualification answers, funds information, adviser notes and uploaded files.

## Mailchimp change

The earlier automatic Mailchimp API integration has been removed completely. Intake submissions are no longer sent to Mailchimp by the Netlify Function, and no Mailchimp API environment variables are required. Existing marketing-consent answers remain available for the manual consent CSV.

## Deployment repair

The failed deploy was caused by a stale or corrupted cached `node_modules` tree. npm attempted to rename the existing `bare-stream` directory and received `ENOTEMPTY` before the CRM build began.

This release switches Netlify dependency installation to Yarn Classic 1.22.22 and removes npm-specific install configuration and the npm lockfile. Use **Clear cache and deploy site** for the first deployment of this release. The Netlify log should report Yarn rather than npm during dependency installation.

## Data and compatibility

- No database migration is required.
- Existing migrations are unchanged.
- Public intake, contact and seminar forms remain in place.
- Microsoft email, intake conversion, duplicate detection, bookings, client portal and secure backups remain in place.
- Node 20.19.0 remains pinned.
