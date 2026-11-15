# Engineering Sessions — High-Fidelity Visual Delivery V2

**Target UX baseline:** `NAL-UX-BL-001` (Project Lead-selected Engineering Sessions design direction).  
**UI surface:** `/sessions.html` (standalone candidate, not the default `/`).  
**Status:** implemented visual feature branch, pending protected human review/merge/deployment.  
**Engineering source status:** demonstration only; no actual approved USV-01 geometry, calculations, verified CFD or shipboard measurements.

## Why this is a genuine visual rebuild

The user rejected the first implementation as a downgrade from the concept imagery. The V2 implementation explicitly returns to the spatial hierarchy, typographic finish and model realism of the approved design direction:

| Feature | Visual delivery | Interaction / source boundary |
| --- | --- | --- |
| Worktable | Large original photorealistic Blender vessel hero; contextual selectable model pins; compact research docket on one connected background | Model pins open a source-truth inspector; example entities are non-authoritative |
| Design | Two full-size high-resolution vessel renders, source labels, distinct A/B presentation, plan/perspective assets and contextual controls | Shared/independent projection is functional; no mass/CG/strength delta is calculated from example renders |
| Experiment | Integrated maritime vessel setting and dark scientific instrument; explicit unavailable plot channel and run rail | Switching source cases changes the selected study; no invented CFD, RAO or computed curve |
| Decide | Deep-blue engineering question, source-typed argument path, candidate visual reference, amber uncertainty and independent review docket | Nodes inspect limitations. Task action creates a temporary local draft, never an engineering approval |
| Notebook | Editorial investigation journal, reproducibility context, verified-source boundary and direct source workflow links | Local notes survive mode changes but are not persisted or signed |

**Visual fidelity assets:** four original Blender-rendered 1600×900 transparent vessel PNGs under `public/sessions/media/`, with reproducible `scripts/ui/render_sessions_vessels.py`. They are artwork, **not CAD/STEP/B-rep**. The V2 visual component uses these original images and falls back to explicitly labelled vector art only if the image fails to load.

**Controls and accessibility:** preserve the existing five-mode session state, native contextual modal, global Ctrl/Cmd+K search, 24 protected module deep links, mobile progressive layout, 200% CSS zoom and visible source-status warning. Mode switches now restore page position while keeping the selected study and local notebook notes.

## Browser acceptance and screenshot review

`scripts/ui/engineering-sessions-browser.mjs` is a pinned isolated Chromium journey in `.github/workflows/engineering-sessions-browser.yml`:

1. Confirm four checked-in assets are nontrivial and the real high-resolution reference render decodes.
2. Check Worktable's hero scale, reference pin, modal, specimen/source label.
3. Exercise A/B plan rendering, independent projection and hull-focus toggle.
4. Select three sample studies and ensure no invented solver canvas/plot appears.
5. Inspect evidence graph, source limitations and no-approval boundary.
6. Draft and inspect an unsaved Notebook action; preserve state across mode changes.
7. Find exactly 24 guarded original modules in global search.
8. Capture five viewport widths: 1440, 1280, 768, 390 and 320; verify no horizontal overflow and a meaningful product visual in the initial viewport.
9. Test CSS zoom at 200%, and that changing modes returns the viewport to the new activity's top.

**Important test boundary:** automated screenshots and DOM assertions cannot substitute for independent naval usability, actual visual design signoff, screen-reader testing, accessible real CAD camera interaction, production authentication and source verification. Those remain outstanding before route cutover.

## Review risks / outstanding engineering integration

- The Blender illustration models are concept assets only. To support real source comparison, implement a reviewed, revision-aware CAD adapter with approved source geometry. UI is explicitly prevented from drawing mass or stability claims from visuals.
- Scientific playback, CFD maps, hydrostatic plots and numeric tables require actual source-backed, unit-aware results, solver provenance, boundary conditions, convergence, uncertainty and independent review. Without them, keep the current source-required scientific state.
- The demonstration investigation `DEMO-INV-01` and its evidence objects are synthetic. Backend investigation lifecycle, versioned notebook, multi-user permissions and agent dispatch require separate governed implementation.
- Do not merge, promote `/sessions.html` to `/`, or claim deployment solely because CI passes. Preserve the protected human authorization chain and verify the deployed exact commit after release.

## Visual design release criterion

Any future UX PR must compare an actual captured screenshot against the selected baseline concept images **and** preserve the engineering truth contract. Readability, imagery, hierarchy, spacing, keyboard/touch behaviour, task completeness and source legitimacy are independent pass/fail dimensions. A working UI that visually regresses toward generic dashboard cards is not acceptable.
