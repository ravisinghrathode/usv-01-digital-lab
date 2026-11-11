# NAVAL-USV | USV-01 Digital Engineering Lab
## Security Threat Model & Risk Assessment (STM-001)

**Programme:** NAVAL-USV  
**Model Reference:** STM-001  
**Methodology:** STRIDE / DevSecOps Threat Analysis  
**Authority:** Cybersecurity Lead  
**Status:** APPROVED & ENFORCED  

---

### 1. System Threat Landscape & Trust Boundaries

The USV-01 Digital Engineering Lab operates across three primary trust zones:
1. **Public / Untrusted Zone:** Third-party npm dependencies, external LLM APIs (OpenAI, Gemini), internet network traffic.
2. **Advisory / Staged Zone:** Automated agents (A01–A25), DAG task outputs, AI review findings, local git working trees.
3. **Protected / Authoritative Zone:** Remote GitHub repository (`main`), cryptographic audit trail, server-side branch protection rules, human Engineering Director signing keys.

---

### 2. STRIDE Threat Analysis & Implemented Mitigations

| Threat Category | Potential Attack Vector | Severity | Implemented Technical Mitigation |
|---|---|---|---|
| **Spoofing Identity** | An unauthorized user or agent attempts to approve an approval gate pretending to be the Engineering Director. | **CRITICAL** | Requiring `ApproverIdentity` with HMAC-SHA256 signature binding `${gateId}:${decision}:${userId}:${role}:${timestamp}` verified via `timingSafeEqual`. Bare string roles rejected. |
| **Tampering with Data** | Retroactive modification of design decisions or requirement parameters in project data store. | **HIGH** | File-backed persistent storage in `data/project_store.json` version-controlled in Git, plus SHA-256 hash-chained append-only audit trail. |
| **Repudiation** | An engineer or agent disputes having authorized or generated a flawed calculation. | **HIGH** | Immutable audit records capturing actor ID, timestamp, tool inputs, and cryptographic hash chain. |
| **Information Disclosure** | Sensitive vessel hull coordinates, towing tank data, or API keys leaked to external AI services. | **HIGH** | Three-tier data handling policy (`DHP-001`), pre-submission diff sanitization filter, and zero-network local-only review mode. |
| **Denial of Service / Pipeline Stalling** | Infinite loop in DAG orchestrator or OpenAI rate limiting / credit exhaustion halting CI. | **MEDIUM** | Fail-closed DAG dependency resolution, deterministic local review fallback, and local Vitest test suites running offline. |
| **Elevation of Privilege** | An agent or automated workflow attempts to modify `.github/workflows` or self-approve an ECR. | **CRITICAL** | GitHub branch protection with `enforce_admins: true`, `.github/CODEOWNERS` requiring `@ravisinghrathode`, and `AgentGovernanceBridge` runtime blocking. |

---

### 3. Supply-Chain & Dependency Threat Management

- **Vulnerability Auditing:** `npm audit --audit-level=high` is run on every commit in CI. Current state: 0 vulnerabilities.
- **Dependency Pinning:** Exact versions pinned in `package.json` and locked with `package-lock.json`.
- **Secret Scanning:** `secret-scanner.ts` scans all incoming diffs for API keys, private keys, and high-entropy secrets before commits can enter `main`.
