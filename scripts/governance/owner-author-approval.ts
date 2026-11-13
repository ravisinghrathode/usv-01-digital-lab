import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * GitHub forbids a PR author from submitting an APPROVED review on their own PR.
 * The human author may instead submit a COMMENTED review whose entire body is
 * the commit-specific acceptance token below. Only a repository owner / admin
 * can use this alternative for PROTECTED_SOFTWARE_SECURITY. It is explicitly
 * NOT independent peer review and NEVER applies to a vessel engineering ECR.
 */
export const AUTHOR_SOFTWARE_SIGNOFF_PREFIX = 'USV01-SOFTWARE-AUTHOR-APPROVE';

export function exactAuthorSoftwareSignoff(headSha: string): string {
  if (!/^[a-f0-9]{40}$/i.test(headSha)) throw new Error('Expected exact 40-hex PR head SHA');
  return `${AUTHOR_SOFTWARE_SIGNOFF_PREFIX} ${headSha.toLowerCase()}`;
}

export interface GithubReviewEvidence {
  id?: number;
  state?: string;
  body?: string | null;
  commit_id?: string;
  submitted_at?: string;
  author_association?: string;
  user?: { login?: string };
}

export function hasCurrentHeadAuthorSignoff(
  reviews: readonly GithubReviewEvidence[],
  authorLogin: string,
  currentHeadSha: string,
  isRepositoryAdmin: boolean
): boolean {
  if (!isRepositoryAdmin || !authorLogin || !/^[a-f0-9]{40}$/i.test(currentHeadSha)) return false;
  const authorReviews = reviews.filter(review =>
    review.user?.login?.toLowerCase() === authorLogin.toLowerCase()
  ).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const mostRecent = authorReviews[authorReviews.length - 1];
  return !!mostRecent &&
    mostRecent.state === 'COMMENTED' &&
    mostRecent.commit_id?.toLowerCase() === currentHeadSha.toLowerCase() &&
    !!mostRecent.submitted_at &&
    ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(mostRecent.author_association || '') &&
    mostRecent.body?.trim() === exactAuthorSoftwareSignoff(currentHeadSha);
}

function readAdminPermission(repo: string, author: string): boolean {
  // For personal repositories the owner is intrinsically an admin, and
  // matching the GitHub-verified repository owner avoids a permission API
  // dependency in restricted Actions tokens. Organization repositories use
  // the GitHub API's independently authenticated collaborator permission.
  if (repo.split('/')[0].toLowerCase() === author.toLowerCase()) return true;
  try {
    const response = execFileSync('gh', [
      'api', `repos/${repo}/collaborators/${encodeURIComponent(author)}/permission`
    ], { encoding: 'utf8', timeout: 10_000 });
    return JSON.parse(response).permission === 'admin';
  } catch {
    return false;
  }
}

/**
 * Resolve authorization ONLY from live GitHub-signed event context and API
 * responses, never from PR body, branch-controlled JSON or local env toggles.
 */
export function hasLiveAdminAuthorSignoff(exactHeadSha: string): boolean {
  const repo = process.env.GITHUB_REPOSITORY || '';
  const eventFile = process.env.GITHUB_EVENT_PATH || '';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
      !eventFile || !/^[a-f0-9]{40}$/i.test(exactHeadSha)) return false;
  try {
    const event = JSON.parse(fs.readFileSync(eventFile, 'utf8'));
    const pr = event.pull_request;
    if (!Number.isInteger(pr?.number) || pr.number <= 0 ||
        pr.head?.sha !== exactHeadSha ||
        pr.base?.repo?.full_name !== repo ||
        pr.head?.repo?.full_name !== repo ||
        !pr.user?.login || event.repository?.full_name !== repo ||
        !readAdminPermission(repo, pr.user.login)) return false;
    const reviews: GithubReviewEvidence[] = [];
    for (let page = 1; page <= 10; page++) {
      const endpoint = `repos/${repo}/pulls/${pr.number}/reviews?per_page=100&page=${page}`;
      const result = JSON.parse(execFileSync('gh', ['api', endpoint], {
        encoding: 'utf8', timeout: 10_000
      }));
      if (!Array.isArray(result)) return false;
      reviews.push(...result);
      if (result.length < 100) {
        return hasCurrentHeadAuthorSignoff(
          reviews, pr.user.login, exactHeadSha, true
        );
      }
    }
    // A truncated GitHub review history must never be treated as approved.
    return false;
  } catch {
    return false;
  }
}
