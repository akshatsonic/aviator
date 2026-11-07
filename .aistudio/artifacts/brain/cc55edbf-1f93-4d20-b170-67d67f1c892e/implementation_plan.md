# SkyPulse: Real-Time Tactical Flight Radar & AI Airspace Assistant

An airspace intelligence application that tracks live commercial and cargo flights globally with a tactical radar map, real-time flight telemetry (altitude, speed, heading, delays, routes), and an integrated conversational AI copilot that answers flight queries and surfaces interactive flight cards that jump and lock the radar focus on demand.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and design decisions have been confirmed through Phase 1 user input:
> - **Live Airspace Data Feed**: OpenSky Network API integration with an intelligent live simulation fallback engine providing continuous, jitter-free aircraft telemetry worldwide.
> - **Visual & Spatial Language**: Dark tactical radar theme with glowing flight trajectories, range rings, heading vectors, altitude color bands, and crisp telemetry HUD styling.
> - **AI Copilot Experience**: Floating interactive side drawer with quick flight lookup chips, natural language delay/arrival/departure Q&A, and clickable flight cards that command radar viewport focus.

---

### 1. Overview & Core Concept

- **What It Does**: SkyPulse renders real-time global airspace traffic on a dark tactical vector radar. Users can monitor hundreds of live flights, click any aircraft to inspect real-time altitude, airspeed, squawk code, departure/arrival schedules, delay status, and historical trail. An intelligent AI flight assistant powered by Gemini 3.8 Flash answers natural language queries about airport departures, delays, specific flight routes, and embeds clickable flight cards directly into the conversation to instantly steer map focus.
- **Target Audience / Persona**: Aviation enthusiasts, frequent travelers, flight dispatchers, and airport greeters who want immediate, zero-latency radar tracking paired with conversational intelligence.
- **Key Value**: Replaces cumbersome multi-step airline search forms with a unified tactical radar and conversational AI that connects questions directly to physical airspace coordinates.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Airspace Exploration**: User loads the app and is greeted by an interactive dark tactical world radar. Aircraft symbols move smoothly across flight paths with altitude-coded trails and directional heading indicators.
2. **Tactical Inspection**: Clicking any flight marker highlights its full route arc (origin airport to destination airport), projects a forward trajectory vector, and reveals a right-hand Flight Telemetry HUD with climb/descent rate, remaining distance, ETA, and delay diagnostics.
3. **Conversational AI Flight Queries**: User opens the floating AI assistant drawer and asks: *"Which flights from London to New York are currently delayed?"* or *"Show me Emirates flights near Dubai"*.
4. **Interactive Chat-to-Radar Navigation**: The AI responds with concise flight status breakdowns and embeds interactive flight cards inside the chat bubble. Clicking a flight card automatically centers the tactical radar, highlights the aircraft with an animated tracking reticle, and updates the telemetry inspector.
5. **Radar Filter & Search**: Top-level search and filter bar allows rapid filtering by airline (e.g., Delta, Emirates, British Airways), flight status (Airborne, Delayed, On Time), or origin/destination ICAO/IATA codes.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-precision tactical avionics radar. Inspired by modern air traffic control (ATC) consoles and flight management systems (FMS) with restrained neon amber and emerald accents against a deep obsidian backdrop.
- **Color Palette**:
  - *Dominant Canvas (60%)*: Deep Obsidian (`#0B0F17`) and Radar Void (`#070A0F`).
  - *Structural Surfaces (30%)*: Gunmetal Slate (`#131B26`), Hairline Radar Graticule (`rgba(56, 189, 248, 0.12)`), Subdued Panels (`#16202E`).
  - *Accent Budget (10%)*: Tactical Cyan (`#38BDF8`) for active focus, Emerald (`#10B981`) for on-time status, Aviation Amber (`#F59E0B`) for delays, and Transponder Green (`#22C55E`) for live aircraft blips.
- **Typography & Hierarchy**:
  - *Display & Nav*: `Plus Jakarta Sans` for clean titles, drawer headers, and flight numbers.
  - *Body Prose*: `DM Sans` for crisp natural language chat and status descriptions.
  - *Telemetry & Numbers*: `JetBrains Mono` with mandatory `tabular-nums` for altitudes, airspeeds, coordinates, ETA counters, and squawk codes.
- **Component Styling & Layout**:
  - Full-viewport interactive radar canvas with latitude/longitude graticules and nautical mile scale.
  - Floating translucent frosted glass toolbar and AI drawer (`backdrop-blur-md bg-slate-950/80 border border-slate-800`).
  - Strict Zero-Pill discipline: metadata rendered as unboxed text with typographic separators (`·` or `/`).

