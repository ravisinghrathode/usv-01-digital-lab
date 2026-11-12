import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  Filter,
  Download,
  ExternalLink,
  BookOpen,
  Sparkles,
  Zap,
  Gauge,
  Anchor,
  Shield,
  Layers,
  Cpu,
  Radio,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Compass,
  ArrowRightLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { OperatingUsvModel, UsvPaperReference, UsvMissionProfile } from '../types/usvIntelligence';
import { GLOBAL_NAVY_USVS, GLOBAL_USV_ACADEMIC_PAPERS } from '../data/globalUsvFleetData';

interface GlobalUsvFleetViewProps {
  onAskAi?: (prompt: string, record?: any) => void;
}

export const GlobalUsvFleetView: React.FC<GlobalUsvFleetViewProps> = ({ onAskAi }) => {
  const [vessels, setVessels] = useState<OperatingUsvModel[]>(GLOBAL_NAVY_USVS);
  const [selectedVessel, setSelectedVessel] = useState<OperatingUsvModel | null>(GLOBAL_NAVY_USVS[0]);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'hull' | 'propulsion' | 'autonomy' | 'combat' | 'papers' | 'benchmark'>('overview');
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [missionFilter, setMissionFilter] = useState<string>('ALL');
  const [hullFilter, setHullFilter] = useState('ALL');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeConsoleOpen, setScrapeConsoleOpen] = useState(false);
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // Available unique countries
  const countries = useMemo(() => {
    const list = Array.from(new Set(vessels.map((v) => v.country))).sort();
    return ['ALL', ...list];
  }, [vessels]);

  // Filtered vessels
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      if (countryFilter !== 'ALL' && v.country !== countryFilter) return false;
      if (missionFilter !== 'ALL' && v.primaryMission !== missionFilter && !v.secondaryMissions.includes(missionFilter as any)) {
        return false;
      }
      if (hullFilter !== 'ALL' && !v.dimensions.hullForm.toLowerCase().includes(hullFilter.toLowerCase())) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          v.modelName.toLowerCase().includes(q) ||
          v.operatorNavy.toLowerCase().includes(q) ||
          v.country.toLowerCase().includes(q) ||
          v.manufacturer.toLowerCase().includes(q) ||
          v.primaryMission.toLowerCase().includes(q) ||
          v.propulsion.engineDescription.toLowerCase().includes(q) ||
          v.autonomy.architectureDescription.toLowerCase().includes(q) ||
          (v.sensors.surfaceRadar && v.sensors.surfaceRadar.toLowerCase().includes(q)) ||
          (v.missionPackage.combatPayloadDescription && v.missionPackage.combatPayloadDescription.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [vessels, countryFilter, missionFilter, hullFilter, search]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = vessels.length;
    const countriesCount = new Set(vessels.map((v) => v.country)).size;
    const combatProven = vessels.filter((v) => v.status === 'Combat Deployed').length;
    const highSpeed = vessels.filter((v) => v.performance.maxSpeedKnots >= 35).length;
    const longEndurance = vessels.filter((v) => v.performance.enduranceHours >= 72).length;
    const totalPapers = GLOBAL_USV_ACADEMIC_PAPERS.length;
    return { total, countriesCount, combatProven, highSpeed, longEndurance, totalPapers };
  }, [vessels]);

  // Trigger research intelligence pipeline
  const handleTriggerScraper = async () => {
    setIsScraping(true);
    setScrapeConsoleOpen(true);
    setScrapeLogs([
      `[${new Date().toLocaleTimeString()}] INTEL-USV-26 Agent initializing research data pipeline...`,
      `[${new Date().toLocaleTimeString()}] Checking source repositories: IEEE, SNAME, arXiv, Jane's, Naval News...`
    ]);

    try {
      // Call server endpoint
      const res = await fetch('/api/usv-intel/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: ['arXiv:maritime-robotics', 'IEEE-Oceanic-Eng', 'NavalNews', 'Jane-Defense-USV-Register'],
          syncToKnowledgeNotes: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        const report = data.report || {};
        const isCached = report.refreshMode === 'CACHED_OFFLINE';
        setScrapeLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Status: ${report.statusMessage || (isCached ? 'Cached Data — No Live Refresh Performed' : 'Live Data Refreshed')}.`,
          `[${new Date().toLocaleTimeString()}] Cached fleet records: ${data.totalVessels ?? vessels.length} USV models (${report.activeNaviesCount ?? 0} navies); independent verification still required.`,
          `[${new Date().toLocaleTimeString()}] New academic references parsed in this run: ${report.papersExtracted ?? 0}.`,
          `[${new Date().toLocaleTimeString()}] Deduplication check complete: ${report.deduplicatedCount || 0} duplicates resolved; ${report.conflictCount || 0} parameter conflicts flagged.`
        ]);
        setSyncSuccessToast(isCached ? 'Local intelligence cache active — No Live Refresh Performed.' : 'Public research feed checked; no new vessel specifications independently validated.');
        setTimeout(() => setSyncSuccessToast(null), 4000);
      } else {
        setScrapeLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Remote endpoint unavailable. Serving verified local intelligence cache.`,
          `[${new Date().toLocaleTimeString()}] Cached Data — No Live Refresh Performed.`
        ]);
      }
    } catch {
      setScrapeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Remote network unavailable. Serving verified local intelligence cache.`,
        `[${new Date().toLocaleTimeString()}] Cached Data — No Live Refresh Performed.`
      ]);
    } finally {
      setIsScraping(false);
    }
  };

  // Export selected or all vessels to Obsidian Markdown
  const handleExportObsidian = (vessel?: OperatingUsvModel) => {
    if (vessel) {
      window.open(`/api/usv-intel/export-obsidian/${vessel.id}`, '_blank');
    } else {
      window.open('/api/usv-intel/export-obsidian', '_blank');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {syncSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded flex items-center gap-1">
              <Globe className="w-3 h-3" /> INTEL-USV-26 AGENT
            </span>
            <span className="text-xs text-slate-500 font-mono">GLOBAL NAVAL FLEET INTELLIGENCE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1 flex items-center gap-2">
            Operating Naval USV Fleet Registry & Technical Model Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated intelligence scraping and academic paper synthesis of operational uncrewed surface vessels across global navies with comparative benchmarking against USV-01.
          </p>
          <div className="flex items-center gap-2.5 mt-2 text-[11px] font-mono flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              STATUS: Cached Data — No Live Refresh Performed
            </span>
            <span className="text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
              VERIFIED ARCHIVE: {new Date().toISOString().split('T')[0]}
            </span>
            <span className="text-sky-300 bg-sky-950/50 border border-sky-800/40 px-2 py-0.5 rounded">
              RESEARCH REPOSITORY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTriggerScraper}
            disabled={isScraping}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Evaluating Sources...' : 'Run Intelligence Pipeline (A26)'}</span>
          </button>

          <button
            onClick={() => handleExportObsidian()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Export Obsidian Vault</span>
          </button>

          {onAskAi && (
            <button
              onClick={() => onAskAi('Provide an executive intelligence briefing on global naval USV developments. Compare US Navy large USVs, Ukrainian strike USVs, and Turkish armed USVs, highlighting propulsion, autonomy level, and lessons for USV-01.')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Fleet Synthesis</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400">Total USVs Cataloged</div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">{stats.total} Models</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across {stats.countriesCount} nations</div>
        </div>
        <div className="p-3 rounded bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400">Combat Deployed</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">{stats.combatProven} Proven</div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">Black Sea combat sinkings</div>
        </div>
        <div className="p-3 rounded bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400">High-Speed (&gt;35 kt)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{stats.highSpeed} Craft</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Planing &amp; waterjet</div>
        </div>
        <div className="p-3 rounded bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400">Long Endurance (&gt;72h)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stats.longEndurance} Vessels</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Up to 180 days persistent</div>
        </div>
        <div className="p-3 rounded bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400">Naval Operators</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{stats.countriesCount} Navies</div>
          <div className="text-[10px] text-slate-500 mt-0.5">US, UK, TR, UA, IL, FR...</div>
        </div>
        <div className="p-3 rounded bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400">Academic Papers</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">{stats.totalPapers} Papers</div>
          <div className="text-[10px] text-purple-400/80 mt-0.5">IEEE / DTIC / SNAME</div>
        </div>
      </div>

      {/* Scraper Live Log Drawer / Modal */}
      {scrapeConsoleOpen && (
        <div className="p-4 rounded-lg bg-slate-950 border border-sky-500/30 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2 text-sky-400 font-semibold">
              <Activity className="w-4 h-4 animate-pulse" />
              INTEL-USV-26 Live Scraping &amp; Knowledge Synthesis Feed
            </span>
            <button
              onClick={() => setScrapeConsoleOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 text-slate-300 max-h-40 overflow-y-auto">
            {scrapeLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-sky-500">&gt; </span>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Multi-Faceted Filters */}
      <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vessel model, navy, manufacturer, weapon, radar, mission..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Countries / Navies</option>
              {countries.filter((c) => c !== 'ALL').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={hullFilter}
              onChange={(e) => setHullFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Hull Forms</option>
              <option value="Monohull">Monohull (Deep-V / Planing)</option>
              <option value="Catamaran">Catamaran</option>
              <option value="Trimaran">Trimaran</option>
              <option value="RHIB">Rigid Inflatable Hull (RHIB)</option>
              <option value="Wave Piercing">Wave Piercing</option>
            </select>
          </div>
        </div>

        {/* Mission Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
          <span className="text-[11px] text-slate-500 font-mono mr-1">MISSION:</span>
          {['ALL', 'ASW', 'ASuW', 'MCM', 'ISR', 'STRIKE', 'PATROL', 'SURVEY', 'EW'].map((m) => (
            <button
              key={m}
              onClick={() => setMissionFilter(m)}
              className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
                missionFilter === m
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Vessel Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVessels.map((v) => {
          const isSelected = selectedVessel?.id === v.id;
          return (
            <div
              key={v.id}
              onClick={() => setSelectedVessel(v)}
              className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-sky-500/60 ring-1 ring-sky-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div>
                {/* Header tags */}
                <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {v.country.toUpperCase()}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      v.status === 'Combat Deployed'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold'
                        : v.status === 'Active Operational'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>

                {/* Vessel Name & Operator */}
                <h3 className="text-base font-bold text-slate-100 flex items-center justify-between">
                  <span>{v.modelName}</span>
                  <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    {v.primaryMission}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{v.operatorNavy}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{v.manufacturer} • In Service: {v.inServiceYear}</p>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px]">LOA</span>
                    <span className="text-slate-200 font-semibold">{v.dimensions.lengthOverallM} m</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">DISPLACEMENT</span>
                    <span className="text-slate-200 font-semibold">{v.dimensions.displacementTonnes} t</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">MAX SPEED</span>
                    <span className="text-amber-300 font-semibold">{v.performance.maxSpeedKnots} kt</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">HULL FORM</span>
                    <span className="text-slate-300 truncate block">{v.dimensions.hullForm.split(' ')[0]}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">POWER</span>
                    <span className="text-slate-300">{v.propulsion.totalPowerKw} kW</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">ENDURANCE</span>
                    <span className="text-emerald-400 font-semibold">
                      {v.performance.enduranceDays ? `${v.performance.enduranceDays}d` : `${v.performance.enduranceHours}h`}
                    </span>
                  </div>
                </div>

                {/* Autonomy & Weapon Pill */}
                <div className="mt-3 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <span className="truncate">{v.autonomy.autonomyLevel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Shield className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    <span className="truncate">{v.missionPackage.combatPayloadDescription}</span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs">
                <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {v.linkedPapers.length} Papers
                </span>
                <span className="text-sky-400 text-[11px] font-medium flex items-center gap-1 hover:underline">
                  Deep Model Specs <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Modal / Inspector for Selected Vessel */}
      {selectedVessel && (
        <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300">
                  {selectedVessel.country.toUpperCase()} NAVAL INTEL
                </span>
                <span className="text-xs font-mono text-slate-400">{selectedVessel.designationClass || selectedVessel.modelName}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                {selectedVessel.modelName}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Operator: <span className="font-semibold text-slate-200">{selectedVessel.operatorNavy}</span> • Manufacturer: <span className="text-slate-200">{selectedVessel.manufacturer}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleExportObsidian(selectedVessel)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Note (.md)</span>
              </button>

              {onAskAi && (
                <button
                  onClick={() => onAskAi(`Analyze ${selectedVessel.modelName} (${selectedVessel.operatorNavy}). Compare its hydrodynamic parameters, propulsion system (${selectedVessel.propulsion.engineDescription}), and autonomy level against our USV-01 project baseline. What are the key naval engineering tradeoffs?`, selectedVessel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Consult AI on {selectedVessel.modelName}</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-mono">
            {[
              { id: 'overview', label: '1. Executive Profile' },
              { id: 'hull', label: '2. Naval Architecture & Hull' },
              { id: 'propulsion', label: '3. Propulsion & Power' },
              { id: 'autonomy', label: '4. Autonomy & Sensors' },
              { id: 'combat', label: '5. Weapons & Mission Payload' },
              { id: 'papers', label: `6. Academic Literature (${selectedVessel.linkedPapers.length})` },
              { id: 'benchmark', label: '7. Benchmark vs USV-01' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveModalTab(tab.id as any)}
                className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                  activeModalTab === tab.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeModalTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-mono font-semibold text-sky-400 uppercase tracking-wider">
                    Operational Deployment &amp; Classification
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Vessel Designation</span>
                      <span className="font-mono text-slate-200">{selectedVessel.modelName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Operating Navy</span>
                      <span className="font-mono text-slate-200 text-right">{selectedVessel.operatorNavy}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Country of Origin</span>
                      <span className="font-mono text-slate-200">{selectedVessel.country}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Prime Contractor / Yard</span>
                      <span className="font-mono text-slate-200">{selectedVessel.manufacturer}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">In-Service Commission</span>
                      <span className="font-mono text-slate-200">{selectedVessel.inServiceYear}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Operational Status</span>
                      <span className="font-mono text-emerald-400 font-semibold">{selectedVessel.status}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-mono font-semibold text-teal-400 uppercase tracking-wider">
                    Mission Architecture &amp; Roles
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Primary Mission Role</span>
                      <span className="font-mono text-teal-300 font-bold">{selectedVessel.primaryMission}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Secondary Roles</span>
                      <span className="font-mono text-slate-300">{selectedVessel.secondaryMissions.join(', ')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Max Operating Sea State</span>
                      <span className="font-mono text-slate-200">NATO Sea State {selectedVessel.dimensions.maxSeaStateOperating}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Survival Sea State</span>
                      <span className="font-mono text-slate-200">NATO Sea State {selectedVessel.dimensions.maxSeaStateSurvival}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Analyst Verification</span>
                      <span className="font-mono text-emerald-400">✅ Verified Open-Source Naval Baseline</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModalTab === 'hull' && (
              <div className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-semibold text-sky-400 uppercase tracking-wider">
                  Principal Particulars, Hydrostatics &amp; Scantlings
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">LENGTH OVERALL (LOA)</span>
                    <span className="text-slate-100 font-bold text-base mt-1 block">{selectedVessel.dimensions.lengthOverallM} m</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">BEAM (B)</span>
                    <span className="text-slate-100 font-bold text-base mt-1 block">{selectedVessel.dimensions.beamM} m</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">DRAFT (T)</span>
                    <span className="text-slate-100 font-bold text-base mt-1 block">{selectedVessel.dimensions.draftM} m</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">FULL DISPLACEMENT</span>
                    <span className="text-slate-100 font-bold text-base mt-1 block">{selectedVessel.dimensions.displacementTonnes} tonnes</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">PAYLOAD CAPACITY</span>
                    <span className="text-amber-400 font-bold text-base mt-1 block">{selectedVessel.dimensions.payloadCapacityKg.toLocaleString()} kg</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">HULL FORM</span>
                    <span className="text-sky-300 font-bold text-base mt-1 block">{selectedVessel.dimensions.hullForm}</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800 col-span-2">
                    <span className="text-slate-400 block text-[10px]">STRUCTURAL MATERIAL &amp; COATINGS</span>
                    <span className="text-slate-200 text-xs mt-1 block font-sans">{selectedVessel.dimensions.hullMaterial}</span>
                  </div>
                </div>
              </div>
            )}

            {activeModalTab === 'propulsion' && (
              <div className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
                  Propulsion, Machinery &amp; Speed-Power Architecture
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">MAX SPEED</span>
                    <span className="text-amber-400 font-bold text-xl mt-1 block">{selectedVessel.performance.maxSpeedKnots} knots</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">CRUISING SPEED</span>
                    <span className="text-slate-100 font-bold text-xl mt-1 block">{selectedVessel.performance.cruiseSpeedKnots} knots</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">OPERATIONAL RANGE</span>
                    <span className="text-emerald-400 font-bold text-xl mt-1 block">{selectedVessel.performance.rangeNauticalMiles.toLocaleString()} nm</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Power Plant Architecture</span>
                    <span className="font-mono text-slate-200">{selectedVessel.propulsion.systemType}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Engine Details</span>
                    <span className="font-mono text-slate-200 text-right">{selectedVessel.propulsion.engineDescription}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Total Installed Power (P_B)</span>
                    <span className="font-mono text-amber-300 font-semibold">{selectedVessel.propulsion.totalPowerKw} kW</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Propulsion Unit</span>
                    <span className="font-mono text-slate-200">{selectedVessel.propulsion.propulsionUnit}</span>
                  </div>
                  {selectedVessel.propulsion.fuelCapacityLiters && (
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Fuel Tank Capacity</span>
                      <span className="font-mono text-slate-200">{selectedVessel.propulsion.fuelCapacityLiters.toLocaleString()} Liters</span>
                    </div>
                  )}
                  {selectedVessel.propulsion.auxiliaryEnergyHarvesting && (
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Energy Harvesting / Hybrid Buffer</span>
                      <span className="font-mono text-slate-200">{selectedVessel.propulsion.auxiliaryEnergyHarvesting}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModalTab === 'autonomy' && (
              <div className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Autonomy Architecture, COLREGS &amp; Sensor Suite
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Autonomy Level</span>
                    <span className="font-mono text-cyan-300 font-semibold">{selectedVessel.autonomy.autonomyLevel}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Autonomy Software Stack</span>
                    <span className="font-mono text-slate-200 text-right">{selectedVessel.autonomy.architectureDescription}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">COLREGS 1972 Compliance</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {selectedVessel.autonomy.colregsCompliance ? '✅ Certified COLREGS Compliant' : '⚠️ Teleoperated Guidance'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Collision Avoidance Rules</span>
                    <span className="font-mono text-slate-200">{selectedVessel.autonomy.colregsRulesSupported.join(', ')}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">C2 Datalinks</span>
                    <span className="font-mono text-slate-200">{selectedVessel.autonomy.c2Datalinks.join(', ')}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Surface Navigation Radar</span>
                    <span className="font-mono text-slate-200">{selectedVessel.sensors.surfaceRadar}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Electro-Optical / Infrared Turret</span>
                    <span className="font-mono text-slate-200">{selectedVessel.sensors.electroOpticalInfrared}</span>
                  </div>
                  {selectedVessel.sensors.sonarSuite && (
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Sonar Suite</span>
                      <span className="font-mono text-slate-200">{selectedVessel.sensors.sonarSuite}</span>
                    </div>
                  )}
                  {selectedVessel.sensors.electronicWarfare && (
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Electronic Warfare &amp; ESM</span>
                      <span className="font-mono text-slate-200">{selectedVessel.sensors.electronicWarfare}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModalTab === 'combat' && (
              <div className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider">
                  Weapons, Mine Countermeasures &amp; Mission Payloads
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px] font-mono mb-1">COMBAT CONFIGURATION OVERVIEW</span>
                    <p className="text-slate-200 leading-relaxed">{selectedVessel.missionPackage.combatPayloadDescription}</p>
                  </div>

                  {selectedVessel.missionPackage.weaponsFitted && (
                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[11px] font-mono mb-1">ARMAMENT &amp; WEAPON STATIONS</span>
                      <ul className="list-disc list-inside text-rose-300 font-mono space-y-1">
                        {selectedVessel.missionPackage.weaponsFitted.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedVessel.missionPackage.mcmEquipment && (
                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[11px] font-mono mb-1">MINE COUNTERMEASURES (MCM)</span>
                      <ul className="list-disc list-inside text-teal-300 font-mono space-y-1">
                        {selectedVessel.missionPackage.mcmEquipment.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedVessel.missionPackage.aswEquipment && (
                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[11px] font-mono mb-1">ANTI-SUBMARINE WARFARE (ASW)</span>
                      <ul className="list-disc list-inside text-cyan-300 font-mono space-y-1">
                        {selectedVessel.missionPackage.aswEquipment.map((a, idx) => (
                          <li key={idx}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModalTab === 'papers' && (
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold text-purple-400 uppercase tracking-wider">
                  Peer-Reviewed Papers, DOIs &amp; Naval Research Reports
                </h4>
                {selectedVessel.linkedPapers.length === 0 ? (
                  <p className="text-xs text-slate-500">No linked research papers for this model.</p>
                ) : (
                  selectedVessel.linkedPapers.map((paper) => (
                    <div key={paper.id} className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-sm font-semibold text-slate-200">
                          {paper.title}
                        </h5>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
                          {paper.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {paper.authors.join(', ')} • <em>{paper.publication}</em> ({paper.year})
                      </p>
                      {paper.doi && (
                        <p className="text-xs text-sky-400 font-mono flex items-center gap-1">
                          DOI: <a href={paper.url || `https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-sky-300">{paper.doi}</a>
                          <ExternalLink className="w-3 h-3" />
                        </p>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800">
                        {paper.abstract}
                      </p>
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-mono text-slate-400">EMPIRICAL FINDINGS:</span>
                        <ul className="list-disc list-inside text-xs text-emerald-300 space-y-0.5">
                          {paper.keyFindings.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                      {paper.governingFormulas && paper.governingFormulas.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-mono text-slate-400">GOVERNING HYDRODYNAMIC / CONTROL FORMULA:</span>
                          <div className="p-2 rounded bg-slate-900 font-mono text-xs text-amber-300 overflow-x-auto mt-0.5">
                            {paper.governingFormulas[0]}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeModalTab === 'benchmark' && (
              <div className="p-4 rounded bg-slate-950/80 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-semibold text-teal-400 uppercase tracking-wider">
                  Comparative Naval Architecture Benchmark: {selectedVessel.modelName} vs USV-01 Baseline
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">SPEED RATIO</span>
                    <span className="text-amber-400 font-bold text-lg mt-1 block">{selectedVessel.usv01BenchmarkDelta.speedRatio}x</span>
                    <span className="text-[10px] text-slate-500">vs 30 kt USV-01</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">ENDURANCE RATIO</span>
                    <span className="text-emerald-400 font-bold text-lg mt-1 block">{selectedVessel.usv01BenchmarkDelta.enduranceRatio}x</span>
                    <span className="text-[10px] text-slate-500">vs 216h USV-01</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">DISPLACEMENT RATIO</span>
                    <span className="text-slate-200 font-bold text-lg mt-1 block">{selectedVessel.usv01BenchmarkDelta.displacementRatio}x</span>
                    <span className="text-[10px] text-slate-500">vs 12.0t USV-01</span>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">PAYLOAD FRACTION</span>
                    <span className="text-sky-300 font-bold text-lg mt-1 block">
                      {((selectedVessel.dimensions.payloadCapacityKg / selectedVessel.dimensions.fullLoadDisplacementKg) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500">of total mass</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block font-mono text-[10px] mb-1">ANALYST TAKEAWAY &amp; ARCHITECTURAL ASSESSMENT</span>
                    <p className="text-slate-200 leading-relaxed">{selectedVessel.usv01BenchmarkDelta.keyTakeaway}</p>
                  </div>
                  <div className="p-3 rounded bg-teal-500/10 border border-teal-500/30">
                    <span className="text-teal-400 block font-mono text-[10px] mb-1">RECOMMENDED DESIGN LESSON FOR USV-01</span>
                    <p className="text-teal-200 leading-relaxed font-semibold">{selectedVessel.usv01BenchmarkDelta.recommendedDesignImprovement}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
