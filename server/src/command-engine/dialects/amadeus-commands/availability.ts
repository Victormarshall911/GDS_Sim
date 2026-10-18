import type { SessionState, CommandResult, DataStore, AvailabilityLine } from '../../types';
import { parseGdsDate, formatDateSabre, padRight, padLeft, formatTimeDisplay } from '../../format';
import {
  parseAvailabilityModifiers,
  mergeAvailabilityModifiers,
  AMADEUS_RETURN_AVAILABILITY_CONFIG,
} from '../../command-config';

export interface AmadeusAvailQuery {
  cmdType: 'AN' | 'AD' | 'AE' | 'AA' | 'SN' | 'TN';
  dateStr?: string;
  origin: string;
  destination: string;
  returnDateStr?: string;
  modifiersStr?: string;
  timeStr?: string;
}

/**
 * Calculate flight duration in minutes
 */
export function getFlightDurationMinutes(depTime: string, arrTime: string): number {
  const [depH, depM] = depTime.split(':').map(Number);
  const [arrH, arrM] = arrTime.split(':').map(Number);
  let diff = arrH * 60 + arrM - (depH * 60 + depM);
  if (diff < 0) {
    diff += 24 * 60; // Next-day arrival
  }
  return diff;
}

/**
 * Format minutes into "01H15M" format
 */
