import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI_ACTION_COPY,actionCopy,actionKind,translateOptInActionText} from '../ui/actionCopyKeys.js';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const navKeys=['nav.home','nav.record','nav.record-start','nav.result','nav.history','nav.exploration-tree','nav.learning','nav.settings'];
const tagged=key=>({getAttribute:attr=>attr==='data-ui-copy-key'?key:null,closest:()=>null,matches:()=>false});
test('UX04 stable keys cover all desktop/mobile routes without changing their visible meanings',()=>{
 const ja=['ホーム','記録','記録','結果','履歴','探究','学習','設定'];
 const en=['Home','Record','Record','Results','History','Explore','Learning','Settings'];
 for(const [i,key] of navKeys.entries()){
  assert.equal(actionKind(key),'navigate',key);
  assert.equal(actionCopy(key,'ja'),ja[i],key);
  assert.equal(actionCopy(key,'en'),en[i],key);
  assert.equal(translateUiText(ja[i],{element:tagged(key)}),en[i],key);
 }
 assert.match(read('app.js'),/data-ui-copy-key="nav\.\$\{path\}"/);
 assert.match(read('app.js'),/data-ui-action-kind="navigate"/);
 assert.match(read('app.js'),/const mobileNav=\[\["home".*\["record-start".*\["history".*\["exploration-tree".*\["settings"/);
 assert.match(read('app.js'),/const desktopNav=\[\["home".*\["record".*\["result".*\["history".*\["exploration-tree".*\["learning".*\["settings"/);
});

test('UX04 commit/apply/select/view/back/help remain distinct actions rather than interchangeable Save labels',()=>{
 assert.equal(actionKind('action.save-run'),'commit');
 assert.equal(actionKind('action.save-notes'),'commit');
 assert.equal(actionKind('action.apply-course'),'apply-draft');
 assert.equal(actionKind('action.return-without-applying'),'return');
 assert.equal(actionKind('action.select-region'),'select');
 assert.equal(actionKind('action.view-results'),'navigate');
 assert.equal(actionKind('action.open-help'),'disclose');
 assert.notEqual(actionCopy('action.save-run','en'),actionCopy('action.apply-course','en'));
 assert.notEqual(actionCopy('action.save-run','ja'),actionCopy('action.save-notes','ja'));
 assert.equal(actionCopy('missing-key','en'),null);
 assert.equal(actionKind('missing-key'),null);
 assert.ok(Object.isFrozen(UI_ACTION_COPY));
});

test('UX04 keyed translation is opt-in, preserves unknown and original saved text, and does not change aria semantics',()=>{
 assert.equal(translateOptInActionText('記録',{element:tagged('nav.record')}),'Record');
 assert.equal(translateOptInActionText(' 記録 ',{element:tagged('nav.record')}),'Record');
 assert.equal(translateOptInActionText('保存済みの自由記述',{element:tagged('nav.record')}),null);
 assert.equal(translateOptInActionText('記録',{element:tagged('nav.record'),attribute:'aria-label'}),null);
 assert.equal(translateUiText('ユーザーの考え',{element:{...tagged('nav.home'),closest:()=>({})}}),'ユーザーの考え');
 assert.equal(translateUiText('記録',{element:tagged('unknown')}),translateUiText('記録'));
 const source=read('ui/actionCopyKeys.js');
 assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB)\s*(?:\.|\[|\()/,
  'display-only action table cannot access persistence APIs');
});

test('UX04 versioned app, dictionary and new action keys are coherent with offline precache',()=>{
 const app=read('app.js'),html=read('index.html'),sw=read('sw.js');
 assert.match(app,/englishUi\.js\?v=20261126-cleanup-v4/);
 assert.match(html,/app\.js\?v=20261126-cleanup-v4/);
 assert.match(sw,/runload-ui-next-shell-20261126-cleanup-v4/);
 for(const expected of [
  './app.js?v=20261126-cleanup-v4',
  './ui/englishUi.js?v=20261126-cleanup-v4',
  './ui/actionCopyKeys.js',
  './ui/actionCopyKeys.js?v=20261122-ux04-stable-actions-v1'
 ])assert.ok(sw.includes(expected),'offline precache missing '+expected);
 assert.match(read('ui/englishUi.js'),/translateOptInActionText\(trimmed,context\)/);
});
