import type { SessionState, CommandResult, DataStore, PassengerEntry, PnrElementRecord, WorkingPnr, SavedPnrRecord } from '../../types';
import { formatDateSabre, formatTimeDisplay } from '../../format';
import { AMADEUS_CONFIG } from '../../command-config';

/**
 * Format Amadeus PNR with numbered elements
 */
export function formatAmadeusPnr(
  pnr: {
    record_locator?: string;
    recordLocator?: string;
    passengers: (PassengerEntry | SavedPnrRecord['passengers'][number])[];
    segments: any[];
    phone?: string | null;
    ticketing?: string | null;
    receivedFrom?: string | null;
    received_from?: string | null;
    elements?: PnrElementRecord[];
  },
  state?: SessionState
): string {
  const locator = pnr.record_locator || 'WORKING PNR';
  const officeId = AMADEUS_CONFIG.defaultAgent.officeId;
  const agentDuty = `${state?.agentId ? state.agentId.slice(0, 4) : '1234'}/SU`;
  const todayGds = formatDateSabre(new Date());

  const lines: string[] = [
    '--- RLR ---',
    `RP/${officeId}/${officeId}            ${agentDuty}   ${todayGds}/1200Z   ${locator}`,
  ];

  let elementNum = 1;

  // 1. Names
  if (pnr.passengers.length === 0) {
    lines.push(`  ${elementNum}.NO NAMES`);
    elementNum++;
  } else if (pnr.passengers.length === 1) {
    const p = pnr.passengers[0] as any;
    const lName = p.lastName || p.last_name || '';
    const fName = p.firstName || p.first_name || '';
    const pType = p.paxType || p.pax_type || 'ADT';
    const chdSuffix = pType === 'CHD' ? `(CHD${p.dob ? '/' + p.dob : ''})` : '';
    lines.push(`  ${elementNum}.1${lName}/${fName} ${p.title || ''}${chdSuffix}`.trimEnd());
    elementNum++;
  } else {
    // Check if sharing surname
    const firstSurname = (pnr.passengers[0] as any).lastName || (pnr.passengers[0] as any).last_name;
    const sameSurname = pnr.passengers.every((p: any) => (p.lastName || p.last_name) === firstSurname);

    if (sameSurname) {
      pnr.passengers.forEach((p: any, idx) => {
        const lName = p.lastName || p.last_name || '';
        const fName = p.firstName || p.first_name || '';
        const pType = p.paxType || p.pax_type || 'ADT';
        const chdSuffix = pType === 'CHD' ? `(CHD${p.dob ? '/' + p.dob : ''})` : '';
        lines.push(`  ${elementNum}.${idx + 1}${lName}/${fName} ${p.title || ''}${chdSuffix}`.trimEnd());
      });
      elementNum++;
    } else {
      pnr.passengers.forEach((p: any) => {
        const lName = p.lastName || p.last_name || '';
        const fName = p.firstName || p.first_name || '';
        const pType = p.paxType || p.pax_type || 'ADT';
        const chdSuffix = pType === 'CHD' ? `(CHD${p.dob ? '/' + p.dob : ''})` : '';
        lines.push(`  ${elementNum}.1${lName}/${fName} ${p.title || ''}${chdSuffix}`.trimEnd());
        elementNum++;
      });
    }
  }

  // 2. Itinerary Segments
  pnr.segments.forEach((seg) => {
    const dObj = new Date(`${seg.travelDate || seg.travel_date}T00:00:00`);
    const gdsDate = formatDateSabre(dObj);
    const airline = seg.airlineCode || seg.airline_code;
    const fltNum = (seg.flightNumber || seg.flight_number).toString();
    const cls = seg.classCode || seg.class_code;
    const orig = seg.origin;
    const dest = seg.destination;
    const dep = formatTimeDisplay(seg.departureTime || seg.departure_time);
    const arr = formatTimeDisplay(seg.arrivalTime || seg.arrival_time);
    const status = seg.status || 'HK1';
    const ac = seg.aircraft || '738';

    lines.push(`  ${elementNum}  ${airline} ${fltNum} ${cls} ${gdsDate} ${orig}${dest} ${status}  ${dep} ${arr}  ${ac} E`);
    elementNum++;
  });

  // 3. AP / Phone
  if (pnr.phone) {
    lines.push(`  ${elementNum} AP ${pnr.phone}`);
    elementNum++;
  }

  // 4. Custom PNR Elements (SSR, OSI, FFN, etc.)
  const allElements = pnr.elements || state?.pnrElements || [];
  allElements.forEach((el) => {
    lines.push(`  ${elementNum} ${el.element_type} ${el.content}`);
    elementNum++;
  });

  // 5. Ticketing
  if (pnr.ticketing) {
    lines.push(`  ${elementNum} TK ${pnr.ticketing}`);
    elementNum++;
  }

  // 6. E-Tickets (FA lines)
  const eTickets = state?.eTickets || [];
  eTickets.forEach((t) => {
    lines.push(`  ${elementNum} FA PAX ${t.ticket_number}/ET${t.validating_carrier || t.airline_code || 'P4'}/${todayGds}/${officeId}`);
    elementNum++;
  });

  // 7. Received From
  const rf = pnr.receivedFrom || pnr.received_from;
  if (rf) {
    lines.push(`  ${elementNum} RF ${rf}`);
    elementNum++;
  }

  return lines.join('\n');
}

