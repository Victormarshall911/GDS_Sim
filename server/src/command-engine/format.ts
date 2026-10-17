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
  const monthMap: Record<string, number> = {};
  MONTHS.forEach((m, i) => { monthMap[m] = i; });

  const match = dateStr.match(/^(\d{1,2})([A-Z]{3})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = monthMap[match[2]];
  if (month === undefined || day < 1 || day > 31) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let year = now.getFullYear();
  let candidate = new Date(year, month, day);
  if (candidate < now) {
    candidate = new Date(year + 1, month, day);
  }
  return candidate;
}

/** Format a Date as ISO date string (YYYY-MM-DD) */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get 2-letter day of week from a Date */
export function getDayOfWeek(date: Date): string {
  return DAYS[date.getDay()];
}
