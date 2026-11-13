import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { validateSpec, parseArgs, githubIntake, checkSourceTree, stageSource, dockerArgs, assessCase, verifyCandidate, buildProposal } from '../scripts/repository-integration.mjs';

const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const spec = () => ({
  schemaVersion: 1, id: 'sample-tool', repository: 'sample/marine-tool', commit,
  toolId: 'TOOL-EXT-SAMPLE', purpose: 'Research-only isolated maritime analysis function', agents: ['A07','A15','A23'],
  runner: {image: 'example/tool@sha256:' + 'c'.repeat(64), argv: ['node', '/candidate/adapter.mjs']},
  cases: [{id: 'case-one', input: {x: 1}, expected: {value: 2}, absoluteTolerance: {value: 0.01}}]
});
const sandbox = async (fn) => { const dir = await mkdtemp(path.join(os.tmpdir(), 'usv01-integration-test-')); try {return await fn(dir);} finally {await rm(dir, {recursive:true, force:true});} };

test('requires exact source digest, safe name and pinned container image', () => {
  assert.equal(validateSpec(spec()).toolId, 'TOOL-EXT-SAMPLE');
  assert.throws(() => validateSpec({...spec(), commit: 'main'}));
  assert.throws(() => validateSpec({...spec(), repository: '../../local'}));
  assert.throws(() => validateSpec({...spec(), runner: {image: 'node:latest', argv: ['node']}}));
  assert.throws(() => validateSpec({...spec(), agents: ['A27']}));
  assert.throws(() => validateSpec({...spec(), cases: []}));
});

test('execution requires explicit risk acknowledgement and never silently falls back', () => {
  assert.throws(() => parseArgs(['verify','--spec','file.json','--execute']));
  assert.throws(() => parseArgs(['stage','--spec','file.json','--execute','--acknowledge-third-party-risk']));
  assert.throws(() => parseArgs(['verify','--spec','file.json','--acknowledge-third-party-risk']));
  const opts = parseArgs(['verify','--spec','file.json','--execute','--acknowledge-third-party-risk']);
  assert.equal(opts.execute, true);
});

test('GitHub intake confirms public status and exact commit/tree without source execution', async () => {
  const calls = [];
  const mock = async url => {
    calls.push(url);
    return {ok: true, json: async () => url.endsWith('/commits/' + commit) ?
      {sha:commit, commit:{tree:{sha:tree}, author:{date:'2026-01-01T00:00:00Z'}}} :
      {full_name:'sample/marine-tool', private:false, archived:false, disabled:false, license:{spdx_id:'MIT'}, default_branch:'main'}};
  };
  const receipt = await githubIntake(spec(), mock);
  assert.equal(receipt.tree, tree);
  assert.equal(receipt.metadataLicenseIsLegalApproval, false);
  assert.equal(receipt.adoption, 'HOLD_FOR_REVIEW');
  assert.equal(calls.length, 2);
});

test('GitHub intake blocks private repos and revision substitution', async () => {
  const mock = async url => ({ok:true, json:async () => url.endsWith('/commits/'+commit) ? {sha:'f'.repeat(40),commit:{tree:{sha:tree}}} : {full_name:'sample/marine-tool',private:true}});
  await assert.rejects(githubIntake(spec(), mock), /public/);
});

test('source scanner computes manifest hash, rejects symlinks', async () => sandbox(async dir => {
  await writeFile(path.join(dir,'LICENSE'), 'MIT');
  await writeFile(path.join(dir,'README.md'), 'hello');
  const result = await checkSourceTree(dir);
  assert.equal(result.fileCount, 2);
  assert.equal(result.manifests.length, 2);
  assert.equal(result.securityScan, 'NOT_PERFORMED');
  await symlink('LICENSE', path.join(dir, 'indirect-license'));
  await assert.rejects(checkSourceTree(dir), /Symlink/);
}));

