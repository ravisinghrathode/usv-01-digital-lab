# USV-01 — Agent-led design discovery and Gate 0 (proposal)

**Disposition:** Historical implementation proposal, updated for the current canonical 26-agent role and Codex subscription-only runtime; NOT an approved hull baseline, actual vessel design or engineering release. Project Lead may select a concept after evidence-backed comparison; safety engineering authorities retain independent review/signature obligations.

**Current scope limit:** This procedure prepares or executes 26 role-specific research cases; it does not establish a complete autonomous, cyclic 26-agent engineering optimizer. The separate actual design-revision loop is bounded to A01/A15; independent engineering validation remains open.

## Correct sequence

1. **Mission & constraints:** Lead systems, requirements, CONOPS and regulatory agents (A01–A04) identify actual mission questions, applicable operating limits and missing client decisions. Prior Rev 0.4 numerical values and the unrelated 2.5 m / 120 kg concept are **unverified competing historical scenarios**, never merged into one approved design.
2. **Research:** All 26 live agents use a common, source-identified mission brief and research index. Identify public supplier specifications, comparable craft, standards applicability, uncertainty and design parameter ranges. If a source cannot be authenticated or a requirement is missing, record **TBD**. A model recollection or generated citation is not independently checked research.
3. **Trade studies:** At least two candidate concepts are separately identified (monohull, catamaran or another justified alternative). Every proposed numeric parameter has a candidate ID, unit, originating role and provenance classification `SOURCE_OBSERVATION`, `DERIVED_SCREEN`, `ASSUMPTION` or `TBD`. Record alternatives and contradictory claims, reject cross-variant mixing.
4. **Gate 0:** `ConceptDiscoveryGate` checks 26 distinct source-revision-matched provider-run claims, research requirements, candidate isolation and numeric traceability. Its maximum output is `TRADE_STUDY_READY_UNVERIFIED`, **never** selected, verified or approved.
5. **Project Lead choice:** Present ranked alternatives, assumptions, safety issues, cost and development implications to the Project Lead. Record their explicit, attributable selection via the existing authenticated human decision mechanism; a chat statement or JSON `approved: true` cannot substitute for an accepted repository approval record. Approval here is **direction to start detailed design**, not seaworthiness.
6. **Detailed engineering:** Design and freeze controlled CAD variants, mass/CG load cases, arrangement, powering, energy, stability, structures, autonomy and marine integration. Use independent calculations and qualified reviewers to verify them.
7. **Acceptance:** Keep all 13 workstreams open for external evidence and physical qualification. Qualified specialist review, Stage C, exact-digest Director sign-off, Stage D and Stage E remain mandatory wherever the governance classification requires them. Do not force-merge blocked safety PRs.

## Commands

```bash
# Prepare 26 discipline-specific real-engine input cases without inventing vessel particulars
npm run concept:research -- --mission-file references/concept-mission-draft.json --source-sha <EXACT_40_HEX_SHA>

# Current authorized live research route: signed-in local Codex CLI, no paid API fallback
AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled USV_ALLOW_PAID_AI_API=false npm run concept:research -- --mission-file references/concept-mission-draft.json --source-sha <EXACT_40_HEX_SHA> --run-live

# When independent source-referenced candidate records exist, re-evaluate their
# input shape and research completeness (not physical approval):
npm run concept:research -- --mission-file references/concept-mission-draft.json --source-sha <EXACT_40_HEX_SHA> --concept-file <CONTROLLED_CONCEPT_ARRAY_JSON>
```

Outputs default to ignored `.local-concept-research/`; do not commit restricted model responses or source documents. Running with no provider credentials prepares the tasks only. Offline CI checks planning and validation; it cannot establish live source research.

Live runs now retain `agent-research-for-review.json` containing each agent's actual proposed metrics, assumptions, TBDs and recommendations, explicitly labeled **UNVERIFIED_AGENT_RESEARCH**. It is local-only with restrictive file permissions. The 26-agent matrix and individual research results are not authoritative external-source verification: only authenticated and qualified review of source material can promote evidence. Running live with an output directory inside the checkout outside the ignored research directory is rejected to reduce accidental disclosure.

## Immediate software remediation

The previous optimizer was a **heuristic scenario generator** with invented/scoped coefficients, 25 synthetic votes, illustrative 14-knot outputs and unsourced ISO/IMO thresholds. It previously promoted those scenario values directly into `SharedMemory` and described its design dossier as `Certified Candidate`. The UI now only previews the synthetic candidate and leaves the controlled baseline unchanged; the dossier must label all results unverified. This is a safety correction, not a validated optimizer replacement.

## Open acceptance mapping

| Workstreams | New agent-led process contribution | Non-software requirements still open |
|---|---|---|
| WS-01/02 | 26 genuine role research traces, independent reference challenges | Production connectivity and validated specialist accuracy |
| WS-03/04/05/07 | Source-scoped candidate physics and evidence requirements | Approved CAD, mass/CG, CFD/tank results, FEA, supplier specs and physical tests |
| WS-06 | CONOPS, ODD, hazards, synthetic safety screening | Qualified COLREG review, closed-loop SIL, HIL, authorized sea trials |
| WS-08/09/10 | Source registry and revision trace | Authenticated AI Studio/Drive/Obsidian roundtrip and identity controls |
| WS-11 | Input provenance and no-silent-promotion checks | Independent penetration/security audit |
| WS-12 | Distinct Project Lead decision and engineering release paths | Genuine independent reviewer and authorized exact-digest signing |
| WS-13 | Reproducible campaign artifacts | Live deployment SHA, TLS, persistence, monitoring and restore drill |

**Remaining authoritative inputs:** actual mission priorities, enforceable design envelope, regulatory applicability, accessible supplier/physical reference evidence, engineering reviewers and recorded human approvals. Agents must research and propose the *technical* parameters, not create fictional authority for absent input.
