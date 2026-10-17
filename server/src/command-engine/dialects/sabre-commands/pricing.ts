import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SessionState, CommandResult, DataStore, SegmentEntry, PassengerEntry } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PricingConfig {
  currency: {
    base: string;
    rates: Record<string, number>;
  };
  fuelSurcharges: {
    YQ_DOMESTIC_NGN: number;
    YQ_REGIONAL_NGN: number;
    YQ_INTERNATIONAL_NGN: number;
    YQ_INTERNATIONAL_USD: number;
  };
  taxes: {
    passengerServiceChargeNGN: number;
    securityChargeNGN: number;
    vatPercentage: number;
    internationalDepartureTaxUSD: number;
    ukPassengerDutyGBP: number;
  };
  discounts: {
    ADT: number;
    CHD: number;
    INF: number;
  };
}

export function loadPricingConfig(): PricingConfig {
  const configPath = path.resolve(__dirname, '../../../pricing-config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // Default fallback
    return {
      currency: { base: 'NGN', rates: { NGN: 1, USD: 1600 } },
      fuelSurcharges: {
        YQ_DOMESTIC_NGN: 25000,
        YQ_REGIONAL_NGN: 55000,
        YQ_INTERNATIONAL_NGN: 120000,
        YQ_INTERNATIONAL_USD: 75,
      },
      taxes: {
        passengerServiceChargeNGN: 15000,
        securityChargeNGN: 5000,
        vatPercentage: 0.075,
        internationalDepartureTaxUSD: 50,
        ukPassengerDutyGBP: 88,
      },
      discounts: { ADT: 1.0, CHD: 0.75, INF: 0.1 },
    };
  }
}

