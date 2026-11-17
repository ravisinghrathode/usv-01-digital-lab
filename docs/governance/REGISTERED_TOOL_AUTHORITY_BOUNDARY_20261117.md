# Registered mandatory-tool execution boundary (P0 issue #187, partial)

**Date:** 2026-11-17

### Problem
`BaseAgent` previously passed `this.spec.executionPermissions` directly to
`ToolRegistry.executeTool`. Untrusted code that mutated a role specification
could change this list and impersonate an expanded permission scope.

### Implemented
- A source-captured, privately scoped authorization map of all 26 registered
  roles and their mandatory/permitted tool IDs and `CALCULATION_EXEC` permission.
- Mandatory tool calls in `BaseAgent` go through
  `executeRegisteredMandatoryTool` instead of passing editable spec permissions.
- Each invocation denies nonmandatory or foreign role/tool combinations,
  unknown roles, malformed task IDs, missing tool registrations and
  uncloneable input before executing a calculator.
- Tool invocations receive an independent input snapshot and exactly the
  source-captured role permission set.
- Tests verify forged role-permission mutations cannot unlock a foreign tool;
  legitimate registered calculations still run and never authorize release.

### Remaining authority boundary (not delivered by this PR)
This broker is an **in-process static policy guard**, not a server-issued
identity credential. A hostile caller who can execute arbitrary JavaScript in
the trusted process can impersonate another agent ID at its exported function
boundary. A complete P0 requires server-only execution contexts bound to
authenticated workflow ID, task ID, clean source SHA, exact inputs, one-time
replay-resistant grants, capability revocation, strict tool payload limits,
durable receipts, side-effect isolation and crash/restart tests.

Until that exists, no external caller, browser, LLM or untrusted plug-in
may invoke this module directly or pass its own permission list. Existing
authenticated server endpoints remain the execution entry point.

**No naval release authority:** No vessel baseline is certified; results are
advisory calculations only, and independent human/safety governance remains
mandatory. Existing PR #181 and PR #184 are complementary but not
prerequisites for this isolated hardening.
