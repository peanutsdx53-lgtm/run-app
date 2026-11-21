# Settings Profile: consolidate Optional heading — 2026-11-21

## User observation and functional design basis
The Settings Profile editor repeats optionality as an "All Optional" pill and beside Display Name, Running Goal, Height, Weight, and Age Range. The user asked to follow the Record screen convention and display one optional-status marker at the section's upper-right.

All five profile fields remain optional. Blank values, local-only profile storage, field identifiers/names, native selectors, input bounds, editing, save and error handling are preserved. No changes to onboarding consent, GPS, backup, running science, or the official Current.

## Screen design basis
The Profile accordion already has a right-side "Editable" hint next to its chevron. Replace this hint with "任意" / "Optional", which visually parallels the Record page's right-aligned additional-information label. Remove the "すべて任意" pill and all repeated per-field "任意" labels, including "一つ選択・任意". Shorten the accordion description to "身長・体重・走る目的など" / "Height, Weight, Goals, and More". Retain the statement that the data are stored on the device and not sent automatically. Remove the unused optional pill CSS, keep a muted, legible, right-aligned heading indicator, and avoid changing general Settings visual language.

## Translation and accessibility
The shared English UI maps the single "任意" status to "Optional". Field labels remain actual labels associated with input elements; none is converted to placeholder-only text. Heading remains native details/summary keyboard-operable.

## Tests, limitations
Add Node assertions for exactly one optional marker within the Profile accordion and preservation of five named input fields, plus English translation assertions. Extend Settings compact Chromium/WebKit browser checks to expand the Profile in ja/en at widths 320–1440px and zoom up to 200%, verifying that the marker is right-aligned and unclipped and no field-level optional labels remain. Save focused screenshots for visual review.

This is a presentation change only; no claim is made about user outcomes. PWA stylesheet/module/cache revisions are updated for offline users. Record, History, result tabs, scientific sources, and formal Current are unchanged.
