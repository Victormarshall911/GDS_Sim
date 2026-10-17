import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCommand, createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore, SessionState } from '../src/command-engine/types';

describe('Amadeus Entry Stacking, Tier 2 Simulations & Tier 3 Fallback (Milestone e)', () => {
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

  it('executes chained entries with delimiter "+" and stops on failure', () => {
    // Valid chain: sell + name + contact + ticketing + RF + ER
    const chain =
      'SSAI101Y15MARBOMDEL1+NM1SMITH/JOHN MR+APLOS 08012345678+TKOK+RFJOHN+ER';

    const res = executeCommand(state, chain, store);
    expect(res.output).toContain('HK1');
    expect(res.output).toContain('1.1SMITH/JOHN MR');
    expect(res.output).toContain('TK OK');
    expect(res.output).toContain('RF JOHN');
    expect(res.output).toContain('--- RLR ---');
    expect(res.newState.currentPnr).toMatch(/^[A-Z]{6}$/);

    // Failure stops the chain: missing itinerary should halt before subsequent commands
    const failingChain = 'NM1DOE/JANE MRS+ER+APLOS 11111';
    const failRes = executeCommand(state, failingChain, store);
    expect(failRes.output).toContain('NEED ITINERARY');
    // APLOS should not have executed
    expect(failRes.output).not.toContain('AP LOS 11111');
  });

  it('splits passenger into new PNR with SP', () => {
    // Setup booking with 2 passengers
    let res = executeCommand(state, 'NM2SHARMA/RAJ MR/PRIYA MRS', store);
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL2', store);
    res = executeCommand(res.newState, 'APLOS 08012345678', store);
    res = executeCommand(res.newState, 'TKOK', store);
    res = executeCommand(res.newState, 'RF RAHUL', store);
    res = executeCommand(res.newState, 'ER', store);

    const origLocator = res.newState.currentPnr;
    expect(res.newState.workingPnr?.passengers.length).toBe(2);

    // Split passenger 2 (SP2)
    res = executeCommand(res.newState, 'SP2', store);
    expect(res.output).toContain('SPLIT IN PROGRESS');
    expect(res.output).toContain(origLocator);
    expect(res.output).toContain('NEW PNR:');
    // Original working PNR retains passenger 1
    expect(res.newState.workingPnr?.passengers.length).toBe(1);
    expect(res.newState.workingPnr?.passengers[0].firstName).toBe('RAJ');
  });

  it('handles seat map and seat assignment (SM, ST, ST/W, SX)', () => {
    let res = executeCommand(state, 'NM1SHARMA/RAHUL MR', store);
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL1', store);

    // SM: Seat map
    res = executeCommand(res.newState, 'SM1', store);
    expect(res.output).toContain('SEAT MAP:');
    expect(res.output).toContain('A B C   D E F');

    // ST: Assign seat 12A
    res = executeCommand(res.newState, 'ST/12A/P1/S1', store);
    expect(res.output).toContain('SEAT 12A CONFIRMED');
    expect(res.newState.seatAssignments?.['P1']).toBe('12A');

    // ST/W: Seat preference window
    res = executeCommand(res.newState, 'ST/W/P1/S1', store);
    expect(res.output).toContain('WINDOW PREFERENCE CONFIRMED');

    // SX: Cancel seat assignment
    res = executeCommand(res.newState, 'SXALL', store);
    expect(res.output).toContain('CANCELLED');
  });

  it('manages queues with QT, QS, QN, QI, QF', () => {
    // QT: Queue count summary
    let res = executeCommand(state, 'QT', store);
    expect(res.output).toContain('QUEUE COUNT SUMMARY');
    expect(res.output).toContain('TICKETING TIME LIMIT');

    // QS: Start processing queue 8
    res = executeCommand(res.newState, 'QS8', store);
    expect(res.output).toContain('WORKING QUEUE 8');
    expect(res.output).toContain('ITEM 1 OF');

    // QN: Next item
    res = executeCommand(res.newState, 'QN', store);
    expect(res.output).toContain('WORKING QUEUE 8');

    // QF: Finish and remove item
    res = executeCommand(res.newState, 'QF', store);
    expect(res.output).toContain('REMOVED FROM QUEUE 8');

    // QI: Ignore / exit queue
    res = executeCommand(res.newState, 'QI', store);
    expect(res.output).toContain('EXITED QUEUE');
    expect(res.newState.activeQueue).toBeNull();
  });

  it('searches and books hotels (HL, HA, HS) and cars (CL, CA)', () => {
    // HL: Hotel list for London
    let res = executeCommand(state, 'HLLON', store);
    expect(res.output).toContain('HOTEL PROPERTIES FOR LON');
    expect(res.output).toContain('HILTON');

    // HA: Hotel availability
    res = executeCommand(res.newState, 'HALON15JUN-3', store);
    expect(res.output).toContain('HOTEL AVAILABILITY: LON');

    // HS: Hotel sell
    res = executeCommand(res.newState, 'HS1', store);
    expect(res.output).toContain('HTL HK1 CONFIRMED');

    // CL: Car locations for Paris
    res = executeCommand(res.newState, 'CLPAR', store);
    expect(res.output).toContain('CAR RENTAL LOCATIONS FOR PAR');

    // CA: Car availability
    res = executeCommand(res.newState, 'CALHR15JUN-3', store);
    expect(res.output).toContain('CAR AVAILABILITY: LHR');
  });

  it('returns COMMAND RECOGNISED - NOT YET SIMULATED for Tier 3 entries', () => {
    let res = executeCommand(state, 'TTU', store);
    expect(res.output).toContain('COMMAND RECOGNISED - NOT YET SIMULATED: TTU');

    res = executeCommand(state, 'TQT', store);
    expect(res.output).toContain('COMMAND RECOGNISED - NOT YET SIMULATED: TQT');

    res = executeCommand(state, 'TRDC', store);
    expect(res.output).toContain('COMMAND RECOGNISED - NOT YET SIMULATED: TRDC');
  });
});
