import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mentalInquiryModel,renderMentalInquiry} from '../ui/explorationMentalInquiry.js';
const read=x=>readFileSync(new URL(x,import.meta.url),'utf8');
test('I3: old revealed mental inquiry is hidden before asynchronous route refresh',()=>{
 const app=read('../app.js'),start=app.indexOf('window.addEventListener("hashchange",async()=>{');
 const match=app.indexOf("app.querySelectorAll([",start);
 const guard=app.slice(match,app.indexOf("].join(',')",match));
 for(const sel of ['[data-e-mental-inquiry]','[data-e-body-inquiry]','[data-e-condition-inquiry]','[data-e-life-inquiry]','[data-e-inquiry="T02"]','[data-e-inquiry="T08"]'])
  assert.ok(guard.includes(sel),'route guard missing '+sel);
 const outgoing=app.indexOf("const outgoingExploration=app.querySelector('.ex-page')",start);
 assert.ok(outgoing>start&&outgoing<match,'entire outgoing exploration view must be sealed first');
 const hidden=app.indexOf("panel.style.setProperty('display','none','important')",match);
 const marker=app.indexOf("panel.dataset.eState='ROUTE_CHANGING'",hidden);
 const resume=app.indexOf('await canonical.refresh();',start);
 assert.ok(start>=0&&match>start&&hidden>match&&marker>hidden&&resume>marker,
   'DOM redaction must precede IndexedDB await');
 assert.match(app,/if\(!panel\.isConnected\|\|currentPage\(\)!=='exploration-tree'\|\|location\.hash!==route\)return/,
   'late mental reads cannot update the wrong selected record');
});
test('I3: the mental inquiry remains opt-in and is not a medical/ROF score',()=>{
 assert.equal(mentalInquiryModel().status,'NO_RECORD');
 const html=renderMentalInquiry();
 assert.match(html,/data-e-state="NO_RECORD"/);
 assert.doesNotMatch(html,/本人の任意申告：感じた|PRIVATE-MENTAL/);
 assert.match(read('../ui/explorationMentalInquiry.js'),/if\(read===null\)return Object\.freeze\(\{status:'NOT_REQUESTED'/);
 assert.match(read('../app.js'),/const inquiryReveal=event\.target\.closest\('\[data-e-mental-reveal\]'\)/);
});
test('I3: new cache generation is aligned with the private route repair',()=>{
 const index=read('../index.html'),sw=read('../sw.js');
 const version=index.match(/app\.js\?v=([\w-]+)/)?.[1];
 assert.ok(version,'current versioned app entry is present');
 assert.ok(sw.includes('app.js?v='+version),'current app entry is precached');
 assert.match(sw,/runload-ui-next-shell-20261112-cleanup6-active-v2/);
});
