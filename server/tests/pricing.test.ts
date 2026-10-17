import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handlePricing } from '../src/command-engine/dialects/sabre-commands/pricing';
import { createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore } from '../src/command-engine/types';

describe('Pricing Command (WP / WPNC)', () => {
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

  it('prices valid flight class using pricing-config.json', () => {
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

    const result = handlePricing(false, state, store);

    expect(result.output).toContain('WP');
    expect(result.output).toContain('BASE FARE');
    expect(result.output).toContain('TAXES/FEES/CHARGES');
    expect(result.output).toContain('NGN');
    expect(result.output).toContain('YQ');
    expect(result.output).toContain('ADT-01');
  });

  it('rejects pricing for a class code that does NOT exist on the flight', () => {
    let state = createInitialSessionState();
    state.workingPnr = {
      passengers: [{ lastName: 'SMITH', firstName: 'JOHN', title: 'MR', paxType: 'ADT' }],
      segments: [
        {
          airlineCode: 'W3',
          flightNumber: 101,
          classCode: 'Z', // Z does not exist on W3 101
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

    const result = handlePricing(false, state, store);
    expect(result.output).toContain('CLASS Z NOT APPLICABLE FOR PRICING');
  });

  it('handles WPNC with no commission note', () => {
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

    const result = handlePricing(true, state, store);
    expect(result.output).toContain('WPNC');
    expect(result.output).toContain('NO COMMISSION RECORD FOUND');
  });
});
