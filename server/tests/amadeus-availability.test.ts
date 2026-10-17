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
});
