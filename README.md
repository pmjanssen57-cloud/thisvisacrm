# THiS CRM v0.17.74

THiS CRM v0.17.74 — 5 November 2026

Based on v0.17.73. Adds a focused Investor version of the existing public contact form at /contact?variant=investor. The ordinary /contact form retains its existing questions and behaviour.

INVESTOR FORM
Contact name, email, phone, location and best calling time are followed by four short selections: investment range in NZD, planned timeframe, people included and the help requested. Each offers a not-sure option where relevant. Additional free text is optional. This is an initial enquiry, with no financial evidence uploads and no eligibility determination. Investor enquiries are submitted through the existing intake function with formType=contact. A contactVariant=investor flag and four bounded text answers are retained in the existing raw_payload JSON. Standard enquiries and assessments do not acquire investor answers from unknown/incorrect variant input.

CRM
All submissions appear in Enquiries > Contacts, with the same assignment, intake invite, dealt-with/spam status, archive and delete controls. Investor entries have an Investor enquiry badge, a focused answer summary in the existing review panel, and can be filtered with Enquiry type > Investor enquiries. Status counts follow the enquiry-type filter; the main Contacts and navigation badges continue to count all new contacts. Search includes the investor tag and answers. Reset filters returns to all new contacts. The four investor answers are included in the existing contact notification summary, including text/HTML template summary data.

SQUARESPACE
Deploy this CRM release before using INVESTOR-EMBED.html. Paste the contents into an HTML Code block on the new investor page; do not paste the file's contents into site-wide Footer Injection. The iframe remains on /contact with variant=investor, so existing contact conversion tracking and the existing thank-you footer redirect continue to work. Retain the existing GA4/Google Ads listener and thank-you redirect script in Footer Injection, installed once. Success uses https://www.turnerhopkinsimmigration.co.nz/contact-thank-you. No new thank-you page or conversion action is required. It is counted as a contact conversion; investor-specific conversion reporting is not added in this release.

The supplied embed listens only to the correct CRM origin and its own iframe window, validates height messages, and adjusts to content size. The investor iframe removes inherited mobile CRM-navigation bottom padding so its measured height does not leave an internal scrollbar. No Squarespace section/grid changes or icon styles are included. Squarespace still controls surrounding section height: if extra space remains outside the iframe, fit the Code block and section height in its editor. The content grows vertically at narrow widths; it cannot remain readable in a fixed-height box without scrolling or clipping.

VERIFICATION
Production build passed. Application JSX/JS, 24 Netlify modules, ten public scripts, 13 CSS files, inline HTML scripts/styles, PWA/cache/precache references and version checked. All 48 migration files are byte-identical to v0.17.73. Agreement and Instructions engines and people/builder files are byte-identical. Only intake.mjs changes among the Netlify modules. Existing bundle size advisory remains.

Actual local Edge tests passed for investor form layout and control bounds/touch heights at 1440, 768, 560, 390 and 320px; required fields, save failure/retry, success redirect, standard contact form, investor badge/filter/reset and review answers. The actual intake POST handler with synthetic SQL persists investor answers into intake_enquiries; consent rejection, field bounds and summary inclusion pass. The supplied embed was exercised with intercepted production-origin pages using the real built app, same iframe URL and existing global redirect script. Auto height passes at desktop/tablet/mobile widths; unrelated message senders are ignored, failed submissions do not redirect and successful submissions reach contact-thank-you. No new analytics payload contains the financial/family answers. Broad CRM navigation/edit/Studio create/save checks pass with synthetic APIs. Desktop/mobile form and CRM review screenshots were inspected. ZIP CRC, safe unique entries, each included file's SHA256 and byte-exact rollback verified.

SCHEMA / MIGRATIONS
No schema change and no migration required. All 48 existing migration files are unchanged. Investor data uses the existing JSON payload. sources/ was not modified.

DEPLOY / ROLLBACK
Source release ZIP: THiS-CRM-v0.17.74.zip. Normal Netlify build: yarn build; publish dist. Excludes node_modules and generated dist. Cache bumped to v0.17.74. Nothing deployed to production. THiS-CRM-v0.17.73-ROLLBACK.zip is an exact copy of the delivered v0.17.73 archive. No database rollback is needed. Rolling back hides the new investor fields in the UI but retains their JSON data; remove the new embed while using the older build.

LIMITS
Local Edge with emulated viewports, intercepted website/CRM APIs and synthetic database responses. No production database write, actual email delivery, live Squarespace edit, real conversion delivery, physical device, Safari or Firefox test. The existing contact notification template must retain its questionnaire summary placeholder to include the extra answers; custom templates deliberately omitting that summary will continue to omit it. Existing tracking and redirect footer installation on the live website was not changed or verified in this task. No fresh immigration policy review was needed or performed; investment ranges are enquiry bands, not eligibility advice. Local Node 24; Netlify pins Node 20.19.
