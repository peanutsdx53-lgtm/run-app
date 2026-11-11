/**
 * I0 end-to-end integration acceptance: knowledge→first real saved run→result→
 * selected-run reflection→knowledge→general inquiry (unselected)→
 * second real saved run→same-meaning compare→original question revisit.
 * New coverage between existing separate P0 cycle and L6 general-learning bridge.
 * This does not evaluate human understanding, fatigue safety or clinical outcomes.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER==='webkit'?'webkit':'chromium';
const engine=engineName==='webkit'?webkit:chromium;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside');
  const actual=path===root?resolve(root,'index.html'):path;
  res.setHeader('content-type',types[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
}catch{res.writeHead(404);res.end('not found')}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await engine.launch({headless:true});
const selectedTopic=encodeURIComponent('過去の走りとの比較');
const paceTopic=encodeURIComponent('距離・時間・ペース');
const fatigueTopic=encodeURIComponent('疲れの感じ方');
const noteText='次の走行では平均ペースと条件を確かめ、数字だけで疲れの原因を決めない';
try{
  for(const width of [390,1440]){
    const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},serviceWorkers:'allow',reducedMotion:'reduce'});
    await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const goto=async(hash)=>page.goto(base+hash,{waitUntil:'networkidle'});
    const canonical=async()=>page.evaluate(async()=>{
      const c=await import('/ui/manualRunCanonical.js');
      const r=await c.readCanonical();
      return {ok:r.ok,raw:r.raw,count:r.read?.records?.length};
    });
    const save=async(date,distance,minutes,rofBefore)=>{
      return page.evaluate(async({date,distance,minutes,rofBefore})=>{
        const [c,m]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
        const opened=await c.refresh();if(!opened.ok)return opened;
        const draft={date,distance:String(distance),hours:'',minutes:String(minutes),seconds:'',
          rofBefore,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
          activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'',shoeName:'',courseName:''};
        const saved=await c.mutate(s=>m.saveManualRun(s,draft));
        const snap=await c.readCanonical();
        return {ok:saved.ok&&snap.ok,id:saved.record?.id,raw:snap.raw,reason:saved.reason};
      },{date,distance,minutes,rofBefore});
    };
    await goto('#/learning');
    await page.locator('.lr-page-heading .rl-screen-help').waitFor();
    assert.equal((await canonical()).count,0,'education must work with no saved run');
    await goto('#/learning?lesson=effort-fatigue-recovery');
    await page.locator('.lr-chapter:has([data-lf-quiz]) > summary').click();
    await page.locator('[data-lf-quiz]').waitFor();
    // Fatigue has [data-lf-quiz], not the pace lesson's [data-lr-quiz].
    await page.locator('[name="f1"][value="1"]').check();
    await page.locator('[data-lf-quiz] button[type=submit]').click();
    assert.equal(await page.locator('[data-lf-feedback=f1]').getAttribute('data-correct'),'true');
    assert.equal((await canonical()).count,0,'knowledge answers never create a run');
    const first=await save('2026-10-18',4,28,0);
    assert.equal(first.ok,true,first.reason);
    assert.ok(first.id?.startsWith('run-v1-'));
    await goto('#/result?record='+encodeURIComponent(first.id)+'&view=compare');
    await page.locator('.rv4-mobile-tabs [data-tab]').first().waitFor({state:'attached'});
    // Desktop intentionally hides the mobile-only 3-tab control; its DOM contract remains.
    assert.equal(await page.locator('.rv4-mobile-tabs [data-tab]').count(),3);
    const next=page.locator('.rv4-next-path .rv4-learn-link');
    await next.waitFor();
    const href=await next.getAttribute('href');
    assert.match(href,/record=/,'result passes explicitly selected run');
    await next.click();
    await page.locator('.ex-record-return').waitFor();
    assert.match(await page.locator('.ex-record-return').innerText(),/2026-10-18/);
    assert.equal(await page.locator('[data-ex-learning-entry]').count(),0);
    const follow=page.locator('[data-ex-learning="saved-comparison"]');
    await follow.waitFor();
    await follow.locator('[data-ex-action="note"]').click();
    await page.locator('#ex-note').fill(noteText);
    await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
    await page.waitForFunction(id=>{
      const arr=JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]');
      return arr.length===1&&arr[0]?.recordId===id;
    },first.id);
    const noteBefore=await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1'));
    const parsedNote=JSON.parse(noteBefore);
    assert.equal(parsedNote[0].recordId,first.id);
    assert.equal(parsedNote[0].text,noteText);
    const firstRaw=(await canonical()).raw;
    assert.equal(firstRaw,first.raw,'adding an optional inquiry note never modifies original run');
    await goto('#/learning?lesson=pace-basics');
    await page.locator('.lr-chapter:has(#lr-explore) > summary').click();
    await page.locator('#lr-explore a[href^="#/exploration-tree"]').waitFor();
    await page.locator('.lr-chapter:has([data-lr-quiz]) > summary').click();
    await page.locator('[data-lr-quiz] button[type=submit]').click();
    assert.deepEqual(await page.evaluate(()=>({r:localStorage.getItem('runload-v2-exploration-notes-v1')})),{r:noteBefore});
    assert.equal((await canonical()).raw,firstRaw);
    await page.locator('#lr-explore a[href^="#/exploration-tree"]').click();
    await page.locator('[data-ex-learning-entry]').waitFor();
    assert.equal(await page.locator('.ex-record-return').count(),0);
    assert.equal(await page.locator('[data-ex-learning="distance-time-pace"] [data-ex-no-auto-record]').count(),1);
    assert.doesNotMatch(await page.locator('[data-ex-learning="distance-time-pace"]').innerText(),/2026-10-18|4\.00 km/);
    assert.equal((await canonical()).raw,firstRaw);
    assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1')),noteBefore);
    // The first run remains the only saved parent for the note even when a second run is added.
    const second=await save('2026-10-21',5,32,null);
    assert.equal(second.ok,true,second.reason);
    assert.notEqual(first.id,second.id);
    assert.equal((await canonical()).count,2);
    await goto('#/result?record='+encodeURIComponent(second.id)+'&compare='+encodeURIComponent(first.id)+'&view=compare');
    await page.locator('.rv4-compare-cards').waitFor({state:'attached'});
    // At desktop widths factual comparison is a table; phones use cards.
    assert.ok(await page.locator(width===390?'.rv4-compare-cards':'.rv4-comparison-scroller').isVisible());
    assert.match(await page.locator('.rv4-comparison-table').textContent(),/2026-10-18/);
    assert.match(await page.locator('.rv4-comparison-table').textContent(),/2026-10-21/);
    assert.equal(await page.locator('.rv4-mobile-tabs [data-tab]').count(),3);
    assert.equal(await page.locator('.rv4-next-path .rv4-learn-link').count(),1);
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.rv4-compare-cards').waitFor({state:'attached'});
    assert.equal((await canonical()).count,2,'two saved runs survive interruption');
    await goto('#/exploration-tree?source=manual&record='+encodeURIComponent(second.id)+'&category=01&topic='+selectedTopic);
    await page.locator('.ex-record-return').waitFor();
    assert.match(await page.locator('.ex-record-return').innerText(),/2026-10-21/);
    assert.equal(await page.locator('[data-ex-learning="saved-comparison"] .ex-note-preview').count(),0,
      'older note never becomes second run note');
    await goto('#/exploration-tree?source=manual&record='+encodeURIComponent(first.id)+'&category=01&topic='+selectedTopic);
    await page.locator('.ex-note-preview').waitFor();
    assert.match(await page.locator('.ex-note-preview').innerText(),/次の走行では平均ペース/);
    await goto('#/exploration-tree?source=manual&record='+encodeURIComponent(first.id)+'&category=04&topic='+fatigueTopic);
    await page.locator('[data-ex-learning="fatigue-reading"]').waitFor();
    assert.match(await page.locator('[data-ex-learning="fatigue-reading"]').innerText(),/運動前 0 ／ 運動後 未回答/,
      'ROF-J zero remains a valid response, null missing');
    const unknown='run-v1-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await goto('#/exploration-tree?source=manual&record='+unknown+'&category=01&topic='+paceTopic+'&entry=learning');
    // M6 legacy deleted-manual route keeps old notes editable and shows an
    // explicit missing-run notice rather than an inquiry-error hard screen.
    // The record ID is never substituted by the other saved run.
    await page.locator('.ex-notice').filter({hasText:'指定された走行記録が見つかりません'}).waitFor();
    const missingView=await page.locator('[data-ex-learning="distance-time-pace"]').innerText();
    assert.match(missingView,/指定した走行を確認できません/);
    assert.doesNotMatch(missingView,/選択した保存済み走行|最新の保存済み走行|2026-10-21/);
    assert.equal(await page.locator('.ex-record-return').count(),0);
    assert.equal(await page.locator('[data-ex-learning-entry]').count(),0);
    const final=(await canonical()).raw;
    assert.equal(final,second.raw,'invalid links never mutate either source record');
    assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1')),noteBefore,
      'revisiting, quizzes, comparisons and invalid references never reassign the note');
    assert.deepEqual(errors,[],'no browser JS errors');
    console.log(JSON.stringify({gate:'I0-INTEGRATION',engine:engineName,width,
      status:'PASS',records:2,selectedNoteRetained:true,learningIndependent:true,missingNotZero:true,invalidRefRejected:true}));
    await ctx.close();
  }
}finally{await browser.close();await new Promise(done=>server.close(done));}
