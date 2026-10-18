import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestStore } from './test-helper';
import { executeCommand, createInitialSessionState } from '../src/command-engine/engine';
import type { DataStore } from '../src/command-engine/types';

describe('Amadeus Availability & Modifier Parser (Section 0)', () => {
  let store: DataStore;
  let cleanup: () => void;

  beforeEach(() => {
    const res = createTestStore();
    store = res.store;
    cleanup = res.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('fails initially or parses AN19OCTLOSABV/AP4 and returns only P4 flights', () => {
    const state = createInitialSessionState('amadeus');
    const result = executeCommand(state, 'AN19OCTLOSABV/AP4', store);

    // Must return availability with only P4 flights
    expect(result.output).toContain('P4');
    expect(result.output).not.toContain('W3');
    expect(result.output).not.toContain('QI');
    expect(result.newState.lastAvailability).not.toBeNull();
    expect(result.newState.lastAvailability?.lines.every((l) => l.airlineCode === 'P4')).toBe(true);
  });

  it('filters flights by airline with /AW3 returning only W3 flights', () => {
    const state = createInitialSessionState('amadeus');
    const result = executeCommand(state, 'AN19OCTLOSABV/AW3', store);

    expect(result.output).toContain('W3');
    expect(result.output).not.toContain('P4');
    expect(result.newState.lastAvailability?.lines.every((l) => l.airlineCode === 'W3')).toBe(true);
  });

  it('tolerates optional spaces and case insensitivity: "an 19oct los abv /a p4"', () => {
    const state = createInitialSessionState('amadeus');
    const result = executeCommand(state, 'an 19oct los abv /a p4', store);

    expect(result.output).toContain('P4');
    expect(result.output).not.toContain('W3');
    expect(result.newState.lastAvailability?.lines.every((l) => l.airlineCode === 'P4')).toBe(true);
  });

  it('supports multiple airline filters: /AP4,W3 or /AP4/AW3', () => {
    const state = createInitialSessionState('amadeus');
    const res1 = executeCommand(state, 'AN19OCTLOSABV/AP4,W3', store);
    expect(res1.output).toContain('P4');
    expect(res1.output).toContain('W3');
    expect(res1.output).not.toContain('QI');

    const res2 = executeCommand(state, 'AN19OCTLOSABV/AP4/AW3', store);
    expect(res2.output).toContain('P4');
    expect(res2.output).toContain('W3');
    expect(res2.output).not.toContain('QI');
  });

  it('supports date formats: 19OCT, 19OCT26, and bare day "19"', () => {
    const state = createInitialSessionState('amadeus');
    const res1 = executeCommand(state, 'AN19OCT26LOSABV', store);
    expect(res1.output).toContain('LOS');
    expect(res1.newState.lastAvailability).not.toBeNull();

    const res2 = executeCommand(state, 'AN19LOSABV', store);
    expect(res2.output).toContain('LOS');
    expect(res2.newState.lastAvailability).not.toBeNull();
  });

  it('returns a realistic NO FLIGHTS message when an airline has no flights on that route', () => {
    const state = createInitialSessionState('amadeus');
    // BA does not fly domestic LOS-ABV
    const result = executeCommand(state, 'AN19OCTLOSABV/ABA', store);

    expect(result.output).toContain('NO FLIGHTS');
    expect(result.newState.lastAvailability).toBeNull();
  });

  it('returns an error on invalid modifier without crashing', () => {
    const state = createInitialSessionState('amadeus');
    const result = executeCommand(state, 'AN19OCTLOSABV/Z123', store);

    expect(result.output).toContain('INVALID MODIFIER');
  });

  describe('Return Availability (ACR / AR)', () => {
    it('AN19OCTLOSABV/AP4 then ACR20NOV shows ABV-LOS on 20NOV, P4 only', () => {
      const state = createInitialSessionState('amadeus');
      const res1 = executeCommand(state, 'AN19OCTLOSABV/AP4', store);
      expect(res1.newState.lastAvailability?.origin).toBe('LOS');
      expect(res1.newState.lastAvailability?.destination).toBe('ABV');

      const res2 = executeCommand(res1.newState, 'ACR20NOV', store);
      expect(res2.output).toContain('20NOV ABV-LOS');
      expect(res2.newState.lastAvailability?.origin).toBe('ABV');
      expect(res2.newState.lastAvailability?.destination).toBe('LOS');
      expect(res2.newState.lastAvailability?.lines.every((l) => l.airlineCode === 'P4')).toBe(true);
    });

    it('Then SS1Y1 gives a 2-segment itinerary: LOS-ABV then ABV-LOS', () => {
      const state = createInitialSessionState('amadeus');
      let res = executeCommand(state, 'AN19OCTLOSABV/AP4', store);
      res = executeCommand(res.newState, 'SS1Y1', store);
      expect(res.newState.workingPnr?.segments.length).toBe(1);
      expect(res.newState.workingPnr?.segments[0].origin).toBe('LOS');
      expect(res.newState.workingPnr?.segments[0].destination).toBe('ABV');

      res = executeCommand(res.newState, 'ACR20NOV', store);
      res = executeCommand(res.newState, 'SS1Y1', store);
      expect(res.newState.workingPnr?.segments.length).toBe(2);
      expect(res.newState.workingPnr?.segments[1].origin).toBe('ABV');
      expect(res.newState.workingPnr?.segments[1].destination).toBe('LOS');
    });

    it('ACR20NOV/AW3 overrides the filter', () => {
      const state = createInitialSessionState('amadeus');
      let res = executeCommand(state, 'AN19OCTLOSABV/AP4', store);
      res = executeCommand(res.newState, 'ACR20NOV/AW3', store);
      expect(res.output).toContain('20NOV ABV-LOS');
      expect(res.newState.lastAvailability?.origin).toBe('ABV');
      expect(res.newState.lastAvailability?.destination).toBe('LOS');
      expect(res.newState.lastAvailability?.lines.every((l) => l.airlineCode === 'W3')).toBe(true);
    });

    it('ACR with no prior availability returns the error', () => {
      const state = createInitialSessionState('amadeus');
      const res = executeCommand(state, 'ACR20NOV', store);
      expect(res.output).toContain('NEED AVAILABILITY DISPLAY');
    });

    it('ACR twice flips back to LOS-ABV', () => {
      const state = createInitialSessionState('amadeus');
      let res = executeCommand(state, 'AN19OCTLOSABV/AP4', store);
      res = executeCommand(res.newState, 'ACR20NOV', store);
      expect(res.newState.lastAvailability?.origin).toBe('ABV');
      expect(res.newState.lastAvailability?.destination).toBe('LOS');

      res = executeCommand(res.newState, 'ACR25NOV', store);
      expect(res.newState.lastAvailability?.origin).toBe('LOS');
      expect(res.newState.lastAvailability?.destination).toBe('ABV');
      expect(res.output).toContain('25NOV LOS-ABV');
    });

    it('lowercase and spaced input works (acr 20nov, ar 20nov)', () => {
      const state = createInitialSessionState('amadeus');
      let res = executeCommand(state, 'an 19oct los abv /a p4', store);
      res = executeCommand(res.newState, 'acr 20nov', store);
      expect(res.newState.lastAvailability?.origin).toBe('ABV');
      expect(res.newState.lastAvailability?.destination).toBe('LOS');

      res = executeCommand(res.newState, 'ar 22nov', store);
      expect(res.newState.lastAvailability?.origin).toBe('LOS');
      expect(res.newState.lastAvailability?.destination).toBe('ABV');
    });

    it('AC20NOV still only changes the date', () => {
      const state = createInitialSessionState('amadeus');
      let res = executeCommand(state, 'AN19OCTLOSABV', store);
      expect(res.newState.lastAvailability?.origin).toBe('LOS');
      expect(res.newState.lastAvailability?.destination).toBe('ABV');

      res = executeCommand(res.newState, 'AC20NOV', store);
      expect(res.output).toContain('20NOV LOS-ABV');
      expect(res.newState.lastAvailability?.origin).toBe('LOS');
      expect(res.newState.lastAvailability?.destination).toBe('ABV');
    });
  });

  describe('Availability Display Commands (AD, AE, AA, SN, TN) & Round Trip', () => {
    it('AD sorts availability display by departure time ascending', () => {
      const state = createInitialSessionState('amadeus');
      const res = executeCommand(state, 'AD19OCTLOSABV', store);

      expect(res.output).toContain('AD  19OCT LOS-ABV');
      const lines = res.newState.lastAvailability?.lines || [];
      expect(lines.length).toBeGreaterThan(1);
      for (let i = 0; i < lines.length - 1; i++) {
        expect(lines[i].departureTime.localeCompare(lines[i + 1].departureTime)).toBeLessThanOrEqual(0);
      }
    });

    it('AE sorts availability display by elapsed flight time ascending', () => {
      const state = createInitialSessionState('amadeus');
      const res = executeCommand(state, 'AE19OCTLOSABV', store);

      expect(res.output).toContain('AE  19OCT LOS-ABV');
      const lines = res.newState.lastAvailability?.lines || [];
      expect(lines.length).toBeGreaterThan(1);
      // Line 1 should be the fastest flight (QI 301, 70m = 01H10M)
      expect(lines[0].airlineCode).toBe('QI');
      expect(lines[0].elapsedTime).toBe('01H10M');
    });

    it('AA sorts availability display by arrival time ascending', () => {
      const state = createInitialSessionState('amadeus');
      const res = executeCommand(state, 'AA19OCTLOSABV', store);

      expect(res.output).toContain('AA  19OCT LOS-ABV');
      const lines = res.newState.lastAvailability?.lines || [];
      expect(lines.length).toBeGreaterThan(1);
      for (let i = 0; i < lines.length - 1; i++) {
        expect(lines[i].arrivalTime.localeCompare(lines[i + 1].arrivalTime)).toBeLessThanOrEqual(0);
      }
    });

    it('SN returns schedule display with SN header', () => {
      const state = createInitialSessionState('amadeus');
      const res = executeCommand(state, 'SN19OCTLOSABV', store);

      expect(res.output).toContain('SN  19OCT LOS-ABV');
      expect(res.newState.lastAvailability?.lines.length).toBeGreaterThan(0);
    });

    it('TN returns timetable display with TN header', () => {
      const state = createInitialSessionState('amadeus');
      const res = executeCommand(state, 'TN19OCTLOSABV', store);

      expect(res.output).toContain('TN  19OCT LOS-ABV');
      expect(res.newState.lastAvailability?.lines.length).toBeGreaterThan(0);
    });

    it('round trip AN19OCTLOSABV*25OCT displays both outbound and return availability with sequential line numbers', () => {
      const state = createInitialSessionState('amadeus');
      const res = executeCommand(state, 'AN19OCTLOSABV*25OCT', store);

      expect(res.output).toContain('AN  19OCT LOS-ABV');
      expect(res.output).toContain('RETURN AVAILABILITY: 25OCT ABV-LOS');
      const lines = res.newState.lastAvailability?.lines || [];
      expect(lines.length).toBe(18); // 9 outbound + 9 return flights
      expect(lines[0].origin).toBe('LOS');
      expect(lines[0].destination).toBe('ABV');
      expect(lines[9].origin).toBe('ABV');
      expect(lines[9].destination).toBe('LOS');
      expect(lines[9].lineNumber).toBe(10);
    });
  });
});

