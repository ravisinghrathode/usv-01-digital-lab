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

## Documented design review — 2026-11-15

**Review surface:** isolated local browser at `/sessions.html`, local branch `feat/engineering-sessions-visual-fidelity-v2-20261115` rebased onto current `main` (`ae33723`). The default `/` route was not changed.

**Visual review:** inspected live 1440×900 screenshots of Worktable, Design, Experiment, Decide and Notebook, plus the 320px Worktable view. The review found five distinct compositions that follow the approved investigation-first hierarchy: a vessel-led worktable, a wide paired design view, a dark source-gated experiment theatre, a connected evidence argument with a human-review boundary, and a chronological research notebook. The high-resolution vessel renders carry the primary visual weight. Their illustrative status remains explicit; no solver result or engineering approval is implied.

The 320px capture exposed mode labels that were too small in the original single-row navigation. The narrow layout now uses two rows with 12px labels and 46px touch targets. Live browser checks at 320, 375, 390, 768, 1024, 1280 and 1440 CSS pixels found no horizontal overflow, all five modes present, and the main vessel image loaded. A 1280px page with CSS zoom set to 200% also retained all five visible modes without horizontal overflow.

**Accessibility findings and corrections:** live Lighthouse checks initially found insufficient contrast in small status labels and two controls whose accessible names did not match their visible labels. Those issues were corrected, along with the search input's missing form identifier. After correction, all five desktop modes scored 100 for accessibility; the mobile Worktable navigation audit also scored 100. Best Practices scored 100. Keyboard review confirmed mode shortcuts, search focus on open, Escape close, and focus return to the search trigger. Reduced-motion emulation was enabled; the session styles disable animation and transitions under that preference. A local notebook observation remained present after switching modes, and its copy confirms it is session-only and not saved to the programme record.

**Build and interaction checks:** `npm run build` completed successfully. The targeted V2, baseline, source-search and A26 browser-feed tests passed (4 files, 16 tests); the deterministic A26 Node suite passed (12 tests). Search and mode interactions were exercised in the live browser, including result filtering and Escape focus restoration. The local browser console showed no runtime errors after the review changes. The existing GitHub browser workflow at commit `8da38bb` passed its isolated interaction and viewport journey; it predates this local rebase and accessibility follow-up, so it does not replace hosted CI on a future PR.

**Review disposition:** the candidate passes this local visual and accessibility review for continued review on `/sessions.html`. The original lab remains the default, and the candidate is not approved for route cutover. PR #142 was closed unmerged in favor of merged PR #140; this rebased review branch is local-only and has no hosted checks on its current head. The repository contains the written baseline but not its original concept-image files, so a side-by-side image comparison against those source images could not be documented here. Independent human design signoff, screen-reader review, production authentication/source verification, and protected merge/deployment review remain required.

The Lighthouse run also reported pre-existing site discovery issues (`robots.txt`, `llms.txt`, and the ARD manifest); those are outside this screen redesign and did not affect the accessibility scores.
