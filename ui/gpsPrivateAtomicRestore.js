/**
 * G4-C4 internal-only GPS/private reflection restore transaction.
 *
 * This module intentionally has NO user-facing import/export/restore handler.
 * Current portable-v1/v2 restore stays untouched. The caller must explicitly
 * authorize the GPS source AND the private notes AND confirm private restore.
 *
 * Across the single GPS v2 IndexedDB database, summary, optional route,
 * mutable current private text and metadata-only event history commit in
 * ONE readwrite transaction or are ALL aborted. This does NOT promise atomic
 * restore of localStorage/manual entries or a separate annotation database.
 */
import {
 GPS_V2_DB,GPS_V2_DB_VERSION,GPS_V2_SUMMARIES,GPS_V2_DETAILS,
 GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS,GPS_V2_BACKUP_FORMAT,
 readGpsV2Summaries
} from './gpsReplayIndexedDbStore.js';
import {
 inspectGpsPrivateBackupChoice,inspectGpsPrivateBackupSnapshot,
 GPS_PRIVATE_REFLECTION_MAX_NOTES
} from './gpsReflectionBackupScope.js';
import {GPS_REFLECTION_MAX_EVENTS} from './gpsReflectionEventContract.js';
import {inspectPortableV3Backup,planPrivateGpsRestore}
 from './gpsReflectionPortableV3.js';

const fail=(code,reason)=>({ok:false,code,reason});
const MAX_GPS_PARENTS=2000;
const requestResult=req=>new Promise((resolve,reject)=>{
 req.onsuccess=()=>resolve(req.result);
 req.onerror=()=>reject(req.error||Error('IDB_REQUEST'));
});
const committed=tx=>new Promise((resolve,reject)=>{
 tx.oncomplete=()=>resolve();
 tx.onabort=()=>reject(tx.error||Error('IDB_ABORT'));
 tx.onerror=()=>reject(tx.error||Error('IDB_TRANSACTION'));
});

