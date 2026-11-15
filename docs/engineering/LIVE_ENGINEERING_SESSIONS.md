# Engineering Sessions: live project-source contract

## Live-first operation

The standard root (`/`) now opens **authenticated engineering workspaces**, not the demonstration investigation. A valid staff Bearer session is required before displaying any project records. The "Example tour" is explicitly opt-in and contains synthetic visual material only.

The five views use the server's existing authenticated source registers:

| View | Source | Evidence boundary |
| --- | --- | --- |
| Worktable | `GET /api/data/snapshot` | Shows records explicitly flagged `isIllustrative=false`. A record's presence does not establish validity. |
| Design | `GET /api/data/cad_revisions` | CAD source pointers registered by authorized engineering staff. Registration stores URL, revision, file name, SHA-256 and author; it **does not** store the CAD file or approve geometry. |
| Experiment | `simulation_jobs` in authenticated snapshot | Shows actual recorded solver inputs/status and verbatim outputs, if present. A completed job is **not** a certified solver result; no synthetic plots. |
| Decide | Requirements, simulation references, verification plans and test records | Only real rows and matching stored IDs are linked. Links are not independent verification or an approval decision. |
| Notebook | `knowledge_notes` in authenticated snapshot | Shows session drafts saved by authenticated writers. No change to human release/approval gates. |

The original governed engineering editor at `/legacy.html` remains the authority for the complete 24-module workflows and more complex record editing. There is no client-side shortcut for engineering sign-off.

## CAD revision references and local inspection

An authorized engineering writer may register an **unverified CAD source pointer** through `POST /api/session/cad-revisions`. Required fields are a short title, source revision ID, file label, private-source HTTPS URL (no embedded credentials), and exact file SHA-256 digest. The server generates the record ID and author identity and forces `SOURCE_REGISTERED_UNVERIFIED`. It rejects client-supplied release/approval authority.

If the corresponding file is an OBJ, staff may choose that local file for browser-only inspection. The client verifies the file's SHA-256 **before parsing or displaying it**. The viewer uses a bounded 12 MB, 250,000-vertex, 120,000-face parser. Neither file bytes nor geometry are transmitted to the server. Other formats (such as STEP) must be examined in the governed CAD environment. A digest match only establishes consistency with the recorded digest; it is not independent integrity, topology, loading, certification, or source-owner validation.

## Project note writes

`POST /api/session/notes` accepts only a bounded title and content. It requires an authenticated engineering writer and sets the author from the server's verified staff session. It forces `DRAFT_UNVERIFIED`, records an activity-log event, and saves through the existing atomic store path. It cannot grant approvals, execute agents, or sign design releases.

Both new POST routes use `authorizeLabRoute`. The CAD register is read-only through the general `/api/data/:collection` routes so a caller cannot bypass the bounded registration endpoint with arbitrary status fields.

## Persistence and deployment limitations

The existing application persists its registers to a **local JSON file on the running Express host**. This is durable only to the extent that the host's filesystem is durable. In particular, **Google AI Studio preview containers may be ephemeral**; saving a draft there must not be represented as durable after restart/redeploy without an independently configured persistent volume or external database. No Google Drive or Obsidian write integration is implied.

Schema migration is additive: an intact earlier 15-register data store gains a new empty `cad_revisions` array while preserving every previous record. Corrupt/partial stores still fail closed instead of reseeding. Creating a new CAD source pointer does not modify the vessel baseline.

The GitHub repo is public. Never paste restricted drawing content, classified naval particulars, credentials, private military data, or protected files into Git. CAD source URLs must point to an appropriately permissioned external location and only be viewed by authorized staff.

## Acceptance evidence

- `npm run test:aistudio-startup`: full-stack startup contract and anonymous HTTP 401 gate.
- Vitest: project store lossless migration, server role restrictions and live-first/illustrative separation.
- Chromium: root defaults to staff sign-in; Example tour must be manually selected; original 24 modules remain accessible.
- Production build: TypeScript typecheck, bundle output and UI smoke test.

**Not yet accepted:** production persistence across Google AI Studio redeploys, actual external CAD file availability, source-hash trust beyond the registering user, independently verified solver results, vessel baseline release, end-to-end authorized engineering edit acceptance on the deployed host, and human approval workflow execution.
