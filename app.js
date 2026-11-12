import * as restDayStore from './ui/restDayStore.js';
import {startEnglishUi} from './ui/englishUi.js?v=20261111-exploration-inquiry-v1';
(async function appMain(){
  "use strict";
  // Load independent screen modules concurrently instead of a 48-request serial waterfall.
  // No stored data is read or written by this import stage.
  const [
    dashboardPrefs,
    dashboardDrag,
    homeExperience,
    rofScale,
    rofExperience,
    reviewDraft,
    recordReviewExperience,
    manualRunStore,
    manualRunLock,
    canonical,
    recordExperience,
    coursePresets,
    simulationExperience,
    gaitExperience,
    environmentExperience,
    bodyExperience,
    gpsPlatform,
    measurementExperience,
    gpsCore,
    gpsV2,
    gpsDynamic,
    gpsStorageHealth,
    resultExperience,
    questionContinuation,
    historyExperience,
    settingsExperience,
    dataManagement,
    mentalExperience,
    mentalSaveFlow,
    explorationMentalInquiry,
    explorationBodyInquiry,
    explorationConditionInquiry,
    explorationLifeInquiry,
    recordRef,
    explorationLinkPolicy,
    annotationEditor,
    dataManagementUi,
    firstUseExperience,
    legalDocuments,
    consultationExperience,
    explorationExperience,
    learningExperience,
    interpretationExperience,
    interpretationRules,
    actionIntentStore,
    conditionJourney,
    conditionInsights
  ]=await Promise.all([
    import("./ui/homeDashboardLayout.js"),
    import("./ui/homeDashboardDrag.js"),
    import("./ui/homeExperience.js?v=20261111-home-autosave-v1"),
    import("./ui/rofJScale.js"),
    import("./ui/rofExperience.js?v=20261109-p6d-recorddetails-v1"),
    import("./ui/recordDraftReview.js"),
    import("./ui/recordReviewExperience.js?v=20261110-p13-compact-v1"),
    import("./ui/manualRunStore.js?v=20261030-rof-evidence-v2"),
    import("./ui/manualRunLock.js"),
    import("./ui/manualRunCanonical.js"),
    import("./ui/recordExperience.js?v=20261109-p6d-recorddetails-v1"),
    import("./ui/coursePresetStore.js?v=20261026-courses-v30"),
    import("./ui/simulationExperience.js?v=20261110-public-copy-v1"),
    import("./ui/gaitExperience.js?v=20261109-p6d-recorddetails-v1"),
    import("./ui/environmentExperience.js?v=20261109-p6d-recorddetails-v1"),
    import("./ui/bodyContextExperience.js?v=20261109-p6d-recorddetails-v1"),
    import("./ui/gpsPlatform.js?v=20261101-gps-mobile-v1"),
    import("./ui/measurementExperience.js?v=20261109-p6e-crossscreen-v1"),
    import("./ui/gpsMeasurementCore.js?v=20261027-measurement-polish-v2"),
    import("./ui/gpsReplayIndexedDbStore.js?v=20261027-measurement-polish-v2"),
    import("./ui/gpsDynamicResult.js?v=20261028-back-symmetry-v2"),
    import("./ui/gpsStorageHealth.js?v=20261027-gps-storage-v40"),
    import("./ui/resultExperience.js?v=20261110-public-copy-v1"),
    import("./ui/runQuestionContinuation.js"),
    import("./ui/historyExperience.js?v=20261110-p14-visual-v4"),
    import("./ui/settingsExperience.js?v=20261111-settings-dialog-v1"),
    import("./ui/portableDataV2.js?v=20261108-professor-m3-v1"),
    import("./ui/mentalExperience.js?v=20261108-professor-m4-v1"),
    import("./ui/mentalSaveFlow.js?v=20261108-professor-m4-v1"),
    import("./ui/explorationMentalInquiry.js"),
    import("./ui/explorationBodyInquiry.js"),
    import("./ui/explorationConditionInquiry.js"),
    import("./ui/explorationLifeInquiry.js"),
    import("./ui/recordRef.js"),
    import("./ui/explorationLinkPolicy.js?v=20261108-professor-m6-v1"),
    import("./ui/annotationEditor.js?v=20261108-professor-m5-v1"),
    import("./ui/dataManagementUi.js?v=20261111-settings-dialog-v1"),
    import("./ui/firstUseExperience.js?v=20261111-settings-dialog-v1"),
    import("./ui/legalDocuments.js?v=20261028-first-use-v1"),
    import("./ui/consultationExperience.js?v=20261109-p7-wording-v1"),
    import("./ui/explorationExperience.js?v=20261111-exploration-inquiry-v1"),
    import("./ui/learningExperience.js?v=20261111-explore-controls-v1"),
    import("./ui/interpretationView.js?v=20261026-interpret-v14"),
    import("./ui/interpretationRules.js?v=20261026-interpret-v14"),
    import("./ui/actionIntentStore.js?v=20261026-interpret-v14"),
    import("./ui/conditionJourney.js?v=20261026-condition-v15"),
    import("./ui/conditionInsights.js?v=20261026-condition-v15")
  ]);
  // Independent IndexedDB stores can initialize together. Wait for canonical data
  // before the first actual screen to avoid treating unread records as absent.
  const [initialGpsV2Cache,canonicalStartup]=await Promise.all([
    gpsV2.readGpsV2Summaries(),
    canonical.initialize()
  ]);
  // GPS summaries can be refreshed after saves, deletes and app focus.
  let gpsV2Cache=initialGpsV2Cache;
  const app=document.querySelector("#app");
  // Legal dialogs live in the viewport; retain the originating control for focus return.
  let legalReturnFocus=null;
  function dismissLegalDialog(){
    document.body.querySelector(':scope > .fu-doc-backdrop')?.remove();
    const trigger=legalReturnFocus;legalReturnFocus=null;
    if(trigger?.isConnected)trigger.focus({preventScroll:true});
  }
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const CATEGORIES=[
    {id:"01",name:"走りの記録",color:"#2579dc",tint:"#e8f3ff",icon:"◷",topics:["距離・時間・ペース","自分が感じた疲れ","過去の走りとの比較","気付きと次の確認"]},
    {id:"02",name:"身体のしくみ",color:"#db8c28",tint:"#fff2df",icon:"◉",topics:["足・膝・股関節","姿勢と走る動作","体幹と腕の動き","12部位の参考値の見方"]},
    {id:"03",name:"コースと環境",color:"#16996f",tint:"#e2f9ec",icon:"△",topics:["上り坂・下り坂","路面","気温・天候","屋外・室内"]},
    {id:"04",name:"疲れと回復",color:"#b448d1",tint:"#f8e9ff",icon:"♡",topics:["疲れの感じ方","筋肉痛・違和感","休養と回復","疲れを考える視点"]},
    {id:"05",name:"暮らしと気持ち",color:"#129b9f",tint:"#e2fbf6",icon:"✦",topics:["睡眠","食事・水分","気分・ストレス","日々のコンディション"]},
    {id:"06",name:"走る前後の工夫",color:"#7658dc",tint:"#efebff",icon:"✳",topics:["ウォームアップ","走行中の対応","クールダウン・ストレッチ","無理をしない判断"]},
    {id:"07",name:"目的と楽しみ方",color:"#d44a86",tint:"#ffeaf2",icon:"⚑",topics:["走る目的","目標との付き合い方","楽しみ方","自分に合う記録の使い方"]}
  ];
  const state={mode:"today",category:"03",topic:"上り坂・下り坂",recordType:"run",feeling:"",recordDraft:{distance:"",hours:"",minutes:"",seconds:"",date:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),memo:"",rofBefore:null,rofAfter:null,steps:"",stepsProvenance:"UNKNOWN",activityGait:"UNKNOWN",runningFormat:"UNKNOWN",runWalkRunningDistanceKm:"",runWalkRunningDurationMinutes:"",courseName:"",gradeMode:"UNKNOWN",upPercent:"",downPercent:"",upGradePercent:"",downGradePercent:"",surfaceMode:"UNKNOWN",primarySurface:"",temperatureC:"",environmentNote:"",bodyObservation:"",shoeName:"",...Object.fromEntries(Array.from({length:5},(_,i)=>[[`sectionShare${i}`,""],[`sectionDirection${i}`,"FLAT"],[`sectionGrade${i}`,""],[`sectionSurface${i}`,"UNKNOWN"]]).flat()),...Object.fromEntries(["paved","track","treadmill","soil","trail","naturalGrass","artificialTurf","sand"].map(k=>[`surface${k}`,""]))},recordPreviewOpen:false,recordReviewSource:"manual",recordReviewReturn:false,recordOpenSections:[],rofEditorOpen:false,treeZoom:1,treeScroll:null,historyMode:"all",historyDate:null,toast:"",sheetVisible:false,sheetExpanded:false};
  state.recordCourseUi=recordExperience.initialCourseUi(state.recordDraft);
  const homePreferenceStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const homePreferenceState=dashboardPrefs.loadHomeDashboardLayout(homePreferenceStorage);
  const homeEditState={editing:false,draft:null,notice:""};
  const homeUi={guideOpen:false,conditionOpen:false,achievementOpen:false,conditionDate:homeExperience.todayLocal(),deletePendingDate:null};
 // Each successful display-only edit is saved before it is shown as committed.
 // Failed writes retain the last known good layout; another tab's changes win.
 function commitHomeLayout(next){
  if(!homeEditState.editing||!dashboardPrefs.isValidHomeDashboardLayout(next)){
   homeEditState.notice="表示の変更を確認できませんでした";return false;
  }
  if(JSON.stringify(next)===JSON.stringify(homePreferenceState.layout)){
   homeEditState.draft=dashboardPrefs.copyHomeDashboardLayout(homePreferenceState.layout);
   homeEditState.notice="";return true;
  }
  if(!homePreferenceState.canSave){
   homeEditState.notice=homePreferenceState.reason||"表示設定を保存できません";return false;
  }
  const saved=dashboardPrefs.saveHomeDashboardLayout(homePreferenceStorage,next,{expectedLayout:homePreferenceState.layout});
  if(!saved.ok){homeEditState.notice=saved.reason;return false;}
  homePreferenceState.layout=dashboardPrefs.copyHomeDashboardLayout(next);
  homeEditState.draft=dashboardPrefs.copyHomeDashboardLayout(next);
  homeEditState.notice="";
  return true;
 }
  let gpsController=null;
  const emptyGpsReport=()=>({rofBefore:null,rofAfter:null,beforeCapturedAt:null,afterCapturedAt:null,memo:'',saveRoute:false});
  let gpsSelfReport=emptyGpsReport();
  let dynamicPlayback=null;
  let gpsTicker=null;
  let gpsWakeLock=null,gpsWakeLockGeneration=0;
  const releaseGpsWakeLock=()=>{
    // Invalidate pending lock requests, including rapid pause/resume cycles.
    gpsWakeLockGeneration++;
    const lock=gpsWakeLock;gpsWakeLock=null;
    if(lock)Promise.resolve().then(()=>lock.release()).catch(()=>{});
  };
  const requestGpsWakeLock=async()=>{
    const gps=gpsController,generation=gpsWakeLockGeneration;
    if(!gps?.state.keepScreenAwake||gps.state.phase!=='running'||document.hidden||gpsWakeLock)return;
    if(typeof navigator.wakeLock?.request!=='function'){
      gps.state.notice='この端末は画面の点灯保持に対応していません。GPS計測は続きます。';
      measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gps.state,gps.elapsed());return;
    }
    try{
      const lock=await navigator.wakeLock.request('screen');
      if(gpsWakeLockGeneration!==generation||gpsController!==gps||gps.state.phase!=='running'||document.hidden||gpsWakeLock){await lock.release();return;}
      gpsWakeLock=lock;
      lock.addEventListener?.('release',()=>{if(gpsWakeLock===lock)gpsWakeLock=null;});
    }catch{
      if(gpsController===gps&&gps.state.phase==='running'){
        gps.state.notice='画面の点灯保持を利用できませんでした。GPS計測は続きます。';
        measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gps.state,gps.elapsed());
      }
    }
  };
  let pendingGpsV2Backup=null,gpsV2BackupNotice="";
  let gpsCapacity=null,gpsCapacityNotice="";
  // GPS access needs a fresh, app-level affirmative choice on every start/resume.
  // Browser OS permission persistence is not equivalent to session consent.
  let gpsConsentAction="";
  const ensureGps=()=>{
    if(!gpsController)gpsController=gpsCore.createGpsSession({
      geo:(()=>{try{return navigator.geolocation}catch{return null}})(),
      onChange:current=>{
        measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),current,gpsController?.elapsed()||0);
        if(current.phase!=='running'){
          refreshGpsTicker();releaseGpsWakeLock();
          if(app.querySelector('[data-gps-live-page]')?.dataset.phase!==current.phase&&currentPage()==='measurement')render();
        }
      }
    });
    return gpsController;
  };
  function refreshGpsTicker(){
    if(gpsTicker!==null){clearInterval(gpsTicker);gpsTicker=null;}
    if(gpsController?.state.phase==='running'&&currentPage()==='measurement')gpsTicker=setInterval(()=>{
      if(currentPage()!=='measurement'){clearInterval(gpsTicker);gpsTicker=null;return;}
      gpsController.checkGoal();measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gpsController.state,gpsController.elapsed());
    },1000);
  }
  const simulationUi=simulationExperience.newSimulationUi();
  const historyUi=historyExperience.createHistoryUi();
  // Presentation-only state; never persisted to saved-run or GPS storage.
  let gpsHistoryExpanded=false,gpsHistoryManageExpanded=false;
  let learningEntryHintShown=false;
  let lastExploreRoute=null;
  const explorationUi=explorationExperience.makeUi((()=>{try{return window.localStorage}catch{return null}})());
  // Return keyboard users to the inquiry control that opened a modal, after re-rendering.
  let explorationReturnAction="";
  function restoreExplorationFocus(){
    const action=explorationReturnAction;explorationReturnAction="";
    if(!action)return;
    [...app.querySelectorAll('[data-ex-action]')].find(el=>el.dataset.exAction===action)?.focus();
  }
  const lifeCompareUi={a:"",b:"",open:false,notice:""};
  let manualSaveNotice="";
  // When the success acknowledgment is lost, a repeated click must reuse one
  // request ID, including after a same-tab reload. No implicit new parent ID.
  const pendingManualKey='runload-v2-pending-manual-commit-id';
  let manualSaveRequestId=null;
  try{const id=sessionStorage.getItem(pendingManualKey);
   if(/^run-v1-[0-9a-f-]{36}$/.test(id||''))manualSaveRequestId=id;}catch{}
  const manualSaveIdentity=()=>{
   if(manualSaveRequestId)return manualSaveRequestId;
   const id=globalThis.crypto?.randomUUID?.();if(!id)return null;
   manualSaveRequestId='run-v1-'+id;
   try{sessionStorage.setItem(pendingManualKey,manualSaveRequestId);}catch{}
   return manualSaveRequestId;
  };
  const clearManualSaveIdentity=()=>{
   manualSaveRequestId=null;try{sessionStorage.removeItem(pendingManualKey);}catch{}
  };

  const manualMental=mentalExperience.newMentalDraft();
  let gpsMental=mentalExperience.newMentalDraft();
  const mentalPending=new Map();
  let mentalSaveBusy=false;
  const mentalKey=ref=>ref.sourceType+':'+ref.recordId;
  async function saveOptionalMentalAfterParent(ref,draft){
    // Parent has been committed. An annotation failure MUST NOT re-save the original.
    const parent=await recordRef.resolveRecord(ref);
    if(!parent.ok)return {ok:false,reason:'走行記録の保存後照合ができません。元記録を二重保存せず確認してください'};
    const made=mentalExperience.makeMentalAppendRequest(ref,draft);
    if(!made.ok)return {ok:false,reason:made.reason};
    if(!made.request)return {ok:true,status:'NO_ANSWER'};
    const key=mentalKey(ref),entry={request:made.request,reason:''};
    mentalPending.set(key,entry);
    let saved;
    try{saved=await mentalSaveFlow.saveMentalOnly(entry)}
    catch{saved={ok:false,reason:'任意回答の保存結果が不明です。操作IDを変えず再確認してください'}}
    if(saved.ok)mentalPending.delete(key);
    else entry.reason=saved.reason||'保存先を確認できません';
    return saved;
  }

  function resultPostHocOptions(ref,host){
    let html='';
    const paint=()=>{const node=host.shadowRoot?.querySelector('[data-posthoc-summary]');if(node)node.innerHTML=html;};
    async function inspect(){
      const [storage,model,core]=await Promise.all([
       import('./ui/annotationStore.js'),import('./ui/annotationReadModel.js'),import('./ui/annotationEditorCore.js')]);
      const parent=await recordRef.resolveRecord(ref);
      if(!parent.ok)throw Error('parent unreadable');
      const opened=await storage.openAnnotationStore();if(!opened.ok)throw Error('annotations unreadable');
      const fields=ref.sourceType==='MANUAL'?['bodyObservation']:['bodyObservation','rofBefore','rofAfter'];
      const rows=[];
      try{
       for(const field of fields){
        const v=await model.readEffectiveAnnotation(opened.value.db,ref,field);
        if(!v.ok)throw Error('annotation readback failed');
        if(v.value.status!=='ACTIVE')continue;
        const label={bodyObservation:'身体の観察',rofBefore:'運動前ROF-J',rofAfter:'運動後ROF-J'}[field];
        rows.push('<div class="rv4-posthoc-row"><strong>'+esc(label)+'</strong>'+
         '<span>記録時（原本）：'+esc(core.originalFieldValue(ref,parent.value.record,field))+'</span>'+
         '<span>後日申告（科学計算に未使用）：'+esc(core.postHocValue(field,v.value.latest.payload))+'</span></div>');
       }
      }finally{opened.value.db.close();}
      html=rows.length?'<strong>記録時と後日申告は別の情報です</strong>'+rows.join('')+
       '<small>後日申告は元の科学計算・過去比較に使用しません。原因や変化を自動判定しません。</small>':'';
      paint();
    }
    Promise.resolve().then(inspect).catch(()=>{html='<p role="alert">後日申告を安全に確認できません。補完画面から確認してください。</p>';paint();});
    return {getPostHocHtml:()=>html};
  }
  function resultMentalOptions(ref,host){
    const key=mentalKey(ref),options={mentalRef:ref,showMentalPending:mentalPending.has(mentalKey(ref)),mentalHtml:'<p>本人の任意回答を確認しています…</p>'};
    options.getMentalHtml=()=>options.mentalHtml;
    const paint=async()=>{
      let read;
      try{read=await mentalSaveFlow.readMental(ref)}
      catch{read={ok:false,code:'READ_FAILED'};}
      const pending=mentalPending.get(key);
      if(pending&&read.ok&&read.value.status==='ACTIVE'&&read.value.latest.eventId===pending.request.eventId)
       mentalPending.delete(key);
      const left=mentalPending.get(key);
      options.mentalHtml=mentalExperience.mentalResultHtml(read,{pending:!!left,reason:left?.reason||''});
      if(host.isConnected){
       const target=host.shadowRoot?.querySelector('[data-mental-result]');
       if(target)target.innerHTML=options.mentalHtml;
      }
    };
    options.onRetryMental=async()=>{
      if(mentalSaveBusy)return;
      const pending=mentalPending.get(key);if(!pending)return;
      mentalSaveBusy=true;
      options.mentalHtml='<p role="status">任意の回答だけを再確認しています…</p>';
      const target=host.shadowRoot?.querySelector('[data-mental-result]');
      if(target)target.innerHTML=options.mentalHtml;
      try{
       const saved=await mentalSaveFlow.saveMentalOnly(pending);
       if(saved.ok)mentalPending.delete(key);
       else pending.reason=saved.reason||'再確認できませんでした';
      }catch{pending.reason='再試行後も保存を確認できませんでした'}
      finally{mentalSaveBusy=false;await paint()}
    };
    Promise.resolve().then(paint);
    return options;
  }
  let selectedRunId=null;
  const conditionUi={days:30,method:"auto",focus:"all",selected:"",notice:"",scrollLeft:null};
  const environmentUi=environmentExperience.newEnvironmentUi();
  const bodyUi=bodyExperience.makeUi();
  const rofUi=rofExperience.createRofUiState();
  const gpsRofUi=rofExperience.createRofUiState();
  const gpsRofActive=()=>currentPage()==='gps-rof'&&gpsPlatform.currentGpsSmartphone()&&['ready','finished'].includes(ensureGps().state.phase);
  const getRofData=()=>gpsRofActive()?gpsSelfReport:state.recordDraft;
  const getRofUi=()=>gpsRofActive()?gpsRofUi:rofUi;
  const syncGpsRofCapture=phase=>{
    const key=phase==='before'?'rofBefore':'rofAfter';
    const stamp=phase==='before'?'beforeCapturedAt':'afterCapturedAt';
    gpsSelfReport[stamp]=Number.isInteger(gpsSelfReport[key])?new Date().toISOString():null;
  };
  const onboardingKey="runload-v2-introduction-preview-v1";
  const nativeStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const onboardStorage=canonical.viewStorage(nativeStorage);
  const loadIntro=()=>{try{return JSON.parse(onboardStorage?.getItem(onboardingKey)||"null")}catch{return null}};
  const introStored=loadIntro();
  if(!canonicalStartup.ok)state.toast='手入力記録の正本を利用できません。保存は停止しました。';
  const readSettingsSnapshot=key=>{try{return onboardStorage?.getItem(key)??null}catch{return undefined}};
  const settingsUi={profile:settingsExperience.loadProfile(onboardStorage,introStored||{}),display:settingsExperience.loadDisplay(onboardStorage),notice:"",
   profileSnapshot:readSettingsSnapshot(settingsExperience.PROFILE_KEY),displaySnapshot:readSettingsSnapshot(settingsExperience.DISPLAY_KEY)};
  const dataUi=dataManagementUi.makeDataUi();
  const confirmedDeleteWord=()=>dataUi.deleteWord===(settingsUi.display.language==='en'?'DELETE':'削除');
  settingsExperience.applyDisplay(settingsUi.display,document.documentElement);
  const englishUi=startEnglishUi(document,{language:settingsUi.display.language});
  const hasPriorLegalRecord=(()=>{try{return !!onboardStorage?.getItem(legalDocuments.LEGAL_CONSENT_KEY)}catch{return false}})();
  const needsLegalReconfirmation=!!introStored?.completed&&hasPriorLegalRecord&&!legalDocuments.readLegalConsent(onboardStorage);
  const onboardingState={open:!introStored?.completed||needsLegalReconfirmation,step:needsLegalReconfirmation?1:0,reconsentOnly:needsLegalReconfirmation,replay:false,language:settingsUi.display.language,termsAccepted:false,privacyConfirmed:false,error:"",nickname:settingsUi.profile.nickname,purpose:settingsUi.profile.purpose,heightCm:String(settingsUi.profile.heightCm??""),weightKg:String(settingsUi.profile.weightKg??""),ageBand:settingsUi.profile.ageBand};
  const pageLabels={condition:"コンディションの歩み",home:"ホーム",record:"記録","record-start":"記録を始める","record-review":"記録内容の確認","record-course":"コース・走行条件","record-rof":"運動前後の疲労感","record-more":"追加情報","record-compare":"歩数・走り方","record-reflection":"身体・使用品・メモ","record-environment":"環境",result:"結果","dynamic-result":"動的結果",history:"履歴",annotation:"記録の後日補完","exploration-tree":"探究",learning:"学習",settings:"設定",measurement:"測定","gps-review":"GPS記録内容の確認","gps-rof":"GPSの疲労感",course:"コース設計",simulation:"シミュレーション",consultation:"相談・共有","body-part-detail":"部位詳細"};
  const desktopNav=[["home","⌂","ホーム"],["record","✎","記録"],["result","▥","結果"],["history","◷","履歴"],["exploration-tree","⚭","探究"],["learning","▣","学習"],["settings","⚙","設定"]];
  const mobileNav=[["home","⌂","ホーム"],["record-start","✎","記録"],["history","◷","履歴"],["exploration-tree","⚭","探究"],["learning","▣","学習"],["settings","⚙","設定"]];
  const currentPage=()=>{const raw=location.hash.replace(/^#\/?/,"");const path=raw.split("?")[0];return path==="history"&&raw.includes("life=1")?"condition":pageLabels[path]?path:"home"};
  const navIcon=function navIcon(name){
  const shapes={
   home:'<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-9h6v9"/>',
   record:'<path d="M7 3h10v3H7zM5 6h14v15H5z"/><path d="M9 11h6M9 15h6"/>',
   result:'<rect x="3" y="10" width="4" height="11" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="17" y="12" width="4" height="9" rx="1"/>',
   history:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4.5 3"/>',
    learning:'<path d="M3 5h7c2 0 3 1 3 3v13c0-2-2-3-4-3H3z"/><path d="M21 5h-7c-2 0-3 1-3 3v13c0-2 2-3 4-3h6z"/>',
   "exploration-tree":'<path d="M4 10c2-5 6-6 8-1 2-5 6-4 8 1-1 5-5 6-8 10-3-4-7-5-8-10z"/><path d="M12 20V10"/>',
   settings:'<circle cx="12" cy="12" r="3"/><path d="m9 2 1 3h4l1-3 4 2-1 3 3 3-1 4 3 1-2 5-3-1-3 2-1 3H9l-1-3-3-2-3 1-2-5 3-1-1-4 3-3-1-3z"/>'
  };
  return `<svg class="nav-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.home}</svg>`;
};
  const navHtml=(items,page,mobile)=>items.map(([path,icon,label])=>`<a class="${mobile?"mobile-link":"side-link"} ${page===path?"is-active":""}" href="#/${path}" ${page===path?'aria-current="page"':""}><span class="nav-icon">${navIcon(path)}</span>${label}</a>`).join("");
  const header=(name,description,right="")=>`<section class="card page-hero"><div><h1>${name}</h1><p class="lead">${description}</p></div>${right}</section>${sheetBody}`;
  // Result reference maps and charts are owned by resultExperience, with
  // saved-input science data. Legacy demo/reference charts were removed.
  const valid=x=>x!==null&&x!==undefined&&Number.isFinite(x);
  // S02 optional screen-specific guidance. Does not write user data.
  function homeScreenGuide(){
    if(!homeUi.guideOpen)return '<section id="home-screen-guide" hidden aria-label="ホーム画面の使い方"></section>';
    return `<section id="home-screen-guide" class="hx-screen-guide" role="region" aria-labelledby="home-screen-guide-title">
      <div class="hx-guide-bar"><div><span class="hx-guide-eyebrow">画面ガイド · ホーム</span>
      <h2 id="home-screen-guide-title" tabindex="-1">この画面でできること</h2>
      <p>必要な項目だけ使えます。すべて記録する必要はありません。</p></div>
      <button type="button" class="hx-guide-close" data-home-guide-close aria-label="ホーム画面の使い方ガイドを閉じる">閉じる ×</button></div>
      <ol class="hx-guide-steps">
        <li><span aria-hidden="true">01</span><div><strong>走行を記録する</strong><p>「記録」から手入力またはGPS測定を選びます。記録がないときは「最新の走行」からも開始できます。</p></div></li>
        <li><span aria-hidden="true">02</span><div><strong>自分の記録に戻る</strong><p>保存した走行は「結果」や「履歴」で再び確認できます。入力しない日があっても問題ありません。</p></div></li>
        <li><span aria-hidden="true">03</span><div><strong>表示を自分好みに</strong><p>「編集」でカードの並べ替えや表示切替ができます。記録自体は変わりません。</p></div></li>
      </ol>
      <p class="hx-guide-note">生活コンディションは任意の別記録です。睡眠などの数値だけで健康状態を判断するものではありません。</p>
    </section>`;
  }
  function home(){
 const editing=homeEditState.editing;
 const pref=editing?homeEditState.draft:homePreferenceState.layout;
 const names=dashboardPrefs.HOME_DASHBOARD_WIDGETS;
 const savedRunState=manualRunStore.readManualRuns(onboardStorage);
 const cards={
  latest:homeExperience.latestCard(savedRunState.ok?savedRunState.records.slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''))[0]||null:null,savedRunState),
  condition:homeExperience.conditionCard(homePreferenceStorage),
  topics:homeExperience.achievementCard(savedRunState),
  shortcuts:homeExperience.shortcutsCard(),
  trend:homeExperience.trendCard(savedRunState),
  discovery:homeExperience.discoveryCard(explorationUi.notes)
 };
 const storedLayout=pref||dashboardPrefs.defaultHomeDashboardLayout();
 // Only for the uncustomized default: a voluntary reflection makes the
 // optional continuation card relevant. Never override a saved hide choice.
 const hasReflection=explorationUi.notes.some(n=>n&&typeof n.text==='string'&&n.text.trim());
 const defaultUncustomized=(()=>{try{return homePreferenceStorage?.getItem(dashboardPrefs.HOME_DASHBOARD_KEY)===null}catch{return false}})();
 const current=!editing&&hasReflection&&defaultUncustomized&&!storedLayout.visible.includes('discovery')?
  {...storedLayout,visible:[...storedLayout.visible,'discovery']}:storedLayout;
 const widgets=current.order.map(id=>{
  const w=names.find(e=>e.id===id);
  const visible=current.visible.includes(id);
  if(!w||(!visible&&!editing))return "";
  const idx=current.order.indexOf(id);
  const editingControls=editing?`<div class="dashboard-widget-controls" role="group" aria-label="${esc(w.title)}の編集"><div class="widget-drag-title"><button type="button" class="widget-drag-handle" data-home-drag-handle aria-label="${esc(w.title)}を長押しして並べ替える" title="長押しして移動">⠿</button><span class="widget-edit-label">${esc(w.title)} ${!visible?"（非表示）":""}</span></div><div class="widget-edit-actions"><button type="button" data-widget-action="up" data-widget-id="${id}" ${idx===0?"disabled":""} aria-label="${esc(w.title)}を上へ">↑</button><button type="button" data-widget-action="down" data-widget-id="${id}" ${idx===current.order.length-1?"disabled":""} aria-label="${esc(w.title)}を下へ">↓</button><button type="button" data-widget-action="size" data-widget-id="${id}" aria-label="${esc(w.title)}のサイズ変更">${current.sizes[id]==="full"?"小さく":"横幅いっぱい"}</button><button type="button" data-widget-action="toggle" data-widget-id="${id}" aria-label="${esc(w.title)}を${visible?"隠す":"表示"}">${visible?"非表示":"追加"}</button></div></div>`:"";
  return `<div data-home-dashboard-id="${id}" class="dashboard-widget ${current.sizes[id]==="full"?"dashboard-widget--wide":"dashboard-widget--half"} ${!visible?"dashboard-widget--hidden":""}" ${editing?`data-home-editable="true"`:""}>${editingControls}<div class="dashboard-widget-content">${cards[id]||""}</div></div>`;
 }).join("");
 const controls=editing?`<section class="dashboard-edit-toolbar" role="group" aria-label="ホームの表示を編集"><div><strong>ホームの表示を編集</strong><p>ハンドルを長押しして移動できます。上下ボタン・表示・サイズ変更も使えます。操作するとすぐに保存されます。</p></div><div class="dashboard-edit-buttons"><button type="button" class="btn" data-home-reset>初期配置に戻す</button></div></section>`:"";
 return `<div class="home-v3"><section class="home-head"><h1>ホーム</h1><div class="home-heading-actions">
 <button type="button" class="btn dashboard-edit-trigger" data-home-edit aria-pressed="${editing}" ${!homePreferenceState.canSave?"disabled":""}>${editing?"編集を終了":"編集"}</button>
 <button type="button" class="hx-help-toggle" data-home-guide-toggle aria-expanded="${homeUi.guideOpen}" aria-controls="home-screen-guide" aria-label="ホーム画面の使い方" title="ホーム画面の使い方">？</button>
 </div></section>
 ${homeEditState.notice?`<div class="dashboard-edit-notice" role="status">${esc(homeEditState.notice)}</div>`:""}
 ${!homePreferenceState.canSave?`<p class="dashboard-storage-warning" role="alert">${esc(homePreferenceState.reason)}</p>`:""}
 ${controls}
 ${homeScreenGuide()}
 <div class="dashboard-custom-grid ${editing?"dashboard-custom-grid--editing":""}" aria-label="ホームの表示">${widgets}</div>
  ${(()=>{const r=actionIntentStore.loadIntent(onboardStorage);const conditions=homeExperience.readConditions(onboardStorage);const insights=conditionInsights.loadConditionInsights(onboardStorage);return conditionJourney.renderHomeConditionFollowup(r.intent,conditions,insights,r.ok?"":r.reason,conditionUi.notice);})()}
 ${homeUi.conditionOpen?homeExperience.conditionPanel(homePreferenceStorage,homeUi.conditionDate,homeUi.deletePendingDate):""}
 ${homeUi.achievementOpen?homeExperience.achievementPanel(savedRunState):""}
 </div>`;
}
    function rofPanel(){
 const anchors=rofScale.ROF_J_ANCHORS.map(a=>`<div class="rof-anchor-card" aria-label="${esc(a.positionLabel)}、${esc(a.descriptor)}">
   <img src="${esc(rofScale.referenceImageUrl(a))}" alt="" loading="lazy">
   <strong>${esc(a.positionLabel)}</strong><span>${esc(a.descriptor)}</span></div>`).join("");
 const fields=[["rofBefore","運動前"],["rofAfter","運動後"]].map(([key,label])=>{
  const n=state.recordDraft[key],selected=rofScale.isValidRofJ(n);
  return `<div class="rof-entry" data-rof-entry="${key}"><label for="rof-${key}"><strong>${label}</strong><output data-rof-output="${key}">${selected?n:"—"}</output><span class="rof-of-ten">/ 10</span></label>
  <input id="rof-${key}" type="range" data-rof-input="${key}" min="0" max="10" step="1" value="${selected?n:5}" aria-label="${label}のROF-J疲労感（0〜10）">
  <div class="rof-endpoints"><span>0：まったく疲れていない</span><span>10：完全な疲労困憊</span></div>
  <p class="rof-selection-description" data-rof-description="${key}">${selected?esc(rofScale.guidanceForRofJ(n)):"未入力・任意"}</p>
  <button class="rof-clear" type="button" data-rof-clear="${key}" ${selected?"":"disabled"}>選択を消す</button></div>`;
 }).join("");
 return `<section class="record-rof-j" aria-label="ROF-J主観的疲労感">
 <div class="record-rof-header"><div><p class="eyebrow">ROF-J</p><h2>ROF-J｜運動前後の疲労感 <span>任意</span></h2></div><span class="rof-label">0–10</span></div>
 <details class="rof-editor-details" data-rof-editor><summary class="rof-editor-summary"><span class="rof-summary-mark" aria-hidden="true">◉</span><span class="rof-summary-text"><strong>運動前後の疲労感を入力・確認</strong><small>運動前 <b data-rof-summary-before>${rofScale.isValidRofJ(state.recordDraft.rofBefore)?state.recordDraft.rofBefore:"—"}</b> ／ 運動後 <b data-rof-summary-after>${rofScale.isValidRofJ(state.recordDraft.rofAfter)?state.recordDraft.rofAfter:"—"}</b> （各0〜10）</small></span><span class="rof-summary-chevron" aria-hidden="true">⌄</span></summary><div class="rof-editor-body"><p class="rof-intro">今感じている疲れを数字で選びます。運動前と運動後は別々に入力してください。医学的な診断や走行可否の判断ではありません。</p>
 <div class="rof-anchor-guide" role="group" aria-label="著者確認済みROF-Jの5つの尺度目安">${anchors}</div>
 <div class="rof-entry-grid">${fields}</div>
 <details class="rof-rights"><summary>尺度・イラストの出典と利用条件</summary>
 <p>日本語の尺度表現：Suzuki &amp; Arai (2026)（CC BY-NC-ND 4.0）。配置は責任著者への確認に基づき原版ROFと同じ目安位置を使用。2と3の間・7と8の間は選択できる追加点数ではありません。</p>
 <p>図：Micklewright et al. (2017)（CC BY 4.0）。原版に基づくイラストを変更せず利用。<a href="${rofScale.ROF_J_RIGHTS.scaleUrl}" target="_blank" rel="noopener">日本語尺度の原文</a> ／ <a href="${rofScale.ROF_J_RIGHTS.imagesUrl}" target="_blank" rel="noopener">図の出典</a> ／ <a href="${rofScale.ROF_J_RIGHTS.scaleLicense}" target="_blank" rel="noopener">日本語資料のライセンス</a> ／ <a href="${rofScale.ROF_J_RIGHTS.imagesLicense}" target="_blank" rel="noopener">図のライセンス</a></p>
 </details><p class="rof-unsaved-note">ここで選んだ疲労感は、記録内容を確認して手入力の走行を保存すると一緒に保存されます。</p></div></details>
 </section>`;
}
  function onboardingView(){return firstUseExperience.renderFirstUse(onboardingState);}
  function finishOnboarding(){
    onboardingState.open=false;onboardingState.replay=false;onboardingState.error="";
    try{onboardStorage?.setItem(onboardingKey,JSON.stringify({completed:true,language:onboardingState.language}))}catch{}
    render();
  }
  function recordStart(){return recordExperience.recordMethodPage(gpsPlatform.currentGpsSmartphone());}
