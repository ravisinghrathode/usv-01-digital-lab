# Naval AI Lab: Google AI Studio source synchronization

**Authoritative repository:** https://github.com/ravisinghrathode/usv-01-digital-lab  
**Authoritative branch:** `main`  
**Application entry point:** `/` (Engineering Sessions)  
**Governed technical editor:** `/legacy.html`

## What the code can and cannot do

This repository contains the application source. Google AI Studio Build mode stores its own workspace and preview state; changing GitHub alone does not guarantee that the already-open AI Studio workspace is refreshed. No script in this repository can silently bind a Google account's AI Studio project to a GitHub repository or redeploy a hosted Cloud Run service without that account's authorization.

Google's Build mode documentation describes importing via **Build → Add files (+) → Import from GitHub** and two-way syncing via **Settings → GitHub**. In the already-open Naval Lab, check the repository and branch before pulling. If its connection is missing or broken, save any unpushed Studio edits before importing this **existing** repository; never create a competing repository or force-push stale Studio files onto `main`.

1. Open the existing Naval Lab project in Google AI Studio Build mode.
2. Open **Settings → GitHub** and verify the linked project is `ravisinghrathode/usv-01-digital-lab`, branch `main`.
3. Use **Pull** to bring GitHub changes into AI Studio. If prompted to resolve conflicts, review the diffs and keep the authoritative, newer GitHub version of shared frontend files unless the Studio edit is intentionally being preserved.
4. Restart the app preview. It should open the new Engineering Sessions workspace at `/`. The old visual URLs redirect to `/`, while `/legacy.html` keeps the authenticated engineering editor.
5. Check the bottom session tray for **GitHub source: XXXXXXXX**. It reflects the build's Git commit if Git metadata exists; **revision unverified** means the preview cannot prove its revision (common with ZIP imports). Check GitHub's current `main` commit and compare if a revision is reported.
6. If the AI Studio project is stuck on its old copy or the GitHub tab offers only creating a new repository, back up any unpushed Studio edits and **Import from GitHub** using the existing repository. Do not overwrite `main`. If you have a Cloud Run service, redeploy it separately; editing the source repository is not a Cloud Run deployment.

## Runtime contract and verification

- Node.js **22** and npm with the repository's lockfile
- `npm ci` to install
- `npm run dev` to start the actual Express + Vite development server (`PORT=3000` by default, bound to `0.0.0.0`)
- `npm run build` to typecheck and create a compiled frontend
- `npm run test:aistudio-startup` to launch the full-stack server on an isolated ephemeral port and check the standard root, session alias, preserved governed editor, compiled client module, and protected API (must be HTTP 401 when unauthenticated)
- `npm run preview` to preview the already-built static frontend, which **does not** provide the authenticated Express backend

A successful static build does not prove that the Express process booted correctly in AI Studio. A successful local smoke test does not prove the Studio GitHub connection, cloud deployment, session login, or release authority.

## Data and governance boundaries

- All example investigation records in Engineering Sessions are synthetic, and no verified USV-01 naval calculation is implied.
- Credentials, engineering project stores, design approvals, and restricted files must remain outside this public repository.
- AI Studio's preview is **not** an authenticated engineering host or an AI-agent runtime certification.
- Engineering agents, live solvers, protected records, and human approval gates must retain their existing server-side authorization; nothing here enables them to run directly inside a browser.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| AI Studio shows an old interface | Confirm Settings → GitHub points to the correct existing repo, then pull `main`. Old Build app state can be stale. |
| Preview stuck on opening | Inspect Studio's runtime/terminal error and run `npm run test:aistudio-startup` outside Studio. The static links to `/legacy.html` remain in the root HTML when JS fails. |
| "Dependency installation failed" | Use Node 22; run `npm ci` from the root; capture the exact failing package/script; do not regenerate the lockfile without reviewing the changes. |
| App renders but engineering records are unavailable | Verify whether Studio runs the Express backend rather than only Vite; all engineering API routes are authenticated and should reject an anonymous request. |
| Source shows "revision unverified" | Git metadata was not present or was not recognized in the imported build; compare the actual source/commit through Settings → GitHub instead. |
| GitHub has changed but Cloud Run is still old | Rebuild and redeploy the running Cloud Run service; Git commits alone do not update it. |

**Reference:** https://ai.google.dev/gemini-api/docs/aistudio-build-mode
