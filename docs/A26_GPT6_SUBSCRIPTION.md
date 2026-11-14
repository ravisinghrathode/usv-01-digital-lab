# A26 — Standard GPT-6 Sol over the existing ChatGPT subscription

**Decision:** A26 uses **standard GPT-6 Sol**, the Codex model ID `gpt-6-sol`, whenever the existing **operator-authorized, ChatGPT-signed-in Codex research pilot** runs. This is **not GPT-6 Astra**, and does not require an additional Astra entitlement, OpenAI API key, API billing or a new engineering agent.

## Exact implementation and boundaries

- **Canonical identity unchanged:** A26 is `INTEL-USV-26`; its source-controlled historical prompt, role, `READ_ONLY`/`BASELINE_DRAFT` engineering permissions and the 26-agent registry are unchanged.
- **Standard GPT-6 default for A26:** `selectA26SubscriptionModel` returns `gpt-6-sol` for A26 while the existing `AI_REVIEW_PROVIDER=codex_cli` and `USV_SUBSCRIPTION_PILOT=enabled` research authorization is active. There is **no separate A26-specific opt-in toggle**, and other agents do not inherit its model override.
- **No extra API charges:** The existing `runSubscriptionCli` invokes `codex exec --model gpt-6-sol` in read-only, ephemeral mode with `shell: false`, checks that the local operator is signed in with **ChatGPT** instead of an API key, and strips API/billing credentials from the subprocess environment. Set `USV_ALLOW_PAID_AI_API=false` as an explicit declaration; omitting it remains paid-API denied by the existing policy. Any attempt to activate paid API mode conflicts with the A26 subscription grant and fails closed.
- **Source trust unchanged:** A26 may draft public-source software assessments, not execute untrusted repositories, activate external runtime tools, alter the engineering baseline, self-approve security or licenses, or issue vessel controls or engineering release.
- **CLI availability:** Use an up-to-date official Codex CLI whose authenticated ChatGPT account can select `gpt-6-sol`. The previous `>=0.153.0` CLI rule was **specific to Astra** and is not an evidenced Sol requirement; it has been removed. If a CLI cannot select the model, local login is absent, usage limits are reached or Codex execution fails, the run fails without substituting a paid API, Gemini, an unselected model, or fabricated success.
- **Model identity:** The present CLI adapter cannot attest the actual model cryptographically. Its output therefore records `gpt-6-sol-requested-via-subscription-model-unverified`, not "verified GPT-6". Real session evidence must be separately collected by an operator before commissioning claims.

## One existing pilot setup, no additional A26 setting

On an operator-controlled computer with the officially supported Codex CLI **signed in with the ChatGPT subscription**, the existing pilot uses:

```bash
export AI_REVIEW_PROVIDER=codex_cli
export USV_SUBSCRIPTION_PILOT=enabled
export USV_ALLOW_PAID_AI_API=false
```

When A26 is dispatched in this research pilot, its Codex CLI invocation selects `gpt-6-sol` automatically. The optional setting `USV_A26_GPT6_SUBSCRIPTION` from the withdrawn Astra proposal is **not used or needed**.

Running tests in GitHub checks the source routing, permission boundaries and model flag **without using a paid subscription or API key**. CI has no access to the operator's personal ChatGPT sign-in and **cannot claim that a real GPT-6 Sol request actually ran**.

**Authorities:** [A26 external-software integration charter](EXTERNAL_INTEGRATION_AGENT_CHARTER.md) and [subscription-only Codex runtime](CODEX_NATIVE_AGENT_RUNTIME.md). [OpenAI Codex model selection](https://learn.chatgpt.com/docs/models) lists `gpt-6-sol` as a model in the GPT-6 family; account eligibility and rollout remain dependent on the ChatGPT subscription and client.
