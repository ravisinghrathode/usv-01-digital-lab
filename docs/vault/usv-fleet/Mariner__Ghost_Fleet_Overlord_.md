---
title: "USV Fleet Intel: Mariner (Ghost Fleet Overlord)"
tags:
  - usv-fleet
  - naval-intelligence
  - united states
  - multi_mission
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[Mariner (Ghost Fleet Overlord)]] — United States Navy (Surface Development Squadron 1)

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[United States Navy (Surface Development Squadron 1)]] (United States)
> **Primary Role:** [[MULTI_MISSION]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 59.1 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 10.4 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 3.2 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 673 tonnes (673,000 kg) | Full Load Seawater |
| **Payload Capacity** | 120,000 kg | Mission Equipment Envelop |
| **Hull Form** | `Monohull Deep-V` | Hydrodynamic Architecture |
| **Structural Material** | Marine-grade 5083-H116 aluminum fast supply hull | Scantling Standard |
| **Operating Sea State** | NATO Sea State 6 (Survival: Sea State 8) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** Quad Caterpillar 3516B marine diesel engines driving 4 fixed-pitch propellers
- **Total Power Output:** **7200 kW** ($P_B$)
- **Propulsion Unit:** `Fixed Pitch Propeller`
- **Max Speed:** **28 knots**
- **Cruising Speed:** **16 knots**
- **Operational Range:** **6,500 nautical miles**
- **Mission Endurance:** **720 hours** (30 days)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-3 (Human-on-the-Loop Conditional Autonomy)`
- **Autonomy Suite:** Overlord Autonomous Command and Control system with integrated Aegis Combat System virtualized node.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16, Rule 17
- **C2 Datalinks:** Common Control System (CCS), Link 16, Wideband Mil-SATCOM, WGS/Commercial SATCOM
- **Surface Radar:** Raytheon Anschütz Synapsis radar and Furuno S-band solid-state radar
- **Optronics / EO-IR:** L3Harris WESCAM MX-20 electro-optical / infrared target acquisition suite


- **Electronic Warfare:** SEWIP Lite electronic warfare support receiver suite

---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Modular mission deck containerized launchers. Sister ship Ranger successfully fired SM-6 from modular 4-cell vertical launch system container.
- **Weapons Fitted:** Modular 4-cell Mk 70 VLS container (SM-6 / Tomahawk compatible), 12.7mm stabilized machine gun mounts



---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Autonomous Continuous Trail Unmanned Vessel (ACTUV) Sea Trials & Long-Range Autonomy Verification]]
- **Authors:** Littlefield, S., Rector, J., Sloan, A.
- **Publication:** *Naval Surface Warfare Center & DARPA Tactical Technology Office (DTIC Tech Report ADA639148)* (2018)
- **DOI / Reference:** [10.21236/ADA639148](https://apps.dtic.mil/sti/citations/ADA639148)
- **Key Empirical Finding:** Trimaran outrigger configuration maintained intact stability through Sea State 5 with GM_T exceeding 4.2m.
- **Governing Formula:** $\text{GM}_T = KB + BM_T - KG = KB + \frac{I_{xx}}{\nabla} - KG$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `0.95x`
- **Endurance Ratio:** `3x`
- **Displacement Ratio:** `55x`
- **Engineering Assessment:** Demonstrates containerized modular combat weapon integration and virtualized command node on large naval hulls.
- **Design Recommendation for USV-01:** Maintain standard ISO-footprint modular tie-down rails on USV-01 deck for future modular payload swaps.
