# USV-01 Agent Registry: evidence classification

**Canonical implementation:** `src/core/agents/definitions.ts` and `src/core/registry/AgentRegistry.ts`. This documentation MUST NOT be interpreted as an authoritative live agent performance certification.

The live canonical registry currently defines **26** agent IDs, A01–A26. The earlier static role table was from a different generation of the architecture and no longer reliably maps each ID to its live role. Consult the canonical implementation rather than copying legacy labels.

## What the implementation establishes

- **Registered:** Agent identity, prompts, dependencies and schema configuration are present.
- **Tool-bound:** At least one mandatory deterministic tool is registered, but the calculator's execution, domain validation, uncertainty and real-world applicability are not automatically established.
- **Independently validated:** Requires a documented benchmark/correlation suite and accepted independent review; **not asserted** by registration or automated schema tests alone.
- **Operationally deployed:** Requires authenticated deployment evidence and any relevant physical air-gap verification; **not asserted** for any agent solely from this repository.

## Machine-readable readiness

Use `GET /api/verify/readiness` with an authenticated staff session. Its agent entries are assembled at runtime from the canonical registry and tool inventory. The endpoint deliberately reports `independentlyValidated: false` and `operationalDeploymentVerified: false` unless future independent verification processes provide genuine evidence.

External integration state is `UNVERIFIED` until a real, authenticated connection and source-commit synchronization check is recorded.

## Acceptance requirements

An agent may only progress beyond configuration after controlled test cases establish valid inputs, deterministic tool correctness (where relevant), safe rejection of invalid inputs, reproducibility, traceability, independent review, and authority gates. Physics tools additionally require domain-specific comparison with accepted datasets, physical measurements or reviewed reference calculations.

This registry is **not** certification of vessel hydrostatics, resistance, seakeeping, structural strength, autonomy, COLREGs compliance, or safety.
