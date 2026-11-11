import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  FileText,
  RotateCcw,
  Layers,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { WorkstreamCode } from '../types/engineering';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isHeuristic?: boolean;
}

interface AiEngineeringAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkstream: string;
  activeRecord?: any;
  prefillPrompt?: string;
  onClearPrefill?: () => void;
}

export const AiEngineeringAssistant: React.FC<AiEngineeringAssistantProps> = ({
  isOpen,
  onClose,
  currentWorkstream,
  activeRecord,
  prefillPrompt,
  onClearPrefill
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `### [USV-01 AI Engineering Assistant Active]
I am your server-side systems engineering and naval architecture assistant for **USV-01**.

**Engineering Integrity Rules:**
- All vessel physical dimensions and performance ratings remain **TBD** unless verified in certified baseline records.
- All AI design recommendations are classified as **proposals** requiring qualified human engineer sign-off.
- In every analysis, I distinguish between **Verified Facts**, **Assumptions**, **Proposals**, and **Missing Information / Uncertainties**.

How can I assist your engineering evaluation today?`,
      timestamp: '09:30'
    }
  ]);
  const [selectedAgent, setSelectedAgent] = useState<string>('AUTO');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefillPrompt) {
      setInputPrompt(prefillPrompt);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillPrompt, onClearPrefill]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toTimeString().substring(0, 5)
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentWorkstream,
          activeRecord,
          selectedAgent,
          actionType: 'Engineering Query'
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: data.text,
          timestamp: new Date().toTimeString().substring(0, 5),
          isHeuristic: data.isHeuristic
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ **Engineering Assistant Error:** ${data.error || 'Server-side request failed'}. Please retry.`,
            timestamp: new Date().toTimeString().substring(0, 5)
          }
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Network / Server Communication Error:** ${err.message}`,
          timestamp: new Date().toTimeString().substring(0, 5)
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Audit Requirements Traceability & Missing Acceptance Criteria',
    'Identify Missing TBD Engineering Inputs for Active Workstream',
    'Review Active Record Against IMO MSC.267(85) & DNV Standards',
    'Compare Design Alternatives & Technical Trade-offs',
    'Draft Verification Procedure & Test Acceptance Criteria'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] lg:w-[540px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
      {/* Assistant Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold font-mono text-slate-100 tracking-wider">
                GEMINI ENGINEERING ASSISTANT
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Context: {currentWorkstream} • Server-Side Proxy
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Specialist Agent Selector */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
        <span className="text-[11px] font-mono text-slate-400">Consult Agent:</span>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-cyan-300 focus:outline-none max-w-[280px]"
        >
          <option value="AUTO">AUTO (Context-Routed)</option>
          <option value="LEAD-SYS-01">LEAD-SYS-01 (Lead Systems Architect)</option>
          <option value="REQ-TRC-02">REQ-TRC-02 (Requirements & Traceability)</option>
          <option value="HULL-GEO-05">HULL-GEO-05 (Hull Form & Geometry)</option>
          <option value="STAB-HYD-06">STAB-HYD-06 (Hydrostatics & Stability)</option>
          <option value="RES-SEAK-07">RES-SEAK-07 (Resistance & Seakeeping)</option>
          <option value="STR-MAT-10">STR-MAT-10 (Structures & Slamming)</option>
          <option value="ELEC-PWR-14">ELEC-PWR-14 (Electrical & Microgrid)</option>
          <option value="PROP-ENG-13">PROP-ENG-13 (Propulsion Plant)</option>
          <option value="NAV-COL-17">NAV-COL-17 (COLREGS Avoidance)</option>
          <option value="CYBER-SEC-20">CYBER-SEC-20 (Cyber-Physical Security)</option>
          <option value="INDEP-REV-23">INDEP-REV-23 (Red Team Reviewer)</option>
          <option value="DOC-OBS-25">DOC-OBS-25 (Obsidian Documentation)</option>
        </select>
      </div>

      {/* Engineering Authority Reminder */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span>AI outputs are technical proposals. Requires qualified human sign-off.</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500">
              <span>{msg.sender === 'user' ? 'Lead Engineer' : 'Gemini 3.8 Flash Assistant'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
              {msg.isHeuristic && (
                <span className="text-amber-400 font-mono bg-amber-500/10 px-1 rounded">Offline Baseline Mode</span>
              )}
            </div>

            <div
              className={`max-w-[92%] rounded-lg p-3.5 text-xs leading-relaxed whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-teal-500/15 border border-teal-500/30 text-teal-100'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono p-3 bg-slate-900 rounded border border-slate-800 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            <span>Analyzing USV-01 engineering baseline via server-side Gemini API...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Drawer */}
      <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800 overflow-x-auto">
        <div className="text-[10px] font-mono text-slate-500 mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>Quick Engineering Analysis Queries:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              disabled={isLoading}
              className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask engineering question, compare alternatives, review rules..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 font-mono disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-2 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 disabled:opacity-40 transition-colors"
            title="Submit Query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[9px] text-slate-500 mt-1.5 text-center font-mono">
          Calls server-side Gemini 3.8 Flash • Model User-Agent logged as 'aistudio-build'
        </p>
      </div>
    </div>
  );
};
