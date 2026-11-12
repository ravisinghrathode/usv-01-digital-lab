---
title: "USV Fleet Intel: Seagull"
tags:
  - usv-fleet
  - naval-intelligence
  - israel
  - mcm
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[Seagull]] — Israeli Navy / Evaluated by Royal Navy & Asia-Pacific Navies

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[Israeli Navy / Evaluated by Royal Navy & Asia-Pacific Navies]] (Israel)
> **Primary Role:** [[MCM]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 12 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 3.5 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 1 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 10.5 tonnes (10,500 kg) | Full Load Seawater |
| **Payload Capacity** | 2,500 kg | Mission Equipment Envelop |
| **Hull Form** | `Monohull Deep-V` | Hydrodynamic Architecture |
| **Structural Material** | Marine-grade welded aluminum alloy | Scantling Standard |
| **Operating Sea State** | NATO Sea State 5 (Survival: Sea State 7) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** Twin marine diesel engines with dual steerable propellers / thrusters for high station-keeping precision
- **Total Power Output:** **650 kW** ($P_B$)
- **Propulsion Unit:** `Fixed Pitch Propeller`
- **Max Speed:** **32 knots**
- **Cruising Speed:** **14 knots**
- **Operational Range:** **900 nautical miles**
- **Mission Endurance:** **96 hours** (4 days)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** Elbit proprietary autonomous mission management system with dynamic DP-2 equivalent station keeping during dipping sonar deployment.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16
- **C2 Datalinks:** Dual Ku/Ka band SATCOM, Encrypted Line-of-Sight RF data link (>35 km), Underwater acoustic link
- **Surface Radar:** Digital navigational radar with automated target tracking
- **Optronics / EO-IR:** Elbit CoMPASS multi-sensor stabilized electro-optical system
- **Sonar Suite:** Towed Synthetic Aperture Sonar (T-SAS), dipping active sonar (HELRAS-derivative), Klein 5900 side-scan sonar



---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Fully integrated autonomous Mine Countermeasures (MCM) detection, localization, and classification; modular lightweight torpedo launch system (EuroTorp MU90 / Mk 54).
- **Weapons Fitted:** Twin lightweight torpedo launch tubes (Mk 54/MU90), Mini-Typhoon 12.7mm remote weapon station
- **MCM Equipment:** Towed Side Scan Sonar, Mine Identification and Neutralization ROV, Dipping Sonar
- **ASW Equipment:** Active dipping sonar, Towed passive sonar array, Lightweight ASW torpedoes

---

## 5. Peer-Reviewed Academic Literature & Technical Papers

### [[Autonomous Mine Countermeasures: Multi-Sensor Sonar Synthesis on USV Platforms]]
- **Authors:** De Moustier, C., Hughes, C., Vandiver, R.
- **Publication:** *IEEE Transactions on Geoscience and Remote Sensing* (2021)
- **DOI / Reference:** [10.1109/TGRS.2021.3087612](https://doi.org/10.1109/TGRS.2021.3087612)
- **Key Empirical Finding:** Active heave and pitch damping on the USV towing boom improved SAS image resolution to 2.5 cm at 150m swath width.


### [[Autonomous Continuous Trail Unmanned Vessel (ACTUV) Sea Trials & Long-Range Autonomy Verification]]
- **Authors:** Littlefield, S., Rector, J., Sloan, A.
- **Publication:** *Naval Surface Warfare Center & DARPA Tactical Technology Office (DTIC Tech Report ADA639148)* (2018)
- **DOI / Reference:** [10.21236/ADA639148](https://apps.dtic.mil/sti/citations/ADA639148)
- **Key Empirical Finding:** Trimaran outrigger configuration maintained intact stability through Sea State 5 with GM_T exceeding 4.2m.
- **Governing Formula:** $\text{GM}_T = KB + BM_T - KG = KB + \frac{I_{xx}}{\nabla} - KG$


---

## 6. Competitive Benchmark vs [[USV-01 Baseline]]

- **Speed Ratio (Foreign / USV-01):** `1.06x`
- **Endurance Ratio:** `0.45x`
- **Displacement Ratio:** `0.88x`
- **Engineering Assessment:** World’s foremost operational USV demonstrating successful dipping sonar deployment and lightweight torpedo launching in Sea State 4.
- **Design Recommendation for USV-01:** Adopt Seagull’s center-of-gravity dynamic ballast compensation system when deploying heavy towed sonar reels from USV-01.
