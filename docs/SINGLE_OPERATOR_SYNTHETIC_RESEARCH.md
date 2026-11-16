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