export function formatDurationString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}H${m.toString().padStart(2, '0')}M`;
}

/**
 * Parse an Amadeus availability entry like:
 * "AN19OCTLOSABV/AP4"
 * "AN 19OCT LOS ABV /A P4"
 * "AN19LOSABV"
 * "AN15MARBOMDEL*22MAR"
 * "AD15MARBOMDEL0800"
 * "AA15MARDELLHR1700"
 */
export function parseAmadeusAvailEntry(input: string): AmadeusAvailQuery | null {
  const clean = input.trim().toUpperCase();

  // Extract modifiers (everything starting from the first '/')
  const slashIdx = clean.indexOf('/');
  const core = (slashIdx !== -1 ? clean.substring(0, slashIdx) : clean).trim();
  const modifiersStr = slashIdx !== -1 ? clean.substring(slashIdx) : '';

  // Match command type
  const cmdMatch = core.match(/^(AN|AD|AE|AA|SN|TN)\s*(.*)$/);
  if (!cmdMatch) return null;

  const cmdType = cmdMatch[1] as AmadeusAvailQuery['cmdType'];
  const rest = cmdMatch[2].trim();

  // Check for round-trip return date with '*'
  let outboundPart = rest;
  let returnDateStr: string | undefined;
  if (rest.includes('*')) {
    const starParts = rest.split('*');
    outboundPart = starParts[0].trim();
    returnDateStr = starParts[1].trim();
  }

  // Remove spaces within the route/date part: e.g. "19OCT LOS ABV" -> "19OCTLOSABV"
  const compact = outboundPart.replace(/\s+/g, '');

  // 1. Date + Origin + Dest + Time: e.g. "15MARBOMDEL0800"
  let m = compact.match(/^(\d{1,2}[A-Z]{3}(?:\d{2}|\d{4})?)([A-Z]{3})([A-Z]{3})(\d{4})$/);
  if (m) {
    return {
      cmdType,
      dateStr: m[1],
      origin: m[2],
      destination: m[3],
      timeStr: m[4],
      returnDateStr,
      modifiersStr,
    };
  }

  // 2. Date + Origin + Dest: e.g. "19OCT26LOSABV" or "19OCTLOSABV"
  m = compact.match(/^(\d{1,2}[A-Z]{3}(?:\d{2}|\d{4})?)([A-Z]{3})([A-Z]{3})$/);
  if (m) {
    return {
      cmdType,
      dateStr: m[1],
      origin: m[2],
      destination: m[3],
      returnDateStr,
      modifiersStr,
    };
  }

  // 3. Bare day + Origin + Dest: e.g. "19LOSABV"
  m = compact.match(/^(\d{1,2})([A-Z]{3})([A-Z]{3})$/);
  if (m) {
    return {
      cmdType,
      dateStr: m[1],
      origin: m[2],
      destination: m[3],
      returnDateStr,
      modifiersStr,
    };
  }

  // 4. No date specified (defaults to today): e.g. "LOSABV"
  m = compact.match(/^([A-Z]{3})([A-Z]{3})$/);
  if (m) {
    return {
      cmdType,
      dateStr: undefined,
      origin: m[1],
      destination: m[2],
      returnDateStr,
      modifiersStr,
    };
  }

  return null;
}

/**
 * Handle AC (Availability Change)
 */
export function handleAmadeusAvailabilityChange(
  rawInput: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  if (!state.lastAvailability) {
    return {
      output: 'NO ACTIVE AVAILABILITY DISPLAY TO CHANGE',
      newState: state,
    };
  }

  const changeArg = rawInput.trim().toUpperCase().replace(/^AC\s*/, '').trim();
  const current = state.lastAvailability;

  let newDate = current.date;
  let newOrigin = current.origin;
  let newDest = current.destination;
  let newModifiers = current.modifiersStr || '';

  if (changeArg.startsWith('/')) {
    // Modifier change: e.g. AC/AP4
    newModifiers = mergeAvailabilityModifiers(current.modifiersStr, changeArg);
  } else if (/^\d{1,2}[A-Z]{3}(?:\d{2})?$/.test(changeArg)) {
    // Date change: e.g. AC20MAR
    const parsedD = parseGdsDate(changeArg);
    if (parsedD) {
      newDate = parsedD.toISOString().slice(0, 10);
    }
  } else if (/^[A-Z]{6}$/.test(changeArg)) {
    // Route change: e.g. ACLOSABV
    newOrigin = changeArg.slice(0, 3);
    newDest = changeArg.slice(3, 6);
  } else if (/^\d+$/.test(changeArg)) {
    // Day offset: e.g. AC1
    const d = new Date(current.date);
    d.setUTCDate(d.getUTCDate() + parseInt(changeArg, 10));
    newDate = d.toISOString().slice(0, 10);
  }

  const [y, m, d] = newDate.split('-').map(Number);
  const gdsDateStr = formatDateSabre(new Date(Date.UTC(y, m - 1, d)));
  const newCmd = `AN${gdsDateStr}${newOrigin}${newDest}${newModifiers}`;

  return handleAmadeusAvailability(newCmd, state, store);
}

/**
 * Handle ACR / AR (Availability Change Return)
 * Swaps origin and destination, uses new date (or last date if none given),
 * carries modifiers over using mergeAvailabilityModifiers (new modifiers override),
 * and makes the result the new lastAvailability.
 */
export function handleAmadeusAvailabilityReturn(
  rawInput: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  if (!state.lastAvailability) {
    return {
      output: AMADEUS_RETURN_AVAILABILITY_CONFIG.errorNoPriorDisplay,
      newState: state,
    };
  }

  const clean = rawInput.trim();
  const arg = clean.replace(/^(?:ACR|AR)\s*/i, '').trim().toUpperCase();
  const current = state.lastAvailability;

  // Swap origin and destination
  const newOrigin = current.destination;
  const newDest = current.origin;

  let datePart = arg;
  let modPart = '';

  const slashIdx = arg.indexOf('/');
  if (slashIdx !== -1) {
    datePart = arg.substring(0, slashIdx).trim();
    modPart = arg.substring(slashIdx).trim();
  }

  // Determine new travel date: new date if provided, otherwise keep last date
  let newDate = current.date;
  if (datePart) {
    const parsedD = parseGdsDate(datePart);
    if (parsedD) {
      newDate = parsedD.toISOString().slice(0, 10);
    }
  }

  // Merge modifiers: new overrides previous
  const finalModifiers = mergeAvailabilityModifiers(current.modifiersStr, modPart);

  const [y, m, d] = newDate.split('-').map(Number);
  const gdsDateStr = formatDateSabre(new Date(Date.UTC(y, m - 1, d)));
  const newCmd = `AN${gdsDateStr}${newOrigin}${newDest}${finalModifiers}`;

  return handleAmadeusAvailability(newCmd, state, store);
}

export function handleAmadeusAvailability(
  rawInput: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const upper = rawInput.trim().toUpperCase();
  const returnCmdCodes = AMADEUS_RETURN_AVAILABILITY_CONFIG.commands.map((c) => c.code);
  const returnPattern = new RegExp(`^(?:${returnCmdCodes.join('|')})(?:\\s*(.*))?$`, 'i');
  if (returnPattern.test(upper)) {
    return handleAmadeusAvailabilityReturn(rawInput, state, store);
  }

  if (upper.startsWith('AC')) {
    return handleAmadeusAvailabilityChange(rawInput, state, store);
  }

  const parsed = parseAmadeusAvailEntry(rawInput);
  if (!parsed) {
    return {
      output: 'INVALID AVAILABILITY ENTRY - USE AN<DATE><ORIG><DEST> (E.G. AN19OCTLOSABV/AP4)',
      newState: state,
    };
  }

  // Parse modifiers
  const modOpts = parseAvailabilityModifiers(parsed.modifiersStr || '');
  if (modOpts.errors.length > 0) {
    return {
      output: modOpts.errors.join('\n'),
      newState: state,
    };
  }

  // Parse date
  const travelDateObj = parsed.dateStr ? parseGdsDate(parsed.dateStr) : new Date();
  if (!travelDateObj) {
    return {
      output: 'INVALID DATE FORMAT - USE DDMMM (E.G. 19OCT) OR DDMMMYY (E.G. 19OCT26)',
      newState: state,
    };
  }

  const isoDate = travelDateObj.toISOString().split('T')[0];
  const dayOfWeek = travelDateObj.getDay() === 0 ? 7 : travelDateObj.getDay();

  // Search flights in DB
  let flights = store.searchFlights(parsed.origin, parsed.destination, isoDate, dayOfWeek);

  // Apply airline filter
  if (modOpts.airlines && modOpts.airlines.length > 0) {
    flights = flights.filter((f) => modOpts.airlines!.includes(f.airline_code));
  }

  // Apply class filter if provided
  if (modOpts.classCode) {
    flights = flights.filter((f) =>
      f.classes.some((c) => c.code === modOpts.classCode && c.seats > 0)
    );
  }

  // Sort by command type:
  // AD: sort by departure time ascending
  // AA: sort by arrival time ascending
  // AE: sort by elapsed flight time ascending
  // SN/TN/AN: standard departure time sort
  if (parsed.cmdType === 'AD') {
    flights.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  } else if (parsed.cmdType === 'AA') {
    flights.sort((a, b) => a.arrival_time.localeCompare(b.arrival_time));
  } else if (parsed.cmdType === 'AE') {
    flights.sort((a, b) => {
      const durA = getFlightDurationMinutes(a.departure_time, a.arrival_time);
      const durB = getFlightDurationMinutes(b.departure_time, b.arrival_time);
      if (durA !== durB) return durA - durB;
      return a.departure_time.localeCompare(b.departure_time);
    });
  } else if (parsed.cmdType === 'SN' || parsed.cmdType === 'TN') {
    flights.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  }

  const formattedDate = formatDateSabre(travelDateObj);
  const timeDisplay = parsed.timeStr || '0000';
  const header = `${parsed.cmdType}  ${formattedDate} ${parsed.origin}-${parsed.destination}  ${timeDisplay}`;

  if (flights.length === 0) {
    const filterNote = modOpts.airlines?.length
      ? ` FOR ${modOpts.airlines.join(', ')}`
      : '';
    const output = [
      '',
      header,
      `NO FLIGHTS FOUND${filterNote} ON ${formattedDate} ${parsed.origin}-${parsed.destination}`,
      '',
    ].join('\n');

    return {
      output,
      newState: {
        ...state,
        lastAvailability: null,
      },
    };
  }

  const lines: AvailabilityLine[] = [];
  const outputLines: string[] = ['', header];

  flights.forEach((f, idx) => {
    const lineNum = idx + 1;
    const airline = padRight(f.airline_code, 2);
    const flightNumberStr = padLeft(f.flight_number.toString(), 4);

    const classStr = f.classes.map((c) => `${c.code}${c.seats}`).join(' ');
    const cityPair = `${f.origin}${f.destination}`;
    const depTime = formatTimeDisplay(f.departure_time);
    const arrTime = formatTimeDisplay(f.arrival_time);
    const ac = padRight(f.aircraft, 4);

    const durationMinutes = getFlightDurationMinutes(f.departure_time, f.arrival_time);
    const elapsedTimeStr = formatDurationString(durationMinutes);

    // Amadeus style line: " 1   P4 7120  J4 C4 D2 Y9 B9 M7 H7 K4  LOSABV  0830 0945  0  738   E"
    const lineOutput = ` ${padRight(lineNum.toString(), 2)}  ${airline} ${flightNumberStr}  ${padRight(classStr, 25)}  ${cityPair}  ${depTime} ${arrTime}  0  ${ac}  E`;
    outputLines.push(lineOutput);

    lines.push({
      lineNumber: lineNum,
      airlineCode: f.airline_code,
      flightNumber: f.flight_number,
      origin: f.origin,
      destination: f.destination,
      departureTime: f.departure_time,
      arrivalTime: f.arrival_time,
      aircraft: f.aircraft,
      classes: f.classes,
      elapsedTime: elapsedTimeStr,
      stops: 0,
      travelDate: isoDate,
      flightId: f.id,
    });
  });

  // If round trip search (*returnDate)
  if (parsed.returnDateStr) {
    const returnDateObj = parseGdsDate(parsed.returnDateStr);
    if (returnDateObj) {
      const returnIso = returnDateObj.toISOString().split('T')[0];
      const returnDow = returnDateObj.getDay() === 0 ? 7 : returnDateObj.getDay();
      let returnFlights = store.searchFlights(parsed.destination, parsed.origin, returnIso, returnDow);
      if (modOpts.airlines && modOpts.airlines.length > 0) {
        returnFlights = returnFlights.filter((f) => modOpts.airlines!.includes(f.airline_code));
      }

      outputLines.push('');
      outputLines.push(`RETURN AVAILABILITY: ${formatDateSabre(returnDateObj)} ${parsed.destination}-${parsed.origin}`);
      returnFlights.forEach((rf, rIdx) => {
        const rLineNum = lines.length + 1;
        const rClassStr = rf.classes.map((c) => `${c.code}${c.seats}`).join(' ');
        const rDurationMinutes = getFlightDurationMinutes(rf.departure_time, rf.arrival_time);
        const rElapsedStr = formatDurationString(rDurationMinutes);
        outputLines.push(` ${padRight(rLineNum.toString(), 2)}  ${rf.airline_code} ${rf.flight_number}  ${padRight(rClassStr, 25)}  ${rf.origin}${rf.destination}  ${formatTimeDisplay(rf.departure_time)} ${formatTimeDisplay(rf.arrival_time)}  0  ${rf.aircraft}  E`);
        lines.push({
          lineNumber: rLineNum,
          airlineCode: rf.airline_code,
          flightNumber: rf.flight_number,
          origin: rf.origin,
          destination: rf.destination,
          departureTime: rf.departure_time,
          arrivalTime: rf.arrival_time,
          aircraft: rf.aircraft,
          classes: rf.classes,
          elapsedTime: rElapsedStr,
          stops: 0,
          travelDate: returnIso,
          flightId: rf.id,
        });
      });
    }
  }

  outputLines.push('');

  return {
    output: outputLines.join('\n'),
    newState: {
      ...state,
      lastAvailability: {
        origin: parsed.origin,
        destination: parsed.destination,
        date: isoDate,
        lines,
        modifiersStr: parsed.modifiersStr || '',
      },
      availabilityPage: 0,
    },
  };
}
