import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resultReflectionEntry,resultConditionHref} from '../ui/resultExperience.js';
import {resolveExplorationContext} from '../ui/explorationLinkPolicy.js';
import {EXPLORATION_NOTE_KEY,makeUi,saveNote} from '../ui/explorationExperience.js';
import {ENGLISH_RESULT_COPY} from '../ui/englishResultCopy.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const record=n=>({id:id(n),source:'manual',type:'run',schema:2,date:'2026-11-17',distanceKm:5,durationSeconds:1800});
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const memory=()=>{const d=new Map();return {getItem:key=>d.get(key)??null,setItem:(k,v)=>d.set(k,String(v))}};
test('G2 first saved manual result links to explicit, typed, non-autoselected exploration topic',()=>{
 const r=record(1),href=resultReflectionEntry({saved:true,recordId:r.id,record:r});
 assert.equal(href,'#/exploration-tree?source=manual&record='+r.id+'&category=01&topic='+encodeURIComponent('気付きと次の確認'));
 const resolved=resolveExplorationContext(href,{manual:{ok:true,records:[r]}});
 assert.equal(resolved.ok,true);assert.equal(resolved.value.kind,'MANUAL');assert.equal(resolved.value.record.id,r.id);
});
test('G2 no linked writing for draft, no-result, GPS, wrong or missing IDs',()=>{
 const r=record(1);
 for(const args of [
  {saved:false,recordId:r.id,record:r},
  {saved:true,recordId:null,record:r},
  {saved:true,recordId:'invalid',record:r},
  {saved:true,recordId:id(2),record:r},
  {saved:true,recordId:r.id,record:{...r,source:'gps'}},
  {saved:true,recordId:r.id,record:{...r,schema:1}},
  {saved:true,recordId:r.id,record:{...r,type:'rest'}}
 ])assert.equal(resultReflectionEntry(args),null);
});
test('G2 saved run A can be linked to new optional note even without a comparison record',()=>{
 const s=memory(),ui=makeUi(s),r=record(1);
 ui.selected='01';ui.topic='気付きと次の確認';
 assert.equal(saveNote(ui,'今日はこう感じた',{focusRunId:r.id,manualRuns:{ok:true,records:[r]}}).ok,true);
 assert.equal(ui.notes[0].recordId,r.id);
 assert.equal(s.getItem(EXPLORATION_NOTE_KEY)!==null,true);
 assert.equal(saveNote(makeUi(s),'別の走行',{focusRunId:id(2),manualRuns:{ok:true,records:[r]}}).ok,false);
});
test('G2 card is outside preserved three panes, is non-printing and translates',()=>{
 const js=read('ui/resultExperience.js');const html=read('ui/englishResultCopy.js');
 assert.match(js,/data-result-reflection-entry/);
 assert.match(js,/\+conditionLink\(\)\+reflectionInvite\(\)/);
 assert.match(js,/\+resultNotice\(\)\+extras\(\)\+sourceDetails\(\)/);
 assert.match(js,/\+evidencePanel\(\)\+referenceHelp\(\)/);
 assert.match(js,/@media print\{[^\n]*\.rv4-reflection-next\{display:none!important\}\}/);
 assert.match(js,/RESULT_BODY_LAYOUT_STYLES\+RESULT_REFLECTION_ENTRY_STYLES/);
 for(const label of ['走行の振り返り','振り返りを書く（任意）']){
  assert.equal(typeof ENGLISH_RESULT_COPY[label],'string');assert.ok(html.includes(label));
 }
 assert.match(js,/const nav=\(\)=>/);
});

test('condition link uses only the exact saved day, no inferred day or draft',()=>{const r=record(1);assert.equal(resultConditionHref({saved:true,recordId:r.id,record:r}),'#/condition?date=2026-11-17');assert.equal(resultConditionHref({saved:true,recordId:id(2),record:r}),null);assert.equal(resultConditionHref({saved:false,recordId:r.id,record:r}),null);assert.equal(resultConditionHref({gps:{schema:2,date:'2026-11-17'}}),'#/condition?date=2026-11-17');assert.equal(resultConditionHref({gps:{schema:2,date:'2026-02-31'}}),null);});
