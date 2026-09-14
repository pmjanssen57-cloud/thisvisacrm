# THiS CRM v0.17.21 — Agreement Issue Preview Hotfix

This release continues from v0.17.20 and fixes an Agreement Studio issue where selecting **Issue agreement** could appear to do nothing.

## Fixes

- Removes obsolete browser-side secure-token generation from the Issue agreement preview. Secure signing links continue to be generated only by the CRM backend when **Send agreement** is selected.
- Adds defensive error handling and visible status/toast feedback if the issue preview cannot open.
- Keeps the v0.17.20 live routing behaviour: required signatory addresses are used for **To** and the currently edited adviser email is used for **CC**.
- Adds an **Issuing...** state to the final Send agreement action.
- Sends backend issue failures back into Agreement Studio so the Send button is restored and the failure is shown rather than leaving the interface apparently stuck.
- Advances the Agreement Studio iframe and script cache-busting versions to v0.17.21.

## Database

No migration is added. All 44 existing migrations are unchanged from v0.17.20.

## Rollback

Redeploy v0.17.20. No database rollback is required.
