# Naval AI Lab — Engineering Sessions UX Baseline

**Baseline ID:** `NAL-UX-BL-001`  
**Revision:** 1.0, 2026-11-15  
**Decision:** Project Lead selected **Engineering Sessions** as the design direction, based on the four conceptual interfaces developed in conversation: Investigation Entry, Design Worktable, Experiment Theatre and Decision Room.  
**Baseline type:** **UX interaction and visual design direction only**. It is **not** an approved CAD model, technical configuration, physics result, implementation release, or deployment authorization.  
**Implementation status:** Concept/refinement; no claim of pixel-faithful production UI or real source-data integration.  
**Product label:** **Naval AI Lab**. `Engineering Sessions` names the operating model, not a new engineering agent or independent project.

## 1. Foundational product thesis

**A persistent engineering investigation is the primary unit of work.** The user opens an engineering question, not a dashboard, agent list or software module. The lab organizes vessel revisions, hypotheses, simulation studies, requirements, evidence, agent contributions and human decisions around that question.

An investigation survives changes of mode. When the user switches among **Worktable**, **Design**, **Experiment**, **Decide** and **Notebook**, the **same** investigation, selected configurations, evidence selection, source revisions and outstanding questions remain current.

**Primary user outcome:** Quickly answer _which design candidate was studied, under which engineering conditions, with what reproducible evidence, and what remains unverified?_ Never hide the answer in a separate global menu.

### Prohibited regression

Do **not** recreate Dockyard, Lab3 or Atlas through cosmetic changes. Specifically prohibited as the main interaction architecture:

- permanent left sidebar of 24 applications and static module pages;
- vessel-hero card next to a simulation-status card;
- KPI tiles used as engineering readiness evidence;
- generic dark CAD illustration with no direct investigation context;
- a long context inspector forcing the simulation area below the first meaningful view;
- apparent "real" plots, metrics, verification badges or performance deltas generated from example art.

The historical implementations remain working references for **capability mapping and safe handoff only**, not as visual templates.

## 2. Navigation: activity modes, not application silos

1. **Worktable — orient and investigate:** one open investigation, its current engineering question and an uncluttered assemblage of live design objects and source documents. Supports selecting investigation objects, creating a governed draft investigation, attaching a source document and opening a comparison. This is not a KPI homepage.
2. **Design — configure and compare:** one or two large synchronized 3D model views. Geometry and alternative configuration are the heroes. The selected part and exact configuration revision are persistent context; tools for measurement, component isolation, annotation and comparison appear only as relevant. When no reviewed geometry is available, say so visibly and offer the already-supported local OBJ viewer and authoritative CAD handoff.
3. **Experiment — run-aware scientific theatre:** the selected study (or two comparable runs) controls the main canvas. Source-backed flow/response data and a synchronized time/condition cursor dominate **only when actual validated result files exist**. Otherwise the canvas is an explicit source-required state with useful actions and provenance, not fabricated water flow or charts. Run inputs, solver identity, assumptions, units, revision and execution/validation state remain accessible without opening an unrelated page.
4. **Decide — inspect the evidence argument:** a directed, selectable argument map from engineering question to candidate, constraints, supporting/counterevidence, open uncertainties, independent review and human authorization. The right-hand review docket shows blockers first, not a synthetic aggregate score. The UI cannot set approval merely because an element is green or a tab is visited.
5. **Notebook — preserve the digital thread:** a readable, ordered, revision-aware investigation narrative containing hypotheses, decisions, agent receipts, attached sources, reproducible calculation references and action history. This is an evidence-backed record, not a freeform AI answer promoted to truth.

The primary switch between modes is in a compact top command bar. **No mode switch resets context or changes source data.** Deep links include `investigationId`, `revisionId`, optional `studyId` and active mode, with permissions checked server-side.

## 3. Canonical session objects

`Investigation` (one engineering question) has:

