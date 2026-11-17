# Tool Registry Trust Boundary — 2026-11-17

**Scope:** Defensive coding for public/synthetic research tools, not vessel release.

The deterministic tool registry previously skipped permission checks when no caller permission list was provided. It also returned mutable reference-linked execution history and registered tool descriptors. This change requires a role-derived permission array, denies omitted/empty/malformed claims at runtime, freezes registered descriptors and permissions arrays, and records deep independent audit snapshots for all outcomes.

Malformed non-cloneable denied inputs generate a redacted failure record rather than silently losing audit provenance. Tests cover the bypass, authorized calculation, external mutation and redaction.

**Remaining limitation:** A caller-provided permission list is a claim, **not identity authentication**. The server should derive the agent's permission set from its trusted execution context; raw tool execution must not be exposed to untrusted clients. Freezing the descriptor does not sandbox its Zod schema or a malicious plugin. In-memory audit history is not a signed, durable provenance store. Deterministic tool success is **never** a certified engineering baseline or actuator authority.

The protected-software review, TypeScript suite, full deterministic tests and production build remain mandatory.
