import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
    authorityId?: string;
    decision: 'APPROVED' | 'REJECTED' | 'PENDING';
    signedAt: string;
    signatureOrHash?: string;
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

  // Extract approver details and cryptographic evidence
  const nameMatch = content.match(/Authority Name:?\*?\*?\s*([^\n\r]+)/i);
  const roleMatch = content.match(/Authority Role:?\*?\*?\s*([^\n\r]+)/i);
  const idMatchUser = content.match(/Authority ID:?\*?\*?\s*([^\n\r]+)/i);
  const signedAtMatch = content.match(/Signed At:?\*?\*?\s*([^\n\r]+)/i);
  const sigMatch = content.match(/(?:Cryptographic Signature \/ Hash|Signature|Approval Hash):?\*?\*?\s*([^\n\r]+)/i);

  const authorityName = nameMatch ? nameMatch[1].trim() : 'Unknown';
  const authorityRole = roleMatch ? roleMatch[1].trim() : 'UNKNOWN';
  const authorityId = idMatchUser ? idMatchUser[1].trim() : undefined;
  const signedAt = signedAtMatch ? signedAtMatch[1].trim() : new Date().toISOString();
  const signatureOrHash = sigMatch ? sigMatch[1].trim() : undefined;

  // Strict human authority boundary: Approved baseline change requires verified Engineering Director and cryptographic signature
  if (approvalDecision === 'APPROVED') {
    if (authorityRole !== 'ENGINEERING_DIRECTOR') {
      errors.push(`Unauthorized approver role "${authorityRole}": Only ENGINEERING_DIRECTOR has authority to approve baseline ECR changes.`);
    }
    if (!authorityId || authorityId.startsWith('[')) {
      errors.push('Approved ECR must record valid Authority ID of the human signatory.');
    }
    if (!signatureOrHash || signatureOrHash.startsWith('[')) {
      errors.push('Approved ECR must record valid Cryptographic Signature or Audit Hash.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    record: {
      changeId,
      riskAssessment: risk,
      approvalRecord: {
        authorityName,
        authorityRole,
        authorityId,
        decision: approvalDecision as any,
        signedAt,
        signatureOrHash
      }
    }
  };
}

export function computeECRPayload(record: { changeId?: string; approvalRecord?: { decision?: string; authorityId?: string; authorityRole?: string; signedAt?: string } }): string {
  return `${record.changeId || ''}:${record.approvalRecord?.decision || ''}:${record.approvalRecord?.authorityId || ''}:${record.approvalRecord?.authorityRole || ''}:${record.approvalRecord?.signedAt || ''}`;
}

export function generateECRSignature(
  changeId: string,
  decision: string,
  authorityId: string,
  authorityRole: string,
  signedAt: string,
  signingKey: string
): string {
  const payload = `${changeId}:${decision}:${authorityId}:${authorityRole}:${signedAt}`;
  const hmac = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
  return `HMAC-SHA256:${hmac}`;
}

export function verifyECRSignature(
  record: NonNullable<ReturnType<typeof validateECRFile>['record']>,
  signingKey?: string
): { verified: boolean; error?: string } {
  if (!record || !record.approvalRecord) {
    return { verified: false, error: 'Missing ECR approval record' };
  }

  const rawSig = record.approvalRecord.signatureOrHash;
  if (!rawSig) {
    return { verified: false, error: 'ECR has no cryptographic signature string' };
  }

  const key = signingKey || process.env.DIRECTOR_SIGNING_KEY || process.env.LAB_SESSION_SECRET || 'usv01-egs-director-closure-key-v1';

  const payload = computeECRPayload(record);
  const expectedHmacHex = crypto.createHmac('sha256', key).update(payload).digest('hex');

  // Strip prefix like HMAC-SHA256: if present
  const providedHex = rawSig.replace(/^HMAC-SHA256:/i, '').trim();

  try {
    const bufProvided = Buffer.from(providedHex, 'hex');
    const bufExpected = Buffer.from(expectedHmacHex, 'hex');
    if (bufProvided.length !== bufExpected.length) {
      return { verified: false, error: `HMAC length mismatch (provided ${bufProvided.length} bytes, expected ${bufExpected.length} bytes)` };
    }
    const match = crypto.timingSafeEqual(bufProvided, bufExpected);
    if (!match) {
      return { verified: false, error: 'HMAC signature verification failed: signature does not match canonical payload' };
    }
    return { verified: true };
  } catch (err: any) {
    return { verified: false, error: `Cryptographic verification error: ${err?.message || err}` };
  }
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
