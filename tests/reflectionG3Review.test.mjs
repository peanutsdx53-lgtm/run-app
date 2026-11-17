import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linkedReflectionNotes} from '../ui/noteRunLink.js';
import {createHistoryUi,renderHistory} from '../ui/historyExperience.js';
import {makeUi,render} from '../ui/explorationExperience.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const saved=n=>({id:id(n),source:'manual',sourceType:'MANUAL',type:'run',schema:2,date:'2026-11-15',activityGait:'RUNNING',distanceKm:5,durationSeconds:1800});
const manualRuns={ok:true,records:[saved(1),saved(2)]};
const notes=[
 {id:'note-a',category:'01',topicId:'voluntary-reflection',text:'RUN_A_PRIVATE_TEXT',recordId:id(1),createdAt:'2026-11-17T12:00:00Z'},
 {id:'note-b',category:'01',topicId:'voluntary-reflection',text:'RUN_B_PRIVATE_TEXT',recordId:id(2),createdAt:'2026-11-17T12:00:00Z'},
 {id:'old-a',category:'01',text:'OLD_A_WITHOUT_TOPIC_ID',recordId:id(1),createdAt:'2026-11-17T12:00:00Z'},
 {id:'unlinked',category:'03',text:'LEGACY_UNLINKED_TEXT',createdAt:'2026-11-16T12:00:00Z'}
];
const snapshot={readable:true,notes,manualRuns};
const cats=[{id:'01',name:'走りの記録',topics:['距離・時間・ペース','自分が感じた疲れ','過去の走りとの比較','気付きと次の確認']},{id:'03',name:'コースと環境',topics:['上り坂・下り坂','路面','気温・天候','屋外・室内']}];
test('G3 only explicitly verified manual run notes are returned, including old no-topic notes',()=>{
 const v=linkedReflectionNotes(snapshot,id(1));
 assert.equal(v.status,'ready');assert.deepEqual(v.notes.map(n=>n.id),['note-a','old-a']);
 assert.equal(v.notes.some(n=>n.text.includes('RUN_B')),false);
 assert.equal(linkedReflectionNotes(snapshot,id(2)).notes.length,1);
});
test('G3 unreadable, deleted, duplicate or GPS parents are never shown as zero ready notes',()=>{
 assert.equal(linkedReflectionNotes({readable:false,notes,manualRuns},id(1)).status,'unavailable');
 assert.equal(linkedReflectionNotes({readable:true,notes:[],manualRuns:{ok:false,records:[]}},id(1)).status,'not-linkable');
 assert.equal(linkedReflectionNotes(snapshot,id(3)).status,'not-linkable');
 assert.equal(linkedReflectionNotes({readable:true,notes,manualRuns:{ok:true,records:[saved(1),saved(1)]}},id(1)).status,'not-linkable');
 assert.equal(linkedReflectionNotes({readable:true,notes,manualRuns:{ok:true,records:[{...saved(1),source:'gps'}]}},id(1)).status,'not-linkable');
});
test('G3 linked notes in History are shown only for the selected run and do not print private body',()=>{
 const ui=createHistoryUi();ui.month='2026-11';ui.selectedId=id(1);
 let html=renderHistory(ui,[saved(1),saved(2)],{connected:true,reflectionData:snapshot,onOpenReflection:()=>{},onOpen:()=>{}});
 assert.match(html,/data-history-reflection-count/);assert.match(html,/保存した気づき<\/span>（2）/);assert.match(html,/data-open-reflections/);
 assert.doesNotMatch(html,/RUN_A_PRIVATE_TEXT|RUN_B_PRIVATE_TEXT|LEGACY_UNLINKED_TEXT/);
 ui.selectedId=id(2);html=renderHistory(ui,[saved(1),saved(2)],{connected:true,reflectionData:snapshot,onOpenReflection:()=>{},onOpen:()=>{}});
 assert.match(html,/保存した気づき<\/span>（1）/);
 const broken=renderHistory(ui,[saved(1),saved(2)],{connected:true,reflectionData:{...snapshot,readable:false},onOpenReflection:()=>{}});
 assert.match(broken,/保存した気づき：確認不可/);assert.doesNotMatch(broken,/data-open-reflections/);
 const gps={...saved(2),id:'gps-v2-12345678-1234-1234-1234-123456789abc',sourceType:'GPS_V2'};
 ui.selectedId=gps.id;html=renderHistory(ui,[gps],{connected:true,reflectionData:snapshot,onOpenReflection:()=>{}});
 assert.doesNotMatch(html,/data-history-reflection-count/);
});
test('G3 explicit focused Explore memory dialog does not include another run; general all notes retains legacy',()=>{
 const u=makeUi({getItem:()=>JSON.stringify(notes)});
 u.selected='01';u.topic='気付きと次の確認';u.modal='memories';
 let html=render(u,{categories:cats,focusRunId:id(1),focusRun:saved(1),manualRuns});
 assert.match(html,/RUN_A_PRIVATE_TEXT|OLD_A_WITHOUT_TOPIC_ID/);assert.match(html,/OLD_A_WITHOUT_TOPIC_ID/);
 assert.doesNotMatch(html,/RUN_B_PRIVATE_TEXT|LEGACY_UNLINKED_TEXT/);
 assert.match(html,/旧メモ（テーマ未設定）/);
 html=render(u,{categories:cats,focusRunId:null,focusRun:null,manualRuns});
 assert.match(html,/RUN_B_PRIVATE_TEXT/);assert.match(html,/LEGACY_UNLINKED_TEXT/);
});
test('G3 result links to explicit memories view; print and privacy remain protected',()=>{
 const src=readFileSync(new URL('../ui/resultExperience.js',import.meta.url),'utf8');
 assert.match(src,/data-result-reflection-count/);
 assert.match(src,/data-result-review-notes/);
 assert.match(src,/\&memories=1/);
 assert.match(src,/@media print\{\.rv4-reflection-next\{display:none!important\}\}/);
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/explorationUi\.modal=params\.get\('memories'\)==='1'/);
 assert.match(app,/onOpenReflection:/);
 const css=readFileSync(new URL('../ui/historyExperience.js',import.meta.url),'utf8');
 assert.match(css,/@media print\{\.hx-focus-reflection\{display:none!important\}\}/);
});
