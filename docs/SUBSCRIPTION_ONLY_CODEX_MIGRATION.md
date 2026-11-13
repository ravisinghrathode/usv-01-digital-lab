# Subscription-only Codex migration — USV-01

**Status:** Codex-assisted engineering operating procedure active for the bounded local Mission Control pilot; native in-process model-provider replacement **not complete**. Do not use this document to close AGT-02 or other independent engineering acceptance obligations.

## Objective

Use the Project Lead's existing ChatGPT subscription for interactive Codex/ChatGPT Work engineering without purchasing or provisioning Gemini or OpenAI API keys. Keep deterministic CI, evidence provenance, technical review and Project Lead approval controls intact.

## Repository audit — 2026-11-13

| Component | Existing dependency | Subscription-only disposition |
| --- | --- | --- |
| `src/core/models/ModelProvider.ts` | `GeminiProvider` requires `GEMINI_API_KEY`; `OpenAIProvider` requires `OPENAI_API_KEY` | Retained as optional legacy code; neither provider can authenticate directly using ChatGPT subscription entitlement; deterministic mode for CI |
| `src/server/geminiService.ts` | Google SDK and `GEMINI_API_KEY`; generation and live streaming | **Not migrated**; browser/server live AI endpoints need independent service credentials or a different supported architecture |
| `src/core/agents/definitions.ts`, `BaseAgent.ts` | 26 role specs; model router and mandatory deterministic tools | Preserve role specs, tools and provenance; interactive Codex is *not* an in-process drop-in model provider |
| `scripts/run-live-agent-matrix.ts` | Native live provider matrix | **Not runnable as true live provider matrix without supported runtime AI authentication** |
| `scripts/governance/independent-ai-review.ts` | Optional model-backed Stage C, with deterministic rule layer | CI invokes deterministic layer only; cannot claim completion of independent live AI review from rule checks |
| `.github/workflows/safety-governance-gate.yml` | Auto-selects Gemini if repository key exists | Set explicit deterministic mode and remove Gemini key/model injection from CI; preserve checks and stages |
| `evidence/live-agents/live-gemini-26-20261113.json` | Historical external Gemini campaign | Preserve unmodified as historical evidence, not new Codex evidence |
| `@google/genai` package | Used in multiple active server paths | Retain until compatible server replacement is designed and tested; deleting it breaks production imports |

## Operating method without API billing

1. Open the GitHub repository as a Codex Cloud task or in the Codex desktop app/CLI; select **Sign in with ChatGPT**. Subscription use is subject to plan eligibility and limits. Model choice is whatever is available in the signed-in Codex interface, not an unverified hard-coded model identifier.
2. Use `AGENTS.md` to direct Codex to implement engineering code, review evidence and create feature-branch PRs. Use actual deterministic project test runs for calculations and traceable verification.
3. Allow GitHub Actions to execute independent numerical oracles, static security checks, traceability audits and human-signature validations without external model endpoints.
4. Record live AI-assisted work as advisory; capture model/run identity if exposed, source SHA, role, prompt/task, inputs, outputs and tool evidence. Explicitly mark third-party verification and Director approval pending until independently obtained.
5. Keep all safety-critical decisions under Project Lead sign-off. A Codex review is not itself an independent engineering certificate or a Director signature.

## Capabilities blocked without API or supported unattended identity

- Native browser/server text-generation endpoint `/api/gemini/generate`, Gemini live streaming and any similar in-process LLM request.
- Unattended `BaseAgent` synthesis with a remotely hosted model in GitHub Actions or a deployed server; ChatGPT subscription sign-in is not equivalent to an API key for these code paths.
- Scheduled/automatic independent model-backed Stage C technical review inside standard GitHub Actions. Deterministic checks remain possible; don't advertise them as an independent AI reviewer.
- Automated all-26 `LIVE_AI_GENERATION` acceptance and authentic in-process model/tool execution matrix, until a supported subscription-compatible runner is engineered and demonstrated.
- Any claim that GPT-6 Astra is selectable in a particular Codex session without verifying that session's actual available models.

## Verification and acceptance boundaries

A valid migration PR must pass repository checks and identify its exact commit SHA. Keep AGT-02 native execution, external engineering evidence, integration coverage and authorized Stage D signatures open until their required evidence exists. Never update the historical Gemini campaign to label its outputs as Codex. No change here closes engineering blockers or waives safety governance.

## References

- https://learn.chatgpt.com/docs/auth?surface=cli
- https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- https://learn.chatgpt.com/docs/github-action


## Bounded Mission Control implementation

The local Mission Control pilot can now use one signed-in Codex CLI for its logical orchestrator, specialist worker and reviewer roles. This removes mandatory Claude/Antigravity CLI dependencies and preserves the existing 26 specialist contracts and deterministic tools.

Because all three logical roles may use the same provider, the resulting reviewer record is explicitly marked non-independent. Same-provider approval therefore advances only to human review; it cannot satisfy independent engineering review, Stage D authorization or vessel release.
