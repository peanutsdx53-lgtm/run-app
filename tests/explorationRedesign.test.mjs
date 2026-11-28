import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeUi,render,saveNote,LEARNING_TOPICS,EXPLORATION_NOTE_KEY,catalogCards} from '../ui/explorationExperience.js';
import {EXPLORATION_DRAFT_GUIDES} from '../ui/explorationTopicGuides.js';
import {EXPLORE_THEMES,EXPLORE_LEGACY,EXPLORE_GROUPS,themeFor,availableViews,ENGLISH_EXPLORE_REDESIGN} from '../ui/explorationRedesign.js';
import {translateUiText} from '../ui/englishUi.js';
import {runningJointDiagram,paceDiagram,runningPhaseDiagram} from '../ui/explorationDiagrams.js';
const raw=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const categories=[...raw.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)].map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
const ctx={categories,draft:{},conditions:{entries:[]},manualRuns:{ok:true,records:[]}};
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('4 groups and 12 main themes cover all 27 actual legacy views exactly, without changing persistent IDs',()=>{
 assert.equal(EXPLORE_GROUPS.length,4);assert.equal(Object.keys(EXPLORE_THEMES).length,12);assert.equal(availableViews(categories).length,27);
 const expected={...LEARNING_TOPICS,...Object.fromEntries(Object.entries(EXPLORATION_DRAFT_GUIDES).map(([k,v])=>[k,v.id]))};
 assert.deepEqual(Object.fromEntries(Object.entries(EXPLORE_LEGACY).map(([k,v])=>[k,v.id])),expected);
 for(const id of Object.keys(EXPLORE_THEMES))assert.equal(Object.values(EXPLORE_LEGACY).filter(v=>v.main===id&&v.default).length,1);
 assert.equal((catalogCards(categories).match(/data-ex-main=/g)||[]).length,12);
});
test('each actual view displays knowledge, limits and one optional note/consultation entry; sources have no outbound links',()=>{
 for(const cat of categories)for(const topic of cat.topics){
 const theme=themeFor(cat.id,topic),ui=makeUi(memory());Object.assign(ui,{selected:cat.id,topic});const html=render(ui,ctx);
 for(const phrase of [theme.question[0],theme.insight[0],theme.review[0],theme.consider[0],theme.limit[0]])assert.ok(html.includes(phrase),cat.id+' '+topic+' '+phrase);
 assert.equal((html.match(/class="ex-inquiry-start"/g)||[]).length,1);
 assert.equal((html.match(/data-ex-action="note"/g)||[]).length,1);
 assert.equal((html.match(/data-ex-consultation href=/g)||[]).length,1);
 assert.doesNotMatch(html,/href="https?:|data-ex-action="learn-help"/);
 assert.equal(ENGLISH_EXPLORE_REDESIGN[theme.insight[0]],theme.insight[1]);
 assert.equal(ENGLISH_EXPLORE_REDESIGN[theme.limit[0]],theme.limit[1]);
 if(theme.sources.length){const kind=theme.main==='A1'?'calculation':['A2','D2'].includes(theme.main)?'design':theme.main==='A3'?'model':'research';assert.ok(html.includes('data-ex-source-kind="'+kind+'"')); for(const source of theme.sources)assert.ok(html.includes(source[0]));}else assert.match(html,/観察の視点/);
 }
});
test('existing IDs, note data and voluntary saves are retained for all views',()=>{
 for(const v of availableViews(categories)){
 const s=memory(),ui=makeUi(s);Object.assign(ui,{selected:v.category,topic:v.topic});assert.equal(saveNote(ui,'本人の言葉').ok,true);const before=s.getItem(EXPLORATION_NOTE_KEY);const reopened=makeUi(s);Object.assign(reopened,{selected:v.category,topic:v.topic});assert.match(render(reopened,ctx),/本人の言葉/);assert.equal(reopened.notes[0].topicId,v.id);assert.equal(s.getItem(EXPLORATION_NOTE_KEY),before);
 }
});
test('new English copy is scoped to Explore and never translates authored text',()=>{
 const e={closest:s=>s==='.ex-page',matches:()=>false};
 const text=EXPLORE_THEMES.B2.title[0];assert.equal(translateUiText(text,{element:e}),EXPLORE_THEMES.B2.title[1]);
 assert.equal(translateUiText(text,{element:{closest:s=>s==='[data-user-authored]',matches:()=>false}}),text);
 assert.equal(translateUiText('上りの動き'),'Uphill Movement');
});
test('diagram encodes position rather than intensity, and pace example uses unequal bar heights for unequal split durations',()=>{
 for(const mode of ['up','down','flat']){const h=runningJointDiagram(mode);assert.match(h,/負荷の強さを示すものではありません/);assert.equal((h.match(/r="5\.4"/g)||[]).length,3);}
 const h=paceDiagram();for(const n of [35,42,49])assert.ok(h.includes('--bar:'+n+'px'));
});

test('additional diagrams are examples, with no personal load or generated conclusion',()=>{const diagram=runningPhaseDiagram();assert.equal((diagram.match(/class="ex-phase-svg"/g)||[]).length,2);assert.match(diagram,/接地している脚/);assert.match(diagram,/地面を離れた脚/);assert.match(diagram,/関節角度や負荷を測定した図ではありません/);});
test('a general learning entry cannot disclose a saved run or daily record even when supplied to the renderer',()=>{const ui=makeUi(memory());Object.assign(ui,{selected:'01',topic:'距離・時間・ペース'});const html=render(ui,{...ctx,learningEntry:true,manualRuns:{ok:true,records:[{id:'private-run',source:'manual',type:'run',schema:2,date:'2026-10-05',distanceKm:99,durationSeconds:9000}]},conditions:{entries:[{date:'2026-10-06',sleepMinutes:333,sleepSource:'duration',feeling:'PRIVATE-LIFE'}]}});assert.match(html,/走行は未選択です/);assert.doesNotMatch(html,/private-run|2026-10-05|2026-10-06|PRIVATE-LIFE|99\.00 km/);});

test('catalog resolves all 27 legacy perspectives in Japanese and English without duplicating primary themes',()=>{
 const element={closest:s=>s==='.ex-page',matches:()=>false};
 for(const v of availableViews(categories)){
  for(const query of [v.topic,translateUiText(v.topic,{element})]){
   const html=catalogCards(categories,query);
   const tag=`data-ex-category="${v.category}" data-ex-pick-topic="${v.topic}" data-ex-main="${v.main}"`;
   assert.ok(html.includes(tag),query+' must lead to '+v.id);
   assert.equal((html.match(new RegExp('data-ex-main="'+v.main+'"','g'))||[]).length,1,query+' duplicate primary theme');
  }
 }
 assert.equal((catalogCards(categories,'  sLeEp  ').match(/data-ex-pick-topic="睡眠"/g)||[]).length,1);
 assert.match(catalogCards(categories,'no-matching-theme-xyz'),/ex-catalog-empty/);
});
