# USV-01 — Instructions for Codex and ChatGPT Work

This repository contains 26 specialist engineering agents (A01–A26). Use the repository's deterministic tools, test fixtures, traceability reports and engineering governance; never treat language-model responses as certified engineering evidence.

## Subscription-only operating mode

- Use the user's existing ChatGPT sign-in in Codex desktop, Codex CLI or Codex Cloud for interactive engineering, design and code-review tasks. Do not request or create API keys, copy ChatGPT session cookies/tokens into GitHub, or attempt to turn subscription sign-in into a server API credential.
- The model selected in the Codex/ChatGPT product is controlled by its available model selector, account entitlement and workspace policy. Do not claim a particular model has executed unless its actual run metadata establishes that.
- GitHub Actions must run deterministic tests, numerical reference oracles and governance checks **without Gemini/OpenAI model calls**. A static rule check is not an AI review; mark missing live AI and independent external evidence explicitly pending.
- The existing runtime's optional Gemini/OpenAI model-provider code is legacy integration, not evidence that ChatGPT subscription authentication works inside the browser/server. Do not invoke these providers in subscription-only operation.
- For live 26-agent model execution, use interactive Codex tasks when supported, record reproducible task parameters and outputs and retain the source revision. Do not represent a Codex narrative or simulated role response as actual `BaseAgent` / `ToolRegistry` execution.
- Do not introduce `OPENAI_API_KEY`, `GEMINI_API_KEY`, GitHub Action `codex exec` with copied personal credentials, or new usage-billed AI services without explicit project authority.

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
