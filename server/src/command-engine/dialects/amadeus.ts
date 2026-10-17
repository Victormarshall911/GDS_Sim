import type { Dialect } from './interface';
import type { SessionState, CommandResult, DataStore } from '../types';
import { AMADEUS_COMMAND_MAP } from '../command-config';
import { handleAmadeusAvailability } from './amadeus-commands/availability';

export class AmadeusDialect implements Dialect {
  readonly name = 'amadeus';

  execute(rawInput: string, state: SessionState, store: DataStore): CommandResult {
    const input = rawInput.trim().toUpperCase();

    if (!input) {
      return { output: '', newState: state };
    }

    if (
      input === 'SET SABRE' ||
      input === 'DIALECT SABRE' ||
      input === 'SET DIALECT SABRE'
    ) {
      return {
        output: 'DIALECT SWITCHED TO SABRE',
        newState: {
          ...state,
          dialect: 'sabre',
        },
      };
    }

    if (
      input === 'SET AMADEUS' ||
      input === 'DIALECT AMADEUS' ||
      input === 'SET DIALECT AMADEUS'
    ) {
      return {
        output: 'DIALECT IS ALREADY AMADEUS',
        newState: state,
      };
    }

    // Availability commands: AN, AD, AE, AA, SN, TN
    if (/^(AN|AD|AE|AA|SN|TN)/.test(input)) {
      return handleAmadeusAvailability(input, state, store);
    }

    // Sign in: JI <ID>
    const jiMatch = input.match(/^JI\s*(.+)$/);
    if (jiMatch) {
      const agentId = jiMatch[1].trim();
      return {
        output: `OK 001/SU - AGENT ${agentId} SIGNED IN ON AMADEUS GDS\nAMADEUS SIMULATOR DIALECT (PHASE 2 PREVIEW)`,
        newState: {
          ...state,
          agentId,
          signedIn: true,
        },
      };
    }

    // Sign out: JO
    if (input === 'JO') {
      return {
        output: 'SIGNED OUT OF AMADEUS',
        newState: {
          ...state,
          agentId: null,
          signedIn: false,
        },
      };
    }

    // Help
    if (input === 'HELP' || input === 'HE') {
      const lines = [
        '',
        'AMADEUS GDS DIALECT (PHASE 2 PREVIEW)',
        '═══════════════════════════════════════════════════════',
        'AMADEUS COMMAND           SABRE EQUIVALENT    DESCRIPTION',
        '───────────────────────── ─────────────────── ───────────',
        ...Object.values(AMADEUS_COMMAND_MAP).map(
          (m) => `${m.amadeus.padEnd(26)}${m.sabre.padEnd(20)}${m.description}`
        ),
        '',
        'Type "SET SABRE" to switch back to the Sabre dialect.',
        '═══════════════════════════════════════════════════════',
        '',
      ];
      return { output: lines.join('\n'), newState: state };
    }

    // Check if input matches any Amadeus command prefix and offer translation
    let matchedDesc = '';
    let sabreEquiv = '';
    for (const item of Object.values(AMADEUS_COMMAND_MAP)) {
      const prefix = item.amadeus.split(/[ <]/)[0];
      if (input.startsWith(prefix)) {
        matchedDesc = item.description;
        sabreEquiv = item.sabre;
        break;
      }
    }

    if (matchedDesc) {
      return {
        output: `AMADEUS COMMAND RECOGNIZED: "${input}" (${matchedDesc})\nNOTE: Amadeus full parser is coming in Phase 2.\nSabre equivalent: ${sabreEquiv}\n(Type "SET SABRE" to return to Sabre mode)`,
        newState: state,
      };
    }

    return {
      output: `AMADEUS: INVALID COMMAND "${input}"\nType HELP for Amadeus command reference or SET SABRE to switch back.`,
      newState: state,
    };
  }
}
