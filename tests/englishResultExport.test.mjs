import test from 'node:test';
import assert from 'node:assert/strict';
import {resultImageAnnotation} from '../ui/resultExperience.js';
import {resultExportDisclosure} from '../ui/resultSharingPolicy.js';
import {englishResultImageCopy,englishResultImageAnnotation,englishResultImageDisclosure} from '../ui/englishResultExport.js';
test('English PNG preserves scientific ineligibility, distinct zero and missing, and opt-in privacy',()=>{
 assert.deepEqual(englishResultImageAnnotation(resultImageAnnotation({saved:true,reference:{count:12}})),{status:'Study References: 12/12 Regions Calculated',detail:'Each region uses its own study reference of 100.'});
 assert.match(englishResultImageAnnotation(resultImageAnnotation({saved:true,reference:{count:0,reason:'MIXED_GAIT_NOT_QUANTIFIED'}})).detail,/not converted into one reference value/);
 assert.throws(()=>englishResultImageAnnotation({status:'unrecognized',detail:'unknown'}),/Unsupported/);
 const hidden=englishResultImageCopy({evidence:resultImageAnnotation({saved:true,reference:{count:9}}),disclosure:resultExportDisclosure({before:0,after:null}),saved:true});
 assert.match(hidden.rofText,/Omitted/);
 assert.match(hidden.dateText,/Omitted/);
 assert.doesNotMatch(JSON.stringify(hidden),/2026-11-11|Before 0|After Unanswered/);
 const shown=englishResultImageDisclosure(resultExportDisclosure({date:'2026-11-11',before:0,after:null,includeRof:true,includeDate:true}));
 assert.equal(shown.rofText,'ROF-J (Self-Report): Before 0 / After Unanswered');
 assert.equal(shown.dateText,'2026-11-11');
 assert.equal(shown.includeRof,true);
});
