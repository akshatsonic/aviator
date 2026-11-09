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

export interface MapBounds {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export interface MapCenter {
  latitude: number;
  longitude: number;
}

const INITIAL_RADIUS_KM = 100;
const FALLBACK_CENTER: MapCenter = { latitude: 12.9716, longitude: 77.5946 };

function boundsAround(center: MapCenter, radiusKm: number): MapBounds {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeScale = Math.max(Math.cos(center.latitude * Math.PI / 180), 0.1);
  const longitudeDelta = radiusKm / (111.32 * longitudeScale);
  return {
    lamin: Math.max(-90, center.latitude - latitudeDelta),
    lomin: Math.max(-180, center.longitude - longitudeDelta),
    lamax: Math.min(90, center.latitude + latitudeDelta),
    lomax: Math.min(180, center.longitude + longitudeDelta),
  };
}

function distanceKm(a: MapCenter, b: MapCenter): number {
  const earthRadiusKm = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function flightsAreEquivalent(previous: Flight[], next: Flight[]): boolean {
  if (previous.length !== next.length) return false;

  for (let index = 0; index < previous.length; index++) {
    const a = previous[index];
    const b = next[index];
    if (
      a.id !== b.id ||
      a.latitude !== b.latitude ||
      a.longitude !== b.longitude ||
      a.altitude !== b.altitude ||
      a.velocity !== b.velocity ||
      a.heading !== b.heading ||
      a.verticalRate !== b.verticalRate ||
      a.origin.code !== b.origin.code ||
      a.destination.code !== b.destination.code ||
      a.routeKnown !== b.routeKnown ||
      a.arrivalEstimated !== b.arrivalEstimated ||
      a.status !== b.status ||
      a.trail.length !== b.trail.length
    ) {
      return false;
    }
  }

  return true;
}

function preserveObservedTrails(previous: Flight[], next: Flight[]): Flight[] {
  const previousById = new Map(previous.map((flight) => [flight.id, flight]));
  return next.map((flight) => {
    const priorTrail = previousById.get(flight.id)?.trail || [];
    const incomingTrail = flight.trail || [];
    const trail = [...(incomingTrail.length > priorTrail.length ? incomingTrail : priorTrail)];
    const currentPoint: [number, number] = [flight.latitude, flight.longitude];
    const lastPoint = trail[trail.length - 1];
    if (!lastPoint || lastPoint[0] !== currentPoint[0] || lastPoint[1] !== currentPoint[1]) {
      trail.push(currentPoint);
    }
    return { ...flight, trail: trail.slice(-120) };
  });
}

function boundsChangedMaterially(previous: MapBounds, next: MapBounds): boolean {
  const latitudeThreshold = Math.max((previous.lamax - previous.lamin) * 0.1, 0.05);
  const longitudeThreshold = Math.max((previous.lomax - previous.lomin) * 0.1, 0.05);

  return (
    Math.abs(previous.lamin - next.lamin) >= latitudeThreshold ||
    Math.abs(previous.lamax - next.lamax) >= latitudeThreshold ||
    Math.abs(previous.lomin - next.lomin) >= longitudeThreshold ||
    Math.abs(previous.lomax - next.lomax) >= longitudeThreshold
  );
}

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [summary, setSummary] = useState<AirspaceSummary | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [resolvingRouteId, setResolvingRouteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedAirline, setSelectedAirline] = useState('all');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isOpenSkyModalOpen, setIsOpenSkyModalOpen] = useState(false);
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(4000);
  const [dailyAllowance, setDailyAllowance] = useState(4000);
  const [liveProvider, setLiveProvider] = useState<'opensky' | 'adsb.lol'>('opensky');
  const [prefilledQuery, setPrefilledQuery] = useState<string | undefined>(undefined);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [initialCenter, setInitialCenter] = useState<MapCenter | null>(null);
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'fallback'>('requesting');
  const [isInitialScopeActive, setIsInitialScopeActive] = useState(true);
  const [mapBounds, setMapBounds] = useState<MapBounds>(() => boundsAround(FALLBACK_CENTER, INITIAL_RADIUS_KM));
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

