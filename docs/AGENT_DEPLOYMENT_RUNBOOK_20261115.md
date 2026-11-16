# USV-01 Agent Commissioning Runbook — 15 November 2026

## CRITICAL: public GitHub repository — private local execution only

Live GitHub Actions jobs in this **public and forkable** repository must never
run a ChatGPT/Gemini subscription session or Ed25519 host private key.
GitHub explicitly warns that PR workflows from public forks can compromise
self-hosted runners. Consequently, the `live` dispatch now fails closed on a
credential-free GitHub-hosted runner. **DO NOT REGISTER `usv01-codex` ON THIS
PUBLIC REPOSITORY.** See https://docs.github.com/en/actions/reference/security/secure-use.

Use a dedicated, authorized operator-owned local Mac host (not a GitHub Actions
runner) and a clean exact-source checkout with an up-to-date
`refs/remotes/origin/main` reference matching the independently reviewed SHA. After an independent A04 host review,
the operator sets `USV_A04_AUTHORIZED_SHA` to the exact approved 40-character
source commit and a stable nonsecret `USV01_HOST_ID`. No key or ChatGPT/Google
cached session leaves the machine. The runner fails closed if invoked under
GitHub Actions or CI.


### Independent A04 review signature — required before live model execution

**Do not self-authorize by setting `USV_A04_AUTHORIZED_SHA` from `git rev-parse HEAD`.**
A `PASS_UNATTESTED` host probe is a genuine zero-model technical observation, not
the independent software-operations decision. The live supervisor now requires
a separate reviewer-signed Ed25519 approval over the **exact source SHA, stable
host alias, reviewed preflight receipt bytes and catalog bytes** before any live
Codex call. This proposed protected change requires CI and authorized merge;
after merger, the Mac must re-run A04 against the **new** source SHA.

A qualified **independent human reviewer** must first examine the controlled
local A04 receipt, host isolation, OAuth subscription sign-in, resource limits,
source/worktree provenance, classification, transfer boundaries, scope and
mission permissions. They must independently authenticate the reviewer public
key from the approved organizational trust registry. A signature from an
operator-controlled/self-selected key does NOT establish independent approval.

On that exact reviewed clean commit, the operator retains the latest
`data/a04-host-readiness-*.json` evidence privately. The independent reviewer
signs a JSON decision with schema `USV-A04-INDEPENDENT-REVIEW-1`, containing
**exactly**:

- `schema`, `approvalId`, `sourceSha`, `hostAliasSha256`
- `reviewedReceiptSha256`, `catalogSha256`, `catalogClassification`
- `authorization` = `NON_ACTUATING_RESEARCH_ONLY`
- `reviewerIdentity`, `reviewerOrganization`, `issuedAtUtc`, `expiresAtUtc`
- `decision` = `APPROVED` or `HOLD`; `signatureBase64`

Generate the canonical UTF-8 signature payload with
`canonicalA04Approval(record)` in
`src/core/mission-control/A04IndependentApproval.ts`; sign those bytes using
the reviewer's externally protected Ed25519 private key, never on a public CI
runner. Digests are lowercase SHA-256 hex without a prefix. The host-alias
digest is SHA-256 of the stable nonsecret `USV01_HOST_ID`. Receipt/catalog
digests cover the exact raw file bytes. The approval expires within seven
days and is valid **only** for the reviewed SHA, host and catalog.
A blank/forged/expired/HOLD or mismatched approval is rejected.

After that actual independent authorization, in the same private Mac shell:

```sh
# Supply actual independent-review and trust registry paths, not placeholders:
export USV_A04_REVIEWED_RECEIPT_FILE='/absolute/repo/data/a04-host-readiness-<reviewed>.json'
export USV_A04_REVIEW_DECISION_FILE='/private-outside-git/independent-a04-approval.json'
export USV_A04_TRUSTED_REVIEWER_PUBLIC_KEY_FILE='/private-outside-git/trusted-reviewer-public.pem'
export USV_A04_AUTHORIZED_SHA='<exact-human-reviewed-protected-main-40-char-sha>'
```

The signed decision and trust-root files must be regular, non-symlink,
non-group-writable files **outside the public checkout**; the receipt must
stay private under `data/`. Trust-anchor authenticity is a separate human/
organizational check; merely selecting a public-key path does not establish
reviewer identity. The host's later self-signed runtime health receipt
cannot substitute for this **pre-run independent review**. This authorizes
bounded non-actuating research only, never a vessel baseline, hardware,
production deployment or engineering release.

Gemini Hydrogen High and Argon High visible inside **Antigravity** are
interactive account/model selections, not proof that this project's separate
`gemini` adapter can authenticate or automatically wrap the consumer CLI.
Keep automated Gemini transfer **DENIED** unless provider use, permissions
and each public/non-sensitive data transfer have been independently cleared.
The strict operational 26-agent acceptance is presently **Codex-only**.

### Safe operator-local entrypoint (never execute from GitHub Actions)

