import React, { useState, useMemo } from 'react';
import { Flight } from '../types/flight.ts';
import { X, Search, Plane, ArrowUpDown, Crosshair } from 'lucide-react';

interface FlightRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  onSelectFlight: (id: string) => void;
  selectedFlightId: string | null;
}

type SortField = 'flightNumber' | 'airline' | 'route' | 'altitude' | 'velocity' | 'delayMinutes';

export const FlightRosterModal: React.FC<FlightRosterModalProps> = ({
  isOpen,
  onClose,
  flights,
  onSelectFlight,
  selectedFlightId,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delayed' | 'on_time'>('all');
  const [sortField, setSortField] = useState<SortField>('flightNumber');
  const [sortAsc, setSortAsc] = useState(true);

  const filteredFlights = useMemo(() => {
    return flights
      .filter((f) => {
        if (statusFilter === 'delayed' && f.status !== 'delayed') return false;
        if (statusFilter === 'on_time' && f.status !== 'on_time') return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          f.flightNumber.toLowerCase().includes(q) ||
          f.callsign.toLowerCase().includes(q) ||
          f.airline.toLowerCase().includes(q) ||
          f.origin.code.toLowerCase().includes(q) ||
          f.destination.code.toLowerCase().includes(q) ||
          f.origin.city.toLowerCase().includes(q) ||
          f.destination.city.toLowerCase().includes(q) ||
          f.aircraftType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortField === 'flightNumber') {
          valA = a.flightNumber;
          valB = b.flightNumber;
        } else if (sortField === 'airline') {
          valA = a.airline;
          valB = b.airline;
        } else if (sortField === 'route') {
          valA = `${a.origin.code}-${a.destination.code}`;
          valB = `${b.origin.code}-${b.destination.code}`;
        } else if (sortField === 'altitude') {
          valA = a.altitude;
          valB = b.altitude;
        } else if (sortField === 'velocity') {
          valA = a.velocity;
          valB = b.velocity;
        } else if (sortField === 'delayMinutes') {
          valA = a.delayMinutes;
          valB = b.delayMinutes;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [flights, search, statusFilter, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0B0F17] border border-cyan-500/30 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Global Airspace Flight Directory ({filteredFlights.length} tracked)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by flight #, airline, city, airport..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['all', 'on_time', 'delayed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === 'all' ? 'All' : s === 'on_time' ? 'On Time' : 'Delayed'}
              </button>
            ))}
          </div>
        </div>

        {/* Flight Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-slate-400 font-mono text-[11px] z-10 backdrop-blur-sm">
              <tr>
                <th
                  onClick={() => toggleSort('flightNumber')}
                  className="py-2.5 px-4 cursor-pointer hover:text-cyan-300"
                >
                  <div className="flex items-center gap-1">
                    <span>Flight</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('airline')}
                  className="py-2.5 px-4 cursor-pointer hover:text-cyan-300"
                >
                  <div className="flex items-center gap-1">
                    <span>Airline</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('route')}
                  className="py-2.5 px-4 cursor-pointer hover:text-cyan-300"
                >
                  <div className="flex items-center gap-1">
                    <span>Route</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('altitude')}
                  className="py-2.5 px-4 cursor-pointer hover:text-cyan-300 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Altitude</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('velocity')}
                  className="py-2.5 px-4 cursor-pointer hover:text-cyan-300 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Speed</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('delayMinutes')}
                  className="py-2.5 px-4 cursor-pointer hover:text-cyan-300 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredFlights.map((flight) => {
                const isSelected = flight.id === selectedFlightId;
                const isDelayed = flight.status === 'delayed';

                return (
                  <tr
                    key={flight.id}
                    onClick={() => {
                      onSelectFlight(flight.id);
                      onClose();
                    }}
                    className={`hover:bg-cyan-950/30 cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-500/10 text-cyan-200' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-400">{flight.flightNumber}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({flight.callsign})</span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-200 font-medium">
                      {flight.airline}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-cyan-300">{flight.origin.code}</span>
                      <span className="text-slate-500 mx-1.5">➔</span>
                      <span className="text-emerald-300">{flight.destination.code}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      FL{Math.round(flight.altitude / 100)} ({flight.altitude.toLocaleString()} ft)
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {flight.velocity} kts
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                          isDelayed
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isDelayed ? `Delayed +${flight.delayMinutes}m` : 'On Time'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFlight(flight.id);
                          onClose();
                        }}
                        className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="Focus on Radar"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredFlights.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    No flights matching "{search}" were found in current airspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
