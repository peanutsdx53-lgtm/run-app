import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gaitPage,gaitValidation} from '../ui/gaitExperience.js';
import {mountLearning} from '../ui/learningExperience.js';
import {ENGLISH_SURFACE_REMAINDERS} from '../ui/englishSurfaceRemainders.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const plainDraft={steps:'',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN',
 distance:'',minutes:'',activityGait:'RUNNING'};

test('both Gait choice groups render two actionable options followed by Unknown',()=>{
 const markup=gaitPage(plainDraft);
 const source=[...markup.matchAll(/data-g4-source="([^"]+)"/g)].map(m=>m[1]);
 const format=[...markup.matchAll(/data-g4-format="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(source,['DEVICE_MEASURED','ESTIMATED','UNKNOWN']);
 assert.deepEqual(format,['CONTINUOUS_RUN','RUN_WALK','UNKNOWN']);
 assert.match(markup,/data-g4-source="UNKNOWN" aria-pressed="true"/);
 assert.match(markup,/data-g4-format="UNKNOWN" aria-pressed="true"/);
 const css=read('ui/buttonContrastSystem.css');
 assert.match(css,/\.gait-v4 \.g4-choice button:last-child\{\s*grid-column:1\/-1/);
 assert.match(css,/\.gait-v4 \.g4-choice\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/::-webkit-inner-spin-button/);
 assert.match(markup,/data-draft="steps" type="number"/);
});

test('changing option visual order does not affect running/walking input validity',()=>{
 const old={...plainDraft,runningFormat:'RUN_WALK',distance:'6',minutes:'33'};
 assert.ok(gaitValidation(old).errors.length>0,'run/walk requires segment distance/time');
 assert.ok(gaitValidation({...old,runWalkRunningDistanceKm:'3',runWalkRunningDurationMinutes:'17'}).valid);
 assert.equal(gaitValidation({...plainDraft,runningFormat:'CONTINUOUS_RUN'}).valid,true);
});

test('Learning catalogue has a left back-to-Home and lesson headers back to Learning',()=>{
 const host={innerHTML:''};
 mountLearning(host,new URLSearchParams());
 assert.match(host.innerHTML,/class="lr-page-heading"><a class="lr-page-back" href="#\/home" aria-label="ホームに戻る">‹<\/a><h1>学習<\/h1>/);
 const code=read('ui/learningExperience.js');
 assert.match(code,/backHref=isLesson\?'#\/learning':'#\/home'/);
 assert.match(code,/if\(selected\)scope\.querySelector\(':scope > \.lr-back'\)\?\.remove\(\)/);
 assert.equal(ENGLISH_SURFACE_REMAINDERS['学習の一覧へ戻る'],'Back to Learning');
 const css=read('ui/buttonContrastSystem.css');
 assert.match(css,/\.lr-root \.lr-page-heading>\.lr-page-back/);
 assert.match(css,/grid-template-columns:44px minmax\(0,1fr\) 44px/);
});

test('Body button family uses the shared typeface and intentional weight hierarchy',()=>{
 const body=read('ui/bodyContextExperience.css');
 const system=read('ui/buttonContrastSystem.css');
 assert.match(body,/\.cx-page\{font-family:system-ui/);
 assert.match(system,/\.cx-page :is\(button,input,textarea,select\)\{font-family:inherit!important\}/);
 assert.match(system,/\.cx-page :is\(\.cx-tab,\.cx-picker-trigger,\.cx-picker-option/);
 assert.match(system,/\.cx-page \.cx-apply\{font-size:clamp\(13px,2\.8vw,15px\)/);
});

test('current bilingual mobile assets are versioned and cached consistently',()=>{
 const index=read('index.html'),app=read('app.js'),sw=read('sw.js'),
  english=read('ui/englishUi.js');
 const v='20261122-record-return-v1',previous='20261122-gait-learning-type-v1',shell='20261125-ux16-19-batch-v1',cacheGeneration='20261125-ux16-19-batch-v1',resultVersion='20261123-ux11-result-source-v1';
 for(const [content,asset] of [
  [index,'buttonContrastSystem.css?v='+previous],
  [index,'app.js?v='+shell],
  [index,'ui/recordReturnActions.css?v=20261123-ux09-environment-states-v1'],
  [app,'gaitExperience.js?v='+v],
  [app,'learningExperience.js?v='+previous],
  [app,'englishUi.js?v=20261125-ux16-19-batch-v1'],
  [english,'englishSurfaceRemainders.js?v='+shell],
  [sw,'runload-ui-next-shell-'+cacheGeneration],
  [sw,'ui/learningExperience.js?v='+previous],
  [sw,'ui/gaitExperience.js?v='+v],
  [sw,'ui/buttonContrastSystem.css?v='+previous]
 ])assert.ok(content.includes(asset),'missing current version '+asset);
 assert.doesNotMatch(app,/localStorage\.clear\(\)/);
});
