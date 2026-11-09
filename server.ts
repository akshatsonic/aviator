import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { FlightEngine, MAJOR_AIRPORTS, MAJOR_AIRLINES } from './src/services/flightData.ts';
import { OpenSkyService } from './src/services/openskyService.ts';
import { Flight } from './src/types/flight.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize the global real-time flight simulation & tracking engine
const flightEngine = new FlightEngine();
const openSkyService = new OpenSkyService();

function summarizeFlights(flights: Flight[]) {
  const count = flights.length;
  const flightsWithAltitude = flights.filter((flight) => flight.altitudeAvailable !== false);
  const flightsWithVelocity = flights.filter((flight) => flight.velocityAvailable !== false);
  return {
    totalAirborne: count,
    totalTracked: count,
    onTimeCount: flights.filter((flight) => flight.status === 'on_time').length,
    delayedCount: flights.filter((flight) => flight.status === 'delayed').length,
    avgAltitude: flightsWithAltitude.length ? Math.round(flightsWithAltitude.reduce((sum, flight) => sum + flight.altitude, 0) / flightsWithAltitude.length) : 0,
    avgVelocity: flightsWithVelocity.length ? Math.round(flightsWithVelocity.reduce((sum, flight) => sum + flight.velocity, 0) / flightsWithVelocity.length) : 0,
    lastUpdated: new Date().toISOString(),
  };
}

function parseBounds(query: express.Request['query']): { lamin: number; lomin: number; lamax: number; lomax: number } | undefined {
  const values = ['lamin', 'lomin', 'lamax', 'lomax'].map((key) => Number(query[key]));
  if (values.some((value) => !Number.isFinite(value))) return undefined;
  const [lamin, lomin, lamax, lomax] = values;
  if (lamin >= lamax || lomin >= lomax || lamin < -90 || lamax > 90 || lomin < -180 || lomax > 180) return undefined;
  return { lamin, lomin, lamax, lomax };
}

// Long-running processes can tick continuously. Vercel Functions instead tick
// when they receive a request because their instances scale to zero when idle.
if (!process.env.VERCEL) {
  setInterval(() => {
    flightEngine.tick();
  }, 2500);
}

// Initialize Gemini client if API key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// REST Endpoint: Get live tracked flights & airspace summary
app.get('/api/flights', (req, res) => {
  if (process.env.VERCEL) flightEngine.tick();
  const bbox = parseBounds(req.query);
  const flights = flightEngine.getFlights().filter((flight) => !bbox || (
    flight.latitude >= bbox.lamin && flight.latitude <= bbox.lamax &&
    flight.longitude >= bbox.lomin && flight.longitude <= bbox.lomax
  ));
  const summary = summarizeFlights(flights);
  res.json({ flights, summary });
});

// OpenSky Rate Limit & Status Endpoint
app.get('/api/opensky/status', (_req, res) => {
  res.json(openSkyService.getRateLimitStatus());
});

app.get('/api/opensky/track/:icao24', async (req, res) => {
  const track = await openSkyService.fetchLiveTrack(req.params.icao24);
  res.json(track);
});

app.get('/api/routes/:callsign', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const route = await openSkyService.resolveRouteNow(req.params.callsign, lat, lng);
  if (!route) {
    res.status(404).json({ routeKnown: false });
    return;
  }
  res.json({ routeKnown: true, routeSource: 'callsign_estimate', ...route });
});

// Configure or update OpenSky credentials dynamically
app.post('/api/opensky/credentials', async (req, res) => {
  const { clientId, clientSecret } = req.body || {};
  openSkyService.setCredentials({ clientId, clientSecret });
  const valid = await openSkyService.validateCredentials();
  if (!valid) {
    res.status(401).json({ success: false, error: 'OpenSky rejected these OAuth credentials' });
    return;
  }
  res.json({ success: true, ...openSkyService.getRateLimitStatus() });
});

