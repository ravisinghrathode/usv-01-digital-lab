# USV-01 | 26-agent ChatGPT engineering campaign: evidence-led acceptance

**Objective:** make the three dashboard assertions testable without inventing
an active deployment or misrepresenting engineering certification.

**Current authority:** research-only, non-operational commissioning. No actuator
control, no weapon/payload command, no released vessel design. The Engineering
Director approves engineering baselines *after* independent review, not before
the AI lab can investigate them.

## Three separate acceptance claims

| Dashboard claim | Machine evidence necessary | Still does not establish |
| --- | --- | --- |
| All 26 operational on current infrastructure | Same exact source SHA, 26 unique completed authenticated `codex_cli` outputs, mandatory tool traces, recent independently signed host health bound to that campaign | 26 continuously running processes; vessel fitness or safety |
| Fully automated 26-agent engineering campaign | Above **plus** dependency-ordered specialist handoffs; actual controlled vessel input catalog (not the synthetic sample); 26/26 valid deterministic preflight with zero failed/expected-rejected calculations | Independent correctness of every specialist conclusion |
| Independently validated engineering outputs | Above **plus** external reviewer attestations for all 26 roles; each signature covers the exact agent output digest, same code SHA, and independently sourced reference artifact whose bytes are hashed and checked | Formal regulatory certification or Engineering Director release |

The implementation is deliberately strict: an offline/mock matrix and stale
model trace **never** count as a verified operational campaign.

## Ready-to-use commands

Offline commissioning check (no model tokens):

```sh
npm run acceptance:codex-agents -- --catalog evidence/live-agents/representative-cases.json
npm run acceptance:full-26
```

To execute all 26 specialist agents on an already provisioned, trusted Mac or
self-hosted runner:

```sh
codex login status
AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled \
USV_ALLOW_PAID_AI_API=false USV_LAB_SCOPE=RESEARCH_ONLY \
npm run mission-control:preflight

AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled \
USV_ALLOW_PAID_AI_API=false USV_LAB_SCOPE=RESEARCH_ONLY \
npm run acceptance:codex-agents -- --catalog evidence/live-agents/representative-cases.json --execute
```

The example above deliberately uses a **synthetic non-operational catalog**.
It can establish provider operational readiness, once authenticated/attested,
but **cannot** establish a real vessel engineering campaign or independent
validation. It generates:

- `data/codex-26-agent-progress.json` — atomic journal after each attempt;
- `data/codex-26-agent-preflight.json` — per-role tool preflight;
- `data/codex-26-agent-matrix.json` — exact SHA, role IDs, timestamps,
  provider, tool hashes, completion and failure reasons;
- `governance/reports/26-agent-engineering-campaign-status.json` — all three
  fail-closed acceptance flags and per-role external evidence requirements.

The 26-agent campaign uses topological scheduling. Example: weight (A09)
must precede dependent hydrostatics (A06) and resistance (A07); sensor (A16)
and communications (A19) precede electrical (A14). Upstream model summaries
are explicitly **UNVERIFIED_ADVISORY**, not approved numeric inputs. Failed
upstream roles block dependent live tasks, and all 26 statuses are retained.

## Controlled real-engineering campaign

Build a traceable catalog based on the same schema as
`evidence/live-agents/representative-cases.json`, but use:

- `dataClassification: "CONTROLLED_ENGINEERING_EVIDENCE"`
- `controlledVesselConfigurationId`: a real, revision-controlled draft
  configuration ID (not "approved" by implication)
- `source`: a real source/revision for data provenance
- `sharedParameters`: sourced vessel inputs with correct units, coordinate
  frames and traceable assumptions
- 26 non-duplicate canonical role cases A01–A26, with domain-specific tasks

Use `TBD` for unknowns. A missing mandatory input blocks that calculation;
**do not invent values** to make a campaign green. Verified weights/hull
geometry, CFD/experimental references, loads, power, thermal testing,
COLREG simulations and fault-injection evidence remain subject to independent
challenge according to `RoleAccuracyObligations.ts`.

