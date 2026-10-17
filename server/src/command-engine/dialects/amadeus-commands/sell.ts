import type { SessionState, CommandResult, DataStore, SegmentEntry } from '../../types';
import { parseGdsDate, formatDateSabre, formatTimeDisplay } from '../../format';
import { AMADEUS_CONFIG } from '../../command-config';

/**
 * Handle short sell: SS<seats><class><line>  e.g. SS1Y1 or SS 1 Y 1
 */
export function handleAmadeusSellShort(
  numSeats: number,
  classCode: string,
  lineNum: number,
  state: SessionState,
  _store: DataStore
): CommandResult {
  if (!state.lastAvailability || state.lastAvailability.lines.length === 0) {
    return {
      output: 'NO AVAILABILITY IN CONTEXT - ENTER AN<DATE><ORIG><DEST>',
      newState: state,
    };
  }

  const availLine = state.lastAvailability.lines.find((l) => l.lineNumber === lineNum);
  if (!availLine) {
    return {
      output: `INVALID LINE NUMBER - CHOOSE 1 TO ${state.lastAvailability.lines.length}`,
      newState: state,
    };
  }

  const classInfo = availLine.classes.find((c) => c.code === classCode);
  if (!classInfo) {
    return {
      output: `CLASS ${classCode} NOT AVAILABLE ON FLIGHT ${availLine.airlineCode} ${availLine.flightNumber}`,
      newState: state,
    };
  }

  if (classInfo.seats < numSeats) {
    return {
      output: `INSUFFICIENT SEATS - ONLY ${classInfo.seats} AVAILABLE IN ${classCode}`,
      newState: state,
    };
  }

  const currentWorkingPnr = state.workingPnr ?? {
    passengers: [],
    segments: [],
    phone: null,
    ticketing: null,
    receivedFrom: null,
  };

  const status = `${AMADEUS_CONFIG.soldSegmentStatus}${numSeats}`;

  const segment: SegmentEntry = {
    airlineCode: availLine.airlineCode,
    flightNumber: availLine.flightNumber,
    classCode,
    travelDate: availLine.travelDate,
    origin: availLine.origin,
    destination: availLine.destination,
    departureTime: availLine.departureTime,
    arrivalTime: availLine.arrivalTime,
    status,
    numSeats,
    aircraft: availLine.aircraft,
  };

  const updatedSegments = [...currentWorkingPnr.segments, segment];
  const segNumber = updatedSegments.length;

  const dateObj = new Date(`${availLine.travelDate}T00:00:00`);
  const gdsDate = formatDateSabre(dateObj);
  const dep = formatTimeDisplay(availLine.departureTime);
  const arr = formatTimeDisplay(availLine.arrivalTime);

  // Amadeus segment acknowledgment:
  // " 1  AI 101 Y 15MAR BOMDEL HK1  0800 1010  320 E"
  const output = ` ${segNumber}  ${availLine.airlineCode} ${availLine.flightNumber} ${classCode} ${gdsDate} ${availLine.origin}${availLine.destination} ${status}  ${dep} ${arr}  ${availLine.aircraft || '738'} E`;

  return {
    output,
    newState: {
      ...state,
      workingPnr: {
        ...currentWorkingPnr,
        segments: updatedSegments,
      },
    },
  };
}

/**
 * Handle long sell: SSAI101Y15MARBOMDEL1
 * Syntax: SS <airline><flight><class><date><origin><dest><seats>
 */
export function handleAmadeusSellLong(
  airlineCode: string,
  flightNumber: number,
  classCode: string,
  dateStr: string,
  origin: string,
  destination: string,
  numSeats: number,
  state: SessionState,
  store: DataStore
): CommandResult {
  const travelDateObj = parseGdsDate(dateStr);
  if (!travelDateObj) {
    return {
      output: `INVALID DATE IN LONG SELL: "${dateStr}"`,
      newState: state,
    };
  }

  const isoDate = travelDateObj.toISOString().split('T')[0];
  const dayOfWeek = travelDateObj.getDay() === 0 ? 7 : travelDateObj.getDay();

  // Search flights in store
  const flights = store.searchFlights(origin, destination, isoDate, dayOfWeek);
  const flight = flights.find(
    (f) => f.airline_code === airlineCode && f.flight_number === flightNumber
  );

  if (!flight) {
    return {
      output: `FLIGHT ${airlineCode} ${flightNumber} NOT FOUND ON ${origin}-${destination} FOR ${dateStr.toUpperCase()}`,
      newState: state,
    };
  }

  const classInfo = flight.classes.find((c) => c.code === classCode);
  if (!classInfo) {
    return {
      output: `CLASS ${classCode} NOT AVAILABLE ON FLIGHT ${airlineCode} ${flightNumber}`,
      newState: state,
    };
  }

  if (classInfo.seats < numSeats) {
    return {
      output: `INSUFFICIENT SEATS - ONLY ${classInfo.seats} AVAILABLE IN ${classCode}`,
      newState: state,
    };
  }

  const currentWorkingPnr = state.workingPnr ?? {
    passengers: [],
    segments: [],
    phone: null,
    ticketing: null,
    receivedFrom: null,
  };

  const status = `${AMADEUS_CONFIG.soldSegmentStatus}${numSeats}`;

  const segment: SegmentEntry = {
    airlineCode,
    flightNumber,
    classCode,
    travelDate: isoDate,
    origin,
    destination,
    departureTime: flight.departure_time,
    arrivalTime: flight.arrival_time,
    status,
    numSeats,
    aircraft: flight.aircraft,
  };

  const updatedSegments = [...currentWorkingPnr.segments, segment];
  const segNumber = updatedSegments.length;

  const gdsDate = formatDateSabre(travelDateObj);
  const dep = formatTimeDisplay(flight.departure_time);
  const arr = formatTimeDisplay(flight.arrival_time);

  const output = ` ${segNumber}  ${airlineCode} ${flightNumber} ${classCode} ${gdsDate} ${origin}${destination} ${status}  ${dep} ${arr}  ${flight.aircraft || '738'} E`;

  return {
    output,
    newState: {
      ...state,
      workingPnr: {
        ...currentWorkingPnr,
        segments: updatedSegments,
      },
    },
  };
}
