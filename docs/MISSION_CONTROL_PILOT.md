# USV-01 Mission Control — subscription-only orchestration

**Status:** bounded Codex subscription pilot implemented; live subscription authentication still requires one local Mac preflight.

## Purpose

Mission Control coordinates the existing **26 specialist agents** without replacing, renaming, merging, or weakening them.

- **OpenAI Codex CLI** — signed-in subscription client used for the logical orchestrator, specialist worker and review roles.
- **Review independence guard** — when worker and reviewer use the same Codex provider, the review is recorded as non-independent and the task stops at human review.
- **No paid API fallback** — Mission Control strips API/provider credentials before child execution.
- **Deterministic USV tools** — calculations and test evidence.
- **Existing human authority gate** — remains the only Project Lead / Engineering Director approval mechanism.

The existing `AgentRegistry`, `CentralOrchestrator`, engineering tools, dashboard, and governance code remain authoritative.

## Zero-paid-API policy

Paid AI API access is denied by default by `AiBillingPolicy.ts`.

```text
USV_ALLOW_PAID_AI_API=false
```

Merely having `GEMINI_API_KEY` or `OPENAI_API_KEY` in a shell does not authorize provider use. Mission Control additionally strips API/provider credential environment variables before invoking the local Codex CLI.

Governance CI is deterministic-only. It must not invoke Claude, Gemini, Codex, Gemini API, or OpenAI API.

## Local architecture

```text
Project Lead
    |
    v
MissionControlCoordinator
    |
    +--> Codex logical orchestrator (read-only sandbox)
    |       |
    |       v
    |   task plan
    |
    +--> existing A01-A26 specialist contract
    |       |
    |       +--> mandatory deterministic tools
    |       |
    |       +--> Codex logical worker (read-only sandbox)
    |
    +--> Codex logical reviewer (read-only sandbox)
            |
            +--> APPROVE -> READY_FOR_HUMAN_REVIEW when same provider
            +--> REQUEST_CHANGES -> bounded specialist rework
            +--> BLOCK -> task blocked

No AI result satisfies human approval.
```

## Durable state and recovery

`MissionControlStore` writes an atomic JSON state file containing task state, review cycles, commit SHA, and evidence manifest. A restart therefore preserves completed/pending task records instead of relying on chat history.

Default pilot path:

```text
data/mission_control_state.json
```

The file is runtime data and must not contain API keys, signing keys, or Project Lead credentials.

## Evidence manifest

Every successful review record contains:

- specialist ID and canonical A01-A26 ID;
- exact Git commit SHA;
- objective digest;
- orchestrator plan digest;
- deterministic tool inputs/outputs and verification state;
- specialist worker output digest;
- review decision, findings and whether the provider was actually independent;
- `humanApprovalSatisfied: false`.

This prevents a model role split from being mistaken for independent engineering review or Project Lead authorization.

## Docker

Docker is used for the deterministic lab runtime and CI validation, not for the signed-in AI CLIs.

```bash
docker compose config --quiet
docker compose build usv-lab
docker compose up -d usv-lab
```

The container:

- defaults to `AI_REVIEW_PROVIDER=deterministic`;
- sets `USV_ALLOW_PAID_AI_API=false`;
- disables the subscription pilot;
- drops Linux capabilities;
- runs with a read-only root filesystem;
- exposes the lab only on `127.0.0.1:3000`;
- persists `/app/data` in a named volume;
- never mounts the Docker socket.

The subscription CLIs remain on the host Mac so their desktop/account authentication is not copied into Docker.

## Local Mac preflight

Install Codex CLI and sign in using the intended ChatGPT subscription/account. Then, from the repository:

```bash
npm run mission-control:preflight
```

This checks that the `codex` executable is available for all three logical roles. It does not consume model usage or test authentication.

Authenticate Codex interactively once. Do not configure API keys for Mission Control.

Current supported non-interactive mechanisms used by the adapter:

```text
Orchestrator role:  codex exec --sandbox read-only ...
Worker role:        codex exec --sandbox read-only ...
Reviewer role:      codex exec --sandbox read-only ...
```

## Run the bounded pilot

Pin the exact Git commit before execution:

```bash
export USV_SUBSCRIPTION_PILOT=enabled
npm run mission-control:pilot -- \
  --commit "$(git rev-parse HEAD)" \
  --agent REQ-TRC-02 \
  --objective "Verify one bounded requirements-traceability package."
```

The initial pilot deliberately uses a non-safety-critical specialist with no mandatory numerical tool so that orchestration, specialist execution and review-state handling can be tested independently of missing vessel particulars.

After that succeeds, select a real engineering workstream. Any mandatory deterministic tool failure blocks the task before reviewer acceptance.

## Automated validation

```bash
npm run lint
npm run mission-control:test
npm run mission-control:docker:validate
```

The regression suite verifies:

1. all 26 specialist agents remain registered;
2. provider envelopes are parsed without trusting vendor-specific shapes;
3. a reviewer rejection routes work back to the specialist worker;
4. the correction cycle is bounded;
5. human approval is never inferred from AI review;
6. an unavailable Codex CLI fails closed;
7. paid AI APIs are denied unless explicitly opted in;
8. API/provider credentials are stripped from Mission Control child processes.

## Explicit boundaries

Mission Control must not:

- merge GitHub pull requests;
- sign ECRs;
- possess Project Lead private/signing credentials;
- execute vessel actuators, steering, throttle, or payload controls;
- turn a failed calculation into an approved result;
- invent missing vessel measurements, test evidence, standards applicability, or acceptance criteria;
- silently switch to an API key, provider billing, cloud credits, or pay-as-you-go service.

## Remaining local prerequisite

Repository implementation and deterministic CI can be completed remotely. The only unavoidable local prerequisite is **verifying that the user's Mac is signed into Codex CLI with the intended ChatGPT subscription/account**. That credential state cannot be created or verified from GitHub CI without either the user's interactive login or introducing machine/API credentials, which this design intentionally forbids.
