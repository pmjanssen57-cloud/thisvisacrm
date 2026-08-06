# THiS CRM v0.14.5 - Live Chat Delete Confirmation Layer Fix

This release builds on v0.14.4 and retains the complete CRM, intake, booking, portal, commercial compliance, Instructions Studio, Agreement Studio, email, signing, unified Studio workflow, A4 print fixes, staff-only Kiwi Christmas functionality, native live chat, reliable chat attention badges, schedule-aware polling, closed-chat deletion and client close/reopen lifecycle controls.

## Confirmation layering fix

When a closed website chat is deleted, the shared CRM confirmation dialogue now renders above the live-chat slideout rather than behind it. The confirmation backdrop also covers the complete CRM interface, so the user must confirm or cancel before continuing.

The correction is applied to the shared confirmation component, which also prevents destructive confirmations from being obscured by other CRM slideouts and popouts.

## Native live chat

The website widget continues to use the existing Netlify deployment, Netlify Database, Netlify Identity and Microsoft Graph email configuration. No additional SaaS product or subscription is required.

The current Squarespace embed is:

```html
<script src="https://thisvisacrm.netlify.app/live-chat-widget.js?v=0.14.5" data-title="Chat with us" defer></script>
```

## Deployment

Deploy the complete package over the existing CRM deployment and perform a hard refresh so the v0.14.5 service-worker cache replaces the previous build. No database migration or environment-variable change is required.
