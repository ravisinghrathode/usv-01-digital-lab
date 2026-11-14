import React, {useMemo, useState} from 'react';
import {BookOpen, GitBranch, ExternalLink, Search, ShieldAlert, CheckCircle2} from 'lucide-react';
import rawRegister from '../data/externalSoftwareRegister.json';

type PlannedUse = {project: string; agents: string[]; purpose: string; sourceEvidence: string};
type ActualUse = {project: string; agent: string; kind: string; executionEvidence: string; sourceCommit: string};
type SourceEvidence = {type: string; status: string; url: string};
type ExternalRecord = {
  id: string; name: string; repository: string; repositoryUrl: string; domain: string;
  description: string; ownerAgent: string; reviewAgents: string[];
  lifecycle: string; adoption: string; installation: string;
  license: {spdxMetadata: string; review: string}; engineeringValidation: string;
  source: {commit: string | null; tree: string | null}; plannedUsage: PlannedUse[];
  actualUsage: ActualUse[]; evidence: SourceEvidence[]; nextAction: string;
};
const register = rawRegister as unknown as {registerId: string; records: ExternalRecord[]};

/**
 * Read-only view of the reviewed source-control register. This is NOT a live
 * installation telemetry source. Editing is restricted to controlled PRs.
 */
export const ExternalSoftwareRegisterView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [project, setProject] = useState('ALL');
  const records = register.records;
  const projects = useMemo(() => [...new Set(records.flatMap(r =>
    [...r.plannedUsage, ...r.actualUsage].map(p => p.project)))].sort(), [records]);
  const filtered = useMemo(() => records.filter(r => {
    const q = search.trim().toLowerCase();
    const fields = [r.id, r.name, r.repository, r.domain, r.description, r.ownerAgent,
      r.reviewAgents.join(' '), ...r.plannedUsage.map(p => p.project + ' ' + p.purpose)].join(' ').toLowerCase();
    return (status === 'ALL' || r.lifecycle === status) &&
      (project === 'ALL' || r.plannedUsage.some(p => p.project === project) ||
        r.actualUsage.some(p => p.project === project)) &&
      (!q || fields.includes(q));
  }), [records, search, status, project]);
  const sandboxCount = records.reduce((n, r) => n + r.actualUsage.filter(u => u.kind === 'SANDBOX_EVALUATION').length, 0);
  const agentInvocationCount = records.reduce((n, r) => n + r.actualUsage.filter(u => u.kind === 'AGENT_TOOL_INVOCATION').length, 0);
  const engineeringUseCount = records.reduce((n, r) => n + r.actualUsage.filter(u => u.kind === 'ENGINEERING_BASELINE').length, 0);
  const counts = [
    ['Tracked repositories', records.length],
    ['Discovered', records.filter(r => r.lifecycle === 'DISCOVERED').length],
    ['Evaluating', records.filter(r => r.lifecycle === 'EVALUATING').length],
    ['Approved integrations', records.filter(r => r.lifecycle === 'INTEGRATED' && r.adoption === 'APPROVED').length],
    ['Research sandbox runs', sandboxCount],
    ['Agent invocations', agentInvocationCount],
    ['Released engineering uses', engineeringUseCount]
  ] as const;

  return (
    <section className="p-6 max-w-7xl mx-auto space-y-5" aria-label="External software register">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-cyan-400 uppercase tracking-wider">A26 · Research asset governance</p>
          <h2 className="text-xl font-semibold text-slate-100 mt-1">External Software & Repository Register</h2>
          <p className="text-xs text-slate-400 mt-1">Permanent source-controlled catalogue · {register.registerId}</p>
        </div>
        <a href="https://github.com/ravisinghrathode/usv-01-digital-lab/blob/main/docs/EXTERNAL_SOFTWARE_OVERVIEW.md"
          target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded border border-slate-700 text-xs text-cyan-300 hover:bg-slate-800">
          <BookOpen className="w-4 h-4" /> Full register <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex items-start gap-3 border border-amber-800/50 bg-amber-950/20 p-3 rounded text-xs text-amber-200">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <p>This is a versioned source snapshot, not a live runtime monitor. Discovered or tested repositories are NOT approved engineering tools. Planned usage is not recorded as executed usage, and software approval never authorizes vessel control or engineering release.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {counts.map(([label, value]) => (
          <div key={label} className="border border-slate-800 bg-slate-900/70 rounded p-3">
            <div className="text-xl font-semibold text-slate-100 font-mono">{value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3 border border-slate-800 bg-slate-900/40 rounded p-3">
        <label className="flex items-center gap-2 border border-slate-700 rounded px-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input aria-label="Search external repositories" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search repository, domain, agent..." className="bg-transparent text-xs text-slate-100 py-2 w-full outline-none" />
        </label>
        <label className="text-xs text-slate-400 flex items-center gap-2">Lifecycle
          <select aria-label="Filter lifecycle" value={status} onChange={e => setStatus(e.target.value)}
            className="flex-1 bg-slate-950 rounded border border-slate-700 text-slate-100 p-2">
            <option value="ALL">All stages</option>
            {['DISCOVERED','EVALUATING','QUALIFIED','INTEGRATED','RETIRED','REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400 flex items-center gap-2">Project
          <select aria-label="Filter project" value={project} onChange={e => setProject(e.target.value)}
            className="flex-1 bg-slate-950 rounded border border-slate-700 text-slate-100 p-2">
            <option value="ALL">All projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <p className="text-xs text-slate-400">Showing {filtered.length} of {records.length} curated repositories. New Scout results enter the register only through reviewed updates.</p>
      {filtered.length === 0 && <div className="border border-slate-800 rounded p-6 text-center text-slate-400 text-sm">No registered repositories match your filters.</div>}
      <div className="space-y-3">
        {filtered.map(r => (
          <article key={r.id} className="border border-slate-800 rounded bg-slate-900/70 p-4 space-y-3">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <div className="text-[11px] font-mono text-slate-500">{r.id} · {r.domain}</div>
                <a href={r.repositoryUrl} target="_blank" rel="noopener noreferrer"
                  className="text-base font-semibold text-cyan-300 hover:underline inline-flex items-center gap-1">
                  {r.name} <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-xs text-slate-400 mt-1">{r.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-2 py-1 border border-slate-600 rounded text-slate-200">{r.lifecycle}</span>
                <span className="px-2 py-1 border border-amber-900 rounded text-amber-300">{r.adoption}</span>
                <span className="px-2 py-1 border border-slate-700 rounded text-slate-400">{r.installation}</span>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-slate-500 mb-1">Agent ownership / review</div>
                <div className="text-slate-200">Custodian {r.ownerAgent} · {r.reviewAgents.join(', ') || 'Reviewers TBD'}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Planned project use</div>
                <div className="text-slate-200">{r.plannedUsage.length
                  ? r.plannedUsage.map(p => p.project + ' (' + p.agents.join(', ') + ')').join('; ')
                  : 'Not allocated'}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Evidence-backed execution (research ≠ design use)</div>
                <div className="flex items-center gap-2 text-slate-200">
                  {r.actualUsage.length ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                  {r.actualUsage.length} events · {r.actualUsage.filter(u => u.kind === 'SANDBOX_EVALUATION').length} research-only · {r.actualUsage.filter(u => u.kind === 'AGENT_TOOL_INVOCATION').length} agent calls · {r.actualUsage.filter(u => u.kind === 'ENGINEERING_BASELINE').length} accepted engineering uses
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] pt-2 border-t border-slate-800">
              <span className="text-slate-400 flex gap-1 items-center"><GitBranch className="w-3.5 h-3.5" /> Source {r.source.commit?.slice(0, 12) || 'Not pinned'}</span>
              <span className="text-slate-400">License: {r.license.spdxMetadata} · {r.license.review}</span>
              <span className="text-slate-400">Engineering: {r.engineeringValidation}</span>
              {r.evidence.map((ev, i) => <a key={i} href={ev.url} target="_blank" rel="noopener noreferrer"
                className="text-cyan-300 hover:underline">{ev.type.replaceAll('_',' ')} <ExternalLink className="w-3 h-3 inline" /></a>)}
              {r.actualUsage.map((use, i) => <a key={'use-'+i} href={use.executionEvidence} target="_blank" rel="noopener noreferrer"
                className="text-teal-300 hover:underline">{use.kind} · {use.project} · {use.agent}</a>)}
            </div>
            <p className="text-[11px] text-slate-400"><strong className="text-slate-300">Next action:</strong> {r.nextAction}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
