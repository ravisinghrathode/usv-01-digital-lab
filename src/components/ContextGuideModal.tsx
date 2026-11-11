import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Download } from 'lucide-react';

interface ContextGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContextGuideModal: React.FC<ContextGuideModalProps> = ({ isOpen, onClose }) => {
  const [contextText, setContextText] = useState('Loading project engineering baseline context...');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/context')
        .then((res) => res.json())
        .then((data) => {
          if (data.context) setContextText(data.context);
        })
        .catch(() => {
          setContextText('USV-01 Digital Engineering Baseline Context.');
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <div>
              <h3 className="text-xs font-bold font-mono text-slate-100 uppercase tracking-wider">
                USV01_PROJECT_CONTEXT.md — Engineering Baseline
              </h3>
              <p className="text-[10px] text-slate-400">Authoritative baseline definition and zero-fabrication governance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed bg-slate-950">
          {contextText}
        </div>

        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-[11px] text-slate-500">Rev 0.2-BASELINE • Controlled System Context</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
          >
            Close Baseline Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
