# NAVAL-USV | USV-01 Digital Engineering Lab
## Source Code and Data Handling Policy (DHP-001)

**Programme:** NAVAL-USV  
**Policy Reference:** DHP-001  
**Authority:** Cybersecurity Lead & DevSecOps Architect  
**Status:** APPROVED & ENFORCED  

---

### 1. Purpose & Core Mandates

This Policy governs the handling, transmission, sanitation, and external exposure of source code, git diffs, parameters, and design documents across the NAVAL-USV project.

The practice of unconditionally transmitting large source-code diffs to external third-party AI endpoints (e.g. OpenAI, Google) presents intellectual property, export control, and credential exposure risks. This policy establishes rigid boundaries and automated filters to prevent unauthorized data exfiltration.

---

### 2. The Three-Tier Data Classification Scheme

Every repository artifact, file, and data stream is classified into one of three tiers:

#### LEVEL 1 — Public (Non-Sensitive Open Documentation)
* **Scope:** Public README, open source licenses, general engineering formulas, standardized open documentation.
* **External AI Processing:** Permitted under approved privacy policies with sanitized diffs.
* **Transmission Controls:** Mandatory credential and private key stripping prior to transmission.

#### LEVEL 2 — Internal (General Digital Lab Source Code)
* **Scope:** React UI dashboard components, DAG orchestrator engine, deterministic calculation libraries, general TypeScript interfaces.
* **External AI Processing:** Permitted only when explicit user consent is configured (`GEMINI_API_KEY` present and `AI_REVIEW_PROVIDER=gemini`). Must be processed with diff truncation and privacy filters.
* **Default Mode:** Local Deterministic Review mode (`AI_REVIEW_PROVIDER=deterministic`) is preferred and active by default to prevent external leakage.

#### LEVEL 3 — Sensitive (Classified Engineering Baselines & Security Assets)
* **Scope:** Cryptographic session secrets, `.env*` environment configurations, physical vessel structural drawings, hydrodynamic towing tank data, private keys (`.pem`, `id_rsa`), security audit findings, and proprietary naval scantlings.
* **External AI Processing:** **STRICTLY PROHIBITED.** No external network transmission is permitted under any circumstances.
* **Handling Controls:** Must be excluded from diffs submitted to external LLMs. Stored strictly in local encrypted volumes or protected server memory.

---

### 3. Automated Sanitation & Privacy Controls

1. **Pre-Transmission Redaction Filter:**  
   The `sanitizeDiffForReview()` function in `scripts/governance/independent-ai-review.ts` and `scripts/chatgpt-verify.ts` automatically parses git diff blocks and strips:
   - Any file matching `\.env.*`
   - Any file containing `secret`, `credential`, or `token`
   - Any private key file (`*.pem`, `id_rsa`)
   - Large package lockfiles (`package-lock.json`)
2. **Local-Only Review Mode:**  
   When external API credentials are absent or `AI_REVIEW_PROVIDER=deterministic` is specified, the review pipeline executes 100% locally using deterministic static analysis rules, AST inspection, and heuristic checks. No network packets leave the machine. No paid OpenAI API key is required.
3. **Fail-Safe Operation:**  
   If an external API experiences rate limits, quota exhaustion, or network disconnects, the system fails closed or falls back cleanly to local verification without exposing source files.
4. **Credential Isolation:**  
   API credentials (`GEMINI_API_KEY`, `LAB_SESSION_SECRET`) must never be hardcoded in repository source files or committed to git. They are read dynamically from runtime environment variables.
