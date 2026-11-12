import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {posix} from 'node:path';

const files=new Set(execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sw=read('sw.js');
const match=sw.match(/const ASSETS=(\[[^\n]*\]);/);
assert.ok(match,'precache must be a single JSON array');
const assets=JSON.parse(match[1]);
const cached=new Set(assets);

// Browser DOM links embedded in UI modules are document-relative; ES module imports
// are source-relative. Root-relative UI links and app shell links are normalized here.
function expectedURL(source,reference){
 if(reference.startsWith('./ui/')||reference.startsWith('./assets/')||
    reference.startsWith('./icons/')||/^\.(?:\/)(?:app|pwa|styles)\.(?:js|css)\?/.test(reference)||
    reference.startsWith('./manifest.'))return reference;
 const [target,query]=reference.split('?');
 const path=target.startsWith('/')?target.slice(1):posix.normalize(posix.join(posix.dirname(source),target));
 return './'+path+'?'+query;
}
const active=new Set(),invalid=[];
for(const path of files){
 if(!/^(?:app\.js|pwa\.js|index\.html|styles\.css|manifest(?:\.en)?\.webmanifest)$/.test(path)&&
    !/^(?:ui|core|assets)\/.*\.(?:js|css|svg)$/.test(path))continue;
 if(path==='sw.js')continue;
 const source=read(path);
 for(const item of source.matchAll(/['"\x60]((?:\.{1,2}\/|\/)[^'"\x60\s<>?#]+\.(?:js|css|webmanifest)\?v=[\w.-]+)['"\x60]/g)){
  const url=expectedURL(path,item[1]);
  const base=url.slice(2).split('?')[0];
  if(!files.has(base))invalid.push(path+': '+item[1]+' -> '+base);
  active.add(url);
 }
}

test('all current versioned JavaScript, CSS and manifest requests are exactly precached',()=>{
 assert.deepEqual(invalid,[],'every literal versioned reference must resolve to a tracked resource');
 for(const url of active)assert.ok(cached.has(url),'missing current offline URL: '+url);
 assert.ok(active.size>=70,'unexpected loss of versioned offline entry points');
});

test('obsolete query revisions are not retained solely for historical compatibility',()=>{
 assert.equal(assets.length,cached.size,'precache URLs must not be duplicated');
 for(const url of assets.filter(x=>x.includes('?v='))){
  assert.ok(active.has(url),'obsolete versioned URL without active reference: '+url);
 }
 for(const url of assets){
  assert.match(url,/^\.\//,'precache must remain in application scope');
  if(url==='./')continue;
  assert.ok(files.has(url.slice(2).split('?')[0]),'precache target missing: '+url);
 }
});

test('offline entry points and dynamic Shadow DOM stylesheet are preserved',()=>{
 for(const url of [
  './app.js?v=20261112-public-copy-v1',
  './ui/annotationEditor.css?v=20261111-posthoc-design-v2',
  './ui/historyInlineStyles.js?v=20261110-p14-visual-v3',
  './ui/englishUi.js?v=20261111-exploration-inquiry-v1',
  './manifest.en.webmanifest'
 ])assert.ok(cached.has(url),'necessary offline resource missing: '+url);
 assert.ok(cached.has('./ui/historyInlineStyles.js'));
 assert.ok(!cached.has('./ui/historyExperience.css'),'deleted history mirror must not return');
});
