# Atlas — New Naval AI Lab UI prototype

This frontend is **original work** under `src/atlas`, not a Dockyard or Lab3
component/CSS restyle. It is served by a separate HTML entry at
`/atlas.html` to preserve the current application until independent review.

## Run the working preview

```bash
npm ci
npm run dev:naval-atlas
```

The Vite development server opens `/atlas.html`. The production bundle includes
it alongside `/` (standard Naval Design Studio), `/naval-lab.html` (earlier
prototype) and `/legacy.html` (protected original engineering editor).

## Product-centric topology

The core studio is **one integrated engineering sheet**:

- Horizontal global room navigation, not a repeated left application sidebar
- A compact product assembly shelf alongside the vessel drafting sheet
- A local contextual engineering inspector, not another stand-alone KPI card
- A full-width dark simulation runway directly below the product sheet
- Explicit source data, sample/unknown states and links to all 24 original
  governed modules

Additional dedicated rooms are Physics, Evidence, Agent Directorate and
Library. Local OBJ inspection is bounded and browser-only. No vessel baseline,
geometry, solver output, authorization or new agent is claimed.

## Boundaries

Existing typed data and auth adapter are reused; existing UI components,
illustrations, CSS, dashboard grids and navigation are **not imported**.
Read-only Atlas cannot make authorized engineering changes. Original editors,
deterministic tools, model execution and human approvals live at
`/legacy.html?module=<registered-module-ID>`.

## Verification

`tests/atlasLab.test.tsx` tests layout ownership, data relationships, modules,
views and smoke rendering. `scripts/ui/atlas-browser-check.mjs` plus
`.github/workflows/atlas-browser.yml` run pinned isolated Chromium on desktop
and mobile sizes, with screenshot artifacts and keyboard interaction checks.
Live staff-authorized, screen-reader and actual engineering CAD acceptance
remain required. No automatic replacement or deployment is authorized.

See `docs/ATLAS_INDEPENDENT_DESIGN_REVIEW.md` for the original UI critique
and full design contract.
