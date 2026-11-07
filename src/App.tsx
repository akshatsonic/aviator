import { useState, useEffect, useMemo, useCallback } from 'react';
import { Flight, AirspaceSummary } from './types/flight.ts';
import { TimezoneCode } from './utils/time.ts';
import { TopRadarBar } from './components/TopRadarBar.tsx';
import { AirspaceStatsBar } from './components/AirspaceStatsBar.tsx';
import { TacticalRadarMap } from './components/TacticalRadarMap.tsx';
import { FlightTelemetryPanel } from './components/FlightTelemetryPanel.tsx';
import { AIFlightAssistantDrawer } from './components/AIFlightAssistantDrawer.tsx';
import { FlightRosterModal } from './components/FlightRosterModal.tsx';
import { OpenSkyCredentialsModal } from './components/OpenSkyCredentialsModal.tsx';

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [summary, setSummary] = useState<AirspaceSummary | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedAirline, setSelectedAirline] = useState('all');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isOpenSkyModalOpen, setIsOpenSkyModalOpen] = useState(false);
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(4000);
  const [dailyAllowance, setDailyAllowance] = useState(4000);
  const [prefilledQuery, setPrefilledQuery] = useState<string | undefined>(undefined);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [timezone, setTimezone] = useState<TimezoneCode>(() => {
    return (localStorage.getItem('skypulse_timezone') as TimezoneCode) || 'UTC';
  });

  const handleTimezoneChange = (newTz: TimezoneCode) => {
    setTimezone(newTz);
    try {
      localStorage.setItem('skypulse_timezone', newTz);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  // Poll live flights from backend (supporting live OpenSky feed and simulation mode)
  const fetchFlights = useCallback(async () => {
    try {
      const endpoint = isLiveFeed ? '/api/opensky/live' : '/api/flights';
      const res = await fetch(endpoint);
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.flights)) {
        setFlights(data.flights);
      }
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.creditsRemaining !== undefined) {
        setCreditsRemaining(data.creditsRemaining);
      }
      if (data.dailyAllowance !== undefined) {
        setDailyAllowance(data.dailyAllowance);
      }
    } catch {
      // Ignore transient network glitches during server warm-up
    } finally {
      setIsInitialLoading(false);
    }
  }, [isLiveFeed]);

  // Check OpenSky credentials status on mount
  useEffect(() => {
    fetch('/api/opensky/status')
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (!res.ok || !contentType || !contentType.includes('application/json')) {
          return null;
        }
        return res.json();
      })
      .then((st) => {
        if (!st) return;
        if (st.hasCredentials) {
          setIsLiveFeed(true);
        }
        if (st.creditsRemaining !== undefined) {
          setCreditsRemaining(st.creditsRemaining);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, 2500);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  // Extract unique airlines for filter dropdown
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => set.add(f.airline));
    return Array.from(set).sort();
  }, [flights]);

  // Filtered flights for radar display and directory
  const filteredFlights = useMemo(() => {
    return flights.filter((f) => {
      // Airline filter
      if (selectedAirline !== 'all' && f.airline !== selectedAirline) {
        return false;
      }

      // Scope filter
      if (activeFilter === 'delayed' && f.status !== 'delayed') {
        return false;
      }
      if (activeFilter === 'transatlantic') {
        const transAtlanticAirports = ['LHR', 'CDG', 'FRA', 'AMS', 'ZRH', 'MAD', 'JFK', 'EWR', 'ORD', 'BOS'];
        const isOriginTA = transAtlanticAirports.includes(f.origin.code);
        const isDestTA = transAtlanticAirports.includes(f.destination.code);
        if (!(isOriginTA && isDestTA)) return false;
      }
      if (activeFilter === 'pacific') {
        const pacificAirports = ['HND', 'NRT', 'SIN', 'SYD', 'MEL', 'HKG', 'ICN', 'BKK', 'SFO', 'LAX', 'YVR'];
        const isOriginPac = pacificAirports.includes(f.origin.code);
        const isDestPac = pacificAirports.includes(f.destination.code);
        if (!(isOriginPac || isDestPac)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          f.flightNumber.toLowerCase().includes(q) ||
          f.callsign.toLowerCase().includes(q) ||
          f.airline.toLowerCase().includes(q) ||
          f.origin.code.toLowerCase().includes(q) ||
          f.destination.code.toLowerCase().includes(q) ||
          f.origin.city.toLowerCase().includes(q) ||
          f.destination.city.toLowerCase().includes(q) ||
          f.aircraftType.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [flights, selectedAirline, activeFilter, searchQuery]);

  // Selected flight object
  const selectedFlight = useMemo(() => {
    if (!selectedFlightId) return null;
    return flights.find((f) => f.id === selectedFlightId) || null;
  }, [flights, selectedFlightId]);

  // Handle focus or deselect on flight from map blip, AI chat flight card, or directory table
  const handleSelectFlight = useCallback((flightId: string | null) => {
    setSelectedFlightId(flightId);
  }, []);

  const handleFocusFromAi = useCallback((flightId: string) => {
    setSelectedFlightId(flightId);
    // Keep drawer accessible or smoothly focused
  }, []);

  const handleAskAiAboutFlight = (flightNumber: string) => {
    setIsAiDrawerOpen(true);
    setPrefilledQuery(`Give me a complete status report for flight ${flightNumber}, including route conditions and delay diagnostics.`);
  };

  const handleResetView = () => {
    setSelectedFlightId(null);
    setSearchQuery('');
    setActiveFilter('all');
    setSelectedAirline('all');
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#070A0F] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Top Navigation Bar */}
      <TopRadarBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAiDrawerOpen={isAiDrawerOpen}
        onToggleAiDrawer={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
        isRosterOpen={isRosterOpen}
        onToggleRoster={() => setIsRosterOpen(!isRosterOpen)}
        onResetView={handleResetView}
        selectedAirline={selectedAirline}
        onSelectAirline={setSelectedAirline}
        availableAirlines={availableAirlines}
      />

      {/* 2. Tactical Airspace Metrics HUD */}
      <AirspaceStatsBar
        summary={summary}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filteredCount={filteredFlights.length}
        timezone={timezone}
        onTimezoneChange={handleTimezoneChange}
        isLiveFeed={isLiveFeed}
        creditsRemaining={creditsRemaining}
        onOpenOpenSkyModal={() => setIsOpenSkyModalOpen(true)}
      />

      {/* 3. Main Viewport: Tactical Radar Canvas */}
      <main className="relative z-0 isolate flex-1 w-full h-full overflow-hidden">
        {isInitialLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#070A0F] gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
            </div>
            <div className="font-mono text-sm tracking-wider text-cyan-400 uppercase">
              Initializing Airspace Radar...
            </div>
            <div className="text-xs text-slate-500">
              Establishing transponder links & calibrating great-circle tracks
            </div>
          </div>
        ) : (
          <TacticalRadarMap
            flights={filteredFlights}
            selectedFlightId={selectedFlightId}
            onSelectFlight={handleSelectFlight}
            timezone={timezone}
          />
        )}

        {/* 4. Flight Telemetry HUD Panel (shown when aircraft is selected) */}
        {selectedFlight && (
          <FlightTelemetryPanel
            flight={selectedFlight}
            onClose={() => setSelectedFlightId(null)}
            onAskAiAboutFlight={handleAskAiAboutFlight}
            timezone={timezone}
          />
        )}

        {/* 5. Floating AI Flight Copilot Side Drawer */}
        <AIFlightAssistantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          flights={flights}
          onFocusFlight={handleFocusFromAi}
          prefilledQuery={prefilledQuery}
          onClearPrefill={() => setPrefilledQuery(undefined)}
          timezone={timezone}
        />
      </main>

      {/* 6. Flight Directory Roster Table Modal (Rendered at root level with z-[9999]) */}
      <FlightRosterModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        flights={flights}
        onSelectFlight={handleSelectFlight}
        selectedFlightId={selectedFlightId}
      />

      {/* 7. OpenSky Network Credentials & Rate Limit Budgeting Modal */}
      <OpenSkyCredentialsModal
        isOpen={isOpenSkyModalOpen}
        onClose={() => setIsOpenSkyModalOpen(false)}
        isLiveFeed={isLiveFeed}
        onToggleLiveFeed={setIsLiveFeed}
        creditsRemaining={creditsRemaining}
        dailyAllowance={dailyAllowance}
        onCredentialsSaved={() => fetchFlights()}
      />
    </div>
  );
}
