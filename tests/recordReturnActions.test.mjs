import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coursePage,initialCourseUi} from '../ui/recordExperience.js';
import {gaitPage,gaitValidation} from '../ui/gaitExperience.js';
import {rofPage,createRofUiState} from '../ui/rofExperience.js';
import {environmentPage,newEnvironmentUi,toggleWeather,environmentSelectionState,applyEnvironmentSelections} from '../ui/environmentExperience.js';
import {renderScreen,makeUi} from '../ui/bodyContextExperience.js';
import {ENGLISH_FINAL_RECORDING} from '../ui/englishFinalRecording.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const course={gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN',courseName:'',upPercent:'',downPercent:''};
const recordFooter=/class="[^"]*\brl-record-footer\b[^"]*"/;
const recordPrimary=/class="[^"]*\brl-record-return\b[^"]*"/;

test('all five optional screens use one primary return action after their last card',()=>{
 const pages={
  course:coursePage({recordDraft:course,recordCourseUi:initialCourseUi(course)},initialCourseUi(course)),
  rof:rofPage({rofBefore:null,rofAfter:null,date:'2026-11-22'},createRofUiState()),
  gait:gaitPage({steps:'',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN'}),
  environment:environmentPage({},newEnvironmentUi()),
  body:renderScreen({},makeUi())
 };
 for(const [name,html] of Object.entries(pages)){
  assert.match(html,recordFooter,name+' missing shared footer');
  assert.match(html,recordPrimary,name+' missing shared primary action');
  assert.equal((html.match(/\brl-record-return\b/g)||[]).length,1,name+' has multiple primary actions');
  const footer=html.lastIndexOf('rl-record-footer');
  assert.ok(footer>html.indexOf('rv-head'),name+' must place footer below its form');
 }
 assert.match(pages.course,/data-rv-apply/);
 assert.match(pages.course,/条件を反映して記録に戻る/);
 assert.match(pages.course,/data-course-save/);
 assert.doesNotMatch(pages.course,/rv-commit-group--apply|今回の記録に使う/);
 for(const name of ['rof','gait','environment','body'])assert.match(pages[name],/記録に戻る/);
 assert.match(pages.rof,/rv4-aside[\s\S]*?<\/aside><\/div><\/section><footer class="rv4-next-actions rl-record-footer"/);
 assert.match(pages.gait,/data-g4-apply/);
 assert.match(pages.environment,/data-e4-done/);
 assert.match(pages.body,/data-apply/);
});

test('ROF-J GPS branches preserve their original navigation destinations',()=>{
 const draft={rofBefore:null,rofAfter:null,date:'2026-11-22'},ui=createRofUiState();
 const gpsBefore=rofPage(draft,ui,{gps:true});
 assert.match(gpsBefore,/class="rv4-done rl-record-return" href="#\/measurement"/);
 assert.match(gpsBefore,/GPSに戻る/);
 ui.phase='after';
 const gpsAfter=rofPage(draft,ui,{gps:true});
 assert.match(gpsAfter,/class="rv4-done rl-record-return" href="#\/gps-review"/);
});

test('Environment warns before leaving temporary weather and never silently saves it',()=>{
 const draft={temperatureC:'',environmentNote:'Existing user note'},ui=newEnvironmentUi();
 assert.equal(environmentSelectionState(draft,ui).status,'none');
 const html=environmentPage(draft,ui);
 assert.match(html,/data-e4-back/);
 assert.match(html,/data-e4-leave-warning hidden/);
 assert.match(html,/data-e4-apply-return/);
 assert.match(html,/data-e4-discard-return/);
 assert.ok(html.indexOf('data-e4-leave-warning')<html.indexOf('data-e4-done'),'warning appears before return');
 toggleWeather(ui,'SUN');
 assert.equal(environmentSelectionState(draft,ui).status,'pending');
 assert.equal(draft.environmentNote,'Existing user note');
 const result=applyEnvironmentSelections(draft,ui);
 assert.equal(result.ok,true);
 assert.equal(environmentSelectionState(draft,ui).status,'applied');
 assert.match(draft.environmentNote,/Existing user note\n【本人申告の環境選択】天候：晴れ/);
 const app=read('app.js');
 assert.match(app,/event\.target\.closest\('\[data-e4-done\],\[data-e4-back\]'\)/);
 assert.match(app,/event\.preventDefault\(\)[\s\S]*?\[data-e4-leave-warning\]/);
 assert.match(app,/event\.target\.closest\('\[data-e4-apply-return\]'\)/);
 assert.match(app,/location\.hash=state\.recordReviewReturn\?'#\/record-review':'#\/record'/);
});

test('Gait validation and Body draft fields remain intact while return names change',()=>{
 const draft={distance:'5',minutes:'30',runningFormat:'RUN_WALK',runWalkRunningDistanceKm:'',runWalkRunningDurationMinutes:''};
 assert.equal(gaitValidation(draft).valid,false);
 assert.equal(gaitValidation({...draft,runWalkRunningDistanceKm:'3',runWalkRunningDurationMinutes:'20'}).valid,true);
 const body=renderScreen({bodyObservation:'a',shoeName:'b',memo:'c'},makeUi());
 for(const k of ['bodyObservation','shoeName','memo'])assert.ok(body.includes('data-draft="'+k+'"'));
 const app=read('app.js');
 assert.ok(app.includes("else if(obj.matches('[data-apply]')){location.hash=state.recordReviewReturn?'#/record-review':'#/record'"));
 assert.ok(app.includes('if(check.valid){location.hash=state.recordReviewReturn?"#/record-review":"#/record"'));
});

test('Body-like accent button is shared, responsive, and translated in both languages',()=>{
 const css=read('ui/recordReturnActions.css');
 assert.match(css,/linear-gradient\(100deg,#27b2d6,#11c6b5\)/);
 assert.match(css,/color:#052939!important/);
 assert.match(css,/width:min\(100%,320px\)!important/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/width:100%!important/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/\.e4-leave-warning\[hidden\]\{display:none!important\}/);
 assert.ok(css.includes('.e4-bottom:has(.e4-leave-warning:not([hidden]))>.e4-done'));
 assert.equal(ENGLISH_FINAL_RECORDING['記録に戻る'],'Back to Recording');
 assert.equal(ENGLISH_FINAL_RECORDING['条件を反映して記録に戻る'],'Apply Conditions & Return');
 assert.equal(ENGLISH_FINAL_RECORDING['反映して戻る'],'Apply & Return');
 assert.equal(ENGLISH_FINAL_RECORDING['反映せず戻る'],'Return Without Applying');
 const idx=read('index.html'),sw=read('sw.js'),app=read('app.js');
 const ver='20261122-record-return-v1',shell='20261124-ux14-explore-responsive-v1';
 assert.ok(idx.includes('ui/recordReturnActions.css?v=20261123-ux09-environment-states-v1'));
 assert.ok(sw.includes('ui/recordReturnActions.css?v=20261123-ux09-environment-states-v1'));
 assert.ok(sw.includes('runload-ui-next-shell-'+shell));
 assert.ok(app.includes('recordExperience.js?v=20261123-ux07-course-clarity-v1'),'active manual entry module');
 assert.ok(app.includes('gaitExperience.js?v='+ver),'gait module remains unchanged');
 for(const module of ['rofExperience','bodyContextExperience'])
  assert.ok(app.includes(module+'.js?v=20261123-ux08-rof-body-clarity-v1'),'app must load active '+module);
});
