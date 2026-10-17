import { SCENARIOS } from './scenarios';
import type { SessionState, DataStore } from '../command-engine/types';

export interface CheckResult {
  scenarioId: string;
  scenarioTitle: string;
  score: number;
  passed: boolean;
  feedback: string[];
  recordLocator: string | null;
}

export function checkScenario(
  scenarioId: string,
  state: SessionState,
  store: DataStore,
  sessionId: string = 'session-default'
): CheckResult {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    return {
      scenarioId,
      scenarioTitle: 'Unknown Scenario',
      score: 0,
      passed: false,
      feedback: ['Scenario not found.'],
      recordLocator: null,
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Check 1: Agent signed in
  if (state.signedIn && state.agentId) {
    score += 10;
    feedback.push(`✓ Signed in as agent ${state.agentId} (+10)`);
  } else {
    feedback.push('✗ Agent is not signed in. Use SI*<ID> (e.g. SI*7890)');
  }

  // Retrieve PNR data: either saved in currentPnr or in workingPnr
  let passengers = state.workingPnr?.passengers ?? [];
  let segments = state.workingPnr?.segments ?? [];
  let phone = state.workingPnr?.phone ?? null;
  let ticketing = state.workingPnr?.ticketing ?? null;
  let receivedFrom = state.workingPnr?.receivedFrom ?? null;
  let locator = state.currentPnr;

  if (state.currentPnr) {
    const saved = store.getPnr(state.currentPnr);
    if (saved) {
      passengers = saved.passengers.map((p) => ({
        lastName: p.last_name,
        firstName: p.first_name,
        title: p.title,
        paxType: p.pax_type,
        dob: p.dob,
      }));
      segments = saved.segments.map((s) => ({
        airlineCode: s.airline_code,
        flightNumber: s.flight_number,
        classCode: s.class_code,
        travelDate: s.travel_date,
        origin: s.origin,
        destination: s.destination,
        departureTime: s.departure_time,
        arrivalTime: s.arrival_time,
        status: s.status,
        numSeats: s.num_seats,
        aircraft: s.aircraft,
      }));
      phone = saved.phone;
      ticketing = saved.ticketing;
      receivedFrom = saved.received_from;
    }
  }

  // Check 2: Itinerary segments
  const hasOutbound = segments.some(
    (s) =>
      s.origin === scenario.expectedRoute.origin &&
      s.destination === scenario.expectedRoute.destination &&
      (!scenario.expectedRoute.classCode || s.classCode === scenario.expectedRoute.classCode) &&
      (!scenario.expectedRoute.airlineCode || s.airlineCode === scenario.expectedRoute.airlineCode)
  );

  if (hasOutbound) {
    score += 25;
    feedback.push(
      `✓ Correct outbound route booked (${scenario.expectedRoute.origin}-${scenario.expectedRoute.destination}) (+25)`
    );
  } else {
    feedback.push(
      `✗ Missing or incorrect flight segment for ${scenario.expectedRoute.origin} to ${scenario.expectedRoute.destination}`
    );
  }

  if (scenario.expectedRoute.returnLeg) {
    const hasReturn = segments.some(
      (s) =>
        s.origin === scenario.expectedRoute.returnLeg?.origin &&
        s.destination === scenario.expectedRoute.returnLeg?.destination
    );
    if (hasReturn) {
      score += 15;
      feedback.push(
        `✓ Return segment booked (${scenario.expectedRoute.returnLeg.origin}-${scenario.expectedRoute.returnLeg.destination}) (+15)`
      );
    } else {
      feedback.push(
        `✗ Missing return flight segment ${scenario.expectedRoute.returnLeg.origin} to ${scenario.expectedRoute.returnLeg.destination}`
      );
    }
  } else {
    score += 5; // Bonus for one-way scenario
  }

  // Check 3: Passengers
  if (passengers.length >= scenario.expectedPax.count) {
    score += 20;
    feedback.push(`✓ Passenger count matches requirement (${passengers.length} pax) (+20)`);

    // Verify types (e.g. CHD if expected)
    const hasNeededTypes = scenario.expectedPax.types.every((t) =>
      passengers.some((p) => p.paxType === t)
    );
    if (hasNeededTypes) {
      score += 10;
      feedback.push(`✓ Passenger passenger types match (ADT/CHD) (+10)`);
    } else {
      feedback.push('✗ Missing required passenger type (check Child CHD or Infant INF syntax)');
    }
  } else {
    feedback.push(
      `✗ Insufficient passengers: expected ${scenario.expectedPax.count}, found ${passengers.length}`
    );
  }

  // Check 4: Mandatory fields
  if (phone) {
    score += 5;
    feedback.push(`✓ Phone field present (${phone}) (+5)`);
  } else {
    feedback.push('✗ Missing phone field (use 9<PHONE>)');
  }

  if (ticketing) {
    score += 5;
    feedback.push(`✓ Ticketing arrangement present (${ticketing}) (+5)`);
  } else {
    feedback.push('✗ Missing ticketing field (use 7TAW/)');
  }

  if (receivedFrom) {
    score += 5;
    feedback.push(`✓ Received from present (${receivedFrom}) (+5)`);
  } else {
    feedback.push('✗ Missing received from field (use 6<NAME>)');
  }

  // Check 5: Transaction ended & saved
  if (locator) {
    score += 15;
    feedback.push(`✓ PNR ended and saved with Record Locator: ${locator} (+15)`);
  } else {
    feedback.push('✗ PNR has not been finalized. Run E or ER to save.');
  }

  const passed = score >= 80;
  feedback.unshift(
    passed
      ? `PASSED! Score: ${score}/100. Excellent booking execution.`
      : `ATTEMPT COMPLETED. Score: ${score}/100. Review items below to achieve passing score (80+).`
  );

  // Record attempt in database
  store.savePracticeAttempt(
    sessionId,
    scenarioId,
    score,
    feedback.slice(1).join(' | ')
  );

  return {
    scenarioId,
    scenarioTitle: scenario.title,
    score,
    passed,
    feedback,
    recordLocator: locator,
  };
}
