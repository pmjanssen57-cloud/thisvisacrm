# THiS CRM v0.17.52 — Intake review layout fix

Built from v0.17.51, preserving the people-first Instructions Studio.
Intake review flags, action buttons and email results now occupy separate rows.
Buttons use readable responsive columns, and confirmations/errors wrap beneath them.

No new migration or schema change. All 48 migrations, 24 Netlify modules and both
Studio document engines are unchanged. Use the existing Netlify SOURCE build workflow:
yarn build; publish dist; functions netlify/functions; Node 20.19. Nothing deployed.
See RELEASE.txt and VALIDATION.txt. Earlier guides remain historical.
