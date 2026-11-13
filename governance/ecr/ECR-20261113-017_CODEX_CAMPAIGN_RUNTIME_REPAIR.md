# Engineering Change Request — USV-01

- **Change ID:** ECR-20261113-017
- **Originator:** Codex — PR #64 Codex runtime cutover validation
- **Date:** 2026-11-13
- **Closure Status:** UNDER_REVIEW

## 1. Change Summary

- **Description:** Repair the subscription-authenticated Codex provider's JSON output contract; compile the 26-agent synthetic catalog into schema-valid calculator inputs while retaining withheld unvalidated values in explicit non-baseline context; and include failure reasons in live matrix evidence.
- **Reason for Change:** PR #64 CI reported a TypeScript permission mismatch. The no-token preflight also rejected deliberate unvalidated catalog values without distinguishing safe validation from valid calculator inputs. Live Codex responses were rejected because the provider prompt omitted required output fields and scalar/array constraints.
- **Affected Subsystem:** AGT / TOOL / MODEL / VVT / GOV

## 2. Engineering Impact Analysis

- **Affected Requirements:** Agent output schema validity, deterministic tool authorization, non-operational fixture provenance, and subscription-only Codex campaign evidence. No vessel requirements or particulars are changed.
- **Architectural Impact:** Codex remains an advisory local CLI provider. The case compiler withholds unvalidated Cb and propulsive-efficiency inputs from calculators and preserves those values in task context. A17's TRUE_NORTH bearing convention is tagged as synthetic fixture metadata. No server, actuator, or solver authority is added.
- **Safety Impact:** CRITICAL. Changes affect engineering-agent orchestration and evidence boundaries. Calculator outputs remain preliminary, model output remains uncertified, and human/independent-review gates remain mandatory. No engineering baseline, vessel release, or physical verification is approved.
- **Cybersecurity Impact:** Paid API usage remains disabled for the campaign. Codex child-process credential filtering and explicit subscription-pilot controls are unchanged.

## 3. Verification & Evidence Plan

- **Verification Plan:** `npm ci`; lint; complete Vitest suite; production build; Mission Control regression suite; 26-agent `--require-ready` preflight; authenticated `codex_cli` matrix with paid API disabled; secret scan; governance configuration validation; ECR integrity check; exact-head CI; independent peer review; Stage D/E.
- **Risk Assessment:** CRITICAL
- **Review Evidence:** Retain `governance/reports/codex-26-agent-preflight.json` and `governance/reports/codex-26-agent-matrix.json` with the exact implementation commit recorded in the PR. Results are non-operational and uncertified. Independent GitHub review and Director authorization remain pending.

## 4. Human Authority Approval & Closure Record

- **Approval Decision:** PENDING
- **Authority Name:** Pending designated Engineering Director
- **Authority Role:** ENGINEERING_DIRECTOR
- **Authority ID:** PENDING
- **Signed At:** PENDING
- **Cryptographic Signature / Hash:** PENDING
- **Implementation Commit:** `4cf2b52ca3091083227bbb3265d8c402a8c6da0d` — PR #64, `feat/complete-codex-runtime-cutover`
- **Notes:** This ECR records software validation only. A Codex campaign, deterministic test result, or CI success is not an independent engineering review, Director signature, or authorization to merge a critical-risk baseline.
