/**
 * CENTRALIZED COMMAND FORMAT CONFIGURATION
 * =========================================
 * Edit the regex patterns here to match your real Sabre terminal syntax.
 * Each entry has: pattern (regex), description, and example.
 *
 * If a command on your live Sabre screen behaves differently,
 * update the pattern here — the handler code stays the same.
 */
/**
 * DEFAULT AGENT CONFIGURATION
 * ===========================
 * Configure the default agent ID and home PCC for the simulator.
 * Can be overridden via DEFAULT_AGENT_ID and DEFAULT_PCC environment variables.
 */
export const DEFAULT_AGENT = {
  agentId: process.env.DEFAULT_AGENT_ID || '7890',
  pcc: process.env.DEFAULT_PCC || 'LOS01',
};

export const SABRE_COMMANDS = {
  // ─── Sign In / Sign Out ─────────────────────────────────────
  SIGN_IN: {
    pattern: /^SI\*(.+)$/,
    description: 'Sign in with agent ID',
    example: 'SI*7890',
  },
  SIGN_OUT: {
    pattern: /^SO$/,
    description: 'Sign out',
    example: 'SO',
  },

  // ─── Availability ───────────────────────────────────────────
  AVAILABILITY_CITY_DATE: {
    pattern: /^1([A-Z]{3})([A-Z]{3})(\d{1,2}[A-Z]{3})$/,
    description: 'Availability: city pair then date',
    example: '1LOSLHR15NOV',
  },
  AVAILABILITY_DATE_CITY: {
    pattern: /^1(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})$/,
    description: 'Availability: date then city pair',
    example: '115NOVLOSLHR',
  },

  // ─── Sell ───────────────────────────────────────────────────
  SELL_FROM_AVAIL: {
    pattern: /^0(\d{1,2})([A-Z])(\d{1,2})$/,
    description: 'Sell from availability display (line, class, seats)',
    example: '01Y1',
  },
  DIRECT_SELL: {
    pattern: /^0([A-Z\d]{2})(\d{1,4})([A-Z])(\d{1,2}[A-Z]{3})([A-Z]{3})([A-Z]{3})(\d{1,2})$/,
    description: 'Direct sell: airline+flight+class+date+origin+dest+seats',
    example: '0W3501Y15NOVLOSLHR1',
  },

  // ─── Passenger Names ───────────────────────────────────────
  NAME_ENTRY: {
    pattern: /^-(.+)$/,
    description: 'Add passenger name',
    example: '-SMITH/JOHN MR',
  },

  // ─── Phone ─────────────────────────────────────────────────
  PHONE: {
    pattern: /^9(.+)$/,
    description: 'Phone field entry',
    example: '9234-555-1234-A',
  },

  // ─── Ticketing ─────────────────────────────────────────────
  TICKETING: {
    pattern: /^7TAW\/?(.*)$/,
    description: 'Ticketing arrangement',
    example: '7TAW/ or 7TAW/25OCT',
  },

  // ─── Received From ─────────────────────────────────────────
  RECEIVED_FROM: {
    pattern: /^6(.+)$/,
    description: 'Received from',
    example: '6SMITH',
  },

  // ─── End Transaction ───────────────────────────────────────
  END_TRANSACTION: {
    pattern: /^E$/,
    description: 'End and save PNR',
    example: 'E',
  },
  END_AND_RETRIEVE: {
    pattern: /^ER$/,
    description: 'End, save, and redisplay PNR',
    example: 'ER',
  },

  // ─── Retrieve ──────────────────────────────────────────────
  RETRIEVE_PNR: {
    pattern: /^\*([A-Z]{6})$/,
    description: 'Retrieve PNR by record locator',
    example: '*ABCDEF',
  },
  DISPLAY_ALL: {
    pattern: /^\*A$/,
    description: 'Display all PNR fields',
    example: '*A',
  },
  DISPLAY_ITINERARY: {
    pattern: /^\*I$/,
    description: 'Display itinerary only',
    example: '*I',
  },
  DISPLAY_NAMES: {
    pattern: /^\*N$/,
    description: 'Display passenger names only',
    example: '*N',
  },

  // ─── Cancel ────────────────────────────────────────────────
  CANCEL_ITINERARY: {
    pattern: /^XI$/,
    description: 'Cancel entire itinerary',
    example: 'XI',
  },
  CANCEL_SEGMENT: {
    pattern: /^X(\d+)$/,
    description: 'Cancel specific segment by number',
    example: 'X1',
  },
  IGNORE: {
    pattern: /^I$/,
    description: 'Ignore (discard working PNR without saving)',
    example: 'I',
  },

  // ─── Pricing ───────────────────────────────────────────────
  PRICE_ITINERARY: {
    pattern: /^WP$/,
    description: 'Price itinerary',
    example: 'WP',
  },
  PRICE_NO_COMMISSION: {
    pattern: /^WPNC$/,
    description: 'Price itinerary with no commission',
    example: 'WPNC',
  },

  // ─── Encode / Decode ───────────────────────────────────────
  ENCODE_AIRLINE: {
    pattern: /^W\/\*(.+)$/,
    description: 'Encode airline name to IATA code',
    example: 'W/*BRITISH',
  },
  ENCODE_CITY: {
    pattern: /^DAN\s+(.+)$/,
    description: 'Encode city name to airport code',
    example: 'DAN LAGOS',
  },
  DECODE_AIRPORT: {
    pattern: /^DAC\s*([A-Z]{3})$/,
    description: 'Decode airport code to city/name',
    example: 'DAC LOS',
  },

  // ─── Help ──────────────────────────────────────────────────
  HELP: {
    pattern: /^HELP$/,
    description: 'Show command reference',
    example: 'HELP',
  },
} as const;


