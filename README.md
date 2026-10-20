# THiS CRM v0.17.49 — Employer questionnaire review

Built from v0.17.48. Employer questionnaires now use intake-style assessment triage,
saved adviser reviews, Save & next, grouped answers, supporting file downloads and a
branded Print / save PDF report. Download questionnaire saves a printable HTML copy.
Original answers and explicit commercial-client attach/create behaviour are preserved.

One new additive migration: 202610200001_add_employer_questionnaire_review.sql.
It adds separate review JSON and a revision column; all 47 previous migrations are unchanged.
The existing CRM schema-ensure path applies the same idempotent additions.

Use the normal Netlify build workflow (`yarn build`; publish `dist`; functions
`netlify/functions`). Preserve environment settings and stores. No production deployment.
See RELEASE.txt, VALIDATION.txt and UI-GUIDE-v0.17.49.txt. Earlier guides are historical.
