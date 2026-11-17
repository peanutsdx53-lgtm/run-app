import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gpsReviewPage} from '../ui/measurementExperience.js';
import {existsSync} from 'node:fs';
import {shortcutsCard} from '../ui/homeExperience.js';
import {resultImageAnnotation} from '../ui/resultExperience.js';

const finished=()=>({phase:'finished',distanceM:35,accepted:2,activity:'RUNNING',goalMode:'free',goalValue:'',flags:[],lastPosition:null,notice:'',saveRoute:false});
test('UIUX06 S18: GPS review distinguishes valid ROF-J zero from absent after response',()=>{
 const html=gpsReviewPage(finished(),60000,{rofBefore:0,rofAfter:null,saveRoute:false,memo:'本人の疑問'});
 assert.match(html,/<span>運動前<\/span>: <output>0 \/ 10<\/output>/);
 assert.match(html,/未回答/);
 assert.match(html,/0は回答済み、未回答は未回答のまま保存/);
 assert.match(html,/実際の時間的前後差を判定しません/);
 assert.match(html,/位置情報を含むコース詳細は/);
 assert.match(html,/初期OFF/);
 assert.match(html,/data-gps-note/);
 assert.match(html,/data-gps-action="save"/);
 assert.doesNotMatch(html,/data-gps-save-route checked/);
 const disabled=gpsReviewPage({...finished(),distanceM:2,accepted:1},60000,{});
 assert.match(disabled,/data-gps-action="save"[^>]*disabled/);
});
test('Retired F21/S18: no simulator assets or navigation, Learning replaces the shortcut',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const home=shortcutsCard();
 assert.match(home,/href="#\/learning"/);
 assert.doesNotMatch(home,/href="#\/simulation"/);
 assert.doesNotMatch(app,/simulationExperience|data-gps-v2-use|page==="simulation"/);
 for(const p of ['../ui/simulationExperience.js','../ui/simulationExperience.css','../ui/gpxImport.js','../ui/gpsCourseEvidence.js'])assert.equal(existsSync(new URL(p,import.meta.url)),false,p+' must be physically absent');
});
test('UIUX06 S20: exported PNG does not falsely assert timestamp absence',()=>{
 const js=readFileSync(new URL('../ui/resultExperience.js',import.meta.url),'utf8');
 assert.match(js,/回答の実際の時間的前後差は判定しません/);
 assert.doesNotMatch(js,/評価時刻未記録：前後差は判定不可/);
 assert.match(js,/部位間の順位・傷害リスクを示しません/);
 assert.match(js,/resultExportDisclosure/,'PNG uses explicit privacy choice');
 const privacy=readFileSync(new URL('../ui/resultSharingPolicy.js',import.meta.url),'utf8');
 assert.match(privacy,/includeRof:false/,'ROF is hidden by default');
 assert.match(privacy,/ROF-J（本人回答）/,'opted-in ROF retains its provenance');
 assert.equal(resultImageAnnotation({saved:true,reference:{count:9}}).status,'文献参考値：9/12 部位算出');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8'),sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(app,/resultExperience\.js\?v=20261117-s17-help-v1/);
 assert.match(sw,/resultExperience\.js\?v=20261117-s17-help-v1/);
 const appEntry=html.match(/src="(\.\/app\.js\?v=[^"]+)"/)?.[1];
 assert.ok(appEntry,'entrypoint must use a versioned app.js URL');
 assert.ok(sw.includes('"'+appEntry+'"'),'offline assets must match the current app.js entrypoint');
});
