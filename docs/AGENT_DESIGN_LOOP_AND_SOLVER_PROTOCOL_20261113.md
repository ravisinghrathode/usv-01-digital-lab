# USV-01 — Design-and-innovation runtime, empirical screening and remote solvers

**Disposition:** Software implementation proposal for independent review. NOT a vessel design, independent naval certification, supplier validation, source-authenticated model, or release approval. Depends on PR #48 Gate 0 protections.

## Closed-loop design runtime

The legacy `GenerativeDesignOptimizer` now uses a deterministic Mulberry32 seed, records `runSeed`, `drawIndex` and `scenarioRevision` in each candidate, and can replay identical scenario sequences. Its former “25-agent” voting matrix has been removed and replaced by **12 explicitly synthetic input/heuristic checks**; it DOES NOT execute the 26 canonical agents. Its approximate physics constants, local +1% finite-difference responses and numeric outputs remain explicitly unverified; the previous invented Sobol values and fabricated red-team proof have been removed. Seed reproducibility does **not** imply solution correctness.

The new `AgentDesignLoop` performs up to five *real*, sequential proposal–screen–critique–revision cycles:

1. Provide the exact 40-hex source commit, named run, 32-bit seed, source-identified mission requirements, review/reference index, and revision budget (1–5).
2. A01 Lead Systems Architect proposes explicit `keyMetrics` hypotheses, source references or TBDs through `ExecutionEngine`. `BaseAgent` preserves LLM suggestions only as `modelSuggestedKeyMetrics`; no automatic design baselining occurs. The actual mission context and previous critique now reach the model prompt, with untrusted-content labeling.
3. The controller extracts **only** supported finite numeric hypotheses and screens complete inputs through actual registered `TOOL-HYDROSTATICS-01` and/or `TOOL-RESISTANCE-01`. These are service-executed preliminary calculations, not A05's fabricated tool executions or engineering validation. Missing or failed calculations are recorded and given to the critic.
4. Actual A15 Independent Technical Critic receives the exact hypothesis, method output, assumption and TBD lists and challenges missing engineering evidence. The next A01 call receives prior A15 feedback and must propose a revision.
5. Stop at budget, failure, unavailable live model, invalid numbers or unchanged proposal. Report each input/output digest and trace. Never mark result independently validated, selected, detailed-design authorized, production ready or safe to actuate.

6. If and only if the controlled mission JSON supplies **source-identified objectives** (each with an actual `toolId`, `outputMetric`, `direction`, positive `weight`, `unit`, `sourceReference`, and explicit identical `fixedInputParameters`), compare revisions on the recorded **actual tool screen outputs**. Different speed, efficiency, temperature or other declared test conditions exclude a candidate rather than silently ranking incomparable power estimates. The within-run weighted relative score is **COMPARISON_READY_UNVERIFIED**, NOT performance validation, a Pareto frontier or approved concept. Without objectives or at least two comparable candidates the result is **UNRANKED**, never an invented score.

Example mission-only comparison input (synthetic illustrative schema; *not* a real performance requirement):

```json
{
  "objectives": [
    {
      "id": "POWER_AT_FIXED_SPEED",
      "toolId": "TOOL-RESISTANCE-01",
      "outputMetric": "shaftBrakePowerPbKw",
      "direction": "MINIMIZE",
      "weight": 1,
      "unit": "kW",
      "sourceReference": "TBD_PROJECT_LEAD_APPROVED_CONOPS",
      "fixedInputParameters": {
        "speedKnots": 10,
        "propulsiveEfficiencyEtaD": 0.6,
        "waterTempCelsius": 15
      }
    }
  ]
}
```

The sample 10-knot condition and 0.6 efficiency are **unapproved demonstration values**; they must not be copied as a vessel requirement. For an actual comparison, source references and conditions require review, and numerical-model fidelity still must be independently established.

