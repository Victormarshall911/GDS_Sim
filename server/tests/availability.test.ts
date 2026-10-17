import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleAvailability } from '../src/command-engine/dialects/sabre-commands/availability';
import { createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore } from '../src/command-engine/types';

describe('Availability Command', () => {
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

  it('handles 1LOSLHR15NOV and returns formatted availability screen', () => {
    const state = createInitialSessionState();
    const result = handleAvailability('LOS', 'LHR', '15NOV', state, store);

    expect(result.output).toContain('LOSLHR');
    expect(result.output).toContain('W3');
    expect(result.output).toContain('BA');
    expect(result.newState.lastAvailability).not.toBeNull();
    expect(result.newState.lastAvailability?.lines.length).toBeGreaterThan(0);
    expect(result.newState.lastAvailability?.lines[0].origin).toBe('LOS');
    expect(result.newState.lastAvailability?.lines[0].destination).toBe('LHR');
  });

  it('handles invalid date format gracefully', () => {
    const state = createInitialSessionState();
    const result = handleAvailability('LOS', 'LHR', '99XYZ', state, store);

    expect(result.output).toContain('INVALID DATE FORMAT');
    expect(result.newState.lastAvailability).toBeNull();
  });

  it('handles routes with no flights', () => {
    const state = createInitialSessionState();
    const result = handleAvailability('LOS', 'YYZ', '15NOV', state, store);

    expect(result.output).toContain('NO FLIGHTS FOUND');
    expect(result.newState.lastAvailability).toBeNull();
  });
});
