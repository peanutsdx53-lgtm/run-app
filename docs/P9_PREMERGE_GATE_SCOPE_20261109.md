# RunLoad P9: pre-main integrated acceptance gate (2026-11-09)

- Target: Draft PR #66 against `main`. The first run of this gate is performed **without merging**.
- Workflow: `.github/workflows/p9-crossdomain-premerge.yml`.
- Definition of a pre-main software PASS: `scientific-storage-contracts` + Chromium and WebKit `integrated-browser` jobs succeed at the same new commit SHA.
- The gate intentionally uses **real application test scripts**, actual IndexedDB fixtures, actual Playwright interaction, real PNG/print checks, and a genuinely stopped offline origin. It does not infer pass from existence of test source.
- Node science/storage/research: `node --test tests/*.test.mjs`; authoritative reference-boundary/ROF/record and storage rules stay separate from UI wording.
- Browser cross-course: `twoRunCycleBrowserSmoke` (two-run recorded comparison and inquiry), `integrationLearningJourneyBrowser` (learning-to-exploration flow), `integrationGpsPosthocExportBrowser` (GPS V2 source and posthoc), `integrationI2PrivateExportBrowser` (default-private sharing and actual media/export failure), `learningOfflineOriginDownBrowser` (service-worker shell survives actual origin shutdown), `p8AbnormalStorageBrowser` (no IDB corruption masking and no implicit fallback after deleted ID).
- Limits: local headless Chromium/WebKit are not actual iOS/Android devices. Browser-shimmed GPS does not demonstrate physical tracking accuracy or outdoor environmental availability. The code's service-worker cache behavior does not prove an already-installed iPhone PWA updates through a GitHub Pages release. User comprehension and self-understanding improvement are **not empirically measured**.
- This is distinct from the historical approved 29 criteria (V0.2). Revisions require an explicit user-approved governance decision; no silent replacement of the original.
- Main merge and the current formal research/design corpus remain unchanged until separately authorized.
- After a passing pre-main gate: inspect GitHub PR diff, evaluate deployment settings/rollback, obtain explicit merge approval, publish candidate, run manual device/PWA/GPS/offline/OS-accessibility acceptance, then decide final P9.