// Fetch Live OpenSky Flights (supports optional bounding box lamin, lomin, lamax, lomax)
app.get('/api/opensky/live', async (req, res) => {
  const bbox = parseBounds(req.query);

  const liveResult = await openSkyService.fetchLiveStates(bbox);
  if (liveResult.isLive) {
    res.json({ ...liveResult, summary: summarizeFlights(liveResult.flights) });
  } else {
    // Keep the last live positions in the client rather than silently substituting simulation data.
    res.json(liveResult);
  }
});

// Advanced flight search & query matching engine
function findRelevantAirspaceFlights(query: string, allFlights: Flight[]): {
  flights: Flight[];
  contextDescription: string;
  matchedNumbers: string[];
} {
  const q = query.toLowerCase().trim();

  // 1. Specific flight number or callsign match
  const flightNumMatches = allFlights.filter(f =>
    q.includes(f.flightNumber.toLowerCase()) ||
    q.includes(f.callsign.toLowerCase()) ||
    (f.airlineCode && q.includes(f.airlineCode.toLowerCase()) && q.match(/\d{2,4}/))
  );
  if (flightNumMatches.length > 0) {
    const primary = flightNumMatches[0];
    return {
      flights: flightNumMatches.slice(0, 5),
      contextDescription: `Flight ${primary.flightNumber} (${primary.airline})`,
      matchedNumbers: flightNumMatches.slice(0, 5).map(f => f.flightNumber),
    };
  }

  // 2. Airport and City identification (including BLR, BOM, DEL, DXB, LHR, etc.)
  let matchedAirportCode: string | null = null;
  const isEnrouteTo =
    q.includes('to ') ||
    q.includes('enroute to') ||
    q.includes('en route to') ||
    q.includes('heading to') ||
    q.includes('landing') ||
    q.includes('arriving') ||
    q.includes('arrival') ||
    q.includes('destined') ||
    q.includes('inbound');

  const isDepartingFrom =
    q.includes('from ') ||
    q.includes('departing') ||
    q.includes('departure') ||
    q.includes('leaving') ||
    q.includes('out of') ||
    q.includes('outbound');

  // Check 3-letter IATA codes
  const words = q.split(/[^a-z0-9]+/);
  for (const w of words) {
    if (w.length === 3 && MAJOR_AIRPORTS[w.toUpperCase()]) {
      matchedAirportCode = w.toUpperCase();
      break;
    }
  }

  // Check city names and common regional aliases
  if (!matchedAirportCode) {
    if (q.includes('blr') || q.includes('bangalore') || q.includes('bengaluru')) matchedAirportCode = 'BLR';
    else if (q.includes('bom') || q.includes('mumbai') || q.includes('bombay')) matchedAirportCode = 'BOM';
    else if (q.includes('del') || q.includes('delhi') || q.includes('new delhi')) matchedAirportCode = 'DEL';
    else if (q.includes('dxb') || q.includes('dubai')) matchedAirportCode = 'DXB';
    else if (q.includes('lhr') || q.includes('heathrow') || q.includes('london')) matchedAirportCode = 'LHR';
    else if (q.includes('jfk') || q.includes('new york') || q.includes('nyc')) matchedAirportCode = 'JFK';
    else if (q.includes('hnd') || q.includes('haneda') || q.includes('tokyo')) matchedAirportCode = 'HND';
    else if (q.includes('sin') || q.includes('changi') || q.includes('singapore')) matchedAirportCode = 'SIN';
    else if (q.includes('fra') || q.includes('frankfurt')) matchedAirportCode = 'FRA';
    else if (q.includes('cdg') || q.includes('paris')) matchedAirportCode = 'CDG';
    else if (q.includes('syd') || q.includes('sydney')) matchedAirportCode = 'SYD';
    else if (q.includes('sfo') || q.includes('san francisco')) matchedAirportCode = 'SFO';
    else if (q.includes('lax') || q.includes('los angeles')) matchedAirportCode = 'LAX';
    else if (q.includes('ams') || q.includes('amsterdam')) matchedAirportCode = 'AMS';
    else if (q.includes('ist') || q.includes('istanbul')) matchedAirportCode = 'IST';
    else {
      for (const [code, ap] of Object.entries(MAJOR_AIRPORTS)) {
        if (q.includes(ap.city.toLowerCase())) {
          matchedAirportCode = code;
          break;
        }
      }
    }
  }

  if (matchedAirportCode) {
    const ap = MAJOR_AIRPORTS[matchedAirportCode];
    let matched: Flight[] = [];
    if (isEnrouteTo && !isDepartingFrom) {
      matched = allFlights.filter(f => f.destination.code === matchedAirportCode);
    } else if (isDepartingFrom && !isEnrouteTo) {
      matched = allFlights.filter(f => f.origin.code === matchedAirportCode);
    } else {
      matched = allFlights.filter(f => f.destination.code === matchedAirportCode || f.origin.code === matchedAirportCode);
    }

    if (matched.length > 0) {
      const airportName = ap ? `${ap.city} (${ap.code})` : matchedAirportCode;
      const directionDesc = isEnrouteTo ? `en route to ${airportName}` : isDepartingFrom ? `departing from ${airportName}` : `connected to ${airportName}`;
      return {
        flights: matched,
        contextDescription: directionDesc,
        matchedNumbers: matched.slice(0, 6).map(f => f.flightNumber),
      };
    }
  }

  // 3. Airline match
  for (const air of MAJOR_AIRLINES) {
    if (q.includes(air.name.toLowerCase()) || q.includes(air.code.toLowerCase()) || q.includes(air.icao.toLowerCase())) {
      const matched = allFlights.filter(f => f.airline.toLowerCase().includes(air.name.toLowerCase()) || f.airlineCode === air.code);
      if (matched.length > 0) {
        return {
          flights: matched,
          contextDescription: `${air.name} flights`,
          matchedNumbers: matched.slice(0, 6).map(f => f.flightNumber),
        };
      }
    }
  }

  // 4. Delay query
  if (q.includes('delay') || q.includes('late')) {
    const delayed = allFlights.filter(f => f.status === 'delayed');
    return {
      flights: delayed,
      contextDescription: 'delayed flights',
      matchedNumbers: delayed.slice(0, 6).map(f => f.flightNumber),
    };
  }

  // Default: featured sample
  return {
    flights: allFlights.slice(0, 10),
    contextDescription: 'monitored global flights',
    matchedNumbers: allFlights.slice(0, 4).map(f => f.flightNumber),
  };
}

