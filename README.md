# THiS CRM v0.17.15 - Update Matter Modal Hotfix

This release is a focused hotfix to **v0.17.14**.

The new **Update matter** screen in v0.17.14 referenced its preset event list without the constant having been declared. Because the error occurs while React is rendering the modal, opening Update matter could blank the client workspace.

v0.17.15 restores that preset list and leaves the remainder of the v0.17.14 workflow unchanged.

## Update Matter presets

- Reviewed documents
- Documents received
- Application prepared
- Application submitted
- INZ update received
- Further information requested
- Response submitted
- Application approved
- Spoke with client
- Other

## Database

No database migration or schema change is required.

## Rollback

Redeploy v0.17.13 if a full rollback to the pre-simple-update workflow is required. v0.17.14 should not be used because it contains the modal-rendering defect corrected here.
