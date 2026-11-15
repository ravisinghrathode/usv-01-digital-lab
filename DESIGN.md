> **New UX direction selected (2026-11-15):** **Naval AI Lab — Engineering Sessions** is the canonical **future UI/UX design baseline** `NAL-UX-BL-001`. The Project Lead selected the adaptive investigation-based model (Worktable, Design, Experiment, Decide, Notebook) and explicitly rejected further Dockyard/Lab3/Atlas dashboard-style iteration as the target design. Read [the baseline](docs/design/ENGINEERING_SESSIONS_UX_BASELINE_V1.md), [screen/interaction refinement](docs/design/ENGINEERING_SESSIONS_INTERACTION_REFINEMENT.md) and [machine-readable contract](config/engineering-sessions-ux-baseline.json) before future frontend development. **This does not change which application currently runs at `/`**, does not approve vessel engineering, and does not imply implementation or deployment. The following material is the **current/historical implementation**, not the new design specification.

---

# Naval Design Studio — Standard Application Design

Naval Design Studio is the user-selected **canonical product name**. The standalone Dockyard 2.0 UI is the **standard application**, served at `/` and `/index.html`. The old Naval Studio frontend is retained at `/legacy.html` solely to operate its existing editors, agent execution, CAD study tools and protected engineering approval workflows. Previous `/?module=ID` URLs safely preserve legacy access to registered IDs.

The visual direction is a daylight-readable engineering control shell with a **dominant dark CAD viewport**, restrained maritime teal, disciplined typography, product selection, and contextual requirements/analysis/agent/evidence links. The five global workspaces are Design, Analysis, Agents, Director and Evidence. The explicit authority boundary remains: read-only default UI, guarded original engineering workflows.

**Default cutover is a routing and product identity change, not full migration of 24 engineering modules.** Missing evidence is marked unverified; imported meshes and 2D illustrations are never approved CAD. Build/typecheck/tests and human review are mandatory before merge; device/browser and Google AI Studio deployment acceptance are separate verifications. See `src/dockyard2/README.md` for exact runtime and legacy routing.

---

## Historical Dockyard Design A foundation

The design below documents the earlier incremental Dockyard/Clarity implementation still retained as the legacy editor. It is no longer the default UI architecture.

## Decision
**Dockyard (A)** is the selected master UI direction for Naval Studio. It supersedes Clarity as the active visual/interaction direction while retaining Clarity's trustworthy light-shell foundation. This is the **Operate** UX mode. The environment is a working naval architecture/design office with variable daylight, long review sessions and frequent transitions from geometric inspection to evidence. A legible neutral control surface surrounds one dark, technically focused CAD workstage.

## Five task-centred areas
The 24 original module IDs must remain intact; `src/studio/dockyardAreas.ts` is a user-facing IA index, not a replacement registry:
- **Design & CAD** — CAD Studio, Naval Architecture, Mechanical & Structural, Propulsion, Electrical & Power, Procurement & BOM
- **Engineering analysis** — Systems Engineering, Hydrodynamics & CFD, Simulation Centre, Real-Time Simulator, Generative Optimizer, Software & Autonomy
- **Programme decisions** — Project Overview, Risks & Decisions, Shipbuilding Lifecycle, External Software Register, Global USV Fleet, Knowledge Centre, Naval Notebook
- **Agent workbench** — 26-Agent Directorate, Deterministic Tools
- **Assurance & evidence** — Traceability Matrix, Verification & Validation, Approval Gates

Every original module appears exactly once among five groups; full module labels remain searchable, pinnable and navigable. Open tabs and existing component states are preserved.

## Defining experience
1. Open **CAD Studio** to a dark viewport with a light product tree and inspector. Source, revision, physical units and release remain explicitly unverified until the authoritative engineering thread supplies them.
2. Select a conceptual assembly or local OBJ group. The contextual dock displays **discipline-level loaded register records only** — it does not invent a geometry-to-requirement relationship. Imported OBJ groups without allocation say **Not mapped**.
3. Open a requirement or discipline register, simulation centre, agent investigator or traceability matrix from the contextual dock. These are navigational handoffs to existing workflows, not forged deep links.
4. Open **Agent workbench** for workflow framing, real loaded decision/risk queues and review routes. It explicitly does *not* claim real-time swarm or execution state. **Open existing orchestrator** exposes the original full agent controls and deterministic tools.
5. Open **Evidence & assurance** for real requirement → verification-plan → test-record references derived from explicit IDs. **Open full traceability matrix** exposes the original complete matrix.
6. The Engineering Director approves only through existing human-controlled approval routes. No UI status, agent answer, local mesh or visual change can independently authorize release.

## Semantic palette / usage
- Shell background `#eef3f5`; paper `#ffffff`; ink `#142d39`; secondary `#465f6b`; border `#d1dde1`.
- Maritime teal action `#087187` and light selected `#e1f1f4`.
- Dark CAD `#0b1c2a`, light instrument text `#e2edf4`. A secondary text role must meet WCAG AA against its actual surface, not only against a token in isolation.
- Amber `#825719` is reserved for explicit uncertainty, missing evidence and unverified state.
- Interaction targets minimum 44px for primary controls; responsive evidence tables may scroll horizontally inside their own container.
- Text-size control uses existing Comfortable/Large preference. No essential information relies on colour alone; focus is keyboard-visible.
- Visual priority: selected task → configuration/evidence context → engineering artefact → supporting registers → approval path. Avoid decorative KPI cards, fictitious run telemetry and ambiguous 'Verified' badges.

## Implementation ownership
- `src/moduleRegistry.ts` remains the 24-module authority; `src/studio/dockyardAreas.ts` reorganizes discovery.
- `src/studio/clarity.css` remains as base; `src/studio/dockyard.css` is a scoped layer applied only via `data-direction="dockyard"`.
- `CadStudioView` gets light tree/inspector chrome, dark hero viewport and `DockyardContextDock`.
- `DockyardAgentDesk` is the first screen of `agent-orchestrator`, retaining `AgentOrchestratorView` via explicit full-workflow navigation. The existing `orchestrator-tools` and `orchestrator-approvals` modules are unchanged.
- `DockyardAssuranceDesk` is the first screen of `traceability`, retaining `TraceabilityMatrixView` through **Open full traceability matrix**. The Verification & Validation module remains unchanged.
- No source CAD files, geometry measurements, solver algorithms, new approvals or database schema changes are introduced.

## Release and test conditions
Source tests: typecheck; the existing deterministic suite; all 24 module and IA mappings; UI markup and source contracts; production bundle; safety/governance CI. Browser acceptance: desktop 1440×900 and 1280×800, 768px tablet, 390px and 320px mobile, 200% zoom and both text-size settings; real computed contrast, hover/selected/focus states, keyboard-only navigation and dialog focus; imported/local CAD controls; real record search; the original full agent and traceability views; authentication/approval gates; no clipped UI.

**The GitHub feature PR does not deploy to Google AI Studio.** Merge remains user-controlled. Post-merge synchronized app revision and live browser screenshot testing are a separate acceptance boundary. Until then, the designation is code-implemented, live UI unverified.

## Skill execution disclosure
UI UX Pro Max itself was **not present in the available ChatGPT installed-skill catalogue** for this session. Dockyard was selected by the user after concept exploration informed by the prior design study and the available Impeccable design conventions. Do not claim the missing skill was executed.
