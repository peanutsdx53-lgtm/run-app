# UX03 — text enlargement, mobile navigation reflow, and conservative tablet/desktop review
Date: 2026-11-22. Stage 03 of the approved fixed 20-stage RunLoad UX plan. UX-002, UX-003, UX-007, UX-008 and UX-009. Baseline main `338e87bd0c39a10ad71d170be0de800570e7a305` (UX02 is already integrated). Actual PR and CI evidence appended after review.

## Observed before-change problem

In real Chromium and WebKit screenshots at **320 CSS px / English / 200% root text**, the five fixed mobile navigation destinations wrapped into **three rows**, approximately 200px high and overlaid visible body/Explore content. The settings screen retained some small 10–13px item titles, descriptions and statuses because `settingsExperience.css` fixed their font sizes in px. These observations are not user research or an experimental effect estimate.

## Functional design rationale (WHAT / WHY)

1. Preserve the complete five routes, order, text labels, active-state indication, keyboard/touch reachability and existing record selection: Home, Record, History, Explore, Settings. No new, hidden or automatically selected destinations.
2. Allow user-controlled zoom to enlarge the important Settings labels and supplementary descriptions rather than inheriting hard-coded small pixels. Do not change user preference values, text content, answer state, consent, record IDs, data contracts, or physics/research reference values.
3. Maintain scrollable access to the main content, including focused controls and the last item above the fixed navigation bar. Use the safe-area inset when allocating space.
4. Keep accessibility coverage distinct: browser CSS root 200% is *not* OS Dynamic Type or physical VoiceOver/TalkBack coverage.

## Screen design rationale (HOW / WHY)

- **320/390px:** replace `repeat(auto-fit,minmax(min(100%,3.6rem),1fr))` with `repeat(auto-fit,minmax(min(100%,clamp(60px,3.2rem,112px)),1fr))`. At normal root size the five labels fit a single row, and at 200% the minimum tab width creates three columns / two rows, without splitting or abbreviating destination words, reducing obstruction compared with the former three-row layout. Keep >=44px touch height and original icon/label states.
- Keep a zoom-sensitive viewport clearance `max(112px,5.8rem)` plus bottom safe-area inset instead of reserving an unconditional 193px at normal size. Retain the special Result screen's already-validated five-column design and its separate main-content treatment.
- Preserve Settings text sizes at 100% using their previous pixel sizes as floors, allowing `rem` to grow normally at 200%. A taller expanded item is preferable to tiny, missing or clipped explanatory text. Visual review also found the Profile `Optional` status was still fixed at 11–12px; its own more-specific selector now uses a 12px floor and `.58rem` growth, and the browser audit checks its font scale and containment.
- **768px:** do not globally force two columns; no demonstrated advantage for long Japanese/English cards and no risk to reading order. Validate that the responsive nav stays in one row.
- **1440px:** do not fill whitespace with extra cards or stretch reading lines. Retain the seven-section layout and desktop sidebar. Confirm no mobile nav becomes visible.
- **Other UX-007 copy:** do not add verbose explanations to cards for the sake of more words. Existing essential cues remain visible; new language edits are outside this stage.

## Evidence and verification contract

`tests/ux03NavigationTextZoomBrowser.mjs` checks **6 screens × 2 languages × 4 widths × 2 root-text scales × 2 engines = 192 route-state conditions**:
- Five exact destinations, order, original text, full label within each bounding box, target height >=44px.
- At <=390px the nav must have at most one row at normal text and at most two rows at 200%. The nav must sit in the viewport and the main-content bottom padding must exceed the actual nav height.
- At 768px the app retains usable mobile navigation; at 1440px the desktop sidebar is visible and the mobile nav is hidden.
- Settings item titles and explanatory small copy must both grow by at least 60% when switching from root 100% to 200% at each width in both languages.
- Save representative screenshots to `audit-output/ux03-navigation-{engine}`, including the narrowest zoomed English and Japanese states, and preserve them in GitHub Actions artifacts.
- `tests/ux03MobileNavigationContract.test.mjs` adds source/route/offline contracts. `node --test tests/*.test.mjs` and both Chromium/WebKit full UI, two-run continuity, S09 and offline PWA jobs must remain green.

**Do not claim:** this eliminates all possible visual occlusion during arbitrary scroll states, guarantees actual iPhone/Android behavior, establishes benefits to self-understanding, certifies WCAG in full, changes formal Current/29-criteria approval, or measures exercise physiology.

## Release gate

Dedicated branch and Draft PR only before final CI. Stop integration if any normal or negative test fails or if a saved run, scientific reference, consent/URL mode or history route differs. After full PR-head green and documented screenshot review, integrate a single scoped PR into main as authorized by the user's per-stage merge policy. Recheck post-merge CI/Pages, write the commit IDs and outstanding device caveats to the ChatGPT progress ledger.