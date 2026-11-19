/**
 * G4-C3: PURE versioned portable v3 candidate, validation and restore preflight.
 * NOT a download, UI action, IndexedDB import or restore permit. Versions 1/2
 * are dispatched unchanged to the existing inspectors. A GPS/private note
 * export additionally requires the independent explicit private-data choice.
 *
 * The private data is unencrypted; future UI must give clear privacy notice.
 * No claims about atomicity ACROSS manual/annotation/GPS databases are made.
 */
import * as portable1 from './dataManagement.js';
import * as portable2 from './portableDataV2.js';
import {inspectGpsV2Backup} from './gpsReplayIndexedDbStore.js';
import {inspectGpsPrivateBackupChoice,inspectGpsPrivateBackupSnapshot,
 GPS_PRIVATE_REFLECTION_FORMAT,GPS_PRIVATE_REFLECTION_VERSION}
 from './gpsReflectionBackupScope.js';

export const PRIVATE_PORTABLE_VERSION=3;
const keys=['annotations','exportedAt','format','gps','gpsReflections','local','version'];
const bundleKeys=['contents','events','format','version'];
const err=(code,reason)=>({ok:false,code,reason});
const exact=(v,k)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const textBytes=s=>portable1.portableUtf8Bytes(s);
const toV2=data=>({format:data.format,version:2,exportedAt:data.exportedAt,
 local:data.local,gps:data.gps,annotations:data.annotations});
const candidates=(gps)=>gps.summaries.map(x=>({sourceType:'GPS_V2',recordId:x.id}));

/** Keep V1 and V2 original data interpretation and error behavior intact. */
export function inspectAnyPortableBackup(text){
 if(typeof text!=='string'||textBytes(text)>portable1.PORTABLE_MAX_BYTES)
  return err('BAD_BACKUP','80MB以内のJSONを選択してください');
 let data;try{data=JSON.parse(text);}catch{
  return err('BAD_BACKUP','JSONファイルを読み取れません');
 }
 if(data?.format!==portable1.PORTABLE_FORMAT)return err('BAD_FORMAT','未知の形式です');
 if(data.version===1)return portable1.inspectPortableBackup(text);
 if(data.version===2)return portable2.inspectPortableBackup(text);
 if(data.version===PRIVATE_PORTABLE_VERSION)return inspectPortableV3Backup(text);
 return err('BAD_VERSION','未対応のバックアップ版です');
}

/**
 * Exactly seven v3 envelope keys. Preserve every established six-key v2
 * member as-is, then validate the separately versioned GPS private bundle.
 * This inspector does NOT grant consent to restore the private information.
 */
export function inspectPortableV3Backup(text){
 if(typeof text!=='string'||textBytes(text)>portable1.PORTABLE_MAX_BYTES)
  return err('LIMIT','80MB以内のJSONを選択してください');
 let v;try{v=JSON.parse(text);}catch{return err('BAD_BACKUP','JSONではありません');}
 if(!exact(v,keys)||v.format!==portable1.PORTABLE_FORMAT||
    v.version!==PRIVATE_PORTABLE_VERSION||v.gps===null||
    !exact(v.gpsReflections,bundleKeys)||
    v.gpsReflections.format!==GPS_PRIVATE_REFLECTION_FORMAT||
    v.gpsReflections.version!==GPS_PRIVATE_REFLECTION_VERSION)
  return err('BAD_VERSION','GPS記述の追加形式が正しくありません');
 const v2=portable2.inspectPortableBackup(JSON.stringify(toV2(v)));
 if(!v2.ok)return v2;
 // v2 -> GPS backup validation includes matching route IDs and saved details.
 const parent=inspectGpsV2Backup(JSON.stringify(v.gps));
 if(!parent.ok)return err('UNREADABLE_PARENT',parent.reason);
 const selected=inspectGpsPrivateBackupSnapshot(
  {includeGps:true,includeGpsReflections:true},
  {parents:candidates(v.gps),contents:v.gpsReflections.contents,events:v.gpsReflections.events});
 if(!selected.ok)return selected;
 // Do not quietly reorder or repair an imported backup's history.
 if(!equal(selected.bundle,v.gpsReflections))
  return err('BAD_ORDER','自由記述のバックアップを黙って修正できません');
 return {ok:true,version:PRIVATE_PORTABLE_VERSION,
  gpsCount:v.gps.summaries.length,
  privateNoteCount:v.gpsReflections.contents.length,
  privateEventCount:v.gpsReflections.events.length,
  data:v};
}

/**
 * Candidate assembly only. An exact GPS parent snapshot must be sourced from
 * one read-only G4-C2 IndexedDB transaction, never two independent GPS reads.
 * Caller must provide an explicit private opt-in, not merely includeGps.
 */
