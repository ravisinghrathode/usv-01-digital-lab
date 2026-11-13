# USV-01 — subscription-only Codex operational cutover

**Release status:** source-code cutover to Codex has been implemented for the normal assistant UI, 26-specialist model router, live-provider probe and live design loop. **It is not a certified 26/26 live-agent commissioning record.**

## Supported mode

The user signs into the officially supported **Codex CLI with their ChatGPT account**, on an operator-controlled workstation. No extra OpenAI API credential, separate API billing, Gemini API, scraping of browser sessions or re-exporting auth tokens is supported.

- Local interactive engineering and review: ChatGPT/Codex desktop, Codex CLI or ChatGPT Work.
- Twenty-six specialist agents: existing `BaseAgent` and deterministic naval tools, with `AI_REVIEW_PROVIDER=codex_cli` and `USV_SUBSCRIPTION_PILOT=enabled`. The service fails closed without a valid CLI session or required engineering inputs.
- Web Engineering Assistant: `/api/assistant/assist` uses the authenticated local Codex CLI, and is additionally restricted to requests from **loopback**; the original Gemini generation, streaming, assistant and voice routes return retired status or do not accept upgrades. The UI explicitly shows voice unavailable.
- NotebookLM-style grounded research remains local deterministic source synthesis. It is not silently presented as live ChatGPT.
- Model identity reported by Codex CLI is **unverified** unless backed by trusted provider metadata. No code asserts GPT-6 Astra merely from an account sign-in.
- `@google/genai`, old provider classes, historic unit fixtures, `src/server/geminiService.ts` and research evidence are retained for legacy source compatibility / audit preservation, but are **not used by the migrated web service**. Old manual Gemini scripts remain historical only; `npm run design:live-cli` now uses Codex.

## Operator-local commissioning (no credentials in GitHub)

Once the official `codex` CLI is installed and its ChatGPT sign-in completed, an operator can run in a local checked-out USV-01 repository:

```bash
export AI_REVIEW_PROVIDER=codex_cli
export USV_SUBSCRIPTION_PILOT=enabled
export USV_ALLOW_PAID_AI_API=false
npm run mission-control:preflight
npm run acceptance:codex-agents
npm run design:live-cli -- --revisions 3 --seed 1337
```

The design command first authenticates a **real response** through the Codex CLI; missing login, usage restriction or invalid structured output causes a failed run. All live outputs are **unverified agent proposals** and the release baseline stays on HOLD until qualified external verification.

GitHub-hosted CI must not pretend to inherit the operator's personal ChatGPT subscription. It runs deterministic verification and can test the source code, Docker build, permissions, numerical gates, and governance. Actual live 26-agent provider commissioning remains a separate operator-authenticated test. Do not label deterministic CI as 26 live AI runs.

## Non-negotiable safety rules

The preserved gates require exact revision provenance, mandatory deterministic calculations, no fabricated numerical input or tool evidence, independent technical review where safety critical, and Project Lead signature where required. A signed-in Codex session cannot supply an independent peer review merely by using the same provider twice. No code path may approve naval design release by itself.

## Required evidence for full operational closeout

1. CI quality checks pass on the exact merged code.
2. A real operator-authenticated Codex CLI run produces 26/26 valid nonmock `LIVE_AI_GENERATION` outputs with tool traces for the approved case matrix, clearly labeled *uncertified*.
3. An independent engineering reviewer validates the physical source inputs and closes any safety-critical holds.
4. Project Lead signs the exact approved release digest.

Until those exist, the Gemini-to-Codex **software path** may be integrated, but operational certification remains **NOT COMPLETE**. This distinction is intentional and must not be elided.
