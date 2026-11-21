# Button ink and fill consistency audit — 2026-11-21

## 1. User observation and approach
The user found some app buttons with dark text and others with white, occasionally too difficult to read. The actual requirement is not to make *every* button black: define a consistent ink/fill relationship and verify across real screens. This document separates the functional reason for retaining state and data from the screen-design reason for changing style.

## 2. Source inspection and baseline evidence
Inspected all **28 application CSS files** in the current repository, including styles.css, component styles, History's inlined shadow stylesheet, Result's inlined shadow styles and responsive overrides. Browser audit in Chromium and WebKit captures computed foreground, solid/gradient background, pressed state, disabled state, and screenshots across Home, Record, Course, ROF, More, Settings, History, Explore, Condition, Consultation, Learning and mobile GPS, with a synthetic locally saved run for Result and Review.

The Chromium initial pass saw 475 visible button/action records and found 100 *candidate* contrast flags. The 100 is not a count of proven failures: the approximate CSS checker treats small symbolic/icons (such as Settings chevrons, Explore node icons, Course radio glyphs) as text at 4.5:1. Such icons require independent non-text contrast assessment, typically 3:1; this audit does not replace a pixel/perceptual review. Confirmed high-priority low text contrast included:
- Record's white label on the light gradient at as little as ~2.96:1 (Review Entry), and white on bright selected Running at ~3.00:1.
- ROF-J selected Before Activity tab white on bright teal gradient at ~3.28:1.
- Selected Explore topic's small index/arrow at ~3.17:1.
- A History selected record's secondary caption at ~3.76:1 after seeding a real saved manual record.
Static inspection also identified white on lighter cyan endpoints in GPS, Manual Review save, Consultation primary and Result tab/export controls.

## 3. Functional design: invariants
Keep the existing controls, their DOM attributes, aria-pressed/selected, focus, disabled semantics, data IDs, dates, values, saved manual/GPS/annotation records, calculation methods, references and limits. Do not change the number of buttons, filtering, record requirements, comparison logic, three Result tabs, History retention or disabled buttons' meaning. No new light-mode capability or user-outcome claim.

## 4. Screen design: role system
Use a single semantic bright action role for named interactive controls, **fill #39CFD0 / ink #052939 / border #7BF5EB**, contrast ~7.96:1. Apply to visibly light/selected primary controls on Record, Course, ROF, Gait, GPS, Review Save, Consultation, Home Edit, Settings choices and scoped Result shadow root. Keep neutral dark controls with light text and existing active/hover behavior where contrast already passes. Explicitly preserve purple condition accents, warning/destructive colors, readable dark selected tiles and disabled states; do not apply blanket `button { color:black }`. Selected Topic on the *dark* Explore card uses pale captions rather than brightening its whole card. History selected record keeps its dark gradient; only the secondary caption is brightened. Result and History live in shadow DOM so need scoped inline styles rather than a global stylesheet alone.

Use visible outlines and pressed state so color is not the only selected-state indicator. Render the iOS mobile input focus style last and Result's 200%-typography override last; these are preexisting safeguards that may not be reordered.

## 5. Test and evidence gate
- Real Chromium and WebKit screenshots for Japanese and English at CSS widths 320/390, normal and selected states, plus established Stage 7 200%-root-font checks across screens.
- Browser-computed color/gradient audit and enforced minimum 4.5:1 for documented critical selected/primary components.
- Screenshot manual inspection by assistant, including after a saved record is selected and Result is opened; separate contrast report from mere screenshot presence.
- Node and cross-screen regressions, offline precache and PWA entry dependency checks, GPS workflow, editing/confirmation and three Result tabs.
- Actual iPhone visual inspection by user remains separate. A CSS color audit cannot prove absence of obscured content in every possible native browser state.

## 6. Future light-mode boundary
These are *dark-only* values. Before enabling Light or System, replace raw surface colors with semantic tokens for page/card/field backgrounds, main and muted text, bright and neutral actions, selected and disabled, focus, warning, charts, and overlays. Audit all ratios and screenshots in both themes; no blanket inversion or automatic change to existing dark users. Current remains untouched.
