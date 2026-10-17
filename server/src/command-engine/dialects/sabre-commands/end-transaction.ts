import type { SessionState, CommandResult, DataStore } from '../../types';
import { generateRecordLocator } from '../../record-locator';
import { formatPnrDisplay } from '../../format';

export function handleEndTransaction(
  redisplay: boolean,
  state: SessionState,
  store: DataStore
): CommandResult {
  const pnr = state.workingPnr;

  // Strict validation order per Sabre specification & requirements:
  // 1. NEED NAME
  if (!pnr || pnr.passengers.length === 0) {
    return {
      output: 'NEED NAME',
      newState: state,
    };
  }

  // 2. NEED ITINERARY
  if (pnr.segments.length === 0) {
    return {
      output: 'NEED ITINERARY',
      newState: state,
    };
  }

  // 3. NEED PHONE
  if (!pnr.phone || pnr.phone.trim().length === 0) {
    return {
      output: 'NEED PHONE',
      newState: state,
    };
  }

  // 4. NEED TICKETING
  if (!pnr.ticketing || pnr.ticketing.trim().length === 0) {
    return {
      output: 'NEED TICKETING',
      newState: state,
    };
  }

  // 5. NEED RECEIVED FROM
  if (!pnr.receivedFrom || pnr.receivedFrom.trim().length === 0) {
    return {
      output: 'NEED RECEIVED FROM',
      newState: state,
    };
  }

  // Generate unique 6-character alphabetic record locator
  const recordLocator = generateRecordLocator(store);

  // Transition segment statuses from SS (Sold) to HK (Confirmed)
  const confirmedSegments = pnr.segments.map((seg) => ({
    ...seg,
    status: 'HK',
  }));

  // Save to database
  store.savePnr({
    recordLocator,
    agentId: state.agentId,
    receivedFrom: pnr.receivedFrom,
    phone: pnr.phone,
    ticketing: pnr.ticketing,
    status: 'ACTIVE',
    passengers: pnr.passengers,
    segments: confirmedSegments,
  });

  const nextState: SessionState = {
    ...state,
    workingPnr: null,
    currentPnr: recordLocator,
  };

  if (redisplay) {
    // ER: End, save, and redisplay PNR
    const displayOutput = formatPnrDisplay({
      recordLocator,
      passengers: pnr.passengers,
      segments: confirmedSegments,
      phone: pnr.phone,
      ticketing: pnr.ticketing,
      receivedFrom: pnr.receivedFrom,
      agentId: state.agentId,
      status: 'ACTIVE',
    });

    return {
      output: `${recordLocator}\n\n${displayOutput}`,
      newState: nextState,
    };
  }

  // E: End and save
  return {
    output: recordLocator,
    newState: nextState,
  };
}
