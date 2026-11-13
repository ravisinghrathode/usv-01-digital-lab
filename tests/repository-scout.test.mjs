import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { licenseClass, parseArgs, queryPlan, reportMarkdown, runScout, scoreCandidate, searchUrl, validateConfig } from '../scripts/repository-scout.mjs';

const config = validateConfig(JSON.parse(await readFile(fileURLToPath(new URL('../config/repository-scout.json', import.meta.url)), 'utf8')));
const repo = (name, opts = {}) => ({
  full_name: `marine/${name}`, name, html_url: `https://github.com/marine/${name}`,
  description: 'Autonomous surface vessel simulation and robotics control',
  topics: ['usv', 'simulation'], pushed_at: '2026-10-20T00:00:00Z',
  stargazers_count: 50, license: {spdx_id: 'MIT'}, archived: false, fork: false, private: false, ...opts
});

test('diverse round-robin search plan is bounded and deduplicated', () => {
  const p = queryPlan(config, 18);
  assert.equal(p.length, 18);
  assert.equal(new Set(p.map(x => x.category)).size, 12);
  assert.match(searchUrl('COLREGS collision avoidance', 20), /archived%3Afalse/);
});

test('unknown licensing is never cleared for adoption', () => {
  assert.equal(licenseClass(null), 'LICENSE_UNKNOWN_REVIEW');
  assert.equal(licenseClass('GPL-3.0'), 'COPYLEFT_REVIEW');
  const scored = scoreCandidate(repo('usv-no-license', {license: null}), new Set(['usv-platforms']), config, '2026-11-14T00:00:00Z');
  assert.equal(scored.adoptionStatus, 'DISCOVERED_AWAITING_HUMAN_AND_INDEPENDENT_REVIEW');
  assert.ok(scored.flags.includes('LICENSE_UNKNOWN_REVIEW'));
});

test('deduplicates repositories and never promotes source to engineering proof', async () => {
  const fixture = {pages: [{items: [repo('vessel-1')]}, {items: [repo('vessel-1'), repo('vessel-2', {license: null})]}]};
  const result = await runScout({config, maxQueries: 2, fixture, limit: 10, now: '2026-11-14T00:00:00Z'});
  assert.equal(result.uniqueCandidates, 2);
  assert.equal(result.completedQueries, 2);
  assert.equal(result.coverageComplete, false);
  assert.ok(result.candidates.every(r => r.evidenceType === 'GITHUB_API_METADATA_NOT_SOFTWARE_VERIFICATION'));
  assert.match(reportMarkdown(result), /No third-party code has been cloned/);
});

test('no token or untrusted markdown injection propagates to report', async () => {
  const r = repo('injection', {description: 'Injected | columns\nFake heading', full_name: 'marine/injection'});
  const out = await runScout({config, maxQueries: 1, fixture: {pages: [{items: [r]}]}, now: '2026-11-14T00:00:00Z'});
  const report = reportMarkdown(out);
  assert.ok(!report.includes('Fake heading'));
  assert.ok(!report.includes('Injected | columns'));
  assert.ok(report.includes('Review required'));
});

test('refuses invalid options and configs', () => {
  assert.throws(() => parseArgs(['--max-queries', '999']));
  assert.throws(() => parseArgs(['--out-dir']));
  assert.throws(() => validateConfig({categories: [{id: '../../bad', agents: ['A26'], queries: ['usv'], keywords: []}]}));
});