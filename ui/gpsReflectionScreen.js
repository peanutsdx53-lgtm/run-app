/** G4-D: GPS post-run private notes, read only after an explicit user action. */
import {GPS_V2_DB,GPS_V2_DB_VERSION,GPS_V2_SUMMARIES,GPS_V2_DETAILS,
 GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS,
 readGpsV2Summaries,validGpsV2Summary,validGpsV2Pair} from './gpsReplayIndexedDbStore.js';
import {inspectGpsPrivateBackupSnapshot} from './gpsReflectionBackupScope.js';
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validId=x=>typeof x==='string'&&/^gps-v2-[a-z0-9-]{8,64}$/.test(x);
const promiseRequest=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('READ'));});
const promiseTx=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('TX'));tx.onabort=()=>reject(tx.error||Error('ABORT'));});
/** The four stores are read as one generation, for only the requested GPS ID. */
export async function readPrivateGpsRunNotes(recordId){
 if(!validId(recordId))return {ok:false,code:'BAD_REF',reason:'保存済みGPSのIDが不正です'};
 const ready=await readGpsV2Summaries();
 if(!ready.ok)return {ok:false,code:'UNREADABLE_PARENT',reason:'GPS元記録を読み取れません'};
 let db;
 try{
  db=await new Promise((resolve,reject)=>{
   const req=globalThis.indexedDB.open(GPS_V2_DB,GPS_V2_DB_VERSION);
   req.onerror=()=>reject(req.error||Error('OPEN'));
   req.onupgradeneeded=()=>{req.transaction.abort();reject(Error('NO_UPGRADE'));};
   req.onsuccess=()=>resolve(req.result);
  });
  const names=[GPS_V2_SUMMARIES,GPS_V2_DETAILS,GPS_V2_REFLECTION_CONTENT,GPS_V2_REFLECTION_EVENTS];
  const tx=db.transaction(names,'readonly'),done=promiseTx(tx);
  const reqs=[
   tx.objectStore(GPS_V2_SUMMARIES).get(recordId),
   tx.objectStore(GPS_V2_DETAILS).get(recordId),
   tx.objectStore(GPS_V2_REFLECTION_CONTENT).index('byRecordId').getAll(recordId),
   tx.objectStore(GPS_V2_REFLECTION_EVENTS).index('byRecordId').getAll(recordId)
  ];
  const [summary,detail,contents,events]=await Promise.all(reqs.map(promiseRequest));
  await done;
  if(!validGpsV2Summary(summary)||summary.id!==recordId||
     (summary.detailSaved?!validGpsV2Pair(summary,detail):detail!==undefined))
   return {ok:false,code:'UNREADABLE_PARENT',reason:'選択した走行の元記録を確認できません'};
  const recordRef={sourceType:'GPS_V2',recordId};
  const v=inspectGpsPrivateBackupSnapshot({includeGps:true,includeGpsReflections:true},{
   parents:[recordRef],contents,events
  });
  if(!v.ok)return {ok:false,code:v.code,reason:'自由記述の改訂履歴に不整合があります'};
  const last=new Map();
  for(const e of v.bundle.events)last.set(e.noteId,e);
  const notes=v.bundle.contents.map(x=>({noteId:x.noteId,text:x.text,
   revision:last.get(x.noteId).revision,lastEventId:last.get(x.noteId).eventId}));
  return {ok:true,notes,deletedCount:last.size-notes.length};
 }catch{return {ok:false,code:'READ_UNKNOWN',reason:'自由記述を読み取れません'};}
 finally{try{db?.close();}catch{}}
}
const css='<style>.gps-reflect{margin:20px 0;padding:17px;border:1px solid #589ea9;border-radius:13px;background:#123747;color:#e8fcff;line-height:1.6}.gps-reflect h2{font-size:18px;margin:0}.gps-reflect p{font-size:13px}.gps-reflect button{min-height:44px;margin:3px;padding:9px 13px;border-radius:9px;border:1px solid #8ccbd1;color:white;background:#12576c}.gps-reflect textarea{box-sizing:border-box;width:100%;min-height:110px;padding:10px;border-radius:8px;font:inherit;color:#123;background:#fff}.gps-reflect label{display:block;margin-top:9px}.gps-reflect button:focus-visible,.gps-reflect textarea:focus-visible{outline:3px solid #b9f6e7}.gps-reflect .gps-n-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #456b7a}.gps-reflect .gps-n-row span{flex:1;overflow-wrap:anywhere}.gps-reflect [data-gps-n-delete]{background:#6a3838}@media(max-width:420px){.gps-reflect button{width:100%}}@media print{.gps-reflect{display:none!important}}</style>';
/** Does not read or display a private note before the user explicitly opens it. */
export function renderGpsNotes(ui){
 if(!validId(ui?.recordId))return '';
 const loaded=ui.loaded,busy=ui.busy===true;
 const selected=loaded?.ok?loaded.notes.find(n=>n.noteId===ui.selectedId):null;
 const button=(attr,title)=>'<button type="button" '+attr+(busy?' disabled':'')+'>'+title+'</button>';
 let body='';
 if(!loaded)body=button('data-gps-n-open','この走行の記述を開く');
 else if(!loaded.ok)body='<p role="alert">'+escapeHtml(loaded.reason)+'</p>'+button('data-gps-n-open','再読み取り');
 else{
  body='<p>現在の記述：'+loaded.notes.length+'件／削除済み：'+loaded.deletedCount+'件（本文なし）</p>';
  for(const n of loaded.notes)body+='<div class="gps-n-row"><span data-user-authored>'+escapeHtml(n.text.slice(0,80))+'</span>'+button('data-gps-n-select="'+escapeHtml(n.noteId)+'"','編集')+'</div>';
  body+=button('data-gps-n-new','新しい気づきを書く')+
   '<label for="gps-private-note-text">気づきや次回の問い（1〜500文字）</label>'+
   '<textarea id="gps-private-note-text" data-gps-n-text maxlength="500"'+(busy?' disabled':'')+'>'+escapeHtml(ui.draft??selected?.text??'')+'</textarea>'+
   button('data-gps-n-save',selected?'変更を保存':'記述を保存')+
   (selected?button('data-gps-n-delete','本文を削除'):'')+
   button('data-gps-n-close','閉じる');
 }
 return css+'<section class="gps-reflect" data-gps-reflect-id="'+escapeHtml(ui.recordId)+'" aria-label="GPS走行後の自由記述">'+
  '<h2>走行後の振り返り（任意）</h2><p>記録と自分の感覚を照らし合わせ、気づきや疑問を残せます。医学的診断ではありません。入力は任意です。</p>'+
  body+(ui.notice?'<p role="status">'+escapeHtml(ui.notice)+'</p>':'')+'</section>';
}
