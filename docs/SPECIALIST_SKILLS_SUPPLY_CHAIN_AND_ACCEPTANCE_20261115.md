# USV-01 specialist agent skills — supply-chain and integration review

**Document ID:** USV01-SWE-SKILLS-V1-20261115  
**Date:** 2026-11-15  
**Disposition:** DRAFT SOFTWARE CHANGE — research-only, not a released vessel baseline  
**Source of authority:** `AGENTS.md`, `docs/governance/CONFIGURATION_MANAGEMENT_PLAN.md`, `docs/governance/INDEPENDENT_REVIEW_STANDARD.md` and authenticated exact-head review  
**Proposed project branch:** `feat/usv01-specialist-skills-v1-20261115`

## 1. Scope and outcome

This change adds six externally authored **instruction-only references** to the
user's connected ChatGPT skill library, plus six USV-01-specific, repository-owned
`SKILL.md` procedures. The source-controlled `NavalSkillRegistry.ts` attaches
bounded specialist **method guidance** to existing `BaseAgent` model system
instructions for registered A01–A26 roles. It is deliberately not a skill
interpreter, code runner, external tool loader, LangGraph deployment or privilege
manager.

### Non-negotiable distinction

- A connected-library skill is retrievable instruction text, not a new runtime.
- The in-repo specialist procedure provides the authoritative *full checklist*;
  the TypeScript registry provides the bounded *runtime prompt summary*.
- The two are separate quality layers: selection is deterministic but model
  compliance and engineering accuracy still need evidence.
- Only the existing `AgentSpec.permittedTools` and
  `executionPermissions` authorize tool use. No new tool, model API, paid
  service, external publication or vessel actuation was added.
- A source-code merge does not adopt the draft naval operating charter,
  accept the vessel design, commission an active A01–A26 campaign or grant
  engineering release.

## 2. Third-party supply-chain review (instruction-only)

Machine-readable version-pinned source inventory:
`config/external-skill-sources.json`.

| External skill | Source | License | Permitted local use |
| --- | --- | --- | --- |
| `security-threat-model` | OpenAI `openai/skills` | Apache-2.0 | Explicit security threat-model tasks |
| `security-best-practices` | OpenAI `openai/skills` | Apache-2.0 | Explicit supported-language secure coding reviews |
| `agent-supply-chain` | GitHub community `github/awesome-copilot` | MIT | Supply-chain/document-integrity inspection |
| `build-evidence-map` | GitHub community `github/awesome-copilot` | MIT | Support/contradiction/missing-evidence mapping |
| `eval-engineering` | LangChain `langchain-ai/langchain-skills` | MIT | Reviewable evaluation specifications, with no implicit service connection |
| `skill-creator` | OpenAI `openai/skills` | Apache-2.0 | Author/test owned specialist procedures |

**Actual checks performed before record creation:** source repository identity,
pinned Git commit, original `SKILL.md` name/frontmatter, file size,
published license and text-only storage path. The connected library stores the
skill text with attribution and an explicit no-privilege portability note.
**Not performed:** recursive dynamic dependency audits, sandbox execution of
upstream helper scripts, external vendor authentication, integrity verification
of future source changes, permission grants or comprehensive upstream source
security certification. Therefore the six skills are **instruction references
only**, not audited executable tools. Unused upstream scripts/assets remain out
of scope. Re-review a new exact SHA before importing any script or MCP server.

### Threat boundaries and mitigations

| Threat | Mitigation | Remaining risk |
| --- | --- | --- |
| Poisoned third-party skill content | Pinned source and no executable import; user/project policy takes precedence | Original natural-language instructions remain untrusted; review before re-use |
| User-supplied skill/role override | Select only from `AgentSpec.canonicalId`; never interpolate user role instructions into system guidance | Existing model still receives untrusted context and must not promote it |
| Unsafe skill permission escalation | Registry stores no `permittedTools`; BaseAgent's original tool permission check remains intact | Other runtime/tool endpoints require ongoing audit |
| Unreviewed skill-edit prompt injection | `skills/usv01/`, `AGENTS.md`, `src/core/skills/` and engine paths classified PROTECTED_SOFTWARE_SECURITY | Independent exact-head review still required |
| Stale or fake verification evidence | Exact source/configuration/revision evidence contract and TBD/BLOCKED defaults | Real external/physical validation remains unavailable |
| Restricted document export | External sync skill requires classification/ACL/signed connector receipt | Drive/Obsidian/Gemini live synchronization is not commissioned |
| False dual-AI or 26-agent acceptance | Report live Codex execution, static CI, qualified V&V and human approval independently | Same-SHA trusted host and qualified reviews still pending |

