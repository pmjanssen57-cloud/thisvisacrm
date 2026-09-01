# THiS CRM v0.17.13 — Notification Recipient & Adviser Profile Fix

Built from v0.17.12.

## Notification recipient fix

The CRM data loader now actually includes `readNotificationRecipientSettings(database)` in its Promise.all call. v0.17.12 declared the result variable but omitted the corresponding read operation, so the Adviser page received an empty notification settings array. That is why the recipient cards were absent and both top buttons were disabled.

The five notification categories now render with adviser checkboxes and optional additional email fields:
- Assessment form submissions
- Contact form submissions
- Seminar registrations
- Client feedback submissions
- SMC calculator internal alerts

## Adviser profile editing

Individual adviser cards now have a clear **Edit adviser** action. Profiles are read-only by default. Editing one adviser reveals their fields and photo controls, with explicit **Save adviser** and **Cancel** actions. This removes the ambiguity of the previous always-editable cards.

No database migration is added. Existing notification recipient migration and all prior migrations remain unchanged.
