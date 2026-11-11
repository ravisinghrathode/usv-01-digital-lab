# NAVAL-USV | USV-01 Digital Engineering Lab
## Git Branch Protection Standard (GPS-001)

**Programme:** NAVAL-USV  
**Standard Reference:** GPS-001  
**Enforcement Level:** Server-Side Authoritative (GitHub REST API v3 / Rulesets)  
**Protected Branch:** `main`  
**Status:** ACTIVE & ENFORCED  

---

### 1. Architectural Mandate

Local Git hooks (`.git/hooks/*`, `scripts/pre-push.sh`) are client-side conveniences. They can be disabled or bypassed by local developers via `git push --no-verify`, `GIT_CHATGPT_BYPASS=1`, or hook deletion. 

**Local hooks must never be treated as an enforceable security boundary.**

Authoritative branch protection is strictly enforced **server-side** by the remote GitHub repository infrastructure.

---

### 2. Active Remote Branch Protection Configuration

The following configuration is actively enforced on `https://github.com/ravisinghrathode/usv-01-digital-lab/branches/main/protection`:

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Deterministic Quality & Governance Gate"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": true,
    "required_approving_review_count": 1
  },
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
```

---

### 3. Rule Enforcement Matrix

| Control | Remote Enforcement State | Technical Mechanism |
|---|---|---|
| **Direct Push Blocking** | **ENFORCED** | Any direct `git push origin main` is rejected with `GH006: Protected branch update failed`. |
| **Mandatory Pull Requests** | **ENFORCED** | All modifications must arrive via a GitHub Pull Request from a feature branch. |
| **Required Status Checks** | **ENFORCED** | The CI job `Deterministic Quality & Governance Gate` must report green success before merge. |
| **Strict Up-To-Date Check** | **ENFORCED** | Branch must be rebased/merged with current `main` prior to merging (`strict: true`). |
| **Dismiss Stale Approvals** | **ENFORCED** | Pushing new commits to an open PR instantly revokes prior approvals (`dismiss_stale_reviews: true`). |
| **CODEOWNERS Sign-off** | **ENFORCED** | Changes touching safety, security, workflows, or baseline context require `@ravisinghrathode` review. |
| **Conversation Resolution** | **ENFORCED** | All review comments and discussions must be explicitly marked resolved. |
| **Force Push Prevention** | **ENFORCED** | `git push --force` is permanently rejected on `main`. |
| **Branch Deletion Prevention** | **ENFORCED** | Deletion of `main` is disabled. |
| **Admin Enforcement** | **ENFORCED** | `enforce_admins: true` guarantees that even repository administrators cannot bypass PR checks. |

---

### 4. Verification Evidence

The configuration was verified via the GitHub API:
```bash
gh api repos/ravisinghrathode/usv-01-digital-lab/branches/main/protection
```
HTTP response confirmed status code `200 OK` with all above properties enabled.
