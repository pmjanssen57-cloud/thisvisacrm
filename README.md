# THiS CRM v0.14.6 - Human Adviser Presence in Website Chat

This release builds on v0.14.5 and retains the complete CRM, intake, booking, portal, commercial compliance, Instructions Studio, Agreement Studio, email, signing, unified Studio workflow, A4 print fixes, staff-only Kiwi Christmas functionality, native live chat, reliable chat attention badges, schedule-aware polling, closed-chat deletion, client lifecycle controls and corrected confirmation layering.

## Visitor chat improvement

- The website chat introduction now states that enquiries are answered by real Turner Hopkins team members, not a bot.
- After a staff member claims a conversation, the visitor sees that adviser’s name, role and CRM profile photo.
- The adviser photo also replaces the company logo in the chat header while that adviser is assigned.
- Adviser initials are shown if no profile photo is available.
- The existing welcome message remains editable under Tools > Live chat settings.

## Squarespace embed

```html
<script src="https://thisvisacrm.netlify.app/live-chat-widget.js?v=0.14.6" data-title="Chat with us" defer></script>
```

Deploy the complete package over the existing CRM deployment and perform a hard refresh. Refresh the Squarespace page after deployment so the versioned widget and chat assets are reloaded. No database migration or environment-variable change is required.
