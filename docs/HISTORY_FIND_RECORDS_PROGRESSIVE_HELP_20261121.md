# Find Records: progressive filters and inline help — 2026-11-21

## User observation and scope
An iPhone screenshot showed the Find Records '?' guidance behind Search Period and thus unreadable. Three vertically stacked groups were visually heavy even after equal-size buttons. The user explicitly approved redesign together with a visibility fix.

## Functional design rationale (WHY/WHAT)
Preserve the same search predicate for calendar month or all-time scope, source (all / MANUAL / GPS_V2), type (all / run / rest), free-text query, record selection, results, and month-bounded aggregate semantics. A collapsed source/type section must never clear active selections. The count indicator exposes the number of non-default source/type constraints, including while collapsed. Do not persist this presentation-only disclosure state to saved run or GPS storage.

## Screen design rationale (HOW)
Show search input first, then the two-option search-period selector. Fold Recording Method and Record Type behind an accessible More Filters button (Japanese: 詳細な絞り込み), with aria-expanded and a controlled advanced panel; default closed, expanded state retained through filter rerenders. Each opened group retains equal-width buttons, consistent minimum heights, borders, colors and rounded corners; Recording Method receives the same recessed group container as Record Type.

Place the local '?' details/summary directly after the Find Records heading in DOM flow, not in a floating overlay above Search Period. The trigger remains visually at top-right using absolute positioning, but its revealed body has position:static and pushes search and period down. Avoid relying on z-index to conceal the overlapping problem. Preserve general History help independently.

## Bilingual and accessibility
Use explicit Japanese/English mapping for More Filters and Active Filters. Keep the English Manual abbreviation scoped only to the History source filter. Native details summary is keyboard operable with a 44 px target; advanced toggle is a button with aria-expanded and aria-controls. User-authored notes and course names remain untouched.

## Verification, limits and excluded modifications
Node tests check new disclosure structure, state persistence semantics, dynamic filter count, localization, and CSS contract. Chromium and WebKit visual tests at five viewport widths and both languages inspect initial compact layout, opened help body versus search bounds (no overlap), open and closed advanced controls, equal grid cell geometry, and retained GPS filtering. The scientific model, saved-data contracts, privacy boundaries, results three-tab design and official Current are not modified. No efficacy claim about user self-understanding follows from this UI change.
