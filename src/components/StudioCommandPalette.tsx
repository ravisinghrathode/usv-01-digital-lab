import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Command, Search, X } from 'lucide-react';
import { NavigationModule, searchModules } from '../moduleRegistry';
import { searchLoadedRecords, SearchableRecord } from '../studio/recordSearch';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (module: NavigationModule) => void;
  records?: readonly SearchableRecord[];
}
interface Option {
  key: string;
  label: string;
  detail: string;
  module: NavigationModule;
  kind: 'Module' | 'Record';
}

export const StudioCommandPalette: React.FC<Props> = ({ open, onClose, onSelect, records = [] }) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const listId = useId();

  const options = useMemo<Option[]>(() => {
    const modules: Option[] = searchModules(query).map(module => ({
      key: 'module-' + module.id, label: module.label, detail: module.group,
      kind: 'Module', module: module.id
    }));
    const matchingRecords: Option[] = searchLoadedRecords(records, query).map(record => ({
      key: 'record-' + record.kind + '-' + record.id,
      label: record.id + ' — ' + record.title,
      detail: record.kind + ' · ' + (record.status ?? 'Status not recorded') + (record.illustrative ? ' · Illustrative' : ''),
      kind: 'Record', module: record.module
    }));
    return [...modules, ...matchingRecords];
  }, [query, records]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setQuery('');
      setCursor(0);
      if (!element.open) element.showModal();
      input.current?.focus();
    } else {
      if (element.open) element.close();
      previousFocus.current?.focus();
      previousFocus.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !options.length) return;
    document.getElementById(listId + '-option-' + cursor)?.scrollIntoView({ block: 'nearest' });
  }, [cursor, listId, open, options.length]);

  const choose = (option: Option) => {
    onSelect(option.module);
    onClose();
  };

  return <dialog ref={dialog}
    onCancel={event => { event.preventDefault(); onClose(); }}
    aria-label="Search engineering modules and loaded records"
    aria-describedby={listId + '-scope'}
    className="studio-dark fixed left-1/2 top-[8vh] z-[90] m-0 w-[min(94vw,680px)] -translate-x-1/2 overflow-hidden rounded-xl border border-cyan-400/30 bg-[#111f30] p-0 text-white shadow-2xl backdrop:bg-[#020617]/85">
    <div className="flex items-center gap-3 border-b border-white/15 p-4">
      <Command size={18} className="shrink-0 text-cyan-300"/>
      <Search size={18} className="shrink-0 text-slate-300"/>
      <input ref={input}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId + '-results'}
        aria-activedescendant={options.length ? listId + '-option-' + Math.min(cursor, options.length - 1) : undefined}
        value={query}
        onChange={event => { setQuery(event.target.value); setCursor(0); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault(); setCursor(index => Math.min(options.length - 1, index + 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault(); setCursor(index => Math.max(0, index - 1));
          } else if (event.key === 'Home') {
            event.preventDefault(); setCursor(0);
          } else if (event.key === 'End') {
            event.preventDefault(); setCursor(Math.max(0, options.length - 1));
          } else if (event.key === 'Enter' && options[cursor]) {
            event.preventDefault(); choose(options[cursor]);
          }
        }}
        placeholder="Find module, record ID or title…"
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
        aria-label="Search loaded engineering records and modules"/>
      <button type="button" onClick={onClose} aria-label="Close search" className="rounded-lg border border-white/20 p-2 text-slate-200 hover:bg-white/10">
        <X size={18}/>
      </button>
    </div>
    <p id={listId + '-scope'} className="px-4 pt-3 text-xs text-slate-300">
      Search only records already loaded into this session. Results open their containing engineering module, not a specific record.
    </p>
    <div role="status" aria-live="polite" className="px-4 py-2 text-xs text-slate-300">
      {options.length} results{query.trim() ? ' for “' + query.trim() + '”' : ' · start typing to search records'}
    </div>
    <div id={listId + '-results'} role="listbox" aria-label="Matching modules and records" className="max-h-[48vh] overflow-y-auto px-2 pb-2">
      {options.map((option, index) =>
        <button role="option" type="button" id={listId + '-option-' + index}
          key={option.key} aria-selected={cursor === index} tabIndex={-1}
          onMouseEnter={() => setCursor(index)} onClick={() => choose(option)}
          className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${cursor === index ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-200 hover:bg-white/10'}`}>
          <span className="min-w-0 break-words">{option.label}</span>
          <span className="shrink-0 text-xs text-slate-300">{option.kind} · {option.detail}</span>
        </button>
      )}
      {!options.length && <p className="p-4 text-sm text-slate-300">No matching loaded records or modules. Try a record ID, title or subsystem.</p>}
    </div>
    <div className="border-t border-white/15 px-4 py-2.5 text-xs text-slate-300">
      ↑↓ Navigate · Enter Open module · Esc Close
    </div>
  </dialog>;
};
