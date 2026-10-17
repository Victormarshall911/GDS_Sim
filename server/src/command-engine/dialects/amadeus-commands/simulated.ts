import type { SessionState, CommandResult, DataStore, PassengerEntry } from '../../types';
import { generateRecordLocator } from '../../record-locator';

/**
 * Handle SP (Split PNR): e.g. SP2 or SP2,3
 */
export function handleAmadeusSplitPnr(
  paxArg: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const working = state.workingPnr;
  if (!working || working.passengers.length <= 1) {
    return {
      output: 'CANNOT SPLIT PNR - AT LEAST 2 PASSENGERS REQUIRED',
      newState: state,
    };
  }

  const paxNums = paxArg.split(',').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n));
  if (paxNums.length === 0) {
    return {
      output: 'FORMAT: SP<PAX NUMBER> (E.G. SP2 OR SP2,3)',
      newState: state,
    };
  }

  const remainingPax: PassengerEntry[] = [];
  const splitPax: PassengerEntry[] = [];

  working.passengers.forEach((p, idx) => {
    if (paxNums.includes(idx + 1)) {
      splitPax.push(p);
    } else {
      remainingPax.push(p);
    }
  });

  if (remainingPax.length === 0) {
    return {
      output: 'CANNOT SPLIT ALL PASSENGERS - ORIGINAL PNR MUST RETAIN AT LEAST ONE PASSENGER',
      newState: state,
    };
  }

  const newLocator = generateRecordLocator(store);
  const currentLoc = state.currentPnr || 'WORK';

  // Save split PNR
  store.savePnr({
    recordLocator: newLocator,
    agentId: state.agentId,
    receivedFrom: working.receivedFrom || 'SPLIT',
    phone: working.phone || 'APM-SPLIT',
    ticketing: working.ticketing || 'OK',
    status: 'ACTIVE',
    passengers: splitPax,
    segments: working.segments,
  });

  const lines = [
    'SPLIT IN PROGRESS:',
    `ORIGINAL PNR: ${currentLoc} (RETAINS ${remainingPax.length} PAX: ${remainingPax.map((p) => `${p.lastName}/${p.firstName}`).join(', ')})`,
    `NEW PNR:      ${newLocator} (CREATED WITH ${splitPax.length} PAX: ${splitPax.map((p) => `${p.lastName}/${p.firstName}`).join(', ')})`,
    'SPLIT ASSOCIATED RECORD COMPLETED',
  ];

  return {
    output: lines.join('\n'),
    newState: {
      ...state,
      workingPnr: {
        ...working,
        passengers: remainingPax,
      },
    },
  };
}

/**
 * Handle SM (Seat Map): e.g. SM1
 */
