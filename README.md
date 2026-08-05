# THiS CRM v0.13.59 — Staff-only Kiwi Christmas Mode

This build is based on v0.13.58 and preserves the full CRM, intake, booking, portal, commercial compliance, Instructions Studio, Agreement Studio, email and signing functionality.

## Kiwi Christmas mode

A restrained seasonal theme is available only inside the authenticated staff CRM. It includes:

- subtle pohutukawa-red and muted-gold accents;
- a staff-only seasonal banner and Christmas countdown during December;
- a small festive logo detail;
- light desktop pohutukawa-petal animation;
- seasonal My Day wording; and
- a brief sparkle when a personal task or calendar appointment is completed.

Open **Tools > Kiwi Christmas mode** and select:

- **Automatic** — active from 1 to 25 December and off at all other times;
- **On** — manual preview or override for the current browser; or
- **Off** — disabled for the current browser.

The setting is saved in browser local storage. It does not change another staff member's preference.

## Safeguards

- Public forms, client and employer portals, secure agreement signing pages, emails and printable/PDF documents are not restyled.
- Decorative motion is disabled on smaller screens and when the operating system requests reduced motion.
- Festive elements are excluded from print output.
- No database migration, API change or dependency change is included.

Perform one hard refresh after deployment so the v0.13.59 service-worker cache is activated.
