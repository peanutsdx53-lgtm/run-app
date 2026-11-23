import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {manualPage,initialCourseUi} from '../ui/recordExperience.js';
import {gaitPage,gaitValidation} from '../ui/gaitExperience.js';
import {ENGLISH_FINAL_RECORDING} from '../ui/englishFinalRecording.js';
import {consultationTargetLabel} from '../ui/consultationExperience.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const draft={date:'2026-11-22',distance:'',minutes:'',activityGait:'UNKNOWN',
 gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN',stepsProvenance:'UNKNOWN'};
const state=(value=draft,type='run')=>({recordType:type,recordDraft:value,recordCourseUi:initialCourseUi(value)});

test('Manual basic entry omits missing-field banner in JA/EN while preserving field-level required status',()=>{
 for(const d of [draft,{...draft,distance:'5'}, {...draft,distance:'5',minutes:'30',activityGait:'RUNNING'}]){
  const html=manualPage(state(d));
  assert.doesNotMatch(html,/要入力：|rv-required-progress/);
  assert.match(html,/data-required-field="distance"/);
  assert.match(html,/data-required-field="time"/);
  assert.match(html,/data-required-field="activity"/);
  assert.match(html,/aria-required="true"/);
  assert.match(html,/class="rv-required-heading">必須/);
 }
 assert.doesNotMatch(manualPage(state(draft,'rest')),/要入力：|rv-required-progress/);
});

test('Gait message nodes translate individually, preserving validation decisions',()=>{
 const js=read('ui/gaitExperience.js');
 assert.match(js,/message=>`<span data-g4-message>/);
 const fail=gaitValidation({...draft,runningFormat:'RUN_WALK'});
 assert.ok(fail.errors.length>=2);
 const markup=gaitPage({...draft,runningFormat:'RUN_WALK'});
 assert.match(markup,/data-g4-apply/);
 assert.equal(ENGLISH_FINAL_RECORDING['入力内容を反映'],'Apply This Entry');
 assert.ok(ENGLISH_FINAL_RECORDING['取得方法を選択していますが、歩数は未入力です。']);
 assert.match(ENGLISH_FINAL_RECORDING['例：向かい風が強かった。日陰は涼しかった。'],/Strong headwind/);
});

test('System-generated Consultation options are English in English mode, without touching record IDs',()=>{
 const r={id:'record-id-1',date:'2026-11-20',source:'manual',draft:{activityGait:'RUNNING'}};
 assert.equal(consultationTargetLabel(r,'en'),'2026/11/20  Running (Manual Entry)');
 assert.equal(consultationTargetLabel(r,'ja'),'2026/11/20　ランニング（手入力）');
 const gps={id:'gps-1',date:'2026-11-21',source:'gps-v2',activity:'WALK'};
 assert.equal(consultationTargetLabel(gps,'en'),'2026/11/21  Walking (Saved GPS Summary)');
});

test('Selected bright controls use dark ink, neutral controls stay pale, and native GPS picker is localized',()=>{
 const css=read('ui/buttonContrastSystem.css');
 for(const selector of ['.gait-v4 .g4-choice button[aria-pressed="true"]',
   '.environment-v4 .e4-chip[aria-pressed="true"]',
   '.record-v3.rv-course .rv-surface-pick button[aria-pressed="true"]',
   '.record-v3.rv-course .rv-surface-tile.is-selected',
   '.lr-root .lr-action:not(.lr-secondary):not(.lr-outline):not(:disabled)']){
  assert.ok(css.includes(selector),selector);
 }
 assert.match(css,/color:var\(--rl-button-bright-text\)!important/);
 assert.match(css,/\.gait-v4 \.g4-choice button\{[\s\S]*?white-space:normal/);
 assert.ok(css.includes('.rv4-page .rv4-done'));
 assert.ok(css.includes('.cx-page .cx-tab[aria-pressed="true"]'));
 assert.ok(css.includes('.cp-app .cp-mobile-switch button.active'));
 assert.match(css,/\.gps-history-backup-actions input\[data-gps-v2-backup-file\]\{/);
 assert.match(css,/clip-path:inset\(50%\)/);
 assert.doesNotMatch(css,/(?:^|\n)\s*button\s*\{\s*color:/);
 const history=read('ui/historyExperience.js');
 assert.match(history,/\.hx-source-controls button.active/);
 assert.match(history,/root\.querySelector\('style\[data-history-inline-styles\]'\)\.textContent/);
});

test('The revision is aligned across active shell and PWA; science and English dictionary are unchanged',()=>{
 const html=read('index.html'),app=read('app.js'),sw=read('sw.js');
 const ver='20261122-record-return-v1',prior='20261122-mobile-controls-v1',previous='20261122-gait-learning-type-v1',shell='20261124-ux12-history-discovery-v1',cacheGeneration='20261124-ux12-history-discovery-v1';
 for(const [src,fragment] of [[html,'ui/buttonContrastSystem.css?v='+previous],
  [html,'ui/recordReturnActions.css?v=20261123-ux09-environment-states-v1'],
  [html,'app.js?v='+shell],[app,'recordExperience.js?v=20261123-ux07-course-clarity-v1'],
  [app,'historyExperience.js?v='+shell],[app,'gaitExperience.js?v='+ver],[app,'learningExperience.js?v='+previous],[app,'consultationExperience.js?v='+prior],
  [app,'bodyContextExperience.js?v=20261123-ux08-rof-body-clarity-v1'],[app,'environmentExperience.js?v=20261123-ux09-environment-states-v1'],[app,'rofExperience.js?v=20261123-ux08-rof-body-clarity-v1'],
  [sw,'runload-ui-next-shell-'+cacheGeneration],[sw,'ui/gaitExperience.js?v='+ver],[sw,'ui/recordReturnActions.css?v=20261123-ux09-environment-states-v1']])
  assert.ok(src.includes(fragment),'missing active '+fragment);
 assert.ok(!app.includes('localStorage.clear()'));
 assert.ok(app.includes('resultExperience.js?v=20261123-ux11-result-source-v1'));
});
