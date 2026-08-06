# THiS CRM v0.15.2 - Reliable Live Chat Schedule Loading

This build corrects the live-chat settings window so saved opening days and hours are loaded from the database whenever an administrator opens the settings screen.

## Issue corrected

The schedule itself could be saved, but after a new CRM session the closed live-chat drawer used the lightweight attention endpoint. That endpoint deliberately did not load the full settings record. Opening **Tools > Live chat settings** before opening the chat drawer therefore supplied an empty settings snapshot to the form, and the form displayed its seven-day default schedule.

## Changes

- Added an authenticated administrator-only settings read endpoint.
- The CRM now retrieves the current live-chat settings directly before opening the settings window.
- Stored disabled days are preserved as explicit `false` values.
- Legacy string boolean values such as `"false"`, `"off"` and `"0"` are normalised correctly.
- The server reads the record back after saving and verifies that the weekly schedule persisted before returning success.
- Existing away dates, welcome wording, notification settings and adviser quick replies remain unchanged.

## Deployment

Deploy the complete package and perform one hard refresh.

No database migration, dependency or environment-variable change is required. All v0.15.1 quick replies, v0.15.0 adviser personalisation and earlier CRM functionality are retained.
