/**
 * Unauthenticated UI smoke test in isolated Chromium. No credentials,
 * network exfiltration or fabrication of engineering results.
 * Run by GitHub Actions with pinned Playwright 1.56.1.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.LAB_BASE_URL||'http://127.0.0.1:3000';
const output=process.env.LAB_SCREENSHOTS||'artifacts/naval-ai-lab';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',error=>failures.push(error.message));
 const load=async()=>{
   await page.goto(base+'/naval-lab.html#lab',{waitUntil:'domcontentloaded'});
   await page.getByRole('heading',{name:'Naval AI Lab',exact:true}).waitFor();
   await page.locator('.nl-hero-grid').waitFor();
 };
 await load();
 assert.equal(await page.locator('.nl-hero-grid').count(),1);
 assert.equal(await page.getByRole('heading',{name:'Product workstage'}).count(),1);
 assert.equal(await page.getByRole('heading',{name:'Simulation workbench'}).count(),1);
 assert.match(await page.locator('.nl-source-meta').innerText(),/Illustrative|sample|Loading|Server/i);
 const hero=await page.locator('.nl-hero-grid').boundingBox();
 const model=await page.locator('.nl-product').boundingBox();
 const simulation=await page.locator('.nl-simulation').boundingBox();
 assert(hero&&model&&simulation,'Core product and simulation workstages must be visible');
 assert(Math.abs(model.y-simulation.y)<4,'Product and simulation must share the first desktop row');
 assert(model.width>simulation.width,'Product must be visually dominant');

 await page.getByRole('group',{name:'Drawing view'}).getByRole('button',{name:'Plan'}).click();
 assert.equal(await page.getByRole('group',{name:'Drawing view'}).getByRole('button',{name:'Plan'}).getAttribute('aria-pressed'),'true');
 await page.getByRole('group',{name:'Select conceptual assembly'}).getByRole('button',{name:'Hull & structure'}).click();
 assert.equal(await page.getByRole('group',{name:'Select conceptual assembly'}).getByRole('button',{name:'Hull & structure'}).getAttribute('aria-pressed'),'true');
 await page.keyboard.press('Control+k');
 await page.getByRole('dialog',{name:'Search the naval engineering lab'}).waitFor();
 await page.getByRole('searchbox',{name:'Search simulation, requirement, risk and module records'}).fill('hydrodynamics');
 assert((await page.locator('.nl-search-hits a').count())>0,'Search should find engineering records');
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog',{name:'Search the naval engineering lab'}).isVisible(),false);
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Search records and modules');

 await page.getByRole('button',{name:'All modules'}).click();
 const catalogue=page.getByRole('dialog',{name:'Engineering module catalogue'});
 await catalogue.waitFor();
 assert.equal(await catalogue.locator('a[href^="/legacy.html?module="]').count(),24,'All registered modules must be reachable');
 await page.keyboard.press('Escape');
 assert.equal(await catalogue.isVisible(),false);

 await page.getByRole('navigation',{name:'Naval laboratory workspaces'}).getByRole('button',{name:'Simulations'}).click();
 await page.getByRole('heading',{name:'Simulation & physics laboratory'}).waitFor();
 assert(await page.locator('.nl-data-table').count()===1,'Simulation register must be visible');
 await page.getByRole('navigation',{name:'Naval laboratory workspaces'}).getByRole('button',{name:'Evidence'}).click();
 await page.getByRole('heading',{name:'Engineering evidence'}).waitFor();
 assert(await page.locator('.nl-evidence-detail').count()===1);
 await page.getByRole('navigation',{name:'Naval laboratory workspaces'}).getByRole('button',{name:'Agents'}).click();
 await page.getByRole('heading',{name:'Engineering agents'}).waitFor();
 assert(await page.getByText('Human-controlled approval').isVisible());
 
 for(const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844],[320,700]]){
   await page.setViewportSize({width,height});
   await load();
   await page.evaluate(()=>document.fonts.ready);
   const dimensions=await page.evaluate(()=>({
     clientWidth:document.documentElement.clientWidth,
     scrollWidth:document.documentElement.scrollWidth
   }));
   assert(dimensions.scrollWidth<=dimensions.clientWidth+2,'Horizontal overflow at '+width+'px: '+JSON.stringify(dimensions));
   const box=await page.locator('.nl-viewport').boundingBox();
   assert(box && box.width>0 && box.height>=280,'Hero vessel stage clipped at '+width+'px');
   const nav=page.getByRole('navigation',{name:'Mobile workspaces'});
   if(width<=880)assert(await nav.isVisible(),'Mobile nav missing at '+width);
   else assert(!(await nav.isVisible()),'Mobile nav incorrectly visible at '+width);
   await page.screenshot({path:path.join(output,'naval-ai-lab-'+width+'.png'),fullPage:true,animations:'disabled'});
   if(width===390){
     await nav.getByRole('button',{name:'Simulations'}).click();
     await page.getByRole('heading',{name:'Simulation & physics laboratory'}).waitFor();
     await nav.getByRole('button',{name:'Lab',exact:true}).click();
     await page.getByRole('heading',{name:'Naval AI Lab',exact:true}).waitFor();
   }
 }
 // This is browser CSS zoom, not an OS-level 200% accessibility/AT acceptance.
 await page.setViewportSize({width:1280,height:800});
 await page.evaluate(()=>{document.documentElement.style.zoom='2';});
 const zoom=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
 assert(zoom.s<=zoom.w+2,'CSS 200% zoom has horizontal overflow');
 await page.screenshot({path:path.join(output,'naval-ai-lab-css-zoom-200.png'),fullPage:true,animations:'disabled'});
 await page.evaluate(()=>{document.documentElement.style.zoom='';});
 assert.deepEqual(failures,[],'Uncaught runtime page errors');
 console.log('Naval AI Lab Chromium smoke: PASS. Five viewports, visible interactions and source disclaimers.');
} finally {
 await browser.close();
}
