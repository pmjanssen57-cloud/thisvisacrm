# THiS CRM v0.17.37 - Incomplete Assessment Resume & Reminder Reliability

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
