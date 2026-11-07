import React, { useState } from 'react';
import { Flight } from '../types/flight.ts';
import { TimezoneCode, convertUtcTimeString } from '../utils/time.ts';
import { X, Plane, ArrowRight, Gauge, Compass, Activity, ShieldAlert, Sparkles, Navigation, ChevronDown, ChevronUp } from 'lucide-react';

interface FlightTelemetryPanelProps {
  flight: Flight;
  onClose: () => void;
  onAskAiAboutFlight: (flightNumber: string) => void;
  isCameraLocked?: boolean;
  onToggleCameraLock?: () => void;
  timezone?: TimezoneCode;
}

export const FlightTelemetryPanel: React.FC<FlightTelemetryPanelProps> = ({
  flight,
  onClose,
  onAskAiAboutFlight,
  isCameraLocked = false,
  onToggleCameraLock,
  timezone = 'UTC',
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const isDelayed = flight.status === 'delayed';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute left-4 z-[1000] bg-[#0B0F17]/95 border border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-200 ${
        isMinimized
          ? 'bottom-6 w-80 h-13'
          : 'bottom-6 top-16 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)]'
      }`}
    >
      {/* Header with Airline & Flight Code */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-white tracking-wider">
              {flight.flightNumber}
            </span>
            <span className="text-xs font-mono text-cyan-400/80 uppercase">
              {flight.callsign}
            </span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                isDelayed
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {isDelayed ? `Delayed +${flight.delayMinutes}m` : 'On Time'}
            </span>
          </div>
          {!isMinimized && (
            <div className="text-[11px] text-slate-300 font-medium truncate max-w-[240px]">
              {flight.airline} · {flight.aircraftType}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Telemetry' : 'Minimize Telemetry'}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition-colors"
            title="Close Telemetry HUD"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Scrollable Telemetry Details */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs text-slate-300">
            {/* Route Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-left">
                  <div className="font-mono text-lg font-bold text-cyan-300">{flight.origin.code}</div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[110px]">{flight.origin.city}</div>
                  <div className="font-mono text-[10px] text-slate-400 mt-1">
                    Dep: <span className="text-slate-200 font-semibold">{convertUtcTimeString(flight.departureActual, timezone)}</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center px-3">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{flight.progressPercent}%</span>
                    <span>En Route</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                    <div
                      className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${flight.progressPercent}%` }}
                    ></div>
                  </div>
                  <Plane className="w-3.5 h-3.5 text-cyan-400 transform rotate-90 mt-1" />
                </div>

                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-emerald-300">{flight.destination.code}</div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[110px]">{flight.destination.city}</div>
                  <div className="font-mono text-[10px] text-slate-400 mt-1">
                    ETA: <span className="text-emerald-300 font-semibold">{convertUtcTimeString(flight.arrivalEstimated, timezone)}</span>
                  </div>
                </div>
              </div>

              {isDelayed && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-amber-300 text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Delay Advisory: Slot adjustment (+{flight.delayMinutes} min)</span>
                </div>
              )}
            </div>

            {/* Live Flight Dynamics Gauges */}
            <div className="grid grid-cols-2 gap-2">
              {/* Altitude */}
              <div className="bg-slate-900/50 border border-slate-800/90 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Altitude</span>
                </div>
                <div className="font-mono text-base font-bold text-slate-100">
                  {flight.altitude.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ft</span>
                </div>
                <div className="font-mono text-[10px] text-cyan-400/80">
                  FL{Math.round(flight.altitude / 100)} · {flight.verticalRate === 0 ? 'Level Flight' : flight.verticalRate > 0 ? `+${flight.verticalRate} fpm` : `${flight.verticalRate} fpm`}
                </div>
              </div>

              {/* Speed */}
              <div className="bg-slate-900/50 border border-slate-800/90 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ground Speed</span>
                </div>
                <div className="font-mono text-base font-bold text-slate-100">
                  {flight.velocity} <span className="text-xs text-slate-400 font-normal">kts</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  ~{Math.round(flight.velocity * 1.15)} mph / {Math.round(flight.velocity * 1.852)} km/h
                </div>
              </div>

              {/* Heading */}
              <div className="bg-slate-900/50 border border-slate-800/90 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>True Track</span>
                </div>
                <div className="font-mono text-base font-bold text-slate-100">
                  {flight.heading}°
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Mag Reference
                </div>
              </div>

              {/* Transponder / Squawk */}
              <div className="bg-slate-900/50 border border-slate-800/90 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Squawk Code</span>
                </div>
                <div className="font-mono text-base font-bold text-cyan-300">
                  {flight.squawk}
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Mode-S / ADS-B Out
                </div>
              </div>
            </div>

            {/* Airframe & Registration Specs */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Aircraft Tail:</span>
                <span className="text-slate-200 font-semibold">{flight.registration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wake Category:</span>
                <span className="text-slate-200">{flight.aircraftCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Live GPS:</span>
                <span className="text-slate-300">
                  {flight.latitude.toFixed(4)}°, {flight.longitude.toFixed(4)}°
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action: Ask AI Copilot */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 shrink-0">
            <button
              onClick={() => onAskAiAboutFlight(flight.flightNumber)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/50 text-cyan-300 font-medium text-xs transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ask AI Copilot About {flight.flightNumber}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-cyan-400" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