- immutable ID; human-readable question; project/workstream; created/updated/by; status `DRAFT | ACTIVE | IN_REVIEW | CLOSED`;
- **candidate set**: linked `DesignRevision` records with exact revision/configuration IDs and role `reference | candidate | alternative`; a visual 3D file is not itself proof of authoritative CAD;
- **conditions**: explicit environmental/operational/loading assumptions with units, source and applicability; incomplete values are `TBD`, not copied from concept imagery;
- **experiment set**: `SimulationRun` identifiers linking solver, inputs, geometry revision, boundary conditions, units, artifacts, validation and review;
- **requirements and constraints**: explicit requirements/limits relevant to the question, each with versioned references;
- **evidence links**: source `EvidenceRecord` IDs, per-claim provenance, raw artifact identifiers, integrity and review state;
- **uncertainty/issues**: unknowns, contradictions, risk/disagreement, verification tasks and accountable owner;
- **agent receipts**: who/what performed which authorized or draft work; timestamps, tools, source inputs, output revisions, review status;
- **human decision**: explicit independent-review and authorization records, never inferred by UI state.

The frontend maintains a **session view state** separate from engineering authority: mode, selected model pair, camera, cursor/condition, current claim, open tool drawer and keyboard focus. Persistence and links must use existing guarded APIs or new reviewed contracts, never local visual state as authoritative engineering data.

## 4. Screen hierarchy and responsive behaviour

### W1 — Investigation Worktable (home inside an open investigation)

- Top: quiet identity + investigation name, project, configuration source and current status; global search and a **contextual** add action.
- Main: **one dominant vessel object** (if an actual source-backed geometry is available) and an adjacent **investigation relationship canvas** with candidate, test, requirements, notes, and unresolved review nodes; opening a node reveals a precise source record.
- Context: small inspector drawer shown **on selection**, not permanently occupying every screen. Recent research and agent work appear as linked activity, not detached mini apps.
- First use: an investigation chooser with a search and **Create investigation** action. Do not fabricate candidate sets on an empty project.
- On mobile: investigation title, selected main object, two clear actions ("Explore design" / "Inspect evidence") and compact linked objects in a linear order. No tiny network graph as sole navigation.

### D1 — Design Compare

- **60–75% of available working area is the model/comparison stage** when geometry exists; design A/B synchronized pan/zoom/orientation with a single clearly labelled toggle for synced vs independent cameras.
- The models **always** display model source, units and revision. A/B metrics only display if same condition and measurement methods are comparable; never infer from conceptual SVG.
- A slim object hierarchy (open on selection) and contextual property drawer replace full-time global nav. Exact measurements/sections/BOM/CG show `TBD` until verified.
- A difference overlay (geometric/parameter) is only available when actual compatible data exists. Absent data produces a useful "Source comparison unavailable" state, not an imaginary heatmap.
- Canvas controls are accessible in keyboard and touch modes; no gesture-only essential action.

### E1 — Experiment Theatre

- Main stage expands to available, trustworthy physics output: flow/wavefield, time history, RAO, stability or other **appropriate discipline output**. Do not force CFD/water visuals onto unrelated study types.
- Select run/reference under **the same operating conditions**. Available comparable result channels become selectable synchronized plots with labelled units, scales and uncertainty.
- Boundary conditions, geometry revision, solver version, grid/convergence/validation status, data integrity and link to source files are first-class.
- Missing result state occupies the **same hero canvas area** and identifies which source is missing, why data cannot be plotted, and where to open its governed record.
- Playback is available only for actual time-indexed simulation output; no decorative play control.

### R1 — Engineering Decision Room

- Main stage is an **argument map**: requirement/claim → relevant candidate → supporting and contradicting evidence → unresolved uncertainties → independent reviewers → authorized decision.
- Node statuses are evidence-based: `SOURCE_MISSING`, `UNREVIEWED`, `TOOL_CHECKED`, `INDEPENDENT_REVIEWED`, `APPROVED`. `APPROVED` requires the existing protected human authority record.
- Each node opens source, revision, method, review owner and evidence confidence. Contradictions are never hidden behind overall scores.
- The review docket displays the smallest set of blocking issues and next verification actions; reviewers can comment or draft findings where existing permissions allow, but no unguarded approval shortcut is added.

### N1 — Lab Notebook

- One linear, inspectable record of what changed, what was attempted, what evidence was produced and what was decided.
- Versioned citations and source manifests, reproducible computational references, recorded negative results and reverted/abandoned ideas stay visible.
- Agents may propose notebook material but not certify a calculation, silently edit locked findings or finalize approvals.

## 5. Visual design direction (baseline)

