import { Airport, Flight, AirspaceSummary } from '../types/flight.ts';

// Comprehensive global airport database covering 90+ major hubs worldwide
export const MAJOR_AIRPORTS: Record<string, Airport> = {
  // North America
  JFK: { code: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'United States', lat: 40.6413, lon: -73.7781, timezone: 'America/New_York' },
  EWR: { code: 'EWR', name: 'Newark Liberty Intl', city: 'Newark', country: 'United States', lat: 40.6895, lon: -74.1745, timezone: 'America/New_York' },
  BOS: { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'United States', lat: 42.3656, lon: -71.0096, timezone: 'America/New_York' },
  ORD: { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'United States', lat: 41.9742, lon: -87.9073, timezone: 'America/Chicago' },
  ATL: { code: 'ATL', name: 'Hartsfield-Jackson Intl', city: 'Atlanta', country: 'United States', lat: 33.6407, lon: -84.4277, timezone: 'America/New_York' },
  MIA: { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'United States', lat: 25.7959, lon: -80.2870, timezone: 'America/New_York' },
  DFW: { code: 'DFW', name: 'Dallas/Fort Worth Intl', city: 'Dallas', country: 'United States', lat: 32.8998, lon: -97.0403, timezone: 'America/Chicago' },
  DEN: { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'United States', lat: 39.8561, lon: -104.6737, timezone: 'America/Denver' },
  LAX: { code: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'United States', lat: 33.9416, lon: -118.4085, timezone: 'America/Los_Angeles' },
  SFO: { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'United States', lat: 37.6213, lon: -122.3790, timezone: 'America/Los_Angeles' },
  SEA: { code: 'SEA', name: 'Seattle-Tacoma Intl', city: 'Seattle', country: 'United States', lat: 47.4502, lon: -122.3088, timezone: 'America/Los_Angeles' },
  YVR: { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada', lat: 49.1967, lon: -123.1815, timezone: 'America/Vancouver' },
  YYZ: { code: 'YYZ', name: 'Toronto Pearson Intl', city: 'Toronto', country: 'Canada', lat: 43.6777, lon: -79.6248, timezone: 'America/Toronto' },
  YUL: { code: 'YUL', name: 'Montréal-Trudeau Intl', city: 'Montreal', country: 'Canada', lat: 45.4706, lon: -73.7408, timezone: 'America/Toronto' },
  MEX: { code: 'MEX', name: 'Mexico City Benito Juárez', city: 'Mexico City', country: 'Mexico', lat: 19.4361, lon: -99.0719, timezone: 'America/Mexico_City' },

  // Europe (Dense Network matching OpenSky)
  LHR: { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', lat: 51.4700, lon: -0.4543, timezone: 'Europe/London' },
  LGW: { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'United Kingdom', lat: 51.1537, lon: -0.1821, timezone: 'Europe/London' },
  MAN: { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'United Kingdom', lat: 53.3537, lon: -2.2750, timezone: 'Europe/London' },
  EDI: { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'United Kingdom', lat: 55.9508, lon: -3.3615, timezone: 'Europe/London' },
  DUB: { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4264, lon: -6.2499, timezone: 'Europe/Dublin' },
  CDG: { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lon: 2.5479, timezone: 'Europe/Paris' },
  ORY: { code: 'ORY', name: 'Orly Airport', city: 'Paris', country: 'France', lat: 48.7262, lon: 2.3652, timezone: 'Europe/Paris' },
  NCE: { code: 'NCE', name: 'Nice Côte d’Azur', city: 'Nice', country: 'France', lat: 43.6584, lon: 7.2159, timezone: 'Europe/Paris' },
  FRA: { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lon: 8.5622, timezone: 'Europe/Berlin' },
  MUC: { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', lat: 48.3537, lon: 11.7750, timezone: 'Europe/Berlin' },
  BER: { code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'Germany', lat: 52.3667, lon: 13.5033, timezone: 'Europe/Berlin' },
  HAM: { code: 'HAM', name: 'Hamburg Airport', city: 'Hamburg', country: 'Germany', lat: 53.6304, lon: 9.9882, timezone: 'Europe/Berlin' },
  AMS: { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lon: 4.7683, timezone: 'Europe/Amsterdam' },
  BRU: { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium', lat: 50.9010, lon: 4.4856, timezone: 'Europe/Brussels' },
  ZRH: { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', lat: 47.4582, lon: 8.5555, timezone: 'Europe/Zurich' },
  GVA: { code: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland', lat: 46.2370, lon: 6.1092, timezone: 'Europe/Zurich' },
  VIE: { code: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'Austria', lat: 48.1103, lon: 16.5697, timezone: 'Europe/Vienna' },
  MAD: { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'Spain', lat: 40.4839, lon: -3.5680, timezone: 'Europe/Madrid' },
  BCN: { code: 'BCN', name: 'Josep Tarradellas Barcelona-El Prat', city: 'Barcelona', country: 'Spain', lat: 41.2974, lon: 2.0833, timezone: 'Europe/Madrid' },
  AGP: { code: 'AGP', name: 'Málaga-Costa del Sol', city: 'Málaga', country: 'Spain', lat: 36.6749, lon: -4.4991, timezone: 'Europe/Madrid' },
  LIS: { code: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal', lat: 38.7756, lon: -9.1354, timezone: 'Europe/Lisbon' },
  FCO: { code: 'FCO', name: 'Leonardo da Vinci-Fiumicino', city: 'Rome', country: 'Italy', lat: 41.8003, lon: 12.2389, timezone: 'Europe/Rome' },
  MXP: { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'Italy', lat: 45.6301, lon: 8.7255, timezone: 'Europe/Rome' },
  ATH: { code: 'ATH', name: 'Athens International', city: 'Athens', country: 'Greece', lat: 37.9364, lon: 23.9445, timezone: 'Europe/Athens' },
  IST: { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', lat: 41.2753, lon: 28.7519, timezone: 'Europe/Istanbul' },
  SAW: { code: 'SAW', name: 'Sabiha Gökçen Intl', city: 'Istanbul', country: 'Turkey', lat: 40.8986, lon: 29.3092, timezone: 'Europe/Istanbul' },
  CPH: { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', lat: 55.6180, lon: 12.6508, timezone: 'Europe/Copenhagen' },
  OSL: { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway', lat: 60.1976, lon: 11.1004, timezone: 'Europe/Oslo' },
  ARN: { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden', lat: 59.6498, lon: 17.9238, timezone: 'Europe/Stockholm' },
  HEL: { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland', lat: 60.3210, lon: 24.9529, timezone: 'Europe/Helsinki' },
  WAW: { code: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'Poland', lat: 52.1672, lon: 20.9679, timezone: 'Europe/Warsaw' },
  PRG: { code: 'PRG', name: 'Václav Havel Airport', city: 'Prague', country: 'Czech Republic', lat: 50.1008, lon: 14.2600, timezone: 'Europe/Prague' },
  BUD: { code: 'BUD', name: 'Budapest Ferenc Liszt', city: 'Budapest', country: 'Hungary', lat: 47.4369, lon: 19.2556, timezone: 'Europe/Budapest' },

  // Middle East
  DXB: { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2532, lon: 55.3657, timezone: 'Asia/Dubai' },
  DOH: { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', lat: 25.2731, lon: 51.6081, timezone: 'Asia/Qatar' },
  AUH: { code: 'AUH', name: 'Zayed International', city: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4283, lon: 54.6511, timezone: 'Asia/Dubai' },
  RUH: { code: 'RUH', name: 'King Khalid Intl', city: 'Riyadh', country: 'Saudi Arabia', lat: 24.9576, lon: 46.6988, timezone: 'Asia/Riyadh' },
  JED: { code: 'JED', name: 'King Abdulaziz Intl', city: 'Jeddah', country: 'Saudi Arabia', lat: 21.6796, lon: 39.1565, timezone: 'Asia/Riyadh' },
  TLV: { code: 'TLV', name: 'Ben Gurion Airport', city: 'Tel Aviv', country: 'Israel', lat: 32.0055, lon: 34.8854, timezone: 'Asia/Jerusalem' },
  KWI: { code: 'KWI', name: 'Kuwait International', city: 'Kuwait City', country: 'Kuwait', lat: 29.2266, lon: 47.9689, timezone: 'Asia/Kuwait' },
  MCT: { code: 'MCT', name: 'Muscat International', city: 'Muscat', country: 'Oman', lat: 23.5933, lon: 58.2844, timezone: 'Asia/Muscat' },
  BAH: { code: 'BAH', name: 'Bahrain International', city: 'Manama', country: 'Bahrain', lat: 26.2708, lon: 50.6336, timezone: 'Asia/Bahrain' },

  // South Asia & India
  DEL: { code: 'DEL', name: 'Indira Gandhi Intl', city: 'Delhi', country: 'India', lat: 28.5562, lon: 77.1000, timezone: 'Asia/Kolkata' },
  BOM: { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'India', lat: 19.0896, lon: 72.8656, timezone: 'Asia/Kolkata' },
  BLR: { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'India', lat: 13.1986, lon: 77.7066, timezone: 'Asia/Kolkata' },
  MAA: { code: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'India', lat: 12.9941, lon: 80.1709, timezone: 'Asia/Kolkata' },
  HYD: { code: 'HYD', name: 'Rajiv Gandhi International', city: 'Hyderabad', country: 'India', lat: 17.2403, lon: 78.4294, timezone: 'Asia/Kolkata' },
  CCU: { code: 'CCU', name: 'Netaji Subhash Chandra Bose', city: 'Kolkata', country: 'India', lat: 22.6547, lon: 88.4467, timezone: 'Asia/Kolkata' },
  COK: { code: 'COK', name: 'Cochin International', city: 'Kochi', country: 'India', lat: 10.1556, lon: 76.3914, timezone: 'Asia/Kolkata' },
  CMB: { code: 'CMB', name: 'Bandaranaike Intl', city: 'Colombo', country: 'Sri Lanka', lat: 7.1808, lon: 79.8841, timezone: 'Asia/Colombo' },

  // East & Southeast Asia
  SIN: { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', lat: 1.3644, lon: 103.9915, timezone: 'Asia/Singapore' },
  BKK: { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', lat: 13.6900, lon: 100.7501, timezone: 'Asia/Bangkok' },
  DMK: { code: 'DMK', name: 'Don Mueang International', city: 'Bangkok', country: 'Thailand', lat: 13.9126, lon: 100.6068, timezone: 'Asia/Bangkok' },
  KUL: { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'Malaysia', lat: 2.7456, lon: 101.7099, timezone: 'Asia/Kuala_Lumpur' },
  CGK: { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'Indonesia', lat: -6.1275, lon: 106.6537, timezone: 'Asia/Jakarta' },
  DPS: { code: 'DPS', name: 'I Gusti Ngurah Rai', city: 'Denpasar', country: 'Indonesia', lat: -8.7482, lon: 115.1672, timezone: 'Asia/Makassar' },
  MNL: { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'Philippines', lat: 14.5086, lon: 121.0194, timezone: 'Asia/Manila' },
  SGN: { code: 'SGN', name: 'Tan Son Nhat International', city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8188, lon: 106.6520, timezone: 'Asia/Ho_Chi_Minh' },
  HAN: { code: 'HAN', name: 'Noi Bai International', city: 'Hanoi', country: 'Vietnam', lat: 21.2212, lon: 105.8072, timezone: 'Asia/Ho_Chi_Minh' },
  HKG: { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3080, lon: 113.9185, timezone: 'Asia/Hong_Kong' },
  TPE: { code: 'TPE', name: 'Taiwan Taoyuan Intl', city: 'Taipei', country: 'Taiwan', lat: 25.0797, lon: 121.2342, timezone: 'Asia/Taipei' },
  HND: { code: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'Japan', lat: 35.5494, lon: 139.7798, timezone: 'Asia/Tokyo' },
  NRT: { code: 'NRT', name: 'Tokyo Narita', city: 'Tokyo', country: 'Japan', lat: 35.7720, lon: 140.3929, timezone: 'Asia/Tokyo' },
  KIX: { code: 'KIX', name: 'Kansai International', city: 'Osaka', country: 'Japan', lat: 34.4320, lon: 135.2304, timezone: 'Asia/Tokyo' },
  FUK: { code: 'FUK', name: 'Fukuoka Airport', city: 'Fukuoka', country: 'Japan', lat: 33.5859, lon: 130.4507, timezone: 'Asia/Tokyo' },
  ICN: { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407, timezone: 'Asia/Seoul' },
  GMP: { code: 'GMP', name: 'Gimpo International', city: 'Seoul', country: 'South Korea', lat: 37.5583, lon: 126.7906, timezone: 'Asia/Seoul' },
  PEK: { code: 'PEK', name: 'Beijing Capital Intl', city: 'Beijing', country: 'China', lat: 40.0799, lon: 116.6031, timezone: 'Asia/Shanghai' },
  PKX: { code: 'PKX', name: 'Beijing Daxing Intl', city: 'Beijing', country: 'China', lat: 39.5098, lon: 116.4105, timezone: 'Asia/Shanghai' },
  PVG: { code: 'PVG', name: 'Shanghai Pudong Intl', city: 'Shanghai', country: 'China', lat: 31.1443, lon: 121.8083, timezone: 'Asia/Shanghai' },
  SHA: { code: 'SHA', name: 'Shanghai Hongqiao Intl', city: 'Shanghai', country: 'China', lat: 31.1979, lon: 121.3363, timezone: 'Asia/Shanghai' },
  CAN: { code: 'CAN', name: 'Guangzhou Baiyun Intl', city: 'Guangzhou', country: 'China', lat: 23.3924, lon: 113.2988, timezone: 'Asia/Shanghai' },
  CTU: { code: 'CTU', name: 'Chengdu Shuangliu Intl', city: 'Chengdu', country: 'China', lat: 30.5785, lon: 103.9471, timezone: 'Asia/Shanghai' },

  // Australasia & Pacific
  SYD: { code: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia', lat: -33.9399, lon: 151.1753, timezone: 'Australia/Sydney' },
  MEL: { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', lat: -37.6690, lon: 144.8410, timezone: 'Australia/Melbourne' },
  BNE: { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', lat: -27.3842, lon: 153.1175, timezone: 'Australia/Brisbane' },
  PER: { code: 'PER', name: 'Perth Airport', city: 'Perth', country: 'Australia', lat: -31.9403, lon: 115.9668, timezone: 'Australia/Perth' },
  ADL: { code: 'ADL', name: 'Adelaide Airport', city: 'Adelaide', country: 'Australia', lat: -34.9450, lon: 138.5306, timezone: 'Australia/Adelaide' },
  AKL: { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', lat: -37.0082, lon: 174.7850, timezone: 'Pacific/Auckland' },
  CHC: { code: 'CHC', name: 'Christchurch Airport', city: 'Christchurch', country: 'New Zealand', lat: -43.4867, lon: 172.5369, timezone: 'Pacific/Auckland' },

  // South America & Africa
  GRU: { code: 'GRU', name: 'Guarulhos International', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lon: -46.4731, timezone: 'America/Sao_Paulo' },
  GIG: { code: 'GIG', name: 'Rio de Janeiro Galeão', city: 'Rio de Janeiro', country: 'Brazil', lat: -22.8089, lon: -43.2436, timezone: 'America/Sao_Paulo' },
  BSB: { code: 'BSB', name: 'Brasília International', city: 'Brasília', country: 'Brazil', lat: -15.8692, lon: -47.9208, timezone: 'America/Sao_Paulo' },
  EZE: { code: 'EZE', name: 'Ministro Pistarini Ezeiza', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lon: -58.5358, timezone: 'America/Argentina/Buenos_Aires' },
  SCL: { code: 'SCL', name: 'Arturo Merino Benítez', city: 'Santiago', country: 'Chile', lat: -33.3928, lon: -70.7858, timezone: 'America/Santiago' },
  LIM: { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'Peru', lat: -12.0219, lon: -77.1143, timezone: 'America/Lima' },
  BOG: { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'Colombia', lat: 4.7016, lon: -74.1469, timezone: 'America/Bogota' },
  JNB: { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'South Africa', lat: -26.1367, lon: 28.2411, timezone: 'Africa/Johannesburg' },
  CPT: { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa', lat: -33.9715, lon: 18.6021, timezone: 'Africa/Johannesburg' },
  DUR: { code: 'DUR', name: 'King Shaka International', city: 'Durban', country: 'South Africa', lat: -29.6144, lon: 31.1197, timezone: 'Africa/Johannesburg' },
  CAI: { code: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'Egypt', lat: 30.1219, lon: 31.4056, timezone: 'Africa/Cairo' },
  NBO: { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'Kenya', lat: -1.3192, lon: 36.9278, timezone: 'Africa/Nairobi' },
  ADD: { code: 'ADD', name: 'Addis Ababa Bole', city: 'Addis Ababa', country: 'Ethiopia', lat: 8.9779, lon: 38.7993, timezone: 'Africa/Addis_Ababa' },
  CMN: { code: 'CMN', name: 'Mohammed V International', city: 'Casablanca', country: 'Morocco', lat: 33.3675, lon: -7.5898, timezone: 'Africa/Casablanca' },
};

export interface AirlineSpec {
  name: string;
  code: string;
  icao: string;
  country: string;
  fleet: string[];
}

export const MAJOR_AIRLINES: AirlineSpec[] = [
  { name: 'Turkish Airlines', code: 'TK', icao: 'THY', country: 'Turkey', fleet: ['Boeing 777-300ER', 'Airbus A350-900', 'Boeing 787-9', 'Airbus A321neo'] },
  { name: 'Emirates', code: 'EK', icao: 'UAE', country: 'United Arab Emirates', fleet: ['Airbus A380-800', 'Boeing 777-300ER', 'Airbus A350-900'] },
  { name: 'Qatar Airways', code: 'QR', icao: 'QTR', country: 'Qatar', fleet: ['Airbus A350-1000', 'Boeing 777-300ER', 'Boeing 787-9'] },
  { name: 'British Airways', code: 'BA', icao: 'BAW', country: 'United Kingdom', fleet: ['Boeing 777-200ER', 'Airbus A350-1000', 'Airbus A320neo', 'Boeing 787-10'] },
  { name: 'Lufthansa', code: 'LH', icao: 'DLH', country: 'Germany', fleet: ['Boeing 747-8', 'Airbus A350-900', 'Airbus A321neo', 'Boeing 787-9'] },
  { name: 'Air France', code: 'AF', icao: 'AFR', country: 'France', fleet: ['Airbus A350-900', 'Boeing 777-300ER', 'Airbus A220-300'] },
  { name: 'KLM Royal Dutch', code: 'KL', icao: 'KLM', country: 'Netherlands', fleet: ['Boeing 787-10', 'Boeing 777-300ER', 'Boeing 737-800'] },
  { name: 'Singapore Airlines', code: 'SQ', icao: 'SIA', country: 'Singapore', fleet: ['Airbus A380-800', 'Airbus A350-900', 'Boeing 777-300ER', 'Boeing 787-10'] },
  { name: 'Cathay Pacific', code: 'CX', icao: 'CPA', country: 'Hong Kong', fleet: ['Airbus A350-1000', 'Boeing 777-300ER', 'Airbus A321neo'] },
  { name: 'All Nippon Airways', code: 'NH', icao: 'ANA', country: 'Japan', fleet: ['Boeing 787-9', 'Boeing 777-300ER', 'Boeing 767-300ER'] },
  { name: 'Japan Airlines', code: 'JL', icao: 'JAL', country: 'Japan', fleet: ['Airbus A350-1000', 'Boeing 787-9', 'Boeing 767-300'] },
  { name: 'Korean Air', code: 'KE', icao: 'KAL', country: 'South Korea', fleet: ['Boeing 747-8', 'Airbus A380-800', 'Boeing 777-300ER'] },
  { name: 'Asiana Airlines', code: 'OZ', icao: 'AAR', country: 'South Korea', fleet: ['Airbus A350-900', 'Airbus A380-800', 'Airbus A321neo'] },
  { name: 'Qantas', code: 'QF', icao: 'QFA', country: 'Australia', fleet: ['Airbus A380-800', 'Boeing 787-9', 'Airbus A330-300'] },
  { name: 'Virgin Australia', code: 'VA', icao: 'VOZ', country: 'Australia', fleet: ['Boeing 737-800', 'Boeing 737 MAX 8'] },
  { name: 'Delta Air Lines', code: 'DL', icao: 'DAL', country: 'United States', fleet: ['Airbus A350-900', 'Airbus A330-900neo', 'Boeing 767-400ER', 'Airbus A321neo'] },
  { name: 'United Airlines', code: 'UA', icao: 'UAL', country: 'United States', fleet: ['Boeing 787-9', 'Boeing 777-300ER', 'Boeing 737 MAX 9'] },
  { name: 'American Airlines', code: 'AA', icao: 'AAL', country: 'United States', fleet: ['Boeing 777-300ER', 'Boeing 787-8', 'Airbus A321XLR'] },
  { name: 'Air India', code: 'AI', icao: 'AIC', country: 'India', fleet: ['Airbus A350-900', 'Boeing 777-300ER', 'Boeing 787-8'] },
  { name: 'IndiGo', code: '6E', icao: 'IGO', country: 'India', fleet: ['Airbus A321neo', 'Airbus A320neo', 'Boeing 777-300ER'] },
  { name: 'Virgin Atlantic', code: 'VS', icao: 'VIR', country: 'United Kingdom', fleet: ['Airbus A350-1000', 'Boeing 787-9', 'Airbus A330-900neo'] },
  { name: 'Swiss International', code: 'LX', icao: 'SWR', country: 'Switzerland', fleet: ['Boeing 777-300ER', 'Airbus A330-300', 'Airbus A220-300'] },
  { name: 'Austrian Airlines', code: 'OS', icao: 'AUA', country: 'Austria', fleet: ['Boeing 787-9', 'Boeing 777-200ER', 'Airbus A320neo'] },
  { name: 'Iberia', code: 'IB', icao: 'IBE', country: 'Spain', fleet: ['Airbus A350-900', 'Airbus A330-200', 'Airbus A321XLR'] },
  { name: 'Scandinavian Airlines', code: 'SK', icao: 'SAS', country: 'Sweden/Norway/Denmark', fleet: ['Airbus A350-900', 'Airbus A320neo'] },
  { name: 'Air Canada', code: 'AC', icao: 'ACA', country: 'Canada', fleet: ['Boeing 787-9', 'Boeing 777-300ER', 'Airbus A220-300'] },
  { name: 'LATAM Airlines', code: 'LA', icao: 'LAN', country: 'Chile/Brazil', fleet: ['Boeing 787-9', 'Boeing 777-300ER', 'Airbus A320neo'] },
  { name: 'Ethiopian Airlines', code: 'ET', icao: 'ETH', country: 'Ethiopia', fleet: ['Airbus A350-900', 'Boeing 787-9', 'Boeing 777-200LR'] },
  { name: 'Thai Airways', code: 'TG', icao: 'THA', country: 'Thailand', fleet: ['Airbus A350-900', 'Boeing 777-300ER', 'Boeing 787-8'] },
  { name: 'EgyptAir', code: 'MS', icao: 'MSR', country: 'Egypt', fleet: ['Boeing 787-9', 'Boeing 777-300ER', 'Airbus A320neo'] },
];

function interpolatePosition(origin: Airport, destination: Airport, fraction: number): { lat: number; lon: number; heading: number } {
  const f = Math.max(0.01, Math.min(0.99, fraction));
  const lat1 = (origin.lat * Math.PI) / 180;
  const lon1 = (origin.lon * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;
  const lon2 = (destination.lon * Math.PI) / 180;

  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

  let lat: number;
  let lon: number;

  if (d < 0.001 || isNaN(d)) {
    lat = origin.lat + (destination.lat - origin.lat) * f;
    lon = origin.lon + (destination.lon - origin.lon) * f;
  } else {
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
    lon = (Math.atan2(y, x) * 180) / Math.PI;
  }

  const yH = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const xH =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  let heading = (Math.atan2(yH, xH) * 180) / Math.PI;
  heading = (heading + 360) % 360;

  return { lat, lon, heading: Math.round(heading) };
}

export function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Nautical miles radius of Earth
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(60, Math.round(R * c));
}

export function computeFlightSchedule(
  origin: Airport,
  destination: Airport,
  velocity: number,
  progressFraction: number,
  delayMinutes: number = 0
) {
  const distNm = calculateDistanceNm(origin.lat, origin.lon, destination.lat, destination.lon);
  const safeVel = Math.max(220, velocity || 460);
  const flightDurationHours = distNm / safeVel;
  const flightDurationMs = flightDurationHours * 3600 * 1000;

  const nowMs = Date.now();
  // Departure occurred in the past based on progress fraction
  const departureMs = nowMs - (progressFraction * flightDurationMs);
  const arrivalSchedMs = departureMs + flightDurationMs;
  const arrivalEstMs = arrivalSchedMs + (delayMinutes * 60 * 1000);

  const formatUtcHourMin = (ms: number) => {
    const d = new Date(ms);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  return {
    departureScheduled: formatUtcHourMin(departureMs),
    departureActual: formatUtcHourMin(departureMs),
    arrivalScheduled: formatUtcHourMin(arrivalSchedMs),
    arrivalEstimated: formatUtcHourMin(arrivalEstMs),
  };
}

function randomSquawk(): string {
  const digits = '1234567';
  return `${digits[Math.floor(Math.random() * digits.length)]}${digits[Math.floor(Math.random() * digits.length)]}${digits[Math.floor(Math.random() * digits.length)]}${digits[Math.floor(Math.random() * digits.length)]}`;
}

export class FlightEngine {
  private flights: Flight[] = [];
  private lastUpdate: number = Date.now();
  // OpenSky transponder tracking scale
  private totalGlobalFleetCount: number = 10615;

  constructor() {
    this.generateDenseGlobalFleet(1650);
  }

  private generateDenseGlobalFleet(targetCount: number = 1650) {
    const createdFlights: Flight[] = [];

    // 1. Featured real flights (including THY75D from user's OpenSky screenshot)
    const featuredRoutes = [
      { num: 'THY75D', call: 'THY75D', air: 'Turkish Airlines', code: 'TK', orig: 'IST', dest: 'YVR', plane: 'Boeing 777-300ER', reg: 'TC-LJI', alt: 33800, vel: 495, prog: 0.65, delay: 0 },
      { num: 'BA117', call: 'BAW117', air: 'British Airways', code: 'BA', orig: 'LHR', dest: 'JFK', plane: 'Boeing 777-300ER', reg: 'G-STBA', alt: 37000, vel: 495, prog: 0.45, delay: 0 },
      { num: 'DL405', call: 'DAL405', air: 'Delta Air Lines', code: 'DL', orig: 'JFK', dest: 'LHR', plane: 'Airbus A350-900', reg: 'N505DN', alt: 39000, vel: 520, prog: 0.72, delay: 28 },
      { num: 'EK201', call: 'UAE201', air: 'Emirates', code: 'EK', orig: 'DXB', dest: 'JFK', plane: 'Airbus A380-800', reg: 'A6-EVN', alt: 40000, vel: 515, prog: 0.68, delay: 0 },
      { num: 'SQ326', call: 'SIA326', air: 'Singapore Airlines', code: 'SQ', orig: 'SIN', dest: 'FRA', plane: 'Boeing 777-300ER', reg: '9V-SWT', alt: 36000, vel: 490, prog: 0.38, delay: 0 },
      { num: 'LH400', call: 'DLH400', air: 'Lufthansa', code: 'LH', orig: 'FRA', dest: 'JFK', plane: 'Boeing 747-8', reg: 'D-ABYM', alt: 38000, vel: 490, prog: 0.35, delay: 45 },
      { num: 'AF007', call: 'AFR007', air: 'Air France', code: 'AF', orig: 'JFK', dest: 'CDG', plane: 'Airbus A350-900', reg: 'F-GSPI', alt: 36000, vel: 510, prog: 0.60, delay: 0 },
      { num: '6E021', call: 'IGO021', air: 'IndiGo', code: '6E', orig: 'DEL', dest: 'DXB', plane: 'Airbus A321neo', reg: 'VT-IMD', alt: 34000, vel: 460, prog: 0.58, delay: 0 },
      { num: 'AI101', call: 'AIC101', air: 'Air India', code: 'AI', orig: 'DEL', dest: 'JFK', plane: 'Boeing 777-300ER', reg: 'VT-ALQ', alt: 37000, vel: 485, prog: 0.56, delay: 35 },
      { num: 'TG916', call: 'THA916', air: 'Thai Airways', code: 'TG', orig: 'BKK', dest: 'LHR', plane: 'Airbus A350-900', reg: 'HS-THB', alt: 38000, vel: 485, prog: 0.30, delay: 10 },
      { num: 'QF001', call: 'QFA1', air: 'Qantas', code: 'QF', orig: 'SYD', dest: 'LHR', plane: 'Airbus A380-800', reg: 'VH-OQA', alt: 38000, vel: 505, prog: 0.52, delay: 0 },
      { num: 'NH106', call: 'ANA106', air: 'All Nippon Airways', code: 'NH', orig: 'HND', dest: 'LAX', plane: 'Boeing 787-9', reg: 'JA873A', alt: 39000, vel: 540, prog: 0.64, delay: 0 },
      { num: 'JL002', call: 'JAL002', air: 'Japan Airlines', code: 'JL', orig: 'HND', dest: 'SFO', plane: 'Airbus A350-1000', reg: 'JA01WJ', alt: 38000, vel: 535, prog: 0.70, delay: 0 },
      { num: 'CX888', call: 'CPA888', air: 'Cathay Pacific', code: 'CX', orig: 'HKG', dest: 'YVR', plane: 'Boeing 777-300ER', reg: 'B-KPM', alt: 37000, vel: 520, prog: 0.55, delay: 20 },
      { num: 'QR701', call: 'QTR701', air: 'Qatar Airways', code: 'QR', orig: 'DOH', dest: 'JFK', plane: 'Boeing 777-300ER', reg: 'A7-BEU', alt: 36000, vel: 490, prog: 0.58, delay: 0 },
    ];

    featuredRoutes.forEach((r, idx) => {
      const orig = MAJOR_AIRPORTS[r.orig] || MAJOR_AIRPORTS.LHR;
      const dest = MAJOR_AIRPORTS[r.dest] || MAJOR_AIRPORTS.JFK;
      const { lat, lon, heading } = interpolatePosition(orig, dest, r.prog);
      const schedule = computeFlightSchedule(orig, dest, r.vel, r.prog, r.delay);

      createdFlights.push({
        id: `flt-feat-${idx}-${r.num.toLowerCase()}`,
        flightNumber: r.num,
        callsign: r.call,
        airline: r.air,
        airlineCode: r.code,
        aircraftType: r.plane,
        aircraftCategory: 'Heavy',
        registration: r.reg,
        origin: orig,
        destination: dest,
        latitude: lat,
        longitude: lon,
        altitude: r.alt,
        velocity: r.vel,
        heading,
        verticalRate: r.prog > 0.88 ? -850 : 0,
        squawk: randomSquawk(),
        status: r.delay > 20 ? 'delayed' : r.prog > 0.88 ? 'approaching' : 'on_time',
        delayMinutes: r.delay,
        departureScheduled: schedule.departureScheduled,
        departureActual: schedule.departureActual,
        arrivalScheduled: schedule.arrivalScheduled,
        arrivalEstimated: schedule.arrivalEstimated,
        progressPercent: Math.round(r.prog * 100),
        trail: [[lat - 0.5, lon - 0.5], [lat, lon]],
      });
    });

    // 2. Dedicated Bangalore Kempegowda (BLR) Approach & Departure Radar Sequence
    // Matching actual OpenSky ADS-B positions over Doddaballapura, Hesaraghatta, Yelahanka, and Hoskote
    const blrAirport = MAJOR_AIRPORTS.BLR;
    const delAirport = MAJOR_AIRPORTS.DEL;
    const bomAirport = MAJOR_AIRPORTS.BOM;
    const hydAirport = MAJOR_AIRPORTS.HYD;
    const ccuAirport = MAJOR_AIRPORTS.CCU;
    const dxbAirport = MAJOR_AIRPORTS.DXB;
    const goiAirport: Airport = { code: 'GOI', name: 'Dabolim International', city: 'Goa', country: 'India', lat: 15.3808, lon: 73.8314, timezone: 'Asia/Kolkata' };

    const blrTerminalFlights: Flight[] = [
      {
        id: 'flt-blr-1-6e2405',
        flightNumber: '6E2405',
        callsign: 'IGO2405',
        airline: 'IndiGo',
        airlineCode: '6E',
        aircraftType: 'Airbus A321neo',
        aircraftCategory: 'Medium',
        registration: 'VT-IMD',
        origin: delAirport,
        destination: blrAirport,
        latitude: 13.1986,
        longitude: 77.6250, // 4nm short final Runway 09L
        altitude: 2300,
        velocity: 142,
        heading: 92,
        verticalRate: -720,
        squawk: '2411',
        status: 'approaching',
        delayMinutes: 0,
        departureScheduled: '16:15',
        departureActual: '16:15',
        arrivalScheduled: '18:55',
        arrivalEstimated: '18:55',
        progressPercent: 98,
        trail: [[13.194, 77.535], [13.1986, 77.625]],
      },
      {
        id: 'flt-blr-2-ai504',
        flightNumber: 'AI504',
        callsign: 'AIC504',
        airline: 'Air India',
        airlineCode: 'AI',
        aircraftType: 'Airbus A320neo',
        aircraftCategory: 'Medium',
        registration: 'VT-EXG',
        origin: bomAirport,
        destination: blrAirport,
        latitude: 13.1940,
        longitude: 77.5350, // Over Yelahanka localizer
        altitude: 3750,
        velocity: 168,
        heading: 92,
        verticalRate: -750,
        squawk: '4215',
        status: 'approaching',
        delayMinutes: 0,
        departureScheduled: '17:20',
        departureActual: '17:20',
        arrivalScheduled: '19:02',
        arrivalEstimated: '19:02',
        progressPercent: 95,
        trail: [[13.170, 77.445], [13.194, 77.535]],
      },
      {
        id: 'flt-blr-3-qp1312',
        flightNumber: 'QP1312',
        callsign: 'AKK1312',
        airline: 'Akasa Air',
        airlineCode: 'QP',
        aircraftType: 'Boeing 737 MAX 8',
        aircraftCategory: 'Medium',
        registration: 'VT-YAE',
        origin: goiAirport,
        destination: blrAirport,
        latitude: 13.1680,
        longitude: 77.4450, // Greater Hesaraghatta base turn
        altitude: 4850,
        velocity: 195,
        heading: 88,
        verticalRate: -650,
        squawk: '1723',
        status: 'approaching',
        delayMinutes: 0,
        departureScheduled: '18:05',
        departureActual: '18:05',
        arrivalScheduled: '19:10',
        arrivalEstimated: '19:10',
        progressPercent: 92,
        trail: [[13.140, 77.350], [13.168, 77.445]],
      },
      {
        id: 'flt-blr-4-6e918',
        flightNumber: '6E918',
        callsign: 'IGO918',
        airline: 'IndiGo',
        airlineCode: '6E',
        aircraftType: 'Airbus A320neo',
        aircraftCategory: 'Medium',
        registration: 'VT-ITH',
        origin: hydAirport,
        destination: blrAirport,
        latitude: 13.3150,
        longitude: 77.5100, // Doddaballapura downwind entry
        altitude: 6800,
        velocity: 220,
        heading: 165,
        verticalRate: -500,
        squawk: '3142',
        status: 'approaching',
        delayMinutes: 0,
        departureScheduled: '18:10',
        departureActual: '18:10',
        arrivalScheduled: '19:15',
        arrivalEstimated: '19:15',
        progressPercent: 88,
        trail: [[13.450, 77.530], [13.315, 77.510]],
      },
      {
        id: 'flt-blr-5-6e314',
        flightNumber: '6E314',
        callsign: 'IGO314',
        airline: 'IndiGo',
        airlineCode: '6E',
        aircraftType: 'Airbus A321neo',
        aircraftCategory: 'Medium',
        registration: 'VT-IBB',
        origin: blrAirport,
        destination: ccuAirport,
        latitude: 13.2050,
        longitude: 77.7950, // Hoskote climbout East
        altitude: 3400,
        velocity: 185,
        heading: 92,
        verticalRate: 1750,
        squawk: '6231',
        status: 'on_time',
        delayMinutes: 0,
        departureScheduled: '18:50',
        departureActual: '18:50',
        arrivalScheduled: '21:15',
        arrivalEstimated: '21:15',
        progressPercent: 5,
        trail: [[13.1986, 77.7066], [13.205, 77.795]],
      },
      {
        id: 'flt-blr-6-ek565',
        flightNumber: 'EK565',
        callsign: 'UAE565',
        airline: 'Emirates',
        airlineCode: 'EK',
        aircraftType: 'Boeing 777-300ER',
        aircraftCategory: 'Heavy',
        registration: 'A6-EGO',
        origin: blrAirport,
        destination: dxbAirport,
        latitude: 13.2180,
        longitude: 77.5500, // Departure climbout West over Bangalore North
        altitude: 6200,
        velocity: 245,
        heading: 285,
        verticalRate: 2100,
        squawk: '0452',
        status: 'on_time',
        delayMinutes: 0,
        departureScheduled: '18:40',
        departureActual: '18:40',
        arrivalScheduled: '21:35',
        arrivalEstimated: '21:35',
        progressPercent: 8,
        trail: [[13.1986, 77.7066], [13.218, 77.55]],
      },
    ];

    createdFlights.push(...blrTerminalFlights);

    // 3. High-Density Airway Corridors
    const corridorPairs = [
      // Dense European Corridors (Western, Central, Eastern & Mediterranean)
      ['LHR', 'CDG'], ['CDG', 'FRA'], ['FRA', 'AMS'], ['AMS', 'LHR'], ['LHR', 'MAD'],
      ['MAD', 'BCN'], ['FRA', 'VIE'], ['ZRH', 'LHR'], ['MUC', 'FRA'], ['FCO', 'CDG'],
      ['IST', 'FRA'], ['IST', 'LHR'], ['ATH', 'FCO'], ['CPH', 'AMS'], ['OSL', 'ARN'],
      ['HEL', 'LHR'], ['DUB', 'LHR'], ['WAW', 'FRA'], ['LIS', 'MAD'], ['BER', 'MUC'],
      ['IST', 'CDG'], ['AMS', 'FCO'], ['FRA', 'MAD'], ['LHR', 'ZRH'], ['CDG', 'VIE'],
      ['LGW', 'AGP'], ['MAN', 'DUB'], ['EDI', 'LHR'], ['BRU', 'GVA'], ['PRG', 'FRA'],
      ['BUD', 'MUC'], ['MXP', 'FRA'], ['ORY', 'NCE'], ['HAM', 'MUC'], ['ZRH', 'VIE'],

      // Transatlantic & European-Middle East
      ['LHR', 'JFK'], ['CDG', 'JFK'], ['FRA', 'ORD'], ['AMS', 'ATL'], ['DXB', 'LHR'],
      ['DXB', 'CDG'], ['DOH', 'FRA'], ['AUH', 'LHR'], ['DXB', 'SIN'], ['DOH', 'BKK'],
      ['IST', 'JFK'], ['IST', 'DEL'], ['IST', 'BOM'], ['DXB', 'DEL'], ['DOH', 'DEL'],
      ['DXB', 'BOM'], ['DXB', 'CAI'], ['RUH', 'DXB'], ['JED', 'CAI'], ['DXB', 'SYD'],
      ['LHR', 'BOS'], ['CDG', 'MIA'], ['FRA', 'SFO'], ['AMS', 'LAX'], ['ZRH', 'EWR'],

      // North America (Transcontinental & Hub-to-Hub)
      ['JFK', 'LAX'], ['SFO', 'JFK'], ['ORD', 'LAX'], ['ATL', 'MIA'], ['DFW', 'DEN'],
      ['SEA', 'SFO'], ['BOS', 'ORD'], ['DEN', 'LAX'], ['YYZ', 'YVR'], ['JFK', 'MIA'],
      ['EWR', 'SFO'], ['ORD', 'SEA'], ['LAX', 'HND'], ['SFO', 'ICN'], ['YVR', 'LHR'],
      ['ATL', 'JFK'], ['ORD', 'DFW'], ['DEN', 'SEA'], ['LAX', 'SEA'], ['MIA', 'DFW'],

      // South Asia, India & Subcontinent
      ['DEL', 'BOM'], ['BOM', 'BLR'], ['DEL', 'BLR'], ['MAA', 'DEL'], ['DEL', 'HYD'],
      ['CCU', 'DEL'], ['BOM', 'COK'], ['DEL', 'CMB'], ['BOM', 'DXB'], ['BLR', 'SIN'],
      ['DEL', 'DXB'], ['MAA', 'SIN'], ['HYD', 'DXB'], ['DEL', 'KUL'], ['BOM', 'LHR'],

      // East & Southeast Asia
      ['SIN', 'BKK'], ['KUL', 'SIN'], ['HKG', 'TPE'], ['HND', 'ICN'], ['ICN', 'HKG'],
      ['NRT', 'TPE'], ['BKK', 'HKG'], ['SIN', 'SYD'], ['MEL', 'SYD'], ['BNE', 'SYD'],
      ['SIN', 'HND'], ['HKG', 'SIN'], ['PEK', 'SHA'], ['PVG', 'HND'], ['CAN', 'BKK'],
      ['CGK', 'SIN'], ['MNL', 'HKG'], ['SYD', 'AKL'], ['PER', 'MEL'], ['DEL', 'BKK'],
      ['SGN', 'SIN'], ['HAN', 'BKK'], ['TPE', 'NRT'], ['ICN', 'PVG'], ['KIX', 'TPE'],

      // Africa & South America
      ['JNB', 'CPT'], ['CAI', 'LHR'], ['ADD', 'DXB'], ['NBO', 'JNB'], ['GRU', 'GIG'],
      ['EZE', 'SCL'], ['BOG', 'MIA'], ['GRU', 'MIA'], ['JNB', 'LHR'], ['GRU', 'LIS'],
      ['DUR', 'JNB'], ['CMN', 'CDG'], ['ADD', 'JNB'], ['NBO', 'ADD'], ['LIM', 'SCL'],
    ];

    let flightIndex = createdFlights.length;
    while (createdFlights.length < targetCount) {
      const pair = corridorPairs[Math.floor(Math.random() * corridorPairs.length)];
      const isReverse = Math.random() > 0.5;
      const origCode = isReverse ? pair[1] : pair[0];
      const destCode = isReverse ? pair[0] : pair[1];

      const orig = MAJOR_AIRPORTS[origCode];
      const dest = MAJOR_AIRPORTS[destCode];
      if (!orig || !dest) continue;

      const airline = MAJOR_AIRLINES[Math.floor(Math.random() * MAJOR_AIRLINES.length)];
      const flightNumInt = 100 + Math.floor(Math.random() * 8900);
      const flightNumber = `${airline.code}${flightNumInt}`;
      const callsign = `${airline.icao}${flightNumInt}`;
      const plane = airline.fleet[Math.floor(Math.random() * airline.fleet.length)];

      const initialProgress = 0.03 + Math.random() * 0.94;
      const { lat, lon, heading } = interpolatePosition(orig, dest, initialProgress);

      const randAlt = Math.random();
      let alt: number;
      if (randAlt < 0.65) {
        alt = 32000 + Math.floor(Math.random() * 9) * 1000;
      } else if (randAlt < 0.80) {
        alt = 20000 + Math.floor(Math.random() * 11) * 1000;
      } else if (randAlt < 0.92) {
        alt = 10000 + Math.floor(Math.random() * 9) * 1000;
      } else {
        alt = 2000 + Math.floor(Math.random() * 7) * 1000;
      }

      const vel = alt < 10000 ? 240 + Math.floor(Math.random() * 50) : 440 + Math.floor(Math.random() * 90);
      const isDelayed = Math.random() < 0.12;
      const delayMinutes = isDelayed ? 15 + Math.floor(Math.random() * 65) : 0;
      const isApproaching = initialProgress > 0.88;
      const schedule = computeFlightSchedule(orig, dest, vel, initialProgress, delayMinutes);

      createdFlights.push({
        id: `flt-${flightIndex}-${flightNumber.toLowerCase()}`,
        flightNumber,
        callsign,
        airline: airline.name,
        airlineCode: airline.code,
        aircraftType: plane,
        aircraftCategory: plane.includes('747') || plane.includes('380') ? 'Super' : plane.includes('777') || plane.includes('350') || plane.includes('787') ? 'Heavy' : 'Medium',
        registration: `${airline.code}-${Math.floor(100 + Math.random() * 899)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        origin: orig,
        destination: dest,
        latitude: lat,
        longitude: lon,
        altitude: alt,
        velocity: vel,
        heading,
        verticalRate: isApproaching ? -750 : 0,
        squawk: randomSquawk(),
        status: isDelayed ? 'delayed' : isApproaching ? 'approaching' : 'on_time',
        delayMinutes,
        departureScheduled: schedule.departureScheduled,
        departureActual: schedule.departureActual,
        arrivalScheduled: schedule.arrivalScheduled,
        arrivalEstimated: schedule.arrivalEstimated,
        progressPercent: Math.round(initialProgress * 100),
        trail: [[lat - 0.2, lon - 0.2], [lat, lon]],
      });

      flightIndex++;
    }

    this.flights = createdFlights;
  }

  public tick(): Flight[] {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    this.flights = this.flights.map((flight) => {
      // 1. Bangalore TRACON terminal airspace flights
      if (flight.id.startsWith('flt-blr-')) {
        let lat = flight.latitude;
        let lon = flight.longitude;
        let alt = flight.altitude;
        let hdg = flight.heading;

        if (flight.id.includes('6e2405')) {
          lon += 0.0009;
          alt = Math.max(1200, alt - 18);
          if (lon > 77.705) {
            lon = 77.480;
            alt = 3200;
          }
        } else if (flight.id.includes('ai504')) {
          lon += 0.0010;
          alt = Math.max(2200, alt - 22);
          if (lon > 77.705) {
            lon = 77.420;
            alt = 4200;
          }
        } else if (flight.id.includes('qp1312')) {
          lon += 0.0011;
          alt = Math.max(2800, alt - 25);
          if (lon > 77.680) {
            lon = 77.380;
            alt = 5500;
          }
        } else if (flight.id.includes('6e918')) {
          lat -= 0.0012;
          lon -= 0.0002;
          alt = Math.max(4500, alt - 30);
          if (lat < 13.180) {
            lat = 13.380;
            lon = 77.530;
            alt = 7500;
          }
        } else if (flight.id.includes('6e314')) {
          lon += 0.0014;
          alt = Math.min(28000, alt + 110);
        } else if (flight.id.includes('ek565')) {
          lat += 0.0003;
          lon -= 0.0016;
          alt = Math.min(36000, alt + 130);
        }

        return {
          ...flight,
          latitude: lat,
          longitude: lon,
          altitude: alt,
          heading: hdg,
          trail: [[flight.latitude, flight.longitude], [lat, lon]],
        };
      }

      // 2. Standard en route flights
      let nextProgress = (flight.progressPercent / 100) + ((flight.velocity / 3600) * elapsedSeconds * 0.00035);
      if (nextProgress >= 0.98) {
        nextProgress = 0.03;
      }

      const { lat, lon, heading } = interpolatePosition(flight.origin, flight.destination, nextProgress);
      const isDelayed = flight.delayMinutes > 20;
      const isApproaching = nextProgress > 0.88;

      return {
        ...flight,
        latitude: lat,
        longitude: lon,
        heading,
        progressPercent: Math.round(nextProgress * 100),
        status: isDelayed ? 'delayed' : isApproaching ? 'approaching' : 'on_time',
        verticalRate: isApproaching ? -750 : 0,
        trail: [[lat - 0.2, lon - 0.2], [lat, lon]],
      };
    });

    return this.flights;
  }

  public getFlights(): Flight[] {
    return this.flights;
  }

  public getSummary(): AirspaceSummary {
    const total = this.flights.length;
    const delayed = this.flights.filter(f => f.status === 'delayed').length;
    const onTime = total - delayed;
    const avgAlt = Math.round(this.flights.reduce((acc, f) => acc + f.altitude, 0) / (total || 1));
    const avgVel = Math.round(this.flights.reduce((acc, f) => acc + f.velocity, 0) / (total || 1));

    return {
      totalAirborne: total,
      totalTracked: this.totalGlobalFleetCount,
      onTimeCount: onTime,
      delayedCount: delayed,
      avgAltitude: avgAlt,
      avgVelocity: avgVel,
      lastUpdated: new Date().toISOString(),
    };
  }
}
