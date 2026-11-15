# Previous Naval Design Studio interface

**Product name:** Naval Design Studio  
**Origin:** Dockyard 2.0 (retained internally as `src/dockyard2` to avoid breaking imports)  
**State:** Previous read-only interface retained at `/dockyard2.html`. It is **not** an engineering approval authority.

## Entry points and source ownership

- `/` or `/index.html`: **Engineering Sessions** — the standard investigation-oriented interface.
- `/legacy.html`: **Legacy Engineering Workbench** — original `src/main.tsx` application, which retains editing, CAD study features, agents, record imports, calculations and all authorization/approval workflows.
- `/dockyard2.html`: previous **Naval Design Studio** interface, retained as an alternate entry.
- `/legacy.html?module=<registered-ID>`: opens one of the original 24 registered modules. Legacy `/?module=ID` links are forwarded only for valid registered IDs; unrecognized `module` queries stay in Engineering Sessions.

`vite.config.ts` builds all three HTML entries. Express serves the static HTML assets, with `dist/index.html` as its fallback. The primary product is the new interface — the legacy UI is an explicit option for full workflows rather than the default.

To run the previous interface:

```bash
npm ci
npm run dev:dockyard2
```

The general `npm run dev:ui` and `npm run dev` server commands open Engineering Sessions at the root route.

## Previous experience

- New light, high-contrast engineering application shell and CAD-first viewport.
- Five main workspaces: Design & CAD, Engineering Analysis, Agents, Director, Evidence & Assurance.
- Local OBJ A/B visual inspection, schematic section, component tree and inspector. No STEP/B-rep authority, simulated physics data or fabricated vessel dimensions.
- Requirements, risk, simulation and verification lists from existing schema and current authenticated snapshot (when available).
- Search for loaded records and the full catalogue of 24 original modules, with deep links to the protected editor.
- Persistent engineering context, component-level source disclaimers, mobile bottom navigation and adjustable text scale.
- Existing staff authentication client; new UI makes **no privileged writes**.

## Preservation of engineering authority

The existing original app at `/legacy.html` remains authoritative for all create/edit/import/export, solver launch, agent execution, engineering verification and human approval actions. No functionality is removed. Authentication/authorization is enforced by the same backend as before. The new UI is a read-only lens over project data and **cannot** release a vessel configuration.

Sample records are visibly marked illustrative. A signed-in user may load data from `/api/data/snapshot` using the existing session client. Failed, unavailable and unauthenticated states are labelled — they do not become silently 'approved' records. Local OBJ files remain local to the browser.

## Acceptance before live cutover

The user's choice establishes **Naval Design Studio as the intended default interface**. A pull request configures the code but is not evidence of a deployed switch.

A release still requires TypeScript, deterministic/safety tests, both production bundles, protected human governance sign-off, and hands-on browser QA at 1440, 1280, 768, 390 and 320 pixels; 200% zoom; keyboard and screen-reader navigation; all 24 legacy module handoffs and authentic staff session behaviour. Visual acceptance and the Google AI Studio deployment must be independently verified. No AI agent may self-approve the gate.

The default UI may intentionally remain read-only while legacy editors are available; full feature-parity migration is a **separate** engineering change and must not be asserted completed by this routing work.
