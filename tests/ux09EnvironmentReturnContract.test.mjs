/* UX09 contracts: transient weather selections ≠ draft note ≠ saved activity;
   pre-existing five optional-screen footer stays shared, no new save schema. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newEnvironmentUi,environmentStageLabel,environmentPage,environmentSelectionState,
 toggleWeather,toggleFlag,clearEnvironmentSelections,applyEnvironmentSelections,
 temperatureError,environmentDraftKeys} from '../ui/environmentExperience.js';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('UX037 distinguishes none/temporary/applied draft, not a saved activity',()=>{
 const d={temperatureC:'0',environmentNote:'本人の観察'},ui=newEnvironmentUi();
 assert.deepEqual(environmentDraftKeys,['temperatureC','environmentNote']);
 assert.equal(environmentSelectionState(d,ui).status,'none');
 assert.equal(environmentStageLabel('none'),'選択なし');
 assert.match(environmentPage(d,ui),/data-e4-stage-label>選択なし/);
 toggleWeather(ui,'RAIN');toggleFlag(ui,'WIND');
 assert.equal(environmentSelectionState(d,ui).status,'pending');
 assert.equal(environmentStageLabel('pending'),'一時選択・未反映');
 assert.equal(d.environmentNote,'本人の観察','selection never silently writes a note');
 assert.match(environmentPage(d,ui),/data-e4-stage-label>一時選択・未反映/);
 assert.match(environmentPage(d,ui),/環境メモへの反映は、走行記録の保存完了ではありません/);
 const done=applyEnvironmentSelections(d,ui);
 assert.equal(done.ok,true);
 assert.match(d.environmentNote,/本人の観察\n【本人申告の環境選択】天候：雨、風が強い/);
 assert.equal(environmentStageLabel(environmentSelectionState(d,ui).status),'今回の下書きに反映済み');
 assert.match(environmentPage(d,ui),/data-e4-stage-label>今回の下書きに反映済み/);
 assert.equal(applyEnvironmentSelections(d,ui).ok,false,'cannot duplicate exactly same note');
 const raw=d.environmentNote;clearEnvironmentSelections(ui);
 assert.equal(environmentSelectionState(d,ui).status,'none','display selection reset without erasing drafted note');
 assert.equal(d.environmentNote,raw);
 assert.equal(d.temperatureC,'0','zero is not missing');
});
test('UX037 rejects overlong note transfer without data loss and preserves invalid temperature guard',()=>{
 const d={temperatureC:'61',environmentNote:'a'.repeat(498)},ui=newEnvironmentUi();
 toggleFlag(ui,'HUMID');
 assert.match(temperatureError(d.temperatureC),/気温/);
 assert.equal(applyEnvironmentSelections(d,ui).ok,false);
 assert.equal(d.environmentNote.length,498);
 const draft=JSON.stringify(d);clearEnvironmentSelections(ui);
 assert.equal(JSON.stringify(d),draft);
});
test('UX028 uses existing footer/return guard and distinguishes review return',()=>{
 const app=read('app.js'),css=read('ui/recordReturnActions.css');
 assert.match(css,/\.rl-record-footer/);
 assert.match(css,/linear-gradient\(100deg,#27b2d6,#11c6b5\)/);
 assert.match(css,/font-size:clamp\(14px,\.94rem,22px\)!important/);
 assert.match(read('ui/environmentExperience.css'),/\.e4-top\{flex-wrap:wrap/);
 assert.match(app,/event\.target\.closest\('\[data-e4-done\],\[data-e4-back\]'\)/);
 assert.match(app,/event\.target\.closest\('\[data-e4-discard-return\]'\)/);
 assert.match(app,/environmentExperience\.clearEnvironmentSelections\(environmentUi\)/);
 assert.match(app,/if\(environmentExperience\.environmentSelectionState\(d,environmentUi\)\.status==='pending'\)/);
 assert.match(app,/location\.hash=state\.recordReviewReturn\?'#\/record-review':'#\/record'/);
 assert.doesNotMatch(read('ui/environmentExperience.js'),/data-draft="weather"|data-draft="flags"/);
});
test('UX037 status, warning and save-boundary interface have explicit offline English translations',()=>{
 const pairs=[
 ['選択なし','No Selection'],['一時選択・未反映','Temporary · Not Applied'],
 ['今回の下書きに反映済み','Applied to Current Draft'],
 ['環境メモへの反映は、走行記録の保存完了ではありません。',
   'Applying to the environment note does not save the activity record.'],
 ['天候などは未選択です。気温や自由記述だけでも記録できます。',
   'No weather or conditions selected. You may record only the temperature or your own note.'],
 ['選択した内容はまだ環境メモに反映されていません。下のボタンで確定できます。',
   'Your selected conditions are not yet in the environment note. Use the button below to apply them.'],
 ['選択した内容は環境メモに反映済みです。保存前の確認画面でも確認できます。',
   'Your selected conditions have been added to the draft environment note. Review them before saving the activity.'],
 ['選択した内容を環境メモに反映しました。保存前の確認画面で確かめてください',
   'Selected conditions were added to the environment note. Check them before saving the activity.']
 ];
 for(const [jp,en] of pairs)assert.equal(translateUiText(jp),en,jp);
});
test('UX09 versioned environment modules and dictionary are precached without overriding other modules',()=>{
 const v='20261123-ux09-environment-states-v1',shell='20261126-copy-v1',resultVersion='20261123-ux11-result-source-v1';
 const app=read('app.js'),index=read('index.html'),sw=read('sw.js'),en=read('ui/englishUi.js');
 for(const [s,label] of [[app,'environmentExperience.js?v='+v],[app,'englishUi.js?v=20261126-copy-v1'],
  [index,'environmentExperience.css?v='+v],[index,'app.js?v='+shell],
  [sw,'runload-ui-next-shell-'+shell],[sw,'environmentExperience.js?v='+v],
  [sw,'environmentExperience.css?v='+v],[sw,'englishFinalRecording.js?v='+resultVersion],
  [en,'englishFinalRecording.js?v='+resultVersion]])assert.ok(s.includes(label),'missing '+label);
 assert.ok(en.includes('englishFinalConditions.js?v='+v));
 assert.ok(index.includes('recordReturnActions.css?v='+v));
 assert.ok(sw.includes('recordReturnActions.css?v='+v));
 assert.ok(sw.includes('englishFinalConditions.js?v='+v));
 assert.ok(app.includes('rofExperience.js?v=20261123-ux08-rof-body-clarity-v1'));
 assert.ok(app.includes('recordExperience.js?v=20261123-ux07-course-clarity-v1'));
});
