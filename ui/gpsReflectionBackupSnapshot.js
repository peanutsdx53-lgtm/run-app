/**
 * G4-C2: read-only GPS-V2/private-reflection snapshot boundary.
 * NOT wired to user-facing portable export/restore or any screen.
 *
 * Both GPS parent rows and private current text + metadata-only event history
 * come from ONE final IndexedDB readonly transaction. The initial strict GPS
 * read is an upgrade/availability preflight only, and is never mixed into the
 * returned snapshot. The snapshot transaction itself revalidates all parents.
 * No mutation, backup download, cross-database atomicity, or consent UI.
 */
import {
 GPS_V2_DB,GPS_V2_DB_VERSION,GPS_V2_SUMMARIES,GPS_V2_DETAILS,
 GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS,GPS_V2_BACKUP_FORMAT,
 readGpsV2Summaries,validGpsV2Summary,validGpsV2Detail,validGpsV2Pair
} from './gpsReplayIndexedDbStore.js';
import {inspectGpsPrivateBackupChoice,inspectGpsPrivateBackupSnapshot}
 from './gpsReflectionBackupScope.js';

const fail=(code,reason)=>({ok:false,code,reason});
const requestDone=req=>new Promise((resolve,reject)=>{
 req.onsuccess=()=>resolve(req.result);
 req.onerror=()=>reject(req.error||Error('IDB_REQUEST'));
});
const txDone=tx=>new Promise((resolve,reject)=>{
 tx.oncomplete=()=>resolve();
 tx.onabort=()=>reject(tx.error||Error('IDB_ABORT'));
 tx.onerror=()=>reject(tx.error||Error('IDB_TRANSACTION'));
});
const MAX_GPS_RECORDS=2000;

/**
 * A separate connection cannot change any v1 rows; readGpsV2Summaries opens
 * the established v2 database and performs the existing upgrade if required.
 * A blocked open or timeout MUST report failure, not a partial snapshot.
 */
function openExistingGpsV2(){
 return new Promise((resolve,reject)=>{
  if(typeof globalThis.indexedDB?.open!=='function'){
   reject(Error('IDB_UNAVAILABLE'));return;
  }
  let req,settled=false;
  const timer=setTimeout(()=>finish(Error('GPS_SNAPSHOT_TIMEOUT')),7000);
  function finish(error,db){
   if(settled){db?.close();return;}
   settled=true;clearTimeout(timer);
   if(error)reject(error);else resolve(db);
  }
  try{req=globalThis.indexedDB.open(GPS_V2_DB,GPS_V2_DB_VERSION);}
  catch(e){finish(e);return;}
  req.onblocked=()=>finish(Error('GPS_SNAPSHOT_BLOCKED'));
  req.onerror=()=>finish(req.error||Error('GPS_SNAPSHOT_OPEN'));
  req.onupgradeneeded=()=>{ // A standalone reader must NEVER migrate data.
   try{req.transaction.abort();}catch{}
   finish(Error('GPS_SNAPSHOT_UNEXPECTED_UPGRADE'));
  };
  req.onsuccess=()=>{
   const db=req.result;
   if(settled){db.close();return;}
   db.onversionchange=()=>db.close();
   finish(null,db);
  };
 });
}

/**
 * Both opts default false, including the independent private-text choice.
 * includeGps:true, includeGpsReflections:false touches ONLY parent stores.
 * includeGpsReflections:true requires both flags true and validates private
 * rows against the SAME transaction's validated parent GPS summaries/routes.
 *
 * Return value is a non-persistent candidate snapshot, NOT a portable backup
 * file and NOT proof that a later write/restore will be safe.
 */
export async function readGpsPrivateBackupSnapshot(choice={}){
 const scope=inspectGpsPrivateBackupChoice(choice);
 if(!scope.ok)return scope;
 if(!scope.value.includeGps)
  return {ok:true,includedGps:false,includedReflections:false,gps:null,reflections:null};

 // Preflight upgrades old GPS v1 -> v2 through the established owner.
 // Never use these preflight records in the returned candidate backup.
 const preliminary=await readGpsV2Summaries();
 if(!preliminary.ok)return fail('UNREADABLE_PARENT','GPS保存元を安全に開けません');

 let db,tx,completed;
 try{
  db=await openExistingGpsV2();
  const names=[GPS_V2_SUMMARIES,GPS_V2_DETAILS];
  if(scope.value.includeGpsReflections)
   names.push(GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS);
  if(!names.every(n=>db.objectStoreNames.contains(n)))
   return fail('UNREADABLE_SCHEMA','保存済みのGPS記録を安全に確認できません');

  tx=db.transaction(names,'readonly');
  completed=txDone(tx);
  // Enqueue ALL requests synchronously, before any await can make an IDB
  // transaction inactive. No nested asynchronous parent reads are allowed.
  const pending=names.map(n=>requestDone(tx.objectStore(n).getAll()));
  const rows=await Promise.all(pending);
  await completed;
  completed=null;
  const [summaries,details,contents,events]=rows;
  if(!Array.isArray(summaries)||!Array.isArray(details)||
     summaries.length>MAX_GPS_RECORDS||details.length>MAX_GPS_RECORDS||
     !summaries.every(validGpsV2Summary)||!details.every(validGpsV2Detail))
   return fail('UNREADABLE_PARENT','GPS概要または経路の保存形式が不正です');
  const refs=new Set(summaries.map(s=>s.id));
  const routeIds=new Set(details.map(d=>d.id));
  if(refs.size!==summaries.length||routeIds.size!==details.length||
    !details.every(d=>refs.has(d.id))||
    !summaries.every(s=>s.detailSaved===routeIds.has(s.id))||
    !summaries.filter(s=>s.detailSaved)
      .every(s=>validGpsV2Pair(s,details.find(d=>d.id===s.id))))
   return fail('UNREADABLE_PARENT','GPS保存元と経路が不整合です');

  // Same parent and private snapshot generation by construction. Retain
  // historic GPS-only backup key set and omit any private data on opt-out.
  const gps={format:GPS_V2_BACKUP_FORMAT,version:2,summaries,details};
  if(!scope.value.includeGpsReflections)
   return {ok:true,includedGps:true,includedReflections:false,gps,reflections:null};
  const parents=summaries.map(s=>({sourceType:'GPS_V2',recordId:s.id}));
  const inspected=inspectGpsPrivateBackupSnapshot(scope.value,{parents,contents,events});
  if(!inspected.ok)return inspected;
  return {ok:true,includedGps:true,includedReflections:true,gps,
   reflections:inspected.bundle};
 }catch{
  try{tx?.abort();}catch{}
  if(completed)await completed.catch(()=>{});
  return fail('SNAPSHOT_UNKNOWN','GPSと自由記述の同時読み取りを確認できません');
 }finally{
  try{db?.close();}catch{}
 }
}
