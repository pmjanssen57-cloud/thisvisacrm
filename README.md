THiS CRM v0.17.91 — Seminar close/archive fix

The archive query now explicitly casts the archivedBy JSON value to text. The separately bound parameter otherwise has no type context inside PostgreSQL jsonb_build_object. Closing the seminar, cancelling pending reminders and archiving approved registrations remain a single atomic statement. Existing archive metadata and unrelated registrations are preserved.
Archive failures now return a readable message instead of SQL and parameter contents. Retry buttons cannot shrink into vertical letters.

No new migration or schema change. All 52 prior migrations are byte-identical. All v0.17.90 chat and draft-loading fixes are retained. No production deployment or data change performed.

Validation: production build and changed Netlify module syntax passed. Existing seminar backend test doubles passed timezone, recipient, reminder retry, archive scope and preservation checks. These tests do not execute a live PostgreSQL server; production confirmation remains required after deployment. Screenshot omitted the underlying database error code, so the untyped parameter is the identified query defect rather than a confirmed production error code. Existing bundle-size advisory remains. ZIP CRC and file hashes verified; rollback is exact.

Deploy this source ZIP using the existing Netlify build. Refresh the CRM and retry Archive approved. Check the seminar status and approved/archived counts after completion. No embed changes required. Rollback is the exact v0.17.90 ZIP, with no database rollback needed.
