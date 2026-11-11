import fs from 'fs';
import path from 'path';

export interface ECRRecord {
  changeId: string;
  originator: string;
  date: string;
  description: string;
  reason: string;
  affectedSubsystem: string;
  affectedRequirements: string[];
  architecturalImpact: string;
  safetyImpact: string;
  cybersecurityImpact: string;
  verificationPlan: string;
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reviewEvidence: string;
  approvalRecord: {
    authorityName: string;
    authorityRole: string;
    decision: 'APPROVED' | 'REJECTED' | 'PENDING';
    signedAt: string;
    notes?: string;
  };
  implementationCommit: string;
  closureStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'IMPLEMENTED' | 'CLOSED';
}

const MANDATORY_SECTIONS = [
  'Change ID',
  'Originator',
  'Date',
  'Description',
  'Reason for Change',
  'Affected Subsystem',
  'Affected Requirements',
  'Architectural Impact',
  'Safety Impact',
  'Cybersecurity Impact',
  'Verification Plan',
  'Risk Assessment',
  'Review Evidence',
  'Approval Record',
  'Implementation Commit',
  'Closure Status'
];

export function validateECRFile(filePath: string): { valid: boolean; errors: string[]; record?: Partial<ECRRecord> } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File does not exist: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const errors: string[] = [];

  for (const section of MANDATORY_SECTIONS) {
    if (!content.includes(section) && !(section === 'Approval Record' && content.includes('Approval'))) {
      errors.push(`Missing mandatory section: "${section}"`);
    }
  }

  // Extract change ID (handling markdown formatting like **Change ID:**)
  const idMatch = content.match(/Change ID:?\*?\*?\s*([A-Za-z0-9-_]+)/i);
  const changeId = idMatch ? idMatch[1].trim() : 'UNKNOWN';

  // Extract risk assessment
  const riskMatch = content.match(/Risk Assessment:?\*?\*?\s*(LOW|MEDIUM|HIGH|CRITICAL)/i);
  const risk = riskMatch ? (riskMatch[1] as any) : undefined;
  if (!risk) {
    errors.push('Risk Assessment must specify LOW, MEDIUM, HIGH, or CRITICAL');
  }

  // Extract approval status
  const approvedMatch = content.match(/Approval Decision:?\*?\*?\s*(APPROVED|REJECTED|PENDING)/i);
  const approvalDecision = approvedMatch ? approvedMatch[1] : 'PENDING';

  return {
    valid: errors.length === 0,
    errors,
    record: {
      changeId,
      riskAssessment: risk,
      approvalRecord: {
        authorityName: 'Engineering Director',
        authorityRole: 'ENGINEERING_DIRECTOR',
        decision: approvalDecision as any,
        signedAt: new Date().toISOString()
      }
    }
  };
}

export function validateAllECRs(dirPath: string): { valid: boolean; results: Record<string, { valid: boolean; errors: string[] }> } {
  if (!fs.existsSync(dirPath)) {
    return { valid: false, results: { [dirPath]: { valid: false, errors: ['Directory not found'] } } };
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md') && f.startsWith('ECR-'));
  const results: Record<string, { valid: boolean; errors: string[] }> = {};
  let allValid = true;

  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const res = validateECRFile(fullPath);
    results[f] = { valid: res.valid, errors: res.errors };
    if (!res.valid) allValid = false;
  }

  return { valid: allValid, results };
}

if (process.argv[1] && process.argv[1].endsWith('ecr-tool.ts')) {
  const ecrDir = path.join(process.cwd(), 'governance', 'ecr');
  console.log(`📋 [ECR Tool] Validating all Engineering Change Requests in ${ecrDir}...`);
  const check = validateAllECRs(ecrDir);

  for (const [file, r] of Object.entries(check.results)) {
    if (r.valid) {
      console.log(`  ✅ ${file}: Valid configuration control record.`);
    } else {
      console.error(`  ❌ ${file}: Configuration non-conformances:`);
      for (const err of r.errors) console.error(`     ↳ ${err}`);
    }
  }

  if (!check.valid) {
    process.exit(1);
  }
}
