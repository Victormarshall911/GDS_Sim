import type { DialectName } from '@sabre-sim/shared';

// ─── Passenger ────────────────────────────────────────────────

export interface PassengerEntry {
  lastName: string;
  firstName: string;
  title: string;
  paxType: 'ADT' | 'CHD' | 'INF';
  dob?: string;
  /** For INF: sequence number of the associated adult */
  associatedAdult?: number;
}

// ─── Segment ──────────────────────────────────────────────────

export interface SegmentEntry {
  airlineCode: string;
  flightNumber: number;
  classCode: string;
  travelDate: string;   // ISO date  YYYY-MM-DD
  origin: string;
  destination: string;
  departureTime: string; // HH:MM
  arrivalTime: string;   // HH:MM
  /** SS = freshly sold (working PNR), HK = confirmed (after E) */
  status: string;
  numSeats: number;
  aircraft?: string;
}

// ─── Working PNR ──────────────────────────────────────────────

export interface WorkingPnr {
  passengers: PassengerEntry[];
  segments: SegmentEntry[];
  phone: string | null;
  ticketing: string | null;
  receivedFrom: string | null;
}

// ─── Availability ─────────────────────────────────────────────

export interface AvailabilityLine {
  lineNumber: number;
  airlineCode: string;
  flightNumber: number;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  classes: { code: string; seats: number }[];
  elapsedTime: string;
  stops: number;
  travelDate: string;
  flightId: number;
}

export interface AvailabilityResult {
  origin: string;
  destination: string;
  date: string;
  lines: AvailabilityLine[];
}

// ─── Practice Mode ────────────────────────────────────────────

export interface Scenario {
  id: string;
  title: string;
  description: string;
  requirements: ScenarioRequirement[];
}

export interface ScenarioRequirement {
  type: 'passengers' | 'segments' | 'phone' | 'ticketing';
  description: string;
}

// ─── Session State ────────────────────────────────────────────

export interface SessionState {
  agentId: string | null;
  signedIn: boolean;
  dialect: DialectName;
  workingPnr: WorkingPnr | null;
  lastAvailability: AvailabilityResult | null;
  /** Record locator of a retrieved PNR currently in context */
  currentPnr: string | null;
  activeScenario: Scenario | null;
}

// ─── Command Result ───────────────────────────────────────────

export interface CommandResult {
  output: string;
  newState: SessionState;
}

// ─── Data Records ─────────────────────────────────────────────

export interface AirportRecord {
  code: string;
  name: string;
  city: string;
  city_code: string;
  country: string;
  timezone: string;
}

export interface AirlineRecord {
  code: string;
  name: string;
  numeric: string;
}

export interface FlightClassInfo {
  code: string;
  seats: number;
}

export interface FlightSearchResult {
  id: number;
  airline_code: string;
  flight_number: number;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  aircraft: string;
  days_of_week: string;
  classes: FlightClassInfo[];
}

export interface FareRecord {
  id: number;
  airline_code: string;
  origin: string;
  destination: string;
  class_code: string;
  base_fare_ngn: number;
  base_fare_usd: number;
  fare_basis: string;
  pax_type: string;
  validity_days: number;
}

export interface SavedPnrRecord {
  record_locator: string;
  created_at: string;
  agent_id: string | null;
  received_from: string;
  phone: string;
  ticketing: string;
  status: string;
  passengers: {
    sequence: number;
    last_name: string;
    first_name: string;
    title: string;
    pax_type: 'ADT' | 'CHD' | 'INF';
    dob?: string;
    associated_adult?: number;
  }[];
  segments: {
    segment_number: number;
    airline_code: string;
    flight_number: number;
    class_code: string;
    travel_date: string;
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    status: string;
    num_seats: number;
    aircraft?: string;
  }[];
}

// ─── Data Store (dependency-injected DB access) ───────────────

export interface DataStore {
  getAirport(code: string): AirportRecord | null;
  findAirportsByCityOrName(query: string): AirportRecord[];
  getAirline(code: string): AirlineRecord | null;
  findAirlinesByNameOrCode(query: string): AirlineRecord[];
  searchFlights(origin: string, destination: string, travelDate: string, dayOfWeekNum: number): FlightSearchResult[];
  getFlightById(flightId: number): FlightSearchResult | null;
  savePnr(pnr: {
    recordLocator: string;
    agentId: string | null;
    receivedFrom: string;
    phone: string;
    ticketing: string;
    status: string;
    passengers: PassengerEntry[];
    segments: SegmentEntry[];
  }): void;
  getPnr(recordLocator: string): SavedPnrRecord | null;
  cancelPnr(recordLocator: string): boolean;
  cancelSegment(recordLocator: string, segmentNumber: number): boolean;
  isRecordLocatorUnique(locator: string): boolean;
  getFare(airlineCode: string, origin: string, destination: string, classCode: string, paxType?: string): FareRecord | null;
  logCommand(sessionId: string, input: string, output: string): void;
  savePracticeAttempt(sessionId: string, scenarioId: string, score: number, feedback: string): void;
  saveSession?(sessionId: string, state: SessionState): void;
  getSession?(sessionId: string): SessionState | null;
}

