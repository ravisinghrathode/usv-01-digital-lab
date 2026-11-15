# USV-01 Quota-Resilient Agent Orchestrator — operator runbook

**Scope:** The 26 existing registered specialists retain their canonical prompts, tools, dependencies, human approvals and safety gates. This change adds an opt-in local **research execution queue**, a shared Codex-subscription request guard and read-only status telemetry. No additional agent or paid-model permission is created.

## What is and is not measured

- The ChatGPT Codex CLI does not expose a trustworthy remaining-token count to this runtime. The local ledger records **attempts**, not real token balance. Do not label the estimate as an account quota.
- All subscription Codex calls (orchestrator, worker, reviewer, A01–A26) pass through a shared host-local quota ledger before spawning a model. Default conservative allowance: **12 attempts per 360-minute window**, with a 60-minute initial provider-error cooldown and exponential backoff capped at 12 hours. These are local scheduling controls, **not promises of restored provider capacity**.
- The subprocess still enforces ChatGPT OAuth (not API-key login), strips API credentials, executes read-only and fails closed on unavailable models. Usage-limit errors become USV_QUOTA_WAIT, never a mock/paid fallback.
- Concurrent processes share a mkdir-locked 0600 ledger in the operator's home directory. Corruption blocks dispatch rather than resetting counters.

## Local state and transitions

- Queue: ~/.usv01/runtime/agent-queue.json. Ledger: ~/.usv01/runtime/codex-quota.json. Override only on an operator-controlled host using USV_AGENT_QUEUE_PATH and USV_QUOTA_STATE_PATH. Do not place either under Git, an untrusted shared volume or a cloud-synced folder.
- PENDING -> RUNNING -> BLOCKED_REVIEW (normal live research output still requires human assessment), COMPLETED (offline schema validation or authorized non-release result), FAILED (non-quota error) or WAITING_FOR_QUOTA.
- WAITING_FOR_QUOTA becomes eligible after both the persisted retry time and the ledger's current cooldown/window allow a new attempt. A subsequent real Codex quota error extends the cooldown. No fabricated reset time is used.
- RUNNING is recorded **before** invocation. If a worker crashes, an expired lease goes to BLOCKED_REVIEW with UNCERTAIN_INFLIGHT_RESULT. It never automatically replays potentially completed work. Reuse a new task ID only after operator investigation.
- Task IDs are idempotent: an unchanged repeated enqueue returns the existing task; a changed task with the same ID is rejected. Input digest and the full Git commit SHA remain pinned.
- Only PUBLIC_SOURCE_SAFE_ONLY or SYNTHETIC_TEST_ONLY_NON_OPERATIONAL task inputs are allowed. Live model outputs remain unverified proposals; no vessel release, baseline update, Git merge or self-approval is possible.

## Installation after the protected PR is merged

From a clean, up-to-date local checkout on the ChatGPT-authenticated Mac:

    cd "$HOME/usv-01-digital-lab"
    git fetch origin main && git merge --ff-only origin/main
    npm ci
    npm run mission-control:preflight
    npm run mission-control:quota -- status

Enqueue an A26 read-only public research task pinned to that checkout:

    npm run mission-control:quota -- enqueue --id A26-PUBLIC-001 --agent A26 --objective "Draft an evidence-source verification checklist for public USV fleet benchmarking" --priority 8

Run one bounded attempt manually (do not do this while Codex is already quota-blocked):

    AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled USV_ALLOW_PAID_AI_API=false npm run mission-control:quota -- run --max 1

Or explicitly enable a Mac launchd worker for this local queue:

    npm run mission-control:quota:install-mac

The launchd worker runs once at registration and checks at 15-minute intervals while the operator is logged in. It checks exact local main/origin-main synchronization and tracked cleanliness; it handles at most 3 queued tasks per invocation. It does not pull GitHub, install dependencies, use cloud API credentials, self-merge code or remotely operate a vessel.

Monitor with npm run mission-control:quota -- status or GET /api/mission-control/quota-status (authenticated staff only, on the SAME execution host). The endpoint shows state counts, non-sensitive task metadata and the local request-budget indicator; it does not report actual remaining subscription tokens.

## Operational boundaries

- **Existing direct UI and engineering campaign invocations:** protected by the shared Codex quota circuit, but they are **not automatically enqueued**. The new local queue must be used when persistence/restartability is required. Migrating all legacy entry points to durable queue semantics requires separate compatibility work.
- **Offline lane:** OFFLINE_SCHEMA_CHECK can continue while quota is blocked. It validates registered inputs and source pins; it does not simulate an LLM or independently validate naval physics. Existing GitHub static/engineering tests remain separately runnable without model tokens.
- **Multi-host:** The ledger and queue are per host, not a distributed token coordinator. Do not run several independent hosts against one account expecting a global quota. Cross-host centralization requires an authenticated shared storage backend and its own security review.
- **Model availability:** GPT-6 Sol is requested for A26; provider identity is not cryptographically attested by this CLI. Quota recovery remains subject to actual provider access and account terms.
- **Blocked review:** No auto-approval endpoint is supplied; a qualified reviewer must inspect the receipt, numerical evidence and configuration before downstream engineering decisions. Safety-critical release continues through existing Director governance.
- **Rollout:** GitHub CI tests only zero-token behavior. Authenticated production Codex execution, macOS launchd installation, recovery drills and live UI telemetry still require evidence on the actual operator host; merging code alone is not live commissioning.

## Troubleshooting

- WAITING_FOR_QUOTA: inspect retryAfter and local budget. Do not increase budget solely to defeat a real provider limit.
- FAILED: inspect the bounded lastError; missing subscription login, unsupported model, schema or source revision conflicts are not quota events.
- BLOCKED_REVIEW with UNCERTAIN_INFLIGHT_RESULT: investigate locally before re-enqueueing a new task ID. No automatic replay.
- QUOTA_LEDGER_CORRUPT / QUEUE_STATE_CORRUPT: stop worker and recover state from a verified backup; never delete the ledger to bypass quota.
- Never store credentials, API keys, sensitive project data or director private keys in queue inputs.

## Evidence needed for operational sign-off

Exact merge SHA, passing zero-token tests, fresh Mac-side authenticated Codex execution, queue receipt (including requested model and output digest), simulated quota exhaustion / safe resume, independent technical review and human Project Lead release as appropriate.
