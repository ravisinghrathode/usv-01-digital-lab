/**
 * Standard Naval AI Lab browser acceptance after the Engineering Sessions
 * cutover. /naval-lab.html is a compatibility redirect, NOT a second app.
 * Run in isolated Chromium; no credentials or engineering authority.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LAB_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.LAB_SCREENSHOTS || 'artifacts/naval-ai-lab';
await mkdir(output, { recursive:true });
const browser = await chromium.launch({ headless:true });
const failures=[];
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',error=>failures.push(error.message));
  page.on('console',message=>{if(message.type()==='error') failures.push('console: '+message.text());});
  await page.goto(base+'/naval-lab.html#lab',{waitUntil:'domcontentloaded'});
  await page.getByRole('navigation',{name:'Engineering session modes'}).waitFor({timeout:20000});
  assert.equal(new URL(page.url()).pathname,'/','Legacy naval-lab route must redirect to the current standard interface');
  const nav=page.getByRole('navigation',{name:'Engineering session modes'});
  for(const mode of ['Worktable','Design','Experiment','Decide','Notebook']){
    assert.equal(await nav.getByRole('button',{name:mode,exact:true}).count(),1,mode+' workspace missing');
  }
  // The Academy is in the actual current interface, not the superseded
  // Lab3 component or a synthetic illustration.
  await nav.getByRole('button',{name:'Notebook',exact:true}).click();
  await page.getByRole('heading',{name:'Agent Academy',exact:true}).waitFor({timeout:20000});
  const academy=page.getByRole('region',{name:'Agent Academy — 26 specialist learning programmes'});
  const curriculum=academy.getByRole('combobox',{name:'Inspect a specialist curriculum'});
  assert.equal(await curriculum.locator('option').count(),26,'All 26 canonical roles need a curriculum');
  assert.match(await academy.innerText(),/NOT QUALIFIED/,'No browser-side qualification badge may be awarded');
  await curriculum.selectOption('A17');
  assert.match(await academy.innerText(),/A17|collision|COLREG|autonomy/i,'A17 specialist syllabus must be selectable');
  await page.screenshot({path:path.join(output,'standard-naval-ai-lab-academy.png'),fullPage:true,animations:'disabled'});
  for (const [width,height] of [[1440,900],[768,1024],[390,844],[320,700]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:path.join(output,'standard-naval-ai-lab-'+width+'.png'),fullPage:false,animations:'disabled'});
    const size=await page.evaluate(()=>({visible:document.documentElement.clientWidth,actual:document.documentElement.scrollWidth}));
    assert(size.actual<=size.visible+2,'Horizontal overflow at '+width+'px: '+JSON.stringify(size));
  }
  assert.deepEqual(failures,[],'Uncaught standard Naval AI Lab runtime errors');
  console.log('Standard Naval AI Lab redirect, five workspaces and all 26 curricula: PASS. No agent certification inferred.');
} finally {
  await browser.close();
}
