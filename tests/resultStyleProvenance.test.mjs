import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as styles from '../ui/resultInlineStyles.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('active result styles are embedded and the retired mirror is test evidence only',()=>{
 const source=read('ui/resultInlineStyles.js');
 assert.doesNotMatch(source,/Keep in sync with ui\/resultExperience\.css/);
 assert.match(source,/Runtime source of truth/);
 assert.ok(read('tests/fixtures/retiredResultExperience.css').length>10000);
 assert.doesNotMatch(read('sw.js'),/\.\/ui\/resultExperience\.css/);
 assert.match(read('ui/resultExperience.js'),/from '\.\/resultInlineStyles\.js\?v=/);
 for(const [name,value] of Object.entries(styles)){
  assert.equal(typeof value,'string',name);
  assert.ok(value.length>0,name);
 }
});
