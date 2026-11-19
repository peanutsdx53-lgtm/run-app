/** G4-C2: real Chromium/WebKit IndexedDB snapshot reads; NO backup UI/export change. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.js':'text/javascript;charset=utf-8','.html':'text/html;charset=utf-8','.json':'application/json'};
const server=createServer(async(request,response)=>{
 try{
  const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  if(pathname==='/__g4c2__'){
   response.setHeader('Content-Type','text/html;charset=utf-8');
   response.end('<!doctype html><title>G4-C2 atomic GPS privacy snapshot</title>');
   return;
  }
  const full=resolve(root,'.'+pathname);
  if(full!==root&&!full.startsWith(root+sep))throw Error('path out of repo');
  const file=full===root?resolve(root,'index.html'):full;
  response.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  response.end(await readFile(file));
 }catch{response.statusCode=404;response.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(18000);
 await page.goto('http://127.0.0.1:'+server.address().port+'/__g4c2__');
 const checks=await page.evaluate(async()=>{
  const store=await import('/ui/gpsReplayIndexedDbStore.js');
  const {readGpsPrivateBackupSnapshot}=await import('/ui/gpsReflectionBackupSnapshot.js');
  const request=req=>new Promise((resolve,reject)=>{
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('IDB'));
  });
  const done=tx=>new Promise((resolve,reject)=>{
   tx.oncomplete=()=>resolve();
   tx.onabort=()=>reject(tx.error||Error('abort'));
   tx.onerror=()=>reject(tx.error||Error('transaction'));
  });
  const selections=[
   {},{includeGps:false,includeGpsReflections:false},
   {includeGps:true,includeGpsReflections:false}
  ];
  // Opt-out MUST not even attempt to open the private database.
  const prior=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{
   open(){throw Error('Forbidden storage access on opt-out');}
  }});
  try{
   for(const choice of selections.slice(0,2)){
    const skipped=await readGpsPrivateBackupSnapshot(choice);
    if(!skipped.ok||skipped.includedGps||skipped.includedReflections||
       skipped.gps!==null||skipped.reflections!==null)
     throw Error('private opt-out exposed data: '+JSON.stringify(skipped));
   }
   const bad=await readGpsPrivateBackupSnapshot({includeGpsReflections:true});
   if(bad.ok||bad.code!=='CONSENT_REQUIRED')throw Error('GPS private consent bypass');
  }finally{
   if(prior)Object.defineProperty(globalThis,'indexedDB',prior);
   else delete globalThis.indexedDB;
  }
  const track=[0,.0125,.025].map((km,i)=>({
   lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,
   altitudeQuality:'missing',km,t:1700000000000+i*5000,
   breakBefore:i===0,activity:'RUNNING'
  }));
  const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
   accepted:3,rejected:0,track,trackSimplified:false,
   replayTrackAvailable:true,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   flags:[]};
  const p=await store.saveGpsV2Run(session,{saveDetails:true,date:'2026-11-18'});
  const q=await store.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-18'});
  if(!p.ok||!q.ok||p.summary.id===q.summary.id)throw Error('GPS parent fixture failure');
  const parent=p.summary.id,ref={sourceType:'GPS_V2',recordId:parent};
  const expectedGps=await store.exportGpsV2Backup();
  if(!expectedGps.ok)throw Error('existing GPS-only backup cannot be read');

  const only=await readGpsPrivateBackupSnapshot({includeGps:true});
  if(!only.ok||!only.includedGps||only.includedReflections||
     only.reflections!==null||only.gps.summaries.length!==2||
     only.gps.details.length!==1||JSON.stringify(only.gps)!==expectedGps.text)
   throw Error('GPS-only format/scope changed: '+JSON.stringify(only));

  const db=await request(indexedDB.open(store.GPS_V2_DB));
  const noteId='gps-refnote-c2abcdefgh';
  const creation={schemaVersion:1,eventId:'gps-refevent-c2abcdefgh',
   requestId:'gps-refrequest-c2abcdefgh',noteId,recordRef:ref,
   action:'CREATE',revision:1,predecessorEventId:null,
   savedAt:'2026-11-18T10:00:00.000Z'};
  const editing={...creation,eventId:'gps-refevent-c2bcdefghi',
   requestId:'gps-refrequest-c2bcdefghi',
   action:'EDIT',revision:2,predecessorEventId:creation.eventId,
   savedAt:'2026-11-18T10:01:00.000Z'};
  const originalText='PRIVATE_G4C2_CURRENT_REFLECTION';
  const note={noteId,recordRef:ref,text:originalText};
  const stored=db.transaction([store.GPS_V2_REFLECTION_CONTENT,store.GPS_V2_REFLECTION_EVENTS],'readwrite');
  const storedDone=done(stored);
  stored.objectStore(store.GPS_V2_REFLECTION_CONTENT).add(note);
  stored.objectStore(store.GPS_V2_REFLECTION_EVENTS).add(creation);
  stored.objectStore(store.GPS_V2_REFLECTION_EVENTS).add(editing);
  await storedDone;
  const before=await store.exportGpsV2Backup();
  if(!before.ok||before.text.includes(originalText))
   throw Error('existing GPS backup leaked voluntary private text');
  const bothChoice={includeGps:true,includeGpsReflections:true};
  const both=await readGpsPrivateBackupSnapshot(bothChoice);
  if(!both.ok||!both.includedGps||!both.includedReflections||
     JSON.stringify(both.gps)!==before.text||
     both.reflections.contents.length!==1||
     both.reflections.contents[0].text!==originalText||
     both.reflections.events.length!==2||
     JSON.stringify(both.reflections.events).includes(originalText))
   throw Error('parent/private atomic read incorrect: '+JSON.stringify(both));

  const dbTx=async(names,callback)=>{
   const tx=db.transaction(names,'readwrite'),complete=done(tx);
   callback(tx);
   await complete;
  };
  // Corrupt an event parent with a valid *but non-existent* GPS ID. A private
  // note must not export when its true parent was deleted or substituted.
  const orphan={...creation,noteId:'gps-refnote-orphanc2a',
   eventId:'gps-refevent-orphanc2a',requestId:'gps-refrequest-orphanc2a',
   recordRef:{sourceType:'GPS_V2',recordId:'gps-v2-orphanc2zzzz'}};
  await dbTx([store.GPS_V2_REFLECTION_EVENTS],tx=>tx.objectStore(store.GPS_V2_REFLECTION_EVENTS).add(orphan));
  const refused=await readGpsPrivateBackupSnapshot(bothChoice);
  if(refused.ok||refused.reflections)throw Error('orphaned private history exported');
  await dbTx([store.GPS_V2_REFLECTION_EVENTS],tx=>tx.objectStore(store.GPS_V2_REFLECTION_EVENTS).delete(orphan.eventId));

  // A corrupted saved route blocks the entire combined snapshot, rather than
  // producing private text bound to an unreadable GPS source.
  const corrupt=await request(db.transaction(store.GPS_V2_DETAILS,'readonly')
   .objectStore(store.GPS_V2_DETAILS).get(parent));
  if(!corrupt)throw Error('missing detail fixture');
  await dbTx([store.GPS_V2_DETAILS],tx=>tx.objectStore(store.GPS_V2_DETAILS)
   .put({...corrupt,route:[]}));
  const routeFailure=await readGpsPrivateBackupSnapshot(bothChoice);
  if(routeFailure.ok)throw Error('corrupt GPS route accepted in private snapshot');
  await dbTx([store.GPS_V2_DETAILS],tx=>tx.objectStore(store.GPS_V2_DETAILS).put(corrupt));

  const recovered=await readGpsPrivateBackupSnapshot(bothChoice);
  if(!recovered.ok||recovered.reflections.contents[0].text!==originalText)
   throw Error('restored parent could not be snapshot-read');
  const after=await store.exportGpsV2Backup();
  if(!after.ok||after.text!==before.text)
   throw Error('read-only snapshot altered GPS source');

  // The original parent-erasure contract must purge current text and history;
  // a new snapshot must not resurrect or rebind them to the other GPS run.
  db.close();
  const erased=await store.deleteGpsV2Run(parent);
  if(!erased.ok)throw Error('parent erase failed');
  const remaining=await readGpsPrivateBackupSnapshot(bothChoice);
  if(!remaining.ok||remaining.reflections.contents.length!==0||
     remaining.reflections.events.length!==0||
     remaining.gps.summaries.length!==1)
   throw Error('private data persisted or reattached after parent deletion');
  return {privateDefaultExcluded:true,separateExplicitConsent:true,
   gpsOnlyBackcompat:true,currentTextOnly:true,metadataOnlyHistory:true,
   sourceAndPrivateSameGeneration:true,orphanRefused:true,corruptDetailRefused:true,
   recoveryAfterRefusal:true,readOnlyNoSourceMutation:true,parentDeletionCascades:true};
 });
 assert.deepEqual(errors,[],'browser produced no unhandled errors');
 for(const [k,v] of Object.entries(checks))assert.equal(v,true,k);
 console.log('G4-C2 '+engine+' PASS '+JSON.stringify(checks));
 await context.close();
}finally{await browser.close();await new Promise(done=>server.close(done));}
