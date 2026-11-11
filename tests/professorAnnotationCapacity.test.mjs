/** M7 T-042 exact quota predicate + immutable run and real IDB failure evidence. */
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
 ANNOTATION_MAX_BYTES as BYTES,ANNOTATION_MAX_EVENTS as EVENTS,
 checkAnnotationCapacity
} from '../ui/annotationSchema.js';

test('T-042 maximum event count and 24MiB exact/over boundary',()=>{
 const before={eventCount:EVENTS-1,totalBytes:BYTES-500};
 assert.deepEqual(checkAnnotationCapacity(before,500),{ok:true},'exactly 24MiB may commit if event count permits');
 assert.deepEqual(checkAnnotationCapacity(before,501),{ok:false,code:'QUOTA'},'1 byte beyond 24MiB is refused');
 assert.deepEqual(checkAnnotationCapacity({eventCount:EVENTS,totalBytes:0},1),
  {ok:false,code:'QUOTA'},'the 10001st event is forbidden');
 assert.deepEqual(checkAnnotationCapacity({eventCount:EVENTS-1,totalBytes:0},1),
  {ok:true},'the 10000th event is allowed');
 assert.deepEqual(before,{eventCount:EVENTS-1,totalBytes:BYTES-500},
  'quota predicate never mutates source meta');
});
