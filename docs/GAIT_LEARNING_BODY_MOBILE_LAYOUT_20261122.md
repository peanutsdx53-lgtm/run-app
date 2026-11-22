# Gait choice layout, Body typography and Learning back button — 2026-11-22

## Trigger, scope and work units
User supplied smartphone English screenshots of the Steps and Running Pattern page and Learning catalogue. The Gait source group renders DEVICE_MEASURED / ESTIMATED / UNKNOWN, while the running-pattern group previously rendered UNKNOWN / CONTINUOUS_RUN / RUN_WALK. Three choices were rendered across uneven grid rows. Learning catalogue lacked the top-left back button used on other detailed screens. Body & Equipment used the same system-ui family at the page level, but button-specific type sizes and weights were inconsistent.

1. Inspect the current main implementation and the provided screenshots.
2. Make only the requested layout, typography and navigation changes; retain data identifiers, validation, science and existing record state.
3. Exercise Japanese and English at 390px and English at 320px through Chromium/WebKit; screenshot the default and selected Gait groups, Body controls, and Learning overview/lesson. Verify geometry, back targets and offline assets before merging.

## Functional design rationale
- Keep Gait underlying source, format and UNKNOWN values unchanged, as well as optional inputs and mixed-run scientific restrictions. Change display order only: source = DEVICE_MEASURED, ESTIMATED, UNKNOWN; pattern = CONTINUOUS_RUN, RUN_WALK, UNKNOWN.
- Learning catalogue header returns to #/home. When opening a lesson, the same top-left header control goes to #/learning. Existing inline lesson-back links are removed during heading mount to avoid duplication. Keep help button, content and internal navigation.
- Body & Equipment continues using system-ui as before. Normalize control typeface inheritance and control-weight hierarchy without flattening visual roles or altering any buttons' behavior.
- Japanese UI remains the reference text. Add an English accessibility translation only for the new lesson return label. No user-authored text or scientific result is translated or modified.
- Keep the 3 Result tabs, 12-region reference logic, storage schema and Current research files unchanged.

## Screen design rationale
- Both Gait choice groups use two equal-width first-row buttons. The Unknown control is visually last and spans the entire second row. All three use consistent minimum height, centered labels and wrapping without truncation, so the grouping remains symmetrical at narrow phone widths.
- Body selection buttons maintain semantic size differences for primary/secondary actions, but share their parent font and coherent 750/800-weight range. Existing turquoise-selected/dark-unselected colors remain.
- Learning header uses the same 44px back button size and left/back–title–help order as Record detail headers, with independent accessible labels and keyboard focus ring.

## Verification gates
- Node tests assert Gait option order, IDs and validity continuity, Learning destinations, typeface rules, and version/pwa integrity.
- Browser contrast audit asserts actual Gait geometry (aligned first row, full-width Unknown second row), text fitting, active state readability, Body button computed font family, and Learning back links on overview and lesson with no overlap; captures real screenshots in Chromium and WebKit.
- PASS should be claimed only for test executions that actually finish. A separate real-device Safari test is not implied by browser emulation.
