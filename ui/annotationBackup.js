/** Professor M3: portable annotation snapshots and transactional import.
 * v1 backup inside portable-v2; no new user-facing annotation input until M4.
 * No cross-database atomicity is promised (manual, GPS and annotation have separate stores).
 */
import {openAnnotationStore,inspectAnnotationStore} from './annotationStore.js';
import {ANNOTATION_MAX_BYTES,ANNOTATION_MAX_EVENTS,ANNOTATION_MAX_EVENT_BYTES,
 annotationUtf8Bytes,validateAnnotationEvent,digestAnnotationInput} from './annotationSchema.js';
import {normalizeRecordRef} from './recordRef.js';
export const ANNOTATION_BACKUP_FORMAT='runload-v2-annotation-backup';
export const ANNOTATION_BACKUP_VERSION=1;
const fail=(code,reason)=>({ok:false,code,reason});
const ok=value=>({ok:true,value});
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const strict=(x,fields)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===fields.length&&fields.every(k=>own(x,k));
const get=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IndexedDB request failed'));});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('transaction error'));tx.onabort=()=>reject(tx.error||Error('transaction aborted'));});
const root=(events)=>({key:'root',schemaVersion:1,storeRevision:events.length,eventCount:events.length,totalBytes:events.reduce((n,e)=>n+annotationUtf8Bytes(JSON.stringify(e)),0)});
const sorted=rows=>rows.slice().sort((a,b)=>a.streamKey.localeCompare(b.streamKey)||a.sequence-b.sequence);
function makeBundle(events){
 const rows=sorted(events),heads=[];
 for(const event of rows){
  const prev=heads.at(-1);
  if(prev?.streamKey===event.streamKey){
   prev.headEventId=event.eventId;prev.sequence=event.sequence;prev.revision=event.sequence;
  }else heads.push({streamKey:event.streamKey,headEventId:event.eventId,sequence:event.sequence,revision:event.sequence});
 }
 return {format:ANNOTATION_BACKUP_FORMAT,version:ANNOTATION_BACKUP_VERSION,events:rows,heads,meta:root(rows)};
}
/** Pure structural + cryptographic validation, strict semantics and history ordering. */
export function inspectAnnotationBundleShape(bundle){
 if(!strict(bundle,['format','version','events','heads','meta'])||bundle.format!==ANNOTATION_BACKUP_FORMAT||
  bundle.version!==ANNOTATION_BACKUP_VERSION||!Array.isArray(bundle.events)||!Array.isArray(bundle.heads)||
  bundle.events.length>ANNOTATION_MAX_EVENTS||bundle.heads.length>ANNOTATION_MAX_EVENTS||
  !strict(bundle.meta,['key','schemaVersion','storeRevision','eventCount','totalBytes']))
  return fail('BAD_VERSION','追記バックアップ形式・版を確認できません');
 const {events,heads,meta}=bundle;
 if(meta.key!=='root'||meta.schemaVersion!==1||meta.eventCount!==events.length||meta.storeRevision!==events.length||
  !Number.isSafeInteger(meta.totalBytes)||meta.totalBytes<0||meta.totalBytes>ANNOTATION_MAX_BYTES)
  return fail('BAD_EVENT','追記の管理情報が一致しません');
 let expectedBytes;try{expectedBytes=events.reduce((n,e)=>n+annotationUtf8Bytes(JSON.stringify(e)),0);}catch{return fail('BAD_EVENT','追記イベントを検証できません');}
 if(expectedBytes!==meta.totalBytes)return fail('BAD_EVENT','追記容量と実データが一致しません');
 const ids=new Set(),requests=new Set(),groups=new Map();
 for(const e of events){
  if(!validateAnnotationEvent(e).ok||ids.has(e.eventId)||requests.has(e.clientRequestId)||
   annotationUtf8Bytes(JSON.stringify(e))>ANNOTATION_MAX_EVENT_BYTES)
   return fail('BAD_EVENT','追記に不正な値・識別子重複があります');
  const nr=normalizeRecordRef(e.recordRef);if(!nr.ok)return nr;
  ids.add(e.eventId);requests.add(e.clientRequestId);
  if(!groups.has(e.streamKey))groups.set(e.streamKey,[]);
  groups.get(e.streamKey).push(e);
 }
 if(groups.size!==heads.length)return fail('BAD_EVENT','追記系列の件数が一致しません');
 const checkedHeads=new Set();
 for(const h of heads){
  if(!strict(h,['streamKey','headEventId','sequence','revision'])||checkedHeads.has(h.streamKey))
   return fail('BAD_EVENT','追記のhead形式が不正です');
  checkedHeads.add(h.streamKey);
  const rows=groups.get(h.streamKey);if(!rows||rows.length!==h.sequence||h.revision!==h.sequence)
   return fail('BAD_EVENT','追記の連続性が不正です');
  rows.sort((a,b)=>a.sequence-b.sequence);
  for(let i=0;i<rows.length;i++){
   const e=rows[i];if(e.sequence!==i+1||e.predecessorEventId!==(rows[i-1]?.eventId??null)||
    (i===0&&e.operation!=='ADD')||(i>0&&(rows[i-1].operation==='RETRACT'?e.operation!=='ADD':e.operation==='ADD')))
    return fail('BAD_EVENT','追記履歴の順序・撤回後の操作が不正です');
  }
  if(rows.at(-1).eventId!==h.headEventId)return fail('BAD_EVENT','追記headと履歴が不一致です');
 }
 return ok({eventCount:events.length,streamCount:heads.length,totalBytes:meta.totalBytes});
}
/** Full cryptographic verification required before export or import. */
export async function inspectAnnotationBundle(bundle){
 const shape=inspectAnnotationBundleShape(bundle);if(!shape.ok)return shape;
 for(const e of bundle.events){
  try{if(e.requestDigest!==await digestAnnotationInput({...e,expectedHeadEventId:e.predecessorEventId}))
   return fail('BAD_EVENT','追記のハッシュが一致しません');}
  catch{return fail('BAD_EVENT','追記内容のハッシュ検証に失敗しました');}
 }
 return shape;
}
/** No import/export will silently skip a corrupt store. */
export async function snapshotAnnotationStore(db){
 const integrity=await inspectAnnotationStore(db);
 if(!integrity.ok)return integrity;
 try{
  const tx=db.transaction(['events','heads','meta'],'readonly'),complete=done(tx);
  const [events,heads,meta]=await Promise.all([
   get(tx.objectStore('events').getAll()),get(tx.objectStore('heads').getAll()),get(tx.objectStore('meta').get('root'))]);
  await complete;
  const bundle={format:ANNOTATION_BACKUP_FORMAT,version:1,events:sorted(events),heads,meta};
  const result=await inspectAnnotationBundle(bundle);if(!result.ok)return result;
  if(result.value.eventCount!==integrity.value.eventCount||result.value.totalBytes!==integrity.value.byteCount)
   return fail('READ_FAILED','バックアップ中に追記が変更された可能性があります');
  return ok(bundle);
 }catch{return fail('READ_FAILED','追記データを安全に取り出せません');}
}
/** GPS is opt-in for privacy; exclude dependent annotations, never silently rewrite refs. */
export async function exportAnnotationBundle({includeGps=false,resolveParent=null}={}){
 const opened=await openAnnotationStore();if(!opened.ok)return opened;
 const db=opened.value.db;
 try{
  const snapshot=await snapshotAnnotationStore(db);if(!snapshot.ok)return snapshot;
  const selected=includeGps?snapshot.value.events:snapshot.value.events.filter(e=>e.recordRef.sourceType==='MANUAL');
  if(resolveParent){
   const parents=new Map(selected.map(e=>[e.recordKey,e.recordRef]));
   for(const ref of parents.values()){
    let result;try{result=await resolveParent(ref);}catch{return fail('UNREADABLE_PARENT','親記録を確認できません');}
    if(result?.ok!==true||result.value?.record?.id!==ref.recordId||result.value?.ref?.sourceType!==ref.sourceType)
     return fail(result?.code==='NOT_FOUND'?'ORPHANED':'UNREADABLE_PARENT','親記録が存在しない追記はバックアップできません');
   }
  }
  const bundle=makeBundle(selected),checked=await inspectAnnotationBundle(bundle);
  if(!checked.ok)return checked;
  return ok({bundle,excludedGpsEvents:snapshot.value.events.length-selected.length,storedEvents:snapshot.value.events.length});
 }finally{db.close();}
}
const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Streams must match an immutable prefix; no divergent or overwritten event is ever adopted. */
export function planAnnotationMerge(existing,incoming){
 const groups=(bundle)=>{const m=new Map();for(const e of bundle.events){
  if(!m.has(e.streamKey))m.set(e.streamKey,[]);m.get(e.streamKey).push(e);
 }return m;};
 const a=groups(existing),b=groups(incoming),merged=existing.events.slice(),knownIds=new Map(existing.events.map(e=>[e.eventId,e])),requests=new Map(existing.events.map(e=>[e.clientRequestId,e]));
 for(const [key,rows] of b){
  const prior=a.get(key)||[];
  rows.sort((x,y)=>x.sequence-y.sequence);
  for(let i=0;i<Math.min(prior.length,rows.length);i++)if(!identical(prior[i],rows[i]))
   return fail('REQUEST_CONFLICT','同じ走行項目の追記履歴が異なります');
  for(const e of rows.slice(prior.length)){
   if(knownIds.has(e.eventId)||requests.has(e.clientRequestId))
    return fail('REQUEST_CONFLICT','追記イベントまたは操作IDが既存データと衝突しています');
   knownIds.set(e.eventId,e);requests.set(e.clientRequestId,e);merged.push(e);
  }
 }
 const next=makeBundle(merged);
 if(next.meta.eventCount>ANNOTATION_MAX_EVENTS||next.meta.totalBytes>ANNOTATION_MAX_BYTES)
  return fail('QUOTA','追記データの容量上限です');
 return ok({bundle:next,added:merged.length-existing.events.length,expectedRoot:existing.meta});
}
/** Plan before writes, then recheck CAS inside one IndexedDB transaction. */
export async function preflightAnnotationImport(incoming,{resolveParent}={}){
 const validated=await inspectAnnotationBundle(incoming);if(!validated.ok)return validated;
 // Fail when parent does not exist. The caller may supply a resolver for parents
 // staged in the portable backup but not yet written into their respective DBs.
 if(typeof resolveParent!=='function')return fail('UNREADABLE_PARENT','親レコードの検証方法が指定されていません');
 const parents=new Map();for(const e of incoming.events)parents.set(e.recordKey,e.recordRef);
 for(const ref of parents.values()){
  let parent;try{parent=await resolveParent(ref);}catch{return fail('UNREADABLE_PARENT','親記録を照合できません');}
  if(parent?.ok!==true||parent.value?.record?.id!==ref.recordId||parent.value?.ref?.sourceType!==ref.sourceType)
   return fail(parent?.code==='NOT_FOUND'?'ORPHANED':'UNREADABLE_PARENT','追記の親レコードがありません');
  for(const e of incoming.events.filter(ev=>ev.recordKey===ref.sourceType+':'+ref.recordId))
   if(!validateAnnotationEvent(e,{record:parent.value.record}).ok)
    return fail('BAD_EVENT','親記録の条件と追記が一致しません');
 }
 const opened=await openAnnotationStore();if(!opened.ok)return opened;
 try{
  const existing=await snapshotAnnotationStore(opened.value.db);if(!existing.ok)return existing;
  const plan=planAnnotationMerge(existing.value,incoming);if(!plan.ok)return plan;
  const check=await inspectAnnotationBundle(plan.value.bundle);if(!check.ok)return check;
  return ok({added:plan.value.added,expectedRoot:existing.value.meta,existingEvents:existing.value.events.length,
   bundle:plan.value.bundle});
 }finally{opened.value.db.close();}
}
export async function importAnnotationBundle(incoming,{resolveParent}={}){
 const plan=await preflightAnnotationImport(incoming,{resolveParent});if(!plan.ok)return plan;
 if(plan.value.added===0)return ok({added:0,duplicate:true});
 const opened=await openAnnotationStore();if(!opened.ok)return opened;
 const db=opened.value.db;let tx;
 try{
  tx=db.transaction(['events','heads','meta'],'readwrite');const complete=done(tx);
  const es=tx.objectStore('events'),hs=tx.objectStore('heads'),ms=tx.objectStore('meta');
  const original=await get(ms.get('root'));
  if(!original||!identical(original,plan.value.expectedRoot)){
   tx.abort();await complete.catch(()=>{});return fail('HEAD_CONFLICT','復元中に別の追記が変更されました');
  }
  const events=plan.value.bundle.events;
  for(const e of events.slice().filter(e=>e.sequence>0)){
   // Preserving an existing stream prefix is safe; skip previously committed IDs.
   // Read in transaction to avoid overwriting a different event with the same id.
   const before=await get(es.get(e.eventId));
   if(before){if(!identical(before,e)){tx.abort();await complete.catch(()=>{});return fail('REQUEST_CONFLICT','追記ID衝突');}}
   else es.add(e);
  }
  for(const head of plan.value.bundle.heads)hs.put(head);
  ms.put(plan.value.bundle.meta);
  await complete;
  const after=await snapshotAnnotationStore(db);
  if(!after.ok||!identical(after.value.meta,plan.value.bundle.meta))
   return fail('PARTIAL_FAILURE','保存は完了した可能性がありますが再検証に失敗しました');
  return ok({added:plan.value.added,duplicate:false});
 }catch{
  try{tx?.abort();}catch{}
  return fail('WRITE_FAILED','追記の復元を完了できません。対象記録を再読込してください');
 }finally{db.close();}
}
/** Atomic deletion of all annotations; the other app stores are independently cleared. */
export async function clearAnnotationStore(){
 const opened=await openAnnotationStore();if(!opened.ok)return opened;
 const db=opened.value.db;let tx;
 try{
  tx=db.transaction(['events','heads','meta'],'readwrite');const complete=done(tx);
  tx.objectStore('events').clear();tx.objectStore('heads').clear();tx.objectStore('meta').put(root([]));
  await complete;return ok({cleared:true});
 }catch{try{tx?.abort();}catch{}return fail('WRITE_FAILED','追記の削除に失敗しました');}
 finally{db.close();}
}
