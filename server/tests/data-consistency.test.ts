import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/db/connection';
import { SqliteDataStore } from '../src/db/queries';
import { AIRLINE_TICKET_PREFIXES } from '../src/command-engine/command-config';
import { createInitialSessionState, executeCommand } from '../src/command-engine/engine';
import { formatAmadeusPnr } from '../src/command-engine/dialects/amadeus-commands/pnr';
import { createTestStore } from './test-helper';
import type { DataStore, SessionState, ETicketRecord } from '../src/command-engine/types';

describe('STEP 3: Data Consistency & Schema Migration', () => {
  describe('a) Old-schema command_log migration & dialect writing', () => {
    it('safely and idempotently migrates an old-schema command_log table without data loss', () => {
      const db = new Database(':memory:');

      // Setup old schema without dialect column
      db.exec(`
        CREATE TABLE command_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          input TEXT NOT NULL,
          output TEXT NOT NULL
        );
      `);

      // Insert pre-existing command log rows
      const insertOld = db.prepare(
        'INSERT INTO command_log (session_id, input, output) VALUES (?, ?, ?)'
      );
      insertOld.run('sess-sabre-old', '120NOVABVLOS', 'FLIGHTS DISPLAY');
      insertOld.run('sess-sabre-old-2', '-SMITH/JOHN', '1.1SMITH/JOHN');

      // Verify old schema has no dialect column
      const colsBefore = (
        db.prepare('PRAGMA table_info(command_log)').all() as Array<{ name: string }>
      ).map((c) => c.name);
      expect(colsBefore).not.toContain('dialect');

      // Run migration
      migrateDatabase(db);

      // Verify dialect column was added
      const colsAfter = (
        db.prepare('PRAGMA table_info(command_log)').all() as Array<{ name: string }>
      ).map((c) => c.name);
      expect(colsAfter).toContain('dialect');

      // Verify existing rows are preserved with default 'sabre'
      const rows = db.prepare('SELECT * FROM command_log ORDER BY id ASC').all() as Array<{
        id: number;
        session_id: string;
        input: string;
        output: string;
        dialect: string;
      }>;
      expect(rows.length).toBe(2);
      expect(rows[0].session_id).toBe('sess-sabre-old');
      expect(rows[0].input).toBe('120NOVABVLOS');
      expect(rows[0].dialect).toBe('sabre');
      expect(rows[1].session_id).toBe('sess-sabre-old-2');
      expect(rows[1].dialect).toBe('sabre');

      // Idempotency check: running migrateDatabase again causes no error and preserves data
      expect(() => migrateDatabase(db)).not.toThrow();
      const rowsAfterSecondMigration = db
        .prepare('SELECT * FROM command_log ORDER BY id ASC')
        .all();
      expect(rowsAfterSecondMigration.length).toBe(2);

      db.close();
    });

    it('writes dialect column properly during logCommand and executeCommand', () => {
      const { store, cleanup } = createTestStore();

      // Direct store logging
      store.logCommand('session-amadeus-1', 'AN20NOVABVLOS', 'AMADEUS AVAILABILITY', 'amadeus');
      store.logCommand('session-sabre-1', '120NOVABVLOS', 'SABRE AVAILABILITY', 'sabre');

      // Engine logging with session ID
      const amadeusState = createInitialSessionState('amadeus', true);
      executeCommand(amadeusState, 'AN20NOVABVLOS', store, 'engine-amadeus-session');

      const sabreState = createInitialSessionState('sabre', true);
      executeCommand(sabreState, '120NOVABVLOS', store, 'engine-sabre-session');

      const db = (store as any).db as InstanceType<typeof Database>;
      const logRows = db
        .prepare('SELECT session_id, dialect, input FROM command_log ORDER BY id DESC LIMIT 4')
        .all() as Array<{ session_id: string; dialect: string; input: string }>;

      const engineSabre = logRows.find((r) => r.session_id === 'engine-sabre-session');
      const engineAmadeus = logRows.find((r) => r.session_id === 'engine-amadeus-session');
      const directAmadeus = logRows.find((r) => r.session_id === 'session-amadeus-1');
      const directSabre = logRows.find((r) => r.session_id === 'session-sabre-1');

      expect(engineSabre?.dialect).toBe('sabre');
      expect(engineAmadeus?.dialect).toBe('amadeus');
      expect(directAmadeus?.dialect).toBe('amadeus');
      expect(directSabre?.dialect).toBe('sabre');

      cleanup();
    });
  });

  describe('b) Single source of truth for airline ticket prefixes (command-config.ts vs DB)', () => {
    it('ensures AIRLINE_TICKET_PREFIXES has P4 set to 240 with status VERIFY', () => {
      expect(AIRLINE_TICKET_PREFIXES.P4).toBeDefined();
      expect(AIRLINE_TICKET_PREFIXES.P4.numeric).toBe('240');
      expect(AIRLINE_TICKET_PREFIXES.P4.status).toBe('VERIFY');
      expect(AIRLINE_TICKET_PREFIXES.P4.name).toBe('Air Peace');
    });

    it('guarantees the seeded airlines table and command-config.ts can never disagree for any airline', () => {
      const { store, cleanup } = createTestStore();
      const db = (store as any).db as InstanceType<typeof Database>;

      const dbAirlines = db.prepare('SELECT code, name, numeric FROM airlines').all() as Array<{
        code: string;
        name: string;
        numeric: string;
      }>;

      // 1. Every entry in AIRLINE_TICKET_PREFIXES must exist in the database with matching numeric
      for (const [code, expected] of Object.entries(AIRLINE_TICKET_PREFIXES)) {
        const found = dbAirlines.find((a) => a.code === code);
        expect(
          found,
          `Airline ${code} (${expected.name}) from config missing in seeded database`
        ).toBeDefined();
        expect(found!.numeric).toBe(expected.numeric);
        expect(found!.name.toLowerCase()).toBe(expected.name.toLowerCase());
      }

      // 2. Every airline in the database must exist in AIRLINE_TICKET_PREFIXES with matching numeric
      for (const dbAirline of dbAirlines) {
        const configEntry = AIRLINE_TICKET_PREFIXES[dbAirline.code];
        expect(
          configEntry,
          `Airline ${dbAirline.code} in database missing in AIRLINE_TICKET_PREFIXES`
        ).toBeDefined();
        expect(dbAirline.numeric).toBe(configEntry.numeric);
      }

      cleanup();
    });

    it('migrates an existing database with mismatched P4 numeric code (810 -> 240)', () => {
      const db = new Database(':memory:');
      db.exec(`
        CREATE TABLE airlines (
          code TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          numeric TEXT NOT NULL
        );
      `);
      db.prepare('INSERT INTO airlines (code, name, numeric) VALUES (?, ?, ?)').run(
        'P4',
        'Air Peace',
        '810'
      );

      // Migration updates airlines numeric codes from single source of truth
      migrateDatabase(db);

      const p4 = db.prepare('SELECT * FROM airlines WHERE code = ?').get('P4') as {
        code: string;
        name: string;
        numeric: string;
      };
      expect(p4.numeric).toBe('240');

      db.close();
    });
  });

  describe('c) E-ticket FA element integrity', () => {
    it('throws a clear error when an e-ticket has no airline code instead of silently defaulting', () => {
      const state = createInitialSessionState('amadeus', true);
      const invalidTicket: any = {
        ticket_number: '1234567890',
        pnr_locator: 'ABCDEF',
        pax_name: 'SMITH/JOHN MR',
        total_amount: 150000,
        status: 'OPEN',
        issued_at: '2026-10-18',
        // airline_code is missing
      };

      expect(() => {
        formatAmadeusPnr(
          {
            record_locator: 'ABCDEF',
            passengers: [{ sequence: 1, lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
            segments: [],
            received_from: 'JOHN',
          },
          { ...state, eTickets: [invalidTicket] }
        );
      }).toThrow(/missing airline code/i);
    });

    it('renders correct FA element when valid airline code is provided and formats canonical fields', () => {
      const state = createInitialSessionState('amadeus', true);
      const ticket: ETicketRecord = {
        ticket_number: '240-1234567890',
        pnr_locator: 'ABCDEF',
        pax_name: 'SMITH/JOHN MR',
        airline_code: 'P4',
        total_amount: 150000,
        status: 'OPEN',
        issued_at: '2026-10-18',
      };

      const output = formatAmadeusPnr(
        {
          record_locator: 'ABCDEF',
          passengers: [{ sequence: 1, lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
          segments: [],
          received_from: 'JOHN',
        },
        { ...state, eTickets: [ticket] }
      );

      expect(output).toContain('FA PAX 240-1234567890/ETP4/');
      expect(output).toContain('RF JOHN');
    });
  });
});
