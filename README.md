# THiS CRM v0.17.82

THiS CRM v0.17.82 - 9 November 2026

INSTRUCTIONS PRESENTATION AND EVIDENCE OPTIONS
Based on v0.17.81, preserving its case-plan authoring, reusable wording, individual document assignments and print fixes, plus previous Agreement Studio and CRM improvements.

People included in these instructions now uses clean two-column person cards, initials and readable role badges, with a subtle main-applicant accent. Names, roles, order and adviser notes are retained. The saved model keeps the original canonical table structure; the new cards are applied when rendered, including existing saved drafts.

The enabled adviser sign-off includes the real THiS logo in all three sign-off styles. Its image bytes are identical to public/turner-hopkins-logo.png and embedded in the document for reliable printing. Turning off the sign-off also removes the logo. Adjacent sections have more breathing room, with additional space before headings. Preview and page measurement use the same styling.

Documentation Guide > Add block now includes three individually selectable options: Relationship evidence, Custody & consent evidence, and Dependency evidence. Each contains friendly starting guidance and ready-written requests. Common document requests also includes relationship records, marriage certificates, parenting/custody records, parental consent and dependency records. Suggested person selections use the named couple for relationship requests and named children for custody/dependency requests. Advisers can change every assignment and wording; these are starting choices, not legal determinations. Existing saved assignments are retained. Removing/re-adding an existing block preserves its request identities and assignments. Optional blocks are not overwritten by a case-plan update.

PRINT RELIABILITY
The isolated print document now carries the source's loaded stylesheet rules inline, preserving style order and avoiding a linked-stylesheet loading race. Printing waits for document layout, images and fonts to be ready. A slow load remains pending rather than printing an incomplete document after a fixed timeout; failed assets are reported. The v0.17.81 bounded A4 pages and in-page footers remain in place. Embedded, standalone, keyboard and Studio direct-print paths remain supported.

VALIDATION
Production build passed. Application JSX/JS, 27 unchanged Netlify modules, 14 public scripts, 13 CSS files, 17 inline scripts and 21 inline styles checked. PWA/version/cache paths validated. All 49 previous migrations are byte-identical: no new migration, table, column or schema change. No new dependency. Backend, Agreement engines, core Instructions engine, people engine, public logo and conversion/redirect code are unchanged.

Local Edge interaction checks passed for person cards and saved-table compatibility, all sign-off styles and disable/enable, the three separate evidence blocks, couple/child assignments, remove/re-add, saved-draft reopening, case-plan updates and prior authoring regressions. Actual-built CRM navigation and representative editing/review flows passed. Responsive widths checked at 1440, 1024, 768, 390 and 320px without page overflow.

Nine generated PDF configurations have matching logical/physical page counts, no alternating footer-only pages and text contained within A4. The representative family/evidence pack contains ten content pages. Rendered people cards, sign-offs, headings and page spacing were checked visually. QA used fictional data, not a rewritten client document. ZIP CRC, safe unique paths, every packaged file hash and the exact rollback copy are verified.

DEPLOYMENT AND ROLLBACK
Use THiS-CRM-v0.17.82.zip with the existing Netlify source build (yarn build; publish dist). It excludes dependencies and generated dist. Refresh the CRM after deployment. No Squarespace embed update is required. No production deployment was performed.
THiS-CRM-v0.17.81-ROLLBACK.zip is a byte-exact copy of the previously delivered v0.17.81 ZIP. No schema rollback is required. New optional evidence blocks use the existing document/request JSON structure.

VERIFICATION LIMITS
Local headless Edge, emulated screen widths, synthetic records and intercepted APIs. No live client issuance, email or production write; no physical printer/device, Safari or Firefox test. Native print settings can override paper size and scale; checks use A4 at normal scale. The user's exact saved client editor state was unavailable. No new immigration-policy or legal review was performed. Local Node 24; Netlify target Node 20.19. Existing bundle-size advisory remains.
