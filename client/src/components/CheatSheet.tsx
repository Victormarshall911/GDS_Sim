import React from 'react';
import { X, Copy, Terminal as TerminalIcon } from 'lucide-react';

interface CheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (cmd: string) => void;
}

interface CommandItem {
  cmd: string;
  desc: string;
  amadeus?: string;
}

interface CommandCategory {
  title: string;
  commands: CommandItem[];
}

const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    title: 'Sign In & Authentication',
    commands: [
      { cmd: 'SI*7890', desc: 'Sign in with agent ID 7890', amadeus: 'JI 7890' },
      { cmd: 'SO', desc: 'Sign out and end session', amadeus: 'JO' },
      { cmd: 'HELP', desc: 'Display quick reference guide', amadeus: 'HE' },
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
      { cmd: '0W3501Y15NOVLOSABV1', desc: 'Direct sell without availability screen', amadeus: 'Direct SS' },
    ],
  },
  {
    title: 'Passenger Name Records (PNR)',
    commands: [
      { cmd: '-SMITH/JOHN MR', desc: 'Adult passenger name entry', amadeus: 'NM1SMITH/JOHN MR' },
      { cmd: '-DOE/JANE MRS', desc: 'Adult female passenger entry', amadeus: 'NM1DOE/JANE MRS' },
      { cmd: '-DOE/TIMMY MSTR(CHD/15JAN20)', desc: 'Child with date of birth', amadeus: 'NM1DOE/TIMMY(CHD)' },
      { cmd: '-DOE/BABY(INF)', desc: 'Infant without seat', amadeus: 'NM1DOE/BABY(INF)' },
    ],
  },
  {
    title: 'Mandatory PNR Booking Fields',
    commands: [
      { cmd: '9234-802-123-4567-A', desc: 'Agency contact phone number', amadeus: 'AP 234-802-123-4567' },
      { cmd: '7TAW/', desc: 'Ticketing time limit (default +7 days)', amadeus: 'TKTL15NOV' },
      { cmd: '7TAW/25NOV', desc: 'Ticketing time limit with specific date', amadeus: 'TKTL25NOV' },
      { cmd: '6SMITH', desc: 'Received from (person requesting booking)', amadeus: 'RF SMITH' },
    ],
  },
  {
    title: 'Pricing & Fare Calculation',
    commands: [
      { cmd: 'WP', desc: 'Price itinerary (Base + YQ + Taxes in NGN)', amadeus: 'FXP' },
      { cmd: 'WPNC', desc: 'Price itinerary without commission', amadeus: 'FXB' },
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
      { cmd: '*I', desc: 'Display itinerary segments only', amadeus: 'RTI' },
      { cmd: '*N', desc: 'Display passenger names only', amadeus: 'RTN' },
      { cmd: '*ABCDEF', desc: 'Retrieve PNR by record locator', amadeus: 'RT ABCDEF' },
    ],
  },
  {
    title: 'Cancel & Modify',
    commands: [
      { cmd: 'I', desc: 'Ignore: discard working PNR without saving', amadeus: 'IG' },
      { cmd: 'XI', desc: 'Cancel entire itinerary segments', amadeus: 'XE ALL' },
      { cmd: 'X1', desc: 'Cancel segment number 1', amadeus: 'XE 1' },
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

export const CheatSheet: React.FC<CheatSheetProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="side-drawer" id="cheatsheet-drawer">
      <div className="drawer-header">
        <div className="drawer-title">
          <TerminalIcon size={18} className="text-green" />
          <span>Sabre Command Reference</span>
        </div>
        <button className="drawer-close" onClick={onClose} aria-label="Close Reference">
          <X size={18} />
        </button>
      </div>

      <div className="drawer-body">
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>
          Click any card to load the command into the terminal. Dialect equivalents shown for Amadeus training.
        </p>

        {COMMAND_CATEGORIES.map((cat, i) => (
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
                  {cmd.amadeus && (
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
