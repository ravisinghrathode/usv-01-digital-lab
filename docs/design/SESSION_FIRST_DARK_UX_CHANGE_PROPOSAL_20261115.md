# NAVAL-USV-LAB — Session-first dark UX change proposal

Date: 2026-11-15
Status: Feature branch; implementation is not a released engineering baseline.

## Design approval and authority

The Project Lead approved the dark navy/cyan CAD Studio and Engineering Sessions visual references and requested implementation of the task-driven UX. This proposal supersedes the earlier light/editorial visual direction for these screens, but does not silently change the protected machine-readable NAL-UX-BL-001 baseline, engineering authority, or release gates. Screenshots of the actual running code must be compared against both approved reference images before visual acceptance.

## Scope implemented in the feature branch

- Existing Engineering Sessions root gets a session-first worktable with a persistent project/context spine and top-level navigation for Engineering Sessions, CAD Studio, Parameters, Analysis, Agents and Assurance.
- The central workspace contains a source-honest objective, non-authoritative rendered vessel concept, configuration status, real-register traceability rail, agent directory link, engineering decisions and activity dock.
- The existing five investigation modes remain available, including actual LiveWorkspace screens for authenticated specialist work.
- Real engineering requirements, risk, decision, simulation, verification plan and test views filter out illustrative seed records. Counts do not mean certification.
- The CAD link opens the established governed CAD module. The CAD header provides a safe route back to Engineering Sessions when launched from a session.
- A local investigation draft can be created and is preserved while switching among the five modes by lifting its state to the parent. It is unsaved, never dispatched or approved, and is lost on page navigation/reload. There is no fabricated persistent session registry.
- Authentication, RBAC, server APIs, independent review, solver operations and the 26-agent registry are unchanged.

## Acceptance contract

1. Match approved dark-navy / cyan composition with dense-but-readable desktop structure.
2. Test responsive layout at 1440, 1280, 768, 390 and 320 CSS pixels, including 200% zoom.
3. Verify keyboard focus, search, source links, modal Escape closure, dock tab switching and CAD round-trip.
4. Never label concept art as engineering CAD, and never invent verified weights, hydrostatics, evidence or AI-sync states.
5. Require independently reviewed design and engineering gates before protected release.
6. Run project lint, build, automated tests and isolated-browser screenshot comparison. CI pass alone is not visual signoff.

New focused regression test: tests/sessionDeskUX.test.ts.

## Known gaps and future work

- No governed persisted Engineering Sessions backend or dispatch; local drafts are not project records.
- Session/configuration identifiers do not yet round-trip through CAD as source-backed objects.
- The existing specialist Design, Experiment, Decide and Notebook bodies still need full visual alignment with the new chrome.
- Real browser and screenshot acceptance have not been executed in this connector environment; record actual results in PR review.
- GitHub changes do not automatically deploy into the Google AI Studio preview; authorized deployment remains separate.
