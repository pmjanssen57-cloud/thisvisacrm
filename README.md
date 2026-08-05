# THiS CRM v0.13.60 - A4 Studio Print Layout Fix

This build is based on v0.13.59 and preserves the full CRM, intake, booking, portal, commercial compliance, Instructions Studio, Agreement Studio, email, signing and staff-only Kiwi Christmas functionality.

## Studio PDF and print correction

Agreement and instruction documents now use an isolated A4 print layout. Responsive preview rules are limited to screen display and cannot shrink or offset documents when the browser switches to print mode.

The correction includes:

- fixed 210 mm x 297 mm page geometry;
- full-width cover and content pages;
- removal of preview scaling, transforms, shadows and workspace padding from print output;
- consistent background colours and cover imagery;
- page-by-page A4 breaks; and
- font and image readiness checks before the print dialogue opens.

This applies to Agreement Studio, secure agreement review/accepted-agreement printing and Instructions Studio print packs.

## Deployment

No database migration, API contract or dependency change is included. Perform one hard refresh after deployment so the v0.13.60 service-worker cache replaces the previous build.
