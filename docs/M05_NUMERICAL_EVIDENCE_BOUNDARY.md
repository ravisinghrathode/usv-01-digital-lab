# M05 numerical V&V evidence hardening — research-only

This patch corrects two trust-boundary failures in `NumericalVnVHarness`:

1. **Numerical agreement is not a solver convergence receipt.** Every passing benchmark remains `NUMERIC_SCREEN_PASS_UNCERTIFIED`, even when its submitter marks it as a full-domain result. The optional pinned solver receipt is reported as `DECLARED_RECEIPT_UNVERIFIED`, never as externally verified. Missing, invalid, duplicate, conflicting or changed-geometry receipt states are `NOT_RUN`. These records do not demonstrate CFD/FEA physical validity or the source's authenticity.
2. **A claimed external reviewer name is not an independent review.** The evaluator now rejects unsigned reviewer metadata. A review can be recorded as `ACCEPTED_WITH_LIMITS` only when it is Ed25519-signed, its signer key ID resolves to an **operator-provisioned external trust root**, that root binds exact name and documented qualification, and the signature binds exact source commit, geometry digest, every compared benchmark value/uncertainty/tolerance and disposition. Replays on a changed source/geometry, altered data, forged identity and CI/AI reviews fail closed.

For a qualified external review, an operator must provide `trustedReviewers` separately to `evaluateNumericalVnV`, never from the submitted file, model answer or repository source. Use `numericalDisciplineOutputDigest` and `numericalReviewSigningPayload` to prepare exact bytes for *offline human-reviewed* Ed25519 signing. A cryptographic signature verifies key possession only; the actual engineer's qualifications, independence, bench-source provenance, study rights, examination of measurements and engineering judgement require separate witnessed approval and remain outside this function.

The tests use **ephemeral synthetic Ed25519 keys**; they are not real professional certifications. No real tank-test/reference/solver work was performed; all vessel engineering releases stay `HOLD`.

Milestone M05/#105 remains open pending source-authenticated numerical benchmarks, solver-side signed/hardware-attested execution receipts, qualified independent inspection and director authorization.
