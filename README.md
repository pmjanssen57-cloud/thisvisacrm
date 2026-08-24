# THiS CRM v0.16.2 - Original Styling Restoration

This release is built from v0.16.1 Intake & Contact Archiving. It keeps the v0.16.1 archive/storage-cleanup functionality and all other CRM updates, but removes the HuB-inspired staff visual refresh introduced in v0.16.0 and restores the established v0.15.16 CRM interface.

## Styling restored

- Restores the original Turner Hopkins CRM header, navigation tabs, dashboard presentation, cards, client workspace and general spacing/visual treatment from v0.15.16.
- Removes the v0.16.0 dark-teal persistent sidebar, desktop global-search header and mint/teal HuB-style shell.
- Keeps the original mobile navigation/header behaviour.
- Public forms, portals, public live chat and Studio content continue to behave as before.

## v0.16.1 archive functionality retained

- Contact and Intake records can be archived individually or in bulk.
- Archived records are removed from the active queues and remain available in the searchable Archive tab.
- Full questionnaire data, adviser notes and conversion history are retained.
- Applicant and partner CV blobs linked to archived intakes are removed from the Netlify `intake-uploads` Blob store.
- Storage released is recorded and failed cleanup remains visible with a Retry cleanup action.
- Archived records can be restored. Purged CVs are not recreated on restore.
- Administrators can permanently delete archived records.
- Existing Delete intake/contact continues to clean up linked CV blobs before deleting the database row.

## Database and deployment safety

- No new database migration.
- No historical migration edited.
- All 41 migration files remain byte-for-byte unchanged from v0.16.1 and v0.15.16.
- No new dependency or environment variable.
- Runtime/PWA/Studio/live-chat cache references advance to v0.16.2.

## Rollback

The immediate prior package is `THiS-CRM-v0.16.1-Intake-Contact-Archiving.zip`.

If the requirement is specifically to return to the pre-archive baseline with the original styling, `THiS-CRM-v0.15.16-ROLLBACK.zip` remains available. No schema rollback is required for either application rollback because v0.16.1/v0.16.2 add no migration.

See `ENQUIRY-ARCHIVING-GUIDE.txt` for archive operating notes.
