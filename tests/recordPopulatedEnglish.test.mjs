import test from 'node:test';
import assert from 'node:assert/strict';
import {translateUiText} from '../ui/englishUi.js';
import {reviewView} from '../ui/recordReviewExperience.js';

// This is a display-only adapter; user-authored notes and draft values must
// remain unchanged, including Japanese strings even in English UI.
const fake=(selector,screen)=>{
 const matches=parts=>parts.split(',').map(x=>x.trim()).includes(selector);
 return {matches,closest:parts=>parts.split(',').map(x=>x.trim()).some(x=>x===screen||x===selector)?{}:null};
};
const cases=[
 ['course progress','区間割合 5 / 5 件入力・入力分の合計 100%（100%）','Segment Shares: 5 / 5 Entered · Entered Total 100% (100%)','[data-rv-section-progress]','.rv-course'],
 ['segment heading','区間 3','Segment 3','.rv-section-row-head strong','.rv-course'],
 ['segment share','割合 20%','Share: 20%','.rv-section-row-head small','.rv-course'],
 ['segment add','＋ 区間を追加（3 / 5）','+ Add Segment (3 / 5)','[data-rv-add]','.rv-course'],
 ['surface total','合計 100% / 100%','Total 100% / 100%','[data-rv-surface-total]','.rv-course'],
 ['steps source','端末計測','Measured by Device','[data-g4-source]','[data-g4-page]'],
 ['running format','走行＋歩行','Run + Walk','[data-g4-format]','[data-g4-page]'],
 ['steps summary','12457歩・手入力・概数','12457 steps · Manual Entry / Estimate','[data-g4-summary-steps]','[data-g4-page]'],
 ['run part','走行 6.12 km','Running 6.12 km','[data-g4-run-text]','[data-g4-page]'],
 ['distance difference','残り（差分） 2.13 km','Remaining (Difference) 2.13 km','[data-g4-other]','[data-g4-page]'],
 ['weather','くもり','Cloudy','[data-e4-weather]','[data-e4-page]'],
 ['weather summary','18.5℃ · くもり · 風が強い','18.5°C · Cloudy · Strong Wind','[data-e4-summary]','[data-e4-page]'],
 ['weather pending','気温未入力 · 天候未入力 · 選択は未反映','Temperature Unanswered · Weather Unselected · Choices Pending','[data-e4-summary]','[data-e4-page]'],
 ['step unit','歩','steps','.g4-step-input b','[data-g4-page]'],
 ['ROF guidance','とても疲れている付近','Near Very Fatigued','.rv4-description-main','[data-rof-v4-root]'],
 ['ROF selected score','選択値：8 / 10','Selected Rating: 8 / 10','[data-rof-v4-caption]','[data-rof-v4-root]'],
 ['ROF end-day','終了日：2026/11/17（翌日）','End Date: 2026/11/17 (Next Day)','.rv4-end-day-caption','[data-rof-v4-root]'],
 ['region','殿部','Gluteal Region','.cx-picker-option','[data-cx-page]'],
 ['regions expand','ほか 9 部位を表示','Show 9 More Regions','[data-selected-expand]','[data-cx-page]'],
 ['regions collapse','折りたたむ','Collapse','[data-selected-expand]','[data-cx-page]'],
 ['steps confirmation','12457歩 ・ 推定・手入力','12457 steps · Estimated / Manually Entered','.rr-row-desc','[data-record-review]'],
 ['before after confirmation','運動前 4 ／ 運動後 8','Before 4 / After 8','.rr-row-desc','[data-record-review]']
];
for(const [description,ja,en,selector,screen] of cases){
 test('record-populated English system copy: '+description,()=>{
  assert.equal(translateUiText(ja,{element:fake(selector,screen)}),en);
 });
}
test('explicitly marked user-authored Japanese notes and names remain exactly as entered',()=>{
 const values=['くもり','殿部','川沿い周回・橋を渡るコース','18.5℃ · くもり · 風が強い','向かい風の体感があった。'];
 for(const ja of values)assert.equal(translateUiText(ja,{element:fake('.rr-row-desc','[data-user-authored]')}),ja);
});
test('record copy does not rewrite scientific or storage identifiers',()=>{
 for(const value of ['ROF-J','BA-DISP-014','run-v1-abc','GPS-V2','0','—'])assert.equal(translateUiText(value,{element:fake('strong','[data-cx-page]')}),value);
});
test('review markup isolates authored course name, environment report and body notes',()=>{
 const japanese='川沿い周回・橋を渡るコース';
 const html=reviewView({date:'2026-11-17',distance:'6',minutes:'35',activityGait:'RUNNING',
  courseName:japanese,environmentNote:'【本人申告の環境選択】天候：くもり、風が強い',
  temperatureC:'18.5',bodyObservation:'殿部',shoeName:'くもり',memo:'向かい風の体感があった。'});
 for(const original of [japanese,'天候：くもり、風が強い','殿部','くもり','向かい風の体感があった。'])
  assert.ok(html.includes('<span data-user-authored>'+original+'</span>'),'authored span missing: '+original);
 assert.match(html,/<span>本人申告：<\/span><span data-user-authored>/);
 assert.match(html,/<span>シューズ：<\/span><span data-user-authored>/);
});
