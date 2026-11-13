# USV-01 — Research/Design/Solver commissioning plan and outcome boundary

**Proposal status:** software changes in PR #50, dependent on #49 and #48. No live production model run, solver installation, tank validation, independently accepted CAD or safety release is claimed. All numeric design recommendations remain preliminary.

## 1. Live agent commissioning — no guessed particulars

The Project Lead requested agent-led research and concept selection before detailed CAD. The mission template `references/concept-mission-draft.json` contains process/mission hypotheses and no fabricated dimensions, motors, loads or acceptance envelope.

The secure host with actual provider authorization first collects **actual bytes** of official ITTC source PDFs (no LLM-generated citation is treated as a fetched document):

```bash
npm run research:collect-public
# Produces an ignored mission bundle and SHA-256-indexed PDFs:
# .local-concept-research/publications/mission-with-fetched-publications.json
```

The exact PDF SHA-256 and HTTPS source URL must be present in the local source index before `SOURCE_DOCUMENT` numeric attribution can reach the engineering screen. Document retrieval/hashing does not independently establish whether a formula is applicable to the eventual hull.

The secure host then runs:

```bash
# Source checkout must exactly match the SHA supplied (non-negotiable).
export GEMINI_API_KEY=<AUTHORIZED_PROVIDER_SECRET_ON_SECURE_HOST>
export GEMINI_MODEL=<CURRENT_SUPPORTED_GEMINI_MODEL_ID>

# Verify actual external API, no synthetic/deterministic provider fallback:
npm run design:iterate -- \
  --mission-file references/concept-mission-draft.json \
  --source-sha "$(git rev-parse HEAD)" \
  --seed 1337 --revisions 2
```

The runner:
- verifies a real Gemini structured response before executing the agents;
- records mission SHA-256 and exact checked-out Git revision;
- rejects unsourced numerical proposals: every number must state an exact indexed source reference or explicit unverified hypothesis;
- retains only locally ignored files in `.local-concept-research/design-loops/`; never commits provider responses or service credentials;
- calls A01 for the initial proposal; conditionally A05 (hull), A06 (stability), A07 (resistance) and A23 (red-team) only when their actual mandatory tool screens succeeded; finally A15 independently critiques, then A01 revises;
- forbids monohull-only empirical equations from being applied to catamaran/trimaran candidates without separate validated models;\n- preserves separate candidate topology and numerical assumptions for traceable source comparison;
- supports fixed mission `comparisonMode: "FIXED_CONDITIONS_RESCREEN"` using explicit objective operating conditions (speed, propulsion efficiency, water temperature). Does not rewrite any candidate hull particulars.

**Commissioning gate:** record exact model ID, real provider run digest, non-mock status, nonempty revisions, tool screens and specialist findings, tracked uncertainties, any failure, artifacts and model limits. A provider responding successfully is **not** naval engineering validation. No Gemini credential is configured in ordinary CI: the real run remains **NOT EXECUTED** until an authorized host supplies it.

## 2. Concrete solver execution boundary

The new `remote_solver/worker.py` and `service.py` implement actual subprocess invocation and authenticated polling, not merely the old client interface. They cannot run a case without a real Linux installation and an **operator-authorized, pre-staged SHA-256 case package**. See `remote_solver/README.md` for the host isolation, unprivileged account, TLS reverse proxy, fixed OpenFOAM/CalculiX calls, job manifest, mesh/input checks and test-only commands.

`COMPUTE_DONE_EVIDENCE_PENDING` means real subprocesses reported successful exit but no trustworthy convergence/result verification has been submitted; it is not a CFD/FEA-validated engineering result. Grid-convergence, model validity, bench correlation, solver version and published result artifacts require separately authenticated evidence.

No real Linux host or CFD case was provisioned in PR #50; the worker security tests inject **fake subprocesses**.

## 3. Reference verification

The ITTC high-speed model-resistance procedure 7.5-02-05-01 (2024 revision 04) states the relevant Froude, Reynolds and friction-coefficient identities. The independently implemented `IttcDimensionalOracle` checks actual `TOOL-RESISTANCE-01` outputs for speed conversion, Fn and Re against those equations.

Primary published source: https://www.ittc.info/media/11846/75-02-05-01.pdf

That is **an equation/units verification check only**. It does not authenticate the PDF's binary checksum, predict full hull resistance accurately, reproduce appendage and wave drag, or replace towing-tank/CFD or peer review. Actual vessel validation will require:
- source-authenticated geometry and mass/CG;
- qualified measured friction/residual resistance datasets for comparable geometries and speeds, and installed propulsive-efficiency maps;
- structural FEA plus materials/loads/proof evidence, stability GZ and downflooding, autonomy SIL/HIL, and required physical testing;
- independent reviewers and exact-revision Director cryptographic authorization.

## 4. Engineering milestones and authority

| Milestone | Current software status | What is still needed |
|---|---|---|
| Agent research preflight + provenance | Implemented, offline tested | Real provider credentials, authenticated source index and completed live study |
| Multi-specialist revision loop | Implemented, test-double exercised | Actual A01/A05/A06/A07/A23/A15 provider executions and measured engineering utility |
| Fair objective ranking | Implemented with fixed-condition rescreen | Approved mission objectives, validated topology-specific tools and external references |
| Remote CFD/FEA worker | Restricted Linux worker + loopback service, test-only | Real solver installation, secure host, staged cases, mesh checks, convergence proof and result store |
| Independent numeric references | ITTC identities + existing benchmark runner | Authenticated PDF and independent tank/FEA dataset checks with uncertainty |
| Design freeze and release | NOT AUTHORIZED | Project Lead concept selection, independent safety engineering review, Stage C/D/E and all 13 workstreams |

**Project Lead decision** remains selection of project scope/concept after genuine research. It cannot silently substitute for specialized engineering sign-offs, source authentication, actual trials, or a Director's signed exact-digest approval. No merge bypass is permitted.
