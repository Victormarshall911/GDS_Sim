import type { SessionState, CommandResult, DataStore } from './types';
import type { Dialect } from './dialects/interface';
import { SabreDialect } from './dialects/sabre';
import { AmadeusDialect } from './dialects/amadeus';
import type { DialectName } from '@sabre-sim/shared';

const dialects: Record<DialectName, Dialect> = {
  sabre: new SabreDialect(),
  amadeus: new AmadeusDialect(),
};

/**
 * Creates a clean initial session state.
 */
export function createInitialSessionState(dialect: DialectName = 'sabre'): SessionState {
  return {
    agentId: null,
    signedIn: false,
    dialect,
    workingPnr: null,
    lastAvailability: null,
    currentPnr: null,
    activeScenario: null,
  };
}

/**
 * Pure command execution function:
 * Takes (sessionState, inputString, store) and returns { output, newState }.
 */
export function executeCommand(
  state: SessionState,
  input: string,
  store: DataStore,
  sessionId?: string
): CommandResult {
  const currentDialectName = state.dialect || 'sabre';
  const dialect = dialects[currentDialectName] ?? dialects.sabre;

  const result = dialect.execute(input, state, store);

  if (sessionId && store.logCommand) {
    store.logCommand(sessionId, input, result.output);
  }

  return result;
}
