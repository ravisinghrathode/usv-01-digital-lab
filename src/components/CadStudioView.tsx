import React, { useState } from 'react';
import { Box, ChevronRight, FileWarning, GitBranch, Layers3, Ruler, ShieldAlert } from 'lucide-react';
import { PrincipalParticulars } from '../types';
import { NavigationModule } from '../moduleRegistry';
import { Vessel3DVisualizer } from './Vessel3DVisualizer';

const assemblies = [
  { id: 'vessel', label: 'Primary vessel', module: 'workstream-NAV' },
  { id: 'hull', label: 'Hull form', module: 'workstream-NAV' },
  { id: 'structure', label: 'Structure', module: 'workstream-MEC' },
  { id: 'propulsion', label: 'Propulsion', module: 'workstream-PRP' },
  { id: 'power', label: 'Electrical & power', module: 'workstream-ELE' },
  { id: 'autonomy', label: 'Software & autonomy', module: 'workstream-AUT' },
  { id: 'payload', label: 'Payload interfaces', module: 'workstream-SYS' }
] as const;

interface Props {
  particulars: PrincipalParticulars;
  onNavigate: (module: NavigationModule) => void;
}

export const CadStudioView: React.FC<Props> = ({ particulars, onNavigate }) => {
  const [selected, setSelected] = useState<(typeof assemblies)[number]['id']>('vessel');
  const assembly = assemblies.find((item) => item.id === selected)!;
  const fields = [
    ['Length overall', particulars.loa],
    ['Waterline length', particulars.lwl],
    ['Beam overall', particulars.beamOverall],
    ['Design draft', particulars.draftDesign],
    ['Displacement', particulars.displacementMolded]
  ];

  return <div className="min-h-full bg-[#0b1522] text-[#f1f5f9] p-5 lg:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div><div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#67e8f9]">Product workspace / USV-01</div><h1 className="mt-1 text-2xl font-semibold text-white">CAD Studio</h1><p className="mt-1 text-sm text-[#94a3b8]">Explore the vessel preview and open its engineering records.</p></div>
      <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-[#fde68a] flex items-center gap-2"><ShieldAlert size={15} /> Preview only · no authoritative CAD loaded</div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[210px_minmax(0,1fr)_250px] gap-4 items-start">
      <section aria-label="Product structure" className="rounded-xl border border-white/10 bg-[#132236] p-3">
        <h2 className="px-2 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#94a3b8] flex gap-2 items-center"><Layers3 size={14} /> Product structure</h2>
        <p className="px-2 pb-3 text-[11px] text-[#64748b]">Conceptual navigation. Items are not selectable CAD bodies.</p>
        {assemblies.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} aria-current={selected === item.id ? 'true' : undefined} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${selected === item.id ? 'bg-cyan-400/15 text-[#cffafe] ring-1 ring-cyan-400/25' : 'text-[#cbd5e1] hover:bg-white/5'}`}><Box size={13} />{item.label}</button>)}
      </section>
      <section aria-label="Hero product viewport" className="min-w-0 rounded-xl border border-white/10 bg-[#132236] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><h2 className="font-semibold text-white">USV-01 · Hero product</h2><p className="text-xs text-[#94a3b8]">Interactive illustrative vessel mesh</p></div><span className="text-[10px] uppercase tracking-wider rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[#fde68a]">Unverified preview</span></div>
        <Vessel3DVisualizer candidateId="USV-01 / PREVIEW" status="UNVERIFIED_PREVIEW" showPhotoRenderToggle={false} showPreviewDimensions={false} initialZoom={1.35} className="min-h-[390px]" />
        <div className="mt-3 flex gap-2 rounded-lg bg-[#0b1522] border border-white/10 p-3 text-xs text-[#94a3b8]"><FileWarning size={17} className="shrink-0 text-[#fcd34d]" /><span>This procedural mesh is for orientation only. It is not the product geometry, a measured model, a CAD revision, or simulation evidence. Orbit, camera, and display modes inspect the preview only.</span></div>
      </section>
      <div className="space-y-4">
        <section aria-label="Object inspector" className="rounded-xl border border-white/10 bg-[#132236] p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#94a3b8] flex gap-2 items-center"><Ruler size={14} /> Inspector</h2>
          <h3 className="mt-4 text-lg font-semibold text-white">{assembly.label}</h3>
          <p className="mt-1 text-xs text-[#94a3b8]">Linked engineering register</p>
          <button type="button" onClick={() => onNavigate(assembly.module)} className="mt-3 flex w-full items-center justify-between rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs text-[#a5f3fc] hover:bg-cyan-400/20">Open source module <ChevronRight size={14} /></button>
          <div className="mt-4 border-t border-white/10 pt-3 space-y-2">{fields.map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-xs"><span className="text-[#94a3b8]">{label}</span><span className="text-[#e2e8f0] font-mono">{value || 'TBD'}</span></div>)}</div>
          <p className="mt-3 text-[11px] text-[#fde68a]">Record state: {particulars.validationState}. Values here come from the Naval Architecture register, not the preview mesh.</p>
        </section>
        <section aria-label="CAD revision status" className="rounded-xl border border-white/10 bg-[#132236] p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#94a3b8] flex gap-2 items-center"><GitBranch size={14} /> Revision control</h2>
          <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-[#fde68a]">No authoritative CAD source or configuration ID is connected. Compare, measure, section, and release controls require a governed CAD integration.</div>
          <button type="button" onClick={() => onNavigate('traceability')} className="mt-3 text-xs text-[#67e8f9] hover:underline">Review traceability →</button>
        </section>
      </div>
    </div>
  </div>;
};