/**
 * Ensure working PNR exists
 */
function getOrCreateWorkingPnr(state: SessionState): WorkingPnr {
  return (
    state.workingPnr ?? {
      passengers: [],
      segments: [],
      phone: null,
      ticketing: null,
      receivedFrom: null,
    }
  );
}

/**
 * Handle NM (Passenger Names):
 * NM1<SURNAME>/<FIRSTNAME> <TITLE>
 * NM2<SURNAME>/<FIRSTNAME> <TITLE>/<FIRSTNAME> <TITLE>
 * NM with (CHD/15MAR18)
 * NM with (INF/BABY MISS/01DEC24)
 */
export function handleAmadeusName(
  input: string,
  state: SessionState
): CommandResult {
  const clean = input.trim().toUpperCase();
  const working = getOrCreateWorkingPnr(state);
  const newPassengers: PassengerEntry[] = [...working.passengers];

  // Match NM1 or NM2 or bare NM
  const m = clean.match(/^NM(\d+)?\s*(.+)$/);
  if (!m) {
    return {
      output: 'INVALID NAME FORMAT - USE NM1<SURNAME>/<FIRST> <TITLE> (E.G. NM1SMITH/JOHN MR)',
      newState: state,
    };
  }

  const countPrefix = m[1] ? parseInt(m[1], 10) : 1;
  const body = m[2].trim();

  // Check for infant: e.g. NM1SHARMA/RAJ MR(INF/BABY MISS/01DEC24)
  const infMatch = body.match(/^([^(]+)\(INF\/([^/]+)\/([^)]+)\)$/);
  if (infMatch) {
    const adultPart = infMatch[1].trim();
    const infName = infMatch[2].trim();
    const infDob = infMatch[3].trim();

    // Parse adult
    const adultNameMatch = adultPart.match(/^([^/]+)\/(.+)$/);
    if (!adultNameMatch) {
      return { output: 'INVALID ADULT NAME IN INFANT ENTRY', newState: state };
    }

    const adultSurname = adultNameMatch[1].trim();
    const adultFirstTokens = adultNameMatch[2].trim().split(/\s+/);
    const adultTitle = adultFirstTokens.length > 1 ? adultFirstTokens.pop()! : 'MR';
    const adultFirst = adultFirstTokens.join(' ');

    const adultIdx = newPassengers.length + 1;
    newPassengers.push({
      lastName: adultSurname,
      firstName: adultFirst,
      title: adultTitle,
      paxType: 'ADT',
    });

    // Parse infant
    const infTokens = infName.split(/\s+/);
    const infTitle = infTokens.length > 1 ? infTokens.pop()! : 'INF';
    const infFirst = infTokens.join(' ');

    newPassengers.push({
      lastName: adultSurname,
      firstName: infFirst,
      title: infTitle,
      paxType: 'INF',
      dob: infDob,
      associatedAdult: adultIdx,
    });

    return {
      output: `1.1${adultSurname}/${adultFirst} ${adultTitle}(INF/${infFirst} ${infTitle}/${infDob})`,
      newState: {
        ...state,
        workingPnr: {
          ...working,
          passengers: newPassengers,
        },
      },
    };
  }

  // Check for child: e.g. NM1KAPOOR/ANJALI MISS(CHD/15MAR18) or (CHD)
  const chdMatch = body.match(/^([^(]+)\(CHD(?:\/([^)]+))?\)$/);
  if (chdMatch) {
    const namePart = chdMatch[1].trim();
    const dob = chdMatch[2]?.trim();

    const slashMatch = namePart.match(/^([^/]+)\/(.+)$/);
    if (!slashMatch) {
      return { output: 'INVALID CHILD NAME FORMAT', newState: state };
    }

    const surname = slashMatch[1].trim();
    const firstTokens = slashMatch[2].trim().split(/\s+/);
    const title = firstTokens.length > 1 ? firstTokens.pop()! : 'MSTR';
    const first = firstTokens.join(' ');

    newPassengers.push({
      lastName: surname,
      firstName: first,
      title,
      paxType: 'CHD',
      dob,
    });

    return {
      output: `1.1${surname}/${first} ${title}(CHD${dob ? '/' + dob : ''})`,
      newState: {
        ...state,
        workingPnr: {
          ...working,
          passengers: newPassengers,
        },
      },
    };
  }

  // Check if multiple names separated by slash: e.g. NM2SHARMA/RAJ MR/PRIYA MRS
  const parts = body.split('/');
  if (parts.length >= 3 && countPrefix >= 2) {
    const surname = parts[0].trim();
    const addedNames: string[] = [];

    for (let i = 1; i < parts.length; i++) {
      const tokens = parts[i].trim().split(/\s+/);
      const title = tokens.length > 1 ? tokens.pop()! : 'MR';
      const first = tokens.join(' ');

      newPassengers.push({
        lastName: surname,
        firstName: first,
        title,
        paxType: 'ADT',
      });
      addedNames.push(`1.${newPassengers.length}${surname}/${first} ${title}`);
    }

    return {
      output: addedNames.join('\n'),
      newState: {
        ...state,
        workingPnr: {
          ...working,
          passengers: newPassengers,
        },
      },
    };
  }

  // Standard single adult: NM1SMITH/JOHN MR
  const standardMatch = body.match(/^([^/]+)\/(.+)$/);
  if (!standardMatch) {
    return {
      output: 'INVALID NAME FORMAT - USE SURNAME/FIRSTNAME TITLE',
      newState: state,
    };
  }

  const surname = standardMatch[1].trim();
  const firstTokens = standardMatch[2].trim().split(/\s+/);
  const title = firstTokens.length > 1 ? firstTokens.pop()! : 'MR';
  const first = firstTokens.join(' ');

  newPassengers.push({
    lastName: surname,
    firstName: first,
    title,
    paxType: 'ADT',
  });

  return {
    output: `1.${newPassengers.length}${surname}/${first} ${title}`,
    newState: {
      ...state,
      workingPnr: {
        ...working,
        passengers: newPassengers,
      },
    },
  };
}

