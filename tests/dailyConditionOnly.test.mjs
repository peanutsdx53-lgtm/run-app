import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {POST_HOC_FIELDS,parsePostHocPayload} from '../ui/annotationEditorCore.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('retired run-linked response is removed from current UI and precache, not merely hidden',()=>{
 for(const file of ['ui/mentalExperience.js','ui/mentalExperience.css','ui/mentalSaveFlow.js','ui/explorationMentalInquiry.js'])assert.equal(existsSync(new URL('../'+file,import.meta.url)),false,file);
 for(const path of ['app.js','index.html','sw.js','ui/resultExperience.js','ui/recordReviewExperience.js','ui/measurementExperience.js','ui/bodyContextExperience.js','ui/explorationExperience.js'])assert.doesNotMatch(read(path),/mentalExperience\.js|mentalExperience\.css|mentalSaveFlow|explorationMentalInquiry|data-review-mental|data-mental-result|data-e-mental-inquiry/);
 assert.equal(POST_HOC_FIELDS.includes('mentalExperience'),false);
 assert.equal(parsePostHocPayload('mentalExperience',{answer:'FELT'},{}).ok,false);
});
