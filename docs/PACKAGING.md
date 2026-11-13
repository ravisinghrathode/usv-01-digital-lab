# USV-01 Packaging & Repository Organization Standard

## 1. Overview & Canonical Entry Points

The USV-01 Digital Engineering Lab follows structured repository organization guidelines:

- **Root Source Entry Points:**
  - `index.html`: Web application single-page interface entry point for Vite/React.
  - `server.ts`: Node.js/Express API service and WebSocket coordination entry point.
- **Static Assets & Standalone Web Tools (`public/`):**
  - All auxiliary browser tools, simulators, and static assets reside under `public/`:
    - `public/portal.html`: Standalone lightweight navigation portal.
    - `public/boat_simulator.html`: Standalone Canvas-based naval simulation playground.
    - Vite serves these at the base root URL (e.g. `/portal.html`, `/boat_simulator.html`) without cluttering the project root directory.

## 2. Dependency Management & Canonical Lockfile

- **Canonical Package Manager:** `bun` (and `npm` for Node.js environments).
- **Lockfile Policy:** `bun.lock` is the authoritative lockfile checked during CI execution (`bun install --frozen-lockfile`).
- **Audit Verification:** Stage B dependency security and config checks verify manifest and lockfile integrity.

## 3. Historical Provenance & Binary Archives

- The archive `USV-01_Review_Package.zip` is preserved in the repository as part of the historical engineering audit record (referenced in `docs/audit/INITIAL_REPOSITORY_AUDIT.md`).
- Any new simulation runs, CFD meshes, or CAD artifacts must be stored under `governance/evidence/` or attached to GitHub Release tags rather than added to the root directory.
