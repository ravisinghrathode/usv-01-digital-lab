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
     if(gate.gate_id!=='AUT-G01')expect(gate.evidence_reference).toBeNull();
   }
 });
 it('never approves control, compliance, physical validation or blocker closure from synthetic tests',()=>{
   expect(ledger.autonomous_navigation_authorized).toBe(false);
   expect(ledger.colregs_compliance_certified).toBe(false);
   expect(ledger.physical_validation_complete).toBe(false);
   expect(ledger.release_authorized).toBe(false);
   expect(ledger.closure_authorized).toBe(false);
 });
});
