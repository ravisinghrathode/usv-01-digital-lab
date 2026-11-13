import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

interface Gate { gate_id: string; status: string; evidence_reference: string | null }
const ledger = JSON.parse(readFileSync(path.join(process.cwd(),'evidence/aut01/acceptance-status.json'),'utf8')) as {
  blocker_id:string; status:string; evidence_class:string;
  code_references:string[]; test_references:string[];requirements:string[];
  gate_evidence:Gate[]; autonomous_navigation_authorized:boolean;
  colregs_compliance_certified:boolean; physical_validation_complete:boolean;
  release_authorized:boolean; closure_authorized:boolean;
  post_merge_nonconformance: {
    status:string; source_pr_head_sha:string; github_ci_conclusion_at_merge_head:string;
    independent_pr_reviewer_submissions_at_inspection:number; director_signature_verified:boolean;
    engineering_release_hold:boolean; effective_branch_protection_verified:boolean;
  };
};
describe('AUT-01 immutable-evidence posture (no unearned approval)',()=>{
 it('binds the correct acceptance ID and non-operational evidence class',()=>{
   expect(ledger.blocker_id).toBe('AUT-01');
   expect(ledger.evidence_class).toBe('SIMULATED_ONLY');
   expect(ledger.status).toBe('SOFTWARE_REMEDIATED_PHYSICAL_VALIDATION_OPEN');
 });
 it('lists all eleven requirement IDs exactly once',()=>{
   expect(new Set(ledger.requirements).size).toBe(11);
   for(let i=1;i<=11;i++)expect(ledger.requirements).toContain(`AUT-REQ-${String(i).padStart(3,'0')}`);
 });
 it('lists readable software and regression sources',()=>{
   for(const file of [...ledger.code_references,...ledger.test_references]){
      expect(file.startsWith('src/core/verification/')||file.startsWith('tests/')).toBe(true);
      expect(existsSync(path.join(process.cwd(),file))).toBe(true);
   }
 });
 it('records every required external validation gate as unresolved',()=>{
   expect(ledger.gate_evidence).toHaveLength(10);
   expect(new Set(ledger.gate_evidence.map(x=>x.gate_id)).size).toBe(10);
   for(const gate of ledger.gate_evidence) {
     expect(gate.gate_id).toMatch(/^AUT-G\d{2}$/);
     expect(['CI_REQUIRED_FINAL_SHA','NOT_SUBMITTED','NOT_EXECUTED']).toContain(gate.status);
     if(!['AUT-G01','AUT-G10'].includes(gate.gate_id))expect(gate.evidence_reference).toBeNull();
   }
 });
 it('records the post-merge AUT-01 governance nonconformance without claiming Director sign-off',()=>{
   const n=ledger.post_merge_nonconformance;
   expect(n.status).toBe('OPEN_PENDING_HUMAN_SAFETY_REVIEW');
   expect(n.source_pr_head_sha).toMatch(/^[a-f0-9]{40}$/);
   expect(n.github_ci_conclusion_at_merge_head).toBe('failure');
   expect(n.independent_pr_reviewer_submissions_at_inspection).toBe(0);
   expect(n.director_signature_verified).toBe(false);
   expect(n.effective_branch_protection_verified).toBe(false);
   expect(n.engineering_release_hold).toBe(true);
 });
 it('never approves control, compliance, physical validation or blocker closure from synthetic tests',()=>{
   expect(ledger.autonomous_navigation_authorized).toBe(false);
   expect(ledger.colregs_compliance_certified).toBe(false);
   expect(ledger.physical_validation_complete).toBe(false);
   expect(ledger.release_authorized).toBe(false);
   expect(ledger.closure_authorized).toBe(false);
 });
});
