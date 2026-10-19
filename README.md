# THiS CRM v0.17.46 — Consistent workspace refresh

Built from v0.17.45, applying the approved clean white / forest-green interface across the
CRM, enquiry review and embedded agreement/instructions builders.

The release implements the three agreed stages:

1. Shared navigation, search, visual styling and editing surfaces.
2. List-first My Work, consistent individual/commercial updates, focused client editing
   and editing detailed client sections in place.
3. Faster enquiry review, intake Save & next, document search/filtering and bulk checklist
   updates, and simpler document creation/editing/review controls in both Studios.

The employer questionnaire queue and explicit attach/create workflow from v0.17.45 remain.
All Netlify function modules and the original agreement/instructions engines are unchanged.
No new migration or schema change. All 47 baseline migrations are byte-for-byte unchanged.

Deploy through the existing Netlify source-build workflow: yarn build; publish dist;
functions netlify/functions. Keep the existing environment variables, database and stores.
The package excludes installed dependencies and generated dist files, matching the baseline.

See RELEASE.txt, UI-GUIDE-v0.17.46.txt and VALIDATION.txt for details and test limits.
Versioned older guides are historical references; the current release guide takes precedence
for navigation and editing instructions.
