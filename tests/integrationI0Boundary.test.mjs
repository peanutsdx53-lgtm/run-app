import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {QUIZ,LEARNING_COURSES} from '../ui/learningExperience.js';
import {MOTION_QUESTIONS} from '../ui/learningMotionLesson.js';
import {FATIGUE_QUESTIONS} from '../ui/learningFatigueLesson.js';
import {ORIGIN_QUIZ} from '../ui/learningOriginLesson.js';
import {LEARNING_TOPICS} from '../ui/explorationExperience.js';
import {parseLegacyOrTypedLink} from '../ui/recordRef.js';

test('I0 cross-feature scientific and personal-data contract: learning never becomes a saved run',()=>{
  assert.deepEqual(LEARNING_COURSES.filter(x=>x.ready).map(x=>x.id),['data','movement','fatigue']);
  assert.equal(LEARNING_COURSES.length,8);
  assert.equal(QUIZ.length+MOTION_QUESTIONS.length+FATIGUE_QUESTIONS.length+ORIGIN_QUIZ.length,16);
  for(const k of ['01|距離・時間・ペース','02|足・膝・股関節','04|疲れの感じ方','01|過去の走りとの比較']){
    assert.ok(LEARNING_TOPICS[k],k+' existing topic contract');
  }
  for(const [category,topic] of [['01','距離・時間・ペース'],['02','足・膝・股関節'],['04','疲れの感じ方']]){
    const hash='#/exploration-tree?category='+category+'&topic='+encodeURIComponent(topic)+'&entry=learning';
    const parsed=parseLegacyOrTypedLink(hash,'exploration');
    assert.equal(parsed.ok,true,'learning topic URL remains valid');
    assert.equal(parsed.value,null,'no implicit saved record reference on knowledge route');
  }
  const selected='run-v1-12345678-1234-4123-8123-123456789012';
  const parsed=parseLegacyOrTypedLink('#/exploration-tree?source=manual&record='+selected+'&category=01&entry=learning','exploration');
  assert.deepEqual(parsed.value,{sourceType:'MANUAL',recordId:selected},'explicit user choice is not overwritten');
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/params\.get\('entry'\)==='learning'/);
  assert.match(app,/!params\.has\('record'\)/);
  assert.match(app,/manualRuns:fromLearning&&saved\.ok===true\?\{ok:true,records:\[\]\}:saved/);
  const ui=readFileSync(new URL('../ui/explorationExperience.js',import.meta.url),'utf8');
  assert.match(ui,/data-ex-learning-entry/);
  assert.match(ui,/data-ex-no-auto-record/);
  const formal=readFileSync(new URL('../ui/learningExperience.js',import.meta.url),'utf8');
  assert.match(formal,/学習でできること/);
  for(const s of ['読み直す','関連する説明に戻る']){
    assert.ok([formal,readFileSync(new URL('../ui/learningMotionLesson.js',import.meta.url),'utf8'),
     readFileSync(new URL('../ui/learningFatigueLesson.js',import.meta.url),'utf8')].some(x=>x.includes(s)));
  }
});
