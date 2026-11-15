# USV-01 — Instructions for Codex and ChatGPT Work

This repository contains 26 specialist engineering agents (A01–A26). Use the repository's deterministic tools, test fixtures, traceability reports and engineering governance; never treat language-model responses as certified engineering evidence.

## Subscription-only operating mode

- Use the user's existing ChatGPT sign-in in Codex desktop, Codex CLI or Codex Cloud for interactive engineering, design and code-review tasks. Do not request or create API keys, copy ChatGPT session cookies/tokens into GitHub, or attempt to turn subscription sign-in into a server API credential.
- The model selected in the Codex/ChatGPT product is controlled by its available model selector, account entitlement and workspace policy. Do not claim a particular model has executed unless its actual run metadata establishes that.
- GitHub Actions must run deterministic tests, numerical reference oracles and governance checks **without Gemini/OpenAI model calls**. A static rule check is not an AI review; mark missing live AI and independent external evidence explicitly pending.
- The existing runtime's optional Gemini/OpenAI model-provider code is legacy integration, not evidence that ChatGPT subscription authentication works inside the browser/server. Do not invoke these providers in subscription-only operation.
- For live 26-agent model execution, use interactive Codex tasks when supported, record reproducible task parameters and outputs and retain the source revision. Do not represent a Codex narrative or simulated role response as actual `BaseAgent` / `ToolRegistry` execution.
- Do not introduce `OPENAI_API_KEY`, `GEMINI_API_KEY`, GitHub Action `codex exec` with copied personal credentials, or new usage-billed AI services without explicit project authority.

## A26 single-role charter

A26 (`INTEL-USV-26`) coordinates both public naval fleet/scientific intelligence and source-pinned external marine software research under [one operating charter](docs/governance/A26_UNIFIED_AGENT_OPERATING_CHARTER.md). Its original [External Software Integration Annex](docs/EXTERNAL_INTEGRATION_AGENT_CHARTER.md) and revision-2 policy remain fully binding. Do not add a 27th agent, reinterpret discovery as software qualification, change the canonical A26 prompt/role rights, or assume the separately proposed lab-wide charter has been adopted. The read-only routing verifier is `node scripts/a26-unified-governance.mjs --check`.

## A26 unified public research ingestion policy — proposed rule R3

The A26 role must share **one evidence contract** for naval fleet sightings,
scientific/engineering documents and retrieved platform source snapshots.
Separate **discovery adapters** remain permitted because RSS metadata,
scholarly DOI metadata and manufacturer HTML/PDF have different formats;
separate competing trusted registries, duplicate research identities,
or automatic promotions from one lane to the other are prohibited.

1. A26 remains **INTEL-USV-26** (A26), one role, with purpose-specific
   `FLEET_INTELLIGENCE`, `EXTERNAL_SOFTWARE` and `CORRELATED_RESEARCH`
   routing unchanged. No new model tool access or authority is conferred.
2. All public-source research outputs use
   `PUBLIC_SOURCE_SAFE_ONLY`, a source identifier, URL/DOI, observed time,
   retrieval status and cryptographic digest when bytes were actually obtained.
   Differentiate feed-entry hashes, publication metadata hashes and raw-document
   byte hashes; **never represent a metadata hash as an archived PDF**.
3. `DISCOVERED_UNVERIFIED`, `QUOTE_MATCHED_UNREVIEWED` and
   `SOURCE_IDENTITY_CORROBORATED_UNREVIEWED` must remain review inputs.
   No engineering values or vessel operating status may be silently certified.
4. `scripts/a26/unified-evidence.mjs` is the shared **read-only
   consolidation contract**. It accepts the fleet/document registers from
   the existing A26 worldwide campaign and the source-snapshot index from
   `scripts/a26/global-research.mjs`, preserving domain type, provenance,
   uncertainty, conflicts and candidate cross-domain relations.
5. Never execute retrieved content, bypass robots/licensing, scrape restricted
   sources, acquire classified Navy/client data into GitHub or use subscription
   credentials as API credentials. Changes to collection scope, source hosts,
   license assumptions or data destinations require protected review.
6. The approved storage roles remain: GitHub for reviewed code and schemas,
   paid Google Drive for **separately authorized** durable evidence, Obsidian
   for **review-labelled** graph entries. A generated Obsidian draft is not
   an assertion that Drive/Obsidian sync has been deployed.
7. No 14-model or 10-model artificial worldwide discovery cap. Finite seed
   sets serve acceptance experiments only. Worldwide completeness remains
   `UNKNOWN_NOT_CLAIMED`; regional/language, source-availability and
   prototype/operational distinctions must remain explicit.
