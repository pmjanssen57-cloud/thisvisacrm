# THiS CRM v0.17.42 - Incomplete Assessment Chase View

This release is based on v0.17.41 and adds an operational Chase view to Incomplete Assessments while preserving the existing full register.

## Incomplete Assessment Chase View
- Adds Chase view / Full list switching.
- Summarises drafts by chase priority, progress, inactivity, reminder state, expiry and duplicate history.
- Flags assessments that appear complete but have not been submitted.
- Highlights 50%+ complete drafts, reminder availability, no-return reminders, imminent expiry and duplicate/prior-assessment records.
- Shows a compact applicant summary from answers already saved (pathway, location, citizenship and current visa where available).
- Provides suggested follow-up actions without automatically emailing, deleting or merging records.
- Keeps Send reminder, Send resume link and Admin Delete actions available from Chase view.

## Database
No schema change. The database remains at 46 migrations and all historical migrations are unchanged.

## Rollback
Deploy the v0.17.41 rollback package. No database rollback is required.
