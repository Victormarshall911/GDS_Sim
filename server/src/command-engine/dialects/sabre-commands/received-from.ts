import type { SessionState, CommandResult } from '../../types';

export function handleReceivedFrom(rfInput: string, state: SessionState): CommandResult {
  const trimmed = rfInput.trim();
  if (!trimmed) {
    return {
      output: 'INVALID RECEIVED FROM - USE 6<NAME>',
      newState: state,
    };
  }

  const currentWorkingPnr = state.workingPnr ?? {
    passengers: [],
    segments: [],
    phone: null,
    ticketing: null,
    receivedFrom: null,
  };

  return {
    output: `6${trimmed}`,
    newState: {
      ...state,
      workingPnr: {
        ...currentWorkingPnr,
        receivedFrom: trimmed,
      },
    },
  };
}
