# THiS CRM v0.14.3 - Closed Chat Cleanup and Client Lifecycle Controls

This release builds on v0.14.2 and retains the complete native live-chat, CRM, intake, booking, portal, commercial compliance, Instructions Studio, Agreement Studio, email, signing, unified Studio workflow, A4 print and staff-only Kiwi Christmas functionality.

## Closed chat deletion

Closed website-chat conversations now have a **Delete** action in the CRM chat workspace. The action is deliberately separate from Close and Reopen and requires confirmation.

Deleting a closed chat permanently removes:

- the chat conversation;
- visitor and adviser messages;
- internal notes; and
- chat audit events.

Only closed chats can be deleted. If an Enquiries & Intake record was created from the conversation, that record and its copied transcript remain in the CRM.

## Closing client records

Client records now have explicit **Close client** and **Reopen client** actions under the client record **More** menu.

Closing a client:

- retains the full client record and timeline;
- retains dates, documents, billing history, portal data, instructions and agreements;
- removes the client from active-client counts; and
- suppresses its next action, deadlines, document expiries, linked personal tasks, linked calendar appointments and dashboard billing signals from operational task queues.

Reopening the client restores monitoring of the saved dates and linked work immediately. Closed clients remain searchable and are marked with a Closed badge and an explanatory banner.

## Native live chat

The website widget continues to use the existing Netlify deployment, Netlify Database, Netlify Identity and Microsoft Graph email configuration. No additional SaaS product or subscription is required.

The current Squarespace embed remains:

```html
<script src="https://thisvisacrm.netlify.app/live-chat-widget.js?v=0.14.3" data-title="Chat with us" defer></script>
```

## Deployment

Deploy the complete package over the existing CRM deployment and perform a hard refresh so the v0.14.3 service-worker cache replaces the previous build. No new database migration or environment variable is required for this release.
