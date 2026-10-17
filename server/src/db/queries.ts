import type { Database } from 'better-sqlite3';
import type {
  DataStore,
  AirportRecord,
  AirlineRecord,
  FlightSearchResult,
  FareRecord,
  SavedPnrRecord,
  PassengerEntry,
  SegmentEntry,
} from '../command-engine/types';

export class SqliteDataStore implements DataStore {
  constructor(private db: Database) {}

  getAirport(code: string): AirportRecord | null {
    const row = this.db
      .prepare('SELECT code, name, city, city_code, country, timezone FROM airports WHERE code = ?')
      .get(code.toUpperCase()) as AirportRecord | undefined;
    return row ?? null;
  }

  findAirportsByCityOrName(query: string): AirportRecord[] {
    const term = `%${query.trim()}%`;
    const rows = this.db
      .prepare(
        `SELECT code, name, city, city_code, country, timezone 
         FROM airports 
         WHERE code LIKE ? OR city LIKE ? OR name LIKE ?
         ORDER BY code ASC
         LIMIT 10`
      )
      .all(term, term, term) as AirportRecord[];
    return rows;
  }

  getAirline(code: string): AirlineRecord | null {
    const row = this.db
      .prepare('SELECT code, name, numeric FROM airlines WHERE code = ?')
      .get(code.toUpperCase()) as AirlineRecord | undefined;
    return row ?? null;
  }

  findAirlinesByNameOrCode(query: string): AirlineRecord[] {
    const term = `%${query.trim()}%`;
    const rows = this.db
      .prepare(
        `SELECT code, name, numeric 
         FROM airlines 
         WHERE code LIKE ? OR name LIKE ? OR numeric LIKE ?
         ORDER BY code ASC
         LIMIT 10`
      )
      .all(term, term, term) as AirlineRecord[];
    return rows;
  }

  searchFlights(
    origin: string,
    destination: string,
    travelDate: string,
    dayOfWeekNum: number
  ): FlightSearchResult[] {
    const dayStr = dayOfWeekNum.toString();
    const flightRows = this.db
      .prepare(
        `SELECT id, airline_code, flight_number, origin, destination, 
                departure_time, arrival_time, aircraft, days_of_week
         FROM flights
         WHERE origin = ? AND destination = ?
           AND days_of_week LIKE ?
           AND effective_from <= ? AND effective_to >= ?
         ORDER BY departure_time ASC`
      )
      .all(
        origin.toUpperCase(),
        destination.toUpperCase(),
        `%${dayStr}%`,
        travelDate,
        travelDate
      ) as Omit<FlightSearchResult, 'classes'>[];

    return flightRows.map((flight) => {
      const classes = this.db
        .prepare('SELECT class_code as code, seats_available as seats FROM flight_classes WHERE flight_id = ?')
        .all(flight.id) as { code: string; seats: number }[];
      return {
        ...flight,
        classes,
      };
    });
  }

  getFlightById(flightId: number): FlightSearchResult | null {
    const flight = this.db
      .prepare(
        `SELECT id, airline_code, flight_number, origin, destination, 
                departure_time, arrival_time, aircraft, days_of_week
         FROM flights
         WHERE id = ?`
      )
      .get(flightId) as Omit<FlightSearchResult, 'classes'> | undefined;

    if (!flight) return null;

    const classes = this.db
      .prepare('SELECT class_code as code, seats_available as seats FROM flight_classes WHERE flight_id = ?')
      .all(flight.id) as { code: string; seats: number }[];

    return {
      ...flight,
      classes,
    };
  }

  isRecordLocatorUnique(locator: string): boolean {
    const row = this.db
      .prepare('SELECT record_locator FROM pnrs WHERE record_locator = ?')
      .get(locator.toUpperCase());
    return !row;
  }

