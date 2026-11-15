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

The **six USV-01-owned skills** are under `skills/usv01/<skill-id>/SKILL.md`.
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

The **six extra upstream development skills** (`security-threat-model`,
`security-best-practices`, `agent-supply-chain`,
`build-evidence-map`, `eval-engineering`, `skill-creator`) are
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
