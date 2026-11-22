import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeUi,render,LEARNING_TOPICS} from '../ui/explorationExperience.js';
import {EXPLORATION_STARTING_QUESTIONS,EXPLORATION_DRAFT_GUIDES} from '../ui/explorationTopicGuides.js';
import {ENGLISH_GPS_EXPLORATION_COPY} from '../ui/englishGpsExplorationCopy.js';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const categories=[...app.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)]
 .map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
const storage={getItem:()=>null,setItem:()=>{}};
const ctx={categories,draft:{},conditions:{entries:[]},manualRuns:{ok:true,records:[]}};
const important=[['01','自分が感じた疲れ','data-e-inquiry="T02"'],
 ['05','気分・ストレス','data-e-mental-inquiry="T03"'],
 ['04','筋肉痛・違和感','data-e-body-inquiry="T04"'],
 ['03','気温・天候','data-e-condition-inquiry="T05"'],
 ['05','日々のコンディション','data-e-life-inquiry="T06"'],
 ['01','過去の走りとの比較','data-e-inquiry="T08"']];
test('all 28 themes share one question and a three-section inquiry flow, with English copy',()=>{
 assert.equal(categories.length,7);
 assert.equal(categories.reduce((sum,c)=>sum+c.topics.length,0),28);
 assert.equal(Object.keys(EXPLORATION_STARTING_QUESTIONS).length,28);
 for(const cat of categories)for(const topic of cat.topics){
  const key=cat.id+'|'+topic,ui=makeUi(storage);
  ui.selected=cat.id;ui.topic=topic;
  const page=render(ui,ctx),q=EXPLORATION_STARTING_QUESTIONS[key];
  assert.ok(q&&q.endsWith('？'),key+' must have one intentional opening question');
  assert.ok(ENGLISH_GPS_EXPLORATION_COPY[q],key+' must have an English question');
  assert.equal((page.match(/class="ex-inquiry-start"/g)||[]).length,1,key+' must have a single question header');
  for(const label of ['探究の入り口','記録を手がかりにする','記録と感覚を照らし合わせる','気づきを残す']){
   assert.ok(page.includes(label),key+' missing '+label);
  }
  assert.ok(page.indexOf('記録を手がかりにする')<page.indexOf('記録と感覚を照らし合わせる'),key);
  assert.ok(page.indexOf('記録と感覚を照らし合わせる')<page.indexOf('気づきを残す'),key);
  assert.equal((page.match(/data-ex-action="note"/g)||[]).length,1,key+' must offer a single optional note');
  if(!LEARNING_TOPICS[key])assert.ok(EXPLORATION_DRAFT_GUIDES[key],key+' must keep observation scope');
 }
});
test('specialist inquiry stays out of general themes and appears only with explicitly selected run',()=>{
 for(const [category,topic,selector] of important){
  const ui=makeUi(storage);ui.selected=category;ui.topic=topic;
  const general=render(ui,ctx);
  assert.doesNotMatch(general,new RegExp(selector),'general topic must not show a no-run notice '+topic);
  assert.doesNotMatch(general,/class="ex-inline-inquiry"/);
  const explicit={...ctx,focusRunId:'run-v2-audit',focusRun:{id:'run-v2-audit',source:'manual',type:'run',schema:2,date:'2026-11-20',distanceKm:5,durationSeconds:2100,draft:{}}};
  const selected=render(ui,explicit);
  const discovery=selected.indexOf('class="ex-switch"'),focus=selected.indexOf('class="ex-focus"');
  const pos=selected.indexOf(selector);
  assert.ok(discovery>=0&&focus>discovery&&pos>focus,category+'|'+topic+' inquiry must stay inside focus card');
  assert.equal((selected.match(new RegExp(selector,'g'))||[]).length,1,category+'|'+topic);
  assert.ok(selected.includes('class="ex-inline-inquiry"'),category+'|'+topic);
  assert.doesNotMatch(selected,/class="ex-e-kicker"|class="ex-e-prompt"|id="ex-e-t0[2-8]-title"/,
   'embedded inquiry must not repeat a second question');
  assert.match(selected,/class="ex-inquiry-details"/,'science caveat remains accessible in source disclosure');
 }
 const ui=makeUi(storage);ui.selected='03';ui.topic='気温・天候';
 const html=render(ui,ctx);
 assert.doesNotMatch(html,/data-e-condition-reveal|data-e-condition-inquiry/,'no private read on general topic');
});
test('source help and original research content are still available on knowledge themes',()=>{
 const ui=makeUi(storage);ui.selected='01';ui.topic='距離・時間・ペース';
 const html=render(ui,ctx);
 assert.match(html,/class="ex-inquiry-details ex-knowledge-reference"/);
 assert.match(html,/data-ex-action="learn-help"/);
 assert.match(html,/data-ex-action="share"/);
 assert.doesNotMatch(html,/class="ex-learning-lead"/);
});

test('Browse Topics omits numeric badges but retains all topics and search filtering',()=>{
 const ui=makeUi(storage);ui.tab='catalog';
 const html=render(ui,ctx);
 assert.equal((html.match(/class="ex-catalog-group"/g)||[]).length,7);
 assert.equal((html.match(/data-ex-pick-topic=/g)||[]).length,28);
 assert.doesNotMatch(html,/class="ex-count"|<small>\d+ テーマ<\/small>/);
 ui.search='睡眠';
 const filtered=render(ui,ctx);
 assert.ok(filtered.includes('data-ex-pick-topic="睡眠"'));
 assert.equal((filtered.match(/data-ex-pick-topic=/g)||[]).length,1);
 assert.doesNotMatch(filtered,/class="ex-count"|<small>\d+ テーマ<\/small>/);
});