8. A26 may generate research review questions for other agents; the
   receiving engineering discipline must independently validate before
   adoption. Research approval, software qualification and engineering
   release are separate gates.
9. CI may use deterministic, no-billed-AI fixture tests; live source retrieval
   and model generation must have separate documented results. Do not infer
   executed validations from workflow definitions.
10. The original A26 operating charter, source-owned role permissions,
    external-software Annex R2.01–R2.10, strict dual-AI governance and
    Director/ECR controls retain precedence. Rule R3 is a proposed
    implementation clarification, not an unauthorized lab-wide charter adoption.

See `docs/a26-unified-research-integration.md` for the two-PR reconciliation
and evidence gates.

## Mandatory engineering controls

1. Treat vessel particulars and unresolved requirements as TBD until supported by reviewed source evidence.
2. Run mandatory deterministic engineering calculations; keep model assertions separate from calculation outputs.
3. Preserve 26-agent role mapping, numerical oracle and accuracy tests, deterministic provenance, and tamper-evident approval checks.
4. Never approve safety-critical baselines, waive unresolved blockers, bypass Director/Project Lead signatures, or merge restricted changes.
5. Use a feature branch and PR, include actual test results with execution environment and commit ID. Never claim tests ran merely because a workflow was created.
6. Distinguish four statuses: deterministic check passed, live model generation executed, independently engineering-validated, and human-approved. None implies the next.

## Useful commands

- `npm run lint`
- `npm test`
- `npm run acceptance:numerical`
- `npm run acceptance:agt02-audit`
- `npm run acceptance:commission`

See `docs/SUBSCRIPTION_ONLY_CODEX_MIGRATION.md` for the capability boundary and unfinished live-AI work.

## Reusable agent-engineering skill selection

For agent, orchestrator, tool, and engineering-verification changes, use the
relevant available procedures from the connected ChatGPT skill library. These
are development guidance, **not** additional autonomous agents or a substitute
for authenticated project authority:

- `building-deterministic-skills`, `agent-architecture`: typed input/output
  contracts, bounded scope, explicit state transitions and authority.
- `state-management`, `handoff-protocol`: idempotent resume, versioned
  inter-agent receipts and blocked-dependency recovery.
- `guardrails`, `verifier-design`: reject spoofed approvals, stale evidence,
  unsafe permissions and unsubstantiated engineering pass conditions.
- `agent-eval`, `local-replay`: synthetic golden cases, adversarial negatives,
  replayable fixtures and honest CI reports.
- `ecosystem-primer`, `langgraph-fundamentals`,
  `langgraph-persistence`, `langgraph-human-in-the-loop`: architectural
  references only. Do not add LangGraph or a second scheduler without a
  measured gap, explicit design decision and independent review.

Apply the relevant skill procedure to the actual code and tests, not only a
documentation checklist. Preserve the existing TypeScript execution engine,
A01–A26 registry, offline/no-paid-model CI, independent review and human
approval gates. Never identify a skill-library record as an installed runtime.
See `docs/AGENT_ENGINEERING_SKILLS_ADOPTION_20261115.md` for the skill-to-code
mapping, open risks, and acceptance evidence requirements.

## USV-01 specialist skill policy v1 (protected source)

The **nine USV-01-owned skills** are under `skills/usv01/<skill-id>/SKILL.md`.
The complete procedures remain research-only until reviewed. The trusted,
short-form runtime mappings in `src/core/skills/NavalSkillRegistry.ts`
select them exclusively by the registered `AgentSpec.canonicalId`; the
existing `BaseAgent` attaches them to source-owned system guidance and
logs which IDs were selected. Do not derive role/skill routing from an
untrusted user prompt, retrieved source, or browser parameter.

- **A01/A02/A03/A04/A18/A21/A24:** marine requirements and standards.
- **A05/A06/A08/A09/A10/A11/A12/A13:** CAD, mass and CG configuration.
- **A06/A07/A08/A09/A10/A11/A12/A13/A14/A18/A23/A24:** numerical V&V.
- **A04/A16/A17/A19/A20/A22/A24:** marine safety and degraded modes.
- **A01/A02/A15/A20/A21/A23/A25/A26:** evidence and digital-thread sync.
- **A01/A03/A14/A15/A18/A19/A20/A21/A22/A23/A24/A25/A26:** commissioning.
- **A01/A15/A18/A20/A24/A25/A26:** runtime resilience and provider budget recovery.
- **A01/A05/A06/A07/A08/A09/A10/A11/A12/A13/A14/A18/A21/A24:** CAD-to-physics evidence coupling.
- **A01/A02/A15/A18/A23/A24/A25/A26:** 26-agent qualification campaigns.

