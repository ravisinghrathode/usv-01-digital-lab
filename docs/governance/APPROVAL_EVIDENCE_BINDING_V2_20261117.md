# P0 approval binding V2 — USV-01 26-agent control-plane
**Basis:** stacked on PR #170 head `dd2d982d8983b7dc906d3e3513c64dfe17a740b9`; non-operational lab software change. This PR implements a bounded portion of issue #171.

## Mechanism
- Every gate has a random 128-bit identifier and separate 128-bit nonce from secure Web Crypto.
- Each gate is versioned `USV_GATE_CONTENT_V2` with canonical SHA-256 of source SHA, exact input, full output, proposed changes, gate metadata and nonce.
- Server dispatch supplies its actual 40-character Git HEAD to the orchestration run, not a user/model claimed source revision.
- Browser demo/unpinned research gates can record a decision, but the orchestrator refuses to unblock downstream tasks without a real 40-hex source and matching input/output digests.
- Director's approval MAC binds gate ID, decision, user ID, role, signing timestamp and content digest.
- Signature validity is limited to a five-minute verification window, while already-decided gate receipts may be rechecked against their original decision time.
- The server denies decisions when its Git HEAD differs from the gate's pinned SHA. A finalized gate cannot be reused, and the API no longer uses unauthenticated gate-ID-only signatures.
- All `engineeringReleaseApproved` / actuator authority remain false or out of scope. Browser-side signatures are never independent naval ECR approval.

## Known limitations / future P0 work
- The signer remains a browser-compatible shared module with a process-local HMAC key; split it into server-only cryptographic service, distinct from `LAB_SESSION_SECRET`, with key ID and rotation.
- Gate and workflow event history remain in memory. A durable, append-only log, persisted one-time nonce ledger and signed receipt/archive are needed for multi-process or crash recovery (issue #173).
- The canonical JSON is versioned stable key-order JSON, not a full RFC 8785/JCS implementation.
- A source SHA does not prove a clean worktree or external engineering standards; independent source attestation, qualified reviewer identity and vessel ECR remain mandatory. No model-only certification.
- The HMAC receipt authenticates the server-side action; it is not a qualified external signature and is not a substitute for Ed25519 human ECR.
- Full threat-model review and live deployment test on the authenticated Mac host remain outstanding.

## Validation
Run `npm run lint`, `npm test`, `npm run build`, the exact-head GitHub governance workflow and the targeted `tests/approvalEvidenceBinding.test.ts` suite.