  useEffect(() => {
    const useFallback = () => {
      setInitialCenter(FALLBACK_CENTER);
      setMapBounds(boundsAround(FALLBACK_CENTER, INITIAL_RADIUS_KM));
      setLocationStatus('fallback');
    };

    if (!('geolocation' in navigator)) {
      useFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const center = { latitude: coords.latitude, longitude: coords.longitude };
        setInitialCenter(center);
        setMapBounds(boundsAround(center, INITIAL_RADIUS_KM));
        setLocationStatus('granted');
      },
      useFallback,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  // Poll live flights from backend (supporting live OpenSky feed and simulation mode)
  const fetchFlights = useCallback(async (signal?: AbortSignal) => {
    try {
      const boundsParams = new URLSearchParams({
        lamin: mapBounds.lamin.toString(),
        lomin: mapBounds.lomin.toString(),
        lamax: mapBounds.lamax.toString(),
        lomax: mapBounds.lomax.toString(),
      });
      const endpoint = isLiveFeed ? `/api/opensky/live?${boundsParams}` : `/api/flights?${boundsParams}`;
      const timeoutSignal = AbortSignal.timeout(12000);
      const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
      const res = await fetch(endpoint, { signal: requestSignal });
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        setFeedError(`Flight feed returned HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      if (isLiveFeed && data.isLive === false) {
        setFeedError(data.error || 'OpenSky did not return live aircraft data');
        return;
      }

      setFeedError(null);
      if (data.provider === 'opensky' || data.provider === 'adsb.lol') {
        setLiveProvider(data.provider);
      }
      if (Array.isArray(data.flights) && (data.isLive !== false || !isLiveFeed)) {
        setFlights((previous) => {
          const nextFlights = preserveObservedTrails(previous, data.flights);
          return flightsAreEquivalent(previous, nextFlights) ? previous : nextFlights;
        });
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
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFeedError(
        error instanceof DOMException && error.name === 'TimeoutError'
          ? 'The live provider did not respond within 12 seconds.'
          : error instanceof Error ? error.message : 'Unable to load the flight feed',
      );
    } finally {
      setIsInitialLoading(false);
    }
  }, [isLiveFeed, mapBounds]);

  const handleMapBoundsChange = useCallback((bounds: MapBounds) => {
    setIsInitialScopeActive(false);
    setMapBounds((previous) => {
      return boundsChangedMaterially(previous, bounds) ? bounds : previous;
    });
  }, []);

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
    if (!initialCenter) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const poll = async () => {
      await fetchFlights(controller.signal);
      if (!stopped) {
        timer = setTimeout(poll, isLiveFeed ? 30000 : 2500);
      }
    };

    poll();
    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [fetchFlights, initialCenter]);

  useEffect(() => {
    if (isLiveFeed) {
      setFlights((previous) => previous.filter((flight) => flight.dataSource === 'opensky'));
      setSummary(null);
    }
  }, [isLiveFeed]);

  // Extract unique airlines for filter dropdown
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => set.add(f.airline));
    return Array.from(set).sort();
  }, [flights]);

  // Filtered flights for radar display and directory
  const filteredFlights = useMemo(() => {
    return flights.filter((f) => {
      if (isInitialScopeActive && initialCenter && distanceKm(initialCenter, { latitude: f.latitude, longitude: f.longitude }) > INITIAL_RADIUS_KM) {
        return false;
      }
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
  }, [flights, selectedAirline, activeFilter, searchQuery, initialCenter, isInitialScopeActive]);

  // Selected flight object
  const selectedFlight = useMemo(() => {
    if (!selectedFlightId) return null;
    return flights.find((f) => f.id === selectedFlightId) || null;
  }, [flights, selectedFlightId]);

  // Handle focus or deselect on flight from map blip, AI chat flight card, or directory table
  const handleSelectFlight = useCallback((flightId: string | null) => {
    setSelectedFlightId(flightId);
    if (!flightId) {
      setResolvingRouteId(null);
      return;
    }

    const selected = flights.find((flight) => flight.id === flightId);
    if (!selected || selected.routeKnown !== false || selected.dataSource !== 'opensky') return;
    setResolvingRouteId(flightId);

    const params = new URLSearchParams({
      lat: selected.latitude.toString(),
      lng: selected.longitude.toString(),
    });
    fetch(`/api/routes/${encodeURIComponent(selected.callsign)}?${params}`)
      .then((response) => response.ok ? response.json() : null)
      .then((route) => {
        if (!route?.routeKnown || !route.origin || !route.destination) return;
        setFlights((current) => current.map((flight) => flight.id === flightId ? {
          ...flight,
          origin: route.origin,
          destination: route.destination,
          routeKnown: true,
          routeSource: 'callsign_estimate',
        } : flight));
      })
      .catch(() => {})
      .finally(() => setResolvingRouteId((current) => current === flightId ? null : current));
  }, [flights]);

  const handleFocusFromAi = useCallback((flightId: string) => {
    setSelectedFlightId(flightId);
    // Keep drawer accessible or smoothly focused
  }, []);

  const handleAskAiAboutFlight = (flightNumber: string) => {
    setIsAiDrawerOpen(true);
    setPrefilledQuery(`Report the available live telemetry and clearly labelled route estimates for flight ${flightNumber}.`);
  };

  const handleResetView = () => {
    setSelectedFlightId(null);
    setSearchQuery('');
    setActiveFilter('all');
    setSelectedAirline('all');
  };

  return (
    <div className="app-shell relative flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0a] text-[#efefef] select-none">
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
        feedError={feedError}
        liveProvider={liveProvider}
        onOpenOpenSkyModal={() => setIsOpenSkyModalOpen(true)}
      />

      {/* 3. Main Viewport: Tactical Radar Canvas */}
      <main className="relative z-0 isolate flex-1 w-full h-full overflow-hidden">
        {initialCenter && (
          <TacticalRadarMap
            flights={filteredFlights}
            selectedFlightId={selectedFlightId}
            onSelectFlight={handleSelectFlight}
            onBoundsChange={handleMapBoundsChange}
            initialCenter={initialCenter}
            initialRadiusKm={INITIAL_RADIUS_KM}
            scopeLabel={locationStatus === 'granted' ? 'Within 100 km of you' : '100 km around Bengaluru'}
            isLiveFeed={isLiveFeed}
            liveProvider={liveProvider}
            isLoading={isInitialLoading}
            feedError={feedError}
            onRetry={() => void fetchFlights()}
            timezone={timezone}
          />
        )}
        {isInitialLoading && (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]">
            <span className="size-2 animate-pulse rounded-full bg-[#b11226]" />
            <div className="text-sm font-medium text-[#efefef]">{locationStatus === 'requesting' ? 'Choose your local airspace' : 'Loading nearby airspace'}</div>
            <div className="text-xs text-[#737373]">{locationStatus === 'requesting' ? 'Allow location access to start within a 100 km radius' : 'Connecting to nearby aircraft telemetry'}</div>
          </div>
        )}

        {/* 4. Flight Telemetry HUD Panel (shown when aircraft is selected) */}
        {selectedFlight && !isAiDrawerOpen && (
          <FlightTelemetryPanel
            flight={selectedFlight}
            onClose={() => setSelectedFlightId(null)}
            onAskAiAboutFlight={handleAskAiAboutFlight}
            isResolvingRoute={resolvingRouteId === selectedFlight.id}
            timezone={timezone}
          />
        )}

        {/* 5. Floating AI Flight Copilot Side Drawer */}
        <AIFlightAssistantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          flights={flights}
          useLiveData={isLiveFeed}
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
