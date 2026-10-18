import type { Dialect } from './interface';
import type { SessionState, CommandResult, DataStore } from '../types';
import { AMADEUS_CONFIG, AMADEUS_COMMANDS, AMADEUS_RETURN_AVAILABILITY_CONFIG } from '../command-config';
import {
  handleAmadeusSignIn,
  handleAmadeusSignOut,
  handleAmadeusSessionDisplay,
  handleAmadeusHelp,
  handleAmadeusMovePage,
  handleAmadeusMoveDay,
} from './amadeus-commands/session';
import {
  handleAmadeusEncodeCity,
  handleAmadeusDecodeAirport,
  handleAmadeusAirlineEncodeDecode,
  handleAmadeusCountryEncodeDecode,
  handleAmadeusEquipmentEncodeDecode,
  handleAmadeusCarVendorEncodeDecode,
  handleAmadeusHotelChainEncodeDecode,
} from './amadeus-commands/encode-decode';
import {
  handleAmadeusAvailability,
  handleAmadeusAvailabilityChange,
  handleAmadeusAvailabilityReturn,
} from './amadeus-commands/availability';
import {
  handleAmadeusSellShort,
  handleAmadeusSellLong,
} from './amadeus-commands/sell';
import {
  handleAmadeusName,
  handleAmadeusContact,
  handleAmadeusServiceRequest,
  handleAmadeusTicketing,
  handleAmadeusReceivedFrom,
} from './amadeus-commands/pnr';
import {
  handleAmadeusEndTransaction,
  handleAmadeusIgnore,
  handleAmadeusIgnoreRetrieve,
  handleAmadeusRetrieve,
} from './amadeus-commands/end-transaction';
import {
  handleAmadeusCancelElement,
  handleAmadeusCancelItinerary,
  handleAmadeusRebookSegment,
} from './amadeus-commands/modify';
import {
  handleAmadeusPriceTst,
  handleAmadeusPriceInformative,
  handleAmadeusBestPricerDisplay,
  handleAmadeusBestPricerRebook,
  handleAmadeusFareQuoteDisplay,
  handleAmadeusFareNotes,
} from './amadeus-commands/pricing';
import {
  handleAmadeusIssueTickets,
  handleAmadeusCommission,
  handleAmadeusFormOfPayment,
  handleAmadeusValidatingCarrier,
  handleAmadeusDisplayETicket,
} from './amadeus-commands/ticketing';
import {
  handleAmadeusSplitPnr,
  handleAmadeusSeatMap,
  handleAmadeusSeatAssign,
  handleAmadeusSeatCancel,
  handleAmadeusQueueCount,
  handleAmadeusQueueStart,
  handleAmadeusQueueNext,
  handleAmadeusQueueIgnore,
  handleAmadeusQueueFinish,
  handleAmadeusHotelList,
  handleAmadeusHotelAvailability,
  handleAmadeusHotelSell,
  handleAmadeusCarLocationList,
  handleAmadeusCarAvailability,
} from './amadeus-commands/simulated';

// Recognized Tier 3 command prefixes
const TIER_3_PREFIXES = [
  'TTU', 'TQT', 'TRDC', 'GG', 'FI', 'FO', 'FD', 'FQ', 'RL', 'RLS', 'QE', 'FXZ', 'FXB', 'FXK', 'TWD/TAX'
];

export class AmadeusDialect implements Dialect {
  readonly name = 'amadeus';

  execute(rawInput: string, state: SessionState, store: DataStore): CommandResult {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { output: '', newState: state };
    }

