# USV-01 Multi-Agent Digital Engineering Lab — Architecture Specification

## 1. Executive Summary

The **USV-01 Digital Engineering Lab** is a modular, deterministic multi-agent platform designed for the unmanned surface vessel design, simulation, and verification lifecycle. It integrates **26 specialist engineering agents**, a **central DAG orchestrator**, a **deterministic computational tool suite**, **immutable parameter memory**, and **strict human authority approval gates**.

---

**Operating authority boundary:** The [26-Agent Operating Charter v1.0 (proposed)](governance/USV01_26_AGENT_OPERATING_CHARTER_V1.md) specifies the intended division of authority, evidence classes, coupled-iteration acceptance criteria and open engineering blockers. It is a governance *proposal*, not implemented proof of 26-agent convergence, verified naval engineering, or vessel release. Current implementation limits remain described below.

## 2. Definitive 26-Agent Organization

The 26 canonical agents are organized into **8** source-defined functional divisions. This table is a documentation snapshot; the authoritative IDs, names, divisions, reporting lines, dependencies and permissions are in [`src/core/agents/definitions.ts`](../src/core/agents/definitions.ts). Historical role aliases do not confer current responsibilities.

| Agent ID | Agent Name | Division | Primary Speciality & Mandate | Reporting Supervisor |
| :--- | :--- | :--- | :--- | :--- |
| `LEAD-SYS-01` | Lead Systems Architect & Orchestrator | DIRECTORATE | System synthesis, workflow orchestration, trade studies | Engineering Director |
| `REQ-TRC-02` | Requirements & Traceability Engineer | REQUIREMENTS_BASELINE | Requirements hierarchy, bidirectional tracing | `LEAD-SYS-01` |
| `CONOPS-03` | Operational Profile & CONOPS Specialist | REQUIREMENTS_BASELINE | Environmental envelope, sea states, mission phases | `LEAD-SYS-01` |
| `REG-STD-04` | Marine Regulatory & Class Standards Specialist | REQUIREMENTS_BASELINE | IMO MASS code, DNV-RU-NAV, COLREGS statutory rules | `LEAD-SYS-01` |
| `HULL-GEO-05` | Hull Form & Parametric Geometry Specialist | NAVAL_ARCHITECTURE | Principal particulars (LOA, B, T), form coefficients ($C_B, C_{WP}$) | `LEAD-SYS-01` |
| `STAB-HYD-06` | Hydrostatics & Intact Stability Engineer | NAVAL_ARCHITECTURE | Transverse metacentric height ($GM_T$), $KB$, $BM_T$, GZ curve | `LEAD-SYS-01` |
| `RES-SEAK-07` | Hydrodynamic Resistance & Performance Engineer | NAVAL_ARCHITECTURE | Holtrop-Mennen, ITTC-57 skin friction, effective power ($P_E$) | `LEAD-SYS-01` |
| `MAN-MOT-08` | Seakeeping & Manoeuvring Dynamics Specialist | NAVAL_ARCHITECTURE | 6-DOF vessel motions, turning circle, dynamic stability | `LEAD-SYS-01` |
| `WGT-BAL-09` | Weight Distribution & Mass Balance Engineer | NAVAL_ARCHITECTURE | SWBS weight groups, centers of gravity ($KG, LCG, TCG$) | `LEAD-SYS-01` |
| `STR-MAT-10` | Hull Structural Scantlings & Composites Engineer | STRUCTURES_MECHANICAL | Bottom slamming pressure ($P_{slam}$), plating thickness, section modulus | `LEAD-SYS-01` |
| `ENV-ENV-11` | Marine Environmental & Thermal Specialist | STRUCTURES_MECHANICAL | Thermal dissipation, marine corrosion, cathodic protection | `LEAD-SYS-01` |
| `MECH-APP-12` | Mechanical Appendages & Deck Equipment Engineer | STRUCTURES_MECHANICAL | Lifting lugs, sensor masts, LARS dynamic factors | `LEAD-SYS-01` |
| `PROP-ENG-13` | Propulsion Plant & Drivetrain Engineer | POWER_PROPULSION | Waterjets, propellers, electric motor torque curves, shaft power ($P_B$) | `LEAD-SYS-01` |
| `ELEC-PWR-14` | Electrical Architecture & Microgrid Engineer | POWER_PROPULSION | DC bus distribution (24V/48V/HV), continuous load balance | `LEAD-SYS-01` |
| `INDEP-CRIT-15` | Independent Technical Critic | SYSTEMS_VVT | Cross-disciplinary assumptions challenge, calculation critique, safety evidence review | Engineering Director |
| `SENS-PER-16` | Perception & Sensor Suite Integration Specialist | AUTONOMY_ELECTRONICS | Radar, 3D LiDAR, EO/IR cameras, AIS, blind-zone analysis | `LEAD-SYS-01` |
| `NAV-COL-17` | Navigation & COLREGS Collision Avoidance Specialist | AUTONOMY_ELECTRONICS | Rules 13, 14, 15 encounter vectors, CPA/TCPA, course alteration | `LEAD-SYS-01` |
| `TEST-DIR-18` | Test & Verification Director | SYSTEMS_VVT | Verification matrix, test protocols, FAT, basin/harbor trial evidence scrutiny | Engineering Director |
| `COMM-RF-19` | Comms, RF & Telemetry Specialist | AUTONOMY_ELECTRONICS | COMSAT, 4G/5G private cellular, RF link budget, comms-loss timer | `LEAD-SYS-01` |
| `CYBER-SEC-20` | Cyber-Physical Marine Security & Safe-State Engineer | AUTONOMY_ELECTRONICS | Anti-spoofing GNSS, bus air-gapping, hardware E-stops | `LEAD-SYS-01` |
| `ICD-ENG-21` | Interface Control Document (ICD) Engineer | SYSTEMS_VVT | Mechanical/electrical/data schemas, NMEA 2000, pinouts | `LEAD-SYS-01` |
| `FMEA-RSK-22` | FMEA & System Safety Specialist | SYSTEMS_VVT | Failure Modes and Effects Analysis, RPN scoring, single points of failure | `LEAD-SYS-01` |
| `INDEP-REV-23` | Independent Design Reviewer (Challenger / Red Team) | SYSTEMS_VVT | Independent recalculation, assumption challenge, anomaly detection | Engineering Director |
| `VVT-VAL-24` | Verification, Validation & Test Specialist | SYSTEMS_VVT | Test procedures (VVP-001...), sea trials, acceptance metrics | `LEAD-SYS-01` |
| `DOC-OBS-25` | Documentation, BOM & Obsidian Knowledge Specialist | OPERATIONS_DELIVERABLES | Bill of materials, Obsidian [[wikilink]] graph exports, technical reports | `LEAD-SYS-01` |
| `INTEL-USV-26` | Global Navy USV Fleet Intelligence & Benchmark Analyst | OPERATIONS_DELIVERABLES | Multi-source open-source scraping, fleet database, competitor benchmarking | `LEAD-SYS-01` |

