import fs from 'node:fs';
import path from 'node:path';
import { screenAgentAccuracy } from '../src/core/verification/AgentAccuracyScreen.ts';

const source = path.resolve(process.argv[2] || 'evidence/live-agents/live-gemini-26-20261113.json');
if (fs.statSync(source).size > 2 * 1024 * 1024) throw new Error('Oversized evidence');
const raw: unknown = JSON.parse(fs.readFileSync(source, 'utf8'));
if (!raw || typeof raw !== 'object' || !('cases' in raw) ||
    !Array.isArray((raw as any).cases)) throw new Error('Invalid agent evidence format');
const report = screenAgentAccuracy((raw as { cases: any[] }).cases);
const output = path.resolve('governance/reports/agent-accuracy-screen.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  analyticPass: report.analyticPass,
  analyticFail: report.analyticFail,
  independentReviewPending: report.humanReviewRequired,
  source, releaseApproved: report.productionApproved
}, null, 2));
if (process.argv.includes('--require-verified') && report.independentlyValidatedAgents !== 26) process.exitCode = 1;
