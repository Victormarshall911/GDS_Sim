import type { SessionState, CommandResult, DataStore } from '../../types';
import { padRight } from '../../format';

/**
 * Handle DAN <city>  –  Encode city to airport code
 */
export function handleEncodeCity(
  cityQuery: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const airports = store.findAirportsByCityOrName(cityQuery);

  if (airports.length === 0) {
    return {
      output: `NO AIRPORTS FOUND FOR CITY: ${cityQuery.toUpperCase()}`,
      newState: state,
    };
  }

  const lines = [
    `DAN ${cityQuery.toUpperCase()}`,
    'CODE  CITY                 AIRPORT NAME                         CTRY',
    '────  ──────────────────── ──────────────────────────────────── ────',
    ...airports.map(
      (a) =>
        `${padRight(a.code, 6)}${padRight(a.city, 21)}${padRight(a.name, 37)}${padRight(a.country, 4)}`
    ),
  ];

  return {
    output: lines.join('\n'),
    newState: state,
  };
}

/**
 * Handle DAC <code>  –  Decode airport code
 */
export function handleDecodeAirport(
  code: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const airport = store.getAirport(code);

  if (!airport) {
    return {
      output: `NO AIRPORT FOUND FOR CODE: ${code.toUpperCase()}`,
      newState: state,
    };
  }

  const lines = [
    `DAC ${code.toUpperCase()}`,
    `CODE:    ${airport.code}`,
    `NAME:    ${airport.name}`,
    `CITY:    ${airport.city} (${airport.city_code})`,
    `COUNTRY: ${airport.country}`,
    `TZ:      ${airport.timezone}`,
  ];

  return {
    output: lines.join('\n'),
    newState: state,
  };
}

/**
 * Handle W/*<airline>  –  Encode/decode airline
 */
export function handleEncodeAirline(
  query: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const airlines = store.findAirlinesByNameOrCode(query);

  if (airlines.length === 0) {
    return {
      output: `NO AIRLINE FOUND FOR QUERY: ${query.toUpperCase()}`,
      newState: state,
    };
  }

  const lines = [
    `W/*${query.toUpperCase()}`,
    'CODE  NUM  AIRLINE NAME',
    '────  ───  ────────────────────────────',
    ...airlines.map(
      (a) =>
        `${padRight(a.code, 6)}${padRight(a.numeric, 5)}${a.name}`
    ),
  ];

  return {
    output: lines.join('\n'),
    newState: state,
  };
}
