---
name: agent-runtime-resilience
description: Design safe, deterministic runtime resilience for the canonical 26 USV-01 agents: bounded retries, quota limits, idempotent resume, source-pinned checkpoint recovery and fail-closed provider outages.
---

# agent-runtime-resilience

**USV-01 research-only procedure | Revision 1.0 | Canonical agents:** A01, A15, A18, A20, A24, A25, A26

## Authority and use

Source-controlled procedural guidance for the existing 26-agent Naval AI Lab. It does not grant new tools, credentials, model APIs, compute, shipping/physical actuation, certification or Engineering Director authority. Existing `AGENTS.md`, approved configuration management, exact-head software security review and engineering signoff take precedence. No design or vessel release is authorized by this skill. Do not claim the unadopted draft charter is binding.

## Input contract

1. Validated registered canonical A01–A26 ID, task ID, correlation ID, authenticated operator and permitted tools.
2. Exact sourceCommitSha, configurationId, revisionId, graph/parent dependencies and evidence digests.
3. Configured per-agent budget (tokens/time/tool calls) and explicit non-billable/subscription-only access policy.
4. Previous execution state, checkpoint ID, idempotency key and allowed retry classification.

Missing required inputs are `TBD`, `BLOCKED`, or `NOT_RUN`; no fabricated defaults. Use the actual `sourceCommitSha`, `configurationId` and `revisionId` for every evaluation.

## Procedure

1. Validate strict task state transitions PENDING → EXECUTING → {COMPLETED, WAITING_HUMAN_APPROVAL, BLOCKED, FAILED}; do not convert tool or physics failure into an authorized success.
2. Classify retry causes: transient transport/rate limit may retry with bounded attempts and backoff; invalid schema, forbidden tools, missing physics, uncertain provider identity and failed mandatory computation must fail closed.
3. Require monotonic budget accounting across retries: total tokens, wall time, tool calls and concurrency are capped by configured limits. No fallback to a billed API or copied ChatGPT credential.
4. Persist an exact-source, configuration-bound checkpoint and output digest before side effects. On resume validate hash, task correlation, parent completion, tool permission and receipt identity; do not replay completed side effects.
5. Ensure a waiting signed Director gate is resumed only through the existing ApprovalGateManager. Never infer approval from model narrative or HTTP success.
6. Treat provider/host interruption as UNAVAILABLE or BLOCKED; record last stable checkpoint, retry-after, budget consumption and recovery plan, not fabricated agent output.
7. Add replayable cold-start, transient outage, duplicate-delivery, stale-SHA and malicious gate-state tests before production adoption. Keep physical actuation disabled.

## Required output contract

- Task/correlation ID, source/configuration/revision and checkpoint digest.
- Budget ledger with proposed and consumed resource ceilings, retry history and terminal disposition.
- Dependency state, receipt validity, idempotency evidence and pending human gate IDs.
- Explicit failure codes, remaining TBDs and recovery owner, with no baseline approval.

Every output shall include evidence provenance, source commit, configuration and revision. Status allowed: `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Do not emit `ENGINEERING_RELEASED` or `HUMAN_APPROVED` without the separate authenticated gate.

## Fail-closed checks

- Reject: Unbounded retry loop or request that exceeds budget.
- Reject: Billed API fallback, session-token export or unauthorized external provider.
- Reject: Stale checkpoint and duplicate side-effect execution.
- Reject: Model-generated approval or cleared dependency without signed evidence.

## Synthetic negative tests

- Transient 429 response obeys bounded budget without extra billing.
- Checkpoint from another commit or candidate is BLOCKED.
- Duplicate task is idempotent and does not reissue Director gate.
- Failed engineering calculation remains FAILED across recovery.

## Project implementation references

- `src/core/engine/ExecutionEngine.ts`
- `src/core/orchestrator/CentralOrchestrator.ts`
- `src/core/safety/HumanApprovalGate.ts`
- `src/core/mission-control/SubscriptionCliAdapter.ts`
- `docs/USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md`

## Acceptance boundary

Procedure-selection tests are software evidence only. A successful deterministic or model run is not independently validated engineering, field commissioning, regulatory compliance, or human release. Require authentic configuration-specific evidence and a qualified independent reviewer. This skill is part of the final **frozen** USV-01 skill set; additions need a new deliberate governed exception.
