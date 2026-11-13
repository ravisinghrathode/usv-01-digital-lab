# 26-agent readiness — 14 November 2026

This is a source and local-host assessment of `main` at `13aacced4837073ebf77ae2f972764133775e232` plus the candidate fixes on `codex/agent-readiness`. It is not vessel acceptance or evidence of a continuously running service.

## What works now

| Claim | Observed evidence | Status |
| --- | --- | --- |
| Role configuration | 26/26 canonical roles; zero tool-permission/configuration gaps; every role has a review rubric | Software configured |
| Deterministic preflight | 26/26 input envelopes valid; 10/10 mandatory tool calls passed; zero blocked roles with the historical synthetic catalog | Ready for a model attempt on supplied test cases |
| Local Codex access | `codex login status` reports ChatGPT login; Mission Control preflight passed on this workstation | Operator-local access observed |
| Historical live execution | Archived Codex matrix reports 26/26 live responses at source commit `4cf2b52ca3091083227bbb3265d8c402a8c6da0d` | Live execution recorded for an older revision only |
| Current source live operation | No current-revision 26-agent report and no fresh signed host health report | Unverified |
| Independent engineering accuracy | Zero of 26 independently accepted in the AGT-02 audit; older direct Gemini samples include four numeric/provenance failures and 17 roles requiring qualitative review | Open |
| Vessel release | No controlled vessel baseline, complete physical evidence or Engineering Director release | HOLD |

The capability audit found 12 registered deterministic tools. A05, A06, A07, A08, A09, A10, A12, A13, A14, A17 and A23 have executable engineering screens. A01, A02, A03, A04, A11, A15, A16, A18, A19, A20, A21, A22, A24, A25 and A26 are advisory or review roles; they can run with Codex but have no mandatory numeric solver. A15's optional tool access does not turn its critique into independent validation.

## What remains before useful operation

1. **Land a clean, reviewed source revision.** The default preflight previously rewrote a tracked report and then caused the clean-tree live command to reject the checkout. This candidate writes its local report under ignored `data/`. The two CI workflows now upload that path. Run preflight and the live campaign on the same exact reviewed commit. The older dirty Mission Control branch is not the current runtime and must not be used to infer current readiness.
2. **Provide real task inputs.** The included 26-case catalog is deliberately synthetic and inconsistent. For an engineering campaign, supply a revision-controlled mission/configuration record, source references, hull geometry/offsets, mass and CG ledger, requirements, operating envelope, propulsion/electrical loads and applicable safety criteria. Unknowns remain `TBD`; any missing mandatory calculator input blocks that role and its dependents.
3. **Run and attest the trusted host.** The signed-in Codex CLI is present on this workstation, but there is no current-source live report or recent independently signed host-health statement. Use the restricted lab commissioning command in `docs/USV01_26_AGENT_OPERATIONAL_ACCEPTANCE.md`. A synthetic run may prove execution only; it does not validate the vessel.
4. **Independently check outputs and evidence.** Obtain qualified reviews against controlled references for all applicable roles, including hydrostatics, resistance, structures, electrical/energy, autonomy and marine systems. SIL/HIL, physical testing and sea trials remain open where required. Keep tool results, model proposals and reviewer conclusions separate.
5. **Complete release and deployment gates.** Verify the deployed source revision, access controls, persistence/recovery and needed external integrations. Engineering Director authorization must cover the exact accepted vessel baseline; source-code CI or a Codex run cannot grant it.

For local research, the next command after a clean reviewed checkout is `npm run acceptance:codex-agents`; it consumes no model tokens and writes `data/codex-26-agent-preflight.json`. The explicit `--execute` mode needs `AI_REVIEW_PROVIDER=codex_cli`, `USV_SUBSCRIPTION_PILOT=enabled` and `USV_ALLOW_PAID_AI_API=false`. Only run it with the chosen controlled case catalog and lab commissioning authority. `npm run acceptance:full-26 -- --source-sha <exact-commit>` reports the remaining three evidence gates; all three currently remain false.
