import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../pwa.js',import.meta.url),'utf8');
const release='20261126-cleanup-v4';

class Emitter{
 constructor(){this.listeners=new Map()}
 addEventListener(name,fn){
  if(!this.listeners.has(name))this.listeners.set(name,[]);
  this.listeners.get(name).push(fn);
 }
 fire(name,extra={}){
  for(const callback of this.listeners.get(name)||[])callback({type:name,...extra});
 }
}
class FakeElement extends Emitter{
 constructor(tag='div'){super();this.tag=tag;this.children=[];this.style={cssText:''};this.parent=null;this.textContent='';this.id=''}
 setAttribute(){}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,12));
function mockApp({installed,controllerVersion=release}={}){
 let now=120000, reloads=0;
 const document=new Emitter();
 document.documentElement={lang:'ja'};
 document.visibilityState='visible';
 document.body=new FakeElement('body');
 document.createElement=tag=>new FakeElement(tag);
 document.getElementById=id=>document.body.children.find(x=>x.id===id)||null;
 document.querySelector=selector=>selector.includes('pwa.js?v=')?{src:'https://example.test/run-app/pwa.js?v='+release}:null;
 const window=new Emitter();
 window.isSecureContext=true;
 window.appBoot={isReady:true};
 const location={protocol:'https:',href:'https://example.test/run-app/',reload(){reloads++}};
 class MessageChannel{
  constructor(){
   const first={onmessage:null,close(){}};
   this.port1=first;
   this.port2={close(){},reply(data){queueMicrotask(()=>first.onmessage?.({data}))}};
  }
 }
 const worker=version=>Object.assign(new Emitter(),{
  state:'activated',
  postMessage(request,ports){
   if(request.type==='RUNLOAD_GET_RELEASE')ports[0].reply({type:'RUNLOAD_RELEASE',release:version});
  }
 });
 const serviceWorker=new Emitter();
 serviceWorker.controller=installed?worker(controllerVersion):null;
 const registration=Object.assign(new Emitter(),{
  installing:null,waiting:null,updateCalls:0,
  async update(){this.updateCalls++}
 });
 serviceWorker.getRegistration=async()=>installed?registration:null;
 serviceWorker.register=async()=>registration;
 const navigator={serviceWorker,onLine:true};
 class Clock extends Date{static now(){return now}}
 runInNewContext(source,{
  window,document,location,navigator,URL,MessageChannel,Date:Clock,setTimeout,clearTimeout,
  console:{warn(){}}
 });
 return{
  document,window,navigator,registration,
  worker,
  async boot(){window.fire('load');await tick()},
  banner(){return document.getElementById('app-update-notice')},
  reloads:()=>reloads,
  setNow(value){now=value}
 };
}
test('a first PWA installation does not claim an update or auto-reload',async()=>{
 const app=mockApp({installed:false});
 await app.boot();
 assert.equal(app.registration.updateCalls,1,'one initial check');
 assert.equal(app.banner(),null,'first install is not an upgrade');
 const installing=Object.assign(new Emitter(),{state:'installing'});
 app.registration.installing=installing;
 app.registration.fire('updatefound');
 installing.state='installed';
 installing.fire('statechange');
 assert.equal(app.banner(),null);
 assert.equal(app.reloads(),0);
});
test('a previously controlled app offers a choice when the worker changes',async()=>{
 const app=mockApp({installed:true});
 await app.boot();
 assert.equal(app.banner(),null,'matching current release is not an upgrade');
 const newer=app.worker('20261124-pwa-update-v2');
 app.navigator.serviceWorker.controller=newer;
 app.navigator.serviceWorker.fire('controllerchange');
 await tick();
 const banner=app.banner();
 assert.ok(banner,'upgrade is announced');
 assert.equal(app.reloads(),0,'never auto-reload while there may be unsaved input');
 assert.equal(banner.children[1].textContent,'更新する');
 banner.children[2].fire('click');
 assert.equal(app.banner(),null,'Later dismisses');
 app.window.fire('focus');
 await tick();
 assert.equal(app.banner(),null,'dismissal does not loop for the same page');
 assert.equal(app.reloads(),0);
});
test('the update button reloads only when explicitly selected',async()=>{
 const app=mockApp({installed:true,controllerVersion:'20261124-pwa-update-v2'});
 await app.boot();
 assert.ok(app.banner(),'a new worker that activated while the PWA slept is detected');
 assert.equal(app.reloads(),0);
 app.banner().children[1].fire('click');
 assert.equal(app.reloads(),1);
});
test('foreground return checks for an update without requiring a fresh launch',async()=>{
 const app=mockApp({installed:true});
 await app.boot();
 assert.equal(app.registration.updateCalls,1);
 app.setNow(240001);
 app.document.fire('visibilitychange');
 await tick();
 assert.equal(app.registration.updateCalls,2);
 app.setNow(360002);
 app.window.fire('focus');
 await tick();
 assert.equal(app.registration.updateCalls,3);
 assert.equal(app.banner(),null,'no notice if nothing changed');
});

test('first install claim before the installed callback does not cover the record controls',async()=>{
 const app=mockApp({installed:false});
 await app.boot();
 const installing=app.worker(release);
 installing.state='installing';
 app.registration.installing=installing;
 app.registration.fire('updatefound');
 app.navigator.serviceWorker.controller=installing;
 app.navigator.serviceWorker.fire('controllerchange');
 installing.state='installed';
 installing.fire('statechange');
 await tick();
 assert.equal(app.banner(),null,'late installed callback for the same release is not an upgrade');
 assert.equal(app.reloads(),0);
});
test('an existing registration reporting the same release never announces an upgrade',async()=>{
 const app=mockApp({installed:true});
 await app.boot();
 const same=app.worker(release);
 same.state='installed';
 app.registration.installing=same;
 app.registration.waiting=same;
 app.registration.fire('updatefound');
 app.navigator.serviceWorker.controller=same;
 app.navigator.serviceWorker.fire('controllerchange');
 app.setNow(240001);
 app.window.fire('focus');
 await tick();
 assert.equal(app.banner(),null,'identical release does not obstruct the page');
 assert.equal(app.reloads(),0);
});
