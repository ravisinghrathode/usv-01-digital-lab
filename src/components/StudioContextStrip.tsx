import React from 'react';
import { Fingerprint, Layers3, ShieldAlert } from 'lucide-react';
import { useEngineeringContext } from '../studio/engineeringContext';

/** Consistent selected-object provenance across all engineering workspaces. */
export const StudioContextStrip:React.FC=()=>{
  const {selection}=useEngineeringContext();
  return <div role="status" aria-label="Selected engineering context"
    className="studio-dark flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 bg-[#101e30] px-3 py-1.5 text-[11px] text-slate-300">
    <span><Layers3 size={12} className="mr-1 inline text-cyan-300"/> {selection.projectId}</span>
    <span>Candidate: <strong className="font-medium text-amber-200">{selection.candidateId??'Unassigned'}</strong></span>
    <span>Config: <strong className="font-medium text-amber-200">{selection.configurationRevision??'Unassigned / TBD'}</strong></span>
    <span className="max-w-[260px] truncate" title={selection.componentId??'No selected component'}>Selected: {selection.componentId??'None'}</span>
    {selection.geometryFingerprint&&<span className="font-mono" title={'Browser-local mesh SHA-256: '+selection.geometryFingerprint}><Fingerprint size={12} className="mr-1 inline"/> Local SHA-256 {selection.geometryFingerprint.slice(0,12)}…</span>}
    <span className="ml-auto font-semibold text-amber-200"><ShieldAlert size={12} className="mr-1 inline"/>{selection.evidenceLevel} · UI context only</span>
  </div>;
};
