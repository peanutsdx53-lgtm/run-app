import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {themeFor,ENGLISH_EXPLORE_REDESIGN} from '../ui/explorationRedesign.js';
import {makeUi,render,LEARNING_TOPICS} from '../ui/explorationExperience.js';
import {EXPLORATION_STARTING_QUESTIONS,EXPLORATION_DRAFT_GUIDES} from '../ui/explorationTopicGuides.js';
import {ENGLISH_GPS_EXPLORATION_COPY} from '../ui/englishGpsExplorationCopy.js';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const categories=[...app.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)]
 .map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
const storage={getItem:()=>null,setItem:()=>{}};
const ctx={categories,draft:{},conditions:{entries:[]},manualRuns:{ok:true,records:[]}};
const important=[['01','自分が感じた疲れ','data-e-inquiry="T02"'],
 ['04','筋肉痛・違和感','data-e-body-inquiry="T04"'],
 ['03','気温・天候','data-e-condition-inquiry="T05"'],
 ['05','日々のコンディション','data-e-life-inquiry="T06"'],
 ['01','過去の走りとの比較','data-e-inquiry="T08"']];
test('all 27 themes share one question and a three-section inquiry flow, with English copy',()=>{
 assert.equal(categories.length,7);
 assert.equal(categories.reduce((sum,c)=>sum+c.topics.length,0),27);
 assert.equal(Object.keys(EXPLORATION_STARTING_QUESTIONS).length,27);
 for(const cat of categories)for(const topic of cat.topics){
  const key=cat.id+'|'+topic,ui=makeUi(storage);
  ui.selected=cat.id;ui.topic=topic;
  const page=render(ui,ctx),q=themeFor(cat.id,topic).question[0];
  assert.ok(q&&q.endsWith('？'),key+' must have one intentional opening question');
  assert.ok(ENGLISH_EXPLORE_REDESIGN[q],key+' must have an English question');
  assert.equal((page.match(/class="ex-inquiry-start"/g)||[]).length,1,key+' must have a single question header');
  for(const label of ['探究の入り口','理解の手掛かり','記録と感覚を照らし合わせる','気づき・疑問を残す']){
   assert.ok(page.includes(label),key+' missing '+label);
  }
  assert.ok(page.indexOf('理解の手掛かり')<page.indexOf('記録と感覚を照らし合わせる'),key);
  assert.ok(page.indexOf('記録と感覚を照らし合わせる')<page.indexOf('気づき・疑問を残す'),key);
  assert.equal((page.match(/data-ex-action="note"/g)||[]).length,1,key+' must offer a single optional note');
  if(!LEARNING_TOPICS[key])assert.ok(EXPLORATION_DRAFT_GUIDES[key],key+' must keep observation scope');
 }
});
test('UX13 compact discovery headings retain all controls and distinguish unknown records from zero',()=>{
 const ui=makeUi(storage);ui.selected='01';ui.topic='過去の走りとの比較';
 const normal=render(ui,ctx);
 assert.equal((normal.match(/気になることから/g)||[]).length,1);
 assert.match(normal,/aria-label="4つの分野から探す"/);
 assert.doesNotMatch(normal,/記録からも広がる発見|テーマを切り替える/);
 assert.match(normal,/<strong>読むテーマ<\/strong>/);
 assert.equal((normal.match(/data-ex-category=/g)||[]).length,4);
 assert.equal((normal.match(/data-ex-topic-step=/g)||[]).length,2);
 assert.match(normal,/保存された手入力走行は0件/);
 assert.doesNotMatch(normal,/走行は未選択です/);
 const learning=render(ui,{...ctx,learningEntry:true});
 assert.match(learning,/走行は未選択です/);
 assert.doesNotMatch(learning,/保存された手入力走行は0件/);
 const failed=render(ui,{...ctx,manualRuns:{ok:false,records:[]}});
 assert.match(failed,/走行記録を読み取れません/);
 assert.doesNotMatch(failed,/保存された手入力走行は0件/);
 const missing=render(ui,{...ctx,focusRunId:'missing-record',focusRun:null});
 assert.match(missing,/指定された走行記録が見つかりません/);
 assert.doesNotMatch(missing,/保存された手入力走行は0件/);
 assert.doesNotMatch(normal,/表示例を見ています|data-ex-action="sample"/);
 ui.selected='03';ui.topic='上り坂・下り坂';
 assert.match(render(ui,ctx),/<strong>上りの動き<\/strong>/);
 ui.toolChoice='down';assert.match(render(ui,ctx),/<strong>下りの動き<\/strong>/);
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
  assert.match(selected,/class="ex-reading-limit"/,'science caveat remains visible');
 }
 const ui=makeUi(storage);ui.selected='03';ui.topic='気温・天候';
 const html=render(ui,ctx);
 assert.doesNotMatch(html,/data-e-condition-reveal|data-e-condition-inquiry/,'no private read on general topic');
});
test('source help and original research content are still available on knowledge themes',()=>{
 const ui=makeUi(storage);ui.selected='01';ui.topic='距離・時間・ペース';
 const html=render(ui,ctx);
 assert.match(html,/class="ex-inquiry-details ex-knowledge-reference"/);
 assert.doesNotMatch(html,/data-ex-action="learn-help"/);
 assert.match(html,/参考文献・研究条件|設計の参考文献|計算の根拠|文献参考値の根拠/);
 assert.match(html,/data-ex-consultation/);
 assert.doesNotMatch(html,/class="ex-learning-lead"/);
});

test('Browse Topics omits numeric badges but retains all topics and search filtering',()=>{
 const ui=makeUi(storage);ui.tab='catalog';
 const html=render(ui,ctx);
 assert.equal((html.match(/class="ex-catalog-group"/g)||[]).length,4);
 assert.equal((html.match(/data-ex-pick-topic=/g)||[]).length,12);
 assert.doesNotMatch(html,/class="ex-count"|<small>\d+ テーマ<\/small>/);
 ui.search='睡眠';
 const filtered=render(ui,ctx);
 assert.ok(filtered.includes('data-ex-pick-topic="睡眠"'));
 assert.equal((filtered.match(/data-ex-pick-topic=/g)||[]).length,1);
 assert.doesNotMatch(filtered,/class="ex-count"|<small>\d+ テーマ<\/small>/);
});
