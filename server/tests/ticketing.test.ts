import { describe, it, expect } from 'vitest';
import { handleTicketing } from '../src/command-engine/dialects/sabre-commands/ticketing';
import { createInitialSessionState } from '../src/command-engine/engine';

describe('Ticketing Command', () => {
  it('sets ticketing date with specific date', () => {
    const state = createInitialSessionState();
    const result = handleTicketing('25OCT', state);

    expect(result.output).toBe('7TAW/25OCT');
    expect(result.newState.workingPnr?.ticketing).toBe('TAW/25OCT');
  });

  it('defaults ticketing date if omitted', () => {
    const state = createInitialSessionState();
    const result = handleTicketing('', state);

    expect(result.output).toMatch(/^7TAW\/\d{2}[A-Z]{3}$/);
    expect(result.newState.workingPnr?.ticketing).toMatch(/^TAW\/\d{2}[A-Z]{3}$/);
  });
});
