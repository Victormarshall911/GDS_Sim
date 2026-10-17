import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SabreDialect } from '../src/command-engine/dialects/sabre';
import { createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore, SessionState } from '../src/command-engine/types';

describe('Sabre Command Stacking (¥ delimiter)', () => {
  let dialect: SabreDialect;
  let store: DataStore;
  let cleanup: () => void;
  let state: SessionState;

  beforeEach(() => {
    dialect = new SabreDialect();
    const res = createTestStore();
    store = res.store;
    cleanup = res.cleanup;
    state = createInitialSessionState('sabre', true);
  });

  afterEach(() => {
    cleanup();
  });

  it('executes chained entries in sequence separated by ¥', () => {
    const input = '-SMITH/JOHN MR¥9234-802-123-4567-A¥6JOHN';
    const result = dialect.execute(input, state, store);

    expect(result.output).toContain('1.1 SMITH/JOHN MR');
    expect(result.output).toContain('9234-802-123-4567-A');
    expect(result.output).toContain('6JOHN');
    expect(result.newState.workingPnr?.passengers).toHaveLength(1);
    expect(result.newState.workingPnr?.phone).toBe('234-802-123-4567-A');
    expect(result.newState.workingPnr?.receivedFrom).toBe('JOHN');
  });

  it('stops execution chain on error (e.g. check format)', () => {
    const input = 'INVALIDCMD¥-SMITH/JOHN MR';
    const result = dialect.execute(input, state, store);

    expect(result.output).toBe('CHECK FORMAT');
    expect(result.newState.workingPnr).toBeNull();
  });
});
