import {EXPLORE_THEMES,EXPLORE_LEGACY,EXPLORE_GROUPS,ENGLISH_EXPLORE_REDESIGN,themeFor,availableViews} from "./explorationRedesign.js?v=20261128-inquiry2";
import {translateUiText} from './englishUi.js?v=20261126-cleanup-v5-readable-history-daily-compact-daily-only-stage3-copy-notes-copy-dictionary-core-copy-remaining-copy-condition-copy-usability1-inquiry2';
import {ENGLISH_GPS_EXPLORATION_COPY} from './englishGpsExplorationCopy.js?v=20261127-daily-only-notes-copy-remaining-copy-usability1';
import {runningJointDiagram,paceDiagram,runningPhaseDiagram} from "./explorationDiagrams.js?v=20261128-inquiry2";
import {createExplorationContext, readCourseDraft} from "./explorationReadAdapter.js";
import {validEntry} from "./homeExperience.js";
import {EXPLORATION_DRAFT_GUIDES,EXPLORATION_STARTING_QUESTIONS} from "./explorationTopicGuides.js?v=20261111-exploration-inquiry-v1-daily-only";
import {renderReflectionActions} from "./explorationTopicView.js?v=20261127-daily-only-stage3-copy-notes-copy-usability1";
import {isRunId,resolveOptionalNoteRunLink,visibleTopicNotes,noteRunBackLink} from "./noteRunLink.js";
import {renderFatigueInquiry} from "./explorationInquiry.js?v=20261109-p7-wording-v1";
import {renderComparisonInquiry} from "./explorationComparisonInquiry.js";
import {renderBodyInquiry} from "./explorationBodyInquiry.js";
import {renderConditionInquiry} from "./explorationConditionInquiry.js";
import {renderLifeInquiry} from "./explorationLifeInquiry.js";
// application exploration field v3. Relevance is a traceable link to available data,
// not a diagnosis, performance ranking, inferred cause, or physiological score.
// Separate opt-in exploration notes never mutate or read the run history store.
export const EXPLORATION_NOTE_KEY="runload-v2-exploration-notes-v1";
const LIMIT=50;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const compactEnglish={"01":"Run Logs","02":"Body","03":"Course & Env.","04":"Fatigue & Recovery","05":"Life & Feelings","06":"Before / After","07":"Goals & Fun"};
const orbitCenters={"01":[1/6,1/6],"02":[1/2,1/6],"03":[5/6,1/6],"04":[5/6,1/2],"05":[2/3,5/6],"06":[1/3,5/6],"07":[1/6,1/2]};
const meta={
 "01":{short:"走行記録",glyph:"◷",x:17,y:20,accent:"#79c2f4",why:"走行距離や時間の入力があります"},
 "02":{short:"身体",glyph:"◎",x:49,y:12,accent:"#f4b978",why:"身体についてのメモがあります"},
 "03":{short:"コース",glyph:"⌁",x:82,y:20,accent:"#65e5c2",why:"坂道や路面の情報があります"},
 "04":{short:"疲れと回復",glyph:"♡",x:85,y:54,accent:"#d4adfb",why:"運動前後の疲れを入力しています"},
 "05":{short:"暮らし",glyph:"✦",x:69,y:85,accent:"#9de9e0",why:"生活コンディションの記録があります"},
 "06":{short:"走る前後",glyph:"✳",x:30,y:85,accent:"#c3b5ff",why:"走る前後の工夫についての記録があります"},
 "07":{short:"楽しみ方",glyph:"⚑",x:15,y:54,accent:"#faa6c8",why:"自分の目標についての記録があります"}
};
const isProvided=x=>x!==null&&x!==undefined&&String(x).trim()!=="";
export function makeUi(storage){
 const ui={selected:"03",topic:"上り坂・下り坂",search:"",tab:"field",mapExpanded:true,notes:[],emptyNotesRaw:null,storage,canSave:true,notice:"",modal:"",trialDistance:5,trialMinutes:30,toolChoice:"up",bodyChoice:"hip",lifeA:"",lifeB:"",followup:"",editingNoteId:null,deletingNoteId:null};
 if(!storage){ui.canSave=false;return ui;}
 try{
  const raw=storage.getItem(EXPLORATION_NOTE_KEY);
  if(raw===null)return ui;
  const list=JSON.parse(raw);
  if(!Array.isArray(list)||list.length>LIMIT||new Set(list.map(n=>n?.id)).size!==list.length||list.some(n=>!n||typeof n!=="object"||typeof n.id!=="string"||typeof n.category!=="string"||typeof n.text!=="string"||!n.text.trim()||n.text.length>500||!/^[A-Za-z0-9_-]{1,32}$/.test(n.category)||n.id.length>80||typeof n.createdAt!=="string"||(n.topicId!==undefined&&typeof n.topicId!=="string")||(n.recordId!==undefined&&!isRunId(n.recordId))||(n.continuedFromNoteId!==undefined&&(typeof n.continuedFromNoteId!=='string'||!n.continuedFromNoteId||n.continuedFromNoteId.length>80))||(n.updatedAt!==undefined&&(typeof n.updatedAt!=='string'||Number.isNaN(Date.parse(n.updatedAt))))||(n.revisions!==undefined&&(!Array.isArray(n.revisions)||n.revisions.length>50||n.revisions.some(v=>!v||typeof v.text!=='string'||!v.text.trim()||v.text.length>500||typeof v.editedAt!=='string'||Number.isNaN(Date.parse(v.editedAt)))))))throw Error("invalid notes");
  ui.notes=list;
  // Preserve the exact empty-array snapshot left by a prior last-note deletion.
  // A missing key (null) remains distinct for cross-tab write protection.
  ui.emptyNotesRaw=list.length===0?raw:null;
 }catch{ui.canSave=false;ui.notice="メモを読み取れません。保存済みのデータは変更していません。";}
 return ui;
}

/* Only validated local manual-run records may light a saved-activity theme.
   Do not derive any injury, body loading or health interpretation here. */
function latestSavedManualRun(read,requestedId=null){
 if(read?.ok!==true||!Array.isArray(read.records))return null;
 return read.records.filter(r=>(requestedId===null||r.id===requestedId)&&r?.source==="manual"&&r.type==="run"&&r.schema===2&&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(r.distanceKm)&&r.distanceKm>0&&
    Number.isInteger(r.durationSeconds)&&r.durationSeconds>0)
  .slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null;
}
export function signals(draft,conditions,manualRuns=null,requestedId=null){
 const linked=new Map();
 const strict=createExplorationContext({draft,conditions});
 const sources=new Map(),recentRun=latestSavedManualRun(manualRuns,requestedId);
 const mark=(id,label,source)=>{if(!linked.has(id)){linked.set(id,label);sources.set(id,source);}};
 // Current draft is kept separate from confirmed saved runs.
 if(draft&&[draft.distance,draft.hours,draft.minutes,draft.seconds,draft.steps].some(isProvided))
  mark("01","入力中の走行距離・時間などに関連","draft");
 if(strict.highlights.some(h=>h.themeId==="上り坂・下り坂"))
  mark("03","入力中の上り坂・下り坂の情報に関連","draft");
 if(draft&&(draft.rofBefore!==null&&draft.rofBefore!==undefined&&String(draft.rofBefore).trim()!==""||
   draft.rofAfter!==null&&draft.rofAfter!==undefined&&String(draft.rofAfter).trim()!==""))
  mark("04","入力中の運動前後の疲れに関連","draft");
 if(draft&&isProvided(draft.bodyObservation))mark("02","入力中の身体に関するメモに関連","draft");
 if(recentRun){
  const date=recentRun.date;
  mark("01",date+" に保存した走行距離と時間に関連","saved-run");
  const course=readCourseDraft(recentRun.draft);
  if(course.status==="complete"&&(course.shares.up>0||course.shares.down>0))
   mark("03",date+" に保存した坂道の入力に関連","saved-run");
  if([recentRun.rofBefore,recentRun.rofAfter].some(x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=10))
   mark("04",date+" に保存したROF-Jの入力に関連","saved-run");
  if(isProvided(recentRun.draft?.bodyObservation))
   mark("02",date+" に保存した身体に関するメモに関連","saved-run");
 }
 // Date-only relevance includes saved daily condition answers even when sleep is omitted.
 // Only the existence and date are used; no subjective choice or memo is exposed.
 const dailyDates=new Set((strict.life.status==='complete'?conditions.entries:[]).filter(validEntry).map(e=>e.date));
 const recent=strict.life.status==="complete"?strict.life.records.filter(n=>n.minutes!==null||dailyDates.has(n.date)).at(-1):null;
 if(recent&&requestedId===null)mark("05",recent.date+" の生活コンディション記録に関連","saved-life");
 return {linked,sources,hasDraft:[...sources.values()].includes("draft"),hasSavedRun:[...sources.values()].includes("saved-run"),
  hasCondition:linked.has("05"),conditionDate:recent?.date||null,recentRunDate:recentRun?.date||null,strict};
}

