import type { Dialect } from './interface';
import type { SessionState, CommandResult, DataStore } from '../types';
import { SABRE_COMMANDS } from '../command-config';
import { handleSignIn, handleSignOut } from './sabre-commands/sign-in';
import { handleHelp } from './sabre-commands/help';
import { handleAvailability } from './sabre-commands/availability';
import { handleSellFromAvail, handleDirectSell } from './sabre-commands/sell';
import { handleName } from './sabre-commands/name';
import { handlePhone } from './sabre-commands/phone';
import { handleTicketing } from './sabre-commands/ticketing';
import { handleReceivedFrom } from './sabre-commands/received-from';
import { handleEndTransaction } from './sabre-commands/end-transaction';
import {
  handleRetrievePnr,
  handleDisplayAll,
  handleDisplayItinerary,
  handleDisplayNames,
} from './sabre-commands/retrieve';
import {
  handleIgnore,
  handleCancelItinerary,
  handleCancelSegment,
} from './sabre-commands/cancel';
import { handlePricing } from './sabre-commands/pricing';
import {
  handleEncodeCity,
  handleDecodeAirport,
  handleEncodeAirline,
} from './sabre-commands/encode-decode';

export class SabreDialect implements Dialect {
  readonly name = 'sabre';

  execute(rawInput: string, state: SessionState, store: DataStore): CommandResult {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { output: '', newState: state };
    }

