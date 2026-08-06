# THiS CRM v0.14.8 - Persistent Chat Schedule and Agreement Email Template

## v0.14.8 changes

- Live-chat opening days and hours now persist correctly after signing out, closing the CRM and reloading it.
- The chat settings response is applied immediately and then verified from the server.
- The agreement issue email is now available under Tools > Email templates.
- The template supports placeholders for the signatory, agreement, secure link, expiry date and assigned adviser.
- Deliberately customised wording saved within an individual agreement remains supported.

This release builds on v0.14.7 and retains the searchable Instructions and Agreements row libraries, CRM-accurate Studio save messaging, polished CRM live chat, adviser presence, Instructions Studio, Agreement Studio, secure signing, intake and client workflows, booking, portal, commercial compliance and all prior CRM functionality.

## Squarespace embed

```html
<script src="https://thisvisacrm.netlify.app/live-chat-widget.js?v=0.14.8" data-title="Chat with us" defer></script>
```

Deploy the complete package over the existing CRM deployment and perform a hard refresh. No database migration or environment-variable change is required.
