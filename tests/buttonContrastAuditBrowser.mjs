/* Dark-mode button color inventory: collect actual computed styles in real Chromium/WebKit.
 * This first phase is diagnostic. A separate acceptance run enforces the approved contract. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','button-contrast-'+engine);
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep))throw Error('blocked');
  const file=p===root?resolve(root,'index.html'):p;
  res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const base='http://127.0.0.1:'+server.address().port+'/';
const paths=[
 ['home','home','.home-v3'],
 ['record-start','record-start','.rv-method'],
 ['record','record','.record-v3'],
 ['course','record-course','.rv-course'],
 ['rof','record-rof','[data-rof-v4-root]'],
 ['gait','record-compare','[data-g4-page]'],
 ['environment','record-environment','[data-e4-page]'],
 ['body','record-reflection','.cx-page'],
 ['more','record-more','.rv-aux'],
 ['settings','settings','[data-settings-v2]'],
 ['history','history','#runload-history-v2 .stage'],
 ['explore','exploration-tree','[data-experience-v3]'],
 ['condition','condition','#condition-journey'],
 ['consultation','consultation','#runload-consultation'],
 ['learning','learning','.lr-root'],
 ['measurement','measurement','[data-measurement-v2]']
];
const findings=[],failures=[];
async function scan(page,screen,language,width,phase){
 return await page.evaluate(({screen,language,width,phase})=>{
  const all=[];
  const parse=v=>{
   if(!v)return null;
   const m=String(v).match(/^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,\s\/]+(\d*\.?\d+))?/i);
   return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null;
  };
  const lin=c=>{const f=x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);};
  const contrast=(a,b)=>{const l=lin(a),r=lin(b);return +(Math.max(l,r)+.05)/(Math.min(l,r)+.05);};
  const sampleBgs=el=>{
   for(let cur=el;cur;cur=cur.parentElement||cur.getRootNode()?.host){
    const css=getComputedStyle(cur),bg=css.backgroundColor,image=css.backgroundImage;
    const solid=parse(bg);
    const stops=[...image.matchAll(/rgba?\([^)]*\)/g)].map(m=>parse(m[0])).filter(c=>c&&c[3]>.87);
    if(stops.length)return stops;
    if(solid&&solid[3]>.88)return [solid];
   }
   return [[5,23,37,1]];
  };
  const visit=root=>{
   for(const btn of root.querySelectorAll('button,a.btn,[role="button"],summary')){
    if(btn.shadowRoot)visit(btn.shadowRoot);
    const css=getComputedStyle(btn),r=btn.getBoundingClientRect();
    if(r.width<10||r.height<10||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)<.45)continue;
    const text=(btn.innerText||btn.textContent||'').trim().replace(/\s+/g,' ').slice(0,100);
    if(!text||!/[\p{L}\d]/u.test(text))continue;
    const descendants=[btn,...btn.querySelectorAll('span,b,strong,small,em')].filter(x=>[...x.childNodes].some(n=>n.nodeType===3&&(n.data||'').trim()));
    const bgs=sampleBgs(btn);
    const scores=[];
    for(const item of descendants){
      const fg=parse(getComputedStyle(item).color);
      if(!fg)continue;
      const colors=sampleBgs(item);
      const ratios=colors.map(c=>contrast(fg,c));
      scores.push({fg:getComputedStyle(item).color,min:Math.min(...ratios),max:Math.max(...ratios),node:item===btn?'button':item.tagName.toLowerCase()});
    }
    if(!scores.length)continue;
    const low=scores.reduce((a,b)=>a.min<b.min?a:b);
    const font=getComputedStyle(btn),size=parseFloat(font.fontSize),bold=parseInt(font.fontWeight,10)>=700;
    const threshold=size>=24||(size>=18.66&&bold)?3:4.5;
    const label=btn.className?.baseVal??btn.className??'';
    all.push({screen,language,width,phase,selector:btn.tagName.toLowerCase()+'#'+btn.id+'.'+String(label).replace(/\s+/g,'.').slice(0,90),
     context:String(btn.closest('.rv4-view-tabs,.rv4-mobile-tabs,.rv4-actions,.rr-foot-actions,.rv4-rof-correct-form,.rv4-question-continuation,.gps-v2-tabs,.rv4-tabs,.record-v3,.ex-topic-set,.s2-choice-row,.cp-mode-button,.g4-choice,.e4-weather,.e4-flags')?.className||'').slice(0,100),
     text,foreground:low.fg,background:font.backgroundColor,gradient:font.backgroundImage.slice(0,160),
     minRatio:+low.min.toFixed(2),threshold,pressed:btn.getAttribute('aria-pressed')||btn.getAttribute('aria-selected')||'',
     disabled:btn.disabled||false,node:low.node,widthPx:+r.width.toFixed(1),heightPx:+r.height.toFixed(1)});
   }
   for(const child of root.querySelectorAll('*'))if(child.shadowRoot)visit(child.shadowRoot);
  };
  visit(document);
  return all;
 },{screen,language,width,phase});
}
async function snap(page,screen,language,width,phase){
 if(width!==390)return;
 const name=screen+'-'+phase+'-'+language+'-'+width;
 findings.push(...await scan(page,screen,language,width,phase));
 await page.screenshot({path:resolve(out,name+'.png'),animations:'disabled',fullPage:['course','settings','gait','environment'].includes(screen)});
}
try{
 for(const [language,width] of [['en',390],['ja',390],['en',320]]){
  const ua=engine==='webkit'?
   'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':
   'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',serviceWorkers:'block',userAgent:ua});
  await context.addInitScript(lang=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:lang}));
   localStorage.setItem('runload-v2-display-preferences-v1',JSON.stringify({textSize:'standard',motion:'system',language:lang}));
  },language);
  const page=await context.newPage();
  await page.goto(base+'#/home',{waitUntil:'networkidle'});
  const savedId=await page.evaluate(async()=>{
   const [c,m]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const base=await c.refresh();if(!base.ok)throw Error('canonical init: '+base.reason);
   const x=await c.mutate(st=>m.saveManualRun(st,{date:'2026-11-20',distance:'5',
     hours:'',minutes:'35',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',
     rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
     courseName:'Audit-only course',memo:''}));
   if(!x.ok)throw Error('audit record: '+x.reason);
   return x.record.id;
  });
  for(const [name,path,selector] of [...paths,['result','result?record='+encodeURIComponent(savedId),'#runload-result-v4']]){
   try{
    await page.goto(base+'#/'+path,{waitUntil:'networkidle'});
    await page.locator(selector).first().waitFor({timeout:13000});
    await page.waitForTimeout(75);
    const entries=await scan(page,name,language,width,'default');
    findings.push(...entries);
    if(width===390)await page.screenshot({path:resolve(out,name+'-default-'+language+'-'+width+'.png'),animations:'disabled',fullPage:name==='course'||name==='settings'});
    if(name==='consultation'&&language==='en'){
     const target=page.locator('#cp-target');
     const options=await target.locator('option').allTextContents();
     assert.ok(options.length>0,'consultation must offer the seeded activity');
     assert.ok(options.every(x=>!/[\u3040-\u30ff\u3400-\u9fff]/u.test(x)),
      'English system record options must not contain Japanese: '+JSON.stringify(options));
    }
    if(name==='gait'){
     const source=page.locator('[data-g4-source="DEVICE_MEASURED"]');
     const runwalk=page.locator('[data-g4-format="RUN_WALK"]');
     await source.click();await runwalk.click();
     await page.waitForTimeout(90);
     const layout=await page.locator('.g4-choice').evaluateAll(groups=>groups.map(group=>{
      const btn=[...group.querySelectorAll('button')];
      const rects=btn.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,scroll:b.scrollWidth,client:b.clientWidth,txt:b.innerText}});
      return {columns:getComputedStyle(group).gridTemplateColumns,keys:btn.map(b=>b.dataset.g4Source||b.dataset.g4Format),rects};
     }));
     assert.equal(layout.length,2,'both step and running pattern groups are visible');
     for(const group of layout){
      assert.equal(group.rects.length,3,'each choice group has three buttons');
      assert.equal(group.keys[2],'UNKNOWN','Unknown must be the final choice');
      const [first,second,last]=group.rects;
      assert.ok(Math.abs(first.y-second.y)<2,'specific choices must share a row');
      assert.ok(last.y>first.y+first.h-2,'Unknown must be on the next row');
      assert.ok(Math.abs(last.x-first.x)<3,'Unknown must align with the grid left');
      assert.ok(Math.abs(last.w-(first.w+second.w+(second.x-first.x-first.w)))<4,
       'Unknown must span the full row, not leave a blank second cell');
     }
     if(language==='en'){
      const overall=await page.locator('.g4-summary p').first().innerText();
      assert.doesNotMatch(overall,/[\u3040-\u30ff\u3400-\u9fff]/u,
       'overall Gait distance/time summary must not retain Japanese: '+overall);
     }
     const controls=await page.locator('[data-g4-source],[data-g4-format]').evaluateAll(buttons=>
      buttons.map(b=>({text:b.innerText,client:b.clientWidth,scroll:b.scrollWidth,
       height:b.clientHeight,scrollHeight:b.scrollHeight})));
     assert.ok(controls.length>=5,'gait options must be rendered');
     assert.ok(controls.every(x=>x.scroll<=x.client+2&&x.scrollHeight<=x.height+2),
      'gait labels must fit inside their buttons: '+JSON.stringify(controls));
     if(language==='en')assert.ok(controls.every(x=>!/[\u3040-\u30ff\u3400-\u9fff]/u.test(x.text)),
      'English gait choices must not contain Japanese labels: '+JSON.stringify(controls));
     await snap(page,name,language,width,'selected');
    }else if(name==='environment'){
     if(language==='en'){
      const placeholder=await page.locator('[data-draft="environmentNote"]').getAttribute('placeholder');
      assert.match(placeholder,/Strong headwind/i,'Environment note example is fully English');
      assert.doesNotMatch(placeholder,/[\u3040-\u30ff\u3400-\u9fff]/u);
     }
     await page.locator('[data-e4-weather="SUN"]').click();
     await page.locator('[data-e4-flag="WIND"]').click();
     await snap(page,name,language,width,'selected');
    }else if(name==='body'){
     const selectedTab=page.locator('.cx-tab[aria-pressed="true"]').first();
     await selectedTab.waitFor({state:'visible'});
     const style=await selectedTab.evaluate(el=>({ink:getComputedStyle(el).color,
      gradient:getComputedStyle(el).backgroundImage}));
     assert.equal(style.ink,'rgb(5, 41, 57)',
      'selected Body tab has dark ink throughout the turquoise gradient');
     assert.ok(style.gradient.includes('rgb(39, 178, 214)')&&
      style.gradient.includes('rgb(17, 198, 181)'),'Body gradient remains turquoise');
     const fonts=await page.locator('.cx-tab,.cx-picker-trigger,.cx-apply,.cx-transfer button').evaluateAll(buttons=>
      buttons.map(button=>({text:button.innerText,actual:getComputedStyle(button).fontFamily,
       expected:getComputedStyle(button.closest('.cx-page')).fontFamily})));
     assert.ok(fonts.length>=5,'Body should expose a representative button family');
     assert.ok(fonts.every(item=>item.actual===item.expected),
      'Body controls must inherit the screen typeface: '+JSON.stringify(fonts));
     await snap(page,name,language,width,'selected');
    }else if(name==='learning'){
     const back=page.locator('.lr-page-heading .lr-page-back').first();
     await back.waitFor({state:'visible'});
     assert.equal(await back.getAttribute('href'),'#/home','Learning catalogue returns Home');
     const geometry=await page.locator('.lr-page-heading').evaluate(root=>{
      const back=root.querySelector('.lr-page-back').getBoundingClientRect(),
       title=root.querySelector('h1').getBoundingClientRect(),
       help=root.querySelector('.lr-screen-help').getBoundingClientRect();
      return {back:{x:back.x,w:back.width,y:back.y},title:{x:title.x,w:title.width,y:title.y},
       help:{x:help.x,w:help.width,y:help.y}};
     });
     assert.ok(geometry.back.x+geometry.back.w<=geometry.title.x+2&&
      geometry.title.x+geometry.title.w<=geometry.help.x+2,
      'Learning header must have left back, title, right help with no overlaps');
     await snap(page,name,language,width,'back-to-home');
     await page.goto(base+'#/learning?lesson=pace-basics',{waitUntil:'networkidle'});
     await page.locator('.lr-lesson .lr-page-heading .lr-page-back').waitFor({state:'visible'});
     assert.equal(await page.locator('.lr-page-heading .lr-page-back').getAttribute('href'),'#/learning',
      'Learning lesson returns to catalogue instead of Home');
     assert.equal(await page.locator('.lr-lesson > .lr-back').count(),0,
      'old duplicated lesson back action should be removed');
     await snap(page,name,language,width,'lesson-back');
    }else if(name==='course'){
     await page.locator('[data-rv-grade="SUMMARY"]').click();
     await page.locator('[data-rv-surface-mode="MIXED"]').click();
     await page.locator('[data-rv-surface="paved"]').click();
     await page.locator('[data-rv-surface="track"]').click();
     const selectedSurfaces=await page.locator('.rv-surface-tile.is-selected').evaluateAll(nodes=>
      nodes.map(el=>({background:getComputedStyle(el).backgroundColor,
       ink:getComputedStyle(el.querySelector('span')).color, text:el.innerText})));
     assert.ok(selectedSurfaces.length>=2,'both mixed-surface selections must remain visible');
     assert.ok(selectedSurfaces.every(x=>x.background==='rgb(57, 207, 208)'&&x.ink==='rgb(5, 41, 57)'),
      'added surface names must share selected cyan/dark ink: '+JSON.stringify(selectedSurfaces));
     await snap(page,name,language,width,'selected');
    }else if(name==='settings'){
     const profile=page.locator('.s2-panel[data-settings-tone="mint"] details.s2-item').first();
     if(await profile.count()){await profile.locator('summary').click();await snap(page,name,language,width,'expanded');}
    }else if(name==='home'&&width===390){
     const edit=page.locator('.dashboard-edit-trigger').first();
     if(await edit.count()){await edit.click();await snap(page,name,language,width,'editing');}
    }else if(name==='history'){
     const advanced=page.locator('[data-history-advanced]');
     if(await advanced.count()){await advanced.click();await snap(page,name,language,width,'filters-open');}
     const gpsDetails=page.locator('[data-gps-history-disclosure]'),tools=page.locator('[data-gps-history-tools]');
     if(await gpsDetails.count()&&await tools.count()){
      await gpsDetails.evaluate(node=>node.open=true);
      await tools.evaluate(node=>node.open=true);
      const upload=page.locator('label:has(input[data-gps-v2-backup-file])').first();
      await upload.waitFor({state:'visible'});
      if(language==='en'){
       const visibleText=(await upload.innerText()).trim();
       assert.match(visibleText,/Import GPS Backup/i,'use the app English label instead of device-language file-picker chrome');
       assert.doesNotMatch(visibleText,/[\u3040-\u30ff\u3400-\u9fff]/u,'GPS backup label is fully English');
      }
      const input=upload.locator('input[data-gps-v2-backup-file]');
      const style=await input.evaluate(node=>({opacity:getComputedStyle(node).opacity,position:getComputedStyle(node).position}));
      assert.equal(style.opacity,'0','native locale-specific file input must not be visible');
      assert.equal(style.position,'absolute');
      await upload.scrollIntoViewIfNeeded();
      await snap(page,name,language,width,'gps-import');
     }
     const first=page.locator('[data-select-id]').first();
     if(await first.count()){await first.click();await snap(page,name,language,width,'selected');}
    }
    if(name==='result'){
     const tabs=page.locator('#runload-result-v4 [data-tab]');
     if(await tabs.count()===3){await tabs.nth(1).click();await snap(page,name,language,width,'fatigue');}
    }
    console.log('CONTRAST AUDIT '+name+' '+language+' '+width+': '+entries.length+' visible actions');
   }catch(err){failures.push({screen:name,language,width,error:String(err).slice(0,280)});console.log('WARN CONTRAST SCREEN '+name+' '+String(err).slice(0,180));}
  }
  if(width===390){
   try{
    await page.goto(base+'#/record',{waitUntil:'networkidle'});
    await page.locator('[data-draft="distance"]').fill('5');
    await page.locator('[data-draft="minutes"]').fill('30');
    await page.locator('[data-demo-save]').click();
    await page.locator('[data-record-review]').waitFor({timeout:12000});
    await snap(page,'review',language,width,'ready-to-save');
   }catch(err){failures.push({screen:'review',language,width,error:String(err).slice(0,280)});}
  }
  await context.close();
 }
 const ranked=findings.filter(x=>!x.disabled&&x.minRatio<x.threshold).sort((a,b)=>a.minRatio-b.minRatio);
 const critical=[['record','rv-main-button'],['record','rv-choice.is-selected'],
  ['rof','rof-v4-before-tab'],['consultation','cp-mode-button.active'],
  ['course','rv-choice.is-selected'],
  ['gait','g4-choice'],['environment','e4-chip']];
 for(const [screen,identity] of critical){
  const matches=findings.filter(row=>row.screen===screen&&row.selector.includes(identity)||row.context.includes(identity));
  assert.ok(matches.length>=2,'must observe '+screen+' '+identity);
  assert.ok(matches.every(row=>row.minRatio>=4.5),
   'primary or selected button below normal text contrast: '+JSON.stringify(matches.filter(row=>row.minRatio<4.5)));
 }
 const grouped={};for(const issue of ranked){const key=issue.screen;grouped[key]=(grouped[key]||0)+1;}
 const report={engine,scanned:findings.length,belowThreshold:ranked.length,issuesByScreen:grouped,
  visibleButtonRecords:findings,suspectedLowContrast:ranked,routeErrors:failures,
  caveat:'CSS computed gradient stops and ancestor backgrounds approximate actual rendered pixels. Confirm on screenshots.'};
 await writeFile(resolve(out,'contrast-audit.json'),JSON.stringify(report,null,2));
 console.log('CONTRAST SUMMARY '+JSON.stringify({engine,scanned:findings.length,belowThreshold:ranked.length,byScreen:grouped,errors:failures}).slice(0,2600));
 console.log('LOW CONTRAST EXAMPLES '+JSON.stringify(ranked.slice(0,70)).slice(0,14500));
 assert.ok(findings.length>140,'auditor must observe active real screens');
 assert.deepEqual(failures,[],'all real routes including result and review must load');
 assert.ok(findings.length>40,'button audit must observe actual rendered actions');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
