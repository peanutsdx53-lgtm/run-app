/** E7: candidate T01/T07/T09/T10 must use existing guide or note duties.
 * Never convert candidate labels into new category IDs, medical scoring or stores.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeUi,render,LEARNING_TOPICS,saveNote,editNote,deleteNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
import {EXPLORATION_DRAFT_GUIDES,validateExplorationCatalog} from '../ui/explorationTopicGuides.js';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const categories=[...app.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)]
 .map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
const memory=()=>{const items=new Map();return{
 getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,String(v)),removeItem:k=>items.delete(k)
}};
const ctx={categories,draft:{},conditions:{entries:[]}};
const show=(cat,topic,storage=memory())=>{
 const ui=makeUi(storage);ui.selected=cat;ui.topic=topic;
 return {ui,html:render(ui,ctx),storage};
};
test('E7 all merged candidate targets stay inside the original 7 x 4, 10 sourced / 18 prompt catalog',()=>{
 assert.equal(categories.length,7);
 assert.deepEqual(validateExplorationCatalog(categories,Object.keys(LEARNING_TOPICS)),{
  total:28,learned:10,observation:18,missing:[],unknown:[],ok:true
 });
 const targets=[['01','気付きと次の確認'],['06','走行中の対応'],['06','ウォームアップ'],
  ['06','クールダウン・ストレッチ'],['06','無理をしない判断'],
  ['07','走る目的'],['07','楽しみ方'],['07','自分に合う記録の使い方']];
 for(const [cat,topic] of targets){
  assert.ok(categories.find(x=>x.id===cat)?.topics.includes(topic),cat+' '+topic);
  const h=show(cat,topic).html;
  assert.match(h,/data-experience-v3/);
  assert.equal((h.match(/data-ex-action="note"/g)||[]).length,1,
   'one legacy optional note entry '+cat+'|'+topic);
  assert.doesNotMatch(h,/data-e-inquiry="T01"|data-e-inquiry="T07"|data-e-inquiry="T09"|data-e-inquiry="T10"/);
 }
});
test('E7 T01: impressions use sourced existing reflection and optional writing; no mandatory question',()=>{
 const {html}=show('01','気付きと次の確認');
 assert.match(html,/data-ex-learning="voluntary-reflection"/);
 assert.match(html,/気づきを残す/);
 const ui=makeUi(memory());ui.selected='01';ui.topic='気付きと次の確認';ui.modal='learn-help';
 const source=render(ui,ctx);
 assert.match(source,/中断|再開/,'origin and applicability belong to the existing sourced information panel');
 assert.doesNotMatch(html,/入力必須|正解です|危険度スコア/);
});
test('E7 T07 & T09: mid-run practices and goal/enjoyment remain independent non-scoring guides',()=>{
 const keys=['06|ウォームアップ','06|走行中の対応','06|クールダウン・ストレッチ',
 '06|無理をしない判断','07|走る目的','07|楽しみ方'];
 for(const key of keys){
  const [cat,topic]=key.split('|');
  const guide=EXPLORATION_DRAFT_GUIDES[key];
  assert.equal(guide?.status,'design-prompt',key);
  const h=show(cat,topic).html;
  assert.match(h,/観察ガイド/);
  assert.match(h,/専門解説は出典審査前/);
  assert.match(h,/情報の出所と読み取れる範囲/);
  assert.match(h,/気づきを残す/);
  assert.match(h,/data-ex-action="note"/);
  assert.doesNotMatch(h,/data-e-inquiry="T07"|data-e-inquiry="T09"|正答率|心理状態を診断した/);
 }
});
test('E7 T10: next question uses existing note ID/revision/delete across old sourced topics, no new store',()=>{
 const storage=memory(),ui=makeUi(storage);
 ui.selected='01';ui.topic='気付きと次の確認';
 const n=saveNote(ui,'次の走行で確かめたいこと');
 assert.equal(n.ok,true);
 assert.equal(ui.notes.length,1);
 const id=ui.notes[0].id;
 const topicId=ui.notes[0].topicId;
 assert.equal(topicId,'voluntary-reflection');
 assert.equal(storage.getItem(EXPLORATION_NOTE_KEY)!==null,true);
 const changed=editNote(ui,id,'以前の問いを更新し、次の確認を残す');
 assert.equal(changed.ok,true);
 assert.equal(ui.notes[0].id,id);
 assert.equal(ui.notes[0].topicId,topicId);
 assert.equal(ui.notes[0].revisions.length,1);
 const reopened=makeUi(storage);reopened.selected='01';reopened.topic='気付きと次の確認';
 const html=render(reopened,ctx);
 assert.match(html,/以前の問いを更新し、次の確認を残す/);
 assert.equal(deleteNote(reopened,id),true);
 assert.equal(makeUi(storage).notes.length,0);
 assert.doesNotMatch(storage.getItem(EXPLORATION_NOTE_KEY)||'',/T10|new_inquiry|lifeKind/);
});
