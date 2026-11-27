import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONDITION_KEY,DAILY_STATE_LABELS,validDailyChoices,validEntry,conditionEntryFromForm,readConditions,saveCondition,deleteCondition,conditionCard,conditionPanel} from '../ui/homeExperience.js';
import {readLifeEntries,compareLifeDays} from '../ui/explorationReadAdapter.js';
import {renderConditionJourney,prepareConditionJourney} from '../ui/conditionJourney.js';
import {exportPortableBackup,inspectPortableBackup,planPortableRestore} from '../ui/dataManagement.js';
import {translateUiText} from '../ui/englishUi.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
const when='2026-11-27T09:31:00.000Z',day='2026-11-27',base={date:day,sleepMode:'none',feeling:'',memo:''};
const from=choices=>conditionEntryFromForm({...base,dailyChoices:choices},()=>when);
test('daily responses are independent of sleep and distinguish none, unsure, and unanswered',()=>{
 const a=from(['focus','motivation']);
 assert.equal(a.ok,true);
 assert.deepEqual(a.entry,{date:day,feeling:'',memo:'',sleepMinutes:null,dailyState:{choices:['focus','motivation'],recordedAt:when}});
 for(const c of [['none'],['unsure']])assert.equal(from(c).ok,true);
 for(const c of [[],['none','focus'],['unsure','none'],['bad'],['focus','focus'],null]){
  if(c===null)assert.equal(from(c).ok,false);else assert.equal(from(c).ok,false);
 }
 assert.equal(validDailyChoices([]),true);
 assert.equal(conditionEntryFromForm({...base,memo:'本人のメモ'}).ok,true);
 assert.equal(conditionEntryFromForm({...base,feeling:'良い'}).ok,true);
 assert.equal(conditionEntryFromForm({...base,sleepMode:'duration',durationHours:'7',durationMinutes:'30'}).ok,true);
 assert.equal(conditionEntryFromForm({...base,sleepMode:'clock',bedTime:'23:00',wakeTime:'',dailyChoices:['focus']}).ok,false);
 assert.equal(validEntry({...a.entry,dailyState:{choices:['focus'],recordedAt:'invalid'}}),false);
 assert.equal(validEntry({...a.entry,dailyState:{choices:['focus'],recordedAt:when,score:3}}),false);
 assert.equal(validEntry({...a.entry,sleepSource:'duration'}),false);
});
test('editing other fields preserves response timestamp, distinct dates, and no-sleep exclusion',()=>{
 const s=store(),older={date:'2026-11-26',sleepMinutes:420,sleepSource:'duration',feeling:'良い',memo:''},a=from(['focus','motivation']).entry;
 assert.ok(saveCondition(s,older).ok);assert.ok(saveCondition(s,a).ok);
 assert.ok(saveCondition(s,{...a,memo:'追加',dailyState:{...a.dailyState,recordedAt:'2026-11-27T10:00:00.000Z'}}).ok);
 const state=readConditions(s);
 assert.equal(state.entries[1].dailyState.recordedAt,when);
 assert.deepEqual(state.entries[0],older);
 const life=readLifeEntries(state);
 assert.equal(life.status,'complete');assert.equal(life.records[1].minutes,null);assert.equal(life.records[1].source,'not-recorded');
 assert.equal(compareLifeDays(life,older.date,day).status,'incompatible');
 const journey=prepareConditionJourney(state,{days:90});
 assert.equal(journey.allEntries.length,2);
 assert.ok(journey.entries.every(x=>x.minutes!==null));
 const html=renderConditionJourney(state,{dailySelected:day});
 assert.match(html,/集中しにくい/);assert.match(html,/data-cj-daily-date/);assert.match(html,/datetime="2026-11-27T09:31:00.000Z"/);
 assert.match(conditionPanel(s,day),/name="dailyChoices" value="focus" checked/);
 assert.ok(deleteCondition(s,day).ok);assert.deepEqual(readConditions(s).entries,[older]);
});
test('existing portable backup includes daily responses and fails closed on conflicting same-date restore',async()=>{
 const s=store(),a=from(['none']).entry;assert.ok(saveCondition(s,a).ok);
 const exported=await exportPortableBackup(s);assert.equal(exported.ok,true);
 const inspected=inspectPortableBackup(exported.text);assert.equal(inspected.ok,true);
 const plan=planPortableRestore(store(),exported.text);assert.equal(plan.ok,true);
 assert.deepEqual(JSON.parse(plan.writes[CONDITION_KEY]),[a]);
 const conflicting=store();assert.ok(saveCondition(conflicting,from(['unsure']).entry).ok);
 const raw=conflicting.getItem(CONDITION_KEY);assert.equal(planPortableRestore(conflicting,exported.text).ok,false);assert.equal(conflicting.getItem(CONDITION_KEY),raw);
});
test('new public labels are translated, and condition palette meets text/control contrast targets',()=>{
 for(const label of Object.values(DAILY_STATE_LABELS))assert.doesNotMatch(translateUiText(label),/[ぁ-ゟァ-ヿ一-龯]/,label);
 const css=readFileSync(new URL('../ui/homeExperience.css',import.meta.url),'utf8');
 const palettes=[...css.matchAll(/:root(?:\[data-theme="light"\])?\{(--condition-bg:[^}]+)\}/g)].map(m=>Object.fromEntries([...m[1].matchAll(/--condition-([\w-]+):#([0-9a-f]{6})/g)].map(x=>[x[1],x[2]])));
 assert.equal(palettes.length,2);
 const lum=s=>[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const p of palettes){
  for(const surface of ['bg','surface','raised','selected']){
   assert.ok(contrast(p.text,p[surface])>=7,'primary text '+surface);
   assert.ok(contrast(p.secondary,p[surface])>=4.5,'secondary text '+surface);
  }
  assert.ok(contrast(p['on-accent'],p.accent)>=4.5);
  assert.ok(contrast(p.line,p.surface)>=3);
  assert.ok(contrast(p.accent,p.surface)>=3);
 }
});
