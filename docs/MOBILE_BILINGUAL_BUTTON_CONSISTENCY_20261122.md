# Mobile bilingual button roles, entry copy and input-fit audit — 2026-11-22

## Scope and observed conditions

The user's evidence comes from the smartphone English interface; removal of redundant UI applies to Japanese and English equally. Explore's remaining Japanese phrases require a separate request and are not changed here. Baseline: main `07a871b`, which introduced high-contrast scoped dark-mode tokens, but still omitted several selectors, allowed a native locale-specific file picker to show through, and kept a generated required-field banner.

### Work units
1. Inspect prior changes, real selectors, dictionaries, and storage contracts.
2. Remove redundant manual banner, extend consistent semantic button colors and wrap responsive text; address English dynamic copy and GPS picker.
3. Verify via Node regressions plus Chromium/WebKit mobile screenshots and geometry, repair findings before merge.

## Functional design rationale

- Manual: retain required distance/time/activity field semantics, `aria-required`, save validation and feedback at the appropriate action. Remove only the redundant progress paragraph (`要入力：…`), regardless of interface language.
- Course: selecting multiple surface types, editing percentages and saving a course remain unchanged. Preserve full accessible surface names and the stored surface IDs.
- Gait: preserve source/format identifiers, running/walking calculation restrictions, and validation. Wrap each independent error/warning in an escaped span so the existing English dictionary can translate it; add the one missing source warning mapping.
- Environment: preserve the distinction between a temporary selection and applying it to the optional note; leave inactive or disabled controls visually distinct.
- History: keep 2 period choices, source/type controls, saved records, and Shadow DOM. Brighten selected filter colors within the Shadow DOM rather than applying global document CSS.
- GPS backup: keep the real input and its import handler. Use the app-translated wrapper label as the visible selection control instead of duplicating OS-native picker text, which follows the device locale.
- Consultation and Learning: preserve their mode-selection behavior and readable neutral/white lesson panels. The role system changes bright actions, not text on every white/dark surface.
- Body and Equipment: its layout/color treatment is left intact.
- No changes to scientific reference model, calculation, original research, archived records, data schema, privacy guarantees, or three Result tabs.

## Screen-design rationale

**Bright/selected/primary** uses dark ink `#052939` on light cyan `#39cfd0`. **Dark-neutral/unselected** retains pale ink on its dark surface. **Disabled** uses visibly distinct legible dark treatment; destructive, purple/accented, and light lesson surfaces retain their semantic design. A single universal black-text rule would be an accessibility regression.

Gait labels are allowed to wrap, have sufficient height, and use two columns on narrow English phones. Course surface percentages and Environment chips can wrap rather than clip. A consistent ink/background role is preferred over identical colors regardless of contrast.

## Verification and limitations

- Unit/contract tests assert banner removal, retained required fields, independent translated gait warnings, color-role selectors, preserved module/PWA cache revisions, and no change to scientific processing.
- The browser auditor runs Chromium and WebKit at English/Japanese mobile widths, captures selected gait and environment states and the expanded History filters in addition to existing screens, tests gait label geometry and English control labels, and reports computed foreground/background contrast.
- Screenshot generation, automated measurements, and personal visual inspection are separate gates. A CI success does not substitute for inspecting the actual screenshot images. iOS native file-picker behavior and real-device visual checks cannot be fully established in browser emulation alone.
- Light mode remains an independent future design; don't automatically invert dark mode or change the user's current selected theme.
