import React from 'react';
import { X, Copy, Terminal as TerminalIcon } from 'lucide-react';

interface CheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (cmd: string) => void;
  dialect?: 'sabre' | 'amadeus';
}

interface CommandItem {
  cmd: string;
  desc: string;
  amadeus?: string;
  sabre?: string;
}

interface CommandCategory {
  title: string;
  commands: CommandItem[];
}

const SABRE_CATEGORIES: CommandCategory[] = [
  {
    title: 'Sign In & Authentication',
    commands: [
      { cmd: 'SI*7890', desc: 'Sign in with agent ID 7890', amadeus: 'JI 1234AA/SU' },
      { cmd: 'SO', desc: 'Sign out and end session', amadeus: 'JO' },
      { cmd: 'HELP', desc: 'Display quick reference guide', amadeus: 'HELP AN' },
    ],
  },
  {
    title: 'Flight Availability',
    commands: [
      { cmd: '1LOSLHR15NOV', desc: 'Lagos to London on 15 Nov', amadeus: 'AN15NOVLOSLHR' },
      { cmd: '115NOVLOSABV', desc: 'Date first: 15 Nov LOS to ABV', amadeus: 'AN15NOVLOSABV' },
      { cmd: '1LOSDXB20NOV', desc: 'Lagos to Dubai on 20 Nov', amadeus: 'AN20NOVLOSDXB' },
    ],
  },
  {
    title: 'Selling Flight Segments',
    commands: [
      { cmd: '01Y1', desc: 'Sell 1 seat in Y class from line 1', amadeus: 'SS1Y1' },
      { cmd: '01J2', desc: 'Sell 2 seats in J (Business) from line 1', amadeus: 'SS2J1' },
      { cmd: '0W3501Y15NOVLOSABV1', desc: 'Direct sell without availability screen', amadeus: 'SSAI101Y15MARBOMDEL1' },
    ],
  },
  {
    title: 'Passenger Name Records (PNR)',
    commands: [
      { cmd: '-SMITH/JOHN MR', desc: 'Adult passenger name entry', amadeus: 'NM1SMITH/JOHN MR' },
      { cmd: '-DOE/JANE MRS', desc: 'Adult female passenger entry', amadeus: 'NM1DOE/JANE MRS' },
      { cmd: '-DOE/TIMMY MSTR(CHD/15JAN20)', desc: 'Child with date of birth', amadeus: 'NM1DOE/TIMMY MSTR(CHD/15JAN20)' },
      { cmd: '-DOE/BABY(INF)', desc: 'Infant without seat', amadeus: 'NM1DOE/JANE MRS(INF/BABY/01DEC24)' },
    ],
  },
  {
    title: 'Mandatory PNR Booking Fields',
    commands: [
      { cmd: '9234-802-123-4567-A', desc: 'Agency contact phone number', amadeus: 'APLOS 08012345678' },
      { cmd: '7TAW/', desc: 'Ticketing time limit (default +7 days)', amadeus: 'TKOK or TKTL' },
      { cmd: '7TAW/25NOV', desc: 'Ticketing time limit with specific date', amadeus: 'TKTL25NOV/1800' },
      { cmd: '6SMITH', desc: 'Received from (person requesting booking)', amadeus: 'RF SMITH' },
    ],
  },
  {
    title: 'Pricing & Fare Calculation',
    commands: [
      { cmd: 'WP', desc: 'Price itinerary (Base + YQ + Taxes)', amadeus: 'FXP' },
      { cmd: 'WPNC', desc: 'Price itinerary lowest fare without rebooking', amadeus: 'FXA' },
    ],
  },
  {
    title: 'Finalizing Transaction (E / ER)',
    commands: [
      { cmd: 'E', desc: 'End and save PNR (outputs 6-char locator)', amadeus: 'ET' },
      { cmd: 'ER', desc: 'End, save, and redisplay saved PNR', amadeus: 'ER' },
    ],
  },
  {
    title: 'Retrieve & Display',
    commands: [
      { cmd: '*A', desc: 'Display all fields of working or active PNR', amadeus: 'RT' },
      { cmd: '*I', desc: 'Display itinerary segments only', amadeus: 'RT' },
      { cmd: '*N', desc: 'Display passenger names only', amadeus: 'RT' },
      { cmd: '*ABCDEF', desc: 'Retrieve PNR by record locator', amadeus: 'RTABCDEF' },
    ],
  },
  {
    title: 'Cancel & Modify',
    commands: [
      { cmd: 'I', desc: 'Ignore: discard working PNR without saving', amadeus: 'IG' },
      { cmd: 'XI', desc: 'Cancel entire itinerary segments', amadeus: 'XI' },
      { cmd: 'X1', desc: 'Cancel segment number 1', amadeus: 'XE1' },
    ],
  },
  {
    title: 'Encode & Decode',
    commands: [
      { cmd: 'DAN LAGOS', desc: 'Encode city name to airport code (LOS)', amadeus: 'DAN LAGOS' },
      { cmd: 'DAC LOS', desc: 'Decode airport code to full details', amadeus: 'DAC LOS' },
      { cmd: 'W/*BRITISH', desc: 'Encode airline name to IATA code (BA)', amadeus: 'DNA BRITISH' },
      { cmd: 'W/*W3', desc: 'Decode airline code (Arik Air)', amadeus: 'DNA W3' },
    ],
  },
];

