/** M2 internal-only append-only annotations. No UI or backup integration until M3. */
import {normalizeRecordRef,resolveRecord} from './recordRef.js';
import {ANNOTATION_MAX_EVENTS,ANNOTATION_MAX_BYTES,ANNOTATION_MAX_EVENT_BYTES,
 annotationUtf8Bytes,recordKeyOf,streamKeyOf,validateAppendRequest,validateAnnotationEvent,
 digestAnnotationInput,checkAnnotationCapacity} from './annotationSchema.js';
export const ANNOTATION_DB='runload-v2-annotations-v1';
export const ANNOTATION_DB_VERSION=1;
const fail=(code,reason)=>({ok:false,code,reason});
const ok=value=>({ok:true,value});
const request=req=>new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error||Error('IndexedDB request rejected'));});
const finished=tx=>new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onabort=()=>rej(tx.error||Error('transaction aborted'));tx.onerror=()=>rej(tx.error||Error('transaction rejected'));});
const rootMeta=()=>({key:'root',schemaVersion:1,storeRevision:0,eventCount:0,totalBytes:0});
const validMeta=m=>m&&m.key==='root'&&m.schemaVersion===1&&
 Number.isSafeInteger(m.storeRevision)&&m.storeRevision>=0&&
 Number.isSafeInteger(m.eventCount)&&m.eventCount>=0&&m.eventCount<=ANNOTATION_MAX_EVENTS&&
 Number.isSafeInteger(m.totalBytes)&&m.totalBytes>=0&&m.totalBytes<=ANNOTATION_MAX_BYTES;
const validHead=h=>h&&typeof h.streamKey==='string'&&typeof h.headEventId==='string'&&
 Number.isSafeInteger(h.sequence)&&h.sequence>0&&h.sequence<=ANNOTATION_MAX_EVENTS&&
 Number.isSafeInteger(h.revision)&&h.revision===h.sequence;
