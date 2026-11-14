import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateSpec, githubIntake, buildProposal, parseArgs} from '../scripts/repository-integration.mjs';
const manifest = fileURLToPath(new URL('../references/third-party-candidates/fossen-python-vehicle-simulator.json', import.meta.url));
const s = JSON.parse(await readFile(manifest, 'utf8'));

test('first real candidate has an exact immutable upstream pin but no invented runner', () => {
  assert.equal(s.commit, 'a93d1938ba1f78f2580c24c73f003091b2f03cd0');
  assert.equal(s.repository, 'cybergalactic/PythonVehicleSimulator');
  assert.equal(validateSpec(s,{requireRunner:false}).toolId, 'TOOL-EXT-FOSSEN-GNC-SIMULATION');
  assert.equal(s.runner, undefined);
  assert.equal(s.cases, undefined);
  assert.throws(()=>validateSpec(s),/Runner requires/);
  assert.throws(()=>validateSpec({...s,commit:'master'},{requireRunner:false}),/exact 40-hex/);
});
test('incomplete source-only intake cannot pass verification authorization', () => {
  assert.throws(()=>parseArgs(['verify','--spec',manifest]),/--execute/);
  assert.throws(()=>parseArgs(['verify','--spec',manifest,'--execute']),/acknowledge/);
  assert.throws(()=>validateSpec(s),/Runner requires/);
});
test('source-only GitHub intake still checks exact commit and holds software approval', async () => {
  const tree='d'.repeat(40);
  const mock=async url=>({ok:true,json:async()=>url.endsWith(s.commit)
    ? {sha:s.commit,commit:{tree:{sha:tree},author:{date:'2026-09-26T07:55:21Z'}}}
    : {full_name:s.repository,private:false,archived:false,disabled:false,license:{spdx_id:'MIT'},default_branch:'master'}});
  const receipt=await githubIntake(s,mock);
  assert.equal(receipt.tree,tree);
  assert.equal(receipt.adoption,'HOLD_FOR_REVIEW');
  assert.equal(receipt.metadataLicenseIsLegalApproval,false);
});
test('proposal remains non-runnable and never activates an engineering tool',()=>{
  const p=buildProposal(s,{repo:s.repository,commit:s.commit,tree:'b'.repeat(40),inspected:{manifests:[]}});
  assert.equal(p.suggestedIntegration.pinnedImage,'NOT_YET_AVAILABLE');
  assert.equal(p.runnableSpecComplete,false);
  assert.equal(p.toolAutomaticallyRegistered,false);
  assert.equal(p.status,'HOLD_FOR_INDEPENDENT_AND_HUMAN_APPROVAL');
});
test('malformed optional execution spec fails closed even for intake',()=>{
  assert.throws(()=>validateSpec({...s,runner:{image:'python:latest',argv:['python3']}},{requireRunner:false}),/Runner requires/);
  assert.throws(()=>validateSpec({...s,cases:[]},{requireRunner:false}),/reference case/);
});