/** Non-upgrading connection. Upgrade (if necessary) goes through owner first. */
function existingGpsDatabase(){
 return new Promise((resolve,reject)=>{
  if(typeof globalThis.indexedDB?.open!=='function'){
   reject(Error('IDB_UNAVAILABLE'));return;
  }
  let req,settled=false;
  const timer=setTimeout(()=>finish(Error('IDB_OPEN_TIMEOUT')),7000);
  function finish(error,db){
   if(settled){db?.close();return;}
   settled=true;clearTimeout(timer);
   if(error)reject(error);else resolve(db);
  }
  try{req=globalThis.indexedDB.open(GPS_V2_DB,GPS_V2_DB_VERSION);}
  catch(e){finish(e);return;}
  req.onerror=()=>finish(req.error||Error('IDB_OPEN_FAILED'));
  req.onblocked=()=>finish(Error('IDB_OPEN_BLOCKED'));
  req.onupgradeneeded=()=>{
   try{req.transaction.abort();}catch{}
   finish(Error('UNEXPECTED_SCHEMA_UPGRADE'));
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
 * Exact GPS-only atomic restore, no separate storage zones. Invariant:
 * recheck all existing four stores and incoming v3 files inside the SAME
 * transaction immediately before any writes; no head from an earlier
 * preflight is accepted unconditionally. Never resurrect deleted text.
 */
export async function restoreGpsPrivateV3Atomic(v3Text,choice={}){
 // Gate consent before even examining a private backup file or IndexedDB.
 const permission=inspectGpsPrivateBackupChoice(choice);
 if(!permission.ok)return permission;
 if(!permission.value.includeGps||!permission.value.includeGpsReflections||
    choice.confirmPrivateRestore!==true)
  return fail('CONSENT_REQUIRED','GPSと任意記述の復元を個別に明示選択してください');

 const checked=inspectPortableV3Backup(v3Text);
 if(!checked.ok)return checked;

 // Keep the official DB-owner V1->V2 upgrade handling. Its snapshot is NOT
 // used for conflict resolution; all writes depend on a fresh transactional
 // snapshot in the actual write transaction.
 const existingOwner=await readGpsV2Summaries();
 if(!existingOwner.ok)return fail('UNREADABLE_CURRENT','現在のGPS元記録を読み取れません');

 let db,tx,transactionComplete;
 try{
  db=await existingGpsDatabase();
  const names=[GPS_V2_SUMMARIES,GPS_V2_DETAILS,
   GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS];
  if(!names.every(name=>db.objectStoreNames.contains(name)))
   return fail('UNREADABLE_SCHEMA','復元に必要なGPS保存領域がありません');

  tx=db.transaction(names,'readwrite');
  transactionComplete=committed(tx);
  // Queue ALL reads synchronously before awaiting anything. The subsequent
  // validation is synchronous and queues IDB additions in that same task.
  const pending=names.map(name=>requestResult(tx.objectStore(name).getAll()));
  const [summaries,details,contents,events]=await Promise.all(pending);
  if(summaries.length>MAX_GPS_PARENTS||
     contents.length>GPS_PRIVATE_REFLECTION_MAX_NOTES||
     events.length>GPS_REFLECTION_MAX_EVENTS){
   tx.abort();await transactionComplete.catch(()=>{});transactionComplete=null;
   return fail('LIMIT','既存の保存情報が上限を超えています');
  }
  const choiceOn={includeGps:true,includeGpsReflections:true};
  const selected=inspectGpsPrivateBackupSnapshot(choiceOn,{
   parents:summaries.map(s=>({sourceType:'GPS_V2',recordId:s.id})),
   contents,events
  });
  if(!selected.ok){
   tx.abort();await transactionComplete.catch(()=>{});transactionComplete=null;
   return fail('UNREADABLE_CURRENT','既存の自由記述に不整合があります');
  }
  const snapshot={ok:true,includedGps:true,includedReflections:true,
   gps:{format:GPS_V2_BACKUP_FORMAT,version:2,summaries,details},
   reflections:selected.bundle};
  const plan=planPrivateGpsRestore(v3Text,snapshot);
  if(!plan.ok){
   tx.abort();await transactionComplete.catch(()=>{});transactionComplete=null;
   return plan;
  }

  const incoming=checked.data,knownParents=new Set(summaries.map(s=>s.id));
  const knownNotes=new Set(events.map(e=>e.noteId));
  const addedParents=incoming.gps.summaries.filter(x=>!knownParents.has(x.id));
  const addedNotes=incoming.gpsReflections.contents.filter(x=>!knownNotes.has(x.noteId));
  const addedEvents=incoming.gpsReflections.events.filter(x=>!knownNotes.has(x.noteId));
  const incomingDetails=new Map(incoming.gps.details.map(x=>[x.id,x]));
  const totalParents=summaries.concat(addedParents);
  const totalContents=contents.concat(addedNotes);
  const totalEvents=events.concat(addedEvents);
  if(totalParents.length>MAX_GPS_PARENTS||
     totalContents.length>GPS_PRIVATE_REFLECTION_MAX_NOTES||
     totalEvents.length>GPS_REFLECTION_MAX_EVENTS){
   tx.abort();await transactionComplete.catch(()=>{});transactionComplete=null;
   return fail('LIMIT','復元後のGPS・自由記述件数が上限を超えます');
  }
  // Validate the *merged* generation and byte size before staging any write.
  // No silent text mutation, orphan attachment or oversized merged private
  // history can be committed.
  const merged=inspectGpsPrivateBackupSnapshot(choiceOn,{
   parents:totalParents.map(x=>({sourceType:'GPS_V2',recordId:x.id})),
   contents:totalContents,events:totalEvents
  });
  if(!merged.ok){
   tx.abort();await transactionComplete.catch(()=>{});transactionComplete=null;
   return fail(merged.code||'LIMIT','復元後の自由記述の整合性を確認できません');
  }
  const expected=plan.plan;
  if(addedParents.length!==expected.gpsParentsToAdd||
     new Set(addedEvents.map(e=>e.noteId)).size!==expected.privateNotesToAdd||
     addedEvents.length!==expected.privateEventsToAdd){
   tx.abort();await transactionComplete.catch(()=>{});transactionComplete=null;
   return fail('HEAD_CONFLICT','復元対象の状態が変わりました');
  }

  const p=tx.objectStore(GPS_V2_SUMMARIES),r=tx.objectStore(GPS_V2_DETAILS);
  const n=tx.objectStore(GPS_V2_REFLECTION_CONTENT),e=tx.objectStore(GPS_V2_REFLECTION_EVENTS);
  for(const item of addedParents){
   p.add(item);
   if(item.detailSaved)r.add(incomingDetails.get(item.id));
  }
  for(const item of addedNotes)n.add(item);
  for(const item of addedEvents)e.add(item);
  // Only oncomplete is a verified successful commit. IDB errors may mean
  // uncertain outcome; do not promise rollback for an unknown browser failure.
  await transactionComplete;
  transactionComplete=null;
  return {ok:true,gpsAdded:addedParents.length,privateNotesAdded:expected.privateNotesToAdd,
   eventsAdded:addedEvents.length,exactNotesSkipped:expected.skippedExactNotes,
   writeCount:addedParents.length+addedNotes.length+addedEvents.length,
   gpsTransactionCommitted:true,partial:false};
 }catch{
  try{tx?.abort();}catch{}
  if(transactionComplete)await transactionComplete.catch(()=>{});
  return fail('TRANSACTION_UNKNOWN','GPSと自由記述の復元結果を確認できません');
 }finally{
  try{db?.close();}catch{}
 }
}
