# PR-11: independent evidence artifact path confinement

**Scope:** narrow hardening of the existing 26-agent signed reference review
verifier; this does not qualify agents or validate vessel physics.

Previously, the verifier checked that the *string* of a review reference path
was beneath `evidence/independent/`, but used `statSync` and
`readFileSync` on the resulting pathname. Symbolic links inside the
checkout could redirect it to a different file or filesystem even though the
review path appeared in scope.

The new helper:
- Requires an exact non-traversing path in `evidence/independent/`
- Refuses symlinks at any path component
- Resolves the real path before opening and ensures it remains inside the
  trusted checkout's independent-evidence directory
- Uses `O_NOFOLLOW` where supported
- Reads only bounded regular, nonempty, single-linked files and verifies
  `fstat` identity and size before returning bytes
- Fails closed on all filesystem/permission inconsistencies

The original signature, reviewer qualification, output SHA and reference
SHA checks remain mandatory.

**Still required:** independent role-qualified reviewers, controlled
reference acquisition, on-host 26-agent commissioning, V&V of every role,
model/provider provenance, physical numerical accuracy and signed gate
acceptance. A successful artifact read is not a qualification.
