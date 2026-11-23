# UX06 — Manual-entry dates, blank-vs-zero, responsive inputs, and save gate

Date: 2026-11-23. Approved 20-stage plan: Stage 06, UX-024, 025, 026, 027, 039. This entry documents bounded design decisions; no user effects are established.

## Functional design rationale (WHAT / WHY)
- Manual-run distance and duration must be positive. Empty values are missing, not 0. ROF-J numeric zero remains valid when actually selected. Preserve manual write schema and exact source/id.
- The date represents the day the activity or rest occurred, not the day of data entry. Keep the existing convenience initial date and all persisted date keys/ordering unchanged.
- Explicit running/jogging/walking choice is never inferred from speed. RUN_WALK and reference-model eligibility rules remain unchanged; rest is a distinct, non-run contract.
- Review validation, stable manual save request ID, in-flight guard, Web Locks and authoritative IndexedDB read-modify-write remain untouched. Duplicate click is covered by regression; a failed acknowledgement cannot be called success.

## Screen design rationale (HOW / WHY)
- In the manual form, change placeholder 0.00 and 0.0 to clearly illustrative 例：5.00 and 例：30; translated in English to e.g. 5.00 and e.g. 30. They remain placeholders, never actual input values.
- Rename the visible and accessible occurrence date to 活動日 / Activity Date or 休養日 / Rest Day. Explain changing the date for past activities only in the existing help (?), with no new always-visible notice.
- Reflow the manual date control with natural-width labels and allow the two large number/unit inputs to stack at narrow widths and root font 200%. Retain units, input order, type, focus, activity selected states, and text size.
- Keep the user-approved one 必須 label and existing review-state errors; do NOT reintroduce a redundant required-progress banner during typing.

## Candidate decisions and safety
| ID | Decision | Reason |
| --- | --- | --- |
| UX-024 | Minimal display fix | Explicit examples distinguish blank from actual observed zero |
| UX-025 | Label/help clarification | Occurrence date vs current input day; saved date semantic stays unchanged |
| UX-026 | Limited responsive CSS and screenshot tests | Number/unit collision and date label reflow at 320/390px |
| UX-027 | No change to actual activity choices | Three explicit buttons already distinguish selected activity; avoid repeated prose |
| UX-039 | Regression only | Existing request identity and atomic exclusion remain the authoritative double-save protection |

## Required tests, results and limits
- New contract test: tests/ux06ManualEntryContract.test.mjs. New Chromium/WebKit browser test: tests/ux06ManualEntryBrowser.mjs (2 languages x 4 widths x normal/200% x 2 engines = 32 base conditions). Evidence includes screenshots, layout geometry, invalid/valid review transitions, and one isolated rapid double-save operation.
- Also require full existing Node/scientific/storage tests, two saved-run consistency cycles, installed PWA/offline flows, main regression CI and Pages deployment. Actual screenshots must be visually reviewed, not merely geometry-scanned.
- STATUS: Implementation pushed to a Stage06 branch; automated CI, screenshot review, post-merge Pages remain pending until verified. A failing gate means HOLD and no main merge.
- Official Current, scientific references/calculation rules, saved data, user prose, GPS, record identity, Results three tabs, sharing permissions, and irreversible deletion contract are not changed. Physical iOS/Android voice/accessibility/GPS are not certified; no claim about improved self-understanding.
