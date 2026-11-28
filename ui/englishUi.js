import {translateOptInActionText} from './actionCopyKeys.js?v=20261122-ux04-stable-actions-v1';
import {ENGLISH_RECORD_HISTORY_COPY} from './englishRecordHistoryCopy.js?v=20261128-dictionary';
import {ENGLISH_RESULT_COPY} from './englishResultCopy.js?v=20261123-ux11-result-source-v1-readable-history-compact-remaining-copy';
import {ENGLISH_GPS_EXPLORATION_COPY} from './englishGpsExplorationCopy.js?v=20261127-daily-only-notes-copy-remaining-copy';
import {ENGLISH_SETTINGS_COPY} from './englishSettingsCopy.js?v=20261128-guide-learning-settings-copy';
import {ENGLISH_GUIDE_COPY} from './englishGuideCopy.js?v=20261128-guide-learning-settings-copy';
import {ENGLISH_LEARNING_COPY} from './englishLearningCopy.js?v=20261128-guide-learning-settings-copy';
import {ENGLISH_CURRICULUM_ORIGIN} from './englishCurriculumCopy.js?v=20261128-remaining-copy';
import {ENGLISH_CURRICULUM_PACE} from './englishCurriculumPace.js?v=20261128-remaining-copy';
import {ENGLISH_CURRICULUM_MOTION} from './englishCurriculumMotion.js?v=20261128-remaining-copy';
import {ENGLISH_CURRICULUM_FATIGUE} from './englishCurriculumFatigue.js?v=20261128-remaining-copy';
import {ENGLISH_SHARING_COPY} from './englishSharingCopy.js?v=20261125-ux16-19-batch-v1-daily-only-remaining-copy';
import {ENGLISH_ERRORS_COPY} from './englishErrorsCopy.js?v=20261128-remaining-copy';
import {ENGLISH_FINAL_ONBOARDING} from './englishFinalOnboarding.js?v=20261128-remaining-copy';
import {ENGLISH_FINAL_RECORDING} from './englishFinalRecording.js?v=20261123-ux11-result-source-v1-remaining-copy';
import {ENGLISH_FINAL_CONDITIONS} from './englishFinalConditions.js?v=20261126-cleanup-v5-daily-only-remaining-copy';
import {ENGLISH_FINAL_HOME_DATA} from './englishFinalHomeData.js?v=20261125-ux15-condition-v1-daily-compact-stage3-copy-notes-copy-remaining-copy-condition-copy';
import {ENGLISH_FINAL_BACKUP} from './englishFinalBackup.js?v=20261126-cleanup-v5-daily-only-remaining-copy';
import {ENGLISH_FINAL_GPS} from './englishFinalGps.js?v=20261126-cleanup-v5-daily-only';
import {ENGLISH_FINAL_ANNOTATION} from './englishFinalAnnotation.js?v=20261128-remaining-copy';
import {ENGLISH_FINAL_INQUIRY} from './englishFinalInquiry.js';
import {ENGLISH_EXPLORE_KNOWLEDGE} from './englishExploreKnowledge.js?v=20261122-explore-clean-v1';
import {translateExploreDynamic} from './englishExploreDynamic.js?v=20261128-notes-copy';
import {ENGLISH_FINAL_APP_SHELL} from './englishFinalAppShell.js';
import {ENGLISH_SURFACE_REMAINDERS,translateResidualDynamic} from './englishSurfaceRemainders.js?v=20261125-ux16-19-batch-v1-readable-history-daily-only-stage3-copy-notes-copy-condition-copy';

/* English interface: explicit, offline display phrase mappings. Never translate saved
 * user text, record IDs, scientific numbers, consent or legal document bodies.
 * The Japanese app remains the canonical source of UI behavior and evidence. */
