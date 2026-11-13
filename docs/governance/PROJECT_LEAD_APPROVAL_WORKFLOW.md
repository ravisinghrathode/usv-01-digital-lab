# Project Lead Approval Workflow

Every pull request into `main` requires the repository's protected-branch checks. The Project Lead may merge routine work once those checks pass.

## Routine software changes

Routine changes are classified as **LOW** or **MEDIUM** risk. Examples include user-interface work, isolated utilities, and ordinary documentation.

- Run dependency, secret, configuration, lint, test, and build checks.
- The Project Lead may merge after the required checks pass.
- No ECR, independent engineering review, or cryptographic Project Lead signature is required.

## Safety-critical engineering changes

Changes classified as **HIGH** or **CRITICAL** affect safety, security, engineering evidence, requirements, governance, release baselines, or core architecture.

- Run all routine checks plus the full engineering evidence campaign.
- Obtain an independent GitHub approval after the latest push. The author cannot satisfy this control.
- Preserve an ECR and independent engineering-review evidence for the exact PR baseline.
- The Project Lead gives one Ed25519 signature over that exact baseline digest. A new code change makes the signature stale and requires a new signature.

## Safeguards

The classifier fails closed: governance workflows, safety/security paths, ECRs, approvals, and protected project baselines are safety-critical. This workflow does not grant an automated tool authority to approve, sign, or merge a change, and it does not allow an author to substitute their own approval for the independent peer review required on safety-critical work.
