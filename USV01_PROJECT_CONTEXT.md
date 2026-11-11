# USV-01 Project Context

**Context revision:** 0.1  
**Last updated:** 2026-11-11  
**Project state:** Preliminary engineering baseline definition

## Mission

Develop an unmanned surface vessel (USV-01). Mission definition, operational design domain, principal particulars, performance targets, payload definition and regulatory basis are not yet baselined. Treat these as **TBD** until supplied and approved by the project owner.

## Engineering disciplines

- SYS — Systems engineering and requirements
- NA — Naval architecture
- HYD — Hydrodynamics
- STR — Mechanical and structural engineering
- ELEC — Electrical and energy architecture
- PROP — Propulsion integration
- SWA — Software, autonomy and safe navigation
- VVT — Verification and validation
- INFRA — Engineering compute and development infrastructure

## Information ownership

- GitHub: source code, common project context, schemas and version history.
- Google AI Studio: Gemini-powered application development and future engineering assistance.
- ChatGPT: engineering analysis, research, independent review and verification planning.
- Obsidian: knowledge graph, linked notes, research notes, glossary and design knowledge.
- Google Drive: controlled documents, drawings, calculation reports and large files.
- Linear: issues and workstream execution.

## Core engineering rules

1. Never invent vessel dimensions, mass, speed, endurance, payload capacity, materials, electrical ratings, operating limits or acceptance criteria.
2. Use TBD when required inputs are absent.
3. Separate approved baseline, proposal, assumption, estimate and illustrative starter data.
4. Preserve units, coordinate frames, reference conditions, solver/software version and revision for every analysis.
5. Every requirement should be allocated to one or more subsystems and linked to a verification method.
6. Every design decision should record alternatives, rationale, consequences, owner and approval state.
7. Every simulation should record geometry/input revision, boundary conditions, assumptions, mesh/model quality, convergence checks and evidence.
8. Safety-critical conclusions require qualified human review, independent verification and appropriate physical testing.
9. AI-generated outputs are proposals until reviewed and approved by an authorized engineer.
10. No live vessel commands, actuator control, weapon-targeting or combat-payload functions are in scope for this Digital Lab.

## Compute context

The local development Mac is Apple Silicon with 8 GB unified memory. Use it for documentation, browser research, VS Code, Git, light Python analysis, KiCad and modest CAD. Heavy CFD, FEA and simulation should run on a separately validated remote Linux compute host. Google Cloud TPU access is reported, but TPU generation, host CPU/RAM/disk and actual provisioned configuration are not yet confirmed. Do not assume the TPU accelerator is a drop-in CFD/FEA GPU.

## Open baseline inputs

- Mission statement and CONOPS: TBD
- Operating area and environmental envelope: TBD
- Vessel type / hull concept: TBD
- Principal dimensions and displacement: TBD
- Speed, range and endurance: TBD
- Payload and equipment envelope: TBD
- Propulsion concept: TBD
- Energy source / storage concept: TBD
- Communications and navigation requirements: TBD
- Autonomy level and operator intervention concept: TBD
- Applicable rules, standards and flag / local authority basis: TBD
- Verification and acceptance criteria: TBD

Use stable IDs such as `USV-NA-001`, `ADR-002`, `RSK-001`, `SIM-001` and `VVP-001`. Obsidian notes should use `[[wikilinks]]`; controlled Google Drive documents should be cited by stable URL and revision.