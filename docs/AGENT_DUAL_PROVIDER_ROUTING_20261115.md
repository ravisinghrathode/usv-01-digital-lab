# USV-01 | Dual-provider model routing for all 26 specialist agents

**Scope:** research-only, local subscription CLI research. No paid OpenAI/Gemini API, no Navy/client restricted-data export, vessel authorization, engineering certification or human-review bypass.

## Model preference
1. **Primary:** ChatGPT / Codex CLI, request `gpt-6.1-sol` for each canonical specialist A01–A26. This is an explicit model request, not proof that the account has entitlement or that service reports exactly that model.
2. **Secondary on explicit transport errors:** Google Gemini CLI, request `gemini-3.1-pro-preview` through its existing operator Google sign-in. The model must be supported by that account, CLI and current rollout; capture the model ID returned by the tool. No API-key or Vertex fallback.
3. **No fallback:** safety refusal, content denial, schema/JSON failure, deterministic calculation failure, engineering/TBD gate, missing transfer approval, ambiguous CLI error, or both providers unavailable.

## Required controlled host values
On the already independently approved A04 host, under the operator's private environment and after applicable information-security review:

```sh
export AI_REVIEW_PROVIDER=codex_cli
export USV_SUBSCRIPTION_PILOT=enabled
export USV_ALLOW_PAID_AI_API=false
export USV_LAB_SCOPE=RESEARCH_ONLY
export USV_DUAL_PROVIDER_ROUTING=enabled

# ONLY after explicit independent determination that the whole campaign uses
# public/non-sensitive inputs whose transfer to Google is authorized:
export USV_GEMINI_FALLBACK_APPROVED=true
export USV_GEMINI_OAUTH_REVIEWED=true
export USV_GEMINI_DATA_CLASSIFICATION=PUBLIC_NON_SENSITIVE
```

The three `USV_GEMINI_*` approvals MUST NOT be set for controlled/unknown Navy/customer requirements, drawings, CAD, specifications, protected test evidence or source whose disclosure is not licensed. A label supplied by a user or model cannot make such material public.

## Preflight and evidence
- Install current official Codex CLI and Gemini CLI on the same isolated host. Keep both session credentials in operator-controlled local storage outside Git and CI artifacts.
- Run `codex login status` and ensure it says signed in using ChatGPT, not API key. Start `gemini` interactively and sign in with Google; have the operator verify the cached authentication choice is not API key or paid Vertex. Neither `gemini --version` nor any offline unit test proves an active OAuth session.
- Run `npm run mission-control:model-health` (offline/no model calls), `npm run mission-control:test` and `npx vitest run tests/dualSubscriptionRouting.test.ts` at exact reviewed commit SHA, and perform one explicitly authorized *public test-only* primary call and one supervised fallback call to verify actual provider and model identities.
- The existing `acceptance:full-26` and signed host-health contract still require authentic **Codex** execution for all 26 roles. A Gemini fallback response is explicitly **NOT** promoted to the 26/26 Codex-only operational acceptance until a separately reviewed multi-provider cryptographic attestation/evidence standard is adopted. This keeps old source-and-host gates intact.
- Direct `gemini` CLI selection remains a separate legacy path; this controlled two-provider fallback applies only to codex-pinned canonical agent requests. The 26 registered agent definitions remain unchanged.
- The Gemini CLI can route internal sub-models; never report the requested Pro model as verified unless the response metadata establishes the actually selected model. Do not use model labels as engineering reliability grades.

## Failure handling and privacy
- All model outputs are unverified advisory analysis and must satisfy each registered specialist's JSON schema and existing deterministic-tool permissions.
- Fallback is **off by default**. On a retryable failure without an approved campaign-level public-data transfer, stop with an explicit `USV_GEMINI_TRANSFER_BLOCKED` result.
- Any quota pause remains bounded. A local Codex request-budget HOLD is a hard stop, not a reason to switch vendors. Gemini calls use a separate persistent, bounded local budget at `~/.usv01/runtime/gemini-quota.json`; never reset the ledger to evade allowances. Gemini fallback is not an unlimited retry loop.
- If either provider's credentials, stored settings or data handling cannot be checked by the operator, stop; do not place any secret in GitHub, Google AI Studio app source, public CI logs, or Obsidian.
- Full autonomy, release signatures and deployment on vessel hardware stay blocked until independently qualified human authority explicitly approves them.

**Official references:** https://learn.chatgpt.com/docs/models ; https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/authentication.mdx ; https://ai.google.dev/gemini-api/docs/models ; https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/headless.md
