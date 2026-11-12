/**
 * Explicit route authorization for the USV-01 laboratory.
 * Authentication is necessary but not sufficient: privileged writes need
 * server-side roles, never user-supplied owner/reviewer fields.
 */
export const KNOWN_ROLES = [
  'ENGINEERING_DIRECTOR', 'LEAD_SYSTEMS_ENGINEER', 'NAVAL_ARCHITECT',
  'STRUCTURAL_ENGINEER', 'ELECTRICAL_ENGINEER', 'VVT_SPECIALIST',
  'SECURITY_ANALYST'
] as const;

export type LabRole = typeof KNOWN_ROLES[number];

const roleSet = new Set<string>(KNOWN_ROLES);
const engineeringWriters = new Set<string>([
  'ENGINEERING_DIRECTOR', 'LEAD_SYSTEMS_ENGINEER', 'NAVAL_ARCHITECT',
  'STRUCTURAL_ENGINEER', 'ELECTRICAL_ENGINEER'
]);
const verificationRoles = new Set<string>([
  'ENGINEERING_DIRECTOR', 'LEAD_SYSTEMS_ENGINEER', 'VVT_SPECIALIST'
]);

export function authorizeLabRoute(method: string, urlPath: string, role: string): boolean {
  if (!roleSet.has(role)) return false;
  const path = urlPath.split('?')[0];
  const verb = method.toUpperCase();

  // Director-only operations modify or reset engineering authority and stored baselines.
  if (
    path === '/auth/sign-gate' ||
    path === '/orchestrator/decide-gate' ||
    path === '/governance/keygen' ||
    path === '/governance/sign-ecr' ||
    path === '/data/reset-demo' ||
    path === '/import' ||
    (verb === 'DELETE' && path.startsWith('/data/'))
  ) return role === 'ENGINEERING_DIRECTOR';

  // Run verification only by authorized verification/lead staff.
  if (verb === 'POST' && path === '/verify/execute') return verificationRoles.has(role);

  // Changes to engineering registers and research adoption are engineering actions.
  if (
    (['POST','PUT','PATCH'].includes(verb) && path.startsWith('/data/')) ||
    (verb === 'POST' && /^\/notebook-lm\/clues\/[^/]+\/adopt$/.test(path))
  ) return engineeringWriters.has(role);

  // Only authenticated staff with engineering authority may submit tasks/workflows.
  if (verb === 'POST' && (
    path === '/agents/execute' ||
    path === '/orchestrator/execute-workflow'
  )) return engineeringWriters.has(role) || verificationRoles.has(role);

  // Network/API-expensive tasks need an authorized operational role.
  if (verb === 'POST' && path === '/usv-intel/scrape')
    return role === 'ENGINEERING_DIRECTOR' || role === 'LEAD_SYSTEMS_ENGINEER';

  // All other API paths are available to authenticated, recognized staff.
  // New mutating routes MUST be explicitly allowed, not silently opened.
  if (!['GET','HEAD','OPTIONS'].includes(verb)) {
    const permitted = new Set(['/auth/verify-gate', '/notebook-lm/chat', '/gemini/generate',
      '/gemini/stream', '/gemini/assist']);
    return verb === 'POST' && permitted.has(path);
  }
  return true;
}
