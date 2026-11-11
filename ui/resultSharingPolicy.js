/* M6: explicit opt-in for personal material in result image / print exports. */
export const PRIVATE_EXPORT_DEFAULTS=Object.freeze({includeDate:false,includeRof:false});
export const sourceLabels=Object.freeze({MANUAL:'本人入力',GPS_V2:'GPS計測値'});
export function resultExportDisclosure({date='',before=null,after=null,includeDate=false,includeRof=false}={}){
 const score=x=>Number.isInteger(x)&&x>=0&&x<=10?String(x):'未回答';
 return Object.freeze({
  dateText:includeDate===true&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'日付は非掲載（既定）',
  rofText:includeRof===true?`ROF-J（本人回答）：運動前 ${score(before)} ／ 運動後 ${score(after)}`:'ROF-J等の本人回答は非掲載（既定）',
  includeRof:includeRof===true,
  includeDate:includeDate===true
 });
}
export function sourceProvenance({gps=false,saved=false}={}){
 return Object.freeze({distance:gps?'GPS計測値':saved?'本人入力':'保存前の入力',duration:gps?'GPS計測値':saved?'本人入力':'保存前の入力',pace:'距離・時間から算出',rof:'ROF-J／本人回答',reference:'文献条件に基づく参考値'});
}
