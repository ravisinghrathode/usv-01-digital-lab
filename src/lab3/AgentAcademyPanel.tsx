import React, { useMemo, useState } from 'react';
import { BookOpenCheck, ShieldAlert } from 'lucide-react';
import { buildAgentAcademyCurricula } from '../core/academy/AgentAcademy.ts';

/**
 * Curriculum catalogue only. Never turn browser-side state or a checked box
 * into qualification authority: verified grade receipts live on the host.
 */
export function AgentAcademyPanel() {
  const curricula = useMemo(() => buildAgentAcademyCurricula(), []);
  const [chosen, setChosen] = useState('A05');
  const selected = curricula.find(c => c.canonicalId === chosen) ?? curricula[0];
  return <section className="nl-record-ledger" aria-label="Agent Academy curriculum catalogue">
    <div className="nl-section-label">
      <div><h2><BookOpenCheck size={19} aria-hidden="true"/> Agent Academy</h2>
        <p>26 role-specific programmes defined · no independent qualification inferred</p></div>
      <span className="nl-source-note">TRAINING EVIDENCE REQUIRED</span>
    </div>
    <p>Every specialist must study trusted, licensed references, complete practical cases,
      pass an unseen examination, and receive independent human sign-off before supervised
      research qualification. A curriculum is not proof that an AI has learned.</p>
    <label className="nl-filter-label" htmlFor="academy-role-select">Inspect specialist
      <select id="academy-role-select" value={selected.canonicalId}
        onChange={event=>setChosen(event.target.value)}>
        {curricula.map(c=><option key={c.canonicalId} value={c.canonicalId}>{c.canonicalId} — {c.name}</option>)}
      </select>
    </label>
    <div className="nl-ledger-row"><div><small>{selected.canonicalId} · {selected.division}</small>
      <strong>{selected.specialism}</strong></div><span>NOT QUALIFIED</span></div>
    <p><strong>Required foundation:</strong> {selected.foundationModules.map(m=>m.title).join('; ')}.</p>
    <p><strong>Practical specialty challenge:</strong> {selected.practicalTasks.workedExample}</p>
    <p><strong>Source edition/rights verification still needed:</strong> {selected.requiredSources.map(s=>s.id).join(', ') || 'No sources specified'}</p>
    <p><strong>Mandatory engineering tools:</strong> {selected.practicalTasks.toolEvidence.join(', ') || 'Independent qualitative evidence required'}</p>
    <p><strong>Independent acceptance reference:</strong> {selected.practicalTasks.blindIndependentReference}</p>
    <div className="nl-disclaimer"><ShieldAlert size={16} aria-hidden="true"/>
      This is a read-only curriculum catalogue. Live study transcripts, signed grade records
      and current-revision qualification must be checked through the trusted host Academy status.
      Browser selections do not authorize design edits, approve engineering or issue certificates.</div>
  </section>;
}