const keyRange=(stream)=>IDBKeyRange.bound([stream,1],[stream,ANNOTATION_MAX_EVENTS]);
function quota(e){return e?.name==='QuotaExceededError'||e?.message?.includes('QuotaExceededError');}
function issue(e){return fail(quota(e)?'QUOTA':'READ_FAILED','追記の保存領域を安全に読み取れません');}
const baseParent=resolveRecord;
async function parentOf(ref,resolver){
 try{
  const r=await resolver(ref);
  if(r?.ok===true&&r.value?.record?.id===ref.recordId&&r.value.ref?.sourceType===ref.sourceType&&r.value.ref?.recordId===ref.recordId)
   return ok(r.value.record);
  return fail(r?.code==='NOT_FOUND'?'NOT_FOUND':'UNREADABLE_PARENT','指定した走行の原本を確認できません');
 }catch{return fail('UNREADABLE_PARENT','原本の照合に失敗しました');}
}
export async function openAnnotationStore(){
 if(typeof globalThis.indexedDB?.open!=='function')return fail('READ_FAILED','IndexedDBを利用できません');
 try{
  const db=await new Promise((res,rej)=>{
   const req=indexedDB.open(ANNOTATION_DB,ANNOTATION_DB_VERSION);
   req.onupgradeneeded=()=>{
    const db=req.result;
    const es=db.createObjectStore('events',{keyPath:'eventId'});
    es.createIndex('byRequestId','clientRequestId',{unique:true});
    es.createIndex('byRecordKey','recordKey');
    es.createIndex('byStreamSequence',['streamKey','sequence'],{unique:true});
    db.createObjectStore('heads',{keyPath:'streamKey'});
    db.createObjectStore('meta',{keyPath:'key'}).add(rootMeta());
   };
   req.onsuccess=()=>res(req.result);
   req.onerror=()=>rej(req.error||Error('open rejected'));
   req.onblocked=()=>rej(Error('database upgrade blocked'));
  });
  db.onversionchange=()=>db.close();
  return ok({db});
 }catch{return fail('READ_FAILED','追記用の保存領域を開けませんでした');}
}
/** Review one stream without ever replacing missing / corrupted values with empty state. */
export async function readAnnotationThread(db,ref,fieldKey){
 const nr=normalizeRecordRef(ref);if(!nr.ok)return nr;
 if(typeof fieldKey!=='string'||!['mentalExperience','bodyObservation','shoeName','environmentNote','memo','courseName','temperatureC','stepsBundle','gradeBundle','surfaceBundle','runWalkBundle','rofBefore','rofAfter'].includes(fieldKey))
  return fail('BAD_FIELD','未知の追記項目です');
 if(nr.value.sourceType==='MANUAL'&&['rofBefore','rofAfter'].includes(fieldKey))return fail('BAD_FIELD','手入力ROFは別の訂正記録です');
 try{
  const tx=db.transaction(['events','heads','meta'],'readonly'),done=finished(tx);
  const stream=streamKeyOf(nr.value,fieldKey);
  const heads=tx.objectStore('heads'),events=tx.objectStore('events');
  const [meta,head,rows]=await Promise.all([request(tx.objectStore('meta').get('root')),
   request(heads.get(stream)),request(events.index('byStreamSequence').getAll(keyRange(stream)))]);
  await done;
  if(!validMeta(meta)||!Array.isArray(rows)||rows.length>ANNOTATION_MAX_EVENTS)
   return fail('READ_FAILED','追記保存領域の版または件数が不正です');
  if(!head)return rows.length?fail('READ_FAILED','追記の先頭が不明です'):ok([]);
  if(!validHead(head)||head.streamKey!==stream||rows.length!==head.sequence)
   return fail('READ_FAILED','追記の履歴に欠落があります');
  const seen=new Set();let predecessor=null;
  for(const [i,e] of rows.entries()){
   if(!validateAnnotationEvent(e).ok||e.recordKey!==recordKeyOf(nr.value)||e.streamKey!==stream||
    e.fieldKey!==fieldKey||e.sequence!==i+1||e.predecessorEventId!==predecessor||seen.has(e.eventId))
    return fail('READ_FAILED','追記の履歴に形式不良・混線があります');
   if(i===0&&e.operation!=='ADD'||i>0&&(rows[i-1].operation==='RETRACT'?e.operation!=='ADD':e.operation==='ADD'))
    return fail('READ_FAILED','追記の操作履歴が正しくありません');
   if(await digestAnnotationInput({...e,expectedHeadEventId:e.predecessorEventId})!==e.requestDigest)
    return fail('READ_FAILED','追記の内容検証に失敗しました');
   seen.add(e.eventId);predecessor=e.eventId;
  }
  return rows.at(-1).eventId===head.headEventId?ok(rows):fail('READ_FAILED','追記の最新値を確定できません');
 }catch(e){return issue(e);}
}
/** Append one event and head/meta atomically. Never touch manual, GPS or old notes stores. */
export async function appendAnnotation(db,input,resolveParent=baseParent){
 const nr=normalizeRecordRef(input?.recordRef);if(!nr.ok)return nr;
 const parent=await parentOf(nr.value,resolveParent);if(!parent.ok)return parent;
 const checked=validateAppendRequest(input,{record:parent.value});if(!checked.ok)return checked;
 // A corrupt previous chain is not a new stream. Verify it before opening a write transaction.
 const currentChain=await readAnnotationThread(db,nr.value,input.fieldKey);if(!currentChain.ok)return currentChain;
 let digest;
 try{digest=await digestAnnotationInput(input);}catch{return fail('BAD_EVENT','要求内容のハッシュ検証を実行できません');}
 let tx;
 try{
  tx=db.transaction(['events','heads','meta'],'readwrite');const done=finished(tx);
  const es=tx.objectStore('events'),hs=tx.objectStore('heads'),ms=tx.objectStore('meta');
  const prev=await request(es.index('byRequestId').get(input.clientRequestId));
  if(prev){
   const valid=validateAnnotationEvent(prev,{record:parent.value});
   const match=valid.ok&&prev.requestDigest===digest&&prev.eventId===input.eventId;
   // IDB transaction with no writes finishes normally; it never mutates duplicate events.
   await done;
   return match?ok({event:prev,duplicate:true}):fail('REQUEST_CONFLICT','同じ操作IDに異なる内容が保存されています');
  }
  const [meta,head,eventExists]=await Promise.all([request(ms.get('root')),
   request(hs.get(streamKeyOf(nr.value,input.fieldKey))),request(es.get(input.eventId))]);
  if(!validMeta(meta)){
   tx.abort();await done.catch(()=>{});return fail('READ_FAILED','追記の保存元情報が不正です');
  }
  if(eventExists){tx.abort();await done.catch(()=>{});return fail('REQUEST_CONFLICT','イベントIDが既に使われています');}
  const currentHead=head?.headEventId??null,revision=head?.revision??0;
  if(head&&!validHead(head)){
   tx.abort();await done.catch(()=>{});return fail('READ_FAILED','追記履歴の最新情報が不正です');
  }
  if(currentHead!==input.expectedHeadEventId||revision!==input.expectedRevision){
   tx.abort();await done.catch(()=>{});return fail('HEAD_CONFLICT','別の操作で同じ項目が更新されました');
  }
  let oldEvent=null;
  if(head){
   oldEvent=await request(es.get(head.headEventId));
   if(!oldEvent||!validateAnnotationEvent(oldEvent,{record:parent.value}).ok||
    oldEvent.streamKey!==streamKeyOf(nr.value,input.fieldKey)||oldEvent.sequence!==head.sequence){
    tx.abort();await done.catch(()=>{});return fail('READ_FAILED','直前の追記履歴が確認できません');
   }
  }else{
   // Detect a broken head index (events present but head absent); do not overwrite.
   if(await request(es.index('byStreamSequence').count(keyRange(streamKeyOf(nr.value,input.fieldKey))))!==0){
    tx.abort();await done.catch(()=>{});return fail('READ_FAILED','保存履歴の先頭が見つかりません');
   }
  }
  const allowed=head?(oldEvent.operation==='RETRACT'?input.operation==='ADD':['CORRECT','RETRACT'].includes(input.operation)):input.operation==='ADD';
  if(!allowed){tx.abort();await done.catch(()=>{});return fail('BAD_EVENT','追記・訂正・撤回の順序が正しくありません');}
  const event={schemaVersion:1,eventId:input.eventId,clientRequestId:input.clientRequestId,requestDigest:digest,
   recordRef:nr.value,recordKey:recordKeyOf(nr.value),streamKey:streamKeyOf(nr.value,input.fieldKey),
   fieldKey:input.fieldKey,threadId:'primary',operation:input.operation,predecessorEventId:currentHead,
   sequence:revision+1,payload:input.payload,declaredPhase:input.declaredPhase,timeBasis:input.timeBasis,
   assessedAt:input.assessedAt,enteredAt:input.enteredAt,savedAt:new Date().toISOString(),dictionaryVersion:1};
  const valid=validateAnnotationEvent(event,{record:parent.value});const byteCount=annotationUtf8Bytes(JSON.stringify(event));
  if(!valid.ok||byteCount>ANNOTATION_MAX_EVENT_BYTES){
   tx.abort();await done.catch(()=>{});return fail('BAD_EVENT','追記が形式または大きさの制限を超えています');
  }
  if(!checkAnnotationCapacity(meta,byteCount).ok){
   tx.abort();await done.catch(()=>{});return fail('QUOTA','追記の件数・容量の上限です');
  }
  es.add(event);
  hs.put({streamKey:event.streamKey,headEventId:event.eventId,sequence:event.sequence,revision:event.sequence});
  ms.put({key:'root',schemaVersion:1,storeRevision:meta.storeRevision+1,
   eventCount:meta.eventCount+1,totalBytes:meta.totalBytes+byteCount});
  await done; // Only commit completion can authorize success.
  const after=await parentOf(nr.value,resolveParent);
  if(!after.ok)return {...fail(after.code==='NOT_FOUND'?'ORPHANED':'UNREADABLE_PARENT',
   '追記は保存されましたが走行の原本を再確認できません。新しい記録へ自動接続しません'),eventCommitted:true,event};
  return ok({event,duplicate:false});
 }catch(e){
  try{tx?.abort();}catch{}
  return fail(quota(e)?'QUOTA':'WRITE_FAILED','追記の保存を確認できません。操作IDで再読込してから再試行してください');
 }
}

