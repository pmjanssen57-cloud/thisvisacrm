# THiS CRM v0.17.4 - My Work Adviser Role Filter

This release continues directly from **v0.17.3 My Work Focus & Board Guidance**.

## My Work ownership

The My Work page now separates a selected adviser's responsibilities into three views:

- **Main adviser files** — the default. Only files where the selected adviser is the primary adviser.
- **Backup adviser files** — files where the selected adviser is supporting another primary adviser.
- **All files** — combines the selected adviser's main and backup files.

The existing date controls remain independent, so an adviser can view, for example, **Main adviser files + Today & overdue**, then switch to **Backup adviser files + Next 7 days** when they deliberately want to check their support workload.

Counts on the ownership buttons update with the chosen date range. When **All files** is selected, cards identify whether the selected adviser is Main or Backup on that file.

If the global adviser View is set to **All advisers**, My Work defaults to **All practice files** rather than pretending there is one main adviser.

## Database safety

No database migration is included. Existing migrations are unchanged from v0.17.3.

## Rollback

Redeploy **THiS CRM v0.17.3 - My Work Focus & Board Guidance**. No schema rollback is required.
