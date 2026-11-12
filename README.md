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

# Run automated verification test suite (22 unit & integration tests)
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