const AMADEUS_CATEGORIES: CommandCategory[] = [
  {
    title: '🔐 1. Session & System Basics',
    commands: [
      { cmd: 'JI 1234AA/SU', desc: 'Jump In: sign into system with agent ID & suffix', sabre: 'SI*7890' },
      { cmd: 'JO', desc: 'Jump Out: sign out of terminal session', sabre: 'SO' },
      { cmd: 'JD', desc: 'Display Session: check current sign-in status', sabre: '*S' },
      { cmd: 'HELP AN', desc: 'System Help for any specific command', sabre: 'HELP' },
      { cmd: 'MD', desc: 'Move Down: scroll to next page of results', sabre: 'MD' },
      { cmd: 'MU', desc: 'Move Up: scroll to previous page', sabre: 'MU' },
      { cmd: 'MN', desc: 'Move Next Day: view availability for next day', sabre: '1+1' },
      { cmd: 'MY', desc: 'Move Yesterday: view availability for previous day', sabre: '1-1' },
      { cmd: 'MP', desc: 'Move First Page / Top of display', sabre: 'MT' },
    ],
  },
  {
    title: '🔄 2. Encoding & Decoding',
    commands: [
      { cmd: 'DAN MUMBAI', desc: 'Encode City: city name to IATA code (BOM)', sabre: 'DAN MUMBAI' },
      { cmd: 'DAC JFK', desc: 'Decode City: IATA code to city name', sabre: 'DAC JFK' },
      { cmd: 'DNA EK', desc: 'Encode/Decode Airline: name to code or code to name', sabre: 'W/*EK' },
      { cmd: 'DC INDIA', desc: 'Encode/Decode Country: name to code or code to name', sabre: 'DC INDIA' },
      { cmd: 'DNE/320', desc: 'Encode/Decode Equipment: aircraft type (A320)', sabre: 'W/EQ*320' },
      { cmd: 'DNC HERTZ', desc: 'Encode/Decode Car Company: rental vendor', sabre: 'W/-CCHERTZ' },
      { cmd: 'DNH HILTON', desc: 'Encode/Decode Hotel Chain: hotel brand', sabre: 'W/-HLHILTON' },
    ],
  },
  {
    title: '✈️ 3. Flight Availability & Schedules',
    commands: [
      { cmd: 'AN15MARBOMDEL', desc: 'Availability Neutral: standard flight search', sabre: '115MARBOMDEL' },
      { cmd: 'AN19OCTLOSABV/AP4', desc: 'Availability with airline filter (/AP4 for Air Peace)', sabre: '119OCTLOSABV/P4' },
      { cmd: 'AD15MARBOMDEL0800', desc: 'Availability by Departure Time (from 08:00)', sabre: '115MARBOMDEL8A' },
      { cmd: 'AE15MARBOMDEL0800', desc: 'Availability by Elapsed Time: shortest journey', sabre: '115MARBOMDEL' },
      { cmd: 'AA15MARDELLHR1700', desc: 'Availability by Arrival Time (arrive 17:00)', sabre: '115MARDELLHR/5P' },
      { cmd: 'SS1Y1', desc: 'Sell Segment: sell 1 seat in Y class from line 1', sabre: '01Y1' },
      { cmd: 'SSAI101Y15MARBOMDEL1', desc: 'Long Sell: book flight directly without display', sabre: '0AI101Y15MARBOMDEL1' },
      { cmd: 'SN15MARBOMDEL', desc: 'Schedule Neutral: view schedules incl. sold out', sabre: 'S15MARBOMDEL' },
      { cmd: 'TN15MARBOMDEL', desc: 'Timetable Display: view schedules with frequencies', sabre: 'T15MARBOMDEL' },
      { cmd: 'AC20MAR', desc: 'Availability Change: modify date of current display', sabre: '120MAR' },
      { cmd: 'AN15MARBOMDEL*22MAR', desc: 'Round Trip Search: outbound + return simultaneously', sabre: '115MARBOMDEL#22MAR' },
    ],
  },
  {
    title: '📋 4. PNR Creation (Passenger Name Record)',
    commands: [
      { cmd: 'NM1SHARMA/RAHUL MR', desc: 'Add Adult Name: SURNAME/FIRSTNAME TITLE', sabre: '-SHARMA/RAHUL MR' },
      { cmd: 'NM2SHARMA/RAJ MR/PRIYA MRS', desc: 'Add Two Names: passengers sharing surname', sabre: '-2SHARMA/RAJ MR/PRIYA MRS' },
      { cmd: 'NM1KAPOOR/ANJALI MISS(CHD/15MAR18)', desc: 'Add Child: requires suffix and date of birth', sabre: '-KAPOOR/ANJALI MISS(CHD/15MAR18)' },
      { cmd: 'NM1SHARMA/RAJ MR(INF/BABY MISS/01DEC24)', desc: 'Add Infant: linked to adult, with date of birth', sabre: '-SHARMA/RAJ MR(INF/BABY MISS/01DEC24)' },
      { cmd: 'APBOM 022-12345678', desc: 'Add Phone (General): city code + number', sabre: '9BOM 022-12345678' },
      { cmd: 'APM-9876543210', desc: 'Add Mobile Phone: direct mobile number', sabre: '99876543210-M' },
      { cmd: 'APE-TEST@EMAIL.COM', desc: 'Add Email: general email address', sabre: '9TEST@EMAIL.COM' },
      { cmd: 'SR CTCM-2349165283674', desc: 'Contact Mobile (Preferred): SSR mobile contact', sabre: '3CTCM/2349165283674' },
      { cmd: 'SR CTCE-NAME//GMAIL.COM', desc: 'Contact Email (Preferred): SSR email (// represents @)', sabre: '3CTCE/NAME//GMAIL.COM' },
      { cmd: 'SR VGML/P1/S2', desc: 'Special Service Request: vegan meal, pax 1, seg 2', sabre: '4VGML1-2' },
      { cmd: 'OS AI VIP PAX', desc: 'Other Service Info: free text info to airline', sabre: '3OSI AI VIP PAX' },
      { cmd: 'FFNAI-1234567890/P1', desc: 'Frequent Flyer Number: FQTV for passenger 1', sabre: 'FFA-AI1234567890-1.1' },
      { cmd: 'TKOK', desc: 'Ticketing OK: confirm ticketing arrangement', sabre: '7TAW/' },
      { cmd: 'TKTL20MAR/1800', desc: 'Ticket Time Limit: set ticketing deadline', sabre: '7TAW/20MAR' },
      { cmd: 'RF RAHUL', desc: 'Received From: mandatory for every save (pax/agent initials)', sabre: '6RAHUL' },
    ],
  },
  {
    title: '💾 5. End Transaction (Saving & Retrieving)',
    commands: [
      { cmd: 'ER', desc: 'End & Retrieve: save PNR and stay in it', sabre: 'ER' },
      { cmd: 'ET', desc: 'End Transaction: save PNR and exit completely', sabre: 'E' },
      { cmd: 'IG', desc: 'Ignore Changes: discard all unsaved changes', sabre: 'I' },
      { cmd: 'IR', desc: 'Ignore & Retrieve: discard changes and reload PNR', sabre: 'IR' },
      { cmd: 'RTABC123', desc: 'Retrieve PNR: recall booking by 6-char record locator', sabre: '*ABC123' },
    ],
  },
  {
    title: '✏️ 6. PNR Modifications & Cancellations',
    commands: [
      { cmd: 'XE5', desc: 'Cancel Element: remove element line 5 from PNR', sabre: 'X5' },
      { cmd: 'XE2,4', desc: 'Cancel Elements: remove elements 2 and 4', sabre: 'X2,4' },
      { cmd: 'XE2-4', desc: 'Cancel Range: remove elements 2 through 4', sabre: 'X2-4' },
      { cmd: 'XI', desc: 'Cancel Itinerary: cancel all flight segments', sabre: 'XI' },
      { cmd: 'SBY2', desc: 'Rebook Segment: change segment 2 to class Y', sabre: 'WC2Y' },
      { cmd: 'SP2,3', desc: 'Split PNR: separate passengers 2 and 3 into new record', sabre: 'D2,3' },
    ],
  },
  {
    title: '💰 7. Fares & Pricing',
    commands: [
      { cmd: 'FXP', desc: 'Price PNR + Create TST: confirmed pricing stored for ticketing', sabre: 'WP' },
      { cmd: 'FXX', desc: 'Price PNR (Informative): quote without storing TST', sabre: 'WPQ' },
      { cmd: 'FXA', desc: 'Best Pricer (Lower Fares): display cheaper available fare options', sabre: 'WPNC' },
      { cmd: 'FXR', desc: 'Best Pricer (Rebook): rebook to lowest available fare without TST', sabre: 'WPNCB' },
      { cmd: 'FQDBOMDEL', desc: 'Fare Display: view published fares for city pair', sabre: 'FQBOMDEL' },
      { cmd: 'FQN1', desc: 'Fare Rules/Notes: view rules for fare quote line 1', sabre: 'RD1' },
    ],
  },
  {
    title: '🎫 8. Ticketing & Pre-Ticketing Elements',
    commands: [
      { cmd: 'TTP', desc: 'Issue All TSTs: generate electronic tickets for stored fares', sabre: 'W¥ETR' },
      { cmd: 'TTP/RT', desc: 'Issue + Retrieve: issue tickets and stay in PNR', sabre: 'W¥ETR*A' },
      { cmd: 'FM5', desc: 'Commission (%): set agency commission percentage to 5%', sabre: 'KP5' },
      { cmd: 'FPCCVI4111222233334444/1225', desc: 'Form of Payment: specify credit card payment', sabre: '5-CCVI4111222233334444¥1225' },
      { cmd: 'FV AI', desc: 'Validating Carrier: airline whose ticket stock is used', sabre: 'W¥VAL-AI' },
      { cmd: 'TWD', desc: 'Display E-Ticket: view issued 13-digit ticket record', sabre: 'W*ET' },
    ],
  },
  {
    title: '💺 9. Seat Selection',
    commands: [
      { cmd: 'SM1', desc: 'Seat Map: display seat layout for segment 1', sabre: '4G1*' },
      { cmd: 'ST/12A/P1/S1', desc: 'Assign Specific Seat: seat 12A for pax 1, seg 1', sabre: '4G/12A/P1' },
      { cmd: 'ST/W/P1/S1', desc: 'Seat Preference (Window): request window seat', sabre: '4G/W' },
      { cmd: 'SX/P1/S1', desc: 'Cancel Seat: remove seat assignment', sabre: '4GX' },
      { cmd: 'SXALL', desc: 'Cancel All Seats: remove all assigned seats', sabre: '4GXALL' },
    ],
  },
  {
    title: '📥 10. Queue Management',
    commands: [
      { cmd: 'QT', desc: 'Queue Count: view active agency queues and counts', sabre: 'QC/' },
      { cmd: 'QS8', desc: 'Queue Start: begin working queue 8', sabre: 'Q/8' },
      { cmd: 'QN', desc: 'Next PNR: move to next booking in the queue', sabre: 'QN' },
      { cmd: 'QI', desc: 'Ignore + Exit: leave current PNR on queue', sabre: 'QI' },
      { cmd: 'QF', desc: 'Finish + Exit: remove current PNR from queue', sabre: 'QR' },
    ],
  },
  {
    title: '🏨 11. Hotel & Car Reservations',
    commands: [
      { cmd: 'HLLON', desc: 'Hotel List: view hotels in destination (e.g. LON)', sabre: 'HOTLON' },
      { cmd: 'HALON15JUN-3', desc: 'Hotel Availability: check bookable rooms for 3 nights', sabre: 'HOA15JUN-3' },
      { cmd: 'HS1', desc: 'Hotel Sell: book room from availability line 1', sabre: '0H1' },
      { cmd: 'CLPAR', desc: 'Car Location List: view rental car locations (e.g. PAR)', sabre: 'CARPAR' },
      { cmd: 'CALHR15JUN-3/ARR-1000-1000', desc: 'Car Availability: check rental vehicles', sabre: 'CALHR15JUN-3' },
    ],
  },
];

