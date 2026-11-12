# USV-01 — Numerical Safety Case (AGT-02)

**Disposition: ANALYSIS ONLY. ENGINEERING RELEASE BLOCKED.**
**Independent marine engineering acceptance: NOT PERFORMED.**

This safety case prevents unverified or guessed calculations from setting hull scantlings, propulsion power, battery protection, mission endurance, vessel stability or autonomous steering. Tests provide mathematical consistency checks, NOT a proof of empirical model accuracy or a class certificate.

## Reference implementation and coverage

- Independent Python Decimal arithmetic in scripts/generate-independent-numerical-oracles.py generates 800 fixed-seed cases. Their results are held in tests/fixtures/independent-arithmetic-oracles.json.
- 150 hydrostatic volume/mass, 150 resistance dimension/identity, 150 mass/CG moments, 150 electrical duty-cycle/energy and 200 CPA geometric cases.
- CPA uses an independent vector cross-product formulation rather than the TypeScript position-projection method.
- tests/independentNumericalOracles.test.ts compares outputs to these oracles and checks numeric types, null values, duplicate components, rotation invariance, resistance continuity, unsupported fluid temperature, design sizing and release denial.
- These are independent *implementations* generated for this work, not third-party human acceptance, an exhaustive formal proof or vessel-model validation.

## Engineering defects corrected and safety policy

**Every one of the six ToolRegistry tools explicitly returns** engineeringReleaseAuthorized=false, independentReferenceValidated=false and resultDisposition=ANALYSIS_ONLY_NEVER_ACTUATE. Model execution success and arithmetic success are NOT release authority. All 26 BaseAgents require Director review; none publishes unapproved primary numeric metrics. Real tool results remain inspectable as preliminary screening only.

**Numeric input safety:** 42 numeric fields no longer silently coerce null, booleans or strings into headings, power, mass or geometry. Design-critical default battery capacity, usable depth of discharge, propulsive efficiency, structural yield strength, protection details and water temperature have been removed. Duplicated ledger items are rejected. Out-of-domain inputs fail before synthesis.

**Hydrostatics:** Declared-input volume/mass arithmetic follows rho × LWL × B × T × Cb. For 10m LWL, 2.5m beam, 0.6m draft, Cb=0.45, rho=1025kg/m3, derived mass is 6.91875t, not the historical 5.5t claim. No hull offsets or validated GZ curve exist. Certified GM remains null; approximate GM is explicitly separate, stability compliance check false. Actual KG/GZ and class compliance need independently verified vessel particulars.

**Resistance:** The former residual drag coefficient jumped at Fn=0.8. In the illustrative 10m case the discontinuity was ~1.27kN drag / ~10.1kW effective power. The code curve is now algebraically continuous, but its resistance predictions remain UNVALIDATED and unusable for propulsion selection. The ITTC-1957 friction correlation line does not validate the residual drag model. ITTC resistance procedure 7.5-02-02-01 explicitly addresses conventional displacement hulls and refers higher-Froude-number craft to another procedure (https://ittc.info/media/1217/75-02-02-01.pdf page 2). 2024 ITTC CFD guideline cautions about unconventional modern hulls (https://www.ittc.info/media/11958/75-03-02-03.pdf). Until an independently correlated viscosity model exists only explicit 15C inputs are accepted.

**Mass and trim:** Decimal cross-checks establish arithmetic for *listed* components only. Complete vessel displacement is not established by a partial BOM. The tool flags massLedgerComplete=false and hydrostaticDisplacementReconciled=false. Missing LCB is UNASSESSED_NO_LCB, not aligned trim.

**Electrical:** Constant-profile ideal energy arithmetic for synthetic 120kWh × 80% usable / 6742W yields ~14.24h, but is NOT mission endurance. estimatedEnduranceHours=null and emergencyEnduranceHours=null. The emergency load arithmetic now counts intermittent duty. recommendedMainFuseRatingAmps=null because current multiplier alone cannot establish conductor ampacity, fault-interrupt capability, thermal derating or selective coordination. Output flags prohibit electrical release.

**Structures:** The previously suggested ISO/DNV-based min plate size had no demonstrated rule/FEA test validation. The structural tool returns null design slamming pressure, null min and nominal plate thickness, null stiffener modulus, and BLOCKED_UNVALIDATED_SCANTLING_FORMULA. Actual structural materials and class rule source, loads and FEA/proof tests are mandatory.

**COLREG:** CPA uses true-north bearing explicitly; missing/relative bearing declaration is rejected. 200 geometry vectors check CPA/TCPA, but computed precision is NOT sensor accuracy. Visibility and power-driven vessel-type applicability are screened; no safe helm command is authorized. Measured sensor uncertainty, multiple contacts, simulated trials and qualified independent navigation review are required.

**Dependency integrity:** The service imported ws but the package was only transitively present. Its locked version is now an explicitly declared production dependency, making security/server regression tests reproducible.

## Formal acceptance remains blocked

Independent physical references and human authority are missing: hull offsets and measured KG/GZ; vessel mass ledger and trim inclining data; towing-tank/CFD propulsion correlation; approved structural rule/FEA and proof loads; battery aging/thermal and protection coordination; sensor calibration/uncertainty; supervised collision, link-loss and safe-state scenario tests. The 26-role accuracy obligation register lists the specific evidence required by each specialty. The Engineering Director must approve the exact code and vessel baseline digest following independent technical review.

The previous 26 real Gemini runs remain truthful historical evidence for their old source fingerprints. Changing this source invalidates their applicability to the *current* revision. The software accuracy audit must show the version mismatch and never silently upgrade a past success to new-source certification.

## Reproducibility

Python: python3 scripts/generate-independent-numerical-oracles.py
Focused: npm run acceptance:numerical
All tests: npm test
Per-agent register: npm run acceptance:agt02-audit

GitHub CI enforces the reference tests, archives the machine-readable outcome and retains Stage C independent review, Stage D Director exact-baseline signature and Stage E merge protection. No automated test may change engineeringReleaseAuthorized from false.

**FINAL STATUS: FAIL-CLOSED SOFTWARE, INDEPENDENT MATHEMATICAL ARITHMETIC CHECKS, NO VESSEL OR HUMAN CERTIFICATION.**
