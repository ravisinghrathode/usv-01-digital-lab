import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.ATLAS_BASE_URL||'http://127.0.0.1:3000';
const output=process.env.ATLAS_SCREENSHOTS||'artifacts/atlas';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 const load=async()=>{
  await page.goto(base+'/atlas.html#studio',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/USV-01.*design workspace/i}).waitFor();
  await page.locator('.at-runway').waitFor();
 };
 await load();
 await page.screenshot({path:path.join(output,'atlas-initial-1440.png'),fullPage:false});
 assert.equal(await page.locator('.at-global-nav').count(),1);
 assert.equal(await page.locator('.at-product-rail').count(),1);
 assert.equal(await page.locator('.at-product-inspector').count(),1);
 assert.equal(await page.locator('.at-runway').count(),1);
 assert.equal(await page.locator('.at-hero-grid').count(),0,'Legacy hero card grid must not return');
 const shelf=await page.locator('.at-product-rail').boundingBox();
 const sheet=await page.locator('.at-sheet').boundingBox();
 const inspector=await page.locator('.at-product-inspector').boundingBox();
 const runway=await page.locator('.at-runway').boundingBox();
 assert(shelf&&sheet&&inspector&&runway,'All primary regions must have dimensions');
 assert(Math.abs(shelf.y-sheet.y)<=4 && Math.abs(sheet.y-inspector.y)<=4,'Product shelf, canvas and inspector must form a continuous desktop drafting board');
 assert(runway.y>=sheet.y+sheet.height-3,'Simulation runway must follow product board');
 assert(sheet.width>shelf.width*2,'Vessel drawing sheet should dominate the instrument panel');
 // An assembly selection updates its adjacent source inspector.
 await page.getByRole('group',{name:'Select product assembly'}).getByRole('button',{name:/Hull/}).click();
 await page.getByRole('heading',{name:'Hull structure'}).waitFor();
 await page.getByRole('group',{name:'Drawing projection'}).getByRole('button',{name:'Section'}).click();
 assert.equal(await page.getByRole('group',{name:'Drawing projection'}).getByRole('button',{name:'Section'}).getAttribute('aria-pressed'),'true');
 // File never leaves the browser. The bounded geometry inspector is visibly distinct from CAD.
 await page.locator('input[type="file"]').setInputFiles({name:'local-test.obj',mimeType:'text/plain',buffer:Buffer.from('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3')});
 await page.getByText('Local OBJ: local-test.obj').waitFor();
 assert.equal(await page.getByRole('button',{name:'Rotate model left'}).count(),1);
 await page.getByRole('button',{name:'Rotate model left'}).click();
 await page.getByRole('group',{name:'Drawing projection'}).getByRole('button',{name:'Plan'}).click();
 assert.equal(await page.getByRole('button',{name:'Rotate model left'}).count(),0);
 // The run selection is a real register-backed control, not a decorative chart.
 const tabs=page.locator('.at-run-tab');
 assert((await tabs.count())>0,'Expected illustrative simulation records');
 if(await tabs.count()>1){
   await tabs.nth(1).click();
   assert.equal(await tabs.nth(1).getAttribute('aria-pressed'),'true');
 }
 // Native search and directory should honor Escape/focus and 24 original tools.
 await page.keyboard.press('Control+k');
 const search=page.getByRole('dialog',{name:'Global engineering search'});
 await search.waitFor();
 await page.getByRole('searchbox',{name:'Search the loaded engineering records'}).fill('hydrodynamics');
 assert((await page.locator('.at-results a').count())>0,'Search should return technical sources');
 await page.keyboard.press('Escape');
 await search.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Search engineering records and workspaces'}).focus();
 await page.getByRole('button',{name:'24 modules'}).click();
 const directory=page.getByRole('dialog',{name:'All engineering modules'});
 await directory.waitFor();
 assert.equal(await directory.locator('a[href^="/legacy.html?module="]').count(),24);
 await page.keyboard.press('Escape');
 await directory.waitFor({state:'hidden'});
 for(const [name,heading] of [
   ['Simulations','Physics laboratory'],
   ['Evidence','Evidence browser'],
   ['Agent directorate','Agent directorate'],
   ['Library','Knowledge library']
 ]){
   await page.getByRole('navigation',{name:'Lab workspaces'}).getByRole('button',{name}).click();
   await page.getByRole('heading',{name:heading,exact:true}).waitFor();
 }
 await page.getByRole('navigation',{name:'Lab workspaces'}).getByRole('button',{name:'Vessel studio'}).click();
 await page.getByRole('heading',{name:/USV-01.*design workspace/i}).waitFor();
 for(const [width,height] of [[1440,900],[1280,800],[1024,800],[768,1024],[390,844],[320,700]]){
  await page.setViewportSize({width,height});
  await load();
  await page.evaluate(()=>{document.activeElement?.blur?.();window.scrollTo(0,0);});
  const dimensions=await page.evaluate(()=>({visible:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(dimensions.scroll<=dimensions.visible+2,'Unexpected horizontal overflow at '+width+': '+JSON.stringify(dimensions));
  assert(await page.locator('.at-drawing-surface').isVisible(),'No product drawing at '+width);
  assert(await page.locator('.at-runway').isVisible(),'Simulation dock missing at '+width);
  await page.screenshot({path:path.join(output,'atlas-'+width+'-viewport.png'),fullPage:false,animations:'disabled'});
  await page.screenshot({path:path.join(output,'atlas-'+width+'-full.png'),fullPage:true,animations:'disabled'});
 }
 await page.setViewportSize({width:1280,height:800});
 await page.evaluate(()=>{document.documentElement.style.zoom='2';});
 const doubled=await page.evaluate(()=>({visible:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert(doubled.scroll<=doubled.visible+2,'CSS 200% zoom overflow');
 await page.screenshot({path:path.join(output,'atlas-css-zoom-200.png'),fullPage:false,animations:'disabled'});
 await page.evaluate(()=>{document.documentElement.style.zoom='';});
 assert.deepEqual(errors,[],'Page exception in isolated Chromium');
 console.log('PASS — Atlas topology, product selection, local OBJ, run selection, search, all 24 modules, 5 rooms, 6 viewports and CSS 200% zoom.');
}finally{
 await browser.close();
}
