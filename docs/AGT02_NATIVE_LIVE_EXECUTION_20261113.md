# AGT-02 Native Execution — Live Commissioning Evidence (13 November 2026)

## Result

The actual USV-01 TypeScript `ExecutionEngine`, `BaseAgent`, `AgentRegistry`, and `ToolRegistry` were executed from the public repository's `main` source commit `505cd3583dbfb9fc2f78182fa461c2a19d7ed448`.

The model provider was **live Google Gemini 3.8 Flash**, accessed through the already-connected Gemini application via a temporary, loopback-only local proxy. The proxy's sole purpose was to deliver live model generation responses to the existing `ModelProviderRouter` in a controlled test process without copying API keys into the repository. It was not deployed or installed as a production connection.

**Measured outcome:**
- **26/26** canonical agents A01–A26 completed inside the actual engine with real Gemini model response IDs.
- **26/26** reported `providerExecutionMode=LIVE_AI_GENERATION` and passed their registered output schemas.
- **10/10** mandatory deterministic tool invocations succeeded, across nine agents: A05, A06, A07, A09, A10, A13, A14, A17 and A23. These calls actually went through the native `ToolRegistry`; no LLM-generated claim was accepted in place of tool execution.
- **0** agent execution failures.
- **15** responses required human approval; **11** completed without a per-agent approval requirement. Neither category constitutes approval of an engineering baseline.

The complete evidence file is `evidence/live-agents/native-execution-26-20261113.json`, containing correlation IDs, provider-issued response IDs, hashes of sent prompts and returned text, tool names and success flags, validation outcomes and the source revision. `tests/nativeLiveAgentEvidence.test.ts` cross-checks evidence against the actual 26 registered roles and their required tool lists.

## Representative input quality

The campaign used role-specific **synthetic** tasks in `evidence/live-agents/representative-cases.json`. The shared illustrative values (10m LWL, 2.5m beam, 0.6m draft, 5.5t declared displacement, Cb 0.45, 48V bus and an incomplete weight ledger) were selected for repeatable exercising of the tools. Their inconsistencies are intentional challenge cases, not data describing a real vessel.

Tool execution success validates the software input/output pathway, **not** the correctness of every naval formula, the authenticity of inputs, intact-stability compliance, COLREG safety, structural certification or independent technical sign-off. Review these disciplines against approved references separately.

## Boundaries and repeatability

The **one-time live execution blocker is resolved**: all 26 native agents have been observed running with real model generation and mandated deterministic tools.

The **persistent production integration blocker remains**: the GitHub Actions repository does not currently have a `GEMINI_API_KEY` secret, and the test relay was ephemeral. To repeat the campaign directly inside the deployed lab or CI, install a valid Gemini credential using an authorized secret store, then run the existing native agent matrix using controlled cases. No API key was recorded here.

This document does not change the independent acceptance register's evidentiary or Director-approval requirements. An externally observed successful live test is not a release authority signature.
