# UX05 — First-use progression and Home first impression (strict bounded revision)
Date: 2026-11-22. Stage **05 of the approved fixed 20-stage UX plan**, UX-015–022. Base main: `e6a9b45dc39cdc76a13629d1935b934999c92a39` (UX04 integrated). **Not an empirical study**; evaluation is design/technical consistency, not self-understanding improvement.

## Functional design rationale (WHAT / WHY)

RunLoad's first-use sequence contains eight screens, of which five middle chapters are optional guidance, while the Terms of Use and Privacy Policy require **separate explicit acknowledgment**. This distinction supports an interruptible, realistic information-recording workflow rather than falsely describing all eight screens as compulsory research tasks. On 320–768px, the desktop eight-item sidebar is not visible. The existing progressbar exposes a numeric position to accessibility APIs but gives a visually ambiguous row of eight unnumbered dots. Users may not know how much is left or what they are deciding now.

The Home screen must prioritize an explicitly chosen manual/GPS recording route when saved-run history is *readable and empty*. When storage reads fail, it must **not** claim that zero runs exist. Daily condition is self-report only, and missing days are **not zero hours**. Milestones report past saved manual running records, not prescribed goals, health diagnosis or ability ratings. Changing prominent milestones without measured benefit may make retrospective review less accessible, so avoid a speculative removal or ranking change.

## Screen design rationale (HOW / WHY)

- Show current **stage name** (using the pre-existing `FIRST_USE_STEPS` list) and an exact visible `1 / 8`–`8 / 8` fraction in the onboarding header, including the language choice and required legal consent. Keep the five-chapter optional-guide footer separate. Existing step order, skip rules, independent consent checkboxes and legal document bodies are unchanged.
- Permit status text and header to wrap when 200% root text/320px make an English stage name long; never ellipsize or hide stage information. The desktop sidebar and eight-segment progressbar remain.
- Keep the compact Home **編集 / Edit** visible label to fit 320px and 200% typography; provide an explicit `aria-label="ホームの表示を編集" / "Edit Home Layout"`, switching to `編集を終了 / Finish Editing` in edit mode. Card editing still saves each drag/visibility/width change immediately; the ARIA label does not create a new save action.

## Eight candidate decisions and degradation re-check

| Candidate | Decision | Evidence and regression reason |
|---|---|---|
| UX-015 (B) | **Implement** small explicit step status | 8 unnumbered segments + hidden sidebar on phone; 8-step name/fraction pairs verified in JA/EN and zoom |
| UX-016 (V) | **Verify only** | Both languages already have buttons with one `aria-pressed=true`; do not auto-select or silently overwrite language |
| UX-017 (B) | **Keep existing Home order** | Latest Activity already first as a full-width card with a clear Record a Run link in readable empty state. The other six cards remain reachable and movable by user-edited layout; no forced simplification |
| UX-018 (B) | **No code change** | Unrecorded achievements show four named, unearned states and no fictitious completed milestones. Removing the 0/50 display or hiding the card without a comparative task test risks concealing milestone affordances. Reconsider only with grounded side-by-side evidence |
| UX-019 (B) | **No code change** | "Missing days are not zero hours" appears next to the empty 7-day state. Moving it entirely into Help could reintroduce the absent=zero error; short visible note retained |
| UX-020 (B) | **Implement accessible control label** | "Edit" alone is ambiguous but longer text at 320px/200% can displace the guide control. Preserve short visual label, clarify purpose through programmatic name. Condition/Achievement already have distinct accessible labels |
| UX-021 (V) | **Verify only** | Empty Latest Activity already shows the one Record a Run CTA, not placeholder 0 values. On read failure, the CTA is withheld and source failure stays visible |
| UX-022 (V) | **Verify only** | Courses, Learning, Consultation/Sharing shortcuts are already `#/course`, `#/learning`, `#/consultation`, with no duplicate shortcuts. Do not add new ones |

## Acceptance and negative tests

`tests/ux05OnboardingHomeContract.test.mjs` checks all eight Japanese source stages and explicit English translations, progressbar counts, single language selection, independent dual legal acknowledgments, guide deferral limited to chapters 3–7, empty vs failed storage, 4 unearned milestones, original 3 shortcuts and new editor accessible name.

`tests/ux05OnboardingHomeBrowser.mjs` verifies real **Chromium/WebKit × JA/EN × 320/390/768/1440 × 100/200% = 32 full browser conditions**, each with all eight onboarding steps (256 stage states), original consent gate, optional guide path, explicit 1/8–8/8 header and clickable Home entry in an isolated user session. Representative step 1/2/7/8 and empty Home screenshots are saved under `audit-output/ux05-intro-home-${engine}`. Header/document horizontal overflow is a hard fail; no shortening of legal or user-authored text.

Complete Node/scientific/storage tests, all standard browser regressions, two-run saved-record continuity, offline precache/installed PWA, S09 Results screenshots, and Pages build must also pass. If any issue appears in a source, saved-run ID, original scientific reference, user text, consent, or 3 Results tabs, **HOLD/stop merge**.

## Scientific and device limits

This stage creates no evidence that wording increases beginner runners' self-understanding, running safety, engagement, or motivation. Missing/zero and reference-study eligibility remain separate. Browser simulated root font 200% is not physical iOS/Android Dynamic Type or VoiceOver/TalkBack certification. Formal `RunLoad/Current` files are not edited. User-entered notes and legally required texts are not translated or rewritten.
