# Project Lead: one-click eligible PR merge

## What the button does

In the USV-01 Project Overview, a signed-in Engineering Director sees **Approve & Merge All Eligible PRs**. Clicking it submits one request to the server. The server dispatches the GitHub Actions workflow `project-lead-bulk-merge.yml` on `main`.

The GitHub workflow visits open PRs by ascending number (including the platform stack #48–#52 in dependency order), and merges **only** when:

- The PR is not a draft and targets `main`.
- The latest independent GitHub review decision is `APPROVED`.
- GitHub's merge state is `CLEAN`, respecting protected-branch checks and merge policy.
- The PR head commit SHA remains unchanged at merge time.
- GitHub's merge endpoint accepts the merge without an administrator override.

It skips all other PRs, records **HOLD** for each, and publishes merged/held counts in the Actions job summary. It never adds a review, signs ECR evidence, disables CI, alters rulesets, or claims engineering release acceptance. GitHub may temporarily report `UNKNOWN` after an earlier merge: a later click can re-evaluate skipped PRs.

## Deployment prerequisites

1. Merge this PR **normally** through its own required independent review and governance checks. New workflow-dispatch actions cannot be used on `main` until the workflow is merged.
2. In the deployed lab server's private environment (not in source control), set `USV01_GITHUB_DISPATCH_TOKEN` to a fine-grained GitHub token **owned by the repo owner `ravisinghrathode`**, restricted to `ravisinghrathode/usv-01-digital-lab`, with Actions: Read and Write permission. The configured account must have permission to trigger workflows; keep token out of browsers/logs.
3. Ensure the server's Engineering Director account is provisioned and sign in normally. The endpoint checks the server-authenticated director role and exact staff identity.
4. Ensure GitHub Actions workflow permissions permit `GITHUB_TOKEN` to write contents and pull requests where rules allow. Branch protections and independent approvals remain active.
5. Open Project Overview, click the button, then use the **View GitHub execution** link to see individual HOLD reasons.

**This is a merge convenience button, not a substitute for Project Lead cryptographic Stage D authorization when that is required.** GitHub reviews must be completed independently; an author cannot approve their own PR. A software merge is not vessel design release.

## Security and operational limitations

- The workflow only runs for authenticated GitHub actor `ravisinghrathode` from `main`. A token for another user or a GitHub App actor will not pass this authorization rule.
- The server fails closed if the dispatch token is missing, expired, or insufficiently scoped.
- The workflow tries GitHub's `merge` commit strategy. If the repository has disabled merge commits, PRs remain held until the workflow method is adapted to an allowed strategy via reviewed change.
- A dispatch acceptance (`202`) means a run was requested; it does **not** mean any PR merged.
- The workflow evaluates up to 100 open PRs. It does not claim to process larger backlogs.
- This feature must be deployed with server and frontend updates; adding this PR alone will not update an already-running external server.
