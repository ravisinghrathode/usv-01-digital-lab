import React from 'react';
import { Fingerprint, ShieldAlert } from 'lucide-react';
import { useEngineeringContext } from '../studio/engineeringContext';

/** Read-only UI selection. No selected value implies engineering approval. */
export const StudioContextStrip: React.FC = () => {
  const { selection } = useEngineeringContext();
  return <div role="status" aria-label="Selected engineering context" className="ns3-context">
    <span><span className="ns3-context-label">Project</span><strong>{selection.projectId}</strong></span>
    <span><span className="ns3-context-label">Candidate</span><strong>{selection.candidateId ?? 'Unassigned'}</strong></span>
    <span><span className="ns3-context-label">Configuration</span><strong>{selection.configurationRevision ?? 'TBD / unassigned'}</strong></span>
    <span title={selection.componentId ?? 'No component selected'}>
      <span className="ns3-context-label">Selected part</span><strong>{selection.componentId ?? 'None'}</strong>
    </span>
    {selection.geometryFingerprint && <span title={'Browser-local SHA-256: ' + selection.geometryFingerprint}>
      <Fingerprint size={14} style={{display:'inline',marginRight:5}} aria-hidden="true"/>
      <code>Local mesh {selection.geometryFingerprint.slice(0, 10)}…</code>
    </span>}
    <span className="ns3-context-warning">
      <ShieldAlert size={15} style={{display:'inline',marginRight:6}} aria-hidden="true"/>
      {selection.evidenceLevel} · UI selection only
    </span>
  </div>;
};
