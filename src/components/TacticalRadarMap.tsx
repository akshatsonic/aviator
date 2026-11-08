import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Flight } from '../types/flight.ts';
import type { MapBounds, MapCenter } from '../App.tsx';
import { TimezoneCode } from '../utils/time.ts';
import { Crosshair, Plus, Minus, RotateCcw, Layers, X, TableProperties } from 'lucide-react';

interface TacticalRadarMapProps {
  flights: Flight[];
  selectedFlightId: string | null;
  onSelectFlight: (id: string | null) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  initialCenter: MapCenter;
  initialRadiusKm?: number;
  scopeLabel?: string;
  radarSweepEnabled?: boolean;
  timezone?: TimezoneCode;
}

type MapLayerType = 'dark' | 'satellite' | 'vector';

// Map altitude to OpenSky tar1090 color palette
export function getAltitudeColor(altitude: number, isDelayed: boolean, isSelected: boolean): string {
  if (isSelected) return '#b11226';
  if (isDelayed) return '#f59e0b'; // Aviation Delay Amber
  if (altitude < 1500) return '#b45309'; // 0-1.5k ft (Brown/Dark Orange)
  if (altitude < 5000) return '#ea580c'; // 1.5k-5k ft (Orange)
  if (altitude < 10000) return '#eab308'; // 5k-10k ft (Yellow-Gold)
  if (altitude < 18000) return '#84cc16'; // 10k-18k ft (Light Green)
  if (altitude < 26000) return '#10b981'; // 18k-26k ft (Emerald)
  if (altitude < 33000) return '#06b6d4'; // 26k-33k ft (Cyan / Teal)
  if (altitude < 38000) return '#3b82f6'; // 33k-38k ft (Blue)
  return '#a3a3a3'; // 38k-45k+ ft
}

