> **Safety-case amendment — later calculator revision:** The new AGT-02 numerical hardening changes the current BaseAgent, ToolRegistry and all six engineering calculators. The 26 live-model responses recorded below belong ONLY to the earlier source fingerprint and must **not** be treated as a fresh 26-agent live run or source-verified engineering evidence for the revised calculators. The current candidate has 800 cross-language mathematical reference cases, conservative output rejection and a universal engineering-release block. Physical verification is still missing. See docs/AGT02_NUMERICAL_SAFETY_CASE_20261113.md.

# USV-01 AGT-02 — 26-Agent Accuracy and Safety Remediation

## Engineering disposition: SOFTWARE HARDENED; INDEPENDENT NAVAL ACCEPTANCE OPEN

This change directly addresses concrete accuracy/authority failures rather than recording another structural checklist.

**New controlled run:** 26/26 canonical agents executed in the real TypeScript ExecutionEngine with actual connected Google Gemini 3.8 Flash responses, and all 10 required ToolRegistry calculations completed. Provider-issued response IDs, sanitized outputs, numeric tool results, ten code-source fingerprints and fail-closed states are stored in:

- evidence/live-agents/native-hardened-26-20261113.json
- tests/hardenedLiveEvidence.test.ts

The model was connected through an EPHEMERAL localhost-only relay. The relay is stopped; no secret, model credential or permanent production bridge was committed. The physical inputs were expressly SYNTHETIC and not the actual USV-01 hull baseline. A06 was retried following an initial transient Gemini JSON completion failure; its failed attempt is not counted among successful calls.

## Verified software changes

- No MODEL-GENERATED quantitative metrics appear in the primary engineering keyMetrics unless they originate in actually executed mandatory deterministic tools. For all 17 specialists without such tools, primary keyMetrics is empty; the unverified model suggestions are preserved separately for review.
- Every model assertion categorized as FACT/CALCULATION or isBaseline=true is stripped of evidentiary authority, downgraded to an explicit assumption, retained for audit and flagged. LLM text cannot release an engineering baseline.
- Agent narrative and design decisions are marked MODEL_GENERATED_UNVERIFIED and PROPOSAL_ONLY.
- The previously corrected A14 electrical calculator produces 6,742 W duty-cycled average load and 14.24 h preliminary endurance for the synthetic example. A fabricated model claim cannot override it.
- COLREG screening now checks the Rule 11 in-sight precondition, restricted visibility versus Rule 19, and explicitly confirmed power-driven vessel types. Unknown status fails closed. No numeric helm setpoint is issued or certified.
- The runtime continues to reject inconsistent hull mass, Cb and displacement input, and does not invent KG, GZ, class scantlings or thermal test measurements.
- Twenty-six separate adversarial BaseAgent tests inject an invented 999-scale quantitative claim and forged model-baseline approval. All are blocked from authoritative fields.
- Each role A01–A26 has its own specialist accuracy acceptance challenge and explicit independent truth source in src/core/verification/RoleAccuracyObligations.ts. The audit pins actual source file digests and checks model/tool execution traces. Neither a successful unit test nor a Gemini self-attestation becomes naval verification.

## Independent reference status

The historical **original DIRECT-GEMINI** accuracy screen (before the runtime fixes) yielded 5 analytic-pass-UNCERTIFIED, 4 analytic/provenance fails and 17 qualitative-specialist evidence gaps. Those historical failures are preserved; they are not rewritten retrospectively.

The **new live native** run passed the runtime and safety-boundary checks, but that is not independent, external marine engineering performance validation. 0/26 roles have human-authenticated independent engineering truth data and acceptance signatures available here. The exact reference package required for each role is specified by the 26-obligation ledger. Major real-world sources still needed include approved hull offsets and inclining/GZ data, correlation-quality resistance/CFD or towing-tank runs, structural FEA/material proof, controlled environmental and marine electrical tests, witnessed COLREG and loss-of-link simulator/sea trials, and reviewer-signed interface, FMEA and requirements evidence.

No software model can fabricate these physical measurements or impersonate the independent engineer or Engineering Director. Formal AGT-02 naval acceptance remains fail-closed until real evidence is supplied and independently authenticated.

## Current maritime law context (not automatic project applicability)

- IMO Convention on COLREGs: Rules 11–18 concern vessels in sight; Rule 19 concerns restricted visibility. Source: https://www.imo.org/en/about/conventions/pages/colreg.aspx
- IMO's non-mandatory MASS Code was adopted May 2026, taking effect 1 July 2026. Its described SOLAS cargo-ship scope does NOT automatically establish its legal applicability to this small naval USV; the flag/naval authority must decide. Source: https://www.imo.org/en/mediacentre/hottopics/pages/autonomous-shipping.aspx

## Run and audit

```bash
npm run acceptance:accuracy
npm run acceptance:agt02-audit
npm run acceptance:agt02-audit -- --require-full-acceptance
npm test
```

The first two write machine-readable reports to governance/reports; the third intentionally exits nonzero while independent acceptance is absent. CI uploads the full 26-role report separately from the historical numeric screen. Unverified approvals, source-revision mismatches and forged tool response IDs never confer release status.

**Source audit and independent approvals are separate responsibilities.** No governance stages C/D/E, human sign-offs or cryptographic director signatures are bypassed by this software remediation.
