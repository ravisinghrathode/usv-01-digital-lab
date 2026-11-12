import React from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Download,
  RotateCcw,
  Shield,
  Layers,
  HelpCircle,
  LogIn,
  LogOut,
  UserCheck,
  Lock
} from 'lucide-react';
import { ApproverIdentity } from '../core/types/safety.ts';

interface TopBarProps {
  currentModuleName: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewRecord: () => void;
  onOpenExportImport: () => void;
  onResetDemo: () => void;
  onToggleAiAssistant: () => void;
  isAiAssistantOpen: boolean;
  onOpenContextGuide: () => void;
  currentUser?: ApproverIdentity | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenVerify?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentModuleName,
  searchQuery,
  onSearchChange,
  onOpenNewRecord,
  onOpenExportImport,
  onResetDemo,
  onToggleAiAssistant,
  isAiAssistantOpen,
  onOpenContextGuide,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenVerify
}) => {
  const isDirector = currentUser?.role === 'ENGINEERING_DIRECTOR';

  return (
    <header className="h-14 bg-slate-950/95 border-b border-slate-800 px-4 flex items-center justify-between gap-4 z-10 sticky top-0 backdrop-blur-sm">
      {/* Breadcrumb & Subsystem Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-slate-300 font-semibold">USV-01</span>
          <span className="text-slate-600">/</span>
        </div>
        <h1 className="text-sm font-semibold text-slate-100 truncate tracking-tight">
          {currentModuleName}
        </h1>
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
          <Shield className="w-3 h-3 text-teal-400" />
          <span>ZERO-FABRICATION RULE</span>
        </div>
      </div>

      {/* Global Search & Action Controls */}
      <div className="flex items-center gap-2 flex-1 max-w-2xl justify-end">
        {/* Search */}
        <div className="relative w-full max-w-xs hidden xl:block">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search registers, IDs, tags..."
            className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-300"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* VERIFY USV-01 Single-Press Button */}
        <button
          onClick={onOpenVerify}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold tracking-tight transition-all shadow-sm shadow-emerald-950/40 active:scale-95 ring-1 ring-emerald-500/30"
          title="Single-Press Verification: Execute genuine 4-phase verification covering repo integrity, Stage A-E governance, 25 HMEA agents, and engineering traceability"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono">VERIFY USV-01</span>
        </button>

        {/* New Record Button */}
        <button
          onClick={onOpenNewRecord}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium transition-all shadow-sm active:scale-95"
          title={currentUser ? "Create a new engineering requirement, decision, risk, or simulation job" : "Authenticate to create records"}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">New Record</span>
        </button>

        {/* Backup / Export / Import */}
        <button
          onClick={onOpenExportImport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition-colors"
          title="Export or Import JSON Database Backup"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Backup / JSON</span>
        </button>

        {/* Demo Data Reset */}
        <button
          onClick={onResetDemo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
          title="Reset to certified illustrative demo baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Reset Demo</span>
        </button>

        {/* Baseline Context Guide Modal Trigger */}
        <button
          onClick={onOpenContextGuide}
          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
          title="View USV01_PROJECT_CONTEXT.md Baseline"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* AI Assistant Toggle Button */}
        <button
          onClick={onToggleAiAssistant}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium transition-all ${
            isAiAssistantOpen
              ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/10 ring-1 ring-sky-500/30'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-sky-400'
          }`}
          title="Toggle Gemini Engineering Assistant Panel"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="hidden sm:inline">Gemini</span>
        </button>

        {/* Authentication State & User Session Controls */}
        <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        {currentUser ? (
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-all ${
                isDirector
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-teal-950/40 border-teal-800/60 text-teal-300'
              }`}
              title={`Logged in as ${currentUser.userName} (${currentUser.userId}) [${currentUser.role}]`}
            >
              {isDirector ? (
                <Shield className="w-3 h-3 text-amber-400" />
              ) : (
                <UserCheck className="w-3 h-3 text-teal-400" />
              )}
              <span className="truncate max-w-[130px] font-sans font-medium text-slate-200">
                {currentUser.userName.split(' ')[0]}
              </span>
              <span className="text-[10px] opacity-75 font-mono hidden md:inline">
                [{currentUser.role}]
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 text-xs transition-colors"
              title="Sign Out / Terminate Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-400/90"
              title="Read-Only Mode: Sign in with staff credentials to perform engineering actions."
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Read-Only</span>
            </div>
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-all shadow-sm active:scale-95"
              title="Sign in with verified staff credentials"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