/**
 * Handle AP (General Phone), APM (Mobile), APE (Email)
 */
export function handleAmadeusContact(
  type: 'PHONE' | 'MOBILE' | 'EMAIL',
  content: string,
  state: SessionState
): CommandResult {
  const clean = content.trim().toUpperCase();
  if (!clean) {
    return { output: 'NEED CONTACT DETAILS', newState: state };
  }

  const working = getOrCreateWorkingPnr(state);
  const elements = [...(state.pnrElements || [])];

  if (type === 'PHONE') {
    working.phone = clean;
    return {
      output: `AP ${clean}`,
      newState: {
        ...state,
        workingPnr: { ...working, phone: clean },
      },
    };
  }

  if (type === 'MOBILE') {
    elements.push({
      pnr_locator: state.currentPnr || 'WORK',
      element_number: elements.length + 1,
      element_type: 'APM',
      content: clean,
    });
    // Also populate working.phone if null
    if (!working.phone) working.phone = clean;

    return {
      output: `APM-${clean}`,
      newState: {
        ...state,
        workingPnr: working,
        pnrElements: elements,
      },
    };
  }

  // EMAIL (APE)
  elements.push({
    pnr_locator: state.currentPnr || 'WORK',
    element_number: elements.length + 1,
    element_type: 'APE',
    content: clean,
  });

  return {
    output: `APE-${clean}`,
    newState: {
      ...state,
      workingPnr: working,
      pnrElements: elements,
    },
  };
}

