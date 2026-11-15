/**
 * Engineering Sessions V2: automated visual and functional acceptance in an
 * isolated Chromium browser, without staff identity or engineering writes.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.SESSIONS_BASE_URL||'http://127.0.0.1:3000';
const output=process.env.SESSIONS_ARTIFACTS||'artifacts/engineering-sessions';
await mkdir(output,{recursive:true});
for(const filename of ['usv-reference.png','usv-reference-plan.png','usv-candidate.png','usv-candidate-plan.png']){
 const info=await stat('public/sessions/media/'+filename);
 assert(info.size>100_000,'Missing high-resolution Blender asset '+filename);
}
const browser=await chromium.launch({headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 const mode=(name)=>page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button',{name,exact:true});
 await page.goto(base+'/sessions.html#worktable',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Design begins with a question.'}).waitFor();
 assert(await page.getByText('INTERACTIVE UX PROTOTYPE').isVisible());
 assert.equal(await page.locator('.v2-worktable-board').count(),1);
 assert.equal(await page.locator('.v2-research-rail').count(),1);
 assert.equal(await page.locator('.v2-vessel-lightstage').count(),1);
 const stage=await page.locator('.v2-vessel-lightstage').boundingBox();
 const rail=await page.locator('.v2-research-rail').boundingBox();
 assert(stage&&rail&&stage.width>rail.width*1.5,'The vessel must dominate the first screen');
 const img=page.locator('.v2-vessel-lightstage .ses-render-image');
 await img.waitFor();
 await img.evaluate(el=>el.decode());
 assert((await img.evaluate(el=>el.naturalWidth))>=1400,'Blender high-res model failed to load');
 assert((await img.getAttribute('src')).includes('usv-reference.png'));
 await page.getByRole('button',{name:'Inspect reference configuration'}).click();
 const inspector=page.getByRole('dialog',{name:'Selected object context inspector'});
 await inspector.waitFor();
 assert(await inspector.getByText('Demonstration-only').isVisible());
 await page.getByRole('button',{name:'Close context inspector'}).click();
 await inspector.waitFor({state:'hidden'});
 await page.screenshot({path:path.join(output,'v2-worktable-1440.png'),fullPage:false,animations:'disabled'});
 // Design A/B render: real model image changes on projection and independent cameras.
 await mode('Design').click();
 await page.getByRole('heading',{name:'One design space. Two possibilities.'}).waitFor();
 assert.equal(await page.locator('.v2-design-pane').count(),2);
 assert(await page.getByText('Physical comparison is not yet defensible.').isVisible());
 await page.getByRole('group',{name:'Reference model projection'}).getByRole('button',{name:'Plan'}).click();
 await page.locator('.v2-design-pane .ses-render-image').first().evaluate(el=>el.decode());
 assert((await page.locator('.v2-design-pane .ses-render-image').first().getAttribute('src')).includes('usv-reference-plan.png'));
 await page.getByRole('button',{name:'Synchronized views'}).click();
 await page.getByRole('button',{name:'Toggle B projection'}).click();
 await page.getByRole('button',{name:'Highlight hulls'}).click();
 assert.equal(await page.getByRole('button',{name:'Highlight on'}).getAttribute('aria-pressed'),'true');
 await page.screenshot({path:path.join(output,'v2-design-1440.png'),fullPage:false,animations:'disabled'});
 // Experiment: cinematic vessel with strictly data-gated physics results.
 await mode('Experiment').click();
 await page.getByRole('heading',{name:'Physics takes centre stage.'}).waitFor();
 assert.equal(await page.locator('.v2-physics-theatre').count(),1);
 assert(await page.getByText('No reviewable result attached').isVisible());
 assert.equal(await page.locator('.v2-physics-plot canvas').count(),0);
 await page.locator('.v2-experiment-runbar button').nth(2).click();
 assert.equal(await page.locator('.v2-experiment-runbar button[aria-pressed="true"]').count(),1);
 await page.screenshot({path:path.join(output,'v2-experiment-1440.png'),fullPage:false,animations:'disabled'});
 // Review: source graph and human authority boundary. No approval action.
 await mode('Decide').click();
 await page.getByRole('heading',{name:'Every conclusion needs a chain of proof.'}).waitFor();
 assert.equal(await page.locator('.v2-proof-node').count(),6);
 assert(await page.getByText('Recommendation withheld').isVisible());
 assert(await page.getByText('Not requested / not approved').isVisible());
 await page.screenshot({path:path.join(output,'v2-decide-1440.png'),fullPage:false,animations:'disabled'});
 // Local-only draft and cross-mode study preservation.
 await page.getByRole('button',{name:'Prepare verification task'}).click();
 await page.getByRole('heading',{name:'Make every investigation recoverable.'}).waitFor();
 await page.waitForFunction(()=>window.scrollY<12);
 assert((await page.evaluate(()=>window.scrollY))<12,'Mode switch must return to the new screen top');
 await page.screenshot({path:path.join(output,'v2-notebook-1440-top.png'),fullPage:false,animations:'disabled'});
 assert(await page.getByText('Verification task draft').isVisible());
 const note=page.getByRole('textbox',{name:'Add a local research observation'});
 await note.fill('Verify launch and recovery load conditions before accepting a lighter hull.');
 await page.getByRole('button',{name:'Add observation'}).click();
 assert(await page.getByText('Verify launch and recovery load conditions before accepting a lighter hull.').isVisible());
 await page.screenshot({path:path.join(output,'v2-notebook-1440.png'),fullPage:false,animations:'disabled'});
 await mode('Experiment').click();
 assert.equal(await page.locator('.v2-experiment-runbar button[aria-pressed="true"]').count(),1,'Selected study was lost across mode change');
 await mode('Notebook').click();
 assert(await page.getByText('Verification task draft').isVisible(),'Local task draft did not persist across mode changes');
 // Contextual search reaches every existing governed tool.
 await page.keyboard.press('Control+k');
 const dialog=page.getByRole('dialog',{name:'Search the engineering lab'});
 await dialog.waitFor();
 await page.getByRole('searchbox',{name:'Search demonstration objects and engineering modules'}).fill('stability');
 assert((await page.locator('.es-search-results > button').count())>0);
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await page.keyboard.press('Control+k');await dialog.waitFor();
 await page.getByRole('searchbox',{name:'Search demonstration objects and engineering modules'}).fill('');
 assert.equal(await page.locator('.es-search-results a[href^="/legacy.html?module="]').count(),24);
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 // Real responsive screenshot and no horizontal spill from image composition.
 for(const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[320,700]]){
  await page.setViewportSize({width,height});
  await mode('Worktable').click();
  await page.evaluate(()=>{document.activeElement?.blur?.();window.scrollTo(0,0)});
  const dim=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(dim.scroll<=dim.viewport+2,'Horizontal overflow at '+width+'px: '+JSON.stringify(dim));
  assert(await page.locator('.v2-vessel-lightstage').isVisible(),'Missing hero vessel at '+width);
  assert(await page.locator('.es-session-spine').isVisible(),'Missing persistent investigation context at '+width);
  assert.equal(await page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button').count(),5);
  const rect=await page.locator('.v2-vessel-lightstage').boundingBox();
  assert(rect&&rect.y+Math.min(120,rect.height*.4)<height,'Vessel not visible enough in first viewport '+width);
  await page.screenshot({path:path.join(output,'v2-worktable-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:path.join(output,'v2-worktable-'+width+'-full.png'),fullPage:true,animations:'disabled'});
  if(width===390){
   await mode('Design').click();await page.screenshot({path:path.join(output,'v2-design-390.png'),fullPage:false,animations:'disabled'});
   await mode('Experiment').click();await page.screenshot({path:path.join(output,'v2-experiment-390.png'),fullPage:false,animations:'disabled'});
   await mode('Decide').click();await page.screenshot({path:path.join(output,'v2-decide-390.png'),fullPage:false,animations:'disabled'});
  }
 }
 await page.setViewportSize({width:1280,height:800});
 await mode('Worktable').click();
 await page.evaluate(()=>{document.documentElement.style.zoom='2'});
 const zoom=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert(zoom.scroll<=zoom.viewport+2,'CSS 200% zoom horizontal overflow '+JSON.stringify(zoom));
 await page.screenshot({path:path.join(output,'v2-css-zoom-200.png'),fullPage:false,animations:'disabled'});
 await page.evaluate(()=>{document.documentElement.style.zoom=''});
 assert.deepEqual(errors,[],'Unexpected browser runtime errors');
 console.log('PASS — V2 original Blender images, 5 modes, 24 governed tools, source safety, 5 viewports and 200% CSS zoom.');
}finally{await browser.close();}
