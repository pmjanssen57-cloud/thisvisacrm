# THiS CRM v0.17.19 - Assessment Form Review & Validation Polish

This release continues from v0.17.18 and focuses on the public assessment experience.

## Changes

- Name validation feedback now clears immediately after the applicant supplies both names.
- Applicant details now ask whether the person holds another citizenship and, if yes, capture the second citizenship.
- Review & Send now presents a comprehensive grouped review of the completed questionnaire instead of only name and goal fields. Each group can be expanded and includes an Edit action back to the relevant assessment stage.
- CV selections/saved draft uploads are shown in the final review.
- The internal submitted questionnaire view includes second-citizenship information.

## Squarespace promotional pop-up

The promotional pop-up is controlled by Squarespace rather than the embedded intake application. In Squarespace use **Promotional pop-up > Display & timing > Pages** and limit the pop-up to pages other than the Assessment page. The existing v0.17.17 resume-aware iframe embed remains valid.

## Database

No schema change or new migration. All 44 existing migrations are unchanged.
