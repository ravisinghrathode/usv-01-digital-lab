import React, { useState } from 'react';
import { X, Plus, ShieldAlert } from 'lucide-react';
import {
  WorkstreamCode,
  RequirementPriority,
  EngineeringStatus,
  SimulationRunStatus,
  RecordKind,
  ModalRecordPayload
} from '../types';

interface NewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubsystem?: WorkstreamCode;
  onCreateRecord: (payload: ModalRecordPayload) => void;
}

export const NewRecordModal: React.FC<NewRecordModalProps> = ({
  isOpen,
  onClose,
  defaultSubsystem = 'SYS',
  onCreateRecord
}) => {
  const [kind, setKind] = useState<RecordKind>('requirement');
  const [subsystem, setSubsystem] = useState<WorkstreamCode>(defaultSubsystem);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequirementPriority>('High');
  const [owner, setOwner] = useState('Lead Engineer');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

  // Decision specific
  const [problemStatement, setProblemStatement] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [rationale, setRationale] = useState('');

  // Risk specific
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [mitigation, setMitigation] = useState('');

  // Simulation specific
  const [solver, setSolver] = useState('OpenFOAM v2312');
  const [geometryRev, setGeometryRev] = useState('CAD-REV-0.2');
  const [boundaryConditions, setBoundaryConditions] = useState('');

  // Component BOM specific
  const [partNumber, setPartNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('$0.00');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (kind === 'requirement') {
      onCreateRecord({
        kind: 'requirement',
        data: {
          title,
          description,
          subsystemCode: subsystem,
          priority,
          category: 'Functional & Safety',
          subsystemAllocation: subsystem,
          verificationMethod: 'Test',
          acceptanceCriteria: acceptanceCriteria || 'Quantitative criteria to be verified [TBD].',
          owner,
          revision: 'Rev 1.0',
          status: 'Draft',
          isIllustrative: false,
          relatedDecisions: [],
          relatedSimulations: [],
          relatedVerifications: []
        }
      });
    } else if (kind === 'decision') {
      onCreateRecord({
        kind: 'decision',
        data: {
          title,
          subsystemCode: subsystem,
          problemStatement,
          alternatives: alternatives.split('\n').filter(Boolean),
          rationale,
          supportingEvidence: 'Engineering evaluation record pending',
          consequences: 'Allocated to subsystem specification',
          reviewer: owner,
          approvalState: 'Draft',
          revision: 'Rev 0.1',
          isAiProposal: false,
          isIllustrative: false
        }
      });
    } else if (kind === 'risk') {
      onCreateRecord({
        kind: 'risk',
        data: {
          subsystemCode: subsystem,
          description,
          probability,
          impact,
          riskScore: probability * impact,
          mitigation,
          owner,
          status: 'Open',
          isIllustrative: false
        }
      });
    } else if (kind === 'simulation') {
      onCreateRecord({
        kind: 'simulation',
        data: {
          discipline: subsystem,
          name: title,
          geometryRevision: geometryRev,
          inputConfiguration: 'Mesh parameters specified in run script',
          solver,
          boundaryConditions,
          unitsAndReferenceFrame: 'SI; AP origin at transom baseline',
          assumptions: description || 'Isothermal seawater model',
          computeEnvironment: 'Dedicated HPC Cluster Node',
          runStatus: 'Ready',
          outputFiles: 'log.run, results.vtu',
          resultsSummary: 'Job staged; awaiting run execution and peer review.',
          reviewer: owner,
          validationStatus: 'Draft Job Staged',
          isIllustrative: false
        }
      });
    } else if (kind === 'verification') {
      onCreateRecord({
        kind: 'verification',
        data: {
          title,
          subsystemCode: subsystem,
          procedureSummary: description,
          acceptanceCriteria,
          instrumentationAndCalibration: 'Calibrated laboratory instruments per ISO 17025',
          targetReqIds: [],
          status: 'Draft',
          owner,
          isIllustrative: false
        }
      });
    } else if (kind === 'component') {
      onCreateRecord({
        kind: 'component',
        data: {
          subsystemCode: subsystem,
          partNumber,
          description: title,
          manufacturer,
          supplier,
          technicalSpecs: description,
          quantity,
          unitCost,
          leadTimeWeeks: '4 weeks',
          procurementStatus: 'Specifying',
          isIllustrative: false
        }
      });
    }


    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-400" />
              <span>Create New Engineering Record</span>
            </h3>
            <p className="text-[11px] text-slate-400">Add an authoritative item to the USV-01 registers</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Record Type Selector */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-[11px]">
            {(['requirement', 'decision', 'risk', 'simulation', 'verification', 'component'] as RecordKind[]).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setKind(k)}
                className={`py-1.5 px-1 rounded border text-center uppercase tracking-wider ${
                  kind === k
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {k.substring(0, 4)}
              </button>
            ))}
          </div>

          {/* Subsystem Allocator */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Subsystem Workstream</label>
              <select
                value={subsystem}
                onChange={(e) => setSubsystem(e.target.value as WorkstreamCode)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
              >
                <option value="SYS">SYS (Systems Engineering)</option>
                <option value="NAV">NAV (Naval Architecture)</option>
                <option value="HYD">HYD (Hydrodynamics)</option>
                <option value="MEC">MEC (Mechanical & Structural)</option>
                <option value="ELE">ELE (Electrical & Power)</option>
                <option value="PRP">PRP (Propulsion)</option>
                <option value="AUT">AUT (Software & Autonomy)</option>
                <option value="VNV">VNV (Verification & Validation)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Owner / Engineer</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                required
              />
            </div>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              {kind === 'component' ? 'Component Description' : 'Title / Subject'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Remote Telemetry Watchdog / Bottom Slamming Plating"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              required
            />
          </div>

          {kind === 'requirement' && (
            <>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Requirement Statement</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="The vessel system shall..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Acceptance Criteria (Verifiable)</label>
                <input
                  type="text"
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  placeholder="e.g. Area under GZ curve >= 0.055 m-rad"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  required
                />
              </div>
            </>
          )}

          {kind === 'decision' && (
            <>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Problem Statement</label>
                <textarea
                  rows={2}
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder="State the technical fork or architectural trade-off..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Alternatives Evaluated (1 per line)</label>
                <textarea
                  rows={2}
                  value={alternatives}
                  onChange={(e) => setAlternatives(e.target.value)}
                  placeholder="Alternative A: Catamaran&#10;Alternative B: Deep-V Monohull"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Engineering Rationale</label>
                <textarea
                  rows={2}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Technical justification and trade study evidence..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  required
                />
              </div>
            </>
          )}

          {kind === 'risk' && (
            <>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Risk Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Potential failure mode, environmental hazard, or degradation..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Probability (1 to 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={probability}
                    onChange={(e) => setProbability(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Impact (1 to 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={impact}
                    onChange={(e) => setImpact(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Engineered Mitigation</label>
                <input
                  type="text"
                  value={mitigation}
                  onChange={(e) => setMitigation(e.target.value)}
                  placeholder="Hardware redundancy, safety margin, or fail-safe logic..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  required
                />
              </div>
            </>
          )}

          {kind === 'component' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Part Number</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. NAV-IMU-900"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Torqeedo Marine"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold"
            >
              Commit Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
