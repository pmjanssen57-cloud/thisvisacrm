# THiS CRM v0.15.7 - Live Chat Contact & Intake Handoff

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
