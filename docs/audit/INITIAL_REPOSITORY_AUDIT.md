# NAVAL-USV | USV-01 Digital Engineering Lab
## Initial Repository Audit & Baseline Assessment Report

**Programme:** NAVAL-USV  
**Project:** USV-01 Digital Engineering Lab  
**Author:** DevSecOps Architect & Software Assurance Lead  
**Audit Date:** 2026-11-11  
**Status:** COMPLETE — PRE-GOVERNANCE IMPLEMENTATION AUDIT  
**Authoritative Remote Repository:** `https://github.com/ravisinghrathode/usv-01-digital-lab.git`  
**Current Branch / Commit:** `main` @ `e2a4cd4`  

---

### 1. Executive Summary

An exhaustive audit of the NAVAL-USV software repository was conducted prior to establishing the server-side Engineering Governance System (EGS). 

The audit reveals significant advancements in the deterministic calculation core, fail-closed DAG task scheduling, canonical HMEA v0.2 agent registry, and cryptographic session authentication (`server.ts`, `ApproverSigner.ts`, `HumanApprovalGate.ts`). However, **server-side configuration control and repository governance are completely absent on GitHub**:
1. Remote branch protection on `main` is **inactive (HTTP 404)**.
2. GitHub repository rulesets are **empty (`[]`)**.
3. Pull requests are not mandatory; direct pushes to `main` are currently allowed by GitHub.
4. Code review by human engineering authority is not enforced by remote branch policies.
5. The local Git pre-push hook (`scripts/pre-push.sh`) is advisory and bypassable by any local developer via `git push --no-verify` or `GIT_CHATGPT_BYPASS=1`.
6. External AI code diff submission lacked formal data-handling classification and local-only fallback modes.

---

### 2. Physical & Remote Repository Topography

#### 2.1 Authoritative Repository & Branch Topology
* **Remote Origin:** `https://github.com/ravisinghrathode/usv-01-digital-lab.git`
* **Account Owner:** `ravisinghrathode`
* **Account Permissions:** `admin: true, maintain: true, pull: true, push: true, triage: true`
* **Active Branches:** Single branch `main` (tracked as `origin/main`).
* **Tags:** Zero git release tags (`git tag` returns empty).

#### 2.2 Identification of Known Local Checkout Paths
The prompt identified two distinct local paths:
1. `/Users/ravisingh/usv-01-digital-lab`:
   - **Type:** Primary git-tracked working tree on developer workstation.
   - **Status:** Cloned from `https://github.com/ravisinghrathode/usv-01-digital-lab.git`. Synchronized with remote `origin/main`.
