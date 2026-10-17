import type { SessionState, CommandResult } from '../../types';

export function handlePhone(phoneInput: string, state: SessionState): CommandResult {
  const trimmed = phoneInput.trim();
  if (!trimmed) {
    return {
      output: 'INVALID PHONE FORMAT - USE 9<PHONE-NUMBER>',
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
    output: `9${trimmed}`,
    newState: {
      ...state,
      workingPnr: {
        ...currentWorkingPnr,
        phone: trimmed,
      },
    },
  };
}
