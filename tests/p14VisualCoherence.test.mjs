import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HISTORY_STYLES} from '../ui/historyInlineStyles.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cacheVersion='20261111-home-autosave-refine-v2';

test('P14: History matches GPS card density, and Shadow DOM no longer adds blank viewport height',()=>{
 const history=read('ui/historyExperience.css');
 const css=read('ui/screenCoherenceP14.css');
 assert.equal(HISTORY_STYLES,history,'embedded Shadow DOM style must match authored history CSS');
 assert.match(history,/:host \.stage\{min-height:0;padding-bottom:16px\}/);
 assert.match(history,/:host \.stage \.hx-title-line h1\{font-size:1\.625rem/);
 for(const token of ['.gps-history-disclosure','.gps-history-heading','.gps-history-count','.gps-history-chevron']){
  assert.ok(css.includes(token),token);
 }
 assert.match(css,/\.gps-history-section\{[\s\S]*?max-width:1550px/);
 assert.match(css,/\.gps-history-disclosure>summary\{[\s\S]*?flex-wrap:nowrap/);
 assert.match(css,/width:calc\(100% - \(2 \* clamp\(15px,2\.6vw,44px\)\)\);max-width:1550px/);
 assert.match(css,/@media\(max-width:870px\)[\s\S]*?width:calc\(100% - 28px\)/);
 assert.match(css,/@media\(max-width:540px\)[\s\S]*?width:calc\(100% - 24px\)/);
 assert.match(read('app.js'),/class="gps-history-tools-label"/);
 assert.match(css,/grid-template-areas:"title chevron" "hint chevron"/);
});

test('P14: exploration leaving to learning seals private content but no longer flashes orange notice',()=>{
 const app=read('app.js');
 assert.match(app,/outgoingExploration\.style\.setProperty\('display','none','important'\)/);
 assert.match(app,/if\(currentPage\(\)==='exploration-tree'\)\{/);
 assert.match(app,/pending\.className='ex-route-pending'/);
 assert.doesNotMatch(app,/pending\.className='ex-notice'/);
 const css=read('ui/screenCoherenceP14.css');
 assert.match(css,/\.ex-route-pending\{/);
 assert.match(css,/background:#0b3445/);
});

test('P14: six navigation screens share the same explicit heading scale',()=>{
 const css=read('ui/screenCoherenceP14.css');
 assert.match(css,/--rl-screen-title-size:1\.625rem/);
 for(const sel of [
  '.home-v3 .home-head h1','.ex-page .ex-heading h1',
  '.lr-root .lr-page-heading h1','.s2-page .s2-heading h1',
  '.record-v3 .rv-head h1','.cj-screen .cj-page-head h1',
  '.rr-page .rr-heading h1','.sm-page .sm-heading h1'
 ])assert.ok(css.includes(sel),'missing screen heading '+sel);
 assert.match(css,/font-size:var\(--rl-screen-title-size\)!important/);
 assert.match(css,/max-width:420px/,'long screen titles need a narrow-phone exception');
});

test('P14: Condition journey matches violet home card, while Condition and Achievement use deliberate distinct Open buttons',()=>{
 const css=read('ui/screenCoherenceP14.css');
 const home=read('ui/homeExperience.css');
 const journey=read('ui/conditionJourney.css');
 assert.match(home,/\.home-v3 \.hx-condition\{[\s\S]*?#3a315e/);
 assert.match(journey,/\.cj-screen \.cj-page-head/);
 assert.match(css,/\.cj-screen \.cj-panel\{[\s\S]*?#322e53/);
 assert.match(css,/\.cj-screen \.cj-chart-viewport\{/);
 assert.match(css,/\.cj-screen \.cj-back\{/);
 assert.match(css,/\.home-v3 \.hx-condition \.hx-title-button \.hx-right,[\s\S]*?\.home-v3 \.hx-achievement \.hx-title-button \.hx-right\{[\s\S]*?#195b70/);
 assert.doesNotMatch(css,/#895523|#6c4328/,'card-color Achievement action must not return');
 assert.doesNotMatch(css,/高評価|傷害リスクの程度/);
});

test('P14: app, worker, and style versions are aligned without deleting local history data',()=>{
 const index=read('index.html'),sw=read('sw.js'),app=read('app.js');
 const v='20261110-p14-visual-v4',entryV='20261111-home-autosave-v1';
 assert.ok(index.includes('app.js?v='+entryV),'HTML missing app.js');
 assert.ok(sw.includes('app.js?v='+entryV),'SW missing app.js');
 assert.ok(index.includes('pwa.js?v='+entryV),'HTML missing pwa.js');
 assert.ok(sw.includes('pwa.js?v='+entryV),'SW missing pwa.js');
 assert.ok(index.includes('ui/screenCoherenceP14.css?v='+v),'HTML missing screenCoherenceP14.css');
 assert.ok(sw.includes('ui/screenCoherenceP14.css?v='+v),'SW missing screenCoherenceP14.css');
 assert.ok(sw.includes('runload-ui-next-shell-'+cacheVersion));
 for(const p of ['ui/historyExperience.js','ui/historyInlineStyles.js']){
  assert.ok(sw.includes(p+'?v='+v),'SW missing '+p);
 }
 assert.ok(app.includes('ui/historyExperience.js?v='+v));
 assert.doesNotMatch(app,/localStorage\.clear\(\)/);
});
