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
| HYD-01 | Hydrostatics / stability | Approved source-referenced CAD/offsets, verified mass/KG and loading cases, equilibrium trim/GZ and downflooding, independent benchmark tolerances, reviewer and Director digest | PR #40 software merged; 425 tests passed at merger. Self-audit PR #46 corrects trim screening and machine-readable evidence ledger. **PHYSICAL ACCEPTANCE BLOCKED** until external evidence is independently verified |
| RES-01 | Resistance / power and twin-electric propulsion | Controlled hull offsets, appended resistance curve with uncertainty, installed pod/thrust/shaft/thermal/energy maps, matched-power VVP-001 sea trials and independent approval | Unsafe numerical inference fixed on proposed PR #39; physical evidence and review remain open. Evidence intake and checks: `docs/RES01_RESISTANCE_PROPULSION_TEST_PROCEDURE.md` and `src/core/verification/ResistancePropulsionEvidence.ts` |
| STR-01 | Structures | Load envelopes, class-rule citations, FEA correlations, fatigue and buckling | Pending |
| AUT-01 | Safety-critical autonomy | Non-actuating COLREG screen, synthetic sensor evidence and advisory SIL replay in PR #41; full closed-loop SIL, physical HIL, qualified independent review, regulated sea trials and Director release evidence required | Software controls merged, but PR #41 final governance check failed (NC Issue #43); engineering release HOLD, physical and qualified review OPEN |
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

**RES-01 acceptance status:**The new numeric screen, if supplied with externally obtained measurements, reports `NUMERIC_PASS_UNCERTIFIED` rather than automatic closure. Do not interpret a metadata hash, GitHub CI green Stage B, or entered test numbers as proof of engineering approval. PR #39 requires independent expert verification and final source-digest-bound human sign-off.

## Follow-up evidence collection

Attach reference benchmark files, model/input revisions, test logs and cryptographic manifest checksums under controlled release artifacts. For service connectors, store only a sanitized signed result, timestamps, and source identifiers—never API keys, session tokens, or the contents of private documents in this repository.

**This document records remaining acceptance work; it does not assert those criteria are already satisfied.**

## Production agent runtime closeout — 13 November 2026

**Selected runtime:** native USV-01 `ExecutionEngine` / `BaseAgent` with `codex_cli`, using the existing operator-local ChatGPT sign-in. Implementation commit `9b00f7aa6afc0d8fd7ebe3c43aa677855fc43d25` on `codex/usv-runtime-closeout`. The evidence and register update follow the implementation commit so the reports can reference its exact SHA.

**Decision basis:** The [Mission Control pilot](MISSION_CONTROL_PILOT.md) demonstrated the Gemini/Codex handoff but stopped at the correction limit with no controlled traceability artifact and deferred Claude validation. The [native Gemini campaign](AGT02_NATIVE_LIVE_EXECUTION_20261113.md) demonstrated 26 live runs and 10 mandatory tools at its recorded revision, using a temporary relay. The [Codex cutover](CODEX_NATIVE_AGENT_RUNTIME.md) provides a repeatable operator-local subscription route through the native engine. The checked-out cutover base `161e42555947d42a96d8cfd1d75b6a3fd00c0925` has the same Git tree as the PR #64 merge `c739445021010f0b913a27553cf0913aa6885b00`. Codex CLI 0.167.0-alpha.4.1; underlying model identity unverified. Antigravity 1.5.8 used its existing sign-in for a separate advisory review.

| Evidence | Exact-implementation result |
|---|---|
| Controlled intake | `USV-RT-WP-001` uses [three software requirements](../evidence/runtime-closeout/requirements.json) `USV-RT-001`–`003` and verification IDs `USV-RT-V01`–`V03`, anchored to the [cutover operating contract](CODEX_NATIVE_AGENT_RUNTIME.md). Record and source SHA-256 hashes are in the [work package report](../evidence/runtime-closeout/traceability.json). |
| Native execution and deterministic checks | `REQ-TRC-02` returned all three exact allocation, method, verification ID and criterion links; unique IDs, source anchors and row comparison passed. An isolated negative run withheld the CLI from PATH and omitted mandatory hull inputs. The engine returned `FAILED` in both cases. See [negative checks](../evidence/runtime-closeout/negative-checks.txt). |
| Reviewer disposition | Antigravity/Gemini returned advisory `APPROVE` on cycle 1 and requested no correction. The report contains worker correlation ID, review findings and prompt/response hashes. Qualified independent human review remains open. |
| Quality checks | Node 26.6.0, npm 11.18.0. Typecheck and production build passed. Vitest passed 772/772 tests across 81 files. Build emitted Vite module externalization, chunk and CSS warnings. |
| AGT-01 / AGT-02 runtime commissioning | 26/26 canonical agents completed with live Codex CLI synthesis and all 10 mandatory deterministic tool calls passed in the live run. See the [matrix](../evidence/runtime-closeout/matrix.json) for provider, correlation IDs and tool input/output digests, and the [preflight](../evidence/runtime-closeout/preflight.json) for the matching [case catalog](../evidence/live-agents/representative-cases.json) hash and all 26 input checks. |
| GOV-01 / GOV-02 and human gate | **HOLD.** Stage D evaluated the exact implementation with the CI trust anchor and rejected the stale `ECR-20261112-002` signature. Baseline digest `sha256:ca1b3987f7fd0812cfc69289ddac4175830127cd5d404c2a9715f5bc4862a136`. An authorized independent technical reviewer must record their disposition for the exact release candidate, and the designated Engineering Director must sign its applicable ECR and exact digest. Exact-head release CI and Stage E remain pending. A later candidate with different tracked content requires its own digest. |

### Reproduction

Check out the pinned implementation commit in a clean worktree on the authorized workstation. Use the committed npm lockfile and the existing signed-in CLIs. Supply the Director public key already configured in the pinned governance workflow when evaluating Stage D.

```sh
npm ci
npm run lint
npm run build
npx vitest run
git restore governance/reports/stage-c-review.json
export AI_REVIEW_PROVIDER=codex_cli
export USV_SUBSCRIPTION_PILOT=enabled
export USV_ALLOW_PAID_AI_API=false
export DIRECTOR_PUBLIC_KEY="$(sed -n '/^        -----BEGIN PUBLIC KEY-----$/,/^        -----END PUBLIC KEY-----$/s/^        //p' .github/workflows/safety-governance-gate.yml)"
npx tsx scripts/run-runtime-traceability.ts "$(git rev-parse HEAD)"
npm run acceptance:codex-agents -- --execute
```

Live transcripts can vary across runs. Reproduce the pinned inputs, provider path, tool execution, deterministic trace comparison and approval behavior. The commissioning catalog exercises software pathways with non-operational fixtures; engineering validation and release approval remain open.
