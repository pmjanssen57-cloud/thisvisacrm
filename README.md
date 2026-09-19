# THiS CRM v0.17.27 - Agreement PDF Pagination Hotfix

This release continues from v0.17.26 and fixes the Agreement Studio print/PDF page model that could produce large blank pages between the actual agreement pages.

## Problem addressed

The supplied accepted agreement PDF contained 12 physical PDF pages even though the agreement represented approximately six logical A4 pages. The bottom of each logical page was being fragmented onto a second physical page, producing blank or near-blank pages containing only a page number, a short continuation line, or part of the cover footer.

The print output showed an effective vertical print margin while Agreement Studio was still forcing each `.a4` document container to the full 297mm A4 height. That mismatch caused every full-height agreement page to overflow the browser's printable page area.

## v0.17.27 fix

- The print stylesheet now declares A4 with 5mm top and bottom print margins.
- Agreement page containers print at 286.5mm high, giving a small safety tolerance within the 287mm page content area.
- The client-side pagination measurement budget is reduced from 1110px to 1070px so sections are moved to the next logical agreement page before they can overflow during printing.
- Agreement Studio JavaScript cache-busting is advanced to v0.17.27.
- The PWA shell cache is advanced to v0.17.27.

The browser preview remains the familiar A4 workspace; this change is specifically about producing stable physical PDF pages when the agreement is printed/saved.

## Database

No schema change. No migration added. All 44 migrations are unchanged from v0.17.26.

## Preserved functionality

The v0.17.26 conversion tracking bridge is preserved. Agreement content, client/signatory data, acceptance records, signing, email issue routing, fee tables and Studio editing are otherwise unchanged.

## Rollback

Redeploy v0.17.26. No database rollback is required.
