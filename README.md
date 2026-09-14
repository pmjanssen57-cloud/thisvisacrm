# THiS CRM v0.17.22 — Agreement Routing Scope Hotfix

This release continues from v0.17.21 and fixes the visible **issueRouting is not defined** error when selecting **Issue agreement** in Agreement Studio.

## Fixes

- Moves the Agreement Studio email-routing helpers into the shared Studio scope so the main **Issue agreement** action can use the same live routing logic as the CRM save/send bridge.
- Fixes the `issueRouting is not defined` runtime error introduced when the v0.17.20 routing helpers were placed inside the CRM bridge closure while the Issue button remained in the main Studio scope.
- Also makes the related principal-client/signatory synchronisation helpers available to the main Studio editor, preventing the same scoping problem when editing the principal client name/email or principal signatory.
- Preserves the v0.17.20/v0.17.21 behaviour: required signatory addresses are authoritative for **To**, the currently edited adviser email is authoritative for **CC**, and secure signing links are generated only by the backend when **Send agreement** is selected.
- Advances the Agreement Studio iframe/script and PWA cache versions to v0.17.22 so browsers receive the corrected Studio JavaScript.

## Database

No migration is added. All 44 existing migrations are unchanged from v0.17.21.

## Rollback

Redeploy v0.17.21. No database rollback is required.
