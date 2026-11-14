# A04 — Trusted Execution Host Verification Record

**Control ID:** USV-LAB-A04-HOST-001 · **Checked:** 14 November 2026 (IST) · **Stage:** A04 trusted execution host · **Disposition:** **ACTIVE — BLOCKED ON CURRENT HOST EVIDENCE**

**Source reference:** [`6623d0c5ddca1662751d8e3566ebf89ce0591f79`](https://github.com/ravisinghrathode/usv-01-digital-lab/commit/6623d0c5ddca1662751d8e3566ebf89ce0591f79); this is the source examined to prepare the record, not a runtime-host attestation. Revalidate at the source SHA actually checked out on the host.

> **Authorization boundary:** The Project Lead has granted ongoing sequential task progression through the 15-step recovery plan, removing the need to ask permission between ordinary *completed* tasks. This is **not** permission to bypass human engineering release, independent reviews, GitHub protection, credential provisioning, authenticated access rules, non-actuating safety limits, or paid-API restrictions. Do not proceed to A05 without A04 closure evidence.

## Evidence examined in source

| Control | Actual source implementation | Current proof status |
|---|---|---|
| Codex CLI executable and ChatGPT subscription login | [Mission Control preflight](../scripts/mission-control/preflight.ts) checks executable discovery and `codex login status` with provider credentials sanitized | **Historical only:** [14 Nov agent readiness](AGENT_READINESS_20261114.md) says a local Mac check passed on an earlier SHA. No new command invocation or current-host identity/receipt was available to this remote GitHub review |
| Repository revision and clean checkout | [GitRevisionGuard](../src/core/mission-control/GitRevisionGuard.ts) and [Codex subscription adapter](../src/core/mission-control/SubscriptionCliAdapter.ts) support pinning and clean-tree verification | **Unverified on current host:** a GitHub SHA is not evidence that its exact files are deployed to the execution Mac |
| Research-only permission and expense controls | [LabCommissioningPolicy](../src/core/mission-control/LabCommissioningPolicy.ts) requires `USV_SUBSCRIPTION_PILOT=enabled`, `AI_REVIEW_PROVIDER=codex_cli`, refuses paid API, actuator control and engineering baseline approval flags. [SubscriptionCliAdapter](../src/core/mission-control/SubscriptionCliAdapter.ts) strips provider API secrets before child processes | **Source implemented; no current execution receipt.** Never enable paid fallback or print credential values |
| Host resource and security boundary | [Mission Control deployment/pilot](MISSION_CONTROL_PILOT.md), [lab commissioning authority](LAB_COMMISSIONING_PROTOCOL.md), [host preflight](../scripts/mission-control/preflight.ts) | **Unverified on current host:** OS, user account, path permissions, tool binary version, network/sandbox restrictions, resource/time ceilings, storage, writable audit directory and source checkout isolation |
| Signed host-health statement | [`attest-codex-host.ts`](../scripts/mission-control/attest-codex-host.ts) requires 26 recent actual Codex role outputs matching the current SHA, a stable non-secret host ID and out-of-tree Ed25519 private key permissions | **Not an A04 prerequisite:** it is intentionally a post-live-campaign **A07** control. Requiring it for A04 would circularly depend on A06, so do not fabricate a host attestation now |
| Vessel and naval safety release | [Consolidated Acceptance Register](CONSOLIDATED_ACCEPTANCE_REGISTER.md) and [Master Project Register](MASTER_PROJECT_REGISTER.md) | **HOLD:** A04 is software-host readiness only; does not authenticate vessel design, field readiness or Director approval |

## A04 completion gates (all require current host observations)

- [x] Verify repository contains a subscription-Codex-only preflight, cleaned child environment, configurable research-only permission guard and Git revision guard. **Source-level evidence only.**
- [x] Define separation of A04 *pre-execution* host readiness from A07 *post-A06* signed 26-agent host health; avoid circular gate and never claim current operation from historical snapshots.
- [ ] On the **actual authorized execution host**, record non-secret OS/platform, UTC timestamp, stable non-secret host ID, Node/runtime versions and `codex --version`; capture exit status and hashes without exposing tokens or secrets.
- [ ] On that same host, verify `codex login status` indicates the approved ChatGPT subscription OAuth mode (not API-key mode); record **redacted** success/failure and command exit status; no model call required.
- [ ] Verify the checked-out Git HEAD, worktree cleanliness, immutable catalog/source SHA, correct repository ownership and file permissions; a repository read in ChatGPT is **not** a host checkout.
- [ ] Verify research-only flags and exclusion of paid API credentials from subprocesses; deny actuator, vessel-release and other safety-sensitive capabilities; record local sandbox, temp directory, timeouts and resource policy.
- [ ] Publish a signed/owner-attested **non-secret host readiness receipt** tied to the exact SHA in controlled storage (not the public GitHub repository if it reveals sensitive host topology); link only non-sensitive digest and signer/authority. Do not use the post-A06 host-health format falsely.
- [ ] Independent software operations review of receipt, check all above controls at the actual target host; update the Master Project Register to **A04 VERIFIED** via protected PR with exact-head and merged-main governance CI.

**Current technical blocker:** This source audit has GitHub repository access but **does not have an authenticated execution channel to the operator's Mac/Codex CLI host**. It cannot issue `codex login status` on that machine, verify its Git worktree or attest its resource/security boundary. The historical readiness note is from an older revision and does not satisfy the exact-source live-host gate. **A04 is not complete; A05 must not be promoted.** The scheduled Recovery Executor may recheck permitted integrations and continue the next step when the prerequisite becomes verifiable. Do not request the user to paste authentication tokens, key material or private host contents into chat.

## Non-interactive, safe verification sequence (operator/authorized host executor only)

```bash
# On the actual trusted host, using the intended clean and source-pinned checkout:
git rev-parse HEAD
git status --porcelain
node --version
npm --version
codex --version
codex login status  # no model inference or paid API call
# For repository-native subscription-only preflight:
AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled \
USV_ALLOW_PAID_AI_API=false USV_LAB_SCOPE=RESEARCH_ONLY \
npm run mission-control:preflight
```

Results must be checked and recorded in a trustworthy **redacted** receipt; displaying these commands is not evidence they ran. The existing preflight checks the provider executable and authentication, **not** every clean-Git/environment/resource control. A future source change may strengthen preflight/receipt generation, but it requires its own exact-head protected software approval; do not bypass gates with a mock success.

## Single-command offline A04 readiness probe (proposed software addition)

The project also provides a **proposed** `npm run mission-control:a04-check` preflight on this review branch. It is not authorized for use as a verified production gate until the protected software PR passes its required exact-head CI and human signoff. The probe consumes **no model tokens**, makes no paid API requests, does not invoke a vessel solver, and does not sign or release engineering.

Run only on the **actual authorized host**, after the host checkout is updated to the approved reviewed revision, and after the guarded software PR merges. For example:

```bash
git fetch origin main
# The HEAD checked out on the authorized host must match origin/main or the probe refuses readiness.
USV01_HOST_ID=usv01-mac \
AI_REVIEW_PROVIDER=codex_cli \
USV_SUBSCRIPTION_PILOT=enabled \
USV_ALLOW_PAID_AI_API=false \
USV_LAB_SCOPE=RESEARCH_ONLY \
npm run mission-control:a04-check -- --source-sha "$(git rev-parse origin/main)"
```

`usv01-mac` above is an **illustrative non-secret alias**, not an attested host identity. Use a stable, authorized host alias. The command verifies source HEAD, tracked worktree, repository identity, current operator ownership, a private writable temp file, actual Codex CLI version and ChatGPT subscription login status, and research-only/zero-paid-API policy. It captures resource telemetry for later human review. Auth-status text, hostnames, usernames, filesystem paths and credential values are **not** included in the JSON receipt.

The generated receipt is a private, gitignored `data/a04-host-readiness-*.json` file with mode `0600`, containing a SHA256 fingerprint and only redacted checks. **`PASS_UNATTESTED` does NOT close A04.** A qualified software operations reviewer must inspect the actual sandbox/network controls, source revision, capacity and permissions, then attest the exact receipt and authorize A04 closure through a separate protected status PR. Never paste private credentials or the complete host topology into public GitHub. If the preflight reports `BLOCKED`, keep A04 blocked and A05 unstarted.

**Repository runner inventory (connected GitHub owner account, 14 November 2026):** no registered self-hosted runner was present (`total_count=0`). This does not demonstrate that the local Mac is absent or disconnected; it means GitHub Actions does not currently provide an authenticated execution path to that specific host.

## Active risk and follow-up

| ID | Risk / action | Owner | Closure evidence |
|---|---|---|---|
| HOST-01 / BLOCKING | No verified current Git SHA on authorized local host, Codex CLI OAuth status or host sandbox proof | Platform/operations engineer, delegated to Recovery Executor when an authorized host interface is available | Current-SHA, timestamped, redacted real host receipt with review |
| HOST-02 / BLOCKING | No non-secret host receipt that binds identity, permissions, resource ceiling and runtime versions to source SHA | Platform/operations / Project Lead | Redacted receipt digest and independent software operations signoff |
| HOST-03 / FUTURE A07 | Current-revision 26 live Codex outputs and **post-campaign** signed health not available | Agent operations / A06–A07 | 26 actual responses and qualified evidence per [26-agent acceptance](USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md) |

**Automatic progression rule:** Check the earliest incomplete action regularly. Once all A04 closure conditions are genuinely met and recorded, advance directly to A05. If HOST-01 or HOST-02 persists, keep A04 BLOCKED/ACTIVE, log the exact missing evidence, and do not skip to A05 or declare lab/vessel readiness.
