import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkRecordDraft} from '../ui/recordDraftReview.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('retired view is not loaded or precached; active life inquiry remains connected',()=>{
 const app=read('app.js'),sw=read('sw.js');
 const startup=app.match(/const \[([\s\S]*?)\]=await Promise\.all\(\[([\s\S]*?)\]\);/);
 assert.ok(startup);
 const names=startup[1].split(',').map(x=>x.trim()).filter(Boolean);
 const imports=[...startup[2].matchAll(/import\("([^"]+)"\)/g)].map(x=>x[1]);
 assert.equal(names.length,imports.length);
 assert.equal(new Set(names).size,names.length);
 assert.doesNotMatch(app,/interpretationView\.js|import\("\.\/ui\/explorationLifeInquiry\.js"\)/);
 assert.doesNotMatch(sw,/interpretationView\.js/);
 assert.match(read('ui/explorationExperience.js'),/import \{renderLifeInquiry\} from "\.\/explorationLifeInquiry\.js"/);
 assert.match(read('ui/explorationLinkPolicy.js'),/import \{renderLifeInquiry\} from '\.\/explorationLifeInquiry\.js'/);
 assert.match(sw,/\.\/ui\/explorationLifeInquiry\.js/);
});

test('removing an unused validation result does not remove temperature validation',()=>{
 const base={date:'2026-11-26',distance:'6',hours:'0',minutes:'33',seconds:'0',activityGait:'RUNNING'};
 for(const temperatureC of ['-51','61','not-number']){
  assert.ok(checkRecordDraft({...base,temperatureC}).errors.some(e=>e.includes('気温')));
 }
 for(const temperatureC of ['',null,'-50','0','60']){
  assert.ok(!checkRecordDraft({...base,temperatureC}).errors.some(e=>e.includes('気温')));
 }
});
