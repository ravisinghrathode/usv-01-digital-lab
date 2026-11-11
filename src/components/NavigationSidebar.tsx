import React from 'react';
import {
  LayoutDashboard,
  GitMerge,
  Anchor,
  Waves,
  Hammer,
  Zap,
  Gauge,
  Cpu,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Package,
  BookOpen,
  Network,
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';
import { WorkstreamCode } from '../types/engineering';

export type NavigationModule = 
  | 'overview'
  | 'agent-orchestrator'
  | 'workstream-SYS'
  | 'workstream-NAV'
  | 'workstream-HYD'
  | 'workstream-MEC'
  | 'workstream-ELE'
  | 'workstream-PRP'
  | 'workstream-AUT'
  | 'workstream-VNV'
  | 'traceability'
  | 'simulations'
  | 'risks-decisions'
  | 'procurement-bom'
  | 'knowledge-centre';

interface NavigationSidebarProps {
  currentModule: NavigationModule;
  onSelectModule: (module: NavigationModule) => void;
  openRequirementsCount: number;
  openDecisionsCount: number;
  openRisksCount: number;
  openSimulationsCount: number;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentModule,
  onSelectModule,
  openRequirementsCount,
  openDecisionsCount,
  openRisksCount,
  openSimulationsCount
}) => {
  return (
    <aside className="w-68 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand & Vessel Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold tracking-wider text-slate-100">USV-01</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-500/10 border border-teal-500/30 text-teal-300 rounded">
                LAB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-tight">Digital Engineering Lab</p>
          </div>
        </div>

        {/* Engineering Baseline Tag */}
        <div className="mt-3 px-2 py-1.5 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-teal-400" /> BASELINE
          </span>
          <span className="text-teal-400 font-semibold">REV 0.2</span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs font-sans">
        {/* Core Workspace */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
            Executive Control
          </div>
          <button
            onClick={() => onSelectModule('overview')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded transition-colors ${
              currentModule === 'overview'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Project Overview</span>
            </div>
            {currentModule === 'overview' && <ChevronRight className="w-3.5 h-3.5 text-teal-400" />}
          </button>

          <button
            onClick={() => onSelectModule('agent-orchestrator')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded transition-colors ${
              currentModule === 'agent-orchestrator'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium'
                : 'text-slate-300 hover:bg-slate-900/80 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <div className="flex items-center gap-1.5">
                <span>25-Agent Directorate</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono">DAG</span>
              </div>
            </div>
            {currentModule === 'agent-orchestrator' && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>

        {/* 8 Primary Engineering Workstreams */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-mono tracking-wider text-slate-500 uppercase flex items-center justify-between">
            <span>Engineering Subsystems (8)</span>
            <span className="text-[9px] text-slate-600">DISCIPLINE</span>
          </div>

          <div className="space-y-0.5">
            <WorkstreamNavItem
              label="1. Systems Engineering"
              code="SYS"
              icon={GitMerge}
              active={currentModule === 'workstream-SYS'}
              badge={openRequirementsCount}
              onClick={() => onSelectModule('workstream-SYS')}
            />
            <WorkstreamNavItem
              label="2. Naval Architecture"
              code="NAV"
              icon={Anchor}
              active={currentModule === 'workstream-NAV'}
              badge="TBD"
              badgeType="neutral"
              onClick={() => onSelectModule('workstream-NAV')}
            />
            <WorkstreamNavItem
              label="3. Hydrodynamics"
              code="HYD"
              icon={Waves}
              active={currentModule === 'workstream-HYD'}
              badge="CFD"
              badgeType="teal"
              onClick={() => onSelectModule('workstream-HYD')}
            />
            <WorkstreamNavItem
              label="4. Mechanical & Structural"
              code="MEC"
              icon={Hammer}
              active={currentModule === 'workstream-MEC'}
              onClick={() => onSelectModule('workstream-MEC')}
            />
            <WorkstreamNavItem
              label="5. Electrical & Power"
              code="ELE"
              icon={Zap}
              active={currentModule === 'workstream-ELE'}
              onClick={() => onSelectModule('workstream-ELE')}
            />
            <WorkstreamNavItem
              label="6. Propulsion"
              code="PRP"
              icon={Gauge}
              active={currentModule === 'workstream-PRP'}
              onClick={() => onSelectModule('workstream-PRP')}
            />
            <WorkstreamNavItem
              label="7. Software & Autonomy"
              code="AUT"
              icon={Cpu}
              active={currentModule === 'workstream-AUT'}
              badge="ROS2"
              badgeType="sky"
              onClick={() => onSelectModule('workstream-AUT')}
            />
            <WorkstreamNavItem
              label="8. Verification & Validation"
              code="VNV"
              icon={CheckCircle2}
              active={currentModule === 'workstream-VNV'}
              onClick={() => onSelectModule('workstream-VNV')}
            />
          </div>
        </div>

        {/* Central Analysis & Engineering Registers */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
            Cross-Discipline Registers
          </div>
          <div className="space-y-0.5">
            <RegisterNavItem
              label="Traceability Matrix"
              icon={Network}
              active={currentModule === 'traceability'}
              onClick={() => onSelectModule('traceability')}
            />
            <RegisterNavItem
              label="Simulation Centre"
              icon={Activity}
              active={currentModule === 'simulations'}
              badge={openSimulationsCount}
              onClick={() => onSelectModule('simulations')}
            />
            <RegisterNavItem
              label="Risks & Decisions"
              icon={AlertTriangle}
              active={currentModule === 'risks-decisions'}
              badge={openRisksCount + openDecisionsCount}
              badgeType="amber"
              onClick={() => onSelectModule('risks-decisions')}
            />
            <RegisterNavItem
              label="Procurement & BOM"
              icon={Package}
              active={currentModule === 'procurement-bom'}
              onClick={() => onSelectModule('procurement-bom')}
            />
            <RegisterNavItem
              label="Knowledge Centre"
              icon={BookOpen}
              active={currentModule === 'knowledge-centre'}
              badge="Obsidian"
              badgeType="purple"
              onClick={() => onSelectModule('knowledge-centre')}
            />
          </div>
        </div>
      </div>

      {/* Mode Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/30 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-mono text-[10px]">LOCAL DEMO STORE</span>
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Database operational" />
        </div>
        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
          Zero-fabrication rule active. Unverified parameters marked TBD.
        </p>
      </div>
    </aside>
  );
};

interface WorkstreamNavItemProps {
  label: string;
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: string | number;
  badgeType?: 'neutral' | 'teal' | 'sky' | 'amber' | 'purple';
  onClick: () => void;
}

const WorkstreamNavItem: React.FC<WorkstreamNavItemProps> = ({
  label,
  code,
  icon: Icon,
  active,
  badge,
  badgeType = 'neutral',
  onClick
}) => {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'teal':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'sky':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'purple':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-all text-left ${
        active
          ? 'bg-slate-800/90 text-teal-300 border-l-2 border-teal-400 pl-2 font-medium'
          : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-teal-400' : 'text-slate-400'}`} />
        <span className="truncate">{label}</span>
      </div>
      {badge !== undefined && (
        <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${getBadgeStyle()}`}>
          {badge}
        </span>
      )}
    </button>
  );
};

interface RegisterNavItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: string | number;
  badgeType?: 'neutral' | 'teal' | 'sky' | 'amber' | 'purple';
  onClick: () => void;
}

const RegisterNavItem: React.FC<RegisterNavItemProps> = ({
  label,
  icon: Icon,
  active,
  badge,
  badgeType = 'neutral',
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left ${
        active
          ? 'bg-slate-800/90 text-teal-300 border-l-2 border-teal-400 pl-2 font-medium'
          : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${active ? 'text-teal-400' : 'text-slate-400'}`} />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
            badgeType === 'amber'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : badgeType === 'purple'
              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
