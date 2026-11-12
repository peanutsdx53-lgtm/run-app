import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {reviewView} from '../ui/recordReviewExperience.js';
import {HISTORY_STYLES} from '../ui/historyInlineStyles.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cacheVersion='20261112-cleanup8-final-v3';

test('P13 history help is right-aligned and GPS content is a single compact disclosure',()=>{
 const app=read('app.js'),hist=HISTORY_STYLES;
 assert.match(read('ui/historyExperience.js'),/data-history-inline-styles/,'History must render bundled styles synchronously');
 assert.match(hist,/\.stage \.hx-title-line\{width:100%;/);
 assert.match(hist,/\.stage \.hx-title-line \.rl-screen-help\{margin-left:auto/);
 assert.doesNotMatch(app,/gps-history-shortcut|GPS実走記録 \$\{/);
 for(const token of ['data-gps-history-disclosure','data-gps-history-tools','gps-history-count','gpsHistoryExpanded','gpsHistoryManageExpanded','data-gps-v2-backup-confirm','data-gps-capacity-check'])assert.ok(app.includes(token),'missing GPS capability '+token);
 assert.match(app,/while\(gpsPanel\.firstChild\)content\.append\(gpsPanel\.firstChild\)/);
 assert.match(app,/gpsPanel\.querySelectorAll\('\.gps-history-backup,\.gps-history-capacity'\)/);
});

test('P13 learning removes duplicate menus and progress while preserving individual chapters',()=>{
 const p=read('ui/learningPresentation.js'),learn=read('ui/learningExperience.js');
 assert.doesNotMatch(p,/wrapLessonMenu|学ぶ内容を選ぶ|すべての章を開く|詳しい説明をたたむ|data-lr-expand-all/);
 assert.match(p,/lesson\.querySelector\('\.lr-lesson-index'\)\?\.remove\(\)/);
 assert.match(p,/details\.open=index===0/);
 assert.match(p,/\[id\$="-explore"\] \.lr-actions/);
 assert.doesNotMatch(p,/setLearningChecked|buildProgressPanel|paginateReview/);
 assert.match(learn,/教材の仮想例・回答は引き継がず/);
});

test('P13 transient learning entry preserves record fields and current optional mental preview',()=>{
 const exploration=read('ui/explorationExperience.js'),app=read('app.js');
 assert.match(exploration,/data-ex-learning-entry role="status"/);
 assert.match(exploration,/data-ex-entry-dismiss/);
 assert.match(app,/if\(learningEntryHintShown\)entryHint\.remove\(\)/);
 assert.match(app,/setTimeout\(\(\)=>\{if\(entryHint\.isConnected\)entryHint\.remove\(\);\},6500\)/);
 const draft={date:'2026-11-10',distance:'6',minutes:'42',activityGait:'RUNNING'};
 const html=reviewView(draft,{source:'manual',mentalSummary:'FELT'});
 assert.doesNotMatch(html,/rr-mental-preview|任意の回答を確認・編集する/);
 assert.match(html,/data-review-mental/);
 assert.match(html,/気持ち・考える面の疲れ（任意）/);
 assert.match(html,/ROF-Jとは別の本人申告/);
 assert.match(html,/FELT/);
 assert.equal((html.match(/data-review-link=/g)||[]).length,5);
 assert.doesNotMatch(reviewView(draft,{source:'manual',mentalSummary:'未回答'}),/data-review-mental/);
 assert.match(html,/data-manual-run-save/);
 assert.match(html,/data-review-link="record-reflection"/);
});

test('P13 version and mobile style are cached with the active application',()=>{
 const version='20261112-public-copy-v1',pwaVersion='20261111-home-autosave-v1',presentationVersion='20261110-p14-visual-v4',previous='20261110-p13-compact-v1',index=read('index.html'),sw=read('sw.js'),app=read('app.js'),css=read('ui/screenRefinementP13.css');
 assert.ok(index.includes('app.js?v='+version));
 assert.ok(index.includes('pwa.js?v='+pwaVersion));
 assert.ok(index.includes('ui/screenCoherenceP14.css?v='+presentationVersion));
 assert.ok(sw.includes('runload-ui-next-shell-'+cacheVersion));
 assert.ok(sw.includes('app.js?v='+version));
 for(const p of ['ui/historyExperience.js','ui/screenCoherenceP14.css'])assert.ok(sw.includes(p+'?v='+presentationVersion));
 assert.ok(sw.includes('ui/learningExperience.js?v=20261111-explore-controls-v1'));
 assert.ok(sw.includes('ui/explorationExperience.js?v=20261111-exploration-inquiry-v1'));
 for(const p of ['ui/recordReviewExperience.js','ui/screenRefinementP13.css'])assert.ok(sw.includes(p+'?v='+previous));
 assert.ok(app.includes('ui/historyExperience.js?v='+presentationVersion));
 assert.ok(app.includes('ui/learningExperience.js?v=20261111-explore-controls-v1'));
 assert.ok(app.includes('ui/explorationExperience.js?v=20261111-exploration-inquiry-v1'));
 assert.ok(app.includes('ui/recordReviewExperience.js?v='+previous));
 for(const token of ['.gps-history-disclosure','.gps-history-tools','.lr-inquiry-actions','.ex-learning-entry-hint'])assert.ok(css.includes(token));
});