2. `/Users/ravisingh/Downloads/NAVAl_UVS`:
   - **Type:** Handover zip bundle download.
   - **Provenance:** Matches the historical root archive [`USV-01_Review_Package.zip`](file:///home/antigravity/ravisinghrathode/usv-01-digital-lab/USV-01_Review_Package.zip) (dated 2026-11-11 17:53 UTC, 202 KB, 46 files).
   - **Distinction:** The `Downloads/NAVAl_UVS` folder represents an ephemeral snapshot extraction from early development handover and **is NOT an authoritative git repository**.
   - **Determination:** `/Users/ravisingh/usv-01-digital-lab` (backed by `origin/main`) is the sole authoritative engineering baseline repository.

---

### 3. Build Toolchain, Dependencies & Vulnerability Status

* **Package Manager:** `npm` with Node.js LTS (v22.x) and `tsx`.
* **Runtime Stack:** React 19, Vite 6, Tailwind CSS, TypeScript 5.8, Express 4.21, Zod 4.6.7.
* **Testing Framework:** Vitest 5.1.0 (`vitest run`).
* **Package Vulnerability Status:** `npm audit` was executed and reported **0 vulnerabilities**. Critical and high vulnerabilities in previous dependencies (`tinypool`, `zod`, `@vitest/mocker`) have been eliminated.
* **Build Verification:** `npm run build` succeeds cleanly in 4.34s, emitting `dist/` assets without TypeScript or syntax errors.

---

### 4. Bypass Mechanisms & Attack Surface Analysis

| Vector | Mechanism | Severity | Remediated in EGS? |
|---|---|---|---|
| **Direct Push** | Developers or AI tools can run `git push origin main` without review. | **CRITICAL** | Yes (GitHub Branch Protection & Rulesets). |
| **Hook Bypass Flag** | `GIT_CHATGPT_BYPASS=1 git push` bypasses local pre-push execution. | **HIGH** | Yes (Remote CI gate cannot be bypassed by client env vars). |
| **Git Flag Bypass** | `git push --no-verify` suppresses client-side git hooks entirely. | **HIGH** | Yes (Server-side required status check in GitHub Actions). |
| **Hook Deletion** | Deleting `.git/hooks/pre-push` eliminates local check. | **HIGH** | Yes (GitHub branch protection requires PR merge). |
| **Self-Approval** | Authors could approve their own PRs without CODEOWNERS. | **CRITICAL** | Yes (CODEOWNERS + `require_code_owner_reviews` + `require_last_push_approval`). |
| **Unsanitized Diff Transmission** | Raw diffs sent to third-party OpenAI endpoints without privacy check. | **HIGH** | Yes (Three-tier data policy + local-only review mode). |
| **Workflow Tampering** | Unauthorized modifications to `.github/workflows/` permitted. | **CRITICAL** | Yes (CODEOWNERS restriction on `.github/`). |

---

### 5. Existing Tests & Security Safeguards

* **Test Suite:** 27 automated tests passing in `tests/`:
  - `tests/tools.test.ts` (9 tests): Intact hydrostatics ($KM_T$, $GM_T$), Planing power, DC power balance, bottom slamming pressure, and COLREGS encounters.
  - `tests/orchestrator.test.ts` (5 tests): Topological DAG task scheduling, fail-closed dependency blocking, parameter passing.
  - `tests/safety.test.ts` (7 tests): Cryptographic HMAC-SHA256 signature verification on approval gates, timing-safe equality, rejection of forged signatures, role enforcement.
  - `tests/registry.test.ts` (6 tests): Canonical HMEA v0.2 25-agent registration (A01-A25), division alignment, deterministic tool bindings.
* **Server Security:** Dynamic runtime `LAB_SESSION_SECRET` with cryptographic HMAC-SHA256 session token generation and verification; protected endpoints (`/api/data`, `/api/export`, `/api/import`, `/api/gemini/assist`, `/api/auth/sign-gate`).

---

### 6. Baseline Alignment & Non-Negotiable Boundaries

1. **Non-Operational Actuator Air-Gap:** The USV-01 Digital Lab is an engineering analysis, synthesis, and verification environment. No actuator control, steering, throttle commands, weapon systems, or combat payloads exist or are permissible.
2. **Strict TBD Tracking:** Principal vessel dimensions (LWL, beam, draft, displacement, speed) remain explicitly `TBD` in certified baselines. Exploratory parametric studies are isolated and barred from masquerading as certified physical evidence.
3. **Canonical HMEA v0.2 Agents:** The 25 agents (A01–A25) adhere strictly to established division charters. No agent possesses authority to self-approve or override governance gates.

---

### 7. Required EGS Architecture Roadmap

To address the findings of this audit, the Engineering Governance System (EGS) will implement:
1. Remote GitHub Branch Protection on `main` via `gh api`.
2. `.github/CODEOWNERS` with designated human authority (`@ravisinghrathode`).
3. Multi-Stage Independent Review Pipeline (Stages A, B, C, D) in GitHub Actions.
4. Formal Engineering Change Request (ECR) and Engineering Change Order (ECO) system.
5. Three-Tier Data Handling and Source Code Protection Policy.
6. Cryptographically Hash-Chained Audit Trail for all governance actions.
7. Ten Comprehensive Governance Standards and Engineering Policies.
