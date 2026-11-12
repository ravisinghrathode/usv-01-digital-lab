---
title: "USV Fleet Intel: Madfox (MAST-13)"
tags:
  - usv-fleet
  - naval-intelligence
  - united kingdom
  - isr
date: 2026-11-12T01:00:00Z
status: Active Operational
---

# [[Madfox (MAST-13)]] — Royal Navy (NavyX Technology Accelerator / Surface Flotilla)

> **Classification:** Unclassified Open-Source Naval Intelligence Baseline
> **Operator:** [[Royal Navy (NavyX Technology Accelerator / Surface Flotilla)]] (United Kingdom)
> **Primary Role:** [[ISR]] | **Status:** `Active Operational`

---

## 1. Principal Hull Particulars & Hydrodynamics

| Parameter | Value | Standard Dimension |
| :--- | :--- | :--- |
| **Length Overall ($L_{OA}$)** | 13 m | Longitudinal Hull Baseline |
| **Beam ($B$)** | 3.2 m | Maximum Transverse Breadth |
| **Draft ($T$)** | 0.8 m | Full Load Navigational Draft |
| **Displacement ($\\Delta$)** | 9.5 tonnes (9,500 kg) | Full Load Seawater |
| **Payload Capacity** | 2,000 kg | Mission Equipment Envelop |
| **Hull Form** | `Planing Monohull` | Hydrodynamic Architecture |
| **Structural Material** | Composite carbon reinforced monohull | Scantling Standard |
| **Operating Sea State** | NATO Sea State 5 (Survival: Sea State 6) | Environmental Limits |

---

## 2. Propulsion, Machinery & Performance

- **Machinery Type:** `Diesel`
- **Engine Details:** Twin Yanmar/Cummins marine diesel engines driving dual Kamewa waterjets
- **Total Power Output:** **750 kW** ($P_B$)
- **Propulsion Unit:** `Waterjet`
- **Max Speed:** **40 knots**
- **Cruising Speed:** **25 knots**
- **Operational Range:** **600 nautical miles**
- **Mission Endurance:** **48 hours** (continuous)

---

## 3. Autonomy System & Sensor Suite

- **Autonomy Level:** `AL-4 (High Autonomy - COLREGS Compliant)`
- **Autonomy Suite:** L3Harris ASView autonomy system certified for autonomous navigation in congested UK commercial waterways.
- **COLREGS 1972 Compliance:** ✅ Certified COLREGS Compliance
- **Rules Supported:** Rule 8, Rule 13, Rule 14, Rule 15, Rule 16
- **C2 Datalinks:** High-bandwidth encrypted RF, SATCOM, 4G/5G port communications
- **Surface Radar:** Simrad HALO-24 pulse-compression solid state radar
- **Optronics / EO-IR:** Flir SeaFLIR 280-HD stabilized multi-spectral turret

- **LiDAR:** Dual marine-grade LiDAR for close-quarters obstacle avoidance


---

## 4. Mission Payload & Weapons Systems

- **Combat Configuration:** Demonstrated operational launching of Puma UAVs and autonomous target hand-off to Type 23 frigates.
- **Weapons Fitted:** Remotely operated optical weapon designator, Optional 12.7mm machine gun mount



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

- **Speed Ratio (Foreign / USV-01):** `1.33x`
- **Endurance Ratio:** `0.22x`
- **Displacement Ratio:** `0.79x`
- **Engineering Assessment:** Pioneered integration of off-board UAV launch from a high-speed planing autonomous boat.
- **Design Recommendation for USV-01:** Incorporate universal payload tie-down and power bus for secondary tethered/launchable drone integration.