// Generate intelligent fallback response
function generateFallbackChatResponse(query: string, flights: Flight[]) {
  const q = query.toLowerCase();
  const routeLabel = (flight: Flight) => flight.routeKnown === false
    ? 'Route unavailable'
    : `${flight.origin.city} (${flight.origin.code}) ➔ ${flight.destination.city} (${flight.destination.code})${flight.routeSource === 'callsign_estimate' ? ' (callsign-derived estimate)' : ''}`;
  const statusLabel = (flight: Flight) => flight.status === 'delayed'
    ? `Delayed +${flight.delayMinutes}m`
    : flight.status === 'unknown' ? 'Schedule status unavailable' : 'On Time';
  const etaLabel = (flight: Flight) => flight.arrivalEstimated
    ? `${flight.arrivalEstimated}${flight.etaType === 'direct_estimate' ? ' UTC (direct estimate)' : ''}`
    : 'Unavailable';

  // Check for OpenSky tracking mechanism inquiry
  if (q.includes('opensky') || q.includes('how do they') || q.includes('how do they do that') || q.includes('track all') || q.includes('10615') || q.includes('10,615') || q.includes('on screen')) {
    const featured = flights.slice(0, 3).map(f => f.flightNumber);
    return {
      reply: `### How OpenSky Tracks 10,000+ Aircraft Simultaneously\n\n1. **Crowdsourced 1090 MHz SDR Feeders**: OpenSky does not own a giant radar. Instead, thousands of aviation volunteers worldwide connect low-cost USB Software Defined Radios (RTL-SDR dongles on Raspberry Pis) tuned to **1090 MHz**. Commercial planes broadcast unencrypted **Mode-S ADS-B** signals containing their GPS position, altitude, squawk, and airspeed twice every second.\n2. **readsb Ingestion Engine**: OpenSky servers collect all binary packets from these volunteer antennas, deduplicate them, and dump a global JSON file (\`aircraft.json\`) containing every transponder active in the world (~10,600+).\n3. **tar1090 "On Screen" vs "Total"**: The browser downloads the snapshot and checks each aircraft's coordinates against your visible map rectangle (\`bounds.contains(lat, lon)\`). If you zoom into Europe, the "On Screen" count drops from 10,000 to ~3,000.\n4. **Why public apps can't fetch all 10,615 directly**: Notice the yellow **401 - session expired / rate limit** error in the OpenSky screenshot. OpenSky heavily rate-limits or blocks unauthorized automated API access from datacenter IPs. That's why SkyPulse runs an ultra-high density internal dead-reckoning engine with 1,650+ airborne aircraft and dynamic viewport culling.`,
      matchedFlightNumbers: featured,
      suggestedQueries: ['Show aircraft near London', 'Which aircraft are moving fastest?', 'Explain OpenSky tracks'],
    };
  }

  const { flights: relevant, contextDescription, matchedNumbers } = findRelevantAirspaceFlights(query, flights);

  // If specific single flight matched
  if (relevant.length === 1 && (q.includes(relevant[0].flightNumber.toLowerCase()) || q.includes(relevant[0].callsign.toLowerCase()))) {
    const f = relevant[0];
    return {
      reply: `**Flight ${f.flightNumber}** (${f.airline}) is currently observed at **FL${Math.round(f.altitude / 100)}** (${f.altitude.toLocaleString()} ft), moving at **${f.velocity} kts** on true track **${f.heading}°**.\n\n• **Route**: ${routeLabel(f)}\n• **Aircraft type**: ${f.aircraftType}\n• **Schedule status**: ${statusLabel(f)}\n• **ETA**: ${etaLabel(f)}\n\nClick the card below to lock onto this aircraft on the radar map.`,
      matchedFlightNumbers: [f.flightNumber],
      suggestedQueries: ['Show aircraft in this viewport', 'What telemetry does OpenSky provide?', 'Explain this aircraft track'],
    };
  }

  // If multiple flights matched (e.g. enroute to BLR, or delayed)
  if (relevant.length > 0 && matchedNumbers.length > 0 && contextDescription !== 'monitored global flights') {
    const listSummary = relevant.slice(0, 5).map(f =>
      `• **${f.flightNumber}** (${f.airline}): ${routeLabel(f)} | FL${Math.round(f.altitude / 100)} · ${f.velocity} kts · ${statusLabel(f)} · ETA ${etaLabel(f)}`
    ).join('\n');

    return {
      reply: `Found **${relevant.length} active flights** ${contextDescription}:\n\n${listSummary}\n\nYou can click on any flight card below to center and lock onto it directly on the tactical radar.`,
      matchedFlightNumbers: matchedNumbers,
      suggestedQueries: ['What is the fastest aircraft?', 'Which one is highest?', 'Explain these route estimates'],
    };
  }

  // General overview
  const featured = flights.slice(0, 3).map(f => f.flightNumber);
  return {
    reply: `SkyPulse currently has **${flights.length} aircraft** loaded. I can report observed position, altitude, ground speed, true track, vertical rate, and callsign-derived route estimates when available. OpenSky does not provide live airline schedules or delay status.`,
    matchedFlightNumbers: featured,
    suggestedQueries: ['Which aircraft are moving fastest?', 'Show available BLR route estimates', 'Explain OpenSky telemetry'],
  };
}

