import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shell=read('ui/unifiedLearningShell.css');
const html=read('index.html'),sw=read('sw.js');
const browser=read('tests/ux03NavigationTextZoomBrowser.mjs');
const app=read('app.js');

test('UX03 zoomed navigation retains five full-text labeled routes and two-row max at narrow width',()=>{
 assert.match(shell,/grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,clamp\(60px,3\.2rem,112px\)\),1fr\)\)!important/);
 assert.match(shell,/white-space:nowrap!important/);
 assert.match(shell,/padding-bottom:max\(calc\(112px \+ env\(safe-area-inset-bottom,0px\)\),calc\(5\.8rem \+ env\(safe-area-inset-bottom,0px\)\)\)!important/);
 assert.match(browser,/rows\.size<= \(percent===200\?2:1\)/);
 assert.match(browser,/link\.h>=44/);
 assert.match(browser,/mainBottomPadding>=row\.rect\.height\+12/);
 assert.match(app,/const mobileNav=\[\["home".*\["record-start".*\["history".*\["exploration-tree".*\["settings"/);
});

test('UX03 fixed-pixel Settings labels now enlarge without shortening content or changing stored preferences',()=>{
 for(const s of [
  '.s2-page .s2-panel-head h2{font-size:max(16px,.88rem)',
  '.s2-page .s2-item-copy strong{font-size:max(13px,.78rem)',
  '.s2-page .s2-item-copy small{font-size:max(11px,.65rem)',
  '.s2-page .s2-indicator{font-size:max(10px,.58rem)'
 ])assert.ok(shell.includes(s),'missing zoom-capable type: '+s);
 assert.match(browser,/settingsSubtitleSize>=original\.settingsSubtitleSize\*1\.6/);
 assert.match(browser,/settingsTitleSize>=original\.settingsTitleSize\*1\.6/);
 assert.ok(shell.includes('.s2-panel[data-settings-tone="mint"] .s2-item:has(.s3-profile-form)>summary .s2-indicator{'));
 assert.ok(shell.includes('font-size:max(12px,.58rem)'));
 assert.match(browser,/settingsOptionalSize>=original\.settingsOptionalSize\*1\.5/);
 assert.match(browser,/for\(const lang of \['ja','en'\]\)/);
 assert.match(browser,/for\(const width of \[320,390,768,1440\]\)/);
 assert.match(browser,/for\(const percent of \[100,200\]\)/);
 assert.match(browser,/assert\.equal\(results\.length,96/);
});

test('UX03 new stylesheet generation is cached consistently for offline use',()=>{
 const resource='./ui/unifiedLearningShell.css?v=20261122-ux03-reflow-v1';
 assert.ok(html.includes(resource),'active stylesheet query must be new');
 assert.ok(sw.includes(resource),'offline cache must include the same query');
 assert.ok(!sw.includes('./ui/unifiedLearningShell.css?v=20261116-gps-stage7-v3'));
 assert.ok(!html.includes('./ui/unifiedLearningShell.css?v=20261116-gps-stage7-v3'));
 assert.match(sw,/runload-ui-next-shell-20261123-pwa-update-notice-v1/);
 assert.match(read('.github/workflows/run-app-regression.yml'),/node tests\/ux03NavigationTextZoomBrowser\.mjs/);
});

test('UX03 has no new forced notes or scientific calculation changes',()=>{
 assert.match(app,/const desktopNav=\[\["home".*\["record".*\["result".*\["history"/);
 assert.match(read('ui/resultExperience.js'),/\['body','身体'\],\['fatigue','疲労感'\],\['radar','過去と比較'\]/);
 assert.doesNotMatch(shell,/display:none[^\n]*\.mobile-link/);
});
