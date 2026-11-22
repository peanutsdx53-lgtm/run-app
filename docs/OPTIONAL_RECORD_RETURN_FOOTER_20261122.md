# Optional Record Footer Unification — 2026-11-22

## Scope and baseline
Based on five iPhone 16e English screenshots and the preceding explicitly approved proposal. Current main baseline: `697f93f`. The user requested implementation, not further design options. Apply to Course & Conditions, Before/After Fatigue (ROF-J), Steps and Running Pattern, Environment, and Body and Equipment. Preserve the existing dark mode, the approved three Result tabs and all scientific/reference calculations.

## Functional design rationale
- A shared **return action** does not imply identical commit semantics. For ROF-J, the button navigates without manufacturing a rating. For Gait, it retains `gaitValidation`, including run/walk bounds; it is disabled if invalid. For Body, it preserves current draft updates and returns to the review screen when opened there.
- Course's primary action retains `courseReadiness` before returning. Reusable-course save remains a **separate secondary action**, with the same preset store, identifiers, validation and deletion behavior. Remove only the redundant 'apply to this record' heading; the primary action now says '条件を反映して記録に戻る' / 'Apply Conditions & Return'. Crucially, return to `#/record-review` when `recordReviewReturn` is true.
- Environment weather/flags are transient. They must **never be silently saved**. When pending and the user presses the main or header return button, prevent navigation and show an explicit accessible choice: '反映して戻る' (call existing explicit note-copy routine) or '反映せず戻る' (navigate without copying). If the note is over 500 characters, keep the user on the screen and show the existing validation message. Temperature validation stays in effect for the main return action; the header remains an escape for invalid temperature. Weather/flag selection is never added to a new structured schema.
- In the normal manual entry flow, the four navigation-only/main-draft screens show '記録に戻る' / 'Back to Recording'. GPS fatigue retains 'GPSに戻る' and its measurement/review destinations. Detail screens opened from Record Review return to `#/record-review`, not `#/record`.
- The shared action is not a save of a completed activity. Actual final-record saving and the associated consent/validation remain independent. Do not alter any research texts, reference values, record storage schema or Current research files.

## Screen design rationale
- Body & Equipment is the visual reference: primary buttons use the approved turquoise-blue to green gradient, navy text, 13px radius, 52px minimum height, readable inherited font, border, focus ring and subtle shadow.
- Each primary button is placed **after** the last card, in a common footer. For viewport widths <=800px, width=100% of its content container, with wrap and flexible height. For widths >=801px, align right and cap at 320px. Account for bottom navigation and safe-area padding.
- The Course save action is visibly secondary (dark/outlined). Environment's warning panel uses distinct contrast, with equal-size choices that become one column at <=520px. The transient 'apply weather to note' action inside the form remains separate and is not restyled to look like a page-return action.
- Only terminal return actions use this gradient. Selection chips, disabled operations, danger actions, research controls and other button roles retain their existing semantics.

## Screenshot-driven corrections
- Initial Chromium/WebKit audit exposed a pre-existing high-specificity global selected-button rule overriding the new gradient in ROF-J, Gait and Environment. Added a narrow higher-specificity override *only* for the active terminal return roles.
- On desktop the Environment footer initially grew to 320px tall because a flex-basis sized the height of a column-flex container. Replaced that footer with an actual grid, keeping its primary right-aligned at 320px.
- When the Environment confirmation is displayed on a phone, hide the ordinary return CTA; otherwise it competes with the two deliberate choices and can sit behind the fixed navigation during a scrolled screenshot.
- Browser navigation tests must change the SPA hash instead of calling page.goto when verifying unsaved draft continuity. A hard reload is a separate persistence test, not a valid simulation of returning from a detail page.

## Testing and evidence
1. Node regression: five footer contracts, two language translations, Course preset preservation, ROF GPS routes, Gait validation, Body draft fields, Environment transient state and explicit copy. Verify PWA cache covers the new CSS and all changed module URLs.
2. Browser checks: Chromium and WebKit with Japanese/English at 390px, English at 320px, plus 768px and 1024px layout sampling. Compare geometry and computed gradient/ink; exercise Environment's warning and both choices, and screenshot the primary actions. Include keyboard focus, zoom and overflow checks.
3. After test failures, fix and rerun. Only report all-PASS if GitHub Actions has actually completed. Keep the implementation in a branch until inspection is satisfactory.

No code is changed in Current/.
