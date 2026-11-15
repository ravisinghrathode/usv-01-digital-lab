# Naval AI Lab — Product- and simulation-first interface

**Status:** new standalone frontend on `/naval-lab.html`; not a main-route replacement.
**Design mandate:** an engineering laboratory, not a generic KPI dashboard.
**Architecture:** clean React surface in `src/lab3/` with its own typography,
tokens and components. Reuse typed USV-01 snapshot and existing authenticated
backend/legacy-tool routes; do not copy Clarity or Dockyard CSS or rebuild the
engineering runtime.

## Five-skill design workflow actually applied

All five upstream original skill instructions were read from PR #124's
pinned source files on branch `feat/naval-design-studio-five-ui-skills-20261115`.
That PR was **not yet merged into main** when this branch was created.
The following choices are specific applications, not statements that the
skills were registered in the current ChatGPT host:

- **OpenAI frontend-app-builder:** give the full application a coherent
  first-screen story: product workstage and simulation evidence are the two
  dominant areas, not a decorative hero or KPI-only welcome. Compose distinct
  task-specific screens from focused components and native controls.
- **Anthropic frontend-design:** use a disciplined scientific-instrument
  direction with technical linework, quiet paper surfaces, editorial
  typography, a restrained maritime-teal accent and dark geometry stage.
  Avoid purple gradients, glassy cards, fake realtime visuals and empty UI
  decoration.
- **NextLevelBuilder UI UX Pro Max:** reviewed app-interface, style,
  typography, UX and React datasets. Applied active-nav clarity, deep links,
  preserved browser history, visible keyboard focus, useful empty states,
  touch-target sizes, a sparse navigation system and data-oriented typography.
  *Dataset review is not equivalent to executing the optional Python
  design-system generator; it was not run for this implementation.*
- **Addy Osmani frontend-ui-engineering:** isolated composition per feature,
  typed snapshot/props, data-backed simulation selection, native dialog
  semantics, responsive layout breakpoints and genuine actionable controls.
- **Addy Osmani browser-testing-with-devtools:** turned the skill's browser
  and security recommendations into acceptance criteria. **Live Chrome
  DevTools screenshot/DOM/network testing has not run here**; availability
  must be established independently before UI release.

## Screen architecture and hierarchy

### The Lab (`#lab`)
1. A quiet global header and one five-item work navigation with search.
2. A single product-and-simulation hero row: **vessel product stage ~62%**
   and **simulation workbench ~38%** of the remaining content width at
   desktop sizes. Screen placement gives visual and navigational priority
   to the two central research artifacts.
3. Real loaded engineering context (requirements, analysis, agent work,
   verification) as an open, horizontal action strip.
4. Risks and pending decisions in compact ledgers rather than chartlike
   readiness percentages. A short research shortcut to reference fleet
   and knowledge centre closes the first screen.

### Products (`#products`)
Large concept vessel visual, separate inspector showing selected assembly
context, current loaded discipline requirements and BOM records. Technical
drawings are original **illustrations**, not precise B-rep geometry or
mass-property calculations. The optional local OBJ viewer reuses the
existing browser-only bounded parser and canvas inspector. No upload occurs.

### Simulations (`#simulations`)
Prominent simulation workbench with real selectable loaded records,
discipline filter, geometry revision, validation, reviewer and solver. A
separate verification guide and full searchable/filtered register occupy
the rest of the page. No fabricated plots. No inference that a run is live
because a record says `Running`.

### Agents (`#agents`)
Controlled workflow sequence and data-backed decision queue, with direct
links to the existing agent orchestrator, deterministic tools and human
approval gates. These are frontend navigation links, **not new agents**.

### Evidence (`#evidence`)
Requirement selection + an explicit link-only dossier for verification
plans, tests and simulations, derived from existing record IDs. Sample
requirements remain visibly sample; empty links say so. Engineering
release remains governed by the existing authorized backend.

## Stable integration boundaries

- New entry: `naval-lab.html` / `src/lab3/main.tsx`.
- `/naval-lab.html` is a **preview candidate**, not the new default.
  `/` remains Naval Design Studio and `/legacy.html` the governed
  full engineering editor until separate release authority and QA approve
  cutover.
- Existing 24 registered modules accessible via a native dialog catalogue,
  keyboard search (Ctrl/Cmd+K) and direct `/legacy.html?module=...` links.
- `useSnapshot()` and its existing staff sign-in client provide source
  data. `Illustrative records`, loading, authenticated server snapshot,
  and unavailable states remain visible. No new database, API key, model
  quota or cloud dependency.
- No assertions of engineering release, approved mission metrics,
  real-time agents, solver execution, source geometry authority, or
  independent certification.

## Design tokens

- Paper shell: `#f2f5f6`, surfaces `#ffffff`, ink `#173543`.
- Contrast-focused muted text: `#526a75`.
- Maritime action: `#0b6577`; dark viewport `#091d29`.
- Sample/unverified warning: `#85561b` + readable accompanying text.
- Text: system/IBM Plex Sans fallback at 15px default, 17px enlarged; mono
  is reserved for technical notation, revision IDs and drawing annotations.
- Interactive targets ≥40–44px; visible keyboard outline, reduced-motion
  rules, native search and module dialogs.
- Progressive layout changes at 1330/1120/880/570/360px;
  mobile receives five explicit bottom navigation items, not a compressed
  sidebar.

## Acceptance and outstanding risks

Required before merging or adopting as default:

1. TypeScript, all deterministic and safety tests, four-entry Vite build,
   existing independent engineering governance.
2. Real browser screenshots and DOM inspection at 1440x900, 1280x800,
   768x1024, 390x844 and 320x700. 200% zoom and enlarged text.
3. Compare the rendered result to the approved design; inspect computed
   font sizes, focus outlines and contrast on both light and dark surfaces.
4. Keyboard-only access: navigation, search modal focus/return, catalogue
   Escape, simulation selection, requirements, authentication and file
   picker. On mobile, safe-area bottom nav must not overlap content.
5. Test with a staffed authenticated session, expired session,
   unavailable backend and genuinely empty snapshot. Ensure sample
   records never masquerade as reviewed live evidence.
6. Validate all 24 handoffs, product facet selection, OBJ import, browser
   history and simulation filter against actual Vite/Express deployment.
7. Verify the merged Git SHA is deployed to the user's Google AI Studio
   environment before claiming a synchronized live UI.

**Do not merge, replace `/`, deploy or claim a production-ready interface
on the basis of a successful source build alone.**
