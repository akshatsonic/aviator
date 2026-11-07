import { Flight, Airport } from '../types/flight.ts';
import { MAJOR_AIRPORTS, MAJOR_AIRLINES } from './flightData.ts';

export interface OpenSkyCredentials {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
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
  private username: string = '';
  private password: string = '';

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

  constructor() {
    this.clientId = process.env.OPENSKY_CLIENT_ID || '';
    this.clientSecret = process.env.OPENSKY_CLIENT_SECRET || '';
    this.username = process.env.OPENSKY_USERNAME || '';
    this.password = process.env.OPENSKY_PASSWORD || '';
  }

  public setCredentials(creds: OpenSkyCredentials) {
    if (creds.clientId !== undefined) this.clientId = creds.clientId;
    if (creds.clientSecret !== undefined) this.clientSecret = creds.clientSecret;
    if (creds.username !== undefined) this.username = creds.username;
    if (creds.password !== undefined) this.password = creds.password;
    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;
  }

  public hasCredentials(): boolean {
    return !!((this.clientId && this.clientSecret) || (this.username && this.password));
  }

  public getRateLimitStatus() {
    return {
      hasCredentials: this.hasCredentials(),
      creditsRemaining: this.creditsRemaining,
      dailyAllowance: this.dailyAllowance,
      lastCallTime: this.lastCallTime,
    };
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

  /**
   * Build authentication headers (OAuth2 Bearer or Basic Auth)
   */
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

    if (this.username && this.password) {
      const basic = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    return headers;
  }

  /**
   * Batch resolve flight routes using OpenSky's official RouteSet API
   */
  public async enrichRoutes(callsigns: string[]) {
    const unknownCallsigns = callsigns.filter(c => !this.routeCache.has(c)).slice(0, 80);
    if (unknownCallsigns.length === 0) return;

    try {
      const res = await fetch('https://flightroutes.opensky-network.org/api/routeset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          planes: unknownCallsigns.map(cs => ({ callsign: cs })),
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const routes: any[] = await res.json();
        for (const r of routes) {
          if (r.callsign && r._airport_codes_iata && r._airport_codes_iata !== 'unknown') {
            const [originIata, destIata] = r._airport_codes_iata.split('-');
            const origin = MAJOR_AIRPORTS[originIata] || {
              code: originIata,
              name: `${originIata} Airport`,
              city: originIata,
              country: 'International',
              lat: 0,
              lon: 0,
              timezone: 'UTC',
            };
            const destination = MAJOR_AIRPORTS[destIata] || {
              code: destIata,
              name: `${destIata} Airport`,
              city: destIata,
              country: 'International',
              lat: 0,
              lon: 0,
              timezone: 'UTC',
            };
            this.routeCache.set(r.callsign, { origin, destination });
          }
        }
      }
    } catch {
      // Ignore background route lookup timeouts
    }
  }

  /**
   * Fetch Live State Vectors from OpenSky REST API
   * Passing bbox costs only 1 credit per query; full global query costs 4 credits.
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

    // 8-second client cache prevents accidental burning of user's 4,000 credit daily allowance
    const now = Date.now();
    if (this.cachedResponse && this.cachedResponse.bboxKey === bboxKey && now - this.cachedResponse.timestamp < 8000) {
      return {
        flights: this.cachedResponse.data,
        creditsRemaining: this.creditsRemaining,
        dailyAllowance: this.dailyAllowance,
        isLive: true,
        creditCost: bbox ? 1 : 4,
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
      });
      url += `?${q.toString()}`;
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
      } else {
        // Decrement local tracking estimate
        this.creditsRemaining = Math.max(0, this.creditsRemaining - (bbox ? 1 : 4));
      }
      this.lastCallTime = now;

      if (!res.ok) {
        throw new Error(`OpenSky API error HTTP ${res.status}: ${res.statusText}`);
      }

      const raw = await res.json();
      const rawStates: any[][] = raw.states || [];

      // Parse OpenSky raw state vectors into clean Flight objects
      const liveFlights: Flight[] = [];
      const callsignsToEnrich: string[] = [];

      for (const s of rawStates) {
        const icao24 = s[0];
        const callsign = (s[1] || '').trim();
        const originCountry = s[2] || 'Global';
        const lon = s[5];
        const lat = s[6];
        const baroAlt = s[7];
        const onGround = s[8];
        const velMs = s[9];
        const headingDeg = s[10];
        const vertRateMs = s[11];
        const squawk = s[14] || '1200';

        // Skip aircraft without valid GPS coordinates
        if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) continue;

        // Skip ground taxiing planes if in flight view
        if (onGround) continue;

        const altitudeFt = baroAlt !== null ? Math.round(baroAlt * 3.28084) : 32000;
        const velocityKts = velMs !== null ? Math.round(velMs * 1.94384) : 460;
        const heading = headingDeg !== null ? Math.round(headingDeg) : 0;
        const verticalRateFpm = vertRateMs !== null ? Math.round(vertRateMs * 196.85) : 0;

        // Determine airline
        const prefix3 = callsign.slice(0, 3).toUpperCase();
        const matchedAirline = MAJOR_AIRLINES.find(a => a.icao === prefix3);
        const airlineName = matchedAirline ? matchedAirline.name : `${originCountry} Commercial`;
        const airlineCode = matchedAirline ? matchedAirline.code : prefix3.slice(0, 2);

        // Determine route from cache or fallback default
        const cachedRoute = this.routeCache.get(callsign);
        const originAirport = cachedRoute?.origin || MAJOR_AIRPORTS.DEL;
        const destAirport = cachedRoute?.destination || MAJOR_AIRPORTS.BLR;

        if (!cachedRoute && callsign) {
          callsignsToEnrich.push(callsign);
        }

        liveFlights.push({
          id: `osky-${icao24}`,
          flightNumber: callsign || icao24.toUpperCase(),
          callsign: callsign || icao24.toUpperCase(),
          airline: airlineName,
          airlineCode: airlineCode,
          aircraftType: matchedAirline?.fleet[0] || 'Boeing 737 / Airbus A320',
          aircraftCategory: altitudeFt > 36000 ? 'Heavy' : 'Medium',
          registration: icao24.toUpperCase(),
          origin: originAirport,
          destination: destAirport,
          latitude: lat,
          longitude: lon,
          altitude: altitudeFt,
          velocity: velocityKts,
          heading: heading,
          verticalRate: verticalRateFpm,
          squawk: squawk,
          status: 'on_time',
          delayMinutes: 0,
          departureScheduled: '14:00',
          departureActual: '14:00',
          arrivalScheduled: '18:00',
          arrivalEstimated: '18:00',
          progressPercent: 50,
          trail: [[lat, lon]],
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
        creditCost: bbox ? 1 : 4,
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
