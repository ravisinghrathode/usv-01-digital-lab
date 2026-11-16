import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateRegister,renderOverview} from '../scripts/external-software-register.mjs';
const data=JSON.parse(await readFile(fileURLToPath(new URL('../src/data/externalSoftwareRegister.json',import.meta.url)),'utf8'));
const overview=await readFile(fileURLToPath(new URL('../docs/EXTERNAL_SOFTWARE_OVERVIEW.md',import.meta.url)),'utf8');
const expected=[
  {
    "id": "EXT-101",
    "repository": "crewAIInc/crewAI",
    "commit": "96c4d85b6423dd06b7f1c38f12dd472399c6ce43",
    "tree": "9c8503b4211110420143306f9beca366a773c9f8",
    "licenseBlob": "a6ee25527ec07201e4373fcbf89f128f304a6f2e"
  },
  {
    "id": "EXT-102",
    "repository": "browser-use/browser-use",
    "commit": "4b5b1b0aa0ab45a1d6a2a31984d37d3e748c0134",
    "tree": "401428e7ca7d478550c62b3926c30781efe068fc",
    "licenseBlob": "1ea3836ce58a4cd32c90c0b4f4e736d840d23780"
  },
  {
    "id": "EXT-103",
    "repository": "langgenius/dify",
    "commit": "0ba3c9d76887b6c89c943abaab87f8d86c27d612",
    "tree": "08515a12769dc1838d56ffa5a1411d97d8d486e7",
    "licenseBlob": "329ee302875f292fdd11e12e830562d0be9ade1c"
  },
  {
    "id": "EXT-104",
    "repository": "langchain-ai/langgraph",
    "commit": "02f2c2e6c992ffccce9e9129781fdd04f015c6fa",
    "tree": "17836360185df72528d58c50fea086b03dfe2326",
    "licenseBlob": "fc0602feecdd6748623c852ab534e1ca612673c7"
  },
  {
    "id": "EXT-105",
    "repository": "microsoft/agent-framework",
    "commit": "cf5ea1979562efaf993fb3d37958de0c52d612cc",
    "tree": "69bc2a268e8a71929f9e3cd67835c5780e1e6ea0",
    "licenseBlob": "9e841e7a26e4eb057b24511e7b92d42b257a80e5"
  },
  {
    "id": "EXT-106",
    "repository": "OpenHands/OpenHands",
    "commit": "5ed4ffa5ac2509e479acc12b83247fbb4c3612c8",
    "tree": "8b5f706d37e2e68258fc7bc062aa6826e7a7102b",
    "licenseBlob": "f6f60f52368bcc96f82fbe59ec65049c2c3af9db"
  },
  {
    "id": "EXT-107",
    "repository": "modelcontextprotocol/python-sdk",
    "commit": "77001c96f9507be0f4d009b83210a384a5e08bda",
    "tree": "b10bdc065b26d148271554674303868bb943d495",
    "licenseBlob": "3d48435454b105021b4f777c11b6b07d8d2ffea3"
  }
];
test('replacement source catalog retains existing 90 and seven independent immutable pins',()=>{
  validateRegister(data);
  assert.equal(data.records.length,97);
  const seven=data.records.filter(r=>expected.some(e=>e.id===r.id));
  assert.equal(seven.length,7);
  for(const e of expected){
    const r=seven.find(x=>x.id===e.id);
    assert.ok(r,'missing '+e.id);
    assert.equal(r.repository,e.repository);
    assert.equal(r.source.commit,e.commit);
    assert.equal(r.source.tree,e.tree);
    assert.equal(r.evidence[0].url,'https://github.com/'+e.repository+'/blob/'+e.commit+'/LICENSE');
    assert.match(e.licenseBlob,/^[0-9a-f]{40}$/);
    assert.equal(r.lifecycle,'DISCOVERED');
    assert.equal(r.adoption,'NOT_APPROVED');
    assert.equal(r.installation,'NOT_INSTALLED');
    assert.equal(r.securityReview,'NOT_PERFORMED');
    assert.equal(r.engineeringValidation,'NOT_VALIDATED');
    assert.equal(r.license.review,'PENDING');
    assert.equal(r.registeredToolId,null);
    assert.deepEqual(r.actualUsage,[]);
    assert.equal(r.ownerAgent,'A26');
  }
});
test('generated overview stays exactly synchronized with 97 public-source records',()=>{
  assert.equal(overview,renderOverview(data));
  assert.match(overview,/Overview: 97 tracked \| 89 discovered \| 8 evaluating/);
  assert.match(overview,/0 evidenced usage events/);
});
test('Dify modified license cannot be treated as a permissive legal approval',()=>{
  const r=data.records.find(x=>x.id==='EXT-103');
  assert.equal(r.license.spdxMetadata,'NOASSERTION');
  assert.equal(r.license.review,'PENDING');
  assert.match(r.nextAction,/LEGAL HOLD/);
});
