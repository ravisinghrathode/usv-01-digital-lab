# Engineering Change Request (ECR)
## NAVAL-USV Digital Engineering Lab Configuration Control

- **Change ID:** ECR-20261113-004
- **Originator:** ChatGPT — Systems / Marine Engineering (proposal)
- **Date:** 2026-11-13
- **Closure Status:** UNDER_REVIEW

---

### 1. Change Summary
- **Description:** Define a controlled MAR-01 marine-systems integration evidence matrix and add fail-closed software intake for 13 work products across L&R, sealed-hull heat, wet-end acoustic, fouling/corrosion and bilge/condensation.
- **Reason for Change:** MAR-01 / WS-07 is open because quantified integration evidence and independent acceptance are unavailable; generic numeric envelopes and unrelated concept parameters must not become design release evidence.
- **Affected Subsystem:** SYS / NA / STR / ELEC / PROP / VVT / GOV

### 2. Engineering Impact Analysis
- **Affected Requirements:** MAR-01; MAR-LR-01 to MAR-LR-03; MAR-TH-01 to MAR-TH-03; MAR-AC-01 to MAR-AC-03; MAR-FC-01 to MAR-FC-02; MAR-BC-01 to MAR-BC-02
- **Architectural Impact:** New conservative metadata evidence gate and 13 traceable requirements; optional integrated acceptance-campaign report field. Does not create actuator pathways or change approved vessel dimensions.
- **Safety Impact:** Prevent false acceptance from incomplete, mismatched or self-attested evidence. Actual engineering qualification and physical tests remain mandatory.
- **Cybersecurity Impact:** Evidence URLs are treated as untrusted references; no fetching, external token handling or authentication claim is added.

### 3. Verification & Evidence Plan
- **Verification Plan:** Compile TypeScript; Vitest must cover 13 IDs/5 domains, missing evidence, stale SHA, duplicate/unknown IDs and self-attested false approval. CI must build cleanly. Independent discipline review and physical acceptance separately required.
- **Risk Assessment:** HIGH
- **Review Evidence:** Draft MAR-01 branch, CI check and independent review pending. See docs/MAR01_MARINE_SYSTEMS_INTEGRATION.md.

### 4. Human Authority Approval & Closure Record
- **Approval Record:** PENDING; independent and human engineering approval not yet obtained.
- **Approval Decision:** PENDING
- **Authority Name:** Pending designated Engineering Director
- **Authority Role:** ENGINEERING_DIRECTOR
- **Authority ID:** PENDING
- **Signed At:** PENDING
- **Cryptographic Signature / Hash:** PENDING
- **Implementation Commit:** PENDING
- **Notes:** No signature is asserted. No marine physical/sea-trial evidence was manufactured, and MAR-01 remains pending.
