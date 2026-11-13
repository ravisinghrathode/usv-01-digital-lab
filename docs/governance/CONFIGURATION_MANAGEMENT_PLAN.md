# NAVAL-USV | USV-01 Digital Engineering Lab
## Configuration Management Plan (CMP-001)

**Programme:** NAVAL-USV  
**Plan Reference:** CMP-001  
**Authority:** Configuration Manager & Lead Systems Engineer  
**Status:** APPROVED & ENFORCED  

---

### 1. Purpose

The Configuration Management Plan defines the methods, baselines, and tools used to identify, control, audit, and account for all configuration items (CIs) comprising the USV-01 Digital Engineering Lab.

---

### 2. Controlled Configuration Items (CIs)

The following items are under strict configuration control:

| CI Category | Identifier Scheme | Authoritative Repository / Location |
|---|---|---|
| **Source Code** | Git Commit SHA | `https://github.com/ravisinghrathode/usv-01-digital-lab.git` (`main`) |
| **System Architecture** | `docs/ARCHITECTURE.md` | Version-controlled markdown specification |
| **Requirements** | `REQ-[SYS|NA|HYD|STR|ELEC|PROP|SWA|VVT]-NNN` | `USV01_PROJECT_CONTEXT.md` & `data/project_store.json` |
| **Design Decisions** | `ADR-NNN` | Architecture Decision Records in repository |
| **Agent Specifications** | `A01`–`A26` | `src/core/agents/definitions.ts` (Canonical HMEA v0.2) |
| **Engineering Parameters** | Configuration ID + revision + parameter ID + units + source digest | Controlled source/evidence artifacts evaluated by Gate 0 and authenticated human release controls; browser `SharedMemory.ts` is only an untrusted draft/preview cache |
| **Test Procedures** | `tests/*.test.ts` | Vitest automated test suite |
| **Verification Evidence** | Test execution reports & logs | GitHub Actions CI artifacts & release manifests |
| **Software Releases** | SemVer tags (`vMAJOR.MINOR.PATCH`) | Git annotated release tags & `RELEASE_MANIFEST.json` |

---

### 3. Engineering baseline authority and preview isolation

No historical `SharedMemory.ts` seed, simulation preset, agent output, heuristic optimizer score or unsigned ADR may confer an approved vessel engineering baseline. Historical Rev 0.4 figures are `ASSUMED` and sourced as unverified. Approved status requires a configuration-identifiable, source-pinned evidence package and the applicable independently verified human authority; a source-code merge or a 3D preview is not a vessel release.

`SharedMemory` rejects client-side parameter states `APPROVED` / `DIRECTOR_APPROVED`; it stores exploratory state only. The simulation preset selector must not write to it, and the sample orchestration workflow must not infer certification merely because numeric values exist. The Gate 0 evidence decision and engineering change/approval procedures remain separate, authoritative controls. This fix does **not** assert that any vessel baseline is independently verified or released.

### 4. Baseline Management

1. **Functional Baseline (FBL):** Defined by `USV01_PROJECT_CONTEXT.md` and initial requirements. Identifies target vessel mission constraints and explicit `TBD` markers.
2. **Allocated Baseline (ABL):** Defined by the 26-agent HMEA v0.2 division charter and deterministic naval tool specifications.
3. **Product Baseline (PBL):** Defined by frozen, tested git commits on `main` that have successfully cleared the 4-stage Independent Review Pipeline.

---

### 5. Configuration Status Accounting & Audits

- **Release Manifests:** Every certified release generates an immutable `RELEASE_MANIFEST.json` containing SHA-256 cryptographic checksums of all tracked files, build outputs, and test logs.
- **Traceability Verification:** Every merge must be accompanied by an approved Engineering Change Request (ECR) linking the implementation commit to affected requirement IDs.
- **Tamper Evidence:** Historical changes are recorded in the append-only cryptographic audit trail (`CryptographicAuditTrail.ts`).
