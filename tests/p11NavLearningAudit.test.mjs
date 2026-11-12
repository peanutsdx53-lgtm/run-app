import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {originMarkup} from '../ui/learningOriginLesson.js';
import {motionMarkup} from '../ui/learningMotionLesson.js';
import {fatigueMarkup} from '../ui/learningFatigueLesson.js';
import {mountLearning} from '../ui/learningExperience.js';
import {shortcutsCard} from '../ui/homeExperience.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cacheVersion='20261112-cleanup8-final-v1';
function visibleText(markup){
 return markup.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&(?:amp|nbsp|lt|gt);/gi,' ').replace(/\s+/g,' ');
}
test('P11: no banned product name appears in catalogue and three standalone lessons',()=>{
 const catalogue={innerHTML:''};mountLearning(catalogue,new URLSearchParams());
 const markup={
  catalogue:catalogue.innerHTML,
  provenance:originMarkup(),movement:motionMarkup(),fatigue:fatigueMarkup()
 };
 // The pace lesson requires real DOM wiring; the P11 browser gate expands
 // and inspects its rendered text on Chromium and WebKit.
 for(const [name,html] of Object.entries(markup)){
  assert.doesNotMatch(visibleText(html),/runload/i,
   'prohibited product name in user-facing learning copy: '+name);
  assert.ok(visibleText(html).length>50,'content must remain substantive: '+name);
 }
});
test('P11: the extra three functions remain in Home quick access, never Settings',()=>{
 const home=shortcutsCard(),settings=read('ui/settingsExperience.js');
 for(const route of ['course','simulation','consultation']){
  assert.match(home,new RegExp('href="#/'+route+'"'),'Home missing '+route);
  assert.doesNotMatch(settings,new RegExp('href="#/'+route+'"'),'Do not move '+route+' to Settings');
 }
 const app=read('app.js');
 assert.match(app,/const mobileNav=\[[^\n]*\["settings","⚙","設定"\]/);
 assert.doesNotMatch(app,/class="rl-tools-menu"/,'header menu was not removed');
 assert.doesNotMatch(app,/class="icon-install"/,'down-arrow in header was not removed');
 assert.match(app,/class="topbar" hidden aria-hidden="true"/);
});
test('P11: the last stylesheet and offline version are really new',()=>{
 const index=read('index.html'),sw=read('sw.js'),css=read('ui/unifiedLearningShell.css');
 const version='20261112-public-copy-v1',presentationVersion='20261111-home-autosave-v1';
 assert.ok(index.includes('unifiedLearningShell.css?v=20261111-learning-density-v1'));
 assert.match(index,new RegExp('app\\.js\\?v='+version));
 assert.match(sw,new RegExp('runload-ui-next-shell-'+cacheVersion));
 assert.ok(sw.includes('unifiedLearningShell.css?v=20261111-learning-density-v1'));
 assert.match(index,new RegExp('pwa\\.js\\?v='+presentationVersion));
 assert.match(sw,new RegExp('pwa\\.js\\?v='+presentationVersion));
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/\.app-shell \.topbar\{display:none!important\}/);
 assert.match(css,/\.lr-root \.lr-lesson-title\{/);
 assert.doesNotMatch(index,/s2-utility-links/,'no settings relocation');
});
