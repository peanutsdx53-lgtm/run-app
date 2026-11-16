import test from 'node:test';
import assert from 'node:assert/strict';
import {saveReviewScope,setSaveReviewBusy} from '../ui/saveReviewShared.js';
import {prepareGpsV2Run,validNewGpsRequestId,sameGpsSaveCandidate,
 validGpsV2Summary,validGpsV2Pair} from '../ui/gpsReplayIndexedDbStore.js';
const id='gps-v2-11111111-1111-4111-8111-111111111111';
const t=1700000000000;
const point=(i,km)=>({lat:37.5+i*.0001,lon:139.91,km,t:t+i*6000,
 breakBefore:i===0,ele:null,altitudeAccuracy:null,altitudeQuality:'missing',activity:'RUNNING'});
const session=()=>{const track=[point(0,0),point(1,.015),point(2,.03)];return {
 phase:'finished',activity:'RUNNING',distanceM:30,elapsedMs:12000,accepted:3,
 rejected:0,track,trackSimplified:false,replayTrackAvailable:true,
 replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),flags:[{
 id:'flag-000001',t:track[1].t,km:track[1].km,lat:track[1].lat,lon:track[1].lon,note:'start'
 }]
};};
const opts=(saveDetails=false)=>({date:'2026-11-16',requestId:id,saveDetails,
 experience:{source:'USER_REPORTED',rofBefore:0,rofAfter:null,
 beforeCapturedAt:'2026-11-16T00:00:00.000Z',afterCapturedAt:null,surface:'UNKNOWN',memo:'notes'}});
test('stage 4: strict GPS idempotency ID rejects malformed user input and never reuses legacy IDs',()=>{
 assert.equal(validNewGpsRequestId(id),true);
 for(const x of [null,'','gps-v2-legacy-mixed-1','gps-v2-'+('a'.repeat(36)),
  'gps-v2-11111111-1111-5111-8111-111111111111','gps-v2-11111111-1111-4111-7111-111111111111']){
  assert.equal(validNewGpsRequestId(x),false,String(x));
  assert.equal(prepareGpsV2Run(session(),{...opts(),requestId:x??''}).ok,false);
 }
});
test('stage 4: same operation ID and same consent-bound facts match despite new preparation time',async()=>{
 const source=session(),options=opts(true);
 const first=prepareGpsV2Run(source,options);
 assert.equal(first.ok,true,first.reason);
 assert.equal(first.summary.id,id);
 assert.equal(validGpsV2Summary(first.summary),true);
 assert.equal(validGpsV2Pair(first.summary,first.detail),true);
 const second=prepareGpsV2Run(source,options);
 assert.equal(sameGpsSaveCandidate(second,first.summary,first.detail),true);
 const changedNote=prepareGpsV2Run({...source,flags:source.flags.map(f=>({...f,note:'changed'}))},options);
 assert.equal(sameGpsSaveCandidate(changedNote,first.summary,first.detail),false,'route flag edits are protected');
 assert.equal(sameGpsSaveCandidate(prepareGpsV2Run(source,opts(false)),first.summary,first.detail),false,
  'detail opt-out cannot overwrite earlier opt-in');
 assert.equal(sameGpsSaveCandidate(prepareGpsV2Run(source,{...options,experience:{...options.experience,memo:'changed'}}),
  first.summary,first.detail),false,'self-report edit after an uncertain save is not the same record');
 const optOut=prepareGpsV2Run(source,opts(false));
 assert.equal(optOut.ok,true);
 assert.equal(optOut.detail,null);
 assert.equal(sameGpsSaveCandidate(optOut,optOut.summary,null),true);
 assert.equal(sameGpsSaveCandidate(optOut,optOut.summary,first.detail),false,'forged unconsented route must fail');
 assert.doesNotMatch(JSON.stringify(optOut.summary),/139\.91|37\.5/,'route coordinates never leak into an opt-out summary');
});
test('stage 4: pre-save evidence and location consent are shared in structure but not conflated',()=>{
 const manual=saveReviewScope({source:'manual'});
 const rest=saveReviewScope({source:'manual',rest:true});
 const gpsOff=saveReviewScope({source:'gps',routeOptIn:false});
 const gpsOn=saveReviewScope({source:'gps',routeOptIn:true,notice:'<unsafe>&',busy:true});
 for(const html of [manual,rest,gpsOff,gpsOn]){
  assert.match(html,/data-pre-save-scope/);assert.match(html,/記録の出所/);
  assert.match(html,/位置情報を含む詳細/);assert.match(html,/<details/);
 }
 assert.match(manual,/本人が手入力/);assert.match(rest,/休養日と任意の本人メモ/);
 assert.doesNotMatch(manual,/GPSで測定/);
 assert.match(gpsOff,/保存しない（初期設定）/);
 assert.match(gpsOn,/本人が選択：位置・速度・フラッグ/);
 assert.match(gpsOn,/&lt;unsafe&gt;&amp;/);
 assert.match(gpsOn,/role="alert"/);
 assert.match(gpsOn,/role="status"/);
 assert.equal(saveReviewScope({source:'unknown'}),'','unknown source fails closed');
});
test('stage 4: busy state cannot accidentally re-enable source-invalid controls',()=>{
 const button={dataset:{},textContent:'Save',disabled:true,
  attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]}};
 setSaveReviewBusy(button,true);
 assert.equal(button.disabled,true);assert.equal(button.attrs['aria-busy'],'true');
 assert.match(button.textContent,/確認/);
 setSaveReviewBusy(button,false);
 assert.equal(button.disabled,true,'validation keeps control disabled');
 assert.equal(button.textContent,'Save');
 assert.equal(button.attrs['aria-busy'],undefined);
});