export interface ParsedAvailabilityModifiers {
  airlines?: string[];
  classCode?: string;
  directOnly?: boolean;
  nonStopOnly?: boolean;
  errors: string[];
}

export interface ModifierRule {
  prefix: string;
  description: string;
  status: 'CONFIRMED' | 'VERIFY';
  example: string;
  parse: (val: string, opts: ParsedAvailabilityModifiers) => void;
}

export const AMADEUS_AVAILABILITY_MODIFIERS: ModifierRule[] = [
  {
    prefix: 'A',
    description: 'Airline filter (confirmed)',
    status: 'CONFIRMED',
    example: '/AP4 or /AP4,W3',
    parse: (val: string, opts: ParsedAvailabilityModifiers) => {
      const codes = val.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (!opts.airlines) opts.airlines = [];
      opts.airlines.push(...codes);
    },
  },
  {
    prefix: 'C',
    description: 'Class of service filter',
    status: 'VERIFY',
    example: '/CY',
    parse: (val: string, opts: ParsedAvailabilityModifiers) => {
      opts.classCode = val.trim().toUpperCase();
    },
  },
  {
    prefix: 'D',
    description: 'Direct flights only',
    status: 'VERIFY',
    example: '/D',
    parse: (_val: string, opts: ParsedAvailabilityModifiers) => {
      opts.directOnly = true;
    },
  },
  {
    prefix: 'N',
    description: 'Non-stop flights only',
    status: 'VERIFY',
    example: '/N',
    parse: (_val: string, opts: ParsedAvailabilityModifiers) => {
      opts.nonStopOnly = true;
    },
  },
];

/**
 * Split availability entry after core query on "/" and parse each modifier.
 * Tolerates spaces: "/A P4" or "/AP4,W3" or "/AP4/AW3".
 */
export function parseAvailabilityModifiers(modifierString: string): ParsedAvailabilityModifiers {
  const result: ParsedAvailabilityModifiers = { errors: [] };
  if (!modifierString || !modifierString.trim()) {
    return result;
  }

  // Split on "/"
  const parts = modifierString
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    const cleanPart = part.replace(/\s+/g, '');
    const prefix = cleanPart.charAt(0).toUpperCase();
    const value = cleanPart.substring(1);

    const rule = AMADEUS_AVAILABILITY_MODIFIERS.find((m) => m.prefix === prefix);
    if (!rule) {
      result.errors.push(`INVALID MODIFIER: /${part}`);
      continue;
    }

    rule.parse(value, result);
  }

  return result;
}

