import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {RESET_KEYS,DATA_KEYS} from '../ui/dataManagement.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('learning checklist cards and quiz pager are removed from the implementation',()=>{
 const presentation=source('ui/learningPresentation.js');
 const lesson=source('ui/learningExperience.js');
 assert.doesNotMatch(presentation,/buildProgressPanel|readLearningChecklist|setLearningChecked|data-lr-progress|paginateReview|data-lr-quiz-all/);
 assert.doesNotMatch(lesson,/enhanceLearningCatalogue|lr-hero|lr-status|data-lr-progress-toggle/);
 assert.match(presentation,/splitQuestionHeading/);
 assert.match(presentation,/compactLessonChapters/);
});
test('older lesson marks remain deletable but are not exported as running records',()=>{
 assert.equal(RESET_KEYS.includes('runload-v2-learning-checklist-v1'),true);
 assert.equal(DATA_KEYS.includes('runload-v2-learning-checklist-v1'),false);
});
test('all review questions remain visible and practice buttons have explicit dark palette',()=>{
 const presentation=source('ui/learningPresentation.js');
 const css=source('ui/unifiedLearningShell.css');
 assert.doesNotMatch(presentation,/paginateReview|lr-quiz-pages|lr-quiz-toolbar/);
 assert.match(css,/button\.lr-action\.lr-outline/);
 assert.match(css,/\:active/);
 assert.match(source('ui/learningExperience.js'),/全4問をまとめて表示/);
});
