# THiS CRM v0.17.67

THiS CRM v0.17.67 — 28 October 2026

Based on v0.17.66. The Update matter panel is widened from 640px to 760px on desktop, capped at the available screen width. Stages & documents now has a leading checklist icon, matching the existing leading icons for Action history and Client details. All three controls have consistent spacing and 44px minimum height. The first button has slightly more room for its longer label. Labels remain on one line. At 740px and narrower, the buttons stack at full width for readable labels and comfortable touch targets. Other panel types retain their existing widths.

All v0.17.66 functionality is preserved. No schema change or new migration. All 48 migration files and all 24 Netlify function modules are byte-identical to v0.17.66. Public JavaScript and Studio engines are unchanged. No production deployment performed.

Verification: production build; 11 application source files, 24 Netlify modules, 9 public scripts, inline scripts and CSS syntax; undefined-reference checks with no new findings; PWA/cache references and version; native-confirmation audit; migration and backend hashes. Snapshot browser checks at 1440, 1024, 768, 390 and 320px verify the new panel width, exactly one icon per button and single-line button text. Desktop and mobile screenshots visually inspected. Existing history popup, unsaved-change retention, pin save/reload, save failure/retry, unpin confirmations, combined update save, direct Client details and commercial pin checks passed. ZIP CRC, unique/safe paths and every packaged file hash verified. Exact original v0.17.66 rollback ZIP included.

Limits: local Edge with synthetic records and intercepted APIs. No live database, real email or physical-device testing. Representative flows and widths, not every conditional path. Local Node 24; Netlify pins Node 20.19. Existing bundle-size advisory remains.

Deployable source ZIP uses the normal Netlify build (yarn build, publish dist); node_modules and generated dist are excluded. No schema rollback is required. Nothing deployed.
