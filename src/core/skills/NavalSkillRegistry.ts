/**
 * Versioned, locally reviewed USV-01 specialist skill policy.
 *
 * This is a deterministic selection of procedural guidance for existing A01–A26
 * roles. It does NOT load untrusted third-party skills, grant execution permissions,
 * call external providers or promote engineering outputs to accepted baselines.
 * Complete human-readable procedures are in skills/usv01/<id>/SKILL.md.
 */
export const NAVAL_SKILL_REGISTRY_VERSION = 'usv01-specialist-skill-registry/v2' as const;

export interface NavalSkillContract {
  readonly id: string;
  readonly version: '1.0';
  readonly documentPath: string;
  readonly canonicalAgents: readonly string[];
  readonly procedure: string;
  readonly evidenceRequirement: string;
  readonly failClosedOn: string;
}

/** Source-controlled, deliberately short enough for controlled agent prompts. */
export const NAVAL_SKILL_CONTRACTS: readonly NavalSkillContract[] = Object.freeze([
  {
    id: 'marine-requirements-and-standards',
    version: '1.0' as const,
    documentPath: 'skills/usv01/marine-requirements-and-standards/SKILL.md',
    canonicalAgents: ['A01', 'A02', 'A03', 'A04', 'A18', 'A21', 'A24'],
    procedure: 'Trace requirements to verified source editions, exact vessel configuration, standard applicability, owned verification methods and signed decision rights. Unknown mandatory criteria stay TBD.',
    evidenceRequirement: 'Requirement ID, rule applicability, source revision, accountable verifier, test method and missing-evidence register.',
    failClosedOn: 'Unverified standard/threshold, unknown safety constraint, or unsupported compliance claim.'
  },
  {
    id: 'cad-configuration-and-mass-cg',
    version: '1.0' as const,
    documentPath: 'skills/usv01/cad-configuration-and-mass-cg/SKILL.md',
    canonicalAgents: ['A05', 'A06', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13'],
    procedure: 'Bind geometry, payload and mass/CG inputs to one candidate, revision, source SHA and SI coordinate frame; invalidate affected downstream results whenever controlled upstream inputs change.',
    evidenceRequirement: 'Geometry and mass-ledger digests, configuration/revision, load case, unit frame, parameter origins and invalidation receipts.',
    failClosedOn: 'Stale solver receipt, mixed-candidate data, unsupported CG/geometry or preview claimed as approved CAD.'
  },
  {
    id: 'numerical-vnv-and-uncertainty',
    version: '1.0' as const,
    documentPath: 'skills/usv01/numerical-vnv-and-uncertainty/SKILL.md',
    canonicalAgents: ['A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13', 'A14', 'A18', 'A23', 'A24'],
    procedure: 'Declare benchmark and tolerance before measurement; validate solver/geometry version, units, convergence and combined uncertainty; distinguish preliminary calculations from qualified independent review.',
    evidenceRequirement: 'Benchmark/source reference, output digest, actual run receipt, solver settings, tolerance, uncertainty and reviewer qualifications.',
    failClosedOn: 'No executed solver receipt, mismatched geometry SHA, uncalibrated uncertainty or unsupported performance improvement.'
  },
  {
    id: 'marine-safety-and-degraded-modes',
    version: '1.0' as const,
    documentPath: 'skills/usv01/marine-safety-and-degraded-modes/SKILL.md',
    canonicalAgents: ['A04', 'A16', 'A17', 'A19', 'A20', 'A22', 'A24'],
    procedure: 'Evaluate scenario-specific sensor, COLREG, communications-loss, thermal and launch/recovery hazards. Produce advisory analysis only, never helm/throttle/actuator commands or universal zero-thrust logic.',
    evidenceRequirement: 'Hazard ID, scenario, failure effect, safety controls, non-actuating SIL/HIL evidence and independent reviewer.',
    failClosedOn: 'Unknown lookout/sensor state, stale risk evidence, missing maritime acceptance or any autonomous actuation request.'
  },
  {
    id: 'digital-thread-and-evidence-sync',
    version: '1.0' as const,
    documentPath: 'skills/usv01/digital-thread-and-evidence-sync/SKILL.md',
    canonicalAgents: ['A01', 'A02', 'A15', 'A20', 'A21', 'A23', 'A25', 'A26'],
    procedure: 'Link all evidence through immutable configuration and revision IDs. Check source digest, classification and ACL before any Drive/Obsidian synchronization; quarantine all conflicts rather than overwrite.',
    evidenceRequirement: 'Artifact URI and digest, parent revision, classification, permitted destination, graph links and connector execution receipt or dry-run flag.',
    failClosedOn: 'Restricted-data export, missing connector authority, version conflict or model assertion presented as validated evidence.'
  },
  {
    id: 'commissioning-and-acceptance',
    version: '1.0' as const,
    documentPath: 'skills/usv01/commissioning-and-acceptance/SKILL.md',
    canonicalAgents: ['A01', 'A03', 'A14', 'A15', 'A18', 'A19', 'A20', 'A21', 'A22', 'A23', 'A24', 'A25', 'A26'],
    procedure: 'Track 26-agent and M00–M08 readiness using source-pinned evidence; separate offline CI, live signed-in Codex run, independent engineering V&V and authorized human approval.',
    evidenceRequirement: 'Exact source SHA, host receipt, per-role runtime/tool result, review identity and milestone-specific signed acceptance.',
    failClosedOn: 'Synthetic/stale execution presented as current, skipped physical testing, unapproved software promotion or engineering release.'
  },
  {
    id: 'agent-runtime-resilience',
    version: '1.0' as const,
    documentPath: 'skills/usv01/agent-runtime-resilience/SKILL.md',
    canonicalAgents: ['A01', 'A15', 'A18', 'A20', 'A24', 'A25', 'A26'],
    procedure: 'Enforce finite token/time/tool-call budgets, explicit retry classes, idempotent checkpoints and fail-closed signed human approval; never substitute a paid model API when the host fails.',
    evidenceRequirement: 'Source SHA, configuration/revision, task/correlation IDs, checkpoint digest, retry ledger, budget consumption and gate receipt.',
    failClosedOn: 'Unbounded retry, quota overrun, stale checkpoint, duplicate side effect, unapproved credentials/provider or missing signed approval.'
  },
  {
    id: 'cad-to-physics-coupling',
    version: '1.0' as const,
    documentPath: 'skills/usv01/cad-to-physics-coupling/SKILL.md',
    canonicalAgents: ['A01', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13', 'A14', 'A18', 'A21', 'A24'],
    procedure: 'Use one versioned CAD topology and mass/CG source; reconcile SI coordinates, per-discipline load cases and solver input hashes; invalidate downstream physics after any upstream geometry or mass change.',
    evidenceRequirement: 'Geometry and mass/CG SHA-256, candidate/revision, topology, unit/axis contract, invalidation graph and actual solver receipts where executed.',
    failClosedOn: 'Mixed-candidate values, unqualified topology formulas, unversioned geometry, stale numerical receipts or unresolved physical load cases.'
  },
  {
    id: 'agent-qualification-campaign',
    version: '1.0' as const,
    documentPath: 'skills/usv01/agent-qualification-campaign/SKILL.md',
    canonicalAgents: ['A01', 'A02', 'A15', 'A18', 'A23', 'A24', 'A25', 'A26'],
    procedure: 'Qualify 26 roles on frozen controlled cases and adversarial negatives; distinguish CI checks, real host/model execution, qualified independent V&V and human release and measure before/after with uncertainty.',
    evidenceRequirement: '26-role case matrix, exact source/host/model receipts, reference oracle digests, rubric, negative tests, independent reviewer identity and unresolved blockers.',
    failClosedOn: 'Stale or mock run presented as live, LLM self-review called independent, unsourced benchmark, untested role or false engineering release.'
  }
].map(skill => Object.freeze({ ...skill, canonicalAgents: Object.freeze(skill.canonicalAgents) })));

const CANONICAL_AGENT_ID = /^A(?:0[1-9]|1[0-9]|2[0-6])$/;

/** Safe, deterministic routing. Use only a trusted registered AgentSpec.canonicalId. */
export function selectNavalSkillsForAgent(canonicalAgentId: string): readonly NavalSkillContract[] {
  if (!CANONICAL_AGENT_ID.test(canonicalAgentId)) {
    throw new Error('Expected a canonical USV-01 role ID A01–A26.');
  }
  const chosen = NAVAL_SKILL_CONTRACTS.filter(s => s.canonicalAgents.includes(canonicalAgentId));
  if (chosen.length === 0) throw new Error('No approved procedural skill mapping for ' + canonicalAgentId);
  return chosen;
}

/**
 * Append as trusted, source-controlled system guidance at the existing
 * BaseAgent synthesis boundary. Do NOT splice caller-provided skill names
 * or unreviewed Markdown into system instructions.
 */
export function buildNavalSkillSystemGuidance(canonicalAgentId: string): string {
  const chosen = selectNavalSkillsForAgent(canonicalAgentId);
  return [
    '',
    'USV-01 SOURCE-CONTROLLED SPECIALIST PROCEDURES (' + NAVAL_SKILL_REGISTRY_VERSION + '):',
    ...chosen.map(s =>
      '- ' + s.id + '@' + s.version + ': ' + s.procedure +
      ' Evidence required: ' + s.evidenceRequirement +
      ' BLOCK if: ' + s.failClosedOn
    ),
    'These are RESEARCH-ONLY PROCEDURES. Missing evidence is TBD/BLOCKED. Do not invent test, standard or solver receipts.',
    'No specialist skill grants tools, external data-transfer rights, model API credentials, numerical certification, source-control merge or vessel release.',
    'Retain existing exact-SHA provenance, qualified independent review and authenticated human Engineering Director release boundaries.'
  ].join('\n');
}
