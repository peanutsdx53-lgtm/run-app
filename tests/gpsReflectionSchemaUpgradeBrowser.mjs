/** G4-B1: real IndexedDB V1 -> V2 upgrade and atomic GPS parent/child erasure.
 * No new user-facing note writer; test inserts deliberately private fixture rows.
 * Run with RUNLOAD_BROWSER_ENGINE=chromium|webkit.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/__g4b1__'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><title>GPS storage contract</title>');return;}
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside repo');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 page.setDefaultTimeout(18000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/__g4b1__');
 const output=await page.evaluate(async()=>{
  const api=await import('/ui/gpsReplayIndexedDbStore.js');
  const {GPS_V2_DB,GPS_V2_DB_VERSION,GPS_V2_SUMMARIES,GPS_V2_DETAILS,
   GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS}=api;
  const req=(r)=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  const committed=(tx)=>new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onabort=()=>rej(tx.error||Error('abort'));tx.onerror=()=>rej(tx.error||Error('transaction'));});
  const track=[0,.0125,.025].map((km,i)=>({lat:37.501+i*.00005,lon:139.91,
   ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,t:1700000000000+i*5000,
   breakBefore:i===0,activity:'RUNNING'}));
  const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
   accepted:3,rejected:0,track,trackSimplified:false,replayTrackAvailable:true,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[]};
  const first=api.prepareGpsV2Run(session,{saveDetails:true,date:'2026-11-18'});
  if(!first.ok)throw Error('create parent: '+first.reason);
  // This installation begins with the historical v1 GPS database.
  const older=await new Promise((res,rej)=>{
   const r=indexedDB.open(GPS_V2_DB,1);
   r.onupgradeneeded=()=>{r.result.createObjectStore(GPS_V2_SUMMARIES,{keyPath:'id'});
    r.result.createObjectStore(GPS_V2_DETAILS,{keyPath:'id'});};
   r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
  const v1write=older.transaction([GPS_V2_SUMMARIES,GPS_V2_DETAILS],'readwrite');
  const written=committed(v1write);
  v1write.objectStore(GPS_V2_SUMMARIES).add(first.summary);
  v1write.objectStore(GPS_V2_DETAILS).add(first.detail);
  await written;older.close();
  const baseline=JSON.stringify(first.summary)+JSON.stringify(first.detail);
  const upgraded=await api.readGpsV2Summaries();
  if(!upgraded.ok||upgraded.records.length!==1)throw Error('v1 upgrade lost GPS source');
  const db=await req(indexedDB.open(GPS_V2_DB));
  const stores=[GPS_V2_SUMMARIES,GPS_V2_DETAILS,GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS];
  if(db.version!==GPS_V2_DB_VERSION||!stores.every(name=>db.objectStoreNames.contains(name)))
   throw Error('v2 stores missing after upgrade');
  const readRows=async()=>{
   const tx=db.transaction(stores,'readonly'),done=committed(tx);
   const output=await Promise.all(stores.map(s=>req(tx.objectStore(s).getAll())));
   await done;return Object.fromEntries(stores.map((name,i)=>[name,output[i]]));
  };
  const oldRows=await readRows();
  if(JSON.stringify(oldRows[GPS_V2_SUMMARIES][0])+JSON.stringify(oldRows[GPS_V2_DETAILS][0])!==baseline)
   throw Error('GPS parent altered during schema upgrade');
  // A second independent GPS record remains untouched when the first is removed.
  const other=await api.saveGpsV2Run(session,{saveDetails:false,date:'2026-11-18'});
  if(!other.ok)throw Error('second GPS source: '+other.reason);
  const fixture=(i,id)=>({
   note:{noteId:'gps-refnote-note0000000'+i,recordRef:{sourceType:'GPS_V2',recordId:id},
    text:'PRIVATE_G4B1_PARENT_'+i},
   event:{schemaVersion:1,eventId:'gps-refevent-event0000000'+i,
    requestId:'gps-refrequest-request0000000'+i,noteId:'gps-refnote-note0000000'+i,
    recordRef:{sourceType:'GPS_V2',recordId:id},predecessorEventId:null,
    revision:1,action:'CREATE',savedAt:'2026-11-18T01:00:00.000Z'}
  });
  const a=fixture(1,first.summary.id),b=fixture(2,other.summary.id);
  const insert=db.transaction([GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS],'readwrite');
  const insertDone=committed(insert);
  for(const x of [a,b]){
   insert.objectStore(GPS_V2_REFLECTION_CONTENT).add(x.note);
   insert.objectStore(GPS_V2_REFLECTION_EVENTS).add(x.event);
  }
  await insertDone;
  const backup=await api.exportGpsV2Backup();
  if(!backup.ok||backup.text.includes('PRIVATE_G4B1_PARENT'))
   throw Error('GPS backup unexpectedly includes private draft text');
  const missing=await api.deleteGpsV2Run('gps-v2-absent123456789');
  if(missing.ok)throw Error('missing parent deletion was accepted');
  const pre=await readRows();
  if(pre[GPS_V2_REFLECTION_CONTENT].length!==2||pre[GPS_V2_REFLECTION_EVENTS].length!==2)
   throw Error('failed deletion modified dependent rows');
  const removed=await api.deleteGpsV2Run(first.summary.id);
  if(!removed.ok)throw Error('parent deletion refused: '+removed.reason);
  const after=await readRows();
  const remaining=[after[GPS_V2_REFLECTION_CONTENT][0],after[GPS_V2_REFLECTION_EVENTS][0]];
  if(after[GPS_V2_SUMMARIES].length!==1||after[GPS_V2_DETAILS].length!==0||
     after[GPS_V2_REFLECTION_CONTENT].length!==1||after[GPS_V2_REFLECTION_EVENTS].length!==1||
     remaining.some(v=>v.recordRef.recordId!==other.summary.id))
   throw Error('atomic delete lost other run or retained dependent rows');
  const cleared=await api.clearGpsV2Runs();
  if(!cleared.ok)throw Error('full GPS clear refused');
  const empty=await readRows();
  if(stores.some(s=>empty[s].length!==0))throw Error('full erase retained GPS dependency');
  db.close();
  return {schemaVersion:GPS_V2_DB_VERSION,oldRowsPreserved:true,
   backupPrivateTextExcluded:true,missingParentRefused:true,otherParentPreserved:true,
   deletedDependentContent:true,deletedDependentMetadata:true,fullClear:true};
 });
 assert.deepEqual(errors,[],'no browser page exceptions');
 for(const [k,v] of Object.entries(output))if(k!=='schemaVersion')assert.equal(v,true,k);
 assert.equal(output.schemaVersion,2);
 console.log('G4-B1 '+engine+' PASS',JSON.stringify(output));
 await context.close();
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
