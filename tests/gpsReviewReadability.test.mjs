import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const view=readFileSync(new URL('../ui/measurementExperience.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../ui/measurementExperience.css',import.meta.url),'utf8');
test('GPS fatigue before/after lead with the perceived-fatigue heading and keep ROF-J secondary',()=>{
 for(const label of ['運動前','運動後']){
  assert.match(view,new RegExp('<strong>'+label+'の疲労感<\\/strong><small>任意・イラストで選択<\\/small><small class="gps-rof-term">ROF-J<\\/small>'));
  assert.doesNotMatch(view,new RegExp('<strong>'+label+'の疲労感<b'));
 }
 assert.match(css,/\.gps-v2 \.gps-rof-link \.gps-rof-term\{white-space:nowrap;font-size:\.68rem/);
});
test('GPS review save controls scale with text magnification while keeping responsive layouts',()=>{
 assert.match(css,/\.gps-review \.gps-live-actions>\*\{min-height:52px;font-size:clamp\(\.8rem,3vw,\.92rem\)/);
 assert.doesNotMatch(css,/\.gps-review \.gps-live-actions>\*\{min-height:50px;font-size:clamp\(11px/);
 assert.match(view,/data-gps-save-route/);
 assert.match(view,/data-gps-action="save"/);
});