export function handleAmadeusSeatMap(
  segNum: number,
  state: SessionState
): CommandResult {
  const working = state.workingPnr;
  const seg = working?.segments[segNum - 1];
  const ac = seg?.aircraft || '738';
  const flt = seg ? `${seg.airlineCode} ${seg.flightNumber}` : 'FLIGHT 101';

  const lines = [
    `SEAT MAP: ${ac} - ${flt} (SEGMENT ${segNum})`,
    '       A B C   D E F',
    '    10 . . .   . . .',
    '    11 . * .   . . .',
    '    12 . . .   * . .',
    '    13 . . *   . . .',
    '    14 * . .   . . *',
    '    15 . . .   . . .',
    '    16 . * .   . * .',
    '    17 . . .   . . .',
    'LEGEND:  . AVAILABLE   * OCCUPIED',
    'ENTER ST/<SEAT>/<PAX>/<SEG> TO ASSIGN (E.G. ST/12A/P1/S1)',
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle ST (Assign Seat or Preference): e.g. ST/12A/P1/S1 or ST/W/P1/S1
 */
export function handleAmadeusSeatAssign(
  arg: string,
  state: SessionState
): CommandResult {
  const clean = arg.trim().toUpperCase();
  const parts = clean.split('/').map((s) => s.trim());

  if (parts.length >= 1) {
    const seatOrPref = parts[0];
    const isPref = seatOrPref === 'W' || seatOrPref === 'A';
    const desc = isPref
      ? seatOrPref === 'W' ? 'WINDOW PREFERENCE' : 'AISLE PREFERENCE'
      : `SEAT ${seatOrPref}`;

    const updatedAssignments = {
      ...(state.seatAssignments || {}),
      [parts[1] || 'P1']: seatOrPref,
    };

    return {
      output: `OK - ${desc} CONFIRMED`,
      newState: {
        ...state,
        seatAssignments: updatedAssignments,
      },
    };
  }

  return {
    output: 'FORMAT: ST/<SEAT>/<PAX>/<SEG> (E.G. ST/12A/P1/S1)',
    newState: state,
  };
}

/**
 * Handle SX (Cancel Seat Assignment): e.g. SX/P1/S1 or SXALL
 */
export function handleAmadeusSeatCancel(
  arg: string,
  state: SessionState
): CommandResult {
  return {
    output: 'OK - SEAT ASSIGNMENT(S) CANCELLED',
    newState: {
      ...state,
      seatAssignments: {},
    },
  };
}

/**
 * Handle QT (Queue Count)
 */
export function handleAmadeusQueueCount(
  state: SessionState,
  store: DataStore
): CommandResult {
  const queues = store.getQueues ? store.getQueues() : [];

  const lines = [
    'QUEUE COUNT SUMMARY (OFFICE: LOS1A0980):',
    'Q   NAME                     COUNT',
    '──────────────────────────────────',
    ...queues.map(
      (q) => `${q.queue_number.toString().padStart(2, '0')}  ${q.name.padEnd(25)} ${q.count || 0}`
    ),
    'ENTER QS<QUEUE> TO BEGIN PROCESSING (E.G. QS8)',
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle QS (Queue Start): e.g. QS8
 */
export function handleAmadeusQueueStart(
  queueNum: number,
  state: SessionState,
  store: DataStore
): CommandResult {
  const items = store.getQueueItems ? store.getQueueItems(queueNum) : [];

  if (items.length === 0) {
    return {
      output: `QUEUE ${queueNum} IS EMPTY`,
      newState: {
        ...state,
        activeQueue: null,
      },
    };
  }

  const item = items[0];
  const lines = [
    `WORKING QUEUE ${queueNum} (ITEM 1 OF ${items.length})`,
    `PNR LOCATOR: ${item.pnr_locator}`,
    `PASSENGER:   ${item.pax_name}`,
    `MESSAGE:     ${item.message || 'GENERAL ACTION REQUIRED'}`,
    'COMMANDS: QN (NEXT), QI (IGNORE/EXIT), QF (FINISH/REMOVE)',
  ];

  return {
    output: lines.join('\n'),
    newState: {
      ...state,
      activeQueue: { queueNumber: queueNum, currentIndex: 0 },
    },
  };
}

/**
 * Handle QN (Next Queue item)
 */
export function handleAmadeusQueueNext(
  state: SessionState,
  store: DataStore
): CommandResult {
  if (!state.activeQueue) {
    return { output: 'NOT CURRENTLY IN A QUEUE - USE QS<QUEUE> FIRST', newState: state };
  }

  const items = store.getQueueItems ? store.getQueueItems(state.activeQueue.queueNumber) : [];
  const nextIdx = state.activeQueue.currentIndex + 1;

  if (nextIdx >= items.length) {
    return {
      output: `END OF QUEUE ${state.activeQueue.queueNumber}`,
      newState: {
        ...state,
        activeQueue: null,
      },
    };
  }

  const item = items[nextIdx];
  const lines = [
    `WORKING QUEUE ${state.activeQueue.queueNumber} (ITEM ${nextIdx + 1} OF ${items.length})`,
    `PNR LOCATOR: ${item.pnr_locator}`,
    `PASSENGER:   ${item.pax_name}`,
    `MESSAGE:     ${item.message || 'ACTION REQUIRED'}`,
    'COMMANDS: QN (NEXT), QI (IGNORE/EXIT), QF (FINISH/REMOVE)',
  ];

  return {
    output: lines.join('\n'),
    newState: {
      ...state,
      activeQueue: { queueNumber: state.activeQueue.queueNumber, currentIndex: nextIdx },
    },
  };
}

/**
 * Handle QI (Queue Ignore)
 */
export function handleAmadeusQueueIgnore(state: SessionState): CommandResult {
  return {
    output: 'EXITED QUEUE - ITEM LEFT ON QUEUE',
    newState: {
      ...state,
      activeQueue: null,
    },
  };
}

/**
 * Handle QF (Queue Finish)
 */
export function handleAmadeusQueueFinish(
  state: SessionState,
  store: DataStore
): CommandResult {
  if (!state.activeQueue) {
    return { output: 'NOT CURRENTLY IN A QUEUE', newState: state };
  }

  const qNum = state.activeQueue.queueNumber;
  const items = store.getQueueItems ? store.getQueueItems(qNum) : [];
  const currentItem = items[state.activeQueue.currentIndex];

  if (currentItem && store.removeQueueItem) {
    store.removeQueueItem(currentItem.id);
  }

  return {
    output: `OK - PNR ${currentItem?.pnr_locator || ''} REMOVED FROM QUEUE ${qNum}`,
    newState: {
      ...state,
      activeQueue: null,
    },
  };
}

/**
 * Handle HL (Hotel List): e.g. HLLON or HLLOS
 */
export function handleAmadeusHotelList(
  cityCode: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const city = cityCode.trim().toUpperCase();
  const hotels = store.getHotels ? store.getHotels(city) : [];

  if (hotels.length === 0) {
    return {
      output: `NO HOTEL PROPERTIES FOUND FOR "${city}"`,
      newState: state,
    };
  }

  const lines = [
    `HOTEL PROPERTIES FOR ${city}:`,
    'LN CHAIN PROPERTY NAME                  STARS  LOCATION',
    '─────────────────────────────────────────────────────────',
    ...hotels.map(
      (h, idx) =>
        `${(idx + 1).toString().padStart(2, '0')} ${h.chain_code.padEnd(5)} ${h.name.slice(0, 28).padEnd(30)} ${h.star_rating}*    ${h.city}`
    ),
    'ENTER HA<CITY><DATE>-<NIGHTS> FOR ROOM RATES (E.G. HA' + city + '15JUN-3)',
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle HA (Hotel Availability): e.g. HALON15JUN-3
 */
export function handleAmadeusHotelAvailability(
  rawArg: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const clean = rawArg.trim().toUpperCase();
  const m = clean.match(/^([A-Z]{3})(.*)$/);
  const city = m ? m[1] : 'LON';
  const hotels = store.getHotels ? store.getHotels(city) : [];

  if (hotels.length === 0) {
    return { output: `NO HOTEL AVAILABILITY FOUND FOR "${city}"`, newState: state };
  }

  const lines = [
    `HOTEL AVAILABILITY: ${city} (SEARCH: ${clean})`,
    'LN PROPERTY                      ROOM TYPE          RATE     ST',
    '────────────────────────────────────────────────────────────────',
    ...hotels.map((h, idx) => {
      const ln = (idx + 1).toString().padStart(2, '0');
      return `${ln} ${h.name.slice(0, 28).padEnd(30)} STANDARD DELUXE   ${h.currency} ${h.rate_per_night}  AV`;
    }),
    'ENTER HS<LINE> TO BOOK (E.G. HS1)',
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle HS (Hotel Sell): e.g. HS1
 */
export function handleAmadeusHotelSell(
  lineNum: number,
  state: SessionState
): CommandResult {
  return {
    output: ` 1 HTL HK1 CONFIRMED - HOTEL SEGMENT ADDED TO WORKING PNR`,
    newState: state,
  };
}

/**
 * Handle CL (Car Location List): e.g. CLPAR or CLLOS
 */
export function handleAmadeusCarLocationList(
  cityCode: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const city = cityCode.trim().toUpperCase();
  const locations = store.getCarLocations ? store.getCarLocations(city) : [];

  if (locations.length === 0) {
    return { output: `NO CAR RENTAL LOCATIONS FOUND FOR "${city}"`, newState: state };
  }

  const lines = [
    `CAR RENTAL LOCATIONS FOR ${city}:`,
    'LN VENDOR  LOCATION NAME                AIRPORT/DOWNTOWN',
    '────────────────────────────────────────────────────────',
    ...locations.map(
      (c, idx) =>
        `${(idx + 1).toString().padStart(2, '0')} ${c.vendor_code.padEnd(7)} ${c.name.slice(0, 26).padEnd(28)} ${c.location_type}`
    ),
    'ENTER CA<CITY><DATE>-<DAYS> FOR RATES (E.G. CA' + city + '15JUN-3)',
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle CA (Car Availability): e.g. CALHR15JUN-3
 */
export function handleAmadeusCarAvailability(
  rawArg: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const clean = rawArg.trim().toUpperCase();
  const city = clean.slice(0, 3) || 'LHR';
  const locations = store.getCarLocations ? store.getCarLocations(city) : [];

  const lines = [
    `CAR AVAILABILITY: ${city} (SEARCH: ${clean})`,
    'LN VENDOR  CAR CATEGORY     DAILY RATE  UNLIMITED MILEAGE',
    '─────────────────────────────────────────────────────────',
    '01 ZE      ICAR (MIDSIZE)   EUR 45.00   INCLUDED',
    '02 ZI      ECAR (ECONOMY)   EUR 38.00   INCLUDED',
    '03 SX      PCAR (PREMIUM)   EUR 72.00   INCLUDED',
    'RESERVATION REQUIRES FP (CREDIT CARD) UPON RETURN',
  ];

  return { output: lines.join('\n'), newState: state };
}
