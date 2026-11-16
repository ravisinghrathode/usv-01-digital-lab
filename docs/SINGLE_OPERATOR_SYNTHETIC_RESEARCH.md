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

**Scope: the exact pinned synthetic catalog only**. The owner authorizes Codex
primary (requested GPT-6 Sol) and optionally permits a Google-account signed-in
Gemini CLI to receive **only** this fixed synthetic data. It does not authorize
restricted naval/customer transfers, a paid AI API, an actual vessel action or
human-independent engineering approval.

The owner launcher now displays a second **optional** authorization prompt:

`AUTHORIZE GEMINI SYNTHETIC TRANSFER`

Type it only if you have reviewed that Gemini CLI uses your intended Google
account's existing **OAuth session**, not an API key. Press Enter to remain
Codex-only. This is **operator attestation**, not automated authentication
proof. The secondary CLI must actually be installed and authenticated for
Gemini fallback to work; the exact requested model `gemini-4-hydrogen` must
appear in its model-usage metadata or that attempt fails closed. No silent
model downgrade is accepted.

The owner synthetic campaign raises the historically overconservative default
12 requests/6 hours to a **bounded local research ceiling of 1000 attempts
per 6-hour window**, shared on this host. Actual provider 429/usage errors
remain independently enforced. It never purges or overwrites the existing
persistent subscription ledgers. This is NOT a representation of available
ChatGPT/Gemini tokens. User-managed limits for other/production routes remain
unchanged.

For quota/transport errors, the model router attempts Gemini only after
explicit authorization. When both available subscription transports are
quota-blocked, the local campaign records `WAITING_FOR_SUBSCRIPTION_CAPACITY`
and periodically retries while the original owner Terminal stays active,
bounded by a 10-hour wait ceiling and a 12-hour process ceiling. Pending
agent checkpoints survive even when this session stops; an interrupted or
unknown in-flight attempt still requires owner acknowledgment before the next
session. Provider errors unrelated to capacity (safety refusal, invalid
response, missing mandatory calculation, missing Gemini authentication,
unknown model or incompatible JSON) are not bypassed with a mock or API key.

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

Type the original `RUN 26 SYNTHETIC AGENTS` owner phrase and, only after
confirming Google OAuth login, the new optional Gemini phrase. Only one
interactive owner launch is required for the resumed session. While running,
watch `data/codex-26-agent-checkpoint.json` or
`data/codex-26-agent-resume-progress.json` from another Terminal.

**Limitations:** A Terminal session that is killed, the Mac being off,
missing/unauthorized Gemini CLI, or both providers exceeding the bounded
wait can still interrupt progress. No unsafe service/daemon has been
installed to bypass the owner TTY authorization. Re-entry from its private
checkpoint remains available and does not replay completed successes.
