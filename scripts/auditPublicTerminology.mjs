// Repository-wide terminology inventory. Run with: node scripts/auditPublicTerminology.mjs
// This is an audit, not a blind replace: never rename persisted keys or archived research records.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const names=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const patterns=[
 ['brand',/run[\s-]?load|ランロード/ig],
 ['research-internal',/研究Current|研究台帳|出典台帳|研究用|内部用語|内部評価|研究上の測定量|研究上の指標|研究用の|モデル内の原著ID|研究系列/ig],
 ['provisional',/Reference[- ]?100|未実装|試行教材|候補版|暫定版|試作|プロトタイプ|モック|ダミー|デモ|検証用|テスト用/ig],
 ['technical-id',/識別子：|出典ID：|原著ID：|計算系列|モデル版|採用原著（研究|旧研究|正式な生活記録/ig],
 ['draft-example',/仮想例|仮の|サンプル記録|仮定した|暫定的/ig]
];
const runtime=p=> /^(app\.js|pwa\.js|sw\.js|index\.html|manifest\.webmanifest|styles\.css|ui\/.+\.(js|css)|core\/.+\.js|assets\/.+\.js)$/.test(p);
const textFile=p=>/\.(js|mjs|css|html|json|webmanifest|md|yml|yaml|csv|svg)$/.test(p);
const result={baseline:process.env.GITHUB_SHA||'local',allTracked:names.length,scanned:0,binaryOrUnsupported:[],readFailures:[],runtimeFiles:0,nonRuntimeFiles:0,matchCounts:{},matches:[],highPriority:[]};
for(const name of names){
 if(!textFile(name)){result.binaryOrUnsupported.push(name);continue;}
 let data;
 try{data=fs.readFileSync(name,'utf8');}catch(e){result.readFailures.push({path:name,error:String(e.message)});continue;}
 result.scanned++;
 if(runtime(name))result.runtimeFiles++;else result.nonRuntimeFiles++;
 const lines=data.split(/\r?\n/);
 for(let i=0;i<lines.length;i++){
  const line=lines[i];const matches=[];
  for(const [category,rx] of patterns){
   rx.lastIndex=0;
   for(const m of line.matchAll(rx)){
    matches.push({category,term:m[0],column:m.index+1});
    result.matchCounts[category]=(result.matchCounts[category]||0)+1;
   }
  }
  if(!matches.length)continue;
  const item={path:name,line:i+1,runtime:runtime(name),matches,excerpt:line.trim().slice(0,520)};
  result.matches.push(item);
  if(!item.runtime)continue;
  // Storage schema, CSS selectors, imports and comments are not user-visible copy.
  const structural=/^\s*(\/\/|\/\*|\*|#|--)/.test(line)||/^\s*(?:const|export const) \w+(?:_KEY|_DB|_STORE|_FORMAT|_VERSION|_ROOT)\s*=/.test(line);
  const isKeyOnly=matches.every(x=>x.category==='brand')&&/runload[-_a-z0-9]*|github\.com\/.*runload/ig.test(line)&&!/title:|message:|reason:|note:|summary:|citation:|sourceNote:|description:|reference:|question:|choices:|<p|<h\d|<span|<strong|<small|aria-label|textContent|innerHTML|return .*'/i.test(line);
  if(!structural&&!isKeyOnly && matches.some(x=>x.category!=='draft-example')){
   result.highPriority.push(item);
  }
 }
}
fs.mkdirSync('audit-artifacts',{recursive:true});
fs.writeFileSync('audit-artifacts/terminology-audit.json',JSON.stringify(result,null,2)+'\n');
const summary=[
 '# 利用者向け用語・全ファイル横断監査',
 '',
 '- 基準コミット: '+result.baseline,
 '- Git追跡ファイル: '+result.allTracked,
 '- テキスト走査: '+result.scanned+'（実行時: '+result.runtimeFiles+'、非実行時: '+result.nonRuntimeFiles+'）',
 '- バイナリ等: '+result.binaryOrUnsupported.length+'（画像の内部文字は目視・別経路で確認）',
 '- 読取失敗: '+result.readFailures.length,
 '- 候補のある行: '+result.matches.length,
 '- 実行時ファイルの要確認行: '+result.highPriority.length,
 '- マッチ数: '+JSON.stringify(result.matchCounts),
 '',
 '## 利用者表示の可能性がある箇所（必ず人手で分類）',
 '',
 ...result.highPriority.map(x=>'- '+x.path+':'+x.line+' ['+x.matches.map(m=>m.term).join(', ')+'] '+x.excerpt.replaceAll('\u007c','｜')),
 '',
 '## バイナリ・非テキスト',
 ...result.binaryOrUnsupported.map(x=>'- '+x),
 '',
 '※コメント・保存キー・研究資料・テスト仕様は機械的に削除しない。研究上必要な限界説明は残す。'
];
fs.writeFileSync('audit-artifacts/terminology-audit.md',summary.join('\n')+'\n');
console.log('TERMINOLOGY_SUMMARY '+JSON.stringify({files:result.allTracked,scanned:result.scanned,runtime:result.runtimeFiles,notRuntime:result.nonRuntimeFiles,binary:result.binaryOrUnsupported.length,failures:result.readFailures.length,matchingLines:result.matches.length,uiCandidates:result.highPriority.length,matchCounts:result.matchCounts}));
for(const x of result.highPriority.slice(0,100))console.log('UI_CANDIDATE '+x.path+':'+x.line+' '+x.matches.map(z=>z.term).join(',')+' '+x.excerpt.slice(0,270));
if(result.readFailures.length)process.exitCode=2;
