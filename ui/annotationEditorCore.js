/** M5 — presentation-only post-hoc editor model, not a scientific recalculation. */
export const EDIT_FIELDS=Object.freeze([
 ['mentalExperience','気持ち・考える面の疲れ'],['bodyObservation','身体の自覚情報'],
 ['shoeName','シューズ'],['memo','走行時のメモ'],['environmentNote','環境メモ'],
 ['courseName','コース名'],['temperatureC','気温（℃）'],['stepsBundle','歩数・取得方法'],
 ['gradeBundle','坂道・傾斜'],['surfaceBundle','路面の割合'],['runWalkBundle','走行と歩行'],
 ['rofBefore','運動前のROF-J'],['rofAfter','運動後のROF-J']
]);
export const POST_HOC_FIELDS=EDIT_FIELDS.map(x=>x[0]);
export const SURFACES=Object.freeze({paved:'舗装路',track:'陸上トラック',treadmill:'トレッドミル',soil:'締まった土道',trail:'不整地トレイル',naturalGrass:'天然芝',artificialTurf:'人工芝',sand:'砂地'});
export const MENTAL=Object.freeze({FELT:'感じた',NOT_FELT:'感じなかった',UNSURE:'よく分からない'});
export const GRADE=Object.freeze({UNKNOWN:'不明',FLAT:'ほぼ平坦',SUMMARY:'上り・下りの割合',SECTIONS:'区間ごとの割合'});
export const SURFACE_MODE=Object.freeze({UNKNOWN:'不明',SINGLE:'単一路面',MIXED:'複数路面の割合'});
export const FORMAT=Object.freeze({UNKNOWN:'不明',CONTINUOUS_RUN:'連続した走行',RUN_WALK:'走行と歩行の組み合わせ'});
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fail=reason=>({ok:false,reason});
const ok=payload=>({ok:true,payload});
const number=(value,min,max,integer=false)=>{
 const raw=String(value??'').trim();if(!raw)return null;
 const n=Number(raw);return Number.isFinite(n)&&n>=min&&n<=max&&(!integer||Number.isSafeInteger(n))?n:null;
};
const f=(data,k)=>data?.[k]??'';
const fraction=(data,k)=>number(f(data,k),0,100);
const dateTime=(input)=>typeof input==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input)&&!Number.isNaN(Date.parse(input));
/** Plain HTML form input to a typed payload. Do not insert into the source record. */
export function parsePostHocPayload(field,data,parent){
 if(!POST_HOC_FIELDS.includes(field))return fail('未定義の補完項目です');
 if(field==='mentalExperience'){
  const answer=f(data,'answer'),freeText=String(f(data,'freeText'));
  if(!Object.hasOwn(MENTAL,answer)||freeText.length>500)return fail('精神面の回答を3択から選んでください');
  return ok({answer,...(freeText?{freeText}:{})});
 }
 if(['bodyObservation','shoeName','memo','environmentNote','courseName'].includes(field)){
  const text=String(f(data,'text')),limit=field==='shoeName'||field==='courseName'?100:500;
  return text.trim().length>0&&text.length<=limit?ok({text}):fail('内容を1〜'+limit+'字で入力してください');
 }
 if(field==='temperatureC'){
  const celsius=number(f(data,'celsius'),-50,60);return celsius!==null?ok({celsius}):fail('気温は−50〜60℃の数値で入力してください');
 }
 if(field==='rofBefore'||field==='rofAfter'){
  const score=number(f(data,'score'),0,10,true);return score!==null?ok({score}):fail('ROF-Jは0〜10の整数で入力してください');
 }
 if(field==='stepsBundle'){
  const steps=number(f(data,'steps'),0,10000000,true),stepsProvenance=f(data,'stepsProvenance');
  return steps!==null&&['UNKNOWN','DEVICE_MEASURED','ESTIMATED'].includes(stepsProvenance)?ok({steps,stepsProvenance}):fail('歩数は0以上の整数、取得方法も選択してください');
 }
 if(field==='gradeBundle'){
  const gradeMode=f(data,'gradeMode');
  if(['UNKNOWN','FLAT'].includes(gradeMode))return ok({gradeMode});
  if(gradeMode==='SUMMARY'){
   const upPercent=fraction(data,'upPercent'),downPercent=fraction(data,'downPercent');
   if(upPercent===null||downPercent===null||upPercent+downPercent>100.001)return fail('上り・下りの割合は0〜100%、合計100%以下です');
   const payload={gradeMode,upPercent,downPercent};
   for(const k of ['upGradePercent','downGradePercent'])if(String(f(data,k)).trim()!==''){
    const v=fraction(data,k);if(v===null)return fail('傾斜は0〜100%で入力してください');payload[k]=v;
   }
   return ok(payload);
  }
  if(gradeMode==='SECTIONS'){
   const count=number(f(data,'sectionCount'),1,5,true);if(count===null)return fail('区間は1〜5個です');
   const sections=[];
   for(let i=0;i<count;i++){
    const sharePercent=fraction(data,'share'+i),direction=f(data,'direction'+i);
    if(sharePercent===null||!['UNKNOWN','FLAT','UPHILL','DOWNHILL'].includes(direction))return fail('区間ごとに割合と坂の向きを選択してください');
    const row={sharePercent,direction};
    if(String(f(data,'grade'+i)).trim()!==''){
     const gradePercent=fraction(data,'grade'+i);if(gradePercent===null)return fail('区間の傾斜は0〜100%で入力してください');row.gradePercent=gradePercent;
    }
    const surface=f(data,'surface'+i);if(surface){if(surface!=='UNKNOWN'&&!Object.hasOwn(SURFACES,surface))return fail('区間の路面指定が不正です');row.surface=surface;}
    sections.push(row);
   }
   if(Math.abs(sections.reduce((n,r)=>n+r.sharePercent,0)-100)>0.01)return fail('区間割合の合計は100%です');
   return ok({gradeMode,sections});
  }
  return fail('坂道の入力方式を選択してください');
 }
 if(field==='surfaceBundle'){
  const surfaceMode=f(data,'surfaceMode');
  if(surfaceMode==='UNKNOWN')return ok({surfaceMode});
  if(surfaceMode==='SINGLE')return Object.hasOwn(SURFACES,f(data,'primarySurface'))?ok({surfaceMode,primarySurface:f(data,'primarySurface')}):fail('路面を1つ選んでください');
  if(surfaceMode==='MIXED'){
   const shares={};for(const key of Object.keys(SURFACES)){
    const raw=String(f(data,'surf_'+key)).trim();if(!raw)continue;
    const v=number(raw,0,100);if(v===null)return fail('路面割合は0〜100%の数値です');if(v>0)shares[key]=v;
   }
   const vals=Object.values(shares);
   if(vals.length<2||Math.abs(vals.reduce((a,b)=>a+b,0)-100)>0.01)return fail('複数路面は2種類以上、割合合計100%です');
   return ok({surfaceMode,shares});
  }
  return fail('路面の入力方式を選択してください');
 }
 if(field==='runWalkBundle'){
  const runningFormat=f(data,'runningFormat');
  if(['UNKNOWN','CONTINUOUS_RUN'].includes(runningFormat))return ok({runningFormat});
  if(runningFormat!=='RUN_WALK')return fail('走り方を選んでください');
  const runWalkRunningDistanceKm=number(f(data,'runWalkRunningDistanceKm'),.01,10000),runWalkRunningDurationMinutes=number(f(data,'runWalkRunningDurationMinutes'),.01,100000);
  const totalDist=parent?.distanceKm,totalTime=parent?.durationSeconds??parent?.activeSeconds;
  if(runWalkRunningDistanceKm===null||runWalkRunningDurationMinutes===null||!Number.isFinite(totalDist)||!Number.isFinite(totalTime)||!(runWalkRunningDistanceKm<totalDist-1e-9)||!(runWalkRunningDurationMinutes*60<totalTime-1e-6))
   return fail('走った区間は元の総距離・総時間より短い値を入力してください');
  return ok({runningFormat,runWalkRunningDistanceKm,runWalkRunningDurationMinutes});
 }
 return fail('この項目を補完できません');
}
/** Original is immutable. Never interpret absent GPS input as a negative answer. */
export function originalFieldValue(ref,parent,field){
 if(!parent)return '元記録を読み取れません';
 const gps=ref.sourceType!=='MANUAL';const draft=ref.sourceType==='MANUAL'?(parent.draft||{}):{};
 if(field==='mentalExperience')return '元の走行記録には独立した精神面の設問なし';
 const gpsv2=ref.sourceType==='GPS_V2';const e=gpsv2?parent.experience:null;
 if(['rofBefore','rofAfter'].includes(field)){
  const x=gpsv2?e?.[field]:parent[field];return x===null||x===undefined?'未回答':String(x)+' / 10（本人申告）';
 }
 if(field==='memo'){
  const x=gpsv2?e?.memo:draft.memo;return x?'記録時：'+String(x):'記録時の申告なし';
 }
 if(gps)return 'GPSで取得・保存した値にはこの申告欄がありません';
 if(field==='stepsBundle')return draft.steps===''||draft.steps==null?'記録時は未入力':'記録時：'+draft.steps+'歩（'+(draft.stepsProvenance||'出所不明')+'）';
 if(field==='gradeBundle'){
  const mode=draft.gradeMode||'UNKNOWN',fmt=k=>draft[k]!==''&&draft[k]!=null?String(draft[k])+'%':'未入力';
  if(mode==='SUMMARY')return '記録時：坂あり／上り'+fmt('upPercent')+'・下り'+fmt('downPercent')+'／上り傾斜'+fmt('upGradePercent')+'・下り傾斜'+fmt('downGradePercent');
  if(mode==='SECTIONS'){
   const rows=Array.from({length:5},(_,i)=>({share:draft['sectionShare'+i],direction:draft['sectionDirection'+i],grade:draft['sectionGrade'+i]})).filter(r=>r.share!==''&&r.share!=null);
   return '記録時：区間別／'+(rows.length?rows.map((r,i)=>'区間'+(i+1)+' '+r.share+'%・'+(r.direction||'不明')+(r.grade!==''&&r.grade!=null?'・傾斜'+r.grade+'%':'')).join('／'):'区間の数値は未入力');
  }
  return '記録時：'+(GRADE[mode]||'不明');
 }
 if(field==='surfaceBundle'){
  const mode=draft.surfaceMode||'UNKNOWN';
  if(mode==='SINGLE')return '記録時：単一路面／'+(SURFACES[draft.primarySurface]||'種類は未入力');
  if(mode==='MIXED'){
   const shares=Object.entries(SURFACES).filter(([k])=>draft['surface'+k]!==''&&draft['surface'+k]!=null);
   return '記録時：複数路面／'+(shares.length?shares.map(([k,label])=>label+' '+draft['surface'+k]+'%').join('・'):'割合は未入力');
  }
  return '記録時：'+(SURFACE_MODE[mode]||'不明');
 }
 if(field==='runWalkBundle'){
  const mode=draft.runningFormat||'UNKNOWN';
  if(mode==='RUN_WALK')return '記録時：走行と歩行の組み合わせ／走った区間 '+(draft.runWalkRunningDistanceKm!==''&&draft.runWalkRunningDistanceKm!=null?draft.runWalkRunningDistanceKm+'km':'距離未入力')+'・'+(draft.runWalkRunningDurationMinutes!==''&&draft.runWalkRunningDurationMinutes!=null?draft.runWalkRunningDurationMinutes+'分':'時間未入力');
  return '記録時：'+(FORMAT[mode]||'不明');
 }
 if(field==='temperatureC')return draft.temperatureC===''||draft.temperatureC==null?'記録時は未入力':String(draft.temperatureC)+' ℃（本人入力）';
 const text=String(draft[field]??'');return text.trim()?'記録時：'+text:'記録時は未入力';
}
export function postHocValue(field,payload){
 if(!payload)return '回答なし';
 if(field==='mentalExperience')return MENTAL[payload.answer]||'形式未確認';
 if('text' in payload)return payload.text;
 if(field==='rofBefore'||field==='rofAfter')return payload.score+' / 10';
 if(field==='temperatureC')return payload.celsius+' ℃';
 if(field==='stepsBundle')return payload.steps+'歩（'+payload.stepsProvenance+'）';
 if(field==='gradeBundle')return GRADE[payload.gradeMode]+(payload.gradeMode==='SUMMARY'?`／上り${payload.upPercent}%・下り${payload.downPercent}%`:payload.gradeMode==='SECTIONS'?`／${payload.sections.length}区間`:'');
 if(field==='surfaceBundle')return SURFACE_MODE[payload.surfaceMode]+(payload.surfaceMode==='SINGLE'?`／${SURFACES[payload.primarySurface]}`:payload.surfaceMode==='MIXED'?`／${Object.entries(payload.shares).map(([k,v])=>SURFACES[k]+v+'%').join('・')}`:'');
 if(field==='runWalkBundle')return FORMAT[payload.runningFormat]+(payload.runningFormat==='RUN_WALK'?`／走行${payload.runWalkRunningDistanceKm}km・${payload.runWalkRunningDurationMinutes}分`:'');
 return '本人の後日申告';
}
export function operationForStatus(status,action){
 if(action==='RETRACT')return status==='ACTIVE'?'RETRACT':null;
 return status==='ACTIVE'?'CORRECT':status==='NO_ANSWER'||status==='RETRACTED'?'ADD':null;
}
export function makePostHocRequest(ref,field,action,status,payload,{now=()=>new Date().toISOString(),uuid=()=>globalThis.crypto?.randomUUID?.(),declaredPhase='UNSPECIFIED',timeBasis='RECALLED',latest=null}={}){
 const operation=operationForStatus(status,action);
 if(!operation)return fail('現在の状態ではこの操作を実行できません。保存状態を再読込してください');
 const eventId='posthoc_evt_'+uuid(),clientRequestId='posthoc_req_'+uuid(),enteredAt=now();
 if(!/^posthoc_(evt|req)_[0-9a-f-]{36}$/i.test(eventId)||!/^posthoc_(evt|req)_[0-9a-f-]{36}$/i.test(clientRequestId)||!dateTime(enteredAt)||!['BEFORE','DURING','AFTER','UNSPECIFIED'].includes(declaredPhase)||!['UNKNOWN','AT_ENTRY','RECALLED'].includes(timeBasis))return fail('操作識別子または本人申告時点が不正です');
 const expectedRevision=latest?.sequence??0,expectedHeadEventId=latest?.eventId??null;
 if((expectedRevision===0)!==(expectedHeadEventId===null))return fail('履歴の版を確認できません');
 return {ok:true,request:{recordRef:ref,fieldKey:field,operation,payload:operation==='RETRACT'?null:payload,expectedHeadEventId,expectedRevision,clientRequestId,eventId,declaredPhase,timeBasis,assessedAt:timeBasis==='AT_ENTRY'?enteredAt:null,enteredAt}};
}