export function preparePortableV3Candidate(v2Text,atomicGpsSnapshot,choice){
 const scope=inspectGpsPrivateBackupChoice(choice);
 if(!scope.ok)return scope;
 if(!scope.value.includeGpsReflections)
  return err('CONSENT_REQUIRED','本人のGPS自由記述の書き出しには別の明示選択が必要です');
 const old=portable2.inspectPortableBackup(v2Text);
 if(!old.ok)return old;
 let v2;try{v2=JSON.parse(v2Text);}catch{return err('BAD_BACKUP','JSONではありません');}
 if(!atomicGpsSnapshot||atomicGpsSnapshot.ok!==true||
    atomicGpsSnapshot.includedGps!==true||
    atomicGpsSnapshot.includedReflections!==true||
    !atomicGpsSnapshot.gps||!atomicGpsSnapshot.reflections)
  return err('BAD_SNAPSHOT','GPSと本人の記述の同時取得を確認できません');
 if(v2.gps===null||!equal(v2.gps,atomicGpsSnapshot.gps))
  return err('HEAD_CONFLICT','GPS記録がバックアップ処理中に変更されました');
 const bundle=atomicGpsSnapshot.reflections;
 const selected=inspectGpsPrivateBackupSnapshot(scope.value,
  {parents:candidates(v2.gps),contents:bundle.contents,events:bundle.events});
 if(!selected.ok)return selected;
 if(!equal(bundle,selected.bundle))return err('BAD_ORDER','記述の並び順が一致しません');
 const next={...v2,version:PRIVATE_PORTABLE_VERSION,gpsReflections:bundle};
 const text=JSON.stringify(next);
 if(textBytes(text)>portable1.PORTABLE_MAX_BYTES)return err('LIMIT','80MBの上限です');
 const check=inspectPortableV3Backup(text);
 if(!check.ok)return check;
 return {ok:true,text,version:PRIVATE_PORTABLE_VERSION,
  gpsCount:check.gpsCount,privateNoteCount:check.privateNoteCount,
  privateEventCount:check.privateEventCount};
}

/**
 * Strict no-write preflight for a future G4-C4 single-GPS-transaction restore.
 * Existing *and* incoming GPS bundles must be complete/readable. Existing note
 * IDs may be skipped only when current text and COMPLETE metadata are equal;
 * divergent/stale/resurrected revisions are conflicts, not a silent merge.
 * The caller still must implement a fresh check inside the final write tx.
 */
export function planPrivateGpsRestore(v3Text,currentGpsSnapshot){
 const checked=inspectPortableV3Backup(v3Text);if(!checked.ok)return checked;
 if(!currentGpsSnapshot||currentGpsSnapshot.ok!==true||
    currentGpsSnapshot.includedGps!==true||
    currentGpsSnapshot.includedReflections!==true||
    !currentGpsSnapshot.gps||!currentGpsSnapshot.reflections)
  return err('UNREADABLE_CURRENT','現在のGPSと自由記述を同時に確認できません');
 const existing=inspectGpsV2Backup(JSON.stringify(currentGpsSnapshot.gps));
 if(!existing.ok)return err('UNREADABLE_CURRENT',existing.reason);
 const currentNotes=inspectGpsPrivateBackupSnapshot(
  {includeGps:true,includeGpsReflections:true},
  {parents:candidates(currentGpsSnapshot.gps),
   contents:currentGpsSnapshot.reflections.contents,
   events:currentGpsSnapshot.reflections.events});
 if(!currentNotes.ok||!equal(currentNotes.bundle,currentGpsSnapshot.reflections))
  return err('UNREADABLE_CURRENT','現在の自由記述・履歴に不整合があります');
 const incoming=checked.data;
 const sources=new Map(currentGpsSnapshot.gps.summaries.map(x=>[x.id,x]));
 const existingDetails=new Map(currentGpsSnapshot.gps.details.map(x=>[x.id,x]));
 const incomingDetails=new Map(incoming.gps.details.map(x=>[x.id,x]));
 let gpsParentsToAdd=0;
 for(const item of incoming.gps.summaries){
  const old=sources.get(item.id);
  if(!old){gpsParentsToAdd++;continue;}
  if(!equal(old,item)||
     (item.detailSaved&&!equal(existingDetails.get(item.id),incomingDetails.get(item.id))))
   return err('PARENT_CONFLICT','同一IDのGPS元記録の内容が異なります');
 }
 const byId=new Map(),events=new Map();
 for(const item of currentNotes.bundle.contents)byId.set(item.noteId,item);
 for(const item of currentNotes.bundle.events){
  if(!events.has(item.noteId))events.set(item.noteId,[]);
  events.get(item.noteId).push(item);
 }
 const upcomingNotes=new Map(),incomingEvents=new Map();
 for(const item of incoming.gpsReflections.contents)upcomingNotes.set(item.noteId,item);
 for(const item of incoming.gpsReflections.events){
  if(!incomingEvents.has(item.noteId))incomingEvents.set(item.noteId,[]);
  incomingEvents.get(item.noteId).push(item);
 }
 const activeIds=new Set([...byId.keys(),...events.keys()]);
 const existingEventIds=new Map(currentNotes.bundle.events.map(e=>[e.eventId,e]));
 const existingRequestIds=new Map(currentNotes.bundle.events.map(e=>[e.requestId,e]));
 let privateNotesToAdd=0,skippedExactNotes=0;
 for(const [noteId,thread] of incomingEvents){
  if(activeIds.has(noteId)){
   if(!equal(thread,events.get(noteId))||
      !equal(upcomingNotes.get(noteId)??null,byId.get(noteId)??null))
    return err('NOTE_CONFLICT','自由記述の改訂履歴または現在本文が競合しています');
   skippedExactNotes++;continue;
  }
  if(thread.some(e=>existingEventIds.has(e.eventId)||existingRequestIds.has(e.requestId)))
   return err('EVENT_CONFLICT','別の自由記述とイベントID・操作IDが重複しています');
  privateNotesToAdd++;
 }
 return {ok:true,plan:{gpsParentsToAdd,privateNotesToAdd,skippedExactNotes,
  privateEventsToAdd:incoming.gpsReflections.events.filter(e=>!activeIds.has(e.noteId)).length},
  writeCount:0,requiresTransactionRecheck:true};
}
