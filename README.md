# THiS CRM v0.17.23 — Studio Workspace Polish

This release continues from v0.17.22 and gives the Agreement Studio and Instructions Studio workspaces a cleaner, calmer list experience while preserving all existing document-authoring and issue workflows.

## Studio workspace polish

- Fixes a legacy CSS/class collision that was causing Studio list rows to inherit old instruction-card styling. This was responsible for the overly small, uppercase, cramped appearance visible in Agreement and Instructions lists.
- Gives both Studio workspaces a clearer page identity with restrained Agreement/Instructions icons and cleaner heading treatment.
- Reworks the four summary counters into a single quiet overview strip rather than four competing cards.
- Tidies the search/filter/saved-view controls into one consistent control rail.
- Improves list typography, spacing and hierarchy so recipient names, agreement/instruction types, adviser names and metadata are easier to scan.
- Adds subtle source pills for Client-linked, Intake-linked and Standalone records.
- Keeps status badges clear without shouting in uppercase.
- Splits Updated into a compact date/time treatment so timestamps no longer truncate unnecessarily.
- Agreement rows now use the recipient email as useful secondary information where available, rather than repeating the agreement title beneath the recipient name.
- Refines row hover, open/delete controls and mobile behaviour without changing the underlying actions.

## Behaviour preserved

- Agreement Studio issue/signing workflow and v0.17.22 To/CC routing fix are unchanged.
- Instructions Studio creation/editing/template behaviour is unchanged.
- Adviser list-column preferences and saved views continue to work.

## Database

No migration is added. All 44 existing migrations are unchanged from v0.17.22.

## Rollback

Redeploy v0.17.22. No database rollback is required.
