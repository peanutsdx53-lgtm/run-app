import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const mental=source('ui/mentalExperience.css');
const auditor=source('tests/buttonContrastAuditBrowser.mjs');
const matrix=source('tests/ux02ContrastMatrixBrowser.mjs');
const html=source('index.html');
const precache=source('sw.js');
const linear=hex=>{
 const n=hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*n[0]+.7152*n[1]+.0722*n[2];
};
const contrast=(a,b)=>{const x=linear(a),y=linear(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

test('the optional mental/cognitive self-report label is legible even at the brightest conservative dark-panel stop',()=>{
 const declaration=mental.match(/\.mx-label small\{[^}]*\}/)?.[0];
 assert.ok(declaration,'specific optional label must be styled');
 assert.match(declaration,/color:#c9eaf0/);
 assert.ok(contrast('#c9eaf0','#0d3d4e')>=4.5,
  'ordinary optional field text must not inherit light-page muted ink');
 assert.match(mental,/\.mx-current\{color:#b6d6dd/,'original answer status remains legible');
 assert.match(mental,/\.mx-choice input\{accent-color:/,'radio answer control unchanged');
});

test('non-text icon threshold is 3:1; all seven Explore accents and Settings chevron remain distinguishable on dark cards',()=>{
 const icons=['#79c2f4','#f4b978','#65e5c2','#d4adfb','#9de9e0','#c3b5ff','#faa6c8'];
 for(const color of icons)assert.ok(contrast(color,'#155563')>=3,'explore accent '+color);
 assert.ok(contrast('#62a5bb','#103850')>=3,'Settings disclosure chevron');
 assert.match(auditor,/item\.classList\?\.contains\('s2-chevron'\)/);
 assert.match(auditor,/item\.classList\?\.contains\('ex-node-icon'\)/);
 assert.match(auditor,/role==='non-text-icon'\|\|size>=24/,'each descendant has its own category/size threshold');
 assert.match(auditor,/visualRole:low\.role/,'audit captures the type of measured element');
});

test('bilingual 320/390/768/1440 and 100/200 percent Chromium/WebKit matrix remains CI-gated',()=>{
 for(const x of ["['ja','en']","[320,390,768,1440]","[100,200]","'chromium'"])
  assert.ok(matrix.includes(x),'missing matrix dimension: '+x);
 const workflow=source('.github/workflows/run-app-regression.yml');
 assert.match(workflow,/node tests\/buttonContrastAuditBrowser\.mjs\s+node tests\/ux02ContrastMatrixBrowser\.mjs/);
});

test('new UI contrast revision is present in both loaded and offline precached CSS without stale version',()=>{
 const key='./ui/mentalExperience.css?v=20261122-ux02-contrast-v1';
 assert.ok(html.includes(key),'HTML must load the new color');
 assert.ok(precache.includes(key),'PWA must precache the matching revision');
 assert.ok(!html.includes('mentalExperience.css?v=20261108-professor-m4-v1'));
 assert.ok(!precache.includes('mentalExperience.css?v=20261108-professor-m4-v1'));
 assert.match(precache,/runload-ui-next-shell-20261123-ux08-rof-body-clarity-v1/);
});
