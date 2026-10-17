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
  {
    id: 'solo-lagos-london',
    title: '1. Solo Traveler Lagos to London (Heathrow)',
    difficulty: 'Beginner',
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
    title: '2. Domestic Roundtrip: Lagos to Abuja',
    difficulty: 'Intermediate',
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
    title: '3. Family Vacation to Dubai (Emirates)',
    difficulty: 'Advanced',
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
];
