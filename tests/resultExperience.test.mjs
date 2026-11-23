import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_NAMES,resultImageAnnotation} from '../ui/resultExperience.js';
import {bodyReferenceScale} from '../ui/bodyReferencePresentation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Result v4 references all formal region names, with immutable official identifiers',()=>{
 assert.equal(OFFICIAL_NAMES.length,12);
 assert.equal(new Set(OFFICIAL_NAMES.map(x=>x[0])).size,12);
 assert.ok(OFFICIAL_NAMES.some(x=>x[0]==='BA-DISP-028'&&x[1]==='足底中部・内側縦足弓'));
});
test('Result v4 does not fabricate biomechanical comparisons when no activity is selected',()=>{
 const js=read('ui/resultExperience.js');
 assert.match(js,/value:null/);
 assert.match(js,/同じ活動種別の保存記録をもう1件残すと/);
 assert.match(js,/calculateActivityReference/);
 assert.match(js,/各部位自身の文献基準100/);
 assert.doesNotMatch(js,/rv4-tone-legend/,'duplicate legend removed');
 assert.match(js,/rv4-region-selection/,'picker has its own row');
 assert.match(js,/BODY_REFERENCE_GRADIENT/,'reference scale uses unchanged scientific palette');
 assert.match(js,/まだ保存していない記録/);
 assert.ok(!js.includes('distance:8.20'));
 assert.ok(!js.includes('rofBefore:6,rofAfter:8'));
 assert.ok(!js.includes('12部位比較値'));
});
test('PNG export explains calculated and uncalculated literature references',()=>{
 assert.deepEqual(resultImageAnnotation({}),{status:'保存前：部位別値は未表示',detail:'保存した走行の文献適用条件を確認します'});
 assert.equal(resultImageAnnotation({saved:true,reference:{count:9}}).status,'文献参考値：9/12 部位算出');
 assert.equal(resultImageAnnotation({gps:true,reference:{count:0}}).status,'文献参考値：算出対象外');
 assert.equal(resultImageAnnotation({saved:true,reference:{count:0,reason:'GAIT_NOT_SELECTED'}}).detail,'活動種別が未選択のため算出しません');
 assert.equal(resultImageAnnotation({saved:true,reference:{count:12}}).status,'文献参考値：12/12 部位算出');
 assert.equal(resultImageAnnotation({saved:true,reference:{count:99}}).status,'文献参考値：算出対象外');
 const js=read('ui/resultExperience.js');
 assert.doesNotMatch(js,/身体の部位別の参考値はまだありません/);
 assert.doesNotMatch(js,/文献参考値を確認できる記録/);
 assert.match(js,/resultExportDisclosure/,'image data uses opt-in disclosure');
 const privacy=read('ui/resultSharingPolicy.js');
 assert.match(privacy,/includeRof:false/,'default must hide subjective ROF-J');
 assert.match(privacy,/ROF-J（本人回答）/,'opted-in ROF retains provenance');
});

