# NAVAL-USV | USV-01 Multi-Agent Organisation
## Agent Governance Interface Specification (HMEA v0.2)

**Document Reference:** `AGI-SPEC-001`  
**Classification:** Internal Controlled  
**Applicability:** Canonical Agents A01–A26 across 8 functional divisions (current registry)  

---

### 1. Architectural Scope & Mandates

The current USV-01 Digital Engineering Lab registers **26** canonical agents A01–A26. The HMEA v0.2 / 25-agent wording is a superseded historical architecture description, not an alternative live roster. Source authority: [`src/core/agents/definitions.ts`](../src/core/agents/definitions.ts) and `AgentRegistry`; A15 is the Independent Technical Critic and A18 is the Test & Verification Director. This documentary reconciliation does not alter any agent authority, approval gate, safety rule or release permission. 
While agents are equipped to execute deterministic tools, schedule topological DAG tasks, and synthesize multi-disciplinary proposals, **agents operate strictly within an advisory capacity**.

#### Non-Negotiable Agent Authority Invariants:
1. **Zero Self-Approval:** No agent may approve its own proposed changes, tasks, or calculations.
2. **Zero Baseline Modification:** No agent may directly write to protected branches or promote software to production baselines.
3. **Governance Invariance:** No agent can modify governance workflows, CODEOWNERS, authentication secrets, or safety gates.
4. **Traceable Attribution:** Every proposal, calculation execution, and audit log must explicitly attribute the originator agent ID (e.g. `STAB-HYD-06`, `STR-MAT-10`).
5. **Fail-Closed Evidence:** Missing calculation evidence or schema validation failures must immediately halt downstream synthesis.

---

### 2. Formal JSON Communication Protocol

#### 2.1 Engineering Proposal Schema
When an agent proposes an engineering baseline revision (e.g. structural scantling update, electrical load schedule addition):

```json
{
  "$schema": "https://naval-usv.internal/schemas/agent-proposal-v1.json",
  "agentId": "STR-MAT-10",
  "targetSubsystem": "STR",
  "proposedTitle": "Bottom Slamming Plate Thickness Recommendation",
  "description": "Calculated minimum bottom plating thickness for wave slamming regime per DNV-RU-HSLC.",
  "reason": "Resolves TBD structural scantling parameter for forward impact section.",
  "affectedParameters": ["USV-STR-001"],
  "calculationEvidence": {
    "toolId": "TOOL-STRUCTURES-01",
    "designPressureKPa": 48.5,
    "yieldStressMPa": 275,
    "designMarginPercent": 15,
    "minimumThicknessMm": 4.82,
    "timestamp": "2026-11-11T20:50:00Z"
  }
}
```

#### 2.2 Governance Response Schema
```json
{
  "success": true,
  "actionTaken": "PROPOSAL_QUEUED",
  "changeId": "ECR-AGENT-M3F9A1-STRMAT10",
  "message": "Engineering change proposal registered. Awaiting independent review and Engineering Director authorisation."
}
```

---

### 3. Escalation & Conflict Resolution Protocol

1. **Independent Review Disagreements:** If the `Safety Engineering Reviewer` and `Software Architecture Reviewer` issue conflicting recommendations on an agent proposal, the proposal is escalated to `GATE_ESCALATED` status.
2. **Human Authority Arbitrament:** Only the human Engineering Director (`@ravisinghrathode`) has authority to resolve conflicting reviews and authorize an Engineering Change Order (ECO).
