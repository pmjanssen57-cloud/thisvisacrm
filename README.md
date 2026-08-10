# THiS CRM v0.15.11 - Unified Client Editor + Agreement Hotfixes

This release makes the Unified Client Record Editor the current CRM baseline while retaining the signed-agreement visibility, faster agreement loading and print-flow corrections from v0.15.9-v0.15.10.

## Unified client record editor

- One **Edit client record** drawer maintains client profile information.
- Editable sections are Personal, Contact, Matter & adviser, Family, Strategy & notes, and File references.
- Sections collapse to concise summaries and show a **Changed** indicator when edited.
- Advisers can make several changes and commit them together with one **Save client** action.
- Closing the editor with unsaved changes gives discard protection.
- Client Overview summary panels have direct Edit actions that open the same drawer at the relevant section.
- Family and Notes & strategy are no longer separate left-hand workspaces.
- Actions, Documents, Stages, Key dates, Billing, Instructions, Agreements and Portal remain dedicated operational workspaces.
- Client close/reopen remains a separate lifecycle control.

## Agreement functionality retained

- Current signing state is refreshed from the secure agreement signatory records.
- Agreement Studio displays Sent, Viewed, Partially signed and Accepted status.
- Accepted agreements display the captured electronic signature, typed legal name, email address and acceptance date/time.
- Accepted agreements remain printable but locked against subsequent editing.
- Agreement loading uses targeted requests so opening a signed agreement does not reload the complete CRM dataset.
- Agreement-list refreshes exclude large Studio snapshots until an agreement is actually opened.
- Print / save PDF retains the corrected flowing pagination and physical-page reserve introduced in v0.15.10.

All v0.15.7 live-chat Contact & Intake Handoff functionality and the current Instructions Studio master Road Map/documentation functionality are retained.

No database migration, dependency or environment-variable changes.
