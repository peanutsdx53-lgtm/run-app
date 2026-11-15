import test from 'node:test';
import assert from 'node:assert/strict';
import {measurementPage,gpsReviewPage,activityDescription,gpsMeasurementStatus,gpsGoalProgress,gpsPositionIndicator} from '../ui/measurementExperience.js';
import {createGpsSession,GPS_ACTIVITY,snapshotPosition,checkGpsPoint,formatGpsClock,gpsPace} from '../ui/gpsMeasurementCore.js';
import {prepareGpsMeasurement,isValidGpsMeasurement} from '../ui/gpsMeasurementValidation.js';
import {prepareGpsV2Run,gpsV2DetailToFeature} from '../ui/gpsReplayIndexedDbStore.js';
const sample=(latitude,longitude,t,accuracy=8)=>({timestamp:t,coords:{latitude,longitude,accuracy,altitude:115,altitudeAccuracy:10}});
function harness(){let time=1000000,callback,error,watch=0,clear=0;const geo={watchPosition:(ok,err)=>{callback=ok;error=err;return ++watch;},clearWatch:()=>{clear++}};
 const gps=createGpsSession({geo,now:()=>time});return {gps,emit:(lat,lon,offset=0,accuracy=8)=>callback(sample(lat,lon,time+offset,accuracy)),error:code=>error({code}),tick:ms=>time+=ms,stats:()=>({watch,clear})};}
function measured(h){assert.equal(h.gps.start(),true);h.emit(37.5,139.9);h.tick(5000);h.emit(37.50025,139.9);h.tick(5000);h.gps.finish();return h.gps.getSnapshot();}
test('GPS starts only after direct command; view never displays fabricated metrics',()=>{const h=harness();const html=measurementPage(h.gps.state,0);assert.match(html,/data-gps-action="start"/);assert.match(html,/data-gps-activity/);assert.match(html,/data-gps-map/);assert.match(html,/©/);assert.match(html,/data-gps-goal-mode/);assert.doesNotMatch(html,/data-gps-save-route/,'track storage choice is shown only after finishing');assert.doesNotMatch(html,/5\.21/);assert.equal(h.stats().watch,0);assert.deepEqual(Object.keys(GPS_ACTIVITY),['WALK','JOGGING','RUNNING']);assert.equal(GPS_ACTIVITY.MIXED,undefined);assert.doesNotMatch(html,/value="MIXED"|data-gps-segment/);assert.match(activityDescription('WALK'),/12部位/);});
test('GPS position validation rejects accessor failures, poor accuracy, stale timestamp and speed spikes',()=>{assert.equal(snapshotPosition({get coords(){throw Error('permission')}}),null);const p=snapshotPosition(sample(37.5,139.9,1000000));assert.equal(checkGpsPoint(null,p).ok,true);assert.equal(checkGpsPoint(p,snapshotPosition(sample(37.5,139.9001,1005000,200))).ok,false);assert.equal(checkGpsPoint(p,snapshotPosition(sample(37.5,139.9001,999999))).ok,false);assert.equal(checkGpsPoint(p,snapshotPosition(sample(38,139.9,1000001))).ok,false);assert.equal(checkGpsPoint(p,snapshotPosition(sample(37.500001,139.9,1005000))).ok,false);});
test('only walking, jogging and running can be started; pause gaps and flags remain intact',()=>{
 const h=harness();
 for(const mode of ['WALK','JOGGING','RUNNING'])assert.equal(h.gps.setActivity(mode),true,mode);
 assert.equal(h.gps.setActivity('MIXED'),false,'no new mixed activity');
 assert.equal(h.gps.setActivity('UNKNOWN'),false,'unknown activity refused');
 assert.equal(h.gps.state.activity,'RUNNING','invalid input does not change selection');
 assert.equal(h.gps.setActivity('JOGGING'),true);
 assert.equal(h.gps.setSegment,undefined,'retired segment switching must be absent');
 assert.equal(h.gps.start(),true);
 h.emit(37.5,139.9);h.tick(5000);h.emit(37.50025,139.9);
 assert.ok(h.gps.state.distanceM>20);
 assert.equal(h.gps.addFlag(),true,'flag preserved for single-activity sessions');
 assert.equal(h.gps.pause(),true);
 const d=h.gps.state.distanceM;h.tick(10000);
 assert.equal(h.gps.resume(),true);h.emit(37.5003,139.9);
 assert.equal(h.gps.state.distanceM,d,'resuming does not bridge missing GPS segment');
 h.tick(5000);h.emit(37.50055,139.9);
 assert.ok(h.gps.state.distanceM>d);
 assert.equal(h.gps.finish(),true);
 const snap=h.gps.getSnapshot();
 assert.equal(snap.phase,'finished');
 assert.equal(snap.activity,'JOGGING');
 assert.equal(snap.track.some(x=>x.breakBefore),true);
 assert.ok(snap.track.every(x=>x.activity==='JOGGING'));
 assert.equal(snap.flags.length,1);
 assert.equal(h.stats().clear,2);
 assert.equal(Math.round(snap.elapsedMs/1000),10);
 assert.ok(gpsPace(snap.distanceM,snap.elapsedMs)!=='—');
 assert.equal(formatGpsClock(3610000),'01:00:10');
});
test('GPS record preparation protects optional route and measured quality',()=>{
 const h=harness(),session=measured(h);
 const no=prepareGpsMeasurement(session,{saveRoute:false,date:'2026-10-26'});
 const yes=prepareGpsMeasurement(session,{saveRoute:true,date:'2026-10-26'});
 assert.equal(no.ok,true);assert.equal(no.measurement.track.length,0);
 assert.equal(yes.ok,true);assert.ok(yes.measurement.track.length>=2);
 assert.equal(isValidGpsMeasurement(yes.measurement),true);
 const current=prepareGpsV2Run(session,{saveDetails:true,date:'2026-10-26'});
 assert.equal(current.ok,true,current.reason);
 const feature=gpsV2DetailToFeature(current.summary,current.detail);
 assert.ok(feature.distanceKm>=.01);assert.ok(feature.elevationPoints>0);
});
test('GPS record cannot be saved from blank, mock or uncompleted state',()=>{const h=harness();assert.equal(prepareGpsMeasurement(h.gps.getSnapshot()).ok,false);h.gps.start();h.emit(37.5,139.9);h.tick(3000);h.gps.finish();assert.equal(prepareGpsMeasurement(h.gps.getSnapshot()).ok,false);});

