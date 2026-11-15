# USV-01 Agent Commissioning Runbook — 15 November 2026

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
4. A qualified software operations reviewer checks receipt, login type, clean revision, filesystem permissions, sandbox/network boundaries, resource limits and host identity. After the reviewer approves **this exact source SHA**, a repository owner sets the non-secret GitHub Actions repository variable `USV_A04_AUTHORIZED_SHA` to that complete 40-character SHA. Do not set it on the basis of an AI statement or CI alone.
5. Register a trusted isolated GitHub Actions self-hosted runner labelled `usv01-codex`, authorized to execute only reviewed `main`. Provision Codex CLI subscription login on this runner without exporting credentials or service tokens to the repository. Protect private host Ed25519 signing key outside checkout, with restrictive permissions; configure required non-secret verifier/trust-root variables.
6. Re-run `USV-01 26-Agent Authenticated ChatGPT Commissioning` with `mode=preflight`. It must fail closed when the synthetic catalog cannot satisfy mandatory deterministic inputs. Preserve the exact-SHA report as software readiness evidence.

## Phase 1 — authenticated bounded software campaign

1. For a smoke test, run the research-only A01/A02/A03/A25/A26 pilot with A15 critique. A production task must use an authorized controlled task catalog; synthetic samples are demonstration-only.
2. Dispatch the protected-main commissioning workflow in `live` mode. It checks the local A04 host, the SHA-pinned authorization variable, authenticated provider availability, dependency-aware 26-role execution and short-lived cryptographic host health.
3. The workflow enforces `--require-operational`: all 26 must have **actual** current-source Codex traces and a verifiable signed host receipt. It uploads the report including remaining independent review blockers. An operational pass **does not** mean independent engineering validation has passed.
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

**Rollback:** Stop new task admission. Disable the runner's ability to execute further research until reviewed. Revert deployed app to the previous accepted source SHA through protected-main governance, keep immutable existing traces read-only, rotate compromised credentials, and rerun A04/A05 before restoring service. Never force-push `main`, reuse old signed host health for a new SHA, or mark missing engineering evidence as approved.
