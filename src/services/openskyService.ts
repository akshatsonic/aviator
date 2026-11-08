import { Flight, Airport } from '../types/flight.ts';
import { MAJOR_AIRPORTS, MAJOR_AIRLINES } from './flightData.ts';

export interface OpenSkyCredentials {
  clientId?: string;
  clientSecret?: string;
}

export interface OpenSkyLiveResponse {
  flights: Flight[];
  creditsRemaining: number;
  dailyAllowance: number;
  isLive: boolean;
  creditCost: number;
  lastUpdated: string;
  error?: string;
}

export class OpenSkyService {
  private clientId: string = '';
  private clientSecret: string = '';

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // Track rate limits from OpenSky headers
  private creditsRemaining: number = 4000;
  private dailyAllowance: number = 4000;
  private lastCallTime: number = 0;

  // Cached state vector result to prevent burning credits on rapid polls
  private cachedResponse: {
    data: Flight[];
    timestamp: number;
    bboxKey: string;
  } | null = null;

  // Cache for callsign route resolution (callsign -> { origin, destination })
  private routeCache: Map<string, { origin: Airport; destination: Airport }> = new Map();
  private routeLookupAttempts: Map<string, number> = new Map();
  private trailCache: Map<string, Array<[number, number]>> = new Map();
  private trackCache: Map<string, { path: Array<[number, number]>; timestamp: number }> = new Map();

  constructor() {
    this.clientId = process.env.OPENSKY_CLIENT_ID || '';
    this.clientSecret = process.env.OPENSKY_CLIENT_SECRET || '';
  }

  public setCredentials(creds: OpenSkyCredentials) {
    if (creds.clientId !== undefined) this.clientId = creds.clientId;
    if (creds.clientSecret !== undefined) this.clientSecret = creds.clientSecret;
    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;
  }

