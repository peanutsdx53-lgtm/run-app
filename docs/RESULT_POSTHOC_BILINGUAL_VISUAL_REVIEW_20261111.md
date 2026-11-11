# RunLoad v2 — Results and optional post-hoc screen, bilingual screenshot review
Date: 2026-11-11
Status: implementation with reproducible evidence; do not merge into formal Current automatically.

## Verified previous issue
User-provided iPhone screenshots showed a crowded Results header, a large duplicate Explore CTA, an optional post-hoc screen whose parent background turned white, and internal record ID exposed in a disclosure.

## Design rationale: function vs screen
- **Functional reasons:** Keep the original manual/GPS RecordRef, client request ID, original record, event history, scientific calculation and ROF-J corrections unchanged. A post-hoc report must never replace the original or be interpreted as a measured activity variable. Preserve 0 vs unanswered and default-private output. Retain Body / Fatigue / Compare 3-tab switching. The permanent Explore navigation remains available; deep-link context requires explicit record identity and must never silently choose another record.
- **Screen reasons:** Show the running facts before supporting status and disclosures. One optional More menu contains Add Details, image export and print. Remove only the redundant large Explore CTA. Hide internal record IDs in generated HTML, not via CSS. The post-hoc screen uses the same navy palette as Results/History, a compact original-record summary and a voluntary field picker with no preselected mental response.

## Recorded real-browser screenshot inspection
The first implementation (commit 14efbe3c) added the `Bilingual Results and Post-hoc screenshot acceptance` CI and captured 42 WebKit screenshots across Japanese/English, 320/390/768/1440px and 390px/200% text size. These screenshots were downloaded and inspected visually, not judged solely by CI pass/fail.
- Confirmed visually: no white parent area in the optional post-hoc screen, large Explore link removed from Results, More menu and three result tabs preserved, no user-visible record ID, and no document horizontal overflow in the measured scenarios.
- Visual review found new defects not captured in the first test: untranslated "記録種別", "記録時は未入力", and the dynamic "35.0 分" in the English post-hoc summary; the 320px native option "Self-Reported Body Observations" was truncated; and "Choose a Detail" was repeated as both heading and field label.
- Second implementation uses concise "Record Type", "Not Recorded Originally", "Body Notes", "Select an Item", "Original Record" and localized distance/duration units. It also removes a dynamic legend suffix to avoid Japanese leaking into English.
- The screenshot test is tightened to FAIL on untranslated visible Japanese in the English post-hoc screen and selected-item native clipping.

## Acceptance before closure
The latest commit must PASS both Chromium and WebKit screenshot jobs, with exported PNGs and measured geometry available as GitHub Actions artifacts. Human visual review must verify both languages at 320/390, desktop balance and 200% text size; preserved source/annotation history must PASS the existing integration regression and the full seven-stage same-SHA gate. Existing test expectations of a *visible independent Add Details button* or *large contextual Explore link* are updated to the newly approved More-menu and global-Explore paths, without weakening underlying saves, scientific evidence, no-ID and typed-link checks.

## Limitations
CI/WebKit screenshots are real browser outputs but not a substitute for physical iPhone/Android testing, independent exercise-science recalculation, approved English legal review or measured gains in self-understanding. User-authored original notes remain exactly as entered.
