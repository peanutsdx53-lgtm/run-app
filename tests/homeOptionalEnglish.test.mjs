import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trendCard,discoveryCard} from '../ui/homeExperience.js';
import {translateUiText} from '../ui/englishUi.js';
const generated=selector=>({element:{closest:q=>q===selector?{}:null,matches:q=>q===selector}});
const runs=[
 {source:'manual',type:'run',id:'r1',date:'2026-11-20',distanceKm:5,durationSeconds:2400},
 {source:'manual',type:'run',id:'r2',date:'2026-11-21',distanceKm:5,durationSeconds:2100}
];
test('saved manual trend translates 1 and 2-record captions without changing numeric output',()=>{
 for(const records of [runs.slice(0,1),runs]){
  const html=trendCard({ok:true,records});
  const japanese=html.match(/<p class="hx-run-trend-source">([^<]+)<\/p>/)?.[1];
  assert.ok(japanese);
  const english=translateUiText(japanese,generated('.hx-run-trend-source'));
  assert.doesNotMatch(english,/[一-龯ぁ-んァ-ン]/);
  assert.match(english,records.length===1?/most recent saved manual run/:/2 most recent saved manual runs/);
  assert.equal((html.match(/class="hx-run-trend-point"/g)||[]).length,records.length);
  assert.match(html,/5\.00 km/);
 }
 const unrelated=generated('.unrelated');
 assert.equal(translateUiText('保存済み手入力走行の直近2件。過去から今回の順に並べています。',unrelated),
  '保存済み手入力走行の直近2件。過去から今回の順に並べています.');
});
test('discovery header and generated date translate while the user-authored note is protected',()=>{
 const html=discoveryCard([{createdAt:'2026-11-21T18:00:00+09:00',text:'本人が自由に書いた日本語の気づき'}]);
 assert.match(html,/class="hx-discovery-note" data-user-authored/);
 assert.match(html,/本人が自由に書いた日本語の気づき/);
 const date=html.match(/<p class="hx-discovery-date">([^<]+)<\/p>/)?.[1];
 assert.equal(translateUiText('探究の続き'),'Continue Exploring');
 assert.equal(translateUiText(date,generated('.hx-discovery-date')),'Observation you saved on 2026-11-21.');
 assert.equal(translateUiText('保存済み手入力走行の距離（活動1件ごと）'),'Saved Manual Running Distances (Per Activity)');
});
test('center only the Explore label, preserving fixed orb anchor and size',()=>{
 const css=readFileSync(new URL('../ui/explorationExperience.css',import.meta.url),'utf8');
 assert.match(css,/\.ex-page \.ex-constellation \.ex-core > span\{[^}]+text-align:center/);
 assert.match(css,/\.ex-page \.ex-constellation \.ex-core\{[\s\S]*?top:49%;left:50%/);
});
