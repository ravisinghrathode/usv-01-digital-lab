import {describe,expect,it} from 'vitest';
import {collectPublicReferences,CURATED_NAVAL_PUBLICATIONS} from '../src/core/verification/PublicReferenceCollector.ts';

const pdf = new TextEncoder().encode('%PDF-1.7\n'+'NAVAL_TEST_SAMPLE'.repeat(15));
describe('Public research source collector provenance',()=>{
 it('hashes actual returned official-document bytes but cannot grant engineering applicability',async()=>{
  const result=await collectPublicReferences(async()=>({status:200,contentType:'application/pdf',bytes:pdf}));
  expect(result.results).toHaveLength(CURATED_NAVAL_PUBLICATIONS.length);
  expect(result.results.every(x=>x.sha256.startsWith('sha256:')&&x.bytes===pdf.byteLength)).toBe(true);
  expect(result.results.every(x=>x.actualFetchVerified===true)).toBe(true);
  expect(result.results.every(x=>x.applicabilityIndependentlyReviewed===false)).toBe(true);
  expect(result.results.every(x=>x.engineeringReleaseAuthorized===false)).toBe(true);
 });
 it('fails closed on disguised HTML, unauthorized content type and retrieval failure',async()=>{
  await expect(collectPublicReferences(async()=>({status:200,contentType:'text/html',bytes:pdf}))).rejects.toThrow(/invalid/);
  await expect(collectPublicReferences(async()=>({status:200,contentType:'application/pdf',bytes:new TextEncoder().encode('<html>'.repeat(25))}))).rejects.toThrow(/invalid/);
  await expect(collectPublicReferences(async()=>({status:404,contentType:'application/pdf',bytes:pdf}))).rejects.toThrow(/invalid/);
 });
});