function relevance(ui,ctx){
 return signals(ctx.focusRunId?null:ctx.draft,ctx.conditions,ctx.manualRuns,ctx.focusRunId||null);
}

function art(links){
 const stars=Array.from({length:72},(_,i)=>{const x=(i*73+31)%760,y=(i*47+(i%5)*37+17)%520,r=i%7===0?1.75:.85;return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#c4efff" opacity="'+(i%4===0?.52:.16)+'"/>';}).join("");
 const routes=Object.entries(meta).map(([id,p])=>{
  const active=links.linked.has(id),[cx,cy]=orbitCenters[id],x=cx*760,y=cy*520;
  return '<path class="'+(active?'ex-constellation-link is-related':'ex-constellation-link')+'" d="M380 260 Q'+(380+(x-380)*.48)+' '+(260+(y-260)*.62-18)+' '+x+' '+y+'" stroke="'+p.accent+'" stroke-width="'+(active?'2.7':'1.5')+'" fill="none" opacity="'+(active?'.75':'.19')+'"/>';
 }).join("");
 return '<svg class="ex-art" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="ex-glow"><stop stop-color="#59efd9" stop-opacity=".4"/><stop offset="1" stop-color="#59efd9" stop-opacity="0"/></radialGradient></defs>'+stars+'<path class="ex-contours" d="M-70 370 Q125 120 310 356 T820 192 M-70 405 Q125 155 310 391 T820 227 M-70 438 Q125 188 310 424 T820 260 M-70 470 Q125 220 310 456 T820 290 M-70 502 Q125 252 310 488 T820 323" fill="none" stroke="#85d4cd" opacity=".12" stroke-width="2"/>'+routes+'<circle cx="380" cy="253" r="155" fill="url(#ex-glow)" opacity=".3"/></svg>';
}

const KNOWLEDGE={
 "距離・時間・ペース":{
   heading:"平均ペースと平均速度の見方",
   lead:"平均ペースは1 km進むためにかかる平均時間です。平均速度は1時間に進む平均距離です。どちらも記録した距離と経過時間から求められます。",
   warning:"平均値には速く走った区間もゆっくり進んだ区間も含まれます。手入力された距離と経過時間の計算であり、GPS測定や身体負荷の判定ではありません。",
   sourceNote:"距離と経過時間から求める算術上の定義です。個人への効果や医学的な主張を裏付ける文献引用ではありません。"
 },
 "足・膝・股関節":{
   heading:"走るとき、脚の関節はどう働く？",lead:"地面を押して前に進むとき、股関節・膝・足首が連携して動きます。走る速さが変わると、関節の動きや仕事の分担も変化し得ます。",
   cite:"Fukuchi ほか（2017）",url:"https://doi.org/10.7717/peerj.3298",warning:"定速トレッドミル走を扱った研究に基づく一般知識です。初心者本人の関節への負荷やけがの可能性を判定するものではありません。",sourceNote:"Fukuchi ほか（2017）は習慣的に走る28人を対象に、2.5・3.5・4.5 m/sでのトレッドミル走行時の下肢関節角度・関節モーメント等を測定しました。利用者本人の関節を計測したものでも、負荷を個別推定できる根拠でもありません。"},
 "上り坂・下り坂":{
   heading:"上り坂と下り坂、走る動きの違い",lead:"上り坂では体を持ち上げて進む働きが、下り坂では前に進む勢いを受け止めて制御する働きが重要になります。",
   cite:"Vernillo ほか（2020）",url:"https://doi.org/10.1111/sms.13708",warning:"研究で設定した傾斜角度（度）と、アプリの上り・下りの走行コース構成比（％）は異なります。割合から個人の筋肉の負荷やけがの危険は計算できません。",sourceNote:"Vernillo ほか（2020）は成人19人のトレッドミル走で、速度2.50・3.33・4.17 m/s、傾斜角0・±5・±10度における地面反力・筋活動等を調べました。アプリの「上り30％」はコース構成比であり、実験の傾斜角度とは比較できません。"},
 "12部位の参考値の見方":{
   heading:"文献の参考値をどう読めばよい？",lead:"各部位の数値は、その部位自身の文献上の参照値を100として表したものです。あなたの身体の負荷を測定した数値ではありません。まず部位の名前と研究条件を確かめ、適用外の数値は表示しない決まりを確認しましょう。",
   cite:"部位ごとに異なる学術文献",warning:"異なる身体部位同士の大小比較や危険度の順位はできません。速度条件や活動種別に適用できない場合、参考値を無理に算出しません。",
   sourceNote:"文献と測定量・適用条件は部位ごとに異なります。ひとつの原著を12部位すべての共通根拠とはしません。結果画面では数値の可否と限界を確認でき、対応する文献と条件は、結果画面の部位別の出典情報で確認できます。"},
 "自分が感じた疲れ":{
   heading:"自分で感じた疲れを見返す",lead:"運動前と運動後に本人が0〜10で回答した疲労感は、本人の主観的な記録です。0は未回答ではなく、有効な回答として扱います。数値を確認して、どのように感じたかを自分の言葉で振り返れます。",
   cite:"Suzuki・Arai（2026）",url:"https://doi.org/10.1186/s40798-026-01108-8",
   warning:"本人の感じ方と文献参考値は異なる情報です。数値の差だけで原因、身体組織の状態やケガを判断することはできません。",
   sourceNote:"日本語版ROF-Jは大学生85人と大学運動部員35人などで検討された、主観的な疲労感を記録する尺度です。初心者ランナー全員での妥当性や傷害リスクの予測を保証するものではありません。原著で運動前後を比較した大学運動部員35人の研究手順と、本アプリで本人が後から入力する記録は同じではありません。本人が回答した0と未回答を区別します。「運動前／後」は回答区分であり、記録した時点や運動との客観的な時間的順序を証明するものではありません。同一走行内の時間的な前後差は判定しません。"},
 "過去の走りとの比較":{
   heading:"違いを見つけて、自分で考える",lead:"保存された2回の走行を、距離・経過時間・平均ペース・回答した疲労感など同じ意味の項目で並べると、何が異なっていたかを確かめられます。",
   cite:"Li, Dey & Forlizzi（2011）",url:"https://doi.org/10.1145/2030112.2030166",warning:"過去との違いだけでは能力の向上・負荷・原因・次回の結果を示せません。活動種別の相違や欠測がある場合は不適切な比較や補完をしません。",sourceNote:"Li, Dey & Forlizzi（2011）は、自己記録に関する現在・履歴・目標・差異・文脈・要因などの情報ニーズを質的に調べました。記録を並べて問いを考えられるUIの設計背景ですが、この比較機能の効果を直接実証した研究ではありません。"},
 "気付きと次の確認":{
   heading:"気になることを、自分の言葉で残す",lead:"今回の記録と過去の記録を見て、次に何を確かめたいか、気になったことを任意で残せます。毎回メモを残す必要はありません。後で読み返し、考えが変わっていても構いません。",
   cite:"Epstein ほか（2015）",url:"https://doi.org/10.1145/2750858.2804250",warning:"メモの保存や再訪は自己理解の向上を証明しません。記述内容は本人の自由な考えであり、行動指示・医学的助言ではありません。",sourceNote:"Epstein ほか（2015）は日常的な自己記録の収集・振り返り・中断・再開を整理した個人情報学のモデルです。任意メモと後からの再訪を認める設計の背景であり、本アプリの効果を直接示したものではありません。"},
 "疲れの感じ方":{
   heading:"疲れの数字と、自分の感じ方",lead:"走る前と走った後の疲れは、同じ0〜10の尺度で本人が選んだ回答区分として確認します。実際の評価時点や運動との順序を証明するものではありません。自分の感覚を思い出すための手掛かりであり、他人との優劣を表しません。",
   cite:"Suzuki・Arai（2026）",url:"https://doi.org/10.1186/s40798-026-01108-8",
   warning:"運動前の回答を後から補ったものや、回答のない項目を推測しません。文献参考値と合算した総合スコアも作りません。",
   sourceNote:"ROF-Jは主観的疲労を扱う日本語尺度です。妥当性の検討対象は大学生85人と大学運動部員35人であり、初心者ランナーの身体組織や安全性を判定する検査ではありません。原著の運動前後比較は研究条件で実施されたものであり、本アプリでの本人の事後入力を時間的前後差の検証済みデータに変えません。「運動前／後」は本人が選択した回答区分です。入力操作日時や本人申告の評価日時から、運動との実際の時間的順序は証明できず、同一走行内の時間的な前後差は判定しません。"},
 "自分に合う記録の使い方":{
   heading:"毎回すべてを記録しなくてもいい",lead:"気になる項目だけを確かめる、少し間が空いてから振り返る、記録なしで知識を調べるなど、使い方は本人が選べます。記録の量よりも、何を知りたいかを大切にします。",
   cite:"Epstein ほか（2015）",url:"https://doi.org/10.1145/2750858.2804250",warning:"これは自己記録に関する設計方針です。利用継続率や自己理解への効果を検証した結果ではありません。",sourceNote:"Epstein ほか（2015）は日常生活の中で自己記録を中断・再開する経験を扱いました。必要に応じた記録と再訪を可能にする設計上の理由であり、記録の省略が特定の効果を生むと示した研究ではありません。"},
 "睡眠":{
   heading:"睡眠と、走る日の調子",lead:"睡眠は回復や日中の注意・気分とも関係します。短い睡眠や質の低下が続くと運動への影響が懸念されますが、必要な睡眠の長さには個人差があります。",
   cite:"Walsh ほか（2021）",url:"https://doi.org/10.1136/bjsports-2020-102025",warning:"競技者を主な対象とした研究・専門家の合意文書です。初心者個人の必要睡眠時間を指定せず、本人の生活記録から睡眠と走行の因果関係を推定しません。",sourceNote:"Walsh ほか（2021）は競技者の睡眠に関するナラティブレビューと専門家コンセンサスです。初心者向けの個別処方ではなく、本人の睡眠記録と主観的な調子を分けて考えるための背景知識として参照します。"}
};
// Read-only catalog export for scientific/engineering audit; does not change UI behavior.
export const EXPLORATION_LEARNING_SOURCES=Object.freeze(KNOWLEDGE);
export const LEARNING_TOPICS=Object.freeze({"01|距離・時間・ペース":"distance-time-pace","02|足・膝・股関節":"body-movement","03|上り坂・下り坂":"slope-running","05|睡眠":"sleep-recovery","02|12部位の参考値の見方":"reference-reading","01|自分が感じた疲れ":"felt-fatigue","01|過去の走りとの比較":"saved-comparison","01|気付きと次の確認":"voluntary-reflection","04|疲れの感じ方":"fatigue-reading","07|自分に合う記録の使い方":"personal-record-use"});
const followups={
 "body-movement":["次は走るときの股関節の動きを意識してみたい","足首の動きについてもう少し調べたい"],
 "slope-running":["次は上りと下りで感じ方を確かめたい","坂道のある日とない日の記録を見比べたい"],
 "sleep-recovery":["次は起床時の調子も記録してみたい","睡眠の記録を数日分見返してみたい"]
};
// A specialist panel is embedded as evidence for the selected topic.
// Its second leading question and prompting action are removed, keeping
// its record provenance, user-triggered reveals and scientific limits.
function embedSelectedInquiry(markup){
 if(!markup)return '';
 return markup
  .replace(/ aria-labelledby="ex-e-t\d+-title"/,' aria-label="関連する記録の確認"')
  .replace(/<small class="ex-e-kicker">[\s\S]*?<\/small>/,'')
  .replace(/<h3 id="ex-e-t\d+-title"[^>]*>[\s\S]*?<\/h3>/,'')
  .replace(/<p class="ex-e-prompt">[\s\S]*?<\/p>/,'')
  .replace(/<button[^>]*data-ex-action="note"[^>]*>[\s\S]*?<\/button>/,'')
  .replace(/<div class="ex-e-boundary">([\s\S]*?)<\/div>/g,
   '<details class="ex-e-boundary-disclosure"><summary>情報の限界・出所</summary><div class="ex-e-boundary">$1</div></details>');
}
function renderSelectedInquiry(ui,ctx,category,topic){
 // A general theme is not itself a request to disclose or inspect any saved run.
 // Do not render six redundant "no run selected" notices by default.
 if(!ctx.focusRunId||!ctx.focusRun)return '';
 const ref=ctx.focusRunId?{sourceType:'MANUAL',recordId:ctx.focusRunId}:null;
 const record=ctx.focusRun||null;
 const input={ref,record};
 const id=category.id+'|'+topic;
 if(id==='01|自分が感じた疲れ')return renderFatigueInquiry(input,{allowLegacyMemo:false});
 if(id==='04|筋肉痛・違和感')return renderBodyInquiry(input);
 if(id==='03|気温・天候')return renderConditionInquiry(input);
 if(id==='05|日々のコンディション')return renderLifeInquiry({...input,...(ctx.lifeContext||{})});
 if(id==='01|過去の走りとの比較')return renderComparisonInquiry({
  currentRef:ref,current:record,...(ctx.comparisonInquiry||{})
 });
 return '';
}
function experience(ui,ctx,cat,topic,inquiry=''){
 const theme=themeFor(cat.id,topic),key=LEARNING_TOPICS[cat.id+"|"+topic],guide=EXPLORATION_DRAFT_GUIDES[cat.id+"|"+topic];
 if(!theme)return "";
 const strict=createExplorationContext({draft:ctx.draft,conditions:ctx.conditions});
 // A selected run must never inherit a link from separate life data.
 const reason=ctx.focusRunId?null:strict.highlights.find(h=>h.themeId===topic);
 const related=relevance(ui,ctx);
 const specific=related.linked.get(cat.id);
 const relatedSource=related.sources.get(cat.id);
 // UX-023: a genuine saved-run calculation takes precedence over a stale
 // unsaved editor draft in *this lesson card*, but does not change either.
 const lessonRun=key==='distance-time-pace'?latestSavedManualRun(ctx.manualRuns,ctx.focusRunId||null):null;
 const who=lessonRun?
  `${lessonRun.date} に保存した走行距離と時間に関連。保存した手入力の情報との対応です。${relatedSource==="draft"?"入力途中の値はこのテーマの計算に用いていません。":""}`:reason?
  `${reason.why}（${reason.source==="unsaved-draft"?"まだ保存していない入力":"保存済みの生活記録"}）`:specific?
  `${specific}。${relatedSource==="saved-run"?"保存した手入力の情報との対応です。":relatedSource==="draft"?"入力途中の内容であり、保存済み記録ではありません。":relatedSource==="saved-life"?"保存済みの生活記録から確認できます。":"関連情報の出所を確認してください。"}`:
  "関連する入力がなくても、自分の経験から考えられます";
 const h=(text)=>esc(text);
 let tool='';
 if(key==='distance-time-pace'){
  const run=latestSavedManualRun(ctx.manualRuns,ctx.focusRunId||null);
  if(ctx.manualRuns?.ok===false)tool='<div class="ex-tool-result"><strong>走行記録を読み取れません</strong><p>保存データの読み取りに問題があります。記録は変更せず、数値の表示を中止しています。</p></div>';
  else if(!run)tool=ctx.learningEntry?
    '<div class="ex-tool-result" data-ex-no-auto-record><strong>走行は未選択です</strong><p>学習から一般的な問いへ移動しました。保存記録があっても自動では表示しません。本人の走行を確認するときは履歴から選んでください。</p></div><a class="ex-learning-link" href="#/history">履歴で本人が走行を選ぶ ›</a>':
    ctx.focusRunId?
   '<div class="ex-tool-result"><strong>指定した走行を確認できません</strong><p>このリンクに対応する保存済み走行が見つかりません。別の走行の数値で代用せず、履歴から記録を選び直してください。</p></div><a class="ex-learning-link" href="#/history">履歴で記録を選び直す ›</a>':
   '<div class="ex-tool-result"><strong>保存済みの走行はまだありません</strong><p>距離と時間を手入力で保存すると、ここに平均ペースと平均速度が表示されます。入力途中の数値は保存済みとして扱いません。</p></div><a class="ex-learning-link" href="#/record-start">記録を始める ›</a>';
  else{
   const paceSeconds=Math.round(run.durationSeconds/run.distanceKm);
   const pace=`${Math.floor(paceSeconds/60)}:${String(paceSeconds%60).padStart(2,'0')}`;
   const elapsed=`${Math.floor(run.durationSeconds/60)}分${String(run.durationSeconds%60).padStart(2,'0')}秒`;
   const kmh=(run.distanceKm*3600/run.durationSeconds).toFixed(1);
   tool='<div class="ex-tool-result"><strong>'+(ctx.focusRunId?"選択した保存済み走行（手入力）":"最新の保存済み走行（手入力）")+'</strong>'
    +'<p>'+h(run.date)+'</p><p>距離：'+h(run.distanceKm.toFixed(2))+' km</p><p>経過時間：'+h(elapsed)+'</p>'
    +'<p>平均ペース：<strong>'+h(pace)+' 分/km</strong></p><p>平均速度：'+h(kmh)+' km/h</p>'
    +'</div>'
    +'<a class="ex-learning-link" href="'+(ctx.focusRunId?'#/result?record='+encodeURIComponent(run.id):'#/history')+'">'+(ctx.focusRunId?'この走行の結果へ戻る':'履歴で保存した走行を確認')+' ›</a>';
  }
 }else if(['reference-reading','felt-fatigue','saved-comparison','voluntary-reflection','fatigue-reading','personal-record-use'].includes(key)){
  const run=latestSavedManualRun(ctx.manualRuns,ctx.focusRunId||null);
  const readable=ctx.manualRuns?.ok===true&&Array.isArray(ctx.manualRuns.records);
  const count=readable&&!ctx.learningEntry&&(!ctx.focusRunId||run)?ctx.manualRuns.records.filter(x=>x?.source==='manual'&&x.type==='run').length:null;
  const detail=run?'<p>保存済み走行：'+h(run.date)+'、'+run.distanceKm.toFixed(2)+' km、経過時間 '+(run.durationSeconds/60).toFixed(1)+' 分</p>':ctx.manualRuns?.ok===false?'<p>保存データの読み取りに問題があります。記録は変更せず、数値の表示を中止しています。</p>':ctx.learningEntry?'<p data-ex-no-auto-record>学習から移動したため、このテーマでは本人の走行は未選択です。履歴から明示的に選べます。</p>':'<p>記録がなくても自分の経験から考えられます。</p>';
  const feeling=run?'<p>本人の疲労感：運動前 '+(run.rofBefore==null?'未回答':run.rofBefore)+' ／ 運動後 '+(run.rofAfter==null?'未回答':run.rofAfter)+'</p>':'';
  const url=run?'#/result?record='+encodeURIComponent(run.id):'#/history';
  const status=!run?(ctx.manualRuns?.ok===false?'走行記録を読み取れません':ctx.focusRunId?'指定した走行を確認できません':ctx.learningEntry?'走行は未選択です':''):'';
  tool='<div class="ex-tool-result">'+(status?'<strong>'+status+'</strong>':'')+detail+(['felt-fatigue','fatigue-reading'].includes(key)?feeling:'')
   +(key==='saved-comparison'&&count!==null?'<p>保存された手入力走行は'+count+'件です。2件以上あれば結果画面から記録を選んで比較できます。</p>':'')
   +'</div><a class="ex-learning-link" href="'+url+'">'+(run?'この走行の結果へ戻る':'履歴を確認する')+' ›</a>';
 }else if(key==='body-movement'){
  const parts={hip:{label:"股関節",body:"脚を前後に動かす関節。走るときに身体を前へ進める動きに関係します。"},knee:{label:"膝",body:"着地して体を支える間に曲げ伸ばしし、力を受け止める動きに関わります。"},ankle:{label:"足首",body:"地面を押して進むときや、着地の姿勢を調整するときに働きます。"}};
  const part=parts[ui.bodyChoice]||parts.hip;
  const resultLink=ctx.focusRunId&&ctx.focusRun?'#/result?record='+encodeURIComponent(ctx.focusRun.id):'#/history';
  const resultLabel=ctx.focusRunId&&ctx.focusRun?'この走行の結果画面の参考情報を見る':'履歴から結果画面の参考情報を見る';
  tool=`<div class="ex-tool-switch" role="group" aria-label="注目する関節">${Object.entries(parts).map(([id,p])=>`<button type="button" data-ex-body="${id}" aria-pressed="${ui.bodyChoice===id}">${p.label}</button>`).join('')}</div>
  <div class="ex-tool-result"><strong>${h(part.label)}</strong><p>${h(part.body)}</p></div><a class="ex-learning-link" href="${resultLink}">${resultLabel} ›</a>`;
 }else if(key==='slope-running'){
  const course=ctx.focusRunId&&ctx.focusRun?readCourseDraft(ctx.focusRun.draft):strict.course;
  const sourceLabel=ctx.focusRunId&&ctx.focusRun?'保存した走行の入力':'入力途中';
  const choices={up:{label:"上り",title:"上りの動き",points:["股関節：上りでは、平坦より機械的なエネルギーを生み出す働きへの寄与が増えた実験結果があります。","足関節：同じ実験では、上りでも身体を動かす正の関節仕事率に大きく寄与していました。"],observe:"脚を前に運ぶ感覚、お尻やふくらはぎの感じ方、歩幅や速さの変化。"},down:{label:"下り",title:"下りの動き",points:["膝関節：急な下りでは、機械的なエネルギーを吸収する働きの大きさが増えた実験結果があります。"],observe:"着地から膝が曲がるとき、太ももの前側や膝周辺の感じ方、速度を調整した場面。"}};
  const c=choices[ui.toolChoice]||choices.up;
  const direction=ui.toolChoice==='down'?'down':'up';
  const shares=course.status==='complete'&&course.shares?
   `<div class="ex-course-bars" role="img" aria-label="${sourceLabel}の上り${course.shares.up}％、下り${course.shares.down}％、入力上の平坦${course.shares.flat}％"><span style="width:${course.shares.up}%;background:#65ddce"></span><span style="width:${course.shares.down}%;background:#80a9ef"></span><span style="width:${course.shares.flat}%;background:#426577"></span></div><small>${sourceLabel}の割合：上り ${course.shares.up}％／下り ${course.shares.down}％／平坦 ${course.shares.flat}％。GPSによる標高断面ではありません。割合はコースの構成比であり、文献にある傾斜角（度）や路面勾配（％）ではありません。</small>`:
   '';
  tool=`<div class="ex-tool-switch" role="group" aria-label="坂道の方向">${Object.entries(choices).map(([id,item])=>`<button type="button" data-ex-slope="${id}" aria-pressed="${ui.toolChoice===id}">${item.label}</button>`).join('')}</div><div class="ex-tool-result ex-direction-card"><strong>${c.title}</strong>${runningJointDiagram(direction)}<ul class="ex-observation-points">${c.points.map(t=>'<li>'+h(t)+'</li>').join('')}</ul><strong>${direction==='up'?'上りで注目する例':'下りで注目する例'}</strong><p>${h(c.observe)}</p><small>特に違いがない場合や、分からない場合も含めて、覚えている範囲で考えられます。</small></div>${shares?'<div class="ex-course-source">'+shares+'</div>':''}<a class="ex-learning-link" href="${ctx.focusRunId&&ctx.focusRun?'#/result?record='+encodeURIComponent(ctx.focusRun.id):'#/record-course'}">${ctx.focusRunId&&ctx.focusRun?'この走行の結果に戻る':'自分のコース入力を確認'} ›</a>`;
 }else if(key==='sleep-recovery'){
  const life=strict.life,records=life.status==='complete'?life.records:[];
  const latest=records.at(-1)||null;
  const fmt=n=>n===null?'時間の記録なし':Math.floor(n/60)+'時間'+String(n%60)+'分';
  const type=s=>s==='time-in-bed'?'就床から起床までの時間':s==='self-reported'?'記録した睡眠時間':'入力方法が不明';
  tool=ctx.focusRunId?
    '<div class="ex-tool-result"><strong>走行と生活記録は別々に扱います</strong><p>この走行と睡眠・生活コンディションを自動で結びつけていません。別の日の生活記録を、この走行の日の状態として表示しません。</p><small>生活記録は本人が別画面で確認できます。同じ日付でも睡眠が走りの調子の原因とは判断できません。</small></div><a class="ex-learning-link" href="#/condition">生活コンディションの記録を確認 ›</a>':
    '<div class="ex-tool-result"><strong>'+(latest?'いちばん新しい生活記録':'生活記録はまだありません')+'</strong>'
   +(latest?'<p>'+h(latest.date)+'　'+h(fmt(latest.minutes))+'</p><p>朝の調子：'+h(latest.feeling||'記録なし')+'</p><small>'+h(type(latest.source))+'</small>':'<p>睡眠や朝の調子を記録すると、後から振り返れます。</p>')
   +'</div><a class="ex-learning-link" href="#/condition">睡眠と朝の調子を見てみる ›</a>';

 }
 const run=ctx.focusRunId&&ctx.focusRun?ctx.focusRun:null;
 if(!key){
  if(!inquiry&&cat.id==='05'&&topic==='日々のコンディション')tool+='<a class="ex-e-compare-link" href="#/condition">コンディションの履歴を見る</a>';
  if(run)tool+='<a class="ex-learning-link" href="#/result?record='+encodeURIComponent(run.id)+'">この走行の結果へ戻る ›</a>';
  if(!run&&!inquiry&&theme.main==='C1')tool+='<a class="ex-learning-link" href="#/record-course">自分のコース入力を確認 ›</a>';
 }
 const saved=visibleTopicNotes(ui.notes,theme.id,ctx.focusRunId||null).slice(0,2);
 const diagram=theme.main==='A1'?paceDiagram():theme.main==='B2'&&theme.id!=='body-upper'?runningPhaseDiagram():theme.main==='A3'?'<figure class="ex-edu-figure ex-reference-example"><div class="ex-reference-basis"><strong>100</strong><span>参照基準</span></div><figcaption>100は安全・健康の基準ではありません。</figcaption></figure>':theme.main==='D2'?'<figure class="ex-edu-figure ex-reflection-example"><div><small>以前の考え</small><p>坂道のある日に疲れを強く感じた。</p></div><div><small>新しい経験</small><p>別の日は坂道だけでなく距離や速さも違っていた。</p></div><div><small>今の考え</small><p>坂道以外の条件も関係しているかもしれない。</p></div><figcaption>本人が考えを更新する場合の仮想例。アプリが結論を作るものではありません。</figcaption></figure>':'';
 const sourceKind=theme.main==='A1'?'calculation':['A2','D2'].includes(theme.main)?'design':theme.main==='A3'?'model':'research';
 const sourceLabel={calculation:'計算の根拠',design:'設計の参考文献',model:'文献参考値の根拠',research:'参考文献・研究条件'}[sourceKind];
 const source=theme.sources.length?'<details class="ex-inquiry-details ex-knowledge-reference" data-ex-source-kind="'+sourceKind+'"><summary>'+h(sourceLabel)+'</summary>'+theme.sources.map(t=>'<p>'+h(t[0])+'</p>').join('')+'</details>':'<p class="ex-observation-origin"><strong>観察の視点</strong>：<span>本人の経験を整理するための案内です。研究出典に基づく専門解説ではありません。</span></p>';
 return '<div class="ex-learning '+(!key?'ex-observation-guide':'')+'" '+(key?'data-ex-learning="'+key+'" ':'')+'data-ex-inquiry-layout="'+(theme.sources.length?'knowledge':'observation')+'" data-ex-main-theme="'+theme.main+'" data-ex-legacy-view="'+theme.id+'">'+
  '<header class="ex-inquiry-start"><small>探究の入り口</small><h3>'+h(theme.question[0])+'</h3></header>'+
  '<section class="ex-inquiry-stage ex-knowledge-stage"><h4>理解の手掛かり</h4><p>'+h(theme.insight[0])+'</p>'+diagram+
  (theme.example?'<p class="ex-knowledge-example">'+h(theme.example[0])+'</p>':'')+
  (key==='body-movement'||key==='slope-running'?'<div class="ex-tool">'+tool+'</div>':'')+'</section>'+
  '<section class="ex-inquiry-stage"><h4>記録・経験を見返す</h4><p>'+h(theme.review[0])+'</p>'+
  (key==='body-movement'||key==='slope-running'?'':(tool?'<div class="ex-tool">'+tool+'</div>':''))+
  (inquiry?'<div class="ex-inline-inquiry">'+embedSelectedInquiry(inquiry)+'</div>':'')+
  ((specific||reason)?'<details class="ex-inquiry-details ex-linked-source"><summary>関連する記録の出所</summary><p>'+h(ctx.focusRunId?specific||'選択した記録との直接の対応はありません':who)+'</p></details>':'')+
  '</section><section class="ex-inquiry-stage"><h4>記録と感覚を照らし合わせる</h4><p>'+h(theme.consider[0])+'</p><div class="ex-reading-limit"><strong>読み取り上の注意</strong><p>'+h(theme.limit[0])+'</p></div>'+source+'</section>'+
  renderReflectionActions(saved)+'</div>';
}

function groupViews(categories){
 const views=availableViews(categories);
 return EXPLORE_GROUPS.map(g=>({...g,views:views.filter(v=>g.themes.includes(v.main))})).filter(g=>g.views.length);
}
function primaryViews(group){return group.themes.flatMap(id=>{
 const list=group.views.filter(v=>v.main===id);return list.length?[list.find(v=>v.default)||list[0]]:[];
});}
const groupSignals={A:['01'],B:['02','04'],C:['03','05','06'],D:['07']};
const groupGlyph=id=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+({A:'<path d="M4 4v16h16M8 15l4-5 4 2 4-6"/><circle cx="12" cy="10" r="1"/>',B:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',C:'<path d="M2 19L9 7l4 6 3-4 6 10ZM7 10l2 2 2-2"/>',D:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'}[id]||'')+'</svg>';
function viewAttrs(v){return 'data-ex-category="'+esc(v.category)+'" data-ex-pick-topic="'+esc(v.topic)+'"';}
function field(ui,ctx){
 const groups=groupViews(ctx.categories),views=groups.flatMap(g=>g.views),links=relevance(ui,ctx);
 const current=views.find(v=>v.category===ui.selected&&v.topic===ui.topic)||views[0];
 if(!current)return '';
 ui.selected=current.category;ui.topic=current.topic;
 const group=groups.find(g=>g.themes.includes(current.main));
 const main=EXPLORE_THEMES[current.main],topics=primaryViews(group),topicIndex=topics.findIndex(v=>v.main===current.main);
 const category=ctx.categories.find(c=>c.id===current.category),subviews=group.views.filter(v=>v.main===current.main);
 const expanded=ui.mapExpanded!==false;
 const nodes=groups.map(g=>{
  const chosen=g.id===group.id,related=(groupSignals[g.id]||[]).some(id=>links.linked.has(id));
  const representative=chosen?current:primaryViews(g)[0];
  const sources=[...new Set((groupSignals[g.id]||[]).map(id=>links.sources.get(id)).filter(Boolean))];
  const reasons=(groupSignals[g.id]||[]).map(id=>links.linked.get(id)).filter(Boolean);
  const n=ui.canSave?ui.notes.filter(note=>g.views.some(v=>v.category===note.category&&v.id===note.topicId)&&(ctx.focusRunId?ctx.focusRun?.id===ctx.focusRunId&&note.recordId===ctx.focusRunId:!note.recordId)).length:0;
  return '<button type="button" class="ex-area-choice '+(related?'is-related ':'')+(chosen?'is-selected':'')+'" '+viewAttrs(representative)+' data-ex-source="'+esc(sources.length===1?sources[0]:sources.length?'mixed':'none')+'" data-ex-group="'+g.id+'" style="--ex-area-accent:'+g.accent+'" aria-pressed="'+chosen+'" aria-label="'+esc(g.name[0])+'"'+(related?' aria-describedby="ex-area-reason-'+g.id+'"':'')+'><span class="ex-area-symbol" aria-hidden="true">'+groupGlyph(g.id)+'</span><span><strong>'+esc(g.name[0])+'</strong>'+(related?'<small id="ex-area-reason-'+g.id+'">'+reasons.map(esc).join('<br>')+'</small>':'')+'</span>'+(n?'<span class="ex-memory-count" aria-label="'+n+'件のメモ">'+n+'</span>':'')+'<span aria-hidden="true">›</span></button>';
 }).join('');
 const relatedLesson={A1:'pace-basics',B1:'effort-fatigue-recovery',B2:'running-motion-basics',A3:'record-origin-missing',B3:'record-origin-missing',C2:'record-origin-missing',C3:'effort-fatigue-recovery'}[current.main];
 return '<section class="ex-workspace ex-reorganized-workspace"><div class="ex-map-card ex-area-card"><div class="ex-map-head"><h2>気になる分野を選ぶ</h2></div>'+
 '<div class="ex-area-grid" id="ex-area-map" role="group" aria-label="4つの分野から探す"'+(expanded?'':' hidden')+'>'+nodes+'</div>'+
 '<div class="ex-map-foot"><button type="button" class="ex-action quiet" data-ex-action="toggle-map" aria-controls="ex-area-map" aria-expanded="'+expanded+'">'+(expanded?'分野図を閉じる':'分野図を開く')+'</button></div></div>'+
 '<div class="ex-side"><section class="ex-focus" id="ex-topic-content"><div class="ex-focus-label"><span>選んだ分野</span><button type="button" class="ex-action quiet ex-change-area" data-ex-action="change-area">分野を変更</button></div><h2 tabindex="-1">'+esc(group.name[0])+'</h2>'+
 '<div class="ex-topic-controls"><strong>読むテーマ</strong><div class="ex-topic-stepper" role="group" aria-label="テーマの前後移動"><button type="button" data-ex-topic-step="-1" aria-label="前のテーマ"'+(topicIndex===0?' disabled':'')+'><span aria-hidden="true">‹</span></button><output class="ex-topic-position" aria-live="polite">'+(topicIndex+1)+' / '+topics.length+'</output><button type="button" data-ex-topic-step="1" aria-label="次のテーマ"'+(topicIndex===topics.length-1?' disabled':'')+'><span aria-hidden="true">›</span></button></div></div>'+
 '<div class="ex-topic-set ex-main-topic-set" role="group" aria-label="読むテーマ（左右にスワイプして選ぶ）">'+topics.map((v,i)=>'<button type="button" data-ex-topic="'+esc(v.main===current.main?current.topic:v.topic)+'" data-ex-topic-category="'+esc(v.main===current.main?current.category:v.category)+'" aria-pressed="'+(v.main===current.main)+'" class="ex-topic '+(v.main===current.main?'is-picked':'')+'"><strong>'+esc(EXPLORE_THEMES[v.main].title[0])+'</strong><span aria-hidden="true">›</span></button>').join('')+'</div>'+
 '<h3 class="ex-main-title">'+esc(main.title[0])+'</h3>'+
 (subviews.length>1?'<div class="ex-view-switch" role="group" aria-label="観点を選ぶ"><strong>観点を選ぶ</strong><div>'+subviews.map(v=>'<button type="button" data-ex-topic="'+esc(v.topic)+'" data-ex-topic-category="'+v.category+'" data-ex-view="'+v.id+'" aria-pressed="'+(v.id===current.id)+'">'+esc(v.topic)+'</button>').join('')+'</div></div>':'')+
 experience(ui,ctx,category,current.topic,renderSelectedInquiry(ui,ctx,category,current.topic))+(relatedLesson?'<a class="ex-related-learning" data-ex-related-learning href="#/learning?lesson='+relatedLesson+'">関連する学習を見る <span aria-hidden="true">›</span></a>':'')+'</section></div></section>';
}

export function catalogCards(categories,search=""){
 const q=String(search).trim().toLocaleLowerCase();
 const groups=groupViews(categories);
 const result=groups.map(g=>{
  const rows=primaryViews(g).flatMap(v=>{
   const main=EXPLORE_THEMES[v.main];
   const aliases=g.views.filter(x=>x.main===v.main);
   const names=x=>[x.topic,ENGLISH_EXPLORE_REDESIGN[x.topic],ENGLISH_GPS_EXPLORATION_COPY[x.topic],translateUiText(x.topic)].filter(Boolean).map(name=>name.toLocaleLowerCase());
   // A named legacy perspective takes precedence over partial group/title matches.
   const match=q?(aliases.find(x=>names(x).includes(q))||aliases.find(x=>names(x).some(name=>name.includes(q)))||aliases.find(x=>(categories.find(c=>c.id===x.category)?.name||'').toLocaleLowerCase().includes(q))):null;
   if(q&&!match&&!(main.title.join(' ')+' '+g.name.join(' ')).toLocaleLowerCase().includes(q))return [];
   const target=match||v;
   return ['<button type="button" '+viewAttrs(target)+' data-ex-main="'+v.main+'"><strong>'+esc(main.title[0])+'</strong><span aria-hidden="true">›</span></button>'];
  });
  return rows.length?'<section class="ex-catalog-group" style="--ex-accent:'+g.accent+'"><div class="ex-catalog-group-head"><span class="ex-catalog-group-icon" aria-hidden="true">'+groupGlyph(g.id)+'</span><h3>'+esc(g.name[0])+'</h3></div><div class="ex-catalog-items">'+rows.join('')+'</div></section>':'';
 }).join('');
 return result||'<p class="ex-catalog-empty">見つかりませんでした。別の言葉でも探してみてください。</p>';
}

function catalog(ui,ctx){
 return '<section class="ex-catalog"><div class="ex-catalog-head"><div><span class="ex-eyebrow">知りたいことを探す</span><h2>テーマから探す</h2><p>言葉で探したり、分野ごとに眺めたりできます。</p></div></div><label class="ex-search-label"><span class="sr-only">テーマを検索</span><input type="search" data-ex-search placeholder="例：睡眠、上り坂、ペース" value="'+esc(ui.search)+'" autocomplete="off"/></label><div class="ex-catalog-grid">'+catalogCards(ctx.categories,ui.search)+'</div></section>';
}
export function render(ui,ctx){
 if(ctx.learningEntry&&!ctx.focusRunId)ctx={...ctx,draft:null,conditions:null,manualRuns:ctx.manualRuns?.ok===false?ctx.manualRuns:{ok:true,records:[]},lifeContext:null};
 return '<section class="ex-page" data-experience-v3><header class="ex-heading"><h1>探究</h1><div class="ex-heading-actions"><button type="button" class="ex-top-help" data-ex-action="field-help" aria-label="探究の使い方と表示の説明" title="探究の使い方">？</button></div></header>'+
 (ctx.learningEntry?'<div class="ex-learning-entry-hint" data-ex-learning-entry role="status"><span aria-hidden="true">ⓘ</span><p>学習から探究に移りました。走行記録は未選択です。</p><a href="#/history">履歴で選ぶ</a><button type="button" data-ex-entry-dismiss aria-label="案内を閉じる">×</button></div>':'')+
 (ctx.focusRunId?(ctx.focusRun?'<div class="ex-record-return"><div><small>この走行から調べています</small><strong>'+esc(ctx.focusRun.date)+'の保存した走行</strong></div><a href="#/result?record='+encodeURIComponent(ctx.focusRun.id)+'">この走行の結果へ戻る ›</a></div>':'<p class="ex-notice" role="status">指定された走行記録が見つかりません。保存済み記録との関連づけは行いません。</p>'):'')+
 (ui.notice?'<p class="ex-notice" role="status">'+esc(ui.notice)+'</p>':'')+
 '<div class="ex-switch" role="group" aria-label="探し方"><button type="button" data-ex-tab="field" aria-pressed="'+(ui.tab==="field")+'">気になることから</button><button type="button" data-ex-tab="catalog" aria-pressed="'+(ui.tab==="catalog")+'">テーマから探す</button></div>'+
 (ui.tab==="catalog"?catalog(ui,ctx):field(ui,ctx))+
 '<section class="ex-reflection-footer" aria-label="ふり返りノート">'+
 '<button type="button" class="ex-header-memo" data-ex-action="memories"><strong>ふり返りノート</strong><span class="ex-note-count">'+(ui.canSave?(ctx.focusRunId?ui.notes.filter(n=>n.recordId===ctx.focusRunId).length:ui.notes.length)+'件':'確認不可')+'</span><span class="ex-note-chevron" aria-hidden="true">›</span></button></section>' +modal(ui,ctx)+'</section>';
}
function modal(ui,ctx){if(!ui.modal||ui.modal==="learn-help")return "";const category=ctx.categories.find(c=>c.id===ui.selected)||ctx.categories[0],title=ui.topic||category.topics[0]||category.name,links=relevance(ui,ctx);let body="";
 if(ui.modal==="field-help")body='<div class="ex-help-signal"><span class="ex-legend-glow" aria-hidden="true"></span><p>強調表示は、現在入力している情報や保存した走行・生活記録と関連する分野を示します。優先順位や身体への負担の大きさを示すものではありません。</p></div><p>記録がなくても、どの分野も自由に選べます。</p><p>テーマは左右にスワイプするか、矢印で切り替えられます。</p>';
 if(ui.modal==="know")body=`<p>「${esc(title)}」に関連する知識を確認する場所です。</p><div class="ex-dialog-block"><strong>自分の情報との接点</strong><p>${esc(links.linked.get(category.id)||"このテーマを調べるのに記録は必要ありません。")}</p></div><div class="ex-dialog-block"><strong>読み取るときの注意</strong><p>記録や感覚の違いだけでは、原因や身体の状態を判断できません。</p></div><p class="ex-muted">この画面では個別の医学的な判断は行いません。</p>`;
 if(ui.modal==="try")body=`<p>距離と時間を動かして、平均ペースと平均速度の関係を確かめられます。</p><div class="ex-range-label"><label for="ex-distance">距離</label><output data-ex-distance-value>${ui.trialDistance.toFixed(1)} km</output></div><input id="ex-distance" type="range" min="1" max="15" step=".5" value="${ui.trialDistance}" data-ex-distance/><div class="ex-range-label"><label for="ex-minutes">時間</label><output data-ex-minutes-value>${ui.trialMinutes} 分</output></div><input id="ex-minutes" type="range" min="10" max="100" step="1" value="${ui.trialMinutes}" data-ex-minutes/><div class="ex-metric-grid"><div><small>平均ペース</small><strong data-ex-pace>—</strong><em>分/km</em></div><div><small>平均速度</small><strong data-ex-speed>—</strong><em>km/h</em></div></div><p class="ex-muted">算術計算のみ。個人の将来の走りや身体への負荷・ケガを予測するものではありません。</p>`;
 if(ui.modal==="note")body=`<p class="ex-note-topic"><span>テーマ：</span><strong>${esc(title)}</strong></p><p>保存したメモはふり返りノートから読み返せます。</p>${ctx.focusRunId?(ctx.focusRun?"<p>この走行に関連づけて記録します。</p>":"<p>指定した走行が見つからず、関連づけた保存はできません。</p>"):"<p>走行記録には自動で関連づけません。</p>"}<label class="ex-form-label" for="ex-note">メモ（500文字まで）</label><textarea id="ex-note" maxlength="500" rows="4" placeholder="例：上り坂は思っていたより息が上がった。次回はペースを意識してみたい。">${esc(ui.followup||"")}</textarea>${followups[LEARNING_TOPICS[category.id+"|"+title]]?.length?'<div class="ex-note-prompts"><small>書く内容に迷ったら</small>'+followups[LEARNING_TOPICS[category.id+"|"+title]].map((t,i)=>'<button type="button" data-ex-next="'+i+'">'+esc(t)+'</button>').join('')+'</div>':''}<div class="ex-dialog-actions"><button type="button" data-ex-action="save-note" ${!ui.canSave?"disabled":""}>保存する</button></div>${!ui.canSave?'<p class="ex-muted">保存されたメモを安全に読み取れないため、上書き防止のため保存を停止しています。</p>':""}`;
 if(ui.modal==="edit-note"){
  const current=ui.notes.find(n=>n.id===ui.editingNoteId);
  const linked=current?noteRunBackLink(current,ctx.manualRuns):null;
  const linkedDate=linked&&typeof linked.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(linked.date)?linked.date:null;
  const relation=current?.recordId?(linked?(linkedDate?'<span>関連する走行記録：</span> <time datetime="'+esc(linkedDate)+'">'+esc(linkedDate)+'</time>':'関連する走行記録あり'):'関連する走行記録を確認できません'):'走行記録に関連づけていないメモ';
  body=current?'<p>以前の文章を保持し、本人の言葉だけを修正します。元の走行との関連は変更しません。</p>'+
   '<p class="ex-muted" data-ex-note-relation>'+relation+'</p>'+
   '<label class="ex-form-label" for="ex-note-edit">修正後の文章（1〜500文字）</label>'+
   '<textarea id="ex-note-edit" maxlength="500" rows="5">'+esc(current.text)+'</textarea>'+
   '<div class="ex-dialog-actions"><button type="button" data-ex-action="save-edited-note" '+(!ui.canSave?'disabled':'')+'>修正を保存する</button></div>'+
   (current.revisions?.length?'<details><summary><span>以前の文章</span> ('+current.revisions.length+')</summary>'+current.revisions.map(v=>'<p data-user-authored>'+esc(v.text)+'</p>').join('')+'</details>':''):
   '<p role="alert">修正対象のメモが見つかりません。ほかの記録へ変更しません。</p>';
 }
 if(ui.modal==="memories"){
 const memories=ctx.focusRunId?ui.notes.filter(n=>n.recordId===ctx.focusRunId):ui.notes;
 const scope=ctx.focusRunId?(ctx.focusRun?'この走行の気づきだけを表示しています。':'元の走行が見つかりません。以前に結びつけたメモは残っています。'):'すべてのメモを表示しています。記録に結びついた文章は、その記録と区別して扱います。';
 body=!ui.canSave?'<p role="alert">'+esc(ui.notice||'保存したメモを確認できません。原本は変更していません。')+'</p>':memories.length?`<p class="ex-memory-scope" role="status">${esc(scope)}</p><div class="ex-saved-list">${memories.map(n=>`<div class="ex-saved"><div><small><span>${esc(ctx.categories.find(c=>c.id===n.category)?.name||"探究")}</span> · <span>${esc(n.createdAt.slice(0,10))}</span> · <span>${n.recordId?'走行に関連づけたメモ':'単独メモ'}</span>${n.topicId?(()=>{const old=Object.entries(EXPLORE_LEGACY).find(([k,v])=>v.id===n.topicId&&k.startsWith(n.category+'|'));return old?' · <span>'+esc(old[0].split('|')[1])+'</span>':' · <span>テーマ未設定</span>';})():' · <span>テーマ未設定</span>'}${n.updatedAt?' · <span>修正日</span> <span>'+esc(n.updatedAt.slice(0,10))+'</span>':''}</small><p data-user-authored>${esc(n.text)}</p>${n.continuedFromNoteId?(ui.notes.find(source=>source.id===n.continuedFromNoteId&&source.id!==n.id&&noteRunBackLink(source,ctx.manualRuns))?'<small>元の問いから本人が明示的に続けたメモ</small>':'<small>元の問いの出所を確認できません。別の記録に付け替えません。</small>'):''}${n.recordId?(noteRunBackLink(n,ctx.manualRuns)?'<a href="#/result?record='+encodeURIComponent(n.recordId)+'">元の走行結果に戻る ›</a>':'<small>元の走行記録が見つからないためリンクを表示しません</small>'):''}</div><div class="ex-saved-actions"><button type="button" data-ex-edit="${esc(n.id)}" ${!ui.canSave?"disabled":""} aria-label="この記録の文章を修正">修正</button><button type="button" data-ex-delete="${esc(n.id)}" ${!ui.canSave?"disabled":""} aria-label="この記録を削除">削除</button></div></div>`).join("")}</div>`:'<p class="ex-memory-scope" role="status">'+esc(scope)+'</p><p>この範囲にはまだメモがありません。記録を変更したり、ほかの走行の文章を移したりしません。</p>';
 }
 if(ui.modal==="delete-note"){
  const target=ui.notes.find(n=>n.id===ui.deletingNoteId);
  body=target?'<div class="ex-delete-confirm" role="group" aria-label="削除するメモを確認"><p>このメモだけを削除します。削除後は元に戻せません。走行記録や別のメモは変更しません。</p><blockquote data-user-authored>'+esc(target.text)+'</blockquote><div class="ex-dialog-actions"><button type="button" data-ex-action="cancel-delete-note">削除しない</button><button type="button" class="ex-delete-danger" data-ex-action="confirm-delete-note">このメモを削除する</button></div></div>':'<p role="alert">削除対象のメモが見つかりません。保存済みの内容は変更しません。</p>';
 }

 return `<div class="ex-backdrop" data-ex-overlay><section class="ex-dialog" role="dialog" aria-modal="true" aria-labelledby="ex-dialog-title"><div class="ex-dialog-head"><div><small>${esc(category.name)}</small><h2 id="ex-dialog-title">${esc({know:"知る",try:"試す",note:"メモを書く","field-help":"強調表示の意味",memories:"ふり返りノート","edit-note":"メモを修正","delete-note":"メモの削除を確認"}[ui.modal]||ui.modal)}</h2></div><button type="button" data-ex-action="close" aria-label="閉じる">×</button></div>${body}</section></div>`;
}
export function updatePace(root){const d=root.querySelector("[data-ex-distance]"),m=root.querySelector("[data-ex-minutes]");if(!d||!m)return;const distance=Number(d.value),minutes=Number(m.value);root.querySelector("[data-ex-distance-value]").textContent=`${distance.toFixed(1)} km`;root.querySelector("[data-ex-minutes-value]").textContent=`${minutes} 分`;const seconds=Math.round(minutes/distance*60),mm=Math.floor(seconds/60),ss=seconds%60;root.querySelector("[data-ex-pace]").textContent=`${mm}:${String(ss).padStart(2,"0")}`;root.querySelector("[data-ex-speed]").textContent=(distance/(minutes/60)).toFixed(1);}
export function saveNote(ui,text,{focusRunId=null,manualRuns=null}={}){
 const link=resolveOptionalNoteRunLink(focusRunId,manualRuns);
 if(!link.ok)return link;
 if(!ui.canSave||!ui.storage)return {ok:false,reason:"保存領域が利用できません"};const value=String(text??"").trim();if(!value||value.length>500)return {ok:false,reason:"1〜500文字で入力してください"};const time=new Date().toISOString();const id=`${time}-${Math.random().toString(36).slice(2,12)}`;const key=LEARNING_TOPICS[ui.selected+"|"+ui.topic]||EXPLORATION_DRAFT_GUIDES[ui.selected+"|"+ui.topic]?.id;if(ui.notes.length>=LIMIT)return {ok:false,reason:"保存上限の50件に達しています。既存メモを自動削除しません。必要なら本人が選んで削除してください"};
 const next=[{id,category:ui.selected,text:value,createdAt:time,...(key?{topicId:key}:{}),...(link.recordId?{recordId:link.recordId}:{})},...ui.notes];try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);const expected=JSON.stringify(next);if(old!==(ui.notes.length?JSON.stringify(ui.notes):ui.emptyNotesRaw)){ui.canSave=false;return {ok:false,reason:"他の画面で変更されています。元のデータを保護しました"};}ui.storage.setItem(EXPLORATION_NOTE_KEY,expected);if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==expected)return {ok:false,reason:"保存を確認できませんでした"};ui.notes=next;ui.emptyNotesRaw=null;return {ok:true};}catch{return {ok:false,reason:"保存できませんでした"}}}