---

## 3. Core Framework Components

### 3.1 Base Agent & Execution Engine
Every agent is an instance of `BaseAgent`, governed by:
- Strict **Zod input and output schema validation**.
- Enforced **tool permission checking** before execution.
- Automated invocation of mandatory deterministic calculation tools.
- Capture of **traceable assumptions** and **open TBD items**.
- Automatic routing to Human Approval Gates when safety-critical thresholds are touched.

### 3.2 Central Orchestrator & Task DAG
- The `CentralOrchestrator` schedules tasks using **topological sort** on the Directed Acyclic Graph (DAG).
- Independent tasks in the same topological stage execute in parallel.
- Output from parent tasks automatically feeds into child tasks.
- Cycles in task dependencies are caught and rejected prior to execution.

### 3.3 Current iteration boundary

A DAG-ordered 26-agent campaign demonstrates specialist handoffs on supplied tasks; it does **not** establish an autonomous, repeated 26-agent vessel-design cycle. The implemented `AgentDesignLoop` is a bounded A01 lead-architect proposal → deterministic preliminary hydrostatics/resistance screen → A15 technical critique → A01 revision workflow (up to five cycles). A real 26-role iterative concept-to-design-to-validation loop, 3D geometry/simulation synchronization and independent engineering acceptance are separate, currently unverified capabilities. See [`AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md`](AGENT_DESIGN_LOOP_AND_SOLVER_PROTOCOL_20261113.md) and [`AGENT_READINESS_20261114.md`](AGENT_READINESS_20261114.md).

### 3.4 Separation of Deterministic Engineering from LLM Inference
Engineering calculations are executed exclusively through validated, deterministic algorithms:
1. `TOOL-HYDROSTATICS-01`: Simpson / Morrish hydrostatics ($KB, BM_T, KM_T, GM_T$, intact stability status).
2. `TOOL-RESISTANCE-01`: ITTC-57 friction, residual resistance, Froude number ($Fn$), effective towing power ($P_E$), and brake power ($P_B$).
3. `TOOL-MASS-BALANCE-01`: SWBS group mass summation, composite center of gravity ($KG, LCG, TCG$), and design growth margin accounting.
4. `TOOL-ELECTRICAL-01`: Continuous, peak, and emergency DC load sheets with battery endurance hours.
5. `TOOL-STRUCTURES-01`: ISO 12215-5 / DNV-RU-HSLC bottom slamming design head ($P_{slam}$) and minimum plating thickness.
6. `TOOL-COLREGS-01`: Analytical vector kinematics for CPA, TCPA, and COLREGS Rules 13, 14, and 15 encounter geometry.

---

## 4. Human Authority & Safety Air-Gap

The platform implements cryptographic and role-based authority rules:
- **No Direct Vessel Control:** The system contains zero actuator drivers or physical command write-paths.
- **Human Authority Gate:** Safety-critical tasks transition to `WAITING_HUMAN_APPROVAL`. Only authenticated users holding the `ENGINEERING_DIRECTOR` role can approve or reject baseline changes.
- **Immutable Parameter Tracking:** Unknown vessel particulars remain tagged as `TBD`. Revisions create immutable new records with audited rationale.