  public hasCredentials(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  public async validateCredentials(): Promise<boolean> {
    if (!this.hasCredentials()) return false;
    return !!(await this.getAccessToken());
  }

  public getRateLimitStatus() {
    return {
      hasCredentials: this.hasCredentials(),
      creditsRemaining: this.creditsRemaining,
      dailyAllowance: this.dailyAllowance,
      lastCallTime: this.lastCallTime,
    };
  }

  public getCachedFlights(): Flight[] {
    return this.cachedResponse?.data || [];
  }

  /**
   * Acquire or refresh OAuth2 Access Token for OpenSky REST API
   */
  private async getAccessToken(): Promise<string | null> {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      return null;
    }

    try {
      const tokenUrl = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        console.warn(`[OpenSky] Token request failed with status: ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data.access_token) {
        this.cachedAccessToken = data.access_token;
        const expiresIn = data.expires_in || 1800;
        this.tokenExpiresAt = Date.now() + expiresIn * 1000;
        return this.cachedAccessToken;
      }
    } catch (err: any) {
      console.warn(`[OpenSky] Token acquisition error:`, err?.message || err);
    }

    return null;
  }

  /** Build OAuth2 authentication headers when credentials are configured. */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'SkyPulse-Radar/1.0 (Airspace Intelligence)',
    };

    const token = await this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      return headers;
    }

    return headers;
  }

  private calculateCreditCost(bbox?: { lamin: number; lomin: number; lamax: number; lomax: number }): number {
    if (!bbox) return 4;
    const area = Math.max(0, bbox.lamax - bbox.lamin) * Math.max(0, bbox.lomax - bbox.lomin);
    if (area <= 25) return 1;
    if (area <= 100) return 2;
    if (area <= 400) return 3;
    return 4;
  }

  private calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    const earthRadiusNm = 3440.065;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return earthRadiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private formatUtcTime(timestampMs: number): string {
    return new Date(timestampMs).toISOString().slice(11, 16);
  }

  private getAircraftCategory(category: number | null | undefined): string {
    const categories: Record<number, string> = {
      2: 'Light', 3: 'Small', 4: 'Large', 5: 'High Vortex Large', 6: 'Heavy',
      7: 'High Performance', 8: 'Rotorcraft', 9: 'Glider', 10: 'Lighter-than-air',
      11: 'Parachutist', 12: 'Ultralight', 14: 'UAV', 15: 'Space / Trans-atmospheric',
    };
    return categories[category || 0] || 'Unknown';
  }

  private getPositionSource(source: number | null | undefined): Flight['positionSource'] {
    return ['ADS-B', 'ASTERIX', 'MLAT', 'FLARM'][source ?? -1] as Flight['positionSource'] || 'Unknown';
  }

  private cacheRouteResults(routes: any[]) {
    for (const route of routes) {
      if (!route?.callsign || route._airport_codes_iata === 'unknown') continue;

      const iataCodes = typeof route._airport_codes_iata === 'string'
        ? route._airport_codes_iata.split('-').filter(Boolean)
        : [];
      const routeAirports = Array.isArray(route._airports) ? route._airports : [];
      const first = routeAirports[0];
      const last = routeAirports[routeAirports.length - 1];

      const toAirport = (raw: any, fallbackIata?: string): Airport | undefined => {
        const iata = String(raw?.iata || fallbackIata || '').toUpperCase();
        if (iata && MAJOR_AIRPORTS[iata]) return MAJOR_AIRPORTS[iata];
        const lat = Number(raw?.lat);
        const lon = Number(raw?.lon);
        if (!iata || !Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
        return {
          code: iata,
          name: raw?.name || `${iata} Airport`,
          city: raw?.location || raw?.name || iata,
          country: raw?.countryiso2 || '',
          lat,
          lon,
          timezone: 'UTC',
        };
      };

      const origin = toAirport(first, iataCodes[0]);
      const destination = toAirport(last, iataCodes[iataCodes.length - 1]);
      if (origin && destination && origin.code !== destination.code) {
        this.routeCache.set(String(route.callsign).trim().toUpperCase(), { origin, destination });
      }
    }
  }

  private async queryRouteProvider(url: string, planes: Array<{ callsign: string; lat: number; lng: number }>) {
    if (planes.length === 0) return;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ planes }),
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) {
        console.warn(`[Route lookup] ${new URL(url).hostname} returned HTTP ${response.status}`);
        return;
      }
      const routes = await response.json();
      if (Array.isArray(routes)) this.cacheRouteResults(routes);
    } catch (error: any) {
      console.warn(`[Route lookup] ${new URL(url).hostname} failed: ${error?.message || error}`);
      // Route enrichment is best-effort and must never interrupt live telemetry.
    }
  }

  private async queryAdsbDbRoutes(planes: Array<{ callsign: string; lat: number; lng: number }>) {
    const toAirport = (raw: any): Airport | undefined => {
      const code = String(raw?.iata_code || raw?.icao_code || '').toUpperCase();
      const lat = Number(raw?.latitude);
      const lon = Number(raw?.longitude);
      if (!code || !Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
      if (MAJOR_AIRPORTS[code]) return MAJOR_AIRPORTS[code];
      return {
        code,
        name: raw?.name || `${code} Airport`,
        city: raw?.municipality || raw?.name || code,
        country: raw?.country_name || raw?.country_iso_name || '',
        lat,
        lon,
        timezone: 'UTC',
      };
    };

    // Keep concurrency deliberately small; this provider exposes one callsign per request.
    for (let index = 0; index < planes.length; index += 8) {
      const batch = planes.slice(index, index + 8);
      await Promise.all(batch.map(async ({ callsign }) => {
        try {
          const response = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(3500),
          });
          if (!response.ok) return;
          const payload = await response.json();
          const route = payload?.response?.flightroute;
          const origin = toAirport(route?.origin);
          const destination = toAirport(route?.destination);
          if (origin && destination && origin.code !== destination.code) {
            this.routeCache.set(callsign, { origin, destination });
          }
        } catch {
          // A missing optional fallback must not affect live aircraft updates.
        }
      }));
    }
  }

  public async resolveRouteNow(callsign: string, lat: number, lng: number): Promise<{ origin: Airport; destination: Airport } | null> {
    const normalizedCallsign = callsign.trim().toUpperCase();
    if (!normalizedCallsign || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const cached = this.routeCache.get(normalizedCallsign);
    if (cached) return cached;

    const plane = [{ callsign: normalizedCallsign, lat, lng }];
    await this.queryRouteProvider('https://flightroutes.opensky-network.org/api/routeset', plane);
    if (!this.routeCache.has(normalizedCallsign)) {
      await this.queryRouteProvider('https://api.adsb.lol/api/0/routeset', plane);
    }
    if (!this.routeCache.has(normalizedCallsign)) {
      await this.queryAdsbDbRoutes(plane);
    }
    return this.routeCache.get(normalizedCallsign) || null;
  }

  /** Resolve optional callsign routes, falling back to adsb.lol for unresolved aircraft. */
  public async enrichRoutes(planes: Array<{ callsign: string; lat: number; lng: number }>) {
    const retryAfterMs = 6 * 60 * 60 * 1000;
    const now = Date.now();
    const normalizedPlanes = planes.map((plane) => ({ ...plane, callsign: plane.callsign.trim().toUpperCase() }));
    const uniquePlanes = Array.from(new Map(normalizedPlanes.map((plane) => [plane.callsign, plane])).values());
    const unknownPlanes = uniquePlanes.filter(({ callsign }) =>
      !this.routeCache.has(callsign) && now - (this.routeLookupAttempts.get(callsign) || 0) > retryAfterMs
    ).slice(0, 80);
    if (unknownPlanes.length === 0) return;
    unknownPlanes.forEach(({ callsign }) => this.routeLookupAttempts.set(callsign, now));

    await this.queryRouteProvider('https://flightroutes.opensky-network.org/api/routeset', unknownPlanes);

    const unresolvedPlanes = unknownPlanes.filter(({ callsign }) => !this.routeCache.has(callsign));
    await this.queryRouteProvider('https://api.adsb.lol/api/0/routeset', unresolvedPlanes);

    const stillUnresolvedPlanes = unresolvedPlanes.filter(({ callsign }) => !this.routeCache.has(callsign));
    await this.queryAdsbDbRoutes(stillUnresolvedPlanes);
  }

  public async fetchLiveTrack(icao24: string): Promise<{ path: Array<[number, number]>; lastUpdated: string; error?: string }> {
    const normalizedIcao24 = icao24.toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(normalizedIcao24)) {
      return { path: [], lastUpdated: new Date().toISOString(), error: 'Invalid ICAO24 address' };
    }

    const cached = this.trackCache.get(normalizedIcao24);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return { path: cached.path, lastUpdated: new Date(cached.timestamp).toISOString() };
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(
        `https://opensky-network.org/api/tracks/all?icao24=${normalizedIcao24}&time=0`,
        { headers, signal: AbortSignal.timeout(7000) }
      );
      if (!res.ok) throw new Error(`OpenSky track error HTTP ${res.status}`);

      const data = await res.json();
      const rawPath: any[][] = Array.isArray(data.path) ? data.path : [];
      const path = rawPath
        .filter((point) => point[1] != null && point[2] != null)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map((point) => [Number(point[1]), Number(point[2])] as [number, number]);
      const timestamp = Date.now();
      this.trackCache.set(normalizedIcao24, { path, timestamp });
      return { path, lastUpdated: new Date(timestamp).toISOString() };
    } catch (error: any) {
      return {
        path: [],
        lastUpdated: new Date().toISOString(),
        error: error?.message || 'Failed to retrieve OpenSky track',
      };
    }
  }

