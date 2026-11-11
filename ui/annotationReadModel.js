/** M2 read model: user-reported addenda never become original measurements. */
import {normalizeRecordRef,resolveRecord} from './recordRef.js';
import {readAnnotationThread} from './annotationStore.js';
import {validateAnnotationEvent} from './annotationSchema.js';
const err=(code,reason)=>({ok:false,code,reason});
const ok=value=>({ok:true,value});
export async function readEffectiveAnnotation(db,ref,fieldKey,resolveParent=resolveRecord){
 const nr=normalizeRecordRef(ref);if(!nr.ok)return nr;
 const thread=await readAnnotationThread(db,nr.value,fieldKey);
 if(!thread.ok)return thread;
 let parent;
 try{parent=await resolveParent(nr.value);}catch{return err('UNREADABLE_PARENT','親の走行記録を読み取れません');}
 if(parent?.code==='NOT_FOUND'){
  return thread.value.length?ok({status:'ORPHANED',recordRef:nr.value,eventCount:thread.value.length}):
   err('NOT_FOUND','記録が見つかりません');
 }
 if(parent?.ok!==true||parent.value?.record?.id!==nr.value.recordId||parent.value.ref?.sourceType!==nr.value.sourceType)
  return err('UNREADABLE_PARENT','親の走行記録を照合できません');
 if(!thread.value.length)return ok({status:'NO_ANSWER'});
 if(thread.value.some(e=>!validateAnnotationEvent(e,{record:parent.value.record}).ok))
  return err('READ_FAILED','親記録の条件と追記値が一致しません');
 const latest=thread.value.at(-1),previous=thread.value.slice(0,-1);
 return ok({status:latest.operation==='RETRACT'?'RETRACTED':'ACTIVE',latest,previous,
  provenance:'POST_HOC_SELF_REPORT',scientificRecalculation:false});
}
