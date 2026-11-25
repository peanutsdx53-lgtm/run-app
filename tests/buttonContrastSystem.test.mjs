import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const asRGB=hex=>{const v=hex.replace('#','');assert.match(v,/^[0-9a-f]{6}$/i);return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16));};
const luma=rgb=>rgb.map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const x=luma(asRGB(a)),y=luma(asRGB(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('Bright action text uses dark ink with normal text contrast >= 4.5:1',()=>{
 const style=read('ui/buttonContrastSystem.css');
 const vars=Object.fromEntries([...style.matchAll(/--(rl-button-[a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map(x=>[x[1],x[2]]));
 assert.equal(vars['rl-button-bright'],'#39cfd0');
 assert.equal(vars['rl-button-bright-text'],'#052939');
 assert.ok(ratio(vars['rl-button-bright'],vars['rl-button-bright-text'])>=7.5,'strong contrast for all text sizes');
 assert.ok(ratio('#155566','#e5f7fa')>=7,'dark neutral buttons retain high-contrast light text');
 assert.doesNotMatch(style,/(?:^|\n)\s*button\s*\{\s*color:/,'do not override all buttons blindly');
 for(const selector of [
  '.record-v3 .rv-choice.is-selected','.record-v3 .rv-main-button',
  '.rv4-tabs button[aria-selected="true"]','.gait-v4 .g4-choice button[aria-pressed="true"]',
  '.gps-v2-tabs>button[aria-pressed="true"]','.cp-button.primary',
  '.rr-page .rr-foot-actions .rr-save:not(:disabled)',
  '.home-v3 .dashboard-edit-toolbar .btn.primary'
 ])assert.ok(style.includes(selector),'missing targeted role: '+selector);
});
test('Result shadow root has matching semantic button colors and no unrelated scientific changes',()=>{
 const result=read('ui/resultExperience.js');
 assert.ok(result.includes('RESULT_BUTTON_CONTRAST_STYLES'));
 assert.ok(result.includes("RESULT_BUTTON_CONTRAST_STYLES+RESULT_BODY_LAYOUT_STYLES+RESULT_REFLECTION_ENTRY_STYLES+RESULT_HELP_RIGHT_STYLES+RESULT_T01_READABILITY_STYLES"));
 for(const term of ['.rv4-view-tabs button.active','.rv4-mobile-tabs button.active',
  '.rv4-actions [data-download]','.rv4-question-continuation button'])
 assert.ok(result.includes(term),'missing result-side button '+term);
});
test('PWA loads the new semantic button stylesheet before iOS input safeguards and caches its exact URL',()=>{
 const html=read('index.html'),sw=read('sw.js');
 const a='ui/buttonContrastSystem.css?v=20261122-gait-learning-type-v1';
 assert.ok(html.includes(a));
 assert.ok(html.indexOf(a)<html.indexOf('mobileInputFocus.css'),'preserve iOS input CSS last');
 assert.ok(sw.includes(a)&&sw.includes('ui/buttonContrastSystem.css'));
 assert.ok(sw.includes('runload-ui-next-shell-20261125-ux16-19-batch-v1'));
 assert.ok(html.includes('app.js?v=20261125-ux16-19-batch-v1'));
 assert.ok(sw.includes('resultExperience.js?v=20261123-ux11-result-source-v1'));
});
