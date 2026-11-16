# Rebuilt agent-framework source research catalog — 2026-11-17

> **RECONSTRUCTED REPLACEMENT, NOT RECOVERED ORIGINAL.** Seven source repositories were selected anew after the previous unpublished 97-entry register and seven checkout revisions could not be recovered. They may differ from those originally used.

## Evidence boundary

- The source identities, current immutable commit SHA, commit tree SHA, and root `LICENSE` Git blob SHA below were fetched independently from GitHub's public API on 2026-11-17. Root license text was read at the specified revision and blob SHAs were matched.
- These checks **do not** establish a complete clone, dependency/SBOM/CVE review, subdirectory/license compatibility, sandbox execution, prompt-injection resilience, numerical validity, engineering approval, or runtime integration. Source commits can be inspected by their immutable URLs; no third-party repository copies are committed to USV-01.
- Each item is **DISCOVERED / NOT_APPROVED / NOT_INSTALLED / NOT_VALIDATED**, with zero `actualUsage` events. Planned research is not executed research. Records are published only through the protected review process.
- All A01–A26 project agents can reference the version-controlled register subject to existing permissions; no new model/tool access, MCP endpoint, browser session, hosted service, source excerpt broker, or automatic context injection is asserted.

## Verified immutable identifiers

| USV ID | Upstream | Commit SHA | Tree SHA | Root LICENSE blob SHA | License metadata |
| --- | --- | --- | --- | --- | --- |
| EXT-101 | [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI/tree/96c4d85b6423dd06b7f1c38f12dd472399c6ce43) | `96c4d85b6423dd06b7f1c38f12dd472399c6ce43` | `9c8503b4211110420143306f9beca366a773c9f8` | [`a6ee25527ec07201e4373fcbf89f128f304a6f2e`](https://github.com/crewAIInc/crewAI/blob/96c4d85b6423dd06b7f1c38f12dd472399c6ce43/LICENSE) | MIT — human review PENDING |
| EXT-102 | [browser-use/browser-use](https://github.com/browser-use/browser-use/tree/4b5b1b0aa0ab45a1d6a2a31984d37d3e748c0134) | `4b5b1b0aa0ab45a1d6a2a31984d37d3e748c0134` | `401428e7ca7d478550c62b3926c30781efe068fc` | [`1ea3836ce58a4cd32c90c0b4f4e736d840d23780`](https://github.com/browser-use/browser-use/blob/4b5b1b0aa0ab45a1d6a2a31984d37d3e748c0134/LICENSE) | MIT — human review PENDING |
| EXT-103 | [langgenius/dify](https://github.com/langgenius/dify/tree/0ba3c9d76887b6c89c943abaab87f8d86c27d612) | `0ba3c9d76887b6c89c943abaab87f8d86c27d612` | `08515a12769dc1838d56ffa5a1411d97d8d486e7` | [`329ee302875f292fdd11e12e830562d0be9ade1c`](https://github.com/langgenius/dify/blob/0ba3c9d76887b6c89c943abaab87f8d86c27d612/LICENSE) | NOASSERTION — human review PENDING |
| EXT-104 | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph/tree/02f2c2e6c992ffccce9e9129781fdd04f015c6fa) | `02f2c2e6c992ffccce9e9129781fdd04f015c6fa` | `17836360185df72528d58c50fea086b03dfe2326` | [`fc0602feecdd6748623c852ab534e1ca612673c7`](https://github.com/langchain-ai/langgraph/blob/02f2c2e6c992ffccce9e9129781fdd04f015c6fa/LICENSE) | MIT — human review PENDING |
| EXT-105 | [microsoft/agent-framework](https://github.com/microsoft/agent-framework/tree/cf5ea1979562efaf993fb3d37958de0c52d612cc) | `cf5ea1979562efaf993fb3d37958de0c52d612cc` | `69bc2a268e8a71929f9e3cd67835c5780e1e6ea0` | [`9e841e7a26e4eb057b24511e7b92d42b257a80e5`](https://github.com/microsoft/agent-framework/blob/cf5ea1979562efaf993fb3d37958de0c52d612cc/LICENSE) | MIT — human review PENDING |
| EXT-106 | [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands/tree/5ed4ffa5ac2509e479acc12b83247fbb4c3612c8) | `5ed4ffa5ac2509e479acc12b83247fbb4c3612c8` | `8b5f706d37e2e68258fc7bc062aa6826e7a7102b` | [`f6f60f52368bcc96f82fbe59ec65049c2c3af9db`](https://github.com/OpenHands/OpenHands/blob/5ed4ffa5ac2509e479acc12b83247fbb4c3612c8/LICENSE) | MIT — human review PENDING |
| EXT-107 | [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk/tree/77001c96f9507be0f4d009b83210a384a5e08bda) | `77001c96f9507be0f4d009b83210a384a5e08bda` | `b10bdc065b26d148271554674303868bb943d495` | [`3d48435454b105021b4f777c11b6b07d8d2ffea3`](https://github.com/modelcontextprotocol/python-sdk/blob/77001c96f9507be0f4d009b83210a384a5e08bda/LICENSE) | MIT — human review PENDING |

## Review and restrictions

- **EXT-101 CrewAI** — reviewers: A04, A20, A23, A26. A04/A23 assess architecture without creating an alternative scheduler; A20 review dependencies and prompt-injection pathways; verify MIT obligations and perform independent security screening.
- **EXT-102 Browser Use** — reviewers: A04, A20, A21, A23, A26. A20/A21 review isolation, URL allowlists, credential protection, exfiltration and prompt injection before any browser integration; no autonomous browsing is authorized.
- **EXT-103 Dify** — reviewers: A04, A20, A21, A23, A26. LEGAL HOLD: assess Dify's modified Apache license and multi-tenant/frontend constraints; A20/A21 review data tenancy, remote services, secret handling and supply chain before any install.
- **EXT-104 LangGraph** — reviewers: A04, A20, A23, A26. Compare state/replay contracts to existing Mission Control, document measured gaps, inspect dependencies and obtain independent security review before any adoption.
- **EXT-105 Microsoft Agent Framework** — reviewers: A04, A20, A21, A23, A26. Assess Python/.NET dependency and hosting implications, licensing and telemetry defaults; preserve subscription-only and no-paid-API policy.
- **EXT-106 OpenHands** — reviewers: A04, A20, A23, A26. A20 review sandbox escape, shell permissions, network access, repository write boundaries and dependency risk before any execution.
- **EXT-107 MCP Python SDK** — reviewers: A04, A20, A21, A23, A26. Review transport authentication, resource authorization, injection threats, dependency provenance and exact scope of read-only exposure before connecting.

## Governance and follow-up

1. A26 tracks pinned research references and updates source revisions by a new reviewed PR. A04 reviews agent-runtime fit, A20 performs license-independent security and supply-chain work, A21 checks interface/data access, and A23 independently checks governance and test evidence. License decisions require competent human review; especially Dify.
2. No additions to `src/core/tools/ToolRegistry.ts`, no provider/model routing changes, no source-code execution, no local/CI installation, no GitHub secret, and no engineering authorization.
3. The canonical dashboard displays a built-in JSON snapshot after merge/deployment; it is not a live catalog browser. A new app deployment/refresh is required to see 97 in the UI.
4. An authenticated task may obtain read-only source excerpts only if the separately governed access service and identity checks already permit it. This PR does not implement or verify that capability.
5. Keep research-only independent of software qualification and certified vessel release; no `ENGINEERING_BASELINE` claims are made.
