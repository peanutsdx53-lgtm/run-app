/**
 * G4-A: strictly read-only eligibility for a future, separate GPS V2 reflection store.
 * Do NOT treat successful preflight as write authorization. A future writer MUST
 * re-check the same parent in the transaction that commits the dependent note.
 * This module does not create IndexedDB stores or touch GPS, annotation, manual,
 * legacy exploration-note, export, restore, consent, or PWA state.
 */
import {normalizeRecordRef,resolveRecord} from './recordRef.js';

export const GPS_REFLECTION_TEXT_LIMIT=500;
const failure=(code,reason)=>({ok:false,code,reason});
const success=value=>({ok:true,value});
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);

/** Verify only a user-explicit, typed GPS V2 identity and voluntary plain text. */
export function inspectGpsReflectionDraft(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).length!==2||!own(input,'recordRef')||!own(input,'text'))
  return failure('BAD_DRAFT','自由記述の指定形式が正しくありません');
 const ref=normalizeRecordRef(input.recordRef);
 if(!ref.ok)return failure(ref.code,ref.reason);
 if(ref.value.sourceType!=='GPS_V2')
  return failure('SOURCE_MISMATCH','GPS V2の保存済み走行を明示してください');
 if(typeof input.text!=='string'||!input.text.trim()||input.text.length>GPS_REFLECTION_TEXT_LIMIT)
  return failure('BAD_TEXT','本人の自由記述は1〜500文字で入力してください');
 return success(Object.freeze({recordRef:ref.value,text:input.text.trim()}));
}

/**
 * Read-only parent preflight: every lookup must come from the strict GPS V2
 * authority. Never choose a latest run, never rebind deleted or damaged IDs.
 * The returned status is *not* a durable write permit; storage commit remains
 * disabled until G4-B/C backup, transaction and deletion gates are accepted.
 */
export async function preflightGpsReflectionDraft(input,{gpsV2}={}){
 const draft=inspectGpsReflectionDraft(input);
 if(!draft.ok)return draft;
 const parent=await resolveRecord(draft.value.recordRef,{gpsV2});
 if(!parent.ok)return failure(parent.code,parent.reason);
 if(parent.value.ref?.sourceType!=='GPS_V2'||
    parent.value.ref?.recordId!==draft.value.recordRef.recordId||
    parent.value.record?.id!==draft.value.recordRef.recordId||
    parent.value.sourceKind!=='GPS_DEVICE')
  return failure('SOURCE_MISMATCH','GPS V2の保存元を特定できません');
 return success(Object.freeze({
  recordRef:draft.value.recordRef,
  text:draft.value.text,
  recordDate:parent.value.record.date,
  parentRecheckRequired:true
 }));
}