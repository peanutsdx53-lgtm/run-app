import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('stage7: responsive 200% navigation text remains full-length and PWA uses one new stylesheet generation',()=>{
 const shell=read('ui/unifiedLearningShell.css'),html=read('index.html'),sw=read('sw.js');
 assert.match(shell,/grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,clamp\(60px,3\.2rem,112px\)\),1fr\)\)!important/);
 assert.match(shell,/white-space:nowrap!important/);
 assert.match(shell,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(html,/styles\.css\?v=20261117-s16-settings-v1/);
 assert.match(sw,/runload-ui-next-shell-20261125-ux20-final-v1/);
 assert.match(sw,/\.\/styles\.css\?v=20261117-s16-settings-v1/);
 assert.doesNotMatch(sw,/styles\.css\?v=20261115-retire-whatif-v1/);
 const record=read('ui/recordExperience.css');
 assert.match(record,/font-size:min\(1\.3rem,10vw\)!important/);
 assert.match(shell,/flex-direction:column-reverse/);
 assert.match(shell,/\.lr-page-heading \.lr-screen-help\{[\s\S]*align-self:flex-end/);
});
test('stage7: final research and privacy invariants retained across merged stages',()=>{
 const app=read('app.js'),result=read('ui/resultExperience.js'),
  gps=read('ui/gpsDynamicResult.js'),hist=read('ui/historyExperience.js');
 assert.match(result,/\['body','身体'\],\['fatigue','疲労感'\],\['radar','過去と比較'\]/);
 assert.match(gps,/GPS_GAP/);
 assert.match(gps,/身体負荷の実測ではありません/);
 assert.match(hist,/GPS_V2/);
 assert.match(app,/saveDetails:gpsSelfReport\.saveRoute===true/);
 assert.doesNotMatch(app,/gps-history-item/);
});
