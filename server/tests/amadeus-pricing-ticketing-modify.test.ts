import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCommand, createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore, SessionState } from '../src/command-engine/types';

describe('Amadeus Modifications, Pricing & Ticketing (Milestone d)', () => {
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

  it('cancels specific elements with XE (single, multiple, range)', () => {
    // Setup working PNR with names, 2 segments, phone, ticketing, RF
    let res = executeCommand(state, 'NM1SHARMA/RAHUL MR', store);
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL1', store);
    res = executeCommand(res.newState, 'SSAI102Y18MARDELBOM1', store);
    res = executeCommand(res.newState, 'APLOS 08012345678', store);
    res = executeCommand(res.newState, 'TKOK', store);
    res = executeCommand(res.newState, 'RF RAHUL', store);

    expect(res.newState.workingPnr?.segments.length).toBe(2);

    // Cancel segment element with XE2
    res = executeCommand(res.newState, 'XE2', store);
    expect(res.output).toContain('CANCELLED');
    expect(res.newState.workingPnr?.segments.length).toBe(1);

    // Cancel with comma XE2,3
    res = executeCommand(res.newState, 'XE2,3', store);
    expect(res.output).toContain('CANCELLED');
  });

  it('cancels entire itinerary with XI', () => {
    let res = executeCommand(state, 'SSAI101Y15MARBOMDEL1', store);
    res = executeCommand(res.newState, 'SSAI102Y18MARDELBOM1', store);
    expect(res.newState.workingPnr?.segments.length).toBe(2);

    res = executeCommand(res.newState, 'XI', store);
    expect(res.output).toContain('ITINERARY CANCELLED');
    expect(res.newState.workingPnr?.segments.length).toBe(0);
  });

  it('rebooks segment class or date with SB', () => {
    let res = executeCommand(state, 'SSAI101Y15MARBOMDEL1', store);
    expect(res.newState.workingPnr?.segments[0].classCode).toBe('Y');

    // Rebook to J class (SBJ1)
    res = executeCommand(res.newState, 'SBJ1', store);
    expect(res.output).toContain('REBOOKED TO CLASS J');
    expect(res.newState.workingPnr?.segments[0].classCode).toBe('J');

    // Rebook date (SB20OCT1)
    res = executeCommand(res.newState, 'SB20OCT1', store);
    expect(res.output).toContain('DATE REBOOKED TO 20OCT');
    expect(res.newState.workingPnr?.segments[0].travelDate).toBe('2026-10-20');
  });

  it('prices PNR with FXP and stores TST, while FXX provides quote without storing', () => {
    let res = executeCommand(state, 'NM1SHARMA/RAHUL MR', store);
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL1', store);

    // FXX: quote only
    res = executeCommand(res.newState, 'FXX', store);
    expect(res.output).toContain('TST NOT STORED');
    expect(res.output).toContain('FARE');
    expect(res.newState.tsts?.length || 0).toBe(0);

    // FXP: creates stored TST
    res = executeCommand(res.newState, 'FXP', store);
    expect(res.output).toContain('TST 01 STORED');
    expect(res.output).toContain('NGN');
    expect(res.newState.tsts?.length).toBe(1);
    expect(res.newState.tsts![0].tst_number).toBe(1);
    expect(res.newState.tsts![0].total_fare_ngn).toBeGreaterThan(0);
  });

  it('handles best pricer commands FXA and FXR', () => {
    let res = executeCommand(state, 'NM1SHARMA/RAHUL MR', store);
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL1', store);

    // FXA: display cheaper fare options
    res = executeCommand(res.newState, 'FXA', store);
    expect(res.output).toContain('BEST PRICER');
    expect(res.output).toContain('SAVINGS');

    // FXR: rebook lowest class
    res = executeCommand(res.newState, 'FXR', store);
    expect(res.output).toContain('REBOOKED TO LOWEST CLASS');
    expect(res.newState.workingPnr?.segments[0].classCode).toBe('K');
  });

  it('displays published fares with FQD and rules with FQN', () => {
    let res = executeCommand(state, 'FQDBOMDEL', store);
    expect(res.output).toContain('FQD BOMDEL');
    expect(res.output).toContain('YOW');

    res = executeCommand(state, 'FQN1', store);
    expect(res.output).toContain('FQN1 FARE RULES');
    expect(res.output).toContain('PENALTIES');
  });

  it('sets ticketing arrangements (FM, FP, FV) and issues 13-digit e-tickets with TTP', () => {
    let res = executeCommand(state, 'NM1SHARMA/RAHUL MR', store);
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL1', store);
    res = executeCommand(res.newState, 'APLOS 08012345678', store);
    res = executeCommand(res.newState, 'TKOK', store);
    res = executeCommand(res.newState, 'RF RAHUL', store);

    // Form of payment
    res = executeCommand(res.newState, 'FPCASH', store);
    expect(res.output).toBe('FP CASH');

    // Commission
    res = executeCommand(res.newState, 'FM5', store);
    expect(res.output).toBe('FM 5%');

    // Validating carrier
    res = executeCommand(res.newState, 'FV AI', store);
    expect(res.output).toBe('FV AI');

    // Price with FXP to store TST
    res = executeCommand(res.newState, 'FXP', store);
    expect(res.newState.tsts?.length).toBe(1);

    // Issue tickets with TTP
    res = executeCommand(res.newState, 'TTP', store);
    expect(res.output).toContain('OK ETICKETS ISSUED');
    // Air India prefix is 098-
    expect(res.output).toMatch(/098-\d{10}/);
    expect(res.newState.eTickets?.length).toBe(1);

    // Display e-ticket with TWD
    res = executeCommand(res.newState, 'TWD', store);
    expect(res.output).toContain('ELECTRONIC TICKET RECORD');
    expect(res.output).toContain('OPEN FOR USE');
  });

  it('issues e-tickets with authentic numeric prefixes from AIRLINE_TICKET_PREFIXES (AW: 394, 9J: 086)', () => {
    let res = executeCommand(state, 'NM1SMITH/JOHN MR', store);
    res = executeCommand(res.newState, 'SSAW201Y15MARLOSABV1', store);
    res = executeCommand(res.newState, 'APLOS 08012345678', store);
    res = executeCommand(res.newState, 'TKOK', store);
    res = executeCommand(res.newState, 'RF JOHN', store);
    res = executeCommand(res.newState, 'FXP', store);
    res = executeCommand(res.newState, 'TTP', store);
    expect(res.output).toMatch(/394-\d{10}/);
  });
});
