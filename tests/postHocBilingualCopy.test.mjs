import test from 'node:test';
import assert from 'node:assert/strict';
import {translateUiText} from '../ui/englishUi.js';
import {EDIT_FIELDS,MENTAL,GRADE,SURFACES,SURFACE_MODE,FORMAT} from '../ui/annotationEditorCore.js';
const fieldOptionValues=[
 ...EDIT_FIELDS.map(([,text])=>text),...Object.values(MENTAL),
 ...Object.values(GRADE),...Object.values(SURFACES),
 ...Object.values(SURFACE_MODE),...Object.values(FORMAT),
 '走る前','走っている間','走った後','特定しない',
 '端末・時計で計測','本人が手入力した概数',
 '1区間','2区間','3区間','4区間','5区間',
 '記録種別','記録時は未入力','追加する項目','項目を選んでください',
 '補足（任意・500字以内）','歩数の取得方法',
 '距離と時間','後日申告（科学計算に未使用）'
];
test('every optional post-hoc field and select option has readable English copy',()=>{
 for(const source of new Set(fieldOptionValues)){
  const translated=translateUiText(source);
  assert.doesNotMatch(translated,/[ぁ-ゟァ-ヿ一-龯]/,'untranslated post-hoc UI choice: '+source);
  assert.ok(translated.length,'empty translation for '+source);
 }
});
test('source identifiers and saved user notes are not modified by localization',()=>{
 assert.equal(translateUiText('run-v1-12345678-aaaa-bbbb-cccc-dddddddddddd'),'run-v1-12345678-aaaa-bbbb-cccc-dddddddddddd');
 assert.equal(translateUiText('私の昨日の走行記録'),'私の昨日の走行記録');
});
