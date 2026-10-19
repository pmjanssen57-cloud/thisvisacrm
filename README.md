# THiS CRM v0.17.47 — Calm precision

Built from v0.17.46 using the approved Calm precision design. Restores the supplied THiS
logo, Studio name and expanded desktop navigation. Improves readable typography, My Work,
shared editing panels, public intake/contact/employer forms and both Studio builders.
Responsive layouts are verified from 320px phone widths to 1920px desktop widths.

No new migration or schema change. All 47 migrations and 24 Netlify modules are unchanged.
The employer questionnaire inbox and explicit attach/create workflow are preserved.
Original builder engines and representative printed document output are unchanged.

This is a Netlify source release. Run the existing Netlify build workflow: `yarn build`,
publish `dist`, functions `netlify/functions`. Keep existing environment variables and
stores. A static frontend upload alone does not deploy the functions.

See RELEASE.txt, VALIDATION.txt and UI-GUIDE-v0.17.47.txt. Earlier version guides are retained
as historical reference. No production deployment was performed.
