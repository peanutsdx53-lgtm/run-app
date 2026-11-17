/** Optional explicit relation from an exploration note to one saved manual run. */
const RUN_ID=/^run-v1-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRunId=x=>typeof x==='string'&&RUN_ID.test(x);
export function findLinkableRun(manualRuns,recordId){
 if(!isRunId(recordId)||manualRuns?.ok!==true||!Array.isArray(manualRuns.records))return null;
 const matches=manualRuns.records.filter(r=>r?.id===recordId);
 if(matches.length!==1)return null;
 const r=matches[0];
 return r.source==='manual'&&r.type==='run'&&r.schema===2&&Number.isFinite(r.distanceKm)&&r.distanceKm>0&&Number.isInteger(r.durationSeconds)&&r.durationSeconds>0?r:null;
}
export function resolveOptionalNoteRunLink(focusRunId,manualRuns){
 if(focusRunId===null||focusRunId===undefined||focusRunId==='')return {ok:true,recordId:null};
 const run=findLinkableRun(manualRuns,focusRunId);
 return run?{ok:true,recordId:run.id,recordDate:run.date}:{ok:false,reason:'指定された保存済み走行が見つからないため、この走行に関連づけて保存できません'};
}
export function noteIsForRun(note,recordId){return isRunId(recordId)&&note?.recordId===recordId;}
export function visibleTopicNotes(notes,topicId,focusRunId=null){
 if(!Array.isArray(notes))return [];
 return notes.filter(n=>n?.topicId===topicId&&(focusRunId?noteIsForRun(n,focusRunId):!n.recordId));
}
export function noteRunBackLink(note,manualRuns){
 if(!note?.recordId)return null;
 const run=findLinkableRun(manualRuns,note.recordId);
 return run?{recordId:run.id,date:run.date}:null;
}
/** G3: read-only per-record reflection selection, never guessing a deleted parent.
 * Legacy notes without a topicId remain eligible when their exact recordId matches.
 * The explicit all-notes catalog remains accessible in general Explore. */
export function linkedReflectionNotes(snapshot,recordId){
 if(!snapshot||snapshot.readable!==true||!Array.isArray(snapshot.notes))return {status:'unavailable',notes:[]};
 if(!findLinkableRun(snapshot.manualRuns,recordId))return {status:'not-linkable',notes:[]};
 return {status:'ready',notes:snapshot.notes.filter(n=>n&&n.recordId===recordId)};
}
