# External Software Register — Operating Contract

**Canonical registry:** `src/data/externalSoftwareRegister.json` (source-controlled and reviewed).  
**Readable overview:** `docs/EXTERNAL_SOFTWARE_OVERVIEW.md`.  
**Dashboard:** Lab sidebar → **External Software Register** (read-only source snapshot; deploy/rebuild to refresh).  
**Custodian:** A26, supported by the external Repository Scout and Integration Pipeline.

The existing `src/core/tools/ToolRegistry.ts` is the **runtime permission/execution registry**. This new register is the **software supply-chain and project-usage inventory**. They are deliberately separate; an entry here does **not** install anything or grant tool permissions. The Master Project Register is the project-level index, not a replacement for these evidence records.

## Record lifecycle

1. **DISCOVERED:** Scout metadata only. Public GitHub identity, qualitative relevance and license metadata are unverified.
2. **EVALUATING:** Source commit pinned, source inspected, research integration proposed or static/isolated testing in progress. No adoption.
3. **QUALIFIED:** Independent domain, software security, license and numerical evidence accepted under software governance, but not yet installed in the 26-agent runtime.
4. **INTEGRATED:** Approved code/configuration is registered with an explicit tool ID, runtime deployment evidence and rollback procedure. This is still not vessel engineering-release authority.
5. **RETIRED / REJECTED:** Preserve historical evidence, restrictions and reason; remove deployment permissions via separately approved change.

Use source and status fields conservatively. Never mark a tool **APPROVED** without independent reviewer, legal/license, security and engineering reference evidence. Never mark **INTEGRATED** without an actual production registry entry, runtime evidence and separately reviewed software changes.

## Recording planned and actual use

`plannedUsage` answers: **Which projects and agents intend to use this repository, and why?** It does not imply a computation ran.

`actualUsage` answers: **What was truly executed, for which project, under which exact source SHA, and where is its evidence?** Each event must have:
- `kind`: `SANDBOX_EVALUATION`, `AGENT_TOOL_INVOCATION`, or `ENGINEERING_BASELINE`.
- `project`, `agent` (canonical A01–A26), `sourceCommit` (40-character immutable SHA), and `executionEvidence` (public-safe trusted GitHub evidence URL).
- Engineering baseline use additionally requires `directorAcceptanceEvidence` linked to the controlled released configuration. Sensitive raw evidence remains in restricted Drive/Obsidian, not public GitHub.

A local prototype, standalone mathematical smoke test or user-requested plan **does not** count as USV-01 approved marine engineering use. Individual evidence records should link to test/run IDs, not just generic home pages. Approval is a separately reviewed decision.

## Maintenance and automation

On a protected PR, the deterministic checker rejects duplicate upstream repos, malformed agents/SHAs, stale generated overview, unsupported state transitions and unsubstantiated approval/installation claims.

`node scripts/external-software-register.mjs --check` validates the register and its committed quick overview.  
`node scripts/external-software-register.mjs --refresh` regenerates Markdown after a reviewed register edit.  
`node --test tests/external-software-register.test.mjs` runs fail-closed tests.

The existing weekly **Repository Scout** workflow will also produce `external-register-proposal.json` from newly discovered GitHub candidates. It is uploaded beside the normal Scout report. **This is an unapproved proposal artifact, not a commit to main.** Only additions reviewed in a protected PR become permanent entries. Historical edits remain in Git and can be linked to engineering release manifests.

The proposal is generated locally by:

```bash
node scripts/external-software-register.mjs \
  --scout-report /tmp/usv01-repository-scout/latest.json \
  --proposal-out /tmp/usv01-repository-scout/external-register-proposal.json
```

Never silently replace an existing curated status based on a search score. The proposal tool preserves existing records and creates newly discovered entries as `DISCOVERED`, unapproved and uninstalled.

## Why the first record says zero actual uses

`EXT-001` covers Fossen Python Vehicle Simulator. Its pinned source was inspected in CI, and research adapter code was merged; these are **software evaluation and source-inspection activities**, not authenticated use of a qualified model to generate accepted USV-01 design calculations. The planned A08/A16/A17 use is visible; `actualUsage` remains empty until evidence of real runtime execution is reviewed.

## Limits

- The dashboard renders **committed source data**. It cannot independently prove that a deployed lab is running the same commit or provide live usage events. Live runtime accounting would require authenticated, persistent usage-event APIs and reliable commit/agent identity linkage; not claimed here.
- Scheduled discovery is bounded and not exhaustive across all Git forges; new entries become permanent only after review.
- The inventory is public-source-safe. Private engineering evidence stays in controlled storage, with public-safe identifiers/links only.
- No new 27th engineering agent is created; A26 coordinates the supporting service.
