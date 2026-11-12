# USV-01 AGT-01/AGT-02 — Live Gemini Role Execution, 2026-11-13

**Source revision used for role definitions:** `854812812f02ab232a506957572c2944be63c7a5`  
**Model actually called:** Google `gemini-3.8-flash`, connected `GEMINI_GENERATE_CONTENT` service  
**Executed:** All 26 canonical role instructions A01–A26, each with a distinct, domain-specific **synthetic test** case.

## Verified observation

- 26/26 calls returned an actual Gemini model response identifier, `modelVersion` and `STOP` finish reason.
- 26/26 model outputs passed shape validation in the external campaign, with follow-up repository Zod validation performed by `tests/liveGeminiEvidence.test.ts`.
- Each record includes the canonical ID, registered runtime ID, role, task ID, representative task text, exact source revision, SHA-256 of source instructions and output, response ID, token counts and structured response.
- Representative inputs deliberately include a contradictory illustrative baseline (10m LWL, 2.5m beam, 0.6m draft, 0.45 block coefficient, 5.5t stated displacement and 3.2t defined component ledger). This allows domain agents to flag inconsistencies rather than to claim real vessel design data.
- Numerical spot checks in model responses included: block-coefficient displacement approximately 6.92t; mass ledger gap 2.3t; lifting DAF2 gross force about 107.9 kN. These model statements **are not validated engineering computations**.

## Material limitations — do not call AGT-02 fully accepted yet

**This campaign directly invoked the connected Gemini model using each registered agent's system instruction.** It was **not** executed by the repository `BaseAgent` + `ExecutionEngine` + `ToolRegistry` in one integrated runtime. Its outputs are genuine model responses but are not evidence of internal tool execution, dependency scheduling or independent accuracy.

Four outputs (A06, A07, A09 and A14) mentioned named deterministic tools despite none being invoked by the external connection; all such references are flagged in the evidence. There was a separate attempted corrective run, but the resulting payloads failed the strict schema or JSON validation and were **not substituted** for the successful original model responses. No actual deterministic-tool invocation is claimed.

The GitHub Actions repository secret inventory had **no `GEMINI_API_KEY` secret** at the time of this check; only a Director signing-related secret was present. No API keys are copied into this repository. Therefore the native Node.js Gemini provider cannot yet be executed as an authenticated CI live run using the repository's present configuration. The connected Gemini app's managed authentication does not automatically become a repository runtime credential.

**Acceptance disposition:** 26/26 external live provider role responses observed. **Native end-to-end AGT-02 execution: pending.** Engineering reference accuracy and independent naval acceptance: pending. Director approvals: not granted by this campaign.

## Controlled artifacts

- `evidence/live-agents/representative-cases.json`: 26 role-specific fictional input tasks and shared example parameters
- `evidence/live-agents/live-gemini-26-20261113.json`: all 26 response IDs, model versions, exact outputs, verification flags and input/output digests
- `tests/liveGeminiEvidence.test.ts`: source-role reconciliation and model-output schema assertions

The evidence is **not a provider-signed cryptographic attestation**. Model-provided text is untrusted, and its numerical claims require separate deterministic or experimental verification.

## Remaining single runtime dependency

Configure a supported, short-lived Google Gemini credential for the deployed or controlled engineering runner through its secret store; then invoke the already-implemented `npm run acceptance:live-agents -- --cases <private-cases.json>` with actual mandatory tool inputs. Do not expose the credential in Git, logs or chat. Confirm all 26 `providerExecutionMode` values are `LIVE_AI_GENERATION`, mandatory tool traces exist and pass, and no output claims approved engineering status. Only after that should the native AGT-02 execution requirement be considered for independent acceptance.
