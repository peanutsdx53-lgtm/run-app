import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {LEARNING_COURSES,READY_LESSON,RUNNING_PACE_PROFILES,describeRunningProfile,QUIZ,evaluateQuiz,mountLearning}
 from '../ui/learningExperience.js';
test('Pacing is first substantive running lesson, data provenance is auxiliary',()=>{
 assert.equal(LEARNING_COURSES.length,8);
 assert.equal(LEARNING_COURSES[0].title,'走る速さとペース配分');
 assert.equal(LEARNING_COURSES[0].ready,true);
 assert.equal(LEARNING_COURSES.filter(c=>c.ready).length,3);
 assert.equal(READY_LESSON.id,'pace-basics');
 assert.equal(RUNNING_PACE_PROFILES.length,3);
 assert.deepEqual(RUNNING_PACE_PROFILES.map(p=>p.splits),[[6,6,6],[5,6,7],[7,6,5]]);
 for(const p of RUNNING_PACE_PROFILES)
  assert.deepEqual(describeRunningProfile(p),{distanceKm:3,totalMinutes:18,averageMinPerKm:6});
 assert.equal(describeRunningProfile({splits:[6,6]}),null);
 assert.equal(describeRunningProfile({splits:[6,0,6]}),null);
 assert.equal(QUIZ.length,4);
 assert.match(QUIZ[1].prompt,/3 km・18分/);
 assert.match(QUIZ[2].prompt,/5分\/kmと7分\/km/);
 assert.ok(QUIZ.every(q=>q.choices.length===3&&q.rationales.length===3));
 assert.deepEqual(evaluateQuiz({q1:'1',q2:'1',q3:'0',q4:'1'}).map(q=>q.correct),[true,true,true,true]);
 assert.deepEqual(evaluateQuiz({q1:'0',q2:'0',q3:'1',q4:'0'}).map(q=>q.correct),[false,false,false,false]);
 const catalog={innerHTML:''};
 mountLearning(catalog,new URLSearchParams(''));
 assert.match(catalog.innerHTML,/走る速さとペース配分/);
 assert.match(catalog.innerHTML,/補助教材/);
 assert.match(catalog.innerHTML,/href="#\/learning\?lesson=record-origin-missing"/);
 assert.equal((catalog.innerHTML.match(/class="lr-course"/g)||[]).length,3);
 assert.equal((catalog.innerHTML.match(/教材を準備しています/g)||[]).length,0);
 const script=readFileSync(new URL('../ui/learningExperience.js',import.meta.url),'utf8');
 // Browser acceptance exercises the actual mount and DOM listeners.
 // The Node stage checks content and source boundaries without a fake DOM.
 assert.match(script,/id="lr-running-profiles"/);
 assert.match(script,/data-lr-profile/);
 assert.match(script,/Abbiss &amp; Laursen/);
 assert.match(script,/競技場面/);
 assert.match(script,/この総説が上記3 kmの例を実験したわけでも/);
 assert.match(script,/疲労や体力、どの配分が適切かは判断できません/);
 assert.doesNotMatch(script,/localStorage\.|sessionStorage\.|indexedDB\./);
});
