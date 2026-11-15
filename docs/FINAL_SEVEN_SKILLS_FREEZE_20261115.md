# USV-01 — Final Seven-Skill Adoption and Freeze

**Record:** USV01-SKILLS-FINAL-20261115  
**Scope:** Nine locally owned specialist skills + ten external development references + twelve earlier agent engineering references = **31 engineering-agent skills**  
**Execution scope:** existing 26-role TypeScript agent registry only  
**Policy status:** PROPOSED UNTIL EXACT-HEAD PROTECTED SOFTWARE REVIEW AND MERGE  
**Physical / vessel status:** HOLD; no change to M00–M08 project milestone approvals

## Purpose

Complete the explicitly approved *last* skill expansion and stop. No new
agent count, orchestration framework, paid model provider or external access
entitlement is installed. The seven new records are suitable for research-only
engineering software development; neither prompt selection nor library storage
establishes deterministic LLM behavior or qualified naval calculations.

## The four external skills

| Name | Publisher / authority boundary | Connected record |
| --- | --- | --- |
| `test-gap-audit` | GitHub community; portable, source-attributed adaptation; read-only gap assessment | Saved as a text-only record |
| `github-actions-hardening` | GitHub community, MIT; risk review for workflows, permissions and tokens | Pinned upstream skill text |
| `playwright` | OpenAI skills, Apache-2.0; browser test guidance | Pinned skill text, CLI and browser not deployed by storage |
| `gh-fix-ci` | OpenAI skills, Apache-2.0; real GitHub CI check/log triage | Pinned skill text, gh binary/credentials not deployed by storage |

All published sources are recorded in `config/external-skill-sources.json`
with exact upstream commit IDs, license and no-execution/no-promotion flags.
The full `test-gap-audit` record could not be saved through the connected
library, so the stored version is explicitly **adapted**, not presented as
an exact published copy. Do not install/run upstream auxiliary scripts without
a separately reviewed software change.

## The three project-owned specialist skills

| Skill | Principal agents | Verification intention |
| --- | --- | --- |
| `agent-runtime-resilience` | A01 A15 A18 A20 A24 A25 A26 | Budget/retry/checkpoint/gate recovery, fail-closed |
| `cad-to-physics-coupling` | A01 A05 A06 A07 A08 A09 A10 A11 A12 A13 A14 A18 A21 A24 | CAD/mass/CG topology/units and cross-discipline invalidation |
| `agent-qualification-campaign` | A01 A02 A15 A18 A23 A24 A25 A26 | Frozen 26-role fixtures, adversarial tests, measured accuracy and external review |

Each includes a `SKILL.md` input/output contract, source revision,
procedure, negative tests and explicit engineering-release holds. All nine
USV-01 specialist IDs are mapped in `NavalSkillRegistry.ts`. The existing
`BaseAgent` uses the registry to supply trusted, short guidance; the new
three require no BaseAgent API change. They are **procedural software
integration**, not implementations of a new persistent checkpoint database,
qualified CAD solver or complete 26-agent live qualification service.

## Frozen skill policy

The exact allowed set is machine-readable in
`config/agent-skill-freeze.json`, with:
- 12 pre-existing agent development skills;
- 10 external development skills (six previous, four final);
- 9 project-specific specialist skills (six previous, three final).

`tests/agentSkillFreeze.test.ts` verifies no added/removed/duplicate
skill identities, manifest source pins and trust flags, full local procedure
coverage, correctly scoped canonical agent routing, and protected-software
classification for all changed skill control files. Unauthorized additional
skill IDs or source manifest changes must fail the frozen-list test unless
accompanied by a separately reviewed policy exception.

## Before/after evidence boundary

**Before:** six in-repository specialist contracts, 26 mapped roles and a
six-source external skill inventory.  
**Proposed after:** nine local contracts, 26 mapped roles and a ten-source
external skill inventory, with added repeatability/fault recovery, CAD-physics
coupling and formal 26-agent qualification *procedures*.  
**Not measured:** actual LLM engineering accuracy, current-host live
26-agent campaign, model/solver robustness, 3D CAD qualification, operational
budget adherence, independent marine technical acceptance or vessel release.
Each of those needs a separate authentic execution/evidence campaign.

## CI and acceptance

- TypeScript typecheck: `npm run lint`
- All deterministic unit tests: `npm test`
- Numerical oracle control: `npm run acceptance:numerical`
- Security / governance: the existing GitHub Stage A–E pipeline
- New focused source tests: `tests/navalSkillRegistry.test.ts`,
  `tests/agentSkillFreeze.test.ts`, and
  `tests/governanceApprovalRoutes.test.ts`

These are acceptance *requirements*, not passed claims until exact-head CI
runs report success. Stage E cannot be bypassed by this document. Source
control merge never creates an independently qualified vessel baseline.
After authorized merge and passing CI, freeze skill additions and focus
future effort on the existing M00–M08 software and physical evidence backlog.
