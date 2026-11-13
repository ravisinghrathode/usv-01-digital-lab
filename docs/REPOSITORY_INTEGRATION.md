# USV-01 Repository Integration Pipeline (proposed protected-software change)

## Scope and status

The **Repository Scout** discovers tools; this **Repository Integration Pipeline** supports read-only pinned source intake, static manifest inspection, isolated reference-case execution, and drafting a review-only integration proposal. Both are supporting services under A26 coordination, **not additional roles in the canonical 26-agent engineering swarm**. They do not command any vessel, run weapon/payload features, change safety logic, approve vessel baselines or register tools into the agent registry.

**Important operational boundary:** The pipeline cannot generically transform any GitHub project into a usable marine tool without an explicit JSON-in/JSON-out adapter, a pinned compatible execution image, domain-specific reference cases, security/license review and a protected software PR for any required runtime wiring. Automated discovery scores are not qualification. This pipeline is an end-to-end *candidate qualification and integration-proposal workflow*, **not automatic installation into production**.

## Phases and commands

Requires Node.js >=20 and Git (for source staging). Docker is **only** required to execute explicitly requested reference cases on a **dedicated, disposable evaluation host**. Do not run untrusted candidates on a workstation containing project credentials or connected vessel controls. Docker hardening is defence in depth, not an assurance against container escape; for serious untrusted software use an additional ephemeral VM isolation boundary. GitHub's integration workflow intentionally never runs foreign project code.

1. **Discovery (automated weekly, read-only)** — run `node scripts/repository-scout.mjs` to generate a ranked candidate queue.
2. **Candidate specification (reviewed)** — add a deliberate source-commit-pinned JSON manifest under `references/third-party-candidates/<id>.json`, with purpose, assigned agents, digest-pinned evaluation image, command adapter and **independently selected expected reference results**. A26 coordinates; A05–A24 as applicable specify requirements. A15/A23 must not be replaced by the candidate's own test results.
3. **Intake (no code execution):** `node scripts/repository-integration.mjs intake --spec <manifest.json> --out-dir /tmp/usv01-eval`; checks public repository and exact commit/tree through GitHub API, records advisory license metadata.
4. **Stage (no code execution):** `node scripts/repository-integration.mjs stage --spec <manifest.json> --out-dir /tmp/usv01-eval`; fetches only exact Git commit without submodules, rejects symlinks/special files, caps source size and file count, records Git tree and manifest SHA256 hashes. Staging does not run `npm install`, `pip install`, hooks, upstream CI or source scripts.
5. **Benchmarks (optional operator-triggered, isolated):** `node scripts/repository-integration.mjs verify --spec <manifest.json> --out-dir /tmp/usv01-eval --execute --acknowledge-third-party-risk`. Requires an already-provisioned image pinned by SHA256, no network, read-only candidate mount, nonroot/no capabilities/no-new-privileges, memory/CPU/PID and timeout limits. Feeds JSON to stdin and expects one JSON object on stdout per reference case. Failures are recorded. This is *software smoke and reproducibility evidence only*; it is not independent validation of physics and has not been demonstrated against an external marine solver in CI.
6. **Proposal:** `node scripts/repository-integration.mjs propose --spec <manifest.json> --out-dir /tmp/usv01-eval`; emits `proposal.json` and `REVIEW.md` with source pin, test status and mandatory review tasks. **No registry modification or auto-merge**.
7. **Acceptance (existing source governance, human-controlled):** A20 reviews source/dependency/image security, SBOM and vulnerabilities; a human reviews license compatibility; A21 checks interfaces; A15/A23 independently critique; A18/A24 assess numerical evidence; an independently approved exact-head PR adds the permitted tool adapter to the lab. Vessel baselines need their separate Engineering Director Gate E and physical/numerical evidence. Neither a successful build nor acceptance of a software PR certifies a USV design.

## Example candidate manifest structure

Values below are illustrative **placeholders**; replace the pin, image and reference data with real independently reviewed values before intake. The example must not be used as engineering evidence.

```json
{
  "schemaVersion": 1,
  "id": "marine-analysis-example",
  "repository": "owner/repository",
  "commit": "0000000000000000000000000000000000000000",
  "toolId": "TOOL-EXT-MARINE-EXAMPLE",
  "purpose": "Evaluate a read-only candidate marine analysis algorithm against known reference cases",
  "agents": ["A07", "A15", "A23", "A24"],
  "runner": {
    "image": "example/engineering-runner@sha256:0000000000000000000000000000000000000000000000000000000000000000",
    "argv": ["python3", "/candidate/usv01_json_adapter.py"]
  },
  "cases": [
    {"id": "reference-one", "input": {"case": "independent-test-01"}, "expected": {"value": 1}, "absoluteTolerance": {"value": 0.01}}
  ]
}
```

The adapter must exist at the checked-out commit or be added as separately reviewed trusted adapter code to a pinned evaluation image. A repo README alone does not establish a runnable JSON interface; if absent, candidate remains **ADAPTER REQUIRED**. Never let the candidate determine its own expected reference outputs. File outputs and CLI stderr are not treated as engineering truth. Schema/units/coordinate frames must be recorded by the integrating specialist.

## GitHub Actions: manual staged investigation

Use **USV-01 Repository Integration Intake** with a manifest path under `references/third-party-candidates/`. This workflow runs the 16 offline Scout + Integration tests, checks exact public source pin, does static inspection, and generates a 30-day **unverified proposal** artifact without executing foreign code or automatically opening or merging PRs. PR events run the tests only. The dedicated-host `verify` command is intentionally not enabled in CI by default.

## Explicit gaps before production use

- No vendor/source license or dependency vulnerability assessment is performed; source license metadata is advisory. SBOM, CVE scanning, provenance verification, container-image trust and independent legal review remain open.
- Upstream project build systems vary; automatic dependency installation, code modification, integration adapters and repair loops are **not implemented**. A compatible pinned evaluation image and explicit JSON adapter are required.
- There is no generic automatic route from proposed tool to the canonical A01–A26 tool-permission registry. That is a separate protected source-code change with access control, engineering discipline review and rollback tests.
- The pipeline cannot claim a real marine solver was built, commissioned, benchmarked, installed or used for USV-01. All vessel parameters remain TBD until controlled evidence is available.
- Do not run any OpenFOAM commissioning or solver installation as a side effect of this feature. This integration path is dormant unless manually dispatched.