import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recordIcon} from '../ui/recordIcons.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Decorative navigation icons distinguish recording from home and retain existing destinations',()=>{
 const app=read('app.js');
 const code=app.match(/const navIcon=function navIcon\(name\)\{[\s\S]*?\n\};/)[0];
 const render=new Function(code+'return navIcon;')();
 assert.equal(render('record-start'),render('record'));
 assert.notEqual(render('record-start'),render('home'));
 const keys=['home','record','result','history','exploration-tree','learning','settings'];
 assert.equal(new Set(keys.map(render)).size,keys.length);
 for(const k of keys)assert.match(render(k),/aria-hidden="true"/);
 assert.match(app,/href="#\/\$\{path\}"/);
 const icons=['calendar','course','rof','gait','environment','body','distance','clock','pace','lock','alert'].map(recordIcon);
 assert.equal(new Set(icons).size,icons.length);
 assert.ok(icons.every(s=>s.includes('aria-hidden="true"')&&s.includes('stroke-width="1.8"')));
});
