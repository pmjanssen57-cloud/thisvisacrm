# THiS CRM v0.17.80

THiS CRM v0.17.80 — 9 November 2026

AGREED-PLAN INSTRUCTIONS WORDING
Based on v0.17.79. Instructions now read as a plan agreed with the client, rather than a preliminary exploration of possible pathways. The standard Road Maps cover all 12 starting categories: SMC, Investor, Parent, Partnership, Partnership Work Visa, Employer Accreditation, AEWV family, AEWV, Citizenship, Permanent Residence, Student and Visitor.

Strategy, category/basis, relevant focus/employment sections and next steps now explain the selected approach, the work we will perform, the evidence the client should provide and the agreed sequence. Client-facing drafting notes such as 'your adviser will tailor this section' and the SMC 'precise basis will depend' / 'in most cases' passages have been removed from the revised Road Map defaults. SMC strategy cards and timeline use the same plan-focused voice. New Road Map and Documentation Guide openings link requests and people to the agreed plan. Supporting library guidance for medical/police timing, communication, post-lodgement work and specific issues has been refined in the same voice.

A single Agreed pathway field is available in Header & introduction. It starts from the selected application category and can be made specific, for example Green List — Straight to Residence (Tier 1). The value fills standard wording in both guides and updates default cover subtitles; custom cover subtitles are retained. Existing client name, category selection, Lego-block editing, family/evidence assignments, individual step/card duplication and visual controls remain in place. Genuine evidence requirements, qualifying events and decision dependencies stay explicit. The wording does not assert that all evidence has been verified or that a visa outcome is guaranteed, and introduces no policy thresholds or government prices.

EXISTING DRAFTS AND MASTER CONTENT
Saved client wording, custom sections, family/person assignments and existing inline edits are not automatically rewritten on opening. For a standard Road Map block or either main introduction, select Use updated standard wording below the wording editor. The CRM confirmation explains that the selected wording and its embedded step/card arrangement will be replaced. Cancel leaves it unchanged. Other sections and document requests remain intact. The refreshed text remains editable. Restore starting wording retains its prior behaviour.

New drafts receive revised code defaults. If an older published master contains an exact unchanged former standard block, that block is refreshed when building a NEW draft. Tailored master blocks are preserved. The former default catalogue is kept in memory only to identify exact unchanged text; this is not a database migration. Existing saved drafts require the explicit selected-section action. Set the specific agreed pathway and remove unneeded stages before issuing the tailored instructions.

OUTPUT / INTEGRITY
Existing Instructions pagination, visual element engine, family model, sanitisation, draft JSON and isolated print window are preserved. The only renderer addition fills an escaped agreedPathway token using the explicit field or selected category. instructions-wording.js loads before the Studio engine and is included in PWA precache. Shell and script cache versions advance to v0.17.80. Agreement Studio's v0.17.79 application-specific services and payment grouping are preserved byte-for-byte in its engine and service catalogue. Public forms, success redirects and email functions are unchanged.

VALIDATION
Production build passed. Application JSX/JS, all 27 unchanged Netlify modules, 13 public scripts, 13 CSS files and inline scripts/styles parsed. PWA/version/precache validated. All 49 prior migrations are byte-identical. No new migration, table, column or schema change. Existing studioState JSON stores the additional agreedPathway text without backend changes.

Local Microsoft Edge checks passed for all 12 plan categories; new standard openings and strategies; absence of the generic/drafting-note passages in active defaults; editable pathway propagation and default cover updates; existing/custom draft preservation; selected-section refresh and cancel; unrelated sections and inline-edit preservation; save/reopen; and layouts at 1440, 1024, 768, 390 and 320px. Existing builder regression passed for client details, people and per-document requests, rich text/paste sanitisation, library, add/duplicate/reorder/remove/restore, cover persistence, combined output and desktop/tablet/mobile controls. Broader actual-built CRM navigation/edit/retry, contact/intake/employer reviews and Studio creation passed.

Actual built CRM > Instructions iframe > isolated print window passed in CSS-page-size, A4 default and A4 with requested margins configurations, including blocked-popup handling. Each representative combined PDF has eight physical pages matching the document layout. All eight rendered pages were visually inspected; new plan wording is present, no blank/footer-only pages occur and text is within A4 bounds. This uses synthetic example data, not a reconstructed live client document. ZIP CRC, safe unique paths, every packaged file hash and byte-exact rollback verified.

DEPLOYMENT / ROLLBACK
Use THiS-CRM-v0.17.80.zip with the existing Netlify source-build process: yarn build, publish dist. Dependencies and generated dist are excluded. No Squarespace embed update is required. No production deployment was performed.
THiS-CRM-v0.17.79-ROLLBACK.zip is a byte-exact copy of the previously delivered v0.17.79 ZIP, verified against its recorded SHA-256 and located in Desktop/Dashboards/THiS CRM. No schema rollback is required.

LIMITS
Local headless Edge with emulated widths, synthetic data and intercepted APIs. Physical mobile devices, Safari and Firefox were not tested. No live client issuance, email or production signing was attempted. Wording is an adviser-tailored starting point based on the selected plan; no new immigration-policy, eligibility or legal review was performed. Local Node 24; Netlify target Node 20.19. Existing bundle-size advisory remains.
