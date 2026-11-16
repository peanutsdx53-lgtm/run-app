import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('stage7: responsive 200% navigation text remains full-length and PWA uses one new stylesheet generation',()=>{
 const css=read('styles.css'),html=read('index.html'),sw=read('sw.js');
 assert.match(css,/@media\(max-width:430px\)\{[\s\S]*?\.app-shell \.mobile-nav\{[\s\S]*?flex-wrap:wrap/);
 assert.match(css,/\.app-shell \.mobile-nav \.mobile-link\{[\s\S]*?min-width:max-content;[\s\S]*?white-space:nowrap/);
 assert.match(html,/styles\.css\?v=20261116-gps-stage7-v1/);
 assert.match(sw,/runload-ui-next-shell-20261116-gps-stage7-v1/);
 assert.match(sw,/\.\/styles\.css\?v=20261116-gps-stage7-v1/);
 assert.doesNotMatch(sw,/styles\.css\?v=20261115-retire-whatif-v1/);
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
