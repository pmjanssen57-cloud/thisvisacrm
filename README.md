# THiS CRM v0.17.26 — Public Form Conversion Tracking Bridge

This release continues from v0.17.25 and adds the THiS-side bridge required for Squarespace to record GA4 and Google Ads conversions after successful public form submissions.

## Conversion bridge

A shared helper at `src/lib/reportConversion.js` sends a `THIS_FORM_SUBMITTED` message to the Turner Hopkins parent page only when a THiS form is embedded in an iframe.

The helper:

- targets only `https://www.turnerhopkinsimmigration.co.nz` and `https://turnerhopkinsimmigration.co.nz`;
- does not send when a form is opened directly on the Netlify domain;
- de-duplicates repeated calls within the current app session;
- uses the saved THiS record ID as the submission ID wherever available;
- deliberately swallows its own errors so conversion tracking cannot interrupt a successful submission;
- sends only short controlled values in `details`, never names, email addresses, phone numbers or free-text answers.

## Form integration

### Contact form

After `/.netlify/functions/intake` confirms the enquiry was saved, THiS reports:

- form: `contact`
- submission ID: the returned `intakeId`
- detail: `visa_pathway` from the contact situation selector

### Eligibility assessment

After the final questionnaire save succeeds, and before any CV upload begins, THiS reports:

- form: `intake`
- submission ID: the returned `intakeId`
- details: `visa_pathway` and `applicant_country`

Save-and-finish-later is not reported as a conversion. CV upload retries do not re-save the questionnaire and therefore do not report a second conversion.

### Seminar registration

After `/.netlify/functions/seminar` confirms the registration was saved, THiS reports:

- form: `seminar`
- submission ID: the returned `registrationId`
- detail: `seminar_name`

The existing client feedback form remains excluded.

## Squarespace responsibility

THiS does not contain the Google tag or Google Ads conversion configuration. The Turner Hopkins Squarespace site must listen for `THIS_FORM_SUBMITTED` messages from `https://thisvisacrm.netlify.app` and send the corresponding GA4 / Google Ads events. The existing form embed and height messaging remain unchanged.

## PWA/cache

The service-worker shell cache advances to v0.17.26 so deployed clients refresh cleanly.

## Database

No migration is added. All 44 existing migrations are unchanged from v0.17.25.

## Rollback

Redeploy v0.17.25. No database rollback is required.
