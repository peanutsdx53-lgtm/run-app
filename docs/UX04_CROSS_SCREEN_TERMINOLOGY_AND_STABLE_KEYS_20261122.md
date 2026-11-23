# UX04 — stable cross-screen action terminology and bilingual navigation contract
Date: 2026-11-22. Stage 04 of approved fixed-20 UX work, UX-005 / UX-006 / UX-014. Base main `2a3cfb9c9535bbddfe0c7feabd0e14683ab9a1c0`.

## Strict problem and design decision
A large legacy `englishUi.js` dictionary translates complete Japanese UI strings after DOM rendering. It works for current reviewed phrases but may silently miss a new English equivalent when Japanese button copy is edited. Merging all translation dictionaries, rewriting existing legal/science copy, or auto-translating the user's own words would carry disproportionate risk.

**Functional reason:** user-visible actions must describe their actual effect, and navigation must not imply saved mutations. Never treat select, apply to current draft, save, return without applying, or view information as interchangeable. An action key denotes **display meaning only** and cannot commit a record, pick an unselected saved run, apply an unsaved course or alter origin/eligibility.

**Screen reason:** preserve the existing five mobile and seven desktop labels, affordance colors and layout. Tag these known links with semantic key `nav.<route>`, action kind `navigate`, and map explicitly to Japanese/English text. For these first adopted links, translation no longer depends on the mutable visible Japanese phrase. Existing untagged controls keep the legacy translator until separately reviewed. Do not recolor all buttons or add longer explanations to cards.

## Audited action-language decisions
| Intent | Japanese UI | English UI | Actual effect / distinction |
|---|---|---|---|
| Navigate to Home | ホーム | Home | Open Home; no data change |
| Navigate to Record | 記録 | Record | Open manual/GPS entry; do not save |
| Navigate to Results | 結果 | Results | View saved-result context; no persistence |
| Navigate to History | 履歴 | History | Open history; no record chosen automatically |
| Navigate to Explore | 探究 | Explore | Open exploratory topics, not personalized diagnosis |
| Navigate to Learning | 学習 | Learning | Open learning, no score inference |
| Navigate to Settings | 設定 | Settings | Open preferences and data management |
| Commit a run | 走行記録を保存する | Save Activity Record | Persist only after required-field review |
| Commit notes | メモを保存 | Save Notes | Store optional note; **not** a run save |
| Apply draft conditions | 条件を反映して記録に戻る | Apply Conditions & Return | Affect current draft, not old saved activities |
| Return without applying | 反映せず戻る | Return Without Applying | Leave chosen conditions unapplied |
| Choose a region | 部位を選ぶ | Select a Region | Choose a view/input focus, not medical risk |
| View results | 結果を見る | View Results | Navigate, do not save |
| Open help | 使い方 | Help | Disclose support; not a primary action |

The seven generic action examples are a **glossary/reference only**, not mass-injected into existing screens. Only actual navigation anchors are tagged in the current stage. Existing consent, delete confirmation, save error, unknown-source and scientific study-applicability phrasing is protected.

## Implementation and acceptance
- `ui/actionCopyKeys.js` is a pure, frozen, opt-in JA/EN mapping. It reads no storage and does not rewrite any saved text.
- `app.js` puts a stable `data-ui-copy-key="nav.<route>"` and `data-ui-action-kind="navigate"` on mobile and desktop links, without changing routes, order or labels.
- `ui/englishUi.js` looks up a key for an explicitly tagged text node before continuing existing exact-match fallback. It leaves user-authored, legal and aria attributes under existing protections.
- `tests/ux04ActionCopyKeys.test.mjs` tests every key, route, action distinction, opt-in guard, unchanged user text, and exact offline cache generations. A bilingual browser test (Chromium/WebKit × 320/390/768/1440 × 100/200% × JA/EN) checks visible labels and route identity at run time.
- CI must also pass full Node/science/record regression, installed-PWA offline, two-run continuity, Results S09, and standard contrast checks.

**Explicitly not claimed:** a redesign of every existing screen/CTA, better user understanding proven empirically, physical-device VoiceOver, linguistic validation of scientific references, or approval of formal 29 criteria. This is a bounded migration of **navigation text only**, with a reusable pattern for future UI. If changing buttons in other screens would weaken scientific or saved-data explanations, leave them for their relevant numbered stage.

## 2026-11-23追補｜マージ後の確定GitHub状態・未認定範囲

この見出しより前は、当時のDraft/FAIL/HOLD、設計判断、実画像所見を時系列証拠として保全した。下記は**後日、GitHubのマージ・統合後main Actionsを独立照合して追記**したものであり、初回失敗の履歴を削除・改ざんしない。

- **実装と統合**：[PR #58](https://github.com/peanutsdx53-lgtm/run-app/pull/58) は **merged**（2026-11-22T13:28:59Z）。正式なmainのマージコミットは [`e6a9b45dc39cdc76a13629d1935b934999c92a39`](https://github.com/peanutsdx53-lgtm/run-app/commit/e6a9b45dc39cdc76a13629d1935b934999c92a39)。このコミットは現在のmain `576a8da31aa2392ac8ca62390b4997c0e409c296` の直系祖先として確認。
- **統合後自動回帰**：[Run App regression #45027706618](https://github.com/peanutsdx53-lgtm/run-app/actions/runs/45027706618) は `completed/success`、**必須18/18ジョブSUCCESS**。任意の公開Pagesバイト同一性・ライブブラウザ照合ジョブは `SKIPPED`。これを公開実体一致や全実画像独立目視の証明と誤記しない。
- **mainのPages**：[Pages build and deployment #45027706510](https://github.com/peanutsdx53-lgtm/run-app/actions/runs/45027706510) は `completed/success`。Pages実体の配信バイト比較は別ゲート。
- **ブラウザ用画像/JSON証拠の所在**：上記統合後回帰Runに `ux04-action-copy-chromium`（Artifact ID `14756143592`）と `ux04-action-copy-webkit`（ID `14756831473`）が存在し、照合時点で `expired=false`。成果物の存在・ジョブSUCCESSは確認したが、ここで個別ファイルの全件目視を新規実施したわけではない。
- **工程対象と限界**：UX-005/006/014：日英共通操作語・画面遷移キー。全画面・研究文献・法的原文の翻訳精査を完了したとは判定しない。
- **今回認定できる状態**：`MERGED-CI`（第04回のmain反映と同一SHAの必須CI/Pagesを確認）。**全32表示状態の人手視認性、正常/反例の独立再審査、実機、利用者受入、最新版G1〜G8の正式承認は本追補ではPASSにしない**。最新進捗はLibrary `/RunLoad/RunLoad_UX_固定20回_進捗管理_20261123.md` で区別する。
