import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleIgnore, handleCancelItinerary, handleCancelSegment } from '../src/command-engine/dialects/sabre-commands/cancel';
import { createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore } from '../src/command-engine/types';

describe('Cancel & Ignore Commands (I, XI, X1)', () => {
  let store: DataStore;
  let cleanup: () => void;

  beforeEach(() => {
    const res = createTestStore();
    store = res.store;
    cleanup = res.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('I wipes working PNR completely without saving to database', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [{ lastName: 'TEST', firstName: 'USER', title: 'MR', paxType: 'ADT' }],
      segments: [
        {
          airlineCode: 'W3',
          flightNumber: 101,
          classCode: 'Y',
          travelDate: '2026-11-15',
          origin: 'LOS',
          destination: 'LHR',
          departureTime: '08:30',
          arrivalTime: '14:45',
          status: 'SS',
          numSeats: 1,
        },
      ],
      phone: '234-111',
      ticketing: 'TAW/',
      receivedFrom: 'TEST',
    };

    const result = handleIgnore(state);

    expect(result.output).toBe('IGNORED');
    expect(result.newState.workingPnr).toBeNull();
    expect(result.newState.currentPnr).toBeNull();
  });

  it('XI cancels entire itinerary in working PNR', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [{ lastName: 'TEST', firstName: 'USER', title: 'MR', paxType: 'ADT' }],
      segments: [
        {
          airlineCode: 'W3',
          flightNumber: 101,
          classCode: 'Y',
          travelDate: '2026-11-15',
          origin: 'LOS',
          destination: 'LHR',
          departureTime: '08:30',
          arrivalTime: '14:45',
          status: 'SS',
          numSeats: 1,
        },
      ],
      phone: null,
      ticketing: null,
      receivedFrom: null,
    };

    const result = handleCancelItinerary(state, store);

    expect(result.output).toBe('ITINERARY CANCELLED');
    expect(result.newState.workingPnr?.segments.length).toBe(0);
    expect(result.newState.workingPnr?.passengers.length).toBe(1); // Keeps passengers
  });

  it('X1 cancels specific segment from working PNR', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [],
      segments: [
        {
          airlineCode: 'W3',
          flightNumber: 101,
          classCode: 'Y',
          travelDate: '2026-11-15',
          origin: 'LOS',
          destination: 'LHR',
          departureTime: '08:30',
          arrivalTime: '14:45',
          status: 'SS',
          numSeats: 1,
        },
        {
          airlineCode: 'W3',
          flightNumber: 102,
          classCode: 'Y',
          travelDate: '2026-11-20',
          origin: 'LHR',
          destination: 'LOS',
          departureTime: '16:30',
          arrivalTime: '23:00',
          status: 'SS',
          numSeats: 1,
        },
      ],
      phone: null,
      ticketing: null,
      receivedFrom: null,
    };

    const result = handleCancelSegment(1, state, store);

    expect(result.output).toBe('SEGMENT 1 CANCELLED');
    expect(result.newState.workingPnr?.segments.length).toBe(1);
    expect(result.newState.workingPnr?.segments[0].flightNumber).toBe(102);
  });

  it('XI cancels itinerary in saved/retrieved PNR', () => {
    const locator = 'ABCXYZ';
    store.savePnr({
      recordLocator: locator,
      agentId: '7890',
      receivedFrom: 'TEST',
      phone: '234-111',
      ticketing: 'TAW/',
      status: 'ACTIVE',
      passengers: [{ lastName: 'TEST', firstName: 'USER', title: 'MR', paxType: 'ADT' }],
      segments: [
        {
          airlineCode: 'W3',
          flightNumber: 101,
          classCode: 'Y',
          travelDate: '2026-11-15',
          origin: 'LOS',
          destination: 'LHR',
          departureTime: '08:30',
          arrivalTime: '14:45',
          status: 'HK',
          numSeats: 1,
        },
      ],
    });

    let state = createInitialSessionState();
    state.currentPnr = locator;

    const result = handleCancelItinerary(state, store);

    expect(result.output).toContain('ITINERARY CANCELLED - PNR ABCXYZ STATUS XX');
    const updated = store.getPnr(locator);
    expect(updated?.status).toBe('CANCELLED');
    expect(updated?.segments[0].status).toBe('XX');
  });
});
