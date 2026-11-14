# Naval Studio X rollout

Naval Studio X is an additive UI. It does not change API routes, server persistence, records, approval gates, the 26-agent registry, or existing view components and their sub-tabs. The existing sidebar and top tabs remain as the classic layout.

## Preview and rollback

1. Build and run the candidate branch. Open `?ui=studio` to preview Studio X. The choice is stored only as a browser preference.
2. Use **Switch to classic layout** in the Studio X sidebar or open `?ui=classic` to return to the former shell. The classic shell includes **Try Naval Studio X**.
3. Validate every module and its internal tabs, login, export/import, verification, and approval flows in a staged environment with representative non-sensitive records. Confirm existing records and permissions remain intact.
4. Promote only through the project's normal branch protection and release approval. If a UI issue appears, switch clients to classic immediately and revert the UI commit in the release branch. No data migration or schema rollback is required.

The new CAD Studio is a preview and record-navigation workspace. The procedural mesh has no authoritative geometry, configuration ID, measured dimensions, section/measurement capability, or CAD revision control. It cannot be used as design or simulation evidence. The inspector reads existing Naval Architecture register values and keeps unknowns as TBD.

## Google AI Studio / deployed app

The repository provides `AI_STUDIO_BUILD_PROMPT.md` and `docs/REPOSITORY_SYNC.md`, which describe importing or refreshing this repository in Google AI Studio Build mode. They do not identify a connected app ID, automated deployment trigger, or running deployment URL. Existing project acceptance records mark deployed source SHA sync as unverified. A GitHub PR or merge therefore does not establish an AI Studio update.

An authorized integration owner should refresh the AI Studio source from the reviewed commit, deploy through the existing approved process, and capture the deployed app URL and authenticated running source SHA. Compare that SHA with the approved GitHub commit, then run the deployment authorization and recovery checks in `docs/COMMISSIONING_RUNBOOK.md`. Until those observations exist, report AI Studio synchronization as **unverified**.
