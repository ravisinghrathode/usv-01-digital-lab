# Dockyard 2.0 — independent Naval Studio frontend

## Status and route

A **new React UI**, not a restyle of `src/App.tsx`. Two distinct Vite HTML entries are built:

- `/` — original Naval Studio, all 24 modules, record editors, deterministic tools, authentication and approval gates.
- `/dockyard2.html` — new task-centred Dockyard 2.0 interface, independently designed components and CSS; read-only engineering views backed by existing typed data contracts.

Run `npm run dev:dockyard2` in the repository to open the new app. `npm run build` builds both entry points in `dist`.

## What is implemented

- Five unified workspaces: Design & CAD, Engineering Analysis, Agents, Director and Evidence & Assurance
- CAD hero workstage, conceptual product tree, selection inspector, assembly/illustrative-section/OBJ A-B comparison modes
- Local file-only OBJ parser and canvas viewer with rotation, zoom, keyboard operation, safety limits and strict no-upload behaviour
- Context dock for requirements, simulations, agent work and verification plans, explicitly matched by **discipline**, not fabricated component links
- Actual loaded engineering registers in engineering/agent/programme/evidence screens; source labels distinguish seed illustrative data from authenticated server snapshots
- Native dialog search over all 24 module names and loaded records, complete module catalogue, deep links to original governed module routes
- Existing staff login/session and authenticated snapshot API reused without new server writes, engineering authority or data schemas
- Light, industrial high-contrast design system with responsive desktop rail and mobile bottom navigation, enlarged text and reduced-motion styling

## Engineering data and security boundary

The new read-only frontend never writes engineering records, edits a requirement, signs a gate or launches a solver. The original app owns those workflows, with its existing authentication and governance. `/?module=<ID>` is a **navigation instruction only**, checked against the 24-ID registry; it is not an authorization bypass.

When unauthenticated, sample register entries come from existing `initialProjectData` and are prominently labelled illustrative. After authenticated login, `/api/data/snapshot` is loaded through the existing session-backed `authenticatedFetch`. A successful server response, including an empty array, replaces the illustrative dataset. A missing/failed response reverts to labelled examples with a visible error; the UI never silently passes samples off as live.

An OBJ is read locally using `File.text()`. No upload is performed. The rasterized mesh is a limited **triangle projection**, not STEP/B-rep CAD, and does not derive dimensions, mass properties, hydrodynamics or structural results. The 2D vessel and cross-section are original concept illustrations.

## Original workflows

Dockyard 2.0 is a **read-only companion while the engineering editors migrate**. Search results and every catalogue module link to the original app using `/?module=...`. The original App now safely accepts only registered module IDs from that parameter and leaves all existing authority rules intact. Browser Back returns to Dockyard. The original editor is the explicit handoff for writes and approvals.

## Test coverage / acceptance

`tests/dockyard2.test.tsx` covers the independent app root, 24-module catalogue/deep link, strict snapshot parsing, document provenance, pure OBJ parsing/limits, all five SSR screen renders and selected contrast pairs. The repository CI should also run TypeScript, the deterministic suite, production bundle and protected governance gates.

**Still required before replacing Naval Studio's main route:**

1. Inspect **running** `/dockyard2.html` at 1440×900, 1280×800, 768×1024, 390×844 and 320×700, plus browser zoom 200% and the enlarged text setting.
2. Keyboard-only and assistive-technology checks for tab order, dialog focus/return, search, module catalogue, component tree and OBJ canvas.
3. Confirm real authenticated snapshot loads with an appropriately provisioned test account, and no unauthorized writes. Verify empty/expired-session/unavailable-api states.
4. Exercise legacy module transitions, all 24 workflows, review gates, high-risk CAD previews, local OBJ parsing on real representative files and memory/CPU profiling.
5. Do browser-computed WCAG AA text/control/focus contrast checks on light/dark surfaces, not just the unit-tested token pairs.
6. Explicitly verify the synchronized Google AI Studio deployed build and SHA; GitHub CI success does **not** prove deployment.

Never merge or replace `/` merely because CI is green. The user must approve main-route cutover after these gates.