/** Internal readback for ambiguous commits, without writing or inventing a new ID. */
export async function findAnnotationByRequestId(db,requestId){
 if(typeof requestId!=='string'||requestId.length<8||requestId.length>96)return fail('BAD_EVENT','操作IDが不正です');
 try{
  const tx=db.transaction('events','readonly'),done=finished(tx);
  const event=await request(tx.objectStore('events').index('byRequestId').get(requestId));await done;
  if(event&&!validateAnnotationEvent(event).ok)return fail('READ_FAILED','操作IDの履歴が壊れています');
  return ok(event||null);
 }catch(e){return issue(e);}
}

export async function inspectAnnotationStore(db){
 try{
  const tx=db.transaction(['events','heads','meta'],'readonly'),done=finished(tx);
  const [events,heads,meta]=await Promise.all([request(tx.objectStore('events').getAll()),
   request(tx.objectStore('heads').getAll()),request(tx.objectStore('meta').get('root'))]);await done;
  if(!validMeta(meta)||meta.eventCount!==events.length||meta.totalBytes!==events.reduce((n,e)=>n+annotationUtf8Bytes(JSON.stringify(e)),0)||
    meta.storeRevision!==meta.eventCount)return fail('READ_FAILED','追記の全件整合性を確認できません');
  const grouped=new Map(),ids=new Set(),requests=new Set();
  for(const e of events){
   if(!validateAnnotationEvent(e).ok||ids.has(e.eventId)||requests.has(e.clientRequestId))return fail('READ_FAILED','追記の重複・型不正');
   if(await digestAnnotationInput({...e,expectedHeadEventId:e.predecessorEventId})!==e.requestDigest)
    return fail('READ_FAILED','追記の内容ハッシュが不一致です');
   ids.add(e.eventId);requests.add(e.clientRequestId);
   if(!grouped.has(e.streamKey))grouped.set(e.streamKey,[]);
   grouped.get(e.streamKey).push(e);
  }
  if(heads.length!==grouped.size)return fail('READ_FAILED','追記の先頭一覧が一致しません');
  for(const h of heads){
   const rows=grouped.get(h.streamKey);
   if(!validHead(h)||!rows||rows.length!==h.sequence)return fail('READ_FAILED','追記系列が欠損しています');
   rows.sort((a,b)=>a.sequence-b.sequence);
   for(let i=0;i<rows.length;i++){
    const e=rows[i];if(e.sequence!==i+1||e.predecessorEventId!==(rows[i-1]?.eventId??null)||
     (i===0&&e.operation!=='ADD')||
     (i>0&&(rows[i-1].operation==='RETRACT'?e.operation!=='ADD':e.operation==='ADD')))
     return fail('READ_FAILED','追記履歴の連鎖が壊れています');
   }
   if(rows.at(-1).eventId!==h.headEventId)return fail('READ_FAILED','最新の追記を特定できません');
  }
  return ok({eventCount:events.length,byteCount:meta.totalBytes,streamCount:heads.length,orphans:null});
 }catch(e){return issue(e);}
}

/** Non-mutating orphan classification. No automatic relinking to same-date records. */
export async function quarantineMissingParents(db,resolveParent=baseParent){
 const integrity=await inspectAnnotationStore(db);if(!integrity.ok)return integrity;
 try{
  const tx=db.transaction('events','readonly'),done=finished(tx),events=await request(tx.objectStore('events').getAll());await done;
  const parents=new Map();for(const e of events){
   if(!parents.has(e.recordKey))parents.set(e.recordKey,e.recordRef);
  }
  const orphanKeys=[];
  for(const [key,ref] of parents){
   const parent=await parentOf(ref,resolveParent);
   if(parent.code==='NOT_FOUND')orphanKeys.push(key);
   else if(!parent.ok)return fail('UNREADABLE_PARENT','親記録を読み取れないため隔離状態を確定できません');
  }
  return ok({count:orphanKeys.length,recordKeys:orphanKeys,inspectionOnly:true});
 }catch(e){return issue(e);}
}
