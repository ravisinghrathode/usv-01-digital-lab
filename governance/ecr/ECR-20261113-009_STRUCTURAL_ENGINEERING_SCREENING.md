# Engineering Change Request — USV-01

- **Change ID:** ECR-20261113-009
- **Originator:** ChatGPT — Systems/Structural Engineering Proposal
- **Date:** 2026-11-13
- **Closure Status:** UNDER_REVIEW

## 1. Change Summary

- **Description:** Remove unsupported structural compliance, false controlled-CAD labels and FEA claims from the sample UI; introduce non-certifying deterministic multi-point sling-force arithmetic, full 3D force/moment residual audits and separate generic beam-unit arithmetic (while retaining null marine scantling outputs), source references, invalid-input rejection, and unit tests; document load cases and closure evidence.
- **Reason for Change:** Avoid false approval of scantlings, lifting points or FEA based on synthetic data.
- **Affected Subsystem:** STR / SYS / VVT

## 2. Engineering Impact Analysis

- **Affected Requirements:** REQ-OPS-001 (proposed), STR-BLK-001 (open)
- **Architectural Impact:** Register one additional analytical tool in ToolRegistry. Keep non-operational air gap. No live actuators.
- **Safety Impact:** HIGH. Never presume equal four-point lifting reactions, verified weld/bearing strength, design pressure, or hull compliance; no physical lift authorization.
- **Cybersecurity Impact:** No secret handling, service endpoints or privilege changes. Existing CALCULATION_EXEC permission retained.

## 3. Verification & Evidence Plan

- **Verification Plan:** Automated analytic reaction/tension tests (including 60° slings and unequal shares), 3D force/moment equilibrium synthetic benchmarks (off-centre CG and opposing/incorrect sling directions); duplicate/missing/invalid inputs, unknown capacity, exceeded WLL, forged approval and permission denial; TS checks, full Vitest suite, production build and Stage C independent review. Engineering closure also requires approved CAD, mass/CG, rule applicability, full load combinations, independent structural checks, ratings and physical test evidence.
- **Risk Assessment:** HIGH
- **Review Evidence:** Feature branch `fix/structural-engineering-blocker-20261113`; review PR and CI evidence pending.

## 4. Human Authority Approval & Closure Record

- **Approval Decision:** PENDING
- **Authority Name:** Pending designated Engineering Director
- **Authority Role:** ENGINEERING_DIRECTOR
- **Authority ID:** PENDING
- **Signed At:** PENDING
- **Cryptographic Signature / Hash:** PENDING
- **Implementation Commit:** PENDING (feature branch; no automatic merge)
- **Notes:** AI checks and a passing test do not approve structure or permit launch/recovery. Require independent technical review and actual human signature.