## 3. Specialist skills and canonical role routing

| Local skill | Principal source of truth | Agent roles |
| --- | --- | --- |
| `marine-requirements-and-standards` | CMP-001, MAR-01, AUT-01 | A01 A02 A03 A04 A18 A21 A24 |
| `cad-configuration-and-mass-cg` | ParametricHullPipeline, EngineeringDigitalThread | A05 A06 A08 A09 A10 A11 A12 A13 |
| `numerical-vnv-and-uncertainty` | NumericalVnVHarness, convergence tools | A06 A07 A08 A09 A10 A11 A12 A13 A14 A18 A23 A24 |
| `marine-safety-and-degraded-modes` | AUT-01, MAR-01 | A04 A16 A17 A19 A20 A22 A24 |
| `digital-thread-and-evidence-sync` | EngineeringDigitalThread, GovernedSyncCoordinator | A01 A02 A15 A20 A21 A23 A25 A26 |
| `commissioning-and-acceptance` | 26-agent acceptance, M00–M08 tracker | A01 A03 A14 A15 A18 A19 A20 A21 A22 A23 A24 A25 A26 |

Every registered A01–A26 role maps to at least one procedure. No 27th role
exists, and A26 retains its existing unified operating charter and R2 policy.

## 4. Technical implementation

- `src/core/skills/NavalSkillRegistry.ts` — immutable source-owned mapping,
  canonical-ID validation and fail-closed method summaries.
- `src/core/engine/BaseAgent.ts` — append selected method summaries to
  authoritative system instructions after input validation; log selection.
  Untrusted `input.context`, `userNotes` and `parameters` cannot choose or
  elevate a skill.
- `skills/usv01/<skill-id>/SKILL.md` — six reusable complete procedural
  contracts, each with provenance, input/output rules, negative tests and
  governance hold.
- `scripts/governance/classify-change.ts` — protect trust-sensitive skill
  instructions and engine routing under independent software-security review.
- `tests/navalSkillRegistry.test.ts` and
  `tests/governanceApprovalRoutes.test.ts` — 26/26 role routing, valid source
  files, negative IDs, prompt injection boundary, no permission change, and
  protected change classification.

## 5. Falsifiable acceptance criteria and regression evidence

| Check | Expected outcome | Evidence type |
| --- | --- | --- |
| Exact 26-role coverage | All A01–A26 map to nonempty source-controlled skills | Vitest regression |
| Role spoofing | Unknown ID or alias rejected | Negative Vitest regression |
| Runtime integration | Real `BaseAgent` build sends correct skills in model system prompt | Offline synthetic mocked-provider regression |
| User override | User context cannot alter trusted selected skills | Offline synthetic mocked-provider regression |
| Permissions | Agent tool list and execution permissions unchanged | Offline regression |
| Source completeness | Six `SKILL.md` files carry contracts, holds and negative tests | Offline regression |
| Protected policy edits | Trusted skill and runtime paths require protected software review | Governance regression |
| Engineering acceptance | Real mission, solver, external reviewer and Director approval | **NOT DEMONSTRATED** by this change |

Commands expected to run in CI: `npm run lint`, `npm test`,
`npm run acceptance:numerical`, repository Stage A–E governance, and
the required source/host preflight checks. Record exact run URL,
SHA and result. **Never call test-source presence a passing test.**

### Before/after measurement boundary

Before this change there is no matching six-specialist role-to-prompt
registry. After the change the mapping is testable for 26/26 roles. This proves
**procedural coverage**, not higher model accuracy, better hull performance
or completion of live commissioning. Before/after *engineering correctness*
remains NOT MEASURED until identical qualified cases are executed with
approved references, uncertainties and independently accepted output receipts.

## 6. Open work and preserved holds

The currently recorded M00–M02 blockers and M03–M08 prerequisites remain
unchanged. In particular, trusted host A04 recovery action (not Agent A04),
actual host/Codex runs, solver qualification, specialist external review,
MAR-01 evidence, AUT-01 SIL/HIL/sea tests and formal Engineering Director
release cannot be closed by skill publication.

Any further change to canonical agent definitions, tool permission rules,
controlled engineering constraints, ECR records or approval enforcement
requires its existing stricter review route. No forced merge, bypass or
secret-bearing external API deployment is authorized by this document.
