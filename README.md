# THiS CRM v0.17.59

THiS CRM v0.17.59 — 23 October 2026

My Work is now a single scheduled matter queue. Today & overdue includes all due next actions and waiting reviews, regardless of whether the next actor is the adviser, client, INZ or a third party. The sidebar badge and today/overdue totals use the same dates and responsibility scope. Overdue items appear first, then today's items, ordered by date and name rather than status priority.

The separate waiting section, waiting filters and status-board switch have been removed from My Work. Existing saved board preferences no longer hide the unified list. Status remains context on review rows and in the unchanged matter update controls. Next 7 days and All work also include waiting matters. Needs action / date includes undated matters regardless of status, so they remain accessible without inflating the dated queue. Appointments remain separately accessible below the list, and Personal tasks remains available.

Client-action waiting matters now consistently prefer the saved review date over a legacy next-action date, matching INZ/third-party waiting records. Existing next-action dates remain a fallback where no review date exists. Rescheduling a review moves it out of Today & overdue when appropriate and updates the badge; completed/closed records remain excluded. No records are changed just by opening My Work.

Baseline v0.17.58. Enquiry badge fixes and reviewed-employer queue behavior retained. No schema changes or new migrations. All 48 migrations and 24 Netlify modules byte-identical. Studio engines/document generation unchanged.

Validation: production build; application/public/inline JS and JSX syntax; CSS and inline styles; PWA/cache references; migration integrity; ZIP CRC/contents. Synthetic end-to-end coverage includes adviser/client/INZ/third-party due actions and reviews, future/undated work, legacy date fallback, client review-date precedence, main/backup/combined scopes, completed/closed exclusion, badge/list/summary consistency, saved-board preference handling, rescheduling a waiting review and persistence, and an empty scheduled queue. Layouts checked at 1440, 1024, 768, 390 and 320px. Enquiry count/review-transition regression and broader app save/retry/contact/intake/employer-linking/Studio-creation integration checks passed.

Limits: local Edge with synthetic records and intercepted APIs. No production/live email/physical device verification. Full 191-state audit and print comparison not repeated; document engines unchanged. Local Node 24, Netlify pins Node 20.19. Existing build-size advisory remains.

Deployable source ZIP uses normal Netlify build. Rollback ZIP is an exact v0.17.58 release copy. Nothing deployed.
