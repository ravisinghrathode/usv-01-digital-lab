/**
 * USV-01 Repository Scout: public GitHub metadata discovery ONLY.
 * No third-party code is cloned, executed, incorporated or approved.
 * Node >=20; no npm dependencies or AI billing.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_CONFIG = fileURLToPath(new URL('../config/repository-scout.json', import.meta.url));
const PERMISSIVE = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'CC0-1.0']);
const RESTRICTED = new Set(['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'AGPL-3.0', 'MPL-2.0', 'EPL-2.0']);
const MAX_QUERIES = 24;
const MAX_CANDIDATES = 300;

function integerArg(raw, fallback, upper) {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > upper) throw Error(`Expected integer 1..${upper}, got ${raw}`);
  return value;
}

export function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!['--config', '--out-dir', '--max-queries', '--per-query', '--limit', '--fixture'].includes(key)) {
      throw Error(`Unknown option ${key}`);
    }
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw Error(`Missing value for ${key}`);
    options[key.slice(2)] = argv[++i];
  }
  return {
    config: options.config || DEFAULT_CONFIG,
    outDir: options['out-dir'] || path.join(os.tmpdir(), 'usv01-repository-scout'),
    maxQueries: integerArg(options['max-queries'], 18, MAX_QUERIES),
    perQuery: integerArg(options['per-query'], 30, 100),
    limit: integerArg(options.limit, 100, MAX_CANDIDATES),
    fixture: options.fixture || null
  };
}

export function validateConfig(config) {
  if (!config || typeof config !== 'object' || !Array.isArray(config.categories) || !config.categories.length) {
    throw Error('Config requires non-empty categories');
  }
  const ids = new Set();
  for (const c of config.categories) {
    if (!c || !/^[a-z][a-z0-9-]*$/.test(c.id) || ids.has(c.id)) throw Error('Invalid/duplicate category ID');
    ids.add(c.id);
    if (!Array.isArray(c.agents) || !c.agents.length || !c.agents.every(a => /^A(0[1-9]|1\d|2[0-6])$/.test(a))) throw Error(`Invalid agents for ${c.id}`);
    if (!Array.isArray(c.queries) || !c.queries.length || !c.queries.every(q => typeof q === 'string' && q.length >= 3 && q.length <= 120)) throw Error(`Invalid queries for ${c.id}`);
    if (!Array.isArray(c.keywords) || !c.keywords.every(k => typeof k === 'string' && k.length >= 2 && k.length <= 60)) throw Error(`Invalid keywords for ${c.id}`);
  }
  return config;
}

export function queryPlan(config, maxQueries) {
  const seen = new Set();
  const plan = [];
  // Round robin: cover multiple engineering disciplines before secondary searches.
  for (let round = 0; plan.length < maxQueries; round++) {
    let found = false;
    for (const category of config.categories) {
      const term = category.queries[round];
      if (!term) continue;
      found = true;
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      plan.push({ category: category.id, term });
      if (plan.length >= maxQueries) break;
    }
    if (!found) break;
  }
  return plan;
}

export function searchUrl(term, perQuery) {
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q', `${term} in:name,description,readme archived:false fork:false`);
  url.searchParams.set('per_page', String(perQuery));
  url.searchParams.set('page', '1');
  return url.toString();
}

export function licenseClass(spdx) {
  if (!spdx || spdx === 'NOASSERTION') return 'LICENSE_UNKNOWN_REVIEW';
  if (PERMISSIVE.has(spdx)) return 'PERMISSIVE_REVIEW';
  if (RESTRICTED.has(spdx) || /^(GPL|AGPL|LGPL|MPL|EPL)-/.test(spdx)) return 'COPYLEFT_REVIEW';
  return 'OTHER_LICENSE_REVIEW';
}

function ageDays(iso, now) {
  const t = Date.parse(iso ?? '');
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.parse(now) - t) / 86400000)) : Infinity;
}

const norm = s => String(s || '').toLowerCase();
export function scoreCandidate(repo, categoryIds, config, now = new Date().toISOString()) {
  const text = norm([repo.name, repo.description, ...(repo.topics || [])].join(' '));
  const matched = new Set(categoryIds);
  let keywords = 0;
  const supported = new Set();
  for (const c of config.categories) {
    const hits = c.keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (hits > 0) { matched.add(c.id); keywords += Math.min(hits, 3); }
  }
  const categories = [...matched].sort();
  for (const id of categories) {
    const c = config.categories.find(x => x.id === id);
    c?.agents.forEach(a => supported.add(a));
  }
  const lic = repo.license?.spdx_id ?? null;
  const licenseReview = licenseClass(lic);
  const days = ageDays(repo.pushed_at, now);
  const stars = Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : 0;
  const relevance = Math.min(35, categories.length * 12) + Math.min(20, keywords * 4);
  const activity = days < 90 ? 15 : days < 365 ? 11 : days < 730 ? 6 : 0;
  const community = stars >= 1000 ? 15 : stars >= 200 ? 12 : stars >= 30 ? 8 : stars >= 5 ? 4 : 0;
  const documentationSignal = repo.description?.length >= 35 ? 5 : repo.description ? 2 : 0;
  const licenseSignal = licenseReview === 'PERMISSIVE_REVIEW' ? 10 : licenseReview === 'COPYLEFT_REVIEW' ? 3 : 0;
  const score = Math.max(0, Math.min(100, relevance + activity + community + documentationSignal + licenseSignal - (repo.archived ? 40 : 0) - (repo.fork ? 10 : 0)));
  const flags = ['SECURITY_NOT_AUDITED', 'ENGINEERING_VALIDITY_NOT_VERIFIED'];
  if (licenseReview !== 'PERMISSIVE_REVIEW') flags.push(licenseReview);
  if (days >= 730) flags.push('STALE_OVER_TWO_YEARS');
  if (repo.archived) flags.push('ARCHIVED');
  if (repo.fork) flags.push('FORK');
  if (!repo.description) flags.push('DESCRIPTION_MISSING');
  return {
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description || '',
    score,
    categories,
    agentReviewers: [...supported].sort(),
    stars,
    lastPushedAt: repo.pushed_at ?? null,
    licenseSpdx: lic,
    licenseReview,
    flags,
    adoptionStatus: 'DISCOVERED_AWAITING_HUMAN_AND_INDEPENDENT_REVIEW',
    evidenceType: 'GITHUB_API_METADATA_NOT_SOFTWARE_VERIFICATION'
  };
}

const markdownSafe = v => String(v ?? '').replace(/[\r\n|`<>]/g, ' ').trim();
export function reportMarkdown(result) {
  const lines = [
    '# USV-01 repository scout — discovery report', '',
    `Generated: ${result.generatedAt}`, `Source revision: ${result.sourceCommit || 'UNKNOWN'}`,
    `Search provider: ${result.provider}`, `Searches completed: ${result.completedQueries}/${result.plannedQueries}`,
    `Unique candidates found: ${result.uniqueCandidates}; shown: ${result.candidates.length}`,
    '', '> DISCOVERY ONLY. GitHub metadata is not proof of fitness, security, maintainability or marine engineering validity.',
    '> No third-party code has been cloned, run, imported, approved or incorporated into the USV-01 vessel baseline.',
    '> License compatibility, source security, reproducible builds and independent technical evidence require review.', '',
    '| Rank | Repository | Score /100 | Area | Review agents | SPDX license | Last push | Review status |',
    '| --- | --- | ---: | --- | --- | --- | --- | --- |'
  ];
  for (const [i, r] of result.candidates.entries()) {
    const url = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(r.url) ? r.url : '';
    const repoLabel = markdownSafe(r.name);
    lines.push(`| ${i + 1} | ${url ? `[${repoLabel}](${url})` : repoLabel} | ${r.score} | ${r.categories.join(', ')} | ${r.agentReviewers.join(', ')} | ${markdownSafe(r.licenseSpdx || 'UNKNOWN')} | ${markdownSafe(r.lastPushedAt || 'UNKNOWN').slice(0, 10)} | Review required |`);
  }
  lines.push('', '## Gaps and caveats', '',
    '- Discovery is bounded by the configured queries, GitHub search indexing, query limits and available public data; it cannot claim every Git repository.',
    '- Stars and update dates are discovery signals, not engineering trust or software assurance.',
    '- A public repository without a verified license is not automatically reusable.',
    '- A26 coordinates the discovery queue; subject-matter agents perform evaluation and A15/A23 independent challenge; the Engineering Director authorizes incorporation.',
    '- All software remains outside vessel control paths and design baselines pending independent engineering verification.', '');
  if (result.errors.length) {
    lines.push('## Search errors / incomplete coverage', '');
    for (const issue of result.errors) lines.push(`- ${markdownSafe(issue)}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function getJson(url, token, fetchImpl) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'USV-01-Repository-Scout'
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(url, {headers, signal: AbortSignal.timeout(20000)});
  if (!res.ok) {
    const error = new Error(`GitHub API HTTP ${res.status} (remaining: ${res.headers.get('x-ratelimit-remaining') || 'unknown'})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function runScout({config, maxQueries = 18, perQuery = 30, limit = 100, token = '', fetchImpl = fetch, fixture = null, now = new Date().toISOString(), sourceCommit = null}) {
  validateConfig(config);
  const plan = queryPlan(config, maxQueries);
  const errors = [];
  const candidates = new Map();
  let completed = 0;
  const pages = fixture ? fixture.pages : null;
  if (fixture && (!pages || !Array.isArray(pages))) throw Error('Fixture must define pages[]');
  for (const [i, item] of plan.entries()) {
    try {
      const page = fixture ? pages[i] || {items: []} : await getJson(searchUrl(item.term, perQuery), token, fetchImpl);
      if (!page || !Array.isArray(page.items)) throw Error('GitHub response missing items[]');
      completed++;
      for (const repo of page.items) {
        if (!repo || typeof repo.full_name !== 'string' || typeof repo.html_url !== 'string' || !/^https:\/\/github\.com\//.test(repo.html_url) || repo.private || repo.archived || repo.fork) continue;
        const key = repo.full_name.toLowerCase();
        const record = candidates.get(key) || {repo, categories: new Set()};
        record.categories.add(item.category);
        candidates.set(key, record);
      }
      if (candidates.size >= MAX_CANDIDATES) {
        errors.push(`Stopped at maximum ${MAX_CANDIDATES} unique candidates; coverage is partial.`);
        break;
      }
    } catch (e) {
      errors.push(`${item.category}: ${e instanceof Error ? e.message : String(e)}`);
      if (e?.status === 403 || e?.status === 429) break;
    }
  }
  if (!completed) throw Error(`All GitHub queries failed: ${errors.join('; ')}`);
  const ranked = [...candidates.values()].map(r => scoreCandidate(r.repo, r.categories, config, now));
  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    schemaVersion: 1,
    generatedAt: now,
    sourceCommit,
    provider: fixture ? 'OFFLINE_TEST_FIXTURE' : 'GITHUB_PUBLIC_REPOSITORY_SEARCH',
    plannedQueries: plan.length,
    completedQueries: completed,
    uniqueCandidates: candidates.size,
    coverageComplete: false,
    errors,
    candidates: ranked.slice(0, limit)
  };
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const config = validateConfig(JSON.parse(await readFile(opts.config, 'utf8')));
  const fixture = opts.fixture ? JSON.parse(await readFile(opts.fixture, 'utf8')) : null;
  const result = await runScout({
    ...opts, config, fixture, token: process.env.GITHUB_TOKEN || '',
    sourceCommit: process.env.GITHUB_SHA || null
  });
  await mkdir(opts.outDir, {recursive: true, mode: 0o700});
  await writeFile(path.join(opts.outDir, 'latest.json'), JSON.stringify(result, null, 2) + '\n', {mode: 0o600});
  await writeFile(path.join(opts.outDir, 'latest.md'), reportMarkdown(result), {mode: 0o600});
  console.log(JSON.stringify({output: opts.outDir, scanned: result.completedQueries, candidates: result.uniqueCandidates, listed: result.candidates.length, errors: result.errors}, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(e => {
    console.error('Repository Scout failed closed:', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
}