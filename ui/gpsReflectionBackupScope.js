/**
 * G4-C1: explicit backup scope + pure validation of the current GPS private
 * reflection snapshot. NO IndexedDB, file writing, UI, or backup-format change.
 *
 * includeGps alone does NOT consent to exporting a private reflection.
 * Only includeGps:true AND includeGpsReflections:true may produce a bundle.
 * C2 must revalidate original GPS parents inside one IDB readonly transaction;
 * this pure function cannot authorize a database read, export, or import.
 */
import {normalizeRecordRef} from './recordRef.js';
import {
 inspectGpsReflectionContent,inspectGpsReflectionThread,validateGpsReflectionEvent,
 GPS_REFLECTION_MAX_EVENTS
} from './gpsReflectionEventContract.js';

export const GPS_PRIVATE_REFLECTION_FORMAT='gps-private-reflections-backup-v1';
export const GPS_PRIVATE_REFLECTION_VERSION=1;
export const GPS_PRIVATE_REFLECTION_MAX_NOTES=2000;
export const GPS_PRIVATE_REFLECTION_MAX_SERIALIZED=15_000_000;
const fail=(code,reason)=>({ok:false,code,reason});
const strict=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(key=>Object.hasOwn(x,key));
const same=(a,b)=>a.sourceType===b.sourceType&&a.recordId===b.recordId;
const normalizedRef=x=>{
 const n=normalizeRecordRef(x);
 return n.ok&&n.value.sourceType==='GPS_V2'?n.value:null;
};

/** Both choices default FALSE; invalid combinations fail closed. */
export function inspectGpsPrivateBackupChoice(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(k=>!['includeGps','includeGpsReflections'].includes(k)))
  return fail('BAD_CHOICE','GPSバックアップの選択が不正です');
 const includeGps=Object.hasOwn(input,'includeGps')?input.includeGps:false;
 const includeGpsReflections=Object.hasOwn(input,'includeGpsReflections')?input.includeGpsReflections:false;
 if(typeof includeGps!=='boolean'||typeof includeGpsReflections!=='boolean')
  return fail('BAD_CHOICE','明示的な真偽値で指定してください');
 if(includeGpsReflections&&!includeGps)
  return fail('CONSENT_REQUIRED','GPS記録を含めない場合、関連する自由記述は出力できません');
 return {ok:true,value:Object.freeze({includeGps,includeGpsReflections})};
}

/**
 * Verified source IDs are supplied by a future C2 snapshot transaction.
 * Validate complete metadata streams and ONLY the current mutable text.
 * Prior EDIT text and deleted text must never be reconstructed or exported.
 *
 * Opt-out returns an empty selection without inspecting any snapshot field;
 * therefore a caller cannot accidentally leak counts/IDs/notes on opt-out.
 */
export function inspectGpsPrivateBackupSnapshot(choice,untrustedSnapshot){
 const scope=inspectGpsPrivateBackupChoice(choice);
 if(!scope.ok)return scope;
 if(!scope.value.includeGpsReflections)return {ok:true,included:false,bundle:null};
 if(!strict(untrustedSnapshot,['parents','contents','events'])||
   !Array.isArray(untrustedSnapshot.parents)||!Array.isArray(untrustedSnapshot.contents)||
   !Array.isArray(untrustedSnapshot.events)||
   untrustedSnapshot.parents.length>GPS_PRIVATE_REFLECTION_MAX_NOTES||
   untrustedSnapshot.contents.length>GPS_PRIVATE_REFLECTION_MAX_NOTES||
   untrustedSnapshot.events.length>GPS_REFLECTION_MAX_EVENTS)
  return fail('BAD_SNAPSHOT','自由記述のスナップショットが不正です');
 const parents=new Map(),contentById=new Map(),groups=new Map();
 for(const x of untrustedSnapshot.parents){
  const n=normalizedRef(x);
  if(!n||parents.has(n.recordId))return fail('BAD_PARENT','元のGPS記録の指定に不整合または重複があります');
  parents.set(n.recordId,n);
 }
 for(const x of untrustedSnapshot.contents){
  const checked=inspectGpsReflectionContent(x);
  if(!checked.ok)return checked;
  const c=checked.value,n=normalizedRef(c.recordRef);
  if(!n||!parents.has(n.recordId)||!same(n,parents.get(n.recordId))||
    contentById.has(c.noteId)||c.text!==x.text)
   return fail('BAD_CONTENT','自由記述がGPS原本と一致しないか重複・無断変換があります');
  contentById.set(c.noteId,{noteId:c.noteId,recordRef:n,text:c.text});
 }
 const eventIds=new Set(),requestIds=new Set();
 for(const x of untrustedSnapshot.events){
  const checked=validateGpsReflectionEvent(x);
  if(!checked.ok)return checked;
  const e=checked.value;
  if(!parents.has(e.recordRef.recordId)||
    eventIds.has(e.eventId)||requestIds.has(e.requestId))
   return fail('BAD_EVENT','別のGPS原本または重複操作が混入しています');
  eventIds.add(e.eventId);requestIds.add(e.requestId);
  if(!groups.has(e.noteId))groups.set(e.noteId,[]);
  groups.get(e.noteId).push(e);
 }
 if(groups.size>GPS_PRIVATE_REFLECTION_MAX_NOTES)return fail('LIMIT','自由記述の件数上限です');
 const canonicalEvents=[];
 for(const [noteId,thread] of groups){
  thread.sort((a,b)=>a.revision-b.revision);
  const parent=thread[0].recordRef;
  const c=contentById.get(noteId);
  const validated=inspectGpsReflectionThread(parent,noteId,thread);
  if(!validated.ok)return validated;
  if((validated.value.status==='ACTIVE')!==Boolean(c)||
     c&&!same(parent,c.recordRef))
   return fail('BAD_CONTENT','本文と履歴の現在状態または保存元が一致しません');
  for(const event of thread)canonicalEvents.push({...event,recordRef:{...event.recordRef}});
 }
 for(const id of contentById.keys())if(!groups.has(id))
  return fail('BAD_CONTENT','本文に対応する改訂履歴がありません');
 const contents=[...contentById.values()].sort((a,b)=>a.noteId.localeCompare(b.noteId));
 canonicalEvents.sort((a,b)=>a.noteId.localeCompare(b.noteId)||a.revision-b.revision);
 const bundle={format:GPS_PRIVATE_REFLECTION_FORMAT,version:GPS_PRIVATE_REFLECTION_VERSION,
  contents,events:canonicalEvents};
 // Check string size only after strict data validation, with explicit bound.
 const json=JSON.stringify(bundle);
 if(new TextEncoder().encode(json).length>GPS_PRIVATE_REFLECTION_MAX_SERIALIZED)
  return fail('LIMIT','自由記述のバックアップ容量上限です');
 return {ok:true,included:true,bundle};
}
