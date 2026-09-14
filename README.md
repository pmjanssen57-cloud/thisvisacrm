# THiS CRM v0.17.24 — Client Details Drawer Hotfix

This release continues from v0.17.23 and fixes the blank screen triggered by the **Client details** button on the simplified matter screen.

## Client details hotfix

- Fixes the simplified matter screen calling a component name that no longer exists.
- The **Client details** button now opens the existing quick client update drawer correctly.
- Preserves the Matter & adviser, Contact, Personal, Family and Other quick-edit sections.
- Preserves the full advanced client record under **More**.
- No client data model or save behaviour is changed.

## Behaviour preserved

- v0.17.23 Agreement Studio and Instructions Studio workspace polish is unchanged.
- v0.17.22 Agreement issue/signing To/CC routing fix is unchanged.
- Assessment draft/resume and all existing matter workflow behaviour is unchanged.

## Database

No migration is added. All 44 existing migrations are unchanged from v0.17.23.

## Rollback

Redeploy v0.17.23. No database rollback is required.
