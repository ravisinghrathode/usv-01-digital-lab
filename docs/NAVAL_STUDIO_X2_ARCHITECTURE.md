# Naval Studio X.2 — implementation and release notes

## Design decision and non-loss contract

X.2 is a **product-centric engineering workstation**, not a reset of the USV-01 application. The single Naval Studio X shell stays in place. Every one of the **23 legacy navigation modules** and the additive CAD Studio module (24 total) is retained. Existing server APIs, working discipline forms, orchestration, stored records, review gates, and engineering governance are unchanged by this UI branch. The new experience is a **client-side presentation and local mesh inspection layer**, not authority for naval design release.

Changes are isolated to navigation/layout, a shared *view selection* context, a read-only director briefing from existing registers, a non-authoritative OBJ inspection canvas, and tests. No schema or data migrations are introduced.

## Product navigation and work tabs

- The global module registry remains the source of truth for all 24 module IDs. The left rail collapses to 64 px; expanding it restores the grouped searchable catalogue and pin controls. Pinned modules are a local browser preference only.
- The workspace bar shows CAD, Programme, Analysis, and Verification and a strip of working tabs. Newly opened views are kept mounted while their tabs remain open; this **preserves local view component state** across tab switches, unlike the previous single-view conditional render. Closing a tab prompts about unsaved edits. Current form components do not yet expose reliable unsaved/dirty signals; the warning is conservative.
- `Ctrl/⌘+K` opens a keyboard-operated global module command palette. This navigates to existing views without bypassing role-based permissions.
- Hidden views may retain their timers, subscriptions, or simulations while tabs remain open; future performance work must add lifecycle suspension and bounded cache policy without silently discarding edits.

## Engineering selection context

`src/studio/engineeringContext.tsx` provides `projectId`, `candidateId`, `configurationRevision`, `componentId`, `geometryFingerprint`, and `evidenceLevel` to participating UI. Its default configuration revision and candidate are **null**, not guessed. The context is **not** a configuration-management authority, and any UI selection has no engineering approval effect.

`StudioContextStrip` exposes the selected project and component, absent authoritative revision, local hash if supplied, and evidence state consistently across every module. The provider is instantiated at the React root. Integration of controlled revisions and server-side permissions is still required to make this a full digital-thread solution.

## CAD Studio and geometry source truth

- The earlier procedural vessel remains as a **labeled illustrative fallback**, not product CAD.
- CAD Studio accepts a browser-local Wavefront `.obj` triangular mesh in either of two comparison slots. The file **never leaves the browser** in this implementation and is not written to GitHub, Google Drive, or the backend. Import is restricted to 8 MiB, 30k vertices and 50k triangles, with strict face/coordinate validation.
- The canvas rotates/zooms a projection of actual parsed mesh triangles and can select OBJ groups, but is **not WebGL, a B-rep CAD editor, a STEP importer, a physics solver, or an engineering measurement tool**. Heavy triangle counts are sampled for rendering; sample status is displayed. A user-visible SHA-256 fingerprint identifies the raw local file but does not establish its provenance or approval.
- A/B comparison reports topology differences (vertices, triangles, object groups). OBJ coordinates have **unknown physical units** and material properties, so dimensions, weight, resistance, stability and structural validity must remain TBD. Any changed mesh requires independent configuration-based analysis review. Cross-candidate numerical performance is intentionally not calculated.
- The conceptual object tree is maintained only when no mesh is loaded. Imported OBJ group names replace it during inspection, and a selected group is reflected in the shared context. A selection can open the existing engineering register or prefill a draft question for the existing AI assistant. It cannot change governed design records or authorize edits.
- The next step toward actual controlled CAD is an access-controlled STEP/OCCT/CadQuery or FreeCAD service that stores immutable B-rep sources, generates provenance-stamped tessellated previews and a stable part-ID graph, and exposes signed read-only artifact references. No controlled CAD should be added to a public repo.

## Director's briefing

The default Programme workspace presents actual counts and records from the existing requirements, simulation, verification, decision and risk registers, not manufactured KPIs. A button opens the full prior Project Overview to preserve every previously available control and demonstration. Register status is **not** independent technical verification or director approval.

## Security, governance and accessibility

- No direct writes to agent/approval APIs or protected records were introduced. Existing role checks and human gates remain in their original modules.
- Private naval/client data must remain in the approved access-controlled project systems. The local mesh viewer is memory-only; avoid uploading restricted meshes to third-party services.
- UI offers keyboard command navigation, labeled collapsible controls, responsive navigation and visible keyboard focus.
- The canvas should not be treated as a certified 3D workstation; accessibility and performance require further specialist review for large designs.
- Any model-derived safety claim must be traceable to a source revision, analysis assumptions, solver provenance, independent review and authorized release decision. Nothing in this branch satisfies those release obligations.

## Validation and release

Run `bun install --frozen-lockfile`, `bun run lint`, `bun run test` and `bun run build`; verify the existing safety/governance GitHub Actions gate passes. Check `tests/studioNavigation.test.tsx` and `tests/studioX2.test.tsx`.

Staged manual acceptance must confirm all 24 routes and their internal tabs; login/logout; engineering record editing; requirements, simulation and approval permissions; CAD preview remains labeled; OBJ import/rotation/group selection; A/B topology comparison; tabs preserve local forms; safe close warning; keyboard/compact navigation; responsive layouts; and representative data remains unchanged.

**The requesting user will merge.** Do not enable automatic merging or promote this branch on their behalf.

## Google AI Studio

Target app: `https://aistudio.google.com/apps/b79d8d84-9f5e-420a-9dbc-a17f3636987b`. The operator reports that the AI Studio app fetches the shared GitHub repository. A PR or merge is **not proof** of live preview synchronization. After user approval, import/refresh the reviewed `main` commit and independently verify the running SHA, viewport and 24-module catalogue. The repo does not confirm an automatic deploy hook. See `docs/REPOSITORY_SYNC.md` and `docs/COMMISSIONING_RUNBOOK.md`.

## Explicitly remaining engineering integrations

This PR provides a usable, source-backed X.2 workbench vertical slice. It does **not** claim completion of a full desktop CAD authoring suite, approved multi-project configuration database, controlled geometry import/release, solver-to-CAD dependency invalidation, secure cloud design artifact store, physically comparable candidate optimization, simulation pause/resume lifecycle, or automatic Google AI Studio rollout. These require authorized infrastructure and validated engineering evidence, rather than new labels or mock data.
