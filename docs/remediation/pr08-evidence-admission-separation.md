# PR-08: execution success is NOT evidence admission

**Status: partial truthfulness fix.** No actual engineering evidence is accepted
by this change.

Ordinary agent and workflow HTTP endpoints previously returned an execution
status (including SUCCESS and HUMAN_APPROVED) without an independent technical
evidence-admission field. A client could interpret the completed task as
verified vessel engineering output.

This patch adds a separate, server-authored `evidenceAdmission` snapshot to:
- `POST /api/agents/execute`
- `POST /api/orchestrator/execute-workflow`
- `POST /api/orchestrator/decide-gate`

The snapshot states separately what the model reported, whether execution
completed, whether an independent technical reference was accepted, and
whether vessel engineering release was granted. Until there is an authenticated
source- and input-bound independent review, admission is always false.
Neither a provider flag nor a Director gate transition can change it.

## Still pending

- Ingest and validate independently signed, revision-pinned reference evidence
- Verify numerical accuracy, solver provenance and controlled vessel parameters
- Authenticate the reviewer separately from the AI/host/PR authors
- Integrate admission into downstream agents and the entire UI; prevent treating
  unverified upstream numeric claims as engineering facts
- Controlled-state transitions and complete cross-process audit/outbox handling

This patch does not assert approval or certification and cannot replace
acceptance criteria in the engineering programme.
