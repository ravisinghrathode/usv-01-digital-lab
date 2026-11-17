# Registry role-authority snapshot boundary — USV-01

**Status:** Proposed protected-software hardening; not qualification evidence.

Previously `getAgent`, `requireAgent`, and `getAllAgents` exposed mutable references to the registry's 26 live role configurations. Modifying any returned nested `executionPermissions`, `permittedTools`, `dependencies`, `verificationCriteria` or `modelConfig` could change the behavior of subsequent work. Registration also allowed conflicting aliases to silently remap an existing canonical role.

The registry now privately snapshots and freezes its own role metadata, returns independent copies for consumer reads, and rejects alias/role ID collisions before changing the registry. All 26 canonical roles and DAG validation are unchanged.

**Limitations:** Zod schemas are trusted executable objects and are not deep-cloned by this change. In-process untrusted JavaScript must not be granted direct access to the schema definitions or internal registry. Human approval, provider transport policy and physical actuation authorization are not delegated to agent metadata. Client-supplied role IDs must still be authenticated at the server boundary. This does not represent marine engineering certification.

**Tests:** `tests/agentRegistryTrustBoundary.test.ts` verifies query isolation, retained canonical configuration, no forged tool authorization, alias-collision denial, and 26/26 registry integrity.
