/** G4-B2: real IndexedDB tests; caller-selected GPS V2, CAS, metadata-only history.
 * This backend remains uncalled by the UI until G4-C/D privacy and visual gates.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/__g4b2__'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><title>G4-B2 atomic writer</title>');return;}
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside repo');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',extname(file)==='.js'?'text/javascript;charset=utf-8':'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));page.setDefaultTimeout(15000);
 await page.goto('http://127.0.0.1:'+server.address().port+'/__g4b2__');
 const evidence=await page.evaluate(async()=>{
  const store=await import('/ui/gpsReplayIndexedDbStore.js');
  const sent=store.commitGpsV2ReflectionChange;
  const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error)});
  const track=[0,.0125,.025].map((km,i)=>({lat:37.501+i*.00005,lon:139.91,
   ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:1700000000000+i*5000,
   breakBefore:i===0,activity:'RUNNING'}));
  const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
   accepted:3,rejected:0,track,trackSimplified:false,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,flags:[]};
  const save=async()=>{const s=await store.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-18'});
   if(!s.ok)throw Error('GPS parent save failed: '+s.reason);return s.summary.id;};
  const runA=await save(),runB=await save();
  if(runA===runB)throw Error('GPS IDs are not unique');
  const ref=id=>({sourceType:'GPS_V2',recordId:id});
  const noteId='gps-refnote-b2aaaaaaaa';
  let n=0;const request=()=>('gps-refrequest-b2'+String(++n).padStart(10,'0'));
  const command=(recordRef,action,revision,lastEventId,text,whichNote=noteId)=>({
   recordRef,noteId:whichNote,action,expectedRevision:revision,
   expectedLastEventId:lastEventId,requestId:request(),
   ...(action==='DELETE'?{}:{text})
  });
  const rows=async()=>{
   const db=await req(indexedDB.open(store.GPS_V2_DB));
   const tx=db.transaction([store.GPS_V2_REFLECTION_CONTENT,store.GPS_V2_REFLECTION_EVENTS],'readonly');
   const complete=done(tx);
   const [notes,events]=await Promise.all([
    req(tx.objectStore(store.GPS_V2_REFLECTION_CONTENT).getAll()),
    req(tx.objectStore(store.GPS_V2_REFLECTION_EVENTS).getAll())
   ]);
   await complete;db.close();return {notes,events};
  };
  const unchanged=async(before,label)=>{
   if(JSON.stringify(await rows())!==JSON.stringify(before))throw Error(label+' mutated existing rows');
  };
  const wrong=command(ref('gps-v2-missing12345'),'CREATE',0,null,'orphan');
  if((await sent(wrong)).ok)throw Error('orphan source accepted');
  for(const bad of [
   {...command(ref(runA),'CREATE',0,null,'x'),text:' '},
   {...command(ref(runA),'CREATE',0,null,'x'),text:'x'.repeat(501)},
   {...command(ref(runA),'CREATE',0,null,'x'),extra:'PRIVATE_LEAK'},
   {...command({sourceType:'MANUAL',recordId:runA},'CREATE',0,null,'x'),
    noteId:'gps-refnote-otheraaaa'},
   {...command(ref(runA),'DELETE',0,null),text:'FORBIDDEN_ON_DELETE'}
  ])if((await sent(bad)).ok)throw Error('bad request accepted');
  if((await rows()).events.length)throw Error('preflight failures wrote events');

  const firstText='PRIVATE_GPS_NOTE_REVISION_ONE';
  const created=await sent(command(ref(runA),'CREATE',0,null,firstText));
  if(!created.ok)throw Error('create failed: '+created.code+' '+created.reason);
  if(created.revision!==1||created.status!=='ACTIVE')throw Error('wrong initial head');
  const afterCreate=await rows();
  if(afterCreate.notes.length!==1||afterCreate.events.length!==1||
      afterCreate.notes[0].text!==firstText||afterCreate.events[0].action!=='CREATE'||
      JSON.stringify(afterCreate.events).includes(firstText)||
      Object.hasOwn(afterCreate.events[0],'text')||
      Object.keys(afterCreate.events[0]).length!==9)
   throw Error('content/history data separation broken');

  const stale=command(ref(runA),'EDIT',0,null,'STALENESS_SHOULD_NOT_WRITE');
  if((await sent(stale)).code!=='HEAD_CONFLICT')throw Error('stale CAS accepted');
  await unchanged(afterCreate,'stale edit');
  if((await sent({...stale,action:'CREATE',expectedRevision:1,
      expectedLastEventId:created.latestEventId})).ok)
   throw Error('duplicate or incorrect transition accepted');
  await unchanged(afterCreate,'reused operation');
  if((await sent(command(ref(runB),'EDIT',1,created.latestEventId,'CROSS_PARENT'))).ok)
   throw Error('note hijack to another saved GPS run');
  await unchanged(afterCreate,'other parent');

  const changedText='PRIVATE_GPS_NOTE_REVISION_TWO';
  const edited=await sent(command(ref(runA),'EDIT',1,created.latestEventId,changedText));
  if(!edited.ok||edited.revision!==2)throw Error('edit failure '+edited.code);
  const afterEdit=await rows();
  if(afterEdit.notes.length!==1||afterEdit.notes[0].text!==changedText||
    afterEdit.events.length!==2||JSON.stringify(afterEdit.events).includes(firstText)||
    JSON.stringify(afterEdit.events).includes(changedText))
   throw Error('historical text retained after edit');

  const simultaneous=await Promise.all([
   sent(command(ref(runA),'EDIT',2,edited.latestEventId,'CONCURRENT_ONE')),
   sent(command(ref(runA),'EDIT',2,edited.latestEventId,'CONCURRENT_TWO'))
  ]);
  if(simultaneous.filter(v=>v.ok).length!==1||simultaneous.filter(v=>v.code==='HEAD_CONFLICT').length!==1)
   throw Error('concurrent edits did not serialize with CAS: '+JSON.stringify(simultaneous));
  const winner=simultaneous.find(v=>v.ok);
  const beforeDelete=await rows();
  const deleted=await sent(command(ref(runA),'DELETE',winner.revision,winner.latestEventId));
  if(!deleted.ok||deleted.status!=='DELETED')throw Error('DELETE failed '+deleted.code);
  const afterDelete=await rows();
  if(afterDelete.notes.length!==0||afterDelete.events.length!==4||
    afterDelete.events.filter(v=>v.action==='DELETE').length!==1||
    JSON.stringify(afterDelete.events).includes('PRIVATE_GPS_NOTE'))
   throw Error('private text survived DELETE');
  if((await sent(command(ref(runA),'CREATE',deleted.revision,deleted.latestEventId,'RESURRECT'))).ok)
   throw Error('deleted note resurrected');
  await unchanged(afterDelete,'resurrection attempt');

  const backup=await store.exportGpsV2Backup();
  if(!backup.ok||backup.text.includes('PRIVATE_GPS_NOTE'))
   throw Error('GPS backup leaked private reflection data');
  const extra=await sent(command(ref(runB),'CREATE',0,null,'PRIVATE_TO_BE_PURGED',
    'gps-refnote-bbbbbbbbbbbb'));
  if(!extra.ok)throw Error('other run create failed '+extra.code);
  const removed=await store.deleteGpsV2Run(runB);
  if(!removed.ok)throw Error('parent delete failed');
  const finalRows=await rows();
  if(finalRows.notes.length||finalRows.events.some(e=>e.recordRef.recordId===runB))
   throw Error('GPS parent delete retained linked content or metadata');

  // A clock rollback must not make private note text impossible to erase.
  // In the exceptional case, deletion savedAt is a monotonic ordering marker.
  const clockNote='gps-refnote-clockskewaaaa';
  const clockCreated=await sent(command(ref(runA),'CREATE',0,null,'PRIVATE_CLOCK_SKEW',clockNote));
  if(!clockCreated.ok)throw Error('clock-skew fixture create failed '+clockCreated.code);
  const skewDb=await req(indexedDB.open(store.GPS_V2_DB));
  const skewTx=skewDb.transaction(store.GPS_V2_REFLECTION_EVENTS,'readwrite');
  const skewDone=done(skewTx),eventStore=skewTx.objectStore(store.GPS_V2_REFLECTION_EVENTS);
  const existing=eventStore.get(clockCreated.latestEventId);
  existing.onsuccess=()=>{
   if(!existing.result){skewTx.abort();return;}
   eventStore.put({...existing.result,savedAt:'2099-01-01T00:00:00.000Z'});
  };
  await skewDone;skewDb.close();
  const skewDeleted=await sent(command(ref(runA),'DELETE',1,clockCreated.latestEventId,undefined,clockNote));
  if(!skewDeleted.ok||skewDeleted.status!=='DELETED')
   throw Error('clock rollback blocked privacy erasure '+JSON.stringify(skewDeleted));
  const skewRows=await rows();
  if(skewRows.notes.some(x=>x.noteId===clockNote)||
     skewRows.events.find(x=>x.eventId===skewDeleted.latestEventId)?.savedAt!=='2099-01-01T00:00:00.000Z')
   throw Error('clock rollback did not preserve deletion and ordered metadata');
  return {initialCreate:true,strictInput:true,staleCas:true,duplicateRequest:true,
   recordRefScope:true,textHistorySeparated:true,atomicEdit:true,concurrentCas:true,
   physicalDelete:true,noResurrection:true,backupExclusion:true,parentErasure:true,
   clockRollbackDelete:true};
 });
 assert.deepEqual(errors,[],'no page error');
 for(const [key,v] of Object.entries(evidence))assert.equal(v,true,key);
 console.log('G4-B2 '+engine+' PASS '+JSON.stringify(evidence));
 await context.close();
}finally{await browser.close();await new Promise(done=>server.close(done));}
