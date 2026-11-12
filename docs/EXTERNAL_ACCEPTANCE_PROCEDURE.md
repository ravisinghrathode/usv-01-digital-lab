# USV-01 External Evidence Collection — Acceptance Procedure

The 15 mandatory requirements are machine-readable in `src/core/verification/AcceptanceGate.ts`; their live disposition is returned by authenticated `GET /api/verify/readiness`. It is expected to show pending status until real acceptance evidence has been independently verified. An artifact's presence, a submitted boolean, a successful CI run or a ChatGPT response cannot certify engineering or production readiness.

## Single consolidated acceptance procedure

1. **Establish exact release baseline.** Record SHA from `git rev-parse HEAD`, the baseline content digest and CI run URL. Do not accept results for any older SHA.
2. **Security:** conduct authenticated role-boundary penetration tests, test credential revocation, audit-log tamper resistance, import/restore rollbacks and backups. Attach reproducible findings and independent reviewer disposition.
3. **Agents:** for every A01–A26, record the canonical role, required inputs, real tool/model used, output and schema evidence, deterministic reference results (where applicable), fail-safe behavior, accuracy limits, and review result. Tests that use mocked providers prove orchestration only.
4. **Naval physics:** upload approved lines/offsets and displacement/load cases; compare hydrostatic curves and GZ to independent reference software or measured data with defined tolerances. Correlate resistance against towing-tank data/validated CFD over the mission speed envelope. Validate structural loads, thermal and electrical envelopes with reviewable calculations and benchmark data.
5. **Autonomy & marine:** execute recorded encounter simulations and loss-of-link/failure scenarios; check specific operational envelopes; perform launch-and-recovery and wet-end payload, heat dissipation, corrosion/fouling and condensation verification. Human-supervised digital tests do not imply permission to actuate hardware.
6. **Google AI Studio:** obtain an authenticated deployed-build revision directly from the running lab. Confirm its source SHA equals approved GitHub `main`. A text claim of synchronization without matching deployed provenance is not proof.
7. **Google Drive:** use a controlled non-sensitive test artifact in the designated project folder. Record authorized create/read/update/revoke and least-privilege tests; avoid uploading credentials or private test payloads.
8. **Obsidian:** synchronize a controlled Markdown note with stable wikilinks; read it back, verify link/identifier integrity, and demonstrate conflict handling without overwriting the knowledge graph.
9. **Deployment:** record deployment URL, TLS/security configuration, running source SHA, health checks, restart recovery, logs, controlled backup restore and rollback test.
10. **Independent acceptance:** have a designated independent reviewer resolve findings, and the Engineering Director sign the exact final source baseline using the project governance mechanism. Do not add forged signoff records or bypass Stage E.

## Evidence integrity rules

- Keep test data and measurement provenance outside the source repo unless cleared for release.
- Every acceptance artifact needs a SHA-256 digest, source location, tool/version, test date, baseline SHA, and competent reviewer attribution.
- A returned `SUBMITTED_UNVERIFIED` means only that a structurally well-formed evidence reference was supplied. The current gate **cannot cryptographically verify the source or reviewer** and will not assign `VERIFIED` automatically.
- When external access, representative hardware, actual hull data, or an independent reviewer is unavailable, leave the criterion explicitly pending rather than guessing.
