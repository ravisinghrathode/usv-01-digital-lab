import React, { useRef, useState } from 'react';
import { ChevronRight, FileWarning, Focus, GitCompare, Layers3, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Ruler, ShieldAlert, UploadCloud } from 'lucide-react';
import type { PrincipalParticulars } from '../types';
import type { NavigationModule } from '../moduleRegistry';
import { useEngineeringContext } from '../studio/engineeringContext';
import { compareMeshPreviews, MAX_OBJ_BYTES, MeshGeometry, parseObjMesh } from '../studio/meshGeometry';
import {
  coupleGeometryToHydrostatics,
  generateParametricHull,
  type GeometryPhysicsHandoffReceipt,
  type HullTopology,
  type ParametricHullArtifact,
  type SectionShape
} from '../core/cad/ParametricHullPipeline';
import { MeshViewport } from './MeshViewport';
import { Vessel3DVisualizer } from './Vessel3DVisualizer';

interface LocalMesh { geometry: MeshGeometry; fileName: string; sha256: string; origin: 'LOCAL_OBJ_PREVIEW' | 'PARAMETRIC_STUDY_DRAFT' }
const conceptualAssemblies: { id: string; label: string; module: NavigationModule }[] = [
  { id: 'vessel', label: 'Primary vessel', module: 'workstream-NAV' },
  { id: 'hull', label: 'Hull form', module: 'workstream-NAV' },
  { id: 'structure', label: 'Structure', module: 'workstream-MEC' },
  { id: 'propulsion', label: 'Propulsion', module: 'workstream-PRP' },
  { id: 'power', label: 'Electrical & power', module: 'workstream-ELE' },
  { id: 'autonomy', label: 'Software & autonomy', module: 'workstream-AUT' },
  { id: 'payload', label: 'Payload interfaces', module: 'workstream-SYS' }
];

interface Props {
  particulars: PrincipalParticulars;
  onNavigate: (module: NavigationModule) => void;
  onAskAi?: (prompt: string) => void;
}