export function deleteNote(ui,id){if(!ui.canSave||!ui.storage)return false;const oldList=ui.notes;const matches=oldList.filter(n=>n.id===id);if(matches.length!==1)return false;const next=oldList.filter(n=>n.id!==id);try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);if(old!==JSON.stringify(oldList)){ui.canSave=false;return false;}const nextRaw=JSON.stringify(next);ui.storage.setItem(EXPLORATION_NOTE_KEY,nextRaw);if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==nextRaw)return false;ui.notes=next;ui.emptyNotesRaw=next.length===0?nextRaw:null;return true}catch{return false}}

/** Explicit revision: old text and identity are retained, including the
 * original record link and any continuation chain. No silent migration. */
export function editNote(ui,id,text){
 if(!ui?.canSave||!ui.storage)return {ok:false,reason:"保存領域が利用できません"};
 const index=ui.notes.findIndex(n=>n?.id===id);
 if(index<0||ui.notes.filter(n=>n?.id===id).length!==1)return {ok:false,reason:"修正対象のメモを一意に確認できません。別の記録を変更しません"};
 const nextText=String(text??"").trim();
 if(!nextText||nextText.length>500)return {ok:false,reason:"1〜500文字で入力してください"};
 const current=ui.notes[index];
 if(nextText===current.text)return {ok:false,reason:"文章が変更されていません"};
 const revisions=Array.isArray(current.revisions)?current.revisions:[];
 if(revisions.length>=50)return {ok:false,reason:"修正履歴が上限です。古い文章を自動削除しません"};
 const now=new Date().toISOString();
 const revised={...current,text:nextText,updatedAt:now,
  revisions:[...revisions,{text:current.text,editedAt:now}]};
 const next=ui.notes.map((note,i)=>i===index?revised:note);
 const original=JSON.stringify(ui.notes),expected=JSON.stringify(next);
 try{
  if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==original){
   ui.canSave=false;
   return {ok:false,reason:"ほかの画面でメモが変更されています。以前の内容は保護しました"};
  }
  ui.storage.setItem(EXPLORATION_NOTE_KEY,expected);
  if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==expected)
   return {ok:false,reason:"修正内容の保存を確認できませんでした"};
  ui.notes=next;
  return {ok:true,note:revised};
 }catch{return {ok:false,reason:"修正内容を保存できませんでした。以前の内容は変更していません"}}
}
