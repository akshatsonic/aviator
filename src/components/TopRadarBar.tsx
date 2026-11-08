import React from 'react';
import { Plane, Search, Sparkles, List, RotateCcw, X } from 'lucide-react';

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
}) => (
  <header className="app-header relative z-40 flex h-16 shrink-0 items-center gap-3 border-b border-white/8 bg-[#0a0a0a] px-4 sm:px-5">
    <button onClick={onResetView} className="brand-mark flex shrink-0 items-center gap-2.5 text-left" title="Reset map and filters">
      <span className="flex size-8 items-center justify-center rounded-lg bg-[#b11226] text-white">
        <Plane className="size-4 -rotate-45" strokeWidth={2} />
      </span>
      <span className="hidden sm:block">
        <span className="block text-sm font-semibold tracking-[-0.02em] text-[#efefef]">SkyPulse</span>
        <span className="block text-[11px] text-[#8c8c8c]">Live airspace</span>
      </span>
    </button>

    <div className="relative mx-auto w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
      <input
        type="search"
        aria-label="Search flights"
        placeholder="Search callsign, airline, airport…"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-white/8 bg-[#151515] pl-10 pr-10 text-[13px] text-[#efefef] outline-none placeholder:text-[#737373] focus:border-[#b11226]"
      />
      {searchQuery && (
        <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#8c8c8c] hover:bg-white/6 hover:text-white" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      )}
    </div>

    <select value={selectedAirline} onChange={(event) => onSelectAirline(event.target.value)} aria-label="Filter by airline" className="hidden h-10 max-w-44 rounded-xl border border-white/8 bg-[#151515] px-3 text-[13px] text-[#b8b8b8] outline-none focus:border-[#b11226] lg:block">
      <option value="all">All airlines</option>
      {availableAirlines.map((airline) => <option key={airline} value={airline}>{airline}</option>)}
    </select>

    <div className="flex shrink-0 items-center gap-1.5">
      <button onClick={onResetView} className="icon-button hidden sm:flex" title="Reset view" aria-label="Reset view"><RotateCcw className="size-4" /></button>
      <button onClick={onToggleRoster} className={`icon-button ${isRosterOpen ? 'is-active' : ''}`} title="Flight directory" aria-label="Open flight directory"><List className="size-4" /></button>
      <button onClick={onToggleAiDrawer} className={`primary-button h-10 ${isAiDrawerOpen ? 'is-active' : ''}`}><Sparkles className="size-4" /><span className="hidden sm:inline">Ask AI</span></button>
    </div>
  </header>
);
