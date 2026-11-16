# USV-01 | 26-agent swarm frontier engineering review
**Baseline:** `86c4e515a7660da07611af0c33b28ff9011da199` (main, inspected 2026-11-17)
**Scope:** source inspection and adversarial control-plane hardening. This is NOT a 26/26 live-provider benchmark, maritime certification or approval to actuate.

## Executive assessment
The lab has 26 canonical specialist definitions, deterministic naval tools, a task DAG, restricted model routing, academy curricula, research-only durable queue, independent-review gates and broad unit tests. These are material assets, not proof that autonomous work is reliable in the field.

### Verified implementation gap closed in this PR
- **P0 — approval self-attestation:** `verifyApproverSignature()` previously trusted `serverVerifiedSignature` supplied by the same caller as `tokenSignature`. Both could be identical attacker-selected strings. Removed this fallback; only server-keyed HMAC matches are accepted.
- **P0 — exposed mutable gate state:** gate getters/create/result/listeners previously returned internal objects by reference. An unsanctioned caller could mutate their state and nested payloads; gate APIs now return defensive deep copies.
- **P0 — DAG approval shortcut:** dependency resume previously promoted an upstream waiting task to COMPLETED based only on `gate.state === 'APPROVED'`. It now invokes the same signed gate resolver as the decision callback.
- **P1 — mutable task and handoff projections:** callers could mutate registered task input, task results, and inter-agent messages. Copy-on-ingest and copy-on-read now separate external views from the control-plane maps.
- **P1 — weak entropy fallback:** approval-signing utility previously used Math.random when crypto was unavailable; it now throws.

These fixes cover a specific threat model: injected model outputs, untrusted browser/client state, accidental mutable references and self-attested authority. They do NOT make an in-process key or HTTP session a hardware-backed independent human signature.

## Outstanding frontier gaps, prioritized
| Priority | Capability gap / current observed boundary | Required next implementation and measurable acceptance |
| --- | --- | --- |
| P0 | Human approval signature shares an in-process HMAC key; long-lived decision receipts are not separately content/commit-bound | Server-only signing module, key rotation, canonical digest of task + output + pinned SHA + decision; replay/tamper/expiration tests, Ed25519 external authority for controlled release |
| P0 | Research workflow status can be COMPLETED without a positive independent engineering evidence decision | Two separate immutable states: `workflowExecuted` and `evidenceAdmitted`; block propagation of claims as verified unless external reference/units/uncertainty and independent sign-off match |
| P0 | No basis to claim physical autonomy safety from unit tests | SIL/HIL environmental fault-injection campaigns for COLREGs, loss-of-link, stale navigation, spoofing, geofence, thermal/sensor faults; independent witness and no actuation by agents |
| P1 | Numerous 26-role matrix tests validate schemas and mock output rather than blind real task outcomes | Blind role-specific task set, frozen reference oracle and adversarial prompts, repeated live trials, measured accuracy/unsafe-claim rate/coverage/cost/latency; publish results with model/version and reproducible receipts |
| P1 | Orchestrator task state and message bus are in-memory; research-only resilient queue is not a durable workflow ledger | Append-only event ledger with atomic checkpoint, idempotency, crash recovery, signed output hashes and task revocation; kill/restart/resume tests |
| P1 | Prompt assembly includes untrusted downstream and tool text; schema validation is not a prompt-injection proof | Poisoned PDF/repo/web/memory eval suite; deny role override, tool-request laundering, source spoofing, secret exfiltration and reviewer collusion |
| P1 | 26-agent parallelism can duplicate research and over-consume context | Complexity-aware routing, per-role token/time/tool budgets, structured delegation contracts and provenance-aware short handoffs; compare against single-agent baseline on equal budget |
| P1 | Dual-provider intent is configured but availability and exact delivered models depend on operator subscriptions | Capture signed live provider/model receipts, refusal/error classifiers, authorized data transfer and deterministic fallback hold; report provider-specific performance separately |
| P2 | Tool performance is verified principally through deterministic and unit tests | Independent tool-oracle corpus, finite tolerance/unit/frame validation, calibration references, tool-use confusion matrix and version pinning |
| P2 | Obsidian/Drive knowledge graph is not an independently qualified engineering retrieval system | Immutable source IDs, document edition/rights/access ledger, cited retrieval with revision and adversarial cross-document contradiction tests |
| P2 | No single continuously updated frontier swarm scorecard | CI-generated evaluation dashboard with quality, coverage, critical failures, uncertainty honesty, cost, p50/p95 duration, resume rate and provenance completeness |

## Benchmark principles
Use Anthropic's engineering guidance on [effective agents](https://www.anthropic.com/research/building-effective-agents), [multi-agent research coordination](https://www.anthropic.com/engineering/multi-agent-research-system), [tool design](https://www.anthropic.com/research/writing-tools-for-agents), [context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents), and [agent evaluations](https://www.anthropic.com/research/demystifying-evals-for-ai-agents). These are design references, not product-equivalence evidence.

## Minimum release criteria for a "state-of-the-art" supervised research pilot
1. 26/26 agents with pinned source and actual provider receipts; no invented model identity.
2. Blinded role-specific acceptance tasks with independent oracles and repeated trials, including adversarial cases.
3. Zero successful unauthorized approvals, tool-permission escalations, baseline promotions, or authority-spoofed handoffs in the seeded threat suite.
4. Every numeric claim traced to inputs/tools/units/uncertainty or explicitly left TBD.
5. Pinned revision, canonical evidence digests, durable run ledger and replay-safe multi-provider fallback.
6. A separate, human-controlled engineering gate remains mandatory for any vessel baseline, physical deployment or operational action.

**PR scope restriction:** protected lab source security only. No approved vessel baseline, direct actuation, external subscription access, or qualification state is changed. Review the patch independently and run CI plus the full relevant test matrix before merge.