test('finishing while paused counts only active time, not the last pause twice',()=>{
 const h=harness();h.gps.start();
 h.emit(37.5,139.9);h.tick(5000);h.emit(37.50025,139.9);
 h.gps.pause();h.tick(30000);
 assert.equal(h.gps.elapsed(),5000,'a paused timer freezes');
 assert.equal(h.gps.finish(),true);
 assert.equal(h.gps.getSnapshot().elapsedMs,5000,'finished elapsed duration excludes exactly one pause');
 const prepared=prepareGpsMeasurement(h.gps.getSnapshot(),{saveRoute:true,date:'2026-10-27'});
 assert.equal(prepared.ok,true,prepared.reason);
 assert.equal(prepared.measurement.activeSeconds,5,'saved active time matches measurement');
});
test('multiple pauses and a permission-denied pause do not underflow elapsed duration',()=>{
 const h=harness();h.gps.start();
 h.emit(37.5,139.9);h.tick(5000);h.emit(37.50025,139.9);
 h.gps.pause();h.tick(20000);
 h.gps.resume();h.tick(10000);h.emit(37.50055,139.9);
 h.error(1);h.tick(60000);
 assert.equal(h.gps.getSnapshot().phase,'paused');
 h.gps.finish();
 assert.equal(h.gps.getSnapshot().elapsedMs,15000);
});
test('stale async geolocation callbacks cannot restart GPS after pause or disposal',()=>{
 let success,error,clock=1000000,watch=0,clears=0;
 const gps=createGpsSession({geo:{watchPosition:(ok,err)=>{success=ok;error=err;return ++watch},clearWatch:()=>{clears++}},now:()=>clock});
 gps.start();const stale=success;
 const fixed=t=>sample(37.5,139.9,t);
 stale(fixed(clock));gps.pause();
 stale(fixed(clock+5000));
 assert.equal(gps.state.accepted,1,'callback delivered after pause is discarded');
 gps.resume();success(fixed(clock+10000));
 assert.equal(gps.state.accepted,2);
 gps.discard();success(fixed(clock+20000));error({code:1});
 assert.equal(gps.state.accepted,2);assert.equal(gps.state.phase,'discarded');
 assert.equal(clears,2);
});
test('GPS permission revocation stops watcher and pauses until fresh consent',()=>{
 const h=harness();
 assert.equal(h.gps.state.keepScreenAwake,false);
 assert.equal(h.gps.setKeepScreenAwake(true),true);
 assert.equal(h.gps.state.keepScreenAwake,true);
 h.gps.start();
 assert.equal(h.gps.setKeepScreenAwake(false),false);
 h.emit(37.5,139.9);
 h.error(1);
 assert.equal(h.gps.state.phase,'paused');
 assert.equal(h.stats().clear,1);
 assert.match(h.gps.state.positionError,/拒否/);
 assert.equal(h.gps.resume(),true,'controller resumes only if caller reauthorizes via the app UI');
 assert.equal(h.stats().watch,2);
 h.gps.discard();
 assert.equal(h.stats().clear,2);
});

