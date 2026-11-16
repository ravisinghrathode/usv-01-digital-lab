# USV-01 — single-operator synthetic research launch

**Status: PROPOSED ROUTE (requires protected CI and authorized human software merge).**
**Authority: local operator consent, NOT independent A04 host certification.**
**Scope: fixed synthetic 26-agent Codex subscription research, not vessel operation.**

This route lets the sole Project Director work with the 26 agent specialists
without engaging an external auditor merely to experiment with non-operational
synthetic reference cases. It is separate from `mission-control:private-commission`,
whose independently signed A04 host gate is retained for any future elevated
commissioning/assurance claim. This route neither forges nor bypasses the
independent-signer check in that command.

## Exactly what is allowed

- Run **only** `evidence/live-agents/representative-cases.json` from a clean
  protected `main` with classification `SYNTHETIC_TEST_ONLY_NON_OPERATIONAL`.
- Execute on a non-root, operator-owned, private interactive Mac terminal
  (not a GitHub Actions runner, CI, cloud automation or public fork).
- Require an actual current-source, last-24-hour `PASS_UNATTESTED` local
  A04 preflight receipt, exact source commit and stable host alias.
- Require deliberate console consent: `RUN 26 SYNTHETIC AGENTS`.
- Require ChatGPT/Codex subscription authentication, `RESEARCH_ONLY`,
  deterministic 26-agent tool/input checks and zero paid AI APIs.
- Capture authentic model-run progress and reports **locally** under the
  existing private `data/` and `governance/reports/` paths.
- Keep Gemini automated transfer denied. Hydrogen High and Argon High
  selected interactively in Antigravity do not make automated third-party
  invocation permissible or account entitlement verified for `gemini` CLI.

## What is NOT claimed or allowed

- **NOT** A04 independently reviewed, A06/A07 independently certified,
  a successful 26/26 campaign unless real model traces actually show it,
  an approved naval design, baseline, manufacture, actuator command,
  certification, or sea-trial release.
- **NO** arbitrary catalog path or user-supplied prompt for this route:
  changing the catalog requires a protected software review.
- **NO** unapproved restricted Navy/client inputs to a public code repository,
  ChatGPT subscription or Gemini account.
- **NO** fake signatures, automatic escalation to full commissioning,
  model quota evasion, payment API, or extra external reviewer.
- Formal independent engineering verification remains required for
  engineering conclusions needing certification or vessel release.

## Operator workflow after this PR is merged

The protected merge produces a **new** `main` SHA. Prior A04 receipts from
older source SHA(s), even passing ones, cannot be reused.

1. Operator updates only a clean local checkout: `git fetch origin main`,
   `git pull --ff-only origin main`, and confirms `git status --short` empty.
2. Set the existing stable nonsecret alias and no-paid, research-only flags
   locally. Example for this Mac:

   ```sh
   export USV01_HOST_ID=usv01-ravi-macbook-pro
   export USV_SUBSCRIPTION_PILOT=enabled
   export AI_REVIEW_PROVIDER=codex_cli
   export USV_LAB_SCOPE=RESEARCH_ONLY
   export USV_ALLOW_PAID_AI_API=false
   export USV_DUAL_PROVIDER_ROUTING=enabled
   ```

3. Re-run `npm run mission-control:a04-check -- --source-sha "$(git rev-parse HEAD)"`
   to create a fresh **private** preflight receipt. The status will say
   `PASS_UNATTESTED`, accurately. Never claim that it means independently
   certified A04.
4. Preview without a model call:
   `npm run mission-control:owner-research -- --plan`.
5. Only if satisfied the Mac is privately controlled, no vessel hardware
   is connected, and the catalog really contains only synthetic public-safe
   examples, explicitly start the research:
   `npm run mission-control:owner-research -- --execute`.
   It prompts for `RUN 26 SYNTHETIC AGENTS` and runs the existing Codex
   deterministic preflight before any model calls. This consumes ChatGPT
   subscription allowance and can stop early on quota or model failure.
