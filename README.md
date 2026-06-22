# THiS CRM v0.12.36 - Portal Welcome and Collapsible Sections

This build fine-tunes the client portal login experience and makes the client portal content sections expandable/collapsible so clients can focus on the section they need without facing one long page.

## v0.12.36 changes

- Updated the client portal login page title from **Client application update** to **Welcome to your portal**.
- Reworked the login page wording to feel more client-friendly and less formal.
- Added simple portal feature pills: progress updates, documents, and messages.
- Added reusable collapsible portal cards.
- Made the main client portal sections expandable/collapsible, including application journey, adviser/team details, document checklist, forms, resources, messages, dates, appointments, billing, tools, and contact details.
- Kept the application journey, Turner Hopkins team, and document checklist open by default; the remaining sections can be opened as needed.
- No database migration required.

## Test process

1. Deploy this package to Netlify.
2. Open the public client portal login page and confirm the new heading and wording appear.
3. Log in with a test client portal access code.
4. Confirm the portal sections expand and collapse cleanly.
5. Confirm the existing portal functions still work, including refresh, document opening, messages, tools, and sign out.

---

## Previous build

Based on THiS CRM v0.12.33 - Intake Notification Summary Fix.


## v0.12.36 - Portal section card polish

- Added the missing Document checklist icon in the client portal.
- Gave expandable portal section cards a subtle mint-tinted background, left accent rule, icon chip styling, and hover/open states so they stand out without becoming visually busy.
- No database migration required.


## v0.12.36 CRM top-level polish

- Simplified the CRM header by removing duplicate sign-out and grouping creation actions under a single + New menu.
- Moved Refresh into Tools and added Help/Refresh actions inside the Tools drawer.
- Reworked the main navigation so Dashboard, Tasks, Clients, and Enquiries & Intake are primary, with Calendar, Billing, Library, and Advisers under More.
- Compressed the adviser scope/search area into a smaller toolbar.
- Moved client list filters into an expandable Filters panel.
- Moved client Delete/Open full editor actions into a More menu so Save remains the primary record action.
