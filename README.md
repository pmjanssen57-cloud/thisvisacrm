# THiS CRM v0.15.9 - Agreement Acceptance Visibility Hotfix

This release is deliberately based on v0.15.7 and fixes agreement acceptance visibility before the Unified Client Record Editor is rolled out.

Key changes:
- Agreement records refresh from the server when opened.
- Newly signed agreements show **Accepted** in the Agreements workspace after the workspace refreshes.
- Agreement Studio displays a prominent signatory-status summary for Sent, Viewed, Partially signed and Accepted agreements.
- The Authorisation and acceptance section displays the actual captured electronic signature, typed legal name, email address and acceptance date/time.
- Acceptance information is sourced from the secure `agreement_signatories` record, not the older pre-issue Studio snapshot.
- Accepted agreements are server-locked against later edits while remaining printable.
- The client-facing secure agreement view also restores the accepted signatory's signature after signing.
- PWA and Agreement Studio cache-busting was advanced to ensure the corrected script is loaded after deployment.

All v0.15.7 live-chat contact/intake handoff functionality and v0.15.6 Instructions Studio functionality are retained.

No database migration, dependency or environment-variable changes.

## Previous v0.15.7 notes

This release changes the live-chat pre-client workflow so advisers do not create a completed intake record before the visitor has actually supplied the full assessment information.

Key changes:
- Live chat now has a single **Send intake form** action.
- The action first creates an assigned **Contact form** record from the chat details and transcript.
- The Contact form uses the same light-touch contact/enquiry model as the public short contact form.
- The existing `contact_intake_invite` email template sends the full assessment questionnaire link to the visitor and copies the assigned adviser where configured.
- After a successful send, the Contact form is automatically marked **Dealt with** (`Contacted`).
- If the email cannot be sent, the Contact form remains in the CRM as **New**, where the adviser can retry from **Enquiries > Contact forms**.
- The chat transcript is retained in the Contact form's source data and adviser notes.
- A private note is added to the live chat after a successful questionnaire send.
- The former chat **Create enquiry** button/workflow is no longer used for new handoffs.

All v0.15.6 Instructions Studio master Road Map functionality remains unchanged.

No database migration, dependency or environment-variable changes.
