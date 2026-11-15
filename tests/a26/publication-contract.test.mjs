import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
test('A26 worldwide workflow always publishes all live review source types',async()=>{
 const workflow=await readFile(new URL('.github/workflows/a26-public-fleet-discovery.yml',root),'utf8');
 const server=await readFile(new URL('src/server/a26ResearchFeed.ts',root),'utf8');
 const ui=await readFile(new URL('src/components/GlobalUsvFleetView.tsx',root),'utf8');
 for(const file of ['references/a26-public-review/source-index.json',
   'references/a26-public-review/unified-evidence.json',
   'references/a26-public-review/manifest.json',
   'references/fleet-intelligence/discovery-register.json',
   'references/fleet-intelligence/document-register.json']){
   assert.ok(workflow.includes(file),'A26 publication omission: '+file);
 }
 assert.match(workflow,/git push -u origin "\$BRANCH"/);
 assert.ok(workflow.indexOf('git push -u origin "$BRANCH"') <
   workflow.indexOf('Existing research review PR remains open'),
   'publish review branch before any pending-PR early return');
 assert.match(server,/fileFromCommit\('references\/a26-public-review\/source-index.json'/);
 assert.match(server,/fileFromCommit\('references\/a26-public-review\/manifest.json'/);
 assert.match(server,/engineeringReleaseApproved:false/);
 assert.match(ui,/Vessel source records/);
 assert.match(ui,/setInterval\(\(\)=>\{void refresh\(\);\},120_000\)/);
});
