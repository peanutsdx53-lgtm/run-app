import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
// Documentation consistency only. This test is NOT a GPS measurement or browser acceptance.
test('GPS closeout documentation lists workstages and real-device deferral (document contract, not runtime)',()=>{
 const content=read('docs/GPS_SOFTWARE_CLOSEOUT_20261027.md');
 for(const id of ['P-00','W-01','W-02','W-03','W-04','W-05','W-06','W-07','W-08'])assert.ok(content.includes(id));
 assert.match(content,/実走検証の保留/);
 assert.match(content,/専用ドメイン/);
 assert.match(content,/未保存測定/);
 assert.match(content,/CIがPASS/);
});

test('live GPS functionality is independently covered by code and browser acceptance (008)',()=>{
 const workflow=read('.github/workflows/run-app-regression.yml');
 assert.match(workflow,/name: Run App regression/);
 assert.match(workflow,/node --test tests\/\*\.test\.mjs/,'all science and GPS contracts execute');
 assert.match(workflow,/node tests\/gpsRofReviewBrowser\.mjs/);
 assert.match(workflow,/engine: \[chromium, webkit\]/);
 for(const path of ['tests/gpsReplayIndexedDbStore.test.mjs','tests/measurementExperience.test.mjs','tests/gpsRofReviewBrowser.mjs']){
  const source=read(path);
  assert.match(source,/test\(|page\./,'runtime acceptance source exists: '+path);
 }
 assert.match(workflow,/branches: \[main\]/,'runtime tests also run on main changes');
});