On the approved Mac only, first fetch and check out `main`, install Node 22 and `npm ci`, and verify Codex subscription sign-in. Do **not** set the A04 authorization before the independent A04 review.

```sh
cd /path/to/usv-01-digital-lab
git fetch origin main
git checkout main
git pull --ff-only
npm ci
codex login status

export USV_SUBSCRIPTION_PILOT=enabled
export AI_REVIEW_PROVIDER=codex_cli
export USV_ALLOW_PAID_AI_API=false
export USV_LAB_SCOPE=RESEARCH_ONLY
export USV_DUAL_PROVIDER_ROUTING=enabled
export USV01_HOST_ID='your-reviewed-nonsecret-host-alias'

npm run mission-control:a04-check -- --source-sha "$(git rev-parse HEAD)"
npm run mission-control:private-commission -- --plan
```

Review `data/a04-host-readiness-*.json` **locally**; a `PASS_UNATTESTED` finding is not approval. A qualified independent operator must verify source/host isolation, restricted data boundaries, hardware resource adequacy and the exact commit. Store that review outside public GitHub. **Only after authenticated approval**, in the same private shell, set `USV_A04_AUTHORIZED_SHA` to the approved commit (not an arbitrary current HEAD); provision `USV_HOST_ATTESTATION_PRIVATE_KEY_FILE` outside the repository with mode 0600/0400 and the separately trusted `USV_HOST_ATTESTATION_PUBLIC_KEY`.

```sh
# These must already have been independently approved/provisioned:
export USV_A04_AUTHORIZED_SHA='<independently-reviewed-40-character-main-sha>'
export USV_HOST_ATTESTATION_PRIVATE_KEY_FILE='<outside-repo-private-key-path>'
export USV_HOST_ATTESTATION_PUBLIC_KEY='<trusted-public-key-PEM>'

test "$(git rev-parse HEAD)" = "$USV_A04_AUTHORIZED_SHA" || exit 1
npm run mission-control:private-commission -- \
  --source-sha "$USV_A04_AUTHORIZED_SHA" \
  --catalog evidence/live-agents/representative-cases.json --execute
```

The above example demonstrates **synthetic operational commissioning only** if all real authenticated checks pass. A real controlled catalog needs separately approved access, evidence and human review. Gemini transfer defaults to **DENY**; only independently authorized public/non-sensitive inputs may be routed to it. This commissioning gate currently requires all 26 authenticated **Codex** traces for its operational attestation, so a Gemini fallback attempt is **not** by itself a pass of the Codex-only gate.

The illustrative catalog is **synthetic/non-operational**; do not mistake a
successful provider attempt for a controlled real Navy hull candidate. Gemini
fallback stays disabled absent explicit independent OAuth and public-data
approval. The resulting local host-health signature proves only the holder of
the host key signed the record; independent ops review is a separate authority.
Do not upload controlled inputs, signing keys, subscription sessions, or
uncensored provider outputs to public GitHub.

The historical self-hosted-runner instructions lower in this document were
superseded by this security correction. Public GitHub Actions are retained
only for zero-model readiness and deterministic CI.


**Authority:** research-only, non-actuating software commissioning. This runbook does not adopt the proposed operating charter, certify vessel engineering, or authorize an operational vessel.

**Canonical source:** `ravisinghrathode/usv-01-digital-lab`, protected `main`. **Canonical runtime:** authenticated Codex CLI on an isolated, authorized execution host. **Presentation:** existing Engineering Sessions at `/`, with governed engineering records and role-controlled APIs; example tour is explicitly synthetic. Google AI Studio source sync is a separate deployment.

## Execution status at creation

- A manual GitHub-hosted, zero-model preflight was completed successfully at source `a6db5bee11099c2cac21802cc0be4652f6acee09`, [run 43718076341](https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/43718076341). The live job was skipped.
- GitHub's repository runner inventory returned **zero self-hosted runners** on 15 November 2026. There is no verified `usv01-codex` execution runner.
- The previous A04 host note records no independently accepted current-source host attestation. No current 26/26 authenticated model campaign or qualified engineering acceptance is claimed.
- After this software change merges, the preflight must be repeated on the **new exact main SHA**. Do not reuse the prior result as current evidence.

## Phase 0 — source and local host

