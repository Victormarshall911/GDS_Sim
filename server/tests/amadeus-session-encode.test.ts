import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCommand, createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore, SessionState } from '../src/command-engine/types';

describe('Amadeus Session & Encode/Decode (Milestone a)', () => {
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

  it('switches between dialects using SET DIALECT commands', () => {
    // Switch to Sabre
    let res = executeCommand(state, 'SET DIALECT SABRE', store);
    expect(res.output).toContain('DIALECT SWITCHED TO SABRE');
    expect(res.newState.dialect).toBe('sabre');

    // Switch to Amadeus
    res = executeCommand(res.newState, 'SET DIALECT AMADEUS', store);
    expect(res.output).toContain('DIALECT SWITCHED TO AMADEUS');
    expect(res.newState.dialect).toBe('amadeus');

    // Already Amadeus
    res = executeCommand(res.newState, 'SET AMADEUS', store);
    expect(res.output).toContain('DIALECT IS ALREADY AMADEUS');
  });

  it('handles JI, JO, and JD session commands', () => {
    // Check initial JD
    let res = executeCommand(state, 'JD', store);
    expect(res.output).toContain('AMADEUS GDS SESSION STATUS:');
    expect(res.output).toContain('ACTIVE / SIGNED IN');

    // Sign out (JO)
    res = executeCommand(state, 'JO', store);
    expect(res.output).toContain('SIGNED OUT OF AMADEUS GDS');
    expect(res.newState.signedIn).toBe(false);

    // Sign in (JI 9999BB/SU)
    res = executeCommand(res.newState, 'JI 9999BB/SU', store);
    expect(res.output).toContain('AGENT 9999BB/SU SIGNED IN ON AMADEUS GDS');
    expect(res.newState.signedIn).toBe(true);
    expect(res.newState.agentId).toBe('9999BB/SU');
  });

  it('handles HELP command with general guide and specific command help', () => {
    let res = executeCommand(state, 'HELP', store);
    expect(res.output).toContain('AMADEUS GDS COMMAND REFERENCE GUIDE');
    expect(res.output).toContain('1. SESSION:');

    res = executeCommand(state, 'HELP AN', store);
    expect(res.output).toContain('AMADEUS HELP:');
    expect(res.output).toContain('AN');
  });

  it('encodes and decodes cities (DAN) and airports (DAC)', () => {
    // DAN MUMBAI -> BOM
    let res = executeCommand(state, 'DAN MUMBAI', store);
    expect(res.output).toContain('BOM');
    expect(res.output).toContain('MUMBAI');

    // DAC JFK -> NEW YORK
    res = executeCommand(state, 'DAC JFK', store);
    expect(res.output).toContain('KENNEDY');
    expect(res.output).toContain('NEW YORK');
  });

  it('encodes and decodes airlines (DNA) by code and name', () => {
    // DNA EK -> EMIRATES
    let res = executeCommand(state, 'DNA EK', store);
    expect(res.output).toContain('EMIRATES');

    // DNA EMIRATES -> EK
    res = executeCommand(state, 'DNA EMIRATES', store);
    expect(res.output).toContain('EK');

    // DNA AW -> AFRICA WORLD AIRLINES
    res = executeCommand(state, 'DNA AW', store);
    expect(res.output).toContain('AFRICA WORLD AIRLINES');

    // DNA AFRICA WORLD -> AW
    res = executeCommand(state, 'DNA AFRICA WORLD', store);
    expect(res.output).toContain('AW');

    // DNA 9J -> DANA AIR
    res = executeCommand(state, 'DNA 9J', store);
    expect(res.output).toContain('DANA AIR');

    // DNA DANA -> 9J
    res = executeCommand(state, 'DNA DANA', store);
    expect(res.output).toContain('9J');
  });

  it('encodes and decodes countries (DC)', () => {
    let res = executeCommand(state, 'DC INDIA', store);
    expect(res.output).toContain('INDIA');
    expect(res.output).toContain('IN');

    res = executeCommand(state, 'DC NIGERIA', store);
    expect(res.output).toContain('NIGERIA');
    expect(res.output).toContain('NG');
  });

  it('encodes and decodes aircraft equipment (DNE)', () => {
    let res = executeCommand(state, 'DNE/320', store);
    expect(res.output).toContain('AIRBUS');

    res = executeCommand(state, 'DNE/BOEING', store);
    expect(res.output).toContain('B737');
  });

  it('encodes and decodes car companies (DNC) and hotel chains (DNH)', () => {
    let res = executeCommand(state, 'DNC HERTZ', store);
    expect(res.output).toContain('ZE');

    res = executeCommand(state, 'DNC ZE', store);
    expect(res.output).toContain('HERTZ');

    res = executeCommand(state, 'DNH HILTON', store);
    expect(res.output).toContain('HL');

    res = executeCommand(state, 'DNH HL', store);
    expect(res.output).toContain('HILTON');
  });
});
