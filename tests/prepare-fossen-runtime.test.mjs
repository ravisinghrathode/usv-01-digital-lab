import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prepareRuntime} from '../scripts/prepare-fossen-runtime.mjs';
import {validateSpec,dockerArgs} from '../scripts/repository-integration.mjs';
const specFile=fileURLToPath(new URL('../references/third-party-candidates/fossen-python-vehicle-simulator.json',import.meta.url));
const candidate=JSON.parse(await readFile(specFile,'utf8'));
const fixture={candidate,imageId:'sha256:'+'a'.repeat(64),baseDigest:'python:3.12-slim@sha256:'+'b'.repeat(64),dependencySha:'c'.repeat(64),adapterSha:'d'.repeat(64)};
test('measured local runner pins execution while retaining non-approval',()=>{
 const r=prepareRuntime(fixture);
 assert.equal(validateSpec(r.manifest).runner.image,fixture.imageId);
 assert.equal(r.manifest.cases.length,5);
 const args=dockerArgs(r.manifest,'/tmp/source').join(' ');
 assert.match(args,/--network=none/);
 assert.match(args,/--read-only/);
 assert.match(args,/--pull=never/);
 assert.equal(r.provenance.toolRegistered,false);
 assert.equal(r.provenance.engineeringValidated,false);
 assert.equal(r.provenance.imageType,'DOCKER_LOCAL_IMAGE_CONFIG_ID_NOT_REGISTRY_MANIFEST');
});
test('runner refuses mutable tags, missing hashes and source substitutions',()=>{
 assert.throws(()=>prepareRuntime({...fixture,baseDigest:'python:3.12-slim'}),/Immutable/);
 assert.throws(()=>prepareRuntime({...fixture,dependencySha:'TBD'}),/Measured/);
 assert.throws(()=>prepareRuntime({...fixture,imageId:'python:latest'}),/Measured/);
 assert.throws(()=>prepareRuntime({...fixture,candidate:{...candidate,commit:'b'.repeat(40)}}),/Only immutable/);
 assert.throws(()=>prepareRuntime({...fixture,candidate:{...candidate,runner:{image:'sha256:'+'a'.repeat(64)}}}),/Only immutable/);
});
