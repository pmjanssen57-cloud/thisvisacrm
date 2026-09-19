# THiS CRM v0.17.28 - Safe Adviser Profile Deletion

This release continues from v0.17.27 and adds a controlled way for CRM administrators to permanently remove adviser profiles that were created in error.

## v0.17.28 change

Open **Advisers**, select **Edit adviser**, and a **Delete adviser** action is now available at the bottom of the profile editor.

THiS does not blindly delete adviser records. The server checks the adviser before deletion and blocks removal if the profile is still referenced by CRM data. The check covers:

- client records, including primary and backup adviser assignments;
- commercial clients;
- intake enquiries;
- agreement sets;
- personal tasks;
- calendar entries;
- consultation availability, blocks, booking links and bookings;
- live-chat conversations; and
- notification recipient settings.

If a link exists, THiS reports the relevant categories and counts and leaves the adviser untouched. The appropriate action is then to reassign/remove the link or retain the adviser as **Inactive** for historical continuity.

Additional safeguards prevent an administrator deleting the adviser profile mapped to their own login, and preserve the existing rule that at least one active adviser must retain **Admin** access.

Unsaved temporary adviser cards can also be discarded without creating or deleting a database record.

## Database

No schema change. No migration added. The database remains at **44 migrations**, all byte-for-byte unchanged from v0.17.27.

## Preserved functionality

The v0.17.27 Agreement PDF pagination hotfix and v0.17.26 public form conversion tracking bridge are preserved. No client, matter, Agreement Studio, intake, booking or portal workflow has otherwise been changed.

## Rollback

Redeploy v0.17.27. No database rollback is required.
