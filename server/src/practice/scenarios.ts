export interface ScenarioObjective {
  id: string;
  description: string;
  hint: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  dialect?: 'sabre' | 'amadeus';
  expectedRoute: {
    origin: string;
    destination: string;
    airlineCode?: string;
    classCode?: string;
    returnLeg?: {
      origin: string;
      destination: string;
    };
  };
  expectedPax: {
    count: number;
    types: ('ADT' | 'CHD' | 'INF')[];
  };
  objectives: ScenarioObjective[];
}

export const SCENARIOS: ScenarioDefinition[] = [
  // ─── Sabre Scenarios ─────────────────────────────────────────
  {
    id: 'solo-lagos-london',
    title: '1. Sabre: Solo Traveler Lagos to London (Heathrow)',
    difficulty: 'Beginner',
    dialect: 'sabre',
    description:
      'A corporate client, John Smith, walks into your agency wanting an economy ticket from Lagos (LOS) to London Heathrow (LHR). Build and save a complete PNR with all mandatory fields.',
    expectedRoute: {
      origin: 'LOS',
      destination: 'LHR',
      classCode: 'Y',
    },
    expectedPax: {
      count: 1,
      types: ['ADT'],
    },
    objectives: [
      { id: 'sign-in', description: 'Sign in to the Sabre terminal with your agent ID', hint: 'SI*7890' },
      { id: 'check-avail', description: 'Check availability from LOS to LHR for a travel date', hint: '1LOSLHR15NOV' },
      { id: 'sell-seat', description: 'Sell 1 seat in Y class from the display or direct sell', hint: '01Y1' },
      { id: 'add-name', description: 'Add passenger name: John Smith', hint: '-SMITH/JOHN MR' },
      { id: 'add-phone', description: 'Add agency or contact phone number', hint: '9234-802-123-4567-A' },
      { id: 'add-ticket', description: 'Add ticketing arrangement limit', hint: '7TAW/' },
      { id: 'add-rf', description: 'Add received from field', hint: '6SMITH' },
      { id: 'end-trans', description: 'End transaction and obtain 6-character record locator', hint: 'E or ER' },
    ],
  },
  {
    id: 'roundtrip-domestic',
    title: '2. Sabre: Domestic Roundtrip Lagos to Abuja',
    difficulty: 'Intermediate',
    dialect: 'sabre',
    description:
      'Book a domestic roundtrip for Jane Doe: Outbound LOS to ABV and return ABV to LOS. Check pricing with WP and complete the booking.',
    expectedRoute: {
      origin: 'LOS',
      destination: 'ABV',
      returnLeg: {
        origin: 'ABV',
        destination: 'LOS',
      },
    },
    expectedPax: {
      count: 1,
      types: ['ADT'],
    },
    objectives: [
      { id: 'sign-in', description: 'Sign in to the terminal', hint: 'SI*7890' },
      { id: 'sell-outbound', description: 'Book outbound flight LOS to ABV', hint: '1LOSABV15NOV then 01Y1' },
      { id: 'sell-inbound', description: 'Book return flight ABV to LOS', hint: '1ABVLOS20NOV then 01Y1' },
      { id: 'add-name', description: 'Add passenger Jane Doe', hint: '-DOE/JANE MRS' },
      { id: 'add-phone', description: 'Add contact phone', hint: '9234-803-987-6543-M' },
      { id: 'add-ticket', description: 'Add ticketing date', hint: '7TAW/10NOV' },
      { id: 'price-itinerary', description: 'Price the roundtrip with WP', hint: 'WP' },
      { id: 'add-rf', description: 'Received from and end transaction', hint: '6DOE then ER' },
    ],
  },
  {
    id: 'family-dubai',
    title: '3. Sabre: Family Vacation to Dubai (Emirates)',
    difficulty: 'Advanced',
    dialect: 'sabre',
    description:
      'A family is travelling from Lagos to Dubai: Mr. John Doe, Mrs. Mary Doe, and child Master Timmy Doe (CHD). Book seats, verify child passenger syntax, price with WP, and save.',
    expectedRoute: {
      origin: 'LOS',
      destination: 'DXB',
      airlineCode: 'EK',
      classCode: 'Y',
    },
    expectedPax: {
      count: 3,
      types: ['ADT', 'ADT', 'CHD'],
    },
    objectives: [
      { id: 'sign-in', description: 'Sign in to terminal', hint: 'SI*7890' },
      { id: 'check-avail', description: 'Check Emirates availability LOS to DXB', hint: '1LOSDXB15NOV' },
      { id: 'sell-seats', description: 'Sell seats for 3 passengers', hint: '01Y3 or sell line 1' },
      { id: 'add-names', description: 'Add 2 adults and 1 child', hint: '-DOE/JOHN MR, -DOE/MARY MRS, -DOE/TIMMY MSTR(CHD)' },
      { id: 'price', description: 'Price the family booking to view ADT and CHD discounts', hint: 'WP' },
      { id: 'complete', description: 'Add phone, ticketing, RF, and end transaction', hint: '9..., 7TAW/, 6DOE, ER' },
    ],
  },

  // ─── Amadeus Scenarios ───────────────────────────────────────
  {
    id: 'amadeus-domestic-p4',
    title: '1. Amadeus: Book 2 Adults LOS-ABV Return on Air Peace (P4)',
    difficulty: 'Beginner',
    dialect: 'amadeus',
    description:
      'Book a return journey for 2 adult passengers on Air Peace (P4) between Lagos (LOS) and Abuja (ABV). Use airline modifier /AP4, add mobile contact, ticket time limit, RF, and price with FXP.',
    expectedRoute: {
      origin: 'LOS',
      destination: 'ABV',
      airlineCode: 'P4',
      returnLeg: {
        origin: 'ABV',
        destination: 'LOS',
      },
    },
    expectedPax: {
      count: 2,
      types: ['ADT', 'ADT'],
    },
    objectives: [
      { id: 'check-avail', description: 'Check availability on Air Peace: AN<DATE>LOSABV/AP4', hint: 'AN19OCTLOSABV/AP4' },
      { id: 'sell-outbound', description: 'Sell 2 seats in Y class for outbound', hint: 'SS2Y1' },
      { id: 'sell-inbound', description: 'Check return and sell 2 seats for inbound', hint: 'AN24OCTABVLOS/AP4 then SS2Y1' },
      { id: 'add-names', description: 'Add 2 adult passengers sharing surname', hint: 'NM2SHARMA/RAJ MR/PRIYA MRS' },
      { id: 'add-contact', description: 'Add mobile contact with APM or SR CTCM', hint: 'APM-08012345678 or SR CTCM-08012345678' },
      { id: 'add-ticket', description: 'Add ticket time limit', hint: 'TKTL20MAR/1800' },
      { id: 'price-tst', description: 'Price itinerary and create stored TST with FXP', hint: 'FXP' },
      { id: 'end-trans', description: 'Received from yourself and End & Retrieve (ER)', hint: 'RF VICTOR+ER' },
    ],
  },
  {
    id: 'amadeus-solo-executive',
    title: '2. Amadeus: Solo Executive Business Class LOS to London (LHR)',
    difficulty: 'Intermediate',
    dialect: 'amadeus',
    description:
      'Book an executive passenger in Business Class (J) from Lagos to London Heathrow. Add preferred email contact with SR CTCE (use // for @), ticket TKOK, price with FXP, and end transaction with ET.',
    expectedRoute: {
      origin: 'LOS',
      destination: 'LHR',
      classCode: 'J',
    },
    expectedPax: {
      count: 1,
      types: ['ADT'],
    },
    objectives: [
      { id: 'avail-sell', description: 'Search and sell 1 seat in Business class (J)', hint: 'AN15NOVLOSLHR then SS1J1' },
      { id: 'add-name', description: 'Add passenger name with title', hint: 'NM1ADELEKE/BABATUNDE MR' },
      { id: 'add-email', description: 'Add preferred email using // for @', hint: 'SR CTCE-ADELEKE//CORP.COM' },
      { id: 'add-ticket', description: 'Confirm ticketing arrangement immediately', hint: 'TKOK' },
      { id: 'price-tst', description: 'Store confirmed fare with FXP', hint: 'FXP' },
      { id: 'end-exit', description: 'Add RF and End Transaction with ET', hint: 'RF BABATUNDE+ET' },
    ],
  },
  {
    id: 'amadeus-family-chd-inf',
    title: '3. Amadeus: Family Holiday with Child & Infant (BOM-DEL)',
    difficulty: 'Advanced',
    dialect: 'amadeus',
    description:
      'Book an international family traveling on Air India from Mumbai to Delhi: 1 Adult, 1 Child (CHD with DOB), and 1 Infant (INF with DOB). Add meal request (SR VGML), general contact phone, TKOK, RF, and save.',
    expectedRoute: {
      origin: 'BOM',
      destination: 'DEL',
      airlineCode: 'AI',
    },
    expectedPax: {
      count: 3,
      types: ['ADT', 'CHD', 'INF'],
    },
    objectives: [
      { id: 'sell-flight', description: 'Sell flight segment on AI 101', hint: 'SSAI101Y15MARBOMDEL2' },
      { id: 'add-adult-inf', description: 'Add adult with infant attached', hint: 'NM1SHARMA/RAJ MR(INF/BABY MISS/01DEC24)' },
      { id: 'add-chd', description: 'Add child passenger with date of birth', hint: 'NM1SHARMA/ANANYA MISS(CHD/15MAR18)' },
      { id: 'add-contact', description: 'Add general agency contact with city code', hint: 'APBOM 022-12345678' },
      { id: 'add-ssr', description: 'Request vegetarian meal SSR', hint: 'SRVGML' },
      { id: 'price-save', description: 'Ticketing OK, Received From, Price with FXP, and save with ER', hint: 'TKOK+RFRAJ+FXP+ER' },
    ],
  },
  {
    id: 'amadeus-best-pricer',
    title: '4. Amadeus: Best Pricer Optimization (FXA & FXR)',
    difficulty: 'Intermediate',
    dialect: 'amadeus',
    description:
      'A budget-conscious client wants to travel Lagos to Abuja. Book a standard Y class seat, run FXA to review cheaper alternative fares, execute FXR to rebook automatically into the lowest class (K), and price with FXP.',
    expectedRoute: {
      origin: 'LOS',
      destination: 'ABV',
      classCode: 'K',
    },
    expectedPax: {
      count: 1,
      types: ['ADT'],
    },
    objectives: [
      { id: 'book-initial', description: 'Book initial segment in Y class', hint: 'AN19OCTLOSABV then SS1Y1' },
      { id: 'add-pax-details', description: 'Add name, mobile contact, and ticketing', hint: 'NM1OKONKWO/EMMANUEL MR+APM-08098765432+TKTL20MAR/1800' },
      { id: 'check-best-fare', description: 'Search lowest fare options with FXA', hint: 'FXA' },
      { id: 'rebook-lowest', description: 'Rebook to lowest class with FXR', hint: 'FXR' },
      { id: 'price-and-save', description: 'Store TST with FXP, RF yourself, and save with ER', hint: 'FXP+RFEMMANUEL+ER' },
    ],
  },
  {
    id: 'amadeus-split-pnr',
    title: '5. Amadeus: Split Passenger into New Booking (SP)',
    difficulty: 'Advanced',
    dialect: 'amadeus',
    description:
      'Create a confirmed booking for 2 passengers BOM to DEL. Save the record, then separate passenger 2 into a distinct record locator using the split command (SP2).',
    expectedRoute: {
      origin: 'BOM',
      destination: 'DEL',
    },
    expectedPax: {
      count: 2,
      types: ['ADT', 'ADT'],
    },
    objectives: [
      { id: 'create-pnr', description: 'Create and save PNR with 2 passengers', hint: 'SSAI101Y15MARBOMDEL2+NM2PATEL/KIRAN MR/MEERA MRS+APBOM 12345+TKOK+RFKIRAN+ER' },
      { id: 'split-pax', description: 'Split passenger 2 into a new booking', hint: 'SP2' },
      { id: 'verify-split', description: 'Confirm new PNR created and original PNR retained', hint: 'RT or ER' },
    ],
  },
  {
    id: 'amadeus-eticket-issuance',
    title: '6. Amadeus: Complete E-Ticket Issuance Cycle (TTP & TWD)',
    difficulty: 'Advanced',
    dialect: 'amadeus',
    description:
      'Process a complete booking from creation through e-ticket issuance. Set Form of Payment (FP CASH), Commission (FM5), Validating Carrier (FV AI), Price with FXP to store TST, issue e-tickets with TTP, and view coupon with TWD.',
    expectedRoute: {
      origin: 'BOM',
      destination: 'DEL',
    },
    expectedPax: {
      count: 1,
      types: ['ADT'],
    },
    objectives: [
      { id: 'build-pnr', description: 'Book segment, name, contact, ticketing, and RF', hint: 'SSAI101Y15MARBOMDEL1+NM1GUPTA/VIKRAM MR+APBOM 022-98765432+TKOK+RFVIKRAM' },
      { id: 'set-fop-comm', description: 'Set Form of Payment (FPCASH), Commission (FM5), and Validating Carrier (FV AI)', hint: 'FPCASH+FM5+FV AI' },
      { id: 'price-tst', description: 'Calculate and store TST fare with FXP', hint: 'FXP' },
      { id: 'issue-tickets', description: 'Issue 13-digit e-tickets with TTP', hint: 'TTP' },
      { id: 'display-eticket', description: 'Inspect electronic ticket coupon with TWD', hint: 'TWD' },
    ],
  },
];
