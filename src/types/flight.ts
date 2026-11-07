export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface Flight {
  id: string; // Transponder hex / unique id (e.g., "4bb149" or "a8b3e2")
  flightNumber: string; // e.g. "THY75D", "DL405"
  callsign: string; // e.g. "THY75D", "DAL405"
  airline: string; // e.g. "Turkish Airlines", "Delta Air Lines"
  airlineCode: string; // e.g. "TK", "DL"
  aircraftType: string; // e.g. "Boeing 777-300ER"
  aircraftCategory: 'Heavy' | 'Super' | 'Medium' | 'Regional';
  registration: string; // e.g. "TC-LJI", "N120DX"
  origin: Airport;
  destination: Airport;
  latitude: number;
  longitude: number;
  altitude: number; // in feet (e.g. 33800)
  velocity: number; // in knots (e.g. 495)
  heading: number; // in degrees (0-360)
  verticalRate: number; // in ft/min (e.g. 0, +1200, -800)
  squawk: string; // e.g. "4721"
  status: 'on_time' | 'delayed' | 'approaching' | 'boarding' | 'diverted';
  delayMinutes: number;
  departureScheduled: string;
  departureActual: string;
  arrivalScheduled: string;
  arrivalEstimated: string;
  progressPercent: number; // 0 - 100
  trail: Array<[number, number]>; // Historical GPS coordinates for trailing track
}

export interface AirspaceSummary {
  totalAirborne: number;
  totalTracked: number;
  onTimeCount: number;
  delayedCount: number;
  avgAltitude: number;
  avgVelocity: number;
  lastUpdated: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  matchedFlightNumbers?: string[];
  suggestedQueries?: string[];
}
