# THiS CRM v0.17.39 - Inquiries Duplicate Flagging Hotfix

## v0.17.39

- Fixes the blank Inquiries/Incomplete Assessments screen introduced by v0.17.38.
- Root cause: `IncompleteAssessmentPanel` called `intakeSortTime()`, but that helper was scoped inside the parent enquiries workspace and was therefore undefined inside the standalone panel.
- Adds a local, defensive assessment timestamp sorter for duplicate-history ordering.
- Retains all v0.17.38 duplicate indicators and v0.17.37 resume/reminder functionality.
- No database migration. Database remains at 46 migrations.

## Previous changes retained

# THiS CRM v0.17.38 - Incomplete Assessment Duplicate Visibility

## v0.17.38 - incomplete assessment duplicate visibility

- Flags active incomplete assessment drafts that share the same normalised email address.
- Shows the number of active drafts for that applicant and whether another draft is newer.
- Flags applicants who already have one or more submitted assessments in THiS and shows the most recent submission date/status.
- Adds a flagged count to the Incomplete Assessments heading so duplicate review is visible at a glance.
- Matching is deliberately email-based and advisory only; THiS never automatically deletes or merges records.
- No database migration. Database remains at 46 migrations.


This release fixes incomplete-assessment continuation email sending and adds a controlled one-time reminder workflow.

## Incomplete assessments

- **Send resume link** works again; the missing CRM email-schema helper has been restored.
- **Send reminder** sends a separate, encouraging email with a fresh secure continuation link.
- A successful reminder is marked against the draft with the sent date/time and sender.
- The reminder action is disabled after the first successful send and is also protected server-side against duplicate sends.
- Failed reminder attempts remain retryable.
- Staff email actions no longer change the applicant's displayed **Last active** timestamp.

## Database

- 46 migrations total.
- New migration: `202610050001_add_intake_draft_reminder_state.sql`.
- All previous 45 migration files are unchanged.

## Rollback

The rollback package restores v0.17.36 application code but retains migration 46. Applied migrations must not be deleted or modified; v0.17.36 safely ignores the added reminder columns/index.
