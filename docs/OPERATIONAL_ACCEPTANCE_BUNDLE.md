# USV-01 One-Pass Operational Acceptance Bundle

This bundle is a technical control improvement, **not proof of complete naval laboratory acceptance**.

## What automated checks demonstrate
- Exactly 26 canonical agent definitions exist, dependencies resolve without cycles (including aliases), and mandatory deterministic tools are permissioned/registered.
- Analytical engineering estimates reject physically impossible basic inputs and can be compared numerically against independently supplied reference measurements using `evaluateBenchmark`.
- A mathematical comparison can return `NUMERIC_PASS_UNCERTIFIED` but **never** labels source data, hull physics, safety rules, or production operations independently validated.
- The automated CI test suite verifies code and mock/deterministic orchestration only. It cannot demonstrate commercial LLM credentials, provider uptime, controlled vessel performance, or hardware safety.

## Acceptance work requiring real access or representative data
1. **A01–A26 live operation:** establish permitted model-provider credentials in a secret store; execute each agent with scenario-specific inputs and record provider/tool version, trace ID, JSON schema, cost, error handling and review. Static/mock executions do not meet this bar.
2. **Naval physics:** supply traceable hull lines/offsets, loading cases, reference GZ curves, resistance/tow/validated CFD data, structural load envelopes, FEA and experimental uncertainty. Use the numerical comparator only after independent sources and tolerances are approved.
3. **Autonomy and marine systems:** use scenario-recorded simulations covering COLREG, uncertain sensing, link-loss, propulsion failures, launch/recovery, underwater payloads, sealed-hull heat, fouling and condensation. These are subject to independent human engineering review.
4. **AI Studio:** authenticate against a running deployed environment and compare its source-build SHA against approved GitHub main; a configuration file or local response is not a live deployed attestation.
5. **Google Drive:** verify a real controlled-artifact create/read/update/permission/revoke sequence in the approved paid Drive; never store account tokens in source control.
6. **Obsidian:** perform an actual vault note and wikilink roundtrip and conflict simulation using an authorized vault connector; repository Markdown samples alone do not establish sync.
7. **Deployment and security:** capture a URL, TLS, actual running SHA, access boundaries, backup restoration, monitoring, dependency/security test artifacts and independent penetration review.
8. **Authority:** retain signed approval of the exact final accepted digest and independent technical findings according to the project’s risk-classification policy.

## Required disposition
Every item must be marked one of `SOFTWARE_TESTED`, `EXTERNAL_EVIDENCE_REQUIRED`, or `VERIFIED_BY_INDEPENDENT_AUTHORITY`, with a reference, date, and commit. Never promote the first two to the third merely because CI is green.

**Current status:** Code-level controls implemented in this change set; complete operational and naval engineering acceptance remains pending until independent data, external services, and human authority are actually available.
