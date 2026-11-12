# NAVAL-USV | USV-01 Digital Engineering Lab
## AI Agent Governance Standard (AAGS-001)

**Programme:** NAVAL-USV  
**Standard Reference:** AAGS-001  
**Authority:** DevSecOps Architect & Multi-Agent Systems Lead  
**Applicability:** Master Agents A01–A25 (HMEA v0.2)  
**Status:** APPROVED & ENFORCED  

---

### 1. Scope & Foundation

The USV-01 Digital Engineering Lab employs 25 canonical specialist agents across 7 naval engineering divisions (Systems, Naval Architecture, Hydrodynamics, Mechanical/Structures, Electrical/Power, Propulsion, Autonomy/Software). 

This Standard defines the rigid boundary controls and permissions governing agent behavior to ensure full accountability, auditability, and safety.

---

### 2. The Five Immutable Agent Invariants

1. **Zero Self-Approval:** No agent may approve, accept, or certify its own generated proposals, calculations, or code changes.
2. **Zero Direct Promotion:** No agent may independently promote software, models, or datasets to the protected `main` branch or release baseline.
3. **Immutable Governance Boundary:** Agents are barred from altering governance rules, branch protection configurations, CODEOWNERS, authentication secrets, or approval gate logic.
4. **Unconditional Traceability:** Every action, calculation, proposal, or output synthesized by an agent must be stamped with its canonical agent ID (e.g. `STAB-HYD-06`) and recorded in the append-only cryptographic audit trail.
5. **Fail-Closed Execution:** If an upstream agent task fails or mandatory deterministic tool calculation criteria are not satisfied, downstream agent synthesis must immediately halt.

---

### 3. Agent Authority Matrix

| Action | Agent Permitted? | Human Approval Required? | Enforcing Module |
|---|---|---|---|
| **Execute Deterministic Tool** | ✅ YES | NO (Read-only execution) | `ToolRegistry.ts` |
| **Schedule DAG Tasks** | ✅ YES | NO (Topological planning) | `CentralOrchestrator.ts` |
| **Synthesize Proposal** | ✅ YES | NO (Draft generation) | `BaseAgent.ts` |
| **Submit ECR Proposal** | ✅ YES | NO (Queue for review) | `AgentGovernanceBridge.ts` |
| **Approve Approval Gate** | ❌ NO | **YES (Engineering Director)** | `HumanApprovalGate.ts` |
| **Modify Baseline Parameter** | ❌ NO | **YES (Engineering Director)** | `SharedMemory.ts` |
| **Modify Governance Rules** | ❌ NO | **YES (Engineering Director)** | `AgentGovernanceBridge.ts` |
| **Merge Pull Request** | ❌ NO | **YES (Engineering Director)** | GitHub Branch Protection |
| **Issue Release Baseline** | ❌ NO | **YES (Engineering Director)** | `release-manifest.ts` |

---

### 4. Technical Enforcement in Code

Attempting to authorize an agent change via automated scripts triggers an immediate runtime exception:
```typescript
// Enforced in src/core/governance/AgentGovernanceBridge.ts
bridge.evaluateAgentAuthorizationAttempt(agentId, changeId);
// Throws: Governance Violation: Agent '...' attempted to authorise change '...'.
// Non-Negotiable Principle 5: AI cannot independently authorise its own engineering changes.
```
All such attempts are captured in the cryptographic append-only audit trail as security violations.
