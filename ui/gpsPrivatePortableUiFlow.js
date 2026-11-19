/**
 * G4-C5: optional portable-v3 GPS private note adapter.
 * Existing v1/v2 export and restore paths remain exactly as before.
 * WARNING: GPS IDB atomic restore is NOT atomic with localStorage/annotation.
 */
import * as portable2 from './portableDataV2.js';
import {PORTABLE_MAX_BYTES,portableUtf8Bytes} from './dataManagement.js';
import {readGpsPrivateBackupSnapshot} from './gpsReflectionBackupSnapshot.js';
import {preparePortableV3Candidate,inspectPortableV3Backup,planPrivateGpsRestore}
 from './gpsReflectionPortableV3.js';
import {restoreGpsPrivateV3Atomic} from './gpsPrivateAtomicRestore.js';
const failure=(code,reason)=>({ok:false,code,reason});
const choice={includeGps:true,includeGpsReflections:true};
const v2=(d)=>({format:d.format,version:2,exportedAt:d.exportedAt,
 local:d.local,gps:d.gps,annotations:d.annotations});

export function isPrivateV3(text){
 if(typeof text!=='string'||portableUtf8Bytes(text)>PORTABLE_MAX_BYTES)return false;
 try{return JSON.parse(text)?.version===3;}catch{return false;}
}
export function projectPortableV2(text){
 const checked=inspectPortableV3Backup(text);
 if(!checked.ok)return checked;
 const v2Text=JSON.stringify(v2(checked.data));
 const old=portable2.inspectPortableBackup(v2Text);
 return old.ok?{ok:true,text:v2Text}:old;
}
export async function exportPrivatePortableV3(storage){
 const previous=await portable2.exportPortableBackup(storage,{includeGps:true});
 if(!previous.ok)return previous;
 const snap=await readGpsPrivateBackupSnapshot(choice);
 if(!snap.ok)return snap;
 const next=preparePortableV3Candidate(previous.text,snap,choice);
 return next.ok?{...next,includesGps:true,includesGpsReflections:true}:next;
}
export async function preflightPrivatePortableRestore(storage,text){
 const checked=inspectPortableV3Backup(text);
 if(!checked.ok)return checked;
 const legacy=projectPortableV2(text);
 if(!legacy.ok)return legacy;
 const baseline=await portable2.preflightPortableRestore(storage,legacy.text);
 if(!baseline.ok)return baseline;
 const current=await readGpsPrivateBackupSnapshot(choice);
 if(!current.ok)return current;
 const privatePlan=planPrivateGpsRestore(text,current);
 if(!privatePlan.ok)return privatePlan;
 return {...baseline,privateV3:true,privateNoteCount:checked.privateNoteCount,
  privateEventCount:checked.privateEventCount,v2Text:legacy.text,
  privatePlan:privatePlan.plan,
  hasExisting:baseline.hasExisting||current.gps.summaries.length>0||
   current.reflections.contents.length>0||current.reflections.events.length>0};
}
/**
 * Pass the existing canonical v2 manual+annotation restore function as the
 * callback. The manual/annotation stage may fail AFTER GPS/private committed.
 * Such failures are PARTIAL and must never be described as rolled back.
 */
export async function restorePrivatePortableV3(storage,text,{confirmed=false,restoreOthers}={}){
 if(confirmed!==true)return failure('CONSENT_REQUIRED','GPS自由記述の復元を別に明示確認してください');
 if(typeof restoreOthers!=='function')return failure('NO_RESTORE','元の復元処理を利用できません');
 const plan=await preflightPrivatePortableRestore(storage,text);
 if(!plan.ok)return plan;
 const gps=await restoreGpsPrivateV3Atomic(text,{
  includeGps:true,includeGpsReflections:true,confirmPrivateRestore:true
 });
 if(!gps.ok)return gps;
 let other;
 try{other=await restoreOthers(plan.v2Text);}
 catch{return {ok:false,partial:true,code:'OTHER_UNKNOWN',
  reason:'GPS・自由記述の復元後、別保存領域の復元結果が不明になりました。再読込して照合してください'};}
 if(other?.ok!==true)return {ok:false,partial:true,code:other?.code||'OTHER_FAILED',
  reason:'GPSと本人の自由記述の復元は完了しましたが、その他の記録は未完了の可能性があります：'+(other?.reason||'保存状態を確認してください')};
 // A successful notification is permitted only after a fresh, complete
 // four-store read confirms the requested GPS parents, notes and tombstones.
 // This does not claim cross-storage atomicity with the manual/annotation stage.
 const verified=await readGpsPrivateBackupSnapshot(choice);
 if(!verified.ok)return {ok:false,partial:true,code:'POST_RESTORE_UNREADABLE',
  reason:'GPS・自由記述の復元後検証に失敗しました。記録を再読み込みして確認してください'};
 const verifiedPlan=planPrivateGpsRestore(text,verified);
 if(!verifiedPlan.ok||verifiedPlan.plan.gpsParentsToAdd!==0||
    verifiedPlan.plan.privateNotesToAdd!==0||verifiedPlan.plan.privateEventsToAdd!==0)
  return {ok:false,partial:true,code:'POST_RESTORE_MISMATCH',
   reason:'復元後のGPS・自由記述とバックアップの一致を確認できません。記録を再読み込みして照合してください'};
 return {...other,privateGpsRestored:true,privateNotesAdded:gps.privateNotesAdded,
  privateEventsAdded:gps.eventsAdded,gpsParentsAdded:gps.gpsAdded,partial:false};
}