  /**
   * Fetch Live State Vectors from OpenSky REST API
   * Bounding-box credit cost varies from 1 to 4 based on its area.
   */
  public async fetchLiveStates(bbox?: {
    lamin: number;
    lomin: number;
    lamax: number;
    lomax: number;
  }): Promise<OpenSkyLiveResponse> {
    const bboxKey = bbox
      ? `${bbox.lamin.toFixed(2)},${bbox.lomin.toFixed(2)},${bbox.lamax.toFixed(2)},${bbox.lomax.toFixed(2)}`
      : 'global';
    const creditCost = this.calculateCreditCost(bbox);

    // Short cache prevents rapid duplicate requests from consuming API credits.
    const now = Date.now();
    if (this.cachedResponse && this.cachedResponse.bboxKey === bboxKey && now - this.cachedResponse.timestamp < 8000) {
      return {
        flights: this.cachedResponse.data,
        creditsRemaining: this.creditsRemaining,
        dailyAllowance: this.dailyAllowance,
        isLive: true,
        creditCost,
        lastUpdated: new Date(this.cachedResponse.timestamp).toISOString(),
      };
    }

    let url = 'https://opensky-network.org/api/states/all';
    if (bbox) {
      const q = new URLSearchParams({
        lamin: bbox.lamin.toFixed(4),
        lomin: bbox.lomin.toFixed(4),
        lamax: bbox.lamax.toFixed(4),
        lomax: bbox.lomax.toFixed(4),
        extended: '1',
      });
      url += `?${q.toString()}`;
    } else {
      url += '?extended=1';
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(7000),
      });