test('ROF-J results and image export do not manufacture time-eligible before/after changes',()=>{
 const js=read('ui/resultExperience.js');
 assert.match(js,/data-rof-time-status="unverified"/);
 assert.match(js,/実際の時間的な順序が検証できないため、変化量や原因は判定しません/);
 assert.match(js,/回答の実際の時間的前後差は判定しません/);
 assert.doesNotMatch(js,/評価時刻未記録：前後差は判定不可/,'PNG must not falsely claim no time evidence is stored');
 assert.doesNotMatch(js,/<small>前後差<\/small>|rv4-change/,'remove obsolete difference field');
 assert.match(js,/<p class="rv4-fatigue-caption" data-source-rof>ROF-J・本人回答/,'retain concise scientific status');
 assert.doesNotMatch(js,/rv4-fatigue-note|role="note"/,'do not render a callout');
 for(const css of [read('ui/resultExperience.css'),read('ui/resultInlineStyles.js')]){
  const caption=css.match(/\.rv4-fatigue-caption\{([^}]+)\}/);
  assert.ok(caption,'caption has its own minimal styling');
  assert.match(caption[1],/font-size:12px/);
  assert.doesNotMatch(caption[1],/background|border|box-shadow|font-weight|padding:(?!0)/,'no callout styling');
  assert.doesNotMatch(css,/\.rv4-fatigue-note/,'old callout styling removed');
 }
 assert.equal((js.match(/<details class="rv4-fatigue-method"/g)||[]).length,1,'one unified disclosure');
 assert.doesNotMatch(js,/<details class="rv4-rof-audit"/,'audit lives inside the disclosure');
 assert.match(js,/回答時刻・訂正履歴を確認・訂正/);
 assert.match(js,/回答時点と解釈上の注意を確認/);
  assert.match(js,/個人の身体負荷を直接測定した値ではありません。/,'reference caveat remains in details');
  assert.match(js,/この部位の参考値は比較できません/,'ineligible comparison remains visible');
 assert.match(js,/data-rof-correct-save/,'saved correction action remains');
 assert.match(js,/rofCorrections/,'saved correction history remains');
 assert.match(js,/GPS時の入力操作時刻/);
 assert.match(js,/未回答は「—」で、0と区別します。/);
 assert.match(js,/value!==null&&Number\.isFinite\(value\)/,'valid zero must not become missing');
 assert.match(js,/value!==null&&Number\.isFinite\(value\)/,'valid zero must not become missing');
 for(const css of [read('ui/resultExperience.css'),read('ui/resultInlineStyles.js')]){
  assert.doesNotMatch(css,/\.rv4-change/,'obsolete delta styling absent');
  assert.match(css,/\.rv4-fatigue-numbers>div\{/,'retain two-value layout');
  assert.match(css,/\.rv4-rof-audit h3\{/,'audit section has a heading');
 }
 assert.doesNotMatch(js,/\(after-before\)/);
 assert.doesNotMatch(js,/<h2>疲労感の変化<\/h2>/);
});

test('Result v4 view is isolated and precached',()=>{
 const app=read('app.js'),sw=read('sw.js'),html=read('index.html');
 assert.ok(app.includes('resultExperience.mountResult'));
 assert.ok(sw.includes('./ui/resultExperience.js'));
 assert.ok(sw.includes('./ui/resultExperience.css'));
 const currentAsset=html.match(/\.\/app\.js\?v=([a-z0-9-]+)/);assert.ok(currentAsset,'HTML cache-busted application entry');assert.ok(sw.includes('./app.js?v='+currentAsset[1]),'matching offline precache asset');
 assert.ok(sw.includes('./ui/gpsDynamicResult.js'));
 assert.ok(sw.includes('./ui/gpsDynamicResult.css'));
});
test('History does not read unsaved input or present fake saved-record links',()=>{
 const app=read('app.js');
 assert.match(app,/manualRunStore\.findManualRun/);assert.match(app,/resultExperience\.mountResult\(resultHost,record\?\.draft\|\|\{\}/);
 assert.ok(app.includes('historyExperience.mountHistory'));
 assert.ok(!app.includes('const data=[{day:22')); 
 assert.ok(read('ui/historyExperience.js').includes('data-history-unconnected')); 
 assert.ok(!app.includes('href="#/${entry.type'));
});

test('result palette is synchronously rendered inside the shadow root',()=>{
 const js=read('ui/resultExperience.js');
 const inline=read('ui/resultInlineStyles.js');
 assert.match(js,/RESULT_STYLES/);
 assert.match(js,/style data-result-inline-styles/);
 assert.doesNotMatch(js,/<link rel=.*stylesheet/);
 assert.match(inline,/radial-gradient/);
});

test('Result and manual-save surfaces use the approved dark chrome and button states',()=>{
 const styles=read('styles.css');
 const review=read('ui/recordReviewExperience.css');
 const html=read('index.html');
 for(const style of [
  '.app-shell:has(#runload-result-v4) .topbar{display:none}',
  '.app-shell:has(#runload-result-v4) .main-content{background:transparent;',
  'body:has(#runload-result-v4) #app{background:#061725',
  'padding-bottom:calc(95px + env(safe-area-inset-bottom',
 ]) assert.ok(styles.includes(style),style);
 for(const style of [
  '.rr-page .rr-foot-actions .rr-save:not(:disabled){background:linear-gradient',
  '.rr-page .rr-foot-actions .rr-save:disabled{background:#1e4859',
  '.rr-page .rr-foot-actions .rr-save:focus-visible{outline:3px',
 ]) assert.ok(review.includes(style),style);
 assert.match(html,/homeExperience\.css\?v=20261122-ux05-firstuse-home-v1/);
 assert.match(html,/recordReviewExperience\.css\?v=20261123-ux10-presave-focus-v2/);
});

test('public-facing result copy omits internal branding and preserves formal names',()=>{
 const js=read('ui/resultExperience.js');
 for(const literal of ['RUNLOAD / RESULTS',"t('RUNLOAD'",'RunLoad_入力中の走行.png','正式保存前','履歴未接続'])assert.equal(js.includes(literal),false,literal);
 assert.ok(OFFICIAL_NAMES.some(([,name])=>name==='膝蓋大腿関節部'),'official anatomical names are never rewritten');
});

test('saved UNKNOWN manual record has explicit repair choices with no inferred activity',()=>{
 const result=read('ui/resultExperience.js');
 const store=read('ui/manualRunStore.js');
 assert.match(result,/missingActivityPanel/);
 assert.match(result,/data-result-gait/);
 assert.match(result,/options\.onAssignGait/);
 assert.match(store,/classifySavedManualRun/);
 assert.match(result,/GAIT_NOT_SELECTED/);
});

test('result route explains missing or deleted explicit IDs, with no fallback',()=>{
 const app=read('app.js'),result=read('ui/resultExperience.js');
 assert.match(app,/if\(params\.has\("record"\)&&!record\)/);
 assert.match(app,/指定された保存済み走行記録が見つかりません/);
 assert.match(app,/found\.reason/);
 assert.match(result,/rv4-compare-summary/);
 assert.doesNotMatch(result,/記録ID末尾|比較する2件の記録情報/);
 assert.match(result,/同条件/);
 assert.match(result,/比較相手/);
 assert.match(result,/選択中/);
});


test('S09 comparison data and long IDs remain readable without changing scientific provenance',()=>{
 const inline=read('ui/resultInlineStyles.js'),js=read('ui/resultExperience.js');
 assert.match(inline,/\.rv4-region-compare-stats/);
 assert.match(inline,/\.rv4-region-compare-method/);
 assert.match(inline,/\.rv4-compare-summary/);
 assert.match(js,/rv4-export-menu/);
 assert.match(inline,/\.rv4-fatigue-method-content>p\{[^}]*font-size:14px/);
 assert.doesNotMatch(js,/記録ID末尾 '\+clean\(other\.id\.slice\(-8\)\)/);
 assert.match(js,/sameKind/,'same-date options remain distinguishable without user-facing IDs');
 assert.match(js,/compareBodyReferenceRows/);
 assert.match(js,/再計算した参考値です/);
});


test('UIUX batch03 S09: tab/view redraw restores keyboard focus without changing three-tab or science contract',()=>{
 const js=read('ui/resultExperience.js');
 assert.match(js,/\[data-tab=\"'\+tab\+'\"\]'/);
 assert.match(js,/\[data-view=\"'\+view\+'\"\]'/);
 assert.match(js,/focus\(\{preventScroll:true\}\)/);
 assert.match(js,/\['body','身体'\],\['fatigue','疲労感'\],\['radar','過去と比較'\]/);
 assert.match(js,/compareBodyReferenceRows/);
});

test('T01: interpretation-supporting copy scales with 200 percent root text without altering reference calculations',()=>{
 const js=read('ui/resultExperience.js');
 assert.ok(js.includes('const RESULT_T01_READABILITY_STYLES=String.raw'));
 assert.ok(js.includes("RESULT_HELP_RIGHT_STYLES+RESULT_T01_READABILITY_STYLES+'</style>"),
  'responsive typography must be injected last after prior layout overrides');
 for(const selector of ['.rv4-card-heading p','.rv4-hero-report>span',
  '.rv4-reading>small','.rv4-body .rv4-figure-actions span',
  '.rv4-fatigue-caption','.rv4-body .rv4-value-diff',
  '.rv4-comparison-caution','.rv4-method-disclosure p']){
  assert.ok(js.includes(selector),'supporting evidence text must be readable: '+selector);
 }
 assert.match(js,/font-size:clamp\(12px,0\.8125rem,18px\)/,
  'normal-size floor and root-relative zoom need explicit bounds');
 assert.match(js,/overflow-wrap:anywhere/);
 assert.match(js,/BODY_REFERENCE_GRADIENT/,'official reference colors are preserved');
 assert.match(js,/compareBodyReferenceRows/,'scientific comparison still uses authorized calculation');
 assert.match(js,/\['body','身体'\],\['fatigue','疲労感'\],\['radar','過去と比較'\]/,
  'the approved three tabs are intact');
});


test('S09 T02/T06: source facts are disclosure-only and summary is readable at root 200%',()=>{
 const html=read('ui/resultExperience.js');
 assert.ok(html.includes('<span class="rv4-method-label" style="font-size:clamp(12px,0.8125rem,18px)!important;line-height:1.6;min-width:0;overflow-wrap:anywhere">文献参考値の条件と限界</span>'),
  'WebKit 320px/200% must scale the actual visible heading text, not just its disclosure control');
 assert.match(html,/getComputedStyle\(document\.documentElement\)\.fontSize/);
 assert.match(html,/size=Math\.min\(18,Math\.max\(12,/);
 assert.ok(html.includes("label.style.setProperty('font-size',size+'px','important')"));
 assert.ok(html.includes("new MutationObserver("));
 assert.ok(html.includes("attributeFilter:['style','class']"));
 assert.ok(html.includes("host._runloadResultFontObserver?.disconnect()"));
 const js=read('ui/resultExperience.js'),tr=read('ui/englishResultCopy.js');
 assert.match(js,/<details class="rv4-hero-sources"><summary>記録の出所を確認<\/summary>/);
 for(const id of ['data-source-distance','data-source-duration','data-source-pace','data-source-rof-detail'])
  assert.ok(js.includes(id),'four different provenance fields preserved: '+id);
 assert.match(js,/sourceProvenance\(\{gps:fromGps,saved:fromSaved\}\)/);
 assert.match(js,/\.rv4-app \.rv4-hero-source-grid p,/);
 assert.match(js,/\.rv4-app \.rv4-hero-source-grid strong,/);
 assert.match(js,/\.rv4-app \.rv4-method-disclosure>summary,/);
 assert.ok(tr.includes('"Reference Scope & Limits"'));
 assert.match(js,/font-size:clamp\(12px,0\.8125rem,18px\)/);
 assert.match(js,/文献参考値の条件と限界/);
 assert.match(js,/危険度や部位間の順位ではありません/);
});

test('S09: 44px number-toggle target and meaningful focus after redraw',()=>{
 const js=read('ui/resultExperience.js');
 const inline=read('ui/resultInlineStyles.js');
 const css=read('ui/resultExperience.css');
 assert.ok(js.includes("root.querySelector('[data-label-toggle]')?.focus({preventScroll:true})"));
 assert.match(js,/fromSvg=!!b\.closest\('svg'\)/);
 assert.ok(js.includes(".rv4-choices [data-region="));
 assert.ok(js.includes(".rv4-body-svg [data-region="));
 for(const source of [inline,css]){
  assert.ok(source.includes('max-width:100%;min-height:44px;padding:10px 9px;font-size:12px'));
  assert.doesNotMatch(source,/\.rv4-figure-actions button\[aria-pressed=true\][^}]*min-height:28px/);
 }
});

test('I02: transient result disclosures and unsaved corrections survive local redraw only',()=>{
 const js=read('ui/resultExperience.js');
 for(const selector of ['.rv4-hero-sources','.rv4-region-evidence','.rv4-fatigue-method',
  '.rv4-mental-details','.rv4-question-continuation','.rv4-method-disclosure'])
  assert.ok(js.includes("'"+selector+"'"),'must whitelist user-opened explanation '+selector);
 for(const field of ['[data-rof-correct-score]','[data-rof-correct-reason]',
  '[data-run-question-source]','[data-run-question-text]'])
  assert.ok(js.includes("'"+field+"'"),'retain only in-progress form draft '+field);
 assert.match(js,/if\(rendered\)\{/,'initial mount never restores another record’s UI state');
 assert.match(js,/openState\.set\(selector,el\.open\)/);
 assert.match(js,/draftState\.set\(selector,control\.value\)/);
 assert.match(js,/el\.open=open/);
 assert.match(js,/el\.value=value/);
 assert.match(js,/root\.activeElement/);
 assert.match(js,/\[data-reference-compare-region\]'\)\?\.focus\(\{preventScroll:true\}\)/);
 assert.doesNotMatch(js,/localStorage\.setItem\([^\n]*draftState/,'private drafts never become persistent data');
});

test('legacy result markup is retired; standalone body detail never displays mock numbers (001,004)',()=>{
 const app=read('app.js');
 assert.doesNotMatch(app,/function result\(\)\{/,'the retired full result renderer must not be reachable');
 assert.match(app,/data-body-detail-source="saved-only"/,'direct links must clearly route to the saved-result view');
 assert.match(app,/resultExperience\.mountResult/,'the active three-tab results stay in the scientific component');
 assert.doesNotMatch(app,/const REGIONS=/,'old mock region registry no longer exists');
 assert.match(app,/resultExperience\.mountResult/,'real results still use approved saved-input presenter');
 assert.doesNotMatch(app,/value:101\.7|value:112\.4|value:106\.3/,'fixed scientific-looking numbers are removed');
 assert.doesNotMatch(app,/11\/12<\/strong>/,'unverified fixed region availability is removed');
});
test('official science test targets actual result/reference sources rather than legacy demo rows (005)',()=>{
 const app=read('app.js'),result=read('ui/resultExperience.js');
 const parity=read('tests/scienceEngineParity.test.mjs');
 assert.equal(OFFICIAL_NAMES.length,12);
 assert.match(result,/calculateActivityReference\(options\.record\)/);
 assert.match(result,/bodyReferenceRow\(reference\?\.rows/);
 assert.doesNotMatch(app,/REGIONS=resultExperience/,'old parallel region registry has been retired');
 assert.match(app,/resultExperience\.mountResult/);
 assert.match(parity,/calculateActivityReference\(record\)/);
 assert.match(parity,/expected\.reference100/);
 assert.ok(!app.includes('value:101.7'),'legacy sample references must not serve as test oracle');
});

test('obsolete region helpers and mock graph generation have been fully retired (004)',()=>{
 const app=read('app.js');
 for(const old of ['function radarChart()','function historyChart(region)','function miniTrendChart(region)',
                   'const svgBody=','const regionTiles=','const mobileRegionRows=','const regionPictogram=',
                   'data-result-mode','data-expand-regions']){
  assert.equal(app.includes(old),false,'retired result helper present: '+old);
 }
 assert.ok(app.includes('resultExperience.mountResult'));
 assert.ok(app.includes('bodyExperience.focusRegion'),'separate anatomy selection experience stays available');
 assert.ok(app.includes('data-body-detail-source="saved-only"'),'legacy direct details route to saved results');
});

test('S09 optional mental self-report details are user-controlled while pending recovery remains visible',()=>{
 const result=read('ui/resultExperience.js');
 const inline=read('ui/resultInlineStyles.js');
 assert.match(result,/class="rv4-mental-details"/);
 assert.match(result,/options\.showMentalPending\?'open':'/);
 assert.match(result,/data-mental-result role="status"/);
 assert.doesNotMatch(result,/<style>\.rv4-grid \.rv4-mental/,'temporary nested CSS must be deleted');
 assert.match(inline,/\.rv4-mental-details>summary/);
});

test('S09 anatomy and ROF-J are co-readable without conflating zero with unanswered',()=>{
 const js=read('ui/resultExperience.js'),css=read('ui/resultInlineStyles.js');
 assert.match(js,/rv4-body-content/);
 assert.match(css,/container-type:inline-size/);
 assert.match(css,/@container \(min-width:315px\)/);
 assert.match(css,/@container \(max-width:314px\)/);
 assert.match(js,/rv4-fatigue-scale-zero/,'valid zero has an explicit marker');
 assert.match(js,/is-unanswered/,'unanswered is visually different');
 assert.match(js,/data-rof-stage/,'both self-reported ratings have separate rows');
 assert.match(js,/data-source-rof-detail/,'full provenance is available in top disclosure');
 assert.match(js,/rv4-fatigue-method/,'ROF-J timing and history remain accessible');
 assert.doesNotMatch(js,/rv4-tracks/,'obsolete ambiguous overlapping bars removed from output');
 assert.doesNotMatch(js,/rv4-fatigue-numbers/,'the separate scale replaces duplicate numeric chips');
});

test('S09 side-by-side bilingual strings preserve reference provenance',()=>{
 const js=read('ui/resultExperience.js');
 const english=read('ui/englishResultCopy.js');
 const remainder=read('ui/englishSurfaceRemainders.js');
 assert.match(js,/部位の文献基準100との差/);
 assert.match(js,/色は60〜140で表示します。参考値は変更しません。/);
 assert.match(english,/出所：ROF-J／本人回答/);
 assert.match(remainder,/vs. This Region’s Reference 100/);
 assert.match(english,/The color scale ends at 60 and 140/);
});

test('S09 reference range and color-cap message occupy full width outside selected-region card',()=>{
 const js=read('ui/resultExperience.js'), css=read('ui/resultInlineStyles.js');
 assert.match(js,/<div class="rv4-reference-scale-section">/);
 assert.match(css,/\.rv4-reference-scale-section/);
 assert.match(js,/\+'<\/div><\/div>'\s*\+\(r\.value===null/,'reading and body grid close before range status');
 assert.match(js,/data-reference-region=/,'real selected region scientific value remains visible');
});


test('UX11: reference color legend names provenance without changing numeric results',()=>{
 const js=read('ui/resultExperience.js'),english=read('ui/englishResultCopy.js');
 assert.equal((js.match(/<h2>部位の文献参考値<\/h2>/g)||[]).length,2,'body pane title is explicit in populated and empty cases');
 assert.match(js,/<h3>部位の文献参考値<\/h3>/,'comparison keeps reference provenance');
 assert.match(js,/data-reference-scale-meaning/,'meaning remains visible without opening details');
 assert.match(js,/各部位の文献基準100との差を示す色です。危険度ではありません。/);
 assert.match(js,/色は60〜140で表示します。参考値は変更しません。/);
 assert.match(english,/Research Reference Values by Body Region/);
 assert.match(english,/Colors show differences from each region/);
 assert.equal(bodyReferenceScale(145.7).position,100,'color marker is capped');
 assert.equal(bodyReferenceScale(145.7).clipped,'high');
 assert.equal(bodyReferenceScale(44.8).position,0);
 assert.equal(bodyReferenceScale(44.8).clipped,'low');
 assert.match(js,/format\(r.value,1\)/,'the displayed numeric reference is not capped');
 assert.match(js,/data-rof-time-status="unverified"/,'ROF-J timing remains an answer, not a measured change');
 assert.match(js,/data-export-rof/,'export remains opt-in');
});
