import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {checkSourceTree} from '../scripts/repository-integration.mjs';
test('Python setup.cfg dependency declaration captured by SHA256 without execution', async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'usv01-python-manifest-'));
 try {
  await writeFile(path.join(dir,'setup.cfg'),'[options]\ninstall_requires =\n    numpy\n    matplotlib\n');
  const scan=await checkSourceTree(dir);
  assert.equal(scan.fileCount,1);
  assert.equal(scan.manifests[0].path,'setup.cfg');
  assert.match(scan.manifests[0].sha256,/^[0-9a-f]{64}$/);
  assert.equal(scan.securityScan,'NOT_PERFORMED');
 } finally {await rm(dir,{recursive:true,force:true});}
});
