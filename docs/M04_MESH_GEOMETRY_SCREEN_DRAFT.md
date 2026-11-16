# M04 draft mesh geometry screening — mathematical tool only

M04 issue #104 requires independently assessable geometry and geometry-to-physics provenance. This incremental tool checks supplied triangle arrays using an explicit **right-handed body frame X forward, Y starboard, Z down** (not Z up), SI metres, exact Git source commit, named candidate/revision, and a local SHA256 manifest of the entire supplied mesh.

It deterministically checks finite vertices, valid/nondegenerate triangle indices, oriented two-face edge adjacency, positive signed enclosed volume, triangulated surface area and enclosed *mathematical* centroid. Synthetic unit cube, translated cube, two separated cubes, open-edge, degenerate, inverted, wrong-unit and stale-source cases are regression tested.

**Limits (mandatory):** a closed oriented manifold is not proof of a self-intersection-free solid; offset stations, hydrodynamic wetted hull below waterline, free surface, displacement, center of buoyancy, CG, stability, manufacture tolerances and maritime approvals are **not** computed. The value labelled `signedEnclosedVolumeM3` is geometric enclosed volume, never automatically vessel displacement. A preview mesh has no dimensional/engineering authority. All outputs explicitly retain `measuredOffsetsAuthenticated:false`, `selfIntersectionsChecked:false`, `independentGeometryApproved:false`, `engineeringReleaseApproved:false` and no center-of-buoyancy estimate.

This does **not** close M04. Next gates require independent offset/measured or approved CAD geometry authority, a source-validated mesh/offset export, true self-intersection checks, waterline clipping, hydrostatics with load cases and separate mass/CG evidence, then independent reviewer approval. The tool is deliberately not coupled to vessel release or an unsanctioned solver.

## Separate geometry and source manifest hashes

The `geometrySha256` is canonical across object key ordering and deliberately
independent of candidate/revision/source metadata; it hashes the triangle
arrays, marine coordinate frame and topology. This allows a geometric change
to invalidate dependent analyses without treating a metadata-only revision as
a new physical shape. The separately canonical `manifestSha256` binds that
geometry hash to candidate, revision, source commit and provenance label.
Both are local source hashes, not certified CAD-origin receipts.

## Draft M03 candidate handoff

`draftGeometryLedgerInput(screen, expectedSourceSha)` returns an exact
`GEOMETRY` digest only after the deterministic mathematical screen passes
against the exact candidate source commit. The M03 ledger accepts this digest
as **unverified draft input only**. It retains GEOMETRY `NOT_RUN` and dependent
HYDROSTATICS/RESISTANCE/STRUCTURES `BLOCKED` until independently observed
tool and source evidence is separately recorded. Integration tests explicitly
exercise the actual M03 ledger and reject stale/broken geometry handoffs.