    // Check for command stacking using delimiter '+'
    if (trimmed.includes(AMADEUS_CONFIG.delimiter)) {
      const parts = trimmed.split(AMADEUS_CONFIG.delimiter);
      let currentState = state;
      const outputs: string[] = [];

      for (const part of parts) {
        const subInput = part.trim();
        if (!subInput) continue;

        const res = this.executeSingle(subInput, currentState, store);
        outputs.push(res.output);
        currentState = res.newState;

        // Failure stops the chain: check for error indicators
        if (
          res.output.startsWith('NEED ') ||
          res.output.startsWith('INVALID ') ||
          res.output.startsWith('NO ') ||
          res.output.startsWith('ERROR') ||
          res.output.startsWith('INSUFFICIENT ') ||
          res.output.startsWith('CANNOT ')
        ) {
          break;
        }
      }

      return {
        output: outputs.join('\n'),
        newState: currentState,
      };
    }

    return this.executeSingle(trimmed, state, store);
  }

  private executeSingle(input: string, state: SessionState, store: DataStore): CommandResult {
    const upper = input.toUpperCase();

    // ─── Dialect Switching ────────────────────────────────────
    if (
      upper === 'SET SABRE' ||
      upper === 'DIALECT SABRE' ||
      upper === 'SET DIALECT SABRE'
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
      upper === 'SET AMADEUS' ||
      upper === 'DIALECT AMADEUS' ||
      upper === 'SET DIALECT AMADEUS'
    ) {
      return {
        output: 'DIALECT IS ALREADY AMADEUS',
        newState: state,
      };
    }

    // ─── Session Commands ─────────────────────────────────────
    if (AMADEUS_COMMANDS.SIGN_IN.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SIGN_IN.pattern)!;
      return handleAmadeusSignIn(m, state, store);
    }

    if (AMADEUS_COMMANDS.SIGN_OUT.pattern.test(upper)) {
      return handleAmadeusSignOut(state);
    }

    if (AMADEUS_COMMANDS.SESSION_DISPLAY.pattern.test(upper)) {
      return handleAmadeusSessionDisplay(state);
    }

    if (AMADEUS_COMMANDS.HELP.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.HELP.pattern)!;
      return handleAmadeusHelp(m[1], state);
    }

    if (AMADEUS_COMMANDS.MOVE_DOWN.pattern.test(upper)) {
      return handleAmadeusMovePage('DOWN', state, store);
    }

    if (AMADEUS_COMMANDS.MOVE_UP.pattern.test(upper)) {
      return handleAmadeusMovePage('UP', state, store);
    }

    if (AMADEUS_COMMANDS.MOVE_TOP.pattern.test(upper)) {
      return handleAmadeusMovePage('TOP', state, store);
    }

    if (AMADEUS_COMMANDS.MOVE_NEXT_DAY.pattern.test(upper)) {
      return handleAmadeusMoveDay('NEXT', state, store);
    }

    if (AMADEUS_COMMANDS.MOVE_PREV_DAY.pattern.test(upper)) {
      return handleAmadeusMoveDay('PREV', state, store);
    }

    // ─── Encode / Decode ──────────────────────────────────────
    if (AMADEUS_COMMANDS.ENCODE_CITY.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.ENCODE_CITY.pattern)!;
      return handleAmadeusEncodeCity(m[1], state, store);
    }

    if (AMADEUS_COMMANDS.DECODE_AIRPORT.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.DECODE_AIRPORT.pattern)!;
      return handleAmadeusDecodeAirport(m[1], state, store);
    }

    if (AMADEUS_COMMANDS.AIRLINE_ENCODE_DECODE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.AIRLINE_ENCODE_DECODE.pattern)!;
      return handleAmadeusAirlineEncodeDecode(m[1], state, store);
    }

    if (AMADEUS_COMMANDS.COUNTRY_ENCODE_DECODE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.COUNTRY_ENCODE_DECODE.pattern)!;
      return handleAmadeusCountryEncodeDecode(m[1], state);
    }

    if (AMADEUS_COMMANDS.EQUIPMENT_ENCODE_DECODE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.EQUIPMENT_ENCODE_DECODE.pattern)!;
      return handleAmadeusEquipmentEncodeDecode(m[1], state);
    }

    if (AMADEUS_COMMANDS.CAR_VENDOR_ENCODE_DECODE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.CAR_VENDOR_ENCODE_DECODE.pattern)!;
      return handleAmadeusCarVendorEncodeDecode(m[1], state);
    }

    if (AMADEUS_COMMANDS.HOTEL_CHAIN_ENCODE_DECODE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.HOTEL_CHAIN_ENCODE_DECODE.pattern)!;
      return handleAmadeusHotelChainEncodeDecode(m[1], state);
    }

    // ─── Availability & Schedules ─────────────────────────────
    // Return Availability (ACR / AR) - matched BEFORE AC to avoid prefix collision
    const returnCmdCodes = AMADEUS_RETURN_AVAILABILITY_CONFIG.commands.map((c) => c.code);
    const returnPattern = new RegExp(`^(?:${returnCmdCodes.join('|')})(?:\\s*(.*))?$`, 'i');
    if (returnPattern.test(upper)) {
      return handleAmadeusAvailabilityReturn(input, state, store);
    }

    if (upper.startsWith('AC')) {
      return handleAmadeusAvailabilityChange(upper, state, store);
    }

    if (/^(AN|AD|AE|AA|SN|TN)/.test(upper)) {
      return handleAmadeusAvailability(upper, state, store);
    }

    // ─── Sell ─────────────────────────────────────────────────
    // Short sell: SS1Y1 or SS 1 Y 1
    const shortSellMatch = upper.match(AMADEUS_COMMANDS.SELL_SHORT.pattern);
    if (shortSellMatch) {
      const numSeats = parseInt(shortSellMatch[1], 10);
      const classCode = shortSellMatch[2];
      const lineNum = parseInt(shortSellMatch[3], 10);
      return handleAmadeusSellShort(numSeats, classCode, lineNum, state, store);
    }

    // Long sell: SSAI101Y15MARBOMDEL1
    const longSellMatch = upper.match(AMADEUS_COMMANDS.SELL_LONG.pattern);
    if (longSellMatch) {
      const airline = longSellMatch[1];
      const flt = parseInt(longSellMatch[2], 10);
      const cls = longSellMatch[3];
      const dateStr = longSellMatch[4];
      const orig = longSellMatch[5];
      const dest = longSellMatch[6];
      const seats = parseInt(longSellMatch[7], 10);
      return handleAmadeusSellLong(airline, flt, cls, dateStr, orig, dest, seats, state, store);
    }

    // ─── PNR Elements ─────────────────────────────────────────
    if (AMADEUS_COMMANDS.NAME.pattern.test(upper)) {
      return handleAmadeusName(upper, state);
    }

    if (AMADEUS_COMMANDS.SR_CTCM.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SR_CTCM.pattern)!;
      return handleAmadeusServiceRequest('CTCM', m[1], state);
    }

    if (AMADEUS_COMMANDS.SR_CTCE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SR_CTCE.pattern)!;
      return handleAmadeusServiceRequest('CTCE', m[1], state);
    }

    if (AMADEUS_COMMANDS.SSR_GENERAL.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SSR_GENERAL.pattern)!;
      return handleAmadeusServiceRequest('SR', m[1], state);
    }

    if (AMADEUS_COMMANDS.OSI.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.OSI.pattern)!;
      return handleAmadeusServiceRequest('OS', m[1], state);
    }

    if (AMADEUS_COMMANDS.FFN.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.FFN.pattern)!;
      return handleAmadeusServiceRequest('FFN', `${m[1]}-${m[2]}`, state);
    }

    if (AMADEUS_COMMANDS.PHONE_MOBILE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.PHONE_MOBILE.pattern)!;
      return handleAmadeusContact('MOBILE', m[1], state);
    }

    if (AMADEUS_COMMANDS.EMAIL.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.EMAIL.pattern)!;
      return handleAmadeusContact('EMAIL', m[1], state);
    }

    if (AMADEUS_COMMANDS.PHONE_GENERAL.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.PHONE_GENERAL.pattern)!;
      return handleAmadeusContact('PHONE', m[1], state);
    }

    if (AMADEUS_COMMANDS.TICKETING_OK.pattern.test(upper)) {
      return handleAmadeusTicketing('OK', '', state);
    }

    if (AMADEUS_COMMANDS.TICKETING_TIME_LIMIT.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.TICKETING_TIME_LIMIT.pattern)!;
      return handleAmadeusTicketing('TL', m[1], state);
    }

    if (AMADEUS_COMMANDS.RECEIVED_FROM.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.RECEIVED_FROM.pattern)!;
      return handleAmadeusReceivedFrom(m[1], state);
    }

    // ─── End Transaction & Retrieve ───────────────────────────
    if (AMADEUS_COMMANDS.END_RETRIEVE.pattern.test(upper)) {
      return handleAmadeusEndTransaction('ER', state, store);
    }

    if (AMADEUS_COMMANDS.END_TRANSACTION.pattern.test(upper)) {
      return handleAmadeusEndTransaction('ET', state, store);
    }

    if (AMADEUS_COMMANDS.IGNORE.pattern.test(upper)) {
      return handleAmadeusIgnore(state);
    }

    if (AMADEUS_COMMANDS.IGNORE_RETRIEVE.pattern.test(upper)) {
      return handleAmadeusIgnoreRetrieve(state, store);
    }

    if (AMADEUS_COMMANDS.RETRIEVE.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.RETRIEVE.pattern)!;
      return handleAmadeusRetrieve(m[1], state, store);
    }

    // ─── Modifications ────────────────────────────────────────
    if (AMADEUS_COMMANDS.CANCEL_ELEMENT.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.CANCEL_ELEMENT.pattern)!;
      return handleAmadeusCancelElement(m[1], state);
    }

    if (AMADEUS_COMMANDS.CANCEL_ITINERARY.pattern.test(upper)) {
      return handleAmadeusCancelItinerary(state);
    }

    if (AMADEUS_COMMANDS.REBOOK_SEGMENT.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.REBOOK_SEGMENT.pattern)!;
      return handleAmadeusRebookSegment(m[1], state, store);
    }

    if (AMADEUS_COMMANDS.SPLIT_PNR.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SPLIT_PNR.pattern)!;
      return handleAmadeusSplitPnr(m[1], state, store);
    }

    // ─── Pricing ──────────────────────────────────────────────
    if (AMADEUS_COMMANDS.PRICE_TST.pattern.test(upper)) {
      return handleAmadeusPriceTst(state, store);
    }

    if (AMADEUS_COMMANDS.PRICE_INFORMATIVE.pattern.test(upper)) {
      return handleAmadeusPriceInformative(state);
    }

    if (AMADEUS_COMMANDS.PRICE_BEST_DISPLAY.pattern.test(upper)) {
      return handleAmadeusBestPricerDisplay(state);
    }

    if (AMADEUS_COMMANDS.PRICE_BEST_REBOOK.pattern.test(upper)) {
      return handleAmadeusBestPricerRebook(state);
    }

    if (AMADEUS_COMMANDS.FARE_QUOTE_DISPLAY.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.FARE_QUOTE_DISPLAY.pattern)!;
      return handleAmadeusFareQuoteDisplay(m[1], state);
    }

    if (AMADEUS_COMMANDS.FARE_QUOTE_NOTES.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.FARE_QUOTE_NOTES.pattern)!;
      return handleAmadeusFareNotes(parseInt(m[1], 10), state);
    }

    // ─── Ticketing ────────────────────────────────────────────
    if (AMADEUS_COMMANDS.ISSUE_TICKETS_RT.pattern.test(upper)) {
      return handleAmadeusIssueTickets(true, state, store);
    }

    if (AMADEUS_COMMANDS.ISSUE_TICKETS.pattern.test(upper)) {
      return handleAmadeusIssueTickets(false, state, store);
    }

    if (AMADEUS_COMMANDS.COMMISSION.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.COMMISSION.pattern)!;
      return handleAmadeusCommission(m[1], state);
    }

    if (AMADEUS_COMMANDS.FORM_OF_PAYMENT.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.FORM_OF_PAYMENT.pattern)!;
      return handleAmadeusFormOfPayment(m[1], state);
    }

    if (AMADEUS_COMMANDS.VALIDATING_CARRIER.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.VALIDATING_CARRIER.pattern)!;
      return handleAmadeusValidatingCarrier(m[1], state);
    }

    if (AMADEUS_COMMANDS.DISPLAY_ETICKET.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.DISPLAY_ETICKET.pattern)!;
      return handleAmadeusDisplayETicket(m[1], state, store);
    }

    // ─── Seats (Tier 2) ───────────────────────────────────────
    if (AMADEUS_COMMANDS.SEAT_MAP.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SEAT_MAP.pattern)!;
      return handleAmadeusSeatMap(parseInt(m[1], 10), state);
    }

    if (AMADEUS_COMMANDS.SEAT_ASSIGN.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SEAT_ASSIGN.pattern)!;
      return handleAmadeusSeatAssign(m[1], state);
    }

    if (AMADEUS_COMMANDS.SEAT_CANCEL.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.SEAT_CANCEL.pattern)!;
      return handleAmadeusSeatCancel(m[1] || '', state);
    }

    // ─── Queues (Tier 2) ──────────────────────────────────────
    if (AMADEUS_COMMANDS.QUEUE_COUNT.pattern.test(upper)) {
      return handleAmadeusQueueCount(state, store);
    }

    if (AMADEUS_COMMANDS.QUEUE_START.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.QUEUE_START.pattern)!;
      return handleAmadeusQueueStart(parseInt(m[1], 10), state, store);
    }

    if (AMADEUS_COMMANDS.QUEUE_NEXT.pattern.test(upper)) {
      return handleAmadeusQueueNext(state, store);
    }

    if (AMADEUS_COMMANDS.QUEUE_IGNORE.pattern.test(upper)) {
      return handleAmadeusQueueIgnore(state);
    }

    if (AMADEUS_COMMANDS.QUEUE_FINISH.pattern.test(upper)) {
      return handleAmadeusQueueFinish(state, store);
    }

    // ─── Hotels & Cars (Tier 2) ───────────────────────────────
    if (AMADEUS_COMMANDS.HOTEL_LIST.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.HOTEL_LIST.pattern)!;
      return handleAmadeusHotelList(m[1], state, store);
    }

    if (AMADEUS_COMMANDS.HOTEL_AVAIL.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.HOTEL_AVAIL.pattern)!;
      return handleAmadeusHotelAvailability(`${m[1]}${m[2]}`, state, store);
    }

    if (AMADEUS_COMMANDS.HOTEL_SELL.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.HOTEL_SELL.pattern)!;
      return handleAmadeusHotelSell(parseInt(m[1], 10), state);
    }

    if (AMADEUS_COMMANDS.CAR_LIST.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.CAR_LIST.pattern)!;
      return handleAmadeusCarLocationList(m[1], state, store);
    }

    if (AMADEUS_COMMANDS.CAR_AVAIL.pattern.test(upper)) {
      const m = upper.match(AMADEUS_COMMANDS.CAR_AVAIL.pattern)!;
      return handleAmadeusCarAvailability(`${m[1]}${m[2]}`, state, store);
    }

    // ─── Tier 3 Fallback ──────────────────────────────────────
    for (const prefix of TIER_3_PREFIXES) {
      if (upper.startsWith(prefix)) {
        return {
          output: `COMMAND RECOGNISED - NOT YET SIMULATED: ${upper}\nThis command is planned for a future update.`,
          newState: state,
        };
      }
    }

    return {
      output: `INVALID ENTRY: "${input}"\nEnter HELP for Amadeus command reference or SET SABRE to switch back.`,
      newState: state,
    };
  }
}
