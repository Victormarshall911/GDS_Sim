import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCommand, createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import { formatAmadeusPnr } from '../src/command-engine/dialects/amadeus-commands/pnr';
import type { DataStore, SessionState } from '../src/command-engine/types';

describe('STEP 4: Fidelity & Regression Tests', () => {
  let store: DataStore;
  let cleanup: () => void;
  let state: SessionState;

  beforeEach(() => {
    const res = createTestStore();
    store = res.store;
    cleanup = res.cleanup;
    state = createInitialSessionState('amadeus', true);
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Amadeus PNR Element Numbering & Ordering', () => {
    it('numbers elements sequentially with no duplicates: names first, then itinerary, AP, TK, RF', () => {
      // Build a standard booking: name + itinerary + contact + ticketing + RF
      let res = executeCommand(state, 'NM1SMITH/JOHN MR', store);
      res = executeCommand(res.newState, 'SS1Y1', store); // or direct short sell / AN first
      // Let's do an AN first to ensure SS1Y1 works or sell long
      if (!res.newState.workingPnr?.segments.length) {
        res = executeCommand(res.newState, 'AN20NOVABVLOS', store);
        res = executeCommand(res.newState, 'SS1Y1', store);
      }
      res = executeCommand(res.newState, 'APLOS 08012345678', store);
      res = executeCommand(res.newState, 'TKOK', store);
      res = executeCommand(res.newState, 'RF VICTOR', store);

      // Display the working PNR via RT
      const rtRes = executeCommand(res.newState, 'RT', store);
      const output = rtRes.output;

      // Banner check: KEEP "--- RLR ---" banner exactly as it is
      expect(output).toContain('--- RLR ---');

      const lines = output.split('\n');

      // Find all numbered element lines: format "  <num> ..." or "  <num>.<subnum>..."
      const elementLines: Array<{ lineNum: number; text: string }> = [];
      for (const line of lines) {
        const match = line.match(/^\s+(\d+)(?:\.\d+)?\s*(.*)$/);
        if (match) {
          elementLines.push({
            lineNum: parseInt(match[1], 10),
            text: line.trim(),
          });
        }
      }

      expect(elementLines.length).toBeGreaterThanOrEqual(5);

      // 1. Verify numbers are strictly sequential with NO duplicates: 1, 2, 3, 4, 5...
      const distinctNumbers: number[] = [];
      for (const item of elementLines) {
        if (!distinctNumbers.includes(item.lineNum)) {
          distinctNumbers.push(item.lineNum);
        }
      }

      for (let i = 0; i < distinctNumbers.length; i++) {
        expect(distinctNumbers[i]).toBe(i + 1);
      }

      // 2. Verify element order: Names (1) -> Itinerary (2) -> AP (3) -> TK (4) -> RF (5)
      const nameElem = elementLines.find((e) => e.text.includes('SMITH/JOHN MR'));
      const itinElem = elementLines.find((e) => e.text.includes('ABVLOS') || e.text.includes('P4') || e.text.includes('W3') || e.text.includes('QI'));
      const apElem = elementLines.find((e) => e.text.includes('AP '));
      const tkElem = elementLines.find((e) => e.text.includes('TK '));
      const rfElem = elementLines.find((e) => e.text.includes('RF '));

      expect(nameElem).toBeDefined();
      expect(itinElem).toBeDefined();
      expect(apElem).toBeDefined();
      expect(tkElem).toBeDefined();
      expect(rfElem).toBeDefined();

      expect(nameElem!.lineNum).toBe(1);
      expect(itinElem!.lineNum).toBe(2);
      expect(apElem!.lineNum).toBe(3);
      expect(tkElem!.lineNum).toBe(4);
      expect(rfElem!.lineNum).toBe(5);

      // 3. Verify RF element is clearly visible
      expect(rfElem!.text).toBe('5 RF VICTOR');
    });

    it('places FA (electronic ticket) after ticketing when tickets are issued, maintaining sequential numbering', () => {
      // Complete booking, end transaction, price, and issue tickets
      let res = executeCommand(state, 'AN20NOVABVLOS', store);
      res = executeCommand(res.newState, 'SS1Y1', store);
      res = executeCommand(res.newState, 'NM1ADE/KEMI MS', store);
      res = executeCommand(res.newState, 'APLOS 08099998888', store);
      res = executeCommand(res.newState, 'TKOK', store);
      res = executeCommand(res.newState, 'RF TUNDE', store);
      res = executeCommand(res.newState, 'ER', store);

      // Price and issue ticket
      res = executeCommand(res.newState, 'FPCASH', store);
      res = executeCommand(res.newState, 'FXP', store);
      res = executeCommand(res.newState, 'TTP', store);

      // Redisplay PNR
      res = executeCommand(res.newState, 'RT', store);
      const output = res.output;

      expect(output).toContain('--- RLR ---');
      expect(output).toContain('FA PAX');
      expect(output).toContain('RF TUNDE');

      const lines = output.split('\n');
      const elementLines: Array<{ lineNum: number; text: string }> = [];
      for (const line of lines) {
        const match = line.match(/^\s+(\d+)(?:\.\d+)?\s*(.*)$/);
        if (match) {
          elementLines.push({
            lineNum: parseInt(match[1], 10),
            text: line.trim(),
          });
        }
      }

      // Verify sequence is strictly 1, 2, 3, 4, 5, 6
      const distinctNumbers: number[] = [];
      for (const item of elementLines) {
        if (!distinctNumbers.includes(item.lineNum)) {
          distinctNumbers.push(item.lineNum);
        }
      }

      for (let i = 0; i < distinctNumbers.length; i++) {
        expect(distinctNumbers[i]).toBe(i + 1);
      }

      const tkElem = elementLines.find((e) => e.text.includes('TK '));
      const faElem = elementLines.find((e) => e.text.includes('FA PAX'));
      const rfElem = elementLines.find((e) => e.text.includes('RF '));

      expect(tkElem).toBeDefined();
      expect(faElem).toBeDefined();
      expect(rfElem).toBeDefined();

      // FA comes after TK
      expect(faElem!.lineNum).toBeGreaterThan(tkElem!.lineNum);
    });
  });

  describe('2. RF Element Visibility in PNR Display', () => {
    it('displays the RF element in working PNR, post-ER redisplay, and retrieved saved PNR', () => {
      let res = executeCommand(state, 'NM1ALABI/YINKA MR', store);
      res = executeCommand(res.newState, 'AN20NOVABVLOS', store);
      res = executeCommand(res.newState, 'SS1Y1', store);
      res = executeCommand(res.newState, 'APLOS 08022223333', store);
      res = executeCommand(res.newState, 'TKOK', store);
      res = executeCommand(res.newState, 'RF YINKA', store);

      // Check working PNR display
      let rt = executeCommand(res.newState, 'RT', store);
      expect(rt.output).toContain('RF YINKA');

      // Check ER display
      const er = executeCommand(res.newState, 'ER', store);
      expect(er.output).toContain('RF YINKA');
      const locator = er.newState.currentPnr!;
      expect(locator).toMatch(/^[A-Z]{6}$/);

      // Ignore and retrieve by locator
      let retrieved = executeCommand(er.newState, 'IG', store);
      retrieved = executeCommand(retrieved.newState, `RT${locator}`, store);
      expect(retrieved.output).toContain('RF YINKA');
      expect(retrieved.output).toContain(locator);
    });
  });

  describe('3. Clean AN, AC, and ACR Display Headers', () => {
    it('renders clean AN headers without duplicated dates or stray asterisks', () => {
      const res = executeCommand(state, 'AN20NOVABVLOS', store);
      const lines = res.output.split('\n').filter(Boolean);
      const headerLine = lines[0];

      // Header must look like: "AN  20NOV ABV-LOS  0000"
      expect(headerLine).toMatch(/^AN\s+20NOV\s+ABV-LOS\s+0000$/);
      expect(headerLine).not.toContain('**');

      // Ensure date appears exactly once in the header
      const dateMatches = headerLine.match(/20NOV/g);
      expect(dateMatches?.length).toBe(1);
    });

    it('renders clean AC headers without duplicated dates or stray asterisks', () => {
      let res = executeCommand(state, 'AN20NOVABVLOS', store);
      res = executeCommand(res.newState, 'AC21NOV', store);

      const lines = res.output.split('\n').filter(Boolean);
      const headerLine = lines[0];

      expect(headerLine).toMatch(/^AN\s+21NOV\s+ABV-LOS\s+0000$/);
      expect(headerLine).not.toContain('**');

      const dateMatches = headerLine.match(/21NOV/g);
      expect(dateMatches?.length).toBe(1);
    });

    it('renders clean ACR return availability headers with swapped origin-destination', () => {
      let res = executeCommand(state, 'AN20NOVABVLOS', store);
      res = executeCommand(res.newState, 'ACR22NOV', store);

      const lines = res.output.split('\n').filter(Boolean);
      const headerLine = lines[0];

      expect(headerLine).toMatch(/^AN\s+22NOV\s+LOS-ABV\s+0000$/);
      expect(headerLine).not.toContain('**');

      const dateMatches = headerLine.match(/22NOV/g);
      expect(dateMatches?.length).toBe(1);
    });
  });

  describe('4. FXP Tax Lines Deduplication', () => {
    it('does not duplicate TAXES / FEES lines in FXP pricing output', () => {
      let res = executeCommand(state, 'AN20NOVABVLOS', store);
      res = executeCommand(res.newState, 'SS1Y1', store);
      res = executeCommand(res.newState, 'NM1OBASI/CHIDI MR', store);
      res = executeCommand(res.newState, 'FXP', store);

      expect(res.output).toContain('FARE');
      expect(res.output).toContain('TAXES / FEES');
      expect(res.output).toContain('TOTAL');

      // Count occurrences of "TAXES / FEES" in FXP output
      const matches = res.output.match(/TAXES\s*\/\s*FEES/g);
      expect(matches, 'TAXES / FEES should appear exactly once in the pricing display').toHaveLength(1);

      // Verify TST is stored
      expect(res.output).toContain('TST 01 STORED');
      expect(res.newState.tsts?.length).toBe(1);
    });
  });

  describe('5. Graceful Error Catching on PNR Display Exceptions', () => {
    it('catches display exceptions in executeCommand and returns clean error without crashing', () => {
      // Invalidate e-ticket in state by removing its airline code
      const invalidTicket: any = {
        ticket_number: '999-1234567890',
        pnr_locator: 'ERRTST',
        pax_name: 'CRASH/TEST MR',
        total_amount: 100000,
        status: 'OPEN',
        issued_at: '2026-10-18',
        // airline_code is purposefully missing
      };

      const corruptState: SessionState = {
        ...state,
        workingPnr: {
          passengers: [{ sequence: 1, lastName: 'CRASH', firstName: 'TEST', title: 'MR', paxType: 'ADT' }],
          segments: [],
          phone: '08012345678',
          ticketing: 'OK',
          receivedFrom: 'AGENT',
        },
        eTickets: [invalidTicket],
      };

      // Executing RT should NOT throw an unhandled exception or crash
      let res: any;
      expect(() => {
        res = executeCommand(corruptState, 'RT', store, 'test-crash-session');
      }).not.toThrow();

      // Returns clean terminal error message
      expect(res.output).toContain('SYSTEM ERROR:');
      expect(res.output).toContain('missing airline code');
    });
  });
});