      // Track OpenSky credit rate limits from live headers
      const remainingHeader = res.headers.get('X-Rate-Limit-Remaining');
      if (remainingHeader) {
        this.creditsRemaining = parseInt(remainingHeader, 10);
        this.dailyAllowance = Math.max(this.dailyAllowance, this.creditsRemaining);
      } else {
        // Decrement local tracking estimate
        this.creditsRemaining = Math.max(0, this.creditsRemaining - creditCost);
      }
      this.lastCallTime = now;

      if (!res.ok) {
        throw new Error(`OpenSky API error HTTP ${res.status}: ${res.statusText}`);
      }

      const raw = await res.json();
      const rawStates: any[][] = raw.states || [];

      // Parse OpenSky raw state vectors into clean Flight objects
      const liveFlights: Flight[] = [];
      const callsignsToEnrich: Array<{ callsign: string; lat: number; lng: number }> = [];

      for (const s of rawStates) {
        const icao24 = s[0];
        const callsign = (s[1] || '').trim().toUpperCase();
        const positionTime = s[3] ?? null;
        const lastContact = s[4] ?? null;
        const lon = s[5];
        const lat = s[6];
        const baroAlt = s[7];
        const onGround = s[8];
        const velMs = s[9];
        const headingDeg = s[10];
        const vertRateMs = s[11];
        const geoAlt = s[13];
        const squawk = s[14] || '—';
        const positionSource = s[16];
        const category = s[17];

        // Skip aircraft without valid GPS coordinates
        if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) continue;

        // Skip ground taxiing planes if in flight view
        if (onGround) continue;

        const altitudeFt = baroAlt != null ? Math.round(baroAlt * 3.28084) : 0;
        const velocityKts = velMs != null ? Math.round(velMs * 1.94384) : 0;
        const heading = headingDeg != null ? Math.round(headingDeg) : 0;
        const verticalRateFpm = vertRateMs != null ? Math.round(vertRateMs * 196.85) : 0;

        // Determine airline
        const prefix3 = callsign.slice(0, 3).toUpperCase();
        const matchedAirline = MAJOR_AIRLINES.find(a => a.icao === prefix3);
        const airlineName = matchedAirline ? matchedAirline.name : 'Operator unknown';
        const airlineCode = matchedAirline ? matchedAirline.code : prefix3.slice(0, 2);

