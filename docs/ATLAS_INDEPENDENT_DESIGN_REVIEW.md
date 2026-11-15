# Naval AI Lab Atlas — Independent interface replacement candidate

## Design review of the existing lab (source-based critique)

Compared:
- Default Naval Design Studio: `src/dockyard2/App.tsx`, `src/dockyard2/DesignScreen.tsx`, `src/dockyard2/dockyard.css`.
- Proposed Lab3 PR #125: `src/lab3/App.tsx`, `src/lab3/LabPages.tsx`, `src/lab3/styles.css`.

**Observed structural defect:** Both follow the same left sidebar → page heading → a large dark concept vessel card plus a smaller simulation card → evidence/risks rows. Lab3 polished that pattern, but did not change the operator's mental model. This is what the user rejected.

Other structural defects:
1. Navigation organizes work into pages instead of preserving product context while moving between actions.
2. Dark vessel art dominates but is not an engineering drawing space that visibly identifies its source and relation to inspected systems.
3. The simulation card competes with the product card as a second isolated box; choosing a source run does not feel like a continuation of product inspection.
4. Scattered summary panels force the engineer to infer which record, drawing, or solver case is actually authoritative.
5. The technical drawing is repeatedly called a concept, but still risks being mistaken for an approved vessel asset when presented without conspicuous data provenance.
6. Complex functionality is left behind the legacy UI with insufficient discoverability and too much screen chrome.

## New design contract — Atlas

**Product:** Naval AI Lab / Atlas Workbench. **Audience:** naval architects, mechanical and electrical engineers, simulation specialists, reviewers and project leads. **Primary task:** inspect a vessel product → select a source simulation → examine a requirement or verification record → open the governed original workflow.

**New topology, not a restyle**

```
┌───────────────────────── LAB BRAND + HORIZONTAL WORKSPACE NAV + SEARCH ─────────────────────────┐
│ Project USV-01 / explicit evidence state                                                       │
├─────────────┬─────────────────────────────────────────┬──────────────────────────────┤
│ Product     │ ONE CONTINUOUS WHITE TECHNICAL DRAWING    │ Engineering context inspector │
│ assembly    │ SHEET                                    │ Selected product              │
│ shelf       │ perspective / plan / section             │ Registered evidence by domain │
│             │ local OBJ visual review                  │ Open protected source          │
├─────────────┴─────────────────────────────────────────┴──────────────────────────────┤
│ FULL-WIDTH DARK SIMULATION RUNWAY                                                            │
│ horizontally selectable real studies → selected run details → open source output               │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
        Underlying knowledge / traceability / original 24 workflow deep links
```

**Key differences from Dockyard and Lab3:**
- NO left sidebar as global navigation (global rooms are a compact horizontal top ribbon).
- NO dark technical hero viewport (a high-contrast light drafting plate with original vector linework).
- NO two isolated hero cards (product rail, scene, inspector form one continuous document).
- NO right-side simulation card (simulations form one connected full-width lower instrument dock).
- NO invented performance graphs, vessel candidates or mass metrics.
- NO static readiness percentage cards; only record-derived facts and explicit source links.
- NO prior frontend components or CSS are imported. Existing type contracts, staff auth and read-only snapshot are preserved.

**Visual grammar:** steel-paper background `#eef2f5`, ink `#192b3a`, blueprint white, controlled royal-blue `#1e56a4`, caution `#be7b2a`, night-slate `#142e45` exclusively for the physics dock. Technical notations use monospaced numerals; other labels use the system sans stack. Tight rectangles / thin rules instead of decorative gradients, glass or excessive rounding.

## Five requested skills

The original upstream skills were read from the exact feature-branch copies in PR #124 (that installation was still open at the time of this build):

1. OpenAI `frontend-app-builder`: determine the entire UI architecture before coding and deliver a functional React + Vite workbench with verifiable visual evidence.
2. Anthropic `frontend-design`: consciously reject the prior template and change topology, typography and content rhythm for a navy engineering use case.
3. NextLevelBuilder `ui-ux-pro-max`: use searchable guidance for accessible lab-style typography, navigation, nondecorative scientific data, responsive layout, visible focus, restrained controls and honest missing-data states. The Python design-system-generator output is **not claimed**.
4. Addy Osmani `frontend-ui-engineering`: compose independent small components, type source data, use native dialogs, exact 24-module links, keyboard-operable controls, semantic output and meaningful empty states.
5. Addy Osmani `browser-testing-with-devtools`: adopt the browser acceptance procedure. Direct Chrome DevTools MCP is not connected to this session; GitHub Actions with isolated Chromium/Playwright provides the verified alternative, and authenticated QA remains separately required.

**Original imagery:** technical vector concept drawings are authored directly in `VesselBlueprint.tsx` as separate isometric, plan and section views. They are deliberately illustrative until a reviewed CAD configuration exists. An imported local OBJ visualizer reuses the pure trusted/limited OBJ parser, but no old UI component.

## Workability and information-access contract

- 5 top-level rooms: Vessel studio, Simulations, Evidence, Agent directorate, Library.
- Selected product assembly updates a nearby inspector and discipline-linked register counts. These counts are *not* asserted as geometry-linked evidence.
- A full-width runway allows explicit simulation selection and displays the source record's solver, revision and validation state; any actual solver output remains in the protected Simulation Centre until source-backed result ingestion is approved.
- Physics lab uses a case rail and a large explicitly unavailable plot area, with input/revision/validation dossier. It does not draw invented curves.
- Evidence browser filters requirements and displays only record ID relationships actually present.
- Agent directorate links to the existing 26 agents, approvals and decisions; there are no extra AI skills in the naval-agent runtime.
- Library links to global fleet research, naval notebook and knowledge sources.
- Global Ctrl/Cmd+K searches all 24 original modules plus loaded requirements, simulations and risks; native module directory enumerates every preserved route.
- Existing sign-in and authenticated snapshot; fallback illustrative records are labelled. Protected record mutation, solvers and approval gates remain in `/legacy.html`.

## Preview and release safety

New **independent** preview: `/atlas.html`, command `npm run dev:naval-atlas`.
Default `/` remains Naval Design Studio; `/legacy.html` remains the authority-controlled engineering editor. No user-approved cutover is inferred from creating this PR. The earlier Lab3 PR #125 is neither used nor changed.

Acceptance before potential cutover:
- TSC, deterministic tests, Vite production builds and protected GitHub controls;
- isolated Chromium screenshot + DOM checks at 1440, 1280, 1024, 768, 390 and 320 px, both viewport and full-page captures; CSS 200% zoom check;
- working product assembly and view selectors, import a synthetic OBJ locally, select a real source-record simulation, filter physics runs, select an evidence requirement, navigate five rooms, Ctrl/Cmd+K and the exact 24 module links;
- no horizontal overflow, visible keyboard focus, tab order and accessible dialogs;
- separately authorized real staff session check, screen-reader check, actual OS zoom/200% check and review of representative engineering models;
- authenticated human governance sign-off and deployed SHA verification.

**No approval, merge or deployment authority is granted by frontend success or CI.**
