/* Research provenance for the result UI only. Does not calculate or alter reference values.
 * Gazendam research adoption: use published leg length 0.99 m (Methods/Table 2 note)
 * with Table 3 coefficients and Eq(4). Rounded Table 2 entries are NOT
 * silently substituted as exact velocities or as a competing reference rule.
 * The publisher-table discrepancy remains an explicitly documented limitation.
 * Every field is selected from the actual activity's approved evidence route. */
import {RUNNING_REGION_BY_ID} from '../core/runningEvidence/runningEvidenceRegistry.js';
import {bodyReferenceEngineId} from './bodyReferencePresentation.js';

const RUNNING_CITATIONS=Object.freeze({
 'Fukuchi_2017_PeerJ_e3298.pdf':Object.freeze({label:'Fukuchi ほか（2017）',url:'https://doi.org/10.7717/peerj.3298'}),
 'Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf':Object.freeze({label:'Gazendam・Hof（2007）',url:'https://doi.org/10.1016/j.gaitpost.2006.06.013'}),
 'per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf':Object.freeze({label:'Van Hooren ほか（2024）',url:'https://doi.org/10.1111/sms.14570'}),
 'Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf':Object.freeze({label:'Li ほか（2020）',url:'https://doi.org/10.24264/lfj.20.2.7'})
});
const WALK_JOG_CITATIONS=Object.freeze({
 JIN_2018_UO:'Jin ほか（2018）',
 HOF_2002_CGA:'Hof ほか（2002）',
 WARD_2004:'Ward ほか（2004）',
 VOLOSHIN_2000:'Voloshin ほか（2000）',
 KEULER_2019:'Keuler ほか（2019）',
 LEYH_2022:'Leyh ほか（2022）',
 HAMNER_DELP_2013:'Hamner・Delp（2013）',
 HO_2021:'Ho ほか（2021）',
 KAWAMOTO_2002:'Kawamoto ほか（2002）',
 ARAMPATZIS_2023:'Arampatzis ほか（2023）',
 HO_2010:'Ho ほか（2010）'
});
function describeActivityMetric(id){
 const v=String(id||'');
 if(v.includes('EMG'))return '筋活動に関する文献指標（筋電図）';
 if(v.includes('PFJ'))return '膝蓋大腿関節の応力に関する文献指標';
 if(v.includes('TIBIAL_TORSIONAL'))return '脛骨のねじれモーメントに関する文献指標';
 if(v.includes('TIBIAL_PEAK_ACCEL'))return '脛骨の加速度に関する文献指標';
 if(v.includes('AT_MAX_FORCE'))return 'アキレス腱の最大張力に関する文献指標';
 if(v.includes('AT_PEAK_STRESS'))return 'アキレス腱の最大応力に関する文献指標';
 if(v.includes('WORK'))return '関節の仕事量に関する文献指標';
 if(v.includes('PRESSURE'))return '足底の圧力に関する文献指標';
 return '活動別の文献参考指標（測定量の詳細は確認できません）';
}
const kmh=mps=>typeof mps==='number'&&Number.isFinite(mps)?String(Number((mps*3.6).toFixed(3))):null;
const incomplete=message=>Object.freeze({kind:'unavailable',message});
export function describeRegionEvidence({row,bodyId,activity,source='saved-manual'}={}){
 if(source!=='saved-manual')return incomplete('GPSなど、別の計算経路の出典詳細はこの説明では表示しません。記録や参考値の表示は引き続き利用できます。');
 const engineRegionId=bodyReferenceEngineId(bodyId);
 if(!row||!engineRegionId||row.regionId!==engineRegionId)return incomplete('選択した部位の科学的な出典情報を確認できません。');
 if(activity==='RUNNING'){
  const id=bodyReferenceEngineId(bodyId),series=RUNNING_REGION_BY_ID[id];
  if(!series)return incomplete('この部位に対応する採用原著がありません。');
  if(row.calculationState==='CALCULATED'&&(!row.evidence?.metricId||!row.evidence?.sourceSha256))return incomplete('計算済み値の原著識別情報が足りないため、出典の断定を保留します。');
  if(row.evidence?.metricId&&row.evidence.metricId!==series.metricId)return incomplete('保存された計算結果と現行の原著定義が異なるため、出典の表示を保留します。');
  if(row.evidence?.sourceSha256&&row.evidence.sourceSha256!==series.sourceSha256)return incomplete('保存された結果の原著と現行の原著が一致しないため、出典の表示を保留します。');
  // Same paper and metric do not guarantee identical normalization or source series.
  if(row.evidence?.seriesId&&row.evidence.seriesId!==series.seriesId)return incomplete('計算方法が現在の参考値と一致しないため、出典の表示を保留します。');
  if(row.evidence?.referenceSignature&&row.evidence.referenceSignature!==series.referenceSignature)return incomplete('基準100の定義が一致しないため、出典の表示を保留します。');
  const citation=RUNNING_CITATIONS[series.sourceFile]||{label:'文献の書誌情報を確認できません',url:null};
  const lo=kmh(series.approvedSpeedMps[0]),hi=kmh(series.approvedSpeedMps[1]),ref=kmh(series.reference.speedMps);
  return Object.freeze({kind:'running',metric:series.metricDescription,unit:series.unit,domainLabel:'採用した参考値の速度域',
   citation:citation.label,url:citation.url,sourceLocation:series.sourceLocation,
   domain:lo+'～'+hi+' km/h',reference:'基準速度 '+ref+' km/h を100とする部位内の比',
   status:row.calculationState==='CALCULATED'?'算出対象':'この記録の条件では未算出',
   note:'原著の観測またはモデル由来の文献参考値です。本人の身体負荷・傷害危険度の実測値ではなく、異なる部位の数値の大小比較はできません。路面・勾配などを個別補正していません。'+(series.sourceFile==='Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf'?' この足底参考値の原著は、自然な踵接地で走る健康な男性39人の記録（5〜12 km/h）です。ほかの足接地様式・性別・個人への直接的な当てはまりを検証した数値ではありません。':'')+(series.sourceFile==='Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf'?' この筋活動の文献参考値は、原著本文とTable 2注記に記された平均脚長0.99 mを優先し、Table 3の係数と式(4)を用いています。原著の速度の計算条件とTable 2の掲載値に一部不一致があり、原著の不一致が解決したと断定せず、個人の筋肉への実測負荷として解釈しないでください。':'')});
 }
 if(activity==='JOGGING'||activity==='WALK'){
  const evidence=row.evidence;
  if(!evidence||typeof evidence.sourceId!=='string'||typeof evidence.constructId!=='string')
   return incomplete('この活動種別のモデルについて、部位別の出典情報を確認できません。');
  const lo=kmh(evidence.sourceDomain?.minMps),hi=kmh(evidence.sourceDomain?.maxMps),ref=kmh(evidence.referenceSpeedMps);
  return Object.freeze({kind:'walk-jog',domainLabel:'原著の速度範囲（出力可能範囲ではありません）',metric:describeActivityMetric(evidence.constructId),
   unit:'部位内の基準100に対する比',citation:WALK_JOG_CITATIONS[evidence.sourceId]||'文献の書誌情報を確認できません',url:null,
   sourceLocation:null,domain:lo&&hi?lo+'～'+hi+' km/h':'文献の速度条件を確認できません',
   reference:ref?'基準速度 '+ref+' km/h を100とする活動別の指標':'参考値の基準となる速度を確認できません',
   status:row.calculationState==='CALCULATED'?'算出対象':'この記録の条件では未算出',
   note:'この範囲は元研究が扱った速度条件であり、実際に出力できる速度域は活動別モデルの条件によってさらに制限されます。ランニングと同じ原著・同じ測定量であるとは限らず、本人の身体測定値や安全性の判定には使用できません。'});
 }
 return incomplete('活動種別が未設定または対象外のため、部位別の原著情報を特定できません。');
}
