import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Flight } from '../types/flight.ts';
import { TimezoneCode, convertUtcTimeString } from '../utils/time.ts';
import { Crosshair, Plus, Minus, RotateCcw, Lock, Unlock, Layers, X, Plane, Activity, Gauge, TableProperties } from 'lucide-react';

interface TacticalRadarMapProps {
  flights: Flight[];
  selectedFlightId: string | null;
  onSelectFlight: (id: string | null) => void;
  radarSweepEnabled?: boolean;
  timezone?: TimezoneCode;
}

type MapLayerType = 'dark' | 'satellite' | 'vector';

// Map altitude to OpenSky tar1090 color palette
export function getAltitudeColor(altitude: number, isDelayed: boolean, isSelected: boolean): string {
  if (isSelected) return '#38bdf8'; // Tactical Cyan Focus
  if (isDelayed) return '#f59e0b'; // Aviation Delay Amber
  if (altitude < 1500) return '#b45309'; // 0-1.5k ft (Brown/Dark Orange)
  if (altitude < 5000) return '#ea580c'; // 1.5k-5k ft (Orange)
  if (altitude < 10000) return '#eab308'; // 5k-10k ft (Yellow-Gold)
  if (altitude < 18000) return '#84cc16'; // 10k-18k ft (Light Green)
  if (altitude < 26000) return '#10b981'; // 18k-26k ft (Emerald)
  if (altitude < 33000) return '#06b6d4'; // 26k-33k ft (Cyan / Teal)
  if (altitude < 38000) return '#3b82f6'; // 33k-38k ft (Blue)
  return '#c084fc'; // 38k-45k+ ft (OpenSky Magenta / Purple)
}

function createPlaneIconHtml(flight: Flight, isSelected: boolean, zoom: number): string {
  const isDelayed = flight.status === 'delayed';
  const color = getAltitudeColor(flight.altitude, isDelayed, isSelected);

  const glowStyle = isSelected
    ? 'filter: drop-shadow(0 0 10px #38bdf8); z-index: 999;'
    : 'filter: drop-shadow(0 0 2px rgba(0,0,0,0.9));';

  const reticleRing = isSelected
    ? `<div class="absolute -inset-3 rounded-full border border-cyan-400/80 animate-ping pointer-events-none"></div>
       <div class="absolute -inset-2 rounded-full border border-cyan-400/60 pointer-events-none"></div>`
    : '';

  const showLabel = isSelected || zoom >= 7;

  return `
    <div class="group relative flex items-center justify-center w-6 h-6 cursor-pointer" style="${glowStyle}" title="${flight.flightNumber} (${flight.airline}) | ${flight.origin.code} ➔ ${flight.destination.code} | FL${Math.round(flight.altitude / 100)} (${flight.altitude.toLocaleString()} ft) · ${flight.velocity} kts">
      ${reticleRing}
      <div style="transform: rotate(${flight.heading}deg); transition: transform 0.6s ease;" class="plane-rotator w-5 h-5 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="${color}" stroke="#070a0f" stroke-width="0.8" class="${isSelected ? 'w-5 h-5 scale-125' : 'w-4 h-4'}">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>
      ${
        showLabel
          ? `<div class="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1 py-0.2 rounded bg-slate-950/90 border border-slate-800 text-[9px] font-mono font-medium ${
              isSelected ? 'text-cyan-300 border-cyan-500/80 font-bold scale-110 z-20' : 'text-slate-300'
            } pointer-events-none">
              ${flight.flightNumber}
            </div>`
          : ''
      }
    </div>
  `;
}

