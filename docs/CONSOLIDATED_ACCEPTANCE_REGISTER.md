# USV-01 Consolidated Acceptance Register

**Source of truth:** `ravisinghrathode/usv-01-digital-lab`, exact commit SHA at release.
**Policy:** A passing build, deterministic test, or model-generated report is not a naval engineering approval. Never backdate, forge, or silently bypass mandatory evidence.

| ID | Acceptance criterion | Required evidence | Current disposition |
|---|---|---|---|
| SEC-01 | Every API route requires recognized session and RBAC | Negative/positive HTTP tests, security review | Automated regression coverage; penetration test pending |
| SEC-02 | Data collection integrity / immutable audit trail | Adversarial requests, audit integrity review | CRUD/import hardened; independent review pending |
| GOV-01 | Director signature bound to accepted source digest | Verified Ed25519 approval for exact final baseline | Must be freshly evaluated after code changes |
| GOV-02 | Independent technical scrutiny | Named independent reviewer + recorded findings | Not substitutable by deterministic static output |
| AGT-01 | All 26 registered roles match canonical code | Machine-readable registry reconciliation | Readiness API available; operational proof pending |
| AGT-02 | Each agent produces reproducible domain results | Golden input/output tests, actual provider/tool traces | Pending capability-by-capability validation |
| HYD-01 | Hydrostatics / stability | Approved hull offsets, hydrostatic tables, verified KG, GZ curves, loading cases, reference comparison | Preliminary only |
| RES-01 | Resistance / power and twin-electric propulsion | Controlled hull offsets, appended resistance curve with uncertainty, installed pod/thrust/shaft/thermal/energy maps, matched-power VVP-001 sea trials and independent approval | Unsafe numerical inference fixed on proposed PR #39; physical evidence and review remain open. Evidence intake and checks: `docs/RES01_RESISTANCE_PROPULSION_TEST_PROCEDURE.md` and `src/core/verification/ResistancePropulsionEvidence.ts` |
| STR-01 | Structures | Load envelopes, class-rule citations, FEA correlations, fatigue and buckling | Pending |
| AUT-01 | Safety-critical autonomy | COLREG encounter suite, sensing uncertainty, controlled loss-of-link simulation and tests | Pending |
| MAR-01 | Marine systems integration | Launch/recovery loads, acoustics wet-end, thermal, corrosion/fouling, condensation/bilge evidence | Pending |
| INT-01 | Google AI Studio source sync | Live deployed revision/commit digest matching accepted GitHub SHA | Not yet observed |
| INT-02 | Google Drive | Authenticated read/write test of controlled project artifact and role controls | Not yet observed |
| INT-03 | Obsidian vault graph | Roundtrip sync of linked Markdown, stable identifiers, conflict test | Not yet observed |
| DEP-01 | Running deployment | URL, deployed build SHA, authorization, TLS, persistence, observability, backup/restore drill | Not yet observed |

## Release rules

1. CI Stage B must pass from the final source commit, not a prior run.
2. Stage C independent reviewer and Stage D Director signature must correspond to that same change and baseline digest. Stage E remains fail-closed.
3. Domain validation requires traceable reference data; fabricated validation values, mock model output, and assumed KG are never acceptance evidence.
4. External connection readiness requires authenticated handshake and matching commit provenance. A configured UI button or local interface is insufficient.
5. A human engineering authority must verify acceptance material; AI agents may prepare and check evidence but cannot sign on their behalf.

**RES-01 acceptance status:** The new numeric screen, if supplied with externally obtained measurements, reports `NUMERIC_PASS_UNCERTIFIED` rather than automatic closure. Do not interpret a metadata hash, GitHub CI green Stage B, or entered test numbers as proof of engineering approval. PR #39 requires independent expert verification and final source-digest-bound human sign-off.

## Follow-up evidence collection

Attach reference benchmark files, model/input revisions, test logs and cryptographic manifest checksums under controlled release artifacts. For service connectors, store only a sanitized signed result, timestamps, and source identifiers—never API keys, session tokens, or the contents of private documents in this repository.

**This document records remaining acceptance work; it does not assert those criteria are already satisfied.**
