# SkyPulse

Minimal live flight radar built with React, Leaflet, Express, and Vite.

## Features

- Live aircraft positions inside the visible map area
- Location-based 100 km initial view
- Altitude, speed, heading, vertical rate, and observed trails
- Callsign-based origin and destination estimates
- Gemini flight assistant

OpenSky and ADSB.lol provide telemetry, not authoritative airline schedules. Routes and ETAs shown by the app are estimates.

## Run locally

```bash
bun install
cp .env.example .env
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

To bypass OpenSky and use ADSB.lol:

```bash
DISABLE_OPENSKY=true bun run dev
```

## Environment variables

```env
GEMINI_API_KEY=""
OPENSKY_CLIENT_ID=""
OPENSKY_CLIENT_SECRET=""
DISABLE_OPENSKY="false"
```

OpenSky credentials are optional when `DISABLE_OPENSKY=true`. Vercel uses ADSB.lol for live positions because OpenSky may restrict cloud-provider traffic.

## Checks

```bash
bun run lint
bun run build
```

## Deploy

Import the repository into Vercel and add the environment variables in the project settings. API requests under `/api/*` are routed to the Express function through `vercel.json`.
