import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCommand, createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore } from '../src/command-engine/types';

describe('Central Command Engine & Complete Booking Workflow', () => {
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

  it('blocks transactional commands if agent is not signed in', () => {
    const state = createInitialSessionState();
    const result = executeCommand(state, '1LOSLHR15NOV', store);

    expect(result.output).toContain('SIGN IN REQUIRED');
  });

  it('executes full end-to-end PNR creation workflow matching Sabre syntax', () => {
    let state = createInitialSessionState();

    // 1. Sign In
    let res = executeCommand(state, 'SI*7890', store);
    state = res.newState;
    expect(res.output).toContain('SIGN IN AT');
    expect(state.signedIn).toBe(true);
    expect(state.agentId).toBe('7890');

    // 2. Check Availability
    res = executeCommand(state, '1LOSLHR15NOV', store);
    state = res.newState;
    expect(res.output).toContain('LOSLHR');
    expect(state.lastAvailability).not.toBeNull();

    // 3. Sell 1 seat from line 1 in Y class
    res = executeCommand(state, '01Y1', store);
    state = res.newState;
    expect(res.output).toContain('SS1');
    expect(state.workingPnr?.segments.length).toBe(1);
    expect(state.workingPnr?.segments[0].status).toBe('SS');

    // 4. Add Passenger Name
    res = executeCommand(state, '-SMITH/JOHN MR', store);
    state = res.newState;
    expect(res.output).toContain('SMITH/JOHN MR');
    expect(state.workingPnr?.passengers.length).toBe(1);

    // 5. Add Phone
    res = executeCommand(state, '9234-802-123-4567-A', store);
    state = res.newState;
    expect(res.output).toBe('9234-802-123-4567-A');
    expect(state.workingPnr?.phone).toBe('234-802-123-4567-A');

    // 6. Add Ticketing Arrangement
    res = executeCommand(state, '7TAW/', store);
    state = res.newState;
    expect(res.output).toContain('7TAW/');
    expect(state.workingPnr?.ticketing).not.toBeNull();

    // 7. Add Received From
    res = executeCommand(state, '6SMITH', store);
    state = res.newState;
    expect(res.output).toBe('6SMITH');
    expect(state.workingPnr?.receivedFrom).toBe('SMITH');

    // 8. Price with WP
    res = executeCommand(state, 'WP', store);
    state = res.newState;
    expect(res.output).toContain('WP');
    expect(res.output).toContain('BASE FARE');

    // 9. End and Redisplay (ER)
    res = executeCommand(state, 'ER', store);
    state = res.newState;
    expect(state.workingPnr).toBeNull(); // Working PNR cleared after E
    expect(state.currentPnr).toMatch(/^[A-Z]{6}$/); // Saved locator
    const locator = state.currentPnr!;
    expect(res.output).toContain(locator);
    expect(res.output).toContain('HK1'); // Freshly sold SS became HK
    expect(res.output).toContain('SMITH/JOHN MR');

    // 10. Retrieve saved PNR by locator (*LOCATOR)
    res = executeCommand(state, `*${locator}`, store);
    expect(res.output).toContain(locator);
    expect(res.output).toContain('SMITH/JOHN MR');
    expect(res.output).toContain('HK1');
  });

  it('supports dialect switching between Sabre and Amadeus', () => {
    let state = createInitialSessionState();

    let res = executeCommand(state, 'SET AMADEUS', store);
    state = res.newState;
    expect(state.dialect).toBe('amadeus');
    expect(res.output).toContain('DIALECT SWITCHED TO AMADEUS');

    // Amadeus command
    res = executeCommand(state, 'JI 7890', store);
    state = res.newState;
    expect(res.output).toContain('OK 001/SU');
    expect(state.signedIn).toBe(true);

    // Switch back to Sabre
    res = executeCommand(state, 'SET SABRE', store);
    state = res.newState;
    expect(state.dialect).toBe('sabre');
    expect(res.output).toContain('DIALECT SWITCHED TO SABRE');
  });
});
