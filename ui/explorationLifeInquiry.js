/** E6 T06: explicit, SESSION-ONLY examination of a runner-chosen life/rest day.
 * The run, life record and rest day are THREE independent saved sources.
 * A matching calendar date NEVER creates an association and no data is written.
 * Existing Condition Journey owns sleep history; rest store owns rest declarations;
 * this inquiry asks what the user wants to examine, without scoring causes.
 */
import {normalizeRecordRef} from './recordRef.js';
import {fatigueInquiryModel} from './explorationInquiry.js';
import {readLifeEntries} from './explorationReadAdapter.js';
import {validEntry} from './homeExperience.js';
export const LIFE_INQUIRY=Object.freeze({
 id:'T06',category:'05',topic:'日々のコンディション',
 question:'この走行と、自分で選んだ生活・休養の記録から何を確かめたい？',
 role:'別々の原本を本人の明示選択で並べ、時点・欠測・記録方法の限界から問いを考える'
});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','&lt;':'&lt;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const result=(status,reason,more={})=>Object.freeze({status,reason,...more});
const validDate=s=>{
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+'T12:00:00Z');
 return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===s;
};
export function lifeInquiryModel({ref=null,record=null,conditions=null,rests=null,selection=null}={}){
 const parent=fatigueInquiryModel({ref,record});
 if(parent.state==='NO_RECORD')return result('NO_RUN','走行記録が指定されていません');
 if(parent.state!=='VERIFIED')return result('UNVERIFIED','走行記録の出所とIDを照合できません');
 const n=normalizeRecordRef(ref);
 if(!n.ok)return result('UNVERIFIED','走行記録のIDが正しくありません');
 const current={ref:n.value,date:record.date||'不明',kind:n.value.sourceType};
 if(selection===null)return result('NEED_SELECTION','比較する生活または休養の記録は、まだ本人が選んでいません',{current});
 if(selection?.duplicate===true||selection?.invalid===true||
  !['life','rest'].includes(selection?.kind)||!validDate(selection?.date))
  return result('BAD_SELECTION','生活・休養の種類と日付を一組だけ指定してください',{current});
 if(selection.kind==='life'){
  const entries=readLifeEntries(conditions);
  if(entries.status!=='complete')return result('READ_ERROR','生活記録の保存状態を安全に読み取れません',{current});
  const saved=conditions.entries.find(x=>x.date===selection.date);
  if(!saved)return result('MISSING','選択した日付の生活記録が存在しません。ほかの日には切り替えません',{current});
  if(!validEntry(saved))return result('READ_ERROR','生活記録の形式を確認できません',{current});
  const described=entries.records.find(x=>x.date===selection.date);
  if(!described)return result('READ_ERROR','生活記録の入力方式を確認できません',{current});
  return result('READY','本人が選択した別々の記録です',{
   current,kind:'life',day:selection.date,
   sleepSource:described.source,sleepMinutes:described.minutes,
   feeling:saved.feeling||null,memo:saved.memo||null});
 }
 if(rests?.ok!==true||!Array.isArray(rests.records))
  return result('READ_ERROR','休養日の保存状態を安全に読み取れません',{current});
 const rest=rests.records.find(x=>x.date===selection.date);
 if(!rest)return result('MISSING','選択した日付の休養記録が存在しません。ほかの日には切り替えません',{current});
 if(rest.id!=='rest-v1-'+selection.date||rest.type!=='rest'||rest.source!=='manual'||
  typeof rest.memo!=='string'||typeof rest.bodyObservation!=='string'||
  typeof rest.environmentNote!=='string')
  return result('READ_ERROR','休養日の原本を確認できません',{current});
 return result('READY','本人が選択した別々の記録です',{
  current,kind:'rest',day:selection.date,
  memo:rest.memo,bodyObservation:rest.bodyObservation,
  environmentNote:rest.environmentNote});
}
export function renderLifeInquiry(input={}){
 const m=lifeInquiryModel(input);
 let detail='';
 if(m.status==='READY'){
  if(m.kind==='life'){
   const method=m.sleepSource==='self-reported'?'本人申告の睡眠時間':
    m.sleepSource==='time-in-bed'?'就床から起床までの経過時間':
    '方法が確認できない旧記録（時間を比較しません）';
   const duration=m.sleepMinutes!==null&&['self-reported','time-in-bed'].includes(m.sleepSource)
    ?String(m.sleepMinutes)+'分':'値の意味を確定できません';
   detail='<p>選択した生活記録：'+esc(m.day)+'。出所：'+esc(method)+'。値：'+esc(duration)+'。</p>'+
    '<p>本人が記録したその日の調子：'+esc(m.feeling||'未入力')+'。</p>'+
    '<p>生活メモ：'+esc(m.memo||'記述なし')+'。</p>';
  }else{
   detail='<p>選択した休養日：'+esc(m.day)+'。本人が別に保存した「休養」の申告であり、実際に一切走らなかったことを測定した記録ではありません。</p>'+
    '<p>休養日のメモ：'+esc(m.memo||'記述なし')+'。</p>'+
    '<p>本人の身体の記述：'+esc(m.bodyObservation||'記述なし')+'。</p>'+
    '<p>本人の環境メモ：'+esc(m.environmentNote||'記述なし')+'。</p>';
  }
  detail='<div class="ex-e-life-evidence" data-e-life-evidence>'+
   '<p>選択中の走行：'+esc(m.current.date)+'／出所：'+esc(m.current.kind)+'。</p>'+
   detail+'</div><div class="ex-e-boundary"><strong>この並びから判断できないこと</strong>'+
   '<p>日付が同じでも、走行と生活・休養の出来事が同時だったとは限りません。日付や時刻だけで両者を自動結合せず、睡眠・休養が疲労感、回復、走行結果を変えた原因とも判定しません。</p></div>'+
   '<p class="ex-e-prompt">この走行を思い返すとき、選んだ生活・休養の情報から次に確かめたいことは何ですか？</p>';
 }else detail='<p data-e-life-evidence role="status">'+esc(m.reason)+
  '。同じ日付というだけで生活と走行を結び付けたり、別の記録を自動選択したりしません。</p>';
 const controls=m.current?
  '<div class="ex-e-life-choice"><label for="ex-e-life-date">自分で確認したい生活・休養の日付</label>'+
  '<input id="ex-e-life-date" data-e-life-date type="date" aria-describedby="ex-e-life-date-hint">'+
  '<small id="ex-e-life-date-hint">走行日と一致しなくても選べます。選択はこの画面だけで使い、保存しません。</small>'+
  '<div class="ex-e-life-buttons"><button type="button" class="ex-e-memo" data-e-life-kind="life">この日付の生活記録を確認</button>'+
  '<button type="button" class="ex-e-memo" data-e-life-kind="rest">この日付の休養記録を確認</button></div>'+
  '<p data-e-life-notice role="status" aria-live="polite"></p></div>':'';
 return '<section class="ex-e-inquiry ex-e-life-inquiry" data-e-life-inquiry="T06" data-e-state="'+m.status+
  '" aria-labelledby="ex-e-t06-title"><small class="ex-e-kicker">本人が選択して考える問い</small>'+
  '<h3 id="ex-e-t06-title">'+LIFE_INQUIRY.question+'</h3>'+
  detail+controls+
  '<p><a class="ex-e-compare-link" href="#/condition">生活記録の履歴と入力方式を確認する</a>'+
  '<a class="ex-e-compare-link" href="#/history">走行・休養の履歴を確認する</a></p>'+
  '<small>ここは新しい睡眠・休養入力や比較計算ではありません。学習の採点や自動的な走行処方も行いません。既存テーマの任意メモとは独立した読取専用の問いです。</small></section>';
}
