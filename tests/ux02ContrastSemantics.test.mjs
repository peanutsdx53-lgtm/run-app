import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPLORE_GROUPS} from '../ui/explorationRedesign.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const condition=source('ui/homeExperience.css');
const auditor=source('tests/buttonContrastAuditBrowser.mjs');
const matrix=source('tests/ux02ContrastMatrixBrowser.mjs');
const html=source('index.html');
const precache=source('sw.js');
const linear=hex=>{
 const n=hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*n[0]+.7152*n[1]+.0722*n[2];
};
const contrast=(a,b)=>{const x=linear(a),y=linear(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

test('daily condition choices and explanation retain readable contrast on the current dark palette',()=>{
 const dark=Object.fromEntries([...condition.match(/:root\{--condition-bg:[^}]+\}/)[0].matchAll(/--condition-([\w-]+):(#[0-9a-f]{6})/gi)].map(m=>[m[1],m[2]]));
 for(const bg of ['bg','surface','raised','selected'])assert.ok(contrast(dark.text,dark[bg])>=4.5,bg);
 for(const bg of ['bg','surface','raised'])assert.ok(contrast(dark.secondary,dark[bg])>=4.5,bg);
 assert.match(condition,/\.hx-daily-choices label:has\(input:checked\)\{background:var\(--condition-selected\);border-color:var\(--condition-accent\)/);
});

test('non-text icon threshold is 3:1; all four Explore accents and Settings chevron remain distinguishable on dark cards',()=>{
 const icons=EXPLORE_GROUPS.map(g=>g.accent);
 assert.equal(icons.length,4);
 for(const color of icons)for(const bg of ['#142e3d','#225363','#294a58'])assert.ok(contrast(color,bg)>=3,'explore accent '+color+' on '+bg);
 assert.ok(contrast('#62a5bb','#103850')>=3,'Settings disclosure chevron');
 assert.match(auditor,/item\.classList\?\.contains\('s2-chevron'\)/);
 assert.match(auditor,/item\.classList\?\.contains\('ex-area-symbol'\)/);
 assert.match(auditor,/role==='non-text-icon'\|\|size>=24/,'each descendant has its own category/size threshold');
 assert.match(auditor,/visualRole:low\.role/,'audit captures the type of measured element');
});

test('bilingual 320/390/768/1440 and 100/200 percent Chromium/WebKit matrix remains CI-gated',()=>{
 for(const x of ["['ja','en']","[320,390,768,1440]","[100,200]","'chromium'"])
  assert.ok(matrix.includes(x),'missing matrix dimension: '+x);
 const workflow=source('.github/workflows/run-app-regression.yml');
 assert.match(workflow,/node tests\/buttonContrastAuditBrowser\.mjs\s+node tests\/ux02ContrastMatrixBrowser\.mjs/);
});

test('retired mental styling is absent; current condition styling remains cached',()=>{
 assert.doesNotMatch(html+precache,/mentalExperience\.css/);
 assert.match(html,/homeExperience\.css\?v=/);
 assert.match(precache,/\.\/ui\/homeExperience\.css/);
 assert.match(precache,/runload-ui-next-shell-20261126-cleanup-v5/);
});


test('contrast matrix samples only the live body and daily condition labels, including all eight choices',()=>{
 assert.match(matrix,/target:'\.cx-field-title label'/);
 assert.match(matrix,/target:'\.hx-daily-choices label span'/);
 assert.match(matrix,/expected:3/);
 assert.match(matrix,/expected:8/);
 assert.match(matrix,/results\.length,64/);
 assert.doesNotMatch(matrix,/target:'\.mx-label/);
});
