# UX05 — First-use progression and Home first impression (strict bounded revision)
Date: 2026-11-22. Stage **05 of the approved fixed 20-stage UX plan**, UX-015–022. Base main: `e6a9b45dc39cdc76a13629d1935b934999c92a39` (UX04 integrated). **Not an empirical study**; evaluation is design/technical consistency, not self-understanding improvement.

## Functional design rationale (WHAT / WHY)

RunLoad's first-use sequence contains eight screens, of which five middle chapters are optional guidance, while the Terms of Use and Privacy Policy require **separate explicit acknowledgment**. This distinction supports an interruptible, realistic information-recording workflow rather than falsely describing all eight screens as compulsory research tasks. On 320–768px, the desktop eight-item sidebar is not visible. The existing progressbar exposes a numeric position to accessibility APIs but gives a visually ambiguous row of eight unnumbered dots. Users may not know how much is left or what they are deciding now.

The Home screen must prioritize an explicitly chosen manual/GPS recording route when saved-run history is *readable and empty*. When storage reads fail, it must **not** claim that zero runs exist. Daily condition is self-report only, and missing days are **not zero hours**. Milestones report past saved manual running records, not prescribed goals, health diagnosis or ability ratings. Changing prominent milestones without measured benefit may make retrospective review less accessible, so avoid a speculative removal or ranking change.

## Screen design rationale (HOW / WHY)

- Show current **stage name** (using the pre-existing `FIRST_USE_STEPS` list) and an exact visible `1 / 8`–`8 / 8` fraction in the onboarding header, including the language choice and required legal consent. Keep the five-chapter optional-guide footer separate. Existing step order, skip rules, independent consent checkboxes and legal document bodies are unchanged.
- Permit status text and header to wrap when 200% root text/320px make an English stage name long; never ellipsize or hide stage information. The desktop sidebar and eight-segment progressbar remain.
- **Visual follow-up from first real-browser screenshot:** at 320px/200% root text, the Japanese short Home title broke into “ホー / ム”, and the Condition title broke into syllabic fragments beside Edit/Help/Open. These are readable but materially harder to scan. Retain full text size; only on narrow screens let adjacent controls wrap instead. Existing layout and card order are unchanged.
- Keep the compact Home **編集 / Edit** visible label to fit 320px and 200% typography; provide an explicit `aria-label="ホームの表示を編集" / "Edit Home Layout"`, switching to `編集を終了 / Finish Editing` in edit mode. Card editing still saves each drag/visibility/width change immediately; the ARIA label does not create a new save action.

## Eight candidate decisions and degradation re-check

| Candidate | Decision | Evidence and regression reason |
|---|---|---|
| UX-015 (B) | **Implement** small explicit step status | 8 unnumbered segments + hidden sidebar on phone; 8-step name/fraction pairs verified in JA/EN and zoom |
| UX-016 (V) | **Verify only** | Both languages already have buttons with one `aria-pressed=true`; do not auto-select or silently overwrite language |
| UX-017 (B) | **Local fix + preserve existing Home order** | Latest Activity already first and full width with the Record a Run link. The first narrow 200% screenshot revealed mid-word Home/Condition heading wraps. Permit Edit/Help/Open to wrap rather than shrinking or cutting headings. Six other cards remain reachable and movable; no forced simplification |
| UX-018 (B) | **No code change** | Unrecorded achievements show four named, unearned states and no fictitious completed milestones. Removing the 0/50 display or hiding the card without a comparative task test risks concealing milestone affordances. Reconsider only with grounded side-by-side evidence |
| UX-019 (B) | **Implement scoped layout repair; retain meaning** | The explanation that missing days are not zero hours stays visible. The 320px/200%-text Japanese 3-column metrics were overlapping and became unreadable. Render metrics as 2 columns plus a full-width third row at <=390px, as English already does, allowing labels/values to wrap without inventing missing data or omitting a metric |
| UX-020 (B) | **Implement accessible control label** | "Edit" alone is ambiguous but longer text at 320px/200% can displace the guide control. Preserve short visual label, clarify purpose through programmatic name. Condition/Achievement already have distinct accessible labels |
| UX-021 (V) | **Verify only** | Empty Latest Activity already shows the one Record a Run CTA, not placeholder 0 values. On read failure, the CTA is withheld and source failure stays visible |
| UX-022 (V) | **Verify only** | Courses, Learning, Consultation/Sharing shortcuts are already `#/course`, `#/learning`, `#/consultation`, with no duplicate shortcuts. Do not add new ones |

## Additional visual counterexample and responsive comparison

