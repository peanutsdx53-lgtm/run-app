/** M1 actual browser acceptance: the active IndexedDB stores, not stubbed readers. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep))throw Error('path outside root');
  const actual=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4256,'127.0.0.1',done));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4256/#/history',{waitUntil:'networkidle'});
 const seeded=await page.evaluate(async()=>{
  const [canonical,manual,gps2,ref]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js'),
   import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/recordRef.js')
  ]);
  const ready=await canonical.refresh();if(!ready.ok)throw Error('manual canonical unavailable: '+ready.reason);
  const draft={date:'2026-10-27',distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:0,rofAfter:null,
   steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'M1 test',courseName:'',shoeName:''};
  const a=await canonical.mutate(storage=>manual.saveManualRun(storage,draft));
  const b=await canonical.mutate(storage=>manual.saveManualRun(storage,{...draft,memo:'M1 same-date second run'}));
  if(!a.ok||!b.ok||a.record.id===b.record.id)throw Error('canonical saves did not succeed');
  const direct=await ref.resolveRecord({sourceType:'MANUAL',recordId:a.record.id});
  const second=await ref.resolveRecord({sourceType:'MANUAL',recordId:b.record.id});
  if(!direct.ok||!second.ok)throw Error('M1 did not resolve actual canonical manual records');
  if(direct.value.record.memo!=='M1 test'||second.value.record.memo!=='M1 same-date second run')
   throw Error('M1 substituted a different same-date record');
  if(direct.value.record.rofBefore!==0||direct.value.record.rofAfter!==null)
   throw Error('M1 erased ROF 0 or invented a missing answer');
  // A localStorage decoy must never supersede the authoritative manual IDB.
  localStorage.setItem(manual.MANUAL_RUN_KEY,'{corrupted-not-authoritative');
  const noFallback=await ref.resolveRecord({sourceType:'MANUAL',recordId:a.record.id});
  if(!noFallback.ok||noFallback.value.record.memo!=='M1 test')throw Error('legacy localStorage substituted for canonical IDB');
  const start=1700000000000;
  const track=[0,.0125,.025].map((km,i)=>({lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,
   altitudeQuality:'missing',km,t:start+i*5000,breakBefore:i===0,activity:'RUNNING'}));
  const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,accepted:3,rejected:0,
   track,trackSimplified:false,replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,flags:[]};
  const current=await gps2.saveGpsV2Run(session,{saveDetails:false,date:'2026-10-27'});
  if(!current.ok)throw Error('GPS v2 save failed: '+current.reason);
  const resolved=await ref.resolveRecord({sourceType:'GPS_V2',recordId:current.summary.id});
  if(!resolved.ok||resolved.value.record.detailSaved!==false)throw Error('current GPS record resolution invented route data');
  return {manual:[a.record.id,b.record.id],gpsV2:current.summary.id};
 });
 await page.reload({waitUntil:'networkidle'});
 const result=await page.evaluate(async ids=>{
  const [canonical,gps2,ref]=await Promise.all([
   import('/ui/manualRunCanonical.js'),import('/ui/gpsReplayIndexedDbStore.js'),import('/ui/recordRef.js')
  ]);
  const manual=await canonical.refresh();
  if(!manual.ok)throw Error('manual storage unavailable after reload');
  const targets=[...ids.manual.map(recordId=>({sourceType:'MANUAL',recordId})),
   {sourceType:'GPS_V2',recordId:ids.gpsV2}];
  for(const target of targets){
   const found=await ref.resolveRecord(target);
   if(!found.ok||found.value.ref.recordId!==target.recordId)throw Error('read-after-reload failed for '+target.sourceType);
  }
  const wrong=await ref.resolveRecord({sourceType:'MANUAL',recordId:ids.gpsV2});
  if(wrong.code!=='SOURCE_MISMATCH')throw Error('GPS incorrectly reused a manual identity');
  const missing=await ref.resolveRecord({sourceType:'GPS_V2',recordId:'gps-v2-abcdef012345'});
  if(missing.code!=='NOT_FOUND')throw Error('unknown explicit GPS id was not rejected');
  const deleted=await gps2.deleteGpsV2Run(ids.gpsV2);
  if(!deleted.ok)throw Error('could not delete GPS v2 test record');
  const afterDelete=await ref.resolveRecord({sourceType:'GPS_V2',recordId:ids.gpsV2});
  if(afterDelete.code!=='NOT_FOUND')throw Error('deleted GPS record was silently replaced');
  return {manual:ids.manual.length,gpsV2:true,deleted:true,rof0:manual.read.records.some(x=>x.id===ids.manual[0]&&x.rofBefore===0&&x.rofAfter===null)};
 },seeded);
 assert.deepEqual(result,{manual:2,gpsV2:true,deleted:true,rof0:true});
 assert.deepEqual(errors,[],'actual app must not raise errors during record-ref acceptance');
 console.log(JSON.stringify({gate:'professor-M1-real-IDB-browser',result:'PASS',sources:['canonical-manual','current-gps'],sameDayManual:2,readAfterReload:true,sourceMismatchRejected:true,deletedRefRejected:true,rof0Preserved:true}));
 await context.close();
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