function recordExtras(){
 const d=state.recordDraft, field=(id)=>esc(d[id]??"");
 const select=(name,items,extra="")=>`<select data-draft="${name}" ${extra}>${items.map(([value,label])=>`<option value="${value}" ${d[name]===value?"selected":""}>${label}</option>`).join("")}</select>`;
 const num=(name,label,opts={})=>`<label class="record-extra-field"><span>${label}</span><input data-draft="${name}" type="number" inputmode="${opts.integer?"numeric":"decimal"}" min="${opts.min??0}" max="${opts.max??(opts.integer?10000000:100)}" step="${opts.step??(opts.integer?1:.1)}" placeholder="${opts.placeholder??"未入力"}" value="${field(name)}"></label>`;
 const surfaceLabels=[["paved","舗装路"],["track","陸上トラック"],["treadmill","トレッドミル"],["soil","締まった土道"],["trail","不整地トレイル"],["naturalGrass","天然芝"],["artificialTurf","人工芝"],["sand","砂地"]];
 const surfaces=[["","選択してください"],...surfaceLabels.map(([k,label])=>[k,label])];
 const sections=Array.from({length:5},(_,i)=>`<div class="record-course-section"><strong>区間 ${i+1}</strong><div class="record-extra-grid">
 ${num("sectionShare"+i,"割合 (%)",{max:100})}
 <label class="record-extra-field"><span>坂の向き</span>${select("sectionDirection"+i,[["FLAT","平坦"],["UPHILL","上り"],["DOWNHILL","下り"]])}</label>
 ${num("sectionGrade"+i,"傾斜 (%)",{max:100})}
 <label class="record-extra-field"><span>路面</span>${select("sectionSurface"+i,[["UNKNOWN","不明"],...surfaceLabels.map(([v,t])=>[v,t])])}</label>
 </div></div>`).join("");
 return `<div class="record-optional-stack" aria-label="走行条件などの任意入力項目">
 <details class="record-extra-section" data-record-section="course"><summary><span class="record-extra-step">2</span><span><strong>コースと走行条件</strong><small>保存コース相当の情報・坂・路面を入力</small></span><span class="record-extra-chevron" aria-hidden="true">⌄</span></summary>
 <div class="record-extra-content">
 <p class="record-extra-help">入力できる条件だけ記録できます。分からない場合は「不明」のままにしてください。コースの登録やGPSで測定したコースはまだ取り込めません。</p>
 <label class="record-extra-field"><span>今回のコース名（任意）</span><input data-draft="courseName" type="text" maxlength="80" placeholder="例：川沿い往復" value="${field("courseName")}"></label>
 <div class="record-extra-grid"><label class="record-extra-field"><span>坂道</span>${select("gradeMode",[["UNKNOWN","不明・未設定"],["FLAT","ほぼ平坦"],["SUMMARY","坂あり：割合で入力"],["SECTIONS","区間ごとに入力"]])}</label>
 <label class="record-extra-field"><span>路面</span>${select("surfaceMode",[["UNKNOWN","不明・未設定"],["SINGLE","1種類を選択"],["MIXED","複数を割合で入力"]])}</label></div>
 <div data-grade-submode="SUMMARY" ${d.gradeMode==="SUMMARY"?"":"hidden"}><h3>坂の構成</h3><div class="record-extra-grid">${num("upPercent","上りの割合 (%)",{max:100})}${num("downPercent","下りの割合 (%)",{max:100})}${num("upGradePercent","上りの傾き (%)",{max:100})}${num("downGradePercent","下りの傾き (%)",{max:100})}</div><p class="record-extra-help">上り・下りの割合の合計は100%以下。残りを平坦として整理します。未入力を0とみなしません。</p></div>
 <div data-grade-submode="SECTIONS" ${d.gradeMode==="SECTIONS"?"":"hidden"}><h3>区間の内訳（最大5区間）</h3><p class="record-extra-help">割合の合計は100%。区間の速度を勝手に補うことはしません。</p>${sections}</div>
 <div data-surface-submode="SINGLE" ${d.surfaceMode==="SINGLE"?"":"hidden"}><label class="record-extra-field"><span>主な路面</span>${select("primarySurface",surfaces)}</label></div>
 <div data-surface-submode="MIXED" ${d.surfaceMode==="MIXED"?"":"hidden"}><h3>路面の割合</h3><div class="record-extra-grid">${surfaceLabels.map(([k,label])=>num("surface"+k,label+" (%)",{max:100})).join("")}</div><p class="record-extra-help">実際に使った路面の割合が合計100%になるように入力します。</p></div>
 </div></details>
 <details class="record-extra-section" data-record-section="compare"><summary><span class="record-extra-step">3</span><span><strong>歩数・走り方・環境</strong><small>比較に役立つ情報（任意）</small></span><span class="record-extra-chevron" aria-hidden="true">⌄</span></summary>
 <div class="record-extra-content">
 <div class="record-extra-grid">${num("steps","歩数（歩）",{integer:true,max:10000000,placeholder:"例：6000"})}<label class="record-extra-field"><span>歩数の取得方法</span>${select("stepsProvenance",[["UNKNOWN","不明・未設定"],["DEVICE_MEASURED","端末・時計で計測"],["ESTIMATED","手入力・おおよそ"]])}</label></div>
 <p class="record-extra-help">歩数の出所を区別します。GPS距離から歩数を自動推定しません。</p>
 <label class="record-extra-field"><span>走り方</span>${select("runningFormat",[["UNKNOWN","不明・未設定"],["CONTINUOUS_RUN","連続して走った"],["RUN_WALK","走行と歩行を組み合わせた"]])}</label>
 <div class="record-runwalk-fields" data-running-format="RUN_WALK" ${d.runningFormat==="RUN_WALK"?"":"hidden"}><p class="record-extra-help">走歩混在の記録では、単一活動の12部位文献参考値は算出しません。走った距離・時間は本人が入力した区間情報としてのみ記録します。</p><div class="record-extra-grid">${num("runWalkRunningDistanceKm","走った距離（km）",{max:10000,step:.01})}${num("runWalkRunningDurationMinutes","走った時間（分）",{max:100000,step:.1})}</div></div>
 <div class="record-extra-grid">${num("temperatureC","気温（℃）",{min:-50,max:60,step:.1})}<label class="record-extra-field"><span>環境メモ</span><textarea data-draft="environmentNote" rows="2" maxlength="500" placeholder="天気、湿度、向かい風など">${field("environmentNote")}</textarea></label></div>
 </div></details>
 <details class="record-extra-section" data-record-section="reflection"><summary><span class="record-extra-step">4</span><span><strong>身体・使用したもの・メモ</strong><small>自覚したことやシューズなど（任意）</small></span><span class="record-extra-chevron" aria-hidden="true">⌄</span></summary>
 <div class="record-extra-content"><p class="record-extra-help">身体の自覚情報はROF-Jや12部位の計算結果とは別に扱います。選んだ部位は、必要に応じて文章として記録できます。</p><label class="record-extra-field"><span>身体の気づき（自由記述）</span><textarea data-draft="bodyObservation" rows="2" maxlength="500" placeholder="気になった部位、違和感など">${field("bodyObservation")}</textarea></label><label class="record-extra-field"><span>今回のシューズ</span><input type="text" data-draft="shoeName" maxlength="100" placeholder="未入力" value="${field("shoeName")}"></label><label class="record-extra-field"><span>走行・休養時のメモ</span><textarea data-draft="memo" rows="3" maxlength="500" placeholder="自分が感じたことを記入">${field("memo")}</textarea></label></div></details>
 </div>`;
}
  function recordPreview(){
    if(!state.recordPreviewOpen)return "";
    const d=state.recordDraft,active=state.recordType==="run",v=reviewDraft.checkRecordDraft(d,active);
    const errors=[...v.errors];
    if(!d.date)errors.unshift("日付を入力してください");
    if(active&&(!d.distance||Number(d.distance)<=0||!d.minutes||Number(d.minutes)<=0))errors.unshift("距離と時間を入力してください");
    return `<div class="record-preview-overlay" data-close-preview><section class="record-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="record-preview-title"><h2 id="record-preview-title">入力内容の確認</h2>
      <p>手入力した走行は、確認画面から端末に保存できます。</p>
      <dl><dt>種類</dt><dd>${active?"走行":"休養"}</dd><dt>日付</dt><dd>${esc(d.date||"未入力")}</dd>${active?`<dt>距離</dt><dd>${esc(d.distance||"未入力")} km</dd><dt>時間</dt><dd>${esc(d.minutes||"未入力")} 分</dd><dt>コース</dt><dd>${esc(d.courseName||"未設定")}</dd><dt>ROF-J</dt><dd>${Number.isInteger(d.rofBefore)?d.rofBefore:"未入力"} → ${Number.isInteger(d.rofAfter)?d.rofAfter:"未入力"}</dd>`:""}<dt>メモ</dt><dd>${esc(d.memo||"未入力")}</dd></dl>
      ${errors.length||v.warnings.length?`<div class="record-review-alert" role="alert">${errors.map(t=>`<p class="is-error">${esc(t)}</p>`).join("")}${v.warnings.map(t=>`<p>${esc(t)}</p>`).join("")}</div>`:`<p class="record-review-success">入力内容を確認しました。身体の部位別の参考値は計算していません。</p>`}
      <button type="button" class="btn primary" data-close-preview>閉じる</button></section></div>`;
  }
  function record(){return recordExperience.manualPage(state);}
  function recordReview(){return recordReviewExperience.reviewView(state.recordDraft,{
    recordType:state.recordType,source:state.recordReviewSource,courseUi:state.recordCourseUi,bodySelected:bodyUi.selected,saveNotice:manualSaveNotice,mentalSummary:mentalExperience.mentalSummary(manualMental)
  });}
  function recordCourse(fromHome=false){return recordExperience.coursePage(state,state.recordCourseUi,coursePresets.readCoursePresets(onboardStorage),fromHome);}
  function recordRof(){return rofExperience.rofPage(state.recordDraft,rofUi);}
  function recordMore(kind="both"){
    const all=recordExtras();
    const compareStart=all.indexOf('<details class="record-extra-section" data-record-section="compare">');
    const reflectionStart=all.indexOf('<details class="record-extra-section" data-record-section="reflection">');
    const compare=all.slice(compareStart,reflectionStart);
    const environmentAt=compare.indexOf('<div class="record-extra-grid"><label class="record-extra-field"><span>気温');
    const compareOnly=environmentAt>=0?compare.slice(0,environmentAt)+"</div></details>":compare;
    const fields=kind==="compare"?compareOnly:kind==="reflection"?all.slice(reflectionStart).replace(/\s*<\/div>\s*$/,''):all.slice(compareStart).replace(/\s*<\/div>\s*$/,'');
    const title=kind==="compare"?"歩数・走り方・環境":kind==="reflection"?"身体・使用品・メモ":"追加情報";
    return `<div class="record-v3 rv-aux"><header class="rv-head"><a href="#/record" class="rv-back" aria-label="手入力へ戻る">‹</a><h1>${title}</h1><details class="rv-screen-help"><summary aria-label="追加情報の入力方法">？</summary><p>必要な情報だけ記録します。入力内容は保存前に確認できます。</p></details></header><div class="rv-aux-wrap"><section class="rv-panel"><div class="record-optional-stack">${fields}</div></section></div></div>`;
  }
  const recordCompare=()=>gaitExperience.gaitPage(state.recordDraft),recordReflection=()=>bodyExperience.renderScreen(state.recordDraft,bodyUi,{mentalHtml:mentalExperience.renderMentalInput(manualMental,'manual')});
  function recordEnvironment(){return environmentExperience.environmentPage(state.recordDraft,environmentUi);}
  
    // The current result is mounted exclusively by resultExperience.mountResult
    // with explicit saved input and the approved three-tab presentation.
    // History records are intentionally not sourced from the unsaved input draft.
    // Saved-history repository integration is a separate protected milestone.
    // Running history retains its approved, independent visual structure.
    function history(){
      return '<section id="runload-history-v2" aria-label="履歴"></section>';
    }
    // Condition inspection lives off the home dashboard, not inside running history.
    function condition(){
      const conditions=homeExperience.readConditions(onboardStorage);
      const insights=conditionInsights.loadConditionInsights(onboardStorage);
      return '<section class="cj-screen" aria-label="コンディションの歩み"><header class="cj-page-head"><a href="#/home" class="cj-back" aria-label="ホームに戻る">‹</a><div><h1>コンディションの歩み</h1></div><details class="rl-screen-help"><summary aria-label="コンディションの見方">？</summary><p>保存した睡眠・在床時間と、その日の調子を日付から確認できます。本人の記録であり、睡眠や健康状態を測定・診断するものではありません。</p></details></header>'+conditionJourney.renderConditionJourney(conditions,conditionUi,insights)+'</section>';
    }
    function explore(){
      const conditions=homeExperience.readConditions(onboardStorage);
      const saved=manualRunStore.readManualRuns(onboardStorage);
      const route=location.hash;
      const params=new URLSearchParams(route.split('?')[1]||'');
      const resolved=explorationLinkPolicy.resolveExplorationContext(route,{
        manual:saved,gpsV2:gpsV2Cache
      });
      // A deleted manual record must never be rebound to another run, but its
      // earlier exploration notes remain accessible and editable by the user.
      let deletedManualId=null;
      if(!resolved.ok){
        const parsed=recordRef.parseLegacyOrTypedLink(route,'exploration');
        if(resolved.code==='NOT_FOUND'&&parsed.ok&&parsed.value?.sourceType==='MANUAL')
          deletedManualId=parsed.value.recordId;
        else
          return '<section class="ex-page ex-inquiry-invalid" role="alert" data-ex-inquiry-error><h1>記録を照合できません</h1><p>'+esc(resolved.reason)+'</p><a href="#/history">保存履歴に戻る</a></section>';
      }
      const t06=params.get('category')==='05'&&params.get('topic')==='日々のコンディション';
      const lifeSelection=t06&&(params.has('lifeKind')||params.has('lifeDate'))?{
       kind:params.get('lifeKind'),date:params.get('lifeDate'),
       duplicate:params.getAll('lifeKind').length!==1||params.getAll('lifeDate').length!==1
      }:null;
      const lifeContext=t06?{
       conditions,rests:restDayStore.readRestDays(onboardStorage),selection:lifeSelection
      }:null;
      if(resolved.ok&&resolved.value.kind==='GPS_READONLY')return explorationLinkPolicy.gpsInquiryBridge(resolved.value,{topic:params.get('topic'),lifeContext});
      if(route!==lastExploreRoute){
        lastExploreRoute=route;
        const cat=CATEGORIES.find(c=>c.id===params.get('category'));
        if(cat&&cat.topics.includes(params.get('topic'))){
          explorationUi.selected=cat.id;explorationUi.topic=params.get('topic');explorationUi.tab='field';explorationUi.modal='';explorationUi.sample=false;
        }
      }
      const focusRun=resolved.ok&&resolved.value.kind==='MANUAL'?resolved.value.record:null;
      const focusRunId=focusRun?.id||deletedManualId||null;
      // L6 C-02: learning transfers the topic only, never an implicit run.
      // Explicit RecordRef routes remain under the existing validation policy.
      const fromLearning=params.get('entry')==='learning'&&!params.has('record')&&!params.has('source')&&!params.has('gps');
      const compareRequested=params.has('compare'),compareId=compareRequested?params.get('compare'):null;
      const compareRun=compareRequested&&saved.ok===true?saved.records.find(r=>r.id===compareId)||null:null;
      const comparisonInquiry={
       explicit:compareRequested,duplicate:compareRequested&&params.getAll('compare').length!==1,
       previousRef:compareRequested?{sourceType:'MANUAL',recordId:compareId}:null,
       previous:compareRun,readable:saved.ok===true
      };

      return explorationExperience.render(explorationUi,{
        categories:CATEGORIES,draft:fromLearning?null:focusRunId?null:state.recordDraft,
        conditions:fromLearning?null:conditions,
        manualRuns:fromLearning&&saved.ok===true?{ok:true,records:[]}:saved,
        focusRunId,focusRun,comparisonInquiry,lifeContext:fromLearning?null:lifeContext,
        learningEntry:fromLearning
      });
    }
    function settings(){return settingsExperience.renderSettings({...settingsUi,dataUi});}
    function secondary(page){
 const title=pageLabels[page]||"その他";
 const top=`<section class="home-head"><div><h1>${esc(title)}</h1><p class="lead">${esc({measurement:"走る時間とルートを確かめる。",course:"走りたいコースを、自分で組み立てる。",simulation:"条件を変えて、参考値の違いを考える。",consultation:"記録を振り返り、必要な情報を整理する。","body-part-detail":"気になる部位を、過去の記録と照らし合わせる。"}[page]||"自分の記録を大切に扱う。")}</p></div></section>`;

 if(['measurement','gps-review','gps-rof'].includes(page)&&!gpsPlatform.currentGpsSmartphone())
   return '<section class="gps-v2 gps-platform-unavailable" role="status"><h1>GPS測定はスマートフォン専用です</h1><p>PCでは手入力をご利用ください。</p><a href="#/record-start" class="gps-v2-button gps-v2-primary">記録方法に戻る</a></section>';
 if(page==="measurement")return measurementExperience.measurementPage(ensureGps().state,ensureGps().elapsed(),gpsSelfReport);
 if(page==="gps-review")return measurementExperience.gpsReviewPage(ensureGps().state,ensureGps().elapsed(),gpsSelfReport,mentalExperience.renderMentalInput(gpsMental,'gps'));
 if(page==="gps-rof"){
   const phase=ensureGps().state.phase;
   if(!['ready','finished'].includes(phase))
     return '<section class="gps-v2 gps-platform-unavailable"><h1>測定中は疲労感を入力できません</h1><a href="#/measurement">GPS測定に戻る</a></section>';
   gpsRofUi.phase=phase==='ready'?'before':'after';
   return rofExperience.rofPage(gpsSelfReport,gpsRofUi,{gps:true});
 }
   if(page==="course")return recordCourse(true);
 if(page==="simulation"){
  const selected=simulationUi.gpsId;
  const active=selected&&gpsV2Cache.ok&&gpsV2Cache.records.some(r=>r.id===selected&&r.detailSaved);
  if(!active||simulationUi.gpsFeatureId!==selected){simulationUi.gpsFeature=null;simulationUi.gpsFeatureId='';}
  if(simulationUi.source==='gps'&&simulationUi.gpsFeature)simulationUi.distance=String(simulationUi.gpsFeature.distanceKm);
  return simulationExperience.renderSimulation(simulationUi,{
   presets:coursePresets.readCoursePresets(onboardStorage),
   manualRuns:manualRunStore.readManualRuns(onboardStorage),
   gpsRuns:gpsV2Cache
  });}
 if(page==="consultation")return consultationExperience.renderConsultation();
 // The legacy body-part detail hash must never display fixed demo numbers as
 // if they came from a saved run. The real 12-region evidence lives in Result.
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 const recordId=params.get('record');
 const regionId=params.get('region');
 const selected=regionId&&resultExperience.OFFICIAL_NAMES.find(([id])=>id===regionId);
 const label=selected?'<p>確認したい部位：'+esc(selected[1])+'</p>':'';
 const link=recordId?'#/result?record='+encodeURIComponent(recordId):'#/result';
 return top+`<section class="card stack" data-body-detail-source="saved-only"><h2>部位ごとの参考値を確認する</h2>${label}<p>部位別の参考値・適用条件・文献の根拠は、保存済みの走行結果画面で確認できます。未保存の入力や活動種別が不明な記録からは、数値を推定しません。</p><p>文献由来の参考値は、本人の身体組織負荷・健康状態・傷害リスクの実測ではありません。</p><a class="btn primary" href="${esc(link)}">走行結果で確認する</a><a class="btn" href="#/history">保存済みの履歴を見る</a></section>`;
}
    let stopHomeDrag=null;
    function render(){
      if(dynamicPlayback){dynamicPlayback.dispose?.();dynamicPlayback=null;}
      if(stopHomeDrag){stopHomeDrag();stopHomeDrag=null;}
      const previousConditionStrip=app.querySelector("[data-cj-chart]");
      if(previousConditionStrip&&conditionUi.scrollLeft!==null)conditionUi.scrollLeft=previousConditionStrip.scrollLeft;
      // Dispose the old consultation resize listener before replacing its host.
      app.querySelector('#runload-consultation')?._consultationAbort?.abort();
      const existingRof=app.querySelector(".rof-editor-details");if(existingRof)state.rofEditorOpen=existingRof.open;
      const openedRecordSections=app.querySelectorAll(".record-extra-section[open]");
      if(openedRecordSections.length||app.querySelector(".record-extra-section"))state.recordOpenSections=[...openedRecordSections].map(el=>el.dataset.recordSection);
 const page=currentPage(),content={home,condition,record,"record-review":recordReview,result:()=>'<section id="runload-result-v4" aria-label="走行結果"></section>',"dynamic-result":()=>'<section data-gps-dynamic aria-label="GPS動的結果"><p class="gd-empty">動的結果を読み込んでいます…</p></section>',annotation:()=>'<section id="runload-annotation-editor" aria-label="保存済み走行の後日補完"></section>',history,"exploration-tree":explore,learning:()=>'<section id="runload-learning" class="lr-root" aria-label="学習"></section>',settings,"record-start":recordStart,"record-course":recordCourse,course:()=>recordCourse(true),"record-rof":recordRof,"record-more":recordMore,"record-compare":recordCompare,"record-reflection":recordReflection,"record-environment":recordEnvironment}[page]?.()||secondary(page);
 const navPage=page==="condition"?"home":page==="result"||page==="dynamic-result"?"result":["measurement","gps-review"].includes(page)?"record":["record-review","record-course","record-rof","record-more","record-compare","record-reflection","record-environment","gps-rof"].includes(page)?"record":page;
 // Return links to the common confirmation when a detail was opened from that screen.
 const detailPages=["record-course","record-rof","record-more","record-compare","record-environment","record-reflection"];
 const detailContent=(state.recordReviewReturn&&detailPages.includes(page))
   ? content.replaceAll('href="#/record"','href="#/record-review"') : content;
 const gpsConsentMarkup=gpsConsentAction&&page==="measurement"
   ?`<div class="gps-consent-backdrop" data-gps-consent-overlay><section class="gps-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="gps-consent-title" aria-describedby="gps-consent-description gps-consent-interruption"><div class="gps-consent-symbol" aria-hidden="true">⌖</div><h2 id="gps-consent-title">${gpsConsentAction==="resume"?"位置情報の取得を再開しますか？":"位置情報を使用しますか？"}</h2><p id="gps-consent-description">現在地・経路・取得可能な標高を計測に使います。地図の表示範囲はOpenStreetMapへ伝わります。経路の保存は終了後に選択します。</p><div class="gps-consent-interruption" id="gps-consent-interruption" role="note"><strong>画面ロック・アプリ切り替え時の動作</strong><p>ロック・アプリ切り替えで<b>タイマーとGPSは自動で一時停止</b>します。戻っても自動再開せず、再開時に再確認が必要です。停止中の時間・距離は加算しません。</p></div><div class="gps-consent-actions"><button type="button" data-gps-consent-cancel class="gps-v2-button gps-v2-secondary">使用しない</button><button type="button" data-gps-consent-confirm class="gps-v2-button gps-v2-primary">${gpsConsentAction==="resume"?"許可して再開":"許可して開始"}</button></div></section></div>` : "";
 const languageNotice='';
 app.innerHTML=`<div class="app-shell ${page==="consultation"?"cp-app":""}" data-mobile-view="edit" data-mode-preview="single"><aside class="sidebar"><nav class="side-nav" aria-label="メニュー">${navHtml(desktopNav,navPage,false)}</nav></aside><div class="main-frame"><header class="topbar" hidden aria-hidden="true"></header><main class="main-content">${languageNotice}${state.toast?`<div class="toast-notice">${esc(state.toast)}</div>`:""}${detailContent}</main></div><nav class="mobile-nav" aria-label="スマートフォンのメニュー">${navHtml(mobileNav,page==="condition"?"home":["record","record-start","record-review","record-course","record-rof","record-more","record-compare","record-reflection","record-environment","measurement","gps-review","gps-rof"].includes(page)?"record-start":page,true)}</nav></div>${onboardingState.open?onboardingView():""}${gpsConsentMarkup}`;
 if(page==="learning"){
  learningExperience.mountLearning(app.querySelector("#runload-learning"),new URLSearchParams(location.hash.split("?")[1]||""));
 }
 if(page==="consultation"){
  consultationExperience.mountConsultation(app.querySelector('#runload-consultation'),consultationExperience.consultationSources({
   manual:manualRunStore.readManualRuns(onboardStorage),gpsV2:gpsV2Cache,conditions:homeExperience.readConditions(onboardStorage)
  }));
 }
 if(page==="annotation")void annotationEditor.mountAnnotationEditor(app.querySelector("#runload-annotation-editor"),location.hash);
 if(page==="result"){
   const params=new URLSearchParams(location.hash.split("?")[1]||"");
   if(params.has('gps')){
    const v2id=params.get('gps');
    const saved=gpsV2Cache.ok?gpsV2Cache.records.find(r=>r.id===v2id):null;
    const host=app.querySelector('#runload-result-v4');
    if(saved)resultExperience.mountResult(host,{}, {gpsSummary:saved,annotationLink:annotationEditor.editorLink({sourceType:'GPS_V2',recordId:saved.id}),showFatigue:params.get('view')==='fatigue',...resultMentalOptions({sourceType:'GPS_V2',recordId:saved.id},host),...resultPostHocOptions({sourceType:'GPS_V2',recordId:saved.id},host)});
    else host.innerHTML='<div class="gd-empty">指定されたGPS記録がありません。</div>';
   }else{
   const stored=manualRunStore.readManualRuns(onboardStorage);
   const recent=stored.ok?stored.records.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0]||null:null;
   // An invalid explicit ID never silently displays a different run.
   const runId=params.has("record")?params.get("record"):selectedRunId||recent?.id||null;
   const found=manualRunStore.findManualRun(onboardStorage,runId);
   const record=found.ok?found.record:null;
   const resultHost=app.querySelector("#runload-result-v4");
   if(params.has("record")&&!record){
    // Explicit deleted/unknown IDs never fall through to another saved run.
    const message=found.ok
     ?"指定された保存済み走行記録が見つかりません。削除されたか、この端末に保存されていない可能性があります。"
     :found.reason||"保存済み走行記録を安全に読み取れません。元のデータを確認してください。";
    resultHost.innerHTML='<div class="gd-empty" role="status">'+esc(message)+' <a href="#/history">履歴へ戻る</a></div>';
   }else{
    resultExperience.mountResult(resultHost,record?.draft||{},record?{
     ...resultMentalOptions({sourceType:'MANUAL',recordId:record.id},resultHost),...resultPostHocOptions({sourceType:'MANUAL',recordId:record.id},resultHost),
     annotationLink:annotationEditor.editorLink({sourceType:'MANUAL',recordId:record.id}),showFatigue:params.get('view')==='fatigue',
     saved:true,recordId:record.id,record,compareRecords:stored,questionNotes:explorationExperience.makeUi(onboardStorage).notes,compareId:params.has('compare')?params.get('compare'):undefined,showCompare:params.get('view')==='compare',
     onContinueQuestion:async (sourceNoteId,text,fromRunId)=>{
      const saved=await manualRunLock.withManualRunWriteLock(()=>
       questionContinuation.saveRunQuestionContinuation(onboardStorage,manualRunStore.readManualRuns(onboardStorage),
        {sourceNoteId,text,fromRunId,toRunId:record.id}));
      state.toast=saved.ok?'元の問いと今回の振り返りを関連づけて保存しました。':'振り返りを保存できません：'+saved.reason;
      if(saved.ok){
       explorationUi.notes=explorationExperience.makeUi(onboardStorage).notes;
       const selectedCategory=CATEGORIES.find(c=>c.id===saved.note.category);
       const matchingTopic=selectedCategory?.topics.find(topic=>
         explorationExperience.LEARNING_TOPICS[saved.note.category+'|'+topic]===saved.note.topicId);
       // Never relabel a follow-up from a different topic as "distance and pace".
       const topic=matchingTopic||selectedCategory?.topics[0]||'距離・時間・ペース';
       location.hash='#/exploration-tree?record='+encodeURIComponent(record.id)+
        '&category='+encodeURIComponent(saved.note.category)+'&topic='+encodeURIComponent(topic);
      }
      render();
     },
     onCorrectRof:async (phase,score,meta)=>{
      const updated=await manualRunLock.withManualRunWriteLock(()=>
       canonical.mutate(s=>manualRunStore.correctSavedRof(s,record.id,phase,score,meta)));
      state.toast=updated.ok?'疲労感と訂正履歴を保存しました。時系列の前後差は判定しません。':updated.reason;
      render();
     },
     onAssignGait:async gait=>{
      const changed=await manualRunLock.withManualRunWriteLock(()=>
        canonical.mutate(s=>manualRunStore.classifySavedManualRun(s,record.id,gait)));
      state.toast=changed.ok?'活動種別を保存しました。文献の適用範囲内で参考値を更新しました。':changed.reason;
      render();
     }
    }:{});
   }
   }
 }
 if(page==="dynamic-result"){
  const id=new URLSearchParams(location.hash.split("?")[1]||"").get("record");
  void gpsV2.readGpsV2Detail(id).then(saved=>{
   const currentId=new URLSearchParams(location.hash.split("?")[1]||"").get("record");
   if(currentPage()!=="dynamic-result"||id!==currentId)return;
   const host=app.querySelector("[data-gps-dynamic]");
   if(!host)return;
   if(!saved.ok){host.innerHTML=`<p class="gd-empty">${esc(saved.reason)}</p>`;return;}
   dynamicPlayback=gpsDynamic.mountGpsDynamicResult(host,saved.summary,saved.detail);
  }).catch(()=>{const host=app.querySelector("[data-gps-dynamic]");if(host)host.textContent="動的結果を読み込めませんでした";});
 }
 if(page==="measurement"){
   measurementExperience.updateMeasurementDom(app.querySelector("[data-gps-live-page]"),ensureGps().state,ensureGps().elapsed());
 }
 if(page==="simulation"){
   const panel=app.querySelector("[data-sim-page]");
   simulationExperience.bindSimulation(panel,simulationUi);
   panel?.addEventListener("sim-redraw",()=>{
     const y=window.scrollY,active=document.activeElement;
     const source=active?.getAttribute?.("data-sm-source"),field=active?.getAttribute?.("data-sm-field");
     const selectedV2=simulationUi.source==='gps'&&simulationUi.gpsId?.startsWith('gps-v2-')
       &&simulationUi.gpsFeatureId!==simulationUi.gpsId;
     render();window.scrollTo(0,y);
     // A simulation source or saved-record selection replaces this entire screen.
     // Restore focus to the same control without moving the scroll position.
     const current=source?app.querySelector('[data-sm-source="'+source+'"]'):field?app.querySelector('[data-sm-field="'+field+'"]'):null;
     current?.focus({preventScroll:true});
     if(selectedV2){
      // Fetch the selected V2 record on demand; late responses cannot replace
      // a newer selection. No extra GPS data is shared or transmitted.
      void simulationExperience.resolveGpsV2CourseSelection(simulationUi,{
       readDetail:gpsV2.readGpsV2Detail,toFeature:gpsV2.gpsV2DetailToFeature
      }).then(result=>{
       if(result.stale||currentPage()!=='simulation')return;
       const scroll=window.scrollY,focus=document.activeElement?.getAttribute?.('data-sm-field');
       render();window.scrollTo(0,scroll);
       if(focus)app.querySelector('[data-sm-field="'+focus+'"]')?.focus({preventScroll:true});
      });
     }
   });
 }
 if(page==="history"){
   const saved=manualRunStore.readManualRuns(onboardStorage);
   const restDays=restDayStore.readRestDays(onboardStorage);
   if(!restDays.ok){const alert=document.createElement('p');alert.setAttribute('role','alert');alert.className='toast-notice';alert.textContent=restDays.reason;app.querySelector('#runload-history-v2')?.before(alert);}
   if(!saved.ok){
     const alert=document.createElement("p");
     alert.setAttribute("role","alert");alert.className="toast-notice";
     alert.textContent=saved.reason;
     app.querySelector("#runload-history-v2")?.before(alert);
   }
   const gpsPanel=document.createElement('section');gpsPanel.className='gps-history-section';
   const gpsCount=gpsV2Cache.ok?gpsV2Cache.records.length:null;
   const gpsAttention=!gpsV2Cache.ok||Boolean(pendingGpsV2Backup);
   gpsPanel.innerHTML='<p class="gps-history-privacy">保存済みのGPS記録とデータ管理を確認できます。位置情報はこの端末内で扱います。</p>';
   if(!gpsV2Cache.ok)gpsPanel.insertAdjacentHTML("beforeend",`<p role="alert">${esc(gpsV2Cache.reason)}</p>`);
   if(gpsV2Cache.ok){
    const recent=gpsV2Cache.records.slice().reverse();
    const markup=recent.length?recent.map(r=>`<article class="gps-history-item"><span><strong>${esc(r.date)}｜${esc(gpsCore.GPS_ACTIVITY[r.activity])}</strong><small>${r.distanceKm.toFixed(2)} km ・ ${gpsCore.formatGpsClock(r.activeSeconds*1000)} ・ ${r.detailSaved?(r.activity==='MIXED'?'コース保存あり（動的結果は対象外）':'動的結果データあり'):'概要のみ'}</small></span><div><a class="btn soft" href="#/result?gps=${encodeURIComponent(r.id)}">結果を見る</a><a class="btn soft" href="${esc(annotationEditor.editorLink({sourceType:'GPS_V2',recordId:r.id}))}">この記録を補う（任意）</a>${r.detailSaved?`<button data-gps-v2-use="${esc(r.id)}">コースを試す</button>`:""}<button data-gps-v2-delete="${esc(r.id)}">削除</button></div></article>`).join('') :'';
    if(recent.length)gpsPanel.insertAdjacentHTML('beforeend','<section class="gps-v2-history">'+markup+'</section>');
   }
   if(gpsCount===0)gpsPanel.insertAdjacentHTML('beforeend','<p class="gps-history-empty">GPSで保存した記録はありません。</p>');
   gpsPanel.insertAdjacentHTML('beforeend',`<div class="gps-history-backup"><h3>GPS記録のバックアップ</h3><p>位置情報を含む場合があり、ファイルは暗号化されません。保存場所に注意してください。</p><div class="gps-history-backup-actions"><button data-gps-v2-backup-export type="button">GPS記録を書き出す</button><label>GPS記録のバックアップを読み込む<input data-gps-v2-backup-file type="file" accept=".json,application/json"></label></div>${gpsV2BackupNotice?`<p role="status" class="gps-history-backup-notice">${esc(gpsV2BackupNotice)}</p>`:''}${pendingGpsV2Backup?`<div class="gps-history-backup-confirm"><p>${pendingGpsV2Backup.count}件（詳細保存 ${pendingGpsV2Backup.detailCount}件）を検証しました。</p><button data-gps-v2-backup-confirm type="button">GPS記録の復元を確定</button><button data-gps-v2-backup-cancel type="button">キャンセル</button></div>`:''}</div>`);
   gpsPanel.insertAdjacentHTML('beforeend',`<div class="gps-history-capacity"><h3>保存容量</h3><p>サイト全体（GPS以外の記録・キャッシュを含む）の概算です。保存容量に余裕があっても消去される場合があります。</p><div data-gps-capacity-status role="status">${gpsCapacity?(gpsCapacity.ok?(gpsCapacity.percent===null?'容量の割合は取得できません':`サイト全体の使用率 ${gpsCapacity.percent}%／使用 ${gpsCapacity.usageMiB} MiB・上限目安 ${gpsCapacity.quotaMiB} MiB`)+`。永続化：${gpsCapacity.persistent===true?'許可済み':gpsCapacity.persistent===false?'未許可':'確認できません'}。`+(gpsCapacity.warning?'容量不足に注意してください。バックアップを推奨します。':''):esc(gpsCapacity.reason)):'容量は未確認です'}</div><div class="gps-history-backup-actions"><button type="button" data-gps-capacity-check>容量を確認</button><button type="button" data-gps-persist-request>保存領域の永続化を依頼</button></div>${gpsCapacityNotice?`<p role="status" class="gps-history-capacity-notice">${esc(gpsCapacityNotice)}</p>`:''}<p>永続化はブラウザーが拒否する場合があり、端末故障・手動削除からは保護されません。</p>${gpsStorageHealth.sharedGithubPagesOrigin(location.href)?'<p class="gps-history-origin-warning">注意：GitHub Pagesのプロジェクトは同じオリジンの他アプリと保存領域を共有します。GPSデータを分離するには専用ドメイン等で独立したオリジンが必要です。</p>':''}</div>`);
   // Build nested disclosures with DOM nodes. Appending unmatched closing tags
   // through insertAdjacentHTML does NOT close elements across fragments.
   const manager=document.createElement('details');
   manager.className='gps-history-tools';manager.dataset.gpsHistoryTools='';
   manager.open=gpsHistoryManageExpanded||Boolean(pendingGpsV2Backup);
   manager.innerHTML='<summary><span class="gps-history-tools-label">バックアップ・保存容量</span><small>必要なときに開く</small></summary>';
   const managerContent=document.createElement('div');managerContent.className='gps-history-tools-content';
   gpsPanel.querySelectorAll('.gps-history-backup,.gps-history-capacity').forEach(node=>managerContent.append(node));
   manager.append(managerContent);gpsPanel.append(manager);
   const disclosure=document.createElement('details');
   disclosure.className='gps-history-disclosure';disclosure.dataset.gpsHistoryDisclosure='';
   disclosure.open=gpsHistoryExpanded||gpsAttention;
   disclosure.innerHTML='<summary><span class="gps-history-heading">GPSで測定した記録</span><span class="gps-history-count">'+
    (gpsCount===null?'確認できません':gpsCount+'件')+
    '</span><span class="gps-history-chevron" aria-hidden="true">⌄</span></summary>';
   const content=document.createElement('div');content.className='gps-history-content';
   while(gpsPanel.firstChild)content.append(gpsPanel.firstChild);
   disclosure.append(content);gpsPanel.append(disclosure);
   gpsPanel.querySelector('[data-gps-history-disclosure]')?.addEventListener('toggle',event=>{
     gpsHistoryExpanded=event.currentTarget.open;
   });
   gpsPanel.querySelector('[data-gps-history-tools]')?.addEventListener('toggle',event=>{
     gpsHistoryManageExpanded=event.currentTarget.open;
   });
   app.querySelector('#runload-history-v2')?.after(gpsPanel);
   historyExperience.mountHistory(app.querySelector("#runload-history-v2"),{
    records:[...manualRunStore.toHistoryRows(saved),...(restDays.ok?restDays.records:[])],connected:saved.ok&&restDays.ok,ui:historyUi,
    onOpen:id=>{if(id.startsWith('rest-v1-'))return;selectedRunId=id;location.hash="#/result?record="+encodeURIComponent(id);},
    onAnnotate:id=>{if(id.startsWith('run-v1-'))location.hash=annotationEditor.editorLink({sourceType:'MANUAL',recordId:id});}
   });

 }
 if(page==="condition"){
   const strip=app.querySelector("[data-cj-chart]");
   if(strip)strip.scrollLeft=conditionUi.scrollLeft===null?strip.scrollWidth:conditionUi.scrollLeft;
 }
 document.body.classList.toggle("runload-dialog-open",Boolean(app.querySelector("[data-home-overlay],[data-gps-overlay],[data-gps-consent-overlay]")));
 if(page==="home"&&homeUi.conditionOpen)homeExperience.updateSleepForm(app.querySelector("[data-condition-form]"));
 if(page==="record-compare")gaitExperience.paintGait(app.querySelector("[data-g4-page]"),state.recordDraft);
 if(page==="record-environment")environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),state.recordDraft,environmentUi);
  if(page==="record-reflection")bodyExperience.fitTextareas(app);
 if(["record-rof","record-more"].includes(page)){
  const rofEditor=app.querySelector(".rof-editor-details");if(rofEditor)rofEditor.open=state.rofEditorOpen;
  for(const id of state.recordOpenSections){const el=app.querySelector('.record-extra-section[data-record-section="'+id+'"]');if(el)el.open=true}
 }
 if(page==="exploration-tree"){
   explorationExperience.updatePace(app);
   const entryHint=app.querySelector('[data-ex-learning-entry]');
   if(entryHint){
     if(learningEntryHintShown)entryHint.remove();
     else{
       learningEntryHintShown=true;
       // One-time route transition hint: never leave a permanent banner or
       // resurrect it when a topic switch rerenders the same inquiry.
       setTimeout(()=>{if(entryHint.isConnected)entryHint.remove();},6500);
     }
   }
 }else learningEntryHintShown=false;
 if(page==="home"&&homeEditState.editing){
  stopHomeDrag=dashboardDrag.bindHomeDashboardDrag(app.querySelector(".dashboard-custom-grid"),{
   onDrop:({sourceId,targetId,after})=>{
    if(!homeEditState.editing||!homeEditState.draft)return;
    const oldOrder=homeEditState.draft.order.join("|");
    const moved=dashboardPrefs.moveHomeDashboardWidget(homeEditState.draft,sourceId,targetId,after);
    if(moved.order.join("|")!==oldOrder){
      const y=window.scrollY;
      commitHomeLayout(moved);
      render();
      window.scrollTo(0,y);
    }
   }
  });
 }
}
  const refreshDataSettings=()=>{
    const openNames=[...app.querySelectorAll('.s2-item[open]')].map(node=>node.querySelector('summary strong')?.textContent);
    render();
    app.querySelectorAll('.s2-item').forEach(node=>{if(openNames.includes(node.querySelector('summary strong')?.textContent))node.open=true;});
  };
  const downloadDataFile=(text,kind='backup')=>{
    const blob=new Blob([text],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download=(kind==='orphan'?'隔離された補助回答-':'運動記録バックアップ-')+new Date().toISOString().slice(0,10)+'.json';
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  app.addEventListener("change",async(event)=>{
    const mentalInput=event.target;
    if(mentalInput.matches('[data-mental-answer],[data-mental-phase],[data-mental-basis]')){
      const scope=mentalInput.dataset.mentalAnswer||mentalInput.dataset.mentalPhase||mentalInput.dataset.mentalBasis;
      if(!['manual','gps'].includes(scope))return;
      const d=scope==='gps'?gpsMental:manualMental;
      if(mentalInput.hasAttribute('data-mental-answer')&&Object.hasOwn(mentalExperience.MENTAL_CHOICES,mentalInput.value))d.answer=mentalInput.value;
      if(mentalInput.hasAttribute('data-mental-phase')&&Object.hasOwn(mentalExperience.MENTAL_PHASES,mentalInput.value))d.declaredPhase=mentalInput.value;
      if(mentalInput.hasAttribute('data-mental-basis')&&Object.hasOwn(mentalExperience.MENTAL_BASIS,mentalInput.value))d.timeBasis=mentalInput.value;
      d.open=true;
      const status=mentalInput.closest('[data-mental-panel]')?.querySelector('.mx-current');
      if(status)status.textContent=mentalExperience.mentalSummary(d);
      return;
    }
    const portable=event.target.closest('[data-dm-file]');
    if(portable){
      const file=portable.files?.[0];dataUi.pendingText="";dataUi.preview=null;dataUi.safetyCopy=false;dataUi.orphanBlocked=false;dataUi.orphanConsent=false;
      if(file){
        if(file.size>dataManagement.PORTABLE_MAX_BYTES){dataUi.notice="80MB以内のJSONファイルを選択してください。";}
        else{
          try{
            const text=await file.text(),plan=await dataManagement.preflightPortableRestore(onboardStorage,text);
            if(plan.ok){dataUi.pendingText=text;dataUi.preview=plan;dataUi.notice="ファイルを検証しました。対象の内容を確認してください。";}
            else{dataUi.notice=plan.reason;if(plan.code==='ORPHANED'){dataUi.pendingText=text;dataUi.orphanBlocked=true;}}
          }catch{dataUi.notice="バックアップファイルを安全に確認できませんでした。";}
        }
      }
      refreshDataSettings();return;
    }
    if(event.target.matches('[data-dm-include-gps]')){dataUi.includeGps=event.target.checked;return;}
    if(event.target.matches('[data-dm-orphan-consent]')){
       dataUi.orphanConsent=event.target.checked;
       const button=app.querySelector('[data-dm-isolate]');
       if(button)button.disabled=!dataUi.orphanConsent;
       return;
     }
     if(event.target.matches('[data-dm-safety]')){
      dataUi.safetyCopy=event.target.checked;
      const button=app.querySelector('[data-dm-restore]');
      if(button)button.disabled=!(dataUi.preview?.ok&&(!dataUi.preview.hasExisting||dataUi.safetyCopy));
      return;
    }
    if(event.target.matches('[data-dm-delete-agree]')){
      dataUi.deleteAgreed=event.target.checked;
      const button=app.querySelector('[data-dm-delete-confirm]');
      if(button)button.disabled=!(dataUi.deleteAgreed&&confirmedDeleteWord());
      return;
    }
     const v2BackupFile=event.target.closest('[data-gps-v2-backup-file]');
     if(v2BackupFile){
      const file=v2BackupFile.files?.[0];pendingGpsV2Backup=null;gpsV2BackupNotice='';
      if(!file){render();return;}
      if(file.size>50_000_000){gpsV2BackupNotice='バックアップは50MB以内にしてください';render();return;}
      try{
       const text=await file.text(),checked=gpsV2.inspectGpsV2Backup(text);
       if(!checked.ok)gpsV2BackupNotice=checked.reason;
       else{pendingGpsV2Backup={text,count:checked.count,detailCount:checked.detailCount};gpsV2BackupNotice='検証が完了しました。復元する場合は確定してください。';}
      }catch{gpsV2BackupNotice='バックアップを読み取れませんでした';}
      render();return;
     }
    if(event.target.matches('[data-gps-flag-note]')){
      ensureGps().setFlagNote(event.target.dataset.gpsFlagNote,event.target.value);return;
    }
    if(event.target.matches('[data-gps-keep-awake]')){ensureGps().setKeepScreenAwake(!!event.target.checked);return;}
    if(event.target.matches('[data-gps-activity]')){const gps=ensureGps();gps.setActivity(event.target.value);const y=window.scrollY;render();window.scrollTo(0,y);return;}
    if(event.target.matches('[data-gps-goal-mode]')){ensureGps().setGoalMode(event.target.value);const y=window.scrollY;render();window.scrollTo(0,y);return;}
    if(event.target.matches('[data-gps-goal-value]')){ensureGps().setGoalValue(event.target.value);return;}
    if(event.target.matches('[data-gps-segment]')){ensureGps().setSegment(event.target.value);const y=window.scrollY;render();window.scrollTo(0,y);return;}
    if(event.target.matches("[data-onboard-purpose]"))onboardingState.purpose=event.target.value;
    if(event.target.matches("[data-cj-method],[data-cj-focus]")){
      if(event.target.matches("[data-cj-method]"))conditionUi.method=event.target.value;
      else conditionUi.focus=event.target.value;
      conditionUi.selected="";conditionUi.scrollLeft=null;
      const y=window.scrollY,selector=event.target.matches("[data-cj-method]")?"[data-cj-method]":"[data-cj-focus]";render();window.scrollTo(0,y);app.querySelector(selector)?.focus({preventScroll:true});return;
    }
    if(event.target.matches("[data-interpret-date]")){
      lifeCompareUi[event.target.dataset.interpretDate]=event.target.value;
      const y=window.scrollY;render();window.scrollTo(0,y);
    }
  });
  const reportSettingsNotice=(message)=>{
    settingsUi.notice=message;
    const page=app.querySelector('[data-settings-v2]');if(!page)return;
    let notice=page.querySelector('.s2-notice');
    if(!notice){notice=document.createElement('p');notice.className='s2-notice';notice.setAttribute('role','status');page.querySelector('.s2-heading')?.after(notice)}
    notice.textContent=message;
  };
  app.addEventListener("input",(event)=>{
    if(event.target.matches('[data-mental-text]')){
      const scope=event.target.dataset.mentalText,d=scope==='gps'?gpsMental:manualMental;
      d.freeText=event.target.value.slice(0,500);d.open=true;
      return;
    }
    if(event.target.matches('[data-dm-delete-word]')){
      dataUi.deleteWord=event.target.value;
      const button=app.querySelector('[data-dm-delete-confirm]');
      if(button)button.disabled=!(dataUi.deleteAgreed&&confirmedDeleteWord());
      return;
    }
    if(event.target.matches('[data-gps-goal-value]')){ensureGps().setGoalValue(event.target.value);return;}
    if(event.target.matches("[data-ex-search]")){
      const input=event.target,caret=input.selectionStart;
      explorationUi.search=input.value;
      const list=app.querySelector(".ex-catalog-grid");
      if(list)list.innerHTML=explorationExperience.catalogCards(CATEGORIES,input.value);
      return;
    }
    if(event.target.matches("[data-ex-life]")){
      const y=window.scrollY;explorationUi[event.target.dataset.exLife==="a"?"lifeA":"lifeB"]=event.target.value;render();window.scrollTo(0,y);return;
    }
    if(event.target.matches("[data-ex-distance],[data-ex-minutes]")){explorationExperience.updatePace(app);return;}
    const target=event.target,ui=state.recordCourseUi,d=state.recordDraft;
    if(target.matches('.hx-time-control input[type=time]')){
      const visual=target.closest('.hx-time-control')?.querySelector('[data-time-display]');
      if(visual)visual.textContent=target.value||"時刻を選択";
    }
    const sleepForm=target.closest("[data-condition-form]");
    if(sleepForm&&(target.matches('[name="bedTime"],[name="wakeTime"],[name="durationHours"],[name="durationMinutes"],[name="bedDayRule"]'))){
      homeExperience.updateSleepForm(sleepForm);
      return;
    }
    if(target.matches(".rl-date-control input[type=date]")){
      const visual=target.closest(".rl-date-control")?.querySelector("[data-date-display]");
      if(visual)visual.textContent=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(target.value)?target.value.replaceAll("-","/"):"日付を選択";
    }
    if(target.matches("[data-rv-slope-number],[data-rv-slope-range]")){
      const key=ui.slope==="down"?"downPercent":"upPercent",other=key==="upPercent"?"downPercent":"upPercent";
      const cap=100-(d[other]===""?0:Number(d[other]));
      if(target.value==="")d[key]="";
      else if(Number.isFinite(Number(target.value)))d[key]=String(Math.max(0,Math.min(cap,Math.round(Number(target.value)))));
      ui.notice="";
      const oldError=app.querySelector(".rv-error");if(oldError)oldError.remove();
      if(target.value!==d[key])target.value=d[key];
      const direct=app.querySelector("[data-rv-slope-number]"),slide=app.querySelector("[data-rv-slope-range]");
      if(direct&&direct!==target)direct.value=d[key];if(slide&&slide!==target)slide.value=d[key]===""?0:d[key];
      for(const [k,v] of [["up",d.upPercent],["down",d.downPercent],["flat",recordExperience.derivedFlat(d)]]){
        const el=app.querySelector('[data-rv-slope-tile="'+k+'"] b');if(el)el.textContent=v===null||v===""?"—":v+"%";
      }
      const sumSlope=app.querySelector("[data-rv-summary-slope]");if(sumSlope)sumSlope.textContent=recordExperience.courseSummary(d,ui).slope;
      const barUp=app.querySelector(".rv-mix-up"),barDown=app.querySelector(".rv-mix-down");
      if(barUp)barUp.style.width=(d.upPercent===""?0:Number(d.upPercent))+"%";
      if(barDown)barDown.style.width=(d.downPercent===""?0:Number(d.downPercent))+"%";
      return;
    }
    if(target.matches("[data-rv-surface-range],[data-rv-surface-value]")){
      const k=target.dataset.rvSurfaceRange||target.dataset.rvSurfaceValue;
      if(!ui.surfaceSelected.includes(k))return;
      const before=recordExperience.surfaceShareState(d,ui);
      const value=target.value;
      d['surface'+k]=value===""?"":String(Math.max(0,Math.min(before.max,Math.round(Number(value)))));
      ui.notice="";
      const oldError=app.querySelector('.rv-error');if(oldError)oldError.remove();
      if(target.value!==d['surface'+k])target.value=d['surface'+k];
      const direct=app.querySelector('[data-rv-surface-value="'+k+'"]');
      const slide=app.querySelector('[data-rv-surface-range="'+k+'"]');
      if(direct&&direct!==target)direct.value=d['surface'+k];
      if(slide&&slide!==target)slide.value=d['surface'+k]||0;
      const stateNow=recordExperience.surfaceShareState(d,ui);
      const label=stateNow.share(k)===null?'—':stateNow.share(k)+'%';
      const tile=app.querySelector('[data-rv-surface-tile-value="'+k+'"]');
      const pick=app.querySelector('[data-rv-surface-pick-value="'+k+'"]');
      const bar=app.querySelector('[data-rv-surface-bar="'+k+'"]');
      if(tile)tile.textContent=label;if(pick)pick.textContent=label;
      if(bar)bar.style.width=(stateNow.share(k)??0)+'%';
      const total=app.querySelector('[data-rv-surface-total]');
      const warn=app.querySelector('[data-rv-surface-warning]');
      if(total){total.textContent='合計 '+stateNow.total+'% / 100%';total.className=stateNow.valid?'rv-ok':'rv-invalid';}
      if(warn){warn.textContent=stateNow.valid?'割合の合計は100%です。':'選択した路面の割合を合計100%にしてください。';warn.className='rv-hint '+(stateNow.valid?'rv-ok':'rv-invalid');}
      const summary=app.querySelector('[data-rv-summary-surface]');
      if(summary)summary.textContent=recordExperience.courseSummary(d,ui).surface;
      return;
    }
    if(event.target.matches('[data-gps-note]')&&currentPage()==='gps-review'&&ensureGps().state.phase==='finished'){
      gpsSelfReport.memo=event.target.value.slice(0,500);return;
    }
    if(event.target.matches("[data-draft]")){
      state.recordDraft[event.target.dataset.draft]=event.target.value;
       if(event.target.closest('.rv-manual')&&['distance','minutes'].includes(event.target.dataset.draft)){
         // Update the short incomplete-field notice without disrupting keyboard focus.
         const message=recordExperience.requiredProgress(state.recordDraft);
         const notice=app.querySelector('.rv-manual .rv-required-progress');
         if(notice){notice.textContent=message;notice.hidden=!message;}
         const validation=reviewDraft.checkManualRequiredFields(state.recordDraft);
         for(const [field,valid] of [['distance',validation.fields.distance],['time',validation.fields.time]]){
           const fieldBox=app.querySelector('.rv-manual [data-required-field="'+field+'"]');
           if(fieldBox){fieldBox.dataset.requiredOk=String(valid);fieldBox.querySelector('input')?.setAttribute('aria-invalid',String(!valid));}
         }
       }
      if(event.target.closest('.rv-course')&&/^sectionShare[0-4]$/.test(event.target.dataset.draft)){
        const result=recordExperience.sectionShareProgress(state.recordDraft,ui);
        const progress=app.querySelector('[data-rv-section-progress]');
        if(progress){progress.textContent=result.text;progress.classList.toggle('is-complete',result.complete);}
        const rowLabel=event.target.closest('.rv-section-row')?.querySelector('.rv-section-row-head small');
        if(rowLabel)rowLabel.textContent=event.target.value.trim()?'割合 '+event.target.value+'%':'割合 未入力';
      }
      if(event.target.closest("[data-g4-page]"))gaitExperience.paintGait(app.querySelector("[data-g4-page]"),state.recordDraft);
      if(event.target.closest("[data-e4-page]"))environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),state.recordDraft,environmentUi);
      if(event.target.closest("[data-cx-page]")){
        const k=event.target.dataset.draft;
        const count=app.querySelector(`[data-counter="${k}"]`);
        if(count)count.textContent=`${event.target.value.length}/${event.target.maxLength}`;
        if(k==='bodyObservation'){
          // A prior "added" notice is stale as soon as the person edits the text.
          bodyUi.notice='';
          const prior=app.querySelector('[data-cx-page] [data-status]');
          if(prior)prior.textContent='';
          const transfer=bodyExperience.transferStatus(state.recordDraft,bodyUi);
          const button=app.querySelector('[data-append-name]'),status=app.querySelector('.cx-transfer-status');
          if(button)button.disabled=transfer.disabled;
          if(status)status.textContent=transfer.message;
        }
        bodyExperience.fitTextareas(app);
      }
    }
    if(event.target.matches("[data-onboard-nickname]"))onboardingState.nickname=event.target.value;
    if(event.target.matches("[data-onboard-height]"))onboardingState.heightCm=event.target.value;
    if(event.target.matches("[data-onboard-weight]"))onboardingState.weightKg=event.target.value;
    if(event.target.matches("[data-rof-v4-range]")){
      const ui=getRofUi(),d=getRofData();
      rofExperience.setRofScore(ui,d,event.target.value);
      if(gpsRofActive())syncGpsRofCapture(ui.phase);
      rofExperience.reflectRofPage(app,d,ui);
      return;
    }
    if(event.target.matches("[data-rof-input]")){
      const key=event.target.dataset.rofInput,value=Number(event.target.value);
      if(!rofScale.isValidRofJ(value))return;
      rofExperience.recordRofInput(state.recordDraft,key==='rofBefore'?'before':'after',value);
      const box=event.target.closest("[data-rof-entry]");
      if(box){
        box.querySelector("[data-rof-output]").textContent=String(value);
        box.querySelector("[data-rof-description]").textContent=rofScale.guidanceForRofJ(value);
        box.querySelector("[data-rof-clear]").disabled=false;
        const summary=app.querySelector('[data-rof-summary-'+(key==="rofBefore"?"before":"after")+']');if(summary)summary.textContent=String(value);
      }
    }
  });
  app.addEventListener("change",(event)=>{
    if(event.target.matches('[data-gps-rof]')){
      const phase=event.target.dataset.gpsRof,gps=ensureGps();
      if(!((phase==='before'&&gps.state.phase==='ready'&&currentPage()==='measurement')||
           (phase==='after'&&gps.state.phase==='finished'&&currentPage()==='gps-review')))return;
      const v=event.target.value,score=v===''?null:Number(v);
      if(score!==null&&(!Number.isInteger(score)||score<0||score>10))return;
      gpsSelfReport[phase==='before'?'rofBefore':'rofAfter']=score;
      gpsSelfReport[phase==='before'?'beforeCapturedAt':'afterCapturedAt']=score===null?null:new Date().toISOString();
      return;
    }
    if(event.target.matches('[data-gps-save-route]')){
      if(currentPage()==='gps-review'&&ensureGps().state.phase==='finished')gpsSelfReport.saveRoute=event.target.checked;
      return;
    }
    if(event.target.matches("[data-onboard-terms],[data-onboard-privacy]")){
      if(event.target.hasAttribute("data-onboard-terms"))onboardingState.termsAccepted=event.target.checked;
      else onboardingState.privacyConfirmed=event.target.checked;
      const advance=app.querySelector("[data-onboard-next]");if(advance)advance.disabled=!(onboardingState.termsAccepted&&onboardingState.privacyConfirmed);
      return;
    }
    if(event.target.matches('[data-condition-form] [name="date"]')){
      if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(event.target.value)){
        homeUi.conditionDate=event.target.value;homeUi.deletePendingDate=null;render();
      }
      return;
    }
    if(event.target.matches('[data-condition-form] [name="bedDayRule"]')){
      homeExperience.updateSleepForm(event.target.closest("[data-condition-form]"));
      return;
    }
    if(event.target.matches('[data-rof-run-start],[data-rof-run-end],[data-rof-end-day-rule]')){
      const dayRule=app.querySelector('[data-rof-end-day-rule]:checked')?.value||'auto';
      const isDayRule=event.target.matches('[data-rof-end-day-rule]');
      const phase=event.target.matches('[data-rof-run-start]')?'start':'end';
      const value=isDayRule?app.querySelector('[data-rof-run-end]')?.value||'':event.target.value;
      const ok=rofExperience.setExerciseClockTime(state.recordDraft,phase,value,dayRule);
      if(!ok){
        state.toast='入力した終了時刻が開始時刻より前です。終了日を翌日にするか、時刻を確認してください。';
        rofUi.metaOpen=true;const y=window.scrollY;render();window.scrollTo(0,y);return;
      }
      if(isDayRule){
        rofUi.metaOpen=true;
        const y=window.scrollY;render();window.scrollTo(0,y);return;
      }
      const output=app.querySelector('[data-rof-time-display="'+phase+'"]');
      if(output)output.textContent=value||'時刻を選択';
      const day=app.querySelector('.rv4-end-day-caption');
      const computed=state.recordDraft.exerciseTimingDraft;
      if(day){
        const show=!!computed?.endedLocal;
        day.hidden=!show;
        if(show)day.textContent='終了日：'+computed.endedLocal.slice(0,10).replaceAll('-','/')+
          (computed.endDayOffset?'（翌日）':'（当日）');
        else day.textContent='';
      }
      return;
    }
    if(event.target.matches("[data-rof-v4-timing]")){
     rofExperience.setRofTiming(state.recordDraft,rofUi.phase,event.target.value);
     rofUi.metaOpen=!!app.querySelector('.rv4-optional-meta')?.open;
     const y=window.scrollY;render();window.scrollTo(0,y);return;
    }
    if(event.target.matches("[data-rof-v4-declared]")){
     rofExperience.setRofTiming(state.recordDraft,rofUi.phase,'RECALLED',event.target.value);
     rofUi.metaOpen=!!app.querySelector('.rv4-optional-meta')?.open;
     const y=window.scrollY;render();window.scrollTo(0,y);return;
    }
    if(!event.target.matches("[data-draft]"))return;
    const key=event.target.dataset.draft,value=event.target.value;state.recordDraft[key]=value;
    if(key==='date'&&state.recordDraft.exerciseTimingDraft){
      const old=state.recordDraft.exerciseTimingDraft;
      const start=String(old.startedLocal||'').slice(11),end=String(old.endedLocal||'').slice(11);
      const result=rofExperience.resolveExerciseTimes(value,start,end,old.endDayRule||'auto');
      if(result.ok)state.recordDraft.exerciseTimingDraft={...old,...result};
    }
    const container=event.target.closest(".record-editor, .record-v3");
    if(!container||!["gradeMode","surfaceMode","runningFormat"].includes(key))return;
    const attr=key==="gradeMode"?"data-grade-submode":key==="surfaceMode"?"data-surface-submode":"data-running-format";
    container.querySelectorAll("["+attr+"]").forEach(node=>node.hidden=node.getAttribute(attr)!==value);
  });
  app.addEventListener("submit",(event)=>{
    const profileForm=event.target.closest('[data-settings-profile-form]');
    if(profileForm){
      event.preventDefault();
      const fields=Object.fromEntries(new FormData(profileForm).entries());
      const stored=settingsExperience.saveProfile(onboardStorage,fields,settingsUi.profileSnapshot);
      if(stored.ok){settingsUi.profile=stored.value;settingsUi.profileSnapshot=stored.raw;onboardingState.nickname=stored.value.nickname;onboardingState.purpose=stored.value.purpose;onboardingState.heightCm=String(stored.value.heightCm??'');onboardingState.weightKg=String(stored.value.weightKg??'');reportSettingsNotice('プロフィールをこの端末に保存しました。');}
      else reportSettingsNotice(stored.message);
      return;
    }
    const form=event.target.closest("[data-condition-form]");
    if(!form)return;
    event.preventDefault();
    const fields=new FormData(form);
    const result=homeExperience.conditionEntryFromForm({
      date:String(fields.get("date")||""),feeling:String(fields.get("feeling")||""),
      memo:String(fields.get("memo")||""),sleepMode:String(fields.get("sleepMode")||""),
      bedTime:String(fields.get("bedTime")||""),wakeTime:String(fields.get("wakeTime")||""),
      bedDayRule:String(fields.get("bedDayRule")||"auto"),
      durationHours:String(fields.get("durationHours")??""),durationMinutes:String(fields.get("durationMinutes")??"")
    });
    const saved=result.ok?homeExperience.saveCondition(homePreferenceStorage,result.entry):result;
    if(!saved.ok){
      const msg=form.querySelector("[data-sleep-error]");
      if(msg){msg.hidden=false;msg.textContent=saved.reason;}return;
    }
    homeEditState.notice="生活記録を保存しました";
    homeUi.conditionOpen=false;homeUi.deletePendingDate=null;
    render();app.querySelector("[data-condition-open]")?.focus({preventScroll:true});
  });
  app.addEventListener("click",async(event)=>{
    const dismissEntry=event.target.closest('[data-ex-entry-dismiss]');
    if(dismissEntry){dismissEntry.closest('[data-ex-learning-entry]')?.remove();return;}
    // E6: the user chooses both the source type and one exact saved date.
    // Do not use run.date as a default; no persistent relation is written.
    const lifeChoice=event.target.closest('[data-e-life-kind]');
    if(lifeChoice){
      const panel=lifeChoice.closest('[data-e-life-inquiry]');
      if(!panel||currentPage()!=='exploration-tree')return;
      const kind=lifeChoice.dataset.eLifeKind;
      const selectedDate=panel.querySelector('[data-e-life-date]')?.value;
      const notice=panel.querySelector('[data-e-life-notice]');
      if(!['life','rest'].includes(kind)||!selectedDate||!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)){
       if(notice)notice.textContent='日付を指定してください。自動的には選択しません。';
       return;
      }
      const route=location.hash,params=new URLSearchParams(route.split('?')[1]||'');
      const typedTopic=params.get('category')==='05'&&params.get('topic')==='日々のコンディション';
      const localTopic=explorationUi.selected==='05'&&explorationUi.topic==='日々のコンディション';
      if(!typedTopic&&!localTopic)return;
      // Other topic tabs change the in-memory selection without changing the
      // hash. Persist the CURRENT topic along with the deliberate day choice.
      params.set('category','05');params.set('topic','日々のコンディション');
      params.delete('lifeKind');params.delete('lifeDate');
      params.set('lifeKind',kind);params.set('lifeDate',selectedDate);
      const target='#/exploration-tree?'+params.toString();
      if(target===location.hash)render();else location.hash=target;
      return;
    }
    // E5 T05: five separate typed M5 field heads, with one user opt-in.
    // An unreadable field blocks ALL private data; no weather/road inference.
    const conditionReveal=event.target.closest('[data-e-condition-reveal]');
    if(conditionReveal){
      const panel=conditionReveal.closest('[data-e-condition-inquiry]');
      if(!panel||conditionReveal.disabled||currentPage()!=='exploration-tree')return;
      const route=location.hash,params=new URLSearchParams(route.split('?')[1]||'');
      if(params.get('category')!=='03'||params.get('topic')!=='気温・天候')return;
      conditionReveal.disabled=true;conditionReveal.textContent='保存した条件を照合しています…';
      panel.setAttribute('aria-busy','true');
      const ctx=explorationLinkPolicy.resolveExplorationContext(route,{
       manual:manualRunStore.readManualRuns(onboardStorage),
       gpsV2:gpsV2Cache
      });
      let reads;
      if(ctx.ok&&ctx.value.ref){
        const fields=explorationConditionInquiry.CONDITION_FIELDS.map(x=>x.field);
        const outcomes=await Promise.all(fields.map(async field=>{
         try{return await annotationEditor.inspectPostHoc(ctx.value.ref,field)}
         catch{return {ok:false,code:'READ_FAILED',reason:'後日申告を読み取れません'}}
        }));
        reads=Object.fromEntries(fields.map((field,i)=>[field,outcomes[i]]));
      }else reads={};
      if(!panel.isConnected||currentPage()!=='exploration-tree'||location.hash!==route)return;
      panel.outerHTML=explorationConditionInquiry.renderConditionInquiry({
       ref:ctx.ok?ctx.value.ref:(recordRef.parseLegacyOrTypedLink(route,'exploration').value??null),
       record:ctx.ok?ctx.value.record:null,reads
      });
      const nextPanel=app.querySelector('[data-e-condition-inquiry]');
      (nextPanel?.querySelector('[data-e-condition-reveal]')||nextPanel?.querySelector('#ex-e-t05-title'))
       ?.focus({preventScroll:true});
      return;
    }
    // E4 T04: original and subsequent body observations are private. Read them
    // only on an explicit click and only through the verified M5 typed stream.
    const bodyReveal=event.target.closest('[data-e-body-reveal]');
    if(bodyReveal){
      const panel=bodyReveal.closest('[data-e-body-inquiry]');
      if(!panel||bodyReveal.disabled||currentPage()!=='exploration-tree')return;
      const route=location.hash;
      const params=new URLSearchParams(route.split('?')[1]||'');
      if(params.get('category')!=='04'||params.get('topic')!=='筋肉痛・違和感')return;
      bodyReveal.disabled=true;bodyReveal.textContent='身体の記述を確認しています…';
      panel.setAttribute('aria-busy','true');
      const ctx=explorationLinkPolicy.resolveExplorationContext(route,{
       manual:manualRunStore.readManualRuns(onboardStorage),
       gpsV2:gpsV2Cache
      });
      const read=ctx.ok&&ctx.value.ref?
       await annotationEditor.inspectPostHoc(ctx.value.ref,'bodyObservation'):
       {ok:false,code:ctx.code||'READ_FAILED',reason:ctx.reason||'記録を確認できません'};
      if(!panel.isConnected||currentPage()!=='exploration-tree'||location.hash!==route)return;
      panel.outerHTML=explorationBodyInquiry.renderBodyInquiry({
       ref:ctx.ok?ctx.value.ref:(recordRef.parseLegacyOrTypedLink(route,'exploration').value??null),
       record:ctx.ok?ctx.value.record:null,read
      });
      const newPanel=app.querySelector('[data-e-body-inquiry]');
      (newPanel?.querySelector('[data-e-body-reveal]')||newPanel?.querySelector('#ex-e-t04-title'))
       ?.focus({preventScroll:true});
      return;
    }
    // E3: no private mental annotation read without this explicit user action.
    const inquiryReveal=event.target.closest('[data-e-mental-reveal]');
    if(inquiryReveal){
      const panel=inquiryReveal.closest('[data-e-mental-inquiry]');
      if(!panel||inquiryReveal.disabled||currentPage()!=='exploration-tree')return;
      const route=location.hash;
      const params=new URLSearchParams(route.split('?')[1]||'');
      if(params.get('category')!=='05'||params.get('topic')!=='気分・ストレス')return;
      inquiryReveal.disabled=true;inquiryReveal.textContent='任意申告を確認しています…';
      panel.setAttribute('aria-busy','true');
      // The parent's own RecordRef resolver rehydrates GPS v1 from IDB.
      // No second UI-side cache is used as evidence for a private answer.
      const ctx=explorationLinkPolicy.resolveExplorationContext(route,{
       manual:manualRunStore.readManualRuns(onboardStorage),
       gpsV2:gpsV2Cache
      });
      const read=ctx.ok&&ctx.value.ref?
       await mentalSaveFlow.readMental(ctx.value.ref):
       {ok:false,code:ctx.code||'READ_FAILED',reason:ctx.reason||'記録を確認できません'};
      if(!panel.isConnected||currentPage()!=='exploration-tree'||location.hash!==route)return;
      panel.outerHTML=explorationMentalInquiry.renderMentalInquiry({
       ref:ctx.ok?ctx.value.ref:(recordRef.parseLegacyOrTypedLink(route,'exploration').value??null),
       record:ctx.ok?ctx.value.record:null,read
      });
      app.querySelector('[data-e-mental-inquiry] [data-e-mental-reveal]')?.focus({preventScroll:true});
      return;
    }
    const mentalClear=event.target.closest('[data-mental-clear]');
    if(mentalClear){
      const scope=mentalClear.dataset.mentalClear;
      if(!['manual','gps'].includes(scope))return;
      const d=scope==='gps'?gpsMental:manualMental;
      Object.assign(d,mentalExperience.newMentalDraft(),{open:true});
      const y=window.scrollY;render();window.scrollTo(0,y);return;
    }
    const dataAction=event.target.closest('[data-dm-export],[data-dm-isolate],[data-dm-restore],[data-dm-delete-confirm]');
    if(dataAction){
      if(dataUi.busy)return;
      dataUi.busy=true;
      try{
        if(dataAction.hasAttribute('data-dm-export')){
          const result=await manualRunLock.withManualRunWriteLock(()=>canonical.snapshotTask(nativeStorage,s=>dataManagement.exportPortableBackup(s,{includeGps:dataUi.includeGps})));
          if(!result.ok)dataUi.notice=result.reason;
          else{
            try{downloadDataFile(result.text);dataUi.notice="ファイルの保存を開始しました。端末のダウンロード先を確認してください。";}
            catch{dataUi.notice="ファイルを保存できませんでした。ブラウザの設定を確認してください。";}
          }
        }else if(dataAction.hasAttribute('data-dm-isolate')){
           if(!dataUi.orphanBlocked||!dataUi.orphanConsent||!dataUi.pendingText)return;
           const result=await manualRunLock.withManualRunWriteLock(()=>
            canonical.snapshotTask(nativeStorage,storage=>dataManagement.isolateOrphanBackup(
             storage,dataUi.pendingText,{consent:true})));
           if(!result.ok)dataUi.notice=result.reason;
           else{
            try{downloadDataFile(result.isolatedText,'orphan');
             dataUi.notice='隔離ファイルの保存を開始しました。元の走行・補助回答は変更していません。';}
            catch{dataUi.notice='隔離ファイルを保存できませんでした。元の情報は変更していません。';}
           }
         }else if(dataAction.hasAttribute('data-dm-restore')){
          if(!dataUi.preview?.ok||!dataUi.pendingText||(dataUi.preview.hasExisting&&!dataUi.safetyCopy))return;
          const restored=await manualRunLock.withManualRunWriteLock(async()=>{const saved=await canonical.portableMutation(nativeStorage,s=>dataManagement.restorePortableBase(s,dataUi.pendingText));return saved.ok?dataManagement.restorePortableAnnotations(dataUi.pendingText,saved):saved;});
          if(restored.ok){location.reload();return;}
          dataUi.notice=restored.reason;
          if(restored.partial){dataUi.preview=null;dataUi.pendingText="";}
        }else if(dataAction.hasAttribute('data-dm-delete-confirm')){
          if(!dataUi.deleteAgreed||!confirmedDeleteWord())return;
          const removed=await manualRunLock.withManualRunWriteLock(async()=>{const cleared=await canonical.portableMutation(nativeStorage,s=>dataManagement.removeAllPortableBase(s));return cleared.ok?dataManagement.removeAllPortableAnnotations(cleared):cleared;});
          if(removed.ok){location.reload();return;}
          dataUi.notice=removed.reason;
        }
      }catch{dataUi.notice="操作を完了できませんでした。記録の状態を確認してください。";}
      finally{dataUi.busy=false;}
      refreshDataSettings();return;
    }
    const showLegal=event.target.closest("[data-onboard-document],[data-legal-open]");
    if(showLegal){const kind=showLegal.dataset.onboardDocument||showLegal.dataset.legalOpen;
      if(kind==="terms"||kind==="privacy"){
        dismissLegalDialog();
        legalReturnFocus=showLegal;
        document.body.insertAdjacentHTML("beforeend",firstUseExperience.renderLegalDocumentModal(kind,{showEnglishReference:(onboardingState.open?onboardingState.language:settingsUi.display.language)==='en'}));
        const doc=document.body.querySelector(':scope > .fu-doc-backdrop');
        const scroll=doc?.querySelector(".fu-doc-scroll");
        if(scroll)scroll.scrollTop=0;
        doc?.querySelector(".fu-doc-close")?.focus({preventScroll:true});
      }return;
    }
    if(event.target.closest("[data-legal-dismiss]")){dismissLegalDialog();app.querySelector(".fu-doc-backdrop")?.remove();return;}
    const manualGait=event.target.closest("[data-manual-gait]");
    if(manualGait&&currentPage()==='record'){
      const gait=manualGait.dataset.manualGait;
      if(['RUNNING','JOGGING','WALK'].includes(gait)){
       state.recordDraft.activityGait=gait;
       const y=window.scrollY;render();window.scrollTo(0,y);
      }
      return;
    }
    const reviewGait=event.target.closest("[data-review-gait]");
    if(reviewGait&&currentPage()==='record-review'){
     const gait=reviewGait.dataset.reviewGait;
     if(['RUNNING','JOGGING','WALK'].includes(gait)){
      state.recordDraft.activityGait=gait;
      const y=window.scrollY;render();window.scrollTo(0,y);
     }
     return;
    }
    if(event.target.closest("[data-rest-day-save]")){
      if(state.recordReviewSource!=='manual'||state.recordType!=='rest'){
        manualSaveNotice='休養日以外の保存はこの操作ではできません';render();return;
      }
      const saved=await manualRunLock.withManualRunWriteLock(()=>restDayStore.saveRestDay(onboardStorage,state.recordDraft));
      if(!saved.ok){manualSaveNotice=saved.reason;render();return;}
      manualSaveNotice='';state.recordReviewReturn=false;
      historyUi.month=saved.record.date.slice(0,7);historyUi.day=Number(saved.record.date.slice(-2));
      historyUi.type='rest';historyUi.query='';historyUi.selectedId=saved.record.id;
      state.toast='休養日を保存しました。距離や部位別参考値は算出しません。';
      location.hash='#/history';return;
    }
    if(event.target.closest("[data-manual-run-save]")){
      if(mentalSaveBusy)return;
      if(state.recordReviewSource!=="manual"||state.recordType!=="run"){
        manualSaveNotice="手入力の走行記録以外は保存できません";render();return;
      }
      const stableId=manualSaveIdentity();
      if(!stableId){manualSaveNotice='保存操作IDを作成できないため保存を中止しました';render();return;}
      mentalSaveBusy=true;
      try{
        const saved=await manualRunLock.withManualRunWriteLock(()=>canonical.mutate(s=>
          manualRunStore.saveManualRun(s,state.recordDraft,{
           source:state.recordReviewSource,type:state.recordType,requestId:stableId})));
        if(!saved.ok){
          const read=await canonical.refresh();
          const found=read.ok?read.read.records.find(r=>r.id===stableId):null;
          if(found&&saved.code!=='REQUEST_CONFLICT'){
            clearManualSaveIdentity();selectedRunId=stableId;
            state.toast='保存後の照合で原本を確認しました。任意回答は必要に応じて後日入力してください。';
            location.hash='#/result?record='+encodeURIComponent(stableId);return;
          }
          manualSaveNotice=(saved.reason||'保存結果が未確認です')+'。新しい親IDは作らず、同じ操作IDで再確認してください。';
          const y=window.scrollY;render();window.scrollTo(0,y);return;
        }
        clearManualSaveIdentity();
        const ref={sourceType:'MANUAL',recordId:saved.record.id};
        const extra=await saveOptionalMentalAfterParent(ref,manualMental);
        selectedRunId=saved.record.id;manualSaveNotice="";state.recordReviewReturn=false;
        state.toast=extra.ok?"手入力の走行記録を保存しました":'走行記録は保存しましたが、任意の回答は確認できません。結果画面で再試行してください。';
        Object.assign(manualMental,mentalExperience.newMentalDraft());
        location.hash="#/result?record="+encodeURIComponent(saved.record.id);
        return;
      }catch{
        const read=await canonical.refresh();
        const existing=read.ok?read.read.records.find(r=>r.id===stableId):null;
        if(existing){
          clearManualSaveIdentity();selectedRunId=stableId;
          state.toast='不明だった保存結果を再照合し、原本を確認しました。';
          location.hash='#/result?record='+encodeURIComponent(stableId);return;
        }
        manualSaveNotice='走行記録の保存結果は不明です。同じ操作IDを保持し、履歴と保存原本を再確認してください。';
        render();return;
      }finally{mentalSaveBusy=false}
    }
    const conditionControl=event.target.closest("[data-cj-range],[data-cj-day],[data-cj-save-insight],[data-cj-delete-insight],[data-cj-create-intent]");
    if(conditionControl){
      const y=window.scrollY;
      if(conditionControl.hasAttribute("data-cj-range")){
        conditionUi.days=Number(conditionControl.dataset.cjRange);conditionUi.selected="";conditionUi.scrollLeft=null;
      }else if(conditionControl.hasAttribute("data-cj-day")){
        conditionUi.scrollLeft=app.querySelector("[data-cj-chart]")?.scrollLeft??null;
        conditionUi.selected=conditionControl.dataset.cjDay;
      }else if(conditionControl.hasAttribute("data-cj-create-intent")){
        const conditions=homeExperience.readConditions(onboardStorage);
        const data=conditionJourney.prepareConditionJourney(conditions,{...conditionUi,selected:conditionControl.dataset.cjOrigin});
        const existing=actionIntentStore.loadIntent(onboardStorage);
        const result=!existing.ok?{ok:false,reason:existing.reason}:existing.intent?{ok:false,reason:"次回確認がすでに保存されています。ホームで確認事項を整理してから登録してください"}:data.selected?.date===conditionControl.dataset.cjOrigin?actionIntentStore.createLifeIntent(onboardStorage,data.selected):{ok:false,reason:"基準記録を確認できません"};
        conditionUi.notice=result.ok?"次回の確認事項をホームに保存しました":result.reason;
      }else if(conditionControl.hasAttribute("data-cj-save-insight")){
        conditionUi.scrollLeft=app.querySelector("[data-cj-chart]")?.scrollLeft??null;
        const note=conditionControl.closest(".cj-write")?.querySelector("[data-cj-note]")?.value||"";
        const result=conditionInsights.addConditionInsight(onboardStorage,homeExperience.readConditions(onboardStorage),conditionControl.dataset.cjOrigin,note);
        conditionUi.notice=result.ok?"気づきを保存しました":result.reason;
      }else{
        const result=conditionInsights.removeConditionInsight(onboardStorage,conditionControl.dataset.cjDeleteInsight);
        conditionUi.notice=result.ok?"気づきを削除しました":result.reason;
      }
      render();window.scrollTo(0,y);
      // S14: preserve focus on the actual chart control after rebuilding the graph.
      if(conditionControl.hasAttribute("data-cj-day"))app.querySelector('[data-cj-day="'+conditionUi.selected+'"]')?.focus({preventScroll:true});
      else if(conditionControl.hasAttribute("data-cj-range"))app.querySelector('[data-cj-range="'+conditionUi.days+'"]')?.focus({preventScroll:true});
      return;
    }
    const lifeAction=event.target.closest("[data-interpret-save-intent],[data-interpret-mark-reviewed],[data-interpret-pause],[data-interpret-resume],[data-interpret-delete]");
    if(lifeAction){
      const old=actionIntentStore.loadIntent(onboardStorage);
      if(!old.ok){lifeCompareUi.notice=old.reason;render();return;}
      let result;
      if(lifeAction.hasAttribute("data-interpret-save-intent")){
        const baseline=interpretationRules.latestEligibleLifeBaseline(homeExperience.readConditions(onboardStorage));
        result=actionIntentStore.createLifeIntent(onboardStorage,baseline);
      }else if(lifeAction.hasAttribute("data-interpret-delete"))result=actionIntentStore.updateIntent(onboardStorage,null);
      else if(old.intent){
        const newStatus=lifeAction.hasAttribute("data-interpret-pause")?"paused":lifeAction.hasAttribute("data-interpret-resume")?"active":"reviewed";
        result=actionIntentStore.updateIntent(onboardStorage,{...old.intent,status:newStatus});
      }else result={ok:false,reason:"保存された確認事項がありません"};
      lifeCompareUi.notice=result.ok?"確認事項を更新しました":result.reason;
      const y=window.scrollY;render();window.scrollTo(0,y);return;
    }
    const setting=event.target.closest('[data-settings-text],[data-settings-motion],[data-settings-language]');
    if(setting){
      const key=setting.hasAttribute('data-settings-text')?'textSize':
       setting.hasAttribute('data-settings-motion')?'motion':'language';
      const value=setting.dataset[key==='textSize'?'settingsText':key==='motion'?'settingsMotion':'settingsLanguage'];
      const updated={...settingsUi.display,[key]:value};
      const saved=settingsExperience.saveDisplay(onboardStorage,updated,settingsUi.displaySnapshot);
      if(saved.ok){
        settingsUi.display=saved.value;settingsUi.displaySnapshot=saved.raw;
        settingsExperience.applyDisplay(settingsUi.display,document.documentElement);
        if(key==='language'){
          englishUi.setLanguage(saved.value.language);
          render();
          reportSettingsNotice(saved.value.language==='en'
           ?'Language changed to English.'
           :'日本語表示に切り替えました。');
        }else{
          setting.parentElement?.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===setting)));
          reportSettingsNotice('表示設定を保存しました。');
        }
      }else reportSettingsNotice(saved.message);
      return;
    }
    const gpsCapacityAction=event.target.closest('[data-gps-capacity-check],[data-gps-persist-request]');
    if(gpsCapacityAction){
      if(gpsCapacityAction.hasAttribute('data-gps-persist-request')){
        const requested=await gpsStorageHealth.requestGpsStoragePersistence();
        gpsCapacityNotice=requested.ok?requested.message:requested.reason;
      }else gpsCapacityNotice='';
      gpsCapacity=await gpsStorageHealth.readGpsOriginStorage();
      render();return;
    }
    const v2BackupAction=event.target.closest('[data-gps-v2-backup-export],[data-gps-v2-backup-confirm],[data-gps-v2-backup-cancel]');
    if(v2BackupAction){
     if(v2BackupAction.hasAttribute('data-gps-v2-backup-export')){
      const result=await gpsV2.exportGpsV2Backup();
      if(result.ok){
       try{
        const blob=new Blob([result.text],{type:'application/json;charset=utf-8'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download='gps-detailed-track-backup-'+new Date().toISOString().slice(0,10)+'.json';
        document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
        gpsV2BackupNotice='GPS記録のバックアップをダウンロードしました。保存先を確認してください。';
       }catch{gpsV2BackupNotice='バックアップファイルを生成できませんでした';}
      }else gpsV2BackupNotice=result.reason;
     }else if(v2BackupAction.hasAttribute('data-gps-v2-backup-cancel')){
      pendingGpsV2Backup=null;gpsV2BackupNotice='復元を取り消しました';
     }else if(pendingGpsV2Backup){
      const result=await gpsV2.importGpsV2Backup(pendingGpsV2Backup.text);
      pendingGpsV2Backup=null;
      gpsV2BackupNotice=result.ok?`GPS記録を${result.added}件復元しました。`:result.reason;
      gpsV2Cache=await gpsV2.readGpsV2Summaries();
     }
     render();return;
    }
    const gpsConsentChoice=event.target.closest('[data-gps-consent-confirm],[data-gps-consent-cancel]');
    if(gpsConsentChoice){
      const pending=gpsConsentAction;
      gpsConsentAction="";
      if(gpsConsentChoice.hasAttribute('data-gps-consent-confirm')&&currentPage()==='measurement'&&gpsPlatform.currentGpsSmartphone()){
        const gps=ensureGps();
        if(pending==='start'&&gps.state.phase==='ready'){
          // Capture optional profile body mass only when measurement begins.
          // A later profile edit must not retroactively change this session.
          const mass=settingsExperience.loadProfile(onboardStorage).weightKg;
          gps.setBodyMassKg(typeof mass==='number'?mass:null);
          gps.start();
        }
        if(pending==='resume'&&gps.state.phase==='paused')gps.resume();
        refreshGpsTicker();if(gps.state.phase==='running')void requestGpsWakeLock();render();
      }else{
        render();app.querySelector(pending==='resume'?'[data-gps-action="resume"]':'[data-gps-action="start"]')?.focus();
      }
      return;
    }
    const gpsV2Use=event.target.closest('[data-gps-v2-use]');
    if(gpsV2Use){
     const saved=await gpsV2.readGpsV2Detail(gpsV2Use.dataset.gpsV2Use);
     if(!saved.ok){state.toast=saved.reason;render();return;}
     const feature=gpsV2.gpsV2DetailToFeature(saved.summary,saved.detail);
     if(!feature){state.toast='コースを読み込めませんでした';render();return;}
     simulationUi.source='gps';simulationExperience.beginGpsCourseSelection(simulationUi,saved.summary.id);
     simulationUi.gpsFeature=feature;simulationUi.gpsFeatureId=saved.summary.id;
     simulationUi.distance=String(feature.distanceKm);
     location.hash='#/simulation';return;
    }
    const gpsV2Delete=event.target.closest('[data-gps-v2-delete],[data-gps-v2-confirm-delete],[data-gps-v2-cancel-delete]');
    if(gpsV2Delete){
      if(gpsV2Delete.hasAttribute('data-gps-v2-delete')){
       if(!confirm('このGPS記録を削除しますか？'))return;
       const done=await gpsV2.deleteGpsV2Run(gpsV2Delete.dataset.gpsV2Delete);
       gpsV2Cache=await gpsV2.readGpsV2Summaries();
       state.toast=done.ok?'GPS記録を削除しました':done.reason;render();
      }
      return;
    }
    const gpsAction=event.target.closest('[data-gps-action]');
    if(gpsAction){
      const gps=ensureGps(),action=gpsAction.dataset.gpsAction;
      if(action==='start'){
        if(!gpsPlatform.currentGpsSmartphone()){gps.state.notice='GPS測定はスマートフォン専用です';render();return;}
        if(!window.isSecureContext){gps.state.notice='GPS計測はHTTPSで開いてください';render();return;}
        if(gps.state.phase==='ready'){gpsConsentAction='start';render();app.querySelector('[data-gps-consent-confirm]')?.focus();return;}
      }else if(action==='flag'){gps.addFlag();}
      else if(action==='pause'){gps.pause();releaseGpsWakeLock();}
      else if(action==='resume'){
        if(gps.state.phase==='paused'){gpsConsentAction='resume';render();app.querySelector('[data-gps-consent-confirm]')?.focus();return;}
      }
      else if(action==='finish'){
        if(gps.finish()){
          releaseGpsWakeLock();
          if(gps.state.distanceM>=10&&gps.state.accepted>=2){location.hash='#/gps-review';return;}
        }
        releaseGpsWakeLock();
      }
      else if(action==='discard'){gps.discard();releaseGpsWakeLock();gpsController=null;gpsSelfReport=emptyGpsReport();gpsMental=mentalExperience.newMentalDraft();location.hash='#/record-start';return;}
      else if(action==='review'){if(gps.state.phase==='finished'){location.hash='#/gps-review';return;}}
      else if(action==='save'){
        if(mentalSaveBusy)return;
        if(gps.state.phase!=='finished'||currentPage()!=='gps-review'){gps.state.notice='GPS記録の確認画面から保存してください';render();return;}
        const saveRoute=gpsSelfReport.saveRoute===true;
        const local=new Date(),date=`${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}-${String(local.getDate()).padStart(2,'0')}`;
        mentalSaveBusy=true;
        try{
          const saved=await gpsV2.saveGpsV2Run(gps.getSnapshot(),{saveDetails:saveRoute,date,experience:{
            source:'USER_REPORTED',rofBefore:gpsSelfReport.rofBefore,rofAfter:gpsSelfReport.rofAfter,
            beforeCapturedAt:gpsSelfReport.beforeCapturedAt,afterCapturedAt:gpsSelfReport.afterCapturedAt,
            memo:gpsSelfReport.memo
          }});
          if(saved.ok){
            const ref={sourceType:'GPS_V2',recordId:saved.summary.id};
            gpsV2Cache=await gpsV2.readGpsV2Summaries();
            const extra=await saveOptionalMentalAfterParent(ref,gpsMental);
            state.toast=extra.ok?'GPS実走の記録と本人申告を保存しました':'GPS走行記録は保存しましたが、任意回答は未確認です。結果で注記だけ再試行できます。';
            gpsController=null;gpsSelfReport=emptyGpsReport();gpsMental=mentalExperience.newMentalDraft();
            location.hash='#/result?gps='+encodeURIComponent(saved.summary.id);return;
          }
          gps.state.notice=saved.reason;
        }catch{
          gps.state.notice='保存の結果を確認できません。GPS記録を重複保存せず履歴を確認してください';
        }finally{mentalSaveBusy=false}

      }
      refreshGpsTicker();render();return;
    }
    const ui=state.recordCourseUi,d=state.recordDraft;
    const courseButton=event.target.closest('[data-course-save],[data-course-save-new],[data-course-use],[data-course-delete],[data-course-confirm-delete],[data-course-cancel-delete]');
    if(courseButton){
      const key=courseButton.dataset;
      const current=coursePresets.readCoursePresets(onboardStorage);
      const refresh=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
      if(key.courseCancelDelete!==undefined){ui.pendingDelete='';refresh();return;}
      if(key.courseDelete){ui.pendingDelete=key.courseDelete;ui.notice='';refresh();return;}
      if(key.courseConfirmDelete){
        if(ui.pendingDelete!==key.courseConfirmDelete){ui.notice='削除対象を再確認してください';refresh();return;}
        const result=coursePresets.deleteCoursePreset(onboardStorage,key.courseConfirmDelete);
        if(result.ok){if(ui.selectedPresetId===key.courseConfirmDelete)ui.selectedPresetId='';ui.notice='保存したコースを削除しました。現在の入力内容や走行記録は変更されません';}
        else ui.notice=result.reason;
        ui.pendingDelete='';refresh();return;
      }
      if(key.courseUse){
        const found=current.ok?current.records.find(r=>r.id===key.courseUse):null;
        const applied=coursePresets.applyCoursePreset(d,found);
        if(!applied.ok){ui.notice=current.ok?applied.reason:current.reason;refresh();return;}
        state.recordDraft=applied.draft;
        state.recordCourseUi={...applied.ui,selectedPresetId:found.id,pendingDelete:'',notice:'「'+found.data.courseName+'」を今回のコースとして読み込みました'};
        refresh();return;
      }
      const saving=coursePresets.saveCoursePreset(onboardStorage,d,ui,key.courseSaveNew!==undefined?'':(ui.selectedPresetId||''));
      if(saving.ok){ui.selectedPresetId=saving.preset.id;ui.pendingDelete='';ui.notice='「'+saving.preset.data.courseName+'」を保存しました';}
      else ui.notice=saving.reason;
      refresh();return;
    }
    const bodyRoot=event.target.closest('[data-cx-page]');
    if(bodyRoot){
      const obj=event.target.closest('[data-map-view],[data-region-focus],[data-confirm-id],[data-picker-id],[data-unselect],[data-picker-toggle],[data-selected-expand],[data-clear-all],[data-append-name],[data-apply]');
      if(obj){
        if(obj.matches('[data-map-view]')) bodyExperience.setView(bodyUi,obj.dataset.mapView);
        else if(obj.matches('[data-region-focus]'))bodyExperience.focusRegion(bodyUi,obj.dataset.regionFocus);
        else if(obj.matches('[data-confirm-id]'))bodyExperience.toggleRegion(bodyUi,obj.dataset.confirmId);
        else if(obj.matches('[data-picker-id]')){
          bodyExperience.focusRegion(bodyUi,obj.dataset.pickerId);
          bodyExperience.toggleRegion(bodyUi,obj.dataset.pickerId);
          bodyUi.pickerOpen=true;
        }
        else if(obj.matches('[data-unselect]'))bodyExperience.toggleRegion(bodyUi,obj.dataset.unselect);
        else if(obj.matches('[data-picker-toggle]'))bodyUi.pickerOpen=!bodyUi.pickerOpen;
        else if(obj.matches('[data-selected-expand]'))bodyUi.selectedExpanded=!bodyUi.selectedExpanded;
        else if(obj.matches('[data-clear-all]'))bodyExperience.clearSelected(bodyUi);
        else if(obj.matches('[data-append-name]'))bodyExperience.addRegionNamesToNote(d,bodyUi);
        else if(obj.matches('[data-apply]')){location.hash=state.recordReviewReturn?'#/record-review':'#/record';return;}
        const y=window.scrollY;render();window.scrollTo(0,y);
        if(obj.matches('[data-selected-expand]'))app.querySelector('[data-selected-expand]')?.focus({preventScroll:true});
        if(obj.matches('[data-region-focus]'))app.querySelector(`[data-region-focus="${obj.dataset.regionFocus}"]`)?.focus({preventScroll:true});
        return;
      }
    }
    const e4Commit=event.target.closest("[data-e4-commit]");
    if(e4Commit){
      const result=environmentExperience.applyEnvironmentSelections(d,environmentUi);
      if(!result.ok)environmentUi.notice=result.reason;
      const note=app.querySelector('[data-e4-page] [data-draft="environmentNote"]');
      if(note&&result.ok)note.value=d.environmentNote;
      environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),d,environmentUi);
      return;
    }
    const weather=event.target.closest("[data-e4-weather]");
    if(weather){environmentExperience.toggleWeather(environmentUi,weather.dataset.e4Weather);environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),d,environmentUi);return;}
    const flag=event.target.closest("[data-e4-flag]");
    if(flag){environmentExperience.toggleFlag(environmentUi,flag.dataset.e4Flag);environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),d,environmentUi);return;}
    if(event.target.closest("[data-e4-done]")&&environmentExperience.temperatureError(d.temperatureC)){event.preventDefault();return;}
    const gaitSource=event.target.closest("[data-g4-source]");
    if(gaitSource){d.stepsProvenance=gaitSource.dataset.g4Source;gaitExperience.paintGait(app.querySelector("[data-g4-page]"),d);return;}
    const gaitFormat=event.target.closest("[data-g4-format]");
    if(gaitFormat){d.runningFormat=gaitFormat.dataset.g4Format;gaitExperience.paintGait(app.querySelector("[data-g4-page]"),d);return;}
    if(event.target.closest("[data-g4-apply]")){
      const check=gaitExperience.gaitValidation(d);
      if(check.valid){location.hash=state.recordReviewReturn?"#/record-review":"#/record";render();}
      return;
    }
    const drawRecord=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
    const grade=event.target.closest("[data-rv-grade]");
    if(grade){d.gradeMode=grade.dataset.rvGrade;ui.notice="";drawRecord();return;}
    const slopeTile=event.target.closest("[data-rv-slope-tile]");
    if(slopeTile&&slopeTile.dataset.rvSlopeTile!=="flat"){ui.slope=slopeTile.dataset.rvSlopeTile;drawRecord();return;}
    const slopeStep=event.target.closest("[data-rv-step]");
    if(slopeStep){
      const own=ui.slope==="down"?"downPercent":"upPercent",other=own==="upPercent"?"downPercent":"upPercent";
      const old=d[own]===""?0:Number(d[own]),max=100-(d[other]===""?0:Number(d[other]));
      d[own]=String(Math.max(0,Math.min(max,old+Number(slopeStep.dataset.rvStep))));ui.notice="";drawRecord();return;
    }
    const surfaceMode=event.target.closest("[data-rv-surface-mode]");
    if(surfaceMode){d.surfaceMode=surfaceMode.dataset.rvSurfaceMode;ui.notice="";drawRecord();return;}
    const surfaceFocus=event.target.closest("[data-rv-surface-focus]");
    if(surfaceFocus){ui.surfaceFocus=surfaceFocus.dataset.rvSurfaceFocus;drawRecord();return;}
    const surfaceStep=event.target.closest("[data-rv-surface-step]");
    if(surfaceStep){
      const info=recordExperience.surfaceShareState(d,ui),k=info.active;
      if(k){
        const previous=info.share(k)??0;
        d['surface'+k]=String(Math.max(0,Math.min(info.max,previous+Number(surfaceStep.dataset.rvSurfaceStep))));
        ui.notice="";drawRecord();
      }
      return;
    }
    const surface=event.target.closest("[data-rv-surface]");
    if(surface){const k=surface.dataset.rvSurface;
      if(d.surfaceMode==="SINGLE")d.primarySurface=k;
      else if(d.surfaceMode==="MIXED"){
        ui.surfaceSelected=ui.surfaceSelected.includes(k)?ui.surfaceSelected.filter(x=>x!==k):[...ui.surfaceSelected,k];
        if(!ui.surfaceSelected.includes(ui.surfaceFocus))ui.surfaceFocus=ui.surfaceSelected[0]||null;
        else if(ui.surfaceSelected.includes(k))ui.surfaceFocus=k;
      }
      ui.notice="";drawRecord();return;
    }
    if(event.target.closest("[data-rv-add]")){if(ui.sections<5){ui.sections++;ui.notice="";drawRecord()}return;}
    const remove=event.target.closest("[data-rv-remove]");
    if(remove){const n=Number(remove.dataset.rvRemove);
      if(n>=0&&n<ui.sections){for(let i=n;i<ui.sections-1;i++)for(const stem of ["sectionShare","sectionDirection","sectionGrade","sectionSurface"])d[stem+i]=d[stem+(i+1)];
      const last=ui.sections-1;d["sectionShare"+last]="";d["sectionDirection"+last]="FLAT";d["sectionGrade"+last]="";d["sectionSurface"+last]="UNKNOWN";ui.sections--;ui.notice="";drawRecord()}return;
    }
    if(event.target.closest("[data-rv-apply]")){
      const err=recordExperience.courseReadiness(d,ui);
      if(err.length){ui.notice=err.join(" ");drawRecord();return;}
      ui.notice="";location.hash=currentPage()==="course"?"#/record":"#/record";return;
    }
    const pick=event.target.closest("[data-duration-minute]");
    if(pick){
      const form=pick.closest("[data-condition-form]");
      const input=form.querySelector('[name="durationMinutes"]');
      input.value=String(Number(pick.dataset.durationMinute));
      homeExperience.updateSleepForm(form);
      return;
    }
    const modeButton=event.target.closest("[data-sleep-mode]");
    if(modeButton){
      const form=modeButton.closest("[data-condition-form]");
      form.querySelector('[name="sleepMode"]').value=modeButton.dataset.sleepMode;
      homeExperience.updateSleepForm(form);
      return;
    }
    const deleteLifeStart=event.target.closest("[data-condition-delete-start]");
    if(deleteLifeStart){homeUi.deletePendingDate=deleteLifeStart.dataset.conditionDeleteStart;render();return;}
    if(event.target.closest("[data-condition-delete-cancel]")){homeUi.deletePendingDate=null;render();return;}
    const deleteLifeConfirm=event.target.closest("[data-condition-delete-confirm]");
    if(deleteLifeConfirm){
      const requested=deleteLifeConfirm.dataset.conditionDeleteConfirm;
      const eligible=homeUi.deletePendingDate===requested&&homeUi.conditionDate===requested;
      const outcome=eligible?homeExperience.deleteCondition(homePreferenceStorage,requested):{ok:false,reason:"削除対象の日付を再確認してください"};
      homeUi.deletePendingDate=null;
      if(outcome.ok){homeUi.conditionOpen=false;homeEditState.notice="選択した日の生活記録を削除しました。その他の記録と本人の気づきは変更していません";}
      else{homeEditState.notice=outcome.reason;}
      render();return;
    }
    if(event.target.closest("[data-condition-open]")){homeUi.conditionDate=homeExperience.todayLocal();homeUi.deletePendingDate=null;homeUi.conditionOpen=true;homeUi.achievementOpen=false;render();app.querySelector(".hx-condition-dialog .hx-dialog-head [data-home-close]")?.focus({preventScroll:true});return;}
    if(event.target.closest("[data-achievement-open]")){homeUi.achievementOpen=true;homeUi.conditionOpen=false;render();app.querySelector(".hx-ach-dialog .hx-dialog-head [data-home-close]")?.focus({preventScroll:true});return;}
    if(event.target.closest("[data-home-close]")||(event.target.matches("[data-home-overlay]"))){
      const trigger=homeUi.conditionOpen?"[data-condition-open]":homeUi.achievementOpen?"[data-achievement-open]":null;
      homeUi.conditionOpen=false;homeUi.achievementOpen=false;homeUi.deletePendingDate=null;render();
      if(trigger)app.querySelector(trigger)?.focus({preventScroll:true});
      return;
    }
    if(event.target.closest("[data-onboard-open]")){onboardingState.open=true;onboardingState.replay=true;onboardingState.step=2;onboardingState.error="";render();return;}
    if(event.target.closest("[data-onboard-close]")){if(onboardingState.replay){onboardingState.open=false;onboardingState.replay=false;render();}return;}
    const onboardLang=event.target.closest('[data-onboard-language]');
    if(onboardLang&&onboardingState.open&&onboardingState.step===0){
      const lang=onboardLang.dataset.onboardLanguage==='en'?'en':'ja';
      const saved=settingsExperience.saveDisplay(onboardStorage,{...settingsUi.display,language:lang},settingsUi.displaySnapshot);
      if(saved.ok){
        settingsUi.display=saved.value;settingsUi.displaySnapshot=saved.raw;
        onboardingState.language=lang;
        settingsExperience.applyDisplay(saved.value,document.documentElement);
        englishUi.setLanguage(lang);
        onboardingState.error='';
      }else onboardingState.error=saved.message;
      render();return;
    }
    if(event.target.closest("[data-onboard-back]")){onboardingState.step=Math.max(onboardingState.replay?2:0,onboardingState.step-1);onboardingState.error="";render();return;}
    if(event.target.closest("[data-onboard-skip-guide]")&&onboardingState.open&&!onboardingState.replay&&onboardingState.step>=2&&onboardingState.step<=6){onboardingState.step=7;onboardingState.error="";render();return;}
    if(event.target.closest("[data-onboard-skip-profile]")&&onboardingState.step===7){finishOnboarding();return;}
    if(event.target.closest("[data-onboard-next]")){
      if(onboardingState.step===1){
        if(!onboardingState.termsAccepted||!onboardingState.privacyConfirmed)return;
        const accepted=legalDocuments.saveLegalConsent(onboardStorage);
        if(!accepted.ok){onboardingState.error=accepted.message;render();return;}
        if(onboardingState.reconsentOnly){onboardingState.reconsentOnly=false;finishOnboarding();return;}
      }
      if(onboardingState.step<7){onboardingState.step+=1;onboardingState.error="";render();return;}
      const savedProfile=settingsExperience.saveProfile(onboardStorage,{nickname:onboardingState.nickname,purpose:onboardingState.purpose,heightCm:onboardingState.heightCm,weightKg:onboardingState.weightKg,ageBand:onboardingState.ageBand},settingsUi.profileSnapshot);
      if(!savedProfile.ok){onboardingState.error=savedProfile.message;render();return;}
      settingsUi.profile=savedProfile.value;settingsUi.profileSnapshot=savedProfile.raw;finishOnboarding();return;
    }
    if(event.target.closest("[data-home-guide-toggle]")){
      homeUi.guideOpen=!homeUi.guideOpen;
      render();
      const focusTarget=homeUi.guideOpen?app.querySelector("#home-screen-guide-title"):app.querySelector("[data-home-guide-toggle]");
      focusTarget?.focus({preventScroll:!homeUi.guideOpen});
      return;
    }
    if(event.target.closest("[data-home-guide-close]")){
      homeUi.guideOpen=false;
      render();
      app.querySelector("[data-home-guide-toggle]")?.focus({preventScroll:true});
      return;
    }
    const homeEdit=event.target.closest("[data-home-edit]");
    if(homeEdit){homeEditState.notice="";if(homeEditState.editing){homeEditState.editing=false;homeEditState.draft=null}else{homeEditState.editing=true;homeEditState.draft=dashboardPrefs.copyHomeDashboardLayout(homePreferenceState.layout)}render();return}
    if(event.target.closest("[data-home-reset]")){commitHomeLayout(dashboardPrefs.defaultHomeDashboardLayout());render();return;}
    const widgetAction=event.target.closest("[data-widget-action]");
    if(widgetAction&&homeEditState.editing){
      const y=window.scrollY;
      const next=dashboardPrefs.editHomeDashboardLayout(homeEditState.draft,widgetAction.dataset.widgetAction,widgetAction.dataset.widgetId);
      commitHomeLayout(next);
      render();window.scrollTo(0,y);return;
    }
    const sheetExpand=event.target.closest("[data-sheet-expand]");
    if(sheetExpand){const y=window.scrollY;state.sheetExpanded=!state.sheetExpanded;render();window.scrollTo(0,y);return}
    const sheetToggle=event.target.closest("[data-sheet-toggle]");
    if(sheetToggle){const y=window.scrollY;state.sheetVisible=!state.sheetVisible;render();window.scrollTo(0,y);return}
    const exploreSelect=event.target.closest("[data-ex-category]");
    if(exploreSelect){
      const id=exploreSelect.dataset.exCategory,c=CATEGORIES.find(c=>c.id===id);
      if(c){explorationUi.selected=id;explorationUi.topic=exploreSelect.dataset.exPickTopic||c.topics[0]||"";explorationUi.tab="field";explorationUi.notice="";render();
        if(matchMedia("(max-width:900px)").matches)app.querySelector(".ex-focus")?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});}
      return;
    }
    const exploreTopicStep=event.target.closest("[data-ex-topic-step]");
    if(exploreTopicStep){
      const tabs=[...app.querySelectorAll('.ex-topic-set [data-ex-topic]')];
      const current=tabs.findIndex(tab=>tab.dataset.exTopic===explorationUi.topic);
      const visible=tabs.findIndex(tab=>tab.classList.contains('is-picked'));
      const selectedIndex=current>=0?current:visible>=0?visible:0;
      tabs[selectedIndex+Number(exploreTopicStep.dataset.exTopicStep)]?.click();
      return;
    }
    const exploreTopic=event.target.closest("[data-ex-topic]");
    if(exploreTopic){
       const before=exploreTopic.closest('.ex-topic-set');
       const oldLeft=before?.scrollLeft||0;
       explorationUi.topic=exploreTopic.dataset.exTopic;explorationUi.followup="";
       render();
       const rail=app.querySelector('.ex-topic-set'),active=rail?.querySelector('.ex-topic.is-picked');
       if(rail&&active){
         const r=rail.getBoundingClientRect(),b=active.getBoundingClientRect();
         rail.scrollLeft=Math.max(0,oldLeft+b.left-r.left-(r.width-b.width)/2);
         // S12: topic switches replace the learning card; keep focus on its selected topic.
         active.focus({preventScroll:true});
       }
       return;
     }
    const exploreTab=event.target.closest("[data-ex-tab]");
    if(exploreTab){explorationUi.tab=exploreTab.dataset.exTab;explorationUi.notice="";render();return;}
    const bodyChoice=event.target.closest("[data-ex-body]");
    if(bodyChoice){const y=window.scrollY;explorationUi.bodyChoice=bodyChoice.dataset.exBody;render();window.scrollTo(0,y);return;}
    const slopeChoice=event.target.closest("[data-ex-slope]");
    if(slopeChoice){const y=window.scrollY;explorationUi.toolChoice=slopeChoice.dataset.exSlope;render();window.scrollTo(0,y);return;}
    const nextChoice=event.target.closest("[data-ex-next]");
    if(nextChoice){explorationReturnAction="note";const prompts={"02|足・膝・股関節":["次は走るときの股関節の動きを意識してみたい","足首の動きについてもう少し調べたい"],"03|上り坂・下り坂":["次は上りと下りで感じ方を確かめたい","坂道のある日とない日の記録を見比べたい"],"05|睡眠":["次は起床時の調子も記録してみたい","睡眠の記録を数日分見返してみたい"]};const options=prompts[explorationUi.selected+"|"+explorationUi.topic]||[];explorationUi.followup=options[Number(nextChoice.dataset.exNext)]||"";explorationUi.modal="note";render();app.querySelector("#ex-note")?.focus();return;}
    const exploreAction=event.target.closest("[data-ex-action]");
    if(exploreAction){
      const action=exploreAction.dataset.exAction;
      if(action==="close"){const deleting=explorationUi.modal==="delete-note";const id=explorationUi.deletingNoteId;explorationUi.modal=deleting?"memories":"";explorationUi.editingNoteId=null;explorationUi.deletingNoteId=null;render();if(deleting)[...app.querySelectorAll('[data-ex-delete]')].find(el=>el.dataset.exDelete===id)?.focus({preventScroll:true});else restoreExplorationFocus();return;}
      if(action==="cancel-delete-note"){const id=explorationUi.deletingNoteId;explorationUi.deletingNoteId=null;explorationUi.modal="memories";render();[...app.querySelectorAll('[data-ex-delete]')].find(el=>el.dataset.exDelete===id)?.focus({preventScroll:true});return;}
      if(action==="confirm-delete-note"){
        const id=explorationUi.deletingNoteId;
        if(!id||explorationUi.modal!=="delete-note"||!explorationUi.notes.some(n=>n.id===id))return;
        const deleteResult=await manualRunLock.withManualRunWriteLock(()=>explorationExperience.deleteNote(explorationUi,id));
        const success=deleteResult===true;
        explorationUi.notice=success?"選択したメモを削除しました":"削除できませんでした。保存データは保護しています。";
        explorationUi.deletingNoteId=null;explorationUi.modal="memories";render();app.querySelector('.ex-dialog-head button')?.focus({preventScroll:true});return;
      }
       if(action==="catalog"){explorationUi.tab="catalog";render();return;}
      if(action==="sample"){explorationUi.sample=!explorationUi.sample;render();return;}
      if(action==="save-edited-note"){
        const revised=await manualRunLock.withManualRunWriteLock(()=>explorationExperience.editNote(
          explorationUi,explorationUi.editingNoteId,app.querySelector("#ex-note-edit")?.value));
        explorationUi.notice=revised.ok?"文章を修正しました。以前の文章は履歴に保持しています":revised.reason;
        if(revised.ok){explorationUi.modal="memories";explorationUi.editingNoteId=null;}
        render();return;
      }
      if(action==="save-note"){
        const noteParams=new URLSearchParams(location.hash.split('?')[1]||'');
        const focusId=location.hash.startsWith('#/exploration-tree')&&noteParams.has('record')?noteParams.get('record'):null;
        const noteText=app.querySelector("#ex-note")?.value;
        const result=await manualRunLock.withManualRunWriteLock(()=>explorationExperience.saveNote(
          explorationUi,noteText,
          {focusRunId:focusId,manualRuns:manualRunStore.readManualRuns(onboardStorage)}));
        explorationUi.notice=result.ok?"書いたことを保存しました":result.reason;if(result.ok)explorationUi.followup="";
        if(result.ok)explorationUi.modal="";
        render();if(result.ok)restoreExplorationFocus();return;
      }
      if(action==="copy"){
        const value=app.querySelector("[data-ex-draft-text]")?.innerText||"";
        if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).then(()=>{const n=app.querySelector(".ex-dialog");if(n){const p=document.createElement("p");p.setAttribute("role","status");p.textContent="コピーしました";n.appendChild(p);}}).catch(()=>{const n=app.querySelector(".ex-dialog");if(n){const p=document.createElement("p");p.setAttribute("role","alert");p.textContent="コピーできませんでした";n.appendChild(p);}})}
        return;
      }
      explorationReturnAction=action;
      explorationUi.modal=action;explorationUi.notice="";render();app.querySelector(".ex-dialog-head button")?.focus();return;
    }
    const exploreEdit=event.target.closest("[data-ex-edit]");
    if(exploreEdit){
      explorationUi.editingNoteId=exploreEdit.dataset.exEdit;
      explorationUi.modal="edit-note";explorationUi.notice="";
      render();app.querySelector("#ex-note-edit")?.focus();return;
    }
    const exploreDelete=event.target.closest("[data-ex-delete]");
    if(exploreDelete){
      const id=exploreDelete.dataset.exDelete;
      if(!explorationUi.canSave||!explorationUi.notes.some(n=>n.id===id))return;
      explorationUi.deletingNoteId=id;explorationUi.modal="delete-note";explorationUi.notice="";
      render();app.querySelector('[data-ex-action="cancel-delete-note"]')?.focus({preventScroll:true});return;
    }
    const openTopic=event.target.closest("[data-open-topic]");
    if(openTopic){const [cat,topic]=openTopic.dataset.openTopic.split("|");if(CATEGORIES.some(c=>c.id===cat&&c.topics.includes(topic))){explorationUi.selected=cat;explorationUi.topic=topic;explorationUi.tab="field";explorationUi.modal="";location.hash="#/exploration-tree";render();window.scrollTo(0,0)}return}
    const rofTab=event.target.closest("[data-rof-v4-phase]");
    if(rofTab){
      const ui=getRofUi(),d=getRofData();
      if(gpsRofActive()&&rofTab.dataset.rofV4Phase!==ui.phase)return;
      ui.metaOpen=!!app.querySelector('.rv4-optional-meta')?.open;
      rofExperience.setRofPhase(ui,rofTab.dataset.rofV4Phase,d);
      const y=window.scrollY;render();window.scrollTo(0,y);return;
    }
    const rofAnchor=event.target.closest("[data-rof-v4-anchor]");
    if(rofAnchor){
      const ui=getRofUi(),d=getRofData();
      rofExperience.focusRofAnchor(ui,Number(rofAnchor.dataset.rofV4Anchor));
      rofExperience.reflectRofPage(app,d,ui);return;
    }
    const rofStep=event.target.closest("[data-rof-v4-step]");
    if(rofStep){
      const ui=getRofUi(),d=getRofData();
      rofExperience.adjustRofScore(ui,d,Number(rofStep.dataset.rofV4Step));
      if(gpsRofActive())syncGpsRofCapture(ui.phase);
      rofExperience.reflectRofPage(app,d,ui);return;
    }
    if(event.target.closest("[data-rof-v4-clear]")){
      const ui=getRofUi(),d=getRofData();
      rofExperience.clearRofScore(ui,d);
      if(gpsRofActive())syncGpsRofCapture(ui.phase);
      rofExperience.reflectRofPage(app,d,ui);return;
    }
    const rofClear=event.target.closest("[data-rof-clear]");
    if(rofClear){const y=window.scrollY;rofExperience.recordRofInput(state.recordDraft,rofClear.dataset.rofClear==='rofBefore'?'before':'after',null);render();window.scrollTo(0,y);return}
    const feeling=event.target.closest("[data-feeling]");
    if(feeling){const y=window.scrollY;state.feeling=feeling.dataset.feeling;render();window.scrollTo(0,y);return}
    const type=event.target.closest("[data-record-type]");
    if(type){const y=window.scrollY;state.recordType=type.dataset.recordType;render();window.scrollTo(0,y);return}
    const day=event.target.closest("[data-history-day]");
    if(day){const y=window.scrollY;const n=Number(day.dataset.historyDay);state.historyDate=state.historyDate===n?null:n;render();window.scrollTo(0,y);return}
    if(event.target.closest("[data-history-clear]")){const y=window.scrollY;state.historyDate=null;render();window.scrollTo(0,y);return}
    const filter=event.target.closest("[data-history-mode]");
    if(filter){const y=window.scrollY;state.historyMode=filter.dataset.historyMode;render();window.scrollTo(0,y);return}
    if(event.target.closest("[data-demo-save]")){
      state.recordReviewSource="manual";
      state.recordReviewReturn=false;manualSaveNotice="";
      location.hash="#/record-review";
      render();window.scrollTo(0,0);return;
    }
    if(event.target.closest(".rr-date-edit")&&state.recordReviewSource==="gps"){
      state.recordReviewSource="manual";
      state.recordReviewReturn=false;
    }
    if(event.target.closest("[data-review-link]")){
      if(state.recordReviewSource==="gps")state.recordReviewSource="manual";
      state.recordReviewReturn=true;
    }
    if(event.target.closest(".rv-link"))state.recordReviewReturn=false;
    if(event.target.matches(".record-preview-overlay")||event.target.closest(".record-preview-dialog button[data-close-preview]")){state.recordPreviewOpen=false;render();return}
  });
  // Keep focus and Escape handling inside the top-level legal dialog.
  document.addEventListener("click",event=>{
    if(event.target.closest("body > .fu-doc-backdrop [data-legal-dismiss]"))dismissLegalDialog();
  });
  document.addEventListener("keydown",event=>{
    const dialog=document.body.querySelector(':scope > .fu-doc-backdrop .fu-doc-dialog');
    if(!dialog)return;
    if(event.key==="Escape"){event.preventDefault();dismissLegalDialog();return;}
    if(event.key!=="Tab")return;
    const controls=[...dialog.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(el=>el.getClientRects().length>0);
    if(!controls.length)return;
    const first=controls[0],last=controls.at(-1),inside=dialog.contains(document.activeElement);
    if(event.shiftKey&&(!inside||document.activeElement===first)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(!inside||document.activeElement===last)){event.preventDefault();first.focus();}
  });
  app.addEventListener("keydown",(event)=>{
    if(gpsConsentAction){
      if(event.key==="Escape"){event.preventDefault();const pending=gpsConsentAction;gpsConsentAction="";render();app.querySelector(pending==='resume'?'[data-gps-action="resume"]':'[data-gps-action="start"]')?.focus();return;}
      if(event.key==="Tab"){
        const dialog=app.querySelector('.gps-consent-dialog');
        const controls=[...dialog?.querySelectorAll('button:not([disabled])')||[]];
        if(controls.length){
          const first=controls[0],last=controls.at(-1);
          if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();return;}
          if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();return;}
        }
      }
    }
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-region-focus]")){
      event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}));return;
    }
    const explorationDialog=app.querySelector('.ex-dialog');
    if(explorationUi.modal&&explorationDialog){
      if(event.key==="Escape"){event.preventDefault();if(explorationUi.modal==="delete-note"){const id=explorationUi.deletingNoteId;explorationUi.deletingNoteId=null;explorationUi.modal="memories";render();[...app.querySelectorAll('[data-ex-delete]')].find(el=>el.dataset.exDelete===id)?.focus({preventScroll:true});}else{explorationUi.modal="";render();restoreExplorationFocus();}return;}
      if(event.key==="Tab"){
        const items=[...explorationDialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
          .filter(el=>el.getClientRects().length>0);
        if(items.length){
          const first=items[0],last=items.at(-1),inside=explorationDialog.contains(document.activeElement);
          if(event.shiftKey&&(!inside||document.activeElement===first)){event.preventDefault();last.focus();return;}
          if(!event.shiftKey&&(!inside||document.activeElement===last)){event.preventDefault();first.focus();return;}
        }
      }
    }
    const homeDetail=app.querySelector(".hx-condition-dialog,.hx-ach-dialog");
    if(homeDetail&&(homeUi.conditionOpen||homeUi.achievementOpen)){
      if(event.key==="Escape"){
        event.preventDefault();
        const trigger=homeUi.conditionOpen?"[data-condition-open]":"[data-achievement-open]";
        homeUi.conditionOpen=false;homeUi.achievementOpen=false;homeUi.deletePendingDate=null;
        render();app.querySelector(trigger)?.focus({preventScroll:true});return;
      }
      if(event.key==="Tab"){
        const controls=[...homeDetail.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')]
          .filter(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=="hidden");
        if(controls.length){
          const first=controls[0],last=controls.at(-1),inside=homeDetail.contains(document.activeElement);
          if(event.shiftKey&&(!inside||document.activeElement===first)){event.preventDefault();last.focus();return;}
          if(!event.shiftKey&&(!inside||document.activeElement===last)){event.preventDefault();first.focus();return;}
        }
      }
    }
  });
  const pauseGpsOnHidden=()=>{
    if(gpsController?.state.phase==='running'){
      gpsController.pause();
      gpsController.state.notice='画面の非表示・ロックを検知したためGPS測定を一時停止しました。再開には位置情報の使用確認が必要です。';
      refreshGpsTicker();
      measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gpsController.state,gpsController.elapsed());
    }
    releaseGpsWakeLock();
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGpsOnHidden();});
  window.addEventListener('pagehide',pauseGpsOnHidden);
  window.addEventListener("focus",async()=>{await canonical.refresh();gpsV2Cache=await gpsV2.readGpsV2Summaries();render();});
  document.addEventListener("visibilitychange",async()=>{if(!document.hidden){await canonical.refresh();render();}});
  window.addEventListener("hashchange",async()=>{
    dismissLegalDialog();
    // P8: even outside inquiry panels, the old exploration view can hold
    // record-linked note previews and identifying context. Seal the ENTIRE
    // outgoing exploration view synchronously before any awaited refresh.
    const outgoingExploration=app.querySelector('.ex-page');
    if(outgoingExploration){
      outgoingExploration.hidden=true;
      outgoingExploration.style.setProperty('display','none','important');
      // Only show a neutral transient status when staying within Inquiry.
      // Leaving for Learning does not switch a record and must not flash a
      // misleading amber warning. The privacy seal above remains immediate.
      if(currentPage()==='exploration-tree'){
        const pending=document.createElement('p');
        pending.className='ex-route-pending';
        pending.setAttribute('role','status');
        pending.textContent='表示を更新しています…';
        outgoingExploration.before(pending);
      }
    }
    // I3 / P8: immediately seal previously revealed private data before
    // async record refresh. Never reuse a previous RecordRef's disclosure.
    // DOM-only: no stored values are read, written or cleared.
    app.querySelectorAll([
      '[data-e-mental-inquiry]',
      '[data-e-body-inquiry]',
      '[data-e-condition-inquiry]',
      '[data-e-life-inquiry]',
      '[data-e-inquiry="T02"]',
      '[data-e-inquiry="T08"]'
    ].join(',')).forEach(panel=>{
      panel.hidden=true;
      panel.style.setProperty('display','none','important');
      panel.dataset.eState='ROUTE_CHANGING';
    });
    await canonical.refresh();
    if(currentPage()!=="home")homeUi.guideOpen=false;
    gpsConsentAction="";
    if(currentPage()!=='measurement'&&gpsController?.state.phase==='running'){gpsController.pause();refreshGpsTicker();releaseGpsWakeLock();}
    // GPS saves and deletes show toast; do not immediately erase them on navigation.
    const retainedToast=state.toast;render();state.toast='';if(location.hash.includes("life=1"))app.querySelector("#interpret-life")?.scrollIntoView({block:"start",behavior:"instant"});else window.scrollTo(0,0)});
  render();
  window.runloadBoot?.ready();
})().catch(error=>{
  console.error('アプリの起動処理で問題が発生しました',error);
  window.runloadBoot?.fail();
});