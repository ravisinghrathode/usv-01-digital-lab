---
title: "USV Fleet Intel: Bluebottle USV"
tags:
  - usv-fleet
  - naval-intelligence
  - australia
  - isr
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[Bluebottle USV]] — Royal Australian Navy / Australian Border Force

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[Royal Australian Navy / Australian Border Force]] (Australia)
> **Primary Role:** [[ISR]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 6.8 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 1.4 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 1.1 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 0.95 tonnes (950 kg) | Full Load Seawater |
| **Payload Capacity** | 300 kg | Mission Equipment Envelop |
| **Hull Form** | `Wave Piercing Monohull` | Hydrodynamic Architecture |
| **Structural Material** | Fiberglass composite with sacrificial foam keel | Scantling Standard |
| **Operating Sea State** | NATO Sea State 6 (Survival: Sea State 8) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Solar-Wave`
- **Engine Details:** Patented hard solar-sail wing, wave-drive flipper rudder, and auxiliary electric drive pod
- **Total Power Output:** **4.5 kW** ($P_B$)
- **Propulsion Unit:** `Wave Foil`
- **Max Speed:** **7 knots**
- **Cruising Speed:** **4.5 knots**
- **Operational Range:** **15,000 nautical miles**
- **Mission Endurance:** **4320 hours** (180 days)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** Zero-emission perpetual persistence autonomy with automated energy harvesting optimization.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16
- **C2 Datalinks:** Iridium Certus SATCOM, Starlink Maritime, 4G/5G coastal mesh
- **Surface Radar:** Simrad low-power solid state radar
- **Optronics / EO-IR:** 360-degree daylight and thermal surveillance camera cluster
- **Sonar Suite:** Towed 100m thin-line passive acoustic hydrophone array for silent submarine detection



---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Persistent multi-month covert surveillance of Exclusive Economic Zones (EEZ) and choke points; towed acoustic array detects diesel-electric submarines.


- **ASW Equipment:** Towed thin-line passive hydrophone array, Automated acoustic classifier

---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Nonlinear Dynamic Modeling and Heading Control of Unmanned Marine Craft Under Environmental Disturbances]]
- **Authors:** Fossen, T. I., Perez, T.
- **Publication:** *Annual Reviews in Control, Vol. 48* (2019)
- **DOI / Reference:** [10.1016/j.arcontrol.2019.05.001](https://doi.org/10.1016/j.arcontrol.2019.05.001)
- **Key Empirical Finding:** Nomoto 1st-order and 2nd-order steering transfer functions accurately predict USV turning rate under waterjet and twin-propeller differential thrust.
- **Governing Formula:** $M\dot{\nu} + C(\nu)\nu + D(\nu)\nu + g(\eta) = \tau_{\text{prop}} + \tau_{\text{wave}} + \tau_{\text{wind}}$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `0.23x`
- **Endurance Ratio:** `20x`
- **Displacement Ratio:** `0.08x`
- **Engineering Assessment:** Proves months-long unattended autonomous endurance through combined solar, wind sail, and wave-drive flipper energy.
- **Design Recommendation for USV-01:** Evaluate deck solar auxiliary charging on USV-01 to sustain standby electronics during low-speed station keeping.
