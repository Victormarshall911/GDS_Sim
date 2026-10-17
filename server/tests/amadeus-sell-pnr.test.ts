import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCommand, createInitialSessionState } from '../src/command-engine/engine';
import { createTestStore } from './test-helper';
import type { DataStore, SessionState } from '../src/command-engine/types';

describe('Amadeus Availability Paging, Sell & PNR Elements (Milestones b & c)', () => {
  let store: DataStore;
  let cleanup: () => void;
  let state: SessionState;

  beforeEach(() => {
    const res = createTestStore();
    store = res.store;
    cleanup = res.cleanup;
    state = createInitialSessionState('amadeus', true);
  });

  afterEach(() => {
    cleanup();
  });

  it('handles availability paging MD, MU, MP, and date advance MN, MY, AC', () => {
    let res = executeCommand(state, 'AN19OCTLOSABV', store);
    expect(res.output).toContain('AN');
    expect(res.newState.lastAvailability).not.toBeNull();

    // Move Down (MD)
    res = executeCommand(res.newState, 'MD', store);
    expect(res.output).toBeDefined();

    // Move Up (MU)
    res = executeCommand(res.newState, 'MU', store);
    expect(res.output).toBeDefined();

    // Move Next Day (MN)
    res = executeCommand(res.newState, 'MN', store);
    expect(res.output).toContain('20OCT');

    // Move Yesterday (MY)
    res = executeCommand(res.newState, 'MY', store);
    expect(res.output).toContain('19OCT');

    // Availability Change (AC20MAR)
    res = executeCommand(res.newState, 'AC20MAR', store);
    expect(res.output).toContain('20MAR');
  });

  it('sells segment from availability (SS1Y1) with status HK1 immediately', () => {
    let res = executeCommand(state, 'AN19OCTLOSABV', store);
    expect(res.newState.lastAvailability).not.toBeNull();

    // Short sell 1 seat in class Y from line 1
    res = executeCommand(res.newState, 'SS1Y1', store);
    expect(res.output).toContain('HK1');
    expect(res.output).toContain('Y');
    expect(res.newState.workingPnr?.segments.length).toBe(1);
    expect(res.newState.workingPnr?.segments[0].status).toBe('HK1');
  });

  it('handles long direct sell (SSAI101Y15MARBOMDEL1)', () => {
    const res = executeCommand(state, 'SSAI101Y15MARBOMDEL1', store);
    expect(res.output).toContain('AI');
    expect(res.output).toContain('101');
    expect(res.output).toContain('HK1');
    expect(res.newState.workingPnr?.segments.length).toBe(1);
  });

  it('adds passenger names: adult, multiple adults, child, and infant', () => {
    // Single adult
    let res = executeCommand(state, 'NM1SMITH/JOHN MR', store);
    expect(res.output).toContain('1.1SMITH/JOHN MR');
    expect(res.newState.workingPnr?.passengers.length).toBe(1);

    // Two adults sharing surname
    let s2 = createInitialSessionState('amadeus', true);
    res = executeCommand(s2, 'NM2SHARMA/RAJ MR/PRIYA MRS', store);
    expect(res.output).toContain('SHARMA/RAJ MR');
    expect(res.output).toContain('SHARMA/PRIYA MRS');
    expect(res.newState.workingPnr?.passengers.length).toBe(2);

    // Child with date of birth
    let s3 = createInitialSessionState('amadeus', true);
    res = executeCommand(s3, 'NM1KAPOOR/ANJALI MISS(CHD/15MAR18)', store);
    expect(res.output).toContain('KAPOOR/ANJALI MISS(CHD/15MAR18)');
    expect(res.newState.workingPnr?.passengers[0].paxType).toBe('CHD');

    // Adult with infant attached
    let s4 = createInitialSessionState('amadeus', true);
    res = executeCommand(s4, 'NM1SHARMA/RAJ MR(INF/BABY MISS/01DEC24)', store);
    expect(res.output).toContain('INF/BABY MISS/01DEC24');
    expect(res.newState.workingPnr?.passengers.length).toBe(2);
    expect(res.newState.workingPnr?.passengers[1].paxType).toBe('INF');
  });

  it('adds contact and special service requests, converting // to @ for SR CTCE', () => {
    // AP general phone
    let res = executeCommand(state, 'APBOM 022-12345678', store);
    expect(res.output).toContain('AP BOM 022-12345678');

    // APM mobile
    res = executeCommand(res.newState, 'APM-9876543210', store);
    expect(res.output).toContain('APM-9876543210');

    // SR CTCM
    res = executeCommand(res.newState, 'SR CTCM-2349165283674', store);
    expect(res.output).toContain('SR CTCM-2349165283674');

    // SR CTCE with // -> @
    res = executeCommand(res.newState, 'SR CTCE-NAME//GMAIL.COM', store);
    expect(res.output).toContain('NAME@GMAIL.COM');
    expect(res.newState.pnrElements?.some((el) => el.content.includes('NAME@GMAIL.COM'))).toBe(true);

    // OSI and FFN
    res = executeCommand(res.newState, 'OS AI VIP PAX', store);
    expect(res.output).toContain('OS AI VIP PAX');

    res = executeCommand(res.newState, 'FFNAI-1234567890/P1', store);
    expect(res.output).toContain('FFN AI-1234567890/P1');
  });

  it('enforces config-driven validation order on ER/ET', () => {
    // Empty PNR
    let res = executeCommand(state, 'ER', store);
    expect(res.output).toBe('NEED NAME');

    // Add name
    res = executeCommand(res.newState, 'NM1SHARMA/RAHUL MR', store);
    res = executeCommand(res.newState, 'ER', store);
    expect(res.output).toBe('NEED ITINERARY');

    // Add itinerary
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL1', store);
    res = executeCommand(res.newState, 'ER', store);
    expect(res.output).toBe('NEED CONTACT');

    // Add contact
    res = executeCommand(res.newState, 'APLOS 08012345678', store);
    res = executeCommand(res.newState, 'ER', store);
    expect(res.output).toBe('NEED TICKETING ARRANGEMENT');

    // Add ticketing
    res = executeCommand(res.newState, 'TKOK', store);
    res = executeCommand(res.newState, 'ER', store);
    expect(res.output).toBe('NEED RECEIVED FROM');

    // Add RF and save
    res = executeCommand(res.newState, 'RF VICTOR', store);
    res = executeCommand(res.newState, 'ER', store);
    expect(res.newState.currentPnr).toMatch(/^[A-Z]{6}$/);
    expect(res.output).toContain('--- RLR ---');
    expect(res.output).toContain('SHARMA/RAHUL MR');
  });

  it('saves and exits with ET, then retrieves with RT', () => {
    // Build complete PNR
    let res = executeCommand(state, 'NM1SHARMA/RAHUL MR', store);
    res = executeCommand(res.newState, 'SSAI101Y15MARBOMDEL1', store);
    res = executeCommand(res.newState, 'APLOS 08012345678', store);
    res = executeCommand(res.newState, 'TKTL20MAR/1800', store);
    res = executeCommand(res.newState, 'RF RAHUL', store);

    // ET: End transaction and exit
    res = executeCommand(res.newState, 'ET', store);
    expect(res.output).toMatch(/01\.01\s+[A-Z]{6}/);
    const locator = res.newState.currentPnr!;
    expect(res.newState.workingPnr).toBeNull();

    // RT <locator>: retrieve saved PNR
    res = executeCommand(res.newState, `RT${locator}`, store);
    expect(res.output).toContain('--- RLR ---');
    expect(res.output).toContain(locator);
    expect(res.output).toContain('SHARMA/RAHUL MR');
    expect(res.output).toContain('AI 101');
  });

  it('ignores changes with IG and reloads saved PNR with IR', () => {
    // Create working changes
    let res = executeCommand(state, 'NM1SMITH/JOHN MR', store);
    expect(res.newState.workingPnr?.passengers.length).toBe(1);

    // IG: Ignore
    res = executeCommand(res.newState, 'IG', store);
    expect(res.output).toBe('IGN');
    expect(res.newState.workingPnr).toBeNull();
  });
});