export const AMADEUS_CONFIG = {
  delimiter: '+',
  soldSegmentStatus: 'HK',
  defaultAgent: {
    agentId: process.env.AMADEUS_AGENT_ID || '1234AA/SU',
    officeId: process.env.AMADEUS_OFFICE_ID || 'LOS1A0980',
    dutyCode: 'SU',
  },
  validationOrder: [
    { field: 'names', message: 'NEED NAME' },
    { field: 'itinerary', message: 'NEED ITINERARY' },
    { field: 'contact', message: 'NEED CONTACT' },
    { field: 'ticketing', message: 'NEED TICKETING ARRANGEMENT' },
    { field: 'receivedFrom', message: 'NEED RECEIVED FROM' },
  ],
};

export interface AirlineTicketPrefix {
  code: string;
  name: string;
  numeric: string;
  status: 'CONFIRMED' | 'VERIFY';
}

/**
 * AIRLINE 3-DIGIT TICKET PREFIX TABLE
 * Used for issuing 13-digit e-tickets (<prefix>-<10 digits>).
 * Marked as VERIFY until confirmed against production GDS/IATA tables.
 */
export const AIRLINE_TICKET_PREFIXES: Record<string, AirlineTicketPrefix> = {
  P4: { code: 'P4', name: 'Air Peace', numeric: '240', status: 'VERIFY' },
  W3: { code: 'W3', name: 'Arik Air', numeric: '725', status: 'VERIFY' },
  '9J': { code: '9J', name: 'Dana Air', numeric: '086', status: 'VERIFY' },
  AW: { code: 'AW', name: 'Africa World Airlines', numeric: '394', status: 'VERIFY' },
  QI: { code: 'QI', name: 'Ibom Air', numeric: '820', status: 'VERIFY' },
  OF: { code: 'OF', name: 'Overland Airways', numeric: '830', status: 'VERIFY' },
  UN: { code: 'UN', name: 'United Nigeria Airlines', numeric: '840', status: 'VERIFY' },
  VM: { code: 'VM', name: 'Max Air', numeric: '850', status: 'VERIFY' },
  AI: { code: 'AI', name: 'Air India', numeric: '098', status: 'VERIFY' },
  BA: { code: 'BA', name: 'British Airways', numeric: '125', status: 'VERIFY' },
  VS: { code: 'VS', name: 'Virgin Atlantic', numeric: '932', status: 'VERIFY' },
  EK: { code: 'EK', name: 'Emirates', numeric: '176', status: 'VERIFY' },
  QR: { code: 'QR', name: 'Qatar Airways', numeric: '157', status: 'VERIFY' },
  DL: { code: 'DL', name: 'Delta Air Lines', numeric: '006', status: 'VERIFY' },
  AF: { code: 'AF', name: 'Air France', numeric: '057', status: 'VERIFY' },
  LH: { code: 'LH', name: 'Lufthansa', numeric: '220', status: 'VERIFY' },
  ET: { code: 'ET', name: 'Ethiopian Airlines', numeric: '071', status: 'VERIFY' },
  KQ: { code: 'KQ', name: 'Kenya Airways', numeric: '706', status: 'VERIFY' },
  TK: { code: 'TK', name: 'Turkish Airlines', numeric: '235', status: 'VERIFY' },
};

