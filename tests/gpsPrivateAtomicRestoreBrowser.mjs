/** G4-C4 real Chromium/WebKit 4-store atomic GPS/notes import with abort tests. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.js':'text/javascript;charset=utf-8','.html':'text/html;charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/__g4c4__'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><title>G4-C4 GPS restore verification</title>');return;}
  const full=resolve(root,'.'+pathname);
  if(full!==root&&!full.startsWith(root+sep))throw Error('outside repository');
  const file=full===root?resolve(root,'index.html'):full;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(18000);
 await page.goto('http://127.0.0.1:'+server.address().port+'/__g4c4__');
 const tests=await page.evaluate(async()=>{
  const store=await import('/ui/gpsReplayIndexedDbStore.js');
  const {DATA_KEYS,PORTABLE_FORMAT}=await import('/ui/dataManagement.js');
  const {inspectPortableV3Backup,preparePortableV3Candidate,planPrivateGpsRestore}
   =await import('/ui/gpsReflectionPortableV3.js');
  const {GPS_PRIVATE_REFLECTION_FORMAT,GPS_PRIVATE_REFLECTION_VERSION}
   =await import('/ui/gpsReflectionBackupScope.js');
  const {readGpsPrivateBackupSnapshot}=await import('/ui/gpsReflectionBackupSnapshot.js');
  const {restoreGpsPrivateV3Atomic}=await import('/ui/gpsPrivateAtomicRestore.js');
  const json=x=>JSON.stringify(x);
  const ref=id=>({sourceType:'GPS_V2',recordId:id});
  const choice={includeGps:true,includeGpsReflections:true};
  const confirmed={...choice,confirmPrivateRestore:true};
  const read=async()=>{
   const s=await readGpsPrivateBackupSnapshot(choice);
   if(!s.ok)throw Error('GPS current snapshot failed: '+json(s));
   return s;
  };
  const annotations={format:'running-annotation-backup-v1',version:1,
   events:[],heads:[],meta:{key:'root',schemaVersion:1,storeRevision:0,eventCount:0,totalBytes:0}};
  const local=Object.fromEntries(DATA_KEYS.map(key=>[key,null]));
  const track=[0,.0125,.025].map((km,i)=>({
   lat:37.501+i*.00005,lon:139.91,km,t:1700000000000+i*5000,
   ele:null,altitudeAccuracy:null,altitudeQuality:'missing',breakBefore:i===0,activity:'RUNNING'
  }));
  const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
   accepted:3,rejected:0,track,trackSimplified:false,replayTrackAvailable:true,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[]};
  const gpsFixture=()=>store.prepareGpsV2Run(session,{saveDetails:true,date:'2026-11-18'});
  const first=gpsFixture();
  if(!first.ok)throw Error('Cannot prepare GPS parent');
  const gps=(...parents)=>({format:store.GPS_V2_BACKUP_FORMAT,version:2,
   summaries:parents.map(p=>p.summary),details:parents.filter(p=>p.detail).map(p=>p.detail)});
  const note=(id,n,body)=>({noteId:'gps-refnote-g4c4note'+n,recordRef:ref(id),text:body});
  const create=(obj,n,action='CREATE',previous=null,revision=1)=>({
   schemaVersion:1,eventId:'gps-refevent-g4c4event'+n,
   requestId:'gps-refrequest-g4c4request'+n,noteId:obj.noteId,recordRef:obj.recordRef,
   action,predecessorEventId:previous,revision,
   savedAt:'2026-11-18T10:'+String(revision).padStart(2,'0')+':00.000Z'
  });
  const bundle=(contents,events)=>({format:GPS_PRIVATE_REFLECTION_FORMAT,
   version:GPS_PRIVATE_REFLECTION_VERSION,contents,events});
  const toV3=(parent,privateBundle)=>{
   const g=Array.isArray(parent)?gps(...parent):gps(parent);
   const v2={format:PORTABLE_FORMAT,version:2,exportedAt:'2026-11-18T10:00:00.000Z',
    local,gps:g,annotations};
   const saved={ok:true,includedGps:true,includedReflections:true,
    gps:g,reflections:privateBundle};
   const candidate=preparePortableV3Candidate(json(v2),saved,choice);
   if(!candidate.ok)throw Error('Invalid v3 fixture: '+json(candidate));
   return candidate.text;
  };
  const a=note(first.summary.id,'a1','現在の感覚だけを保持');
  const e1=create(a,'a1');
  const v3=toV3(first,bundle([a],[e1]));
  if(!inspectPortableV3Backup(v3).ok)throw Error('v3 candidate failed strict inspection');
  // Consent check precedes even IndexedDB access.
  const oldDescriptor=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{
   open(){throw Error('no IDB access allowed without separate consent');}
  }});
  try{
   for(const params of [{},{includeGps:true},{...choice},{...choice,confirmPrivateRestore:false}]){
    const denied=await restoreGpsPrivateV3Atomic(v3,params);
    if(denied.ok||denied.code!=='CONSENT_REQUIRED')throw Error('Restore without consent '+json(denied));
   }
   const inherited=Object.assign(Object.create({confirmPrivateRestore:true}),choice);
   const bypass=await restoreGpsPrivateV3Atomic(v3,inherited);
   if(bypass.ok||bypass.code!=='CONSENT_REQUIRED')
    throw Error('Inherited restore consent bypassed explicit own-property gate');
   const bad=await restoreGpsPrivateV3Atomic(v3,{...confirmed,unexpected:true});
   if(bad.ok||bad.code!=='BAD_CHOICE')throw Error('Unknown option did not fail closed');
  }finally{
   if(oldDescriptor)Object.defineProperty(globalThis,'indexedDB',oldDescriptor);
   else delete globalThis.indexedDB;
  }
  const created=await restoreGpsPrivateV3Atomic(v3,confirmed);
  if(!created.ok||!created.gpsTransactionCommitted||created.gpsAdded!==1||
     created.privateNotesAdded!==1||created.eventsAdded!==1||created.writeCount!==3)
   throw Error('Initial atomic restore incorrect: '+json(created));
  const after=await read();
  if(after.gps.summaries.length!==1||after.gps.details.length!==1||
     after.reflections.contents.length!==1||after.reflections.events.length!==1||
     after.reflections.contents[0].text!==a.text||
     json(after.reflections.events).includes(a.text))
   throw Error('Parent/current text/history mismatch after atomic commit');

  const again=await restoreGpsPrivateV3Atomic(v3,confirmed);
  if(!again.ok||again.gpsAdded!==0||again.privateNotesAdded!==0||
     again.eventsAdded!==0||again.exactNotesSkipped!==1||again.writeCount!==0)
   throw Error('Exact idempotent restore did not skip: '+json(again));

  // Conflict in an existing note must abort unrelated incoming parent.
  const second=gpsFixture();
  if(!second.ok||second.summary.id===first.summary.id)throw Error('Second GPS fixture');
  const changed={...a,text:'競合した現在本文'};
  const divergent=toV3([first,second],bundle([changed],[e1]));
  const refused=await restoreGpsPrivateV3Atomic(divergent,confirmed);
  if(refused.ok||refused.code!=='NOTE_CONFLICT')
   throw Error('Divergent note was adopted: '+json(refused));
  const afterConflict=await read();
  if(afterConflict.gps.summaries.length!==1||
     afterConflict.reflections.contents[0].text!==a.text)
   throw Error('Rejected note conflict partly created an unrelated parent');

  // Deleted note: restore only event tombstones, NO body or prior text.
  const tombNote=note(first.summary.id,'b1','not exported: deleted text');
  const tombStart=create(tombNote,'b1');
  const tombEnd=create(tombNote,'b2','DELETE',tombStart.eventId,2);
  const tombText=toV3(first,bundle([],[tombStart,tombEnd]));
  if(tombText.includes(tombNote.text))throw Error('Deleted note leaked into v3');
  const deleted=await restoreGpsPrivateV3Atomic(tombText,confirmed);
  if(!deleted.ok||deleted.privateNotesAdded!==1||deleted.eventsAdded!==2)
   throw Error('Tombstone restore failed: '+json(deleted));
  const tombSnapshot=await read();
  if(tombSnapshot.reflections.contents.length!==1||
     tombSnapshot.reflections.events.length!==3||
     tombSnapshot.reflections.events.at(-1)?.action!=='DELETE')
   throw Error('Tombstone resurrected private text');
  const tombAgain=await restoreGpsPrivateV3Atomic(tombText,confirmed);
  if(!tombAgain.ok||tombAgain.eventsAdded!==0)
   throw Error('Tombstone idempotent import failed');

  // Simulated post-write-start error: IDBObjectStore.add throws when events
  // are staged. Earlier parent/current-text add requests must be rolled back.
  const third=gpsFixture(),c=note(third.summary.id,'c1','ABORT_PRIVATE_C4');
  if(!third.ok)throw Error('Third GPS fixture');
  const ev=create(c,'c1');
  const faultV3=toV3(third,bundle([c],[ev]));
  const originalAdd=IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add=function(value,...args){
   if(this.name===store.GPS_V2_REFLECTION_EVENTS)
    throw Error('SIMULATED_INDEXED_DB_EVENT_ADD_FAILURE');
   return originalAdd.call(this,value,...args);
  };
  let aborted;
  try{aborted=await restoreGpsPrivateV3Atomic(faultV3,confirmed);}
  finally{IDBObjectStore.prototype.add=originalAdd;}
  if(aborted.ok||aborted.code!=='TRANSACTION_UNKNOWN')
   throw Error('Interrupted IDB write was accepted: '+json(aborted));
  const afterAbort=await read();
  if(afterAbort.gps.summaries.length!==1||
     afterAbort.reflections.contents.length!==1||
     afterAbort.reflections.events.length!==3||
     json(afterAbort).includes('ABORT_PRIVATE_C4'))
   throw Error('Partial rows persisted after aborted multi-store transaction');

  const final=await store.exportGpsV2Backup();
  if(!final.ok||final.text.includes(a.text)||final.text.includes('ABORT_PRIVATE_C4'))
   throw Error('GPS-only backup format leaked private reflection');

  return {separateConsentNoDbAccess:true,allFourStoresAtomic:true,
   latestTextOnly:true,metadataOnlyHistory:true,exactRepeatZeroWrites:true,
   parentConflictNoPartial:true,tombstoneNoResurrection:true,
   tombstoneIdempotent:true,injectedErrorFullRollback:true,
   gpsOnlyBackupExcludesPrivate:true};
 });
 assert.deepEqual(errors,[],'No unhandled browser errors');
 for(const [key,v] of Object.entries(tests))assert.equal(v,true,key);
 console.log('G4-C4 '+engine+' PASS '+JSON.stringify(tests));
 await context.close();
}finally{await browser.close();await new Promise(done=>server.close(done));}