6. Examine the private `data/codex-26-agent-progress.json` and
   `data/codex-26-agent-matrix.json`; the latter must include 26 real
   provider traces before **any** claim of all-agent execution.
   No signed host receipt or full-26 operational acceptance is produced by
   this owner research route. Independent engineering review is still HOLD.

If anything fails, keep that particular step and all downstream work at HOLD,
correct the blocker, and rerun only within the intended research limits.

## Governance

The existing independently signed route remains unchanged, including
`USV_A04_AUTHORIZED_SHA`, reviewer trust root and post-campaign host receipt
requirements. This additional owner-only synthetic path requires its own
protected-source CI and a genuine authorized software-governance review or
repository-admin acceptance; an AI does not grant approval to merge or
authorize vessel engineering. No change to the public GitHub Actions live
runner prohibition is made.

External auditor procurement issue #163 was closed **not planned** by user
direction. Its existence and closure do not constitute A04 host approval.


## Interrupted campaign recovery — 2026-11-17

The original attempt saved **two successful, uncertified** model entries in the
private legacy file `data/codex-26-agent-progress.json`, then stopped without
the final matrix. The old runner recorded completed output hashes but **not**
full response text and did not write an in-flight marker. The actual reason the
Mac process stopped has **not yet been established**. Four ChatGPT desktop /
Codex processes alone do not prove the agent runner was active.

**Never delete, rename or upload the old local journal.** It is retained as
the original source-bound record. The new checkpoint is a separate
`data/codex-26-agent-checkpoint.json` file with a private lock at
`data/codex-26-agent-checkpoint.lock`; both must remain outside public Git.

**After this fix is merged**, the Mac must update its checkout and run a new
`mission-control:a04-check` against the *new* protected main SHA. The
old two Codex calls happened on
`ba4a33a88119cb9f6833b526f16c55fed72cbedc`. Because this repair
changes the source SHA, they are carried forward only as
`HISTORICAL_LIVE_PROVIDER_EXECUTED_UNCERTIFIED` (not falsely counted as
current-source agent executions). Their original output hashes remain in the
journal and are used in an explicitly **digest-only unverified advisory
handoff**. The missing old free-text output is **not fabricated**.

Use the operator-local interactive recovery command:

```sh
cd ~/usv-01-digital-lab
git status --short                       # inspect untracked items before pull
git pull --ff-only origin main
export USV01_HOST_ID=usv01-ravi-macbook-pro
export USV_SUBSCRIPTION_PILOT=enabled
export AI_REVIEW_PROVIDER=codex_cli
export USV_LAB_SCOPE=RESEARCH_ONLY
export USV_ALLOW_PAID_AI_API=false
export USV_DUAL_PROVIDER_ROUTING=enabled
npm run mission-control:a04-check -- --source-sha "$(git rev-parse HEAD)"
npm run mission-control:owner-research -- --resume --ack-uncertain
```

The interactive confirmation is still required. `--ack-uncertain`
acknowledges that the old journal **cannot prove whether A03 was already
attempted** before the crash. Hence an A03 retry could consume one duplicate
model call. The known successful A01 and A02 entries will **not** be replayed.

New checkpoints record a `pending` marker *before* each model call, persist
the bounded advisory after success, validate agent order, task IDs, tool
receipts, source SHA, catalog SHA and classification, and use exclusive local
locking. A subsequent interrupted attempt requires another deliberate
`--resume --ack-uncertain` authorization; automatic retry of ambiguous
calls is denied. Do not delete a potentially active lock.

Read the newly written local-only
`data/codex-26-agent-resume-progress.json` and
`data/codex-26-agent-matrix.json` for new results. The completion report
separately shows `liveProviderRuns` (current SHA) and
`historicalProviderRuns` (old SHA). Mixed-source evidence is useful as
**research continuation**, not a same-SHA **26/26 operational acceptance** or
an independently certified vessel design. For exact-source 26/26, all 26
authentic traces must eventually run under one reviewed source.

This recovery path does not establish physical host isolation, authorize
Gemini transfer, relax the no-paid-API limit, or issue engineering acceptance.
If the old legacy file is malformed, from a non-ancestor SHA, or uses a
different catalog hash, the system refuses recovery rather than replaying or
inventing evidence.


