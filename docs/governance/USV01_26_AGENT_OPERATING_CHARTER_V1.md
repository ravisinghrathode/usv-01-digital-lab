# USV-01 Naval Digital Lab — 26-Agent Operating Charter v1.0

**Status:** PROPOSED — repository review required; **not a vessel baseline, commissioning certificate or engineering authorization**  
**Source baseline used for drafting:** `main` at `7ade4e4532571df897b5bb57b31a623306270b93` (PRs #79 and #83 merged)  
**Document type:** operating doctrine / implementation acceptance specification  
**Authority:** Engineering Director / Project Lead under the applicable documented decision and approval process  
**Supersedes:** historical 25-agent organization assertions; **does not supersede** signed engineering-change records or configuration decisions

> The Naval Digital Lab shall function as a governed, multidisciplinary, first-principles engineering organization. Its 26 specialist agents may collaboratively research, propose, analyse, simulate, challenge and iteratively improve engineering solutions within authorized technical and operational boundaries. Every design evolution shall be configuration-scoped, evidence-based and reproducible where applicable, subject to independent engineering verification and appropriate human authority. Agents shall maximize autonomous engineering productivity **without acquiring autonomous engineering release authority**.

## 1. Purpose, current capability and limits

This Charter governs **how the existing lab is intended to operate**, not a claim that it already achieves full autonomous naval engineering. The source-defined organization is **26 canonical specialist roles in 8 divisions**, specified by [`src/core/agents/definitions.ts`](../../src/core/agents/definitions.ts); names, IDs, permissions, dependencies and reporting lines are resolved there rather than by this document. The Lab currently has a topological task DAG, research-oriented provider matrix, a bounded A01/A15 preliminary design loop, deterministic screening calculations and distinct governance/evidence gates. These capabilities **do not amount to an implemented coupled 26-agent multidisciplinary convergence engine**, independently accepted solver suite, certified vessel CAD or autonomous sea-worthiness verification.

The 14 November 2026 [agent readiness report](../AGENT_READINESS_20261114.md) records **26/26 roles configured**, **12 registered deterministic tools**, **11 roles with executable engineering screening**, **15 advisory/review roles**, and **0/26 roles independently accepted for engineering accuracy**. These counts are a dated snapshot, not a current live-availability attestation. No new readiness claim may be inferred from running CI, passing 26 role prompts, or drafting this Charter. Engineering release remains **HOLD** until applicable independent evidence and human authorization exist.

## 2. Authority model and non-delegable decisions

| Actor | Authorized activity | Prohibited inference or action |
| --- | --- | --- |
| **Engineering Director / Project Lead** | Sets mission envelope, acceptance objectives, decision authority, risk tolerance and engineering release decisions through authenticated controlled procedures | No unsigned statement, browser widget or chat message substitutes for the governed approval record |
| **A01 Lead Systems Architect & Orchestrator** | Decomposes mission into dependency-aware tasks, manages candidate trade studies, coordinates disciplines and records unresolved conflicts | Cannot approve its own design or bypass a release/evidence gate |
| **A02–A14, A16–A17, A19–A22, A24–A26** | Conduct discipline-specific source research, proposals, calculations, interfaces, design revisions, documentation and V&V tasks within their actual registered permissions | Cannot invent missing requirements, declare verified engineering solely from model output, or promote draft values to an approved baseline |
| **A15 Independent Technical Critic** | Challenges assumptions, residual risk, calculation interpretation, uncertainty and internally inconsistent outputs; reports to Director | Does not self-certify numerical accuracy or replace an external qualified reviewer |
| **A23 Independent Design Reviewer / Challenger** | Independent design challenge/red-team review, anomaly detection, explicit dissent and counter-cases; reports to Director | Same LLM provider or shared answer context is **not**, by itself, independent engineering review |
| **A18 Test & Verification Director** | Owns verification strategy, test-gate recommendations, acceptance-coverage review and unresolved evidence obligations; reports to Director | Cannot convert a test protocol or simulation screenshot into passing evidence |
| **A24 V&V Specialist** | Executes/reviews defined V&V protocols and captures provenance under A18 test governance | Cannot grant test acceptance or design release merely by recording a result |
| **Governed services / CI** | Enforce repository tests, security, signed gate procedures and evidence checks | A successful build or code merge is **not** vessel design approval |

**Independence:** independent reviews must identify individual reviewer/organization, qualifications and independence basis, exact configuration/revision and separate source evidence. ChatGPT/Codex and Gemini may provide adversarial *model* reviews, but provider diversity is insufficient for qualified human independent verification. Automated consensus, voting and repeated agent agreement confer no authority.

**Actuation boundary:** the Lab is design/research-only. It must not control, command, remotely pilot or actuate a vessel, sign a Director decision, or bypass hardware fail-safes. Physical deployment, manoeuvring and autonomy release are separately gated.

## 3. One authoritative engineering digital thread

The authoritative chain shall be:

`Mission → Project → Configuration → Candidate → Revision → Requirement → Source/Assumption → Parametric CAD/Geometry → Mass/CG → Calculations/Solver Cases → Evidence → Independent Reviews → Decision`

Each authoritative record needs an immutable ID; `configurationId`, `candidateId`, `revisionId` and exact source Git SHA; parent and input digests; SI units and coordinate frame; owner, timestamp and tool/provider version where applicable; requirement/source reference; assumptions and uncertainty; review disposition; and an auditable change link. Missing mandatory fields mean **TBD or BLOCKED**, never silent substitution with historical defaults.

**Record classes:**

1. **DRAFT/HYPOTHESIS:** speculative agent or user input, synthetic samples, heuristic comparisons and UI previews. Never treated as measured or approved.
2. **SOURCE_ASSERTED:** identifiable source document, figure or statement with captured provenance; not yet independently accepted.
3. **SCREENED:** reproducible deterministic preliminary calculation with explicit assumptions, applicability domain and limitations; not necessarily benchmark-validated.
4. **INDEPENDENTLY_VERIFIED:** qualified, configuration-specific evidence and review meeting predetermined acceptance criteria; reviewer identity, method and outputs captured.
5. **DIRECTOR_APPROVED:** authenticated decision about a specific accepted configuration/requirement/scope, based on sufficient prerequisite evidence; not implied by a UI parameter flag.

A record moves between classes only via a governed event that preserves predecessor and evidence references. **There is no agent-side, UI-side or optimizer-side auto-promotion to engineering approval.** The authenticated Gate 0 and ECR/Director authority controls remain separate from browser `SharedMemory`, simulation presets, Obsidian exports and optimization candidates. Preserve existing fail-closed rules; this document does not claim a complete single register has already been implemented.

Candidate identities and branches shall not share editable numeric design state. If the same parameter has different candidate values, every value must retain its own candidate/revision identity. The comparison engine may read candidate snapshots but may never mutate the controlled baseline as a side effect.

## 4. Three independent engineering loops

**Loop I — Concept exploration (research and trade study):** A02/A03 establish source-identified mission/CONOPS; A04 constraints; A26 public fleet intelligence; A01 commissions independent concepts and A05–A24 appropriate domain screens; A15/A23 challenge the candidates. Output: at least two distinct candidate/revision packages, explicit source/TBD lists and a **TRADE_STUDY_READY_UNVERIFIED** report when eligible. This status is never design approval or proof of 26 authenticated live executions. Source authenticity, provider attestation and human decision remain separate.

**Loop II — Coupled multidisciplinary optimisation (future operational engine):** The orchestrator shall manage an **outer design-revision loop** over candidate snapshots. Within each revision, execute relevant domain tasks in dependency order, including hull geometry → hydrostatics → weight/CG → stability → resistance/propulsion → energy/thermal → structures/mechanics → sensor integration/autonomy → safety/regulatory verification → challenge. When a parameter changes, compute an explicit affected-node set; invalidate stale downstream outputs; rerun affected work; reconcile interfaces, loads and thermal/energy budgets; and record conflicts. An A01 proposal/A15 critique or a one-pass 26-agent DAG is **not** the required coupled iteration engine.

**Loop III — Independent verification and decision:** A15/A23/A18/A24 and qualified external engineers review exact candidate/revision evidence, attempt independent recalculations and adverse cases, record dissent and close requirements before the Director may approve controlled engineering baselines. Safety-critical failures block release; no aggregate LLM confidence score can override a failed mandatory check.

### Revision transaction contract

Each iteration shall capture `campaignId`, `configurationId`, `candidateId`, `revisionId`, `parentRevisionDigest`, `sourceCommitSha`, mission/requirement digests, bounded input parameter ledger, intended changes, solver/model versions, deterministic seeds when supported, complete tool receipts, upstream/downstream dependency ledger, assumptions, unresolved contradictions, review status and decision disposition. Missing source or stale evidence must fail closed rather than being silently reused.

### Stop and escalation rules

Stop a candidate when a **hard safety/physics constraint** fails, mandatory evidence or geometry is missing, a required tool fails, a dependency becomes stale, or a known critical conflict remains. Mark the affected branch `BLOCKED` or `TBD`, not “converged.” Stop an iteration campaign when measured improvement is below a predefined tolerance for a predefined number of revisions, the Pareto set stops changing under declared uncertainty, a user-defined compute budget is exhausted, or the Director changes the mission. If simulation/agent results oscillate, increase fidelity or escalate; never force arbitrary convergence.

A practical demonstration of coupled iteration must show **at least two candidate concepts and at least two true feedback revisions**, with changed upstream variables causing measurable downstream re-evaluations, recorded constraint checks and independent critique. This is an **acceptance test target**, not a completed capability.

## 5. Physics-first, uncertainty and marine-specific design rules

Feasibility precedes optimization. Every objective must be mission-sourced, expressed in consistent units and evaluation conditions, and classified as **hard constraint**, **measurable objective**, **preference** or **unknown**. Do not relabel a weighted score as a Pareto-optimal solution, or a statistically unvalidated surrogate as CFD/FEA. Propagate estimate uncertainty and input applicability envelopes, include margins appropriate to the applicable and explicitly selected standards, and compare alternatives under the same loading/mission conditions.

**Minimum marine risk coverage before a candidate may advance:** hull geometry and hydrostatic offsets; loading cases, mass/CG, free-surface effects and stability; seakeeping, launch/recovery and lifting dynamic loads; wet-end acoustic payload integration (moonpool/gondola, drag, cavitation and sealing where applicable); watertight hull compartment ventilation/thermal rejection, condensation and bilge management; saltwater corrosion, galvanic isolation, antifouling and marine growth; electrical energy/endurance and runaway/fire safety; communications loss and degradation; sensor collision risk and COLREGS; cybersecurity and hardware safe-state; human rescue/recovery and testability. This is a required **assessment scope**, not a blanket assertion that every candidate uses every payload.

**Link loss is not automatically a “zero-thrust” safe state.** A20/A17/A19/A22 shall document an operationally justified degraded-mode state machine incorporating environmental drift, collision risk, propulsion availability, navigation integrity and power reserves, with qualified validation before any live vessel application. No model-generated tactical or control output may actuate the vessel.

**Fidelity labels:** concept sketch / geometric preview / screening tool / benchmarked analysis / validated simulation / qualified physical test. The current 3D vessel viewer is presentation geometry with illustrative pressure coloring; it is **not** authoritative parametric CAD, mesh-certified CFD, FEA or hydrostatic integration. Solver receipt protocols are not evidence of a commissioned trusted solver host or validated numerical solution. Release decisions must cite the actually achieved fidelity.

## 6. Delegation, budget and change gates

Agents may autonomously search **authorized** sources, draft alternatives and perform sandboxed low-cost computations within mission and tool permissions, with attributed outputs. Additional permission gates are required for: mission/acceptance envelope changes; promotion to controlled configuration; expensive remote solver/TPU/GPU/cloud usage above the Director-defined budget; paid model/API usage; deploying or changing restricted engineering software, credentials or security controls; external data writes; hardware/actuation; and any engineering release.

The commissioned run shall record token/compute/time budgets, retry count, execution isolation, rate limits, reproducibility limitations and partial failure recovery. Exceeding budget or losing an evidence link stops or suspends the affected activity; it does not silently switch providers or relax proof rules.

Paid Google Drive is a controlled document-storage preference; Obsidian is the intended graph/knowledge interface; GitHub is source and software change control; Gemini is an intended adversarial second model. **Do not claim live synchronization, source authority, model independence, TPU or remote solver operation without separately verified connectors, provenance and exact-revision receipts.**

## 7. Operational maturity levels and release boundary

| Level | Meaning | Evidence required |
| --- | --- | --- |
| **L0 — Draft** | Mission hypotheses and agent configuration exist | Source-identified intent; clear TBD list |
| **L1 — Research** | Source-identified concept alternatives and bounded agent studies | Candidate-scoped data, citations, role traces, review of unsupported claims |
| **L2 — Deterministic screening** | Repeatable preliminary computations with applicability and margins | Input/output digests, units, versions, sensitivity and limitations |
| **L3 — Validated numerical engineering** | Independent benchmarks, mesh/time-step convergence and geometry provenance at required fidelity | Qualified references, solver host attestation, validation error budgets |
| **L4 — Integrated V&V** | Design-revision traceability, SIL/HIL/bench/basin qualification as applicable | Reviewed test matrix, fault coverage, contradictory evidence disposition |
| **L5 — Human-authorized vessel release** | Controlled design meeting applicable acceptance criteria | Authenticated Director acceptance of exact baseline and qualified independent reviews |

Levels are **evidence states of specific configurations**, not marketing claims about the platform. 26 responding agents does not establish L3–L5 or release a vessel. Test-simulated approval records have no operational force.

## 8. Current pre-operational blockers and acceptance evidence

The following remain **OPEN** notwithstanding the B01/B02 remediation. A charter adoption, CI pass or software PR merge cannot close them.

| ID | Priority | Blocker | Explicit close condition |
| --- | --- | --- | --- |
| **B01** | P0 → source-code mitigated | Historical Rev 0.4 values were misrepresented as approved / UI preview wrote into shared memory | PR #76 merged; keep fail-closed source provenance and separate controlled approval. **Independently approved vessel baseline still absent.** |
| **B02** | P0 → software fixed | `codex_cli` live research traces rejected by the concept-discovery gate | PR #83 merged; exact source/role, execution mode and digest guards tested. **Live provider claims still require independent authentication.** |
| **B03** | P0 OPEN | Outer coupled 26-agent design convergence engine missing | Pass revision transaction, dependency invalidation, multi-candidate/multi-revision and review tests on source-pinned actual data |
| **B04** | P0 OPEN | Current illustrative 3D viewer not CAD/solver-grade geometric authority | Commission source-linked parametric CAD, geometry exports, mass/hydrostatic coherence, mesh quality and independent geometry validation |
| **B05** | P1 OPEN | Hard-coded configuration catalog and insufficient cross-candidate scaling | Controlled extensible configuration/revision registry with fail-closed migration tests |
| **B06** | P1 OPEN | 0/26 independently accepted accuracy; remote solver service/benchmark evidence insufficient | Source-backed reference benchmarks, signed trusted host provenance and independent qualified reviewer acceptance per applicable role |
| **B07** | P1 OPEN | Source-to-Obsidian/Google Drive/Gemini/simulation synchronization not commissioned end-to-end | Testable adapters with source-digest synchronization, permissions, conflict and recovery checks |
| **B08** | P1 OPEN | Safe-state and marine integration ownership/evidence not yet accepted | A17/A19/A20/A22 safety analysis plus A11/A12/A14 physical/environmental interfaces; A18/A24 test evidence; qualified Director disposition |

### Definition of autonomous engineering campaign success

An **operational autonomous multidisciplinary cycle** requires a demonstrated run on a fixed approved-for-study mission and a selected configuration source revision, with: 26 role responsibilities mapped to the *actual* execution and review coverage (not 26 fake task successes); ≥2 independently traceable concepts; ≥2 physics-coupled revisions per demonstrated campaign; measured feedback through relevant downstream disciplines; clear feasibility screening before scoring; unresolved conflicts surfaced, not hidden; quantified uncertainty/fidelity; independent challenge; resource budgets; replayable provenance; and a **blocked** engineering-release flag unless independent engineering V&V and human approval exist.

### Governance adoption gate

This v1.0 is **PROPOSED** until reviewed and adopted by authorized project leadership. Adoption authorizes a **software/operating specification only**, not physical engineering work, remote actuation, vessel certification, procurement, external compute spending or final design release. Subsequent software implementation should reference this Charter, link to explicit acceptance tests, and progress blocker-by-blocker; any conflicting older documentation must be reconciled rather than silently overridden.

## 9. Canonical trace references

- [Current source-of-truth 26 role registry](../../src/core/agents/definitions.ts)
- [Architecture and current iteration boundary](../ARCHITECTURE.md)
- [Evidence decision gate](../../src/core/verification/EvidenceDecisionGate.ts)
- [Concept-discovery evidence screen](../../src/core/verification/ConceptDiscoveryGate.ts)
- [Live 26-agent research matrix](../../src/core/verification/LiveAgentMatrix.ts)
- [Current bounded design-loop protocol](../AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md)
- [Configuration management plan](CONFIGURATION_MANAGEMENT_PLAN.md)
- [26-agent readiness and engineering-release HOLD](../AGENT_READINESS_20261114.md)
- [B01 corrective PR #76](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/76)
- [Manual OpenFOAM commissioning PR #79](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/79)
- [B02 corrective PR #83](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/83)