// REST Endpoint: AI Airspace Copilot Chat (using gemini-3.1-flash-lite)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, useLiveData } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const liveFlights = useLiveData ? openSkyService.getCachedFlights() : [];
    const currentFlights = useLiveData ? liveFlights : flightEngine.getFlights();

    // If Gemini client is not initialized, use intelligent local aviation engine
    if (!aiClient) {
      const fallback = generateFallbackChatResponse(message, currentFlights);
      res.json(fallback);
      return;
    }

    // Identify relevant flights for user's query and prioritize them in Gemini's context
    const { flights: relevantMatches } = findRelevantAirspaceFlights(message, currentFlights);
    const prioritizedIds = new Set(relevantMatches.map(f => f.id));
    const combinedFlights = [
      ...relevantMatches.slice(0, 20),
      ...currentFlights.filter(f => !prioritizedIds.has(f.id)).slice(0, 25),
    ];

    const flightSnapshot = combinedFlights.map(f => ({
      flightNumber: f.flightNumber,
      callsign: f.callsign,
      airline: f.airline,
      origin: `${f.origin.code} (${f.origin.city})`,
      destination: `${f.destination.code} (${f.destination.city})`,
      destinationCode: f.destination.code,
      altitudeFt: f.altitude,
      speedKnots: f.velocity,
      status: f.status,
      delayMinutes: f.delayMinutes,
      eta: f.arrivalEstimated,
      progressPercent: f.progressPercent,
      routeKnown: f.routeKnown !== false,
      routeSource: f.routeSource,
      etaType: f.etaType,
      scheduleKnown: f.scheduleKnown !== false,
    }));

    const systemInstruction = `You are SkyPulse Airspace Copilot, an expert tactical flight intelligence assistant integrated into a real-time world radar.
Your role is to answer user inquiries about available aircraft positions, route estimates, altitudes, speeds, tracks, and airspace statistics.
Always accurately report flights based on the provided live snapshot. If the user asks about flights en route to an airport (e.g. BLR, Bangalore, LHR, JFK), check the destinationCode and destination city in the snapshot and list them clearly.

CURRENT MONITORED AIRSPACE FLIGHTS SNAPSHOT:
${JSON.stringify(flightSnapshot, null, 2)}

INSTRUCTIONS:
1. Provide accurate, clear, and concise aviation intelligence based on the snapshot.
2. Report only fields available in the snapshot. Never infer a route, schedule status, delay, aircraft type, or ETA.
3. A callsign-derived route and a direct ETA are estimates, not a filed flight plan or airline ETA. Label them clearly.
4. Respond in strict JSON format:
{
  "reply": "Markdown formatted conversational answer.",
  "matchedFlightNumbers": ["Array", "of", "matching", "flightNumbers", "e.g. SK1907"],
  "suggestedQueries": ["3", "concise", "follow-up", "questions"]
}`;

    // Call gemini-3.1-flash-lite with a 6-second safety timeout
    const geminiCall = aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: message,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
    );

    const response = await Promise.race([geminiCall, timeoutPromise]);
    const rawText = (response.text ?? '').trim();

    try {
      const parsed = JSON.parse(rawText);
      res.json({
        reply: parsed.reply || 'Here is the current airspace telemetry.',
        matchedFlightNumbers: Array.isArray(parsed.matchedFlightNumbers) ? parsed.matchedFlightNumbers : [],
        suggestedQueries: Array.isArray(parsed.suggestedQueries) ? parsed.suggestedQueries : [],
      });
    } catch {
      const fallback = generateFallbackChatResponse(message, currentFlights);
      res.json(fallback);
    }
  } catch (error) {
    console.warn('AI chat falling back to local intelligence engine:', (error as Error).message);
    const currentFlights = flightEngine.getFlights();
    const fallback = generateFallbackChatResponse(req.body?.message || '', currentFlights);
    res.json(fallback);
  }
});

// Fallback for unmatched API routes to ensure they always return JSON, never HTML
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Setup Vite development middleware or static production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkyPulse Radar server listening on http://0.0.0.0:${PORT}`);
  });
}

// Vercel imports the Express app as a function handler. Local and traditional
// Node deployments still start the HTTP server normally.
if (!process.env.VERCEL) {
  void startServer();
}

export default app;
