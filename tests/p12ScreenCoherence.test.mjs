import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cacheVersion='20261112-cleanup8-final-v3';

test('P12: Home guide, learning header, History and Exploration controls preserve behavior',()=>{
 const home=read('app.js');
 assert.ok(home.indexOf('class="btn dashboard-edit-trigger"')<home.indexOf('class="hx-help-toggle"'), 'edit before help');
 assert.doesNotMatch(home,/？ この画面の使い方/);
 assert.match(home,/homeUi\.guideOpen=!homeUi\.guideOpen/);
 assert.doesNotMatch(home,/historyHeading\.after\(shortcut\)/);
 const learning=read('ui/learningExperience.js');
 assert.match(learning,/function learningHeading\(\)/);
 assert.match(learning,/aria-label="学習の目的と使い方"/);
 assert.doesNotMatch(learning,/lr-help-disclosure/);
 assert.match(learning,/class="lr-course" data-lr-course=/);
 assert.match(learning,/class="lr-course-icon"/);
 assert.match(learning,/lr-support-card/);
 assert.match(read('ui/historyExperience.js'),/hx-screen-help rl-screen-help/);
 const exploration=read('ui/explorationExperience.js');
 assert.match(exploration,/ex-reflection-footer/);
 assert.match(exploration,/あとから画面下部の「ふり返り」/);
 assert.doesNotMatch(exploration,/あとから画面上部の「ふり返り」/);
});

test('P12: newest stylesheet, module imports and PWA precache share one release version',()=>{
 const html=read('index.html'),sw=read('sw.js'),css=read('ui/screenCoherenceP12.css'),app=read('app.js');
 const version='20261112-public-copy-v1',pwaVersion='20261111-home-autosave-v1',presentationVersion='20261110-p14-visual-v4';
 const previous='20261110-p12-card-help-v1';
 assert.ok(html.indexOf('unifiedLearningShell.css')<html.indexOf('screenCoherenceP12.css'));
 assert.ok(html.indexOf('screenCoherenceP12.css')<html.indexOf('screenRefinementP13.css'));
 assert.ok(html.includes('ui/screenCoherenceP12.css?v='+previous));
 assert.ok(html.includes('app.js?v='+version),'missing HTML reference app.js');
 assert.ok(html.includes('pwa.js?v='+pwaVersion),'missing HTML reference pwa.js');
 assert.ok(html.includes('ui/screenCoherenceP14.css?v='+presentationVersion),'missing HTML reference screenCoherenceP14.css');
 assert.ok(sw.includes('runload-ui-next-shell-'+cacheVersion));
 assert.ok(sw.includes('app.js?v='+version),'missing cached resource app.js');
 for(const asset of ['ui/screenCoherenceP14.css','ui/historyExperience.js'])
  assert.ok(sw.includes(asset+'?v='+presentationVersion),'missing cached resource '+asset);
 for(const asset of ['ui/historyExperience.js'])
  assert.ok(app.includes(asset+'?v='+presentationVersion),'missing dynamic module update '+asset);
 for(const selector of ['.lr-course-icon','.lr-screen-help-content','.ex-reflection-footer','.hx-help-toggle'])
  assert.ok(css.includes(selector),'missing P12 style '+selector);
});
