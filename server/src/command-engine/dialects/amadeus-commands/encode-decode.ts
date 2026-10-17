import type { SessionState, CommandResult, DataStore } from '../../types';

// Seeded country mappings
const COUNTRIES: Record<string, { code: string; name: string }> = {
  IN: { code: 'IN', name: 'INDIA' },
  INDIA: { code: 'IN', name: 'INDIA' },
  NG: { code: 'NG', name: 'NIGERIA' },
  NIGERIA: { code: 'NG', name: 'NIGERIA' },
  GB: { code: 'GB', name: 'UNITED KINGDOM' },
  UK: { code: 'GB', name: 'UNITED KINGDOM' },
  'UNITED KINGDOM': { code: 'GB', name: 'UNITED KINGDOM' },
  US: { code: 'US', name: 'UNITED STATES OF AMERICA' },
  USA: { code: 'US', name: 'UNITED STATES OF AMERICA' },
  'UNITED STATES': { code: 'US', name: 'UNITED STATES OF AMERICA' },
  AE: { code: 'AE', name: 'UNITED ARAB EMIRATES' },
  UAE: { code: 'AE', name: 'UNITED ARAB EMIRATES' },
  'UNITED ARAB EMIRATES': { code: 'AE', name: 'UNITED ARAB EMIRATES' },
  GH: { code: 'GH', name: 'GHANA' },
  GHANA: { code: 'GH', name: 'GHANA' },
  ZA: { code: 'ZA', name: 'SOUTH AFRICA' },
  'SOUTH AFRICA': { code: 'ZA', name: 'SOUTH AFRICA' },
  FR: { code: 'FR', name: 'FRANCE' },
  FRANCE: { code: 'FR', name: 'FRANCE' },
  DE: { code: 'DE', name: 'GERMANY' },
  GERMANY: { code: 'DE', name: 'GERMANY' },
};

// Seeded equipment mappings
const EQUIPMENT: Record<string, string> = {
  '320': 'AIRBUS INDUSTRIE A320 JET',
  '321': 'AIRBUS INDUSTRIE A321 JET',
  '330': 'AIRBUS INDUSTRIE A330 JET',
  '350': 'AIRBUS INDUSTRIE A350 JET',
  '380': 'AIRBUS INDUSTRIE A380 JET',
  '737': 'BOEING 737 JET',
  '738': 'BOEING 737-800 JET',
  '777': 'BOEING 777 JET',
  '787': 'BOEING 787 DREAMLINER JET',
  'CR9': 'BOMBARDIER CRJ-900 REGIONAL JET',
  'E90': 'EMBRAER 190 REGIONAL JET',
  'E95': 'EMBRAER 195 REGIONAL JET',
  AIRBUS: 'A319 / A320 / A321 / A330 / A350 / A380',
  BOEING: 'B737 / B747 / B777 / B787',
};

// Seeded car rental vendors
const CAR_COMPANIES: Record<string, { code: string; name: string }> = {
  ZE: { code: 'ZE', name: 'HERTZ RENT A CAR' },
  HERTZ: { code: 'ZE', name: 'HERTZ RENT A CAR' },
  ZI: { code: 'ZI', name: 'AVIS RENT A CAR' },
  AVIS: { code: 'ZI', name: 'AVIS RENT A CAR' },
  EP: { code: 'EP', name: 'EUROPCAR' },
  EUROPCAR: { code: 'EP', name: 'EUROPCAR' },
  SX: { code: 'SX', name: 'SIXT RENT A CAR' },
  SIXT: { code: 'SX', name: 'SIXT RENT A CAR' },
  BUDGET: { code: 'ZD', name: 'BUDGET RENT A CAR' },
  ZD: { code: 'ZD', name: 'BUDGET RENT A CAR' },
};

