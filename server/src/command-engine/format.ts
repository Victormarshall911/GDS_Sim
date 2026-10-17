/**
 * Formatting utilities for fixed-width, monospace terminal output.
 * Every display function in the project should use these helpers
 * so column alignment is consistent.
 */

/** Pad string to the right to a fixed width */
export function padRight(str: string, width: number): string {
  if (str.length >= width) return str.substring(0, width);
  return str + ' '.repeat(width - str.length);
}

/** Pad string to the left to a fixed width */
export function padLeft(str: string, width: number): string {
  if (str.length >= width) return str.substring(0, width);
  return ' '.repeat(width - str.length) + str;
}

/** Center a string within a fixed width */
export function center(str: string, width: number): string {
  if (str.length >= width) return str.substring(0, width);
  const left = Math.floor((width - str.length) / 2);
  const right = width - str.length - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

/** Months used in Sabre date formatting */
const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/** Days of week abbreviations */
const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** Format a Date as Sabre-style DDMMM (e.g. "15NOV") */
export function formatDateSabre(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  return `${day}${MONTHS[date.getMonth()]}`;
}

/** Format a Date as DDMMMYYYY (e.g. "15NOV2026") */
export function formatDateLong(date: Date): string {
  return `${formatDateSabre(date)}${date.getFullYear()}`;
}

/** Format time as HHMM (e.g. "0830") */
export function formatTimeSabre(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}${m}`;
}

/** Convert "HH:MM" to "HHMM" for display */
export function formatTimeDisplay(time: string): string {
  return time.replace(':', '');
}

/** Create a horizontal separator line */
export function horizontalLine(width: number = 60, char: string = '─'): string {
  return char.repeat(width);
}

/** Format rows into aligned columns. Each row is an array of cell strings. */
export function formatColumns(rows: string[][], widths: number[]): string {
  return rows
    .map((row) =>
      row.map((cell, i) => padRight(cell, widths[i] ?? cell.length)).join('')
    )
    .join('\n');
}

/**
 * Parse a Sabre date string like "15NOV" and return the next occurrence
 * of that date (today or in the future).
 */
export function parseSabreDate(dateStr: string): Date | null {
  return parseGdsDate(dateStr);
}

/**
 * Parse a GDS date string with support for:
 * 1. "19OCT" (rolls to next occurrence if in past)
 * 2. "19OCT26" or "19OCT2026" (explicit 2 or 4 digit year)
 * 3. Bare day "19" (for current month, rolls to next occurrence if in past)
 */
export function parseGdsDate(dateStr: string, referenceDate: Date = new Date()): Date | null {
  const clean = dateStr.trim().toUpperCase();
  if (!clean) return null;

  const monthMap: Record<string, number> = {};
  MONTHS.forEach((m, i) => { monthMap[m] = i; });

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  // Format 1: 19OCT26 or 19OCT2026
  const fullMatch = clean.match(/^(\d{1,2})([A-Z]{3})(\d{2}|\d{4})$/);
  if (fullMatch) {
    const day = parseInt(fullMatch[1], 10);
    const month = monthMap[fullMatch[2]];
    let year = parseInt(fullMatch[3], 10);
    if (year < 100) year = 2000 + year;
    if (month === undefined || day < 1 || day > 31) return null;
    return new Date(year, month, day);
  }

  // Format 2: 19OCT
  const monthMatch = clean.match(/^(\d{1,2})([A-Z]{3})$/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const month = monthMap[monthMatch[2]];
    if (month === undefined || day < 1 || day > 31) return null;
    let year = ref.getFullYear();
    let candidate = new Date(year, month, day);
    if (candidate < ref) {
      candidate = new Date(year + 1, month, day);
    }
    return candidate;
  }

  // Format 3: bare day "19"
  const dayMatch = clean.match(/^(\d{1,2})$/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day < 1 || day > 31) return null;
    let year = ref.getFullYear();
    let month = ref.getMonth();
    let candidate = new Date(year, month, day);
    if (candidate < ref) {
      candidate = new Date(year, month + 1, day);
    }
    return candidate;
  }

  return null;
}

/** Format a Date as ISO date string (YYYY-MM-DD) */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get 2-letter day of week from a Date */
export function getDayOfWeek(date: Date): string {
  return DAYS[date.getDay()];
}

/**
 * Format a full PNR display according to standard Sabre layout.
 */
export function formatPnrDisplay(pnr: {
  recordLocator?: string;
  passengers: Array<{
    lastName?: string;
    last_name?: string;
    firstName?: string;
    first_name?: string;
    title: string;
    paxType?: string;
    pax_type?: string;
    dob?: string;
  }>;

  segments: Array<{
    airlineCode?: string;
    airline_code?: string;
    flightNumber?: number;
    flight_number?: number;
    classCode?: string;
    class_code?: string;
    travelDate?: string;
    travel_date?: string;
    origin: string;
    destination: string;
    departureTime?: string;
    departure_time?: string;
    arrivalTime?: string;
    arrival_time?: string;
    status: string;
    numSeats?: number;
    num_seats?: number;
    aircraft?: string;
  }>;
  phone: string | null;
  ticketing: string | null;
  receivedFrom: string | null;
  agentId?: string | null;
  status?: string;
}): string {
  const lines: string[] = [];
  const locator = pnr.recordLocator ?? 'NO-LOC';

  // Header line: LOCATOR - 1.1 LAST/FIRST TITLE
  const paxList = pnr.passengers.map((p: any, idx) => {
    const lastName = p.lastName ?? p.last_name ?? '';
    const firstName = p.firstName ?? p.first_name ?? '';
    const title = p.title ?? '';
    const paxType = p.paxType ?? p.pax_type ?? 'ADT';
    const dob = p.dob;

    let suffix = '';
    if (paxType === 'CHD') suffix = dob ? `(CHD/${dob})` : '(CHD)';
    if (paxType === 'INF') suffix = dob ? `(INF/${dob})` : '(INF)';
    return `1.${idx + 1} ${lastName}/${firstName}${title ? ' ' + title : ''}${suffix}`;
  });


  if (paxList.length > 0) {
    lines.push(`${locator} - ${paxList[0]}`);
    for (let i = 1; i < paxList.length; i++) {
      lines.push(`          ${paxList[i]}`);
    }
  } else {
    lines.push(`${locator} - NO PASSENGER NAMES`);
  }

  // Segments
  if (pnr.segments.length > 0) {
    pnr.segments.forEach((s, idx) => {
      const segNum = (idx + 1).toString().padStart(2, ' ');
      const airline = s.airlineCode ?? s.airline_code ?? '';
      const flightNum = (s.flightNumber ?? s.flight_number ?? '').toString().padStart(4, ' ');
      const cls = s.classCode ?? s.class_code ?? '';
      const dateRaw = s.travelDate ?? s.travel_date ?? '';
      const dateObj = new Date(`${dateRaw}T00:00:00`);
      const sabreDate = isNaN(dateObj.getTime()) ? dateRaw : formatDateSabre(dateObj);
      const origDest = `${s.origin}${s.destination}`;
      const st = s.status;
      const seats = s.numSeats ?? s.num_seats ?? 1;
      const dep = formatTimeDisplay(s.departureTime ?? s.departure_time ?? '');
      const arr = formatTimeDisplay(s.arrivalTime ?? s.arrival_time ?? '');

      lines.push(`${segNum}  ${airline}${flightNum}${cls} ${sabreDate} ${origDest} ${st}${seats}  ${dep} ${arr} /E`);
    });
  } else {
    lines.push('NO ITINERARY SEGMENTS');
  }

  // Ticketing
  lines.push('TKT/TIME LIMIT');
  if (pnr.ticketing) {
    lines.push(`  1.${pnr.ticketing}`);
  } else {
    lines.push('  1.NONE');
  }

  // Phone
  lines.push('PHONES');
  if (pnr.phone) {
    lines.push(`  1.${pnr.phone}`);
  } else {
    lines.push('  1.NONE');
  }

  // Received From
  if (pnr.receivedFrom) {
    lines.push(`RECEIVED FROM - ${pnr.receivedFrom}`);
  }

  if (pnr.status && pnr.status !== 'ACTIVE') {
    lines.push(`STATUS - ${pnr.status}`);
  }

  // Footer
  const now = new Date();
  const time = formatTimeSabre(now);
  const date = formatDateSabre(now);
  const year = now.getFullYear().toString().substring(2);
  const agent = pnr.agentId ?? '7890';
  lines.push(`B${agent}.B${agent}*AAR ${time}/${date}${year} ${locator}`);

  return lines.join('\n');
}

