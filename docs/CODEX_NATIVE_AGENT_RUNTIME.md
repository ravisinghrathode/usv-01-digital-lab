# USV-01 subscription-only Codex agent runtime

**Status:** a guarded native `BaseAgent` synthesis transport is implemented, but **26/26 authenticated live execution and engineering verification remain unproven**.

## How it works

The existing 26 specialist definitions and mandatory deterministic tool paths are unchanged. The `ModelProviderRouter` accepts `AI_REVIEW_PROVIDER=codex_cli` only when `USV_SUBSCRIPTION_PILOT=enabled` and `USV_ALLOW_PAID_AI_API` is not `true`. The override is intentional because historical specialist role definitions prefer Gemini. The new provider invokes the existing fixed-command, read-only Codex CLI adapter in a USV-01 repository working directory, strips API key and billing-related environment variables, and rejects nonzero exits, missing login, overlong inputs, or non-JSON output. No paid API fallback is available. Model identity is *not* asserted from a CLI response without attestation.

## Required boundaries

- An operator must authenticate with **ChatGPT sign-in** in the officially supported Codex CLI. Do not provide or harvest a session token, manipulate local credential stores, or use an API key.
- This adapter supports **local operator-controlled execution only**, not unattended GitHub-hosted GitHub Actions or a deployed web server using a personal ChatGPT subscription.
- Use `AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled USV_ALLOW_PAID_AI_API=false` only in an authenticated, controlled development environment, never as a public-service credential.
- `CodexCliProvider` is for **advisory synthesis** within the existing engineering agent pipeline. Its model output cannot independently establish calculated physics, independent reviewer identity, certified evidence, or engineering approval.
- A completed Codex CLI command is not proof that GPT-6 Astra was selected. Verify the actual session model separately before describing specific model attribution.
- Failed or malformed outputs must remain failures; never relabel deterministic output, mocks, previous Gemini artifacts, or missing calls as live Codex evidence.
- Historic Gemini SDK endpoints, server stream routes and Gemini CLI testing artifacts remain in the code for compatibility and audit provenance. They are **not** migrated and should be retired only after the remaining callers and web UI functions have tested replacements.

## Acceptance still outstanding

Run the full automated build, safety/governance gates and 26 native agent cases on an operator-authenticated Codex CLI installation. Check that all mandatory tool traces genuinely executed, schemas passed, provenance is preserved, no outputs approve vessel baselines, and independent technical acceptance remains outstanding where required. No CI pass or this document alone closes AGT-02, engineering blockers or Director approval gates.

This change does not require an OpenAI API key or a new AI subscription, but remains subject to Codex account entitlements and usage limits.
