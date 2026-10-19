# THiS CRM v0.17.44 - Employer Accreditation Questionnaire

This release is based on v0.17.43 and adds a public employer accreditation questionnaire that can be embedded on the Turner Hopkins website. It retains the existing commercial-client model and brings submitted accreditation information directly into the commercial client record.

## Public questionnaire
- Hosted THiS route: `/employer-accreditation`.
- Six guided stages: Contact & business, Accreditation details, Viability & employment practices, Declarations, Key people, Documents & review.
- Includes GST number, IRD number, NZBN/company number, entity type, current/renewal accreditation details and expected migrant hiring.
- Uses the current Standard / High-volume / Triangular accreditation structure.
- Captures business viability, recruitment/employment practices, settlement support and compliance history.
- Captures repeatable key-person information.
- Triangular-specific questions only appear when relevant.

## Draft and resume
- Autosaves after valid contact details exist.
- Save & finish later sends a secure continuation link.
- Resume links expire after 30 days.
- Uploaded supporting documents stay attached to the draft and are restored on resume.
- Up to 12 supporting files, 8 MB each, can be uploaded in PDF, Word, Excel, JPG or PNG format.

## CRM integration
- Matches existing commercial clients by NZBN first, then contact email + legal business name.
- Creates a commercial client when there is no reliable match.
- Sets a review next action rather than silently treating the questionnaire as completed advice.
- Saves GST/IRD numbers to the commercial client.
- Adds an Accreditation questionnaire summary and history to the commercial client record.
- Copies uploaded questionnaire documents into the commercial client's existing Documents register.
- Flags prior questionnaire matches by email/NZBN for adviser review.

## Email and website integration
- Employer receives a submission confirmation.
- Turner Hopkins notification recipients and the assigned primary adviser are notified.
- Save & finish later sends the employer a resume link.
- Questionnaire emails are logged through `email_notifications`.
- Includes `turner-hopkins-employer-accreditation-embed.html` for the Squarespace page.
- Emits conversion form name `employer_accreditation` through the existing postMessage tracking bridge.

## Database
Schema change: YES. Migration 47 is `202610190001_add_employer_accreditation_questionnaire.sql`. The previous 46 migrations are unchanged.

## Rollback
Use the v0.17.43 rollback package supplied with this release. If migration 47 has already been applied, leave it in place; the v0.17.43 application safely ignores the additional tables/columns. Applied migrations must never be removed or rewritten.
