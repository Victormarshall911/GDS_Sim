import type { SessionState, CommandResult } from '../../types';
import { formatDateSabre } from '../../format';

export function handleTicketing(dateInput: string, state: SessionState): CommandResult {
  let ticketingValue = dateInput.trim();
  if (!ticketingValue) {
    // Default to today + 7 days
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    ticketingValue = `TAW/${formatDateSabre(defaultDate)}`;
  } else {
    ticketingValue = `TAW/${ticketingValue}`;
  }

  const currentWorkingPnr = state.workingPnr ?? {
    passengers: [],
    segments: [],
    phone: null,
    ticketing: null,
    receivedFrom: null,
  };

  return {
    output: `7${ticketingValue}`,
    newState: {
      ...state,
      workingPnr: {
        ...currentWorkingPnr,
        ticketing: ticketingValue,
      },
    },
  };
}
