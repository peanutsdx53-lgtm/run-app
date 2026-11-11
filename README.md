# 走行記録と振り返り｜走行情報の解釈を支援するWebアプリ

本リポジトリは、**本人が記録した走行の事実・本人申告・適格な文献参考値を区別して解釈する**日本語Webアプリの実装・内部評価用です。**GitHubでの公開は、一般向けの正式なリリースやアプリストアでの配布を意味しません。** 研究資料の原本や本人の実記録を無断で置換・移行しません。

**現在の状態（2026-11-10）**：主要20画面、記録・結果・履歴・任意の問い、原著の条件を踏まえた部位内参考値、手入力・スマートフォン向けGPS測定、任意ROF-J、コース、仮の走歩比較、共有向け画面、ローカル保存、PNG出力、PWA・オフラインの実装があります。対象幅320/390/1440pxのChromium/WebKitブラウザ試験を行っています。全機能の実機品質と科学的・学術的な総合成立を表すものではありません。

## 研究目的と表示上の限界

本アプリが扱う「走行状態」は、本人が記録・申告した経験上の状態です。**身体組織への負荷を直接測定する機器、診断、傷害リスク予測装置ではありません。**

- **事実**：入力した距離・時間、またはGPSが実際に受信した位置点等の出所を保つ。平均ペースは当該距離と時間からの計算値。
- **主観**：ROF-Jは本人が任意回答する0〜10の疲労感。0は有効回答、未回答とは異なる。回答時刻と運動前／後のラベルは、実際の時間的前後関係を無条件に証明しない。
- **文献参考値**：採用文献の観測条件・速度範囲・部位と計算経路が適格な場合だけ算出する。各部位**自身**の基準100であり、部位間を共通の物理単位で順位付けしない。一般の初心者への予測精度・健康状態の判定は意味しない。
- **仮の比較**：シミュレーションは入力した時間・ペース・走歩区間の算術結果。走行能力や身体負荷を予測せず、実績へ自動保存しない。
- **利用者効果**：内部の実装・整合性試験は、初心者ランナーの自己理解が実際に向上したという実証ではない。

保存された記録へのリンクは実在するIDのみを使用し、メモの変更・削除は本人の操作で行います。GPS詳細軌跡の保存は初期OFFで本人選択制です。相談用の出力では要配慮の詳細情報を自動公開しません。

## 起動方法（一般的なPC、VS Code/Live Server）

外部有料サービスやビルド工程を要求しない、静的HTML/CSS/JavaScriptの構成です。

1. このリポジトリのファイル群を取得（GitHubの「Code」→「Download ZIP」、または移行先リポジトリのURLを確認して `git clone`）。
2. 取得したフォルダで `python3 -m http.server 8000` を実行するか、VS CodeのLive Serverで`index.html`を配信します。
3. ブラウザで `http://localhost:8000/` を開き、初回案内を確認します。手入力の確認・保存・結果・履歴・探究はPCでも操作できます。**GPS測定はスマートフォン専用**であり、PCからの直接URLでも開始できません。
4. 本人の実記録を検証用に使う必要はありません。**本リポジトリの試験は隔離したブラウザ領域を使用**し、試験シナリオによる一時記録だけを作ります。

GitHub Pagesの配信先はリポジトリ移行後に確定するため、本書には固定URLを記載しません。配信されるWebページはPWAとして追加できますが、**一般向けの正式リリースではなく、iPhoneアプリのIPAやAndroidのAPKでもありません**。ローカルHTTPサーバーでのPWA登録・実機GPS権限は環境と安全なコンテキストに依存します。オフライン試験はキャッシュがない初回とインストール済みの再訪を区別しています。

## English interface / 英語版

**English is now an available display language**, not a “preview” choice. At first launch, select **English** on the language screen. Existing users can switch in **Settings → Display and Language → English**. The preference remains on this device and survives reloads; Japanese can be selected again from Settings.

英語版は、初回起動の言語選択または「設定 → 表示と言語 → English」から利用できます。英語選択と日本語への復帰は保存済みの走行原本・科学的計算・GPS位置情報を書き換えません。初回の言語選択だけでは、利用規約への同意は成立しません。

English translations cover the first-use guide, manual recording, review, results, history, GPS recording and replay, environmental conditions and ROF-J responses, optional personal notes, course planning, simulations, the four available learning lessons and quizzes, Explore topics, consultation/print/PDF reports, backup/restore/deletion instructions, and common errors. No external translation service is used. **Your personal notes are preserved in the language you entered.** Scientific references do not constitute measured tissue loads, injury-risk predictions, or medical diagnoses; zero and unanswered fatigue scores remain distinct.

