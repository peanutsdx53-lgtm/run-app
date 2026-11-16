/**
 * GPS V2 history adapter. The source summary has already been validated by the
 * authoritative store, and this boundary checks it again. Never copy route,
 * location, speed samples, or flags into a common history row.
 */
import {validGpsV2Summary} from './gpsReplayIndexedDbStore.js';
export function gpsSummariesToHistoryRows(readResult){
 if(!readResult?.ok||!Array.isArray(readResult.records))return [];
 return readResult.records.flatMap(summary=>{
  if(!validGpsV2Summary(summary))return [];
  return [{
   id:summary.id,sourceType:'GPS_V2',type:'run',date:summary.date,
   time:'',activityGait:summary.activity==='MIXED'?'RUN_WALK':summary.activity,
   distanceKm:summary.distanceKm,durationSeconds:summary.activeSeconds,
   courseName:'',shoeName:'',memo:summary.experience?.memo??'',
   rofBefore:summary.experience?.rofBefore??null,
   rofAfter:summary.experience?.rofAfter??null,
   detailSaved:summary.detailSaved===true
  }];
 });
}
