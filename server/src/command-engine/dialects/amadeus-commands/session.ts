import type { SessionState, CommandResult, DataStore } from '../../types';
import { AMADEUS_CONFIG, AMADEUS_COMMANDS } from '../../command-config';
import { handleAmadeusAvailability } from './availability';
import { formatDateSabre } from '../../format';

/**
 * Handle Amadeus Sign In (JI <ID>)
 */
export function handleAmadeusSignIn(
  match: RegExpMatchArray,
  state: SessionState,
  _store: DataStore
): CommandResult {
  const rawId = match[1]?.trim();
  const agentId = rawId || AMADEUS_CONFIG.defaultAgent.agentId;
  const officeId = AMADEUS_CONFIG.defaultAgent.officeId;

  return {
    output: `OK 001/SU - AGENT ${agentId} SIGNED IN ON AMADEUS GDS\nOFFICE: ${officeId}  DUTY: SU\nTERMINAL ASSIGNED: A1/001`,
    newState: {
      ...state,
      agentId,
      signedIn: true,
      dialect: 'amadeus',
    },
  };
}

/**
 * Handle Amadeus Sign Out (JO)
 */
export function handleAmadeusSignOut(state: SessionState): CommandResult {
  return {
    output: 'OK 001/SU - SIGNED OUT OF AMADEUS GDS',
    newState: {
      ...state,
      agentId: null,
      signedIn: false,
    },
  };
}

/**
 * Handle Amadeus Session Display (JD)
 */
export function handleAmadeusSessionDisplay(state: SessionState): CommandResult {
  const lines = [
    'AMADEUS GDS SESSION STATUS:',
    `AGENT ID:   ${state.agentId || 'NOT SIGNED IN'}`,
    `OFFICE ID:  ${AMADEUS_CONFIG.defaultAgent.officeId}`,
    `DUTY CODE:  ${AMADEUS_CONFIG.defaultAgent.dutyCode}`,
    `STATUS:     ${state.signedIn ? 'ACTIVE / SIGNED IN' : 'INACTIVE / SIGNED OUT'}`,
    `DIALECT:    AMADEUS`,
    `WORK AREA:  ${state.workingPnr ? 'ACTIVE WORKING PNR' : 'CLEAR'}`,
  ];
  return {
    output: lines.join('\n'),
    newState: state,
  };
}

/**
 * Handle System Help (HELP <cmd>)
 */
export function handleAmadeusHelp(
  query: string | undefined,
  state: SessionState
): CommandResult {
  const q = query?.trim().toUpperCase();

  if (q) {
    // Search specific command
    for (const [key, cmd] of Object.entries(AMADEUS_COMMANDS)) {
      if (key === q || key.startsWith(q) || cmd.example.toUpperCase().startsWith(q)) {
        return {
          output: `AMADEUS HELP: ${key}\nDESCRIPTION: ${cmd.description}\nSYNTAX / EXAMPLE: ${cmd.example}`,
          newState: state,
        };
      }
    }
  }

  // General help summary
  const lines = [
    'AMADEUS GDS COMMAND REFERENCE GUIDE',
    '═══════════════════════════════════════════════════════════',
    '1. SESSION:      JI <agentId> (Sign in), JO (Sign out), JD (Display session)',
    '2. ENCODE/DECODE: DAN (City), DAC (Airport), DNA (Airline), DC (Country)',
    '                 DNE (Equipment), DNC (Car company), DNH (Hotel chain)',
    '3. AVAILABILITY: AN<date><orig><dest>[/modifiers], AD (Departure), AE (Elapsed)',
    '                 AA (Arrival), SN (Schedule), TN (Timetable), AC (Change)',
    '                 Paging: MD (Down), MU (Up), MN (Next day), MY (Prev day)',
    '4. SELL:         SS<seats><class><line> (Short), SS<long sell>',
    '5. PNR:          NM1<surname>/<first> <title>, NM2 (two pax), CHD/INF',
    '                 AP (Phone), APM (Mobile), APE (Email), SR CTCM, SR CTCE',
    '                 SR (SSR), OS (OSI), FFN (Freq flyer), TKOK, TKTL, RF',
    '6. END/RETRIEVE: ER (End & Redisplay), ET (End & Exit), IG (Ignore), IR, RT',
    '7. MODIFY:       XE<num> (Cancel element), XI (Cancel itinerary), SB (Rebook)',
    '8. PRICING:      FXP (Price + TST), FXX (Informative), FXA (Best fare), FQD',
    '9. TICKETING:    TTP (Issue tickets), TTP/RT, FM (Comm), FP (Payment), FV, TWD',
    '10. ANCILLARY:   SM/ST (Seat map), QT/QS (Queues), HL/HA (Hotels), CL/CA (Cars)',
    '═══════════════════════════════════════════════════════════',
    'Stacking delimiter: "+" (e.g. NM1SMITH/JOHN MR+APLOS 12345+TKOK+RFJOHN+ER)',
    'Switch dialect: SET SABRE / SET AMADEUS',
  ];

  return {
    output: lines.join('\n'),
    newState: state,
  };
}

