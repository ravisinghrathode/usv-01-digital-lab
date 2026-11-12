# USV-01 Operational Commissioning Runbook

## What is now executable

This release adds the first **functional, credential-scoped** commissioning adapters—not just acceptance metadata. All checks are intentionally **non-actuating**: no vessel steering, propulsion, weapons or real autonomy controls are issued.

### One combined command

Run on an authorized controlled engineering workstation, not an untrusted public pull request:

\`\`\`bash
npm run acceptance:commission -- \
  --baseline-sha EXACT_APPROVED_40_CHARACTER_GITHUB_SHA \
  --agent-cases PRIVATE_AGENT_CASES.json \
  --benchmark-file PRIVATE_REFERENCES.json \
  --safety-cases PRIVATE_SAFETY_SCENARIOS.json \
  --marine-cases PRIVATE_MARINE_MEASUREMENTS.json \
  --evidence-file PRIVATE_ACCEPTANCE_REFERENCES.json \
  --run-integrations
\`\`\`

All optional files are JSON. The individual existing acceptance parser and new strict safety/marine schemas reject malformed data, non-finite measurements and unexpected properties. The runner generates **governance/reports/commissioning-suite.json** and **commissioning-suite.md** with per-category outcomes. Without optional inputs it safely reports NOT RUN or missing evidence, rather than falsely passing.

### Live integration environment — private process environment ONLY

- \`USV_DEPLOYMENT_ORIGIN\`: exact public HTTPS base origin of running lab (e.g. \`https://approved-lab.example.org\`), **not** a general Google AI Studio editor URL
- \`LAB_SESSION_TOKEN\`: valid short-lived lab Bearer session for a recognized staff member
- \`RELEASE_COMMIT_SHA\`: exact 40-character Git source revision the deployment claims to execute
- \`GOOGLE_DRIVE_ACCESS_TOKEN\`: short-lived restricted OAuth access token with Drive file create/read/update/trash permissions; never a service-account key in the repository
- \`GOOGLE_DRIVE_FOLDER_ID\`: approved USV-01 Drive folder identifier
- \`OBSIDIAN_VAULT_PATH\`: authorized local vault root, mounted on the workstation running the command
- \`GEMINI_API_KEY\`: active Google Gemini API credential if running real model tests
- \`GEMINI_MODEL\`: optional deployment override of per-agent model identifiers for synchronized provider migration

**Never paste tokens, passwords, bearer sessions or private hull data into GitHub, ChatGPT messages, PR descriptions or CI logs.** The PR workflow deliberately does not receive those credentials. Use an approved secret store and securely authorized workstation for live runs.

### Specific operations

1. **All 26 agents (AGT-01/02):** \`npm run acceptance:live-agents -- --cases PRIVATE_AGENT_CASES.json\`. The case file is a JSON object keyed \`A01\` through \`A26\`, with each entry containing \`taskId\`, \`context\`, and \`parameters\` matching that agent's Zod schema. Each agent actually executes; its result records provider, correlation ID, model execution mode and SHA-256 digest of outputs. Missing case, invalid input, deterministic/mock provider or failed execution is explicitly reported. A genuine model call is **not** validation of engineering predictions.
2. **Hydrostatics, resistance, structure (HYD/RES/STR):** supply approved independent reference values and tolerances to the existing benchmark engine. The comparator measures numeric agreement; provenance, GZ data, CFD/tank validation and FEA review remain external.
3. **Autonomy safety (AUT-01):** submit simulations containing COLREG, link-loss, degraded sensing and propulsion-fault scenario traces. The evaluator tests required fault injection, preapproved contingency, containment, abort capability, observed CPA and missing-case coverage. All results are simulated only; do not connect live actuators.
4. **Marine systems (MAR-01):** submit launch/recovery load, sealed-hull thermal, wet-end acoustic, fouling/corrosion and bilge/condensation measurements with unit, reference and approved design limit. Even complete numeric coverage is uncertified without independent sources and engineering review.
5. **Google AI Studio / deployed application (INT-01):** the public HTTPS lab origin must deny unauthenticated access to readiness, export, snapshot and agent execution APIs; the authenticated readiness response must report the exact expected source SHA. This is **runtime provenance plausibility**, not cryptographic attestation of the hosting platform.
6. **Google Drive (INT-02):** with scoped OAuth access, create a unique non-sensitive file in the approved folder; upload content, download and verify SHA-256, confirm parent and inspect folder permission listing. The runner **trashes** its probe in a \`finally\` block. Permission revocation and full two-way conflict testing still require additional independent testing.
7. **Obsidian (INT-03):** create two uniquely named Markdown notes in a fresh temporary subfolder of the configured local vault; verify the exact wikilink, detect stale-file-hash conflict and remove the temporary files. This proves local vault filesystem access only: Obsidian app indexing and multi-device sync are not confirmed by the script.
8. **Cybersecurity (SEC-01/02):** the HTTPS probe asserts unauthenticated API isolation and existing CI checks test RBAC, credential handling and audit boundaries. Authorized independent penetration testing, source inspection and tamper-resistance evidence remain required.
9. **Governance (GOV-01/02):** independent reviewer findings and real Engineering Director cryptographic approval must be linked to the exact baseline where applicable. AI and synthetic evidence cannot sign.
10. **Deployment/restore (DEP-01):** server persistence uses atomic same-filesystem replacement and refuses silently replacing corrupt project data with demo data. Unit tests exercise an isolated snapshot/restore drill. Still perform controlled **actual production** restore, TLS/security monitoring and rollback exercises before acceptance.

### Key safety distinctions

- \`LIVE_PROBE_PASSED_UNATTESTED\` is an observation, **not** independently verified acceptance.
- \`SCENARIO_CHECK_PASS_UNCERTIFIED\` and \`NUMERIC_ENVELOPE_PASS_UNCERTIFIED\` are numerical/logical screening states, **not** class approval or sea-trial certification.
- \`providerOperationalMatrixComplete\` demonstrates 26 provider executions, **not** agent domain accuracy, reliability or engineering sign-off.
- Successful CI on a pull request does not constitute human approval. Stage C/D/E governance remains mandatory.
- If credentials, approved hull offsets/reference data, physical plant or independent reviewers are not available, those blockers remain explicitly pending.

## CI posture

Each commit now runs a non-secret **offline commissioning readiness** report in addition to the existing comprehensive tests, acceptance campaign, security checks and production build. Live API smoke checks remain opt-in and run only on an authorized machine with secrets outside source control.
