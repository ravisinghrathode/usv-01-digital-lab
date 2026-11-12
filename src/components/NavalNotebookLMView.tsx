import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  Send,
  FileText,
  CheckSquare,
  Square,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Gauge,
  Anchor,
  Shield,
  Layers,
  Cpu,
  Bookmark,
  ChevronRight,
  Filter,
  RefreshCw,
  X
} from 'lucide-react';
import { WorkstreamCode } from '../types/engineering';
import { NotebookSource, NotebookChatMessage, AgentClueProposal, NotebookCitation } from '../types/notebookLm';
import { GlobalIntelligenceLearningBridge } from '../core/intelligence/GlobalIntelligenceLearningBridge';

interface NavalNotebookLMViewProps {
  onAskGlobalAi?: (prompt: string, record?: any) => void;
}

export const NavalNotebookLMView: React.FC<NavalNotebookLMViewProps> = ({ onAskGlobalAi }) => {
  const learningBridge = useMemo(() => GlobalIntelligenceLearningBridge.getInstance(), []);
  const [sources, setSources] = useState<NotebookSource[]>(() => learningBridge.getNotebookSources());
  const [clues, setClues] = useState<AgentClueProposal[]>(() => learningBridge.getClues());
  const [selectedSource, setSelectedSource] = useState<NotebookSource>(sources[1] || sources[0]);
  const [activeLeftTab, setActiveLeftTab] = useState<'sources' | 'clues'>('sources');
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'ALL' | 'USV_VESSEL' | 'ACADEMIC_PAPER'>('ALL');
  const [clueDisciplineFilter, setClueDisciplineFilter] = useState<string>('ALL');

  // Grounded Chat State
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<NotebookChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `### [Naval NotebookLM Research Studio Ready]
Welcome to the **Naval NotebookLM & Agent Learning Workspace**.
I am your grounded research synthesizer with direct access to:
- **14 operational naval USVs** across US Navy, UK Royal Navy, Turkish Navy, Ukrainian Navy, Israeli Navy, French Navy, and others.
- **6 peer-reviewed academic papers** (SNAME, IEEE Oceanic Engineering, DARPA ACTUV, Fossen nonlinear dynamics).
- **10 cross-discipline engineering clues** harvested for USV-01.

Select sources in the left panel to constrain my analysis, or click any prompt starter below to begin.`,
      timestamp: '09:00',
      isGrounded: true
    }
  ]);

  // Selected source IDs for context
  const selectedSourceIds = useMemo(() => {
    return sources.filter((s) => s.isSelectedForContext).map((s) => s.id);
  }, [sources]);

  // Filtered sources
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (sourceTypeFilter !== 'ALL' && s.type !== sourceTypeFilter) return false;
      if (sourceSearch.trim()) {
        const q = sourceSearch.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.subtitle.toLowerCase().includes(q) ||
          s.countryOrPublisher.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [sources, sourceTypeFilter, sourceSearch]);

  // Filtered clues
  const filteredClues = useMemo(() => {
    return clues.filter((c) => {
      if (clueDisciplineFilter !== 'ALL' && c.targetDiscipline !== clueDisciplineFilter) {
        return false;
      }
      return true;
    });
  }, [clues, clueDisciplineFilter]);

  // Toggle single source selection for context
  const toggleSourceSelection = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isSelectedForContext: !s.isSelectedForContext } : s))
    );
  };

  // Toggle select all sources
  const toggleSelectAll = (select: boolean) => {
    setSources((prev) => prev.map((s) => ({ ...s, isSelectedForContext: select })));
  };

  // Handle clue adoption
  const handleAdoptClue = (clueId: string) => {
    const updated = learningBridge.updateClueStatus(clueId, 'ADOPTED');
    setClues([...learningBridge.getClues()]);
  };

  // Handle Send Message in Grounded Chat
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputMessage).trim();
    if (!promptToSend || isTyping) return;

    const userMsg: NotebookChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGrounded: false
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Call server endpoint or fallback to client learning bridge
      const response = await fetch('/api/notebook-lm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          selectedSourceIds
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
      } else {
        // Fallback to local grounded synthesizer
        const groundedAnswer = learningBridge.answerGroundedQuery(promptToSend, selectedSourceIds);
        setMessages((prev) => [...prev, groundedAnswer]);
      }
    } catch {
      const groundedAnswer = learningBridge.answerGroundedQuery(promptToSend, selectedSourceIds);
      setMessages((prev) => [...prev, groundedAnswer]);
    } finally {
      setIsTyping(false);
    }
  };

  // Export current research transcript as markdown
  const handleExportNotebookMarkdown = () => {
    let md = `# Naval Research NotebookLM — Intelligence Synthesis\n\n`;
    md += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    md += `**Active Grounded Sources (${selectedSourceIds.length}):**\n`;
    for (const id of selectedSourceIds) {
      const src = sources.find((s) => s.id === id);
      if (src) md += `- [[${src.title}]] (${src.countryOrPublisher})\n`;
    }
    md += `\n---\n\n## Chat Transcript & Grounded Syntheses\n\n`;

    for (const m of messages) {
      md += `### ${m.sender === 'user' ? 'User Research Query' : 'Naval NotebookLM Synthesis'} (${m.timestamp})\n\n`;
      md += `${m.text}\n\n`;
      if (m.citations && m.citations.length > 0) {
        md += `**Citations:**\n`;
        for (const c of m.citations) {
          md += `- [${c.sourceTitle}] — *${c.quoteOrFact}*\n`;
        }
        md += `\n`;
      }
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Naval_NotebookLM_Synthesis_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans h-screen flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> NAVAL NOTEBOOKLM &amp; LEARNING BRIDGE
            </span>
            <span className="text-xs text-slate-500 font-mono">GROUNDED CROSS-DISCIPLINE STUDY</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1 flex items-center gap-2">
            Naval Research NotebookLM &amp; Operational USV Intelligence Reader
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Read operating naval USV specifications, study peer-reviewed papers, extract engineering clues for USV-01, and chat with grounded source citations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportNotebookMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Research Note (.md)</span>
          </button>
        </div>
      </div>

      {/* 3-Pane Workspace Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Pane: Sources & Clues (4 Cols) */}
        <div className="lg:col-span-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveLeftTab('sources')}
              className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeLeftTab === 'sources'
                  ? 'bg-slate-800/80 text-purple-300 border-b-2 border-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sources ({selectedSourceIds.length}/{sources.length})</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('clues')}
              className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeLeftTab === 'clues'
                  ? 'bg-slate-800/80 text-teal-300 border-b-2 border-teal-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Agent Clues ({clues.length})</span>
            </button>
          </div>

          {/* Tab 1: Sources */}
          {activeLeftTab === 'sources' && (
            <div className="p-3 space-y-3 flex-1 flex flex-col min-h-0">
              {/* Search & Selection Controls */}
              <div className="space-y-2 flex-shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder="Search sources by name, navy, paper..."
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleSelectAll(true)}
                      className="hover:text-purple-300 underline"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => toggleSelectAll(false)}
                      className="hover:text-purple-300 underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {['ALL', 'USV_VESSEL', 'ACADEMIC_PAPER'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSourceTypeFilter(t as any)}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          sourceTypeFilter === t
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {t === 'ALL' ? 'All' : t === 'USV_VESSEL' ? 'Vessels' : 'Papers'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Source List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredSources.map((s) => {
                  const isSelectedForRead = selectedSource?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`p-2.5 rounded border transition-colors flex items-start gap-2.5 cursor-pointer ${
                        isSelectedForRead
                          ? 'bg-purple-500/10 border-purple-500/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                      onClick={() => setSelectedSource(s)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSourceSelection(s.id);
                        }}
                        className="mt-0.5 text-slate-400 hover:text-purple-300"
                      >
                        {s.isSelectedForContext ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span
                            className={`px-1 rounded ${
                              s.type === 'USV_VESSEL'
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : s.type === 'ACADEMIC_PAPER'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                            }`}
                          >
                            {s.type === 'USV_VESSEL' ? 'OPERATIONAL USV' : s.type === 'ACADEMIC_PAPER' ? 'PAPER' : 'BASELINE'}
                          </span>
                          <span className="text-slate-500">{s.year}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-200 mt-1 truncate">
                          {s.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{s.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Agent Clues */}
          {activeLeftTab === 'clues' && (
            <div className="p-3 space-y-3 flex-1 flex flex-col min-h-0">
              {/* Discipline Filter */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono pb-1 flex-shrink-0">
                {['ALL', 'NAV', 'HYD', 'MEC', 'PRP', 'ELE', 'AUT', 'SYS', 'VNV'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setClueDisciplineFilter(d)}
                    className={`px-2 py-0.5 rounded ${
                      clueDisciplineFilter === d
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Clues List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {filteredClues.map((clue) => (
                  <div
                    key={clue.id}
                    className="p-3 rounded bg-slate-950/70 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold">
                        {clue.targetDiscipline} • {clue.allocatingAgentId}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          clue.status === 'ADOPTED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                            : clue.status === 'TRIAL_PROPOSED'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {clue.status}
                      </span>
                    </div>

                    <h5 className="font-semibold text-slate-100 text-xs">{clue.clueTitle}</h5>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Observed on: <span className="text-slate-300">{clue.sourceName}</span>
                    </p>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800/80 space-y-1 text-[11px]">
                      <span className="text-teal-400 font-mono block text-[9px] uppercase">
                        Proposed Application for USV-01:
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {clue.proposedApplicationToUsv01}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Benefit: {clue.expectedBenefit.split(';')[0]}
                      </span>
                      {clue.status !== 'ADOPTED' && (
                        <button
                          onClick={() => handleAdoptClue(clue.id)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] transition-colors"
                        >
                          Adopt to Trial
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Pane: Document Reader (4 Cols) */}
        <div className="lg:col-span-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              Document Reader View
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
              {selectedSource?.countryOrPublisher}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
            {selectedSource ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedSource.title}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedSource.subtitle}</p>
                </div>

                <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-200">
                  {selectedSource.contentMarkdown}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleSendMessage(`Analyze the key architectural lessons from ${selectedSource.title} and explain how our USV-01 project can adopt its advantages.`)}
                    className="flex-1 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask AI About This Source</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">Select a source from the left pane to read.</div>
            )}
          </div>
        </div>

        {/* Right Pane: Grounded Chat Box (4 Cols) */}
        <div className="lg:col-span-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-slate-200">
                Grounded Naval Chat
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {selectedSourceIds.length} sources active
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg text-xs ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white ml-6'
                    : 'bg-slate-950/90 border border-slate-800 text-slate-200 mr-2'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] opacity-75 mb-1 font-mono">
                  <span>{msg.sender === 'user' ? 'Engineering Director' : 'Naval NotebookLM'}</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                  {msg.text}
                </div>

                {/* Grounded Citations Drawer */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800 space-y-1 font-mono text-[10px]">
                    <span className="text-purple-300 font-bold block">GROUNDED CITATIONS ({msg.citations.length}):</span>
                    {msg.citations.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between gap-1 cursor-pointer hover:bg-slate-800/80"
                        onClick={() => {
                          const matched = sources.find((s) => s.id === c.sourceId);
                          if (matched) setSelectedSource(matched);
                        }}
                      >
                        <span className="truncate text-sky-300 font-semibold">[{idx + 1}] {c.sourceTitle}</span>
                        <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-purple-300 font-mono flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Cross-referencing active operational USV sources &amp; papers...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Starters */}
          <div className="p-2 border-t border-slate-800 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono flex-shrink-0">
            <button
              onClick={() => handleSendMessage('Compare propulsion choices and speeds between Black Sea strike USVs (MAGURA V5, Sea Baby) and Turkish armed USVs (ULAQ, MARLIN).')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
            >
              Propulsion Trade Study
            </button>
            <button
              onClick={() => handleSendMessage('What hydrodynamic and deadrise principles does the Savitsky research paper recommend to prevent porpoising at 30+ knots?')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
            >
              Savitsky Porpoising Clues
            </button>
            <button
              onClick={() => handleSendMessage('Summarize the operational sea trial evidence of Sea Hunter for autonomous COLREGS compliance.')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
            >
              COLREGS Sea Hunter
            </button>
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask anything about operating USVs, papers, or clues..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isTyping || !inputMessage.trim()}
              className="p-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
