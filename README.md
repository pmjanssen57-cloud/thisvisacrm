# THiS CRM v0.17.16 - CRM Startup Load Stabilisation

Focused hotfix over v0.17.15. It stabilises the initial CRM data load and prevents stale asynchronous failures from leaving a red error banner after the data has successfully loaded.

The empty-database panel now requires a confirmed successful response and will never be shown merely because a load request failed. One automatic retry is performed for transient startup/network or 5xx failures.

No database changes.