This loop is an **initial live design core**, not a complete automated naval architecture design engine. It still requires actual missions, external source checking, numerical reference validation, robust optimizer integration and specialist verification. Its seed only makes the legacy starting hypothesis repeatable; nondeterministic live LLM output cannot be guaranteed reproducible. Actual provider/model response IDs and snapshots should be retained by a trusted orchestration log before formal evidence acceptance.

## Running it

```bash
# Inspect source-derived tool/advisory capability and documentation drift (no credentials required):
npm run audit:capabilities

# An authorized server runs actual A01/A15 cycles; all outputs are unverified:
AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled USV_ALLOW_PAID_AI_API=false npm run design:iterate -- \
  --mission-file references/concept-mission-draft.json \
  --source-sha <EXACT_40_HEX_COMMIT_SHA> --seed 1337 --revisions 3
```

Research case generation for all 26 roles remains in `npm run concept:research`. Use `--run-live` with a locally authenticated ChatGPT Codex CLI and the same subscription-only environment for live research. No Gemini key, paid API or mock fallback is accepted. Only the live design loop uses A01 and A15 directly; it does **not** pretend to have made all 26 work together yet. Store live evidence under ignored `.local-concept-research/design-loops/` with restrictive file permissions. Never commit secrets or restricted model responses by default.

## Computation / solver expansion

`RemoteSolverJobs` provides an authenticated HTTPS, server-side job-submission and receipt protocol for `OPENFOAM_CFD` and `CALCULIX_FEA`. Request fields include source Git SHA, hash of input artifact, mesh artifact hash, explicit provenance for quality criteria and immutable job manifest checksum. The service is configured externally with `USV_SOLVER_HTTPS_ENDPOINT` and `USV_SOLVER_SERVICE_TOKEN`; the client does not expose credentials in browser output or run unbounded SSH/shell commands.

A returned receipt includes job ID, solver version, result URI/digest, final residual, grid-uncertainty fraction and mesh quality metrics. On missing evidence, inconsistent digest or failed thresholds the preliminary quality screen rejects. Even when its screening checks pass the outcome is `COMPLETED_UNVERIFIED`. There is no commissioned remote solver on this repository, no benchmarked CFD or FEA claim, and no implicit technical acceptance of a self-attested remote result. Real service provisioning and mesh/model/solver validation remain external.

## Independent benchmarks

`ToolBenchmarkCampaign` executes actual registered deterministic tools against source-identified numeric reference cases, with explicit absolute/relative tolerances. User-provided `referenceUri` and `referenceSha256` are metadata, **not authenticated third-party references**. The comparison is `NUMERIC_SCREEN_PASS_UNCERTIFIED` at best. Verified tank/model measurements, accepted hydrostatics independent programs, material/structural reference data, solver grid-convergence studies and qualified witness sign-offs remain required.

## Role capability truthfulness

`AgentCapabilityAudit` discovers actual registered `ToolRegistry` entries, distinguishes declared-but-unimplemented tool names, mandatory tools and permission gaps, and extracts each role's existing review rubric and required knowledge source list. A role with no executable calculator is explicitly **ADVISORY_ONLY_NO_EXECUTABLE_TOOL**; a rubric is not a numeric tool. The audit produces source-derived CI artifacts, including Vitest version from `package.json` and current test-file inventory without asserting a historical test-pass count. Old `docs/VERIFICATION_REPORT.md` remains archived as a past snapshot.

## Separate approvals and unresolved engineering obligations

The Project Lead chooses project scope and preferred concept after traceable comparative research. Engineering Director exact-commit authorization and independent technical safety sign-offs remain separate Stage C/D/E requirements. All 13 external acceptance workstreams retain their true evidence gates: actual CAD, audited mass/CG, GZ/downflooding, validated powering, FEA, SIL/HIL, trials, integration and deployment verification. NEVER merge a safety-critical PR by force or mark physical certification complete based on synthetic screenshots, LLM opinions, test doubles or the existence of a solver interface.
