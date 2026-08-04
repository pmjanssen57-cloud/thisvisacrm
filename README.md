# THiS CRM v0.13.57.11 — Agreement Issue Email Polish

This build is based on v0.13.57.9 and preserves the integrated Instructions and Agreement Studios.

## Agreement PDF and sign-off polish

- Adds a restrained THiS sign-off logo at the bottom-left of the final agreement page.
- Opens a clean agreement-only print document for Print / save PDF.
- Preserves the cover photograph in PDF output by rendering it as an image rather than a CSS background.
- Removes Studio controls and edit outlines from the printable document.

## Fixes

- Deleting an instruction or agreement draft no longer reopens the embedded Studio.
- The open-card navigation guard now remains active while the confirmation dialog is displayed and while deletion completes.
- Late iframe snapshot messages for deleted records are discarded instead of being sent back to the save API.
- Closing a Studio cannot attempt to save a record that has just been deleted.
- Delete controls isolate pointer-down, pointer-up, and click events from the underlying draft card.

No database migration or dependency change is included. Perform one hard refresh after deployment.
