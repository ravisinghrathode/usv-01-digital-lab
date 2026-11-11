import React, { useState } from 'react';
import { Download, Upload, RotateCcw, X, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportJson: () => void;
  onImportJson: (jsonString: string) => Promise<boolean>;
  onResetDemo: () => Promise<void>;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  onExportJson,
  onImportJson,
  onResetDemo
}) => {
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleRunImport = async () => {
    if (!importText.trim()) return;
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const success = await onImportJson(importText);
      if (success) {
        setStatusMsg({ type: 'success', text: 'Database restored successfully from imported JSON snapshot!' });
        setTimeout(() => onClose(), 1500);
      } else {
        setStatusMsg({ type: 'error', text: 'Import failed: Invalid structure or missing collections.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Import error: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunReset = async () => {
    if (confirm('Are you sure you want to reset all registers to the default certified illustrative baseline? Any unexported edits will be replaced.')) {
      setIsLoading(true);
      await onResetDemo();
      setIsLoading(false);
      setStatusMsg({ type: 'success', text: 'Database reset to certified baseline.' });
      setTimeout(() => onClose(), 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100">Engineering Database Backup & Restore</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Export Action */}
        <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2">
          <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Complete JSON Snapshot</span>
          </h4>
          <p className="text-[11px] text-slate-400">
            Download the authoritative single-file JSON backup of all 8 workstreams, requirements, simulation jobs, and audit logs.
          </p>
          <button
            onClick={onExportJson}
            className="w-full py-1.5 px-3 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-mono font-medium transition-colors"
          >
            Download Database Backup (.json)
          </button>
        </div>

        {/* Import Action */}
        <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2">
          <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Restore / Import JSON Snapshot</span>
          </h4>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="text-xs text-slate-400 font-mono file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-300"
          />
          <textarea
            rows={3}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Or paste JSON payload here..."
            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={handleRunImport}
            disabled={isLoading || !importText.trim()}
            className="w-full py-1.5 px-3 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-mono font-medium disabled:opacity-40 transition-colors"
          >
            {isLoading ? 'Importing...' : 'Restore Database from JSON'}
          </button>
        </div>

        {/* Reset Demo Baseline */}
        <div className="p-3 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <h5 className="text-xs font-medium text-slate-300">Reset to Certified Baseline</h5>
            <p className="text-[10px] text-slate-500">Restores default illustrative sample data</p>
          </div>
          <button
            onClick={handleRunReset}
            disabled={isLoading}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            Reset Baseline
          </button>
        </div>
      </div>
    </div>
  );
};
