# Project Lead Approval Workflow

Every pull request into `main` requires the repository's protected-branch checks and one independent GitHub approval. The author cannot approve their own pull request.

## Routine software changes

Routine changes are classified as **LOW** or **MEDIUM** risk. Examples include user-interface work, isolated utilities, and ordinary documentation.

- Run dependency, secret, configuration, lint, test, and build checks.
- Obtain one independent GitHub approval after the latest push.
- No ECR or cryptographic Project Lead signature is required.

## Safety-critical engineering changes

Changes classified as **HIGH** or **CRITICAL** affect safety, security, engineering evidence, requirements, governance, release baselines, or core architecture.

- Run all routine checks plus the full engineering evidence campaign.
- Obtain the independent GitHub approval after the latest push.
- Preserve an ECR and independent engineering-review evidence for the exact PR baseline.
- The Project Lead gives one Ed25519 signature over that exact baseline digest. A new code change makes the signature stale and requires a new signature.

## Safeguards

The classifier fails closed: governance workflows, safety/security paths, ECRs, approvals, and protected project baselines are safety-critical. This workflow does not grant an automated tool or PR author authority to approve, sign, or merge a change.
