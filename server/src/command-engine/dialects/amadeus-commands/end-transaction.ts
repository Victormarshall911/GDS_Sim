import type { SessionState, CommandResult, DataStore, SegmentEntry } from '../../types';
import { generateRecordLocator } from '../../record-locator';
import { AMADEUS_CONFIG } from '../../command-config';
import { formatAmadeusPnr } from './pnr';

/**
 * Validate working PNR against config-driven validationOrder
 */
function validateWorkingPnr(state: SessionState): string | null {
  const pnr = state.workingPnr;

  for (const rule of AMADEUS_CONFIG.validationOrder) {
    if (rule.field === 'names') {
      if (!pnr || pnr.passengers.length === 0) return rule.message;
    } else if (rule.field === 'itinerary') {
      if (!pnr || pnr.segments.length === 0) return rule.message;
    } else if (rule.field === 'contact') {
      const hasPhone = pnr?.phone && pnr.phone.trim().length > 0;
      const hasContactElement = state.pnrElements?.some((el) =>
        ['AP', 'APM', 'APE', 'SR CTCM', 'SR CTCE'].includes(el.element_type)
      );
      if (!hasPhone && !hasContactElement) return rule.message;
    } else if (rule.field === 'ticketing') {
      if (!pnr || !pnr.ticketing || pnr.ticketing.trim().length === 0) return rule.message;
    } else if (rule.field === 'receivedFrom') {
      if (!pnr || !pnr.receivedFrom || pnr.receivedFrom.trim().length === 0) return rule.message;
    }
  }

  return null;
}

/**
 * Handle ER (End and Redisplay) / ET (End and Exit)
 */
export function handleAmadeusEndTransaction(
  action: 'ER' | 'ET',
  state: SessionState,
  store: DataStore
): CommandResult {
  const pnr = state.workingPnr;

  // Validation
  const errorMsg = validateWorkingPnr(state);
  if (errorMsg) {
    return {
      output: errorMsg,
      newState: state,
    };
  }

  // Generate or reuse locator
  const recordLocator = state.currentPnr || generateRecordLocator(store);

  // Status confirmed: HK
  const confirmedSegments: SegmentEntry[] = (pnr?.segments || []).map((seg) => ({
    ...seg,
    status: seg.status?.startsWith('HK') ? seg.status : `HK${seg.numSeats}`,
  }));

  // Save to DB
  store.savePnr({
    recordLocator,
    agentId: state.agentId,
    receivedFrom: pnr!.receivedFrom!,
    phone: pnr!.phone || 'APM-CONTACT',
    ticketing: pnr!.ticketing!,
    status: 'ACTIVE',
    passengers: pnr!.passengers,
    segments: confirmedSegments,
  });

  // Save TSTs if any
  if (state.tsts && store.saveTST) {
    for (const tst of state.tsts) {
      store.saveTST({ ...tst, pnr_locator: recordLocator });
    }
  }

  // Save PNR elements if any
  if (state.pnrElements && store.savePnrElement) {
    for (const elem of state.pnrElements) {
      store.savePnrElement({ ...elem, pnr_locator: recordLocator });
    }
  }

  if (action === 'ET') {
    // End and exit
    return {
      output: `01.01  ${recordLocator}`,
      newState: {
        ...state,
        workingPnr: null,
        currentPnr: recordLocator,
      },
    };
  }

  // ER: End and redisplay
  const displayOutput = formatAmadeusPnr(
    {
      record_locator: recordLocator,
      passengers: pnr!.passengers,
      segments: confirmedSegments,
      phone: pnr!.phone,
      ticketing: pnr!.ticketing,
      receivedFrom: pnr!.receivedFrom,
      elements: state.pnrElements,
    },
    state
  );

  return {
    output: `${recordLocator}\n\n${displayOutput}`,
    newState: {
      ...state,
      currentPnr: recordLocator,
      workingPnr: {
        ...pnr!,
        segments: confirmedSegments,
      },
    },
  };
}

/**
 * Handle IG (Ignore Changes)
 */
export function handleAmadeusIgnore(state: SessionState): CommandResult {
  return {
    output: 'IGN',
    newState: {
      ...state,
      workingPnr: null,
      tsts: [],
      pnrElements: [],
    },
  };
}

/**
 * Handle IR (Ignore and Retrieve)
 */
export function handleAmadeusIgnoreRetrieve(
  state: SessionState,
  store: DataStore
): CommandResult {
  if (!state.currentPnr) {
    return {
      output: 'NO PNR IN CONTEXT TO RELOAD',
      newState: {
        ...state,
        workingPnr: null,
      },
    };
  }

  const pnr = store.getPnr(state.currentPnr);
  if (!pnr) {
    return {
      output: `PNR "${state.currentPnr}" NOT FOUND`,
      newState: { ...state, workingPnr: null },
    };
  }

  const elements = store.getPnrElements ? store.getPnrElements(state.currentPnr) : [];
  const tsts = store.getTSTs ? store.getTSTs(state.currentPnr) : [];
  const eTickets = store.getETickets ? store.getETickets(state.currentPnr) : [];

  const display = formatAmadeusPnr(
    {
      record_locator: pnr.record_locator,
      passengers: pnr.passengers,
      segments: pnr.segments,
      phone: pnr.phone,
      ticketing: pnr.ticketing,
      receivedFrom: pnr.received_from,
      elements,
    },
    { ...state, eTickets }
  );

  return {
    output: display,
    newState: {
      ...state,
      workingPnr: null,
      pnrElements: elements,
      tsts,
      eTickets,
    },
  };
}

/**
 * Handle RT (Retrieve PNR): RT or RTABC123
 */
export function handleAmadeusRetrieve(
  locatorArg: string | undefined,
  state: SessionState,
  store: DataStore
): CommandResult {
  const loc = locatorArg?.trim().toUpperCase();

  if (!loc) {
    // Bare RT: display working PNR or current PNR
    if (state.workingPnr) {
      const display = formatAmadeusPnr(
        {
          record_locator: state.currentPnr || 'WORKING PNR',
          passengers: state.workingPnr.passengers,
          segments: state.workingPnr.segments,
          phone: state.workingPnr.phone,
          ticketing: state.workingPnr.ticketing,
          receivedFrom: state.workingPnr.receivedFrom,
          elements: state.pnrElements,
        },
        state
      );
      return { output: display, newState: state };
    }

    if (state.currentPnr) {
      return handleAmadeusIgnoreRetrieve(state, store);
    }

    return {
      output: 'NO ACTIVE RECORD LOCATOR OR WORKING PNR IN CONTEXT',
      newState: state,
    };
  }

  // Retrieve by locator
  const pnr = store.getPnr(loc);
  if (!pnr) {
    return {
      output: `NO RECORD FOUND FOR "${loc}"`,
      newState: state,
    };
  }

  const elements = store.getPnrElements ? store.getPnrElements(loc) : [];
  const tsts = store.getTSTs ? store.getTSTs(loc) : [];
  const eTickets = store.getETickets ? store.getETickets(loc) : [];

  const display = formatAmadeusPnr(
    {
      record_locator: pnr.record_locator,
      passengers: pnr.passengers,
      segments: pnr.segments,
      phone: pnr.phone,
      ticketing: pnr.ticketing,
      receivedFrom: pnr.received_from,
      elements,
    },
    { ...state, eTickets }
  );

  return {
    output: display,
    newState: {
      ...state,
      currentPnr: loc,
      workingPnr: null,
      pnrElements: elements,
      tsts,
      eTickets,
    },
  };
}
