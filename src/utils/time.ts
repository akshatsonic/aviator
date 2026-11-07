export type TimezoneCode =
  | 'UTC'
  | 'LOCAL'
  | 'IST'
  | 'GST'
  | 'GMT'
  | 'CET'
  | 'SGT'
  | 'JST'
  | 'EST'
  | 'PST';

export interface TimezoneOption {
  code: TimezoneCode;
  label: string;
  sublabel: string;
  offset: string;
  ianaZone?: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { code: 'UTC', label: 'UTC (Zulu)', sublabel: 'Aviation Standard', offset: '+00:00' },
  { code: 'LOCAL', label: 'Local Device', sublabel: 'System Time', offset: 'Auto' },
  { code: 'IST', label: 'IST (India)', sublabel: 'Bangalore / Delhi / Mumbai', offset: '+05:30', ianaZone: 'Asia/Kolkata' },
  { code: 'GST', label: 'GST (Gulf)', sublabel: 'Dubai / Abu Dhabi / Doha', offset: '+04:00', ianaZone: 'Asia/Dubai' },
  { code: 'GMT', label: 'GMT / BST (UK)', sublabel: 'London Heathrow', offset: '+00:00', ianaZone: 'Europe/London' },
  { code: 'CET', label: 'CET (Europe)', sublabel: 'Paris / Frankfurt / Amsterdam', offset: '+01:00', ianaZone: 'Europe/Paris' },
  { code: 'SGT', label: 'SGT (Singapore)', sublabel: 'Singapore Changi', offset: '+08:00', ianaZone: 'Asia/Singapore' },
  { code: 'JST', label: 'JST (Japan)', sublabel: 'Tokyo Haneda / Narita', offset: '+09:00', ianaZone: 'Asia/Tokyo' },
  { code: 'EST', label: 'EST / EDT (US East)', sublabel: 'New York JFK / Chicago', offset: '-05:00', ianaZone: 'America/New_York' },
  { code: 'PST', label: 'PST / PDT (US West)', sublabel: 'Los Angeles / San Francisco', offset: '-08:00', ianaZone: 'America/Los_Angeles' },
];

export function formatTimeInZone(date: Date, timezone: TimezoneCode): string {
  if (timezone === 'UTC') {
    return date.toUTCString().slice(17, 25) + ' UTC';
  }

  if (timezone === 'LOCAL') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' Local';
  }

  const opt = TIMEZONE_OPTIONS.find(t => t.code === timezone);
  if (opt?.ianaZone) {
    try {
      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: opt.ianaZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
      return `${formatted} ${opt.code}`;
    } catch {
      return date.toUTCString().slice(17, 25) + ' UTC';
    }
  }

  return date.toUTCString().slice(17, 25) + ' UTC';
}

/**
 * Convert a flight time string (e.g. "16:45" or "19:15" in UTC) to user selected timezone
 */
export function convertUtcTimeString(utcTimeStr: string, timezone: TimezoneCode): string {
  if (!utcTimeStr) return '--:--';
  if (timezone === 'UTC') return `${utcTimeStr} UTC`;

  const parts = utcTimeStr.split(':');
  if (parts.length < 2) return utcTimeStr;

  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(mins)) return utcTimeStr;

  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, mins, 0));

  if (timezone === 'LOCAL') {
    return utcDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Local';
  }

  const opt = TIMEZONE_OPTIONS.find(t => t.code === timezone);
  if (opt?.ianaZone) {
    try {
      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: opt.ianaZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(utcDate);
      return `${formatted} ${opt.code}`;
    } catch {
      return `${utcTimeStr} UTC`;
    }
  }

  return `${utcTimeStr} UTC`;
}
