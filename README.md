# THiS CRM v0.14.0 - Native Website Live Chat

This build extends the v0.13.60 A4 Studio Print Layout Fix baseline with a native website live-chat and after-hours message channel. It uses the existing Netlify deployment, Netlify Database, Netlify Identity and Microsoft Graph email configuration. No additional SaaS product or subscription is required.

## Main workflow

1. A visitor opens the floating chat button on the Turner Hopkins website.
2. During configured hours the widget presents live chat. Outside those hours or on an away day it accepts an after-hours message.
3. The first message creates a shared CRM queue item and sends one internal email notification.
4. Any adviser can open Chat in the CRM header and claim the conversation.
5. The adviser can reply, add internal notes, release, close or reopen the conversation.
6. Create enquiry copies the visitor details and transcript into Enquiries & Intake.

## Required Netlify setting

Add this environment variable before publishing the website widget:

```
LIVE_CHAT_SESSION_SECRET=<at least 32 random characters>
```

Optional:

```
LIVE_CHAT_NOTIFICATION_RECIPIENTS=paul@example.co.nz,team@example.co.nz
```

If notification recipients are left blank, the CRM uses the email addresses of all active advisers. Microsoft Graph email variables already used by the CRM must be configured for notification delivery.

## Squarespace embed

After deploying the CRM, open Tools > Live chat settings and copy the generated script. The standard form is:

```html
<script src="https://thisvisacrm.netlify.app/live-chat-widget.js" data-title="Chat with us" defer></script>
```

Place it in homepage code injection or a homepage code block. The launcher floats at the bottom-right and opens the chat as an overlay. Add `data-position="left"` to place it on the bottom-left.

## Administration

Tools > Live chat settings provides:

- chat enabled/paused;
- opening hours by day;
- Pacific/Auckland timezone;
- away dates and closure reasons;
- open-hours and after-hours wording;
- privacy notice URL;
- one-time email notification switch and recipients; and
- Squarespace embed code.

## Security and limits

The public widget uses signed sessions, domain-isolated iframe rendering, server-side validation, rate limits and plain-text messages. Attachments are not supported. Visitors are warned not to send passport, medical, police or other sensitive documents through live chat.

No existing CRM API contract or package dependency was changed. A database migration is included. Perform one hard refresh after deployment so the v0.14.0 service-worker cache replaces the previous build.
