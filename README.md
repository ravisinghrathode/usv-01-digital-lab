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

## Design-and-innovation development (NOT certified vessel design)

- `npm run audit:capabilities` — derive the current 26-role tool/rubric capability report from live source.
- `npm run concept:research -- --mission-file references/concept-mission-draft.json --source-sha <SOURCE_SHA>` — prepare research cases for all 26 roles.
- `npm run design:iterate -- --mission-file references/concept-mission-draft.json --source-sha <SOURCE_SHA> --seed 1337 --revisions 3` — run actual A01 proposal / A15 critique cycles on an authorized backend with `GEMINI_API_KEY`. No fallback success is accepted.
- `RemoteSolverJobs` and `ToolBenchmarkCampaign` support explicit CFD/FEA job manifests and externally sourced numerical comparison only; neither establishes solver commissioning or marine certification.

The legacy heuristic optimizer uses a replayable seed and **12 synthetic rule checks**, not agent votes. Its old hard-coded Sobol indices and fictitious safety/sea-trial proof are removed. The authentic, bounded A01 ↔ A15 design loop is a separate unverified research process. See [Design loop and solver protocol](docs/AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md) and the 13-workstream acceptance report. Safety-critical PRs require independent review and exact-baseline human approval before merge.
