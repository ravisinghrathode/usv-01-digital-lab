# Independently witnessed USV-01 audit checkpoint protocol

Status: **verification primitive only; no independent witness is deployed or
trusted by default.** This is not evidence that audit logs have been anchored.

## Objective

The local cryptographic audit chain is appendable and content-hashed, but a
privileged operator could replace the entire journal and recalculate every
hash. A trusted external witness must persist a signed checkpoint outside
the process and outside the administrator's write domain.

## Protocol

1. Validate the journal's hash chain. Generate a `USV01-INDEPENDENT-AUDIT-ANCHOR-1`
   checkpoint using `proposeAuditAnchorStatement` (journal identity, exact
   entry count, SHA-256 tip, UTC witness issuance time).
2. Transfer the checkpoint to a separately administered witness using an
   authenticated channel. The witness must independently authenticate the
   submission, apply monotonic sequence / anti-rollback rules, record receipt
   in durable independent storage, and sign the exact canonical checkpoint
   bytes with its dedicated Ed25519 key.
3. Deliver the signed statement and witness public key to the verifier.
   Pin the trusted public key through a separately controlled trust root;
   **never** accept a public key supplied with an untrusted request as
   sufficient independent proof.
4. `verifyIndependentAuditAnchor` checks the full current chain, complete
   entry count, journal identity, latest tip, witness signature and key type.
   Invalid or absent attestations must be treated as **UNVERIFIED**, not as a
   valid or signed engineering release.

## Production acceptance criteria still pending

- Independent authenticated witness endpoint and secure signing key
- Externally durable receipt history with anti-rollback continuity
- Independent trust-root enrollment and rotation process
- Cross-process serialization and durable outbox between engineering state
  mutations and audit events
- Live tamper/replay, power-loss, witness-unavailable and recovery drills

A local signature produced by the application or an attacker-controlled
public key does **not** satisfy independent audit anchoring. The test suite
uses an ephemeral keypair solely to test cryptographic interoperability.
