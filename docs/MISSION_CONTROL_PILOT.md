# USV-01 subscription-only Mission Control pilot

**Status: experimental; disabled by default; no engineering or approval authority.**

## Existing assets preserved

The repository already has **26 agents** in `src/core/agents/definitions.ts`, checked by `AgentRegistry`. It has a DAG scheduler in `CentralOrchestrator`, engineering execution tooling, an existing React dashboard, and cryptographic human approval controls. These are retained.

Do **not** create a second agent registry, second task scheduler, or alternative approval mechanism. The long-term design is to attach subscription-CLI role adapters to existing execution and verification boundaries after local validation.

## Role mapping (do not replace specialist agents)

- Claude Code: planning/orchestration advice for `LEAD-SYS-01` and existing `CentralOrchestrator`. It is **not** a new authority gate.
- Gemini: worker implementation support for existing A01–A26 specialist roles. The specialist's permissions, verification criteria and mandatory deterministic tools remain authoritative.
- Codex: independent review assistance aligned to `INDEP-REV-23` and existing Stage C review machinery. GPT advice **does not** satisfy a human approval gate.

## Billing and credentials

The pilot is **off** until `USV_SUBSCRIPTION_PILOT=enabled` is set intentionally on the Mac. The new `SubscriptionCliAdapter` strips API credentials, uses no shell, and offers no fallback to API providers. It does **not** change the existing `geminiService.ts` or `ModelProviderRouter` API-capable paths. The project owner must audit/disable those paths separately before claiming the entire lab uses zero paid APIs.

Subscription login, CLI availability, and allowance for non-interactive use must be checked against the provider's current terms on the actual machine. A CLI may fail or require interactive authentication; treat that as unavailable, never as permission to use an API key.

## Pilot sequence

1. Freeze the current branch/commit and record agent registry count, canonical IDs, governance checks and outstanding blockers.
2. Confirm each installed CLI's supported sign-in and non-interactive commands. **The `agy` invocation is a hypothesis and MUST be verified on the Mac before use.** Do not run arbitrary generated commands.
3. Run unit tests for the disabled-by-default guard and credential scrubbing.
4. Make a task specification tied to a real specialist agent, original requirements and a Git commit.
5. In an isolated working copy, request an implementation from Gemini and execute deterministic tests.
6. Give Codex only the original requirements, current commit and verified evidence; require structured review findings.
7. Rework rejected revisions with a maximum retry count. Human approval is handled only by the established gate.
8. Observe provider quotas; stop on exhaustion without billing upgrade.

## Rollout blockers / explicit non-goals

- This PR does **not** wire the adapter into `CentralOrchestrator`, add a durable task queue, run live CLI tests, install Docker, or trigger the 26 specialists. These must come only after the local pilot and review.
- No API keys, approval signing keys, GitHub credentials, or Docker socket should enter AI task environments.
- No safety-critical task acceptance based on an AI assertion. Unknown engineering particulars remain TBD.
- Maintain the existing actuator air gap and all current blocking GitHub checks.

## Follow-up

Implement a separate add-on to the existing TypeScript execution engine after validating the Mac toolchain. Reuse the existing dashboard, orchestrator, agent registry and approval gates. Add Docker only for isolated numerical workloads and nonprivileged services.
