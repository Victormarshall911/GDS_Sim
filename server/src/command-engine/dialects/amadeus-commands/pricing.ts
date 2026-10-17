import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SessionState, CommandResult, DataStore, TstRecord } from '../../types';
import { formatDateSabre, formatTimeDisplay } from '../../format';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PricingConfig {
  fuelSurcharges: {
    YQ_DOMESTIC_NGN: number;
    YQ_REGIONAL_NGN: number;
    YQ_INTERNATIONAL_NGN: number;
  };
  taxes: {
    passengerServiceChargeNGN: number;
    securityChargeNGN: number;
    vatPercentage: number;
  };
  discounts: {
    ADT: number;
    CHD: number;
    INF: number;
  };
}

function loadPricingConfig(): PricingConfig {
  const configPath = path.resolve(__dirname, '../../../../pricing-config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      fuelSurcharges: {
        YQ_DOMESTIC_NGN: 25000,
        YQ_REGIONAL_NGN: 55000,
        YQ_INTERNATIONAL_NGN: 120000,
      },
      taxes: {
        passengerServiceChargeNGN: 15000,
        securityChargeNGN: 5000,
        vatPercentage: 0.075,
      },
      discounts: { ADT: 1.0, CHD: 0.75, INF: 0.1 },
    };
  }
}

/**
 * Calculate fare for itinerary segments and passenger
 */
function calculateFare(
  segments: any[],
  paxType: 'ADT' | 'CHD' | 'INF' = 'ADT'
) {
  const cfg = loadPricingConfig();
  let baseFare = 0;
  let taxes = 0;

  for (const seg of segments) {
    const cls = seg.classCode || seg.class_code || 'Y';
    let segBase = 65000;
    if (cls === 'J' || cls === 'C') segBase = 125000;
    else if (cls === 'D') segBase = 100000;
    else if (cls === 'Y') segBase = 75000;
    else if (cls === 'B' || cls === 'M') segBase = 60000;
    else segBase = 45000;

    const yq = cfg.fuelSurcharges.YQ_DOMESTIC_NGN;
    const psc = cfg.taxes.passengerServiceChargeNGN;
    const sec = cfg.taxes.securityChargeNGN;
    const vat = Math.round(segBase * cfg.taxes.vatPercentage);

    baseFare += segBase;
    taxes += yq + psc + sec + vat;
  }

  const multiplier = cfg.discounts[paxType] ?? 1.0;
  const finalBase = Math.round(baseFare * multiplier);
  const finalTaxes = Math.round(taxes * multiplier);
  const total = finalBase + finalTaxes;

  return { baseFare: finalBase, taxes: finalTaxes, totalFare: total };
}

/**
 * Format Amadeus TST Quote display
 */
function formatTstDisplay(
  segments: any[],
  baseFare: number,
  taxes: number,
  total: number,
  tstNum: number,
  isStored: boolean
): string {
  const lines: string[] = [
    '------------------------------------------------------------',
    'AL FLGT  BK T DATE  TIME  FARE BASIS      NVB   NVA    BG',
  ];

  segments.forEach((seg) => {
    const al = seg.airlineCode || seg.airline_code;
    const flt = (seg.flightNumber || seg.flight_number).toString().padStart(4, ' ');
    const cls = seg.classCode || seg.class_code || 'Y';
    const dObj = new Date(`${seg.travelDate || seg.travel_date}T00:00:00`);
    const dateStr = formatDateSabre(dObj);
    const timeStr = formatTimeDisplay(seg.departureTime || seg.departure_time).replace(':', '');
    const basis = `${cls}OW`.padEnd(15, ' ');
    lines.push(`${al} ${flt}  ${cls}  ${cls} ${dateStr} ${timeStr}  ${basis}       1P`);
  });

  lines.push('');
  lines.push(`NGN   ${baseFare.toString().padStart(12, ' ')}                   FARE`);
  lines.push(`NGN   ${taxes.toString().padStart(12, ' ')}                   TAXES / FEES`);
  lines.push(`NGN   ${total.toString().padStart(12, ' ')}                   TOTAL`);
  lines.push(isStored ? `TST ${tstNum.toString().padStart(2, '0')} STORED` : 'TST NOT STORED - INFORMATIVE PRICING ONLY');
  lines.push('------------------------------------------------------------');

  return lines.join('\n');
}

/**
 * Handle FXP (Price PNR + Create TST)
 */
export function handleAmadeusPriceTst(
  state: SessionState,
  store: DataStore
): CommandResult {
  const working = state.workingPnr;
  if (!working || working.segments.length === 0) {
    return {
      output: 'NO ITINERARY IN CONTEXT TO PRICE - USE AN/SS FIRST',
      newState: state,
    };
  }

  const { baseFare, taxes, totalFare } = calculateFare(working.segments, 'ADT');
  const validatingCarrier = state.validatingCarrier || working.segments[0].airlineCode;

  const tstRecord: TstRecord = {
    pnr_locator: state.currentPnr || 'WORK',
    tst_number: (state.tsts?.length || 0) + 1,
    pax_type: 'ADT',
    base_fare_ngn: baseFare,
    taxes_ngn: taxes,
    total_fare_ngn: totalFare,
    currency: 'NGN',
    fare_basis: `${working.segments[0].classCode}OW`,
    validating_carrier: validatingCarrier,
  };

  const updatedTsts = [...(state.tsts || []), tstRecord];

  const display = formatTstDisplay(
    working.segments,
    baseFare,
    taxes,
    totalFare,
    tstRecord.tst_number,
    true
  );

  return {
    output: display,
    newState: {
      ...state,
      tsts: updatedTsts,
    },
  };
}

