import React from 'react';
import { Plane, Search, Sparkles, Table2, Layers, RotateCcw } from 'lucide-react';

interface TopRadarBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isAiDrawerOpen: boolean;
  onToggleAiDrawer: () => void;
  isRosterOpen: boolean;
  onToggleRoster: () => void;
  onResetView: () => void;
  selectedAirline: string;
  onSelectAirline: (airline: string) => void;
  availableAirlines: string[];
}

export const TopRadarBar: React.FC<TopRadarBarProps> = ({
  searchQuery,
  onSearchChange,
  isAiDrawerOpen,
  onToggleAiDrawer,
  isRosterOpen,
  onToggleRoster,
  onResetView,
  selectedAirline,
  onSelectAirline,
  availableAirlines,
}) => {
  return (
    <header className="relative z-40 flex items-center justify-between gap-6 px-6 py-3 bg-[#0B0F17] border-b border-slate-800/80 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
          <Plane className="w-4 h-4 transform -rotate-45" />
        </div>
        <a href="/" className="text-base font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap shrink-0">
          SkyPulse <span className="text-cyan-400 font-normal">Radar</span>
        </a>
      </div>

      {/* Zone 2: Navigation Links & Airline Filter */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={onResetView}
          className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Global Airspace</span>
        </button>

        <button
          onClick={onToggleRoster}
          className={`hover:text-cyan-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isRosterOpen ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          <Table2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Flight Directory</span>
        </button>

        {/* Airline Selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedAirline}
            onChange={(e) => onSelectAirline(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60"
          >
            <option value="all">All Airlines</option>
            {availableAirlines.map((airline) => (
              <option key={airline} value={airline}>
                {airline}
              </option>
            ))}
          </select>
        </div>
      </nav>

      {/* Zone 3: Search & Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Search */}
        <div className="relative w-44 sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Flight #, airline, airport..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Primary Action Button: Toggle AI Copilot */}
        <button
          onClick={onToggleAiDrawer}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm whitespace-nowrap shrink-0 ${
            isAiDrawerOpen
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-[0_0_15px_rgba(56,189,248,0.35)]'
              : 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Copilot</span>
        </button>
      </div>
    </header>
  );
};
