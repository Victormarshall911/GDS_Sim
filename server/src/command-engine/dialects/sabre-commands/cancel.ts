import type { SessionState, CommandResult, DataStore } from '../../types';

/**
 * Handle I  –  Ignore (wipe working PNR without saving)
 */
export function handleIgnore(state: SessionState): CommandResult {
  return {
    output: 'IGNORED',
    newState: {
      ...state,
      workingPnr: null,
      currentPnr: null,
    },
  };
}

/**
 * Handle XI  –  Cancel entire itinerary against working or retrieved PNR
 */
export function handleCancelItinerary(
  state: SessionState,
  store: DataStore
): CommandResult {
  // 1. Check working PNR
  if (state.workingPnr && state.workingPnr.segments.length > 0) {
    return {
      output: 'ITINERARY CANCELLED',
      newState: {
        ...state,
        workingPnr: {
          ...state.workingPnr,
          segments: [],
        },
      },
    };
  }

  // 2. Check retrieved PNR
  if (state.currentPnr) {
    const success = store.cancelPnr(state.currentPnr);
    if (success) {
      return {
        output: `ITINERARY CANCELLED - PNR ${state.currentPnr} STATUS XX`,
        newState: state,
      };
    }
  }

  return {
    output: 'NO ITINERARY TO CANCEL',
    newState: state,
  };
}

/**
 * Handle X<n>  –  Cancel specific segment against working or retrieved PNR
 */
export function handleCancelSegment(
  segmentNumber: number,
  state: SessionState,
  store: DataStore
): CommandResult {
  // 1. Check working PNR
  if (state.workingPnr && state.workingPnr.segments.length > 0) {
    if (segmentNumber < 1 || segmentNumber > state.workingPnr.segments.length) {
      return {
        output: `INVALID SEGMENT NUMBER - SELECT 1 TO ${state.workingPnr.segments.length}`,
        newState: state,
      };
    }

    const updatedSegments = state.workingPnr.segments.filter(
      (_, idx) => idx !== segmentNumber - 1
    );

    return {
      output: `SEGMENT ${segmentNumber} CANCELLED`,
      newState: {
        ...state,
        workingPnr: {
          ...state.workingPnr,
          segments: updatedSegments,
        },
      },
    };
  }

  // 2. Check retrieved PNR
  if (state.currentPnr) {
    const success = store.cancelSegment(state.currentPnr, segmentNumber);
    if (success) {
      return {
        output: `SEGMENT ${segmentNumber} CANCELLED IN PNR ${state.currentPnr}`,
        newState: state,
      };
    }
  }

  return {
    output: 'NO SEGMENT TO CANCEL',
    newState: state,
  };
}