export const CadStudioView: React.FC<Props> = ({ particulars, onNavigate, onAskAi }) => {
  const { selection, updateSelection, resetGeometry } = useEngineeringContext();
  const [geometryA, setGeometryA] = useState<LocalMesh | null>(null);
  const [geometryB, setGeometryB] = useState<LocalMesh | null>(null);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [parametricOpen, setParametricOpen] = useState(false);
  const [studyTopology, setStudyTopology] = useState<HullTopology>('MONOHULL');
  const [studyShape, setStudyShape] = useState<SectionShape>('WIGLEY_PARABOLIC');
  const [studyArtifact, setStudyArtifact] = useState<ParametricHullArtifact | null>(null);
  const [studyHandoff, setStudyHandoff] = useState<GeometryPhysicsHandoffReceipt | null>(null);
  const [treeOpen, setTreeOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [selected, setSelected] = useState('vessel');
  const [error, setError] = useState<string | null>(null);
  const inputA = useRef<HTMLInputElement>(null);
  const inputB = useRef<HTMLInputElement>(null);
  const active = activeSlot === 'A' ? geometryA : geometryB;
  const conceptual = conceptualAssemblies.find(item => item.id === selected);
  const groups = active?.geometry.groups ?? conceptualAssemblies.map(item => item.label);
  const compared = geometryA && geometryB ? compareMeshPreviews(geometryA.geometry, geometryB.geometry) : null;
  const fields: [string, unknown][] = [
    ['Length overall', particulars.loa],
    ['Waterline length', particulars.lwl],
    ['Beam overall', particulars.beamOverall],
    ['Design draft', particulars.draftDesign],
    ['Displacement', particulars.displacementMolded]
  ];

  const loadMesh = async (file: File, slot: 'A' | 'B') => {
    setError(null);
    try {
      if (file.size > MAX_OBJ_BYTES) throw new Error('File exceeds 8 MiB mesh inspection limit');
      if (!file.name.toLowerCase().endsWith('.obj')) throw new Error('Only local Wavefront .obj mesh files are supported');
      const contents = await file.arrayBuffer();
      const geometry = parseObjMesh(new TextDecoder('utf-8', { fatal: true }).decode(contents));
      if (!crypto?.subtle) throw new Error('Cryptographic file fingerprint unavailable: use a secure HTTPS browser');
      const digest = await crypto.subtle.digest('SHA-256', contents);
      const sha256 = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2,'0')).join('');
      const loaded: LocalMesh = { geometry, fileName:file.name, sha256, origin: 'LOCAL_OBJ_PREVIEW' };
      if (slot === 'A') setGeometryA(loaded); else setGeometryB(loaded);
      setActiveSlot(slot);
      setSelected(geometry.groups[0]);
      updateSelection({
        candidateId: null, configurationRevision: null,
        geometryFingerprint: sha256, componentId: geometry.groups[0],
        evidenceLevel: 'UNVERIFIED'
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read this mesh');
    }
  };

  const generateStudyHull = () => {
    setError(null);
    try {
      const artifact = generateParametricHull({
        schema: 'usv01-parametric-hull/v1',
        geometryId: studyTopology === 'CATAMARAN' ? 'STUDY-CAT-01' : 'STUDY-MONO-01',
        revisionId: 'DRAFT-REV-01',
        sourceOwnership: 'STUDY_DRAFT_CAD_PREVIEW',
        units: 'SI_METERS_KG',
        coordinateConvention: 'X_FWD_FROM_AP_Y_STBD_Z_UP_FROM_BL',
        topology: studyTopology,
        sectionShape: studyShape,
        lwlM: 6.0,
        loaM: 6.4,
        hullBeamM: studyTopology === 'CATAMARAN' ? 0.65 : 1.6,
        demiHullCenterlineSpacingM: studyTopology === 'CATAMARAN' ? 1.8 : undefined,
        depthM: 0.9,
        draftDesignM: 0.38,
        stationCount: 11,
        interfaces: [
          { id: 'PROP-PORT', category: 'PROPULSION', xM: 0.2, yM: studyTopology === 'CATAMARAN' ? -0.9 : 0, zM: 0.12, envelopeNotes: 'Hypothetical thruster mount' }
        ]
      });
      const hydroCheck = coupleGeometryToHydrostatics(artifact, {
        id: 'LC-STUDY-LIGHT',
        massKg: studyTopology === 'CATAMARAN' ? 1150 : 1200,
        kgM: 0.42,
        lcgM: 3.0,
        tcgM: 0
      });
      const mesh = parseObjMesh(artifact.objExportAscii);
      const loaded: LocalMesh = {
        geometry: mesh,
        fileName: `${artifact.spec.geometryId}-${artifact.spec.revisionId}.obj`,
        sha256: artifact.geometrySha256,
        origin: 'PARAMETRIC_STUDY_DRAFT'
      };
      setStudyArtifact(artifact);
      setStudyHandoff(hydroCheck);
      setGeometryA(loaded);
      setActiveSlot('A');
      setSelected(mesh.groups[0]);
      updateSelection({
        candidateId: artifact.spec.geometryId,
        configurationRevision: artifact.spec.revisionId,
        geometryFingerprint: artifact.geometrySha256,
        componentId: mesh.groups[0],
        evidenceLevel: 'UNVERIFIED'
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Study hull generation failed');
    }
  };

  const chooseSlot = (slot: 'A' | 'B') => {
    setActiveSlot(slot);
    const mesh = slot === 'A' ? geometryA : geometryB;
    setSelected(mesh?.geometry.groups[0] ?? 'vessel');
    if (mesh) updateSelection({geometryFingerprint:mesh.sha256,componentId:mesh.geometry.groups[0],candidateId:null,configurationRevision:null,evidenceLevel:'UNVERIFIED'});
    else resetGeometry();
  };

  const chooseGroup = (id:string) => {
    setSelected(id);
    updateSelection({componentId:id,evidenceLevel:'UNVERIFIED'});
  };

  const clearLocal = () => {
    setGeometryA(null);setGeometryB(null);setStudyArtifact(null);setStudyHandoff(null);setSelected('vessel');setComparisonOpen(false);setActiveSlot('A');resetGeometry();setError(null);
  };

  const activeLabel = active
    ? active.origin === 'PARAMETRIC_STUDY_DRAFT'
      ? 'Study parametric draft CAD · NOT approved engineering baseline'
      : 'Local inspection mesh · NOT authoritative CAD'
    : 'Preview only · no authoritative CAD loaded';
  const inspectorModule = conceptual?.module ?? 'workstream-NAV';

  return <div className={focusMode ? 'fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#0b1522] text-[#f1f5f9] p-3' : 'flex min-h-full flex-col gap-3 bg-[#0b1522] p-3 text-[#f1f5f9] lg:p-4'}>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#122338] px-4 py-3">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Product workspace / USV-01</div>
        <h1 className="text-lg font-semibold">CAD Studio <span className="text-xs font-normal text-slate-400">X.2</span></h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200"><ShieldAlert size={13} className="mr-1 inline" />{activeLabel}</span>
        <button type="button" aria-label="Toggle product tree" onClick={()=>setTreeOpen(!treeOpen)} className="rounded border border-white/20 px-2 py-1.5 text-xs">{treeOpen?<PanelLeftClose size={15}/>:<PanelLeftOpen size={15}/>}</button>
        <button type="button" aria-label="Toggle object inspector" onClick={()=>setInspectorOpen(!inspectorOpen)} className="rounded border border-white/20 px-2 py-1.5 text-xs">{inspectorOpen?<PanelRightClose size={15}/>:<PanelRightOpen size={15}/>}</button>
        <button type="button" onClick={()=>setFocusMode(!focusMode)} className="flex items-center gap-1 rounded border border-white/20 px-2 py-1.5 text-xs">{focusMode?<Minimize2 size={14}/>:<Maximize2 size={14}/>} {focusMode?'Exit focus':'Focus'}</button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#122338] p-2">
      <button type="button" onClick={()=>inputA.current?.click()} className="flex items-center gap-1 rounded-md bg-cyan-500/15 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/25"><UploadCloud size={14}/> Inspect OBJ A</button>
      <input ref={inputA} aria-label="Import local OBJ A" className="hidden" type="file" accept=".obj" onChange={e=>{const f=e.target.files?.[0];if(f)void loadMesh(f,'A');e.target.value='';}}/>
      <button type="button" onClick={()=>inputB.current?.click()} className="flex items-center gap-1 rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10"><UploadCloud size={14}/> Inspect OBJ B</button>
      <input ref={inputB} aria-label="Import local OBJ B" className="hidden" type="file" accept=".obj" onChange={e=>{const f=e.target.files?.[0];if(f)void loadMesh(f,'B');e.target.value='';}}/>
      <button type="button" onClick={()=>chooseSlot('A')} aria-pressed={activeSlot==='A'} className={`rounded px-3 py-2 text-xs ${activeSlot==='A'?'bg-cyan-500/20 text-cyan-200':'text-slate-400'}`}>A {geometryA?'✓':'—'}</button>
      <button type="button" onClick={()=>chooseSlot('B')} aria-pressed={activeSlot==='B'} className={`rounded px-3 py-2 text-xs ${activeSlot==='B'?'bg-cyan-500/20 text-cyan-200':'text-slate-400'}`}>B {geometryB?'✓':'—'}</button>
      <button type="button" onClick={()=>setComparisonOpen(!comparisonOpen)} aria-expanded={comparisonOpen} className="flex items-center gap-1 rounded border border-white/20 px-3 py-2 text-xs"><GitCompare size={14}/> Compare</button>
      <button type="button" onClick={()=>setParametricOpen(!parametricOpen)} aria-expanded={parametricOpen} className="flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20"><Ruler size={14}/> Study Parametric CAD</button>
      <button type="button" onClick={clearLocal} className="ml-auto rounded border border-white/20 px-3 py-2 text-xs">Clear session</button>
    </div>
    {parametricOpen && <section aria-label="Study parametric hull pipeline" className="rounded-lg border border-emerald-400/25 bg-[#14273a] p-3 text-xs text-slate-200">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-emerald-200">Parametric Hull Study Generator (SI meters · STUDY_DRAFT_CAD_UNAPPROVED)</span>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Study hull topology" value={studyTopology} onChange={e=>setStudyTopology(e.target.value as HullTopology)} className="rounded border border-white/20 bg-[#0b1522] px-2 py-1 text-xs">
            <option value="MONOHULL">Monohull</option>
            <option value="CATAMARAN">Catamaran</option>
          </select>
          <select aria-label="Study section shape" value={studyShape} onChange={e=>setStudyShape(e.target.value as SectionShape)} className="rounded border border-white/20 bg-[#0b1522] px-2 py-1 text-xs">
            <option value="WIGLEY_PARABOLIC">Wigley parabolic</option>
            <option value="CHINE_V">Chine V</option>
            <option value="BOX">Box barge</option>
          </select>
          <button type="button" onClick={generateStudyHull} className="rounded bg-emerald-500/20 px-3 py-1 font-medium text-emerald-100 hover:bg-emerald-500/30">Generate watertight study hull</button>
        </div>
      </div>
      {studyArtifact && studyHandoff && <div className="mt-2 grid gap-2 rounded bg-[#0b1522] p-2 sm:grid-cols-4">
        <span>Watertight manifold: <strong>{studyArtifact.meshCheck.watertightManifold ? 'YES' : 'NO'}</strong></span>
        <span>Equilibrium draft: <strong>{studyHandoff.hydroResult.equilibriumDraftM.toFixed(3)} m</strong></span>
        <span>GMt (FS-corr): <strong>{(studyHandoff.hydroResult.freeSurfaceCorrectedGmtM ?? studyHandoff.hydroResult.uncorrectedGmtM)?.toFixed(3) ?? 'TBD'} m</strong></span>
        <span>Geometry digest: <code className="text-[10px]">{studyArtifact.geometrySha256.slice(0, 20)}…</code></span>
      </div>}
    </section>}
    {error && <div role="alert" className="rounded-md border border-red-500/50 bg-red-950/50 p-3 text-xs text-red-200">{error}</div>}
    {comparisonOpen && <section aria-label="Geometry candidate comparison" className="rounded-lg border border-cyan-400/20 bg-[#14273a] p-3 text-xs text-slate-300">
      <div className="mb-2 font-semibold text-cyan-200">A/B geometry inspection comparison (not an engineering assessment)</div>
      {compared ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <span>Vertices Δ (B−A): <strong>{compared.vertexDelta}</strong></span>
        <span>Triangles Δ (B−A): <strong>{compared.triangleDelta}</strong></span>
        <span>OBJ Groups A: <strong>{compared.aGroups}</strong></span>
        <span>OBJ Groups B: <strong>{compared.bGroups}</strong></span>
      </div> : <p>Inspect both local OBJ files to compare their mesh topology.</p>}
      <p className="mt-2 text-amber-200">Neither OBJ file establishes physical units, revision lineage, weight, hydrostatics, solver comparability or engineering release. All such metrics remain TBD. Analysis is stale until independently reconciled with an approved configuration.</p>
    </section>}
    <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
      {treeOpen && <section aria-label="Product structure" className="w-full shrink-0 rounded-lg border border-white/10 bg-[#132236] p-3 xl:w-[205px] xl:resize-x xl:overflow-auto">
        <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200"><Layers3 size={14}/> Product tree</h2>
        <p className="mb-3 text-[11px] text-slate-400">{active?'Groups parsed from local OBJ mesh':'Conceptual navigation. Items are not selectable CAD bodies.'}</p>
        {active ? groups.map(group=><button key={group} type="button" onClick={()=>chooseGroup(group)} aria-current={selected===group?'true':undefined} className={`block w-full truncate rounded px-2 py-2 text-left text-xs ${selected===group?'bg-cyan-400/20 text-cyan-100':'text-slate-300 hover:bg-white/10'}`}>{group}</button>) : conceptualAssemblies.map(item=><button key={item.id} type="button" onClick={()=>chooseGroup(item.id)} className={`block w-full rounded px-2 py-2 text-left text-xs ${selected===item.id?'bg-cyan-400/20 text-cyan-100':'text-slate-300 hover:bg-white/10'}`}>{item.label}</button>)}
      </section>}
      <section aria-label="Hero product viewport" className="flex min-h-[400px] min-w-0 flex-1 flex-col rounded-lg border border-white/10 bg-[#132236] p-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
          <div><h2 className="text-sm font-semibold">USV-01 · Hero product</h2><p className="text-[11px] text-slate-400">{active?active.fileName:'Interactive illustrative vessel mesh'}</p></div>
          <span className="rounded border border-amber-500/30 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-200">Unverified preview</span>
        </div>
        <div className={focusMode?'min-h-0 flex-1':'min-h-[390px] flex-1'}>
          {active ? <MeshViewport mesh={active.geometry} selectedGroup={selected} onSelectGroup={chooseGroup} expanded={focusMode}/> :
            <Vessel3DVisualizer candidateId="USV-01 / PREVIEW" status="UNVERIFIED_PREVIEW" showPhotoRenderToggle={false} showPreviewDimensions={false} initialZoom={1.35} className="min-h-[390px]"/>}
        </div>
        <div className="mt-2 flex items-start gap-2 rounded bg-[#0b1522] p-2 text-[11px] text-slate-400">
          <FileWarning className="shrink-0 text-amber-300" size={15}/>
          <span>{active ? 'Local-only untrusted mesh, not controlled CAD; no units, B-rep, assembly constraints or material properties were imported.' : 'This procedural mesh is for orientation only. It is not the product geometry, a measured model, a CAD revision, or simulation evidence. Orbit, camera, and display modes inspect the preview only.'}</span>
        </div>
      </section>
      {inspectorOpen && <section aria-label="Object inspector" className="w-full shrink-0 space-y-3 xl:w-[275px] xl:resize-x xl:overflow-auto">
        <div className="rounded-lg border border-white/10 bg-[#132236] p-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold"><Ruler size={14}/> Inspector</h2>
          <h3 className="mt-3 break-words text-sm font-semibold">{active ? selected : (conceptual?.label ?? 'Primary vessel')}</h3>
          <p className="mt-1 text-[11px] text-slate-400">{active?'Selected OBJ object/group':'Linked Naval Architecture register'}</p>
          {active ? <div className="mt-3 space-y-2 text-xs">
            <div>Vertices: {active.geometry.vertices.length}</div>
            <div>Triangles: {active.geometry.triangles.length}</div>
            <div>Fingerprint: <code className="break-all text-[10px]">{active.sha256}</code></div>
            <div>Units: <span className="text-amber-300">Unknown</span></div>
            <div>Configuration revision: <span className="text-amber-300">TBD</span></div>
            <div>Evidence state: <span className="text-amber-300">{selection.evidenceLevel}</span></div>
            <p className="text-amber-200">No approved source link or engineering metadata exists for this imported group.</p>
          </div> : <>
            <div className="mt-3 space-y-2">{fields.map(([label,value])=><div className="flex justify-between gap-3 text-xs" key={label}><span className="text-slate-400">{label}</span><span className="font-mono">{String(value ?? 'TBD')}</span></div>)}</div>
            <p className="mt-3 text-[11px] text-amber-200">Record state: {particulars.validationState}. Unverified / TBD values are from the engineering register, never inferred from illustrative geometry.</p>
          </>}
          <button type="button" onClick={()=>onNavigate(inspectorModule)} className="mt-3 flex w-full items-center justify-between rounded bg-cyan-400/15 p-2 text-xs text-cyan-200">Open engineering module <ChevronRight size={14}/></button>
          {onAskAi && <button type="button" onClick={()=>onAskAi(`Review selection "${active?selected:(conceptual?.label ?? 'Primary vessel')}" in USV-01. Provide only traceable engineering questions and draft proposals; do not assert CAD or approval status.`)} className="mt-2 w-full rounded border border-cyan-400/25 p-2 text-xs text-cyan-200">Ask engineering agents</button>}
        </div>
        <div className="rounded-lg border border-white/10 bg-[#132236] p-3 text-xs text-slate-300">
          <h2 className="font-semibold">Configuration and evidence</h2>
          <p className="mt-2">No authoritative CAD source or configuration ID is connected. Compare, measure, section, and release controls require a governed CAD integration.</p>
          <p className="mt-2 text-amber-200">Any geometry change invalidates assumptions of prior analyses until checked against the relevant controlled revision.</p>
          <button type="button" onClick={()=>onNavigate('traceability')} className="mt-3 text-cyan-200 underline">Review traceability</button>
        </div>
      </section>}
    </div>
  </div>;
};