Aim for a **quiet scientific instrument with generous spatial canvas**, neither a gaming cockpit nor a dashboard template:

- Palette: warm light work surface `#F7F8F6`; ink/navy `#102A43`; cobalt action `#1554C0`; hairlines `#DCE3E8`; very restrained sea-teal `#267E8A`. Reserve amber `#9B601B` for caution and green `#176341` for **grounded** verification states only.
- Typography: readable, compact modern sans (Inter/IBM Plex Sans or confirmed equivalent); mono only for configuration IDs, values, units, run IDs and provenance. Explicit scale: 12 metadata, 14 supporting, 16 body, 20 section, 28–32 screen title. Minimum accessible font controls, no dense 9px annotations as operational text.
- Component geometry: calm flat planes, deliberate 1px borders and 6–10px radii where appropriate; almost no shadow. No glassmorphism, ornamental 3D chrome or meaningless gradient hero.
- **Spatial priority adapts to activity:** the model dominates Design, sourced scientific visualization dominates Experiment, the evidence argument dominates Decide. The investigation/context strip is constant, compact and never the hero.
- Component copy uses precise engineering language; never show "Verified", "Live", "Compliant" or numerical vessel performance without evidence.

## 6. Critical interactions to prototype

1. **Enter investigation:** retrieve current selection and evidence; choose/create case; do not show invented revisions if none exist.
2. **Select two candidates → Design Compare:** preserve model/revision IDs, compare equal conditions, support "not comparable" explicitly.
3. **Select a simulation → Experiment:** preserve selected candidate and conditions, show actual output or source-required state.
4. **Select an uncertainty → request specialist analysis:** the orchestrator identifies appropriate A01–A26 roles, shows proposed scope, permissions, inputs and review requirements. Agents are not top-level navigation tabs.
5. **Open evidence → Decide:** inspect source chain and contradictory findings without losing model/run context. Review/authorization uses existing protected tool boundaries.
6. **Return to Notebook/Worktable:** show the investigation's reproducible timeline and artifact IDs. Switching work modes does not turn draft data into verified data.

## 7. Failure and honesty states

- Empty case (no investigations yet); offline/backend unavailable; authenticated/unauthed; stale or nonmatching revision; local mesh without approved CAD; missing solver outputs; inconsistent run conditions; incomplete requirement links; conflicting evidence; agent execution unavailable/queued/rejected; independent reviewer missing; authorized signoff pending.
- Prominent **"Example visual — not real data"** label on any design concept with rendered hypothetical numbers or simulation images; production replaces with actual source-backed data.
- All example renders from the ideation conversation are **visual inspiration only**, not source files or engineering evidence and are not to be ingested into data registries.

## 8. Technical implementation guardrails

- Do not change the 26 engineering agents, their 31 frozen engineering skills, protected runtime, backend authority, approvals, or solver qualification through this UX work.
- Map each mode to existing current records, APIs, libraries and `/legacy.html?module=...` functionality before replacing live interfaces. State missing backend capabilities rather than faking interactions.
- Investigations require a reviewed, minimal source-of-truth entity contract before adding persistent create/edit controls.
- Keep both existing default and legacy routes until a separate reviewed cutover; do not claim adoption from a design-spec approval alone.
- Use the five project-local UI skills and maintain consistent, observable, keyboard-accessible, touch-operable controls across desktop (1440/1280), tablet (768), mobile (390/320) and 200% zoom.
- Capture actual browser outputs; acceptance requires screenshots compared to the chosen design concept, navigation/focus, semantics, long technical names, real server/empty/error states and truthful study provenance.

## 9. Baseline change control

This **v1 direction is locked as the design starting point** by the Project Lead; detailed pixel-specific designs, component APIs and feature parity are **not yet approved**. Every proposed UX PR must explain how it implements `NAL-UX-BL-001` and what task-specific mode it covers. A departure from the primary investigation operating model, five activity modes, source-truth policy or contextual-agent rule requires a documented design amendment rather than silent drift.

**Next deliverables:** (a) detailed cross-mode journey and interaction states, (b) coordinated high-fidelity desktop/tablet/mobile designs with safe placeholder data, (c) source contract/feature gap matrix, (d) validated clickable prototype and task-based usability critique, (e) reviewed technical implementation plan. No new release authority is implied.
