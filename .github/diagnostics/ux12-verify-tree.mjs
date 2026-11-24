import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [manifestPath,rootPath,expectedRef]=process.argv.slice(2);
assert.ok(manifestPath&&rootPath&&expectedRef,'usage: verify-tree manifest root ref');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
assert.equal(manifest.ref,expectedRef,'manifest ref mismatch');
assert.ok(Array.isArray(manifest.files)&&manifest.files.length>0,'empty manifest');
assert.equal(manifest.count,manifest.files.length,'manifest count mismatch');
const root=realpathSync(rootPath),seen=new Set(),mismatches=[];
for(const {path,sha,size} of manifest.files){
 assert.equal(typeof path,'string');assert.match(sha,/^[0-9a-f]{40}$/);
 assert.ok(!seen.has(path),'duplicate path '+path);seen.add(path);
 const file=resolve(root,path),rel=relative(root,file);
 assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep),'path escapes root '+path);
 try{
  const st=lstatSync(file);assert.ok(st.isFile()&&!st.isSymbolicLink(),'not regular file');
  assert.equal(realpathSync(file),file,'symlink path');
  const bytes=readFileSync(file);
  const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(actual!==sha||bytes.length!==size)mismatches.push({path,expected:sha,actual,expectedSize:size,actualSize:bytes.length});
 }catch(error){mismatches.push({path,error:String(error)});}
}
console.log(JSON.stringify({ref:manifest.ref,files:manifest.count,mismatches},null,2));
assert.equal(mismatches.length,0,'source identity verification failed');
