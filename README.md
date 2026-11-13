# NAVAL-USV | USV-01 — 26-Agent Digital Engineering Lab

Private engineering workspace and deterministic multi-agent platform for the **USV-01 unmanned surface vessel project**.

---

## 1. System Overview

The USV-01 Digital Engineering Lab is an operational, modular multi-agent platform combining:
- **26 Specialist Engineering Agents** across 7 naval engineering divisions (A01–A26).
- **Central DAG Orchestrator** managing topological task execution, parallel computation, and message passing.
- **Deterministic Naval Tools Suite** for hydrostatics ($KM_T, GM_T$), hydrodynamic resistance ($P_E, P_B$), mass balance ($KG, LCG, TCG$), DC electrical load sheets, bottom slamming scantlings, and COLREGS 1972 encounter kinematics.
- **Human Authority Approval Gates** requiring explicit Engineering Director sign-off on safety-critical decisions.
- **Shared Memory & Parameter Register** with strict `TBD` tracking and live Obsidian `[[wikilink]]` vault export.
- **Interactive Command Dashboard** (Vite + React + Tailwind + Lucide).

---

## 2. Quickstart & Commands

```bash
# Install dependencies
npm install

# Run automated verification test suite (test totals come from each CI run)
npm test

# Build production bundle
npm run build

# Launch interactive local development server
npm run dev
```

---

## 3. Engineering Documentation

- [Architecture Specification](docs/ARCHITECTURE.md)
- [Verification & Acceptance Report](docs/VERIFICATION_REPORT.md)
- [Project Baseline Context](USV01_PROJECT_CONTEXT.md)
- [Safety & Engineering Governance](docs/SAFETY_AND_GOVERNANCE.md)
- [Repository Synchronization](docs/REPOSITORY_SYNC.md)

---

## 4. Engineering Governance & Safety Rules

1. **Human Authority:** The user remains the Engineering Director. No agent may independently approve safety-critical baselines.
2. **Actuator Air-Gap:** Non-operational digital lab environment. No physical vessel actuators, steering/throttle hardware commands, weapon targeting, or combat-payload features are in scope.
3. **Unknowns as TBD:** Never fabricate vessel particulars. All open parameters are preserved as `TBD`.
4. **Deterministic Separation:** Deterministic naval calculations are strictly separated from probabilistic LLM synthesis.

## ChatGPT-only agent runtime (NOT certified vessel design)

All 26 canonical agent role definitions now use the operator-authenticated ChatGPT Codex CLI (`codex_cli`) for AI synthesis. The CLI must be installed and signed in on the execution machine. Set `AI_REVIEW_PROVIDER=codex_cli`, `USV_SUBSCRIPTION_PILOT=enabled` and `USV_ALLOW_PAID_AI_API=false` before invoking live agents. The repository does not itself deploy or continuously run the agents. If authentication or runtime is unavailable, live agent tasks fail rather than using Gemini. All outputs remain unverified until independent review and engineering acceptance.

## Full 26-agent campaign and independent evidence gates

The three operational claims are **separate** and evidence-gated. They must not
be inferred from registration, a CI mock, or an AI self-review.

- `npm run acceptance:codex-agents` — zero-model 26-role deterministic preflight.
- `npm run acceptance:codex-agents -- --execute` — real ChatGPT/Codex
  specialist execution in engineering dependency order; source-pinned and
  journaled per role; requires an authenticated trusted execution host.
- `npm run mission-control:attest-host` — time-limited signed live host evidence
  after 26 authenticated executions, using operator-held private key.
- `npm run acceptance:full-26` — fail-closed three-gate operational,
  engineering-campaign and independent-reference evidence report. Add
  `--require-all` to fail exit status until all evidence is present.
- `npm run acceptance:sign-independent` — separate qualified reviewer
  signature tool; it does not run automatically or fabricate technical proof.

The protected-main `USV-01 26-Agent Authenticated ChatGPT Commissioning` GitHub
workflow has offline and trusted-self-hosted-live modes. A synthetic catalog
can verify model execution but cannot establish real engineering accuracy or
baseline release.

See [26-Agent Operational Acceptance Protocol](docs/USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md)
and [Laboratory Commissioning Protocol](docs/LAB_COMMISSIONING_PROTOCOL.md).

## Two-stage authority model

**Lab commissioning:** The existing subscription-pilot opt-in permits bounded, non-operational ChatGPT/Codex research even while vessel particulars are TBD. This is not vessel-baseline approval and does not authorize physical actuators or an engineering release.

**Vessel baseline:** Independent numerical/physical evidence and Engineering Director approval are required when accepting a candidate vessel design. Source-code risk is separate from approval purpose: restricted laboratory software runs protected CI without a vessel ECR; governance, authentication and workflow changes require an independent exact-head GitHub software peer review or explicit authenticated repo-admin PR-author signoff on the exact head (not independent review); naval engineering evidence/release changes additionally require a Director Ed25519 ECR tied to the source digest. Stage E enforces these distinctions without granting approval. Signing source revisions never certifies the vessel design.

See [Lab Commissioning and Evidence Release Protocol](docs/LAB_COMMISSIONING_PROTOCOL.md). The 26-agent campaign is offline by default; `--execute` triggers real model calls only after repository/research preflight and authenticated Codex availability.

## Design-and-innovation development (NOT certified vessel design)

- `npm run audit:capabilities` — derive the current 26-role tool/rubric capability report from live source.
- `npm run concept:research -- --mission-file references/concept-mission-draft.json --source-sha <SOURCE_SHA>` — prepare research cases for all 26 roles.
- `AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled USV_ALLOW_PAID_AI_API=false npm run design:iterate -- --mission-file references/concept-mission-draft.json --source-sha <SOURCE_SHA> --seed 1337 --revisions 3` — run real A01 proposal / A15 critique cycles via a locally installed, signed-in ChatGPT Codex CLI. No Gemini, paid API or mock fallback.
- `RemoteSolverJobs` and `ToolBenchmarkCampaign` support explicit CFD/FEA job manifests and externally sourced numerical comparison only; neither establishes solver commissioning or marine certification.

The legacy heuristic optimizer uses a replayable seed and **12 synthetic rule checks**, not agent votes. Its old hard-coded Sobol indices and fictitious safety/sea-trial proof are removed. The authentic, bounded A01 ↔ A15 design loop is a separate unverified research process. See [Design loop and solver protocol](docs/AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md) and the 13-workstream acceptance report. Safety-critical PRs require independent review and exact-baseline human approval before merge.
