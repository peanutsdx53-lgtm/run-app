import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const runtime=tracked.filter(path=>
  /^(?:app\.js|pwa\.js|sw\.js|index\.html|manifest(?:\.en)?\.webmanifest|styles\.css)$/.test(path)||
  /^(?:ui|core|assets)\/.+\.(?:js|css|svg)$/.test(path));
const read=path=>readFileSync(path,'utf8');

test('shipped sources do not name conversational-generation providers or their SDKs',()=>{
  const terms=/chat[\s-]?gpt|open[\s-]?ai|anthropic|claude|gemini|copilot|hugging[\s-]?face|ollama|\b(?:LLM|GPT(?:-\d+)?|chatbot|AI)\b|生成\s*AI|人工知能/i;
  for(const path of runtime)assert.doesNotMatch(read(path),terms,'unexpected provider term in '+path);
});

test('app functionality and translated text do not require a remote inference gateway',()=>{
  const externalExecution=/\b(?:XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(|\b(?:fetch)\s*\(|https?:\/\/(?:api\.(?:openai|anthropic)|generativelanguage\.googleapis)\.com/i;
  for(const path of runtime.filter(p=>p.endsWith('.js')&&p!=='sw.js')){
    assert.doesNotMatch(read(path),externalExecution,'review remote execution dependency: '+path);
  }
  const english=read('ui/englishUi.js');
  assert.match(english,/ENGLISH_UI_TEXT=Object\.freeze/);
  assert.match(english,/function translateUiText/);
  const science=read('core/activity/activityReference.js');
  assert.match(science,/calculateRunningReference/);
  assert.match(science,/calculateJoggingReference/);
  assert.match(science,/calculateWalkingReference/);
});

test('offline worker only revalidates same-origin resources, not a remote generation API',()=>{
  const worker=read('sw.js');
  assert.match(worker,/if\(url\.origin!==self\.location\.origin/);
  assert.match(worker,/const ASSETS=\[/);
  assert.match(worker,/await fetch\(new Request\(req/);
  const html=read('index.html');
  for(const m of html.matchAll(/<script[^>]*\bsrc=["']([^"']+)/g))
    assert.match(m[1],/^\.\//,'external executable script: '+m[1]);
  for(const m of html.matchAll(/<link[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)/g))
    assert.match(m[1],/^\.\//,'external stylesheet: '+m[1]);
});

test('expected non-generative interfaces retain their specific behavior',()=>{
  const install=read('pwa.js');
  assert.match(install,/beforeinstallprompt/,'browser install request must remain usable');
  const guides=read('ui/explorationTopicGuides.js');
  assert.match(guides,/EXPLORATION_STARTING_QUESTIONS=Object\.freeze/,'question prompts stay fixed editorial text');
  const map=read('ui/gpsLiveMap.js');
  assert.match(map,/https:\/\/tile\.openstreetmap\.org/,'the optional map-tile service is not an inference API');
  const lesson=read('ui/learningExperience.js');
  assert.match(lesson,/RUNNING_PACE_PROFILES/,'lesson examples remain deterministic');
});