## Continuous Codex → Gemini execution (2026-11-17)

**Scope: only the exact source-pinned, non-operational synthetic catalog.**
The owner authorizes one research session; source-reviewed code then selects
**signed-in Codex first**, **Google personal-OAuth Gemini CLI automatically**
after eligible Codex quota/auth/model/transport failures. No provider-selection
prompt is shown. The initial `RUN 26 SYNTHETIC AGENTS` confirmation still
authorizes the owner research *run*, not the provider. Existing user consent
to automatic synthetic-only failover is implemented as source-bound policy,
not as an unverified claim that Google's CLI is logged in.

The secondary CLI must actually be installed, signed into the intended Google
account and able to use the exact required `gemini-4-hydrogen` model; model
metadata must verify Hydrogen execution. The CLI is forced to
`oauth-personal` authentication using its isolated system settings, and
the spawned environment excludes billable API keys. A Gemini sign-in may still
require one-time setup outside the automated model selection. No restricted
naval/customer data, engineering approval, signed release or vessel actuator
control is authorized, regardless of provider availability.

The owner synthetic campaign raises the historically overconservative default
12 requests/6 hours to a **bounded local research ceiling of 1000 attempts
per 6-hour window**, shared on this host. Actual provider 429/usage errors
remain independently enforced. It never purges or overwrites the existing
persistent subscription ledgers. This is NOT a representation of available
ChatGPT/Gemini tokens. User-managed limits for other/production routes remain
unchanged.

When Codex reports an eligible transient failure, the router attempts Gemini
automatically and records the actual provider/model in the source-bound journal.
If Gemini is missing, temporarily unauthenticated, rate-limited or a known
transport failure occurs, the campaign records
`WAITING_FOR_SUBSCRIPTION_CAPACITY` and retries Codex first on its next
backoff cycle. While the authorized Terminal stays open, there is no preset
10-hour provider-wait cutoff or 12-hour parent-process timeout. Retry
intervals remain bounded and persistent provider quota ledgers remain
enforced. No model tokens are spent while the local quota circuit is blocked.

No automatic recovery may fabricate evidence or bypass a model safety refusal,
invalid JSON/schema, unverified Gemini model identity, failed deterministic
calculation or human engineering approval. These remain genuine safety stops.
If the Mac powers down, Terminal is killed or login credentials need new
interactive authentication, the campaign cannot guarantee uninterrupted
execution; it preserves its private checkpoint for an explicit owner restart.

**No previous results are lost on the code-update commit.** The existing
checkpoint is migrated only if the previous exact SHA is a Git ancestor, the
catalog hash and classification remain identical and old agent evidence
passes strict validation. Before converting the old checkpoint to the new
source SHA, a private, mode-0600 original-source snapshot is retained at
`data/codex-26-agent-checkpoint-source-<oldSHA>.json`. The original
A01/A02 and new A03–A09 results are marked *historical*, with their
original SHA provenance preserved; neither is rerun merely because the
software changed. The old failed A10 pending marker is never claimed as a
success. In the new source, roles from A10 onward are new model attempts
whose actual Codex/Gemini provider and model are included in the journal.

Run after merging, updating Mac `main` and generating a fresh local A04
`PASS_UNATTESTED` preflight:

```sh
npm run mission-control:owner-research -- --resume --ack-uncertain
```

Type only `RUN 26 SYNTHETIC AGENTS` to authorize the pinned synthetic
research session. **No Codex/Gemini selection is requested.** The runner
first uses Codex; upon an eligible failure it attempts the existing OAuth-only
Gemini CLI automatically. Check progress in a second Terminal with the
read-only `npm run mission-control:campaign-status` command. Do not start
an overlapping campaign or pull a new repository commit while it is running.

## Phase 2: read-only reconciliation and Agent Academy handoff

The currently running Mac campaign is pinned to its own source SHA. **Do not pull
a new software commit, switch its branch, kill its Terminal, run another
`--execute` session, or start an overlapping Academy study while that process
is executing.** A GitHub PR prepared during the run does not modify the Mac.

