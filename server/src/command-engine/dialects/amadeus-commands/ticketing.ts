import type { SessionState, CommandResult, DataStore, ETicketRecord } from '../../types';
import { formatDateSabre } from '../../format';
import { AMADEUS_CONFIG } from '../../command-config';
import { formatAmadeusPnr } from './pnr';

const AIRLINE_PREFIXES: Record<string, string> = {
  AI: '098',
  P4: '240',
  W3: '725',
  BA: '125',
  AW: '215',
  EK: '176',
  QR: '157',
};

/**
 * Generate 13-digit e-ticket number: e.g. 098-1234567890
 */
function generateTicketNumber(airlineCode: string): string {
  const prefix = AIRLINE_PREFIXES[airlineCode.toUpperCase()] || '999';
  const digits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return `${prefix}-${digits}`;
}

/**
 * Handle FM<commission>
 */
export function handleAmadeusCommission(
  rateStr: string,
  state: SessionState
): CommandResult {
  const clean = rateStr.trim();
  return {
    output: `FM ${clean}%`,
    newState: {
      ...state,
      commission: clean,
    },
  };
}

/**
 * Handle FP<form of payment>
 */
export function handleAmadeusFormOfPayment(
  fopStr: string,
  state: SessionState
): CommandResult {
  const clean = fopStr.trim().toUpperCase();
  return {
    output: `FP ${clean}`,
    newState: {
      ...state,
      formOfPayment: clean,
    },
  };
}

/**
 * Handle FV <airline>
 */
export function handleAmadeusValidatingCarrier(
  carrier: string,
  state: SessionState
): CommandResult {
  const clean = carrier.trim().toUpperCase();
  return {
    output: `FV ${clean}`,
    newState: {
      ...state,
      validatingCarrier: clean,
    },
  };
}

/**
 * Handle TTP (Issue all TSTs) and TTP/RT
 */
export function handleAmadeusIssueTickets(
  isRedisplay: boolean,
  state: SessionState,
  store: DataStore
): CommandResult {
  const working = state.workingPnr;
  const tsts = state.tsts || (state.currentPnr && store.getTSTs ? store.getTSTs(state.currentPnr) : []);

  if (!tsts || tsts.length === 0) {
    return {
      output: 'NO TST TO TICKET - RUN FXP FIRST TO CREATE STORED FARE',
      newState: state,
    };
  }

  const pnrLocator = state.currentPnr || 'WORK';
  const valCarrier =
    state.validatingCarrier ||
    tsts[0].validating_carrier ||
    working?.segments[0]?.airlineCode ||
    'AI';

  const todayIso = new Date().toISOString().slice(0, 10);
  const newETickets: ETicketRecord[] = [];

  for (const t of tsts) {
    const ticketNo = generateTicketNumber(valCarrier);
    const rec: ETicketRecord = {
      pnr_locator: pnrLocator,
      ticket_number: ticketNo,
      pax_name: working?.passengers[0]
        ? `${working.passengers[0].lastName}/${working.passengers[0].firstName}`
        : 'PASSENGER 1',
      total_fare_ngn: t.total_fare_ngn,
      validating_carrier: valCarrier,
      issue_date: todayIso,
      status: 'OPEN',
    };

    if (store.saveETicket) {
      store.saveETicket(rec);
    }
    newETickets.push(rec);
  }

  const allETickets = [...(state.eTickets || []), ...newETickets];

  if (isRedisplay) {
    // TTP/RT: Issue and redisplay PNR
    const pnrData = working
      ? {
          record_locator: state.currentPnr || 'WORKING PNR',
          passengers: working.passengers,
          segments: working.segments,
          phone: working.phone,
          ticketing: working.ticketing,
          receivedFrom: working.receivedFrom,
          elements: state.pnrElements,
        }
      : state.currentPnr
      ? store.getPnr(state.currentPnr)
      : null;

    if (pnrData) {
      const display = formatAmadeusPnr(
        {
          record_locator: pnrData.record_locator || pnrData.recordLocator,
          passengers: pnrData.passengers,
          segments: pnrData.segments,
          phone: pnrData.phone,
          ticketing: pnrData.ticketing,
          receivedFrom: pnrData.received_from || pnrData.receivedFrom,
          elements: state.pnrElements,
        },
        { ...state, eTickets: allETickets }
      );

      return {
        output: `OK ETICKET ISSUED:\n${newETickets.map((t) => t.ticket_number).join('\n')}\n\n${display}`,
        newState: {
          ...state,
          eTickets: allETickets,
        },
      };
    }
  }

  return {
    output: `OK ETICKETS ISSUED:\n${newETickets.map((t) => `  * TICKET: ${t.ticket_number} (${t.validating_carrier}) - STATUS: OPEN`).join('\n')}`,
    newState: {
      ...state,
      eTickets: allETickets,
    },
  };
}

/**
 * Handle TWD (Display E-Ticket)
 */
export function handleAmadeusDisplayETicket(
  arg: string | undefined,
  state: SessionState,
  store: DataStore
): CommandResult {
  const tickets =
    state.eTickets && state.eTickets.length > 0
      ? state.eTickets
      : state.currentPnr && store.getETickets
      ? store.getETickets(state.currentPnr)
      : [];

  if (!tickets || tickets.length === 0) {
    return {
      output: 'NO ISSUED E-TICKETS IN CURRENT CONTEXT - USE TTP FIRST',
      newState: state,
    };
  }

  const ticket = tickets[0];
  const officeId = AMADEUS_CONFIG.defaultAgent.officeId;
  const fop = state.formOfPayment || 'CASH';

  const lines = [
    '------------------------------------------------------------',
    `ELECTRONIC TICKET RECORD: ${ticket.ticket_number}`,
    `ISSUED: ${ticket.issue_date}   OFFICE: ${officeId}   AGENT: ${state.agentId || '1234AA'}`,
    `PASSENGER: ${ticket.pax_name}`,
    `VALIDATING CARRIER: ${ticket.validating_carrier}`,
    `PAYMENT FORM:       ${fop}`,
    `FARE TOTAL:         NGN ${ticket.total_fare_ngn}`,
    'COUPON 1: SEGM 1    STATUS: OPEN FOR USE',
    '------------------------------------------------------------',
  ];

  return {
    output: lines.join('\n'),
    newState: state,
  };
}
