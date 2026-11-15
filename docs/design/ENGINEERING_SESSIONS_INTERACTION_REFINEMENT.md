# Engineering Sessions — Interaction Refinement & Screen Blueprint

**Companion to:** `NAL-UX-BL-001` (canonical UX baseline).  
**Stage:** interaction design, not functional implementation.  
**Non-negotiable:** the investigation follows the engineer, not the reverse. Changes of mode alter the canvas while preserving source selections and revision identity.

## 1. A single recognizable UI grammar

### A 64px global command line, not a permanent navigation wall

- Left: small Naval AI Lab identity, project/revision indicator and breadcrumb to investigation search. Keep programme identity visible without duplicating a dashboard heading.
- Centre: a compact but prominent `Worktable · Design · Experiment · Decide · Notebook` mode control; selected mode is both visibly highlighted and programmatically announced.
- Right: universal search (`Cmd/Ctrl+K`), recent investigations, source-status indicator, staff identity and contextual `Add / Run / Request Review` actions. Avoid identical action labels across incompatible modes.
- Below (when an investigation is open): a thin **session spine** with the question, active configuration(s), conditions, source currency and outstanding review state. The spine is constant; selecting a node updates it in place.
- Show stale, unmatched or illustrative source state in plain language. Don't display a green "validated" indicator in the global header.

### Contextual inspector, never a layout tax

- No selection: canvas can expand; inspector closed.
- Selection of geometry, simulation or evidence: open an inspector with **source ID, revision, applicability, provenance, uncertainty and next actions**.
- Inspector can be pinned, resized or dismissed, and can be opened by keyboard.
- It is the **same component shell** in all modes but uses different task-specific data. The main canvas is never squeezed to a postage stamp.

### The session tray

A small collapsible tray holds the **selected question, source files and live investigation artifacts**. This is the continuity mechanism across modes, not a second dashboard. An engineer can drag or invoke an object from the tray into the active activity; moving it changes **view context**, not authoritative engineering records.

## 2. Six key screen compositions

### S0 — Investigation Navigator (no investigation selected)

A quiet search-first index of current studies, with clear filters (`Active`, `Awaiting evidence`, `Review`, `Closed`) derived from authorized records. Each result shows question, selected source/configuration, last activity and evidence state. New projects show a genuine empty screen with `Start an investigation`. Avoid a generated fleet of fake candidates or overall readiness scores.

**Acceptance question:** Can the user find the current mass-reduction study without knowing which software module owns it?

### S1 — Worktable: the engineering question in context

The main area is a **loose but constrained collection of linked source objects**, not an unlimited freeform mural. The vessel object is large when a real renderable revision exists; a hypothesis object, alternative revision, study and requirement collections surround it in a limited **three-zone working surface**. The user can switch between `Spatial` and `Structured` views; both represent the **same underlying graph**.

- A connected item can be selected, opened into its source, compared, or attached to a draft investigation.
- No speculative link is drawn as a verified relationship.
- Show the most relevant next unresolved question, not a permanent task dashboard.

**Acceptance question:** Does the user understand which experiment belongs to the selected vessel revision?

### S2 — Design: synchronized A/B analysis

A reference/candidate pair fills the stage, with synchronized cameras and a single shared viewing coordinate system by default. The top of each pane clearly displays exact source model and revision and whether it can be compared.

- Primary functions: `Orbit`, `Section`, `Isolate part`, `Measure`, `Overlay changes`, `Add annotation`.
- Those controls are **only enabled** when backed by capable tools and valid geometry. No fake clipping planes or measurements.
- A slim difference ribbon can show actual sourced deltas and their assumption set; where missing, show `No comparable mass properties`, not green `-11.4%` art.
- Selecting an interface or structure reveals requirements, CAD owner, BOM references and source evidence, not a global dashboard.

**Acceptance question:** Can a naval architect explain exactly which two geometric revisions were compared under which conditions?

### S3 — Experiment: scientific visualization theatre

The hero is **one meaningful result channel**, not an animation for appearance. A time/condition ribbon coordinates the vessel/field view and charts for recorded data. The adjacent conditions docket establishes solver version, geometry revision, mesh/convergence, environmental assumptions, units and provenance.

- Mode starts by selecting an actual `SimulationRun` record. Two runs can be compared only after a compatible-case check for geometry, environment, variable definitions and scales.
- Run timeline, play/pause and field picker are disabled until the source contains time-indexed or spatial datasets.
- When only metadata is available, the empty canvas says: `Simulation record found; no reviewable output file attached.` and links to the authoritative source.
- Missing/invalid result files are treated as evidence problems, **not** an empty card to decorate with CFD stock imagery.

**Acceptance question:** Can the simulation engineer reproduce the selected plot from recorded inputs and artifacts?

### S4 — Decide: evidence argument and review docket

Replace a mass of green status cards with a **structured argument**:

```
Engineering question
    ├── Candidate and controlled assumptions
    ├── Requirements / acceptance conditions
    ├── Evidence in support
    ├── Evidence that conflicts or weakens claim
    ├── Outstanding verification
    └── Independent review → protected human authorization
```

The main stage shows the argument nodes with explicit relation types. Dotted edges are hypotheses/unreviewed; solid edges are supported trace links. The inspector's review docket leads with **blocking uncertainty** and required action. Reviewer notes and signatures are linked as original records, never mocked.

**Acceptance question:** Could an independent reviewer challenge the conclusion using only visible sources and one-click drill-downs?

### S5 — Notebook: reproducible project memory

A readable journal of the investigation: questions, parameter versions, alternative branches, solver case IDs, source acquisitions, agent tasks/receipts, test results, conflicts, review events and decisions. Data rows link to exact artifacts and immutable revisions. Filter by `Design`, `Experiments`, `Sources`, `Agent findings`, `Decisions`.

