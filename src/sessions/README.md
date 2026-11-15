## Visual-fidelity V2 acceptance (2026-11-15)

The programme selected **Engineering Sessions** as the standard UX baseline.
The original initial V1 render did **not** meet that baseline and is superseded
by the source-controlled V2 implementation:

- `FidelityWorktable.tsx`: full vessel visual, conceptual assembly focus,
  contextual source inspector and connected visual investigation relationships;
- `FidelityPhysicsReview.tsx`: task-specific scientific theatre, decision
  argument map and large-format notebook (no synthetic numerical plots);
- `VesselVisual.tsx`: four original Blender-rendered, transparent cinematic
  USV concept images with a labelled fallback (two variants × actual
  isometric/plan camera projections);
- `scripts/ui/render_sessions_vessels.py`: reproducible Blender modelling
  and physically-based rendering source; explicitly **not** certifiable CAD;
- `fidelity.css`: dedicated visual system for the five task-specific modes,
  with viewport corrections to show the product and investigation graph
  together;
- `sourceSearch.ts`: read-only search of existing loaded requirements,
  simulation records, risks and notes via the same snapshot used by the
  standard lab. Entries are labelled authenticated or illustrative and open
  the governed *register*; none is silently linked as evidence to the demo.

**The investigation itself remains a synthetic demonstration.** Search
of real server registers is not the same as a source-backed investigation
entity or a validated design comparison. All original engineering authority,
agents, solvers, approvals and data mutations remain unchanged.

Real-browser acceptance includes mode navigation and top-of-page focus,
product-stage prominence, source-visible missing-result states, responsive
mobile hierarchy and screenshot comparisons; passing tests alone is
insufficient for visual release. The separately authorized root cutover is
not an engineering release or data-approval event.

# Engineering Sessions — Standard Interface

**Implementation:** Standard investigation interface at `/` and compatibility preview `/sessions.html`, based on the Project Lead-selected `NAL-UX-BL-001` direction. Engineering examples remain synthetic, source states are explicit, and existing write/approval routes stay in the governed workspace.

## Why this is materially different

The UI no longer routes the user through five unrelated dashboards. A single `SessionView` maintains the selected question, product/revision object, proposed study, projection, camera synchronization, contextual inspector and local notebook observations while five **different** stages change around it:

1. **Worktable:** Source-relationship work surface with the vessel concept central, clickable example objects and on-demand inspection.
2. **Design:** Dual A/B visual arrangements, real working projection/synchronization/highlight toggles and prominent comparison-blocked explanation. No fictitious mass or hydrostatic delta.
3. **Experiment:** Study selection changes the central scientific theatre. No CFD image or plot appears without a result artifact; the missing source is explained in the result canvas.
4. **Decide:** Directed argument, constraints, source gaps, contradictions and protected independent review; a button creates a *local task draft*, not an approval or live agent run.
5. **Notebook:** A chronological investigation journal with local observations and task drafts retained while switching modes. Refreshing discards them; no records are posted.

The compact session spine remains visible in every mode. A context inspector opens only when a specific object is selected; global search reaches all 24 original modules plus the labelled example objects.

## Evidence integrity

**The active investigation and its technical drawings are synthetic and visibly labelled.** `DEMO-INV-01`, placeholder revisions A/B and proposed studies do not correspond to approved USV-01 CAD data. There are **no genuine hull files, verified parameter values, solver results, active agent tasks, certified requirements or human approvals** in this example.

- The shared read-only snapshot adapter may fetch `/api/data/snapshot` for authenticated register search. The investigation itself, its configurations and its studies remain synthetic.
- No credential, solver execution, agent scheduling, approval write or original repo mutation.
- Source links open the existing guarded `/legacy.html?module=...` workspace without claiming the matching example object exists there.
- Any draft note/task is kept only in React component state and is **not saved**, signed, dispatched or approved.
- Unsupported numerical comparisons remain unavailable regardless of rendering.

## Run and review

```bash
npm ci
npm run dev:engineering-sessions
```

Navigate to `http://localhost:3000/#worktable` when running the standard Vite dev command. `/sessions.html` remains an alias, `/dockyard2.html` preserves the previous Naval Design Studio, and `/legacy.html` preserves the governed engineering workspace.

The browser workflow `.github/workflows/engineering-sessions-browser.yml` captures the five-mode end-to-end journey plus 1440/1280/768/390/320 viewport screenshots, 200% CSS zoom, keyboard search, all 24 module links, inspector behaviour and no accidental horizontal overflow.

**Not yet qualified:** screen-reader testing, real approved geometry, actual scientific result adapters, backend integration, authenticated user profiles, production release or deployment synchronization.

## Next product-build gate

The design milestone passes only when an actual naval engineer can:

- identify the current investigation and revisions without relying on a generic KPI dashboard;
- select a source object, inspect why it is unverified and navigate to its controlled register;
- compare two drawings while understanding that no numerical comparison is justified;
- select a study, see the precise output gap and retain it across Design/Decide/Notebook;
- draft a verification action and locate the human approval authority without falsely claiming execution.

Future production engineering workflows require a governed investigation data contract, real CAD/solver adapters, screen-reader testing and independent technical review. The current route cutover does not make this example investigation persistent or release engineering data.
