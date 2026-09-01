# THiS CRM v0.17.10 - Streamlined Client Update

This release continues from **v0.17.9 Navigation Badge Synchronisation** and simplifies the client-record workflow without removing any underlying CRM capability.

## Back to clients

Both the Matter Command Centre and the Full Record workspace now have an explicit **Back to clients** control. It returns to the existing Clients register, preserving the current adviser/search/filter state.

## Update client

The Matter Command Centre now separates two everyday actions clearly:

- **Update File** — use when something substantive has happened on the immigration matter and the CRM should guide stage/status/portal/timeline housekeeping.
- **Update Client** — use when the underlying client/profile information needs changing.

**Update Client** opens a compact side drawer rather than the large legacy editor. It is organised into five simple categories:

1. Matter & adviser
2. Contact
3. Personal
4. Family
5. Other

The Matter & adviser category provides the commonly changed operational fields: case type, primary/backup adviser, priority, current stage, matter status, next action and due/review date. Contact and Personal expose only their relevant fields. Family contains the family/dependant editor. Other contains strategy, internal notes, OneLaw and SharePoint references.

## Full Record simplification

The Overview no longer asks advisers to expand and save a series of embedded editing accordions. The Client Record panel is now primarily a **read-and-understand** view: each profile area shows its summary with a small **Edit** button that opens the same compact Update Client drawer in the correct category.

The existing comprehensive editor remains available under **More → Open full profile editor** and as **Full editor** in the Client Record panel. No fields or power-user capability have been removed.

## Database safety

No database migration is added. All 43 existing migration files remain unchanged.
