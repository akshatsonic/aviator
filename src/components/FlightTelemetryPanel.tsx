import React, { useState } from 'react';
import { Flight } from '../types/flight.ts';
import { TimezoneCode, convertUtcTimeString, formatTimeInZone } from '../utils/time.ts';
import { X, Plane, ArrowRight, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface FlightTelemetryPanelProps {
  flight: Flight;
  onClose: () => void;
  onAskAiAboutFlight: (flightNumber: string) => void;
  isResolvingRoute?: boolean;
  isCameraLocked?: boolean;
  onToggleCameraLock?: () => void;
  timezone?: TimezoneCode;
}

const Metric = ({ label, value, detail }: { label: string; value: string; detail?: string }) => (
  <div className="py-3">
    <div className="text-[12px] text-[#737373]">{label}</div>
    <div className="mt-1 font-mono text-[15px] font-medium text-[#efefef]">{value}</div>
    {detail && <div className="mt-0.5 text-[11px] text-[#737373]">{detail}</div>}
  </div>
);

export const FlightTelemetryPanel: React.FC<FlightTelemetryPanelProps> = ({ flight, onClose, onAskAiAboutFlight, isResolvingRoute = false, timezone = 'UTC' }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const isDelayed = flight.status === 'delayed';
  const scheduleKnown = flight.scheduleKnown !== false;
  const routeKnown = flight.routeKnown !== false;
  const status = isDelayed ? `Delayed ${flight.delayMinutes}m` : flight.status === 'unknown' ? 'Telemetry only' : 'On time';

  return (
    <aside onClick={(event) => event.stopPropagation()} className={`inspector-panel absolute right-4 z-[1000] flex flex-col overflow-hidden transition-all duration-200 ${isMinimized ? 'bottom-4 h-14 w-80' : 'bottom-4 top-4 w-[360px] max-w-[calc(100vw-2rem)]'}`}>
      <header className="flex shrink-0 items-center justify-between border-b border-white/8 p-4">
        <button onClick={() => setIsMinimized(!isMinimized)} className="min-w-0 text-left">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-base font-medium text-white">{flight.flightNumber}</span>
            <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${isDelayed ? 'bg-amber-400/10 text-amber-300' : flight.status === 'unknown' ? 'bg-white/6 text-[#a3a3a3]' : 'bg-emerald-400/10 text-emerald-300'}`}>{status}</span>
          </div>
          {!isMinimized && <p className="mt-1 truncate text-[12px] text-[#8c8c8c]">{flight.airline} · {flight.aircraftType}</p>}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="icon-button size-8" aria-label={isMinimized ? 'Expand aircraft details' : 'Minimize aircraft details'}>{isMinimized ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}</button>
          <button onClick={onClose} className="icon-button size-8" aria-label="Close aircraft details"><X className="size-3.5" /></button>
        </div>
      </header>

      {!isMinimized && <>
        <div className="flex-1 overflow-y-auto p-4">
          <section className="border-b border-white/8 pb-4">
            <div className="mb-3 text-[11px] font-medium text-[#8c8c8c]">
              {routeKnown ? (flight.routeSource === 'callsign_estimate' ? 'Callsign-derived route estimate' : 'Flight route') : isResolvingRoute ? 'Looking up callsign route…' : 'Route unavailable from available providers'}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xl font-medium text-white">{routeKnown ? flight.origin.code : '—'}</div>
                <div className="mt-0.5 max-w-28 truncate text-[12px] text-[#737373]">{routeKnown ? flight.origin.city : 'Unknown origin'}</div>
              </div>
              <div className="mx-4 flex-1">
                <div className="mb-2 flex items-center gap-2 text-[11px] text-[#737373]"><Plane className="size-3.5 rotate-90 text-[#b11226]" /><span>{routeKnown ? `${flight.progressPercent}% of direct path` : 'Live position'}</span></div>
                <div className="h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#b11226]" style={{ width: `${routeKnown ? flight.progressPercent : 0}%` }} /></div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-medium text-white">{routeKnown ? flight.destination.code : '—'}</div>
                <div className="mt-0.5 max-w-28 truncate text-[12px] text-[#737373]">{routeKnown ? flight.destination.city : 'Unknown destination'}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
              <div><div className="text-[#737373]">Departure time</div><div className="mt-1 font-mono text-[#b8b8b8]">{scheduleKnown ? convertUtcTimeString(flight.departureActual, timezone) : 'Not provided'}</div></div>
              <div className="text-right"><div className="text-[#737373]">{flight.etaType === 'direct_estimate' ? 'Direct ETA estimate' : 'ETA'}</div><div className="mt-1 font-mono text-[#b8b8b8]">{flight.arrivalEstimated ? convertUtcTimeString(flight.arrivalEstimated, timezone) : 'Not provided'}</div></div>
            </div>
          </section>

          <section className="grid grid-cols-2 divide-x divide-y divide-white/8 border-b border-white/8">
            <Metric label="Altitude" value={flight.altitudeAvailable === false ? 'Unavailable' : `${flight.altitude.toLocaleString()} ft`} detail={flight.altitudeAvailable === false ? undefined : `FL${Math.round(flight.altitude / 100)} · ${flight.verticalRate === 0 ? 'Level' : `${flight.verticalRate > 0 ? '+' : ''}${flight.verticalRate} fpm`}`} />
            <div className="pl-4"><Metric label="Ground speed" value={flight.velocityAvailable === false ? 'Unavailable' : `${flight.velocity} kts`} detail={flight.velocityAvailable === false ? undefined : `${Math.round(flight.velocity * 1.852)} km/h`} /></div>
            <Metric label="True track" value={flight.trackAvailable === false ? 'Unavailable' : `${flight.heading}°`} />
            <div className="pl-4"><Metric label="Squawk" value={flight.squawk || 'Unavailable'} /></div>
          </section>

          <dl className="space-y-3 pt-4 text-[12px]">
            <div className="flex justify-between gap-4"><dt className="text-[#737373]">Callsign</dt><dd className="font-mono text-[#b8b8b8]">{flight.callsign}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#737373]">{flight.dataSource === 'opensky' ? 'ICAO24' : 'Registration'}</dt><dd className="font-mono text-[#b8b8b8]">{flight.dataSource === 'opensky' ? flight.icao24?.toUpperCase() : flight.registration}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#737373]">Position</dt><dd className="font-mono text-right text-[#b8b8b8]">{flight.latitude.toFixed(4)}°, {flight.longitude.toFixed(4)}°</dd></div>
            {flight.lastContact && <div className="flex justify-between gap-4"><dt className="text-[#737373]">Last OpenSky contact</dt><dd className="font-mono text-right text-[#b8b8b8]">{formatTimeInZone(new Date(flight.lastContact * 1000), timezone)}</dd></div>}
            {flight.dataSource === 'opensky' && <div className="flex justify-between gap-4"><dt className="text-[#737373]">Source</dt><dd className="text-[#b8b8b8]">{flight.positionSource}</dd></div>}
          </dl>
        </div>

        <footer className="shrink-0 border-t border-white/8 p-3">
          <button onClick={() => onAskAiAboutFlight(flight.flightNumber)} className="primary-button w-full justify-center"><Sparkles className="size-4" /><span>Ask about this flight</span><ArrowRight className="ml-auto size-4" /></button>
        </footer>
      </>}
    </aside>
  );
};
