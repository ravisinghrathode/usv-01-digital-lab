# A04 local trusted-host preflight — operator handoff

**Status:** IMPLEMENTATION PROPOSED / HOST EVIDENCE STILL BLOCKED. This command must run on the *authorized Mac execution host*; GitHub CI or a ChatGPT container is not that host. No model is called.

The preflight is intended to reduce host evidence collection to a single invocation after the operator or authorized host runner has checked out the **reviewed, merged source SHA**. The current source SHA must be passed explicitly and match local HEAD. No automatic pull or checkout is performed.

From the project checkout, after installing the project's existing dependencies, an authorized host operator can run:

```sh
USV01_HOST_ID=usv-lab-mac-01 \
USV_SUBSCRIPTION_PILOT=enabled \
AI_REVIEW_PROVIDER=codex_cli \
USV_LAB_SCOPE=RESEARCH_ONLY \
USV_ALLOW_PAID_AI_API=false \
npm run mission-control:a04-check -- --source-sha <FULL_40_CHARACTER_REVIEWED_MAIN_SHA>
```

The host ID is a **locally chosen non-secret alias**, not a credential or a signed identity. Do not use real usernames, machine serials or confidential topology identifiers. The receipt contains its SHA-256 hash only. A PASS_UNATTESTED result means **only that local probes passed**; it is not A04 VERIFIED, does not permit A05 and cannot authorize any engineering release.

The command checks the exact source revision and tracked-tree cleanliness, repository identity, checkout owner, Codex CLI executable/version and ChatGPT subscription OAuth status (no model call), research-only commissioning policy, private temporary file permissions, and non-secret platform/resource telemetry. It writes a private mode-0600 JSON receipt to the already gitignored `data/` directory, prints a SHA-256 digest, and never prints the login response or environment secrets. It does not upload private host evidence to GitHub.

**Important remaining human/operations verification:** validate sandbox isolation and network restrictions, minimum free disk and resource limits against the actual mission-control workload, credentials and audit storage, trusted host identity, source provenance and source SHA, and obtain a qualified independent software operations review. The receipt's review flags deliberately remain false. The operator should keep the private receipt in controlled storage, publish only its safe digest and independent signoff reference, and then update the A04 record and Master Project Register via a separate protected PR. A04 remains BLOCKED until this is done.

**Security limits:** a hashed alias is not a cryptographic host attestation; this receipt is not signed and must not be described as signed. The script cannot prove the absence of all credential pathways, network egress, or physical actuator access. Local audit of the actual host remains mandatory. The A07 post-campaign 26-agent host-health attestation must not be substituted for this A04 pre-execution record.
