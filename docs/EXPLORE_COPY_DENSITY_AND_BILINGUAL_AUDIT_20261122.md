# Explore: full-copy and editorial-density audit — 2026-11-22

## Scope and authority

Baseline `main` commit: `5a9931158a24f896551a29308d0df35f3fa6c0b7`. Evidence includes four iPhone 16e screenshots provided by the user in English mode and direct GitHub inspection of all seven Explore categories, 28 topic definitions, 10 knowledge summaries, and six source-aware read-only inquiry panels.

**Request:** remove unnecessary always-visible labels, move highlighting legend/help to '?', remove the redundant Selected Category badge and status paragraphs, and eliminate Japanese UI copy in English mode. Changes apply symmetrically in Japanese and English where an element is removed, without altering the user's saved data, scientific calculation, approved Result tabs, or learning assessment.

## Observed source-level faults

1. The Highlighting Help dialog showed the Japanese title `強調表示の意味` even in English mode.
2. `Choose a Subject Area` repeated the highlight dot and its explanatory sentence under the graphic while the same explanation was available in Help.
3. `Selected Category` showed `記録とつながる`, an additional date/source summary, and visible swipe instructions. Repeated labels obscured topic selection and the single opening inquiry question.
4. A selected source rendered long no-record and no-automatic-substitution warnings in the foreground. These are essential *limitations* but do not need to be the first item on every topic card.
5. English strings were assembled dynamically for manual-run dates, fatigue responses, time/pace, source disclosures, category accessibility labels and research source citations without a matching translation. One body-learning link incorrectly included literal JavaScript concatenation in its visible text.

## Function design rationale and scientific boundaries

- **Relevance is not priority:** highlight markers indicate relation to entered or saved information, not injury risk, importance, bodily tissue load or research-backed personalized advice. The meaning remains available in the contextual Help dialog; labels and graphic marks are not removed from the orbital categories themselves.
- **No implicit record selection:** specialist read-only inquiry data is rendered in Selected Category only when a concrete manual run is explicitly identified and verified. A general topic remains accessible with no record; it must not show six standalone 'no record' explanations or change to another saved run automatically.
- **Provenance and limits remain accessible:** scientific-source caveats, comparison eligibility, source identity, missing values and the limits of subjective ROF-J remain in structured `details` controls, not erased. These are separate from recorded evidence and user experience. Dates do not establish activity-time order; ROF-J response categories cannot verify before/after timing; region reference values cannot diagnose injury or measure individual physical load. Past comparison is performed and checked only by the approved Results logic.
- **User-authored records remain untouched:** display translation does not overwrite stored notes, course names, dates or identifiers. The English dictionary distinguishes static sourced knowledge from strictly shaped, generated UI compositions. User free text remains in its original language. Read-only specialists are never converted into automatic inference or storage writes.
- **Questions and optional response remain:** the approved single question per theme and the three-stage process (clues from records, interpret with personal experience and limits, optional reflection) are preserved. Users can still navigate to Learning, History and Results.

## Screen design rationale

- Orbital card: keep seven subject-area choices and their actual highlight states; move the highlight dot explanation and navigation instructions to the contextual `?` dialog. The small card-specific `?` works alongside the page-level Help.
- Selected Category: remove the 'record-related' badge, prominently displayed source summary and swipe instruction paragraph. Preserve the category title, selected topic, previous/next controls, single inquiry question and action links. The simplified read-only cards expose directly relevant numeric facts rather than redundant 'Review Your Information' headings and repeated diagnosis warnings.
- Put saved-run provenance, missing-comparison/life-record rules and study-source details behind semantic `details`, with keyboard-accessible summaries. Never disguise critical validation failures.
- Reuse mobile spacing, color roles and focus affordances. The display must not induce whole-page horizontal overflow or render source-code concatenations as visible text.
- The Body and Equipment inspired button scheme introduced in PR #54 remains unchanged; Explore has its own already established action hierarchy.

## Translation coverage

- `ui/englishExploreKnowledge.js` covers ten knowledge summaries, research limitations and attribution text as exact display translations, without extending the studies' scope.
- `ui/englishExploreDynamic.js` matches source-scoped, recognized generated UI strings, including ROF-J response values, dates, distances, hill proportions, selected run captions, citations and orbital accessibility labels. It does not blanket-translate arbitrary user-authored text.
- The active English UI pipeline loads both translation modules and the new PWA precache references them; a new cache version prevents stale UI on supported offline loads.

## Evidence and verification

- First exhaustive Chromium scan: **255 cases**, **28 distinct Japanese system strings / 726 repeated appearances** in English mode, with zero whole-page overflows and JavaScript errors. One body link displayed literal concatenation; traced to its source template and repaired.
- After corrections: **Chromium 255 cases, 0 untranslated UI strings, 0 overflow and 0 page errors**. **WebKit 255 cases, 0 untranslated UI strings, 0 overflow and 0 page errors**. Coverage includes all 28 topics, both ordinary and explicitly selected saved-run contexts, opened disclosures, and both relevant modal Help types.
- Actual 390px screenshots for the Course & Environment and Fatigue & Recovery selected-run cards on both engines were inspected. Display source values are synthetic test records, not user study outcomes.
- The latest Node regression before the strict-mode assertion was **785/785 PASS**. CI now enforces zero remaining untranslated generated UI strings via `RUNLOAD_EXPLORE_STRICT=1`, and screenshots plus JSON reports are retained as workflow artifacts.
- Cross-screen checks (including 200% root text size and 320px/390px/768px/desktop layouts, record integrity and offline shell) are the existing regression workflows; any full-suite pass must be checked for the final commit before merging.

## Deferred and nonclaims

This change does **not** establish that RunLoad improves self-understanding or fitness; it does not generalize study samples to all beginners, alter the interpretation formulas, infer an injury risk or reassign an unselected run. Full user-device manual acceptance beyond automated Chromium/WebKit viewport simulations remains separate.

No approved `/RunLoad/Current/` research files were edited.
