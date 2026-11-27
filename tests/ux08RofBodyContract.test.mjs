/* UX08: ROF-J (0 versus unanswered, timing semantics) and body-map/notes
 * display-only contracts. The ROF-J research scale, original illustrations,
 * save schema and user-authored text remain untouched.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRofUiState,rofPage,recordRofInput,setRofPhase,reflectRofPage} from '../ui/rofExperience.js';
import {isValidRofJ} from '../ui/rofJScale.js';
import {makeUi,toggleRegion,renderScreen,REGIONS,addRegionNamesToNote,checkDefinitions} from '../ui/bodyContextExperience.js';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const draft=()=>({date:'2026-11-19',rofBefore:null,rofAfter:null,bodyObservation:'',shoeName:'',memo:''});
test('UX033: zero is an explicitly answered ROF-J score, missing stays unanswered',()=>{
 const d=draft(),ui=createRofUiState();
 assert.equal(isValidRofJ(0),true);
 assert.equal(isValidRofJ(null),false);
 const empty=rofPage(d,ui);
 assert.match(empty,/data-rof-v4-selected="false"/);
 assert.match(empty,/data-rof-v4-state>未回答<\/small>/);
 assert.match(empty,/data-rof-v4-number>—<\/output>/);
 assert.equal(recordRofInput(d,'before',0),true);
 const selected=rofPage(d,ui);
 assert.match(selected,/data-rof-v4-selected="true"/);
 assert.match(selected,/data-rof-v4-state>回答済み<\/small>/);
 assert.match(selected,/data-rof-v4-number>0<\/output>/);
 assert.equal((selected.match(/data-rof-v4-anchor="\d"/g)||[]).length,5);
 assert.equal((selected.match(/data-rof-v4-tick="\d+"/g)||[]).length,11);
 assert.equal(setRofPhase(ui,'after',d),true);
 assert.match(rofPage(d,ui),/data-rof-v4-state>未回答<\/small>/);
 assert.equal(d.rofBefore,0);
 assert.equal(d.rofAfter,null);
 assert.match(reflectRofPage.toString(),/data-rof-v4-state/);
});
test('UX034/035: the two optional timing concepts remain separate and illustrations are read-only',()=>{
 const d=draft(),ui=createRofUiState(),markup=rofPage(d,ui);
 assert.match(markup,/<details class="rv4-optional-meta" >/);
 assert.match(markup,/class="rv4-meta-intro"/);
 assert.match(markup,/運動時刻と疲労感の回答時点は別の項目です。どちらも任意です。/);
 assert.match(markup,/data-rof-run-start/);
 assert.match(markup,/data-rof-run-end/);
 assert.match(markup,/data-rof-v4-timing/);
 assert.match(markup,/原版の5つの代表位置/);
 assert.match(markup,/数値は変えません/);
 assert.doesNotMatch(markup,/input\s+type="number"\s+.*data-rof-v4-range/);
 assert.match(read('ui/rofExperience.css'),/rv4-track input\{min-height:48px\}/);
 assert.match(read('ui/rofExperience.css'),/rv4-state-label\{font-size:clamp/);
 assert.match(read('ui/bodyContextExperience.css'),/cx-notes-current\{font-size:clamp/);
});
test('UX036: 12 anatomy regions remain user-chosen and only an explicit note transfer writes text',()=>{
 const d=draft(),ui=makeUi();
 assert.equal(checkDefinitions(),true);
 assert.equal(REGIONS.length,12);
 let page=renderScreen(d,ui);
 assert.match(page,/class="cx-notes-current"/);
 assert.match(page,/図で選択中<\/span> <strong>0 \/ 12<\/strong>/);
 assert.match(page,/部位の選択だけでは記録に残りません/);
 const id=REGIONS[0].id;
 assert.equal(toggleRegion(ui,id),true);
 page=renderScreen(d,ui);
 assert.match(page,/図で選択中<\/span> <strong>1 \/ 12<\/strong>/);
 assert.equal(d.bodyObservation,'');
 assert.equal(d.shoeName,'');
 assert.equal(d.memo,'');
 assert.equal(addRegionNamesToNote(d,ui),true);
 assert.match(d.bodyObservation,/気になった部位：/);
 assert.equal(ui.selected.length,1);
});
test('UX08: five new display phrases have explicit English counterparts, not implicit user-text translation',()=>{
 const pairs=[
  ['回答済み','Answered'],['未回答','Not answered'],
  ['運動時刻と疲労感の回答時点は別の項目です。どちらも任意です。',
   'Activity start/end times and the time you assessed fatigue are different fields. Both are optional.'],
  ['図で選択中','Selected on Body Map'],
  ["部位名を身体の自覚情報に追加しました。","Selected region names were added to your body observations."],
  ['部位の選択だけでは記録に残りません',
   'Selecting a body region alone does not add it to your saved note.']
 ];
 for(const [jp,en] of pairs)assert.equal(translateUiText(jp),en,jp);
});
test('UX08: the live ROF and body modules, styles, English dictionary and PWA shell share their active versions',()=>{
 const version='20261123-ux08-rof-body-clarity-v1';
 const shell='20261126-cleanup-v5',resultVersion='20261123-ux11-result-source-v1';
 const app=read('app.js'),index=read('index.html'),sw=read('sw.js'),en=read('ui/englishUi.js');
 const items=[
  [app,'rofExperience.js?v=20261126-cleanup-v5'],[app,'bodyContextExperience.js?v=20261126-cleanup-v5'],
  [app,'englishUi.js?v=20261126-cleanup-v5-readable'],[index,'rofExperience.css?v='+version],
  [index,'bodyContextExperience.css?v=20261126-cleanup-v5'],[index,'app.js?v=20261126-cleanup-v5-css-retired-mirror-stage3-readable'],
  [sw,'runload-ui-next-shell-'+shell],[sw,'rofExperience.js?v=20261126-cleanup-v5'],
  [sw,'bodyContextExperience.js?v=20261126-cleanup-v5'],[sw,'rofExperience.css?v='+version],
  [sw,'bodyContextExperience.css?v=20261126-cleanup-v5'],[sw,'englishUi.js?v=20261126-cleanup-v5-readable'],
  [sw,'englishFinalRecording.js?v='+resultVersion],[en,'englishFinalRecording.js?v='+resultVersion]
 ];
 for(const [source,token] of items)assert.ok(source.includes(token),'missing live/offline version '+token);
 assert.ok(app.includes('recordExperience.js?v=20261126-cleanup-v5'));
});
