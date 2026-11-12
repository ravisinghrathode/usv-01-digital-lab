---
title: "USV Fleet Intel: MARLIN SİDA"
tags:
  - usv-fleet
  - naval-intelligence
  - turkey
  - ew
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[MARLIN SİDA]] — Turkish Naval Forces

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[Turkish Naval Forces]] (Turkey)
> **Primary Role:** [[EW]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 15 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 3.8 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 1.1 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 21 tonnes (21,000 kg) | Full Load Seawater |
| **Payload Capacity** | 4,000 kg | Mission Equipment Envelop |
| **Hull Form** | `Monohull Deep-V` | Hydrodynamic Architecture |
| **Structural Material** | Marine-grade steel/composite hybrid construction | Scantling Standard |
| **Operating Sea State** | NATO Sea State 5 (Survival: Sea State 7) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** Twin turbo diesel propulsion driving waterjets
- **Total Power Output:** **1100 kW** ($P_B$)
- **Propulsion Unit:** `Waterjet`
- **Max Speed:** **36 knots**
- **Cruising Speed:** **18 knots**
- **Operational Range:** **1,000 nautical miles**
- **Mission Endurance:** **72 hours** (3 days)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** Aselsan autonomous maritime suite tested extensively in NATO Dynamic Messenger 2022 and 2023 exercises.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16
- **C2 Datalinks:** TÜRKSAT SATCOM, Link 11/16 Tactical Relay, Broadband Line-of-Sight RF
- **Surface Radar:** Aselsan solid-state multi-mode naval radar
- **Optronics / EO-IR:** Aselsan Kırlangıç electro-optical director and laser rangefinder
- **Sonar Suite:** Deployable dipping sonar and obstacle avoidance forward-looking sonar

- **Electronic Warfare:** World’s first dedicated USV electronic warfare jamming and ESM payload suite (Aselsan EW Suite)

---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Dedicated electronic attack / jammer suite capable of disrupting surface warship radar and communications, plus Roketsan Kuzgun precision-strike missiles.
- **Weapons Fitted:** Roketsan Kuzgun-KY solid-propellant anti-ship missiles, 12.7mm machine gun mount, Light torpedo tubes (ASW variant)



---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Multi-Agent Autonomous Surface Vessel Swarm Operations in Contested Littoral Waters]]
- **Authors:** Koc, A., Yilmaz, M., Demir, E.
- **Publication:** *IEEE Journal of Oceanic Engineering, Vol. 47, No. 3* (2022)
- **DOI / Reference:** [10.1109/JOE.2022.3168902](https://doi.org/10.1109/JOE.2022.3168902)
- **Key Empirical Finding:** Decentralized consensus protocol achieved optimal target encirclement geometry in under 42 seconds for an 8-craft USV swarm.
- **Governing Formula:** $\dot{x}_i = -\sum_{j \in N_i} a_{ij}(x_i - x_j) + u_i^{\text{mission}}$

### [[Nonlinear Dynamic Modeling and Heading Control of Unmanned Marine Craft Under Environmental Disturbances]]
- **Authors:** Fossen, T. I., Perez, T.
- **Publication:** *Annual Reviews in Control, Vol. 48* (2019)
- **DOI / Reference:** [10.1016/j.arcontrol.2019.05.001](https://doi.org/10.1016/j.arcontrol.2019.05.001)
- **Key Empirical Finding:** Nomoto 1st-order and 2nd-order steering transfer functions accurately predict USV turning rate under waterjet and twin-propeller differential thrust.
- **Governing Formula:** $M\dot{\nu} + C(\nu)\nu + D(\nu)\nu + g(\eta) = \tau_{\text{prop}} + \tau_{\text{wave}} + \tau_{\text{wind}}$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `1.2x`
- **Endurance Ratio:** `0.35x`
- **Displacement Ratio:** `1.75x`
- **Engineering Assessment:** First operational USV to participate in NATO exercises with dedicated offensive Electronic Warfare jamming payloads.
- **Design Recommendation for USV-01:** Incorporate dedicated EMI shielding compartments for sensitive autonomy computers modeled after MARLIN.
