# THiS CRM v0.17.53 — Clear document and stage controls

Built from confirmed v0.17.52. Document inclusion and received status now use separate,
labelled choices. Stages separate applicability, progress and completion date; core
stages clearly remain required. Layouts no longer depend on the overlapping checkbox grid.

Includes the earlier intake-review layout fix and people-first Instructions Studio.
No migration or schema change. All 48 migrations and 24 Netlify modules are unchanged.
Use the existing Netlify SOURCE workflow: yarn build; publish dist; functions
netlify/functions; Node 20.19. Nothing deployed. See RELEASE.txt and VALIDATION.txt.
