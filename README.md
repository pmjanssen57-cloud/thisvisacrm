# THiS CRM v0.16.1 - Intake & Contact Archiving

This release is built directly from v0.16.0 HuB Visual Refresh. It retains the complete staff interface and CRM workflows while adding a proper enquiry archive and storage-cleanup path for Contact and Intake records.

## v0.16.1 enquiry archive

- Contact and Intake records can be archived individually or in bulk.
- Archived records disappear from the active queues and move to a dedicated searchable Archive tab.
- Full form/questionnaire data, adviser notes and conversion history remain available in the CRM.
- Applicant and partner CV files linked to archived intakes are deleted from the Netlify `intake-uploads` Blob store.
- The CRM records the number and approximate byte size of CV files released.
- If a blob cannot be deleted, the record stays available with a visible cleanup warning and Retry cleanup action.
- Restoring an archived enquiry returns it to its previous status, but deliberately does not restore a CV that was purged from storage.
- Administrators can permanently delete an archived enquiry when the retained database record is no longer required.

## Safer deletion

The existing Delete action now performs CV blob cleanup before deleting the intake/contact database row. If a linked CV cannot be removed, deletion stops and the database record is retained, avoiding a knowingly orphaned upload.

## Contact records and storage

Short Contact forms do not carry CV blobs. Archiving them removes them from active queues but retains their small text record in Postgres. Permanent delete is available to administrators when the database record itself should be removed.

## Exports

The full Contact Register and Mailchimp-consent exports continue to use all retained records, including archived Contact and Intake forms. Uploaded documents and sensitive questionnaire answers remain excluded from the contact-register export as before.

## Rollback

The complete `THiS-CRM-v0.16.0-HuB-Visual-Refresh.zip` package is the immediate rollback build. v0.16.1 adds no database migration and edits no historical migration. Rolling the application back therefore does not require a schema rollback.

A practical caveat: records archived while v0.16.1 is live remain in the existing `intake_enquiries` table with status `Archived`. The older v0.16.0 code does not have the Archive workspace and normalises that status to Contacted in its UI, so archived records can reappear in dealt-with queues during an application rollback. Their database status is not rewritten unless they are subsequently saved. Redeploying v0.16.1 restores the Archive view without data conversion. Purged CV metadata is stored rollback-safely with the live filename cleared, so v0.16.0 will not present a removed CV as a normal downloadable upload.

## Migration integrity

- No new migration.
- No schema transformation.
- All 41 historical migration files are byte-for-byte unchanged from v0.16.0.
- No new dependency or environment variable.

See `ENQUIRY-ARCHIVING-GUIDE.txt` for adviser/admin operating notes.

## Retained v0.16.0 interface

The HuB-inspired CRM shell remains unchanged: desktop dark-teal navigation, compact staff header, mint/teal dashboard treatment, modern cards/status controls and consistent styling across clients, enquiries, Studio, commercial, billing, bookings, calendar, tasks, resources and administration. Public forms, portals and public live chat remain outside the staff application shell.
