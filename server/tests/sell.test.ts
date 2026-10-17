import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleAvailability } from '../src/command-engine/dialects/sabre-commands/availability';
import { handleSellFromAvail, handleDirectSell } from '../src/command-engine/dialects/sabre-commands/sell';
import { createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore } from '../src/command-engine/types';

describe('Sell Command', () => {
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

  it('sells from availability and marks status as SS in working PNR', () => {
    let state = createInitialSessionState();
    const availRes = handleAvailability('LOS', 'LHR', '15NOV', state, store);
    state = availRes.newState;

    const sellRes = handleSellFromAvail(1, 'Y', 1, state, store);

    expect(sellRes.output).toContain('SS1');
    expect(sellRes.newState.workingPnr).not.toBeNull();
    expect(sellRes.newState.workingPnr?.segments.length).toBe(1);
    expect(sellRes.newState.workingPnr?.segments[0].status).toBe('SS'); // Requirement: freshly sold segments show SS
    expect(sellRes.newState.workingPnr?.segments[0].classCode).toBe('Y');
    expect(sellRes.newState.workingPnr?.segments[0].numSeats).toBe(1);
  });

  it('returns error when selling without availability context', () => {
    const state = createInitialSessionState();
    const sellRes = handleSellFromAvail(1, 'Y', 1, state, store);

    expect(sellRes.output).toContain('NO AVAILABILITY IN CONTEXT');
  });

  it('returns error when selecting invalid line number', () => {
    let state = createInitialSessionState();
    const availRes = handleAvailability('LOS', 'LHR', '15NOV', state, store);
    state = availRes.newState;

    const sellRes = handleSellFromAvail(99, 'Y', 1, state, store);
    expect(sellRes.output).toContain('INVALID LINE NUMBER');
  });

  it('handles direct sell with status SS', () => {
    const state = createInitialSessionState();
    const sellRes = handleDirectSell('W3', 101, 'Y', '15NOV', 'LOS', 'LHR', 1, state, store);

    expect(sellRes.output).toContain('SS1');
    expect(sellRes.newState.workingPnr?.segments.length).toBe(1);
    expect(sellRes.newState.workingPnr?.segments[0].status).toBe('SS');
    expect(sellRes.newState.workingPnr?.segments[0].airlineCode).toBe('W3');
  });
});
