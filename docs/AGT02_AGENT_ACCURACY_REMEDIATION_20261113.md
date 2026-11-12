# AGT-02 — Engineering Accuracy Remediation (13 November 2026)

**Historical source baseline:** GitHub 0a339784493b9c9385504925fdf5172f68a7722f  
**Actual model sample:** 26 distinct live Gemini 3.8 Flash outputs at evidence/live-agents/live-gemini-26-20261113.json

## What the audit actually established

The previous **26/26 live execution** result was functional execution, not independent numerical/disciplinary accuracy. We ran an objective analytic accuracy screen over the historical role-specific Gemini completions, deriving reference arithmetic solely from the declared synthetic engineering test inputs.

- **5 roles:** passed the available first-principles numeric examples (UNCERTIFIED)
- **4 roles:** numeric or tool-provenance failures (A06, A07, A09, A14)
- **17 roles:** no sufficient independent numeric reference; expert review required
- **0 roles:** independently verified naval engineering accuracy

The four flagged agents made references to named deterministic tools during **direct Gemini connector** calls where no ToolRegistry tools were actually invoked. A14's endurance also omitted defined intermittent duty-cycle loads. Its claimed 14.37-hour estimate differs from the expected 96,000 Wh / 6,742 W = **14.24 hours** (synthetic preliminary battery/loads only). The historical evidence is retained unchanged to prevent retrospective falsification.

## Actual code corrections

1. **No automatic verification:** BaseAgent cannot set evidenceValid true merely because a numerical code routine executed. Its verificationStatus remains UNVERIFIED until real independent validation exists.
2. **Grounded quantitative metrics:** For agents with mandatory tools, the primary keyMetrics are namespaced values from actually executed ToolRegistry outputs; model-proposed numbers are retained as separately labelled UNVERIFIED modelSuggestedKeyMetrics for review.
3. **Hydrostatic inputs:** No silent guessed KG. Unknown GM is null. An unknown block coefficient requires a supplied displacement and is inferred by conservation of mass; conflicting stated Cb/mass/hull envelope is rejected. Approximate positive GM is not called class compliant.
4. **Engineering constraints:** Empty mass/consumer ledgers, invalid bus voltage, material yield strength and safety factor are rejected.
5. **COLREG screening:** The vector geometry calculator does not issue fixed-angle steering commands that have not been shown to produce a safe CPA. Overtaking gets priority over generic crossing identification.
6. **Structural estimators:** Claimed class-rule compliance is removed from an empirical screening formula. Its result is explicitly UNVALIDATED_SCANTLING_SCREEN.
7. **Regression cases:** Analytical exercises check hydrostatic volume, resistance Froude number, mass/CG moment conservation, electrical duty-cycle endurance, structural screening bounds and head-on CPA geometry. An adversarial BaseAgent test injects an invented 999-hour model claim and checks that the actual 14.24-hour calculated value remains primary.

## Repeatable checks

```bash
npm run acceptance:accuracy
npm run acceptance:accuracy -- --require-verified
```

The first writes governance/reports/agent-accuracy-screen.json (also uploaded as a GitHub Actions artifact), preserving all failures and unresolved reference gaps. The strict option correctly fails until independent verification is actually established.

## Limits and acceptance

These results verify **software arithmetic and evidence provenance under synthetic inputs**. They do not supply controlled hull offsets or KG/GZ data, experimental resistance/CFD correlation, accepted class standards or FEA, autonomy safety test results, or an independent human technical judgment. The 17 qualitative specialties still need externally approved rubrics and representative truth data. Nothing in this PR signs engineering evidence or converts numerical unit tests into naval certification.

**AGT-02:** Accuracy defects in the runtime have been remediated and regression checked, but **26/26 independently accurate is NOT established**. Do not close the original formal AGT-02 acceptance criterion until external reference and human authority gates pass.
