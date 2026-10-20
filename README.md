# THiS CRM v0.17.50 — My Work & Matter Journey polish

Built from the confirmed v0.17.49 release. My Work now opens a shared working drawer
before the full client record. Includes clearer waiting guidance, a deliberate caught-up
state, readable dates, polished disclosures, an improved Matter Journey and consistent
enquiry tabs ordered Contacts, Intake, Employer Forms, Seminars, Feedback, Incomplete, Archive.

No new migration or schema change relative to v0.17.49. All 48 existing migrations and
all 24 Netlify function modules are unchanged. The v0.17.49 review migration is retained.

Use the normal Netlify SOURCE build workflow: yarn build; publish dist; functions
netlify/functions. This source ZIP must be built by Netlify, not uploaded as a prebuilt
static deploy. Preserve environment settings and stores. Nothing deployed to production.
See RELEASE.txt, VALIDATION.txt and UI-GUIDE-v0.17.50.txt. Earlier guides are historical.
