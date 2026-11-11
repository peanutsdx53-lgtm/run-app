/* Synchronous display-only translation of consultation/PDF output. Used
 * immediately before invoking browser print so microtask observer timing cannot
 * leave Japanese headings in an otherwise English report.
 *
 * It never reads or writes storage, modifies scientific results, translates
 * user-written purpose/observations/questions, or expands the export allowlist.
 */
import {translateUiText} from './englishUi.js';
const USER_CONTENT='input,textarea,select,option,[data-report-purpose],[data-report-observation],[data-report-question],.cp-condition strong';
const names=Object.freeze({RUNNING:'Running',JOGGING:'Jogging',WALK:'Walking',MIXED:'Mixed Running and Walking'});
const date=value=>String(value||'').replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$1/$2/$3');
const activity=record=>record?.source==='manual'?(names[record.draft?.activityGait]||'Activity Type Not Selected'):(names[record?.activity]||'Unknown');
const origin=record=>record?.source==='manual'?'Manual Entry':record?.source==='gps-v2'?'Saved GPS Summary (No Detailed Location, Flags, or Private Notes)':'GPS Measurement';
function setText(root,selector,value){root.querySelectorAll(selector).forEach(el=>el.textContent=String(value??'—'));}
export function englishReportRecordContext(record,mode='single'){
 if(!record)return mode==='period'?'No saved record matched the selected period.':'No saved record is selected.';
 return (mode==='period'?'One saved record within the period (not a period average or total)':'Selected saved activity')
  +': '+date(record.date)+' / '+activity(record)+' / '+origin(record);
}
export function translateConsultationFixedNodes(root){
 if(!root)return;
 const doc=root.ownerDocument||document;
 const scan=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(scan.nextNode()){
  const node=scan.currentNode,parent=node.parentElement;
  if(!parent||parent.closest(USER_CONTENT))continue;
  const next=translateUiText(node.data);
  if(next!==node.data)node.data=next;
 }
 for(const el of root.querySelectorAll('[aria-label],[title]')){
  if(el.closest(USER_CONTENT))continue;
  for(const attr of ['aria-label','title']){
   const before=el.getAttribute(attr);
   if(before!==null){const after=translateUiText(before);if(after!==before)el.setAttribute(attr,after);}
  }
 }
}
export function localizeConsultationAfterDraw(host,{mode,group,single,scienceRun,rof,hasRof,life,memo,count,sourceErrors,periodDays,byType}){
 if(!host||host.ownerDocument?.documentElement.lang!=='en')return;
 const period=mode==='period',total=group?.length||0;
 const sourceLabel=single?'Source: '+origin(single):
  'Saved source breakdown: '+(total?Object.entries(byType||{}).map(([type,num])=>(type==='manual'?'Manual Entry':type==='gps-v2'?'Saved GPS Summary':'Unknown Source')+' '+num).join(' · '):'No matching records')
  +'. Distance and duration reflect recorded activities, not a sum of regional reference values.';
 setText(host,'[data-report-mode]',period?'Date Range':'Single Activity');
 setText(host,'[data-metric1-name]',period?'Activity Count':'Activity Type');
 setText(host,'[data-metric2-name]',period?'Total Distance':'Distance');
 setText(host,'[data-metric3-name]',period?'Activity Duration':'Activity Duration');
 setText(host,'[data-metric4-name]',period?'Selected Period':'Average Pace');
 if(single)setText(host,'[data-metric1-val]',activity(single));
 if(period){
  setText(host,'[data-metric1-val]',total+' activities');
  setText(host,'[data-metric4-val]',periodDays+' days');
 }
 setText(host,'[data-report-overview-label]',period?'Activities in the Selected Period':'Activity Summary');
 setText(host,'[data-activity-source]',sourceLabel);
 setText(host,'[data-rof-heading]',hasRof?'Before/After Fatigue (ROF-J: '+date(rof.date)+')':'Before/After Fatigue (ROF-J)');
 const rofMeaning='These 0–10 scores are self-reported; 0 is valid, and unanswered is —. Before/after are response categories. Neither entry timestamps nor recalled assessment times verify actual chronological order relative to activity. The application does not infer a within-activity temporal change or directly measured physical load.';
 const rofNote=hasRof?englishReportRecordContext(rof,mode)+'. '+rofMeaning:
  period?'No manual record in this period contains valid responses for both categories. This is not a period average.':'The selected record does not contain valid responses for both before/after categories.';
 setText(host,'[data-source-note="rof"]',rofNote);
 const lifeValue=life?((period?'Latest daily-condition record in the period (not a period average) / ':'')+
  'Date: '+date(life.date)+' / Reported condition: '+(life.feeling||'Not Recorded')+' / '+
  (Number.isInteger(life.sleepMinutes)?(life.sleepSource==='clock'?'Time in Bed':'Recorded Duration')+': '+Math.floor(life.sleepMinutes/60)+' h '+String(life.sleepMinutes%60).padStart(2,'0')+' min':'Duration Not Recorded'))
  :'No matching daily-condition record was found.';
 setText(host,'.cp-wellbeing[data-output-section="condition"] p',lifeValue);
 setText(host,'.cp-wellbeing[data-output-section="condition"] h4',"User's Daily-Condition Record");
 const info=count?count+'/12 regions calculated. These values are normalized to 100 against each region\'s own source-study baseline and do not indicate injury risk.':
  scienceRun?'No applicable value for the 12 regions under this activity type or the source-study speed range.':
  'No matching saved single-type manual activity is available; the 12 regional values cannot be displayed.';
 setText(host,'[data-output-section="body"] .cp-info-note',englishReportRecordContext(scienceRun,mode)+'. '+info);
 setText(host,'[data-source-note="course"]',englishReportRecordContext(memo,mode)+'. Running conditions and equipment belong to this record.');
 const flags=host.querySelectorAll('.cp-condition strong');
 if(flags[0]&&flags[0].textContent==='未記録')flags[0].textContent='Not Recorded';
 // Course and shoe names are original user-authored data, even if they exactly
 // match Japanese UI text. A missing value may be shown as Not Recorded.
 if(flags[1]&&!memo?.courseName)flags[1].textContent='Not Recorded';
 if(flags[2]&&!memo?.shoeName)flags[2].textContent='Not Recorded';
 setText(host,'.cp-preview-top p','A4 Portrait · '+(period?4:3)+' page(s) before content-dependent overflow');
 for(const kind of ['purpose','observation','question']){
  const field=host.querySelector('#cp-'+kind),target=host.querySelector('[data-report-'+kind+']');
  if(target&&!field?.value.trim())target.textContent='(Not Entered)';
 }
 setText(host,'.cp-demo-banner',sourceErrors?.length?
  'Some saved data could not be read: '+sourceErrors.join(' / '):
  'Prepared from locally saved records and user entries. Only selected information is included in the printout/PDF.');
 translateConsultationFixedNodes(host);
}
