# Agent-engineering skill adoption — USV-01 Naval Digital Lab

**Document ID:** USV01-SWE-AGENT-SKILLS-001  
**Date:** 2026-11-15  
**Status:** PROPOSED SOFTWARE HARDENING — NOT MERGED / NOT ENGINEERING RELEASE  
**Base:** `main` at `3ac4c72e015d74987a234756e4ca58dc54af9781` at review start  
**Scope:** Existing A01–A26 agent engine, not a new agent organization  
**Authoritative policies:** Existing charter, configuration management, ECR, permissions, independent review and release gates take precedence

## 1. Decision

Reuse existing TypeScript `CentralOrchestrator`, `ExecutionEngine`,
`ApprovalGateManager`, registry and deterministic naval tools. Do not install
LangGraph, a second scheduler, new model providers, paid services or runtime
subagents solely because a skill exists. ChatGPT-connected skill records are
retrievable procedural references, not installed executable packages.

This change implements one bounded and independently reviewable improvement:
**signed gate-resolution enforcement and idempotent workflow resumption**.

## 2. Observed gap and counterexample

Read from `main` before making this change:

1. `CentralOrchestrator.handleGateDecision(gateId, decision)` accepted a
   caller-supplied decision and marked matching tasks `COMPLETED` or
   `FAILED` without consulting the authenticated approval record.
2. `resolveGateDecision(gateId, decision)` checked that a gate and task
   existed but did not first require the gate's finalized state to equal the
   supplied decision or verify its signed Director receipt.
3. `executeWorkflow()` scheduled existing tasks on every invocation,
   including tasks already completed or waiting on human approval. This
   could repeat work and generate duplicate approval gates during a resume.

**Counterexample:** execute a safety-critical task, leave its gate `PENDING`,
call the publicly available resolver with `'APPROVED'`, then resume. Prior to
the proposed patch, the task could be marked `COMPLETED` by that resolver
without a matching approved gate. This is a software authority-boundary
defect, not evidence of any real engineering or physical-world approval.

## 3. Bounded implementation

- `handleGateDecision` routes through `resolveGateDecision` rather than
  independently mutating task state.
- `resolveGateDecision` rejects absent, pending or mismatched decisions,
  missing Director identity, missing finalization time, invalid signatures,
  and gates not associated with an actively waiting task. It also retains
  the existing check against promoting failed calculations.
- `executeWorkflow` leaves `COMPLETED` tasks untouched, holds
  `WAITING_HUMAN_APPROVAL` without reissuing gates, retains `FAILED`
  tasks, and allows `BLOCKED` dependency-driven tasks to retry after
  their upstream gate becomes genuinely approved.
- The result counters describe execution during that invocation; skipped
  earlier completed work must not be construed as newly performed work.
- No engineering baseline, solver, vessel dynamics, autonomous actuation,
  classifier, or candidate release logic is changed.

## 4. How the 12 skills improve our existing architecture

| Skill | Application or decision | Evidence / follow-up |
| --- | --- | --- |
| `building-deterministic-skills` | Turn fail-closed behavior into explicit executable rules | Regression test with typed outputs |
| `agent-architecture` | Retain the existing DAG, roles and execution engine | No new runtime or agent count |
| `state-management` | Make repeated workflow execution idempotent | Completed and waiting tasks are not rerun |
| `handoff-protocol` | Preserve upstream dependency outputs and gate-bound handoffs | Current DAG retained; future cross-process receipt versioning needed |
| `guardrails` | Require a signed, finalized Director gate before state promotion | Unsigned approval negative test |
| `verifier-design` | Test rejection of invalid transitions, not merely happy path | Negative, signed-positive, and rejected-transition cases |
| `agent-eval` | Maintain reproducible, zero-model-cost regression cases | `tests/orchestratorSignedResume.test.ts` |
| `local-replay` | Repeat a pending-to-approved/rejected execution without duplicate work | Fixture-driven test with explicit task IDs |
| `ecosystem-primer` | Select framework based on concrete gaps | Existing TypeScript scheduler remains authoritative |
| `langgraph-fundamentals` | Reference for state-graph modeling; no adoption | Conditional, requires architecture decision |
| `langgraph-persistence` | Compare against existing MissionControlStore, not replace it | Future crash-resume, multi-process idempotency study |
| `langgraph-human-in-the-loop` | Compare documented resume patterns against current signed gates | Existing `ApprovalGateManager` retained |

## 5. Verification matrix

| Scenario | Expected software result |
| --- | --- |
| Pending gate passed to public resolver as approved | Reject; task remains `WAITING_HUMAN_APPROVAL` |
| Repeated workflow while gate pending | No duplicate agent execution or additional gate |
| Authentic signed Director approval | Waiting task becomes complete; still not engineering validation |
| Resume after signed upstream approval | Previously blocked descendant can execute exactly once |
| Repeat workflow after task completion | No duplicate upstream or downstream execution |
| Authentic signed Director rejection | Upstream remains `FAILED`; descendants remain `BLOCKED` |

Target command: `npx vitest run tests/orchestratorSignedResume.test.ts tests/orchestrator.test.ts tests/safety.test.ts`.  
Broader commands: `npm run lint`, `npm test`, `npm run acceptance:numerical` and repository governance workflows.  
**Execution status:** Not run in the chat environment; CI must provide an actual commit-pinned receipt. Do not convert test source into a test-pass claim.

## 6. Remaining risks and explicit holds

1. **Mutable gate references:** `ApprovalGateManager.getGate()` returns its stored object;
   a deeper separation-of-trust review should consider immutable approval receipts,
   defensive copies and permission boundaries. The proposed signature check adds a
   guard but is not a complete authentication architecture.
2. **Process-local signing key:** The current signer operates within the
   application process. Independently review key origin, custody, rotation and
   server-side-only decision enforcement before relying on it for external trust.
3. **Crash recovery:** The in-memory `CentralOrchestrator` is not durable.
   Study process restarts, persistent task snapshots, idempotency keys and
   cross-process races under M03/M02 after trusted-host verification.
4. **Agent tool authorization:** Existing permission gates and evidence
   provenance still require negative tests and independently reviewed receipts.
5. **Engineering authority:** A signed software gate is **not** qualified
   numerical verification, an adopted charter, independent marine safety
   validation, release authorization or permission to actuate the vessel.
6. **Existing milestone holds remain unchanged:** M00–M02 are blocked;
   M03–M08 are governed by their pre-existing dependencies and review.
7. **Third-party skill supply chain:** No third-party skill executes in CI
   solely by being recorded here. Re-audit source licenses, pinned versions,
   permissions and dependencies before installing any runtime/tool.

## 7. Review and acceptance

- Change classification: protected orchestration/security software.
- Required: normal PR, passing offline deterministic tests and governance CI,
  independent exact-head peer review, and any designated authority identified
  by current repository policy.
- This proposal does not update `config/delivery-milestones.json`, charter
  adoption, Gate 0 evidence, or the vessel engineering release state.
- Do not merge automatically or interpret a green CI run as independent
  engineering certification.

**Sources:** Existing repository implementation and the connected skill-library
copies of the 12 named skills, originally from `srinitude/building-deterministic-skills`,
`agulli/skills-evolve`, `ericrisco/rsc-harness` and
`langchain-ai/langchain-skills`.