The **first corrected screenshot** at Japanese 320px/200% showed the full Home and Condition titles, but **three condition metric labels still overlapped adjacent cards** (“睡眠”, “起床時の調子”, “直近7日の入力”). This is a genuine loss of legibility, not an assumption about user satisfaction. The original English implementation already laid out this card as two columns with its third metric full width on small screens. UX05 adopts that pattern for both languages at <=390px and adds text-wrap rules for labels, recorded values and source units. At 100% Japanese, this also increases the card from a single compact 3-column row to a clearer 2+1 row; this is a documented density tradeoff rather than a hidden side effect. The card preserves all three unaltered values (no sleep record, no morning-condition answer, number of logged days / 7). The existing disclosure that missing sleep days are **not** zero hours remains visible. The new browser test checks metric text containment and separate card bounds at 320/390px with 200% zoom across both languages and both engines.

## Acceptance and negative tests

`tests/ux05OnboardingHomeContract.test.mjs` checks all eight Japanese source stages and explicit English translations, progressbar counts, single language selection, independent dual legal acknowledgments, guide deferral limited to chapters 3–7, empty vs failed storage, 4 unearned milestones, original 3 shortcuts and new editor accessible name.

`tests/ux05OnboardingHomeBrowser.mjs` verifies real **Chromium/WebKit × JA/EN × 320/390/768/1440 × 100/200% = 32 full browser conditions**, each with all eight onboarding steps (256 stage states), original consent gate, optional guide path, explicit 1/8–8/8 header and clickable Home entry in an isolated user session. Representative step 1/2/7/8 and empty Home screenshots are saved under `audit-output/ux05-intro-home-${engine}`. Header/document horizontal overflow and **narrow 200%-font Home/Condition mid-word heading wraps** are hard failures; no shortening of legal or user-authored text.

Complete Node/scientific/storage tests, all standard browser regressions, two-run saved-record continuity, offline precache/installed PWA, S09 Results screenshots, and Pages build must also pass. If any issue appears in a source, saved-run ID, original scientific reference, user text, consent, or 3 Results tabs, **HOLD/stop merge**.

## Scientific and device limits

This stage creates no evidence that wording increases beginner runners' self-understanding, running safety, engagement, or motivation. Missing/zero and reference-study eligibility remain separate. Browser simulated root font 200% is not physical iOS/Android Dynamic Type or VoiceOver/TalkBack certification. Formal `RunLoad/Current` files are not edited. User-entered notes and legally required texts are not translated or rewritten.

## 2026-11-23追補｜マージ後の確定GitHub状態・未認定範囲

この見出しより前は、当時のDraft/FAIL/HOLD、設計判断、実画像所見を時系列証拠として保全した。下記は**後日、GitHubのマージ・統合後main Actionsを独立照合して追記**したものであり、初回失敗の履歴を削除・改ざんしない。

- **実装と統合**：[PR #59](https://github.com/peanutsdx53-lgtm/run-app/pull/59) は **merged**（2026-11-22T14:17:03Z）。正式なmainのマージコミットは [`a1c75483682a7189cecfaa53711723652867a0b6`](https://github.com/peanutsdx53-lgtm/run-app/commit/a1c75483682a7189cecfaa53711723652867a0b6)。このコミットは現在のmain `576a8da31aa2392ac8ca62390b4997c0e409c296` の直系祖先として確認。
- **統合後自動回帰**：[Run App regression #45031977630](https://github.com/peanutsdx53-lgtm/run-app/actions/runs/45031977630) は `completed/success`、**必須18/18ジョブSUCCESS**。任意の公開Pagesバイト同一性・ライブブラウザ照合ジョブは `SKIPPED`。これを公開実体一致や全実画像独立目視の証明と誤記しない。
- **mainのPages**：[Pages build and deployment #45031976739](https://github.com/peanutsdx53-lgtm/run-app/actions/runs/45031976739) は `completed/success`。Pages実体の配信バイト比較は別ゲート。
- **ブラウザ用画像/JSON証拠の所在**：上記統合後回帰Runに `ux05-onboarding-home-chromium`（Artifact ID `14757882428`）と `ux05-onboarding-home-webkit`（ID `14758790956`）が存在し、照合時点で `expired=false`。成果物の存在・ジョブSUCCESSは確認したが、ここで個別ファイルの全件目視を新規実施したわけではない。
- **工程対象と限界**：UX-015〜022：初回導入・ホーム。8段階、空状態と未取得、200%での可読性をブラウザで検証。利用者実験の受入ではない。
- **今回認定できる状態**：`MERGED-CI`（第05回のmain反映と同一SHAの必須CI/Pagesを確認）。**全32表示状態の人手視認性、正常/反例の独立再審査、実機、利用者受入、最新版G1〜G8の正式承認は本追補ではPASSにしない**。最新進捗はLibrary `/RunLoad/RunLoad_UX_固定20回_進捗管理_20261123.md` で区別する。
