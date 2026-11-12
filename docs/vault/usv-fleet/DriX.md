---
title: "USV Fleet Intel: DriX"
tags:
  - usv-fleet
  - naval-intelligence
  - france
  - survey
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[DriX]] — French Navy (SHOM / Marine Nationale) / NOAA / US Navy

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[French Navy (SHOM / Marine Nationale) / NOAA / US Navy]] (France)
> **Primary Role:** [[SURVEY]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 7.7 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 0.85 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 2 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 1.4 tonnes (1,400 kg) | Full Load Seawater |
| **Payload Capacity** | 350 kg | Mission Equipment Envelop |
| **Hull Form** | `Hydrofoil / Wave Piercing` | Hydrodynamic Architecture |
| **Structural Material** | Kevlar and carbon-fiber composite with wave-piercing nose | Scantling Standard |
| **Operating Sea State** | NATO Sea State 5 (Survival: Sea State 7) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** Single high-efficiency marine diesel with folding propeller
- **Total Power Output:** **45 kW** ($P_B$)
- **Propulsion Unit:** `Fixed Pitch Propeller`
- **Max Speed:** **14 knots**
- **Cruising Speed:** **7 knots**
- **Operational Range:** **1,500 nautical miles**
- **Mission Endurance:** **240 hours** (10 days)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** Exail certified survey autonomy with line-keeping precision under 0.5 meters in Sea State 4.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16
- **C2 Datalinks:** Iridium / Starlink SATCOM, Long-range Wi-Fi / RF (15 km)
- **Surface Radar:** Lightweight compact maritime radar
- **Optronics / EO-IR:** Integrated daylight/infrared pan-tilt zoom camera in stealth mast
- **Sonar Suite:** Gaps M7 USBL acoustic positioning transceiver, Kongsberg EM 2040 multibeam echo sounder in retractable drop keel



---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Acoustic positioning and tracking mother craft for deep-diving AUVs and submarine communication relays; hydrographic charting.




---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Autonomous Mine Countermeasures: Multi-Sensor Sonar Synthesis on USV Platforms]]
- **Authors:** De Moustier, C., Hughes, C., Vandiver, R.
- **Publication:** *IEEE Transactions on Geoscience and Remote Sensing* (2021)
- **DOI / Reference:** [10.1109/TGRS.2021.3087612](https://doi.org/10.1109/TGRS.2021.3087612)
- **Key Empirical Finding:** Active heave and pitch damping on the USV towing boom improved SAS image resolution to 2.5 cm at 150m swath width.



---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `0.46x`
- **Endurance Ratio:** `1.1x`
- **Displacement Ratio:** `0.12x`
- **Engineering Assessment:** The drop-keel hydro-acoustic bubble-free design achieves the lowest acoustic noise floor of any operational surface vessel.
- **Design Recommendation for USV-01:** Adopt DriX drop-keel gondola architecture if USV-01 is configured for acoustic survey or subsea ASW listening.
