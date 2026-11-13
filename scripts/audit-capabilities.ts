/**
 * Read actual registered agents/tools and dependency versions from source.
 * Never copy historical test totals or claim independent engineering approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import { auditAgentCapabilities } from '../src/core/verification/AgentCapabilityAudit.ts';

const audit = auditAgentCapabilities();
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
  devDependencies: Record<string, string>; dependencies: Record<string, string>
};
const sourceVersion = pkg.devDependencies.vitest ?? 'NOT_INSTALLED';
const testFiles = [
  ...fs.readdirSync('tests').filter(f => f.endsWith('.test.ts')).map(f => 'tests/' + f),
  ...fs.readdirSync('src/core/tools/naval').filter(f => f.endsWith('.test.ts')).map(f => 'src/core/tools/naval/' + f)
].sort();
const sourceFacts = {
  source: 'AgentRegistry and ToolRegistry runtime, package.json and test-file discovery',
  numberOfAgents: audit.registeredAgents,
  numberOfExecutableTools: audit.actualRegisteredTools,
  agentRolesWithExecutableTool: audit.executableToolRoles,
  advisoryOnlyRoleCount: audit.advisoryOnlyRoles,
  roleConfigurationGaps: audit.configurationGapRoles,
  noRubricCount: audit.rolesWithoutRubric,
  referencedVitestVersionRange: sourceVersion,
  discoveredTestFiles: testFiles.length,
  testPassCount: null,
  independentlyEngineeringValidated: false
};
const markdown = [
  '# USV-01 — Live agent/tool capability audit (source-derived)',
  '',
  '> Generated at runtime. This is not an engineering acceptance report. Test pass counts require actual CI execution.',
  '',
  '| Metric | Current source-derived value |',
  '|---|---:|',
  ...Object.entries(sourceFacts).map(([key, value]) =>
    '| ' + key + ' | ' + (typeof value === 'string' ? value : JSON.stringify(value)) + ' |'),
  '',
  '## Role execution modes',
  '',
  '| Canonical ID | Runtime ID | Capability | Registered tools executable | Declared but unregistered | Review rubric criteria |',
  '|---|---|---|---:|---:|---:|',
  ...audit.findings.map(r => '| ' + r.canonicalId + ' | ' + r.runtimeId + ' | ' + r.capability +
    ' | ' + r.executableToolIds.length + ' | ' + r.unregisteredToolIds.length +
    ' | ' + r.reviewRubric.length + ' |'),
  '',
  'Do not equate review rubrics with solver access, LLM reasoning with verified engineering, or tool execution with independent physical acceptance.',
  ''
].join('\n');
const outputDir = path.resolve('governance/reports');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'agent-capability-audit.json'), JSON.stringify({ sourceFacts, testFiles, ...audit }, null, 2) + '\n');
fs.writeFileSync(path.join(outputDir, 'agent-capability-audit.md'), markdown);

const activeDocs: Array<[string, RegExp[]]> = [
  ['README.md', [/22 unit & integration tests/i]],
  ['docs/governance/CONFIGURATION_MANAGEMENT_PLAN.md', [/25-agent HMEA/i, /A01.–.A25/]],
  ['docs/governance/INDEPENDENT_REVIEW_STANDARD.md', [/Vitest test suite \(40 passing tests\)/i]],
  ['src/core/registry/AgentRegistry.ts', [/Exactly 25 master agents are registered/i]]
];
const errors: string[] = [];
for (const [file, badPatterns] of activeDocs) {
  const s = fs.readFileSync(file, 'utf8');
  for (const bad of badPatterns) if (bad.test(s)) errors.push(file + ': stale source fact ' + bad.source);
}
if (audit.registeredAgents !== 26) errors.push('Registered agent canonical count changed; investigate');
if (audit.findings.some(f => !f.reviewRubric.length)) errors.push('At least one agent missing a role-specific review rubric');
if (audit.configurationGapRoles) errors.push('Mandatory tool registration or execution-permission gaps detected');
console.log(JSON.stringify({ ...sourceFacts, documentationSourceDrift: errors }, null, 2));
if (errors.length) process.exitCode = 1;
