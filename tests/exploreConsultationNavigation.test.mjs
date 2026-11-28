import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeUi,render,saveNote} from '../ui/explorationExperience.js';
import {consultationInitialRecord,renderConsultation} from '../ui/consultationExperience.js';
import {translateUiText} from '../ui/englishUi.js';
import {captureConsultationFromExplore} from '../ui/explorationLinkPolicy.js';
const raw=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const categories=[...raw.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)].map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
const ctx={categories,draft:{},conditions:{entries:[]},manualRuns:{ok:true,records:[]}};
test('all 27 Explore topics have one optional note action and one genuine consultation link',()=>{
 assert.equal(categories.flatMap(c=>c.topics).length,27);
 for(const cat of categories)for(const topic of cat.topics){
  const ui=makeUi(storage());Object.assign(ui,{selected:cat.id,topic});
  const html=render(ui,ctx);
  assert.equal((html.match(/data-ex-consultation href="#\/consultation\?from=explore"/g)||[]).length,1,topic);
  assert.equal((html.match(/data-ex-action="note"/g)||[]).length,1,topic);
  assert.equal((html.match(/data-ex-action="memories"/g)||[]).length,1,topic);
  assert.doesNotMatch(html,/自分の言葉で書く|相談用にまとめる|data-ex-action="share"/);
  assert.match(html,/任意で記録できます/);
  assert.match(html,/情報の出所と限界/);
 }
});
test('consultation from Explore selects only the explicitly verified manual record, never an alternative',()=>{
 const a={id:'a',source:'manual'},b={id:'b',source:'manual'},g={id:'g',source:'gps-v2'},records=[b,a,g];
 assert.equal(consultationInitialRecord(records),'b');
 for(const id of [undefined,null,'missing','g'])assert.equal(consultationInitialRecord(records,{fromExplore:true,recordId:id}),'');
 assert.equal(consultationInitialRecord(records,{fromExplore:true,recordId:'a'}),'a');
 assert.equal(consultationInitialRecord([a,a,b],{fromExplore:true,recordId:'a'}),'');
 const back='#/exploration-tree?category=03&topic=hill';
 assert.match(renderConsultation({fromExplore:true,returnHref:back}),/href="#\/exploration-tree\?category=03&amp;topic=hill" class="cp-back" aria-label="探究に戻る"/);
 assert.match(renderConsultation({fromExplore:true,returnHref:'https://evil.example'}),/href="#\/exploration-tree" class="cp-back"/);
 assert.match(renderConsultation(),/href="#\/home" class="cp-back"/);
});
test('saved notes are escaped, private, optional and never copied into consultation',()=>{
 const s=storage(),ui=makeUi(s);Object.assign(ui,{selected:'03',topic:'上り坂・下り坂'});
 const note='PRIVATE-本人のメモ <example>';
 assert.equal(saveNote(ui,note).ok,true);
 const before=s.getItem('runload-v2-exploration-notes-v1');
 assert.match(render(ui,ctx),/PRIVATE-本人のメモ &lt;example&gt;/);
 assert.doesNotMatch(renderConsultation({fromExplore:true}),/PRIVATE-|data-ex-draft-text/);
 assert.equal(s.getItem('runload-v2-exploration-notes-v1'),before);
 const el={closest:q=>q==='.ex-page'?{}:null,matches:q=>q==='.ex-note-count'};
 assert.equal(translateUiText('1件',{element:el}),'1 note');
 for(const copy of ['気づき・疑問を残す','メモを書く','相談・共有画面へ','探究に戻る','記録を選択してください','保存したメモはふり返りノートから読み返せます。']){
  assert.notEqual(translateUiText(copy),copy);
  assert.equal(translateUiText(copy,{element:{closest:q=>q==='[data-user-authored]'?{}:null}}),copy);
 }
});

test('navigation context preserves the exact theme and controls, not user text or unverified records',()=>{
 const ui={selected:'03',topic:'上り坂・下り坂',tab:'field',toolChoice:'down',notes:[{text:'PRIVATE-NOTE'}],followup:'PRIVATE-DRAFT'};
 const route='#/exploration-tree?category=03&topic=hill';
 const id='run-v1-00000000-0000-4000-8000-000000000001';
 const record={id,source:'manual',schema:2,type:'run',memo:'PRIVATE-RECORD'};
 const sources={manual:{ok:true,records:[record]}};
 const general=captureConsultationFromExplore(route,ui,sources);
 assert.equal(general.recordId,null);assert.equal(general.route,route);assert.equal(general.selection.toolChoice,'down');
 const focused=route+'&source=manual&record='+id;
 assert.equal(captureConsultationFromExplore(focused,ui,sources).recordId,id);
 assert.equal(captureConsultationFromExplore(focused,ui,{manual:{ok:true,records:[]}}).recordId,null);
 assert.equal(captureConsultationFromExplore(focused+'&record='+id,ui,sources).recordId,null);
 assert.doesNotMatch(JSON.stringify(captureConsultationFromExplore(focused,ui,sources)),/PRIVATE-|notes|followup/);
});
