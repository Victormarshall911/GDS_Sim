import type { SessionState, CommandResult, PassengerEntry } from '../../types';

export function handleName(nameInput: string, state: SessionState): CommandResult {
  const trimmed = nameInput.trim();
  if (!trimmed) {
    return {
      output: 'INVALID NAME FORMAT - USE -LAST/FIRST TITLE',
      newState: state,
    };
  }

  // Parse passenger info
  // E.g. "SMITH/JOHN MR", "DOE/TOM MSTR(CHD/15JAN20)", "DOE/BABY(INF)"
  let paxType: 'ADT' | 'CHD' | 'INF' = 'ADT';
  let dob: string | undefined = undefined;
  let cleanName = trimmed;

  const chdMatch = cleanName.match(/\(CHD(?:\/([^)]+))?\)/i);
  if (chdMatch) {
    paxType = 'CHD';
    if (chdMatch[1]) dob = chdMatch[1].trim();
    cleanName = cleanName.replace(/\(CHD(?:\/[^)]+)?\)/i, '').trim();
  } else {
    const infMatch = cleanName.match(/\(INF(?:\/([^)]+))?\)/i);
    if (infMatch) {
      paxType = 'INF';
      if (infMatch[1]) dob = infMatch[1].trim();
      cleanName = cleanName.replace(/\(INF(?:\/[^)]+)?\)/i, '').trim();
    }
  }

  const slashIndex = cleanName.indexOf('/');
  if (slashIndex === -1) {
    return {
      output: 'INVALID NAME FORMAT - NEED / BETWEEN LAST AND FIRST (E.G. -SMITH/JOHN MR)',
      newState: state,
    };
  }

  const lastName = cleanName.substring(0, slashIndex).trim();
  const rest = cleanName.substring(slashIndex + 1).trim();

  // Extract title (MR, MRS, MS, MISS, MSTR, DR, PROF) if present at end of first name
  const titleMatch = rest.match(/^(.*?)(?:\s+(MR|MRS|MS|MISS|MSTR|DR|PROF))?$/i);
  const firstName = (titleMatch?.[1] ?? rest).trim();
  const title = (titleMatch?.[2] ?? '').toUpperCase();

  const newPax: PassengerEntry = {
    lastName,
    firstName,
    title,
    paxType,
    dob,
  };

  const currentWorkingPnr = state.workingPnr ?? {
    passengers: [],
    segments: [],
    phone: null,
    ticketing: null,
    receivedFrom: null,
  };

  const updatedPassengers = [...currentWorkingPnr.passengers, newPax];
  const paxNumber = updatedPassengers.length;

  let displayType = '';
  if (paxType === 'CHD') displayType = dob ? `(CHD/${dob})` : '(CHD)';
  if (paxType === 'INF') displayType = dob ? `(INF/${dob})` : '(INF)';

  const output = `1.${paxNumber} ${lastName}/${firstName}${title ? ' ' + title : ''}${displayType}`;

  return {
    output,
    newState: {
      ...state,
      workingPnr: {
        ...currentWorkingPnr,
        passengers: updatedPassengers,
      },
    },
  };
}
