import {ENGLISH_RECORD_HISTORY_COPY} from './englishRecordHistoryCopy.js';
import {ENGLISH_RESULT_COPY} from './englishResultCopy.js';
import {ENGLISH_GPS_EXPLORATION_COPY} from './englishGpsExplorationCopy.js?v=20261111-exploration-inquiry-v1';
import {ENGLISH_SETTINGS_COPY} from './englishSettingsCopy.js';
import {ENGLISH_GUIDE_COPY} from './englishGuideCopy.js';
import {ENGLISH_LEARNING_COPY} from './englishLearningCopy.js';
import {ENGLISH_CURRICULUM_ORIGIN} from './englishCurriculumCopy.js';
import {ENGLISH_CURRICULUM_PACE} from './englishCurriculumPace.js';
import {ENGLISH_CURRICULUM_MOTION} from './englishCurriculumMotion.js';
import {ENGLISH_CURRICULUM_FATIGUE} from './englishCurriculumFatigue.js';
import {ENGLISH_SHARING_COPY} from './englishSharingCopy.js';
import {ENGLISH_ERRORS_COPY} from './englishErrorsCopy.js';
import {ENGLISH_FINAL_ONBOARDING} from './englishFinalOnboarding.js';
import {ENGLISH_FINAL_RECORDING} from './englishFinalRecording.js';
import {ENGLISH_FINAL_CONDITIONS} from './englishFinalConditions.js';
import {ENGLISH_FINAL_HOME_DATA} from './englishFinalHomeData.js';
import {ENGLISH_FINAL_BACKUP} from './englishFinalBackup.js?v=20261111-settings-dialog-v1';
import {ENGLISH_FINAL_GPS_SIMULATION} from './englishFinalGpsSimulation.js';
import {ENGLISH_FINAL_ANNOTATION} from './englishFinalAnnotation.js';
import {ENGLISH_FINAL_INQUIRY} from './englishFinalInquiry.js';
import {ENGLISH_FINAL_APP_SHELL} from './englishFinalAppShell.js';
import {ENGLISH_SURFACE_REMAINDERS,translateResidualDynamic} from './englishSurfaceRemainders.js';

/* English interface: explicit, offline display phrase mappings. Never translate saved
 * user text, record IDs, scientific numbers, consent or legal document bodies.
 * The Japanese app remains the canonical source of UI behavior and evidence. */
