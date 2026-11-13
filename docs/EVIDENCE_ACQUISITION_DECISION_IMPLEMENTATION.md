# USV-01 — Evidence Acquisition, Verification and Decision Control

Status: IMPLEMENTATION GUIDE — not an engineering design approval or certificate.
Scope: Non-actuating digital laboratory only.

## Gate 0: authoritative vessel identity

Two incompatible concepts currently use the USV-01 label. The proposed 2.5 m / 120 kg portable Rev A and the repository-asserted 11.2 m / 6.2 tonne tactical Rev 0.4 MUST remain separate configurations. The latter's textual "approved" claim does not authenticate hull geometry, mass properties, GZ stability or qualified human approval.

The default machine-readable input in governance/evidence/USV01_GATE0_SEED.json explicitly declares no selected baseline, no approved CAD or weight register and no test evidence. That is an accurate HOLD, not an implementation defect.

Gate 0 configuration metadata requires exact source Git commit, controlled hull and mass property artifact URLs and SHA-256 digests, declared axes and SI units, revision and unique vessel identifier. Every acceptance criterion requires its approved-before-test reference and test procedure. Every piece of physical evidence is pinned to exactly those same hashes and configuration. A source mismatch or cross-variant record is quarantined.

## 13-workstream evidence collection

- WS-01 / AGT-01: native 26-agent execution traces and software tests.
- WS-02 / AGT-02: external known-answer references and independent engineer review.
- WS-03 / HYD-01: watertight CAD hydrostatics, GZ/righting arms and independent review.
- WS-04 / RES-01: resistance correlation, speed-power curve and vendor data.
- WS-05 / STR-01: finite-element/analytical loads, material properties and independent check.
- WS-06 / AUT-01: complete scenario coverage, HIL trace and independent safety review.
- WS-07 / MAR-01: rigging, thermal, wet-end acoustic, fouling and bilge measurements plus review.
- WS-08 / INT-01: live deployed source SHA, authentication and API functionality.
- WS-09 / INT-02: Drive scoped upload/read/download/ACL/recovery verification.
- WS-10 / INT-03: Obsidian Markdown/wikilink graph integrity and recovery.
- WS-11 / SEC-01/02: actual threat model, security test and independent penetration check.
- WS-12 / GOV-01/02: exact-head Ed25519 Director signature and qualified independent review.
- WS-13 / DEP-01: production deployment, monitoring, TLS, backup and rollback drill.

The strict input/output schema and required evidence-method mapping are in src/core/verification/EvidenceDecisionGate.ts. The existing 13-workstream AcceptanceCampaign now includes configuration HOLD in its output. Evidence method coverage only indicates intake completeness; metadata and AI agreement NEVER equal authenticated physical verification. Missing evidence remains NOT_TESTED, malformed/mismatched input is rejected, and submitted claims remain SUBMITTED_UNVERIFIED.

## Decision gates and release boundaries

Gate 0: configuration and acceptance criteria controlled and independently authenticated.
Gate 1: numerical tools tested against external oracle datasets and CAD/CG/power input verified.
Gate 2: discipline-specific engineering and laboratory/CFD/FEA validation, uncertainty and supplier data.
Gate 3: fault-injection SIL/HIL without direct vessel actuator commands from this lab.
Gate 4: authorized physical trials with approved procedures and calibrated measurements.
Gate 5: independent engineering qualification and signed Engineering Director release approval.

The software Gate 0 status can at most report METADATA_READY_FOR_EXTERNAL_CONFIGURATION_REVIEW. It NEVER advances an engineering release to APPROVED, even if reviewer roles, provenance URLs, claim booleans or AI findings say so. Actual verified source authentication, independent professional judgment and human Ed25519 authorization remain separate.

## First evidence campaign: power and hydrostatics

After hull and mass-register authority is resolved, run independent CAD displacement/LCB/LCF/GM and all loading GZ cases; reference-compare hydrostatic integration and capture model convergence. Do not use a block-coefficient buoyancy estimate as a GZ certificate.

For the repository Rev 0.4 numerical claims (not physical proof), 182 kW shaft power versus 54 kWh usable energy yields an optimistic full-load upper bound of approximately 0.297 h (17.8 min), before inefficiency and hotel loads. Assuming all shaft power is drawn from ONE hypothetical 48 V DC bus yields an impossible-to-ignore minimum theoretical current near 3,792 A. This is NOT a real bus topology, sprint endurance claim or measured resistance curve. Actual series/parallel topology, efficiency maps, BMS/motor/controller ratings, bus minimum voltage and sprint duty cycle require authoritative supplier/test evidence.

## Commands

Offline source-verification campaign (does NOT claim acceptance):

    npm run evidence:gate0 -- --baseline-sha YOUR_40_CHAR_GIT_COMMIT
    npm run acceptance:campaign -- --baseline-sha YOUR_40_CHAR_GIT_COMMIT

For a private controlled dataset:

    npm run evidence:gate0 -- --input /controlled/USV01_GATE0.json --baseline-sha YOUR_40_CHAR_GIT_COMMIT --require-review-ready
    npm run acceptance:campaign -- --configuration-evidence /controlled/USV01_GATE0.json --baseline-sha YOUR_40_CHAR_GIT_COMMIT

Reports appear in governance/reports/evidence-gate0.json, evidence-gate0.md and the main acceptance campaign artifact. CI uploads the Gate 0 report and preserves HOLD status without fabricating approvals. --require-review-ready causes failure if even the metadata configuration package is incomplete; --require-approved always rejects until authentic external authority is established.

## Controlled source routing

GitHub: code, references, schemas, source version, non-sensitive status metadata.
Paid Google Drive: controlled CAD, raw field/lab reports, authentic approval artifacts.
Obsidian: [[USV-01 Evidence Index]] linked knowledge notes, not the authoritative geometry or unversioned numeric truth.

Current controlled Drive protocol index:
https://drive.google.com/file/d/1DrvQeFMUuXG3f9hJSHsuzitiOmd-0iVX/view

Do not commit actual sensitive hull files, user credentials, Ed25519 private keys, controlled operations data or private internal review reports to the public GitHub repository. Do not merge critical code changes by bypassing Stage C/D/E governance.
