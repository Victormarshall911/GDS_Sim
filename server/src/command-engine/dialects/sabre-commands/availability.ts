import type { SessionState, CommandResult, DataStore, AvailabilityLine } from '../../types';
import { parseSabreDate, formatDateSabre, padRight, padLeft, formatTimeDisplay } from '../../format';

export function handleAvailability(
  origin: string,
  destination: string,
  dateStr: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const travelDateObj = parseSabreDate(dateStr);
  if (!travelDateObj) {
    return {
      output: 'INVALID DATE FORMAT - USE DDMMM (E.G. 15NOV)',
      newState: state,
    };
  }

  const isoDate = travelDateObj.toISOString().split('T')[0];
  const dayOfWeek = travelDateObj.getDay() === 0 ? 7 : travelDateObj.getDay();

  const flights = store.searchFlights(origin, destination, isoDate, dayOfWeek);

  const formattedDate = formatDateSabre(travelDateObj);
  const yearTwoDigit = travelDateObj.getFullYear().toString().substring(2);
  const headerDate = `${formattedDate}${yearTwoDigit}`;

  if (flights.length === 0) {
    const output = [
      '',
      `${headerDate}**${headerDate}/${origin}${destination}/NSP;1/0000/0000`,
      'NO FLIGHTS FOUND FOR REQUESTED ROUTE / DATE',
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
  const outputLines: string[] = [
    '',
    `${headerDate}**${headerDate}/${origin}${destination}/NSP;1/0000/0000`,
  ];

  flights.forEach((f, idx) => {
    const lineNum = idx + 1;
    const airline = padRight(f.airline_code, 2);
    const flightNumberStr = padLeft(f.flight_number.toString(), 4);

    // Format classes: e.g. "J4 C4 D2 Y9 B9 M7 H7 K4"
    const classStr = f.classes
      .map((c) => `${c.code}${c.seats}`)
      .join(' ');

    const cityPair = `/${f.origin}${f.destination}`;
    const depTime = formatTimeDisplay(f.departure_time);
    const arrTime = formatTimeDisplay(f.arrival_time);
    const ac = padRight(f.aircraft, 4);

    // Line format: "1   W3  501  J4 C4 D2 Y9 B9 M7 H7 K4 /LOSLHR   0830   1445  738  0E"
    const lineOutput = `${padRight(lineNum.toString(), 2)}  ${airline} ${flightNumberStr}  ${padRight(classStr, 25)} ${cityPair}   ${depTime}   ${arrTime}  ${ac}  0E`;
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
      elapsedTime: '06H15M',
      stops: 0,
      travelDate: isoDate,
      flightId: f.id,
    });
  });

  outputLines.push('');

  return {
    output: outputLines.join('\n'),
    newState: {
      ...state,
      lastAvailability: {
        origin,
        destination,
        date: isoDate,
        lines,
      },
    },
  };
}
