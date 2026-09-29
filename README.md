# THiS CRM v0.17.33 - Standalone Adviser & IAA Agreement Compliance Guardrails

Built from v0.17.32 Matter Update Activity Presets.

## Standalone agreement adviser selection
- Standalone agreement creation now requires an assigned adviser selected from the active CRM adviser list.
- Agreement Studio also exposes an adviser dropdown so the adviser can be changed without typing their details manually.
- Selecting an adviser populates the adviser name, CRM email address and stored IAA licence number.
- The adviser email remains the live CC/reply-to address used by the Agreement Studio issue workflow.

## IAA written-agreement guardrails
- Adds explicit adviser name and IAA licence number to the rendered agreement.
- Requires the adviser licence type to be confirmed before issue.
- Supports Full, Provisional and Limited licences. Provisional agreements record supervisor details and the required supervision/confidentiality wording; Limited agreements record authorised matters and the licence limitation.
- Adds an explicit conflict / financial or non-financial benefit disclosure record.
- Adds likely third-party disbursements / estimates and distinguishes those from the office administration charge.
- Strengthens written authority, refund, additional-fee, Professional Standards and internal complaints procedure wording.
- Adds current IAA Professional Standards and Code of Conduct links to every issued agreement email, including customised issue emails.
- Adds pre-issue confirmations for licence details, fees/disbursements, client/scope/signatories, Professional Standards, internal complaints procedure and explanation of significant terms.
- Server-side issue validation repeats the compliance checks so they cannot be bypassed by the browser UI.
- Client acceptance records acknowledgement of the Professional Standards and internal complaints procedure for agreements created under this workflow.
- Existing issued/accepted agreements remain readable and backward compatible.

## Important compliance note
These controls are designed to align Agreement Studio with the current IAA Code of Conduct clauses governing client documents and written agreements. They do not replace the adviser's obligations to provide and explain the Professional Standards, provide the internal complaints procedure, explain significant agreement terms, accurately tailor the scope/fees/disbursements, identify every adviser who may give advice, and obtain written acceptance from all relevant parties.

## Database
No schema change. Database remains at 45 migrations.
Historical/applied migrations are unchanged.
