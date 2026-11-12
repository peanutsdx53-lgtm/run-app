import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TERMS,PRIVACY,LEGAL_VERSION,legalDocumentMarkup,LEGAL_CONSENT_KEY,readLegalConsent} from '../ui/legalDocuments.js';
import {referenceImageUrl,ROF_J_ANCHORS} from '../ui/rofJScale.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const previous=/peanutsdx53-lgtm|runload-app-v2\/issues|raw\.githubusercontent\.com\/peanutsdx53-lgtm/i;
test('Public terms and privacy are independent of a specific GitHub repository',()=>{
 const policy=read('ui/legalDocuments.js');
 for(const s of [policy,legalDocumentMarkup('terms'),legalDocumentMarkup('privacy'),JSON.stringify([TERMS,PRIVACY])]){
  assert.doesNotMatch(s,previous);
  assert.doesNotMatch(s,/公開リポジトリのIssues|Issuesから連絡|公開の問い合わせ欄で非公開の連絡方法/);
 }
 assert.doesNotMatch(legalDocumentMarkup('terms'),/href="https:\/\/github\.com/);
 assert.doesNotMatch(legalDocumentMarkup('privacy'),/href="https:\/\/github\.com/);
 assert.match(legalDocumentMarkup('terms'),/一般向けの正式なリリースは行っていません/);
 assert.match(legalDocumentMarkup('privacy'),/問い合わせ窓口/);
 assert.equal(LEGAL_VERSION,'2026-11-10','substantive legal change needs a new consent version');
});
test('Pre-change consent is not silently retained as consent to revised legal documents',()=>{
 const previousConsent={termsVersion:'2026-10-28',privacyVersion:'2026-10-28',termsAccepted:true,privacyConfirmed:true,acceptedAt:'2026-10-28T00:00:00Z'};
 assert.equal(readLegalConsent({getItem:k=>k===LEGAL_CONSENT_KEY?JSON.stringify(previousConsent):null}),false);
});
test('ROF-J diagrams and service worker never fetch the former repository',()=>{
 const rof=read('ui/rofJScale.js'),sw=read('sw.js');
 assert.doesNotMatch(rof,previous);
 assert.doesNotMatch(sw,previous);
 assert.doesNotMatch(sw,/approvedRof|raw\.githubusercontent\.com/);
 assert.ok(ROF_J_ANCHORS.every(a=>referenceImageUrl(a).startsWith('./assets/rof/')));
 assert.equal(ROF_J_ANCHORS.length,5);
});
test('Deployment check and current-facing documentation have no former repository hardcoding',()=>{
 for(const path of ['README.md','docs/INSTALL.md','tests/livePagesSmoke.mjs','.github/workflows/run-app-regression.yml']){
  assert.doesNotMatch(read(path),previous,path);
 }
 assert.match(read('tests/livePagesSmoke.mjs'),/process\.env\.RUNLOAD_PAGES_URL/);
 assert.match(read('.github/workflows/run-app-regression.yml'),/vars\.RUNLOAD_PAGES_URL != ''/);
 assert.match(read('README.md'),/一般向けの正式なリリース/);
 assert.match(read('docs/INSTALL.md'),/一般向けに正式リリースしていません/);
});