test('source staging always checks exact immutable commit and records non-execution', async () => sandbox(async dir => {
  const calls = [];
  const fakeGit = async (program, argv) => {
    assert.equal(program, 'git'); calls.push(argv.join(' '));
    if (argv.includes('HEAD^{tree}')) return {stdout:tree};
    if (argv.includes('HEAD')) return {stdout:commit};
    if (argv.includes('--stage')) return {stdout:''};
    return {stdout:''};
  };
  const result = await stageSource(spec(), dir, fakeGit);
  assert.equal(result.commit,commit);
  assert.equal(result.dynamicExecution,false);
  assert.ok(calls.some(c => c.includes('--no-recurse-submodules')));
  assert.ok(calls.every(c => !c.includes('npm install')));
  assert.equal(JSON.parse(await readFile(path.join(dir,'stage.json'))).approved,false);
}));

test('sandbox policy is read-only, non-root, no network, resource-limited, image digest pinned', () => {
  const flags = dockerArgs(spec(), '/tmp/source').join(' ');
  for (const required of ['--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit=64','--memory=512m','--cpus=1','--user=65534:65534','readonly','@sha256:']) assert.ok(flags.includes(required),required);
  assert.ok(!flags.includes('--privileged'));
});

test('benchmark assessment respects absolute tolerances and fails on missing values', () => {
  const c = spec().cases[0];
  assert.equal(assessCase(c,{value:2.009}).pass,true);
  assert.equal(assessCase(c,{value:2.1}).pass,false);
  assert.equal(assessCase(c,{value:'2'}).pass,false);
  assert.equal(assessCase(c,{}).pass,false);
});

test('verification only runs in sandbox and never registers a tool', async () => sandbox(async dir => {
  const source = path.join(dir,'source','sample-tool');
  await mkdir(source,{recursive:true});
  await writeFile(path.join(dir,'stage.json'),JSON.stringify({repo:spec().repository,commit,tree,source}));
  const called = [];
  const fake = async (program,args) => {
    called.push({program,args});
    if(program==='git') return {stdout:args.includes('HEAD^{tree}')?tree:args.includes('HEAD')?commit:''};
    if(program==='docker') return {stdout:JSON.stringify({value:2.005})};
    throw Error('Unexpected execution');
  };
  const receipt = await verifyCandidate(spec(),dir,fake);
  assert.equal(receipt.status,'REFERENCE_CASES_PASSED_UNVERIFIED_ENGINEERING');
  assert.equal(receipt.engineeringValidation,false);
  assert.equal(receipt.vesselRelease,false);
  assert.equal(called.filter(x=>x.program==='docker').length,1);
  assert.match(called.find(x=>x.program==='docker').args.join(' '),/--network=none/);
}));

test('dirty source tree causes fail-closed rejection before untrusted code runs', async () => sandbox(async dir => {
  const source = path.join(dir,'source','sample-tool');
  await mkdir(source,{recursive:true});
  await writeFile(path.join(dir,'stage.json'), JSON.stringify({repo:spec().repository, commit, tree, source}));
  let dockerCalled = false;
  const fake = async (program,args) => {
    if(program==='docker') {dockerCalled=true; return {stdout:'{}'};}
    if(args.includes('HEAD^{tree}')) return {stdout:tree};
    if(args.includes('HEAD')) return {stdout:commit};
    return {stdout:' M LICENSE'};
  };
  await assert.rejects(verifyCandidate(spec(),dir,fake),/mutated/);
  assert.equal(dockerCalled,false);
}));

test('integration proposal remains HOLD even after passing benchmarks', () => {
  const proposal = buildProposal(spec(),{repo:spec().repository,commit,tree,inspected:{manifests:[]}}, {commit,tree,status:'REFERENCE_CASES_PASSED_UNVERIFIED_ENGINEERING'});
  assert.equal(proposal.status,'HOLD_FOR_INDEPENDENT_AND_HUMAN_APPROVAL');
  assert.equal(proposal.toolAutomaticallyRegistered,false);
  assert.equal(proposal.vesselReleased,false);
  assert.match(proposal.mandatoryReview.verification,/physics/);
});