# USV-01 Agent Academy — execution plan and qualification gates

**Programme:** A01–A26, existing agent registry; no new role, scheduler, research provider or vessel-release authority.
**Status at creation:** Curriculum implementation proposed. **0/26 independently qualified by this implementation.**
**Security classification:** Research-only and non-operational; no actuators, helm, payload commands or vessel-design certification.

## 1. Hard distinction: study versus qualification

- **Provisioned:** A role has instructions, listed sources, tools and an acceptance rubric. This says nothing about learning.
- **Studied:** An actual subscription-authenticated Codex session reads available, permitted materials and produces an ungraded worked exercise. Its hashed output, source SHA and runtime attempt are recorded.
- **Assessed:** A different unseen challenge with held-out reference is graded by a qualified examiner; the examiner authenticates source rights, editions, numerical reference, measurement provenance and uncertainty. Self-scoring is forbidden.
- **Qualified for supervised research:** Both examination thresholds, 100% critical safety questions, mandatory tool evidence and independently witnessed reference challenge pass; an independent reviewer and a separate human Engineering Director sign the exact evidence with controlled, separate Ed25519 trust roots.
- **Design release:** Still forbidden. Academy qualification does not sign a vessel baseline, satisfy class/flag obligations, permit helm/actuator actions or replace design V&V.

## 2. Implementation inventory

| Stage | Implemented control | Remaining real-world work |
| --- | --- | --- |
| 0. Register | Curriculum is synthesized from 26 canonical roles and 26 accuracy obligations; versioned | None for role mapping |
| 1. Source curriculum | Foundation F01–F05, specialist outcomes, skill procedures and per-role challenge | Verify documents lawfully, source identity, edition, license, applicability and access |
| 2. Guided study | Read-only Codex study sessions, output SHA + source SHA; no grades | Trusted signed-in Codex CLI and operator opt-in |
| 3. Blind evaluation | Exact assessment schema, zero-failure critical-safety threshold and tool obligations | Independent protected question/reference bank, external examiner, captured scored evidence |
| 4. Qualification | Two distinct Ed25519 attestations, grade thresholds, source proofs and exact-current-SHA verification | Provision reviewer/Director trust roots and obtain authentic human signatures |
| 5. Operations | Fail-closed per-role report, research-only ceiling | Downstream design-control integration remains separately governed |

## 3. Knowledge source manifest / licensing

The source IDs in AgentSpec.requiredKnowledgeSources are identifiers, NOT downloadable PDFs, proof a standard is licensed, or proof the AI read it. Every source begins with UNVERIFIED_NOT_INGESTED. The authority reviewer must establish (a) edition, (b) authenticity, (c) legal rights to ingest/use, (d) applicability to this vessel configuration, (e) provenance SHA-256.

Existing local skills under skills/usv01 are procedural guidance candidates and are NOT textbook replacements. Do not automatically copy controlled, client or naval data to public GitHub. Research notes can be drafted for authorized paid Google Drive and an Obsidian graph, but no actual sync is implied without connector receipts.

## 4. Execution commands

All commands from repository root on the exact source revision to be assessed:

1. Generate curricula and baseline status at zero model cost: npm run academy:plan ; npm run academy:status
2. Validate implementation: npx vitest run tests/agentAcademy.test.ts ; npm run lint
3. On isolated trusted host, after source/rights preflight:
   - To request the reviewed primary Sol model on all 26 study workers, additionally set `USV_DUAL_PROVIDER_ROUTING=enabled` together with the full research-only Codex subscription pilot settings. This explicitly requests `gpt-6.1-sol` but does not independently verify actual model entitlement or usage; a missing entitlement fails rather than silently switching to another model.
   - Academy study itself remains Codex-only. The Gemini 4 Hydrogen secondary route for authorized public research tasks must **not** be used to transfer unpublished curricula, source excerpts, controlled/client material or unseen examination references merely because a model is unavailable. Operator-reviewed and independently authorized transfer is a separate gate.
   - Provider login preflight now strips API-key/billing variables. The study report records the exact canonical runtime ID and the **requested** model, not a vendor-attested model identity.
   - codex login status (must be ChatGPT subscription mode, not API key)
   - AI_REVIEW_PROVIDER=codex_cli USV_SUBSCRIPTION_PILOT=enabled USV_ALLOW_PAID_AI_API=false USV_LAB_SCOPE=RESEARCH_ONLY npm run academy:study
   - Optional pilot: append -- --agents A05,A12,A13,A14,A17
4. Review actual ungraded study outputs in data/academy/study-outputs and independently examine all 26 roles with unseen cases.
5. Place externally assessed and signed records in data/academy/qualifications/A01.json through A26.json, conforming to SignedQualificationRecord. The same evidence JSON object must be signed by the reviewer and Director using the bytes defined by academyEvidenceBytes. Sign only after examining authentic graded evidence. Public key PEM files reside outside the repository:
   - USV_ACADEMY_REVIEWER_PUBLIC_KEY_FILE
   - USV_ACADEMY_DIRECTOR_PUBLIC_KEY_FILE
6. Re-run npm run academy:status -- --require-qualified. A nonzero exit is expected until all 26 independently qualify.

CI workflow checks curriculum coverage and deterministic verification only; no hosted model calls or access to reviewer private keys, subscription cookies or restricted sources.

## 5. Records

The locally ignored data/academy/ directory holds:
- curricula.json: role-specific curriculum and unverified source IDs
- attempts/Axx.json: actual source-bound ungraded study attempts
- study-outputs/Axx.json: untrusted study output and learning gaps
- study-progress.json: actual attempt progress, not qualification
- qualifications/Axx.json: externally supplied graded proof with independent signatures
- academy-status.json: fail-closed per-role acceptance status

Do not commit sensitive responses, licensed standards, private keys or unseen examiner answers to public GitHub.

## 6. Gates for any positive 'trained' notification

For EACH of the 26 roles on the current approved source revision: completed authenticated study; accessible source review; five foundation topics; specialist practice; unseen foundation exam at least 90%; unseen specialist exam at least 95%; all critical safety cases passed; actual mandatory tools exercised against verified inputs; independent accepted truth/reference benchmark; separate reviewer and Director signatures bound to evidence SHA/source SHA.

Only academy-status.json with independentlyQualified equal to 26 may trigger a positive notification. A badge, prompt, CI pass, or 26 role responses is NOT enough. All design baselines, physical verification, safety release, human engineering authority and vessel actuation remain separate blocked gates.