/**
 * Handle SR (SSR), SR CTCM, SR CTCE (// converts to @), OS (OSI), FFN
 */
export function handleAmadeusServiceRequest(
  type: 'CTCM' | 'CTCE' | 'SR' | 'OS' | 'FFN',
  rawContent: string,
  state: SessionState
): CommandResult {
  let content = rawContent.trim();
  const working = getOrCreateWorkingPnr(state);
  const elements = [...(state.pnrElements || [])];

  if (type === 'CTCE') {
    // "//" converts to "@" for storage and display
    content = content.replace(/\/\//g, '@').toUpperCase();
    elements.push({
      pnr_locator: state.currentPnr || 'WORK',
      element_number: elements.length + 1,
      element_type: 'SR CTCE',
      content,
    });

    return {
      output: `SR CTCE-${content}`,
      newState: {
        ...state,
        workingPnr: working,
        pnrElements: elements,
      },
    };
  }

  if (type === 'CTCM') {
    content = content.toUpperCase();
    elements.push({
      pnr_locator: state.currentPnr || 'WORK',
      element_number: elements.length + 1,
      element_type: 'SR CTCM',
      content,
    });
    if (!working.phone) working.phone = content;

    return {
      output: `SR CTCM-${content}`,
      newState: {
        ...state,
        workingPnr: working,
        pnrElements: elements,
      },
    };
  }

  if (type === 'OS') {
    elements.push({
      pnr_locator: state.currentPnr || 'WORK',
      element_number: elements.length + 1,
      element_type: 'OS',
      content: content.toUpperCase(),
    });

    return {
      output: `OS ${content.toUpperCase()}`,
      newState: {
        ...state,
        pnrElements: elements,
      },
    };
  }

  if (type === 'FFN') {
    elements.push({
      pnr_locator: state.currentPnr || 'WORK',
      element_number: elements.length + 1,
      element_type: 'FFN',
      content: content.toUpperCase(),
    });

    return {
      output: `FFN ${content.toUpperCase()}`,
      newState: {
        ...state,
        pnrElements: elements,
      },
    };
  }

  // General SR (SSR)
  elements.push({
    pnr_locator: state.currentPnr || 'WORK',
    element_number: elements.length + 1,
    element_type: 'SR',
    content: content.toUpperCase(),
  });

  return {
    output: `SR ${content.toUpperCase()}`,
    newState: {
      ...state,
      pnrElements: elements,
    },
  };
}

/**
 * Handle TKOK / TKTL
 */
export function handleAmadeusTicketing(
  mode: 'OK' | 'TL',
  detail: string,
  state: SessionState
): CommandResult {
  const working = getOrCreateWorkingPnr(state);

  if (mode === 'OK') {
    const todayGds = formatDateSabre(new Date());
    const val = `OK${todayGds}/${AMADEUS_CONFIG.defaultAgent.officeId}`;
    return {
      output: `TK ${val}`,
      newState: {
        ...state,
        workingPnr: {
          ...working,
          ticketing: val,
        },
      },
    };
  }

  const cleanDetail = detail.trim().toUpperCase() || formatDateSabre(new Date());
  const val = `TL${cleanDetail}`;
  return {
    output: `TK ${val}`,
    newState: {
      ...state,
      workingPnr: {
        ...working,
        ticketing: val,
      },
    },
  };
}

/**
 * Handle RF <name> (Received From)
 */
export function handleAmadeusReceivedFrom(
  name: string,
  state: SessionState
): CommandResult {
  const clean = name.trim().toUpperCase();
  if (!clean) {
    return {
      output: 'NEED RECEIVED FROM IDENTIFIER (E.G. RF VICTOR)',
      newState: state,
    };
  }

  const working = getOrCreateWorkingPnr(state);
  return {
    output: `RF ${clean}`,
    newState: {
      ...state,
      workingPnr: {
        ...working,
        receivedFrom: clean,
      },
    },
  };
}
