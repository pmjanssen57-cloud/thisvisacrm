# THiS CRM v0.17.45 — Employer questionnaire review

Based on v0.17.44. Public employer accreditation questionnaires now wait for review in
**Inquiries → Employer questionnaires**, before being linked to a commercial client.

- Review submitted employer/contact/tax details and accreditation/viability summary.
- Inspect all answers, key people, declarations, supporting files and duplicate history.
- Compare possible matches by NZBN, legal/trading name and contact email.
- Attach to an existing commercial client, or explicitly create one from the questionnaire.
- Transfer tax/accreditation details, retained questionnaire history and supporting documents.
- Keep processed submissions and drafts/in-progress questionnaires in separate views.

**Database:** no new migration or schema change. All 47 migrations from v0.17.44 are
unchanged. Migration 47 must already be applied or applied as part of upgrading an older
baseline. No existing links or questionnaire records are removed.

This is a Netlify source package. Use the established build deployment with `yarn build`,
`dist` as the publish directory and `netlify/functions` for functions. Keep existing environment
variables, database and blob stores. Local dependencies and generated files are not bundled.

See RELEASE.txt for the workflow, deployment and rollback details; VALIDATION.txt for
verification and limitations. The older versioned guides are retained as historical references;
RELEASE.txt describes the current employer questionnaire behaviour.
