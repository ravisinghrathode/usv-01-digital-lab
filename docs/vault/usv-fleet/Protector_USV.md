---
title: "USV Fleet Intel: Protector USV"
tags:
  - usv-fleet
  - naval-intelligence
  - israel
  - patrol
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[Protector USV]] — Israeli Navy / Republic of Singapore Navy / Mexican Navy

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[Israeli Navy / Republic of Singapore Navy / Mexican Navy]] (Israel)
> **Primary Role:** [[PATROL]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 9 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 3.5 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 0.7 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 4 tonnes (4,000 kg) | Full Load Seawater |
| **Payload Capacity** | 1,000 kg | Mission Equipment Envelop |
| **Hull Form** | `Rigid Inflatable Hull (RHIB)` | Hydrodynamic Architecture |
| **Structural Material** | Rigid Inflatable Hull (RHIB) composite with heavy-duty hypalon collar | Scantling Standard |
| **Operating Sea State** | NATO Sea State 4 (Survival: Sea State 6) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** High-speed inboard diesel engine coupled to steerable waterjet
- **Total Power Output:** **420 kW** ($P_B$)
- **Propulsion Unit:** `Waterjet`
- **Max Speed:** **50 knots**
- **Cruising Speed:** **28 knots**
- **Operational Range:** **400 nautical miles**
- **Mission Endurance:** **24 hours** (continuous)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-3 (Human-on-the-Loop Conditional Autonomy)`
- **Autonomy Suite:** Remote control and autonomous waypoint navigation with geo-fencing and automatic lost-link behavior.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14
- **C2 Datalinks:** Microwave line-of-sight datalink (up to 20 km), Encrypted UHF/VHF command link
- **Surface Radar:** High-resolution surface search navigation radar
- **Optronics / EO-IR:** Rafael TOPLITE multi-sensor optronic director (FLIR, CCD TV, eye-safe laser rangefinder)


- **Electronic Warfare:** Long-range directional acoustic hailer and strobe searchlight

---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Rafael Mini-Typhoon stabilized remote weapon station with 7.62mm/12.7mm machine gun or 40mm grenade launcher; Spike-ER precision-guided missile launcher.
- **Weapons Fitted:** Mini-Typhoon 12.7mm machine gun, Spike-ER precision missile launcher (8 km range), Non-lethal acoustic device (LRAD)



---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Hydrodynamic Resistance and Seakeeping Characteristics of High-Speed Planing Hull USVs]]
- **Authors:** Savitsky, D., Brown, P. W., Gorbachev, Y.
- **Publication:** *Society of Naval Architects and Marine Engineers (SNAME Transactions, Vol. 115)* (2020)
- **DOI / Reference:** [10.5957/SNAME.2020.115.342](https://doi.org/10.5957/SNAME.2020.115.342)
- **Key Empirical Finding:** Bottom deadrise angle of 21° to 24° at midship optimizes the compromise between wave slamming peak pressure reduction and hydrodynamic lift generation.
- **Governing Formula:** $R_T = \Delta \tan \tau + \frac{1}{2} \rho V^2 \frac{b^2}{\cos \beta} C_f$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `1.66x`
- **Endurance Ratio:** `0.1x`
- **Displacement Ratio:** `0.33x`
- **Engineering Assessment:** Two decades of proven coastal patrol and anti-asymmetric boat swarm force protection operations.
- **Design Recommendation for USV-01:** Incorporate heavy-duty elastomeric perimeter fendering into USV-01 for close-in boarding/docking resilience.