After this read-only status change is merged and the running process has
**finished**, the owner can update a clean checkout and inspect the preserved
checkpoint with:

```sh
npm run mission-control:campaign-status
```

The command consumes **zero** AI model tokens and **does not write to disk**.
It verifies checkpoint structure and role order against the 26-role registry,
the exact pinned synthetic catalog SHA-256, source ancestry, mandatory tool
traces, per-agent output digests, historical SHA attribution, provider identity,
and the outstanding possibly in-flight attempt. It reports historical, Codex
and Gemini counts separately.

A result of `RESEARCH_TRACES_RECORDED_UNCERTIFIED` means 26 authentic,
locally journaled **synthetic research traces** were structurally observed.
If any are historical from older source commits,
`exactSource26of26=false` even when all 26 have records. It is not a
current-SHA commissioning certificate, independent engineering validation or
Academy study/qualification evidence.

If the runner terminated with a pending attempt, inspect its original Terminal
and private interruption report before another explicit
`npm run mission-control:owner-research -- --resume --ack-uncertain` session.
A `pendingAttempt` marker by itself does NOT prove the process is still live.

The follow-on Academy workflow is separate:

```sh
npm run academy:plan
npm run academy:status
```

These are zero-model curriculum/status commands, and **do not constitute
training**. Genuine role-specific open-book study uses the separately
authorized `npm run academy:study -- --agents A05,A06,A07,A14,A17` command;
it should not compete with the live campaign for account quota. Study
receipts remain **UNGRADED**. Independent held-out examination, correct
tool calculations, validated source editions/rights, and two distinct
trusted human signers are required before `QUALIFIED_SUPERVISED_RESEARCH_ONLY`
can be claimed. None of this authorizes vessel design release or hardware
control.

## A23 full-evidence Codex prompt bound — local owner recovery

A23 independent Red Team was stopped at a source-pinned checkpoint after
22 recorded successes: the exact Codex CLI prompt contained **25,836**
characters after lossless compaction, but the previous in-process and
subscription-adapter bounds were both **24,000**. This was **not** a quota
failure, and no attempt to route invalid input to Gemini is authorized.

The shared bounded Codex subscription CLI input maximum is now **48,000
characters**, enforced both before CLI invocation in `CodexCliProvider`
and independently in `validatePilotRequest`. This is a **finite safety and
resource limit**, not a disabled check. The original system instructions,
synthetic physical inputs, exact mission context, six A23 upstream advisory
receipts (including original hashes/TBDs), full deterministic tool evidence,
and output-schema safeguards remain unchanged. Actual model usage, accuracy,
engineering acceptance and quota are not inferred from prompt length.

After the protected fix merges, and only when **no existing campaign runner
is active**, the owner should update the exact `main` checkout and rerun a
fresh current-SHA A04 `PASS_UNATTESTED` preflight, then authorize the
existing `mission-control:owner-research -- --resume --ack-uncertain`
launcher. Existing A01–A22 successes are retained as **historical** under
their original source revisions; the uncompleted A23 may be retried, then
A24–A26. No previous successful model call needs to be repeated.
If any input truly exceeds 48,000 characters, the model still **fails closed**
and reports only component lengths, never raw sensitive text. This is
not permission to truncate evidence or invoke a paid API.

## Automatic provider continuity, replacing the legacy per-run Gemini prompt

The former optional Gemini prompt and misleading
`USV_GEMINI_TRANSFER_BLOCKED` error are obsolete for the approved synthetic
owner campaign. The source-verified launch now derives the automatic
synthetic-only provider transfer from its exact catalog classification and
SHA-256. Any inherited shell transfer flags are rejected before derivation.
Other data classifications are not transferable by this automatic route.

An actual Codex quota hold or recoverable transport/auth/model failure triggers
automatic Gemini CLI routing. A missing Gemini CLI or known transient OAuth,
network or provider quota problem enters the persistent owner-session
retry/backoff loop, not an immediate campaign termination. The original error
code is preserved when the transfer policy is not authorized. A nontransient
safety, data integrity or model-provenance failure remains fail closed. No
paid API keys or output fabrication are used; recorded research is uncertified.
