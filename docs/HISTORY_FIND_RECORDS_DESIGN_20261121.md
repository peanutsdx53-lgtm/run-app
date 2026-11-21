# Find Records progressive-disclosure UI update — 2026-11-21

## Functional design rationale (WHY / WHAT)
Preserve search-period behavior, source and activity-kind filters, keyword entry, row selection, and saved-history scope. All Time extends the search across saved dates; monthly aggregations above the card still refer only to the displayed month. Never synthesize saved records or translate user-authored text.

## Screen design rationale (HOW)
The user requested a less cluttered Find Records card with consistent sizes and appearance for horizontally/vertically aligned options, and explanatory text hidden behind a collapsible element or a question-mark help control. Group controls into Search Period (two equal-width cells), Recording Method (three equal-width cells), Record Type (three equal-width cells), then a full-width search input. Give every option a consistent border, corner radius, minimum 52px height, and grid-row stretch so longer text does not enlarge only one button.

Keep the context-specific search hint and the All Time/monthly-summary scope caveat inside a local native details/summary '?' beside Find Records, closed by default. Keep the existing general History help independently.

## Japanese, English and accessible operation
- Search Period = 検索期間; Recording Method = 記録方法; Record Type = 記録の種類.
- Restrict the concise English label Manual to the History source-filter button; other contexts still use Manual Entry.
- Native details/summary supports keyboard activation; the help trigger is at least 44px high and has a translated accessible label.
- Preserve original data-history-scope, data-record-source, data-record-kind, hx-search and aria-pressed controls.
- User-authored record data remain unchanged.

## Verification and limits
Regression tests added for group structure, hidden help, all-time hint, grid widths, equal button-height rules and English translations. Browser confirmation still needed for 320/390px mobile widths, Japanese/English, high zoom, source/type/date combinations, iOS keyboard input focus, and PWA refresh. Scientific methods, stored records and IDs, results three-tab layout, privacy behavior, and official Current are unchanged. No user-outcome claim is made.
