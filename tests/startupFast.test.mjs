import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const version='20261126-cleanup-v5-css-retired-mirror-stage3-readable-history-daily-compact-daily-only-stage3-copy-notes-copy-dictionary-core-copy-remaining-copy-condition-copy-design1-metrics-design2-usability1-inquiry2';
const pwaVersion='20261126-cleanup-v5-css-retired-mirror-stage3-readable-history-daily-compact-daily-only-stage3-copy-notes-copy-dictionary-core-copy-remaining-copy-condition-copy-design1-metrics-design2-usability1-inquiry2';
const cacheVersion='20261126-cleanup-v5-css-retired-mirror-stage3-readable-history-daily-compact-daily-only-stage3-copy-notes-copy-dictionary-core-copy-remaining-copy-condition-copy-design1-metrics-design2-usability1-inquiry2';
test('all 40 current startup modules load as one concurrent import batch',()=>{
 const app=source('app.js');
 const block=app.slice(app.indexOf('const ['),app.indexOf('const [initialGpsV2Cache,canonicalStartup]'));
 assert.match(block,/await Promise\.all\(\[/);
 assert.equal([...block.matchAll(/import\(["']\.\/ui\//g)].length,40);
 assert.doesNotMatch(block,/=\s*await import\(/);
 assert.ok(block.includes('import("./ui/manualRunCanonical.js")'));
 assert.match(app,/const \[initialGpsV2Cache,canonicalStartup\]=await Promise\.all\(\[/);
 assert.match(app,/let gpsV2Cache=initialGpsV2Cache/);
 assert.match(app,/gpsV2\.readGpsV2Summaries\(\),\s*canonical\.initialize\(\)/);
 assert.doesNotMatch(app,/const canonicalStartup=await canonical\.initialize\(\)/);
});
test('boot shell has meaningful states and retry, never hides a permanent failure',()=>{
 const html=source('index.html'),app=source('app.js');
 assert.match(html,/id="boot-screen"/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/id="boot-retry".*hidden/);
 assert.match(html,/通常より時間がかかっています/);
 assert.match(html,/画面を開けませんでした/);
 assert.match(html,/画面の準備を続けています/);
 assert.match(app,/window\.appBoot\?\.ready\(\)/);
 assert.match(app,/\)\.catch\(error=>/);
 assert.match(app,/window\.appBoot\?\.fail\(\)/);
 assert.doesNotMatch(html,/RunLoad|ランロード/);
});
test('boot does not request blanket local data deletion, or force artificial delay',()=>{
 for(const src of [source('index.html'),source('pwa.js')]){
  assert.doesNotMatch(src,/localStorage\.clear|indexedDB\.deleteDatabase|caches\.delete/);
 }
 assert.match(source('index.html'),/location\.reload\(\)/);
 assert.doesNotMatch(source('app.js'),/await new Promise\([^)]*setTimeout/);
});
test('PWA precache registration runs after the real first view and keeps full offline assets',()=>{
 const pwa=source('pwa.js'),sw=source('sw.js'),html=source('index.html');
 assert.match(pwa,/app:boot-ready/);
 assert.match(sw,/url\.searchParams\.has\("v"\)/);
 assert.match(sw,/activeCache\.match\(req\)/);
 assert.match(sw,/if\(cachedVersion\)return cachedVersion/);
 assert.match(pwa,/window\.appBoot\.isReady/);
 assert.match(sw,new RegExp('runload-ui-next-shell-'+cacheVersion));
 assert.ok(sw.includes('app.js?v='+version));
 assert.ok(sw.includes('pwa.js?v='+pwaVersion));
 assert.ok(html.includes('app.js?v='+version));
 assert.ok(html.includes('pwa.js?v='+pwaVersion));
 const assets=JSON.parse(sw.match(/const ASSETS=(\[[^\n]+\]);/)[1]);
 assert.ok(assets.length>=150,'the installed shell must cache the application and its offline modules');
});


test('PWA update notification checks release identity on foreground without forced reload or storage deletion',()=>{
 const pwa=source('pwa.js'),sw=source('sw.js'),html=source('index.html');
 assert.match(pwa,/visibilitychange/);
 assert.match(pwa,/pageshow/);
 assert.match(pwa,/controllerchange/);
 assert.match(pwa,/app:boot-ready/);
 assert.match(pwa,/navigator\.serviceWorker\.getRegistration/);
 assert.match(pwa,/RUNLOAD_GET_RELEASE/);
 assert.match(sw,/RUNLOAD_RELEASE/);
 assert.match(pwa,/showAppUpdateNotice/);
 assert.match(pwa,/updateNoticeDismissed/);
 assert.match(pwa,/location\.reload\(\)/);
 assert.doesNotMatch(pwa,/\blocation\.reload\(\)\s*;(?![^]*addEventListener)/,'automated reload must not be added');
 assert.ok(html.includes('pwa.js?v='+pwaVersion));
 assert.ok(sw.includes('pwa.js?v='+pwaVersion));
 assert.ok(sw.includes('runload-ui-next-shell-'+pwaVersion));
});
