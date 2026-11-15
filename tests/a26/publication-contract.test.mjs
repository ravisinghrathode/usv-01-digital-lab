import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');

test('A26 automatically publishes all typed public evidence without a PR',async()=>{
 const workflow=await read('.github/workflows/a26-public-fleet-discovery.yml');
 const server=await read('src/server/a26ResearchFeed.ts');
 const reader=await read('src/core/intelligence/a26PublicResearchFallback.ts');
 for(const file of ['references/a26-public-review/source-index.json',
   'references/a26-public-review/unified-evidence.json',
   'references/a26-public-review/manifest.json',
   'references/fleet-intelligence/discovery-register.json',
   'references/fleet-intelligence/document-register.json']){
   assert.ok(workflow.includes(file),'Missing public research publication: '+file);
 }
 assert.match(workflow,/BRANCH="research\/live-a26"/);
 assert.match(workflow,/git push origin "HEAD:refs\/heads\/\$BRANCH"/);
 assert.doesNotMatch(workflow,/gh pr create/);
 assert.match(workflow,/engineeringReleaseApproved:false/);
 assert.match(server,/stableResearchBranch/);
 assert.match(server,/fileFromCommit\('references\/a26-public-review\/source-index.json'/);
 assert.match(server,/engineeringReleaseApproved:false/);
 assert.match(reader,/stableSource/);
 assert.match(reader,/source.branch!=='research\/live-a26'/);
});

test('Repository scout automatically publishes public discovery without changing adoption register',async()=>{
 const workflow=await read('.github/workflows/repository-scout.yml');
 const reader=await read('src/core/intelligence/a26RepositoryPublicFeed.ts');
 const view=await read('src/components/RepositoryResearchView.tsx');
 assert.match(workflow,/BRANCH="research\/live-code-repositories"/);
 assert.match(workflow,/references\/live-research\/repository-scout.json/);
 assert.match(workflow,/git push origin "HEAD:refs\/heads\/\$BRANCH"/);
 assert.doesNotMatch(workflow,/gh pr create/);
 assert.doesNotMatch(workflow,/cp "\$PROPOSAL" src\/data\/externalSoftwareRegister.json/);
 assert.match(workflow,/softwareAdoptionApproved:false/);
 assert.match(reader,/validateRepositoryDiscovery/);
 assert.match(reader,/softwareAdoptionApproved!==false/);
 assert.match(view,/getPublicRepositoryDiscovery/);
 assert.match(view,/useState<Lane>\('live'\)/);
});
