/** Current portable backup: combine validated local/GPS records and optional annotations.
 * Restore parent records before importing their dependent annotations.
 */
import * as base from './dataManagement.js';
import {MANUAL_RUN_KEY,readManualRuns} from './manualRunStore.js';
import * as gps2 from './gpsReplayIndexedDbStore.js';
import {normalizeRecordRef,resolveRecord} from './recordRef.js';
import {inspectAnnotationBundleShape,inspectAnnotationBundle,exportAnnotationBundle,
 preflightAnnotationImport,importAnnotationBundle,clearAnnotationStore} from './annotationBackup.js';
export {DATA_KEYS,RESET_KEYS,RECORD_KEYS,OPTION_KEYS,PORTABLE_FORMAT,PORTABLE_MAX_BYTES,portableUtf8Bytes,
 inspectLocalStorage,BACKUP_NOTICE} from './dataManagement.js';
export const PORTABLE_VERSION=2;
const fail=(reason,code='BAD_BACKUP')=>({ok:false,code,reason});
const strict=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
function parseEnvelope(text){
 if(typeof text!=='string'||base.portableUtf8Bytes(text)>base.PORTABLE_MAX_BYTES)return fail('80MB以内のJSONを選択してください');
 let envelope;try{envelope=JSON.parse(text);}catch{return fail('JSONファイルを読み取れません');}
 if(!envelope||envelope.format!==base.PORTABLE_FORMAT)return fail('バックアップの形式が不正です');
 if(envelope.version!==2||!strict(envelope,['format','version','exportedAt','local','gps','annotations']))
  return fail('バックアップの構造が正しくありません');
 const checked=inspectAnnotationBundleShape(envelope.annotations);
 if(!checked.ok)return fail('追記データの形式が不正です：'+checked.reason,checked.code);
 const baseEnvelope={format:envelope.format,version:base.PORTABLE_VERSION,exportedAt:envelope.exportedAt,
  local:envelope.local,gps:envelope.gps};
 const baseText=JSON.stringify(baseEnvelope),baseInspection=base.inspectPortableBackup(baseText);
 if(!baseInspection.ok)return baseInspection;
 return {ok:true,baseText,baseInspection,annotations:envelope.annotations};
}
export function inspectPortableBackup(text){
 const parsed=parseEnvelope(text);if(!parsed.ok)return parsed;
 return {...parsed.baseInspection,annotationCount:parsed.annotations.events.length,
  data:{...parsed.baseInspection.data,annotations:parsed.annotations,version:PORTABLE_VERSION}};
}
export async function exportPortableBackup(storage,{includeGps=false}={}){
 const previous=await base.exportPortableBackup(storage,{includeGps});if(!previous.ok)return previous;
 const annotations=await exportAnnotationBundle({includeGps,resolveParent:resolveRecord});
 if(!annotations.ok)return fail('追記をバックアップに含められません：'+annotations.reason,annotations.code);
 // Reinspect after the cross-store reads: never quietly combine stale manual data.
 const checked=base.inspectLocalStorage(storage);
 if(!checked.ok)return checked;
 const previousJSON=JSON.parse(previous.text);
 if(base.DATA_KEYS.some(k=>checked.local[k]!==previousJSON.local[k]))
  return fail('バックアップ中に保存記録が変更されました。別の画面を閉じて再試行してください','HEAD_CONFLICT');
 const output={...previousJSON,version:2,annotations:annotations.value.bundle};
 const text=JSON.stringify(output);
 if(base.portableUtf8Bytes(text)>base.PORTABLE_MAX_BYTES)return fail('追記を含むバックアップが80MBを超えました','QUOTA');
 const preview=inspectPortableBackup(text);if(!preview.ok)return preview;
 return {...previous,text,annotationCount:annotations.value.bundle.events.length,
  excludedGpsAnnotationCount:annotations.value.excludedGpsEvents,version:2};
}
const storeWith=(raw)=>({getItem:k=>k===MANUAL_RUN_KEY?raw:null,setItem(){},removeItem(){}});
/** Reconstruct the *future* parent list without writing any storage in preflight. */
function parentResolver(plan){
 const incoming=plan.parsed.data;
 const futureRaw=plan.writes[MANUAL_RUN_KEY]??plan.old[MANUAL_RUN_KEY]??null;
 const manuals=readManualRuns(storeWith(futureRaw));
 if(!manuals.ok)return ()=>fail('手入力の保存正本を照合できません','UNREADABLE_PARENT');
 return async ref=>{
  const n=normalizeRecordRef(ref);if(!n.ok)return n;
  let rows=[];
  if(n.value.sourceType==='MANUAL')rows=manuals.records;
  else if(n.value.sourceType==='GPS_V2'){
   const current=await gps2.readGpsV2Summaries();
   if(!current.ok&&incoming.gps===null)return fail('GPS記録を読み取れません','UNREADABLE_PARENT');
   rows=[...(current.ok?current.records:[]),...(incoming.gps?.summaries||[])];
  }else return fail('記録の種類が不正です','BAD_REF');
  const matched=rows.filter(x=>x?.id===n.value.recordId);
  if(!matched.length)return fail('親記録が見つかりません','NOT_FOUND');
  if(matched.length>1&&!matched.every(x=>JSON.stringify(x)===JSON.stringify(matched[0])))
   return fail('同一IDの親記録が衝突しています','SOURCE_MISMATCH');
  const record=matched[0];
  if(n.value.sourceType==='MANUAL'&&(record.schema!==2||record.source!=='manual')||
   n.value.sourceType==='GPS_V2'&&!gps2.validGpsV2Summary(record))
   return fail('親記録の形式が正しくありません','UNREADABLE_PARENT');
  return {ok:true,value:{ref:n.value,record,sourceKind:n.value.sourceType}};
 };
}
export async function preflightPortableRestore(storage,text){
 const parsed=parseEnvelope(text);if(!parsed.ok)return parsed;
 const plan=await base.preflightPortableRestore(storage,parsed.baseText);if(!plan.ok)return plan;
 const check=await inspectAnnotationBundle(parsed.annotations);if(!check.ok)return check;
 const source=parentResolver(plan);
 const ann=await preflightAnnotationImport(parsed.annotations,{resolveParent:source});
 if(!ann.ok)return ann;
 return {...plan,annotationCount:parsed.annotations.events.length,annotationAdditions:ann.value.added,
  hasExisting:plan.hasExisting||ann.value.existingEvents>0,
  parsed:{...plan.parsed,annotationCount:parsed.annotations.events.length}};
}

