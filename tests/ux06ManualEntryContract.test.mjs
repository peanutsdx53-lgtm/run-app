/* UX06: occurrence dates and blank numeric entry remain distinct from observed zero.
 * Confirm the existing save and science contracts; never create new sample records here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {manualPage,initialCourseUi} from '../ui/recordExperience.js';
import {checkManualRequiredFields} from '../ui/recordDraftReview.js';
import {reviewView} from '../ui/recordReviewExperience.js';
import {translateUiText} from '../ui/englishUi.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const draft=()=>({date:'2026-11-19',distance:'',hours:'',minutes:'',seconds:'',
 activityGait:'UNKNOWN',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN',
 runningFormat:'UNKNOWN',stepsProvenance:'UNKNOWN'});
const view=(d,kind='run')=>manualPage({recordDraft:d,recordType:kind,recordCourseUi:initialCourseUi(d)});

test('UX-024: blank values are not zero, zero is rejected for manual-run save',()=>{
 const d=draft(),html=view(d);
 assert.match(html,/data-draft="distance"[^>]*placeholder="例：5\.00" value=""/);
 assert.match(html,/data-draft="minutes"[^>]*placeholder="例：30" value=""/);
 assert.doesNotMatch(html,/placeholder="0(?:\.00|\.0)"/);
 assert.doesNotMatch(html,/rv-required-progress|要入力：/,'do not restore rejected duplicate warnings');
 const zero={...d,distance:'0',minutes:'0',activityGait:'RUNNING'};
 assert.match(view(zero),/data-draft="distance"[^>]*value="0"/);
 assert.equal(checkManualRequiredFields(zero).ok,false);
 const valid={...d,distance:'5',minutes:'30',activityGait:'WALK'};
 assert.equal(checkManualRequiredFields(valid).ok,true);
 assert.match(reviewView(valid,{source:'manual',recordType:'run'}),/data-manual-run-save(?![^>]*disabled)/);
 assert.match(reviewView(zero,{source:'manual',recordType:'run'}),/data-manual-run-save[^>]*disabled/);
});

test('UX-025: occurrence date is named explicitly without changing stored date',()=>{
 const d=draft(),run=view(d),rest=view(d,'rest');
 assert.match(run,/<span>活動日<\/span>/);
 assert.match(run,/aria-label="活動日" data-draft="date"/);
 assert.match(rest,/<span>休養日<\/span>/);
 assert.match(rest,/aria-label="休養日" data-draft="date"/);
 assert.match(run,/value="2026-11-19"/);
 assert.match(run,/入力した日と異なる場合は変更してください/);
 assert.equal(translateUiText('活動日'),'Activity Date');
 assert.equal(translateUiText('休養日'),'Rest Day');
 assert.match(translateUiText('日付は活動・休養を行った日です。入力した日と異なる場合は変更してください。'),/different day/);
});

test('UX-026/027/039: responsive labels, three explicit activities, original atomic save',()=>{
 const d=draft();
 assert.equal(translateUiText('例：5.00'),'e.g. 5.00');
 assert.equal(translateUiText('例：30'),'e.g. 30');
 const css=read('ui/recordExperience.css'),app=read('app.js');
 assert.ok(css.includes('grid-template-columns:max-content minmax(0,1fr)'));
 assert.ok(css.includes('repeat(auto-fit,minmax(min(100%,9rem),1fr))'));
 assert.match(app,/if\(mentalSaveBusy\)return;/);
 assert.match(app,/manualSaveIdentity\(\)/);
 assert.match(app,/manualRunLock\.withManualRunWriteLock\(\(\)=>canonical\.mutate/);
 for(const activity of ['RUNNING','JOGGING','WALK'])
  assert.match(view(d),new RegExp('data-manual-gait="'+activity+'"'));
 assert.match(view({...d,activityGait:'JOGGING'}),/data-manual-gait="JOGGING" aria-pressed="true"/);
 assert.doesNotMatch(view(d),/rv-gait-hint|活動種目が未選択のため保存できません/);
 const gen='20261123-ux07-course-clarity-v1',shell='20261124-ux14-explore-responsive-v1',resultVersion='20261123-ux11-result-source-v1',index=read('index.html'),sw=read('sw.js');
 for(const [s,url] of [
  [app,'recordExperience.js?v='+gen],[index,'recordExperience.css?v='+gen],
  [index,'app.js?v='+shell],[sw,'runload-ui-next-shell-'+shell],
  [sw,'recordExperience.js?v='+gen],[sw,'recordExperience.css?v='+gen],
  [sw,'app.js?v='+shell]
 ])assert.ok(s.includes(url),'PWA required active URL missing: '+url);
 assert.match(read('.github/workflows/run-app-regression.yml'),/node tests\/ux06ManualEntryBrowser\.mjs/);
});
