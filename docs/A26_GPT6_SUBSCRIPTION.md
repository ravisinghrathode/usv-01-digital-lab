# A26 GPT-6 Astra — ChatGPT subscription route (NO API)

**Scope:** The canonical A26 Global Navy USV Fleet Intelligence agent may request GPT-6 Astra from an operator-authenticated **Codex CLI**, using the operator's existing **ChatGPT subscription**. This change does **not** permit paid OpenAI API requests, key-based provider routing, model-derived software approvals or a 27th engineering agent.

## Model selection rules

- The existing canonical A26 agent ID remains `INTEL-USV-26`. Its signed historical prompt/spec, permissions and engineering evidence are not changed. A26 continues using the existing `codex_cli` provider.
- GPT-6 Astra is **optional**, disabled by default to preserve the operator's subscription usage. For an explicitly approved research session, enable `USV_A26_GPT6_SUBSCRIPTION=enabled` along with the normal **signed-in Codex subscription pilot**.
- The only accepted requested model ID is `gpt-6-astra`, and only when `agentId=INTEL-USV-26` and `role=worker`. The adapter passes `--model gpt-6-astra` to `codex exec` in **read-only, ephemeral mode**, with no shell.
- The operator's Codex CLI must be **version 0.153.0 or newer** and signed in with ChatGPT (not an OpenAI API key). Authentication and version are checked before any task execution. If the account cannot use Astra or a usage limit is hit, the task fails. **No automatic fallback to paid API, another model, mock synthesis or unauthorized tools.**
- `USV_ALLOW_PAID_AI_API=false` is mandatory. `sanitizedSubscriptionEnvironment` strips API credentials from the child; the request cannot set arbitrary model names or execute under A01–A25.
- **Model identity is not independently attested by the present CLI adapter.** A successful run records `gpt-6-astra-requested-via-subscription-model-unverified` rather than claiming that GPT-6 definitely produced the output. A future authenticated model-metadata receipt is necessary for verified model attribution.
- No agent approval, software qualification, vessel engineering acceptance, runtime tool activation, untrusted source execution, or safety authority is created by selecting a more capable model.

## Operator-local configuration

On a trusted USV-01 workstation using the **official Codex CLI signed in with ChatGPT**, use the existing research pilot settings and request the model:

```bash
export AI_REVIEW_PROVIDER=codex_cli
export USV_SUBSCRIPTION_PILOT=enabled
export USV_ALLOW_PAID_AI_API=false
export USV_A26_GPT6_SUBSCRIPTION=enabled
```

This **does not** configure an API key or separately billed OpenAI API. Do not add credentials to GitHub or source-controlled files. Local auth and account entitlements are not accessible to GitHub CI.

The source code and CI can verify routing, command-line safeguards and negative tests; **CI cannot assert that a real paid subscription, a GPT-6 model entitlement or a live A26 inference is present**.

To disable this optional request, unset `USV_A26_GPT6_SUBSCRIPTION`; A26 returns to the prior signed-in Codex CLI selection, still subject to the lab's existing authentication and research controls.

**References:** [A26 integration charter](EXTERNAL_INTEGRATION_AGENT_CHARTER.md), [subscription-only runtime](CODEX_NATIVE_AGENT_RUNTIME.md), [OpenAI's current ChatGPT Work/Codex availability](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex), and [Codex CLI model option](https://learn.chatgpt.com/docs/cli/reference).