/**
 * Handle FXX (Price PNR Informative - No TST)
 */
export function handleAmadeusPriceInformative(state: SessionState): CommandResult {
  const working = state.workingPnr;
  if (!working || working.segments.length === 0) {
    return {
      output: 'NO ITINERARY IN CONTEXT TO PRICE',
      newState: state,
    };
  }

  const { baseFare, taxes, totalFare } = calculateFare(working.segments, 'ADT');
  const display = formatTstDisplay(
    working.segments,
    baseFare,
    taxes,
    totalFare,
    1,
    false
  );

  return {
    output: display,
    newState: state,
  };
}

/**
 * Handle FXA (Best Pricer - Lower Fares Display)
 */
export function handleAmadeusBestPricerDisplay(state: SessionState): CommandResult {
  const working = state.workingPnr;
  if (!working || working.segments.length === 0) {
    return {
      output: 'NO ITINERARY TO PRICE',
      newState: state,
    };
  }

  const current = calculateFare(working.segments, 'ADT');
  const lowerBase = Math.round(current.baseFare * 0.7);
  const lowerTotal = lowerBase + current.taxes;

  const lines = [
    '------------------------------------------------------------',
    'BEST PRICER - ALTERNATIVE LOWER FARES AVAILABLE:',
    'OPTION 1 (LOWEST AVAILABLE):',
    `BOOKING CLASS: K (ECONOMY SAVER)`,
    `BASE FARE:     NGN ${lowerBase}`,
    `TAXES / FEES:  NGN ${current.taxes}`,
    `TOTAL FARE:    NGN ${lowerTotal}`,
    'SAVINGS:       NGN ' + (current.totalFare - lowerTotal),
    'ENTER FXR TO REBOOK AUTOMATICALLY TO LOWEST FARE',
    '------------------------------------------------------------',
  ];

  return {
    output: lines.join('\n'),
    newState: state,
  };
}

/**
 * Handle FXR (Best Pricer - Rebook to Lowest Fare)
 */
export function handleAmadeusBestPricerRebook(state: SessionState): CommandResult {
  const working = state.workingPnr;
  if (!working || working.segments.length === 0) {
    return {
      output: 'NO ITINERARY TO REBOOK',
      newState: state,
    };
  }

  const updatedSegs = working.segments.map((seg) => ({
    ...seg,
    classCode: 'K',
  }));

  const { baseFare, taxes, totalFare } = calculateFare(updatedSegs, 'ADT');
  const display = formatTstDisplay(updatedSegs, baseFare, taxes, totalFare, 1, false);

  return {
    output: `REBOOKED TO LOWEST CLASS (K):\n${display}`,
    newState: {
      ...state,
      workingPnr: {
        ...working,
        segments: updatedSegs,
      },
    },
  };
}

/**
 * Handle FQD <citypair> (Fare Quote Display): e.g. FQDBOMDEL, FQDLOSABV
 */
export function handleAmadeusFareQuoteDisplay(
  cityPairArg: string,
  state: SessionState
): CommandResult {
  const clean = cityPairArg.trim().toUpperCase().replace(/\s+/g, '');
  if (clean.length < 6) {
    return {
      output: 'FORMAT: FQD<ORIG><DEST> (E.G. FQDBOMDEL OR FQDLOSABV)',
      newState: state,
    };
  }

  const origin = clean.slice(0, 3);
  const dest = clean.slice(3, 6);

  const lines = [
    `FQD ${origin}${dest}/17OCT26/AI/NUC/TPM ..../MPM ....`,
    'LN FARE BASIS    OW/RT  BOOK   FARE NGN    PEN  DATES    DAYS',
    '─────────────────────────────────────────────────────────────',
    '01 YOW            OW     Y       75000     NONE  - - -   - -',
    '02 MOW            OW     M       60000     CHG   - - -   - -',
    '03 KOW            OW     K       45000     CHG   - - -   - -',
    '04 YRT            RT     Y      145000     NONE  - - -   - -',
    '05 KRT            RT     K       88000     CHG   - - -   - -',
    'ENTER FQN<LINE> FOR FARE RULES',
  ];

  return { output: lines.join('\n'), newState: state };
}

/**
 * Handle FQN<line> (Fare Notes / Rules)
 */
export function handleAmadeusFareNotes(
  lineNum: number,
  state: SessionState
): CommandResult {
  const lines = [
    `FQN${lineNum} FARE RULES & CONDITIONS`,
    '─────────────────────────────────────────────────────────────',
    'CATEGORY 04: FLIGHT APPLICATION - VALID ON SCHEDULED FLIGHTS ONLY',
    'CATEGORY 08: STOPOVERS - NO STOPOVERS PERMITTED',
    'CATEGORY 16: PENALTIES - CANCELLATION NGN 15000 / CHANGE NGN 10000',
    'CATEGORY 19: DISCOUNTS - CHD 25% DISCOUNT, INF 90% DISCOUNT',
    'BAGGAGE: 1 PIECE CHECKED BAGGAGE UP TO 23KG INCLUDED',
  ];

  return { output: lines.join('\n'), newState: state };
}