**Acceptance question:** Can a new engineer reconstruct why this candidate exists and which measurements are still unknown?

## 3. Refinement of the four approved visual concepts

- **Investigation entry (previous mobile concept):** keep the calm navy/ivory visual style and recognizable vessel object; replace static five-row menu with a single primary `Continue investigation` action, prominent selected question, small source objects and **two most relevant next actions**. Do not imply that baseline and lightweight alternative records exist unless loaded.
- **Design Worktable (previous desktop concept):** retain strong model visibility and generous whitespace, but remove constant inspector rows filled with illustrative masses. The vessel and source graph are selectable objects; the A/B view opens only when comparing. Keep the right inspector contextual.
- **Experiment Theatre (previous CFD concept):** retain hero simulation and synchronized chart composition, but replace all synthetic plots, `validated` words and specific speeds/GM/RAOs with a truthful source-aware template. Show real channels only when linked run outputs are present; otherwise a large, designed evidence-required state. Charts are not decorations.
- **Decision Room (previous evidence-map concept):** retain readable argument flow and distinct approval boundary, but distinguish proposal vs evidence and conflicts; do not show all supporting evidence as green/verified. Docket shows uncertainties first and exact human-review stage, not a prematurely reassuring feasibility conclusion.

## 4. Full investigation journey: mass reduction without assumed numerical evidence

| Step | Engineer's action | Context preserved | System response | Blocked/missing-data response |
| --- | --- | --- | --- | --- |
| 1 | Search for mass reduction | Project/workstream ID | Open source investigation | `No matching investigation`, option to create an authorized draft |
| 2 | Select reference revision | Investigation ID | Load exact configuration and metadata | `Approved geometry not available`, open CAD record |
| 3 | Add alternative revision | Reference revision & assumptions | Compare valid source-linked revisions | `Revision incompatible or source missing` |
| 4 | Explore design in A/B | A/B revision IDs, conditions | Synchronized real model view and supported attributes | `Mass/CG/stability not established` |
| 5 | Open Experiment | Revision IDs, question and selected study | Load recorded solver conditions and actual result artifacts | `Study has no verified output`, request/check source |
| 6 | Ask specialists | Investigation, unknowns, source IDs | Review scoped A01–A26 task proposal and governed handoff | `Agent or source unavailable`, retain draft task and error reason |
| 7 | Review evidence | Candidate set and assumption IDs | Draw traceable argument and contradictory evidence | `No independent review` and outstanding verification tasks |
| 8 | Open Decide | Full investigation context | Present review docket with human gate | No self-approval or synthetic readiness |
| 9 | Consult Notebook | Entire versioned event trail | Reconstruct decisions and unresolved tasks | Explain missing manifest/record rather than summarize as fact |

## 5. Access to information without navigation clutter

- Global search: `investigations`, `configurations`, `simulations`, `requirements`, `tests`, `risk decisions`, `public fleet references`, `knowledge documents`, and protected `modules` with a scope filter and exact source links.
- Contextual inspector: related evidence, affected requirements, agent findings, source revision, timestamps, owner, missing constraints.
- Quick-open command palette: `Open CAD`, `Open source simulation`, `Global fleet reference`, `Open traceability`, `Open agent orchestrator`. Each triggers a real enabled action or governed legacy deep link.
- No need to show 26 agent names or 24 module names in the top-level navigation. Both remain searchable and accessible in two or fewer meaningful actions; exact source identity is shown in the resulting record.

## 6. Responsive and accessibility refinement

- **1440/1280 desktop:** main content takes space; inspector opens only when selected. A/B comparisons provide clearly visible condition banner and accessible linked cursors.
- **768 tablet:** primary canvas full width; inspectors become bottom sheets / docks. Essential engineering conditions remain readable while plotting or comparing.
- **390/320 mobile:** meaningful single-column reading hierarchy; top mode selector stays accessible as a horizontally scrollable labelled control **with visible continuation**, not hidden or abbreviated beyond comprehension. A/B model comparison switches to an A/B toggle or vertical stack with clear shared conditions. Decision map is a structured ordered outline that remains source-linked.
- Keyboard semantics: navigation, selectable objects, plot channels and provenance; dialogs retain focus/return; command menu supports Ctrl/Cmd+K without interfering with CAD controls.
- Color and plot shape/labels both convey status; no green-only proof. 44px touch targets, reduced-motion, high-contrast and screen-reader-friendly data table alternative for graphs.

## 7. Unresolved design questions to validate (not implemented)

- Should an investigation be a **first-class server entity** or a governed view over existing requirements, CAD revisions, simulation runs and decision records? Requires data-engineering design.
- Can the existing CAD and solver viewers provide synchronized A/B cameras, sections and shared time cursors? If not, these controls remain disabled until a reviewed implementation exists.
- Which sourced results can be plotted interactively without data leakage, invented units or overclaiming validation?
- What happens when the project has zero source-backed engineering artifacts? Must retain a useful empty-state research/requirements workflow.
- What should independent reviewers see differently from engineers while preserving the same source-linked session?
- How should disconnected/low-bandwidth field users continue reviewing cached source documents without stale-data confusion?

## 8. Recommended next implementation slice

Build **one vertical investigation journey** using explicitly labelled synthetic fixtures plus source-compatible interfaces: investigation selection → two configuration references → a study with missing results → evidence dossier → review blocker. Include a control that **reopens the original source module** instead of duplicating or bypassing its authority. Validate the actual task flow with an engineer, naval architect and independent reviewer before expanding the product.

A reference mockup is not the release criterion. Measure: ability to identify selected revision, recover source record, recognize absent result, compare valid cases, and locate blockers without leaving the session. Document which tests were run vs only planned.
