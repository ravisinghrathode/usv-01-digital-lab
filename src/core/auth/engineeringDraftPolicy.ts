/**
 * General register editing is a DRAFT-ONLY capability, not an approval,
 * verification, simulation-completion or engineering-baseline API.
 * Authority-bearing transitions require separate evidence-bound commands.
 *
 * This policy is enforced on the server, never just in the React client.
 */
export class EngineeringWritePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineeringWritePolicyError';
  }
}

const authorityFields = new Set([
  'approvalstate', 'approvalstatus', 'approver', 'approvedby', 'approvedat',
  'approvaldate', 'reviewer', 'reviewerid', 'reviewedby', 'reviewedat',
  'verificationstatus', 'verificationresult', 'validationstatus',
  'evidenceverified', 'evidencehash', 'evidencereceipt',
  'baselineadmitted', 'baselinedigest', 'baselinerevision', 'baselinerev',
  'signature', 'signatures', 'serververifiedsignature', 'signedby', 'signedat',
  'recordstatus', 'releasestatus', 'releaseauthorization',
  'resultstatus', 'runstatus', 'humanapproval', 'isapproved', 'isverified',
  'isillustrative', 'createdby', 'createdat', 'updatedat',
  'projectid', 'userid', 'username', 'author', 'isaiproposal'
]);

const authorityStates = new Set([
  'approved', 'verified', 'accepted', 'executed', 'completed', 'qualified',
  'signed', 'released', 'certified', 'validated', 'closed',
  'approved baseline', 'passed', 'admitted', 'production'
]);

function normalizedKey(key: string): string {
  return key.replace(/[\s_-]/g, '').toLowerCase();
}

function isAuthorityState(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.toLowerCase().trim().replace(/[_-]+/g, ' ');
  return authorityStates.has(normalized) || /^(approved|verified|accepted|signed|released|certified|admitted)[ -]/.test(normalized);
}

function validateTree(value: unknown, depth = 0): void {
  if (depth > 12) throw new EngineeringWritePolicyError('Engineering draft nesting limit exceeded.');
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const member of value) validateTree(member, depth + 1);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw new EngineeringWritePolicyError('Dangerous object field prohibited.');
    }
    if (authorityFields.has(normalized) || (normalized.endsWith('status') && isAuthorityState(nested))) {
      throw new EngineeringWritePolicyError('Authority-bearing field requires a governed command: ' + key);
    }
    validateTree(nested, depth + 1);
  }
}

function isAuthoritativeRecord(record: Record<string, unknown>): boolean {
  return Object.entries(record).some(([key, value]) => {
    const normalized = normalizedKey(key);
    return (normalized === 'status' || normalized.endsWith('status') ||
            normalized === 'approvalstate' || normalized === 'recordstatus') && isAuthorityState(value);
  }) || record.baselineAdmitted === true || record.evidenceVerified === true;
}

/** Sanitize a general CRUD payload. Never trust client-supplied authority or identities. */
export function guardEngineeringDraftWrite(
  collection: string,
  payload: unknown,
  existing?: Record<string, unknown>
): Record<string, unknown> {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new EngineeringWritePolicyError('Expected an engineering draft object.');
  }
  const body = payload as Record<string, unknown>;
  if (Object.keys(body).length > 150 || JSON.stringify(body).length > 131_072) {
    throw new EngineeringWritePolicyError('Engineering draft exceeds input limits.');
  }
  if (existing && isAuthoritativeRecord(existing)) {
    throw new EngineeringWritePolicyError('Controlled or approved records cannot be edited through draft CRUD.');
  }

  // Historical UI forms may submit ID, timestamps and illustrative metadata.
  // Ignore neutral mirrors, but never let them overwrite the stored authority.
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    const normalized = normalizedKey(key);
    if (['id','createdat','updatedat','projectid','createdby'].includes(normalized)) {
      if (existing && normalized === 'id' && value !== existing.id) {
        throw new EngineeringWritePolicyError('Record identity mismatch.');
      }
      continue;
    }
    if (normalized === 'isillustrative') {
      if (typeof value !== 'boolean') throw new EngineeringWritePolicyError('Invalid illustrative flag.');
      continue;
    }
    if (normalized === 'status' && isAuthorityState(value)) {
      throw new EngineeringWritePolicyError('Approval and closure are not permitted through draft CRUD.');
    }
    if (authorityFields.has(normalized)) {
      throw new EngineeringWritePolicyError('Authority-bearing field requires a governed command: ' + key);
    }
    validateTree(value);
    clean[key] = value;
  }

  // New records can only originate in unverified states, regardless of the UI.
  if (!existing) {
    clean.recordStatus = 'DRAFT_UNVERIFIED';
    clean.isIllustrative = false;
    if (collection === 'requirements' || collection === 'verification_plans') clean.status = 'Draft';
    if (collection === 'design_decisions') {
      clean.approvalState = 'Draft';
      clean.reviewer = 'UNASSIGNED';
      clean.isAiProposal = true; // General CRUD cannot establish human authorship.
    }
    if (collection === 'engineering_risks') clean.status = 'Open';
    if (collection === 'simulation_jobs') {
      clean.runStatus = 'Draft';
      clean.validationStatus = 'UNVERIFIED';
      clean.reviewer = 'UNASSIGNED';
    }
    if (collection === 'test_records') {
      clean.resultStatus = 'Inconclusive';
      clean.approvalStatus = 'Draft';
      clean.approver = 'UNASSIGNED';
    }
  }
  return clean;
}
