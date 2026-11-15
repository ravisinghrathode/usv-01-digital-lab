---
name: agent-qualification-campaign
description: Qualify the behavior of all 26 USV-01 agents against controlled golden tasks with source-pinned fixtures, negative tests, independent references, and separation of software readiness from engineering acceptance.
---

# agent-qualification-campaign

**USV-01 research-only procedure | Revision 1.0 | Canonical agents:** A01, A02, A15, A18, A23, A24, A25, A26

## Authority and use

Source-controlled procedural guidance for the existing 26-agent Naval AI Lab. It does not grant new tools, credentials, model APIs, compute, shipping/physical actuation, certification or Engineering Director authority. Existing `AGENTS.md`, approved configuration management, exact-head software security review and engineering signoff take precedence. No design or vessel release is authorized by this skill. Do not claim the unadopted draft charter is binding.

## Input contract

1. Controlled mission/configuration and exact source/revision SHA with authenticated execution host receipt.
2. Per-role input fixtures including representative and adversarial missing/invalid cases.
3. Frozen expected outputs, deterministic reference oracles, uncertainty/tolerances and their source digests.
4. Independent reviewer qualifications, conflict-of-interest record, software governance and Engineering Director authority.

Missing required inputs are `TBD`, `BLOCKED`, or `NOT_RUN`; no fabricated defaults. Use the actual `sourceCommitSha`, `configurationId` and `revisionId` for every evaluation.

## Procedure

1. Declare a frozen suite of 26 role-specific representative tasks and negative cases before changing an agent; specify input grain, accepted evidence and pass/fail rubric.
2. Separate stage 1 static/routing and schema verification, stage 2 permitted deterministic tool execution, stage 3 actual live model response, stage 4 independently qualified engineering review and stage 5 signed release.
3. Require current exact SHA, trusted host attestation and genuine run receipts for any live execution claim; mocks, old runs and deterministic static providers are not live model evidence.
4. Measure completeness, provenance fidelity, unit consistency, unsafe certainty, tool permissions, handoff correctness, retry budget, refusal/recovery, latency and cost ceilings where authorized.
5. Compare before/after on identical controlled configurations and reference conditions with tolerances and uncertainty. Do not claim performance improvement without variance and independent reviewer.
6. Record per-agent pass/fail/blocked reasons and severity, synthesize a milestone-dependent acceptance register, and retain the original failing traces and source hash.
7. Hold the entire safety/engineering qualification claim if any mandatory evidence, external review, SIL/HIL/sea test or human authorization is missing.

## Required output contract

- 26-by-case reproducible test matrix with source SHA and reference fixture digests.
- Exact agent outputs, provider/tool metadata, per-case decision, scores and blocker evidence.
- Before/after metrics with uncertainty and independently signed reviewer dispositions when available.
- Qualified scope, exclusions, remaining tests and stage-specific approval state.

Every output shall include evidence provenance, source commit, configuration and revision. Status allowed: `PROPOSED`, `SCREENED_UNVERIFIED`, `BLOCKED`, `NOT_RUN`. Do not emit `ENGINEERING_RELEASED` or `HUMAN_APPROVED` without the separate authenticated gate.

## Fail-closed checks

- Reject: 26 out of 26 schema successes interpreted as 26 independently qualified specialists.
- Reject: Synthetic unit tests or old model logs used as fresh live hosted execution.
- Reject: Model self-review represented as independent human engineering signoff.
- Reject: Improvement claim made without controlled baseline and comparable conditions.

## Synthetic negative tests

- One missing qualified reviewer blocks accepted 26-agent claim.
- A stale source SHA disqualifies current-campaign operational assertion.
- A tool-permission violation fails the relevant role despite good prose.
- Synthetic benchmark cannot be elevated to vessel engineering release.

## Project implementation references

- `tests/all26Agents.test.ts`
- `tests/navalSkillRegistry.test.ts`
- `src/core/verification/RoleAccuracyAudit.ts`
- `docs/USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md`
- `config/delivery-milestones.json`

## Acceptance boundary

Procedure-selection tests are software evidence only. A successful deterministic or model run is not independently validated engineering, field commissioning, regulatory compliance, or human release. Require authentic configuration-specific evidence and a qualified independent reviewer. This skill is part of the final **frozen** USV-01 skill set; additions need a new deliberate governed exception.
