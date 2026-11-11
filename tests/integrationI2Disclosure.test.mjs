import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRIVATE_EXPORT_DEFAULTS,resultExportDisclosure} from '../ui/resultSharingPolicy.js';

test('I2: opt-in is per-export, zero remains a value, and sensitive prose is never in image disclosure',()=>{
 assert.deepEqual(PRIVATE_EXPORT_DEFAULTS,{includeDate:false,includeRof:false});
 const input={date:'2026-11-09',before:0,after:null,memo:'PRIVATE-MEMO-I2',mentalExperience:'PRIVATE-MENTAL-I2',route:'37.123, 139.123',posthoc:'PRIVATE-POSTHOC-I2'};
 const d=resultExportDisclosure(input);
 assert.equal(d.includeDate,false);assert.equal(d.includeRof,false);
 assert.equal(d.dateText,'日付は非掲載（既定）');
 assert.equal(d.rofText,'ROF-J等の本人回答は非掲載（既定）');
 assert.doesNotMatch(JSON.stringify(d),/2026-11-09|PRIVATE-MEMO|PRIVATE-MENTAL|PRIVATE-POSTHOC|37\.123|運動前 0/);
 const explicit=resultExportDisclosure({...input,includeDate:true,includeRof:true});
 assert.equal(explicit.dateText,'2026-11-09');
 assert.equal(explicit.rofText,'ROF-J（本人回答）：運動前 0 ／ 運動後 未回答');
 assert.doesNotMatch(JSON.stringify(explicit),/PRIVATE-|37\.123/);
 for(const invalid of [-1,11,3.4,'0',NaN])
   assert.match(resultExportDisclosure({before:invalid,includeRof:true}).rofText,/運動前 未回答/);
});
test('I2: printable opt-in to ROF must not opt-in to evidence timestamps or correction history',()=>{
 const ui=readFileSync(new URL('../ui/resultExperience.js',import.meta.url),'utf8');
 assert.match(ui,/\.rv4-posthoc-summary\{display:none!important\}/);
 assert.match(ui,/\.rv4-mental,\.rv4-history/);
 assert.match(ui,/\.rv4-app\[data-print-rof="true"\] \.rv4-fatigue\{display:block!important\}/);
 assert.match(ui,/\.rv4-fatigue-method\{display:none!important\}/,
  'ROF answer permission is not permission to print individual correction reasons and timestamps');
 assert.match(ui,/data-export-status/,'failed image generation must have an accessible status');
 assert.match(ui,/画像を作成できませんでした/,'no silent PNG failure');
 assert.match(ui,/自由記述・後日申告・経路は掲載しません/);
});
test('I2: cross-feature share failure preserves source and reports a denied clipboard operation',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/コピーできませんでした/);
 const consultation=readFileSync(new URL('../ui/consultationExperience.js',import.meta.url),'utf8');
 assert.match(consultation,/data-consultation-gps-v2/);
 assert.match(consultation,/data-share/);
});