export const TacticalRadarMap: React.FC<TacticalRadarMapProps> = ({
  flights,
  selectedFlightId,
  onSelectFlight,
  radarSweepEnabled = true,
  timezone = 'UTC',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const referenceLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const trajectoryLayerRef = useRef<L.LayerGroup | null>(null);

  // Camera tracking control states (defaults to true so selected aircraft is always kept centered on refresh)
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('dark');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [onScreenCount, setOnScreenCount] = useState<number>(0);
  const [showTarTable, setShowTarTable] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const lastCenteredFlightIdRef = useRef<string | null>(null);
  const isCameraLockedRef = useRef(isCameraLocked);
  isCameraLockedRef.current = isCameraLocked;

  const applyTileLayer = useCallback((layerType: MapLayerType, map: L.Map) => {
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (referenceLayerRef.current) map.removeLayer(referenceLayerRef.current);

    if (layerType === 'dark') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 16,
          className: 'esri-dark-tiles',
        }
      ).addTo(map);

      referenceLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          opacity: 0.7,
        }
      ).addTo(map);
    } else if (layerType === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 18,
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
          className: 'tactical-radar-tiles',
        }
      ).addTo(map);
    }
  }, []);

  const flightsRef = useRef(flights);
  flightsRef.current = flights;

  const onSelectFlightRef = useRef(onSelectFlight);
  onSelectFlightRef.current = onSelectFlight;

  // Compute on-screen flights inside visible bounding box using stable ref
  const updateOnScreenCount = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    let count = 0;
    const curFlights = flightsRef.current;
    for (let i = 0; i < curFlights.length; i++) {
      if (bounds.contains([curFlights[i].latitude, curFlights[i].longitude])) {
        count++;
      }
    }
    setOnScreenCount(count);
  }, []);

  // Initialize Leaflet Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28, 15],
      zoom: 3,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: true,
    });

    applyTileLayer('dark', map);

    trajectoryLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    map.on('click', () => {
      onSelectFlightRef.current(null);
    });

    map.on('dragstart', () => {
      setIsCameraLocked(false);
    });

    map.on('moveend', () => {
      updateOnScreenCount();
    });

    map.on('zoomend', () => {
      updateOnScreenCount();
    });

    // Run initial count once tiles are mounted
    setTimeout(updateOnScreenCount, 300);

    return () => {
      markersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [applyTileLayer, updateOnScreenCount]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      applyTileLayer(mapLayer, mapInstanceRef.current);
    }
  }, [mapLayer, applyTileLayer]);

  // Update on-screen count when flights update
  useEffect(() => {
    updateOnScreenCount();
  }, [flights, updateOnScreenCount]);

  // Update or render flight markers (smoothly update position/heading without flickering)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const activeFlightIds = new Set(flights.map((f) => f.id));

    // Remove markers for flights that are no longer active
    currentMarkers.forEach((marker, id) => {
      if (!activeFlightIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    const currentZoom = map.getZoom();

    flights.forEach((flight) => {
      const isSelected = flight.id === selectedFlightId;
      const existingMarker = currentMarkers.get(flight.id);

      if (existingMarker) {
        // Smoothly update marker position
        existingMarker.setLatLng([flight.latitude, flight.longitude]);

        // Smoothly rotate airplane SVG via CSS without re-creating DOM
        const el = existingMarker.getElement();
        if (el) {
          const rot = el.querySelector('.plane-rotator') as HTMLElement;
          if (rot) {
            rot.style.transform = `rotate(${flight.heading}deg)`;
          }
        }

        const wasSelected = (existingMarker as any)._isSelected === true;
        if (isSelected !== wasSelected) {
          (existingMarker as any)._isSelected = isSelected;
          existingMarker.setIcon(
            L.divIcon({
              className: 'plane-marker-icon',
              html: createPlaneIconHtml(flight, isSelected, currentZoom),
              iconSize: isSelected ? [26, 26] : [24, 24],
              iconAnchor: isSelected ? [13, 13] : [12, 12],
            })
          );
          existingMarker.setZIndexOffset(isSelected ? 1000 : 10);
        }
      } else {
        const icon = L.divIcon({
          className: 'plane-marker-icon',
          html: createPlaneIconHtml(flight, isSelected, currentZoom),
          iconSize: isSelected ? [26, 26] : [24, 24],
          iconAnchor: isSelected ? [13, 13] : [12, 12],
        });

        const marker = L.marker([flight.latitude, flight.longitude], {
          icon,
          zIndexOffset: isSelected ? 1000 : 10,
        });
        (marker as any)._isSelected = isSelected;

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setIsCameraLocked(true);
          isCameraLockedRef.current = true;
          onSelectFlightRef.current(flight.id);
        });

        marker.addTo(map);
        currentMarkers.set(flight.id, marker);
      }
    });
  }, [flights, selectedFlightId]);

  // Trajectory arcs, rings, and INITIAL flight selection centering
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trajectoryLayer = trajectoryLayerRef.current;
    if (!map || !trajectoryLayer) return;

    trajectoryLayer.clearLayers();

    if (!selectedFlightId) {
      lastCenteredFlightIdRef.current = null;
      return;
    }

    const selectedFlight = flights.find((f) => f.id === selectedFlightId);
    if (!selectedFlight) return;

    // 1. Origin Airport Marker
    const originIcon = L.divIcon({
      className: 'airport-marker-icon',
      html: `
        <div class="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-mono text-cyan-300 shadow cursor-pointer">
          <div class="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
          <span>${selectedFlight.origin.code}</span>
        </div>
      `,
      iconSize: [40, 18],
      iconAnchor: [20, 9],
    });
    const originMarker = L.marker([selectedFlight.origin.lat, selectedFlight.origin.lon], { icon: originIcon });
    originMarker.on('click', (e) => L.DomEvent.stopPropagation(e));
    originMarker.addTo(trajectoryLayer);

    // 2. Destination Airport Marker
    const destIcon = L.divIcon({
      className: 'airport-marker-icon',
      html: `
        <div class="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 shadow cursor-pointer">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span>${selectedFlight.destination.code}</span>
        </div>
      `,
      iconSize: [40, 18],
      iconAnchor: [20, 9],
    });
    const destMarker = L.marker([selectedFlight.destination.lat, selectedFlight.destination.lon], { icon: destIcon });
    destMarker.on('click', (e) => L.DomEvent.stopPropagation(e));
    destMarker.addTo(trajectoryLayer);

    // 3. Full Great Circle Flight Path Arc
    const arcPath = [
      [selectedFlight.origin.lat, selectedFlight.origin.lon],
      ...selectedFlight.trail,
      [selectedFlight.latitude, selectedFlight.longitude],
      [selectedFlight.destination.lat, selectedFlight.destination.lon],
    ] as [number, number][];

    const arcPolyline = L.polyline(arcPath, {
      color: '#38bdf8',
      weight: 2,
      opacity: 0.65,
      dashArray: '5, 8',
    });
    arcPolyline.on('click', (e) => L.DomEvent.stopPropagation(e));
    arcPolyline.addTo(trajectoryLayer);

    // 4. Past Flown Trail
    if (selectedFlight.trail.length > 1) {
      const trailPoly = L.polyline(selectedFlight.trail, {
        color: '#06b6d4',
        weight: 3,
        opacity: 0.85,
      });
      trailPoly.on('click', (e) => L.DomEvent.stopPropagation(e));
      trailPoly.addTo(trajectoryLayer);
    }

    // 5. Concentric Tactical Radar Range Rings (100km & 300km)
    const ring1 = L.circle([selectedFlight.latitude, selectedFlight.longitude], {
      radius: 100000,
      color: '#38bdf8',
      weight: 1,
      opacity: 0.25,
      fill: false,
      dashArray: '3, 6',
    });
    ring1.on('click', (e) => L.DomEvent.stopPropagation(e));
    ring1.addTo(trajectoryLayer);

    const ring2 = L.circle([selectedFlight.latitude, selectedFlight.longitude], {
      radius: 300000,
      color: '#38bdf8',
      weight: 1,
      opacity: 0.15,
      fill: false,
      dashArray: '3, 6',
    });
    ring2.on('click', (e) => L.DomEvent.stopPropagation(e));
    ring2.addTo(trajectoryLayer);

    // Center camera upon flight selection and continuously pan with it on every refresh
    if (lastCenteredFlightIdRef.current !== selectedFlightId) {
      lastCenteredFlightIdRef.current = selectedFlightId;
      setIsCameraLocked(true);
      isCameraLockedRef.current = true;
      const currentZoom = map.getZoom();
      const targetZoom = currentZoom < 5 ? 6 : currentZoom;
      map.flyTo([selectedFlight.latitude, selectedFlight.longitude], targetZoom, {
        animate: true,
        duration: 0.8,
      });
    } else if (isCameraLockedRef.current) {
      // Keep aircraft in center on every 2.5s data refresh, strictly preserving user's zoom
      map.panTo([selectedFlight.latitude, selectedFlight.longitude], {
        animate: true,
        duration: 1.0,
      });
    }
  }, [selectedFlightId, flights]);

  const handleCenterFlight = () => {
    if (!selectedFlightId) return;
    const f = flights.find((fl) => fl.id === selectedFlightId);
    if (f && mapInstanceRef.current) {
      setIsCameraLocked(true);
      isCameraLockedRef.current = true;
      mapInstanceRef.current.panTo([f.latitude, f.longitude], { animate: true, duration: 0.6 });
    }
  };

  const handleToggleLock = () => {
    const nextLocked = !isCameraLocked;
    setIsCameraLocked(nextLocked);
    isCameraLockedRef.current = nextLocked;
    if (nextLocked && selectedFlightId) {
      handleCenterFlight();
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetWorldView = () => {
    setIsCameraLocked(false);
    isCameraLockedRef.current = false;
    mapInstanceRef.current?.flyTo([25, 10], 3, { animate: true, duration: 1 });
  };

  const selectedFlight = flights.find((f) => f.id === selectedFlightId);

  const [tableFilterScope, setTableFilterScope] = useState<'onscreen' | 'all'>('onscreen');
  const [jumpAirportCode, setJumpAirportCode] = useState('');

  const handleJumpToAirport = (code: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const cleanCode = code.trim().toUpperCase();
    const targetFlight = flights.find(f => f.origin.code === cleanCode || f.destination.code === cleanCode);
    if (targetFlight) {
      const airport = targetFlight.origin.code === cleanCode ? targetFlight.origin : targetFlight.destination;
      map.flyTo([airport.lat, airport.lon], 6, { animate: true, duration: 1.2 });
      setJumpAirportCode('');
    }
  };

  // Filtered flights for tar1090 table
  const visibleTableFlights = flights.filter((f) => {
    const map = mapInstanceRef.current;
    if (tableFilterScope === 'onscreen' && map) {
      const bounds = map.getBounds();
      if (!bounds.contains([f.latitude, f.longitude])) {
        return false;
      }
    }

    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return (
      f.flightNumber.toLowerCase().includes(q) ||
      f.callsign.toLowerCase().includes(q) ||
      f.airline.toLowerCase().includes(q) ||
      f.origin.code.toLowerCase().includes(q) ||
      f.destination.code.toLowerCase().includes(q) ||
      f.aircraftType.toLowerCase().includes(q) ||
      f.squawk.includes(q)
    );
  }).slice(0, 200);

  return (
    <div className="relative w-full h-full bg-[#070A0F] overflow-hidden">
      {/* Tactical Radar Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px]"></div>

      {/* Radar Sweep Reticle Simulation */}
      {radarSweepEnabled && (
        <div className="absolute top-4 right-4 w-36 h-36 rounded-full border border-cyan-500/20 pointer-events-none z-10 hidden xl:flex items-center justify-center overflow-hidden bg-cyan-950/5">
          <div className="absolute inset-0 rounded-full border border-cyan-500/10 scale-75"></div>
          <div className="absolute inset-0 rounded-full border border-cyan-500/10 scale-50"></div>
          <div className="absolute w-full h-[1px] bg-cyan-500/15"></div>
          <div className="absolute h-full w-[1px] bg-cyan-500/15"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-cyan-500/25 radar-sweep-anim"></div>
          <div className="absolute bottom-2 text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">
            RADAR 360°
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* OpenSky / tar1090 Aircraft Stats Counter Widget (Top Left, z-[500]) */}
      <div className="absolute top-4 left-4 z-[500] flex items-center gap-3 bg-[#0B0F17]/95 border border-cyan-500/40 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-xl font-mono text-xs">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">OpenSky Fleet Telemetry</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-300">Total Aircraft:</span>
            <span className="font-bold text-cyan-300">10,615</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">Active Radar:</span>
            <span className="font-bold text-emerald-400">{flights.length}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">On Screen:</span>
            <span className="font-bold text-purple-300">{onScreenCount}</span>
          </div>
        </div>

        <button
          onClick={() => setShowTarTable(!showTarTable)}
          title="Toggle OpenSky tar1090 Flight Directory Sidebar"
          className={`p-1.5 rounded-lg border transition-colors ${
            showTarTable
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : 'bg-slate-900 text-slate-300 hover:text-cyan-300 border-slate-700'
          }`}
        >
          <TableProperties className="w-4 h-4" />
        </button>
      </div>

      {/* Tactical Top Flight Summary Banner (Always visible when flight is selected, z-[500] above Leaflet) */}
      {selectedFlight && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] max-w-[95vw] bg-[#0B0F17]/95 border border-cyan-500/50 rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex flex-wrap items-center gap-4 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Plane className="w-3.5 h-3.5 transform -rotate-45" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>{selectedFlight.flightNumber}</span>
                <span className="text-[10px] text-slate-400 font-normal">({selectedFlight.airline})</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                {selectedFlight.aircraftType} · {selectedFlight.registration}
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-300">{selectedFlight.origin.code}</span>
            <span className="text-slate-500 text-[10px]">➔</span>
            <span className="font-bold text-emerald-300">{selectedFlight.destination.code}</span>
            <span className="text-[10px] text-slate-400 hidden md:inline">
              ({selectedFlight.origin.city} to {selectedFlight.destination.city})
            </span>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-300">FL{Math.round(selectedFlight.altitude / 100)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-300">{selectedFlight.velocity} kts</span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                selectedFlight.status === 'delayed'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {selectedFlight.status === 'delayed' ? `Delayed +${selectedFlight.delayMinutes}m` : 'On Time'}
            </span>

            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              ETA: <span className="text-emerald-300 font-semibold">{convertUtcTimeString(selectedFlight.arrivalEstimated, timezone)}</span>
            </span>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleToggleLock}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                isCameraLocked
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
              }`}
              title={isCameraLocked ? 'Aircraft is locked in center (moves on refresh). Click for Free Cam.' : 'Click to lock aircraft in center'}
            >
              {isCameraLocked ? <Lock className="w-3 h-3 text-cyan-400" /> : <Unlock className="w-3 h-3 text-slate-400" />}
              <span className="hidden sm:inline">{isCameraLocked ? 'Center: Locked' : 'Free Cam'}</span>
            </button>

            <button
              onClick={handleCenterFlight}
              title="Center on Flight"
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-cyan-400 transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onSelectFlight(null)}
              title="Deselect Flight"
              className="p-1 rounded bg-slate-800/80 hover:bg-red-950/80 hover:text-red-300 text-slate-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Tactical Map Controls (Bottom Left, z-[500]) */}
      <div className="absolute bottom-16 left-6 z-[500] flex flex-col gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Map Style"
            className="p-2 bg-[#0B0F17]/90 border border-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 shadow-xl backdrop-blur-md transition-colors"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayerMenu && (
            <div className="absolute left-10 bottom-0 bg-[#0B0F17]/95 border border-slate-800 rounded-lg p-1 shadow-2xl backdrop-blur-md flex flex-col gap-1 w-36 text-xs z-[600]">
              <button
                onClick={() => {
                  setMapLayer('dark');
                  setShowLayerMenu(false);
                }}
                className={`px-2.5 py-1 text-left rounded transition-colors ${
                  mapLayer === 'dark' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tactical Dark (ESRI)
              </button>
              <button
                onClick={() => {
                  setMapLayer('satellite');
                  setShowLayerMenu(false);
                }}
                className={`px-2.5 py-1 text-left rounded transition-colors ${
                  mapLayer === 'satellite' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Satellite Airspace
              </button>
              <button
                onClick={() => {
                  setMapLayer('vector');
                  setShowLayerMenu(false);
                }}
                className={`px-2.5 py-1 text-left rounded transition-colors ${
                  mapLayer === 'vector' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                OSM Radar Vector
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col bg-[#0B0F17]/90 border border-slate-800 rounded-lg shadow-xl overflow-hidden backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors border-b border-slate-800"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleResetWorldView}
          title="Reset World Airspace View"
          className="p-2 bg-[#0B0F17]/90 border border-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 shadow-xl backdrop-blur-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {selectedFlightId && (
          <button
            onClick={handleCenterFlight}
            title="Center Camera on Selected Flight"
            className="p-2 bg-cyan-500/20 border border-cyan-400/60 rounded-lg text-cyan-300 hover:bg-cyan-500/30 shadow-xl backdrop-blur-md transition-colors animate-pulse"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* tar1090 Real-time Flight List Sidebar (Right side, toggleable, z-[1000]) */}
      {showTarTable && (
        <aside
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 bottom-14 w-[420px] max-w-[calc(100vw-2rem)] z-[1000] bg-[#0B0F17]/95 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden font-mono text-xs animate-in fade-in slide-in-from-right-4 duration-200"
        >
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>OpenSky tar1090 Flight Directory</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total Aircraft: <span className="text-cyan-300 font-bold">10,615</span> · On Screen: <span className="text-purple-300 font-bold">{onScreenCount}</span>
              </div>
            </div>
            <button
              onClick={() => setShowTarTable(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scope Filters & Jump controls matching OpenSky tar1090 */}
          <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTableFilterScope('onscreen')}
                className={`flex-1 py-1 px-2 text-[10px] rounded font-medium transition-colors ${
                  tableFilterScope === 'onscreen'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                On Screen ({onScreenCount})
              </button>
              <button
                onClick={() => setTableFilterScope('all')}
                className={`flex-1 py-1 px-2 text-[10px] rounded font-medium transition-colors ${
                  tableFilterScope === 'all'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Airborne ({flights.length})
              </button>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Filter callsign, route, type, squawk..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/70 font-sans"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Jump to Airport Quick Bar */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="shrink-0 text-slate-500">Jump:</span>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {['LHR', 'JFK', 'DXB', 'HND', 'FRA', 'SIN', 'IST', 'SYD'].map((hub) => (
                  <button
                    key={hub}
                    onClick={() => handleJumpToAirport(hub)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-800 text-slate-300 font-mono transition-colors"
                  >
                    {hub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                <tr>
                  <th className="py-1.5 px-2">Callsign</th>
                  <th className="py-1.5 px-2">Route</th>
                  <th className="py-1.5 px-2">Type</th>
                  <th className="py-1.5 px-2">Squawk</th>
                  <th className="py-1.5 px-2 text-right">Alt (ft)</th>
                  <th className="py-1.5 px-2 text-right">Spd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {visibleTableFlights.map((f) => {
                  const isSel = f.id === selectedFlightId;
                  const altColor = getAltitudeColor(f.altitude, f.status === 'delayed', isSel);

                  return (
                    <tr
                      key={f.id}
                      onClick={() => onSelectFlight(f.id)}
                      className={`hover:bg-cyan-950/40 cursor-pointer transition-colors ${
                        isSel ? 'bg-cyan-500/15 font-bold text-white' : ''
                      }`}
                    >
                      <td className="py-1 px-2 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: altColor }}></span>
                        <span className={isSel ? 'text-cyan-300' : 'text-slate-200'}>{f.callsign}</span>
                      </td>
                      <td className="py-1 px-2 text-slate-400 truncate max-w-[85px]">
                        {f.origin.code}-{f.destination.code}
                      </td>
                      <td className="py-1 px-2 text-slate-400 truncate max-w-[70px]">
                        {f.aircraftType.split(' ')[0]}
                      </td>
                      <td className="py-1 px-2 text-slate-400">{f.squawk}</td>
                      <td className="py-1 px-2 text-right tabular-nums font-semibold" style={{ color: altColor }}>
                        {f.altitude.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-right tabular-nums text-slate-400">
                        {f.velocity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </aside>
      )}

      {/* Authentic OpenSky tar1090 Altitude Color Scale Bar (Bottom Center, z-[500]) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] flex flex-col items-center bg-[#0B0F17]/95 border border-slate-800/90 rounded-lg px-3 py-1 shadow-2xl backdrop-blur-md font-mono text-[9px] text-slate-400">
        <div className="flex items-center justify-between w-full text-[8px] uppercase tracking-wider text-slate-500 mb-0.5">
          <span>ALTITUDE (ft)</span>
          <span>0</span>
          <span>1,000</span>
          <span>5,000</span>
          <span>10,000</span>
          <span>20,000</span>
          <span>30,000</span>
          <span>40,000+</span>
        </div>
        <div className="w-72 sm:w-96 h-2 rounded overflow-hidden bg-gradient-to-r from-[#b45309] via-[#ea580c] via-[#eab308] via-[#84cc16] via-[#10b981] via-[#06b6d4] via-[#3b82f6] to-[#c084fc]"></div>
      </div>
    </div>
  );
};