The live command accepts controlled catalogs under `evidence/` or
`references/`; the script requires a clean exact Git SHA. A sample with
contradictory synthetic mass, buoyancy and efficiency assumptions must not
be relabeled as controlled evidence.

## Authenticated host and independent review

A separately provisioned and signed-in ChatGPT Codex CLI is required on the
execution host. `codex login status` must confirm **ChatGPT** mode; API-key
or access-token modes are refused to avoid unapproved billing. The CLI adapter
runs read-only, captures the official final-message artifact, strips billable
API credentials and fails without fallback to Gemini or mocks in production.

After a successful 26/26 live campaign, an **operator-controlled** Ed25519
host private key outside the repository signs a five-minute health statement:

```sh
npm run mission-control:attest-host
```

Host configuration: `USV01_HOST_ID`,
`USV_HOST_ATTESTATION_PRIVATE_KEY_FILE` (private 0600/0400 external path),
`USV_HOST_ATTESTATION_PUBLIC_KEY` (controlled verifier trust root). The host
statement cannot be generated from a failed or historical campaign. It is
short-lived; an old report is not proof the service is healthy today.

Independent engineering sign-off cannot be manufactured by ChatGPT reviewing
itself. A qualified separate reviewer must inspect every source artifact and
output, record method/qualification, then sign with their own **different**
Ed25519 key and pinned `USV_INDEPENDENT_REVIEWER_PUBLIC_KEY`. Exact-output
review records live in `data/independent-reviews.json` and the referenced
source artifacts under `evidence/independent/`. Helper command:

```sh
npm run acceptance:sign-independent -- \
  --agent A06 --report data/codex-26-agent-matrix.json \
  --reference evidence/independent/a06-independent-hydrostatics.json \
  --verifier 'qualified-external-reviewer-id' \
  --qualification 'documented reviewer qualification' \
  --method 'independent hydrostatic/reference comparison method' \
  --finding ACCEPT --key /outside/repo/reviewer-private-key.pem \
  --ack INDEPENDENT_REVIEW_COMPLETED
```

An attestation proves reviewer accountability and binding to source bytes,
**not** that the reviewer is competent or the physics is correct. The reviewer
and the Engineering Director remain responsible for technical judgment.

To evaluate all three claims against current evidence:

```sh
npm run acceptance:full-26 -- \
  --report data/codex-26-agent-matrix.json \
  --preflight data/codex-26-agent-preflight.json \
  --host data/codex-host-health.json \
  --reviews data/independent-reviews.json \
  --require-all
```

Missing files or untrusted keys produce explicit blockers. The command never
manufactures attestations or quietly turns unknowns into approved metrics.

## GitHub automatic execution

The workflow `.github/workflows/usv01-26-agent-commissioning.yml` is manually
dispatchable **only from protected `main`**. Its preflight mode uses a standard
GitHub runner and no model; its live mode uses a trusted isolated runner
labeled `usv01-codex`, with locally signed-in ChatGPT credentials. All live
reports are uploaded as workflow artifacts even when acceptance fails.

The repository cannot authenticate your Mac, register a runner for you, sign
as an independent reviewer, invent laboratory/sea-trial data, or merge a
HIGH/CRITICAL PR without its required cryptographic Git source approval and
independent peer review. These are **real, unresolved external evidence and
authority prerequisites**, not tasks for AI agents to self-certify.

## Source versus vessel baseline authority

Protected source-code merge approval, when required by the repository, binds
the *software source revision*. It is not an early signature on unknown vessel
parameters. Commissioning is a separate controlled research permission.
An actual vessel engineering baseline remains blocked until independently
reviewed evidence, applicable physical measurements and Engineering Director
signoff. All software-generated reports force
`engineeringReleaseApproved: false` and
`vesselDesignCertified: false`.
