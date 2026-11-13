# Naval Digital Lab — Architecture and Module Evidence Audit

**Control ID:** USV-LAB-ARCH-A03-001 · **Recovery action:** A03 · **Audited:** 14 November 2026 (IST)  
**Audited source SHA:** [`9ed748fc1c067d95be44d29debd347406d27b6d5`](https://github.com/ravisinghrathode/usv-01-digital-lab/commit/9ed748fc1c067d95be44d29debd347406d27b6d5) · **Source:** [public GitHub repository](https://github.com/ravisinghrathode/usv-01-digital-lab) · **Custodian:** LAB systems architecture review · **Accountable owner:** Project Lead  
**Method:** Read-only exact-source code and repository inventory, reference existing exact-SHA GitHub CI evidence, identify integration boundaries and missing external acceptance. No new authenticated execution, host credential access, physical experiment, CAD model or solver run performed in this audit.  
**Disposition:** **Architecture/source-inventory audit complete; lab commissioning, engineering validation and vessel release NOT complete.** Protected-branch merge and exact-head governance checks are required before this report is controlled on `main`.

This file is the **technical evidence detail** for [Master Project Register A03](MASTER_PROJECT_REGISTER.md), not a substitute for [engineering acceptance](CONSOLIDATED_ACCEPTANCE_REGISTER.md) or a signed configuration baseline.

## 1. Audit coverage and evidence levels

The pinned Git tree contained **410 tracked files** (`recursive=1`, `truncated=false`) including **four** GitHub Actions workflow files; source count is an inventory measure, not a measure of readiness. Confirmed directly in `src/core/agents/definitions.ts`: canonical IDs `A01` through `A26` appear exactly once (26 agents); `src/core/tools/ToolRegistry.ts` registers **12** deterministic screening tools. The 26 roles span eight divisions as defined in source. The [agent readiness assessment](AGENT_READINESS_20261114.md) reports 11 tool-capable roles and 15 advisory/review roles; those counts are a **prior dated audit**, not a newly executed runtime probe.

**Classification (every status below is scoped):** `SOURCE_IMPLEMENTED` = concrete code path present; `CI_SOFTWARE_CHECKED` = related static/test/build gate previously passed at stated SHA; `HISTORICAL_EXECUTION_ONLY` = evidence tied to an older source/host; `EXTERNAL_UNVERIFIED` = needs trustworthy live host, physical, deployment or independent evidence; `PROPOSED_PR_ONLY` = not present on audited `main`. Modules may have several labels simultaneously.

At the audit, protected `main` SHA `9ed748f...` had the [required deterministic quality/governance check](https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/43521342937) **success**, while the overall Actions workflow was **cancelled** because the separate resource-heavy OpenFOAM job was being stopped. **Do not report the complete run as successful or OpenFOAM as a verified hull model.** The check tests TypeScript, lint, unit/safety tests, secret scanning, governance, sample numerical checks and build; it does not verify a real Mac/remote Linux host or physical engineering evidence.

## 2. Actual software topology and boundaries

```text
React/Vite dashboard: src/App.tsx, src/components/*
       | authenticated HTTP /api/*
       v
Express server.ts -> default-deny session + route RBAC
       |                  | 
       |                  +-> ProjectStorePersistence / local data / readiness
       |
       +-> AgentRegistry (canonical A01-A26) / BaseAgent / ExecutionEngine
       |       +-> CentralOrchestrator (dependency DAG, gates)
       |       +-> ModelProviderRouter (Codex CLI pinned; optional legacy adapters)
       |       +-> ToolRegistry (12 deterministic screening calculators)
       |
       +-> Mission Control (subscription CLI, explicit research-only authority)
       +-> verification (live matrix, Gate 0, 13 WS, 15 acceptance criteria)

Separate/partly overlapping paths:
  AgentDesignLoop -> bounded A01 proposal / tool screen / A15 critique,
                     optional source-gated specialist reviews and solver receipt
  Legacy GenerativeDesignOptimizer -> seeded heuristic simulation only
  RemoteSolverJobs -> authenticated HTTPS -> external Linux worker
                     (OpenFOAM / CalculiX; no vessel validation established)

Source governance: protected GitHub PR -> exact-head CI Stage A/B/C/D/E
Engineering governance: controlled vessel Gate 0 -> independent domain proof
                        -> qualified peer + Director ECR -> RELEASE / HOLD
```

**Integration fact:** Having these classes in the same repository does **not** establish that the deployed dashboard, all 26 agents, optimizer, solver, CAD/3D, source-indexing and external knowledge store are operating as one end-to-end live engineering cycle.

## 3. Source-derived module inventory

| ID / module | Source evidence | Verified scope | Missing for operational/engineering acceptance |
|---|---|---|---|
| M01 — Dashboard/navigation | [`src/App.tsx`](../src/App.tsx), [components](../src/components/) | `SOURCE_IMPLEMENTED`; React/Vite modules for systems, naval, structures, electrical, propulsion, autonomy, V&V, optimizer, agent and visualization views; CI bundle | Hosted authenticated deployed build SHA, interaction and persistence validation |
| M02 — HTTP/auth/RBAC | [`server.ts`](../server.ts), [`routeAuthorization.ts`](../src/core/auth/routeAuthorization.ts) | `SOURCE_IMPLEMENTED` default-deny `/api` session and role checks; 42 `app.get/post/...()` declarations including catch-all, automated security tests | External pen test, live TLS/config/host threat-model verification |
| M03 — Project storage | [`ProjectStorePersistence.ts`](../src/core/storage/ProjectStorePersistence.ts) | Atomic local snapshot and corrupted-store refusal; isolated restore-test function | Production backup, restore, recovery time, file-system and operations security |
| M04 — 26-agent configuration | [`definitions.ts`](../src/core/agents/definitions.ts), [`AgentRegistry.ts`](../src/core/registry/AgentRegistry.ts) | `SOURCE_IMPLEMENTED` exactly 26 canonical roles and 8 divisions; graph, role schema, permissions | Not 26 independently verified engineering specialists |
| M05 — Agent execution | [`BaseAgent.ts`](../src/core/engine/BaseAgent.ts), [`ExecutionEngine.ts`](../src/core/engine/ExecutionEngine.ts) | Registered agent execution, declared inputs/outputs, deterministic tool interfaces; software checks | Trusted-host current-exact-SHA 26 live model/tool traces |
| M06 — Dependency orchestration | [`CentralOrchestrator.ts`](../src/core/orchestrator/CentralOrchestrator.ts), [`TopologicalAgentCampaign.ts`](../src/core/verification/TopologicalAgentCampaign.ts) | DAG topo ordering, dependency handoff and gate interfaces | End-to-end **repeating** 26-role design/test/review/optimisation convergence |
| M07 — Model adapters | [`ModelProvider.ts`](../src/core/models/ModelProvider.ts), [`SubscriptionCliAdapter.ts`](../src/core/mission-control/SubscriptionCliAdapter.ts) | Codex-pinned roles fail closed if live CLI absent in production; explicit test-only mock; no unapproved paid-API default. Legacy Gemini, Gemini CLI, Ollama, OpenAI adapters remain in source | Current authenticated provider identity/quota, verified isolation and deployed routing |
| M08 — Mission Control | [`MissionControlCoordinator.ts`](../src/core/mission-control/MissionControlCoordinator.ts), [`MissionControlStore.ts`](../src/core/mission-control/MissionControlStore.ts) | Bounded orchestrator/worker/reviewer loop with evidence manifest; one Codex executable can play distinct *logical* roles | Not an **independent human engineer**; current signed host and persisted production session proof |
| M09 — 26-agent live campaign | [`LiveAgentMatrix.ts`](../src/core/verification/LiveAgentMatrix.ts), [campaign script](../scripts/run-codex-agent-campaign.ts) | Dependency-ordered run and failure/evidence records; historical Codex 26/26 success **only at older SHA** | Current SHA + 26 live responses + tool/host signatures + qualified domain reviews |
| M10 — Design iteration | [`AgentDesignLoop.ts`](../src/core/optimizer/AgentDesignLoop.ts), [design protocol](AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md) | Bounded at most five A01/A15 proposal/critique revisions; conditionally invokes deterministic screens and A05/A06/A07/A23 or A09/A10/A14 specialist reviews when inputs/tools permit | Autonomous full 26-role iterative physics pipeline, independently ranked concepts, as-built geometry and validation |
| M11 — Legacy heuristic optimizer | [`GenerativeDesignOptimizer.ts`](../src/core/optimizer/GenerativeDesignOptimizer.ts) | Deterministic seeded scenario/heuristic implementation | Heuristic output not verified multi-agent solver or physically accepted optimum |
| M12 — 12 deterministic tools | [`ToolRegistry.ts`](../src/core/tools/ToolRegistry.ts), [naval tools](../src/core/tools/naval/) | Screeners for hydrostatics (incl offsets/trim/catamaran), resistance, mass, electrical, structures, lifting, beam and COLREG kinematics | Independent model validity, unit/frame/uncertainty, laboratory and topology-specific correlations |
| M13 — 3D and realtime previews | [`Vessel3DVisualizer.tsx`](../src/components/Vessel3DVisualizer.tsx), [`RealtimeSimulationView.tsx`](../src/components/RealtimeSimulationView.tsx) | Procedural canvas geometry and explicitly **schematic** CFD-style colors; PR #76 isolated UI sample presets from approval-state shared memory | CAD import/export with exact revision, geometry-to-mass/hydrostatics binding, solver-derived fields and verified synchronized changes |
| M14 — Remote solver adapter | [`RemoteSolverJobs.ts`](../src/core/verification/RemoteSolverJobs.ts), [Linux worker](../remote_solver/worker.py), [runbook](../remote_solver/README.md) | Manifest/quality receipt, fixed-case worker/service and local test cases; outcomes explicitly `UNVERIFIED` | Commissioned authenticated remote Linux host, real vessel geometry/mesh, validated CFD/FEA, convergence/correlation and witnessed evidence |
| M15 — Evidence/acceptance | [`AcceptanceCampaign.ts`](../src/core/verification/AcceptanceCampaign.ts), [`EvidenceDecisionGate.ts`](../src/core/verification/EvidenceDecisionGate.ts), [criteria](CONSOLIDATED_ACCEPTANCE_REGISTER.md) | 13 coded workstreams cover 15 criteria; independent proof never inferred from JSON shape | Controlled real evidence and independent assessor signatures, domain/physical acceptance |
| M16 — Software governance | [Stage E](../scripts/governance/stage-e-enforce.ts), [workflow](../.github/workflows/safety-governance-gate.yml), [lab protocol](LAB_COMMISSIONING_PROTOCOL.md) | Protected branch, route-specific exact-head governance and required CI; Stage E switch currently `true` | Actual vessel review and ECR still separate; [PR #80](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/80) hardening was **open** at audit |
| M17 — External integrations | [`LiveIntegrationProbes.ts`](../src/core/verification/LiveIntegrationProbes.ts), [`VaultProbe.ts`](../src/core/verification/VaultProbe.ts) | Drive create/read/hash/ACL probe and Obsidian Markdown wikilink filesystem test implemented, AI Studio deployed-SHA probe implemented | Actual authorized live roundtrip and independent permission/sync validation not established |
| M18 — Security and deployment | [`server.ts`](../server.ts), [security policy](../SECURITY.md), [commissioning runbook](COMMISSIONING_RUNBOOK.md) | Security/default-deny code, GitHub scanning and automated checks exist | Production origin, TLS, RBAC penetration review, operational backup and restore, monitoring, independent security proof |
| M19 — Public repository scout | [PR #78](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/78) | `PROPOSED_PR_ONLY` at audit; separate read-only GitHub discovery pipeline, supports A26 role, **not a 27th agent** | Security/license review, exact-head CI, authorized merge and a real bounded discovery run |
| M20 — OpenFOAM CI opt-in | [PR #79](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/79) | `PROPOSED_PR_ONLY` at audit; intended manual-only expensive known-case solver step | Protected review/merge; prove future pushes do not auto-run OpenFOAM. Current overall CI cancellations are not evidence of bad required governance checks |

**Interpretation:** `SOURCE_IMPLEMENTED` means the source is present. It does not mean a real environment is connected. A passing TypeScript/Vitest build is software evidence, not a sea trial, signed CAD baseline or external V&V report.

## 4. Overlap, integration seams and discrepancy ledger

| Finding / priority | Evidence and risk | Proposed controlled disposition / future action |
|---|---|---|
| **ARCH-01 / P1 — Four execution surfaces are not a proven single closed loop** | `CentralOrchestrator`, `MissionControlCoordinator`, `LiveAgentMatrix` and `AgentDesignLoop` have different task/trace/retry interfaces; heuristic optimizer is a fifth route. No source/host acceptance evidence proves a uniform 26-role iterative convergence contract. | A04–A07: map each runtime's input/output/provenance into one governed campaign manifest. No claim of autonomous end-to-end optimisation until repeated full-cycle campaign validated. |
| **ARCH-02 / P1 — Visualization not CAD or solver binding** | Canvas `Vessel3DVisualizer` labels its fluid color and streamlines schematic. `RealtimeSimulationView` uses visual-only example presets. | A11: source-pinned CAD/offset mesh + mass/CG + committed solver/3D linkage; no SVG/canvas color proof. |
| **ARCH-03 / P1 — Legacy historical geometry discrepancy persists as an assumption** | `SharedMemory.ts` sets `PRINCIPAL_DIMENSIONS_LOA = 10.5 m` in **ASSUMED** demo data while `USV01_PROJECT_CONTEXT.md` Rev 0.4 says **LOA ~11.2 m, LWL 10.5 m**. This is a possible LOA/LWL labeling conflation; neither is approved. | A09/A10: reconcile actual dimensions against controlled geometry and datum; keep every seed **ASSUMED/TBD**, never copy either value to vessel baseline. |
| **ARCH-04 / P1 — Engineering truth sources absent** | 12 numeric screeners, synthetic reference arrays and historical live 26-output evidence exist, but current source has no approved actual vessel CAD/mass/GZ or witnessed tests. | A09–A14: Gate 0 controlled configuration, independent discipline reference datasets, uncertainty, physical SIL/HIL/trials, qualified reviewers and Director ECR. |
| **ARCH-05 / P2 — Dual use of 'independent reviewer' terminology** | A15/A23 are named critic/reviewer agents. `MissionControlCoordinator` can invoke orchestrator/worker/reviewer via the same signed-in Codex executable and records `independentProvider: false`. | Never treat agent or same-provider review as qualified external human review. A12/A14 require separately authenticated independent professionals. |
| **ARCH-06 / P2 — Provider route coexistence** | `ModelProvider.ts` retains optional Gemini, Gemini CLI, OpenAI, Ollama and deterministic implementations, while production 26-role specs pin `codex_cli`. Legacy Gemini provider has deterministic fallback internally, but the Codex-pinned route explicitly fails closed and mocks are test-only. | A04/A07: verify actual configured live path and deny unauthorized paid fallback. Preserve old adapters only with explicit non-authoritative scope; investigate pruning separately, not in this documentation audit. |
| **ARCH-07 / P2 — Runtime/deployment not proven by static source** | Source shows REST routes, local snapshot store, Codex CLI runner, authentication checks and integration probes, but no fresh matching-SHA host signature, live deployed URL or production restore proof. | A04/A07/A08: source-locked, authenticated external preflight, durable host attestation, deployed SHA/ACL, backups and integration roundtrips. |
| **ARCH-08 / P2 — Expensive OpenFOAM runs triggered on docs changes** | `.github/workflows/safety-governance-gate.yml` automatically launches an **uncertified known-case** CFD job; several PR/main workflows were cancelled after deterministic governance passed. | Keep code/CI governance active; review/merge separate PR #79 manual opt-in. Do not falsely infer solver release from job success. |
| **ARCH-09 / P2 — Historical authority cleanup distinct from vessel release** | [PR #76](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/76) made client historical values `ASSUMED` rather than approved. [PR #80](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/80) is a separate live protection hardening proposal. | Let each protected software PR complete exact-head independent/admin-human authorization. Preserve AUT-01/#43 and Gate 0 engineering HOLDs. |
| **ARCH-10 / P3 — Overlapping research frontends** | Fleet intelligence, notebook, public reference collection and proposed Repository Scout each support research/provenance at different seams. No source evidence of unified stable source IDs and adoption approval across them. | A07/A08/A10: define a single source-index contract, license/security provenance and controlled knowledge graph publication; discovery is never automatic code installation. |

These are **architecture/audit findings**, not newly proven field failures or permissions to perform unrequested engineering design changes.

## 5. Explicit dependency and verification order

1. **A03 architecture inventory closes** on this report's protected merge plus main required governance CI (software-source proof only).
2. **A04 trusted execution** checks the actually commissioned Mac/runner credentials, clean Git SHA, runtime permissions, resource limits, and no unapproved paid provider.
3. **A05 preflight** runs 26 input schemas and mandatory tools against controlled, source-pinned cases. Synthetic preflight cannot satisfy live acceptance.
4. **A06 live campaign** executes on that same source revision and trusted host with 26 model traces, DAG handoffs, failures and exact tool digests.
5. **A07 operational attestation** proves current host health, persistent reports and actual dashboard state rather than relying on fixtures.
6. **A08 integration** checks Drive/Obsidian/Google AI Studio source SHA and scoped live interfaces, without exposing restricted data in public Git.
7. **A09–A12 design authority** must resolve concept choice and independently verify actual geometry/CG/physics; it cannot be skipped by agent completions.
8. **A13–A14 vessel release** needs external evidence plus independent professional verification and Director exact-baseline ECR; until then **HOLD**.
9. **A15 reporting** is a separate operational outcome, not assumed to be deployed today.

**Architectural critical path:** source revision and trusted operator host → authenticated 26-role execution → traceable deterministic tool evidence → independently tested models → controlled vessel geometry/mass configuration → validated CFD/FEA/safety/sea-trial evidence → genuine human release authority. Some research is allowed before Gate 0 under explicit **research-only, non-actuating** laboratory authority, but no vessel baseline may be promoted.

## 6. Acceptance checklist for A03 (architecture inventory, not engineering)

- [x] Enumerate tracked repository source snapshot, canonical 26 roles, 12 registered deterministic tools, four workflows and relevant tests/docs.
- [x] Trace UI → server auth/RBAC → agent/mission controller → providers and tools → persistence/evidence → software/engineering governance boundaries.
- [x] Classify representative modules as implemented, source/test checked, historical-only, external-unverified or proposed only.
- [x] Identify overlapping execution paths, authority boundaries, missing live host/solver/CAD/integration evidence, and legacy seed discrepancy.
- [x] Produce evidence-linked A04–A15 prerequisites and named architecture risks.
- [ ] Merge report on protected `main` with required exact-head governance check green and verify merged report exists.
- [ ] Record A03 completion in the Master Project Register; **do not start A04** until separately authorized.

## 7. Original source references (audited pinned commit)

- [Agent definitions](../src/core/agents/definitions.ts), [registry](../src/core/registry/AgentRegistry.ts), [engine](../src/core/engine/ExecutionEngine.ts), [DAG orchestrator](../src/core/orchestrator/CentralOrchestrator.ts)
- [Model router](../src/core/models/ModelProvider.ts), [Mission Control](../src/core/mission-control/MissionControlCoordinator.ts), [Design loop](../src/core/optimizer/AgentDesignLoop.ts), [12 tools](../src/core/tools/ToolRegistry.ts)
- [3D canvas](../src/components/Vessel3DVisualizer.tsx), [simulation preview](../src/components/RealtimeSimulationView.tsx), [SharedMemory](../src/core/memory/SharedMemory.ts)
- [Acceptance campaign](../src/core/verification/AcceptanceCampaign.ts), [engineering verification](CONSOLIDATED_ACCEPTANCE_REGISTER.md), [Agent readiness](AGENT_READINESS_20261114.md), [Live campaign acceptance](USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md)
- [Lab commissioning authority](LAB_COMMISSIONING_PROTOCOL.md), [Gate 0 controlled configuration](EVIDENCE_ACQUISITION_DECISION_IMPLEMENTATION.md), [project context](../USV01_PROJECT_CONTEXT.md)

**HOLD:** No vessel production, autonomous actuator control, manufacture or sea trial is authorized by this software inventory.
