import React, { useMemo, useState } from 'react';
import { BookOpenCheck, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { buildAgentAcademyCurricula } from '../core/academy/AgentAcademy.ts';

/**
 * Read-only role syllabus in the standard Engineering Sessions Notebook.
 * NEVER convert this browser data to a qualification or engineering permission.
 */
export default function AgentAcademyPanel() {
  const curricula = useMemo(() => buildAgentAcademyCurricula(), []);
  const [chosen, setChosen] = useState('A05');
  const selected = curricula.find(c => c.canonicalId === chosen) ?? curricula[0];
  return <section className="es-academy" aria-label="Agent Academy — 26 specialist learning programmes">
    <header className="es-academy-header">
      <div><span className="es-academy-kicker"><BookOpenCheck size={17}/> AGENT EDUCATION / RESEARCH ONLY</span>
        <h2>Agent Academy</h2>
        <p>26 registered specialisations · controlled learning syllabus · no independent qualification established</p></div>
      <span className="es-academy-hold"><ShieldAlert size={15}/> NOT QUALIFIED</span>
    </header>
    <div className="es-academy-content">
      <p>Study sessions are source-controlled, read-only and graded separately.
        Training is not inferred from a role prompt, a simulated exam, or a model's self-assessment.</p>
      <label htmlFor="es-academy-role">Inspect a specialist curriculum</label>
      <select id="es-academy-role" value={selected.canonicalId}
        onChange={event=>setChosen(event.target.value)}>
        {curricula.map(c=><option key={c.canonicalId} value={c.canonicalId}>
          {c.canonicalId} — {c.name}</option>)}
      </select>
      <dl className="es-academy-facts">
        <div><dt>Technical discipline</dt><dd>{selected.specialism}</dd></div>
        <div><dt>Foundation study</dt><dd>{selected.foundationModules.map(m=>m.title).join('; ')}</dd></div>
        <div><dt>Specialist practice</dt><dd>{selected.practicalTasks.workedExample}</dd></div>
        <div><dt>Reference materials to authenticate</dt><dd>{selected.requiredSources.map(s=>s.id).join(', ')}</dd></div>
        <div><dt>Mandatory engineering tools</dt><dd>{selected.practicalTasks.toolEvidence.join(', ') || 'Independent qualitative case review'}</dd></div>
        <div><dt>Blind benchmark evidence</dt><dd>{selected.practicalTasks.blindIndependentReference}</dd></div>
      </dl>
      <p className="es-academy-note">The trusted-host qualification report, source access records,
        real exams, independent reviewer and Director signatures are required before any role
        can be described as qualified. The browser never authorizes agent tasks.</p>
      <a href="/legacy.html?module=agent-orchestrator">Open governed agent workbench <ArrowUpRight size={14}/></a>
    </div>
  </section>;
}