/**
 * Handle Multi-page scrolling: MD (Move Down) / MU (Move Up)
 */
export function handleAmadeusMovePage(
  direction: 'DOWN' | 'UP' | 'TOP',
  state: SessionState,
  store: DataStore
): CommandResult {
  if (!state.lastAvailability || !state.lastAvailability.lines || state.lastAvailability.lines.length === 0) {
    return {
      output: 'NO ACTIVE DISPLAY TO SCROLL',
      newState: state,
    };
  }

  const PAGE_SIZE = 4;
  const totalLines = state.lastAvailability.lines.length;
  const maxPage = Math.max(0, Math.ceil(totalLines / PAGE_SIZE) - 1);
  let currentPage = state.availabilityPage || 0;

  if (direction === 'TOP') {
    currentPage = 0;
  } else if (direction === 'DOWN') {
    if (currentPage >= maxPage) {
      return {
        output: 'END OF DISPLAY',
        newState: state,
      };
    }
    currentPage++;
  } else if (direction === 'UP') {
    if (currentPage <= 0) {
      return {
        output: 'TOP OF DISPLAY',
        newState: state,
      };
    }
    currentPage--;
  }

  // Render page
  const startIndex = currentPage * PAGE_SIZE;
  const pageLines = state.lastAvailability.lines.slice(startIndex, startIndex + PAGE_SIZE);

  const dObj = new Date(`${state.lastAvailability.date}T00:00:00`);
  const header = `AN${formatDateSabre(dObj)}${state.lastAvailability.origin}${state.lastAvailability.destination} - PAGE ${currentPage + 1}/${maxPage + 1}`;
  const tableRows = pageLines.map((line) => {
    const classStr = line.classes.map((c) => `${c.code}${c.seats}`).join(' ');
    return `${line.lineNumber}  ${line.airlineCode} ${line.flightNumber.toString().padEnd(4)} ${classStr.padEnd(20)} ${line.origin}${line.destination} ${line.departureTime.replace(':', '')} ${line.arrivalTime.replace(':', '')}  ${line.aircraft} ${line.elapsedTime}`;
  });

  return {
    output: [header, '─'.repeat(60), ...tableRows].join('\n'),
    newState: {
      ...state,
      availabilityPage: currentPage,
    },
  };
}

/**
 * Handle MN (Move Next Day) / MY (Move Yesterday)
 */
export function handleAmadeusMoveDay(
  direction: 'NEXT' | 'PREV',
  state: SessionState,
  store: DataStore
): CommandResult {
  if (!state.lastAvailability) {
    return {
      output: 'NO PREVIOUS AVAILABILITY DISPLAY TO MODIFY',
      newState: state,
    };
  }

  const [year, month, day] = state.lastAvailability.date.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (direction === 'NEXT') {
    utcDate.setUTCDate(utcDate.getUTCDate() + 1);
  } else {
    utcDate.setUTCDate(utcDate.getUTCDate() - 1);
  }

  const newGdsDate = formatDateSabre(utcDate);
  const newCmd = `AN${newGdsDate}${state.lastAvailability.origin}${state.lastAvailability.destination}`;

  return handleAmadeusAvailability(newCmd, state, store);
}
