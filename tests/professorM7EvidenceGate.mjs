/** M7 evidence integrity gate: no automatic PASS from a nearby test or CI green. */
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const audit=JSON.parse(readFileSync(new URL('../docs/professor-m7-source-audit.json',import.meta.url),'utf8'));
const original=Buffer.from(audit.source_csv_base64,'base64');
assert.ok(original.length>14000&&original.length<17000,'embedded source 92 CSV byte length');
assert.equal(createHash('sha256').update(original).digest('hex'),audit.source_sha256,'original 92-case list was changed');
assert.equal(audit.schema,1);
assert.equal(audit.cases.length,92,'exact original case count');
assert.equal(audit.source_csv_base64.slice(0,4),'77u/', 'original has expected UTF-8 BOM');
const idSet=new Set();
let candidate=0, hold=0;
const evidence=[];
for(let i=0;i<audit.cases.length;i++){
 const c=audit.cases[i];
 const id=`T-${String(i+1).padStart(3,'0')}`;
 assert.equal(c.id,id,'case IDs must be unchanged and consecutive');
 assert.ok(!idSet.has(id));idSet.add(id);
 assert.ok(['P1','P2','P3','P4','G'].includes(c.category));
 assert.ok(c.input.trim()&&c.acceptance.trim());
 if(c.proposed==='DIRECT_REPLAY'){
   candidate++;
   assert.ok(Array.isArray(c.proofs)&&c.proofs.length>0,`${id} has no direct proof candidate`);
   for(const proof of c.proofs){
     assert.ok(/^tests\/[A-Za-z0-9]+(?:[A-Za-z0-9.])*\.mjs$/.test(proof.path),id+' unsafe evidence file path');
     assert.ok(['node','browser','browser-chromium'].includes(proof.runner),id+' invalid evidence runner');
     const source=readFileSync(new URL('../'+proof.path,import.meta.url),'utf8');
     assert.ok(typeof proof.needle==='string'&&proof.needle.length>=9&&source.includes(proof.needle),`${id} direct evidence source/claim not found: ${proof.path} / ${proof.needle}`);
   }
   evidence.push({caseId:id,state:'PROPOSED_DIRECT_REPLAY',basis:'source assertion exists; runtime suite completion required',proofs:c.proofs});
 }else{
   hold++;
   assert.equal(c.proposed,'HOLD',id+' unknown proposed status');
   assert.ok(typeof c.gap==='string'&&c.gap.trim().length>12,id+' HOLD missing gap');
   assert.equal(c.proofs.length,0,id+' HOLD has misleading source proof');
   evidence.push({caseId:id,state:'HOLD',reason:c.gap});
 }
}
assert.equal(candidate+hold,92);
assert.ok(hold>0,'M7 is not permitted to claim all cases PASS without exact evidence');
mkdirSync(new URL('../audit-output',import.meta.url),{recursive:true});
writeFileSync(new URL('../audit-output/professor-m7-coverage-proposals.json',import.meta.url),JSON.stringify({basis:audit.basis_sha,sourceSha256:audit.source_sha256,caseCount:92,directReplayCandidates:candidate,hold,evidence},null,2)+'\n');
console.log(JSON.stringify({gate:'M7-evidence-source-integrity',status:'PASS',originalCases:92,directReplayCandidates:candidate,unverifiedHolds:hold,note:'This is a pre-execution case-evidence check, not a 92-case pass claim.'}));
