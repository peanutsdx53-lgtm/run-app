# Course planning: English mobile layout, button contrast and prospective light mode (2026-11-21)

## Observation and verified cause
The 390px English Course editor had two rows of two grade controls and three stacked surface-mode choices. Japanese retained one row of four and one row of three. The prior English-only media queries deliberately changed the layout to fit long translations. Dark text on light-cyan actions and white text on gradient selections were mixed across screens.

## Functional-design reasons
Keep all stored grade mode values UNKNOWN/FLAT/SUMMARY/SECTIONS, surface modes UNKNOWN/SINGLE/MIXED, eight surface identifiers, proportions, calculation, save, revision, source, and privacy behavior. No inference about route slopes or surface, no change to research reference methods, three result tabs or official Current.

## Screen-design reasons
At ordinary mobile font sizes, shorten only the English Course selectors to Unknown / Flat / By % / Segments and Unknown / Single / Mixed %, aiming at four and three equal-width controls in one row. Show the eight surface choices in two columns. Limit only surface-tile visible names to Running Track and Packed Dirt, retaining full Athletics Track and Compacted Dirt Road elsewhere and full names in the buttons' aria-label. At 200% root font, responsive grid min-widths in rem permit wrapping to two or one columns so no text is truncated. Japanese layout, source labels, data attributes, keyboard focus, and selection behavior remain.

## Contrast and button roles
Bright selected Course choices and the Course primary action use #39CFD0 with #052939 dark ink; dark backgrounds remain with light ink. Keep selected borders, focus outlines and aria-pressed state. Avoid assigning one text color indiscriminately across dark and light backgrounds. Test both ends of all gradients and actual computed colors. Aim at WCAG 2.2 AA: normal text >=4.5:1, large text >=3:1, and non-text selection/focus components >=3:1 where applicable.

## Light mode — separate design phase, not implemented
Define semantic tokens for page background, surface, inset surface, primary and muted text, interactive idle, selected, focus, success, danger, chart axes and colored encodings; provide distinct light and dark values. A simple CSS inversion is not acceptable. Stage a reversible Settings preference (Dark / Light / System) preserving Dark as the existing default until explicitly chosen, and test all 26 functions, charts, maps, notes, shadows and contrast rather than just main buttons. Do not introduce cross-device storage or reset saved records in the theme change. User benefit remains untested.

## Verification gate
Use CI Chromium and WebKit to produce **real screenshots**, including English 320/390 widths, Japanese 320/390, 200% root font and selected/mixed states. Verify geometry, computed color, full accessible label, data integrity and no overflow. Download PNGs and inspect them personally before claiming completion. CI pass alone is insufficient. Physical iPhone check remains separate.
