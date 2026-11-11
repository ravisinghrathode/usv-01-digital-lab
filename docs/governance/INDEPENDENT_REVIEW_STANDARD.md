# NAVAL-USV | USV-01 Digital Engineering Lab
## Independent Review Standard (IRS-001)

**Programme:** NAVAL-USV  
**Standard Reference:** IRS-001  
**Authority:** Software Assurance Lead & Independent Technical Reviewer  
**Status:** APPROVED & ENFORCED  

---

### 1. Purpose & Core Philosophy

The Independent Review Standard establishes a four-stage pipeline ensuring that every engineering change proposed to the USV-01 baseline receives rigorous, multi-disciplinary examination before human authorization.

> **PRIMARY MANDATE:**  
> Independent AI review constitutes **advisory technical evidence**, never human authorization.  
> Under Non-Negotiable Principle 5: **AI cannot independently authorise its own engineering changes.**

---

### 2. The Four-Stage Review Pipeline

```
  [ Feature Branch ]
          │
          ▼
┌───────────────────────────────────────────────┐
│ Stage A: Change & Risk Classification         │
│  - Categorizes diff (Docs, Software, Arch,    │
│    Safety, Security, Requirements, Config)    │
│  - Computes Risk: LOW, MEDIUM, HIGH, CRITICAL │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ Stage B: Deterministic Automated Verification │
│  - TypeScript strict typecheck (npm run lint) │
│  - Dependency security audit (npm audit)      │
│  - DevSecOps secret scanner                   │
│  - Repository configuration validation        │
│  - ECR format & completeness validation       │
│  - Vitest test suite (40 passing tests)       │
│  - Production bundle build (npm run build)    │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ Stage C: Independent Multi-Role Technical AI  │
│  - 7 Independent Specialist Review Roles      │
│  - Evaluates findings, severity, consequences │
│  - Generates Advisory Verdict                 │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ Stage D: Human Authority Approval Gate        │
│  - Mandatory review by Engineering Director   │
│  - Signed ECR required for High/Critical risk │
│  - Cryptographic token signature check        │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
              [ Merge to main ]
```

---

### 3. Stage C — The Seven Reviewer Roles

Each review role assesses the proposed change from a distinct engineering perspective:

#### 3.1 Software Architecture Reviewer
- **Scope:** Modular boundaries, non-circular DAG dependencies, interface stability.
- **Mandate:** Preserve strict decoupling between deterministic naval tools and probabilistic LLM synthesis.

#### 3.2 Code Quality Reviewer
- **Scope:** TypeScript typing strictness, nullish coalescing (`??` vs `||`), dead code, error handling.
- **Mandate:** Guarantee numeric zero values (e.g. 0% design margin) are never coerced into non-zero defaults.

#### 3.3 Software QA Reviewer
- **Scope:** Automated test coverage, regression risks, determinism of calculations.
- **Mandate:** Block merge if tests are skipped, mocked unverified, or assertions are deleted.

#### 3.4 Cybersecurity Reviewer
- **Scope:** Authentication tokens, cryptographic HMAC-SHA256 signatures, timing-safe equality.
- **Mandate:** Prevent wildcard tokens (`usv01-*`), dummy token strings, and unauthenticated endpoint exposure.

#### 3.5 Safety Engineering Reviewer
- **Scope:** Marine safety criteria (IMO MSC.267(85), ISO 12217), intact hydrostatics, high voltage, and actuator air-gap.
- **Mandate:** Guarantee that physical vessel actuator commands remain barred and vessel particulars remain `TBD`.

#### 3.6 Configuration Management Reviewer
- **Scope:** Semantic versioning, dependency lockfile pinning, release manifests, change traceability.
- **Mandate:** Verify that version numbers, file hashes, and baseline comparisons are recorded.

#### 3.7 Requirements Traceability Reviewer
- **Scope:** Bi-directional traceability between code, requirements (`REQ-*`), design decisions (`ADR-*`), and test plans.
- **Mandate:** Prevent orphan requirements or untraced parameter additions.

---

### 4. Output Reporting Schema

Every reviewer must output findings structured with:
- **Role:** Explicit reviewer charter identifier.
- **Finding Severity:** `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- **Evidence:** Concrete line numbers, code snippets, or calculation inputs.
- **Affected Files:** Relative repository paths.
- **Potential Consequences:** Operational, safety, or architectural failure modes.
- **Recommended Corrective Action:** Step-by-step resolution.
- **Advisory Recommendation:** `ADVISORY_APPROVE`, `ADVISORY_REQUEST_CHANGES`, or `ADVISORY_BLOCK`.
