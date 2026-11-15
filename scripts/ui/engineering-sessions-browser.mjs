/**
 * Engineering Sessions — full cross-mode investigation smoke test.
 * Runs in isolated headless Chromium against synthetic, explicitly labelled data.
 * No staff credentials, API keys, solvers, source writes or navigation to private URLs.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.SESSIONS_BASE_URL||'http://127.0.0.1:3000';
const output=process.env.SESSIONS_ARTIFACTS||'artifacts/engineering-sessions';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 const mode=(label)=>page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button',{name:label,exact:true});
 await page.goto(base+'/sessions.html#worktable',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Explore the question, not the modules.'}).waitFor();
 assert(await page.getByText('INTERACTIVE UX PROTOTYPE').isVisible());
 assert(await page.getByText('All engineering objects are synthetic examples.',{exact:false}).count()>0);
 assert.equal(await page.locator('.es-workspace').count(),1);
 assert.equal(await page.locator('.es-study-selector').count(),0);
 await page.screenshot({path:path.join(output,'sessions-worktable-1440.png'),fullPage:false,animations:'disabled'});
 // Contextual inspector is optional and genuine — not a pinned dashboard card.
 await page.getByRole('button',{name:/Inspect Reference configuration/}).click();
 const inspector=page.getByRole('complementary',{name:'Selected object context inspector'});
 await inspector.waitFor();
 assert(await inspector.getByText('Demonstration-only').isVisible());
 await page.getByRole('button',{name:'Close context inspector'}).click();
 await inspector.waitFor({state:'hidden'});
 // Design: shared state and actual projection controls.
 await mode('Design').click();
 await page.getByRole('heading',{name:'Two concepts. One set of assumptions.'}).waitFor();
 assert.equal(await page.locator('.es-model-frame').count(),2);
 assert(await page.getByText('Numerical comparison unavailable').isVisible());
 await page.getByRole('group',{name:'Reference model projection'}).getByRole('button',{name:'Plan'}).click();
 assert.equal(await page.getByRole('group',{name:'Reference model projection'}).getByRole('button',{name:'Plan'}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Synchronized views'}).click();
 await page.getByRole('button',{name:'Toggle B projection'}).click();
 await page.getByRole('button',{name:'Highlight hulls'}).click();
 assert.equal(await page.getByRole('button',{name:'Highlight on'}).getAttribute('aria-pressed'),'true');
 await page.screenshot({path:path.join(output,'sessions-design-1440.png'),fullPage:false,animations:'disabled'});
 // Experiment: select a different study; actual solver plot must remain unavailable.
 await mode('Experiment').click();
 await page.getByRole('heading',{name:"See the evidence—or exactly what's missing."}).waitFor();
 await page.getByRole('button',{name:/Structural engineering.*Hull and handling loads/}).click();
 assert(await page.getByText('Hull and handling loads',{exact:true}).count()>0);
 assert(await page.getByText('Source-backed result required').isVisible());
 assert.equal(await page.locator('.es-result-canvas canvas').count(),0);
 await page.screenshot({path:path.join(output,'sessions-experiment-1440.png'),fullPage:false,animations:'disabled'});
 // Review: evidence blockers, no approval action.
 await mode('Decide').click();
 await page.getByRole('heading',{name:'Make uncertainty impossible to overlook.'}).waitFor();
 assert(await page.getByText('No authorized recommendation').isVisible());
 assert(await page.getByText('Independent reviewer record missing.').isVisible());
 await page.screenshot({path:path.join(output,'sessions-decide-1440.png'),fullPage:false,animations:'disabled'});
 // Draft verification creates only an ephemeral notebook entry; experiment selection persists.
 await page.getByRole('button',{name:'Draft next verification task'}).click();
 await page.getByRole('heading',{name:'A recoverable record of every engineering question.'}).waitFor();
 assert(await page.getByText('Verification task draft').isVisible());
 const note=page.getByRole('textbox',{name:'Add an observation to this preview'});
 await note.fill('Confirm launch-and-recovery load assumptions before accepting a design alternative.');
 await page.getByRole('button',{name:'Add local observation'}).click();
 assert(await page.getByText('Confirm launch-and-recovery load assumptions before accepting a design alternative.').isVisible());
 await page.screenshot({path:path.join(output,'sessions-notebook-1440.png'),fullPage:false,animations:'disabled'});
 await mode('Experiment').click();
 assert(await page.getByText('Hull and handling loads',{exact:true}).count()>0,'Selected study not preserved across modes');
 await mode('Notebook').click();
 assert(await page.getByText('Verification task draft').isVisible(),'Notebook draft must persist across modes');
 // Native search and all 24 protected module links.
 await page.keyboard.press('Control+k');
 const dialog=page.getByRole('dialog',{name:'Search the engineering lab'});
 await dialog.waitFor();
 await page.getByRole('searchbox',{name:'Search demonstration objects and engineering modules'}).fill('stability');
 assert((await page.locator('.es-search-results > button').count())>0);
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await page.keyboard.press('Control+k');
 await dialog.waitFor();
 await page.getByRole('searchbox',{name:'Search demonstration objects and engineering modules'}).fill('');
 assert.equal(await page.locator('.es-search-results a[href^="/legacy.html?module="]').count(),24);
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 // Actual page responsiveness and useful main activity in opening viewport.
 for(const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[320,700]]){
  await page.setViewportSize({width,height});
  await mode('Worktable').click();
  await page.evaluate(()=>{document.activeElement?.blur?.();window.scrollTo(0,0);});
  const dim=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(dim.scroll<=dim.viewport+2,'Horizontal overflow at '+width+'px '+JSON.stringify(dim));
  assert(await page.locator('.es-vessel-display').isVisible(),'Missing vessel worktable at '+width);
  assert(await page.locator('.es-session-spine').isVisible(),'Session context hidden at '+width);
  assert.equal(await page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button').count(),5);
  await page.screenshot({path:path.join(output,'sessions-worktable-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:path.join(output,'sessions-worktable-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  if(width===390){
    await mode('Experiment').click();
    await page.screenshot({path:path.join(output,'sessions-experiment-390.png'),fullPage:false,animations:'disabled'});
    await mode('Decide').click();
    await page.screenshot({path:path.join(output,'sessions-decide-390.png'),fullPage:false,animations:'disabled'});
  }
 }
 await page.setViewportSize({width:1280,height:800});
 await page.evaluate(()=>{document.documentElement.style.zoom='2'});
 const zoom=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert(zoom.scroll<=zoom.viewport+2,'CSS 200% zoom overflow '+JSON.stringify(zoom));
 await page.screenshot({path:path.join(output,'sessions-css-zoom-200.png'),fullPage:false,animations:'disabled'});
 await page.evaluate(()=>{document.documentElement.style.zoom=''});
 assert.deepEqual(errors,[],'Uncaught runtime errors');
 console.log('PASS: Engineering Sessions cross-mode journey, note continuity, source warnings, 24 source routes and 5 widths.');
}finally{await browser.close();}
