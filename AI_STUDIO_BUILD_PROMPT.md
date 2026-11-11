# Google AI Studio Build prompt — USV-01 Digital Engineering Lab

Import this repository in Google AI Studio Build mode. If the complete MVP archive has not yet been added, build the application from this repository's specification without inventing vessel dimensions or performance values.

Continue the USV-01 Digital Engineering Lab as a full-stack engineering workspace. Use a responsive React frontend and a secure server-side API. Preserve the project boundaries in `USV01_PROJECT_CONTEXT.md`.

## Required modules

1. Project cockpit: status, milestones, subsystem readiness and open decisions.
2. Systems engineering: requirements, allocation, traceability and interfaces.
3. Design registers: naval architecture, hydrodynamics, structures, electrical/power, propulsion, software/autonomy and communications.
4. Simulation centre: controlled inputs, geometry revision, solver version, job status and result evidence.
5. Verification centre: methods, procedures, acceptance criteria, test results and evidence.
6. Risk and decision registers.
7. Procurement/BOM register.
8. Knowledge centre with links to Obsidian and controlled Google Drive documents.

## Data and security

- Use Firebase Authentication and Firestore when explicitly provisioned.
- Enforce project membership in Firestore Security Rules and on all server routes.
- Keep Gemini API credentials in server-side AI Studio Secrets. Never expose keys in browser code or commit them to Git.
- Preserve a clearly labelled local demo mode when Firebase is not configured.
- Use stable record IDs, timestamps, revision metadata, change reasons and source references.
- Do not overwrite approved revisions; create a new revision and retain the previous one.
- Never weaken access control for convenience.

## AI engineering assistance

Gemini responses must label facts, assumptions, estimates and proposals separately; list missing inputs; cite the record IDs used; explain uncertainty and verification implications. AI-generated suggestions must never be automatically marked approved or released.

## Traceability

Provide visible links from requirement → subsystem → design decision → analysis/simulation → verification procedure → evidence. Show missing links as traceability gaps.

## Safety and scope

This is a non-operational engineering and verification environment. Do not implement live vessel control, actuator commands, propulsion/steering commands, weapon targeting or combat-payload functions. Do not invent vessel particulars; mark unknowns as `TBD`. Require qualified human review and independent verification for safety-critical outputs.

## Acceptance checks

- Application builds and passes basic smoke tests.
- Demo mode works without Firebase.
- Unauthenticated and non-member users cannot access project records.
- Gemini calls run server-side and enforce membership.
- API secrets do not appear in browser bundles or Git history.
- Export/import preserves record IDs, provenance and revisions.

Before enabling paid Firebase/Cloud services or deploying, list the resources and costs and wait for explicit project-owner approval.