/** Optional quarantine is an export-only read-only artifact, never an import. */
export async function isolateOrphanBackup(storage,text,{consent=false}={}){
 if(consent!==true)return fail('本人が隔離ファイルの作成を明示的に選択してください','CONSENT_REQUIRED');
 const parsed=parseEnvelope(text);if(!parsed.ok)return parsed;
 const plan=await base.preflightPortableRestore(storage,parsed.baseText);if(!plan.ok)return plan;
 const checked=await inspectAnnotationBundle(parsed.annotations);if(!checked.ok)return checked;
 const resolveParent=parentResolver(plan);
 const refs=new Map(parsed.annotations.events.map(e=>[e.recordKey,e.recordRef]));
 const missing=[];
 for(const [key,ref] of refs){
  let p;try{p=await resolveParent(ref);}catch{return fail('親を照合できません','UNREADABLE_PARENT');}
  if(p?.ok)continue;
  if(p?.code==='NOT_FOUND')missing.push(key);
  else return fail('親の状態が不明なため隔離できません','UNREADABLE_PARENT');
 }
 if(!missing.length)return fail('親のない注記はありません','NO_ORPHANS');
 const keys=new Set(missing);
 const isolated={format:'orphan-annotations-inspection-only',version:1,
  exportedAt:new Date().toISOString(),notice:'復元できない読み取り専用の隔離ファイル。個人情報を含む未暗号化JSONです。',
  orphanRecordKeys:missing,
  events:parsed.annotations.events.filter(e=>keys.has(e.recordKey)),
  heads:parsed.annotations.heads.filter(h=>missing.some(k=>h.streamKey.startsWith(k+'|')))};
 const isolatedText=JSON.stringify(isolated);
 if(base.portableUtf8Bytes(isolatedText)>base.PORTABLE_MAX_BYTES)return fail('隔離データの容量上限です','QUOTA');
 return {ok:true,isolatedText,count:missing.length,eventCount:isolated.events.length,writeCount:0,restorable:false};
}
/** FIRST: commit local (including canonical manual) and GPS using the existing adapter.
 * The caller must await canonical.portableMutation before calling annotations.
 */
export async function restorePortableBase(storage,text){
 const prepared=await preflightPortableRestore(storage,text);if(!prepared.ok)return prepared;
 const parsed=parseEnvelope(text);if(!parsed.ok)return parsed;
 return base.restorePortableBackup(storage,parsed.baseText);
}
/** SECOND: only after a successful canonical/manual commit, import annotations. */
export async function restorePortableAnnotations(text,previous){
 if(previous?.ok!==true)return previous||fail('先行する走行記録の復元が完了していません');
 const parsed=parseEnvelope(text);if(!parsed.ok)return parsed;
 const check=await inspectAnnotationBundle(parsed.annotations);if(!check.ok)return check;
 const imported=await importAnnotationBundle(parsed.annotations,{resolveParent:resolveRecord});
 if(!imported.ok)return {ok:false,partial:true,code:imported.code,
  reason:'走行・GPS・設定の復元は一部完了しましたが、補助回答を復元できません。再度バックアップを検査して再試行してください：'+imported.reason};
 return {...previous,annotationsAdded:imported.value.added,annotationRestored:true};
}
/** FIRST: delete the original stores and finish canonical mutation. */
export const removeAllPortableBase=base.removeAllPortableData;
/** SECOND: only after base commit, clear annotations in their own atomic transaction. */
export async function removeAllPortableAnnotations(previous){
 if(previous?.ok!==true)return previous||fail('本体データの削除が完了していません');
 const cleared=await clearAnnotationStore();
 if(!cleared.ok)return {ok:false,partial:true,code:cleared.code,reason:'本体の削除後、補助回答の削除を確認できません：'+cleared.reason};
 return previous;
}
