import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {LEARNING_COURSES,QUIZ,mountLearning} from '../ui/learningExperience.js';
import {MOTION_QUESTIONS,motionMarkup} from '../ui/learningMotionLesson.js';
import {FATIGUE_QUESTIONS,fatigueMarkup} from '../ui/learningFatigueLesson.js';
import {ORIGIN_QUIZ,originMarkup} from '../ui/learningOriginLesson.js';
import {LEARNING_TOPICS} from '../ui/explorationExperience.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const extractRoute=html=>{
 const matched=html.match(/href="#\/exploration-tree\?([^"]+)"/);
 assert.ok(matched,'course must have a real exploration link');
 const params=new URLSearchParams(matched[1].replaceAll('&amp;','&'));
 assert.equal(params.get('entry'),'learning','general knowledge cannot select a run implicitly');
 assert.equal(params.has('record'),false);
 assert.equal(params.has('source'),false);
 assert.equal(params.has('gps'),false);
 assert.equal(params.getAll('entry').length,1);
 const key=params.get('category')+'|'+params.get('topic');
 assert.ok(LEARNING_TOPICS[key],'topic must exist as a legacy compatible exploration theme: '+key);
 return key;
};
test('L6 running lesson roles, distinct knowledge tasks, and 4 valid legacy exploration links',()=>{
 assert.equal(LEARNING_COURSES.length,8);
 assert.deepEqual(LEARNING_COURSES.filter(c=>c.ready).map(c=>c.id),['data','movement','fatigue']);
 const catalog={innerHTML:''};
 mountLearning(catalog,new URLSearchParams(''));
 assert.match(catalog.innerHTML,/lr-page-heading/);
 assert.match(catalog.innerHTML,/lr-screen-help-content/);
 assert.doesNotMatch(catalog.innerHTML,/lr-pathway/,'P12 must not retain duplicate bottom help');
 assert.match(catalog.innerHTML,/学習でできること/);
 assert.match(catalog.innerHTML,/教材を選び、気になる章を開いてください/);
 assert.match(catalog.innerHTML,/復習では学んだ知識を問題で確かめられます/);
 assert.match(catalog.innerHTML,/補助教材/);
 const sourceL1=source('ui/learningExperience.js');
 const entries=[
 {key:'01|距離・時間・ペース',html:sourceL1},
 {key:'02|足・膝・股関節',html:motionMarkup()},
 {key:'04|疲れの感じ方',html:fatigueMarkup()},
 {key:'01|距離・時間・ペース',html:originMarkup()}
 ];
 assert.deepEqual(entries.map(e=>extractRoute(e.html)),entries.map(e=>e.key));
 const allPrompts=[...QUIZ.map(q=>q.prompt),...MOTION_QUESTIONS.map(q=>q.prompt),...FATIGUE_QUESTIONS.map(q=>q.prompt),...ORIGIN_QUIZ.map(q=>q.question)];
 assert.equal(allPrompts.length,16);
 assert.equal(new Set(allPrompts).size,16,'identical question wording signals duplication');
 assert.ok(QUIZ.some(q=>/ペース|km/.test(q.prompt)));
 assert.ok(MOTION_QUESTIONS.some(q=>/支持期と遊脚期/.test(q.prompt)));
 assert.ok(FATIGUE_QUESTIONS.some(q=>/睡眠/.test(q.prompt)));
 assert.ok(ORIGIN_QUIZ.some(q=>/欠測|出所|ROF-J/.test(q.question)));
 // Optional cross-course paths never inherit a personal RecordRef.
 for(const id of ['running-motion-basics','effort-fatigue-recovery'])
  assert.ok(catalog.innerHTML.includes('href="#/learning?lesson='+id+'"'));
 assert.doesNotMatch(motionMarkup(),/href="#\/learning\?lesson=pace-basics"/);
 assert.doesNotMatch(motionMarkup(),/href="#\/learning\?lesson=effort-fatigue-recovery"/);
 assert.doesNotMatch(fatigueMarkup(),/href="#\/learning\?lesson=running-motion-basics"/);
 assert.doesNotMatch(fatigueMarkup(),/href="#\/learning\?lesson=pace-basics"/);
 assert.doesNotMatch(sourceL1,/RELATED · 違う観点の教材|関連する補助教材 · 任意|id="lr-related"|id="lr-next"/);
 for(const html of [motionMarkup(),fatigueMarkup(),originMarkup()])assert.match(html,/href="#\/exploration-tree\?/);
 const app=source('app.js'),explorer=source('ui/explorationExperience.js');
 assert.match(app,/fromLearning=params\.get\('entry'\)==='learning'/);
 assert.match(app,/fromLearning&&saved\.ok===true\?\{ok:true,records:\[\]\}/);
 assert.match(app,/conditions:fromLearning\?null:conditions/);
 assert.match(app,/draft:fromLearning\?null:/);
 assert.match(explorer,/data-ex-learning-entry/);
 assert.match(explorer,/data-ex-no-auto-record/);
});
