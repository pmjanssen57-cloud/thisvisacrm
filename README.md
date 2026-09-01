# THiS CRM v0.17.8 - Inline Expandable Client Record

This release continues directly from **v0.17.7 Agreement GST Treatment**.

The basic client profile is now edited directly inside the **Client Overview** rather than requiring advisers to enter a separate edit-record experience for normal changes.

## Expandable profile sections

The Client record panel contains six collapsed sections:

- Personal details
- Contact details
- Matter & adviser
- Family & dependants
- Strategy & internal notes
- File references

Each row shows the useful summary while closed. Click the row to expand its fields, make the change, then use **Save section** or **Cancel**. Only one section is open at a time, keeping the page compact and consistent with the simplified HuB-style administration pattern.

Cancelling restores only the fields in that section. If an adviser attempts to switch sections with unsaved changes, the CRM warns before discarding them.

The full profile editor has not been removed. It remains available under **More -> Open full profile editor** and from the small **Full editor** control in the Client record panel.

Actions, Documents, Stages, Key dates, Billing, Instructions, Agreements and Portal remain separate workspaces because they are operational records rather than basic profile information.

## Database safety

No database migration is added and all existing migrations are unchanged.

## Rollback

Redeploy **THiS CRM v0.17.7 - Agreement GST Treatment**. No schema rollback is required.
