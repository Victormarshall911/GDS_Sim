import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleEndTransaction } from '../src/command-engine/dialects/sabre-commands/end-transaction';
import { createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore, SessionState } from '../src/command-engine/types';

describe('End Transaction (E / ER) Validation Order & Status Transitions', () => {
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

  it('validates 1. NEED NAME first when working PNR is empty or has no passengers', () => {
    const state = createInitialSessionState();
    const result = handleEndTransaction(false, state, store);

    expect(result.output).toBe('NEED NAME');
  });

  it('validates 2. NEED ITINERARY after name is provided but segments missing', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [{ lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
      segments: [],
      phone: null,
      ticketing: null,
      receivedFrom: null,
    };

    const result = handleEndTransaction(false, state, store);
    expect(result.output).toBe('NEED ITINERARY');
  });

  it('validates 3. NEED PHONE after name and itinerary exist but phone missing', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [{ lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
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

    const result = handleEndTransaction(false, state, store);
    expect(result.output).toBe('NEED PHONE');
  });

  it('validates 4. NEED TICKETING after name, itinerary, and phone exist but ticketing missing', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [{ lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
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
      phone: '234-555-1234-A',
      ticketing: null,
      receivedFrom: null,
    };

    const result = handleEndTransaction(false, state, store);
    expect(result.output).toBe('NEED TICKETING');
  });

  it('validates 5. NEED RECEIVED FROM after ticketing provided but received from missing', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [{ lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
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
      phone: '234-555-1234-A',
      ticketing: 'TAW/25OCT',
      receivedFrom: null,
    };

    const result = handleEndTransaction(false, state, store);
    expect(result.output).toBe('NEED RECEIVED FROM');
  });

  it('successful E converts segment status from SS to HK and saves PNR with 6-char locator', () => {
    let state = createInitialSessionState();
    state.agentId = '7890';
    state.workingPnr = {
      passengers: [{ lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
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
          status: 'SS', // Initially SS in working PNR
          numSeats: 1,
        },
      ],
      phone: '234-555-1234-A',
      ticketing: 'TAW/25OCT',
      receivedFrom: 'SMITH',
    };

    const result = handleEndTransaction(false, state, store);

    // Record locator is a 6-letter string
    expect(result.output).toMatch(/^[A-Z]{6}$/);
    const locator = result.output;

    // Working PNR cleared, currentPnr set
    expect(result.newState.workingPnr).toBeNull();
    expect(result.newState.currentPnr).toBe(locator);

    // Verify saved record in DB has HK status
    const savedPnr = store.getPnr(locator);
    expect(savedPnr).not.toBeNull();
    expect(savedPnr?.status).toBe('ACTIVE');
    expect(savedPnr?.segments.length).toBe(1);
    expect(savedPnr?.segments[0].status).toBe('HK'); // Requirement: converted from SS to HK
    expect(savedPnr?.passengers[0].last_name).toBe('SMITH');
    expect(savedPnr?.received_from).toBe('SMITH');
  });

  it('ER redisplays saved PNR with formatted details', () => {
    let state = createInitialSessionState();
    state.agentId = '7890';
    state.workingPnr = {
      passengers: [{ lastName: 'DOE', firstName: 'JANE', title: 'MRS', paxType: 'ADT' }],
      segments: [
        {
          airlineCode: 'BA',
          flightNumber: 74,
          classCode: 'Y',
          travelDate: '2026-11-15',
          origin: 'LOS',
          destination: 'LHR',
          departureTime: '22:55',
          arrivalTime: '05:25',
          status: 'SS',
          numSeats: 1,
        },
      ],
      phone: '234-555-8888-A',
      ticketing: 'TAW/',
      receivedFrom: 'DOE',
    };

    const result = handleEndTransaction(true, state, store);

    expect(result.output).toContain('DOE/JANE MRS');
    expect(result.output).toContain('BA');
    expect(result.output).toContain('HK1'); // Shows HK confirmed segment
    expect(result.output).toContain('RECEIVED FROM - DOE');
    expect(result.newState.workingPnr).toBeNull();
  });
});
