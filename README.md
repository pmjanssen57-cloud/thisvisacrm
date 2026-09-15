# THiS CRM v0.17.25 — Assessment Stage Transition Cleanup

This release continues from v0.17.24 and removes the legacy inter-stage pop-up/fact cards from the public guided assessment.

## Assessment form fix

- Removes the four-second pop-up shown between assessment stages.
- **Next** now moves directly to the next section.
- Forward navigation from the stage tabs also moves directly to the selected section.
- Existing stage validation, scrolling, draft/resume, CV upload and final review behaviour is preserved.
- The change is within the Netlify-hosted assessment form itself; it is separate from any Squarespace promotional pop-up.

## Behaviour preserved

- v0.17.24 Client details drawer hotfix is unchanged.
- v0.17.23 Agreement Studio and Instructions Studio workspace polish is unchanged.
- v0.17.22 Agreement issue/signing To/CC routing fix is unchanged.
- Assessment draft/resume and second-citizenship functionality are unchanged.

## PWA/cache

The service-worker shell cache advances to v0.17.25 so deployed clients refresh cleanly.

## Database

No migration is added. All 44 existing migrations are unchanged from v0.17.24.

## Rollback

Redeploy v0.17.24. No database rollback is required.
