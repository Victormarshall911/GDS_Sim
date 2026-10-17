import type { SessionState, CommandResult, DataStore } from '../../types';
import { formatPnrDisplay, formatDateSabre, formatTimeDisplay } from '../../format';

/**
 * Handle *<LOCATOR>  –  Retrieve PNR by record locator
 */
export function handleRetrievePnr(
  locator: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const pnr = store.getPnr(locator);
  if (!pnr) {
    return {
      output: `NO RECORD LOCATOR FOUND - ${locator}`,
      newState: state,
    };
  }

  const output = formatPnrDisplay({
    recordLocator: pnr.record_locator,
    passengers: pnr.passengers,
    segments: pnr.segments,
    phone: pnr.phone,
    ticketing: pnr.ticketing,
    receivedFrom: pnr.received_from,
    agentId: pnr.agent_id,
    status: pnr.status,
  });

  return {
    output,
    newState: {
      ...state,
      currentPnr: pnr.record_locator,
    },
  };
}

/**
 * Handle *A  –  Display all fields of working or retrieved PNR
 */
export function handleDisplayAll(
  state: SessionState,
  store: DataStore
): CommandResult {
  if (
    state.workingPnr &&
    (state.workingPnr.passengers.length > 0 ||
      state.workingPnr.segments.length > 0 ||
      state.workingPnr.phone ||
      state.workingPnr.ticketing ||
      state.workingPnr.receivedFrom)
  ) {
    const output = formatPnrDisplay({
      recordLocator: 'WORKING PNR',
      passengers: state.workingPnr.passengers,
      segments: state.workingPnr.segments,
      phone: state.workingPnr.phone,
      ticketing: state.workingPnr.ticketing,
      receivedFrom: state.workingPnr.receivedFrom,
      agentId: state.agentId,
    });
    return { output, newState: state };
  }

  if (state.currentPnr) {
    return handleRetrievePnr(state.currentPnr, state, store);
  }

  return {
    output: 'NO PNR IN CONTEXT - ENTER *<RECORD LOCATOR> OR CREATE WORKING PNR',
    newState: state,
  };
}

/**
 * Handle *I  –  Display itinerary only
 */
export function handleDisplayItinerary(
  state: SessionState,
  store: DataStore
): CommandResult {
  if (state.workingPnr && state.workingPnr.segments.length > 0) {
    const lines = state.workingPnr.segments.map((s, idx) => {
      const segNum = (idx + 1).toString().padStart(2, ' ');
      const dateObj = new Date(`${s.travelDate}T00:00:00`);
      const sabreDate = formatDateSabre(dateObj);
      const dep = formatTimeDisplay(s.departureTime);
      const arr = formatTimeDisplay(s.arrivalTime);
      return `${segNum}  ${s.airlineCode} ${s.flightNumber.toString().padStart(4, ' ')}${s.classCode} ${sabreDate} ${s.origin}${s.destination} ${s.status}${s.numSeats}  ${dep} ${arr} /E`;
    });
    return {
      output: lines.join('\n'),
      newState: state,
    };
  }

  if (state.currentPnr) {
    const pnr = store.getPnr(state.currentPnr);
    if (pnr && pnr.segments.length > 0) {
      const lines = pnr.segments.map((s) => {
        const segNum = s.segment_number.toString().padStart(2, ' ');
        const dateObj = new Date(`${s.travel_date}T00:00:00`);
        const sabreDate = formatDateSabre(dateObj);
        const dep = formatTimeDisplay(s.departure_time);
        const arr = formatTimeDisplay(s.arrival_time);
        return `${segNum}  ${s.airline_code} ${s.flight_number.toString().padStart(4, ' ')}${s.class_code} ${sabreDate} ${s.origin}${s.destination} ${s.status}${s.num_seats}  ${dep} ${arr} /E`;
      });
      return {
        output: lines.join('\n'),
        newState: state,
      };
    }
  }

  return {
    output: 'NO ITINERARY IN CONTEXT',
    newState: state,
  };
}

/**
 * Handle *N  –  Display names only
 */
export function handleDisplayNames(
  state: SessionState,
  store: DataStore
): CommandResult {
  if (state.workingPnr && state.workingPnr.passengers.length > 0) {
    const lines = state.workingPnr.passengers.map((p, idx) => {
      let suffix = '';
      if (p.paxType === 'CHD') suffix = p.dob ? `(CHD/${p.dob})` : '(CHD)';
      if (p.paxType === 'INF') suffix = p.dob ? `(INF/${p.dob})` : '(INF)';
      return `1.${idx + 1} ${p.lastName}/${p.firstName}${p.title ? ' ' + p.title : ''}${suffix}`;
    });
    return {
      output: lines.join('\n'),
      newState: state,
    };
  }

  if (state.currentPnr) {
    const pnr = store.getPnr(state.currentPnr);
    if (pnr && pnr.passengers.length > 0) {
      const lines = pnr.passengers.map((p) => {
        let suffix = '';
        if (p.pax_type === 'CHD') suffix = p.dob ? `(CHD/${p.dob})` : '(CHD)';
        if (p.pax_type === 'INF') suffix = p.dob ? `(INF/${p.dob})` : '(INF)';
        return `1.${p.sequence} ${p.last_name}/${p.first_name}${p.title ? ' ' + p.title : ''}${suffix}`;
      });
      return {
        output: lines.join('\n'),
        newState: state,
      };
    }
  }

  return {
    output: 'NO NAMES IN CONTEXT',
    newState: state,
  };
}