export const ENGLISH_UI_TEXT=Object.freeze({
 "走行記録と振り返り": "Running Records & Reflection",
 "ホーム": "Home",
 "記録": "Record",
 "結果": "Results",
 "履歴": "History",
 "学習": "Learning",
 "補助教材": "Supplementary Lesson",
 "速さと配分": "Speed & Pacing",
 "身体の動き": "Body Movement",
 "疲労と休養": "Fatigue & Rest",
 "設定": "Settings",
 "コンディションの歩み": "Condition History",
 "記録を始める": "Start Recording",
 "記録内容の確認": "Review Your Record",
 "コース・走行条件": "Course & Running Conditions",
 "運動前後の疲労感": "Before/After Fatigue",
 "追加情報": "Additional Information",
 "歩数・走り方": "Steps & Gait",
 "身体・使用品・メモ": "Body, Equipment & Notes",
 "環境": "Environment",
 "動的結果": "Dynamic GPS Results",
 "記録の後日補完": "Add Information Later",
 "測定": "Measurement",
 "GPS記録内容の確認": "Review GPS Record",
 "GPSの疲労感": "GPS Fatigue Response",
 "コース設計": "Course Planning",
 "シミュレーション": "What-if Simulation",
 "相談・共有": "Consultation & Sharing",
 "部位詳細": "Body Region Details",
 "メニュー": "Menu",
 "スマートフォンのメニュー": "Mobile menu",
 "走行結果": "Running results",
 "GPS動的結果": "Dynamic GPS results",
 "走りの記録": "Your Running Records",
 "身体のしくみ": "How the Body Works",
 "コースと環境": "Course & Environment",
 "疲れと回復": "Fatigue & Recovery",
 "暮らしと気持ち": "Life & Feelings",
 "走る前後の工夫": "Before & After Running",
 "目的と楽しみ方": "Goals & Enjoyment",
 "距離・時間・ペース": "Distance, Time & Pace",
 "自分が感じた疲れ": "How I Felt",
 "過去の走りとの比較": "Compare Past Runs",
 "気付きと次の確認": "Noticing & Next Questions",
 "足・膝・股関節": "Feet, Knees & Hips",
 "姿勢と走る動作": "Posture & Running Motion",
 "体幹と腕の動き": "Core & Arm Motion",
 "12部位の参考値の見方": "Understanding the 12 Reference Regions",
 "上り坂・下り坂": "Uphill & Downhill",
 "路面": "Surface",
 "気温・天候": "Temperature & Weather",
 "屋外・室内": "Outdoor & Indoor",
 "疲れの感じ方": "How Fatigue Feels",
 "筋肉痛・違和感": "Soreness & Discomfort",
 "休養と回復": "Rest & Recovery",
 "疲れを考える視点": "Ways to Reflect on Fatigue",
 "睡眠": "Sleep",
 "食事・水分": "Food & Hydration",
 "気分・ストレス": "Mood & Stress",
 "ウォームアップ": "Warm-up",
 "走行中の対応": "During a Run",
 "クールダウン・ストレッチ": "Cool-down & Stretching",
 "無理をしない判断": "Knowing When to Stop",
 "走る目的": "Reason for running",
 "目標との付き合い方": "Working With Goals",
 "楽しみ方": "Enjoyment",
 "自分に合う記録の使い方": "Using Records in My Own Way",
 "今日": "Today",
 "保存済み": "Saved",
 "未回答": "Not answered",
 "未入力": "Not entered",
 "不明": "Unknown",
 "任意": "Optional",
 "確認": "Review",
 "戻る": "Back",
 "次へ": "Next",
 "保存": "Save",
 "変更": "Change",
 "編集": "Edit",
 "削除": "Delete",
 "閉じる": "Close",
 "キャンセル": "Cancel",
 "続ける": "Continue",
 "開始": "Start",
 "停止": "Stop",
 "一時停止": "Pause",
 "再開": "Resume",
 "完了": "Finish",
 "詳細": "Details",
 "全期間": "All time",
 "今月": "This month",
 "すべて": "All",
 "なし": "None",
 "はい": "Yes",
 "いいえ": "No",
 "プロフィールを保存": "Save Profile",
 "文字サイズ": "Text size",
 "標準": "Standard",
 "大きめ": "Large",
 "画面の動き": "Animations",
 "端末に合わせる": "Use device settings",
 "動きを抑える": "Reduce motion",
 "表示言語": "Display Language",
 "日本語": "Japanese",
 "表示と言語": "Display & Language",
 "利用者情報": "Profile Information",
 "記録と測定": "Records & Measurement",
 "データとプライバシー": "Data & Privacy",
 "アプリとヘルプ": "App & Help",
 "位置情報": "Location",
 "バックアップ・復元": "Backup & Restore",
 "データの削除": "Delete Data",
 "利用規約・プライバシー": "Terms & Privacy",
 "初回ガイド": "Getting Started",
 "アプリをインストール": "Install App",
 "このアプリについて": "About This App",
 "暗い画面": "Dark theme",
 "ダーク": "Dark",
 "ライト": "Light",
 "対応予定": "Planned",
 "使用中": "In use",
 "利用可能": "Available",
 "選択しない": "Do not select",
 "回答しない": "Prefer not to answer",
 "健康のため": "For health",
 "ランニングの記録": "Track my running",
 "身体への理解・探究": "Understand and explore my body",
 "その他": "Other",
 "表示名": "Display name",
 "身長": "Height",
 "体重": "Weight",
 "年齢帯": "Age range",
 "すべて任意": "Everything is optional",
 "登録した情報は、後から設定画面で変更できます。": "You can change this information later in Settings.",
 "読みやすい大きさに調整": "Adjust text size for readability",
 "端末の設定を尊重": "Follow your device preferences",
 "変更可能": "Adjustable",
 "編集できます": "Editable",
 "確認が必要": "Confirmation required",
 "案内": "Information",
 "案内あり": "Guide available",
 "全文を確認": "Read full text",
 "アプリ情報": "App information",
 "利用条件と情報の取扱い": "Terms and information handling",
 "利用規約を読む": "Read Terms of Use",
 "プライバシーポリシーを読む": "Read Privacy Policy",
 "この端末に保存されます": "Stored on this device",
 "距離": "Distance",
 "時間": "Time",
 "走行時間": "Running Time",
 "経過時間": "Elapsed Time",
 "平均ペース": "Average Pace",
 "歩数": "Steps",
 "活動種別": "Activity Type",
 "ランニング": "Running",
 "ジョギング": "Jogging",
 "ウォーキング": "Walking",
 "走歩混在": "Mixed Running & Walking",
 "コース": "Course",
 "走行条件": "Running Conditions",
 "メモ": "Notes",
 "記録日": "Record Date",
 "走行距離": "Distance Recorded",
 "運動前": "Before Activity",
 "運動後": "After Activity",
 "運動前に感じた疲れ": "Fatigue Before Activity",
 "運動後に感じた疲れ": "Fatigue After Activity",
 "疲労感の記録": "Fatigue Responses",
 "気持ち・考える面の疲れ（任意）": "Mental & Cognitive Fatigue (Optional)",
 "疲労感": "Perceived Fatigue",
 "ROF-J（本人回答）": "ROF-J (self-reported)",
 "手入力": "Manual Entry",
 "GPS測定": "GPS Measurement",
 "保存して続ける": "Save & Continue",
 "内容を確認": "Review Details",
 "記録を確認": "Review Record",
 "記録を保存": "Save Record",
 "記録の確認": "Review Record",
 "保存済みの記録": "Saved Records",
 "保存した記録": "Saved Record",
 "選択した記録": "Selected Record",
 "結果を開く　›": "Open Results ›",
 "走行結果で確認する": "View Running Results",
 "記録へ戻る": "Back to Record",
 "記録はありません": "No records yet",
 "部位の参考値": "Region Reference Values",
 "文献参考値": "Research Reference Values",
 "文献の根拠と条件": "Research Source & Conditions",
 "文献条件にもとづく参考情報": "Reference information subject to study conditions",
 "選択中の部位": "Selected Region",
 "部位を選ぶ": "Select a Region",
 "算出できません": "Unavailable",
 "未取得": "Not available",
 "数値を隠す": "Hide Values",
 "図に数値を表示": "Show Values on Diagram",
 "タップで部位を確認": "Tap a region to inspect",
 "身体": "Body",
 "過去と比較": "Compare Past Records",
 "比較する記録": "Comparison Record",
 "今回の記録": "Current Record",
 "比較する部位": "Select Region",
 "参考値の差": "Reference Value Difference",
 "比較値の算出条件と限界": "Calculation Conditions & Limits",
 "比較できない理由": "Why Comparison Is Unavailable",
 "同一部位": "Same Region",
 "前後の疲れ": "Before & After Fatigue",
 "比較する記録はありません": "No comparison record selected",
 "今後の記録を振り返れます": "You can review future records",
 "メモなし": "No notes",
 "比較できません": "Cannot compare",
 "利用規約": "Terms of Use",
 "プライバシーポリシー": "Privacy Policy",
 "同意して次へ": "Agree & Continue",
 "全文を読む ›": "Read full text ›",
 "確認画面に戻る": "Return to confirmation",
 "後で": "Later",
 "更新する": "Update",
 "再読み込み": "Reload",
 "画面を準備しています": "Preparing the screen",
 "画面の準備を続けています": "Still preparing the screen",
 "通常より時間がかかっています": "This is taking longer than usual",
 "画面を開けませんでした": "Could not open the screen",
 "ホーム画面に追加する": "Add to Home Screen",
 "インストールする": "Install",
 "閉じる ×": "Close ×",
 "走行を記録する": "Record Activity",
 "履歴を見る": "View History",
 "探究を見る": "Explore",
 "学ぶ": "Learn",
 "学習を始める": "Start Learning",
 "一般知識": "General Knowledge",
 "体験を振り返る": "Reflect on Your Experience",
 "保存する": "Save",
 "保存しない": "Do Not Save",
 "位置情報を使用しますか？": "Allow Access to Location?",
 "位置情報の取得を再開しますか？": "Resume Location Access?",
 "使用しない": "Do Not Allow",
 "許可して開始": "Allow & Start",
 "許可して再開": "Allow & Resume",
 "画面ロック・アプリ切り替え時の動作": "When You Lock or Switch Apps",
 "GPSが測定した疲労感ではなく、本人の回答です。入力操作時刻は評価・発生時刻の実測ではないため、時間的な差や原因は判定しません。未回答は「—」で、0と区別します。": "Fatigue is self-reported, not measured by GPS. Input timestamps do not establish when fatigue occurred. Timing differences or causes cannot be inferred. Unanswered (—) is distinct from a valid zero.",
 "この部位の参考値は算出できません": "No reference value is available for this region",
 "文献参考値：算出対象外": "Research reference: outside calculation scope",
 "保存前：部位別値は未表示": "Before saving: no region values shown",
 "保存した走行の文献適用条件を確認します": "Study applicability is checked for the saved activity",
 "文献参考値の適用条件": "Research reference applicability",
 "医学的な診断ではありません": "Not a medical diagnosis",
 "身体負荷の実測ではありません": "Not a direct measurement of physical load",
 "この記録だけでは分からないこと": "What this Record Cannot Tell You",
 "本人の記録について考える": "Reflect on Your Own Record",
 "この走行の記録を確認する": "Review This Activity Record",
 "この疲れの回答をどう捉えた？": "How Do You Interpret This Fatigue Response?",
 "そのときの経験について何が気になりますか？": "What Do You Wonder About That Experience?",
 "記録と関連づけず一般テーマを見る": "Browse General Topics Without Linking This Record",
 "出所：GPSの保存記録": "Source: Saved GPS Record",
 "このGPS記録へ戻る": "Return to This GPS Record",
 "気付き": "Observations",
 "次回の確認": "Next Questions",
 "問いを残す": "Save a Question",
 "メモを保存": "Save Notes",
 "記述は任意です。": "Writing is optional.",
 ...ENGLISH_RECORD_HISTORY_COPY,
 ...ENGLISH_RESULT_COPY,
 ...ENGLISH_GPS_EXPLORATION_COPY,
 ...ENGLISH_SETTINGS_COPY,
 ...ENGLISH_GUIDE_COPY,
 ...ENGLISH_LEARNING_COPY,
 ...ENGLISH_CURRICULUM_ORIGIN,
 ...ENGLISH_CURRICULUM_PACE,
 ...ENGLISH_CURRICULUM_MOTION,
 ...ENGLISH_CURRICULUM_FATIGUE,
 ...ENGLISH_SHARING_COPY,
 ...ENGLISH_ERRORS_COPY,
 ...ENGLISH_FINAL_ONBOARDING,
 ...ENGLISH_FINAL_RECORDING,
 ...ENGLISH_FINAL_CONDITIONS,
 ...ENGLISH_FINAL_HOME_DATA,
 ...ENGLISH_FINAL_BACKUP,
 ...ENGLISH_FINAL_GPS_SIMULATION,
 ...ENGLISH_FINAL_ANNOTATION,
 ...ENGLISH_FINAL_INQUIRY,
 ...ENGLISH_FINAL_APP_SHELL,
 ...ENGLISH_SURFACE_REMAINDERS
});
export function translateUiText(text,context={}){
 const raw=String(text??'');const trimmed=raw.trim();
 const exact=Object.prototype.hasOwnProperty.call(ENGLISH_UI_TEXT,trimmed)?ENGLISH_UI_TEXT[trimmed]:null;
 const translated=exact??translateResidualDynamic(trimmed,context);
 return translated===null?raw:raw.replace(trimmed,translated);
}
export function translateLessonComposite(text){
 const raw=String(text??''),trimmed=raw.trim();
 const numbered=trimmed.match(/^問\s+([1-9][0-9]*)$/);
 if(numbered)return raw.replace(trimmed,'Question '+numbered[1]);
 const progress=trimmed.match(/^学習済みとして記録 (\d+) \/ (\d+)教材$/);
 if(progress)return raw.replace(trimmed,'Marked as Studied '+progress[1]+' / '+progress[2]+' Lessons');
 const counter=trimmed.match(/^問 (\d+) \/ (\d+) · 回答 (\d+)\/(\d+)$/);
 if(counter)return raw.replace(trimmed,'Question '+counter[1]+' / '+counter[2]+' · Answered '+counter[3]+'/'+counter[4]);
 const all=trimmed.match(/^全(\d+)問 · 回答 (\d+)\/(\d+)$/);
 if(all)return raw.replace(trimmed,'All '+all[1]+' Questions · Answered '+all[2]+'/'+all[3]);
 const reviewed=trimmed.match(/^回答を確認しました · (\d+)\/(\d+)問に回答$/);
 if(reviewed)return raw.replace(trimmed,'Answers Reviewed · '+reviewed[1]+'/'+reviewed[2]+' Questions Answered');
 const progressCount=trimmed.match(/^(\d+)件を学習済みとして記録$/);
 if(progressCount)return raw.replace(trimmed,progressCount[1]+' lessons marked as studied');
 const minute=trimmed.match(/^(\d+)分$/);
 if(minute)return raw.replace(trimmed,minute[1]+' min');
 const paceDynamic=trimmed.match(/^合計 (\d+)分 ／ 平均 ([0-9:]+\/km)$/);
 if(paceDynamic)return raw.replace(trimmed,'Total '+paceDynamic[1]+' min / Average '+paceDynamic[2]);
 const splitIndex=trimmed.match(/^例([ABC])｜(.+)$/);
 if(splitIndex)return raw.replace(trimmed,'Example '+splitIndex[1]+' | '+(ENGLISH_UI_TEXT[splitIndex[2]]||splitIndex[2]));
 const profile=trimmed.match(/^基礎教材 (\d+) · (.+)$/);
 if(profile)return raw.replace(trimmed,'Foundations Lesson '+profile[1]+' · '+(ENGLISH_UI_TEXT[profile[2]]||profile[2]));
 const split=trimmed.match(/^(\d+) km目：$/);
 if(split)return raw.replace(trimmed,'Kilometer '+split[1]+':');
 const total=trimmed.match(/^合計(\d+)分・平均([0-9.]+)分\/km$/);
 if(total)return raw.replace(trimmed,'Total '+total[1]+' min · Average '+total[2]+' min/km');
 const question=trimmed.match(/^問([1-9][0-9]*)｜(.+)$/);
 if(question&&Object.hasOwn(ENGLISH_UI_TEXT,question[2]))return raw.replace(trimmed,'Question '+question[1]+' | '+ENGLISH_UI_TEXT[question[2]]);
 for(const prefix of ['正解。','確認しましょう。','確かめましょう。']){
  if(trimmed.startsWith(prefix)){
   const reason=trimmed.slice(prefix.length);
   if(Object.hasOwn(ENGLISH_UI_TEXT,reason))return raw.replace(trimmed,(ENGLISH_UI_TEXT[prefix]||'Review: ')+ENGLISH_UI_TEXT[reason]);
  }
 }
 return raw;
}
const SKIP='script,style,textarea,input,code,pre,[contenteditable], [data-legal-backdrop], .fu-doc-scroll, [data-user-authored], .ex-note-preview, .ex-saved, .rv4-comparison-memos, .rv4-note p, .focus-fact strong, .entry-caption, [data-ax-editor] [data-ax-notice], [data-report-purpose], [data-report-observation], [data-report-question], .cp-condition strong, #cp-target, .cp-report-mode-usertext';
export function startEnglishUi(doc,{language='ja'}={}){
 let selected=language==='en'?'en':'ja',queued=false;
 const seen=new WeakSet();
 const watch=new MutationObserver(()=>schedule());
 function schedule(){if(selected!=='en'||queued)return;queued=true;queueMicrotask(()=>{queued=false;renderEnglish()});}
 function renderEnglish(){if(selected!=='en')return;
  const root=doc.documentElement;
  const visit=node=>{
   if(node.nodeType===1){
    const element=node;
    // Legal consent bodies and user-authored notes must not be translated.
    if(element.closest('[data-legal-backdrop],.fu-doc-scroll'))return;
    // Labels and placeholders are UI copy, but input/textarea values are user data.
    if(element.matches('input,textarea')){
     for(const attr of ['placeholder','aria-label','title']){
      const old=element.getAttribute(attr);if(old===null)continue;
      const next=translateUiText(old,{element,attribute:attr});if(next!==old)element.setAttribute(attr,next);
     }
     return;
    }
    if(element.matches(SKIP))return;
    if(element.shadowRoot){observe(element.shadowRoot);visit(element.shadowRoot);}
    for(const attr of ['aria-label','title','placeholder','alt','aria-valuetext']){
     const old=element.getAttribute(attr);if(old===null)continue;
     let next=translateUiText(old,{element,attribute:attr});
     // Translate composed learning counts in accessibility text as well as visible text.
     if(next===old&&element.closest('.lr-root'))next=translateLessonComposite(old);
     if(next!==old)element.setAttribute(attr,next);
    }
   }else if(node.nodeType===3){
    const parent=node.parentElement;
    if(parent&&!parent.closest(SKIP)){let next=translateUiText(node.data,{element:parent});if(next===node.data&&parent.closest('.lr-root'))next=translateLessonComposite(node.data);if(next!==node.data)node.data=next;}
   }
   for(const child of node.childNodes)visit(child);
  };
  visit(root);
  const title=doc.querySelector('title');if(title&&title.textContent!=='Running Records & Reflection')title.textContent='Running Records & Reflection';
  const meta=doc.querySelector('meta[name="description"]');
  if(meta)meta.content='Review activity records and reflect on your running experience. Not a medical diagnosis.';
 }
 function observe(root){if(seen.has(root))return;seen.add(root);watch.observe(root,{childList:true,characterData:true,subtree:true});}
 observe(doc.documentElement);
 // Some screen modules mount Shadow DOM after asynchronous IndexedDB reads.
 const onHash=()=>schedule();doc.defaultView?.addEventListener('hashchange',onHash);
 function setLanguage(next){selected=next==='en'?'en':'ja';doc.documentElement.lang=selected;
  const manifest=doc.querySelector('link[rel="manifest"]');
  if(manifest)manifest.setAttribute('href',selected==='en'?'./manifest.en.webmanifest':'./manifest.webmanifest?v=20261110-public-copy-v1');
  const apple=doc.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(apple)apple.setAttribute('content',selected==='en'?'Running Records':'走行記録');
  if(selected==='en')schedule();else{doc.title='走行記録と振り返り';const m=doc.querySelector('meta[name="description"]');if(m)m.content='走行記録を振り返り、自分のペースで探究する';}
 }
 setLanguage(selected);
 return {setLanguage,refresh:schedule,get language(){return selected},disconnect(){watch.disconnect();doc.defaultView?.removeEventListener('hashchange',onHash);}};
}