  savePnr(pnr: {
    recordLocator: string;
    agentId: string | null;
    receivedFrom: string;
    phone: string;
    ticketing: string;
    status: string;
    passengers: PassengerEntry[];
    segments: SegmentEntry[];
  }): void {
    const insertPnr = this.db.prepare(
      `INSERT OR REPLACE INTO pnrs (record_locator, agent_id, received_from, phone, ticketing, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const insertPax = this.db.prepare(
      `INSERT INTO pnr_passengers (pnr_locator, sequence, last_name, first_name, title, pax_type, dob, associated_adult)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertSeg = this.db.prepare(
      `INSERT INTO pnr_segments (pnr_locator, segment_number, airline_code, flight_number, class_code, travel_date, origin, destination, departure_time, arrival_time, status, num_seats, aircraft)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const deleteOldPax = this.db.prepare('DELETE FROM pnr_passengers WHERE pnr_locator = ?');
    const deleteOldSeg = this.db.prepare('DELETE FROM pnr_segments WHERE pnr_locator = ?');

    const transaction = this.db.transaction(() => {
      insertPnr.run(
        pnr.recordLocator,
        pnr.agentId,
        pnr.receivedFrom,
        pnr.phone,
        pnr.ticketing,
        pnr.status
      );

      deleteOldPax.run(pnr.recordLocator);
      pnr.passengers.forEach((pax, index) => {
        insertPax.run(
          pnr.recordLocator,
          index + 1,
          pax.lastName,
          pax.firstName,
          pax.title,
          pax.paxType,
          pax.dob ?? null,
          pax.associatedAdult ?? null
        );
      });

      deleteOldSeg.run(pnr.recordLocator);
      pnr.segments.forEach((seg, index) => {
        insertSeg.run(
          pnr.recordLocator,
          index + 1,
          seg.airlineCode,
          seg.flightNumber,
          seg.classCode,
          seg.travelDate,
          seg.origin,
          seg.destination,
          seg.departureTime,
          seg.arrivalTime,
          seg.status,
          seg.numSeats,
          seg.aircraft ?? null
        );
      });
    });

    transaction();
  }

  getPnr(recordLocator: string): SavedPnrRecord | null {
    const pnrRow = this.db
      .prepare('SELECT record_locator, created_at, agent_id, received_from, phone, ticketing, status FROM pnrs WHERE record_locator = ?')
      .get(recordLocator.toUpperCase()) as
      | {
          record_locator: string;
          created_at: string;
          agent_id: string | null;
          received_from: string;
          phone: string;
          ticketing: string;
          status: string;
        }
      | undefined;

    if (!pnrRow) return null;

    const passengers = this.db
      .prepare('SELECT sequence, last_name, first_name, title, pax_type, dob, associated_adult FROM pnr_passengers WHERE pnr_locator = ? ORDER BY sequence ASC')
      .all(recordLocator.toUpperCase()) as SavedPnrRecord['passengers'];

    const segments = this.db
      .prepare('SELECT segment_number, airline_code, flight_number, class_code, travel_date, origin, destination, departure_time, arrival_time, status, num_seats, aircraft FROM pnr_segments WHERE pnr_locator = ? ORDER BY segment_number ASC')
      .all(recordLocator.toUpperCase()) as SavedPnrRecord['segments'];

    return {
      ...pnrRow,
      passengers,
      segments,
    };
  }

  cancelPnr(recordLocator: string): boolean {
    const result = this.db
      .prepare("UPDATE pnrs SET status = 'CANCELLED' WHERE record_locator = ?")
      .run(recordLocator.toUpperCase());
    if (result.changes > 0) {
      this.db
        .prepare("UPDATE pnr_segments SET status = 'XX' WHERE pnr_locator = ?")
        .run(recordLocator.toUpperCase());
      return true;
    }
    return false;
  }

  cancelSegment(recordLocator: string, segmentNumber: number): boolean {
    const result = this.db
      .prepare("UPDATE pnr_segments SET status = 'XX' WHERE pnr_locator = ? AND segment_number = ?")
      .run(recordLocator.toUpperCase(), segmentNumber);
    return result.changes > 0;
  }

  getFare(
    airlineCode: string,
    origin: string,
    destination: string,
    classCode: string,
    paxType: string = 'ADT'
  ): FareRecord | null {
    // 1. Try exact match on airline, route, class, paxType
    let fare = this.db
      .prepare(
        `SELECT id, airline_code, origin, destination, class_code, base_fare_ngn, base_fare_usd, fare_basis, pax_type, validity_days
         FROM fares
         WHERE airline_code = ? AND origin = ? AND destination = ? AND class_code = ? AND pax_type = ?`
      )
      .get(
        airlineCode.toUpperCase(),
        origin.toUpperCase(),
        destination.toUpperCase(),
        classCode.toUpperCase(),
        paxType
      ) as FareRecord | undefined;

    if (fare) return fare;

    // 2. Try match without airline restriction if not found
    fare = this.db
      .prepare(
        `SELECT id, airline_code, origin, destination, class_code, base_fare_ngn, base_fare_usd, fare_basis, pax_type, validity_days
         FROM fares
         WHERE origin = ? AND destination = ? AND class_code = ? AND pax_type = ?
         LIMIT 1`
      )
      .get(origin.toUpperCase(), destination.toUpperCase(), classCode.toUpperCase(), paxType) as FareRecord | undefined;

    if (fare) return fare;

    // 3. Fallback: match by route and class with ADT
    fare = this.db
      .prepare(
        `SELECT id, airline_code, origin, destination, class_code, base_fare_ngn, base_fare_usd, fare_basis, pax_type, validity_days
         FROM fares
         WHERE origin = ? AND destination = ? AND class_code = ?
         LIMIT 1`
      )
      .get(origin.toUpperCase(), destination.toUpperCase(), classCode.toUpperCase()) as FareRecord | undefined;

    return fare ?? null;
  }

  logCommand(sessionId: string, input: string, output: string): void {
    try {
      this.db
        .prepare('INSERT INTO command_log (session_id, input, output) VALUES (?, ?, ?)')
        .run(sessionId, input, output);
    } catch {
      // Ignore logging failures so commands still execute smoothly
    }
  }

  savePracticeAttempt(
    sessionId: string,
    scenarioId: string,
    score: number,
    feedback: string
  ): void {
    try {
      this.db
        .prepare('INSERT INTO practice_attempts (session_id, scenario_id, score, feedback) VALUES (?, ?, ?, ?)')
        .run(sessionId, scenarioId, score, feedback);
    } catch {
      // Ignore practice recording failure
    }
  }
}