export function handlePricing(
  noCommission: boolean,
  state: SessionState,
  store: DataStore
): CommandResult {
  // Determine itinerary to price
  let segments: Array<{
    airlineCode: string;
    flightNumber: number;
    classCode: string;
    origin: string;
    destination: string;
    travelDate: string;
    numSeats: number;
  }> = [];

  let passengers: Array<{
    lastName: string;
    firstName: string;
    paxType: 'ADT' | 'CHD' | 'INF';
  }> = [];

  if (state.workingPnr && state.workingPnr.segments.length > 0) {
    segments = state.workingPnr.segments;
    passengers = state.workingPnr.passengers;
  } else if (state.currentPnr) {
    const pnr = store.getPnr(state.currentPnr);
    if (pnr && pnr.segments.length > 0) {
      segments = pnr.segments.map((s) => ({
        airlineCode: s.airline_code,
        flightNumber: s.flight_number,
        classCode: s.class_code,
        origin: s.origin,
        destination: s.destination,
        travelDate: s.travel_date,
        numSeats: s.num_seats,
      }));
      passengers = pnr.passengers.map((p) => ({
        lastName: p.last_name,
        firstName: p.first_name,
        paxType: p.pax_type,
      }));
    }
  }

  if (segments.length === 0) {
    return {
      output: 'NO ITINERARY TO PRICE',
      newState: state,
    };
  }

  // Requirement #5: WP must only price classes that exist for the flight.
  for (const seg of segments) {
    const travelDateObj = new Date(`${seg.travelDate}T00:00:00`);
    const dayOfWeek = isNaN(travelDateObj.getTime())
      ? 1
      : travelDateObj.getDay() === 0
      ? 7
      : travelDateObj.getDay();

    const flights = store.searchFlights(
      seg.origin,
      seg.destination,
      seg.travelDate,
      dayOfWeek
    );
    const flight = flights.find(
      (f) => f.airline_code === seg.airlineCode && f.flight_number === seg.flightNumber
    );

    if (flight) {
      const hasClass = flight.classes.some((c) => c.code === seg.classCode);
      if (!hasClass) {
        return {
          output: `CLASS ${seg.classCode} NOT APPLICABLE FOR PRICING ON ${seg.airlineCode} ${seg.flightNumber}`,
          newState: state,
        };
      }
    }
  }

  // If no passengers in PNR yet, price for 1 ADT
  const effectivePax = passengers.length > 0 ? passengers : [{ lastName: 'PASSENGER', firstName: 'ONE', paxType: 'ADT' as const }];

  const config = loadPricingConfig();

  let totalBaseNgn = 0;
  let totalTaxesNgn = 0;
  let totalGrandNgn = 0;

  const paxBreakdowns: string[] = [];
  let lastFareBasis = 'YOWNG';
  let totalYQ = 0;
  let totalQT = 0;
  let totalNG = 0;

  for (let i = 0; i < effectivePax.length; i++) {
    const pax = effectivePax[i];
    const discount = config.discounts[pax.paxType] ?? 1.0;

    let paxBaseNgn = 0;
    let paxTaxesNgn = 0;

    for (const seg of segments) {
      const fare = store.getFare(
        seg.airlineCode,
        seg.origin,
        seg.destination,
        seg.classCode,
        pax.paxType
      );

      let segBaseNgn = 0;
      if (fare) {
        segBaseNgn = fare.base_fare_ngn / 100;
        lastFareBasis = fare.fare_basis;
      } else {
        // Fallback calculation based on class code & route type
        const isIntl = seg.destination === 'LHR' || seg.destination === 'DXB' || seg.origin === 'LHR' || seg.origin === 'DXB';
        const isBusiness = ['J', 'C', 'D', 'F'].includes(seg.classCode);
        if (isIntl) {
          segBaseNgn = (isBusiness ? 3500000 : 1100000) * discount;
          lastFareBasis = `${seg.classCode}OWINTL`;
        } else {
          segBaseNgn = (isBusiness ? 200000 : 90000) * discount;
          lastFareBasis = `${seg.classCode}OWNG`;
        }
      }

      // Fuel surcharge YQ
      const isDomestic = (seg.origin === 'LOS' || seg.origin === 'ABV' || seg.origin === 'PHC' || seg.origin === 'KAN' || seg.origin === 'ENU') &&
        (seg.destination === 'LOS' || seg.destination === 'ABV' || seg.destination === 'PHC' || seg.destination === 'KAN' || seg.destination === 'ENU');

      let segYQ = isDomestic
        ? config.fuelSurcharges.YQ_DOMESTIC_NGN
        : config.fuelSurcharges.YQ_INTERNATIONAL_NGN;

      segYQ = Math.round(segYQ * discount);

      // Taxes (Passenger service QT + Security NG)
      const segQT = Math.round(config.taxes.passengerServiceChargeNGN * discount);
      const segNG = Math.round(config.taxes.securityChargeNGN * discount);

      totalYQ += segYQ;
      totalQT += segQT;
      totalNG += segNG;

      const segTaxes = segYQ + segQT + segNG;

      paxBaseNgn += segBaseNgn;
      paxTaxesNgn += segTaxes;
    }

    const paxTotalNgn = paxBaseNgn + paxTaxesNgn;
    totalBaseNgn += paxBaseNgn;
    totalTaxesNgn += paxTaxesNgn;
    totalGrandNgn += paxTotalNgn;

    const paxIdx = (i + 1).toString().padStart(2, '0');
    paxBreakdowns.push(
      `${pax.paxType}-${paxIdx}  ${lastFareBasis}  NGN ${paxTotalNgn.toLocaleString('en-US')}`
    );
  }

  const cmdHeader = noCommission ? 'WPNC' : 'WP';
  const lines: string[] = [
    cmdHeader,
    'BASE FARE            TAXES/FEES/CHARGES      TOTAL',
    `NGN ${totalBaseNgn.toLocaleString('en-US').padEnd(16)} NGN ${totalTaxesNgn.toLocaleString('en-US')}XT            NGN ${totalGrandNgn.toLocaleString('en-US')}`,
    `XT BREAKDOWN: ${totalYQ.toLocaleString('en-US')}YQ ${totalQT.toLocaleString('en-US')}QT ${totalNG.toLocaleString('en-US')}NG`,
    '',
    ...paxBreakdowns,
    'PRIVATE TARIFF APPLIED',
  ];

  if (noCommission) {
    lines.push('NO COMMISSION RECORD FOUND');
  }
  lines.push('BAG ALLOWANCE - 2PC');

  return {
    output: lines.join('\n'),
    newState: state,
  };
}
