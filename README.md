# THiS CRM v0.17.60

THiS CRM v0.17.60 — 23 October 2026

The Update matter drawer is now 640px wide on desktop, previously 460px. This applies to individual and commercial matter updates. It fits the available viewport on small screens. Other drawers retain their existing widths. Docked desktop content now reserves the actual drawer width plus the existing 32px gutter, and that reservation is cleaned up on close.

Baseline v0.17.59, retaining the single scheduled My Work queue and enquiry badge/review improvements. No record storage or save behavior changes. No schema changes or new migrations; all 48 migration files and 24 Netlify modules byte-identical. Studio/document engines unchanged.

Validation: production build; JSX/JS, public/inline script and CSS syntax; PWA/cache references; migration integrity; ZIP CRC and packaged contents. Update drawer measured and screenshot-checked at 1920, 1440, 1280, 1024, 768, 390 and 320px. Width equals min(640px, viewport), docked reservation is 672px, fields fit, save footer stays reachable, and close removes the reservation. A 390x500 viewport was also checked. Existing app save/retry, client/commercial updates, contact/intake/employer linking and Studio creation passed. Unified My Work queue and enquiry count/review-transition regression suites passed.

Limits: local Edge with responsive viewports and intercepted APIs/synthetic data; no production database/live email or physical device verification. Full 191-state sweep and print comparison not repeated; document engines unchanged. Local Node 24; deployment pins Node 20.19. Existing bundle-size advisory remains.

Deployable source ZIP requires normal Netlify build. Rollback is an exact v0.17.59 release copy. Nothing deployed.
