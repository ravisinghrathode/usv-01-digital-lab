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
 // The default landing route must NEVER present synthetic records as live.
 const liveRoot=await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 assert(liveRoot?.ok(),'Default live root did not serve');
 await page.getByRole('heading',{name:'Open the real engineering workspace.'}).waitFor();
 assert(await page.getByRole('form',{name:'Staff sign in'}).count()===0 || await page.getByRole('heading',{name:'Staff sign in'}).isVisible());
 assert.equal(await page.getByText('EXAMPLE INVESTIGATION').count(),0,'Default silently fell back to synthetic investigation');
 assert(await page.getByRole('button',{name:'Example tour'}).isVisible(),'Explicit demo opt-in is missing');
 // Exercise the separately labelled synthetic visual design without credentials.
 const rootResponse=await page.goto(base+'/?demo=1#worktable',{waitUntil:'domcontentloaded'});
 assert(rootResponse?.ok(),'Default / route failed to serve the built application');
 assert.match(await page.title(),/Naval AI Lab.*Engineering Sessions/);
 await page.locator('.ux-session-desk').waitFor();
 assert(await page.locator('a[href="/legacy.html"]').count()>0,'Original lab recovery link is missing');
 assert(await page.getByText('EXAMPLE INVESTIGATION').isVisible());
 assert.equal(await page.locator('.ux-work-grid').count(),1);
 assert.equal(await page.locator('.ux-traceability').count(),1);
 assert.equal(await page.locator('.ux-model-stage').count(),1);
 assert(await page.getByText('ILLUSTRATIVE ART / NOT CAD OR PHYSICS EVIDENCE').isVisible());
 const stage=await page.locator('.ux-model-stage').boundingBox();
 const rail=await page.locator('.ux-traceability').boundingBox();
 assert(stage&&rail&&stage.width>rail.width*1.2,'The vessel concept should dominate the session workspace');
 const img=page.locator('.ux-model-stage .vf-vessel-visual img');
 await img.waitFor();await img.evaluate(el=>el.decode());
 assert((await img.evaluate(el=>el.naturalWidth))>=1400,'Blender concept image failed to load');
 assert((await img.getAttribute('src')).includes('usv-reference.png'));
 await page.getByRole('button',{name:'Alternative image'}).click();
 await img.evaluate(el=>el.decode());
 assert((await img.getAttribute('src')).includes('usv-candidate.png'),'Concept selection did not update the rendered vessel');
 await page.getByRole('button',{name:'Reference image'}).click();
 await page.getByRole('button',{name:'Inspect concept source'}).click();
 const inspector=page.getByRole('dialog',{name:'Selected object context inspector'});
 await inspector.waitFor();
 assert(await inspector.getByText('Demonstration-only').isVisible());
 await page.getByRole('button',{name:'Close context inspector'}).click();
 await inspector.waitFor({state:'hidden'});
 assert(await page.getByRole('link',{name:/Open in CAD Studio/}).isVisible(),'CAD round-trip entry point absent');
 await page.getByRole('button',{name:'New session draft'}).click();
 const localDraft=page.getByRole('dialog',{name:'Create a local session draft'});
 await localDraft.waitFor();
 await localDraft.getByRole('textbox',{name:'Session title'}).fill('Hull concept draft');
 await localDraft.getByRole('textbox',{name:'Engineering objective'}).fill('Identify source-backed hull constraints and independent review needs');
 await localDraft.getByRole('button',{name:'Use local draft'}).click();
 await localDraft.waitFor({state:'hidden'});
 assert(await page.getByText('Unsaved local investigation draft').isVisible());
 await page.screenshot({path:path.join(output,'ux-sessions-1440.png'),fullPage:false,animations:'disabled'});
 // Design A/B render: real model image changes on projection and independent cameras.
 await mode('Design').click();
 assert(await page.getByText('Hull concept draft').isVisible(),'Local session title lost on mode switch');
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
  assert(await page.locator('.ux-model-stage').isVisible(),'Missing vessel canvas at '+width);
  assert(await page.locator('.es-session-spine').isVisible(),'Missing persistent investigation context at '+width);
  assert.equal(await page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button').count(),5);
  const rect=await page.locator('.ux-model-stage').boundingBox();
  assert(rect&&rect.width>180,'Vessel canvas is too narrow at '+width);
  await page.screenshot({path:path.join(output,'ux-sessions-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:path.join(output,'ux-sessions-'+width+'-full.png'),fullPage:true,animations:'disabled'});
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
 const zoomTabs=await page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button').evaluateAll(
  buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,screen:window.innerWidth,visible:r.height>0};})
 );
 assert.equal(zoomTabs.length,5);
 for(const tab of zoomTabs)assert(tab.visible&&tab.width>=30&&tab.left>=-1&&tab.right<=tab.screen+1,
  'Zoom hides a primary activity mode '+JSON.stringify(tab));
 await page.screenshot({path:path.join(output,'v2-css-zoom-200.png'),fullPage:false,animations:'disabled'});
 await page.evaluate(()=>{document.documentElement.style.zoom=''});
 // The promoted production root and preserved multi-entry HTML routes must all work.
 const aliasResponse=await page.goto(base+'/sessions.html?demo=1#worktable',{waitUntil:'domcontentloaded'});
 assert(aliasResponse?.ok(),'Engineering Sessions alias /sessions.html does not load');
 await page.locator('.ux-session-desk').waitFor();
 // The original governed editor remains accessible; retired visual shells do not.
 const governedResponse=await page.goto(base+'/legacy.html',{waitUntil:'domcontentloaded'});
 assert(governedResponse?.ok(),'Original governed engineering workbench is unavailable');
 assert.match(await page.title(),/Legacy Engineering Workbench/);
 await page.locator('#root').waitFor();
 for(const retired of ['/dockyard2.html','/naval-lab.html','/atlas.html']){
  await page.goto(base+retired,{waitUntil:'domcontentloaded'});
  await page.waitForURL(url=>url.pathname==='/' && !url.search,{timeout:10000});
  await page.getByRole('heading',{name:'Open the real engineering workspace.'}).waitFor();
  assert.match(await page.title(),/Naval AI Lab.*Engineering Sessions/);
 }
 // Preserve old deep links to protected technical modules through the root router.
 await page.goto(base+'/dockyard2.html?module=cad-studio',{waitUntil:'domcontentloaded'});
 await page.waitForURL(url=>url.pathname==='/legacy.html' && url.searchParams.get('module')==='cad-studio',{timeout:10000});
 // Simulate a missing dynamically imported session chunk. The default route
 // must retain usable links instead of leaving a blank application shell.
 const failurePage=await browser.newPage();
 let blocked=0;
 try{
  await failurePage.route('**/assets/App-*.js',route=>{blocked++;return route.abort('failed')});
  const response=await failurePage.goto(base+'/',{waitUntil:'domcontentloaded'});
  assert(response?.ok(),'Cannot serve the recovery HTML');
  await failurePage.getByRole('heading',{name:'Engineering Sessions could not open.'}).waitFor();
  assert(blocked>0,'The recovery test did not intercept the session feature bundle');
  assert(await failurePage.getByRole('link',{name:'Open original engineering lab'}).isVisible());
 }finally{await failurePage.close()}
 assert.deepEqual(errors,[],'Unexpected browser runtime errors');
 console.log('PASS — live-first authentication, explicit demo tour, canonical redirects, governed editor, recovery, 5 modes, 24 protected tools and responsive viewports.');
}finally{await browser.close();}
