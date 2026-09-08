# THiS CRM v0.17.18 - Incomplete Assessment Actions Hotfix

This is a focused hotfix over v0.17.17.

The incomplete-assessment CRM actions were calling `nullableUuidValue()`, but the CRM function defines the UUID helper as `nullableUuid()`. This caused the CRM function error shown when deleting a saved assessment draft and could also affect staff resending a continuation link.

v0.17.18 corrects both references. No database migration, environment-variable change, Squarespace embed change or assessment-form change is required.

Rollback: redeploy v0.17.17.
