# THiS CRM v0.16.5 - Additional Citizenship Capture

This release continues directly from **v0.16.3 Intake Conversion Safety + Agreement Print Fix** and retains the existing CRM styling and functionality.

## Assessment form fixes

The public assessment form now validates email addresses before the user leaves the **Your details** step and validates them again on the server. Trailing spaces are removed automatically and invalid formats receive a clear inline message.

CV selection is validated immediately. PDF, DOC and DOCX files up to 5 MB are accepted even where a mobile browser supplies a generic MIME type. The applicant sees a clear **ready**, **uploading**, **uploaded** or **error** state.

If the questionnaire record has been saved but an applicant or partner CV fails to upload, the record is retained and the submit action changes to **Retry CV upload**. The questionnaire is not inserted again. A per-form submission key also makes the initial save idempotent, protecting against duplicate intake records if a network interruption occurs after the server has saved the questionnaire but before the browser receives the response.

## Database safety

No database migration is added. Existing applied migration files are untouched.

## Rollback

Redeploy **THiS CRM v0.16.3 - Intake Conversion Safety + Agreement Print Fix**. No schema rollback is required.


## v0.16.5
- Adds conditional additional-citizenship capture for applicants and partners in the public assessment form.
- Supports up to four additional citizenships for each person.
- Includes additional citizenships in adviser review, print/PDF summaries, notification summaries, intake search and client conversion.
- Keeps the Squarespace iframe embed unchanged.
- No database migration is required; additional citizenship data is stored in the existing intake raw payload.
