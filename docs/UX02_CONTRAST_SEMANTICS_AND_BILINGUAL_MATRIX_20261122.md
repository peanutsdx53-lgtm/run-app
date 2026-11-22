# RunLoad UX02 — Effective contrast, icon semantics, and bilingual viewport matrix

Date: 2026-11-22. Scope: UX-001 and UX-082, the approved 20-stage UX plan, stage 02 only. Baseline main: `e074a494a14c96d530e89f9e8e91cbe38a7b95d1`. Branch: `fix/ux02-contrast-semantic-audit-20261122`.

## Starting evidence, not a count of defects

Both Chromium and WebKit archived `contrast-audit.json` from workflow `45002742178` reported **1,258 visible records, 82 suspected low-contrast observations per engine**, across Settings (60), Explore (12), and Body (10), with zero route errors. Counts repeat languages, widths, and states. CSS gradient-stop sampling does not establish actual rendered pixel contrast.

Inspection of the individual records showed:
- Settings (60): `summary` row flagged because `.s2-chevron` uses `rgb(98,165,187)`. This is the **disclosure direction icon**, not the row text.
- Explore (12): `button.ex-node` flagged because `.ex-node-icon` holds a colored **category glyph**. Its adjacent category name is text. Icons were judged under the same 4.5:1 body-text rule.
- Body (10): optional mental/cognitive self-report `.mx-label small` was computed as `rgb(97,115,142)`: a pale-page global `--muted` token inherited on a dark card. Against dark candidate `#061e2e` its ratio is **3.53:1**, and against the brighter representative `#0d3d4e` it is about **2.42:1**. This is a genuine small-text issue, not an icon.

## Functional design rationale

No record, answer, reference formula, comparison eligibility, note or data schema is changed. Optional mental/cognitive self-report must remain voluntary; a CSS-only fix is sufficient to make the optional badge readable. Color alone does not encode a running/health diagnosis. Other fields, record selection and the three Results tabs are invariant.

## Screen-design rationale

- Give `.mx-label small` an explicit light ink `#c9eaf0` on its existing dark card, rather than globally changing `--muted`, light-mode typography, or every `small`.
- Preserve Settings disclosure-chevron and Explore category-glyph color identity. Their contrast floor is **3:1 for non-text visual information**, not 4.5:1 for normal paragraph text. The adjacent titles remain subject to the text thresholds.
- Improve the browser auditor to determine the **font size and role per visible descendant**, instead of taking a descendant's contrast and the parent button's threshold. This does not remove any record from the audit inventory; it corrects the category recorded for explicit glyphs.
- All unmodified colors are preserved. Do not brighten the selected Explore card, invert the dark theme, or weaken a text threshold merely to suppress warnings.

## Test and release plan

- Node source contract: `tests/ux02ContrastSemantics.test.mjs` verifies the mental label, icon palette thresholds, auditor role handling, CI matrix and cache revision.
- Browser matrix: `tests/ux02ContrastMatrixBrowser.mjs`, run by the existing button contrast workflow in **both** browser engines. Each engine tests Japanese/English × 320/390/768/1440 px × 100/200% root text = **16 combinations for each of Settings, Body and Explore** (48 conditions per engine; 96 across the two). Screenshot samples are saved to the existing contrast artifact. This is a computed-style check against conservative documented dark surface reference stops; it is **not a per-glyph pixel compositor**.
- Archived main behavior: `node --test tests/*.test.mjs` (scientific, record-integrity and offline contracts), full Chromium/WebKit regression and deployed Pages remain separate evidence. Use the final commit SHA for acceptance.
- PWA: the HTML CSS query, service worker's active exact URL, and cache name are revised together. Existing versioned references and unversioned path remain.
- iPhone/Android real hardware, OS Dynamic Type, full-viewport manual reading, scientific efficacy, and formal Current 29-condition certification are **not established** by this change.

## Decision gate

This stage is **not complete until the draft PR has a final-CI PASS, browser-matrix PASS, and preservation checks**, with no failing tests. If CI finds a mismatch, correct only this branch and repeat. Keep the PR draft and do not merge to main without user authorization. Official `/RunLoad/Current/` remains unchanged.
