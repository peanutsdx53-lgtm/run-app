# P11.1｜学習画面と公開経路の再監査（2026-11-10）

## 観測した事実
- 対象: peanutsdx53-lgtm/runload-app-v2 / main。2026-11-10 JST 現行親コミット `a487c356993c7ee4377c43b3b297be85325905b6`。
- P10 PR #68 は `cc74796a` として main 統合され、Pages 成功（GitHub Actions run 42666160603）。その時点の学習画面には淡色スタイルが含まれる。
- P11 `23b2a164` で濃紺・青緑学習シェル、6項目（ホーム・記録・履歴・探究・学習・設定）の下部ナビ、ヘッダーのメニュー・下向きアイコン削除をコード変更。続く `a487c356` で監査試験を調整。
- しかし `a487c356` の Pages build and deployment run 42671849101 は failure、Jobs 0。P11 audit run 42671849802 も failure、Jobs 0。2件の failed jobs 再実行は GitHub API 403「This workflow run cannot be retried」で拒否。**この観測ではアプリのCSS/JavaScript実行エラーが原因だとは断定できない。**
- 公開後のiPhone実機表示、キャッシュ更新、視覚受入は未確認。mainにコミットがあるだけで公開済みと扱わない。

## 今回の機能設計根拠（WHAT）
- 学習4教材と本人の学習済み申告・復習・出典・科学的限界、走行データや安全判定は変更しない。
- 設定の直接導線を6タブで保持し、不要なヘッダーのメニュー/インストール矢印を復活させない。
- Service Worker のキャッシュ更新識別子を変更して、公開が正常に行われた後に既存PWAが最新版を取得できる条件を確保する。ただしオフライン端末の即時更新は保証しない。

## 今回の画面設計根拠（HOW）
- 学習画面に残っていた動作図のキャプション、周期内ラベル、教材内見出し・補足、開閉記号、入力欄の明色スタイルを既存ホーム・探究系の濃紺/青緑へ統一。コントラスト、ラベル可読性、既存章構造は維持。
- `ui/unifiedLearningShell.css` のスタイルを増補し、HTMLの読み込みバージョン、PWAモジュールURL、SW cache name/明示的アセット、P11ソース監査のバージョンを `20261110-p11-unified-v2` に統一。
- 既存の6項目下部ナビ、空の非表示topbar、学習4教材の描画動線を保持。正式Currentは更新しない。

## 検証と解決条件
- コミット前に文字列/構造チェックで6項目ナビ・不要ボタン不在・CSS優先読み込み・4種のキャッシュ識別子が一致することを確認。
- ブラウザ・PWA・CI・GitHub Pages実機公開はGitHub実行結果で別途確認する。Jobs 0の障害が続く場合、ワークフロー設定/実行制限等をGitHub側で調査する必要がある。
- 本コミットだけを理由に「公開完了」「iPhone実機PASS」「自己理解の改善」を主張しない。

## CI実行後の更新（2026-11-10 JST）
- P11.1 コミット `8e8c2e0eb33a151924144fc4d1f16bcbc3bc4849` により Pages build and deployment run 42727929607 は成功し、UI Next smokeとP11 Chromiumブラウザ監査も成功。
- Research interpretation audit / Exploration editorial QA の単体試験工程が599件中5件失敗。詳細ログでは、P11 cache版 `v1` に固定した期待値と、学習教材のCSS/JS import版を実装とは異なる `p11` と想定していた試験の不整合を検出した。教材内容の誤りはこの結果から示されない。
- 失敗した5ファイルの版指定を現行 `index.html` (`p11-unified-v2`) / `app.js` (`p10-learning-v1`) / `sw.js` (`p11-unified-v2`) に整合。学習本文・科学計算・正式Currentは変更なし。
- 修正後のGitHub Actionsは新しいコミットで再確認する。iPhone実機合格は未確認。
