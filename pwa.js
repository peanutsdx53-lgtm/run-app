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
function showAppUpdateNotice(){
 if(document.getElementById("runload-update-notice"))return;
 const banner=document.createElement("div");banner.id="runload-update-notice";banner.setAttribute("role","status");
 banner.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));max-width:450px;margin:auto;background:#092e46;color:#f4fdff;border:1px solid #3bd5dc;border-radius:14px;box-shadow:0 10px 35px #001522bb;padding:12px 14px;display:flex;gap:12px;align-items:center;font:600 14px/1.5 system-ui,sans-serif";
 const label=document.createElement("span");label.textContent=document.documentElement.lang==='en'?"An app update is available.":"画面が更新されました。";label.style.flex="1";
 const refresh=document.createElement("button");refresh.type="button";refresh.textContent=document.documentElement.lang==='en'?"Reload":"更新する";
 refresh.style.cssText="border:0;border-radius:9px;background:#17c6d1;color:#06233a;padding:9px 12px;font:700 14px system-ui,sans-serif";
 refresh.addEventListener("click",()=>location.reload());
 const dismiss=document.createElement("button");dismiss.type="button";dismiss.textContent=document.documentElement.lang==='en'?"Later":"後で";
 dismiss.style.cssText="border:0;background:transparent;color:#c8ebf2;padding:7px;font:600 13px system-ui,sans-serif";
 dismiss.addEventListener("click",()=>banner.remove());
 banner.append(label,refresh,dismiss);document.body.append(banner);
}
// HTTPS Pages and trustworthy localhost/127.0.0.1 HTTP can register; ordinary HTTP cannot.
if("serviceWorker" in navigator&&window.isSecureContext&&/^https?:$/.test(location.protocol)){
 window.addEventListener("load",()=>{
  const registerAfterReady=async()=>{
  const wasControlled=Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(wasControlled)showAppUpdateNotice()});
  try{
   const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
   registration.addEventListener("updatefound",()=>{
    const installing=registration.installing;
    installing?.addEventListener("statechange",()=>{
     if(installing.state==="installed"&&wasControlled)showAppUpdateNotice();
    });
   });
   await registration.update();
  }catch(e){console.warn("Offline cache:",e)}
  };
  // Do not fetch the large offline precache while the opening screen is still
  // loading its first view. Installed service workers continue to serve requests.
  if(!window.runloadBoot||window.runloadBoot.isReady)void registerAfterReady();
  else window.addEventListener("runload:boot-ready",()=>{void registerAfterReady()},{once:true});
 });
}