export const AMADEUS_COMMANDS = {
  // Session
  SIGN_IN: {
    pattern: /^JI(?:\s*(.+))?$/i,
    description: 'Jump In: Sign in with agent ID',
    example: 'JI 1234AA/SU',
  },
  SIGN_OUT: {
    pattern: /^JO$/i,
    description: 'Jump Out: Sign out',
    example: 'JO',
  },
  SESSION_DISPLAY: {
    pattern: /^JD$/i,
    description: 'Display Session status',
    example: 'JD',
  },
  HELP: {
    pattern: /^(?:HELP|HE)(?:\s+(.*))?$/i,
    description: 'System Help',
    example: 'HELP or HELP AN',
  },
  MOVE_DOWN: {
    pattern: /^MD$/i,
    description: 'Move Down / scroll next page',
    example: 'MD',
  },
  MOVE_UP: {
    pattern: /^MU$/i,
    description: 'Move Up / scroll previous page',
    example: 'MU',
  },
  MOVE_NEXT_DAY: {
    pattern: /^MN$/i,
    description: 'Move Next Day availability',
    example: 'MN',
  },
  MOVE_PREV_DAY: {
    pattern: /^MY$/i,
    description: 'Move Yesterday availability',
    example: 'MY',
  },
  MOVE_TOP: {
    pattern: /^(?:MP|MT)$/i,
    description: 'Move First Page / Move Top',
    example: 'MP',
  },

  // Encode & Decode
  ENCODE_CITY: {
    pattern: /^DAN\s*(.+)$/i,
    description: 'Encode city name to airport code',
    example: 'DAN MUMBAI',
  },
  DECODE_AIRPORT: {
    pattern: /^DAC\s*([A-Z]{3})$/i,
    description: 'Decode airport code',
    example: 'DAC JFK',
  },
  AIRLINE_ENCODE_DECODE: {
    pattern: /^DNA\s*(.+)$/i,
    description: 'Encode or decode airline name or code',
    example: 'DNAEK or DNA EMIRATES',
  },
  COUNTRY_ENCODE_DECODE: {
    pattern: /^DC\s*(.+)$/i,
    description: 'Encode or decode country name or code',
    example: 'DCINDIA or DCIN',
  },
  EQUIPMENT_ENCODE_DECODE: {
    pattern: /^DNE\s*\/?(.*)$/i,
    description: 'Encode or decode aircraft equipment',
    example: 'DNE/320 or DNE/AIRBUS',
  },
  CAR_VENDOR_ENCODE_DECODE: {
    pattern: /^DNC\s*(.+)$/i,
    description: 'Encode or decode car rental vendor',
    example: 'DNC HERTZ or DNC ZE',
  },
  HOTEL_CHAIN_ENCODE_DECODE: {
    pattern: /^DNH\s*(.+)$/i,
    description: 'Encode or decode hotel brand/chain',
    example: 'DNH HILTON or DNH HL',
  },

  // Flight Availability & Schedules
  AVAILABILITY_CHANGE: {
    pattern: /^AC(?:\s*(.*))?$/i,
    description: 'Availability change (date, airline, route)',
    example: 'AC20MAR or AC/AP4',
  },
  AVAILABILITY_NEUTRAL: {
    pattern: /^AN(?:\s*(.*))?$/i,
    description: 'Neutral availability search',
    example: 'AN15MARBOMDEL or AN19OCTLOSABV/AP4',
  },
  AVAILABILITY_DEP_TIME: {
    pattern: /^AD(?:\s*(.*))?$/i,
    description: 'Availability by departure time',
    example: 'AD15MARBOMDEL0800',
  },
  AVAILABILITY_ELAPSED: {
    pattern: /^AE(?:\s*(.*))?$/i,
    description: 'Availability by shortest elapsed time',
    example: 'AE15MARBOMDEL',
  },
  AVAILABILITY_ARR_TIME: {
    pattern: /^AA(?:\s*(.*))?$/i,
    description: 'Availability by arrival time',
    example: 'AA15MARDELLHR1700',
  },
  SCHEDULE_NEUTRAL: {
    pattern: /^SN(?:\s*(.*))?$/i,
    description: 'Schedule neutral display',
    example: 'SN15MARBOMDEL',
  },
  TIMETABLE: {
    pattern: /^TN(?:\s*(.*))?$/i,
    description: 'Timetable schedule frequency display',
    example: 'TN15MARBOMDEL',
  },

  // Sell
  SELL_SHORT: {
    pattern: /^SS\s*(\d{1,2})\s*([A-Z])\s*(\d{1,2})$/i,
    description: 'Sell segment from availability (seats, class, line)',
    example: 'SS1Y1',
  },
  SELL_LONG: {
    pattern: /^SS\s*([A-Z\d]{2})\s*(\d{1,4})\s*([A-Z])\s*(\d{1,2}[A-Z]{3}(?:\d{2})?)\s*([A-Z]{3})\s*([A-Z]{3})\s*(\d{1,2})$/i,
    description: 'Direct sell without availability',
    example: 'SSAI101Y15MARBOMDEL1',
  },

  // PNR Creation
  NAME: {
    pattern: /^NM\s*(.*)$/i,
    description: 'Add passenger name (NM1, NM2, CHD, INF)',
    example: 'NM1SHARMA/RAHUL MR or NM1KAPOOR/ANJALI MISS(CHD/15MAR18)',
  },
  PHONE_GENERAL: {
    pattern: /^AP\s*(.*)$/i,
    description: 'Add general contact phone number',
    example: 'APBOM 022-12345678',
  },
  PHONE_MOBILE: {
    pattern: /^APM\s*-(.*)$/i,
    description: 'Add mobile phone number',
    example: 'APM-9876543210',
  },
  EMAIL: {
    pattern: /^APE\s*-(.*)$/i,
    description: 'Add email contact',
    example: 'APE-TEST@EMAIL.COM',
  },
  SR_CTCM: {
    pattern: /^SR\s*CTCM\s*-(.*)$/i,
    description: 'Contact Mobile SSR',
    example: 'SR CTCM-2349165283674',
  },
  SR_CTCE: {
    pattern: /^SR\s*CTCE\s*-(.*)$/i,
    description: 'Contact Email SSR (// converts to @)',
    example: 'SR CTCE-NAME//GMAIL.COM',
  },
  SSR_GENERAL: {
    pattern: /^SR\s*(?!CTCM|CTCE)(.*)$/i,
    description: 'General SSR entry',
    example: 'SRVGML/P1/S2',
  },
  OSI: {
    pattern: /^OS\s*(.*)$/i,
    description: 'Other Service Info',
    example: 'OS AI VIP PAX',
  },
  FFN: {
    pattern: /^FFN\s*([A-Z\d]{2})\s*-(.*)$/i,
    description: 'Frequent Flyer Number',
    example: 'FFNAI-1234567890/P1',
  },
  TICKETING_OK: {
    pattern: /^TKOK$/i,
    description: 'Confirm ticketing arrangement OK',
    example: 'TKOK',
  },
  TICKETING_TIME_LIMIT: {
    pattern: /^TKTL\s*(.*)$/i,
    description: 'Ticket time limit',
    example: 'TKTL20MAR/1800',
  },
  RECEIVED_FROM: {
    pattern: /^RF\s*(.*)$/i,
    description: 'Received from (mandatory)',
    example: 'RF RAHUL',
  },

  // End Transaction & Retrieve
  END_RETRIEVE: {
    pattern: /^ER$/i,
    description: 'End & Retrieve (save and redisplay PNR)',
    example: 'ER',
  },
  END_TRANSACTION: {
    pattern: /^ET$/i,
    description: 'End Transaction (save and exit PNR)',
    example: 'ET',
  },
  IGNORE: {
    pattern: /^IG$/i,
    description: 'Ignore unsaved changes',
    example: 'IG',
  },
  IGNORE_RETRIEVE: {
    pattern: /^IR$/i,
    description: 'Ignore and reload saved PNR',
    example: 'IR',
  },
  RETRIEVE: {
    pattern: /^RT(?:\s*(.*))?$/i,
    description: 'Retrieve PNR by record locator',
    example: 'RT or RTABC123',
  },

  // Modifications
  CANCEL_ELEMENT: {
    pattern: /^XE\s*(.+)$/i,
    description: 'Cancel PNR element by line number',
    example: 'XE5 or XE2,4 or XE2-4',
  },
  CANCEL_ITINERARY: {
    pattern: /^XI$/i,
    description: 'Cancel whole itinerary',
    example: 'XI',
  },
  REBOOK_SEGMENT: {
    pattern: /^SB\s*(.+)$/i,
    description: 'Rebook segment class or date',
    example: 'SBY2 or SB19OCT2',
  },
  SPLIT_PNR: {
    pattern: /^SP\s*(.+)$/i,
    description: 'Split PNR into a new booking',
    example: 'SP2,3',
  },

  // Pricing
  PRICE_TST: {
    pattern: /^FXP(?:\s*(.*))?$/i,
    description: 'Price PNR and store TST',
    example: 'FXP',
  },
  PRICE_INFORMATIVE: {
    pattern: /^FXX(?:\s*(.*))?$/i,
    description: 'Price PNR without storing TST',
    example: 'FXX',
  },
  PRICE_BEST_DISPLAY: {
    pattern: /^FXA(?:\s*(.*))?$/i,
    description: 'Best pricer: search lower fares',
    example: 'FXA',
  },
  PRICE_BEST_REBOOK: {
    pattern: /^FXR(?:\s*(.*))?$/i,
    description: 'Best pricer: rebook lowest fare',
    example: 'FXR',
  },
  FARE_QUOTE_DISPLAY: {
    pattern: /^FQD\s*(.+)$/i,
    description: 'Fare Quote Display',
    example: 'FQDBOMDEL',
  },
  FARE_QUOTE_NOTES: {
    pattern: /^FQN\s*(\d{1,2})$/i,
    description: 'Fare rules and notes',
    example: 'FQN1',
  },

  // Ticketing
  ISSUE_TICKETS: {
    pattern: /^TTP$/i,
    description: 'Issue e-tickets for all TSTs',
    example: 'TTP',
  },
  ISSUE_TICKETS_RT: {
    pattern: /^TTP\/RT$/i,
    description: 'Issue e-tickets and retrieve PNR',
    example: 'TTP/RT',
  },
  COMMISSION: {
    pattern: /^FM\s*(\d+(?:\.\d+)?)$/i,
    description: 'Agency commission percentage',
    example: 'FM5',
  },
  FORM_OF_PAYMENT: {
    pattern: /^FP\s*(.+)$/i,
    description: 'Form of payment',
    example: 'FPCCVI4111111111111111/1225 or FPCASH',
  },
  VALIDATING_CARRIER: {
    pattern: /^FV\s*([A-Z\d]{2})$/i,
    description: 'Validating carrier',
    example: 'FV AI',
  },
  DISPLAY_ETICKET: {
    pattern: /^TWD(?:\s*(.*))?$/i,
    description: 'Display e-ticket details',
    example: 'TWD',
  },

  // Seats (Tier 2)
  SEAT_MAP: {
    pattern: /^SM\s*(\d{1,2})$/i,
    description: 'Display seat map for segment',
    example: 'SM1',
  },
  SEAT_ASSIGN: {
    pattern: /^ST\s*\/(.+)$/i,
    description: 'Assign specific seat or preference',
    example: 'ST/12A/P1/S1 or ST/W/P1/S1',
  },
  SEAT_CANCEL: {
    pattern: /^SX(?:\s*(.*))?$/i,
    description: 'Cancel seat assignment',
    example: 'SX/P1/S1 or SXALL',
  },

  // Queues (Tier 2)
  QUEUE_COUNT: {
    pattern: /^QT$/i,
    description: 'Queue count summary',
    example: 'QT',
  },
  QUEUE_START: {
    pattern: /^QS\s*(\d{1,2})$/i,
    description: 'Start processing queue',
    example: 'QS8',
  },
  QUEUE_NEXT: {
    pattern: /^QN$/i,
    description: 'Next PNR in queue',
    example: 'QN',
  },
  QUEUE_IGNORE: {
    pattern: /^QI$/i,
    description: 'Ignore and exit queue',
    example: 'QI',
  },
  QUEUE_FINISH: {
    pattern: /^QF$/i,
    description: 'Finish and remove PNR from queue',
    example: 'QF',
  },

  // Hotels & Cars (Tier 2)
  HOTEL_LIST: {
    pattern: /^HL\s*([A-Z]{3})$/i,
    description: 'Hotel property list for city',
    example: 'HLLON',
  },
  HOTEL_AVAIL: {
    pattern: /^HA\s*([A-Z]{3})(.*)$/i,
    description: 'Hotel room availability',
    example: 'HALON15JUN-3',
  },
  HOTEL_SELL: {
    pattern: /^HS\s*(\d{1,2})$/i,
    description: 'Book hotel room from availability',
    example: 'HS1',
  },
  CAR_LIST: {
    pattern: /^CL\s*([A-Z]{3})$/i,
    description: 'Car rental location list',
    example: 'CLPAR',
  },
  CAR_AVAIL: {
    pattern: /^CA\s*([A-Z]{3})(.*)$/i,
    description: 'Car rental availability',
    example: 'CALHR15JUN-3',
  },
};