        // A callsign-derived route is an estimate; OpenSky state vectors contain no route.
        const cachedRoute = this.routeCache.get(callsign);
        const unknownAirport: Airport = {
          code: '—', name: 'Unknown airport', city: 'Unknown', country: '',
          lat, lon, timezone: 'UTC',
        };
        const originAirport = cachedRoute?.origin || unknownAirport;
        const destAirport = cachedRoute?.destination || unknownAirport;

        if (!cachedRoute && callsign) {
          callsignsToEnrich.push({ callsign, lat, lng: lon });
        }

        const trail = this.trailCache.get(icao24) || [];
        const lastPoint = trail[trail.length - 1];
        if (!lastPoint || lastPoint[0] !== lat || lastPoint[1] !== lon) {
          trail.push([lat, lon]);
          if (trail.length > 120) trail.shift();
          this.trailCache.set(icao24, trail);
        }

        const routeKnown = !!cachedRoute;
        const distanceToDestination = routeKnown
          ? this.calculateDistanceNm(lat, lon, destAirport.lat, destAirport.lon)
          : 0;
        const distanceFromOrigin = routeKnown
          ? this.calculateDistanceNm(originAirport.lat, originAirport.lon, lat, lon)
          : 0;
        const etaAvailable = routeKnown && velocityKts >= 100;
        const eta = etaAvailable
          ? this.formatUtcTime(Date.now() + (distanceToDestination / velocityKts) * 3600000)
          : '';
        const progress = routeKnown && distanceFromOrigin + distanceToDestination > 0
          ? Math.round((distanceFromOrigin / (distanceFromOrigin + distanceToDestination)) * 100)
          : 0;

        liveFlights.push({
          id: `osky-${icao24}`,
          flightNumber: callsign || icao24.toUpperCase(),
          callsign: callsign || icao24.toUpperCase(),
          airline: airlineName,
          airlineCode: airlineCode,
          aircraftType: 'Unknown aircraft type',
          aircraftCategory: this.getAircraftCategory(category),
          registration: '—',
          origin: originAirport,
          destination: destAirport,
          latitude: lat,
          longitude: lon,
          altitude: altitudeFt,
          velocity: velocityKts,
          heading: heading,
          verticalRate: verticalRateFpm,
          squawk: squawk,
          status: 'unknown',
          delayMinutes: 0,
          departureScheduled: '',
          departureActual: '',
          arrivalScheduled: '',
          arrivalEstimated: eta,
          progressPercent: progress,
          trail: [...trail],
          dataSource: 'opensky',
          routeKnown,
          routeSource: routeKnown ? 'callsign_estimate' : 'unknown',
          scheduleKnown: false,
          etaType: etaAvailable ? 'direct_estimate' : 'unavailable',
          icao24,
          positionTime,
          lastContact,
          geoAltitude: geoAlt != null ? Math.round(geoAlt * 3.28084) : null,
          positionSource: this.getPositionSource(positionSource),
          altitudeAvailable: baroAlt != null,
          velocityAvailable: velMs != null,
          trackAvailable: headingDeg != null,
          verticalRateAvailable: vertRateMs != null,
        });
      }

      // Asynchronously enrich routes with OpenSky RouteSet API in background
      if (callsignsToEnrich.length > 0) {
        this.enrichRoutes(callsignsToEnrich);
      }

      // Cache valid result
      this.cachedResponse = {
        data: liveFlights,
        timestamp: now,
        bboxKey: bboxKey,
      };

      return {
        flights: liveFlights,
        creditsRemaining: this.creditsRemaining,
        dailyAllowance: this.dailyAllowance,
        isLive: true,
        creditCost,
        lastUpdated: new Date(now).toISOString(),
      };
    } catch (err: any) {
      console.warn(`[OpenSky Live] Failed to fetch live OpenSky data:`, err?.message || err);
      return {
        flights: [],
        creditsRemaining: this.creditsRemaining,
        dailyAllowance: this.dailyAllowance,
        isLive: false,
        creditCost: 0,
        lastUpdated: new Date(now).toISOString(),
        error: err?.message || 'Failed to reach OpenSky Network servers',
      };
    }
  }
}