#### Interactive Feedback & Motion
- Smooth aircraft position interpolation (dead-reckoning updates every 1-2s for fluid motion without teleporting).
- Radar ping sweep animation on radar refresh.
- Fluid camera fly-to transitions when selecting flights from chat or search with smooth deceleration curves (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Hybrid Live OpenSky Feed + Dynamic Simulation Fallback
- *Chosen Approach*: Server route `/api/flights` queries OpenSky Network REST API with rate-limit protection and in-memory TTL caching. When OpenSky limits are reached or requests time out, the system automatically falls back to a high-fidelity dynamic flight simulation with 120+ authentic global routes, real airline callsigns, realistic cruising altitudes, and live vector updates.
- *Why*: Ensures zero-downtime, instantaneous first-load rendering, and realistic global coverage across all continents regardless of OpenSky public rate limits.
- *Alternatives Considered*: Pure OpenSky only (fails frequently due to strict public API IP rate limits) or static dummy data (lacks real-world realism and dynamic route progression).

#### Decision 2: Gemini 3.8 Flash Server-Side Proxy with Structured Flight Intent
- *Chosen Approach*: Server route `/api/ai/chat` uses `@google/genai` with `gemini-3.8-flash`, passing the current active airspace manifest as grounding context. The model generates both human flight advisory responses and structured references to matching flight identifiers (`flightNumbers: string[]`).
- *Why*: Allows the frontend to parse referenced flight codes and render rich, interactive flight cards inside chat bubbles that trigger radar camera moves on click.
- *Alternatives Considered*: Client-side Gemini SDK (prohibited; exposes API key) or simple text-only replies (prevents one-click radar flight focusing).

#### Decision 3: High-Performance Canvas & Vector Tile Radar Engine
- *Chosen Approach*: Leaflet vector map with CartoDB Dark Matter tile layer coupled with HTML5 Canvas overlay for high-frequency aircraft blip rendering and smooth trajectory rendering.
- *Why*: Delivers 60fps panning, zooming, and rotation with hundreds of simultaneous aircraft blips while keeping bundle weight lightweight and responsive.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### System Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       SkyPulse UI                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐  ┌───────────────────────────────────────────────────────┐  │
│  │ Top Radar Control Bar │  │  Airspace Stats: Total Airborne · Delayed · Monitored │  │
│  │ [Search Flights/Airports] [Filter Airline] [Status Filter] [AI Copilot Toggle]   │  │
│  └───────────┬───────────┘  └───────────────────────────────────────────────────────┘  │
│              │                                                                         │
│  ┌───────────▼─────────────────────────────────────────────────────────┐  ┌─────────┐  │
│  │                  Tactical Radar Canvas (Leaflet/WebGL)              │  │Flight   │  │
│  │ - Dark Matter Vector Base Map & Lat/Long Graticules                 │  │Telemetry│  │
│  │ - 120+ Real-Time Aircraft Markers with Heading & Altitude Bands     │  │Inspector│  │
│  │ - Animated Active Route Arcs & Waypoint Trails                      │  │- Route  │  │
│  │ - Camera Smooth Fly-To / Lock-on Controller                         │  │- Speed  │  │
│  └───────────────────────────────────┬─────────────────────────────────┘  │- Alt    │  │
│                                      │                                    │- ETA    │  │
│  ┌───────────────────────────────────▼─────────────────────────────────┐  │- Squawk │  │
│  │               Floating AI Airspace Copilot (Side Drawer)            │  └─────────┘  │
│  │ - Conversational Chat Thread (Arrivals, Departures, Delays Q&A)     │               │
│  │ - Quick Suggestion Chips ("Show delayed flights", "JFK to LHR", etc.)│               │
│  │ - Interactive Flight Cards: [Flight Details] ➔ [Track & Focus Map] ─┼───────────────┘
│  └───────────────────────────────────┬─────────────────────────────────┘
└──────────────────────────────────────┼─────────────────────────────────────────────────┘
                                       │ HTTP API Calls
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                Express Server (server.ts)                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  GET /api/flights                                                                      │
│  - Queries OpenSky Network API with memory cache & bounding box support                │
│  - Realistic global airspace simulation engine fallback (120+ flights)                 │
│  - Computes dead-reckoning coordinates, ground speed, and delay status                 │
│                                                                                        │
│  POST /api/ai/chat                                                                     │
│  - Receives user query & conversation history                                          │
│  - Injects current airspace state snapshot into Gemini 3.8 Flash system instruction    │
│  - Formats response with text summary and structured flight recommendation IDs         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State

- **`Flight` Entity**:
  - `id`: string (ICAO24 transponder hex code)
  - `flightNumber`: string (e.g. `DL405`, `EK201`, `BA117`)
  - `callsign`: string
  - `airline`: string (e.g. `Emirates`, `Delta Air Lines`, `British Airways`)
  - `aircraftType`: string (e.g. `B777-300ER`, `A350-900`, `B787-9`)
  - `origin`: `{ code: string, name: string, city: string, lat: number, lon: number }`
  - `destination`: `{ code: string, name: string, city: string, lat: number, lon: number }`
  - `latitude`: number, `longitude`: number, `altitude`: number (feet), `velocity`: number (knots)
  - `heading`: number (degrees 0-360), `verticalRate`: number (ft/min)
  - `status`: `'scheduled' | 'airborne' | 'delayed' | 'approaching' | 'landed'`
  - `departureTime`: string, `estimatedArrivalTime`: string
  - `delayMinutes`: number (0 if on time)
  - `squawk`: string

- **`ChatMessage` Entity**:
  - `id`: string
  - `sender`: `'user' | 'assistant'`
  - `text`: string
  - `timestamp`: string
  - `matchedFlightIds`?: string[] (Interactive flight cards embedded directly in chat)

#### Interactive Component & State Mapping

- **Map Pan & Zoom**: Controlled via state `selectedFlightId`; setting this state automatically animates map camera to aircraft position and activates the Telemetry Inspector HUD.
- **Search & Filters**: Typing in the search bar immediately filters visible map aircraft blips and sidebar roster list in real time.
- **Chat Flight Card Click**: Invokes `handleSelectAndFocusFlight(flightId)`, closing mobile drawer or minimizing chat focus and centering map with reticle lock.
- **Live Polling**: Interval poll every 3 seconds for position updates, updating flight coordinates with smooth linear interpolation.
