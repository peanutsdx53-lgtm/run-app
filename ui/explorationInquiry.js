/** E1 T02: personal examination, not a lesson, diagnosis or fatigue score. */
import {normalizeRecordRef} from './recordRef.js';
export const FATIGUE_INQUIRY=Object.freeze({id:'T02',category:'01',topic:'自分が感じた疲れ',question:'この疲れの回答をどう捉えた？',role:'本人が記録の意味・限界を吟味し、次の疑問を形成する'});
const empty=state=>Object.freeze({state,source:'none',before:null,after:null,hasAnswer:false});
const rof=x=>Number.isInteger(x)&&x>=0&&x<=10?x:null;
export function fatigueInquiryModel({ref=null,record=null}={}){
 if(ref===null&&record===null)return empty('NO_RECORD');
 const n=normalizeRecordRef(ref);
 if(!n.ok||!record||record.id!==n.value.recordId)return empty('UNVERIFIED');
 const source=n.value.sourceType;
 const valid=source==='MANUAL'?
  record.schema===2&&record.source==='manual'&&record.type==='run':
  record.schema===2&&Number.isFinite(record.activeSeconds)&&record.activeSeconds>0&&!!record.finalReference;
 if(!valid)return empty('UNVERIFIED');
 const a=source==='MANUAL'?record:record.experience;
 const before=rof(a?.rofBefore),after=rof(a?.rofAfter);
 return Object.freeze({state:'VERIFIED',source,before,after,hasAnswer:before!==null||after!==null});
}
export function renderFatigueInquiry(input={},options={}){
 const m=fatigueInquiryModel(input);
 const evidence=m.state==='NO_RECORD'?
  '<p data-e-evidence="empty">走行記録を指定していません。本人の数値を推測せず、記録がなくてもこの問いを考えられます。</p>':
  m.state==='UNVERIFIED'?
  '<p data-e-evidence="unverified" role="status">指定された記録を安全に照合できません。ほかの走行の値で代用しません。</p>':
  '<p data-e-evidence="rof"><strong>ROF-J（本人回答）</strong>：運動前 '+(m.before??'未回答')+
  ' ／ 運動後 '+(m.after??'未回答')+'。'+(m.hasAnswer?'保存済みの本人の回答です。':'この記録には確認できる回答がありません。')+'</p>';
 const sourceLabel={MANUAL:'本人が手入力した走行',GPS_V2:'GPSの保存記録'};
 const canWrite=options.allowLegacyMemo===true&&(m.state==='NO_RECORD'||m.state==='VERIFIED'&&m.source==='MANUAL');
 return '<section class="ex-e-inquiry" data-e-inquiry="T02" data-e-state="'+m.state+'" data-e-source="'+m.source+
  '" aria-labelledby="ex-e-t02-title"><small class="ex-e-kicker">本人の記録について考える</small>'+
  '<h3 id="ex-e-t02-title">'+FATIGUE_INQUIRY.question+'</h3>'+
  (m.state==='VERIFIED'?'<p class="ex-e-provenance">出所：'+sourceLabel[m.source]+'</p>':'')+evidence+
  '<div class="ex-e-boundary"><strong>この記録だけでは分からないこと</strong>'+
  '<p>運動前・運動後は本人が選んだ回答区分です。実際の評価時刻、変化の原因、身体の状態はこの回答だけでは確定できません。</p></div>'+
  '<p class="ex-e-prompt">そのときの経験について何が気になりますか？ 以前の経験や状況と照らして、次に確かめたいことを自分で考えられます。</p>'+
  '<small>問いへの答えに正解・不正解はありません。記述は任意です。一般知識の学習・復習とは別の活動です。</small>'+
  (canWrite?'<button type="button" class="ex-e-memo" data-ex-action="note">この問いについて書く（任意）</button>':'')+'</section>';
}
