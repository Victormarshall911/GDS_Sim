import type { SessionState, CommandResult, DataStore, SegmentEntry } from '../../types';
import { parseSabreDate, formatDateSabre, formatTimeDisplay, padRight } from '../../format';

/**
 * Handle 0<line><class><seats>  –  e.g. 01Y1
 */
export function handleSellFromAvail(
  lineNum: number,
  classCode: string,
  numSeats: number,
  state: SessionState,
  _store: DataStore
): CommandResult {
  if (!state.lastAvailability || state.lastAvailability.lines.length === 0) {
    return {
      output: 'NO AVAILABILITY IN CONTEXT - ENTER 1<ORIG><DEST><DATE>',
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

  const newSegmentNumber = currentWorkingPnr.segments.length + 1;

  const segment: SegmentEntry = {
    airlineCode: availLine.airlineCode,
    flightNumber: availLine.flightNumber,
    classCode,
    travelDate: availLine.travelDate,
    origin: availLine.origin,
    destination: availLine.destination,
    departureTime: availLine.departureTime,
    arrivalTime: availLine.arrivalTime,
    status: 'SS', // Freshly sold segment status
    numSeats,
    aircraft: availLine.aircraft,
  };

  const updatedSegments = [...currentWorkingPnr.segments, segment];

  // Sabre segment acknowledgment format:
  // "01 W3 501Y 15NOV LOSLHR SS1  0830 1445 /E"
  const dateObj = new Date(`${availLine.travelDate}T00:00:00`);
  const sabreDate = formatDateSabre(dateObj);
  const dep = formatTimeDisplay(availLine.departureTime);
  const arr = formatTimeDisplay(availLine.arrivalTime);

  const segNumStr = newSegmentNumber.toString().padStart(2, '0');
  const output = `${segNumStr} ${availLine.airlineCode} ${availLine.flightNumber}${classCode} ${sabreDate} ${availLine.origin}${availLine.destination} SS${numSeats}  ${dep} ${arr} /E`;

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
 * Handle direct sell  –  e.g. 0W3501Y15NOVLOSLHR1
 */
export function handleDirectSell(
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
  const travelDateObj = parseSabreDate(dateStr);
  if (!travelDateObj) {
    return {
      output: 'INVALID DATE FORMAT - USE DDMMM',
      newState: state,
    };
  }

  const isoDate = travelDateObj.toISOString().split('T')[0];
  const dayOfWeek = travelDateObj.getDay() === 0 ? 7 : travelDateObj.getDay();

  const flights = store.searchFlights(origin, destination, isoDate, dayOfWeek);
  const matchedFlight = flights.find(
    (f) => f.airline_code === airlineCode && f.flight_number === flightNumber
  );

  if (!matchedFlight) {
    return {
      output: `FLIGHT ${airlineCode} ${flightNumber} NOT FOUND ON ${dateStr} ${origin}-${destination}`,
      newState: state,
    };
  }

  const classInfo = matchedFlight.classes.find((c) => c.code === classCode);
  if (!classInfo) {
    return {
      output: `CLASS ${classCode} NOT OFFERED ON FLIGHT`,
      newState: state,
    };
  }

  if (classInfo.seats < numSeats) {
    return {
      output: `INSUFFICIENT SEATS - ONLY ${classInfo.seats} AVAILABLE`,
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

  const newSegmentNumber = currentWorkingPnr.segments.length + 1;

  const segment: SegmentEntry = {
    airlineCode,
    flightNumber,
    classCode,
    travelDate: isoDate,
    origin,
    destination,
    departureTime: matchedFlight.departure_time,
    arrivalTime: matchedFlight.arrival_time,
    status: 'SS',
    numSeats,
    aircraft: matchedFlight.aircraft,
  };

  const updatedSegments = [...currentWorkingPnr.segments, segment];

  const sabreDate = formatDateSabre(travelDateObj);
  const dep = formatTimeDisplay(matchedFlight.departure_time);
  const arr = formatTimeDisplay(matchedFlight.arrival_time);
  const segNumStr = newSegmentNumber.toString().padStart(2, '0');

  const output = `${segNumStr} ${airlineCode} ${flightNumber}${classCode} ${sabreDate} ${origin}${destination} SS${numSeats}  ${dep} ${arr} /E`;

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
