# THiS CRM v0.17.3 - My Work Focus and Board Guidance

This release continues directly from **v0.17.2 Visual Polish & Standard Menus**. It keeps the dark-green navigation, improved typography, standard menus, Matter Command Centre and all existing CRM functionality.

## My Work is now genuinely a daily workspace

The page defaults to **Today + overdue**, so an adviser is not confronted with every action and review date scheduled weeks or months into the future. The range can be widened to **Next 7 days**, **Next 30 days**, or **All scheduled** when planning ahead.

Safety exceptions are always surfaced: active matters with no clear next action, or waiting matters with no review date, are not allowed to disappear simply because of a date filter.

## Clearer movement between the four work states

The board now explains that its four columns are **operating states**, not a linear visa pathway. A matter can move in either direction depending on what happens on the file.

- **Needs my attention** — the adviser owns the next move.
- **Waiting on client** — the client or a third party owes something.
- **Waiting on INZ** — adviser work is quiet until a review date or new INZ event.
- **Ready to progress** — nothing is blocking the next substantive step.

Cards still move through the existing **Update File** workflow rather than unrestricted drag-and-drop. That keeps Matter status, next action, review dates, portal wording and timeline history coherent.

## Database safety

No database migration is added. All 43 migrations from v0.17.2 remain unchanged.

## Rollback

Redeploy **THiS CRM v0.17.2 - Visual Polish & Standard Menus**. No schema rollback is required.
