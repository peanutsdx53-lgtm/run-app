/* UX05: onboarding/Home behavior and reading-order contract.
 * Stage 05 validates an intentional small change, plus no-change reviews.
 * No change in consent, guide skipping, data schema or saved-run reference.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIRST_USE_STEPS,renderFirstUse} from '../ui/firstUseExperience.js';
import {latestCard,conditionCard,achievementCard,shortcutsCard} from '../ui/homeExperience.js';
import {translateUiText} from '../ui/englishUi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const state=(step,opts={})=>({step,termsAccepted:false,privacyConfirmed:false,language:'ja',documentOpen:'',
 error:'',replay:false,nickname:'',purpose:'',heightCm:'',weightKg:'',...opts});

test('UX05: every onboarding stage names itself and its 1/8 through 8/8 position',()=>{
 assert.equal(FIRST_USE_STEPS.length,8);
 for(let step=0;step<8;step++){
  const html=renderFirstUse(state(step));
  assert.ok(html.includes('data-onboard-step-indicator'),'missing visible counter at step '+step);
  assert.ok(html.includes('<span class="fu-step-name">'+FIRST_USE_STEPS[step]+'</span>'),'missing step name');
  assert.ok(html.includes('<span class="fu-step-count">'+(step+1)+' / 8</span>'),'missing correct 8-stage fraction');
  assert.ok(html.includes('aria-valuenow="'+(step+1)+'" aria-valuemin="1" aria-valuemax="8"'),
   'progressbar remains correct');
  assert.equal((html.match(/data-onboard-step-indicator/g)||[]).length,1);
  assert.equal(typeof translateUiText(FIRST_USE_STEPS[step]),'string');
  assert.notEqual(translateUiText(FIRST_USE_STEPS[step]),FIRST_USE_STEPS[step],
   'each stage requires an existing explicit English counterpart');
 }
});

test('UX05: language state remains explicit; consent remains independent and mandatory',()=>{
 for(const lang of ['ja','en']){
  const html=renderFirstUse(state(0,{language:lang}));
  assert.match(html,/data-onboard-language="ja"/);
  assert.match(html,/data-onboard-language="en"/);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1,'only one language can be active');
 }
 const legal=renderFirstUse(state(1));
 assert.match(legal,/data-onboard-terms/);
 assert.match(legal,/data-onboard-privacy/);
 assert.match(legal,/data-onboard-next disabled/);
 assert.doesNotMatch(renderFirstUse(state(1,{termsAccepted:true,privacyConfirmed:false})),/data-onboard-next (?!(?:disabled|class))/);
 assert.doesNotMatch(renderFirstUse(state(1,{termsAccepted:false,privacyConfirmed:true})),/data-onboard-next (?!(?:disabled|class))/);
 assert.doesNotMatch(renderFirstUse(state(1,{termsAccepted:true,privacyConfirmed:true})),/data-onboard-next disabled/);
 for(const step of [0,1,7])assert.doesNotMatch(renderFirstUse(state(step)),/data-onboard-skip-guide/);
 for(const step of [2,3,4,5,6])assert.match(renderFirstUse(state(step)),/data-onboard-skip-guide/);
});

test('UX05: empty Home retains one record CTA, missing != zero, and four optional milestones',()=>{
 const empty=latestCard(null,{ok:true,records:[]});
 assert.match(empty,/href="#\/record-start"/);
 assert.equal((empty.match(/home-latest-action/g)||[]).length,1);
 assert.match(empty,/走行記録はまだありません/);
 const fail=latestCard(null,{ok:false,reason:'読み取り失敗'});
 assert.doesNotMatch(fail,/home-latest-action/);
 assert.match(fail,/走行記録を確認できません/);
 assert.match(fail,/記録が0件という意味ではありません/);
 const store={getItem:()=>null,setItem:()=>{}};
 const cond=conditionCard(store);
 assert.match(cond,/直近7日の記録はまだありません/);
 assert.match(cond,/未記録日は0時間として扱いません/);
 const awards=achievementCard({ok:true,records:[]});
 for(const name of ['初回の走行','30分以上','累計50 km','累計100 km'])
  assert.ok(awards.includes(name),'do not remove a milestone without comparative user testing');
 assert.doesNotMatch(awards,/達成</small>/,'no fabricated earned milestone');
 for(const hash of ['#/course','#/learning','#/consultation'])
  assert.ok(shortcutsCard().includes('href="'+hash+'"'),'original shortcut cannot disappear');
});

test('UX05: compact Home edit label has an explicit name without widening its text',()=>{
 const app=read('app.js');
 assert.match(app,/data-home-edit aria-pressed="\$\{editing\}" aria-label="\$\{editing\?'編集を終了':'ホームの表示を編集'\}"/);
 assert.match(app,/\$\{editing\?"編集を終了":"編集"\}</button>/);
 assert.equal(translateUiText('ホームの表示を編集'),'Edit Home Layout');
 assert.equal(translateUiText('編集を終了'),'Finish Editing');
});

test('UX05: CSS reflows all stage labels while both dynamic JS and CSS stay offline',()=>{
 const css=read('ui/firstUseExperience.css'),index=read('index.html'),app=read('app.js'),sw=read('sw.js');
 assert.match(css,/\.fu-topbar \.fu-step-indicator\{/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/\.fu-topbar\{height:auto;min-height:59px/);
 assert.ok(!css.includes('.fu-step-name{display:none'));
 const gen='20261122-ux05-firstuse-home-v1';
 for(const [txt,fragment] of [
  [app,'firstUseExperience.js?v='+gen],
  [index,'firstUseExperience.css?v='+gen],
  [index,'app.js?v='+gen],
  [sw,'runload-ui-next-shell-'+gen],
  [sw,'firstUseExperience.css?v='+gen],
  [sw,'firstUseExperience.js?v='+gen],
  [sw,'app.js?v='+gen]
 ])assert.ok(txt.includes(fragment),'active offline version is missing: '+fragment);
 assert.match(read('.github/workflows/run-app-regression.yml'),/node tests\/ux05OnboardingHomeBrowser\.mjs/);
});
