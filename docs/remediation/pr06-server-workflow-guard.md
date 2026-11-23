# PR-06: Governed 26-agent workflow submission

Status: **partial hardening, not production-ready persistent orchestration**.

The server previously accepted no more than 25 workflow tasks, did not validate
the proposed DAG before clearing its current task map, and spread untrusted
client context into the agent execution inputs. This could discard a workflow
awaiting an authenticated Engineering Director decision, or carry fabricated
approval/verification claims into a model prompt.

The new guard:
- Supports at most 26 tasks, matching the canonical specialist roster.
- Requires unique valid task IDs, known dependencies and an acyclic DAG.
- Rejects replacement while the old task map has RUNNING or WAITING_HUMAN_APPROVAL
  tasks or any gate manager has unresolved Director approvals.
- Performs checks before `clearTasks()`.
- Recursively removes role, token, approval, verification and baseline-write
  fields from untrusted client input; supplies server-verified actor and
  explicit research-only, non-approved flags.
- Rejects unapproved information classifications.

Remaining PR-06 acceptance:
- Persist orchestrator workflow state and gate bindings transactionally.
- Replace prototype frontend execution with factual server execution status.
- Full 26-agent policy and fault-injection acceptance (duplicates, quotas,
  pending/expired gates, replay, process restart and multi-worker leases).
- Dedicated server authorization/evidence-admission tests and independent review.

Approval or baseline acceptance must never be inferred from an execution
status, synthetic campaign, or UI-controlled field.
