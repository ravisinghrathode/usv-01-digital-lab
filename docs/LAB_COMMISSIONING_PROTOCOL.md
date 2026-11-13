# USV-01 laboratory commissioning and vessel design release: separate authority gates

**Status:** Procedure for restricted, non-operational software research only.
**Applicable roles:** All 26 canonical engineering agents (A01–A26).
**Provider:** Signed-in ChatGPT/Codex CLI only.

## 1. Why there are two gates

An engineering design baseline cannot be approved before engineering investigation.
The Digital Lab must first run research, calculate deterministic evidence and document
what remains unknown. Its results are **proposals**, not a released vessel design.

A *GitHub source-code revision* is not the *vessel engineering baseline*.
A cryptographic ECR signature over a Git tree authorizes a particular software change.
It does **not** attest that a hydrostatic, structural, propulsion, autonomy, or
other vessel-design assertion has been verified.

## 2. Gate L: bounded laboratory commissioning

The operator may authorize only:

- read-only ChatGPT/Codex analysis of repository evidence;
- deterministic calculations with supplied, provenance-tagged parameters;
- identification and recording of missing information as `TBD`;
- comparisons, proposals, test plans, critiques and evidence manifests;
- development of a *candidate*, explicitly unapproved engineering baseline.

The existing `USV_SUBSCRIPTION_PILOT=enabled` is the explicit operator opt-in
for this scope. The policy defaults strictly to `LAB_COMMISSIONING_RESEARCH`;
`USV_LAB_SCOPE=RESEARCH_ONLY` is an optional reinforcement. A new vessel-design
signature is **not** required just to attempt research. Running the agent or
signing in to ChatGPT is not evidence of engineering design approval.

The machine-enforced gate is
`src/core/mission-control/LabCommissioningPolicy.ts`. Live Codex invocation
is guarded in `SubscriptionCliAdapter`, `CodexCliProvider`, the 26-agent
campaign and the Mission Control pilot. A missing subscription opt-in,
non-Codex provider, allowed paid AI API, hardware-control flag or claimed
engineering-release authorization fails closed.

Suggested operator runtime (after the reviewed source has been deployed and
Codex CLI signed in on the execution host):

```sh
AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled USV_ALLOW_PAID_AI_API=false \
  npm run acceptance:codex-agents -- --catalog evidence/live-agents/representative-cases.json --execute
```

**Required preconditions:** pinned, clean repository commit; valid specialist
cases; mandatory deterministic-tool preflight; local authenticated Codex
executable; approved local compute/data use. Lack of any prerequisite is a
reported blocker, not a success. There are no model calls in the default
command without `--execute`.

## 3. Never authorized by Gate L

Gate L cannot authorize any of the following:

- engineering baseline acceptance, signoff, certification or manufacturing release;
- control of real propulsion, steering, actuators or onboard equipment;
- weapon targeting or payload operation;
- changing approved design parameters without change control;
- claiming that model-generated numbers are independent physical evidence;
- merging an unreviewed GitHub PR or bypassing source-integrity approvals.

A reviewer powered by the same Codex service is **not** independent engineering
verification. AI advice remains advisory; use an independent qualified reviewer
and applicable reference/physical evidence before design release.

## 4. Gate E: engineering evidence and baseline release

A proposed design may advance to a *controlled engineering baseline* only after:

1. Requirements and mission profiles are traced, including marine-specific loads,
   environmental limits, launch/recovery, propulsion, autonomy and loss-of-link cases.
2. Dimensions, weights, coordinate frames, assumptions, source data, calibration,
   numerical methods, uncertainty and test evidence are registered.
3. Each applicable engineering check has an independently validated reference
   or physical test; missing evidence remains `TBD` and blocks acceptance.
4. Independent engineering review is recorded with a genuinely independent
   evidence/provider/qualified-reviewer basis.
5. The Engineering Director approves an exact, evidence-backed *vessel design*
   revision. No agent or Codex reviewer can grant this approval.

## 5. Keep source governance intact

Source-code and GitHub change governance remains separate from vessel
baseline approval. The protected path-based Stage A classifier chooses:

- `RESTRICTED_LAB_SOFTWARE` for non-operational research-only changes:
  normal protected CI and human merge decision; no vessel ECR.
- `PROTECTED_SOFTWARE_SECURITY` for governance, authentication, Codex
  provider, lab commissioning authority, execution-host and CI workflow
  changes: deterministic technical/security checks and **independent
  GitHub peer approval on the exact PR head OR an explicit authenticated
  repository-admin PR-author acceptance on that exact head**; no vessel ECR.
  The latter is a declared single-maintainer authorization exception, not
  independent review.
- `SAFETY_CRITICAL_ENGINEERING` when a change touches naval engineering
  calculators, vessel safety acceptance, controlled design data, release
  manifests or an ECR: independent peer, technical engineering review,
  and **Engineering Director Ed25519 ECR for the exact source-content digest**.
- `ROUTINE_SOFTWARE` for unrelated low-risk work.

A mixed change set always receives its strongest applicable route. No PR
label, author declaration, runtime flag or AI reviewer can downgrade this.
Stage E remains the required fail-closed integrity check for all routes,
not a separate approval authority. Signing source changes is never equivalent
to approving an unknown vessel design.

Do not add a special PR branch-protection bypass for laboratory commissioning.

## 6. Commissioning evidence required to claim 26/26 operational

The report must identify the exact implementation SHA and input-catalog digest,
all 26 canonical IDs and timestamps, the actual `codex_cli` provider for every
live call, correlation IDs, output hashes, deterministic tool traces, individual
failure/blocker status, and the aggregate number of successful real model calls.
The machine-readable report must explicitly say
`engineeringReleaseApproved: false` and
`independentlyEngineeringValidated: false`.

An offline preflight, agent registration, an unverified model output or a
simulated test is **not** proof that an agent is operational. Deployment-level
health and a separate engineering evidence review remain necessary.