The **ten extra upstream development skills** (`security-threat-model`,
`security-best-practices`, `agent-supply-chain`,
`build-evidence-map`, `eval-engineering`, `skill-creator`,
`test-gap-audit`, `github-actions-hardening`, `playwright`,
`gh-fix-ci`) are
text-only references in the connected ChatGPT skill library. Their pinned
upstream source and licenses are in `config/external-skill-sources.json`.
They are **not** added to the model runtime and do not install scripts,
plugins, LangGraph or any new API dependency.

The engineering skill documentation and runtime registry are protected
software-security paths: update only through exact-head PR review and
governance CI. Test routing via `tests/navalSkillRegistry.test.ts` and
`tests/governanceApprovalRoutes.test.ts`. Neither passing these tests
nor applying a procedure means an agent ran a live model, an engineering
result was externally validated, or a vessel baseline was released.
Full adoption/hold and threat review:
`docs/SPECIALIST_SKILLS_SUPPLY_CHAIN_AND_ACCEPTANCE_20261115.md`.


## FINAL SKILL FREEZE — adopted roster only

Following the Project Lead's 2026-11-15 instruction to adopt the final seven
skills and stop, the Naval AI Lab agent/engineering roster is **frozen at 31
skills**: 12 pre-existing agent-engineering references, 10 external
development-skill references (including the final four) and 9 source-controlled
USV-01 specialist procedures (including the final three). This does **not**
change the canonical **26-agent count**. The exact reviewed allowlist and
exception criteria are in `config/agent-skill-freeze.json` and
`config/external-skill-sources.json`; source-controlled procedural contracts
remain in `skills/usv01/` and deterministic routing in
`src/core/skills/NavalSkillRegistry.ts`.

Do not install or propose additional skills, agents, orchestration frameworks,
MCP providers or paid model integrations simply to increase capability counts.
An addition requires a documented gap, explicit Project Lead authorization,
source and security review, exact-head protected software approval and passing
CI. Maintenance of an already approved skill without changing its identity
remains possible under the same applicable software/engineering governance.
The `test-gap-audit` connected record is a source-attributed portable
adaptation; the other three final external records are copies of pinned
upstream skill instructions. None is a native plugin/runtime installation.
Do not reinterpret a skill pass as qualified physical engineering evidence,
current trusted-host commissioning or approved vessel release.

## Naval Design Studio — mandatory UI/UX skills (separate development toolchain)

The Project Lead explicitly requested installation of five frontend design and
QA skills on 2026-11-15. These are **development-time UI guidance**, not a
change to the frozen 31 engineering/agent skills, the 26 registered agents,
the privileged runtime, or the engineering authority structure.

For work on Naval Design Studio, the application shell, dashboards, CAD
viewport, mobile navigation or accessibility, consult all five pinned skills
in `.agents/skills/` **before implementing**:

1. `frontend-app-builder/SKILL.md` (OpenAI): create a complete high-fidelity
   concept and implementation contract; compare the built UI to approved
   reference imagery rather than judging by a successful build.
2. `frontend-design/SKILL.md` (Anthropic): develop a distinctive naval
   engineering art direction and critique typography, hierarchy, layout,
   contrast, copy, and visual coherence.
3. `ui-ux-pro-max/SKILL.md` (NextLevelBuilder): search the bundled datasets
   for product style, design tokens, typography, stack rules and UX pitfalls.
   The included search tooling needs Python 3 and runs locally.
4. `frontend-ui-engineering/SKILL.md` (Addy Osmani): implement responsive
   components, keyboard controls, accessible states, robust interactions,
   semantic layouts and reusable design tokens.
5. `browser-testing-with-devtools/SKILL.md` (Addy Osmani): verify the
   running implementation in a **real, isolated browser**, including computed
   styles, console/network issues, accessibility tree, screenshot fidelity,
   narrow viewports and zoom. This skill's Chrome DevTools MCP prerequisite is
   not installed by copying SKILL.md: if a real browser is unavailable, flag
   visual acceptance as blocked, never claim it ran.

Apply the workflow **concept → design review → implementation → real browser
QA → independent critique**. Preserve the existing protected engineering
record/solver/agent/governance boundaries. Use actual sources, do not fabricate
release states or vessel metrics. Test at a minimum 1440px, 1280px, 768px,
390px and 320px widths plus 200% zoom and enlarged-text mode. Record
screenshots, keyboard/focus results, contrast measurements and material
mismatches in each UI PR; build/tests alone do not qualify a release.

The project-local installation is readable by compatible repository-aware
agents, but it **does not install or register these skills inside the ChatGPT
host's global skill catalogue**. A ChatGPT assistant can explicitly fetch the
project copies to apply their guidance. For supply-chain metadata and exact
upstream source commits, see `docs/UI_UX_SKILL_STACK.md`.