export const CheatSheet: React.FC<CheatSheetProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
  dialect = 'sabre',
}) => {
  if (!isOpen) return null;

  const isAmadeus = dialect === 'amadeus';
  const categories = isAmadeus ? AMADEUS_CATEGORIES : SABRE_CATEGORIES;
  const title = isAmadeus ? 'Amadeus Command Reference' : 'Sabre Command Reference';

  return (
    <aside className="side-drawer" id="cheatsheet-drawer">
      <div className="drawer-header">
        <div className="drawer-title">
          <TerminalIcon size={18} className="text-green" />
          <span>{title}</span>
        </div>
        <button className="drawer-close" onClick={onClose} aria-label="Close Reference">
          <X size={18} />
        </button>
      </div>

      <div className="drawer-body">
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>
          {isAmadeus
            ? 'Master Amadeus reference. Click any card to copy command into terminal. Sabre equivalents shown for cross-GDS training.'
            : 'Click any card to load the command into the terminal. Dialect equivalents shown for Amadeus training.'}
        </p>

        {categories.map((cat, i) => (
          <div key={i} className="cheatsheet-section">
            <h4 className="cheatsheet-category-title">{cat.title}</h4>
            {cat.commands.map((cmd, j) => (
              <div
                key={j}
                className="cheat-cmd-card"
                onClick={() => onSelectCommand(cmd.cmd)}
                title="Click to copy into terminal"
              >
                <div>
                  <div className="cheat-cmd-code">{cmd.cmd}</div>
                  <div className="cheat-cmd-desc">{cmd.desc}</div>
                  {isAmadeus && cmd.sabre && (
                    <div style={{ fontSize: '10px', color: '#ffb000', marginTop: '2px' }}>
                      Sabre: <code style={{ fontFamily: 'var(--term-font)' }}>{cmd.sabre}</code>
                    </div>
                  )}
                  {!isAmadeus && cmd.amadeus && (
                    <div style={{ fontSize: '10px', color: '#00e5ff', marginTop: '2px' }}>
                      Amadeus: <code style={{ fontFamily: 'var(--term-font)' }}>{cmd.amadeus}</code>
                    </div>
                  )}
                </div>
                <div className="cheat-copy-badge">
                  <Copy size={13} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};
