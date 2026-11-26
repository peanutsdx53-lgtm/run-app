import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('obsolete markup and handlers have no active application entry points',()=>{
 const app=read('app.js');
 assert.doesNotMatch(app,/\b(?:rofPanel|recordPreview|recordPreviewOpen|rofEditorOpen|sheetBody)\b|data-rof-input|data-rof-clear|data-close-preview|data-history-day|data-history-mode|data-sheet-toggle|data-sheet-expand/);
 assert.doesNotMatch(app,/コースの登録やGPSで測定したコースはまだ取り込めません/);
 assert.match(app,/function recordRof\(\)\{return rofExperience\.rofPage/);
 assert.match(app,/function recordCourse\(fromHome=false\)\{return recordExperience\.coursePage/);
 assert.match(app,/"record-more":recordMore/);
 assert.match(app,/data-open-record-review/);
 assert.match(read('ui/recordExperience.js'),/data-open-record-review/);
 assert.doesNotMatch(read('ui/englishFinalAppShell.js'),/コースの登録やGPSで測定したコースはまだ取り込めません/);
});
test('the current documentation only links to retained local resources',()=>{
 const readme=read('README.md');
 for(const m of readme.matchAll(/\[[^\]]+\]\(([^):#]+)\)/g))assert.ok(existsSync(new URL('../'+m[1],import.meta.url)),m[1]);
 assert.doesNotMatch(readme,/RunLoad|ChatGPT|OpenAI|\b(?:AI|GPT|LLM|Codex)\b/i);
 assert.deepEqual(readdirSync(new URL('../docs/',import.meta.url)).sort(),['GPS_CODE_DESIGN_ASSURANCE_20261027.md','GPS_SOFTWARE_CLOSEOUT_20261027.md','INSTALL.md','professor-m7-source-audit.json']);
});
