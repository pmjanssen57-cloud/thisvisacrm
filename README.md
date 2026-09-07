# THiS CRM v0.17.17 - Assessment Draft & Resume

This release continues from v0.17.16 and adds secure pause-and-resume support to the public assessment form.

## Public assessment form
- Progress is saved locally from the start and securely server-side once a valid name and email are available.
- A **Save & finish later** action emails a secure 30-day continuation link.
- Resume links return to the Turner Hopkins `/assessment` page and reload the saved answers at the saved step.
- CVs selected during the assessment are stored with the draft and return when the applicant resumes on another device.
- Same-device recovery offers to restore an unfinished assessment after an accidental refresh or return visit.
- Submitted assessments remain separate from drafts; incomplete drafts never inflate New Intake counts.

## CRM
- Enquiries & Intake now includes **Incomplete assessments**.
- Staff can see applicant, progress, last activity, expiry and saved CV count.
- **Send resume link** rotates to a fresh secure token and extends the draft for another 30 days.
- Administrators can permanently delete an incomplete assessment.
- Expired abandoned drafts and their draft-only CV files are pruned during normal CRM use.
- The continuation email is editable under Tools > Email templates as **Assessment form - continue later**.

## Squarespace
Replace the existing assessment iframe wrapper with `turner-hopkins-guided-intake-embed-v01717.html`. It preserves the existing auto-height behaviour and passes `?resume=` from the Turner Hopkins assessment page into the Netlify form.

## Database
Adds one new migration: `202609080001_add_intake_drafts.sql`. Existing migrations are not modified.

## Rollback
Redeploy v0.17.16. The additional `intake_drafts` table can remain in place safely if rolling back; no destructive schema rollback is required.