1. Use a clean approved `main` checkout matching the GitHub remote, Node 22, `npm ci`, and a dedicated, non-privileged operator account. Never run unreviewed PR code on a runner holding ChatGPT login or signing keys.
2. Set `AI_REVIEW_PROVIDER=codex_cli`, `USV_SUBSCRIPTION_PILOT=enabled`, `USV_ALLOW_PAID_AI_API=false`, `USV_LAB_SCOPE=RESEARCH_ONLY`, and a stable non-secret `USV01_HOST_ID`.
3. Verify the actual `codex login status` is operator-authenticated ChatGPT mode. Run `npm run mission-control:a04-check -- --source-sha "$(git rev-parse HEAD)"`. The private `data/a04-host-readiness-*.json` receipt is **PASS_UNATTESTED** at best and never sufficient for A04 closure.
4. A qualified software operations reviewer checks receipt, login type, clean revision, filesystem permissions, sandbox/network boundaries, resource limits and host identity. After the reviewer approves **this exact source SHA**, the authorized Mac operator records the approval outside the public repository and exports `USV_A04_AUTHORIZED_SHA` **in the private host environment** for `mission-control:private-commission`. A GitHub Actions repository variable does not authorize this local process and must not be treated as a substitute for signed human review. Do not set it on the basis of an AI statement or CI alone.
5. **Do not register any subscription or signing-key-bearing self-hosted GitHub runner for this public repository.** Provision an isolated, independently reviewed operator-local Mac with ChatGPT/Codex CLI login and (when explicitly public-data approved) Google/Gemini CLI login outside GitHub. Keep host signing keys in private protected local storage, and validate exact A04 SHA authorization before enabling local live execution.
6. Re-run `USV-01 26-Agent Authenticated ChatGPT Commissioning` with `mode=preflight`. It must fail closed when the synthetic catalog cannot satisfy mandatory deterministic inputs. Preserve the exact-SHA report as software readiness evidence.

## Phase 1 — authenticated bounded software campaign

1. For a smoke test, run the research-only A01/A02/A03/A25/A26 pilot with A15 critique. A production task must use an authorized controlled task catalog; synthetic samples are demonstration-only.
2. Invoke `npm run mission-control:private-commission -- --source-sha "$SOURCE_SHA" --catalog "$CATALOG_PATH" --execute` **on the independently approved local host**, never from public GitHub Actions. The local supervisor checks the reviewed SHA, research-only flags, exact source checkout, controlled catalog, authenticated provider availability, dependency-aware 26-role execution and short-lived host signing.
3. The local process enforces `--require-operational`: all 26 must have **actual** current-source Codex traces and a verifiable signed host receipt. It writes local `data/` and `governance/reports/` evidence; **do not upload** these or their controlled inputs/outputs to the public repository. An operational pass **does not** mean independent engineering validation has passed.
4. After a successful live campaign, qualified independent reviewers sign actual source-referenced outputs using separate keys. `npm run acceptance:full-26 -- --require-all` is the later, strictly stronger multi-gate engineering campaign assessment and is **not** silently passed by operational commissioning.

## Phase 2 — UI and digital thread

- Confirm deployed Engineering Sessions and Google AI Studio application each match the approved GitHub source SHA; run `npm run test:aistudio-startup` and all 24 module smoke checks. Source-only GitHub pushes do **not** redeploy Google AI Studio.
- Bind authenticated task lifecycle, input SHA, dataset revision, model run IDs, tool receipts and review status to the existing server APIs, preserving RBAC and refusal of anonymous project reads/writes.
- Validate approved Google Drive read/write/hash/conflict/revocation and Obsidian vault synchronization against controlled non-sensitive test data; never publish confidential Navy/client data to this public repository.
- Verify queue restart, idempotent replay, retries, quota handling, protected log storage, monitoring and controlled rollback to last known-good SHA.

## Phase 3 — controlled engineering

- Distinguish competing USV hull concepts; do not silently choose between unapproved Rev 0.4 and the separate lightweight candidate.
- Supply actual controlled CONOPS, geometry/offsets, mass/CG, load cases, propulsion and electrical inputs and standards applicability. Unknowns remain TBD and prevent affected numeric baselines.
- Run A05/A09/A06/A07 first on a single controlled candidate. Extend to structural, mechanical, autonomy and marine-systems specialists only with adequate source evidence and independently checked solver accuracy.
- Obtain independent reference results and qualified review before baseline promotion; SIL/HIL/sea-trial evidence and Director signature remain distinct later safety/release gates.

## Acceptance and rollback

| Gate | Evidence | Acceptance boundary |
| --- | --- | --- |
| A04 | private exact-SHA receipt + qualified operations sign-off | host approved for bounded research only |
| A05 | 26/26 valid, deterministic preflight, zero blocked mandatory tools | ready to attempt model execution |
| A06/A07 | 26 authentic same-SHA agent traces, provider identities, required tool evidence + signed fresh host health | software operational on current infrastructure only |
| Independent V&V | signed separate reviewers and source-hashed numeric/qualitative references | role-specific engineering confidence, never automatic vessel release |
| Deployment | authenticated live application SHA, 24-module smoke, persistence/restore, access controls and monitoring | live lab software verified |

**Rollback:** Stop new task admission. Disable the private local host's ability to execute further research until reviewed. Revert deployed app to the previous accepted source SHA through protected-main governance, keep immutable existing traces read-only, rotate compromised credentials, and rerun A04/A05 before restoring service. Never force-push `main`, reuse old signed host health for a new SHA, or mark missing engineering evidence as approved.
