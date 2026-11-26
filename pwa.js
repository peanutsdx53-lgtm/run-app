// Progressive enhancement. On iOS, Safari's Share → Add to Home Screen is required.
let deferredInstall=null;
const isInstalled=()=>window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
const safari=()=>/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
function showInstall(){
 const english=document.documentElement.lang==='en';
 const old=document.getElementById("install-guide");if(old)old.remove();
 const div=document.createElement("div");div.id="install-guide";
 const instructions=isInstalled()?"この端末では、すでにアプリとして起動しています。":ios()?(safari()?"Safariの共有メニューから「ホーム画面に追加」→「追加」を選んでください。":"Safariでこのサイトを開き、共有メニューから「ホーム画面に追加」を選んでください。"):deferredInstall?"「インストールする」を押すと、ブラウザがインストール確認を表示します。":"ブラウザのメニューで「アプリをインストール」または「ホーム画面に追加」を選んでください。";
 const copy=english?(isInstalled()?'This app is already running as an installed application.':ios()?(safari()?'In Safari, open Share → Add to Home Screen → Add.':'Open this site in Safari, then choose Share → Add to Home Screen.'):deferredInstall?'Select Install to review the browser installation prompt.':'Open your browser menu and choose Install App or Add to Home Screen.'):instructions;
 div.innerHTML='<div class="install-backdrop"><div class="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" tabindex="-1"><div class="install-logo">↗</div><h2 id="install-title">'+(english?'Add to Home Screen':'ホーム画面に追加する')+'</h2><p>'+copy+'</p><div class="install-actions">'+(deferredInstall&&!ios()&&!isInstalled()?'<button class="btn primary" data-install-confirm>'+(english?'Install':'インストールする')+'</button>':'')+'<button class="btn" data-install-dismiss>'+(english?'Close':'閉じる')+'</button></div></div></div>';
 document.body.appendChild(div);
 const dismiss=()=>{div.remove();document.removeEventListener("keydown",onKey)};
 const onKey=e=>{if(e.key==="Escape")dismiss();if(e.key==="Tab"){const controls=[...div.querySelectorAll("button")];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
 document.addEventListener("keydown",onKey);
 div.addEventListener("click",async e=>{if(e.target.matches(".install-backdrop")||e.target.closest("[data-install-dismiss]")){dismiss();return}if(e.target.closest("[data-install-confirm]")&&deferredInstall){const prompt=deferredInstall;deferredInstall=null;try{await prompt.prompt();await prompt.userChoice}catch(e){console.warn("Install prompt:",e)}dismiss()}});
 div.querySelector("button")?.focus();
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e});
window.addEventListener("appinstalled",()=>{deferredInstall=null});
document.addEventListener("click",e=>{if(e.target.closest("[data-install-app]")){e.preventDefault();showInstall()}});
const PAGE_RELEASE=new URL(document.querySelector('script[src*="pwa.js?v="]')?.src||location.href).searchParams.get("v");
let updateNoticeDismissed=false;
function showAppUpdateNotice(){
 if(updateNoticeDismissed)return;
 if(document.getElementById("app-update-notice"))return;
 const banner=document.createElement("div");banner.id="app-update-notice";banner.setAttribute("role","status");
 banner.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));max-width:450px;margin:auto;background:#092e46;color:#f4fdff;border:1px solid #3bd5dc;border-radius:14px;box-shadow:0 10px 35px #001522bb;padding:12px 14px;display:flex;gap:12px;align-items:center;font:600 14px/1.5 system-ui,sans-serif";
 const label=document.createElement("span");label.textContent=document.documentElement.lang==='en'?"A new version is available. Save or finish any unsaved work before reloading.":"新しい版を利用できます。入力中の内容を確認してから更新してください。";label.style.flex="1";
 const refresh=document.createElement("button");refresh.type="button";refresh.textContent=document.documentElement.lang==='en'?"Reload":"更新する";
 refresh.style.cssText="border:0;border-radius:9px;background:#17c6d1;color:#06233a;padding:9px 12px;font:700 14px system-ui,sans-serif";
 refresh.addEventListener("click",()=>location.reload());
 const dismiss=document.createElement("button");dismiss.type="button";dismiss.textContent=document.documentElement.lang==='en'?"Later":"後で";
 dismiss.style.cssText="border:0;background:transparent;color:#c8ebf2;padding:7px;font:600 13px system-ui,sans-serif";
 dismiss.addEventListener("click",()=>{updateNoticeDismissed=true;banner.remove()});
 banner.append(label,refresh,dismiss);document.body.append(banner);
}
// The installed Home Screen app can stay in memory while the screen is locked.
// Check on launch AND when returning to the foreground, without reloading automatically.
// A release handshake also finds a stale page after the new worker activated unseen.
const MIN_UPDATE_CHECK_MS=60000;
async function workerRelease(worker){
 if(!worker||typeof MessageChannel!=="function")return null;
 return new Promise(resolve=>{
  const channel=new MessageChannel();
  let settled=false;
  const finish=release=>{
   if(settled)return;
   settled=true;clearTimeout(timeout);
   try{channel.port1.close();channel.port2.close()}catch{}
   resolve(release);
  };
  const timeout=setTimeout(()=>finish(null),1400);
  channel.port1.onmessage=event=>{
   const data=event.data;
   finish(data?.type==="RUNLOAD_RELEASE"&&typeof data.release==="string"?data.release:null);
  };
  try{worker.postMessage({type:"RUNLOAD_GET_RELEASE"},[channel.port2])}
  catch{finish(null)}
 });
}
async function inspectWorkerRelease(worker){
 const observed=await workerRelease(worker);
 // Only a confirmed different release may request a reload.
 if(observed&&PAGE_RELEASE&&observed!==PAGE_RELEASE)showAppUpdateNotice();
}
async function inspectCurrentRelease(){
 await inspectWorkerRelease(navigator.serviceWorker.controller);
}
// HTTPS Pages and trustworthy localhost/127.0.0.1 HTTP can register; ordinary HTTP cannot.
if("serviceWorker" in navigator&&window.isSecureContext&&/^https?:$/.test(location.protocol)){
 let registration=null;
 let started=false;
 let priorRegistration=false;
 let lastChecked=0;
 let pendingCheck=null;
 const observeInstalling=worker=>{
  if(!worker)return;
  const inspectState=()=>{
   if(worker.state==="installed"&&(priorRegistration||navigator.serviceWorker.controller)){
    void inspectWorkerRelease(worker);
   }
  };
  worker.addEventListener("statechange",inspectState);
  inspectState();
 };
 navigator.serviceWorker.addEventListener("controllerchange",()=>{
  void inspectCurrentRelease();
 });
 async function checkForUpdates(force=false){
  if(!registration)return;
  if(pendingCheck)return pendingCheck;
  const now=Date.now();
  if(!force&&now-lastChecked<MIN_UPDATE_CHECK_MS){
   await inspectCurrentRelease();
   return;
  }
  if(navigator.onLine===false){
   await inspectCurrentRelease();
   return;
  }
  lastChecked=now;
  pendingCheck=(async()=>{
   try{await registration.update()}
   catch(error){console.warn("Offline cache update:",error)}
   if(registration.waiting&&(priorRegistration||navigator.serviceWorker.controller)){
    await inspectWorkerRelease(registration.waiting);
   }
   await inspectCurrentRelease();
  })().finally(()=>{pendingCheck=null});
  return pendingCheck;
 }
 async function registerAfterReady(){
  if(started)return;
  started=true;
  try{
   priorRegistration=Boolean(await navigator.serviceWorker.getRegistration("./"))||
    Boolean(navigator.serviceWorker.controller);
   registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
   registration.addEventListener("updatefound",()=>observeInstalling(registration.installing));
   observeInstalling(registration.installing);
   if(registration.waiting&&priorRegistration)await inspectWorkerRelease(registration.waiting);
   await checkForUpdates(true);
  }catch(error){console.warn("Offline cache:",error)}
 }
 window.addEventListener("load",()=>{
  // A failed/stuck boot must not permanently block recovery of an old PWA.
  if(!window.appBoot||window.appBoot.isReady)void registerAfterReady();
  else{
   window.addEventListener("app:boot-ready",()=>void registerAfterReady(),{once:true});
   setTimeout(()=>void registerAfterReady(),8000);
  }
 });
 document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible")void checkForUpdates();
 });
 window.addEventListener("pageshow",()=>void checkForUpdates());
 window.addEventListener("focus",()=>void checkForUpdates());
}
