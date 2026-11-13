# USV-01 — Solo Project Lead Approval Workflow

The sole Project Lead directs software changes and may merge ordinary software
PRs once all required CI checks have passed. A Project Lead decision is not an
independent engineering evaluation or authorization to deploy a vessel.

## Route 1 — Routine software changes (LOW / MEDIUM)

- Restricted to changes positively classified LOW or MEDIUM by the checked
  governance risk classifier.
- Require dependency security, secret scanning, static checks, deterministic
  tests and production build at the exact current head.
- Do **not** require a second GitHub reviewer, ECR, naval engineering review,
  or Ed25519 Director signature. Solo contributors cannot self-review in GitHub.
- A named Project Lead initiates the merge only after the required GitHub
  status checks pass; no unattended or auto-approved merge is authorized.
- Routine merge is a software configuration change, **never** a vessel
  engineering release or certification.

## Route 2 — Safety-critical / governance changes (HIGH / CRITICAL)

Includes changes to stability and hydrodynamics, vessel source data, safety,
security, engineering evidence, requirements, governance logic, CI workflows,
architecture, and engineering release controls.

- All routine tests remain mandatory, plus safety/evidence-specific checks.
- A real authorized independent reviewer must approve the exact PR head.
  The PR author cannot satisfy this requirement, and AI review is advisory.
- A valid, authorized Engineering Director Ed25519 signature must cover the
  exact engineering baseline; a new code change makes an earlier signature stale.
- Stage C / Stage D / Stage E must pass; preserve qualified naval review,
  approved source data, traceability, and HOLDs for any physical release.
- If no qualified independent reviewer is available, the change stays blocked.
  This is intentional even for a single-person project.

## One-time repository administrator action (NOT yet completed by this code)

GitHub branch protection is **separate** from the TypeScript governance code.
An existing rule requiring an independent review for *every* PR still blocks
solo LOW/MEDIUM merges, even when the CI routine route passes. This repository
integration cannot edit or independently verify that administrative rule.

The repository owner must arrange a reviewed, protected-branch configuration
that permits zero mandatory **global** peer approvals on routine work while
retaining an up-to-date required **Deterministic Quality & Governance Gate**
check, pull-request merge, conversation resolution, non-bypass for admins,
and no force-push/deletion. Before changing the global review rule, an
independent security reviewer must confirm that HIGH/CRITICAL paths cannot
circumvent the trusted gate by modifying its own workflow/classifier. Consider
GitHub path-targeted required reviewers/rulesets where supported, and retain
a separate technical release authority. Do not disable the required status
check or treat an admin bypass as an approval.

Current `.github/CODEOWNERS` lists the PR author as its only code owner; that
is **not** an independent reviewer. A genuine qualified engineering reviewer
must be engaged if a safety-critical PR needs release.

## Known example

PR #46 (HYD-01) modifies naval stability calculations, verification and
controlled design data. It remains CRITICAL; its software bug fixes cannot
be reclassified as routine solely because the fixes are beneficial.
HYD-01 physical acceptance and seagoing release remain HOLD until independently
verified source data and engineering evidence exist.

## Integrity guarantees

The Stage D peer-review check accepts only an authenticated GitHub review
from an eligible independent collaborator on the exact current head, with no
later superseding rejection by that reviewer. A Project Lead comment, AI agent
verdict, older PR approval, or digital signature alone is not that peer review.
