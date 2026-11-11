import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {MOTION_LESSON,MOTION_QUESTIONS,MOTION_MEASURE_EXAMPLES,checkMotionMeasurement,evaluateMotionQuestions,motionMarkup,motionAnatomySvg}
 from '../ui/learningMotionLesson.js';
import {LEARNING_COURSES} from '../ui/learningExperience.js';
test('L4 running motion lesson: research scope, independent knowledge, safe hypothetical examples',()=>{
 assert.equal(MOTION_LESSON.id,'running-motion-basics');
 assert.equal(MOTION_LESSON.courseId,'movement');
 assert.equal(LEARNING_COURSES.find(x=>x.id==='movement').ready,true);
 assert.equal(LEARNING_COURSES.filter(x=>x.ready).length,3);
 assert.equal(MOTION_QUESTIONS.length,4);
 assert.match(MOTION_QUESTIONS[3].prompt,/支持期と遊脚期/);
 assert.ok(MOTION_QUESTIONS.every(q=>q.choices.length===3&&q.reasons.length===3&&q.relearn.startsWith('lm-')));
 assert.deepEqual(evaluateMotionQuestions({m1:'0',m2:'1',m3:'2',m4:'1'}).map(x=>x.correct),[true,true,true,true]);
 assert.deepEqual(evaluateMotionQuestions({m1:'2',m2:'0',m3:'0',m4:'0'}).map(x=>x.correct),[false,false,false,false]);
 assert.deepEqual(evaluateMotionQuestions({}).map(x=>x.correct),[false,false,false,false]);
 assert.match(evaluateMotionQuestions({})[0].feedback,/未回答/);
 assert.deepEqual(Object.keys(MOTION_MEASURE_EXAMPLES).sort(),['angle','emg','force']);
 assert.equal(checkMotionMeasurement('angle').correct,true);
 assert.equal(checkMotionMeasurement('emg').correct,false);
 assert.equal(checkMotionMeasurement('force').correct,false);
 assert.equal(checkMotionMeasurement('').valid,false);
 const html=motionMarkup();
 for(const term of ['股関節','膝','足関節','支持期','遊脚期','関節角度','地面反力','筋電図','28名','10名',
  '2.5・3.5・4.5m/s','週20km超','14筋','個人','原著'])
  assert.ok(html.includes(term),'missing concept '+term);
 assert.match(html,/足部接地タイプへの有意な速度効果は検出されません/);
 assert.match(html,/同じ筋群内でも一様ではありません/);
 assert.match(html,/lr-motion-cycle/);
 assert.match(html,/歩行と走行でふくらはぎ筋群の活動ピークの時点が異なりました/);
 assert.match(html,/原著の図の転載でもありません/);
 assert.match(html,/#\/exploration-tree\?category=02&amp;topic=/);
 assert.equal((html.match(/class="lr-question"/g)||[]).length,4);
 assert.match(motionAnatomySvg(),/<svg/);
 assert.match(motionAnatomySvg(),/aria-labelledby/);
 assert.match(motionAnatomySvg(),/<figcaption>/);
 assert.doesNotMatch(html,/正しいフォームが確定|傷害リスクを予測|全員に推奨/);
 const source=readFileSync(new URL('../ui/learningMotionLesson.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/localStorage\.|sessionStorage\.|indexedDB\.|readManualRuns\(|saveManualRun\(|readGpsRuns\(/);
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(sw,/"\.\/ui\/learningMotionLesson\.js\?v=20261111-explore-controls-v1"/);
 assert.match(sw,/runload-ui-next-shell-20261111-exploration-inquiry-v2/);
 assert.match(index,/learningExperience\.css\?v=20261111-learning-density-v1/);
 assert.match(index,/app\.js\?v=20261111-exploration-inquiry-v2/);
 assert.match(app,/learningExperience\.js\?v=20261111-explore-controls-v1/);
});