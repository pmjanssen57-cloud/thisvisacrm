# THiS CRM v0.17.43 - Modular Instructions Studio Pilot

This release is based on v0.17.42 and reworks the Instructions Studio authoring experience without changing the existing PDF/output design or database schema.

## Modular Instructions Studio
- Reframes visa/pathway packs as **starting points**, rather than rigid templates.
- Adds a reusable guidance library grouped into Suggested, Common, Relationship, Work, Residence, Financial and Special situations.
- Advisers can add a library section to an individual client draft without altering the governed master template.
- Advisers can create a fully client-specific section for unusual or mixed situations.
- Every section can be tailored in a document-style wording editor.
- Standard/library wording can be restored after a client-specific edit.
- Sections are visibly identified as Starting point, Library, Tailored or Client-specific.
- Existing include/remove, reordering, numbering, police-clearance and direct-preview editing controls remain available.
- Road Map authoring uses the same Add from library / Add custom section model.

## Client-facing language
The new reusable modules deliberately use a softer Turner Hopkins style. Common patterns include:
- What we need from you
- Why this helps
- Helpful tip

The wording is designed to guide and reassure clients rather than read like a compliance checklist. Existing legacy master wording remains available and can be progressively refreshed as the modular library is refined.

## Existing output preserved
The current A4 design, live preview, Separate guides / Single pack / Balanced arrangements, CRM save workflow, template governance and portal-ready workflow remain in place.

## Database
No schema change. The database remains at 46 migrations and all historical migrations are unchanged.

## Rollback
Deploy the v0.17.42 rollback package. No database rollback is required.
