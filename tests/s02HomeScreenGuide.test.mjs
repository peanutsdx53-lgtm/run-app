import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../ui/homeExperience.css',import.meta.url),'utf8');
function guide(open){
 const start=app.indexOf('  function homeScreenGuide(){'),end=app.indexOf('  function home(){',start);
 assert.ok(start>0&&end>start);
 return vm.runInNewContext('const homeUi={guideOpen:'+open+'};'+app.slice(start,end)+';homeScreenGuide();');
}
test('S02 guide is initially closed and accessible',()=>{
 assert.match(app,/guideOpen:false/);
 assert.match(app,/data-home-guide-toggle aria-expanded=/);
 assert.match(app,/aria-controls="home-screen-guide"/);
 assert.match(guide(false),/<section id="home-screen-guide" hidden/);
 const open=guide(true);
 assert.match(open,/role="region" aria-labelledby="home-screen-guide-title"/);
 assert.equal((open.match(/<li>/g)||[]).length,3);
 for(const text of [
  'ホームの使い方','走行を記録する','保存した走行を見る','ホームを編集する',
  '下部の「記録」または「最新の走行」のボタンから、手入力かGPS測定を選びます。',
  '最新の走行結果はこの画面から、過去の走行は「履歴」から確認できます。',
  '右上の「編集」で、カードの順番・表示・サイズを変更できます。',
  '「コンディション」の「開く」から、睡眠・就床時間や起床時の調子を記録・確認できます。'
 ])assert.ok(open.includes(text),"missing direct home instruction: "+text);
 for(const removed of [
  '画面ガイド · ホーム','この画面でできること','すべて記録する必要はありません',
  '入力しない日があっても問題ありません','睡眠などの数値だけで健康状態を判断'
 ])assert.ok(!open.includes(removed),"old indirect guidance must be removed: "+removed);
 assert.equal((open.match(/<h2 id="home-screen-guide-title"/g)||[]).length,1,"single visible guide heading");
 assert.doesNotMatch(open,/傷害を減らす|自己理解が向上する/);
 assert.match(app,/data-home-guide-close/);
 assert.match(app,/focus\(\{preventScroll:true\}\)/);
 assert.doesNotMatch(app,/data-home-preview/);
});
test('S02 guide keeps PC 3-column and smartphone vertical layout',()=>{
 assert.match(css,/\.hx-guide-steps\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/s);
 assert.match(css,/\.hx-guide-steps\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.hx-help-toggle:focus-visible/);
});
