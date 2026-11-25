/* UX10: a shortcut inside the pre-save review is navigation only.
 * It must not obscure mandatory validation, mutate a draft, or alter privacy
 * and storage contracts for manual/GPS/rest records.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewView} from '../ui/recordReviewExperience.js';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const draft=()=>({date:'2026-11-19',distance:'6',hours:'',minutes:'42',seconds:'',
 activityGait:'RUNNING',rofBefore:0,rofAfter:null,stepsProvenance:'UNKNOWN',steps:'',
 gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN',runningFormat:'UNKNOWN',
 temperatureC:'0',environmentNote:'本人入力',bodyObservation:'',shoeName:'',memo:''});
test('UX038 manual review has one focusable route-neutral shortcut to original saving scope',()=>{
 const d=draft(),before=JSON.stringify(d),html=reviewView(d,{source:'manual',recordType:'run'});
 assert.equal(JSON.stringify(d),before,'pure review must never change user data');
 assert.equal((html.match(/data-review-jump-scope/g)||[]).length,1);
 assert.equal((html.match(/id="rr-save-scope"/g)||[]).length,1);
 assert.match(html,/class="rr-save-target" id="rr-save-scope" tabindex="-1"/);
 assert.match(html,/data-review-jump-scope aria-controls="rr-save-scope">保存する内容と出所を確認する/);
 assert.match(html,/data-pre-save-scope data-save-source="manual"/);
 assert.match(html,/記録の出所<\/dt><dd>本人が手入力/);
 assert.match(html,/保存する内容<\/dt>/);
 assert.match(html,/位置情報を含む詳細<\/dt><dd data-route-consent-status>保存しない/);
 assert.match(html,/保存内容と注意点<\/summary>/);
 assert.match(html,/保存前の下書き/);
 assert.match(html,/data-manual-run-save(?![^>]*disabled)/);
 assert.equal((html.match(/data-review-link=/g)||[]).length,5);
 assert.equal((html.match(/data-required-status=/g)||[]).length,3);
});
test('UX038 missing and zero remain invalid; direct jump neither unlocks save nor hides the warning',()=>{
 const invalid={...draft(),distance:'0',hours:'',minutes:'0',seconds:'',activityGait:'UNKNOWN'};
 const html=reviewView(invalid,{source:'manual',recordType:'run'});
 assert.match(html,/data-review-jump-scope/);
 assert.match(html,/保存前に入力が必要な項目があります/);
 assert.match(html,/id="rr-review-validation"[^>]*role="alert"/);
 assert.match(html,/data-manual-run-save aria-describedby="rr-review-validation"[^>]*disabled/);
 assert.match(html,/data-required-status="distance" data-required-ok="false"/);
 assert.match(html,/data-required-status="time" data-required-ok="false"/);
 assert.match(html,/data-required-status="activity" data-required-ok="false"/);
});
test('UX038 GPS preview is not misstated as a saved record; rest remains separate',()=>{
 const gps=reviewView({...draft(),memo:'person authored'},{source:'gps',recordType:'run'});
 assert.match(gps,/data-review-jump-scope aria-controls="rr-save-scope">保存可否と出所を確認する/);
 assert.match(gps,/data-pre-save-scope data-save-source="gps"/);
 assert.match(gps,/GPSでの記録はまだ保存できません/);
 assert.match(gps,/data-manual-run-save[^>]*disabled/);
 assert.doesNotMatch(gps,/>6\.00</);
 const rest=reviewView({date:'2026-11-19',memo:'休み'},{source:'manual',recordType:'rest'});
 assert.equal((rest.match(/data-review-link=/g)||[]).length,2);
 assert.match(rest,/data-rest-day-save/);
 assert.match(rest,/本人が手入力/);
 assert.doesNotMatch(rest,/class="rr-metrics"/);
});
test('UX038 long user notes stay escaped and not expanded into navigation labels',()=>{
 const long='個人的な観察'.repeat(90);
 const d={...draft(),bodyObservation:long,shoeName:'シューズ',memo:'人の言葉'};
 const h=reviewView(d,{source:'manual',recordType:'run'});
 assert.match(h,/全文は編集画面で確認/);
 assert.equal(h.includes(long),false,'long notes preview stays compact');
 assert.match(h,/data-user-authored/);
 assert.match(h,/data-review-jump-scope/);
 assert.doesNotMatch(h,/<script>|onclick=|href="#rr-save-scope"/i);
});
test('UX038 click action only focuses existing scope and leaves all save handlers unchanged',()=>{
 const app=read('app.js'),css=read('ui/recordReviewExperience.css');
 assert.match(app,/event\.target\.closest\('\[data-review-jump-scope\]'\)/);
 assert.match(app,/app\.querySelector\('#rr-save-scope'\)/);
 assert.match(app,/target\.scrollIntoView\(\{block:'start',behavior:'instant'\}\)/);
 assert.match(app,/target\.focus\(\{preventScroll:true\}\)/);
 assert.match(css,/\.rr-jump-scope:focus-visible/);
 assert.match(css,/\.rr-save-target:focus-visible/);
 assert.match(app,/manualRunLock\.withManualRunWriteLock/);
 assert.match(app,/data-manual-run-save/);
});
test('review entry renders once after canonical refresh; focus correction is scoped and does not save',()=>{
 const app=read('app.js');
 const entry=app.slice(app.indexOf('if(event.target.closest("[data-demo-save]"))'),app.indexOf('if(event.target.closest(".rr-date-edit")'));
 assert.ok(entry.includes('location.hash="#/record-review";return;'));
 assert.doesNotMatch(entry,/\brender\(\)/);
 const focus=app.slice(app.indexOf('function keepReviewControlVisible(target)'),app.indexOf('app.addEventListener("click",async(event)=>{'));
 assert.match(focus,/currentPage\(\)!=='record-review'/);
 assert.match(focus,/document.activeElement!==target/);
 assert.match(focus,/getComputedStyle\(nav\).position!=='fixed'/);
 assert.match(focus,/nav.getBoundingClientRect\(\)/);
 assert.match(focus,/window.scrollBy/);
 assert.doesNotMatch(focus,/\b(?:mutate|saveManualRun|render)\(/);
});
test('UX038 bilingual shortcut and active offline review assets match the current shell',()=>{
 assert.equal(translateUiText('保存する内容と出所を確認する'),'Review What Will Be Saved and Its Source');
 assert.equal(translateUiText('保存可否と出所を確認する'),'Review Save Availability and Source');
 assert.equal(translateUiText('端末内に保存'),'Save Destination: This Device');
 const ver='20261123-ux11-result-source-v1',shell='20261125-ux16-19-batch-v1';
 const app=read('app.js'),index=read('index.html'),sw=read('sw.js'),en=read('ui/englishUi.js');
 const items=[
  [app,'recordReviewExperience.js?v='+ver],[app,'englishUi.js?v='+shell],
  [index,'recordReviewExperience.css?v='+ver],[index,'app.js?v='+shell],
  [sw,'runload-ui-next-shell-'+shell],[sw,'recordReviewExperience.js?v='+ver],
  [sw,'recordReviewExperience.css?v='+ver],[sw,'englishFinalRecording.js?v='+ver],
  [en,'englishFinalRecording.js?v='+ver],
  [en,'englishFinalGps.js?v='+ver],[sw,'englishFinalGps.js?v='+ver]
 ];
 for(const [s,token] of items)assert.ok(s.includes(token),'missing active/offline URL '+token);
 assert.ok(app.includes('environmentExperience.js?v=20261123-ux09-environment-states-v1'));
});


test('review focus correction cannot scroll during pointer activation or stale animation frames',()=>{
 const app=read('app.js');
 const focus=app.slice(app.indexOf('const reviewPointers=new Set();'),app.indexOf('app.addEventListener("click",async(event)=>{'));
 assert.ok(focus.includes("window.addEventListener('pointerdown'"));
 assert.ok(focus.includes("window.addEventListener('pointerup'"));
 assert.ok(focus.includes("window.addEventListener('pointercancel'"));
 assert.ok(focus.includes("window.addEventListener('mousedown'"));
 assert.ok(focus.includes("window.addEventListener('mouseup'"));
 assert.ok(focus.includes("if(reviewPointerBusy()||currentPage()!=='record-review'"));
 assert.ok(focus.includes('epoch===reviewFocusEpoch'));
 assert.ok(focus.includes('reviewFocusEpoch++'));
});