test('GPS pre/post ROF-J routes are separate and optional, never inline select',()=>{
 const before=measurementPage({...harness().gps.state,phase:'ready'},0,{rofBefore:0});
 assert.match(before,/data-gps-rof-entry="before"/);
 assert.match(before,/0 \/ 10/);
 assert.doesNotMatch(before,/data-gps-rof="before"/);
 const finished=gpsReviewPage({...harness().gps.state,phase:'finished',distanceM:100,accepted:3},30000,{rofBefore:0,rofAfter:null,memo:''});
 assert.match(finished,/data-gps-rof-entry="after"/);
 assert.match(finished,/data-gps-action="save"/);
 assert.match(finished,/GPSで取得した記録/);
 assert.doesNotMatch(finished,/data-gps-rof="after"/);
});

test('GPS preflight shows current stage and does not show measurement before starting',()=>{
 const h=harness(),screen=measurementPage(h.gps.state,0);
 assert.match(screen,/01<\/b> 準備/);
 assert.match(screen,/gps-live-prep/);
 assert.match(screen,/data-gps-action="start"/);
 assert.doesNotMatch(screen,/data-gps-activity-description/);
});

test('synthetic or legacy mixed activity may not be prepared as a new GPS record',()=>{
 const h=harness(),finished=measured(h);
 for(const rejected of ['MIXED','INVALID','']){
  const bad={...finished,activity:rejected};
  assert.equal(prepareGpsMeasurement(bad,{saveRoute:false}).ok,false,rejected);
  assert.equal(prepareGpsV2Run(bad,{saveDetails:false}).ok,false,rejected);
 }
 for(const activity of Object.keys(GPS_ACTIVITY)){
  const ok={...finished,activity,track:finished.track.map(p=>({...p,activity}))};
  assert.equal(prepareGpsV2Run(ok,{saveDetails:false}).ok,true,activity);
 }
});

test('Stage 2: native finish modal requires separate confirm; controls precede map',()=>{
 const h=harness();h.gps.start();const html=measurementPage(h.gps.state,1000);
 assert.match(html,/data-gps-finish-dialog/);
 assert.match(html,/aria-labelledby="gps-finish-title"/);
 assert.match(html,/data-gps-action="finish-confirm"/);
 assert.match(html,/data-gps-action="finish-cancel"/);
 assert.match(html,/role="group" aria-label="測定中の操作"/);
 assert.ok(html.indexOf('data-gps-action="pause"')<html.indexOf('data-gps-map'),'controls precede the map');
 assert.equal((html.match(/data-gps-action="finish"/g)||[]).length,1);
 const paused=measurementPage({...h.gps.state,phase:'paused'},1000);
 assert.match(paused,/data-gps-action="resume"/);
 assert.doesNotMatch(paused,/data-gps-action="flag"/);
});
test('Stage 2: GPS-ready timer, received GPS and failure remain distinguishable',()=>{
 const s={...harness().gps.state,phase:'running',goalMode:'time',goalValue:'10'};
 assert.equal(gpsMeasurementStatus(s),'位置取得待ち・計測中');
 assert.match(gpsGoalProgress(s,30000),/残り 00:09:30/);
 assert.match(measurementPage(s,30000),/data-gps-goal/);
 assert.doesNotMatch(measurementPage(s,30000),/gps-live-disclaimer/);
 s.lastPosition={lat:37.5,lon:139.9,accuracyM:8};
 assert.equal(gpsMeasurementStatus(s),'GPS受信中・計測中');
 s.positionError='GPSを受信できません';
 assert.equal(gpsMeasurementStatus(s),'測位を確認してください');
 s.positionError='';s.goalReached=true;
 assert.match(gpsGoalProgress(s,600000),/自動で終了しません/);
 s.goalReached=false;s.goalMode='distance';s.goalValue='1';s.distanceM=250;
 assert.match(gpsGoalProgress(s,60000),/残り 0.75 km/);
});

test('Stage 2 location indicator distinguishes waiting, error and valid fixes',()=>{
 const s={phase:'running',lastPosition:null,positionError:''};
 assert.equal(gpsPositionIndicator(s),'gps-v2-dot--waiting');
 s.positionError='Position unavailable';assert.equal(gpsPositionIndicator(s),'gps-v2-dot--error');
 s.positionError='';s.lastPosition={lat:37.5,lon:139.9,accuracyM:8};
 assert.equal(gpsPositionIndicator(s),'');
 s.phase='paused';assert.equal(gpsPositionIndicator(s),'gps-v2-dot--pause');
});
