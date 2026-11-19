import test from 'node:test';
import assert from 'node:assert/strict';
import {renderGpsNotes,readPrivateGpsRunNotes} from '../ui/gpsReflectionScreen.js';
const id='gps-v2-00112233-4455-6677-8899-aabbccddeeff';
test('G4-D private note remains closed by default',()=>{
 const x=renderGpsNotes({recordId:id});assert.match(x,/data-gps-n-open/);assert.doesNotMatch(x,/data-gps-n-text/);
});
test('G4-D rejects invalid source without database',async()=>{
 assert.equal(renderGpsNotes({recordId:'run-v1-invalid'}),'');
 assert.equal((await readPrivateGpsRunNotes('run-v1-invalid')).code,'BAD_REF');
});
test('G4-D current text is escaped and editable only after explicit open',()=>{
 const x=renderGpsNotes({recordId:id,selectedId:'gps-refnote-abcdefgh',loaded:{ok:true,deletedCount:1,notes:[
 {noteId:'gps-refnote-abcdefgh',text:'<script>alert(1)</script>',revision:1,lastEventId:'gps-refevent-abcdefgh'}]}});
 assert.match(x,/&lt;script&gt;/);assert.doesNotMatch(x,/<script>alert/);
 assert.match(x,/data-gps-n-save/);assert.match(x,/data-gps-n-delete/);
});
