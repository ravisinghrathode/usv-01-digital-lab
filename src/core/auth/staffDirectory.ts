/**
 * Authoritative staff identity → role allowlist (CODEOWNERS-protected, reviewed configuration).
 * Contains NO secrets. Credentials are held separately in the scrypt credential store.
 */
export interface StaffMember {
  userId: string;
  userName: string;
  role: string;
}

export const AUTHORIZED_MEMBERS: Record<string, StaffMember> = {
  'usr-eng-dir-8841': { userId: 'usr-eng-dir-8841', userName: 'Chief Naval Architect & Systems Director', role: 'ENGINEERING_DIRECTOR' },
  'usr-lead-sys-01': { userId: 'usr-lead-sys-01', userName: 'Lead Systems Architect', role: 'LEAD_SYSTEMS_ENGINEER' },
  'usr-naval-arch-05': { userId: 'usr-naval-arch-05', userName: 'Senior Hydrodynamics Engineer', role: 'NAVAL_ARCHITECT' },
  'usr-struct-eng-10': { userId: 'usr-struct-eng-10', userName: 'Hull Structural & Composites Engineer', role: 'STRUCTURAL_ENGINEER' },
  'usr-prop-elec-14': { userId: 'usr-prop-elec-14', userName: 'Marine Electrical & Power Systems Engineer', role: 'ELECTRICAL_ENGINEER' },
  'usr-vvt-qa-18': { userId: 'usr-vvt-qa-18', userName: 'Test & Verification Specialist', role: 'VVT_SPECIALIST' },
  'usr-sec-analyst-20': { userId: 'usr-sec-analyst-20', userName: 'Cyber-Physical Security Analyst', role: 'SECURITY_ANALYST' }
};
