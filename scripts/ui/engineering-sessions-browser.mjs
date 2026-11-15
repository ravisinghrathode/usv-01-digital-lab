/**
 * NAL-UX-BL-001 V2: browser acceptance of both fidelity structure and functionality.
 * No credentials, real solver execution or engineering writes.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const base=process.env.SESSIONS_BASE_URL||'http://127.0.0.1:3000';
const output=process.env.SESSIONS_ARTIFACTS||'artifacts/engineering-sessions';
mkdirSync(output,{recursive:true});
const expectedArtwork=[
 'public/sessions/media/usv-reference.png',
 'public/sessions/media/usv-reference-plan.png',
 'public/sessions/media/usv-candidate.png',
 'public/sessions/media/usv-candidate-plan.png'
];
const artworkBuilt=expectedArtwork.every(existsSync);
if(!artworkBuilt)console.warn('ORIGINAL 3D ASSETS PENDING: asset workflow has not yet committed four images; verify separately before visual sign-off');
const browser=await chromium.launch({headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 const mode=(name)=>page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button',{name,exact:true});
 await page.goto(base+'/sessions.html#worktable',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:/USV-01.*product investigation/}).waitFor();
 assert(await page.getByText('INTERACTIVE UX PROTOTYPE').isVisible());
 assert(await page.locator('.vf-product-hero').count()===1);
 assert(await page.locator('.vf-relationship-flow').count()===1);
 assert(await page.locator('.vf-investigation-inspector').count()===1);
 const hero=await page.locator('.vf-product-hero').boundingBox();
 const inspector=await page.locator('.vf-investigation-inspector').boundingBox();
 assert(hero&&inspector&&hero.width>inspector.width*1.65,'Product must be the hero, inspector secondary');
 assert(Math.abs(hero.y-inspector.y)<6,'Product and contextual information should align');
 await page.getByRole('group',{name:'Conceptual component focus'}).getByRole('button',{name:'Hull & buoyancy'}).click();
 assert(await page.getByText('Focus: Hull & buoyancy').isVisible());
 await page.getByRole('group',{name:'Model view selection'}).getByRole('button',{name:'Plan'}).click();
 assert.equal(await page.getByRole('group',{name:'Model view selection'}).getByRole('button',{name:'Plan'}).getAttribute('aria-pressed'),'true');
 if(artworkBuilt){
  const img=page.locator('.vf-hero-render img');
  await img.waitFor();
  await img.evaluate(el=>el.decode());
  assert((await img.evaluate(el=>el.naturalWidth))>1400,'Original Blender model render did not load');
  assert((await img.getAttribute('src')).includes('-plan.png'),'Plan view must use actual plan render');
 }
 await page.getByRole('group',{name:'Model view selection'}).getByRole('button',{name:'3D view'}).click();
 await page.getByRole('group',{name:'Worktable detail'}).getByRole('button',{name:'Relations'}).click();
 assert(await page.getByText('Related engineering records').isVisible());
 await page.getByRole('group',{name:'Worktable detail'}).getByRole('button',{name:'Inspector'}).click();
 await page.locator('.vf-inspector-vessel button').first().click();
 const inspectorDialog=page.getByRole('dialog',{name:'Selected object context inspector'});
 await inspectorDialog.waitFor();
 assert(await inspectorDialog.getByText('Demonstration-only').isVisible());
 await page.getByRole('button',{name:'Close context inspector'}).click();
 await inspectorDialog.waitFor({state:'hidden'});
 await page.evaluate(()=>{document.activeElement?.blur?.();window.scrollTo(0,0)});
 await page.screenshot({path:path.join(output,'sessions-worktable-1440.png'),fullPage:false,animations:'disabled'});
 // Design: different geometry layout; synchronized real camera view switching.
 await mode('Design').click();
 await page.getByRole('heading',{name:'Configuration comparison'}).waitFor();
 assert.equal(await page.locator('.vf-design-scene').count(),2);
 assert(await page.getByText('Performance difference cannot be calculated yet.').isVisible());
 await page.getByRole('group',{name:'Reference model projection'}).getByRole('button',{name:'Plan view'}).click();
 assert.equal(await page.getByRole('group',{name:'Reference model projection'}).getByRole('button',{name:'Plan view'}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Synchronized views'}).click();
 await page.getByRole('button',{name:'Toggle B projection'}).click();
 await page.getByRole('button',{name:'Highlight hulls'}).click();
 assert.equal(await page.getByRole('button',{name:'Highlight on'}).getAttribute('aria-pressed'),'true');
 if(artworkBuilt){
  assert(await page.locator('.vf-design-image img[src*="usv-reference-plan.png"]').count()===1);
  assert(await page.locator('.vf-design-image img[src*="usv-candidate.png"]').count()===1);
 }
 await page.screenshot({path:path.join(output,'sessions-design-1440.png'),fullPage:false,animations:'disabled'});
 // Experiment: real cinematic concept layer, but no invented CFD results.
 await mode('Experiment').click();
 await page.getByRole('heading',{name:'Physics investigation'}).waitFor();
 assert(await page.locator('.vf-immersive-stage').count()===1);
 assert.equal(await page.locator('.vf-plot-slot').count(),3);
 assert(await page.getByText('Source-backed result required').isVisible());
 assert(await page.getByText('Ocean background is decorative—not a CFD field.').isVisible());
 await page.locator('.vf-run-stack button').nth(2).click();
 assert(await page.locator('.vf-result-bar').count()===0,'No fake source/result progress bar should appear');
 await page.screenshot({path:path.join(output,'sessions-experiment-1440.png'),fullPage:false,animations:'disabled'});
 // Decide: model thumbnail in evidence argument and explicit human authority.
 await mode('Decide').click();
 await page.getByRole('heading',{name:'Engineering decision room'}).waitFor();
 assert(await page.locator('.vf-decision-graph').count()===1);
 assert(await page.getByText('NOT APPROVED').isVisible());
 await page.getByRole('group',{name:'Evidence argument view'}).getByRole('button',{name:'Source list'}).click();
 assert(await page.getByText('Required source relationships').isVisible());
 await page.getByRole('group',{name:'Evidence argument view'}).getByRole('button',{name:'Relationships'}).click();
 await page.screenshot({path:path.join(output,'sessions-decide-1440.png'),fullPage:false,animations:'disabled'});
 // Notebook: local draft only; preserved study across modes, no dispatch.
 await page.getByRole('button',{name:'Draft verification task'}).click();
 await page.getByRole('heading',{name:'Investigation journal'}).waitFor();
 assert(await page.getByText('Next technical verification step').isVisible());
 const note=page.getByRole('textbox',{name:'Add an observation to this preview'});
 await note.fill('Check launch-and-recovery load cases under the same design loading assumptions.');
 await page.getByRole('button',{name:'Add local observation'}).click();
 assert(await page.getByText('Check launch-and-recovery load cases under the same design loading assumptions.').isVisible());
 await page.screenshot({path:path.join(output,'sessions-notebook-1440.png'),fullPage:false,animations:'disabled'});
 await mode('Experiment').click();
 assert.equal(await page.locator('.vf-run-stack button[aria-pressed="true"]').count(),1);
 await mode('Notebook').click();
 assert(await page.getByText('Next technical verification step').isVisible(),'Draft note must persist');
 // Global source access to all protected workspaces.
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
 // Screenshot evidence across layouts, including distinct mobile physics/decision screens.
 for(const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[320,700]]){
   await page.setViewportSize({width,height});
   await mode('Worktable').click();
   await page.evaluate(()=>{document.activeElement?.blur?.();window.scrollTo(0,0)});
   const dims=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert(dims.scroll<=dims.viewport+2,'Horizontal overflow at '+width+' '+JSON.stringify(dims));
   const stage=await page.locator('.vf-product-hero').boundingBox();
   assert(stage&&stage.y+Math.min(stage.height*.45,180)<height,'Vessel not meaningfully in first viewport at '+width);
   assert(await page.locator('.es-session-spine').isVisible(),'Investigation context disappeared at '+width);
   assert.equal(await page.getByRole('navigation',{name:'Engineering session modes'}).getByRole('button').count(),5);
   await page.screenshot({path:path.join(output,'sessions-worktable-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
   await page.screenshot({path:path.join(output,'sessions-worktable-'+width+'-full.png'),fullPage:true,animations:'disabled'});
   if(width===390){
    await mode('Design').click();
    await page.screenshot({path:path.join(output,'sessions-design-390.png'),fullPage:false,animations:'disabled'});
    await mode('Experiment').click();
    await page.screenshot({path:path.join(output,'sessions-experiment-390.png'),fullPage:false,animations:'disabled'});
    await mode('Decide').click();
    await page.screenshot({path:path.join(output,'sessions-decide-390.png'),fullPage:false,animations:'disabled'});
   }
 }
 await page.setViewportSize({width:1280,height:800});
 await mode('Worktable').click();
 await page.evaluate(()=>{document.documentElement.style.zoom='2'});
 const zoom=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert(zoom.scroll<=zoom.viewport+2,'CSS 200% zoom overflow '+JSON.stringify(zoom));
 await page.screenshot({path:path.join(output,'sessions-css-zoom-200.png'),fullPage:false,animations:'disabled'});
 await page.evaluate(()=>{document.documentElement.style.zoom=''});
 assert.deepEqual(errors,[],'Uncaught page runtime exception');
 console.log('PASS: Five visual modes, selected objects, original 3D assets '+(artworkBuilt?'verified':'pending')+', local tasks, source truth, 24 modules, 5 widths and CSS zoom.');
}finally{await browser.close();}
