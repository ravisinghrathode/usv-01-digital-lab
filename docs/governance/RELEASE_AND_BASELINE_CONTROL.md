# NAVAL-USV | USV-01 Digital Engineering Lab
## Release and Baseline Control Procedure (RBCP-001)

**Programme:** NAVAL-USV  
**Procedure Reference:** RBCP-001  
**Authority:** Configuration Manager & Engineering Director  
**Status:** APPROVED & ENFORCED  

---

### 1. Release Versioning Scheme

NAVAL-USV releases adhere strictly to Semantic Versioning (`MAJOR.MINOR.PATCH`):
- **MAJOR:** Architectural rewrites, changes to foundational safety principles, or backwards-incompatible schema overhauls.
- **MINOR:** Addition of new deterministic tools, new agent capabilities, or non-breaking requirement expansions.
- **PATCH:** Defect resolutions, calculation optimizations, documentation updates, or dependency security upgrades.

---

### 2. Mandatory Release Gate Checklist

Before any release tag can be cut from `main`, the following criteria must be fulfilled:
1. **Zero Open Vulnerabilities:** `npm audit` must report zero critical, high, or moderate vulnerabilities.
2. **100% Test Success:** All 40 unit, integration, safety, and governance tests must pass.
3. **Clean Static Analysis:** TypeScript linting (`npm run lint`) must exit with 0 errors.
4. **Clean Secret Scan:** DevSecOps secret scan must confirm zero exposed credentials.
5. **Approved ECR:** High/Critical changes included in the release must reference an `APPROVED` ECR.
6. **Production Build Verified:** `npm run build` must generate valid `dist/` bundle assets.

---

### 3. Release Manifest Generation

Releases are formalized by running the configuration management generator:
```bash
npm run governance:manifest
```
This utility emits `RELEASE_MANIFEST.json` containing:
- Git commit SHA and tag.
- Full inventory of all source and bundle files with SHA-256 checksums.
- Environment metadata (Node.js version, platform).
- Summary of verification evidence.
- Cryptographic SHA-256 digest of the manifest itself (`immutableManifestSha256`).

---

### 4. Rollback and Disaster Recovery Procedures

1. **Reverting an Unsound Merge:**  
   If an unexpected runtime defect emerges on `main`:
   ```bash
   git checkout -b fix/emergency-rollback
   git revert <bad-commit-sha> -m 1
   git push origin fix/emergency-rollback
   # Open PR with emergency ECR citing rollback rationale
   ```
2. **Restoring Data Store Baseline:**  
   Persistent database snapshots are stored in `data/project_store.json`. Rollbacks can restore previous snapshots from git history:
   ```bash
   git checkout <verified-commit-sha> -- data/project_store.json
   ```
3. **Audit Trail Immutability:**  
   Even during a code rollback, historical records in `data/cryptographic_audit_trail.json` are **never deleted or truncated**. The rollback itself is recorded as a new audit entry, preserving complete accountability.
