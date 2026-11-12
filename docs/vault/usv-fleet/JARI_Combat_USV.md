---
title: "USV Fleet Intel: JARI Combat USV"
tags:
  - usv-fleet
  - naval-intelligence
  - china
  - multi_mission
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[JARI Combat USV]] — People's Liberation Army Navy (PLAN)

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[People's Liberation Army Navy (PLAN)]] (China)
> **Primary Role:** [[MULTI_MISSION]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 15 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 4.8 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 1.2 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 20 tonnes (20,000 kg) | Full Load Seawater |
| **Payload Capacity** | 4,500 kg | Mission Equipment Envelop |
| **Hull Form** | `Monohull Deep-V` | Hydrodynamic Architecture |
| **Structural Material** | Stealth-faceted aluminum alloy with radar absorption | Scantling Standard |
| **Operating Sea State** | NATO Sea State 5 (Survival: Sea State 6) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** High-output turbocharged marine diesel driving twin steerable waterjets
- **Total Power Output:** **1400 kW** ($P_B$)
- **Propulsion Unit:** `Waterjet`
- **Max Speed:** **42 knots**
- **Cruising Speed:** **22 knots**
- **Operational Range:** **500 nautical miles**
- **Mission Endurance:** **48 hours** (continuous)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** Cooperative swarm engagement core with automated weapon fire control assignment.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16
- **C2 Datalinks:** BeiDou military SATCOM, High-data rate directional C2 link
- **Surface Radar:** Four-panel active electronically scanned array (AESA) radar providing 360-degree air and surface track coverage
- **Optronics / EO-IR:** Stabilized electro-optical director with laser rangefinder and designation
- **Sonar Suite:** Bow-mounted active/passive sonar for sub-surface detection



---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Fully integrated mini surface combatant: 30mm remote autocannon, 8-cell vertical launch system (VLS) for surface-to-air and anti-ship missiles, and twin lightweight torpedo tubes.
- **Weapons Fitted:** 30mm remote controlled autocannon with integrated electro-optics, 8-cell vertical launch system (VLS), Twin lightweight torpedo launch tubes



---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Multi-Agent Autonomous Surface Vessel Swarm Operations in Contested Littoral Waters]]
- **Authors:** Koc, A., Yilmaz, M., Demir, E.
- **Publication:** *IEEE Journal of Oceanic Engineering, Vol. 47, No. 3* (2022)
- **DOI / Reference:** [10.1109/JOE.2022.3168902](https://doi.org/10.1109/JOE.2022.3168902)
- **Key Empirical Finding:** Decentralized consensus protocol achieved optimal target encirclement geometry in under 42 seconds for an 8-craft USV swarm.
- **Governing Formula:** $\dot{x}_i = -\sum_{j \in N_i} a_{ij}(x_i - x_j) + u_i^{\text{mission}}$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `1.4x`
- **Endurance Ratio:** `0.22x`
- **Displacement Ratio:** `1.66x`
- **Engineering Assessment:** The world’s first USV to integrate four-sided AESA radar and vertical launch missile systems on a 15-meter hull.
- **Design Recommendation for USV-01:** Examine structural reinforcement required to withstand deck vertical missile blast pressures.
