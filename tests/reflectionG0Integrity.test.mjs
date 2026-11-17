import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUi,render,saveNote,deleteNote,editNote,EXPLORATION_NOTE_KEY,LEARNING_TOPICS} from '../ui/explorationExperience.js';
import {visibleTopicNotes} from '../ui/noteRunLink.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const now='2026-11-17T00:00:00.000Z';
const category={id:'03',name:'コース',topics:['上り坂・下り坂','路面','気温・天候','屋外・室内']};
const run=n=>({id:id(n),date:'2026-11-17',createdAt:now,source:'manual',type:'run',schema:2,distanceKm:5,durationSeconds:1800});
const storage=(raw=null)=>{const m=new Map(raw===null?[]:[[EXPLORATION_NOTE_KEY,raw]]);return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const ctx=(runId=null)=>({categories:[category],draft:{},conditions:{entries:[]},manualRuns:{ok:true,records:runId?[run(1),run(2)]:[]},focusRunId:runId,focusRun:runId?run(runId===id(1)?1:2):null});
const note=(idValue,txt,runId=null)=>({id:idValue,category:'03',topicId:LEARNING_TOPICS['03|上り坂・下り坂'],text:txt,createdAt:now,...(runId?{recordId:runId}:{})});
test('G0 RF-15 initial visible theme is also persisted and revisited',()=>{
 const s=storage(),u=makeUi(s),html=render(u,ctx());
 assert.match(html,/上り坂・下り坂/);
 assert.equal(u.selected,'03');assert.equal(u.topic,'上り坂・下り坂');
 assert.equal(saveNote(u,'この坂道の気づき').ok,true);
 assert.equal(u.notes[0].topicId,LEARNING_TOPICS['03|上り坂・下り坂']);
 assert.match(render(makeUi(s),ctx()),/この坂道の気づき/);
});
test('G0 RF-16 standalone theme never previews notes from saved runs',()=>{
 const s=storage(JSON.stringify([note('run-A','RUN_A_CONFIDENTIAL',id(1)),note('alone','STANDALONE')]));
 const u=makeUi(s),h=render(u,ctx());
 assert.match(h,/STANDALONE/);assert.doesNotMatch(h,/RUN_A_CONFIDENTIAL/);
 assert.deepEqual(visibleTopicNotes(u.notes,LEARNING_TOPICS['03|上り坂・下り坂']).map(n=>n.id),['alone']);
});
test('G0 RF-17 category badges are scoped to explicit selected run, not other runs',()=>{
 const s=storage(JSON.stringify([note('A','FROM_A',id(1)),note('B','FROM_B',id(2))]));
 const u=makeUi(s),h=render(u,ctx(id(1)));
 assert.match(h,/aria-label="1件のメモ"/);assert.doesNotMatch(h,/aria-label="2件のメモ"/);
});
test('G0 RF-18 unreadable notes are not presented as zero or an empty list',()=>{
 const s=storage('{broken'),u=makeUi(s);
 assert.equal(u.canSave,false);
 const h=render(u,ctx());assert.match(h,/確認不可/);assert.doesNotMatch(h,/ふり返り <span>0<\/span>/);
 u.modal='memories';assert.match(render(u,ctx()),/role="alert"/);
 assert.doesNotMatch(render(u,ctx()),/まだ書いたことはありません/);
 assert.equal(s.getItem(EXPLORATION_NOTE_KEY),'{broken');
});
test('G0 RF-27 duplicate IDs fail closed, no deletion or edit of multiple notes',()=>{
 const raw=JSON.stringify([note('duplicate','FIRST'),note('duplicate','SECOND')]);
 const s=storage(raw),u=makeUi(s);assert.equal(u.canSave,false);
 assert.equal(deleteNote(u,'duplicate'),false);assert.equal(editNote(u,'duplicate','changed').ok,false);
 assert.equal(s.getItem(EXPLORATION_NOTE_KEY),raw);
 const manual={...makeUi(storage()),notes:[note('duplicate','FIRST'),note('duplicate','SECOND')]};
 assert.equal(deleteNote(manual,'duplicate'),false);
 assert.equal(editNote(manual,'duplicate','changed').ok,false);
});
test('G0 preserves legacy notes with no topicId and ordinary CRUD with unique IDs',()=>{
 const old=note('old','OLD');delete old.topicId;
 const s=storage(JSON.stringify([old]));const u=makeUi(s);
 assert.equal(u.canSave,true);assert.equal(u.notes[0].topicId,undefined);
 assert.equal(saveNote(u,'NEW').ok,true);const newId=u.notes[0].id;
 assert.equal(editNote(u,newId,'REVISED').ok,true);
 assert.equal(deleteNote(u,newId),true);
 assert.equal(u.notes.length,1);assert.equal(u.notes[0].id,'old');
});