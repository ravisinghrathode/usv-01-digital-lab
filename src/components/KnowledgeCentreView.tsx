import React, { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  Sparkles,
  Search,
  FileText,
  Bookmark,
  Share2,
  FolderArchive
} from 'lucide-react';
import { KnowledgeNote } from '../types/engineering';

interface KnowledgeCentreViewProps {
  notes: KnowledgeNote[];
  onAskAi: (prompt: string, record?: any) => void;
}

export const KnowledgeCentreView: React.FC<KnowledgeCentreViewProps> = ({
  notes,
  onAskAi
}) => {
  const [selectedNote, setSelectedNote] = useState<KnowledgeNote>(notes[0]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredNotes = notes.filter((n) => {
    if (categoryFilter !== 'ALL' && n.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.contentMarkdown.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Render markdown with Obsidian wikilink highlight
  const renderWikilinkText = (text: string) => {
    // Regex to split on [[Wikilink]]
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkTarget = part.slice(2, -2);
        return (
          <span
            key={index}
            className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px] inline-block mx-0.5 cursor-pointer hover:bg-purple-500/25"
            title={`Obsidian Vault Link: ${linkTarget}`}
            onClick={() => {
              const matched = notes.find(n => n.title.toLowerCase().includes(linkTarget.toLowerCase()));
              if (matched) setSelectedNote(matched);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
              OBSIDIAN VAULT
            </span>
            <span className="text-xs text-slate-500 font-mono">DIGITAL ENGINEERING KNOWLEDGE CENTRE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            Engineering Knowledge Graph, Maritime Standards & Research Notes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interlinked engineering concepts, lessons learned, and standards with bidirectional wikilinks [[Topic]] integrated into the project Obsidian vault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAskAi('Query the knowledge base for governing international standards: IMO 2008 IS Code, DNV-RU-HSLC, and IEEE 45. Summarize key design margins applicable to USV-01.', selectedNote)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Knowledge Synthesis</span>
          </button>
        </div>
      </div>

      {/* Controlled Store Note */}
      <div className="p-3.5 rounded bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs">
        <FolderArchive className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-slate-200">Controlled Architecture: Obsidian Vault & Google Drive Archive</h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            The project knowledge graph resides in <strong>Obsidian</strong> via Markdown wikilinks (<code className="text-purple-300">[[Naval Architecture]]</code>, <code className="text-purple-300">[[Hydrodynamics]]</code>). Controlled design files, CAD drawings, and test evidence are stored in the secure Google Drive archive.
          </p>
        </div>
      </div>

      {/* Split Layout: Notes Index on Left, Markdown Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Notes Navigation */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 p-3 rounded border border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vault notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
            >
              <option value="ALL">All Categories</option>
              <option value="Standard Reference">Standard References</option>
              <option value="Engineering Concept">Engineering Concepts</option>
              <option value="Lesson Learned">Lessons Learned</option>
              <option value="Glossary Term">Glossary Terms</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-purple-500/10 border-l-2 border-purple-400'
                    : 'hover:bg-slate-800/60'
                }`}
              >
                <span className="text-[10px] font-mono text-purple-400 block">{note.category}</span>
                <h4 className="text-xs font-semibold text-slate-200 mt-0.5">{note.title}</h4>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {note.subsystems.map(sub => (
                    <span key={sub} className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                      {sub}
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-500 ml-auto font-mono">{note.lastUpdated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Note Reader */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded p-6">
          {selectedNote ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                      {selectedNote.category}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Updated: {selectedNote.lastUpdated}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mt-1">{selectedNote.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {selectedNote.obsidianVaultLink && (
                    <a
                      href={selectedNote.obsidianVaultLink}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-mono flex items-center gap-1 border border-purple-500/30"
                      title="Open in Local Obsidian App"
                    >
                      <span>Obsidian Vault</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedNote.googleDriveRef && (
                    <a
                      href={selectedNote.googleDriveRef}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-mono flex items-center gap-1 border border-slate-700"
                      title="Open Controlled Folder in Google Drive"
                    >
                      <span>Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Rendered Note Content */}
              <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed font-sans space-y-3 whitespace-pre-line">
                {renderWikilinkText(selectedNote.contentMarkdown)}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Select a note from the Obsidian vault list to preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