export const ENGLISH_UI_TEXT=Object.freeze({
 "追記の内容に不正な値または重複があります": "The additional information contains invalid or duplicate entries.",
 "追記の履歴が既存の記録と一致しません": "The additional information history conflicts with existing records.",
 "追記が既存の記録と重複しています": "The additional information conflicts with an existing entry.",
 "保存操作または本人が申告した時点を確認できません": "The save operation or reported time could not be verified.",
 "追記の履歴情報が正しくありません": "The additional information history is invalid.",
 "同じ追記の履歴がすでに存在します": "The same additional information entry already exists.",
 "追記の保存を確認できません。前回の保存結果を読み直してから再試行してください": "The additional information save could not be verified. Recheck the previous save before retrying.",
 "対象の保存操作を確認できません": "The save operation could not be verified.",
 "保存操作の履歴を読み取れません": "The save history could not be read.",
 "同じ記録または日付に異なる内容があります。現在の記録を保護しました": "Different content exists for the same record or date. Your current records are protected.",
 "同じGPS記録に異なる内容があります": "The same GPS record contains different content.",
 "対象の記録と情報の出所を確認できません": "The selected record and its source could not be verified.",
 "元のGPS記録の指定に不整合または重複があります": "The original GPS record selection is inconsistent or duplicated.",
 "自由記述の履歴情報が正しくありません": "The note history is invalid.",
 "対象の自由記述を確認できません": "The selected note could not be verified.",
 "同じ保存操作が重複しています": "The same save operation is duplicated.",
 "同じ元のGPS記録に異なる内容があります": "Different content exists for the same original GPS record.",
 "別の自由記述と保存履歴が重複しています": "The save history overlaps with a different note.",
 "対象の保存済みGPS記録を確認できません": "The selected saved GPS record could not be verified.",
 "GPS記録の保存操作が正しくありません": "The GPS save operation is invalid.",
 "前回の保存操作の記録が見つかりません": "No record was found for the previous save.",
 "前回の保存内容またはコース詳細の保存選択が一致しません。履歴を確認してください": "The previous save content or route detail choice does not match. Check your history.",
 "バックアップ内の記録に重複または不整合があります": "Records in the backup are duplicated or inconsistent.",
 "記録数の上限を超えるか、同じ記録に異なる内容があります": "The record limit is exceeded or the same record contains different content.",
 "自由記述の保存操作を確認できません": "The note save operation could not be verified.",
 "保存操作を安全に準備できません": "The save operation could not be prepared safely.",
 "同じ保存操作がすでに行われています": "The same save operation has already been performed.",
 "保存操作の内容を確認できません": "The save operation could not be verified.",
 "前回の保存操作と入力内容が一致しません。履歴を確認してください": "The entry does not match the previous save. Check your history.",
 "記録の保存を安全に準備できないため保存を中止しました": "Saving was stopped because the record could not be prepared safely.",
 "対象の記録を確認できません": "The selected record could not be verified.",
 "同じ元の記録に異なる内容があります": "Different content exists for the same original record.",
 "対象の記録またはその種類が正しくありません": "The selected record or its type is invalid.",
 "対象の記録とその種類が一致しません": "The selected record does not match its type.",
 "対象の記録が指定されていません": "No record was selected.",
 "以前の文章を保持し、本人の言葉だけを修正します。元の走行との関連は変更しません。": "Previous text is kept. Editing your note does not change its link to the original activity.",
 "関連する走行記録：": "Linked activity:",
 "関連する走行記録あり": "Linked to an activity",
 "関連する走行記録を確認できません": "The linked activity could not be verified",
 "走行記録に関連づけていないメモ": "Note not linked to an activity",
 "メモを修正": "Edit note",
 "分野図を閉じる": "Hide Area Map",
 "分野図を開く": "Show Area Map",
 "分野を変更": "Change Area",
 "この走行の気づきだけを表示しています。": "Showing Notes Linked to This Activity Only.",
 "すべてのメモを表示しています。記録に結びついた文章は、その記録と区別して扱います。": "Showing All Notes. Each Activity-Linked Note Retains Its Original Activity.",
 "元の走行が見つかりません。以前に結びつけたメモは残っています。": "The Original Activity Is Missing. Its Notes Remain Available.",
 "この範囲にはまだメモがありません。記録を変更したり、ほかの走行の文章を移したりしません。": "No Notes in This Scope. We Do Not Reassign Notes from Other Activities.",
 "走行記録と振り返り": "Running Records & Reflection",
 "ホーム": "Home",
 "記録": "Record",
 "結果": "Results",
 "履歴": "History",
 "学習": "Learning",
 "補助教材": "Supplementary Lesson",
 "設定": "Settings",
 "コンディションの歩み": "Condition History",
 "記録を始める": "Start Recording",
 "運動前後の疲労感": "Before/After Fatigue",
 "追加情報": "Additional Information",
 "環境": "Environment",
 "動的結果": "Dynamic GPS Results",
 "記録の後日補完": "Add Information Later",
 "測定": "Measurement",
 "GPSの疲労感": "GPS Fatigue Response",
 "コース設計": "Course Planning",
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
 "走る前後の工夫": "Before & After Runs",
 "目的と楽しみ方": "Goals & Enjoyment",
 "足・膝・股関節": "Feet, Knees & Hips",
 "上り坂・下り坂": "Uphill & Downhill",
 "路面": "Surface",
 "疲れの感じ方": "How Fatigue Feels",
 "睡眠": "Sleep",
 "ウォームアップ": "Warm-up",
 "今日": "Today",
 "保存済み": "Saved",
 "未回答": "Not answered",
 "不明": "Unknown",
 "任意": "Optional",
 "確認": "Review",
 "保存": "Save",
 "変更": "Change",
 "編集": "Edit",
 "削除": "Delete",
 "閉じる": "Close",
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
 "標準": "Standard",
 "利用者情報": "Profile Information",
 "位置情報": "Location",
 "対応予定": "Planned",
 "使用中": "In use",
 "利用可能": "Available",
 "回答しない": "Prefer not to answer",
 "身体への理解・探究": "Understand and explore my body",
 "表示名": "Display name",
 "身長": "Height",
 "体重": "Weight",
 "年齢帯": "Age range",
 "変更可能": "Adjustable",
 "案内": "Information",
 "この端末に保存されます": "Stored on this device",
 "時間": "Time",
 "歩数": "Steps",
 "記録日": "Record Date",
 "走行距離": "Distance Recorded",
 "疲労感": "Perceived Fatigue",
 "ROF-J（本人回答）": "ROF-J (self-reported)",
 "手入力": "Manual Entry",
 "GPS測定": "GPS Measurement",
 "保存して続ける": "Save & Continue",
 "記録を確認": "Review Record",
 "記録を保存": "Save Record",
 "記録の確認": "Review Record",
 "保存済みの記録": "Saved Records",
 "保存した記録": "Saved Record",
 "結果を開く　›": "Open Results ›",
 "記録はありません": "No records yet",
 "部位の参考値": "Region Reference Values",
 "文献の根拠と条件": "Research Source & Conditions",
 "文献条件にもとづく参考情報": "Reference information subject to study conditions",
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
 "比較値の算出条件と限界": "Calculation Conditions & Limits",
 "比較できない理由": "Why Comparison Is Unavailable",
 "同一部位": "Same Region",
 "前後の疲れ": "Before & After Fatigue",
 "比較する記録はありません": "No comparison record selected",
 "今後の記録を振り返れます": "You can review future records",
 "後で": "Later",
 "更新する": "Update",
 "再読み込み": "Reload",
 "画面を準備しています": "Preparing the screen",
 "画面の準備を続けています": "Still preparing the screen",
 "通常より時間がかかっています": "This is taking longer than usual",
 "ホーム画面に追加する": "Add to Home Screen",
 "インストールする": "Install",
 "履歴を見る": "View History",
 "探究を見る": "Explore",
 "学ぶ": "Learn",
 "学習を始める": "Start Learning",
 "一般知識": "General Knowledge",
 "体験を振り返る": "Reflect on Your Experience",
 "保存しない": "Do Not Save",
 "GPSが測定した疲労感ではなく、本人の回答です。入力操作時刻は評価・発生時刻の実測ではないため、時間的な差や原因は判定しません。未回答は「—」で、0と区別します。": "Fatigue is self-reported, not measured by GPS. Input timestamps do not establish when fatigue occurred. Timing differences or causes cannot be inferred. Unanswered (—) is distinct from a valid zero.",
 "この部位の参考値は算出できません": "No reference value is available for this region",
 "保存前：部位別値は未表示": "Before saving: no region values shown",
 "文献参考値の適用条件": "Research reference applicability",
 "医学的な診断ではありません": "Not a medical diagnosis",
 "身体負荷の実測ではありません": "Not a direct measurement of physical load",
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
 ...ENGLISH_FINAL_GPS,
 ...ENGLISH_FINAL_ANNOTATION,
 ...ENGLISH_FINAL_INQUIRY,
 ...ENGLISH_FINAL_APP_SHELL,
 ...ENGLISH_SURFACE_REMAINDERS,
 ...ENGLISH_EXPLORE_KNOWLEDGE
});
export function translateUiText(text,context={}){
 const raw=String(text??'');const trimmed=raw.trim();
 if(context.element?.closest?.('[data-user-authored]'))return raw;
 // S09 T10: this card describes one selected region. The conditions screen
 // uses the same Japanese words for a multiple-region picker, so its plural
 // English dictionary entry must remain untouched.
 if(trimmed==='手入力'&&context.element?.matches?.('.hx-source-controls button[data-record-source="MANUAL"]'))return raw.replace(trimmed,'Manual');
 // Only on Course editor: preserve long wording elsewhere and full surface aria-labels.
 const e=context.element;
 if(trimmed==='GPS測定はスマートフォン専用です'&&e?.closest?.('.gps-platform-unavailable'))return raw.replace(trimmed,'GPS: Smartphones Only');
 // UX14: the seven full category names have one canonical display spelling.
 // Prefer that spelling for composed node names, even when a legacy exact
 // phrase contains an older category label. Preserve the provenance suffix.
 if(context.attribute==='aria-label'&&e?.matches?.('.ex-node')&&e?.closest?.('.ex-page')){
  const separator=trimmed.indexOf('、');
  if(separator>0){
   const area=trimmed.slice(0,separator),reason=trimmed.slice(separator+1);
   const categories=['走りの記録','身体のしくみ','コースと環境','疲れと回復','暮らしと気持ち','走る前後の工夫','目的と楽しみ方'];
   if(categories.includes(area)){
    const description=translateUiText(reason,{element:e});
    if(description!==reason)return raw.replace(trimmed,ENGLISH_UI_TEXT[area]+', '+description);
   }
  }
 }
 // History dates combine a fixed UI label with the exact stored calendar date.
 // Translate only the accessible name; never reinterpret or rewrite the date.
 if(context.attribute==='aria-label'&&e?.matches?.('time.datebox[datetime]')){
  const dateLabel=trimmed.match(/^(走行日|休養日)：(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if(dateLabel){
   const iso=dateLabel[2]+'-'+dateLabel[3].padStart(2,'0')+'-'+dateLabel[4].padStart(2,'0');
   if(e.getAttribute('datetime')===iso)
    return raw.replace(trimmed,(dateLabel[1]==='走行日'?'Activity Date':'Rest Day Date')+': '+iso);
  }
 }
 if(context.attribute==='aria-label'&&e?.matches?.('.rv-course [data-rv-grade],.rv-course [data-rv-surface-mode]')){
  const full={'上り・下りの距離割合を設定':'Set Uphill and Downhill Distance Shares',
   '区間ごとの坂道を設定':'Set Gradients by Segments',
   '路面を1種類選択':'Select a Single Surface',
   '複数路面の距離割合を設定':'Set Distance Shares for Multiple Surfaces'};
  if(Object.hasOwn(full,trimmed))return raw.replace(trimmed,full[trimmed]);
 }
 if(context.attribute==='placeholder'&&trimmed==='未入力'&&
    e?.matches?.('.rv-course [data-rv-slope-number],.rv-course [data-rv-surface-value]'))
  return raw.replace(trimmed,'—');
 if(e?.matches?.('.rv-course .rv-fine-top > strong')&&trimmed.endsWith('を調整')){
  const base=trimmed.slice(0,-3);
  const labels={'上り':'Uphill','下り':'Downhill','舗装路':'Paved Road',
   '陸上トラック':'Athletics Track','トレッドミル':'Treadmill',
   '締まった土道':'Compacted Dirt','不整地トレイル':'Uneven Trail',
   '天然芝':'Natural Grass','人工芝':'Artificial Turf','砂地':'Sand'};
  if(Object.hasOwn(labels,base))return raw.replace(trimmed,'Adjust '+labels[base]);
 }
 if(e?.matches?.('.rv-course [data-rv-grade]')&&trimmed==='割合')return raw.replace(trimmed,'By %');
 if(e?.matches?.('.rv-course [data-rv-surface-mode]')){
  const aliases={'1種類':'Single','複数・割合':'Mixed %'};
  if(Object.hasOwn(aliases,trimmed))return raw.replace(trimmed,aliases[trimmed]);
 }
 if(e?.matches?.('.rv-course .rv-surface-tile span:first-child')){
  const aliases={'陸上トラック':'Running Track','締まった土道':'Packed Dirt'};
  if(Object.hasOwn(aliases,trimmed))return raw.replace(trimmed,aliases[trimmed]);
 }
 if(trimmed==='選択中の部位'&&
    context.element?.matches?.('.rv4-reading > small')&&
    context.element?.closest?.('.rv4-body'))return raw.replace(trimmed,'Selected Region');
 // UX04: explicit labels opt into stable action IDs; all existing legacy
 // exact-phrase mapping and context-specific scientific terms remain intact.
 const keyed=translateOptInActionText(trimmed,context);
 if(keyed!==null)return raw.replace(trimmed,keyed);
 const exact=Object.prototype.hasOwnProperty.call(ENGLISH_UI_TEXT,trimmed)?ENGLISH_UI_TEXT[trimmed]:null;
 const translated=exact??translateExploreDynamic(trimmed,context)??translateResidualDynamic(trimmed,context);
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
const SKIP='script,style,textarea,input,code,pre,[contenteditable], [data-legal-backdrop], .fu-doc-scroll, [data-user-authored], .hx-discovery-note, .rv4-note p, .focus-fact strong, .entry-caption:not([data-history-system-caption]), [data-ax-editor] [data-ax-notice], [data-report-purpose], [data-report-observation], [data-report-question], .cp-condition strong, #cp-target, .cp-report-mode-usertext';
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
