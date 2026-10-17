import { describe, it, expect } from 'vitest';
import { handlePhone } from '../src/command-engine/dialects/sabre-commands/phone';
import { createInitialSessionState } from '../src/command-engine/engine';

describe('Phone Command', () => {
  it('adds agency phone to working PNR', () => {
    const state = createInitialSessionState();
    const result = handlePhone('234-555-1234-A', state);

    expect(result.output).toBe('9234-555-1234-A');
    expect(result.newState.workingPnr?.phone).toBe('234-555-1234-A');
  });

  it('rejects empty phone entry', () => {
    const state = createInitialSessionState();
    const result = handlePhone('   ', state);

    expect(result.output).toContain('INVALID PHONE FORMAT');
  });
});
