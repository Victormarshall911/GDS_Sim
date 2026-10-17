import { describe, it, expect } from 'vitest';
import { handleName } from '../src/command-engine/dialects/sabre-commands/name';
import { createInitialSessionState } from '../src/command-engine/engine';

describe('Name Command', () => {
  it('adds standard adult passenger', () => {
    const state = createInitialSessionState();
    const result = handleName('SMITH/JOHN MR', state);

    expect(result.output).toBe('1.1 SMITH/JOHN MR');
    expect(result.newState.workingPnr?.passengers.length).toBe(1);
    expect(result.newState.workingPnr?.passengers[0]).toEqual({
      lastName: 'SMITH',
      firstName: 'JOHN',
      title: 'MR',
      paxType: 'ADT',
      dob: undefined,
    });
  });

  it('adds child passenger with DOB', () => {
    const state = createInitialSessionState();
    const result = handleName('DOE/TOM MSTR(CHD/15JAN20)', state);

    expect(result.output).toContain('(CHD/15JAN20)');
    expect(result.newState.workingPnr?.passengers[0].paxType).toBe('CHD');
    expect(result.newState.workingPnr?.passengers[0].dob).toBe('15JAN20');
  });

  it('adds infant passenger', () => {
    const state = createInitialSessionState();
    const result = handleName('DOE/BABY(INF)', state);

    expect(result.output).toContain('(INF)');
    expect(result.newState.workingPnr?.passengers[0].paxType).toBe('INF');
  });

  it('rejects names without slash separator', () => {
    const state = createInitialSessionState();
    const result = handleName('JOHNSMITH', state);

    expect(result.output).toContain('INVALID NAME FORMAT');
    expect(result.newState.workingPnr).toBeNull();
  });
});
