/** English wording for a locally generated result PNG.
 * This is presentation-only. Original scientific calculation, disclosure choices,
 * provenance, saved records, and the canonical Japanese PNG are unchanged.
 */
const REASONS=Object.freeze({
 '活動種別が未選択のため算出しません':'Not calculated because an activity type was not selected.',
 '走歩混在を一つの値に換算しません':'Mixed running and walking are not converted into one reference value.',
 '文献が扱う速度範囲外のため算出できません':'Not calculated: speed is outside the source-study range.',
 '該当条件で算出できる部位はありません':'No region is calculable under these conditions.'
});
const readScore=value=>value==='未回答'?'Unanswered':value;
export function englishResultImageAnnotation(evidence){
 const status=String(evidence?.status??''),detail=String(evidence?.detail??'');
 if(status==='保存前：部位別値は未表示')
  return Object.freeze({status:'Before Saving: No Region Values Shown',detail:'Source-study applicability is checked for a saved activity.'});
 const counted=status.match(/^文献参考値：(\d+)\/12 部位算出$/);
 if(counted)
  return Object.freeze({status:'Study References: '+counted[1]+'/12 Regions Calculated',detail:'Each region uses its own study reference of 100.'});
 if(status==='文献参考値：算出対象外')
  return Object.freeze({status:'Study References: Not Applicable',detail:REASONS[detail]||'No reference region is calculated under the stated conditions.'});
 throw Error('Unsupported research-reference evidence must not be translated as a valid result');
}
export function englishResultImageDisclosure(disclosure){
 const date=disclosure?.includeDate===true?String(disclosure.dateText??''):'Date Omitted (Default)';
 const rof=disclosure?.includeRof===true?String(disclosure.rofText??''):'';
 const matches=rof.match(/^ROF-J（本人回答）：運動前 (未回答|\d+) ／ 運動後 (未回答|\d+)$/);
 return Object.freeze({
  dateText:date,
  rofText:disclosure?.includeRof===true?(matches?'ROF-J (Self-Report): Before '+readScore(matches[1])+' / After '+readScore(matches[2]):'ROF-J (Self-Report): Timing and Scores Unverified'):'ROF-J Responses Omitted (Default)',
  includeRof:disclosure?.includeRof===true
 });
}
export function englishResultImageCopy({evidence,disclosure,gps=false,saved=false}={}){
 return Object.freeze({
  ...englishResultImageDisclosure(disclosure),
  evidence:englishResultImageAnnotation(evidence),
  title:'Activity Results',
  distance:'Distance',
  duration:'Duration',
  pace:'Average Pace',
  source:gps?'GPS Record Saved on This Device':saved?'Manual Record Saved on This Device':'Record Not Yet Saved',
  referenceHeading:'Study Reference Availability',
  notMeasured:'Not a Direct Measurement of Tissue Load',
  notRisk:'Not a Ranking Across Regions or an Injury-Risk Score',
  privateLine:disclosure?.includeRof===true?'Actual Before/After Response Timing Is Not Verified':'Personal Notes, Later Reports, and Routes Are Omitted',
  detailLine:'See the App for Region-Specific Reference Details',
  fileName:'Running Results.png',
  imageError:'Could Not Create the Image. Check Your Device and Browser.',
  imageStarted:'Image Download Started. Check Your Device Downloads.'
 });
}
