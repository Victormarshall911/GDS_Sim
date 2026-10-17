import type { SessionState, CommandResult, DataStore, SegmentEntry } from '../../types';
import { parseGdsDate } from '../../format';

/**
 * Parse element numbers from strings like:
 * "5" -> [5]
 * "2,4" -> [2, 4]
 * "2-4" -> [2, 3, 4]
 */
export function parseElementIndices(input: string): number[] {
  const clean = input.trim();
  const indices = new Set<number>();

  const parts = clean.split(',').map((p) => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          indices.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        indices.add(num);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Handle XE<elements>: e.g. XE5, XE2,4, XE2-4
 */
export function handleAmadeusCancelElement(
  rawArg: string,
  state: SessionState
): CommandResult {
  const clean = rawArg.trim();
  const targets = parseElementIndices(clean);

  if (targets.length === 0) {
    return {
      output: 'INVALID ELEMENT NUMBER - USE XE<NUM> (E.G. XE2 OR XE2,4 OR XE2-4)',
      newState: state,
    };
  }

  const working = state.workingPnr;
  if (!working) {
    return {
      output: 'NO WORKING PNR IN CONTEXT TO MODIFY',
      newState: state,
    };
  }

  // Build current element map corresponding to formatAmadeusPnr line numbers
  // Element 1: Names
  // Elements 2 .. 1+segments: Segments
  // Next: Phone
  // Next: SSR/OSI/FFN elements
  // Next: Ticketing
  // Next: RF
  const cancelledDescriptions: string[] = [];
  let currentSegs = [...working.segments];
  let currentPax = [...working.passengers];
  let currentPhone = working.phone;
  let currentElements = [...(state.pnrElements || [])];
  let currentTicketing = working.ticketing;
  let currentRF = working.receivedFrom;

  let lineCounter = 1;

  // Name line: line 1
  if (targets.includes(lineCounter)) {
    currentPax = [];
    cancelledDescriptions.push(`ELEMENT 1 (NAMES)`);
  }
  lineCounter++;

  // Segments lines
  const segsToKeep: SegmentEntry[] = [];
  currentSegs.forEach((seg, idx) => {
    const segLine = lineCounter;
    lineCounter++;
    if (targets.includes(segLine)) {
      cancelledDescriptions.push(`ELEMENT ${segLine} (SEGMENT ${idx + 1} ${seg.airlineCode} ${seg.flightNumber})`);
    } else {
      segsToKeep.push(seg);
    }
  });
  currentSegs = segsToKeep;

  // Phone line
  if (currentPhone) {
    if (targets.includes(lineCounter)) {
      currentPhone = null;
      cancelledDescriptions.push(`ELEMENT ${lineCounter} (CONTACT)`);
    }
    lineCounter++;
  }

  // Additional elements (SSR, OSI, FFN)
  const elementsToKeep = [];
  for (const el of currentElements) {
    if (targets.includes(lineCounter)) {
      cancelledDescriptions.push(`ELEMENT ${lineCounter} (${el.element_type})`);
    } else {
      elementsToKeep.push(el);
    }
    lineCounter++;
  }
  currentElements = elementsToKeep;

  // Ticketing line
  if (currentTicketing) {
    if (targets.includes(lineCounter)) {
      currentTicketing = null;
      cancelledDescriptions.push(`ELEMENT ${lineCounter} (TICKETING)`);
    }
    lineCounter++;
  }

  // RF line
  if (currentRF) {
    if (targets.includes(lineCounter)) {
      currentRF = null;
      cancelledDescriptions.push(`ELEMENT ${lineCounter} (RECEIVED FROM)`);
    }
    lineCounter++;
  }

  if (cancelledDescriptions.length === 0) {
    return {
      output: `ELEMENT(S) ${clean} NOT FOUND IN PNR`,
      newState: state,
    };
  }

  return {
    output: `OK - CANCELLED:\n${cancelledDescriptions.map((d) => `  * ${d}`).join('\n')}`,
    newState: {
      ...state,
      workingPnr: {
        ...working,
        passengers: currentPax,
        segments: currentSegs,
        phone: currentPhone,
        ticketing: currentTicketing,
        receivedFrom: currentRF,
      },
      pnrElements: currentElements,
    },
  };
}

/**
 * Handle XI (Cancel Itinerary)
 */
export function handleAmadeusCancelItinerary(state: SessionState): CommandResult {
  const working = state.workingPnr;
  if (!working || working.segments.length === 0) {
    return {
      output: 'NO ITINERARY TO CANCEL',
      newState: state,
    };
  }

  return {
    output: `OK - ITINERARY CANCELLED (${working.segments.length} SEGMENT(S) REMOVED)`,
    newState: {
      ...state,
      workingPnr: {
        ...working,
        segments: [],
      },
    },
  };
}

/**
 * Handle SB: Rebook segment class or date
 * e.g. SBY2 (rebook segment 2 to class Y)
 * e.g. SB19OCT2 (rebook segment 2 to date 19OCT)
 */
export function handleAmadeusRebookSegment(
  rawArg: string,
  state: SessionState,
  store: DataStore
): CommandResult {
  const clean = rawArg.trim().toUpperCase();
  const working = state.workingPnr;

  if (!working || working.segments.length === 0) {
    return {
      output: 'NO ACTIVE ITINERARY IN CONTEXT - USE AN/SS FIRST',
      newState: state,
    };
  }

  // 1. SB<class><seg>: e.g. SBY2 or SB Y 2
  const classMatch = clean.match(/^([A-Z])\s*(\d+)$/);
  if (classMatch) {
    const newClass = classMatch[1];
    const segIdx = parseInt(classMatch[2], 10) - 1;

    if (segIdx < 0 || segIdx >= working.segments.length) {
      return {
        output: `INVALID SEGMENT NUMBER ${segIdx + 1} - ITINERARY HAS ${working.segments.length} SEGMENT(S)`,
        newState: state,
      };
    }

    const updatedSegs = [...working.segments];
    updatedSegs[segIdx] = {
      ...updatedSegs[segIdx],
      classCode: newClass,
    };

    return {
      output: `OK - SEGMENT ${segIdx + 1} REBOOKED TO CLASS ${newClass}`,
      newState: {
        ...state,
        workingPnr: {
          ...working,
          segments: updatedSegs,
        },
      },
    };
  }

  // 2. SB<date><seg>: e.g. SB19OCT2
  const dateMatch = clean.match(/^(\d{1,2}[A-Z]{3}(?:\d{2})?)\s*(\d+)$/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const segIdx = parseInt(dateMatch[2], 10) - 1;

    if (segIdx < 0 || segIdx >= working.segments.length) {
      return {
        output: `INVALID SEGMENT NUMBER ${segIdx + 1}`,
        newState: state,
      };
    }

    const parsedDate = parseGdsDate(dateStr);
    if (!parsedDate) {
      return { output: `INVALID DATE "${dateStr}"`, newState: state };
    }

    const isoDate = parsedDate.toISOString().slice(0, 10);
    const updatedSegs = [...working.segments];
    updatedSegs[segIdx] = {
      ...updatedSegs[segIdx],
      travelDate: isoDate,
    };

    return {
      output: `OK - SEGMENT ${segIdx + 1} DATE REBOOKED TO ${dateStr.toUpperCase()}`,
      newState: {
        ...state,
        workingPnr: {
          ...working,
          segments: updatedSegs,
        },
      },
    };
  }

  return {
    output: 'FORMAT: SB<CLASS><SEG> OR SB<DATE><SEG> (E.G. SBY2 OR SB19OCT2)',
    newState: state,
  };
}
