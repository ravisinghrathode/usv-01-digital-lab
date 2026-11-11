# NAVAL-USV | USV-01 Digital Engineering Lab
## Engineering Governance Policy (EGP-001)

**Programme:** NAVAL-USV  
**Project:** USV-01 Unmanned Surface Vessel  
**Authority:** Engineering Director (`@ravisinghrathode`)  
**Effective Date:** 2026-11-11  
**Status:** APPROVED & ENFORCED  

---

### 1. Purpose & Scope

This Policy establishes the binding engineering change-control, baseline authority, and independent verification rules across the NAVAL-USV software, digital lab, and multi-agent systems.

This policy applies to:
- All source code, schemas, and configurations in `ravisinghrathode/usv-01-digital-lab`.
- All automated agents (A01–A25) within the 25-agent HMEA v0.2 organisation.
- All AI assistant and reviewer interactions (Gemini, ChatGPT, Claude).
- All engineering baseline artifacts, requirements, and design records.

---

### 2. The Ten Non-Negotiable Governance Principles

1. **AI May Propose:** Automated agents and AI assistants may synthesize engineering proposals, draft code, and generate analysis models.
2. **AI May Review:** Independent AI models may conduct technical reviews, challenge assumptions, and audit code diffs.
3. **AI May Challenge:** Reviewers are mandated to challenge missing safety margins, unsubstantiated numbers, and omitted requirements.
4. **AI May Verify:** Automated tools may execute deterministic calculations, unit tests, and regression suites.
5. **AI Cannot Authorise:** Under no circumstances can an AI tool, agent, or automated workflow authorise its own changes or merge to protected baselines.
6. **Immutable Baseline Controls:** No agent or automated job can override, disable, or bypass protected baseline security controls.
7. **Zero Direct Main Modification:** Direct commits and fast-forward pushes to the `main` branch are prohibited and blocked server-side by remote branch protection.
8. **No Silent Alterations:** Accepted requirements and frozen baselines cannot be silently modified or deleted without an approved Engineering Change Order (ECO).
9. **Total Traceability:** Every line of code, parameter change, and design decision must trace back to an authorized change ID (ECR/ECO) and originator.
10. **Reproducible Evidence:** Releases and baseline milestones require reproducible, cryptographically hashed verification evidence.

---

### 3. Baseline Authority Structure

| Role | Authorised Entity | Scope of Authority |
|---|---|---|
| **Engineering Director** | Human Authority (`@ravisinghrathode`) | Sole authority for baseline freeze, safety gate decisions, ECR approvals, release sign-offs, and governance policy revisions. |
| **Independent Technical Reviewer** | Designated Human Engineer / Multi-Role AI Suite | Advisory review, evidence generation, compliance audit, risk challenge. |
| **Specialist Agents (A01–A25)** | Canonical HMEA v0.2 Agents | Deterministic tool execution, DAG task processing, change proposal generation. Barred from approval authority. |
| **DevSecOps Pipeline** | GitHub Actions CI (`safety-governance-gate.yml`) | Automated verification, secret scanning, linting, build checks, tamper-detection audit. |

---

### 4. Non-Operational Actuator Air-Gap

The USV-01 Digital Engineering Lab is strictly an engineering analysis, design synthesis, and verification environment.
* **Actuator Prohibition:** No live vessel control, throttle/rudder actuator commands, CAN bus hardware bridging, weapon-targeting, or combat payload functionality is permitted.
* **Physical Boundary:** All deterministic outputs are analytical evidence for human engineering evaluation, never direct commands to marine hardware.
