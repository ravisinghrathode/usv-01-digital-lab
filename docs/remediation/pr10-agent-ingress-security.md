# PR-10 direct-agent ingress: trusted execution context

**Partial security fix, not production authentication certification.**

A browser used to supply an arbitrary `correlationId`, `context` and
`priorAgentOutputs` to `POST /api/agents/execute`. The server overrode a
small number of flags but passed many nested authority claims downstream.

The updated endpoint:
- Issues a unique server-side correlation ID for every request
- Binds authenticated user ID and role on the server
- Recursively removes client-supplied approval, verification and release flags
- Separately marks all upstream model output as unverified advisory material
- Enforces bounded task IDs, nested objects, notes and numerical parameters
- Refuses model transfer with uncontrolled information classifications
- Returns 400/413 on validation failures before any agent execution

**Not yet fixed:** persistent cryptographic session revocation, safe cancellation
of timed-out model tasks, network transport termination, production deployment
trust boundary, secure secret rotation and complete ingress-policy unification
with the workflow route. This is a defense-in-depth step and requires
independent review. A model response is not technical evidence or a release.
