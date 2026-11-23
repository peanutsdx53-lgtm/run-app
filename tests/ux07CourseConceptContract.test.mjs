/* UX07: display-only course clarification must preserve contract and English locale.
 * This is not a substitute for real-browser 32-condition/5-segment testing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coursePage,courseSummary,courseReadiness,initialCourseUi} from '../ui/recordExperience.js';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const draft=()=>({courseName:'',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN',primarySurface:'',
 upPercent:'',downPercent:'',date:'2026-11-19',distance:'5',minutes:'30',activityGait:'JOGGING'});
const render=(d,ui=initialCourseUi(d))=>coursePage({recordDraft:d,recordCourseUi:ui},ui,{ok:true,records:[]});
const pairs=[
 ['保存コース・今回の入力','Saved Courses and This Entry'],
 ['保存済みコースを今回の入力に使う','Use a Saved Course for This Entry'],
 ['「条件を反映して記録に戻る」は今回の記録に反映する操作です。次回も再利用する保存コースの保存・更新とは別の操作です。','“Apply Conditions & Return” updates this activity entry. Saving or updating a reusable course for later is a separate action.'],
 ['保存コース作成時のみ必須・今回の走行記録では任意','Required to Save a Course · Optional for This Activity'],
 ['今回の走行条件','Conditions for This Activity'],
 ['坂道・路面は今回の記録に反映します。割合を設定する場合は、入力した値の合計を確認してください。','Uphill, downhill, and surface choices apply to this entry. When entering percentages, check the total.'],
 ['次回も再利用する場合だけ保存コースとして残す','Save as a Reusable Course Only If Needed Later']
];
test('UX-029/031: saved course, current entry and optional course name remain distinct',()=>{
 const d=draft(),html=render(d);
 for(const [ja] of pairs)assert.ok(html.includes(ja),'missing contextual course copy: '+ja);
 assert.match(html,/data-draft="courseName"/);
 assert.doesNotMatch(html,/data-draft="courseName"[^>]*required/);
 assert.match(html,/data-course-save/);
 assert.match(html,/data-rv-apply/);
 assert.equal(d.courseName,'','display must not mutate record fields');
});
test('UX-029/031: each new Japanese display phrase has explicit offline English translation',()=>{
 for(const [ja,en] of pairs)assert.equal(translateUiText(ja),en,ja);
});
test('UX-030: five section percentages, missing versus zero and cap stay unchanged',()=>{
 const d={...draft(),gradeMode:'SECTIONS'};
 for(let i=0;i<5;i++){d['sectionShare'+i]='20';d['sectionDirection'+i]='FLAT';d['sectionGrade'+i]='';d['sectionSurface'+i]='UNKNOWN';}
 const ui=initialCourseUi(d);assert.equal(ui.sections,5);
 const html=render(d,ui);
 assert.equal((html.match(/class="rv-section-row"/g)||[]).length,5);
 assert.match(html,/data-rv-add disabled/);
 assert.equal(courseReadiness(d,ui).length,0);
 const incomplete={...d,sectionShare4:''};
 assert.ok(courseReadiness(incomplete,ui).some(s=>s.includes('合計を100%')));
 assert.match(render(incomplete,ui),/区間割合 4 \/ 5 件入力/);
 const zero={...d,sectionShare4:'0'};assert.ok(courseReadiness(zero,ui).length>0);
 assert.match(render(zero,ui),/割合 0%/);
});
test('UX-032: hidden fields are not erased; only chosen input modes drive current summary/validation',()=>{
 const d={...draft(),gradeMode:'FLAT',surfaceMode:'SINGLE',primarySurface:'paved',
  upPercent:'90',downPercent:'90',surfacetrail:'85',surfacepaved:'15'};
 const before=JSON.stringify(d),ui=initialCourseUi(d);
 assert.equal(courseSummary(d,ui).slope,'ほぼ平坦');
 assert.equal(courseSummary(d,ui).surface,'舗装路');
 assert.deepEqual(courseReadiness(d,ui),[]);
 render(d,ui);
 assert.equal(JSON.stringify(d),before,'presentation cannot rewrite hidden draft values');
 const summary={...d,gradeMode:'SUMMARY'};
 assert.ok(courseReadiness(summary,ui).length>0,'invalid active summary must not be silently accepted');
});
test('UX-07: offline boot uses new shell and dictionary imports; old immutable URLs are not pinned',()=>{
 const ver='20261123-ux07-course-clarity-v1',app=read('app.js'),html=read('index.html'),sw=read('sw.js'),en=read('ui/englishUi.js');
 for(const [source,url] of [[app,'recordExperience.js?v='+ver],[app,'englishUi.js?v='+ver],
  [html,'app.js?v='+ver],[html,'recordExperience.css?v='+ver],
  [sw,'runload-ui-next-shell-'+ver],[sw,'app.js?v='+ver],
  [sw,'recordExperience.js?v='+ver],[sw,'englishFinalRecording.js?v='+ver],
  [en,'englishFinalRecording.js?v='+ver]])assert.ok(source.includes(url),'missing versioned URL: '+url);
 assert.doesNotMatch(sw,/20261123-ux06-manual-clarity-v1/);
});
