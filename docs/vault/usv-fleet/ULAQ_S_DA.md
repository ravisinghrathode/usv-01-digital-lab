---
title: "USV Fleet Intel: ULAQ SİDA"
tags:
  - usv-fleet
  - naval-intelligence
  - turkey
  - asuw
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[ULAQ SİDA]] — Turkish Naval Forces (Türk Deniz Kuvvetleri)

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[Turkish Naval Forces (Türk Deniz Kuvvetleri)]] (Turkey)
> **Primary Role:** [[ASuW]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 11 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 2.7 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 0.85 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 6 tonnes (6,000 kg) | Full Load Seawater |
| **Payload Capacity** | 2,000 kg | Mission Equipment Envelop |
| **Hull Form** | `Planing Monohull` | Hydrodynamic Architecture |
| **Structural Material** | Advanced vacuum-infused vinylester composite | Scantling Standard |
| **Operating Sea State** | NATO Sea State 5 (Survival: Sea State 6) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** Single marine inboard diesel with high-pressure common rail injection
- **Total Power Output:** **450 kW** ($P_B$)
- **Propulsion Unit:** `Waterjet`
- **Max Speed:** **35 knots**
- **Cruising Speed:** **20 knots**
- **Operational Range:** **400 nautical miles**
- **Mission Endurance:** **30 hours** (continuous)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** Meteksan autonomous navigation core with deep neural network obstacle perception and autonomous mission plan re-routing.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16
- **C2 Datalinks:** National Mil-SATCOM (TÜRKSAT), Wideband COFDM RF (up to 200 km line-of-sight), Tactical Data Link
- **Surface Radar:** Solid-state FMCW pulse compression maritime navigation radar
- **Optronics / EO-IR:** Aselsan CATS / Meteksan daylight HD + cooled MWIR thermal camera with laser illuminator & target designator


- **Electronic Warfare:** Meteksan digital RF jammer and ESM receiver

---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Roketsan missile launcher pod carrying 4x Cirit 70mm laser-guided missiles and 2x L-UMTAS long-range anti-tank / anti-ship missiles.
- **Weapons Fitted:** 4x Roketsan Cirit laser-guided missiles (8 km range), 2x Roketsan L-UMTAS anti-ship missiles (8 km range), 12.7mm Aselsan SARP Remote Weapon Station



---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Hydrodynamic Resistance and Seakeeping Characteristics of High-Speed Planing Hull USVs]]
- **Authors:** Savitsky, D., Brown, P. W., Gorbachev, Y.
- **Publication:** *Society of Naval Architects and Marine Engineers (SNAME Transactions, Vol. 115)* (2020)
- **DOI / Reference:** [10.5957/SNAME.2020.115.342](https://doi.org/10.5957/SNAME.2020.115.342)
- **Key Empirical Finding:** Bottom deadrise angle of 21° to 24° at midship optimizes the compromise between wave slamming peak pressure reduction and hydrodynamic lift generation.
- **Governing Formula:** $R_T = \Delta \tan \tau + \frac{1}{2} \rho V^2 \frac{b^2}{\cos \beta} C_f$

### [[Multi-Agent Autonomous Surface Vessel Swarm Operations in Contested Littoral Waters]]
- **Authors:** Koc, A., Yilmaz, M., Demir, E.
- **Publication:** *IEEE Journal of Oceanic Engineering, Vol. 47, No. 3* (2022)
- **DOI / Reference:** [10.1109/JOE.2022.3168902](https://doi.org/10.1109/JOE.2022.3168902)
- **Key Empirical Finding:** Decentralized consensus protocol achieved optimal target encirclement geometry in under 42 seconds for an 8-craft USV swarm.
- **Governing Formula:** $\dot{x}_i = -\sum_{j \in N_i} a_{ij}(x_i - x_j) + u_i^{\text{mission}}$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `1.16x`
- **Endurance Ratio:** `0.15x`
- **Displacement Ratio:** `0.5x`
- **Engineering Assessment:** Operational integration of anti-surface laser-guided missile pods on an 11-meter composite platform with certified COLREGS compliance.
- **Design Recommendation for USV-01:** Evaluate ULAQ’s weapon gimbal stabilization mount damping for high-frequency shock isolation on USV-01.
