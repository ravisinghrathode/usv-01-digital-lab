---
title: "USV Fleet Intel: Sea Hunter"
tags:
  - usv-fleet
  - naval-intelligence
  - united states
  - asw
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[Sea Hunter]] — United States Navy (Surface Development Squadron 1 / SURFDEVGRU 1)

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[United States Navy (Surface Development Squadron 1 / SURFDEVGRU 1)]] (United States)
> **Primary Role:** [[ASW]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 40 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 14.5 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 2 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 145 tonnes (145,000 kg) | Full Load Seawater |
| **Payload Capacity** | 20,000 kg | Mission Equipment Envelop |
| **Hull Form** | `Trimaran` | Hydrodynamic Architecture |
| **Structural Material** | Carbon composite core with carbon fiber sandwich | Scantling Standard |
| **Operating Sea State** | NATO Sea State 5 (Survival: Sea State 7) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** Twin MTU / Cummins Tier 4 turbocharged marine diesel engines
- **Total Power Output:** **2200 kW** ($P_B$)
- **Propulsion Unit:** `Fixed Pitch Propeller`
- **Max Speed:** **27 knots**
- **Cruising Speed:** **12 knots**
- **Operational Range:** **10,000 nautical miles**
- **Mission Endurance:** **1680 hours** (70 days)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** CARACaS (Control Architecture for Robotic Agent Command and Sensing) and Sparse Optimal Control for fully autonomous multi-month transits.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8 (Action to Avoid), Rule 13 (Overtaking), Rule 14 (Head-on), Rule 15 (Crossing), Rule 16 (Give-way)
- **C2 Datalinks:** Wideband SATCOM (Inmarsat/Ku-band), UHF LOS Datalink, COFDM Tactical Mesh, Link 16 Relay
- **Surface Radar:** Dual Furuno NavNet 3D X-Band & S-Band solid-state marine radar
- **Optronics / EO-IR:** Flir SeaFLIR 380-HD multi-spectral thermal & HD daylight imaging turret
- **Sonar Suite:** Modular Scalable Sonar System (MS3) hull-mounted high-frequency active array, towed variable depth sonar (VDS)
- **LiDAR:** Dual 360-degree Velodyne marine LiDAR scanners
- **Electronic Warfare:** Passive ESM RF receiver and AIS interrogator

---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Autonomous persistent ASW continuous tracking suite, sonobuoy launch and data processing, acoustic communications gateway for friendly SSNs.


- **ASW Equipment:** Modular Scalable Sonar System (MS3), Towed passive hydrophone array, Sonobuoy acoustic telemetry receiver

---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Autonomous Continuous Trail Unmanned Vessel (ACTUV) Sea Trials & Long-Range Autonomy Verification]]
- **Authors:** Littlefield, S., Rector, J., Sloan, A.
- **Publication:** *Naval Surface Warfare Center & DARPA Tactical Technology Office (DTIC Tech Report ADA639148)* (2018)
- **DOI / Reference:** [10.21236/ADA639148](https://apps.dtic.mil/sti/citations/ADA639148)
- **Key Empirical Finding:** Trimaran outrigger configuration maintained intact stability through Sea State 5 with GM_T exceeding 4.2m.
- **Governing Formula:** $\text{GM}_T = KB + BM_T - KG = KB + \frac{I_{xx}}{\nabla} - KG$

### [[Nonlinear Dynamic Modeling and Heading Control of Unmanned Marine Craft Under Environmental Disturbances]]
- **Authors:** Fossen, T. I., Perez, T.
- **Publication:** *Annual Reviews in Control, Vol. 48* (2019)
- **DOI / Reference:** [10.1016/j.arcontrol.2019.05.001](https://doi.org/10.1016/j.arcontrol.2019.05.001)
- **Key Empirical Finding:** Nomoto 1st-order and 2nd-order steering transfer functions accurately predict USV turning rate under waterjet and twin-propeller differential thrust.
- **Governing Formula:** $M\dot{\nu} + C(\nu)\nu + D(\nu)\nu + g(\eta) = \tau_{\text{prop}} + \tau_{\text{wave}} + \tau_{\text{wind}}$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `0.9x`
- **Endurance Ratio:** `7x`
- **Displacement Ratio:** `12x`
- **Engineering Assessment:** Sea Hunter establishes the gold standard for global long-range autonomous open-ocean endurance and COLREGS rule compliance.
- **Design Recommendation for USV-01:** Adopt Sea Hunter trimaran outrigger cross-structure dampening principles if USV-01 mission profile transitions to high sea-state open-ocean ASW.
