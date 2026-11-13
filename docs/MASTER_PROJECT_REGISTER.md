# USV-01 Naval Digital Lab — Master Project Register

**Control ID:** USV-LAB-MPR-001 · **Action:** Recovery Plan A02 · **First prepared:** 2026-11-14 (IST)  
**Accountable owner:** Project Lead (human) · **Register custodian:** ChatGPT/Codex project coordination · **Change authority:** protected GitHub PR governance  
**Source-of-truth repository:** [ravisinghrathode/usv-01-digital-lab](https://github.com/ravisinghrathode/usv-01-digital-lab) · default branch `main` (PUBLIC, source-code only)  
**Audit cut-off / pinned source snapshot:** [`c8cd756168f3ed8698b16fa73426dcb33e564708`](https://github.com/ravisinghrathode/usv-01-digital-lab/commit/c8cd756168f3ed8698b16fa73426dcb33e564708). This SHA records the **source audited to prepare the register**, not the SHA after this register merges. Recheck live PR/CI status before each decision.

> **Authority boundary:** This is the single **project coordination and action tracking index**, not an engineering calculation, vessel baseline, independent review, signed ECR, deployment attestation or certification. Follow links to their own authoritative artifacts. A successful software check, a merged PR, an agent response or an administratively closed issue does **not** close a naval engineering acceptance gate.

## 1. Single-page situation report (snapshot)

| Dimension | Evidence-based current state | Next proof needed |
|---|---|---|
| GitHub source | Protected public `main`, audited at SHA above; required `Deterministic Quality & Governance Gate` check and admin enforcement were previously verified | Reconfirm exact head and successful required check after this register is merged |
| Recent main CI | [Run 43519261425](https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/43519261425): required deterministic/governance **job succeeded**; optional real OpenFOAM job was cancelled, so the enclosing **workflow concluded cancelled** | Preserve truthful job/workflow distinction; do not claim entire run successful |
| Open development PRs at audit | [#78 Repository Scout](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/78) and [#79 OpenFOAM manual opt-in](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/79), both open at audit | Separate reviews/CI/merge decisions; **neither is an A02 dependency or permission to auto-merge** |
| Lab software | 26 canonical registered roles, DAG orchestrator, Mission Control implementation, bounded A01/A15 design iteration, deterministic naval screens and simulated/synthetic tests in source | Verify trusted-host operation, actual 26-role live provider/tool campaign, current-source attestation, deployment and independent performance |
| Agent tool coverage | Prior readiness: 12 registered deterministic tools; 10 mandatory tool calls passed synthetic preflight; 11 roles have first-order executable numerical screens; others primarily review/advisory | Current-revision preflight/live evidence with real controlled inputs, then discipline-specific validation |
| Agent validation | Historical 26/26 live Codex run tied to an **older** commit; current-revision live campaign not established in audit; **0/26 independently accepted** in readiness record | Same-SHA authenticated traces + signed trusted-host evidence + qualified independent reference reviews |
| Vessel configuration | **GATE 0 HOLD:** historical ~11.2 m / ~6.2 tonne Rev 0.4 and separate proposed ~2.5 m / 120 kg concept are **distinct unapproved alternatives** | Project Lead concept authority, source-identified mission, independently controlled CAD/offsets and mass/CG dossier |
| Engineering release | **HOLD / NOT AUTHORIZED** for hydrostatics, propulsion, structures, autonomy, marine systems and overall vessel | Qualified external evidence, physical tests where applicable, independent review and exact-baseline Engineering Director authorization |
| Integration | GitHub verified; Drive connectivity previously observed only partially; Obsidian, Google AI Studio live SHA sync and production deployment unverified | Authenticated, source-pinned and documented end-to-end probes |
| Public disclosure | Owner decided **public source-only**; [PR #77](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/77) corrected README; GitHub secret scanning and push protection enabled | Publication review for sensitive historical content; no automatic publication of controlled Drive/Obsidian data |

**Do not convert** the above partial software evidence into a percentage of verified vessel engineering. The 13-workstream campaign is grouped into 13 workstreams, while the [Consolidated Acceptance Register](CONSOLIDATED_ACCEPTANCE_REGISTER.md) enumerates **15 criterion IDs** across those groups.

## 2. Project boundary and authority

| Track | Purpose | Source authority | NOT established merely by code merge |
|---|---|---|---|
| **LAB** — enabling platform | 26-agent workflows, engineering utilities, research/iteration, simulation adapters, Mission Control, cybersecurity, connectors, deployment | This repository's reviewed source + exact-SHA CI + commissioned host evidence | A live deployed service, validated computational model or an approved vessel |
| **USV** — vessel development | First-principles mission research, requirements, competing configurations, geometry/mass/physics, engineering verification, testing, concept selection | Independently authenticated vessel configuration & controlled evidence, qualified reviewers, authorized Engineering Director | Approved dimensions, performance, safe operations or a released design |
| **ASSURANCE** — independent challenge | Governance, provenance, risk, peer reviews, testing, evidence gates | Protected software CI plus separately qualified independent reviewer/Director signatures for vessel release | AI reviewing the same AI as an independent engineering witness |

**Design intent:** The 26 specialist agents **use** the lab to research and engineer projects from first principles, evaluate alternatives and iterate; the swarm is not principally being asked to build the lab itself. The current complete autonomous 26-agent, multidisciplinary repeat-and-converge design capability is **NOT DEMONSTRATED**. The implemented `AgentDesignLoop` is bounded A01 proposal / A15 critique with preliminary deterministic screens, not that end state. See [architecture](ARCHITECTURE.md), [operational acceptance](USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md), and [laboratory versus engineering gates](LAB_COMMISSIONING_PROTOCOL.md).

**Approved storage boundary:** GitHub PUBLIC source and sanitized non-sensitive evidence indexes; paid Google Drive for access-controlled engineering drawings, reports and large artifacts; Obsidian for linked knowledge graph. Links to private sources must use stable IDs/revisions and **must not expose** secrets or private document contents. Claimed integration must be verified; configuration alone is not an authenticated roundtrip.

## 3. State vocabulary and evidence hierarchy

- **VERIFIED:** completion requirements met by cited evidence pinned to an exact source/configuration; in the LAB track, this does **not** imply USV engineering release.
- **IMPLEMENTED / UNCOMMISSIONED:** code/tests/interfaces exist, but required live, external, deployed or independently verified evidence is absent.
- **ACTIVE:** an authorized task or PR is underway; not complete.
- **PLANNED:** sequenced work not yet started in this 15-action recovery plan, regardless of pre-existing code.
- **BLOCKED:** required source data, qualified reviewer, host, human authority, or acceptance evidence absent.
- **HOLD:** explicit fail-closed release decision. It persists until the named independent approval/physical gate clears it.
- **HISTORICAL / ADMIN-CLOSED:** evidence from an old SHA or a closed tracker. Not present-tense acceptance.

Evidence grades: **E0** plan/claim → **E1** source/test code → **E2** exact-SHA CI and deterministic synthetic proof → **E3** actual authenticated model/host/deployment execution → **E4** externally sourced and qualified independently verified engineering evidence → **E5** authorized exact-configuration human release. Grades are a *tracking convention*, not a replacement for domain acceptance criteria or a claim that each grade implies the next.

## 4. Fifteen-action recovery plan — do one action at a time

**Sequence rule:** Do not advance until the named action has a documented closure check. **A01 and A02 are VERIFIED COMPLETE.** A02's initial snapshot was recorded before its protected merge; the independently checked closure is in the dated update below. **A03 was selected by the Project Lead and is ACTIVE while its source audit is under protected PR review; A04 remains PLANNED.**

| ID / phase | Action and accountable lead | Snapshot status | Specific closure test / evidence |
|---|---|---|---|
| **A01 / Recovery** | Confirm GitHub baseline — ChatGPT / Project Lead | **VERIFIED (source baseline audit)** | Exact `main` SHA, PR/issue inventory, required branch protections and main governance CI; public-source policy. [PR #70](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/70), [#77](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/77), [#76](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/76). Historical engineering HOLD retained. |
| **A02 / Recovery** | **Create Master Project Register** — ChatGPT/Codex custodian, Project Lead | **VERIFIED (14 Nov 2026)** | [PR #81](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/81) merged into protected `main` at [`038c4d2`](https://github.com/ravisinghrathode/usv-01-digital-lab/commit/038c4d2dfb384051c3203943672cc4a3abd29df8); README link verified; exact-main deterministic governance gate [PASS](https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/43520682981). |
| **A03 / Recovery** | Audit architecture / deployed and undeployed modules — Codex + engineering lead | **ACTIVE — source audit prepared; publication verification pending** | [A03 module audit](ARCHITECTURE_MODULE_AUDIT_20261114.md): 20 source-bound module inventory entries, 10 tracked architecture risks, dependency and acceptance map. Close only after protected PR merge, exact-head main governance CI PASS and report link verification; engineering HOLD unchanged. |
| **A04 / Lab** | Verify trusted execution host — authorized operator / platform engineer | PLANNED | Authenticated Codex CLI, clean exact-SHA checkout, permissions, configured host and bounded resource/security preconditions. |
| **A05 / Lab** | 26-agent deterministic preflight — Codex / verification lead | PLANNED | Same-SHA 26 valid role envelopes, mandatory tool preflight, zero unreported blockers, no mock evidence promoted to live. |
| **A06 / Lab** | Current-source live research-only 26-agent campaign — authorized operator / agent lead | PLANNED | 26 actual authenticated Codex responses, dependency traces, tool inputs/outputs, full failures/limits, source SHA, controlled catalog and non-actuating scope. |
| **A07 / Lab** | Host attestation and Mission Control persistence — platform/assurance | PLANNED | Fresh signed host-health proof, current campaign evidence, restart/restore tests, actual dashboard/readiness and non-replayable trace correlation. |
| **A08 / Knowledge** | Verify Drive/Obsidian interfaces — integration owner | PLANNED | Scoped authenticated Drive create/read/hash/ACL/revoke probe, Obsidian wikilink roundtrip/conflict, explicit stale-sync behavior; record permissions without leaking contents. |
| **A09 / Vessel** | Separate and reconcile candidate vessel identities — Project Lead + naval architect | PLANNED / **USV GATE 0 HOLD** | Controlled mission & alternatives; never mix 2.5 m/120 kg with Rev 0.4 11.2 m/6.2 t. Project Lead selection or explicit HOLD; source-verified CAD/CG and named authority. |
| **A10 / Vessel** | Requirements and parameter authority — systems engineer + engineering lead | PLANNED / BLOCKED | Machine-readable units/frames/assumption provenance, source-linked requirements and V&V, disciplined TBD register, approved acceptance criteria and mass/CG ledger. |
| **A11 / Vessel** | CAD/3D design-to-calculation binding — naval architecture + CAD lead | PLANNED / BLOCKED | Real controlled geometry revision, mass-property extraction, exact-ID simulation binding and change propagation. Illustrative UI rendering cannot count. |
| **A12 / Vessel** | Validate disciplinary engineering tools — independent specialists | PLANNED / BLOCKED | Qualified hydrostatics/stability, resistance/powering, structures/FEA, electrical/thermal, marine integration, autonomy safety benchmark data and uncertainty. |
| **A13 / Assurance** | 13-workstream external evidence campaign — V&V lead | PLANNED / BLOCKED | All 13 WS-01…13 mapped to 15 detailed criteria, raw independent external evidence, applicable SIL/HIL/physical tests, traceable source digest. |
| **A14 / Assurance** | Independent challenge + formal release disposition — qualified independent reviewer / Engineering Director | PLANNED / **USV RELEASE HOLD** | Genuine independent signed reviews, engineering safety case, exact-digest Director ECR, recorded release decision; keep HOLD if any requirement missing. |
| **A15 / Operations** | Routine traceable project status — Project Lead + coordinator | PLANNED | Evidence-linked Mission Control status from a deployed/persisted system; owner/decision/blocker register and next authorized action refreshed from current GitHub baseline. |

These are **recovery-action closure states**, not a claim that no software for A03–A15 exists. Each action can have implemented components while its *verification* remains PLANNED or BLOCKED.

## 5. Engineering and platform workstreams (authoritative acceptance details linked)

The [15 acceptance criteria](CONSOLIDATED_ACCEPTANCE_REGISTER.md) are collected into the following 13 evidence campaign workstreams, defined in [Gate 0 implementation](EVIDENCE_ACQUISITION_DECISION_IMPLEMENTATION.md). Entries below deliberately record **unverified** status unless the specific criterion has qualifying evidence.

| Workstream | IDs / track | Current evidence class and blocker | Responsible discipline |
|---|---|---|---|
| WS-01 | AGT-01 / LAB | E1–E2 role registration and synthetic tests; **current exact-source live and host attestation missing** | Agent runtime |
| WS-02 | AGT-02 / LAB+ASSURANCE | Historical live runs; **0/26 independent engineering truth reviews** | Domain V&V / independent reviewers |
| WS-03 | HYD-01 / USV | Hydrostatic screening implementation; actual approved offsets, measured mass/KG, GZ/downflooding and independent correlation absent — **HOLD** | Naval architect / stability reviewer |
| WS-04 | RES-01 / USV | Preliminary resistance/power checks; installed propulsion maps, measured curves, uncertainty and sea-trial correlation absent — **HOLD** | Hydrodynamics / propulsion |
| WS-05 | STR-01 / USV | Structural screening and restricted FEA worker path; real envelope/material/mesh/proof/correlation evidence absent — **HOLD** | Structures engineer |
| WS-06 | AUT-01 / USV | Non-actuating synthetic COLREG/SIL screens; closed-loop SIL, actual HIL, qualified navigator review and sea trials absent — **HOLD**. [Historical nonconformance #43](https://github.com/ravisinghrathode/usv-01-digital-lab/issues/43) was administratively closed, not technically released. | Autonomy safety / independent navigator |
| WS-07 | MAR-01 / USV | L&R, thermal sealed hull, wet-end acoustic, fouling/corrosion, bilge-condensation dossier and physical witnesses absent — **HOLD**. [MAR-01 detailed register](MAR01_ENGINEERING_CLOSEOUT_REGISTER_20261113.md). | Marine systems / naval structure |
| WS-08 | INT-01 / LAB | Deployed Google AI Studio application and exact source SHA/auth boundary not observed — **BLOCKED** | Integration/platform |
| WS-09 | INT-02 / LAB | Partial Drive connectivity observed, no controlled end-to-end roundtrip/role/revocation/conflict closeout — **BLOCKED** | Data governance / integration |
| WS-10 | INT-03 / LAB | Obsidian local vault/link graph roundtrip and durable sync conflict handling not verified — **BLOCKED** | Knowledge architecture |
| WS-11 | SEC-01, SEC-02 / LAB | Automated security tests, GitHub secret scanning/push protection; independent security review, deployment intrusion tests, immutability/ACL proof outstanding | DevSecOps / independent security reviewer |
| WS-12 | GOV-01, GOV-02 / ASSURANCE | Software route enforcement active; independent reviewer and exact-vessel-digest Director ECR missing — **HOLD** | Independent reviewer / Engineering Director |
| WS-13 | DEP-01 / LAB | Application source/build present; live URL/source SHA, TLS/auth, monitoring, persist/restore and rollback test not externally verified | Platform operator |

## 6. Active blocker, decision and risk register

| Record / priority | Owner | Problem / controlled response | Evidence needed to close |
|---|---|---|---|
| **BLK-01 / P1** | Project Lead + naval architect | No authenticated selected vessel baseline; incompatible 2.5 m and Rev 0.4 concepts. **Gate 0 HOLD**. [Project context](../USV01_PROJECT_CONTEXT.md) | Unique vessel ID, source/units, controlled CAD/offsets, mass/CG and formal documented decision |
| **BLK-02 / P1** | Agent runtime / operator | No same-current-SHA 26-role signed live commissioning record; historical output only. [Readiness](AGENT_READINESS_20261114.md) | Authenticated host + exact-SHA preflight, live matrix, signed health |
| **BLK-03 / P1** | Independent V&V | 0/26 roles independently accepted; synthetic tool results not validation | Qualified independent evidence per role with traceable input and output digest |
| **BLK-04 / P1** | Engineering Director / independent naval reviewers | Physical/stability, CFD/FEA, SIL/HIL and supplier/sea-trial evidence incomplete; vessel RELEASE **HOLD** | WS-03–07/12/13 evidence, independent qualified review and signed release |
| **BLK-05 / P2** | Platform operator | No verified production deployment or fresh signed Mission Control attestation | DEP-01 controls, hosted SHA, TLS/auth, backup/restore |
| **BLK-06 / P2** | Integration owner | Drive/Obsidian/Google AI Studio interfaces lack complete live roundtrip evidence | WS-08–10 secure tests, ACL checks, sync conflicts and receipts |
| **BLK-07 / P2** | DevSecOps / owner | Repository intentionally public; current-content screening and native secret scanning are **not exhaustive retrospective disclosure clearance** | Approved publication classification and controlled handling of any discovered exposure; [Issue #73](https://github.com/ravisinghrathode/usv-01-digital-lab/issues/73) administratively closed |
| **BLK-08 / P2** | CI maintainer | OpenFOAM known-case job was triggered automatically and repeatedly; runs cancelled. [PR #79](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/79) proposes **manual opt-in**, review pending at audit | Protected workflow change reviewed/merged; next routine PR/push demonstrates governance runs without automatic OpenFOAM |
| **BLK-09 / P3** | Project Lead / software reviewer | [PR #78](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/78) proposes optional read-only Repository Scout, not a 27th naval agent; unmerged | Source-security review, exact-head CI and clear unverified third-party boundary |
| **BLK-10 / governance watch** | Project Lead / security reviewer | [PR #74](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/74) was closed unmerged under owner instruction; Stage E has `ENFORCE_HUMAN_APPROVALS = true` from [PR #70](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/70). Historical unsafe merge and admin closure do not mean retrospective acceptance. | Keep current protection fail-closed; any future code hardening must pass its own authorized PR. Engineering HOLD unaffected. |

**Priority labels** describe sequencing, not permission to undertake A03+ before A02 closure. Never “fix” missing physical or qualified evidence by changing acceptance flags.

### Recorded decisions (not inferred approvals)

| ID | Decision | Evidence / limitations |
|---|---|---|
| DEC-01 | The 26-agent swarm will use the lab to engineer projects from first principles, with iterative research, cross-discipline physics and human gates | Project Lead direction; current 26-agent fully iterative capability remains unproven |
| DEC-02 | GitHub repository remains **PUBLIC source-code only**; controlled engineering records live outside public Git | Owner direction, [PR #77](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/77), README |
| DEC-03 | Current agent provider route is signed-in ChatGPT/Codex CLI, subscription-only for authorized research; no automatic paid provider fallback | [PR #67](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/67), [lab commissioning protocol](LAB_COMMISSIONING_PROTOCOL.md); independent engineering review remains separate |
| DEC-04 | Historical Rev 0.4 physical inputs and browser UI presets must not imply approved design | [PR #76](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/76); actual configuration still HOLD |
| DEC-05 | Production vessel release requires authoritative evidence, independent review and Engineering Director approval; simulated outputs do not suffice | [Acceptance Register](CONSOLIDATED_ACCEPTANCE_REGISTER.md), [Gate 0](EVIDENCE_ACQUISITION_DECISION_IMPLEMENTATION.md) |
| DEC-06 | B02/#72 and B03/#73 were administratively closed on owner's instruction. No retroactive engineering or disclosure certification is implied | [#72](https://github.com/ravisinghrathode/usv-01-digital-lab/issues/72), [#73](https://github.com/ravisinghrathode/usv-01-digital-lab/issues/73) |

## 7. Next authorized move and register maintenance

**A02 completion was verified on 14 November 2026:** the register was merged on protected `main` in PR #81, the README points to it, and the required governance job passed at its exact merge SHA. **The Project Lead selected A03 (architecture/module audit) on 14 November 2026; it is now ACTIVE under a controlled documentation PR.** Do not automatically begin A03, solver commissioning, a vessel campaign or a live 26-agent run.

At every subsequent authorized action: (a) read the latest `main` SHA and PR/CI/issue status; (b) preserve this file's prior dated snapshot and add a dated delta for materially changed decisions; (c) update the action's status and closure evidence via protected PR; (d) cross-link the underlying technical/engineering register rather than copying private artifacts into public GitHub; (e) reject stale-head, unqualified or non-independent “success” evidence.

### Dated completion and change log

| Date (IST) | Control event | Evidence / disposition |
|---|---|---|
| 2026-11-14 | **A02 VERIFIED COMPLETE** — initial register publication | [PR #81](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/81) merged at exact main SHA [`038c4d2dfb384051c3203943672cc4a3abd29df8`](https://github.com/ravisinghrathode/usv-01-digital-lab/commit/038c4d2dfb384051c3203943672cc4a3abd29df8); required [Deterministic Quality & Governance Gate job](https://github.com/ravisinghrathode/usv-01-digital-lab/actions/runs/43520682981/job/132213855572) succeeded, README link and register present on `main`. This entry updates the original A02 **pre-merge** status, not the underlying historical source audit cut-off. |
| 2026-11-14 | CI housekeeping | The separately triggered OpenFOAM jobs in PR #81 and the resulting `main` push had cancellation requests accepted **after** both required governance jobs passed. A cancelled overall workflow is not a failed required governance check, and a solver known case is not vessel certification. [PR #79](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/79) proposes making OpenFOAM commissioning manual opt-in; review/merge status must be checked live. |
| 2026-11-14 | Post-snapshot governance watch | [PR #80](https://github.com/ravisinghrathode/usv-01-digital-lab/pull/80) was opened after the pinned A02 audit snapshot and proposes removal of the optional Stage E human-approval switch. It is a distinct protected-software change and **not** accepted until separately authorized and merged. |
| 2026-11-14 | Action sequencing | **A01  verified + A02 verified = 2 of 15 recovery actions complete as of this prior snapshot; A03 is ACTIVE pending source-audit PR merge.** A03 remains PLANNED. Existing engineering RELEASE / Gate 0 HOLDs remain. |

### Canonical supporting references

- [README and current operational boundary](../README.md) · [architecture](ARCHITECTURE.md) · [agents' authoritative definitions](../src/core/agents/definitions.ts)
- [Lab readiness](AGENT_READINESS_20261114.md) · [26-agent acceptance](USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md) · [lab/engineering authorization](LAB_COMMISSIONING_PROTOCOL.md)
- [Engineering acceptance criteria](CONSOLIDATED_ACCEPTANCE_REGISTER.md) · [Gate 0 + 13 workstreams](EVIDENCE_ACQUISITION_DECISION_IMPLEMENTATION.md) · [vessel identity](../USV01_PROJECT_CONTEXT.md)
- [Marine systems hold](MAR01_ENGINEERING_CLOSEOUT_REGISTER_20261113.md) · [commissioning runbook](COMMISSIONING_RUNBOOK.md) · [partial integration observations](LIVE_COMMISSIONING_AND_EVIDENCE_INPUTS.md)

**No manufacturing, launch, autonomous vessel operation or safety-critical actuator control is authorized by this register.**
