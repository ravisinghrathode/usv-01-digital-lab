# Engineering Sessions — Connected Prototype

**Implementation:** Standalone **interactive UX demonstration** at `/sessions.html`, based on the Project Lead's selected `NAL-UX-BL-001` direction (design spec in PR #134, not yet the deployed standard). This PR exists to evaluate the operating model before a governed redesign. This is not a read/write integration into the source project.

## Why this is materially different

The UI no longer routes the user through five unrelated dashboards. A single `SessionView` maintains the selected question, product/revision object, proposed study, projection, camera synchronization, contextual inspector and local notebook observations while five **different** stages change around it:

1. **Worktable:** Source-relationship work surface with the vessel concept central, clickable example objects and on-demand inspection.
2. **Design:** Dual A/B visual arrangements, real working projection/synchronization/highlight toggles and prominent comparison-blocked explanation. No fictitious mass or hydrostatic delta.
3. **Experiment:** Study selection changes the central scientific theatre. No CFD image or plot appears without a result artifact; the missing source is explained in the result canvas.
4. **Decide:** Directed argument, constraints, source gaps, contradictions and protected independent review; a button creates a *local task draft*, not an approval or live agent run.
5. **Notebook:** A chronological investigation journal with local observations and task drafts retained while switching modes. Refreshing discards them; no records are posted.

The compact session spine remains visible in every mode. A context inspector opens only when a specific object is selected; global search reaches all 24 original modules plus the labelled example objects.

## Evidence integrity

**Every content object and technical drawing in this preview is synthetic and visibly labelled.** `DEMO-INV-01`, placeholder revisions A/B and proposed studies do not correspond to approved USV-01 CAD data. There are **no genuine hull files, verified parameter values, solver results, active agent tasks, certified requirements or human approvals** in this prototype.

- No API or database calls.
- No credential, authentication, solver execution, agent scheduling, approval write or original repo mutation.
- Source links open the existing guarded `/legacy.html?module=...` workspace without claiming the matching example object exists there.
- Any draft note/task is kept only in React component state and is **not saved**, signed, dispatched or approved.
- Unsupported numerical comparisons remain unavailable regardless of rendering.

## Run and review

```bash
npm ci
npm run dev:engineering-sessions
```

Navigate to `http://localhost:3000/sessions.html#worktable` when running the standard Vite dev command. The existing `/` Naval Design Studio, `/naval-lab.html`, `/atlas.html`, and the governed `/legacy.html` are unchanged.

The browser workflow `.github/workflows/engineering-sessions-browser.yml` captures the five-mode end-to-end journey plus 1440/1280/768/390/320 viewport screenshots, 200% CSS zoom, keyboard search, all 24 module links, inspector behaviour and no accidental horizontal overflow.

**Not yet qualified:** screen-reader testing, real approved geometry, actual scientific result adapters, backend integration, authenticated user profiles, production release or deployment synchronization.

## Next product-build gate

The design milestone passes only when an actual naval engineer can:

- identify the current investigation and revisions without relying on a generic KPI dashboard;
- select a source object, inspect why it is unverified and navigate to its controlled register;
- compare two drawings while understanding that no numerical comparison is justified;
- select a study, see the precise output gap and retain it across Design/Decide/Notebook;
- draft a verification action and locate the human approval authority without falsely claiming execution.

Production requires a separate governed investigation data contract, real CAD/solver adapters, browser accessibility testing, independent review and approved routing cutover. Do **not** promote this standalone prototype into `/` merely because CI is green.
