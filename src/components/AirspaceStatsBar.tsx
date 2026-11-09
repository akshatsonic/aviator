import React, { useEffect, useState } from 'react';
import { AirspaceSummary } from '../types/flight.ts';
import { TimezoneCode, TIMEZONE_OPTIONS, formatTimeInZone } from '../utils/time.ts';
import { Check, ChevronDown, Clock } from 'lucide-react';

interface AirspaceStatsBarProps {
  summary: AirspaceSummary | null;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  filteredCount: number;
  timezone: TimezoneCode;
  onTimezoneChange: (tz: TimezoneCode) => void;
  isLiveFeed?: boolean;
  creditsRemaining?: number;
  feedError?: string | null;
  liveProvider?: 'opensky' | 'adsb.lol';
  onOpenOpenSkyModal?: () => void;
}

export const AirspaceStatsBar: React.FC<AirspaceStatsBarProps> = ({ summary, activeFilter, onFilterChange, filteredCount, timezone, onTimezoneChange, isLiveFeed = false, creditsRemaining = 4000, feedError = null, liveProvider = 'opensky', onOpenOpenSkyModal }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [showTzMenu, setShowTzMenu] = useState(false);

  useEffect(() => {
    const update = () => setCurrentTime(formatTimeInZone(new Date(), timezone));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'delayed', label: 'Delayed' },
    { id: 'transatlantic', label: 'Atlantic' },
    { id: 'pacific', label: 'Asia–Pacific' },
  ];

  return (
    <div className="relative z-50 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-[#101010] px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-4">
        <button onClick={onOpenOpenSkyModal} className="flex shrink-0 items-center gap-2 text-[12px] font-medium text-[#b8b8b8] hover:text-white" title="OpenSky connection settings">
          <span className={`size-1.5 rounded-full ${isLiveFeed && !feedError ? 'bg-emerald-400' : 'bg-[#b11226]'}`} />
          <span>{isLiveFeed ? (feedError ? 'Live feed unavailable' : liveProvider === 'adsb.lol' ? 'ADSB.lol live' : 'OpenSky live') : 'Simulation'}</span>
          {isLiveFeed && !feedError && liveProvider === 'opensky' && <span className="hidden font-mono text-[11px] text-[#737373] md:inline">{creditsRemaining} credits</span>}
        </button>
        <span className="hidden h-4 w-px bg-white/8 sm:block" />
        <div className="hidden items-baseline gap-1.5 sm:flex">
          <span className="font-mono text-[13px] text-[#efefef]">{filteredCount}</span><span className="text-[12px] text-[#737373]">visible</span>
          {summary && <span className="ml-2 font-mono text-[11px] text-[#737373]">{summary.totalAirborne} airborne</span>}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <div className="filter-tabs flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-lg bg-[#181818] p-0.5">
          {filters.map((filter) => (
            <button key={filter.id} onClick={() => onFilterChange(filter.id)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${activeFilter === filter.id ? 'bg-[#2a2a2a] text-white' : 'text-[#737373] hover:text-[#b8b8b8]'}`}>{filter.label}</button>
          ))}
        </div>

        <div className="relative">
          <button onClick={() => setShowTzMenu(!showTzMenu)} className="quiet-button h-8" aria-label="Change timezone"><Clock className="size-3.5" /><span className="hidden font-mono text-[11px] sm:inline">{currentTime}</span><ChevronDown className={`size-3 transition-transform ${showTzMenu ? 'rotate-180' : ''}`} /></button>
          {showTzMenu && (
            <><button className="fixed inset-0 z-40 cursor-default" onClick={() => setShowTzMenu(false)} aria-label="Close timezone menu" /><div className="menu-panel absolute right-0 top-full z-50 mt-2 w-56 p-1.5">
              <div className="px-2 py-2 text-[11px] font-medium text-[#737373]">Display timezone</div>
              {TIMEZONE_OPTIONS.map((option) => (
                <button key={option.code} onClick={() => { onTimezoneChange(option.code); setShowTzMenu(false); }} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[12px] ${option.code === timezone ? 'bg-white/6 text-white' : 'text-[#b8b8b8] hover:bg-white/4'}`}>
                  <span><span className="font-mono">{option.label}</span><span className="ml-2 text-[#737373]">{option.sublabel}</span></span>{option.code === timezone && <Check className="size-3.5 text-[#b11226]" />}
                </button>
              ))}
            </div></>
          )}
        </div>
      </div>
    </div>
  );
};
