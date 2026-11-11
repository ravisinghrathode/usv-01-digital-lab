# USV-01 Multi-Agent Digital Engineering Lab — Architecture Specification

## 1. Executive Summary

The **USV-01 Digital Engineering Lab** is a modular, deterministic multi-agent platform designed for the unmanned surface vessel design, simulation, and verification lifecycle. It integrates **25 specialist engineering agents**, a **central DAG orchestrator**, a **deterministic computational tool suite**, **immutable parameter memory**, and **strict human authority approval gates**.

---

## 2. Definitive 25-Agent Organization

The 25 agents are organized into 7 functional divisions:

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
| `BATT-ESS-15` | Energy Storage System & Battery Safety Engineer | POWER_PROPULSION | Lithium chemistry (LFP), BMS telemetry, thermal runaway safety | `LEAD-SYS-01` |
| `SENS-PER-16` | Perception & Sensor Suite Integration Specialist | AUTONOMY_ELECTRONICS | Radar, 3D LiDAR, EO/IR cameras, AIS, blind-zone analysis | `LEAD-SYS-01` |
| `NAV-COL-17` | Navigation & COLREGS Collision Avoidance Specialist | AUTONOMY_ELECTRONICS | Rules 13, 14, 15 encounter vectors, CPA/TCPA, course alteration | `LEAD-SYS-01` |
| `AUTO-EXEC-18` | Autonomy State Executive Engineer | AUTONOMY_ELECTRONICS | Finite State Machine (FSM), mission modes, operator overrides | `LEAD-SYS-01` |
| `COMM-RF-19` | Comms, RF & Telemetry Specialist | AUTONOMY_ELECTRONICS | COMSAT, 4G/5G private cellular, RF link budget, comms-loss timer | `LEAD-SYS-01` |
| `CYBER-SEC-20` | Cyber-Physical Marine Security & Safe-State Engineer | AUTONOMY_ELECTRONICS | Anti-spoofing GNSS, bus air-gapping, hardware E-stops | `LEAD-SYS-01` |
| `ICD-ENG-21` | Interface Control Document (ICD) Engineer | SYSTEMS_VVT | Mechanical/electrical/data schemas, NMEA 2000, pinouts | `LEAD-SYS-01` |
| `FMEA-RSK-22` | FMEA & System Safety Specialist | SYSTEMS_VVT | Failure Modes and Effects Analysis, RPN scoring, single points of failure | `LEAD-SYS-01` |
| `INDEP-REV-23` | Independent Design Reviewer (Red Team) | SYSTEMS_VVT | Independent recalculation, assumption challenge, anomaly detection | Engineering Director |
| `VVT-VAL-24` | Verification, Validation & Test Specialist | SYSTEMS_VVT | Test procedures (VVP-001...), sea trials, acceptance metrics | `LEAD-SYS-01` |
| `DOC-OBS-25` | Documentation, BOM & Obsidian Knowledge Specialist | OPERATIONS_DELIVERABLES | Bill of materials, Obsidian [[wikilink]] graph exports, technical reports | `LEAD-SYS-01` |

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

### 3.3 Separation of Deterministic Engineering from LLM Inference
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
