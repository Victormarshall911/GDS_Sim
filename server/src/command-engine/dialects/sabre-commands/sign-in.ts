import type { SessionState, CommandResult, DataStore } from '../../types';
import { formatDateSabre, formatTimeSabre } from '../../format';

/**
 * Handle SI*<agent-id>  –  Sign in to the Sabre terminal.
 */
export function handleSignIn(
  match: RegExpMatchArray,
  state: SessionState,
  _store: DataStore,
): CommandResult {
  const agentId = match[1];

  if (!agentId || agentId.trim().length === 0) {
    return {
      output: 'INVALID ENTRY - NEED AGENT ID',
      newState: state,
    };
  }

  const now = new Date();
  const time = formatTimeSabre(now);
  const date = formatDateSabre(now);

  const output = [
    '',
    `SIGN IN AT ${time}/${date}  AGENT ${agentId}`,
    'AREA A HOME PCC - TRAINING',
    '',
    'SABRE TRAINING SIMULATOR - READY',
    '',
  ].join('\n');

  return {
    output,
    newState: {
      ...state,
      agentId,
      signedIn: true,
    },
  };
}

/**
 * Handle SO  –  Sign out of the Sabre terminal.
 * Clears agent identity, working PNR, availability, and retrieved PNR.
 */
export function handleSignOut(state: SessionState): CommandResult {
  return {
    output: 'SIGN OUT',
    newState: {
      ...state,
      agentId: null,
      signedIn: false,
      workingPnr: null,
      lastAvailability: null,
      currentPnr: null,
    },
  };
}
