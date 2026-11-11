/* M6: strictly typed saved-record inquiry, without changing legacy notes. */
import {parseLegacyOrTypedLink,encodeTypedRecordQuery,normalizeRecordRef} from './recordRef.js';
import {renderFatigueInquiry} from './explorationInquiry.js';
import {renderMentalInquiry} from './explorationMentalInquiry.js';
import {renderBodyInquiry} from './explorationBodyInquiry.js';
import {renderConditionInquiry} from './explorationConditionInquiry.js';
import {renderLifeInquiry} from './explorationLifeInquiry.js';

export const FATIGUE_TOPIC=Object.freeze({category:'01',topic:'自分が感じた疲れ'});
const fail=(code,reason)=>({ok:false,code,reason});
const ok=value=>({ok:true,value});
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function explorationHref(ref,category,topic){
 if(typeof category!=='string'||!/^(0[1-7])$/.test(category)||typeof topic!=='string'||!topic.trim()||topic.length>90)throw new TypeError('Invalid exploration topic');
 return '#/exploration-tree?'+(ref?encodeTypedRecordQuery(ref)+'&':'')+'category='+encodeURIComponent(category)+'&topic='+encodeURIComponent(topic);
}
export function resolveExplorationContext(hash,{manual,gpsV2}={}){
 const parsed=parseLegacyOrTypedLink(hash,'exploration');
 if(!parsed.ok)return parsed;
 if(!parsed.value)return ok({kind:'GENERAL',ref:null,record:null});
 const ref=parsed.value;
 const source=ref.sourceType==='MANUAL'?manual:gpsV2;
 if(source?.ok!==true||!Array.isArray(source.records))return fail('READ_FAILED','指定した記録の保存領域を確認できません。別の記録には移動しません。');
 const record=source.records.find(r=>r?.id===ref.recordId);
 if(!record)return fail('NOT_FOUND','指定した保存済み走行記録がありません。別の走行へ自動的に切り替えません。');
 if(ref.sourceType==='MANUAL'&&!(record.schema===2&&record.source==='manual'&&record.type==='run'))return fail('SOURCE_MISMATCH','手入力の走行として検証できません。');
 if(ref.sourceType==='GPS_V2'&&!(record.schema===2&&typeof record.activeSeconds==='number'&&record.finalReference))return fail('SOURCE_MISMATCH','GPS記録の形式を確認できません。');
 return ok({kind:ref.sourceType==='MANUAL'?'MANUAL':'GPS_READONLY',ref,record});
}
export function gpsInquiryBridge(ctx,{topic=null,lifeContext=null}={}){
 const ref=normalizeRecordRef(ctx?.ref);
 if(!ref.ok||ref.value.sourceType!=='GPS_V2'||ctx.record?.id!==ref.value.recordId)throw new TypeError('Invalid GPS bridge');
 const r=ctx.record;
 const returnUrl='#/result?gps='+encodeURIComponent(r.id);
 const before=Number.isInteger(r.experience?.rofBefore)?r.experience.rofBefore:null;
 const after=Number.isInteger(r.experience?.rofAfter)?r.experience.rofAfter:null;
 const mentalTopic=topic==='気分・ストレス';
 const bodyTopic=topic==='筋肉痛・違和感';
 const conditionTopic=topic==='気温・天候';
 const lifeTopic=topic==='日々のコンディション';
 const otherTopic=mentalTopic||bodyTopic||conditionTopic||lifeTopic;
 const generalCategory=lifeTopic?'05':conditionTopic?'03':bodyTopic?'04':mentalTopic?'05':FATIGUE_TOPIC.category;
 const generalTopic=lifeTopic?'日々のコンディション':conditionTopic?'気温・天候':bodyTopic?'筋肉痛・違和感':mentalTopic?'気分・ストレス':FATIGUE_TOPIC.topic;
 const rof=`<p>ROF-J（本人回答）：運動前 ${before??'未回答'}／運動後 ${after??'未回答'}。回答区分・操作時点から変化の原因は分かりません。</p>`;
 return '<section class="ex-page ex-gps-bridge" data-gps-inquiry-bridge role="region" aria-label="GPS保存記録を確認"><h1>この走行の記録を確認する</h1><p>記録日：'+safe(r.date||'不明')+'／距離：'+safe(Number(r.distanceKm).toFixed(2))+' km（GPS計測値）。</p>'+(otherTopic?'':rof)+(lifeTopic?renderLifeInquiry({ref:ctx.ref,record:r,...(lifeContext||{})}):conditionTopic?renderConditionInquiry({ref:ctx.ref,record:r}):bodyTopic?renderBodyInquiry({ref:ctx.ref,record:r}):mentalTopic?renderMentalInquiry({ref:ctx.ref,record:r}):renderFatigueInquiry({ref:ctx.ref,record:r}))+'<p>そのときの経験について何が気になりますか？ 数字だけから疲労の理由や健康状態は判定できません。</p><p>このGPS記録を既存の手入力専用探究メモへ自動的には関連づけません。一般テーマは、記録との個別連動を解除して開けます。</p><div><a href="'+safe(returnUrl)+'">このGPS記録へ戻る</a><a href="'+safe(explorationHref(null,generalCategory,generalTopic))+'">記録と関連づけず一般テーマを見る</a></div></section>';
}
