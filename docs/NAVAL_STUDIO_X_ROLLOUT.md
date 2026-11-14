# Naval Studio X — single-interface release

**Product decision (15 November 2026): Naval Studio X is the sole supported application interface.** The previous Classic shell, duplicate top tab strip, Classic switch, persisted Classic preference and `?ui=classic` selection have been removed from the application. An old bookmark or browser preference cannot re-enable Classic after a build with this change loads.

## Scope and non-loss contract

This change affects only the presentation/navigation shell. All **23 pre-existing modules** remain accessible through the one-source-of-truth `MODULE_REGISTRY`; the new CAD Studio remains the default opening module, for **24 registered modules** in total. No engineering view components, sub-tabs, data records, server API endpoints, agent execution systems, approval gates, authorization rules or CAD provenance declarations are deliberately altered.

Preservation and shell invariants are covered by `tests/studioNavigation.test.tsx`, TypeScript typechecking, the production build and the repository's safety/governance CI. Release acceptance also requires an operator smoke test of every module and critical sub-tab with non-sensitive representative records.

## Operator experience

- Open the application normally. It starts in Naval Studio X, CAD Studio.
- Change workspace using the workspace bar; use the expandable searchable catalogue and pinned entries for every existing and future registered module.
- Previously stored `naval-studio-x-layout=classic` preferences and `?ui=classic` links are ignored. No browser reset is necessary.
- The existing CAD geometry is **an unverified preview, not authoritative engineering CAD or certified physics evidence**. Its status must remain clearly visible.

## Rollout and recovery

1. Merge only after the protected GitHub tests and repository governance rules pass.
2. Refresh/build/deploy the corresponding reviewed GitHub commit into the target execution environment.
3. Verify the **running application source revision** equals the approved GitHub commit, then confirm it opens Naval Studio X without `?ui=studio`, including in a browser that previously selected Classic.
4. Confirm module completeness (24/24, including 23 legacy), login, export/import, verification, approval flows, CAD preview labeling and data integrity.
5. If a defect is found, **revert the UI-only commit under the normal governance process and redeploy** a verified prior build. There is no client-side Classic toggle after this change; rollback is a release action, not an in-app preference. No schema/data migration is introduced here.

## Google AI Studio / deployment status

The app at `https://aistudio.google.com/apps/b79d8d84-9f5e-420a-9dbc-a17f3636987b` has been identified by the operator as the target. The operator reports that it fetches from this GitHub repository. This does **not** prove that an already-running AI Studio preview automatically refreshes on every merge. The repository does not provide verified running SHA evidence or a confirmed automatic deployment trigger.

After the merge, an authorized operator must refresh the AI Studio project from the reviewed `main` revision and check the running source SHA and Studio X rendering. Do not claim the AI Studio application was updated solely from a GitHub merge. See `docs/REPOSITORY_SYNC.md` and `docs/COMMISSIONING_RUNBOOK.md`.
