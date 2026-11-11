/**
 * M1: read-only record identity across independently stored sources.
 * This module never creates, modifies, deletes or silently substitutes a run.
 * The legacy exploration note store is deliberately not migrated here.
 */
const ID_PATTERNS=Object.freeze({
 MANUAL:/^run-v1-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
 GPS_V2:/^gps-v2-[0-9a-z-]{8,64}$/
});
const URL_SOURCES=Object.freeze({MANUAL:'manual',GPS_V2:'gps-v2'});
const URL_ROUTES=Object.freeze({result:'/result',history:'/history',exploration:'/exploration-tree'});
const failure=(code,reason)=>({ok:false,code,reason});
const success=value=>({ok:true,value});
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const sourceOfId=id=>Object.keys(ID_PATTERNS).find(source=>ID_PATTERNS[source].test(id))||null;

/** Ref values are transport-safe strings and have exactly two members. */
export function normalizeRecordRef(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
   Object.keys(input).length!==2||!own(input,'sourceType')||!own(input,'recordId'))
  return failure('BAD_REF','記録参照の構造が正しくありません');
 const {sourceType,recordId}=input;
 if(typeof sourceType!=='string'||!own(ID_PATTERNS,sourceType)||typeof recordId!=='string')
  return failure('BAD_REF','記録の種類またはIDが正しくありません');
 if(!ID_PATTERNS[sourceType].test(recordId))
  return failure(sourceOfId(recordId)?'SOURCE_MISMATCH':'BAD_REF','記録の種類とIDが一致しません');
 return success(Object.freeze({sourceType,recordId}));
}

/** Read old explicit links without converting a GPS identity to a manual run. */
export function parseLegacyOrTypedLink(hash,context){
 if(!own(URL_ROUTES,context)||typeof hash!=='string'||!hash.startsWith('#/'))
  return failure('BAD_REF','記録画面のリンクが正しくありません');
 const question=hash.indexOf('?');
 const route=question<0?hash.slice(1):hash.slice(1,question);
 if(route!==URL_ROUTES[context])return failure('BAD_REF','記録画面のリンク先が一致しません');
 if(question<0)return success(null);
 const raw=hash.slice(question+1);
 if(/%(?![0-9a-f]{2})/i.test(raw)||raw.includes('#'))
  return failure('BAD_REF','記録リンクの文字列が正しくありません');
 const params=new URLSearchParams(raw);
 for(const key of ['source','record','gps']){
  if(params.getAll(key).length>1)return failure('BAD_REF','記録リンクに重複した指定があります');
 }
 const has=key=>params.has(key);
 if(has('gps')){
  if(context!=='result'||has('source')||has('record'))
   return failure('BAD_REF','GPS記録のリンク指定が競合しています');
  return normalizeRecordRef({sourceType:'GPS_V2',recordId:params.get('gps')});
 }
 if(!has('source')&&!has('record'))return success(null);
 if(has('source')&&!has('record'))return failure('BAD_REF','記録IDが指定されていません');
 const declared=params.get('source');
 const sourceType=has('source')?Object.keys(URL_SOURCES).find(key=>URL_SOURCES[key]===declared):'MANUAL';
 if(!sourceType)return failure('BAD_REF','未知の記録種別です');
 return normalizeRecordRef({sourceType,recordId:params.get('record')});
}

export function encodeTypedRecordQuery(input){
 const normalized=normalizeRecordRef(input);
 if(!normalized.ok)throw new TypeError(normalized.reason);
 const {sourceType,recordId}=normalized.value;
 return 'source='+URL_SOURCES[sourceType]+'&record='+encodeURIComponent(recordId);
}

/**
 * The optional readers parameter is only a dependency-injection seam for tests.
 * In the app, it loads the existing strict source readers and their validators.
 */
async function loadReaders(sourceType){
 if(sourceType==='MANUAL'){
  // The active manual-run authority is IndexedDB, not historic localStorage.
  // readCanonical validates the entire versioned envelope on each read.
  const canonical=await import('./manualRunCanonical.js');
  return {readManualRuns:async()=>{const outcome=await canonical.readCanonical();return outcome.ok?outcome.read:outcome;}};
 }
 const m=await import('./gpsReplayIndexedDbStore.js');
 return {readGpsV2Summaries:m.readGpsV2Summaries,validGpsV2Summary:m.validGpsV2Summary};
}

/** Fail closed on deleted, malformed, uninitialized and unreadable parents. */
export async function resolveRecord(input,{storage,gpsV2,manual}={}){
 const normalized=normalizeRecordRef(input);
 if(!normalized.ok)return normalized;
 const {sourceType,recordId}=normalized.value;
 let reader;
 try{
  reader=sourceType==='MANUAL'?manual:gpsV2;
  if(!reader)reader=await loadReaders(sourceType);
  let listing,validator,sourceKind;
  if(sourceType==='MANUAL'){
   if(typeof reader.readManualRuns!=='function')throw Error('manual reader missing');
   listing=await reader.readManualRuns(storage);
   validator=r=>r?.id===recordId&&r.schema===2&&r.source==='manual'&&r.type==='run'&&
    Number.isFinite(r.distanceKm)&&r.distanceKm>0&&
    Number.isInteger(r.durationSeconds)&&r.durationSeconds>0;
   sourceKind='SAVED_MANUAL';
  }else{
   if(typeof reader.readGpsV2Summaries!=='function'||typeof reader.validGpsV2Summary!=='function')
    throw Error('GPS v2 reader missing');
   listing=await reader.readGpsV2Summaries();
   validator=reader.validGpsV2Summary;
   sourceKind='GPS_DEVICE';
  }
  if(listing?.ok!==true||!Array.isArray(listing.records))
   return failure('UNREADABLE_PARENT','保存元を安全に読み取れません。記録は変更していません');
  const matches=listing.records.filter(record=>record?.id===recordId);
  if(!matches.length)return failure('NOT_FOUND','指定された保存済み記録が見つかりません');
  if(matches.length!==1||!validator(matches[0]))
   return failure('UNREADABLE_PARENT','保存元の記録を検証できません');
  return success({ref:normalized.value,record:matches[0],sourceKind});
 }catch{
  return failure('UNREADABLE_PARENT','保存元を安全に読み取れません。記録は変更していません');
 }
}