// Seeded hotel brands
const HOTEL_CHAINS: Record<string, { code: string; name: string }> = {
  HL: { code: 'HL', name: 'HILTON HOTELS & RESORTS' },
  HILTON: { code: 'HL', name: 'HILTON HOTELS & RESORTS' },
  MC: { code: 'MC', name: 'MARRIOTT INTERNATIONAL' },
  MARRIOTT: { code: 'MC', name: 'MARRIOTT INTERNATIONAL' },
  SI: { code: 'SI', name: 'SHERATON HOTELS' },
  SHERATON: { code: 'SI', name: 'SHERATON HOTELS' },
  RD: { code: 'RD', name: 'RADISSON HOTEL GROUP' },
  RADISSON: { code: 'RD', name: 'RADISSON HOTEL GROUP' },
  HY: { code: 'HY', name: 'HYATT HOTELS' },
  HYATT: { code: 'HY', name: 'HYATT HOTELS' },
  IHG: { code: 'IC', name: 'INTERCONTINENTAL HOTELS' },
  INTERCONTINENTAL: { code: 'IC', name: 'INTERCONTINENTAL HOTELS' },
};

/**
 * Handle DAN <city>: Encode city to IATA airport/city code
 */
export function handleAmadeusEncodeCity(
  cityTerm: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const term = cityTerm.trim();
  if (!term) {
    return { output: 'FORMAT: DAN <CITY NAME> (E.G. DAN MUMBAI)', newState: state };
  }

  const airports = store.findAirportsByCityOrName ? store.findAirportsByCityOrName(term) : [];
  if (!airports || airports.length === 0) {
    return {
      output: `NO AIRPORT / CITY FOUND FOR "${term.toUpperCase()}"`,
      newState: state,
    };
  }

  const lines = [
    `CITY ENCODE: "${term.toUpperCase()}"`,
    'CODE  CITY                 NAME / AIRPORT              COUNTRY',
    '─'.repeat(58),
    ...airports.map(
      (a) =>
        `${a.code.padEnd(6)}${a.city.toUpperCase().padEnd(21)}${a.name.slice(0, 26).toUpperCase().padEnd(28)}${a.country.toUpperCase()}`
    ),
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle DAC <airport>: Decode IATA airport code
 */
export function handleAmadeusDecodeAirport(
  airportCode: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const code = airportCode.trim().toUpperCase();
  const airport = store.getAirport(code);

  if (!airport) {
    return {
      output: `AIRPORT CODE "${code}" NOT FOUND`,
      newState: state,
    };
  }

  const output = [
    `AIRPORT DECODE: ${airport.code}`,
    `NAME:     ${airport.name.toUpperCase()}`,
    `CITY:     ${airport.city.toUpperCase()}`,
    `COUNTRY:  ${airport.country.toUpperCase()}`,
    `TIMEZONE: ${airport.timezone}`,
  ].join('\n');

  return { output, newState: state };
}

/**
 * Handle DNA <term>: Encode or decode airline
 */
export function handleAmadeusAirlineEncodeDecode(
  term: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const cleanTerm = term.trim().toUpperCase();
  if (!cleanTerm) {
    return { output: 'FORMAT: DNA <CODE OR AIRLINE NAME> (E.G. DNAEK OR DNA EMIRATES)', newState: state };
  }

  // 1. Check if exact 2-letter code
  if (cleanTerm.length === 2) {
    const airline = store.getAirline(cleanTerm);
    if (airline) {
      return {
        output: `AIRLINE DECODE:\nCODE: ${airline.code}\nNAME: ${airline.name.toUpperCase()}\nCOUNTRY: ${(airline.country || '').toUpperCase()}`,
        newState: state,
      };
    }
  }

  // 2. Search by name or code
  const airlines = store.findAirlinesByNameOrCode ? store.findAirlinesByNameOrCode(cleanTerm) : [];
  if (!airlines || airlines.length === 0) {
    return {
      output: `NO AIRLINE FOUND FOR "${cleanTerm}"`,
      newState: state,
    };
  }

  const lines = [
    `AIRLINE MATCHES FOR "${cleanTerm}":`,
    'CODE  AIRLINE NAME                  NUMERIC',
    '─'.repeat(46),
    ...airlines.map((a) => `${a.code.padEnd(6)}${a.name.toUpperCase().padEnd(30)}${(a.numeric || '').padEnd(6)}`),
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle DC <country>: Encode or decode country
 */
export function handleAmadeusCountryEncodeDecode(
  term: string,
  state: SessionState
): CommandResult {
  const cleanTerm = term.trim().toUpperCase();
  if (!cleanTerm) {
    return { output: 'FORMAT: DC<COUNTRY CODE OR NAME> (E.G. DCINDIA OR DCIN)', newState: state };
  }

  const match = COUNTRIES[cleanTerm];
  if (match) {
    return {
      output: `COUNTRY DECODE:\nCODE: ${match.code}\nNAME: ${match.name}`,
      newState: state,
    };
  }

  // Search by substring
  for (const [k, v] of Object.entries(COUNTRIES)) {
    if (k.includes(cleanTerm) || v.name.includes(cleanTerm)) {
      return {
        output: `COUNTRY DECODE:\nCODE: ${v.code}\nNAME: ${v.name}`,
        newState: state,
      };
    }
  }

  return {
    output: `NO COUNTRY FOUND FOR "${cleanTerm}"`,
    newState: state,
  };
}

/**
 * Handle DNE/<equipment>: Equipment encode / decode
 */
export function handleAmadeusEquipmentEncodeDecode(
  rawTerm: string,
  state: SessionState
): CommandResult {
  const term = rawTerm.replace(/^\//, '').trim().toUpperCase();
  if (!term) {
    return { output: 'FORMAT: DNE/<CODE OR AIRCRAFT> (E.G. DNE/320 OR DNE/BOEING)', newState: state };
  }

  const direct = EQUIPMENT[term];
  if (direct) {
    return {
      output: `EQUIPMENT DECODE / ENCODE:\nQUERY: ${term}\nRESULT: ${direct}`,
      newState: state,
    };
  }

  // Substring match
  for (const [k, v] of Object.entries(EQUIPMENT)) {
    if (k.includes(term) || v.includes(term)) {
      return {
        output: `EQUIPMENT MATCH:\nCODE: ${k}\nNAME: ${v}`,
        newState: state,
      };
    }
  }

  return {
    output: `EQUIPMENT "${term}" NOT FOUND IN DATABASE`,
    newState: state,
  };
}

/**
 * Handle DNC <vendor>: Car rental vendor encode/decode
 */
export function handleAmadeusCarVendorEncodeDecode(
  rawTerm: string,
  state: SessionState
): CommandResult {
  const term = rawTerm.trim().toUpperCase();
  if (!term) {
    return { output: 'FORMAT: DNC <VENDOR CODE OR NAME> (E.G. DNC HERTZ OR DNC ZE)', newState: state };
  }

  const direct = CAR_COMPANIES[term];
  if (direct) {
    return {
      output: `CAR VENDOR DECODE:\nCODE: ${direct.code}\nNAME: ${direct.name}`,
      newState: state,
    };
  }

  for (const [k, v] of Object.entries(CAR_COMPANIES)) {
    if (k.includes(term) || v.name.includes(term)) {
      return {
        output: `CAR VENDOR MATCH:\nCODE: ${v.code}\nNAME: ${v.name}`,
        newState: state,
      };
    }
  }

  return {
    output: `CAR COMPANY "${term}" NOT FOUND`,
    newState: state,
  };
}

/**
 * Handle DNH <vendor>: Hotel chain encode/decode
 */
export function handleAmadeusHotelChainEncodeDecode(
  rawTerm: string,
  state: SessionState
): CommandResult {
  const term = rawTerm.trim().toUpperCase();
  if (!term) {
    return { output: 'FORMAT: DNH <CHAIN CODE OR NAME> (E.G. DNH HILTON OR DNH HL)', newState: state };
  }

  const direct = HOTEL_CHAINS[term];
  if (direct) {
    return {
      output: `HOTEL CHAIN DECODE:\nCODE: ${direct.code}\nNAME: ${direct.name}`,
      newState: state,
    };
  }

  for (const [k, v] of Object.entries(HOTEL_CHAINS)) {
    if (k.includes(term) || v.name.includes(term)) {
      return {
        output: `HOTEL CHAIN MATCH:\nCODE: ${v.code}\nNAME: ${v.name}`,
        newState: state,
      };
    }
  }

  return {
    output: `HOTEL CHAIN "${term}" NOT FOUND`,
    newState: state,
  };
}