**Legal-document limitation:** The original Japanese Terms of Use and Privacy Policy remain the authoritative legal text. English article-by-article *reference translations* are provided alongside the originals. These English reference texts have **not undergone independent legal review**. English language selection does not bypass explicit consent. Other untranslated strings may still occur in uncommon errors or dynamically constructed combinations; such strings should be reported rather than treated as certified English completeness.

Automated regression: `node --test tests/englishUi.test.mjs tests/firstUseExperience.test.mjs tests/settingsExperience.test.mjs`, plus `RUNLOAD_BROWSER_ENGINE=chromium node tests/englishUiBrowser.mjs` and `RUNLOAD_BROWSER_ENGINE=webkit node tests/englishUiBrowser.mjs`. The full-app research and physical-device reviews are separate from the translation rollout. The older implementation history remains documented in [the English UI implementation notes](docs/ENGLISH_UI_PREVIEW_IMPLEMENTATION_20261111.md).

## テスト再現（開発・内部評価）

推奨：Node.js **22**、Python 3（HTTPサーバーを使う場合）。ブラウザ自動試験にはPlaywright 1.56.1を用います。npmのインストールは**テスト時だけ**でありアプリ起動時の通信依存にはしません。

```bash
node --test tests/*.test.mjs
npm install --no-save playwright@1.56.1
npx playwright install --with-deps chromium webkit
RUNLOAD_BROWSER_ENGINE=chromium node tests/screenDesign20PopulatedBrowser.mjs
RUNLOAD_BROWSER_ENGINE=webkit node tests/screenDesign20PopulatedBrowser.mjs
RUNLOAD_BROWSER_ENGINE=chromium node tests/uiux02Stage0406Browser.mjs
RUNLOAD_BROWSER_ENGINE=webkit node tests/uiux02Stage0406Browser.mjs
RUNLOAD_BROWSER_ENGINE=chromium node tests/uiux06TargetBrowser.mjs
RUNLOAD_BROWSER_ENGINE=webkit node tests/uiux06TargetBrowser.mjs
node tests/offlineShellBrowserSmoke.mjs
```

`--with-deps`はLinux CI用の追加システムライブラリをインストールするため、端末・OSによって管理者権限や代替手順が必要です。Windows/macOSでは通常`npx playwright install chromium webkit`等を使用します。自動試験のGPS位置点はテストが明示的に注入した入力で、実機屋外測位ではありません。

試験結果は、実行したリポジトリの**Actions**にコミットSHAごと保存します。全20画面のChromium/WebKit受入、研究解釈監査、二走行の連続性を別々のテストで確認します。特定コミットでの成功を、無条件に後続コードや別の端末環境へ拡張しません。

## 研究資料の取り扱いと成立条件

承認済みの成立条件正本は、非公開Libraryの `/RunLoad/Current/Governance/08_成立条件_承認済みV0.2_内容不変.md`（R12/C12/F5、計29件）です。**研究の正式Currentや権利保護された原典PDFを、この公開リポジトリのREADME・配布ZIPに同梱しません。** 研究原典の全件照合、独立計算、ライセンス監査、正式Current採用は、画面試験と別に行う必要があります。

- [第1〜6回のUI/UX改修と工程19の横断受入](docs/UIUX_20261102_工程19_全20画面横断受入_実装検証記録.md)
- [承認済み29成立条件の暫定再査定](docs/ACCEPTANCE_V02_29_GATES_20261102_現行証拠暫定再査定.md)
- [素材・許諾に関する管理](assets/ASSET_REGISTER.md)
- [インストール案内](docs/INSTALL.md)
- [研究の科学的・走歩混在の適用範囲](docs/RESEARCH_AND_MIXED_SCOPE_20261027.md)

現時点で**全29条件の正式PASSは未認定**です。物理iPhone/Androidの屋外GPS、位置権限拒否と中断復帰、OS読み上げ・拡大・タッチ操作は別の実機受入に残します。その他の非実機監査を先に行います。

## セキュリティと本人の記録

記録は端末側の保存領域に格納します。共有端末、ブラウザデータ削除、プライベートブラウザ、端末容量不足などでは保存を保証できません。バックアップ出力は暗号化されず、GPS詳細を本人が保存した場合は位置情報を含み得ます。バックアップを他者へ不用意に送らず、安全な保存場所を選んでください。保存済みデータ削除は本人が確認手順を行った場合のみ実行します。開発・試験ではユーザー本人の実記録を削除・移行しません。

## 更新履歴

本リポジトリの初期段階（2026-10-23〜26）はデモ主体でした。その後、科学計算・保存・GPS・PWA等を段階的に接続しています。初期の「すべて架空のデモ」「保存は未接続」「GPS開始不可」という説明は**現行コードには当てはまらない**ため、READMEの現状説明を本版へ更新しました。過去の設計経緯は `docs/` に残しています。