    // Check for command stacking using delimiter '¥'
    if (trimmed.includes('¥')) {
      const parts = trimmed.split('¥');
      let currentState = state;
      const outputs: string[] = [];

      for (const part of parts) {
        const subInput = part.trim();
        if (!subInput) continue;

        const res = this.executeSingle(subInput, currentState, store);
        outputs.push(res.output);
        currentState = res.newState;

        if (
          res.output.startsWith('CHECK FORMAT') ||
          res.output.startsWith('SIGN IN REQUIRED') ||
          res.output.startsWith('NEED ') ||
          res.output.startsWith('NO ') ||
          res.output.startsWith('INVALID ') ||
          res.output.startsWith('ERROR')
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

  private executeSingle(rawInput: string, state: SessionState, store: DataStore): CommandResult {
    const input = rawInput.trim().toUpperCase();

    // Empty input
    if (!input) {
      return { output: '', newState: state };
    }

    // Dialect switching commands
    if (
      input === 'SET AMADEUS' ||
      input === 'DIALECT AMADEUS' ||
      input === 'SET DIALECT AMADEUS'
    ) {
      return {
        output: 'DIALECT SWITCHED TO AMADEUS',
        newState: {
          ...state,
          dialect: 'amadeus',
        },
      };
    }

    if (
      input === 'SET SABRE' ||
      input === 'DIALECT SABRE' ||
      input === 'SET DIALECT SABRE'
    ) {
      return {
        output: 'DIALECT IS ALREADY SABRE',
        newState: state,
      };
    }

    // Help
    if (SABRE_COMMANDS.HELP.pattern.test(input)) {
      return handleHelp(state);
    }

    // Sign in / Sign out
    const signInMatch = input.match(SABRE_COMMANDS.SIGN_IN.pattern);
    if (signInMatch) {
      return handleSignIn(signInMatch, state, store);
    }

    if (SABRE_COMMANDS.SIGN_OUT.pattern.test(input)) {
      return handleSignOut(state);
    }

    // Encode / Decode commands (can be run without signing in)
    const danMatch = input.match(SABRE_COMMANDS.ENCODE_CITY.pattern);
    if (danMatch) {
      return handleEncodeCity(danMatch[1], state, store);
    }

    const dacMatch = input.match(SABRE_COMMANDS.DECODE_AIRPORT.pattern);
    if (dacMatch) {
      return handleDecodeAirport(dacMatch[1], state, store);
    }

    const wAirlineMatch = input.match(SABRE_COMMANDS.ENCODE_AIRLINE.pattern);
    if (wAirlineMatch) {
      return handleEncodeAirline(wAirlineMatch[1], state, store);
    }

    // Sign-in gate for transactional commands
    if (!state.signedIn) {
      return {
        output: 'SIGN IN REQUIRED - ENTER SI*<AGENT-ID> (E.G. SI*7890)',
        newState: state,
      };
    }

    // Availability: 1LOSLHR15NOV
    const availCityDateMatch = input.match(SABRE_COMMANDS.AVAILABILITY_CITY_DATE.pattern);
    if (availCityDateMatch) {
      return handleAvailability(
        availCityDateMatch[1],
        availCityDateMatch[2],
        availCityDateMatch[3],
        state,
        store
      );
    }

    // Availability: 115NOVLOSLHR
    const availDateCityMatch = input.match(SABRE_COMMANDS.AVAILABILITY_DATE_CITY.pattern);
    if (availDateCityMatch) {
      return handleAvailability(
        availDateCityMatch[2],
        availDateCityMatch[3],
        availDateCityMatch[1],
        state,
        store
      );
    }

    // Sell from availability: 01Y1
    const sellAvailMatch = input.match(SABRE_COMMANDS.SELL_FROM_AVAIL.pattern);
    if (sellAvailMatch) {
      return handleSellFromAvail(
        parseInt(sellAvailMatch[1], 10),
        sellAvailMatch[2],
        parseInt(sellAvailMatch[3], 10),
        state,
        store
      );
    }

    // Direct sell: 0W3501Y15NOVLOSLHR1
    const directSellMatch = input.match(SABRE_COMMANDS.DIRECT_SELL.pattern);
    if (directSellMatch) {
      return handleDirectSell(
        directSellMatch[1],
        parseInt(directSellMatch[2], 10),
        directSellMatch[3],
        directSellMatch[4],
        directSellMatch[5],
        directSellMatch[6],
        parseInt(directSellMatch[7], 10),
        state,
        store
      );
    }

    // Passenger Name: -SMITH/JOHN MR
    const nameMatch = input.match(SABRE_COMMANDS.NAME_ENTRY.pattern);
    if (nameMatch) {
      return handleName(nameMatch[1], state);
    }

    // Phone: 9234-555-1234-A
    const phoneMatch = input.match(SABRE_COMMANDS.PHONE.pattern);
    if (phoneMatch) {
      return handlePhone(phoneMatch[1], state);
    }

    // Ticketing: 7TAW/ or 7TAW/25OCT
    const ticketingMatch = input.match(SABRE_COMMANDS.TICKETING.pattern);
    if (ticketingMatch) {
      return handleTicketing(ticketingMatch[1], state);
    }

    // Received From: 6SMITH
    const rfMatch = input.match(SABRE_COMMANDS.RECEIVED_FROM.pattern);
    if (rfMatch) {
      return handleReceivedFrom(rfMatch[1], state);
    }

    // End Transaction: E / ER
    if (SABRE_COMMANDS.END_AND_RETRIEVE.pattern.test(input)) {
      return handleEndTransaction(true, state, store);
    }
    if (SABRE_COMMANDS.END_TRANSACTION.pattern.test(input)) {
      return handleEndTransaction(false, state, store);
    }

    // Retrieve PNR: *ABCDEF
    const retrieveMatch = input.match(SABRE_COMMANDS.RETRIEVE_PNR.pattern);
    if (retrieveMatch) {
      return handleRetrievePnr(retrieveMatch[1], state, store);
    }

    // Display commands: *A, *I, *N
    if (SABRE_COMMANDS.DISPLAY_ALL.pattern.test(input)) {
      return handleDisplayAll(state, store);
    }
    if (SABRE_COMMANDS.DISPLAY_ITINERARY.pattern.test(input)) {
      return handleDisplayItinerary(state, store);
    }
    if (SABRE_COMMANDS.DISPLAY_NAMES.pattern.test(input)) {
      return handleDisplayNames(state, store);
    }

    // Cancel commands: I, XI, X<n>
    if (SABRE_COMMANDS.IGNORE.pattern.test(input)) {
      return handleIgnore(state);
    }
    if (SABRE_COMMANDS.CANCEL_ITINERARY.pattern.test(input)) {
      return handleCancelItinerary(state, store);
    }
    const cancelSegMatch = input.match(SABRE_COMMANDS.CANCEL_SEGMENT.pattern);
    if (cancelSegMatch) {
      return handleCancelSegment(parseInt(cancelSegMatch[1], 10), state, store);
    }

    // Pricing: WP, WPNC
    if (SABRE_COMMANDS.PRICE_NO_COMMISSION.pattern.test(input)) {
      return handlePricing(true, state, store);
    }
    if (SABRE_COMMANDS.PRICE_ITINERARY.pattern.test(input)) {
      return handlePricing(false, state, store);
    }

    // Unrecognized command
    return {
      output: 'CHECK FORMAT',
      newState: state,
    };
  }
}
