import React, { useState, useEffect } from 'react';
import { AirspaceSummary } from '../types/flight.ts';
import { TimezoneCode, TIMEZONE_OPTIONS, formatTimeInZone } from '../utils/time.ts';
import { Radio, Clock, Gauge, Compass, AlertTriangle, CheckCircle2, ChevronDown, Check } from 'lucide-react';

interface AirspaceStatsBarProps {
  summary: AirspaceSummary | null;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  filteredCount: number;
  timezone: TimezoneCode;
  onTimezoneChange: (tz: TimezoneCode) => void;
  isLiveFeed?: boolean;
  creditsRemaining?: number;
  onOpenOpenSkyModal?: () => void;
}

export const AirspaceStatsBar: React.FC<AirspaceStatsBarProps> = ({
  summary,
  activeFilter,
  onFilterChange,
  filteredCount,
  timezone,
  onTimezoneChange,
  isLiveFeed = false,
  creditsRemaining = 4000,
  onOpenOpenSkyModal,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showTzMenu, setShowTzMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(formatTimeInZone(now, timezone));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const totalAirborne = summary?.totalAirborne ?? 0;
  const delayedCount = summary?.delayedCount ?? 0;
  const onTimeCount = summary?.onTimeCount ?? 0;
  const onTimePercent = totalAirborne > 0 ? Math.round((onTimeCount / totalAirborne) * 100) : 100;

  return (
    <div className="relative z-50 bg-[#0B0F17]/95 border-b border-cyan-500/20 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md">
      {/* Left: Tactical Airspace Stats */}
      <div className="flex items-center gap-5 overflow-x-auto text-slate-300">
        <button
          onClick={onOpenOpenSkyModal}
          className={`flex items-center gap-2 px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
            isLiveFeed
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40'
          }`}
          title="OpenSky Network Live Credentials & Daily Rate Limits"
        >
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLiveFeed ? 'bg-emerald-400' : 'bg-cyan-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isLiveFeed ? 'bg-emerald-400' : 'bg-cyan-400'}`}></span>
          </div>
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            {isLiveFeed ? 'Live OpenSky ADS-B' : 'Tactical Radar'}
          </span>
          {isLiveFeed && (
            <span className="font-mono text-[9px] text-emerald-400/90 tabular-nums">
              · {creditsRemaining} credits
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Total Fleet:</span>
          <span className="font-mono text-cyan-300 font-semibold">{summary?.totalTracked ?? 10615}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">Airborne:</span>
          <span className="font-mono text-emerald-400 font-semibold">{totalAirborne}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">On Time:</span>
          <span className="font-mono text-emerald-400 font-semibold">{onTimeCount} ({onTimePercent}%)</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Delayed:</span>
          <span className="font-mono text-amber-400 font-semibold">{delayedCount}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Avg Speed:</span>
          <span className="font-mono text-slate-200 font-semibold">{summary?.avgVelocity ?? 502} kts</span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
          <Compass className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Cruising Alt:</span>
          <span className="font-mono text-slate-200 font-semibold">FL{Math.round((summary?.avgAltitude ?? 36500) / 100)}</span>
        </div>
      </div>

      {/* Right: Quick Scope Filters & ZULU Clock */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
          {[
            { id: 'all', label: 'All Flights' },
            { id: 'delayed', label: 'Delayed' },
            { id: 'transatlantic', label: 'Transatlantic' },
            { id: 'pacific', label: 'Asia-Pac' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeFilter === f.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowTzMenu(!showTzMenu)}
            title="Change Application Timezone"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 rounded border border-slate-800 hover:border-cyan-500/50 font-mono text-slate-300 text-[11px] transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="tabular-nums font-semibold text-cyan-300">{currentTime}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showTzMenu ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>

          {showTzMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowTzMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-[#0B0F17]/98 border border-cyan-500/40 rounded-lg shadow-2xl backdrop-blur-xl p-1.5 font-sans animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between mb-1">
                  <span>Select Timezone</span>
                  <span className="text-cyan-400 font-semibold">{timezone}</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {TIMEZONE_OPTIONS.map((opt) => {
                    const isSelected = opt.code === timezone;
                    return (
                      <button
                        key={opt.code}
                        onClick={() => {
                          onTimezoneChange(opt.code);
                          setShowTzMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px]">{opt.label}</span>
                          <span className="text-[10px] text-slate-400">{opt.sublabel}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
