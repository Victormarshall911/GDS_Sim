import { describe, it, expect } from 'vitest';
import { handleReceivedFrom } from '../src/command-engine/dialects/sabre-commands/received-from';
import { createInitialSessionState } from '../src/command-engine/engine';

describe('Received From Command', () => {
  it('sets received from name', () => {
    const state = createInitialSessionState();
    const result = handleReceivedFrom('SMITH', state);

    expect(result.output).toBe('6SMITH');
    expect(result.newState.workingPnr?.receivedFrom).toBe('SMITH');
  });

  it('rejects empty received from', () => {
    const state = createInitialSessionState();
    const result = handleReceivedFrom('  ', state);

    expect(result.output).toContain('INVALID RECEIVED FROM');
  });
});