function createPlaneIconHtml(flight: Flight, isSelected: boolean, zoom: number): string {
  const isDelayed = flight.status === 'delayed';
  const color = getAltitudeColor(flight.altitude, isDelayed, isSelected);

  const glowStyle = isSelected
    ? 'filter: drop-shadow(0 0 7px rgba(177,18,38,.75)); z-index: 999;'
    : 'filter: drop-shadow(0 0 2px rgba(0,0,0,0.9));';

  const reticleRing = isSelected
    ? `<div class="absolute -inset-3 rounded-full border border-cyan-400/80 animate-ping pointer-events-none"></div>
       <div class="absolute -inset-2 rounded-full border border-cyan-400/60 pointer-events-none"></div>`
    : '';

  const showLabel = isSelected || zoom >= 7;

  return `
    <div class="group relative flex items-center justify-center w-6 h-6 cursor-pointer" style="${glowStyle}" title="${flight.flightNumber} (${flight.airline}) | ${flight.routeKnown === false ? 'Route unknown' : `${flight.origin.code} ➔ ${flight.destination.code}`} | FL${Math.round(flight.altitude / 100)} (${flight.altitude.toLocaleString()} ft) · ${flight.velocity} kts">
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

function projectPosition(latitude: number, longitude: number, trackDegrees: number, distanceNm: number): [number, number] {
  const angularDistance = distanceNm / 3440.065;
  const bearing = trackDegrees * Math.PI / 180;
  const lat1 = latitude * Math.PI / 180;
  const lon1 = longitude * Math.PI / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );
  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

export const TacticalRadarMap: React.FC<TacticalRadarMapProps> = ({
  flights,
  selectedFlightId,
  onSelectFlight,
  onBoundsChange,
  initialCenter,
  initialRadiusKm = 100,
  scopeLabel = 'Local airspace',
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
  const [viewportRevision, setViewportRevision] = useState(0);
  const [selectedObservedTrack, setSelectedObservedTrack] = useState<Array<[number, number]>>([]);

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

  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const reportMapBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !onBoundsChangeRef.current) return;

    const bounds = map.getBounds().pad(0.1);
    onBoundsChangeRef.current({
      lamin: Number(Math.max(-90, bounds.getSouth()).toFixed(2)),
      lomin: Number(Math.max(-180, bounds.getWest()).toFixed(2)),
      lamax: Number(Math.min(90, bounds.getNorth()).toFixed(2)),
      lomax: Number(Math.min(180, bounds.getEast()).toFixed(2)),
    });
  }, []);

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
      center: [initialCenter.latitude, initialCenter.longitude],
      zoom: 9,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: true,
    });

    applyTileLayer('dark', map);

    trajectoryLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const localScope = L.circle([initialCenter.latitude, initialCenter.longitude], {
      radius: initialRadiusKm * 1000,
      color: '#b11226',
      weight: 1,
      opacity: 0.5,
      fillColor: '#b11226',
      fillOpacity: 0.025,
      interactive: false,
    }).addTo(map);
    L.circleMarker([initialCenter.latitude, initialCenter.longitude], {
      radius: 4,
      color: '#ffffff',
      weight: 2,
      fillColor: '#b11226',
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    map.fitBounds(localScope.getBounds(), { padding: [32, 32], maxZoom: 9, animate: false });

    map.on('click', () => {
      onSelectFlightRef.current(null);
    });

    map.on('dragstart', () => {
      setIsCameraLocked(false);
    });

    map.on('moveend', () => {
      updateOnScreenCount();
      setViewportRevision((revision) => revision + 1);
      reportMapBounds();
    });

    // Run initial count once tiles are mounted
    setTimeout(updateOnScreenCount, 300);

    return () => {
      markersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [applyTileLayer, initialCenter, initialRadiusKm, reportMapBounds, updateOnScreenCount]);

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
    const renderBounds = map.getBounds().pad(0.15);
    const visibleFlights = flights.filter(
      (flight) =>
        flight.id === selectedFlightId ||
        renderBounds.contains([flight.latitude, flight.longitude])
    );
    const activeFlightIds = new Set(visibleFlights.map((f) => f.id));

    // Remove markers for flights that are no longer active
    currentMarkers.forEach((marker, id) => {
      if (!activeFlightIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    const currentZoom = map.getZoom();

    visibleFlights.forEach((flight) => {
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
  }, [flights, selectedFlightId, viewportRevision]);

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
    const hasKnownRoute = selectedFlight.routeKnown !== false;

    if (hasKnownRoute) {
      // Callsign-derived airport estimates are shown only when both airports resolve.
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

      // Dotted line: direct-to-destination estimate, not a filed flight plan.
      const directEstimate = L.polyline(
        [[selectedFlight.latitude, selectedFlight.longitude], [selectedFlight.destination.lat, selectedFlight.destination.lon]],
        { color: '#38bdf8', weight: 2, opacity: 0.6, dashArray: '2, 8' }
      );
      directEstimate.addTo(trajectoryLayer);
    }

    // Solid line: sampled OpenSky track, extended to the current live position.
    // OpenSky's experimental track can end at its last sampled waypoint while the
    // state-vector aircraft continues moving, which otherwise leaves a visible gap.
    const observedTrail = selectedObservedTrack.length > 1
      ? [...selectedObservedTrack]
      : [...selectedFlight.trail];
    const currentPoint: [number, number] = [selectedFlight.latitude, selectedFlight.longitude];
    const trailEnd = observedTrail[observedTrail.length - 1];
    if (!trailEnd || trailEnd[0] !== currentPoint[0] || trailEnd[1] !== currentPoint[1]) {
      observedTrail.push(currentPoint);
    }
    if (observedTrail.length > 1) {
      const trailPoly = L.polyline(observedTrail, {
        color: '#06b6d4',
        weight: 3,
        opacity: 0.85,
      });
      trailPoly.on('click', (e) => L.DomEvent.stopPropagation(e));
      trailPoly.addTo(trajectoryLayer);
    }

    // Short dashed line: 10-minute projection using current true track and ground speed.
    if (selectedFlight.velocityAvailable !== false && selectedFlight.trackAvailable !== false && selectedFlight.velocity > 0) {
      const projectedPosition = projectPosition(
        selectedFlight.latitude,
        selectedFlight.longitude,
        selectedFlight.heading,
        selectedFlight.velocity / 6
      );
      L.polyline(
        [[selectedFlight.latitude, selectedFlight.longitude], projectedPosition],
        { color: '#f59e0b', weight: 2, opacity: 0.8, dashArray: '6, 6' }
      ).addTo(trajectoryLayer);
    }

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
  }, [selectedFlightId, flights, selectedObservedTrack]);

  const handleCenterFlight = () => {
    if (!selectedFlightId) return;
    const f = flights.find((fl) => fl.id === selectedFlightId);
    if (f && mapInstanceRef.current) {
      setIsCameraLocked(true);
      isCameraLockedRef.current = true;
      mapInstanceRef.current.panTo([f.latitude, f.longitude], { animate: true, duration: 0.6 });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetWorldView = () => {
    setIsCameraLocked(false);
    isCameraLockedRef.current = false;
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLng(initialCenter.latitude, initialCenter.longitude).toBounds(initialRadiusKm * 2000);
    map.flyToBounds(bounds, { padding: [32, 32], maxZoom: 9, duration: 0.8 });
  };

  const selectedFlight = flights.find((f) => f.id === selectedFlightId);
  const isOpenSkyData = flights.some((flight) => flight.dataSource === 'opensky');
  const selectedIcao24 = selectedFlight?.dataSource === 'opensky' ? selectedFlight.icao24 : undefined;

  useEffect(() => {
    const controller = new AbortController();
    setSelectedObservedTrack([]);
    if (!selectedIcao24) return () => controller.abort();

    fetch(`/api/opensky/track/${encodeURIComponent(selectedIcao24)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (Array.isArray(data?.path)) setSelectedObservedTrack(data.path);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [selectedIcao24]);

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
    <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden">

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* OpenSky / tar1090 Aircraft Stats Counter Widget (Top Left, z-[500]) */}
      <div className="map-surface absolute top-4 left-4 z-[500] flex items-center gap-3 px-3 py-2 font-mono text-xs">
        <div>
          <div className="text-[11px] text-[#737373] font-sans">{scopeLabel} · {isOpenSkyData ? 'OpenSky' : 'Simulation'}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[#b8b8b8]">{flights.length} loaded</span>
            <span className="text-[#525252]">·</span>
            <span className="text-white">{onScreenCount} on screen</span>
          </div>
        </div>

        <button
          onClick={() => setShowTarTable(!showTarTable)}
          title="Toggle OpenSky tar1090 Flight Directory Sidebar"
          className={`icon-button size-8 ${
            showTarTable
              ? 'is-active'
              : ''
          }`}
        >
          <TableProperties className="w-4 h-4" />
        </button>
      </div>

      {/* Map controls */}
      <div className="absolute bottom-5 left-4 z-[500] flex flex-col gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Map Style"
            className="icon-button"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayerMenu && (
            <div className="menu-panel absolute bottom-0 left-12 z-[600] flex w-40 flex-col gap-1 p-1.5 text-xs">
              <button
                onClick={() => {
                  setMapLayer('dark');
                  setShowLayerMenu(false);
                }}
                className={`px-2.5 py-1 text-left rounded transition-colors ${
                  mapLayer === 'dark' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dark map
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
                Satellite
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
                Street map
              </button>
            </div>
          )}
        </div>

        <div className="map-surface flex flex-col overflow-hidden">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="flex size-10 items-center justify-center border-b border-white/8 text-[#8c8c8c] hover:bg-white/5 hover:text-white"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="flex size-10 items-center justify-center text-[#8c8c8c] hover:bg-white/5 hover:text-white"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleResetWorldView}
          title="Return to your 100 km area"
          className="icon-button"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {selectedFlightId && (
          <button
            onClick={handleCenterFlight}
            title="Center Camera on Selected Flight"
            className="icon-button is-active"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* tar1090 Real-time Flight List Sidebar (Right side, toggleable, z-[1000]) */}
      {showTarTable && (
        <aside
          onClick={(e) => e.stopPropagation()}
          className="inspector-panel absolute bottom-4 right-4 top-4 z-[1000] flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden font-mono text-xs animate-in fade-in slide-in-from-right-4 duration-200"
        >
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>Aircraft on radar</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {flights.length} loaded · {onScreenCount} on screen
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
                        {f.routeKnown === false ? 'Route unknown' : `${f.origin.code}-${f.destination.code}`}
                      </td>
                      <td className="py-1 px-2 text-slate-400 truncate max-w-[70px]">
                        {f.aircraftType.split(' ')[0]}
                      </td>
                      <td className="py-1 px-2 text-slate-400">{f.squawk}</td>
                      <td className="py-1 px-2 text-right tabular-nums font-semibold" style={{ color: altColor }}>
                        {f.altitudeAvailable === false ? '—' : f.altitude.toLocaleString()}
                      </td>
                      <td className="py-1 px-2 text-right tabular-nums text-slate-400">
                        {f.velocityAvailable === false ? '—' : f.velocity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </aside>
      )}
    </div>
  );
};
