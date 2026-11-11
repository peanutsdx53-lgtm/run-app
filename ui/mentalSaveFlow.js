/** Professor M4: confirmed parent first, isolated mental annotation second. */
import {normalizeRecordRef,resolveRecord} from './recordRef.js';
import {openAnnotationStore,appendAnnotation,findAnnotationByRequestId} from './annotationStore.js';
import {readEffectiveAnnotation} from './annotationReadModel.js';
const err=(code,reason)=>({ok:false,code,reason});
/** A retry never re-saves the manual/GPS run and never allocates a new ID. */
export async function saveMentalOnly(pending,{resolveParent=resolveRecord,openStore=openAnnotationStore,append=appendAnnotation,byRequest=findAnnotationByRequestId,read=readEffectiveAnnotation}={}){
 if(!pending?.request)return err('BAD_EVENT','再試行できる任意回答がありません');
 const q=pending.request,n=normalizeRecordRef(q.recordRef);if(!n.ok)return n;
 const parent=await resolveParent(n.value);
 if(!parent?.ok)return err(parent?.code||'UNREADABLE_PARENT','走行記録を再確認できず、任意回答を保存していません');
 const opened=await openStore();if(!opened.ok)return opened;
 const db=opened.value.db;
 try{
  let outcome=await append(db,q,resolveParent);
  if(!outcome.ok){
   if(outcome.code==='REQUEST_CONFLICT')return outcome;
   // A successful commit can lose its acknowledgment. Check by the SAME request ID.
   const found=await byRequest(db,q.clientRequestId);
   if(!found.ok)return found;
   const e=found.value;
   if(!e||e.eventId!==q.eventId||e.recordRef.sourceType!==q.recordRef.sourceType||e.recordRef.recordId!==q.recordRef.recordId||e.fieldKey!==q.fieldKey||e.declaredPhase!==q.declaredPhase||e.timeBasis!==q.timeBasis||e.enteredAt!==q.enteredAt||JSON.stringify(e.payload)!==JSON.stringify(q.payload))
    return outcome;
  }
  const verified=await read(db,n.value,'mentalExperience',resolveParent);
  if(!verified.ok||verified.value.status!=='ACTIVE'||verified.value.latest.eventId!==q.eventId)
   return err('READ_FAILED','任意回答の保存後照合ができませんでした。操作IDを変えずに再確認してください');
  return {ok:true,status:'SAVED',ref:n.value,eventId:q.eventId};
 }finally{try{db.close?.()}catch{}}
}
export async function readMental(ref,{resolveParent=resolveRecord,openStore=openAnnotationStore,read=readEffectiveAnnotation}={}){
 const n=normalizeRecordRef(ref);if(!n.ok)return n;
 const opened=await openStore();if(!opened.ok)return opened;
 const db=opened.value.db;
 try{return await read(db,n.value,'mentalExperience',resolveParent)}finally{try{db.close?.()}catch{}}
}
