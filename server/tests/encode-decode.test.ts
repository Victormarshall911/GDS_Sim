import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleEncodeCity, handleDecodeAirport, handleEncodeAirline } from '../src/command-engine/dialects/sabre-commands/encode-decode';
import { createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore } from '../src/command-engine/types';

describe('Encode / Decode Commands (DAN, DAC, W/*)', () => {
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

  it('DAN encodes city to airport code', () => {
    const state = createInitialSessionState();
    const result = handleEncodeCity('LAGOS', state, store);

    expect(result.output).toContain('DAN LAGOS');
    expect(result.output).toContain('LOS');
    expect(result.output).toContain('Lagos');
  });

  it('DAC decodes airport code to city and details', () => {
    const state = createInitialSessionState();
    const result = handleDecodeAirport('LOS', state, store);

    expect(result.output).toContain('DAC LOS');
    expect(result.output).toContain('Murtala Muhammed International');
    expect(result.output).toContain('NG');
  });


  it('W/* encodes/decodes airline by name or code', () => {
    const state = createInitialSessionState();
    const resName = handleEncodeAirline('BRITISH', state, store);
    expect(resName.output).toContain('BA');
    expect(resName.output).toContain('British Airways');

    const resCode = handleEncodeAirline('W3', state, store);
    expect(resCode.output).toContain('W3');
    expect(resCode.output).toContain('Arik Air');
  });
});
