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

export const AMADEUS_CONFIG = {
  delimiter: '+',
  defaultAgent: {
    agentId: process.env.DEFAULT_AMADEUS_AGENT_ID || '1234AA/SU',
    officeId: process.env.DEFAULT_AMADEUS_OFFICE_ID || 'LOS01',
  },
  soldSegmentStatus: 'HK', // In Amadeus, sold segments go into working PNR as HK1
  validationOrder: [
    { type: 'name', error: 'NEED NAME' },
    { type: 'itinerary', error: 'NEED ITINERARY' },
    { type: 'contact', error: 'NEED CONTACT' },
    { type: 'ticketing', error: 'NEED TICKETING ARRANGEMENT' },
    { type: 'receivedFrom', error: 'NEED RECEIVED FROM' },
  ],
};

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

// ─── Amadeus Mapping Table ───────────────────────────────────
export const AMADEUS_COMMAND_MAP: Record<
  string,
  { sabre: string; amadeus: string; description: string }
> = {
  signIn:         { sabre: 'SI*<ID>',           amadeus: 'JI <ID>',           description: 'Sign in' },
  signOut:        { sabre: 'SO',                amadeus: 'JO',                description: 'Sign out' },
  availability:   { sabre: '1LOSLHR15NOV',      amadeus: 'AN15NOVLOSLHR',     description: 'Availability' },
  sell:           { sabre: '01Y1',              amadeus: 'SS1Y1',             description: 'Sell from availability' },
  name:           { sabre: '-SMITH/JOHN MR',    amadeus: 'NM1SMITH/JOHN MR',  description: 'Name entry' },
  phone:          { sabre: '9234-555-1234-A',   amadeus: 'AP 234-555-1234',   description: 'Phone field' },
  ticketing:      { sabre: '7TAW/',             amadeus: 'TKTL15NOV',         description: 'Ticketing' },
  receivedFrom:   { sabre: '6SMITH',            amadeus: 'RF SMITH',          description: 'Received from' },
  endSave:        { sabre: 'E',                 amadeus: 'ER',                description: 'End and save' },
  endRetrieve:    { sabre: 'ER',                amadeus: 'ET',                description: 'End, save, redisplay' },
  retrieve:       { sabre: '*ABCDEF',           amadeus: 'RT ABCDEF',         description: 'Retrieve PNR' },
  cancelAll:      { sabre: 'XI',                amadeus: 'XE ALL',            description: 'Cancel itinerary' },
  cancelSegment:  { sabre: 'X1',                amadeus: 'XE 1',              description: 'Cancel segment' },
  ignore:         { sabre: 'I',                 amadeus: 'IG',                description: 'Ignore' },
  price:          { sabre: 'WP',                amadeus: 'FXP',               description: 'Price itinerary' },
  encodeCity:     { sabre: 'DAN LAGOS',         amadeus: 'DAN LAGOS',         description: 'Encode city' },
  decodeAirport:  { sabre: 'DAC LOS',          amadeus: 'DAC LOS',           description: 'Decode airport' },
  encodeAirline:  { sabre: 'W/*BRITISH',        amadeus: 'DNA BRITISH',       description: 'Encode airline' },
};
